'use server';

/* ═══ UY-12 · UY-13 · Kanıt metadata ve dosya eylemleri ════════════════

   Kalıp `eylemler2/*` ile aynıdır:
     yetkiZorunlu(KAPSAM_SONRA) → zod → kayıt oku → kapsamZorunlu →
     db → iz → revalidatePath

   ── KANIT KAPSAMI NEREDEN GELİR ───────────────────────────────────────
   Bir kanıt kaydının kendi `tesisId` alanı YOKTUR; kapsamı bağlı olduğu
   `MaddeDurumu` satırlarından gelir. Bir kanıt birden çok maddeye
   bağlanabilir (crosswalk) ve o zaman kapsamı BİRDEN ÇOK santraldir.
   Kural sert: kullanıcı, kanıtın bağlı olduğu santrallerin HEPSİNDE
   yetkili olmalıdır. Tek santralde yetkili olmak yetseydi, iki santrale
   bağlı bir kanıtı A'ya yetkili biri değiştirir ve B'nin uyum kaydını
   sessizce etkilerdi.

   Hiçbir maddeye bağlı OLMAYAN kanıt (öksüz kanıt) `uyum/onay` ister:
   kimin kapsamına girdiği bilinmediği için dar kapsamlı bir rol ona
   dokunamaz.

   ── DOSYA ÜRÜN TARAFINDAN AÇILMAZ ─────────────────────────────────────
   Yüklenen içerik ayrıştırılmaz, önizlenmez, çalıştırılmaz. Depo
   katmanı (`lib/uyum/kanitDeposu.ts`) onu bir bayt dizisi olarak saklar
   ve özetini alır. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, kapsamZorunlu, KAPSAM_SONRA, izinVar } from '../erisim';
import {
  GIZLILIK_DUZEYLERI, KANIT_DURUMLARI, KANIT_TIPLERI, surumGerekiyorMu,
} from '../uyum/kanitMetadata';
import {
  SAGLAYICI_ADI, dosyayiYaz, guvenliDosyaAdi,
} from '../uyum/kanitDeposu';
import { type Sonuc, tamam, hata, iz, bosluksuz, tarihAlani } from './ortak';

const metin = z.string().trim().transform((s) => s || null).nullable().optional();
const gerekceAlani = z.string().trim().min(10, 'Gerekçe en az 10 karakter olmalı');

/**
 * Kanıtın kapsamını çözer ve yetkiyi dayatır.
 *
 * Dönen değer bağlı santral kimlikleridir; boşsa kanıt ÖKSÜZDÜR.
 */
async function kanitKapsamiDayat(
  k: Awaited<ReturnType<typeof yetkiZorunlu>>,
  kanitId: string,
  islem: 'yazma' | 'onay',
): Promise<string[]> {
  const baglar = await db.kanitBaglantisi.findMany({
    where: { kanitId },
    select: { maddeDurumu: { select: { tesisId: true, surecId: true } } },
  });
  if (baglar.length === 0) {
    /* Öksüz kanıt: kapsamı bilinmiyor. Dar kapsamlı bir rol ona
       dokunamaz — "kapsamı yok" ile "her kapsamda" aynı şey değildir. */
    if (!izinVar(k, 'uyum', 'onay')) {
      throw new Error('Hiçbir maddeye bağlı olmayan kanıt yalnız kapsamsız '
        + 'uyum onay yetkisiyle düzenlenebilir; kapsamı bilinmiyor.');
    }
    return [];
  }
  const tesisler = [...new Set(baglar.map((b) => b.maddeDurumu.tesisId))];
  for (const bag of baglar) {
    kapsamZorunlu(k, 'uyum', islem,
      { tesisId: bag.maddeDurumu.tesisId, surecId: bag.maddeDurumu.surecId },
      'Bu kanıt birden çok santrale bağlı olabilir; hepsinde yetkili olmalısınız');
  }
  return tesisler;
}

