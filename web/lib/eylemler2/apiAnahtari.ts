'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { apiTokenUret } from '../api/kimlik';
import { bosluksuz, hata, iz, tamam, type Sonuc } from './ortak';

/* Dis API anahtarlari (§P1-3).

   Token kalibi oturumla AYNI: 32 bayt rastgele, base64url; veritabaninda
   YALNIZ SHA-256 ozeti durur. Tam token bir kez, uretim yanitinda doner ve
   bir daha ASLA gosterilemez - kaybedilirse yenisi uretilir.

   Anahtar kendi yetkisini tasimaz: SAHIBININ yetkilerini tasir. Boylece
   RBAC/kapsam tek yerde (lib/erisim.ts) kalir, API icin paralel bir izin
   modeli olusmaz. Bir kisinin yetkisi daralinca anahtari da daralir. */

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

export async function apiAnahtariUret(girdi: {
  ad: string;
  /** anahtarin adina calisacagi kullanici; bos ise ureten kisi */
  kullaniciId?: string | null;
  /** gecerlilik suresi (gun); bos ise suresiz */
  gecerlilikGun?: number | null;
}): Promise<AnahtarUretimSonucu> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const v = z
      .object({
        ad: bosluksuz('Anahtar adi').max(120),
        kullaniciId: z.string().nullable().optional(),
        gecerlilikGun: z.number().int().min(1).max(3650).nullable().optional(),
      })
      .parse(girdi);

    const sahipId = v.kullaniciId ?? k.id;
    const sahip = await db.kullanici.findUnique({
      where: { id: sahipId },
      select: { id: true, aktif: true },
    });
    if (!sahip) throw new Error('Anahtar sahibi kullanici bulunamadi');
    if (!sahip.aktif) throw new Error('Pasif kullanici icin anahtar uretilemez');

    const { token, onEk, tokenHash } = apiTokenUret();
    const bitis = v.gecerlilikGun ? new Date(Date.now() + v.gecerlilikGun * 86_400_000) : null;

    const anahtar = await db.apiAnahtari.create({
      data: { ad: v.ad, kullaniciId: sahip.id, onEk, tokenHash, bitis, olusturanId: k.id },
    });

    // Denetim izine ONEK yazilir, token DEGIL.
    await iz({
      aktorId: k.id, varlikTipi: 'ApiAnahtari', varlikId: anahtar.id,
      eylem: 'olusturma', sonra: `${v.ad} (${onEk}...)`,
      gerekce: bitis ? `Gecerlilik: ${bitis.toISOString()}` : 'Suresiz',
    });

    revalidatePath('/yonetim');
    return { ok: true, id: anahtar.id, onEk, token, bitis: bitis?.toISOString() ?? null };
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

    revalidatePath('/yonetim');
    return tamam();
  } catch (e) { return hata(e); }
}
