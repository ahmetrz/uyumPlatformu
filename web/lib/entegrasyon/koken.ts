import 'server-only';
import { db } from '../db';
import type { Prisma } from '../prisma-client/client';

/* Veri kökeni (provenance).

   Sözleşme — üç kural, hiçbiri esnetilmez:

   1. Kaynağı GERÇEKTEN bilinmeyen veri "otomatik" sayılmaz. Köken kaydı
      olmayan kayıt manueldir; "bilinmeyen kaynak" diye bir köken yazılmaz.
   2. `guven` null ise ÖLÇÜLMEDİ demektir, sıfır güven değil. Ekranlar bu
      ikisini aynı göstermez.
   3. Doğrulama insanın işidir: otomatik gelen kayıt `dogrulanmadi` başlar,
      yalnız bir kullanıcı `dogrulandi` yapabilir. Motor kendi verisini
      doğrulayamaz. */

export type KokenTipi = 'manuel' | 'otomatik' | 'dogrulanmis';
export type DogrulamaDurumu = 'dogrulanmadi' | 'dogrulandi' | 'reddedildi';

export const KOKEN_SOZU: Record<KokenTipi, string> = {
  manuel: 'Elle girildi',
  otomatik: 'Otomatik toplandı',
  dogrulanmis: 'Doğrulandı',
};

export type KokenGirdisi = {
  varlikTipi: string;
  varlikId: string;
  kaynakSistem: string;
  /** Kaynak sistemdeki kararlı kimlik. Kaynağın kimliği yoksa adaptör
      kimlik alanlarından türetilmiş bir özet verir — boş geçilemez. */
  kaynakKayitId: string;
  connectorId?: string | null;
  kosuId?: string | null;
  toplanma?: Date | null;
  /** 0–1. Ölçülmediyse GEÇME — null kalsın. */
  guven?: number | null;
};

/**
 * Otomatik gelen bir kayda köken yazar. Aynı (varlık, kaynak, kaynak kaydı)
 * için ikinci çağrı yeni satır açmaz, mevcut satırı tazeler — yeniden
 * senkronizasyon idempotenttir.
 *
 * Doğrulama durumuna DOKUNMAZ: bir kez doğrulanmış kayıt, kaynak yeniden
 * senkronize edildi diye doğrulanmamışa dönmez; yalnız içerik değiştiyse
 * çağıran açıkça `dogrulamayiGeriAl` çağırır.
 */
export async function kokenYaz(
  g: KokenGirdisi,
  istemci: Prisma.TransactionClient | typeof db = db,
): Promise<void> {
  if (!g.kaynakSistem) {
    throw new Error('kokenYaz: kaynakSistem zorunlu — kaynağı bilinmeyen veri otomatik sayılamaz');
  }
  if (!g.kaynakKayitId) {
    throw new Error('kokenYaz: kaynakKayitId zorunlu — idempotency bu alana dayanır');
  }
  if (g.guven != null && (g.guven < 0 || g.guven > 1)) {
    throw new Error(`kokenYaz: guven 0–1 aralığında olmalı (${g.guven})`);
  }
  const anahtar = {
    varlikTipi: g.varlikTipi,
    varlikId: g.varlikId,
    kaynakSistem: g.kaynakSistem,
    kaynakKayitId: g.kaynakKayitId,
  };
  await istemci.veriKokeni.upsert({
    where: { varlikTipi_varlikId_kaynakSistem_kaynakKayitId: anahtar },
    create: {
      ...anahtar,
      kokenTipi: 'otomatik',
      connectorId: g.connectorId ?? null,
      kosuId: g.kosuId ?? null,
      toplanma: g.toplanma ?? null,
      guven: g.guven ?? null,
    },
    update: {
      connectorId: g.connectorId ?? null,
      kosuId: g.kosuId ?? null,
      toplanma: g.toplanma ?? null,
      guven: g.guven ?? null,
      aktarim: new Date(),
    },
  });
}

/** Bir kaydın kökenlerini getirir; birden çok kaynak aynı kaydı besleyebilir. */
export async function kokenleriGetir(varlikTipi: string, varlikId: string) {
  return db.veriKokeni.findMany({
    where: { varlikTipi, varlikId },
    orderBy: { aktarim: 'desc' },
  });
}

/** Çok kayıt için tek sorguda köken haritası — liste ekranları N+1 yapmasın. */
export async function kokenHaritasi(
  varlikTipi: string,
  idler: string[],
): Promise<Map<string, { kokenTipi: KokenTipi; kaynakSistem: string; guven: number | null; dogrulamaDurumu: DogrulamaDurumu }>> {
  if (idler.length === 0) return new Map();
  const satirlar = await db.veriKokeni.findMany({
    where: { varlikTipi, varlikId: { in: idler } },
    orderBy: { aktarim: 'desc' },
  });
  const harita = new Map<string, {
    kokenTipi: KokenTipi; kaynakSistem: string; guven: number | null; dogrulamaDurumu: DogrulamaDurumu;
  }>();
  for (const s of satirlar) {
    // En yeni köken kazanır; doğrulanmış olan her zaman öne geçer.
    const mevcut = harita.get(s.varlikId);
    const dogrulandi = s.dogrulamaDurumu === 'dogrulandi';
    if (mevcut && !(dogrulandi && mevcut.dogrulamaDurumu !== 'dogrulandi')) continue;
    harita.set(s.varlikId, {
      kokenTipi: dogrulandi ? 'dogrulanmis' : (s.kokenTipi as KokenTipi),
      kaynakSistem: s.kaynakSistem,
      guven: s.guven,
      dogrulamaDurumu: s.dogrulamaDurumu as DogrulamaDurumu,
    });
  }
  return harita;
}

/**
 * İnsan doğrulaması. Motor kendi verisini doğrulayamaz — bu yüzden
 * `dogrulayanId` zorunludur ve çağıran yetki kontrolünden geçmiş olmalıdır.
 */
export async function kokenDogrula(
  kokenId: string,
  dogrulayanId: string,
  sonuc: 'dogrulandi' | 'reddedildi',
): Promise<void> {
  if (!dogrulayanId) {
    throw new Error('kokenDogrula: doğrulayan zorunlu — otomatik doğrulama yasak');
  }
  await db.veriKokeni.update({
    where: { id: kokenId },
    data: {
      dogrulamaDurumu: sonuc,
      kokenTipi: sonuc === 'dogrulandi' ? 'dogrulanmis' : 'otomatik',
      dogrulayanId,
      dogrulamaZamani: new Date(),
    },
  });
}

/** İçerik değiştiğinde doğrulamayı düşürür — eski doğrulama yeni veriyi
    kapsamaz. Çağıran, alanların gerçekten değiştiğini bilmelidir. */
export async function dogrulamayiGeriAl(kokenId: string): Promise<void> {
  await db.veriKokeni.update({
    where: { id: kokenId },
    data: { dogrulamaDurumu: 'dogrulanmadi', kokenTipi: 'otomatik',
      dogrulayanId: null, dogrulamaZamani: null },
  });
}

/** Bir varlık tipi için köken dağılımı — sağlık ekranı ve raporlar için. */
export async function kokenDagilimi(varlikTipi: string) {
  const satirlar = await db.veriKokeni.groupBy({
    by: ['kokenTipi', 'dogrulamaDurumu'],
    where: { varlikTipi },
    _count: { _all: true },
  });
  return satirlar.map((s) => ({
    kokenTipi: s.kokenTipi as KokenTipi,
    dogrulamaDurumu: s.dogrulamaDurumu as DogrulamaDurumu,
    adet: s._count._all,
  }));
}