/**
 * Kanıt metadata'sını yazar (UY-12).
 *
 * `id` verilmezse yeni kanıt açar ve `maddeDurumuId` ZORUNLUDUR: bağsız
 * bir kanıt hiçbir kontrolü desteklemez ve kütüğü şişirir.
 */
export async function kanitKaydet(girdi: {
  id?: string;
  maddeDurumuId?: string;
  ad: string;
  tip: string;
  durum?: string;
  gizlilik?: string;
  sahipId?: string | null;
  kaynakSistem?: string | null;
  kaynakUrl?: string | null;
  gecerlilikBaslangic?: string | null;
  gecerliBitis?: string | null;
  toplanmaTarihi?: string | null;
  otomatik?: boolean;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      id: z.string().optional(),
      maddeDurumuId: z.string().optional(),
      ad: bosluksuz('Ad'),
      tip: z.enum(KANIT_TIPLERI, 'Geçersiz kanıt tipi'),
      durum: z.enum(KANIT_DURUMLARI).default('gecerli'),
      gizlilik: z.enum(GIZLILIK_DUZEYLERI).default('kurumsal'),
      sahipId: z.string().trim().transform((s) => s || null).nullable().optional(),
      kaynakSistem: metin,
      kaynakUrl: metin,
      gecerlilikBaslangic: tarihAlani,
      gecerliBitis: tarihAlani,
      toplanmaTarihi: tarihAlani,
      /* `otomatik` KULLANICI BEYANI DEĞİLDİR: bir kaydın otomatik
         toplandığını söylemek kanıt gücünü yükseltir (bkz.
         `kanitGucu`). Elle açılan kayıtta daima false; otomatik akış
         kendi yolundan yazar. */
      otomatik: z.boolean().optional(),
    }).parse(girdi);

    /* Geçerlilik aralığı ters olamaz. Ters aralık, tazelik hesabını
       sessizce "süresi dolmuş" tarafına iter ve sebebi görünmez. */
    if (v.gecerliBitis && v.gecerlilikBaslangic
      && v.gecerliBitis <= v.gecerlilikBaslangic) {
      return hata(new Error('Geçerlilik bitişi başlangıçtan sonra olmalı.'));
    }

    if (v.id) {
      const mevcut = await db.kanit.findUnique({
        where: { id: v.id },
        select: { id: true, silindi: true, durum: true, ad: true },
      });
      if (!mevcut || mevcut.silindi) return hata(new Error('Kanıt bulunamadı'));
      await kanitKapsamiDayat(k, v.id, 'yazma');

      await db.kanit.update({
        where: { id: v.id },
        data: {
          ad: v.ad, tip: v.tip, durum: v.durum, gizlilik: v.gizlilik,
          sahipId: v.sahipId ?? null,
          kaynakSistem: v.kaynakSistem ?? null, kaynakUrl: v.kaynakUrl ?? null,
          gecerlilikBaslangic: v.gecerlilikBaslangic ?? undefined,
          gecerliBitis: v.gecerliBitis ?? null,
          toplanmaTarihi: v.toplanmaTarihi ?? null,
        },
      });
      /* Durum değişimi KENDİ iz satırını alır: reddedilmiş bir kanıtın
         ne zaman reddedildiği, "kanıt güncellendi" satırının içinde
         kaybolmamalı. */
      if (mevcut.durum !== v.durum) {
        await iz({
          aktorId: k.id, varlikTipi: 'Kanit', varlikId: v.id, eylem: 'guncelleme',
          alan: 'durum', once: mevcut.durum, sonra: v.durum,
        });
      }
      await iz({
        aktorId: k.id, varlikTipi: 'Kanit', varlikId: v.id, eylem: 'guncelleme',
        alan: 'metadata', once: mevcut.ad, sonra: v.ad,
      });
      revalidatePath('/kanitlar');
      return tamam();
    }

    if (!v.maddeDurumuId) {
      return hata(new Error('Yeni kanıt en az bir madde durumuna bağlanmalı.'));
    }
    const md = await db.maddeDurumu.findUnique({
      where: { id: v.maddeDurumuId }, select: { tesisId: true, surecId: true },
    });
    if (!md) return hata(new Error('Madde durumu bulunamadı'));
    kapsamZorunlu(k, 'uyum', 'yazma', { tesisId: md.tesisId, surecId: md.surecId },
      'Bu tesis kapsamında kanıt ekleme yetkiniz yok');

    const kanit = await db.kanit.create({
      data: {
        ad: v.ad, tip: v.tip, durum: v.durum, gizlilik: v.gizlilik,
        yukleyenId: k.id, sahipId: v.sahipId ?? null,
        kaynakSistem: v.kaynakSistem ?? null, kaynakUrl: v.kaynakUrl ?? null,
        gecerlilikBaslangic: v.gecerlilikBaslangic ?? new Date(),
        gecerliBitis: v.gecerliBitis ?? null,
        toplanmaTarihi: v.toplanmaTarihi ?? null,
        otomatik: false,
      },
    });
    await db.kanitBaglantisi.create({
      data: { kanitId: kanit.id, maddeDurumuId: v.maddeDurumuId },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Kanit', varlikId: kanit.id, eylem: 'olusturma',
      alan: 'ad', sonra: v.ad,
    });
    revalidatePath('/kanitlar'); revalidatePath('/surecler');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Kanıta dosya yükler (UY-13).
 *
 * İçerik base64 olarak gelir: server action'a `File` geçirmek yerine
 * çağıran onu okur ve kodlar. Bunun sebebi ölçülebilir — çok parçalı
 * form gövdesi bu ürünün hiçbir yerinde kullanılmıyor ve tek bir yol
 * için ayrı bir ayrıştırma katmanı açmak, denetlenmesi gereken ikinci
 * bir saldırı yüzeyi demek.
 *
 * İÇERİK DEĞİŞİRSE YENİ SÜRÜM AÇILIR ve gerekçe zorunludur. Aynı içerik
 * yeniden yüklenirse sürüm AÇILMAZ — sürüm geçmişi gürültüye boğulmaz.
 */
