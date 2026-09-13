'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { AZAMI_ANAHTAR_GUN, VARSAYILAN_ANAHTAR_GUN } from '../apiAnahtariKurallari';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { apiTokenUret } from '../api/kimlik';
import { kapsamKapisi, UC_KIMLIKLERI } from '../api/kapsam';
import { bosluksuz, hata, iz, tamam, type Sonuc } from './ortak';

/* Dis API anahtarlari (§P1-3).

   Token kalibi oturumla AYNI: 32 bayt rastgele, base64url; veritabaninda
   YALNIZ SHA-256 ozeti durur. Tam token bir kez, uretim yanitinda doner ve
   bir daha ASLA gosterilemez - kaybedilirse yenisi uretilir.

   Anahtar kendi ROLUNU tasimaz: SAHIBININ yetkilerini tasir. Boylece
   RBAC/kapsam tek yerde (lib/erisim.ts) kalir, API icin paralel bir izin
   modeli olusmaz. Bir kisinin yetkisi daralinca anahtari da daralir.

   ── UY-52 · AMA KENDİ KAPSAMI VARDIR ──────────────────────────────────
   Rolü miras almak doğruydu; kapsamı OLMAMASI değildi. Bir CMDB
   entegrasyonuna verilen anahtar, sahibi yönetici olduğu için kanıt
   paketi de okuyabiliyordu. Artık her anahtar hangi uçlara
   erişebileceğini SAYARAK bildirir; kapsam rolü yalnız daraltır.
   Karar `lib/api/kapsam.ts`tedir, bu dosya yalnız yazar. */

export type AnahtarUretimSonucu =
  | {
      ok: true;
      id: string;
      onEk: string;
      /** SADECE BU YANITTA. Saklanmaz, loglanmaz, tekrar gosterilemez. */
      token: string;
      bitis: string | null;
    }
  | { ok: false; hata: string };

/* ── ANAHTAR ÖMRÜ ─────────────────────────────────────────────────────
   Süre BOŞ BIRAKILAMAZ ve sonsuz olamaz.

   Eskiden `gecerlilikGun` isteğe bağlıydı ve boş bırakılınca `bitis: null`
   yazılıyordu: ürettiği anda hiçbir şey olmuyor, ama üreten kişi işten
   ayrıldıktan yıllar sonra da geçerli olan bir anahtar kalıyordu. Rotasyon
   politikası, süresiz anahtar varsa bir dilek listesidir; sınır, üretim
   anında konmalıdır.

   Varsayılan bir yıldır (yenilenebilir), tavan iki yıl. Tavan 3650 gündü —
   on yıl, yani pratikte süresiz.

   Sayılar `lib/apiAnahtariKurallari.ts`'te yaşar: bu dosya bir
   `'use server'` modülüdür ve buradan sabit export etmek derlemeyi kırar
   (yalnız asenkron fonksiyon dışa aktarılabilir). */

export async function apiAnahtariUret(girdi: {
  ad: string;
  /** anahtarin adina calisacagi kullanici; bos ise ureten kisi */
  kullaniciId?: string | null;
  /** gecerlilik suresi (gun); bos ise VARSAYILAN_ANAHTAR_GUN. Süresiz YOK. */
  gecerlilikGun?: number | null;
  /** UY-52 · erisebilecegi uclar. BOS BIRAKILAMAZ. */
  uclar: string[];
  /** yazma uclarina hic giremesin mi (ikinci katman) */
  saltOkunur?: boolean;
}): Promise<AnahtarUretimSonucu> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const v = z
      .object({
        ad: bosluksuz('Anahtar adi').max(120),
        kullaniciId: z.string().nullable().optional(),
        gecerlilikGun: z.number().int().min(1)
          .max(AZAMI_ANAHTAR_GUN, `Anahtar ömrü en çok ${AZAMI_ANAHTAR_GUN} gün olabilir`)
          .nullable().optional(),
        uclar: z.array(z.string()).max(UC_KIMLIKLERI.length),
        saltOkunur: z.boolean().optional(),
      })
      .parse(girdi);

    /* Kapsam kapısı sahip aramasından ÖNCE: geçersiz bir kapsamla gelen
       istek, var olmayan bir kullanıcı id'sini de sınamamalı. */
    const saltOkunur = v.saltOkunur ?? true;
    const kapsam = kapsamKapisi({ uclar: v.uclar, saltOkunur });
    if (!kapsam.ok) return { ok: false, hata: kapsam.sebep };

    const sahipId = v.kullaniciId ?? k.id;
    const sahip = await db.kullanici.findUnique({
      where: { id: sahipId },
      select: { id: true, aktif: true },
    });
    if (!sahip) throw new Error('Anahtar sahibi kullanici bulunamadi');
    if (!sahip.aktif) throw new Error('Pasif kullanici icin anahtar uretilemez');

    const { token, onEk, tokenHash } = apiTokenUret();
    // Boş bırakılan süre SÜRESİZ değil, varsayılan ömürdür.
    const gun = v.gecerlilikGun ?? VARSAYILAN_ANAHTAR_GUN;
    const bitis = new Date(Date.now() + gun * 86_400_000);

    const anahtar = await db.apiAnahtari.create({
      data: {
        ad: v.ad, kullaniciId: sahip.id, onEk, tokenHash, bitis, olusturanId: k.id,
        kapsamJson: kapsam.kapsamJson, saltOkunur,
      },
    });

    // Denetim izine ONEK yazilir, token DEGIL.
    await iz({
      aktorId: k.id, varlikTipi: 'ApiAnahtari', varlikId: anahtar.id,
      eylem: 'olusturma', sonra: `${v.ad} (${onEk}...)`,
      gerekce: `Gecerlilik: ${bitis.toISOString()} (${gun} gun) · `
        + `Kapsam: ${kapsam.kapsamJson}${saltOkunur ? ' · salt okunur' : ''}`,
    });

    revalidatePath('/yonetim-tezgahi');
    return { ok: true, id: anahtar.id, onEk, token, bitis: bitis.toISOString() };
  } catch (e) {
    const h = hata(e);
    return { ok: false, hata: h.ok ? 'Beklenmeyen hata' : h.hata };
  }
}