export async function kanitDosyasiYukle(girdi: {
  kanitId: string;
  dosyaAdi: string;
  mimeTipi: string;
  /** base64 gövde. */
  icerik: string;
  gerekce: string;
}): Promise<Sonuc & { surum?: number; zatenVardi?: boolean }> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      kanitId: bosluksuz('Kanıt'),
      dosyaAdi: bosluksuz('Dosya adı'),
      mimeTipi: bosluksuz('İçerik tipi'),
      icerik: z.string().min(1, 'Dosya içeriği boş'),
      gerekce: gerekceAlani,
    }).parse(girdi);

    const kanit = await db.kanit.findUnique({
      where: { id: v.kanitId },
      select: { id: true, silindi: true, surum: true, dosyaHash: true },
    });
    if (!kanit || kanit.silindi) return hata(new Error('Kanıt bulunamadı'));
    await kanitKapsamiDayat(k, v.kanitId, 'yazma');

    let bayt: Buffer;
    try {
      bayt = Buffer.from(v.icerik, 'base64');
    } catch {
      return hata(new Error('Dosya içeriği base64 olarak çözülemedi.'));
    }

    const yazma = await dosyayiYaz({ icerik: bayt, mimeTipi: v.mimeTipi });
    if (!yazma.ok) return hata(new Error(yazma.hata));

    const karar = surumGerekiyorMu({
      eskiHash: kanit.dosyaHash, yeniHash: yazma.ozet,
    });
    if (!karar.yeniSurum) {
      /* Sessizce "başarılı" dönmek, kullanıcının yeni sürüm açtığını
         sanmasına yol açardı. Sonuç açıkça söylenir. */
      return {
        ok: true, surum: kanit.surum, zatenVardi: true,
      } as Sonuc & { surum: number; zatenVardi: boolean };
    }

    const yeniSurum = kanit.surum + (kanit.dosyaHash === null && kanit.surum === 1 ? 0 : 1);
    const ad = guvenliDosyaAdi(v.dosyaAdi, v.mimeTipi);

    await db.kanit.update({
      where: { id: v.kanitId },
      data: {
        dosyaAdi: ad, dosyaTipi: v.mimeTipi, dosyaBoyut: yazma.boyut,
        dosyaHash: yazma.ozet, depoAnahtari: yazma.anahtar,
        depoSaglayici: SAGLAYICI_ADI, surum: yeniSurum,
      },
    });
    /* Sürüm satırı DEĞİŞMEZDİR (veritabanı tetikleyicisiyle korunur):
       yeni sürüm yeni satırdır, eski satır olduğu gibi kalır. */
    await db.kanitSurumu.create({
      data: {
        kanitId: v.kanitId, surum: yeniSurum,
        dosyaHash: yazma.ozet, dosyaAdi: ad, dosyaBoyut: yazma.boyut,
        depoAnahtari: yazma.anahtar, gerekce: v.gerekce, yukleyenId: k.id,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Kanit', varlikId: v.kanitId,
      eylem: 'dosya_ekleme', alan: 'dosyaHash',
      once: kanit.dosyaHash, sonra: yazma.ozet, gerekce: v.gerekce, dosyaAdi: ad,
    });
    revalidatePath('/kanitlar');
    return {
      ok: true, surum: yeniSurum, zatenVardi: yazma.zatenVardi,
    } as Sonuc & { surum: number; zatenVardi: boolean };
  } catch (e) { return hata(e); }
}