/** Iptal geri alinamaz: iptal damgasi yazilir, anahtar 401 dondurmeye baslar. */
export async function apiAnahtariIptal(girdi: { id: string; gerekce?: string | null }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const v = z.object({
      id: bosluksuz('Anahtar id'),
      gerekce: z.string().trim().max(500).nullable().optional(),
    }).parse(girdi);

    const anahtar = await db.apiAnahtari.findUnique({
      where: { id: v.id }, select: { id: true, ad: true, onEk: true, iptalZamani: true },
    });
    if (!anahtar) throw new Error('Anahtar bulunamadi');
    if (anahtar.iptalZamani) return tamam(); // idempotent: zaten iptal

    await db.apiAnahtari.update({ where: { id: v.id }, data: { iptalZamani: new Date() } });
    await iz({
      aktorId: k.id, varlikTipi: 'ApiAnahtari', varlikId: v.id, eylem: 'iptal',
      alan: 'iptalZamani', once: null, sonra: new Date().toISOString(),
      gerekce: v.gerekce ?? null,
    });

    revalidatePath('/yonetim-tezgahi');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * UY-52 · Var olan bir anahtarın kapsamını daraltır ya da tanımlar.
 *
 * ── NEDEN YENİ ANAHTAR ÜRETMEK YETMEZ ─────────────────────────────────
 * Kapsamı tanımsız eski anahtarların tek çaresi "iptal et, yenisini üret"
 * olsaydı, düzeltme her seferinde entegrasyonu durdurmayı gerektirirdi ve
 * kimse yapmazdı. Kapsam token'ın kendisini değiştirmez: aynı anahtar
 * çalışmaya devam eder, yalnız erişebildiği uçlar kısılır.
 *
 * ── TOKEN'A DOKUNULMAZ ────────────────────────────────────────────────
 * Bu eylem `tokenHash`e HİÇ bakmaz. Kapsam değişikliği bir kimlik
 * değişikliği değildir.
 */
export async function apiAnahtariKapsamGuncelle(girdi: {
  id: string;
  uclar: string[];
  saltOkunur: boolean;
  gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const v = z.object({
      id: bosluksuz('Anahtar id'),
      uclar: z.array(z.string()).max(UC_KIMLIKLERI.length),
      saltOkunur: z.boolean(),
      gerekce: z.string().trim().max(500).nullable().optional(),
    }).parse(girdi);

    const kapsam = kapsamKapisi({ uclar: v.uclar, saltOkunur: v.saltOkunur });
    if (!kapsam.ok) return { ok: false, hata: kapsam.sebep };

    const anahtar = await db.apiAnahtari.findUnique({
      where: { id: v.id },
      select: { id: true, onEk: true, kapsamJson: true, iptalZamani: true },
    });
    if (!anahtar) throw new Error('Anahtar bulunamadi');
    /* İptal edilmiş anahtarın kapsamı düzenlenemez: kapatılmış bir kapıyı
       yeniden ayarlamak, kapalı olduğunu unutturur. */
    if (anahtar.iptalZamani) {
      return { ok: false, hata: 'Anahtar iptal edilmiş; kapsamı değiştirilemez.' };
    }

    await db.apiAnahtari.update({
      where: { id: v.id },
      data: { kapsamJson: kapsam.kapsamJson, saltOkunur: v.saltOkunur },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'ApiAnahtari', varlikId: v.id,
      eylem: 'guncelleme', alan: 'kapsam',
      once: anahtar.kapsamJson ?? 'TANIMSIZ',
      sonra: `${kapsam.kapsamJson}${v.saltOkunur ? ' · salt okunur' : ''}`,
      gerekce: v.gerekce ?? null,
    });

    revalidatePath('/yonetim-tezgahi');
    return tamam();
  } catch (e) { return hata(e); }
}