/**
 * Kanıtı başka bir madde durumuna da bağlar (crosswalk).
 *
 * Aynı politika belgesi birden çok regülasyonun maddesini karşılayabilir
 * ve her seferinde yeniden yüklenmesi hem depoyu hem denetçinin sabrını
 * tüketir.
 */
export async function kanitBaglantisiEkle(girdi: {
  kanitId: string; maddeDurumuId: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      kanitId: bosluksuz('Kanıt'), maddeDurumuId: bosluksuz('Madde durumu'),
    }).parse(girdi);

    const kanit = await db.kanit.findUnique({
      where: { id: v.kanitId }, select: { id: true, silindi: true },
    });
    if (!kanit || kanit.silindi) return hata(new Error('Kanıt bulunamadı'));
    /* Kanıtın BUGÜNKÜ kapsamı da sorulur: A ve B'ye bağlı bir kanıta
       yalnız C'de yetkili biri D bağlantısı ekleyemesin. */
    await kanitKapsamiDayat(k, v.kanitId, 'yazma');

    const md = await db.maddeDurumu.findUnique({
      where: { id: v.maddeDurumuId }, select: { tesisId: true, surecId: true },
    });
    if (!md) return hata(new Error('Madde durumu bulunamadı'));
    kapsamZorunlu(k, 'uyum', 'yazma', { tesisId: md.tesisId, surecId: md.surecId },
      'Bu tesis kapsamında kanıt bağlama yetkiniz yok');

    await db.kanitBaglantisi.upsert({
      where: {
        kanitId_maddeDurumuId: { kanitId: v.kanitId, maddeDurumuId: v.maddeDurumuId },
      },
      create: { kanitId: v.kanitId, maddeDurumuId: v.maddeDurumuId },
      update: {},
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Kanit', varlikId: v.kanitId, eylem: 'guncelleme',
      alan: 'baglanti', sonra: v.maddeDurumuId,
    });
    revalidatePath('/kanitlar'); revalidatePath('/surecler');
    return tamam();
  } catch (e) { return hata(e); }
}
