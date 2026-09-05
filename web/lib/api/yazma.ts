import 'server-only';
import { db } from '../db';
import { iz } from '../eylemler2/ortak';
import { kokenYaz } from '../entegrasyon/koken';
import type { Gozlem, Koken } from '../entegrasyon/sozlesme';
import { ApiHata } from './hatalar';

/* Yazma uclarinin ortak cekirdegi.

   Degismezler:
   - TOPLU YAZMA YA HEP YA HIC. Kayitlarin tamami once cozumlenir; bir tanesi
     bile gecersizse HICBIRI yazilmaz (yarim import yok). Reddedilen kayit
     sessizce atilmaz, 400 govdesinde indeks + alan ile doner.
   - Her kosu bir EntegrasyonKosusu satiri birakir (tetikleyen = 'api').
     Basarisiz kosu da satir birakir; /saglik ekraninda gorunur.
   - Her kabul edilen kayit kokenYaz() ile koken alir.
   - Denetim izi (iz()) transaction COMMIT sonrasi yazilir: SQLite tek
     yazarlidir, islem icinden ikinci istemciyle yazmak kilitlenme riskidir. */

export type KayitHatasi = { indeks: number; alan: string; mesaj: string };

/** Kayit bazli hatalari toplar; sonunda tek 400 ile doner. */
export class HataDefteri {
  private hatalar: KayitHatasi[] = [];
  ekle(indeks: number, alan: string, mesaj: string): void {
    this.hatalar.push({ indeks, alan, mesaj });
  }
  get adet(): number { return this.hatalar.length; }
  get liste(): KayitHatasi[] { return this.hatalar; }
  bitir(): void {
    if (this.hatalar.length === 0) return;
    throw new ApiHata(
      'gecersiz_istek',
      `${this.hatalar.length} kayit reddedildi; hicbiri yazilmadi`,
      { ayrinti: { records: this.hatalar } },
    );
  }
}

export type IzGirdisi = {
  varlikTipi: string; varlikId: string; eylem: string;
  alan?: string; once?: string | null; sonra?: string | null; gerekce?: string | null;
};

export async function izleriYaz(aktorId: string, izler: IzGirdisi[]): Promise<void> {
  for (const g of izler) await iz({ aktorId, ...g });
}

/* EntegrasyonKosusu defteri */

export type KosuOzeti = {
  alinan: number; kabulEdilen: number; reddedilen: number; yinelenen: number;
};

export function kaynakEtiketi(kaynaklar: string[]): string {
  const tekil = [...new Set(kaynaklar)].sort();
  if (tekil.length === 0) return 'api';
  const birlesik = tekil.join(',');
  return birlesik.length <= 120 ? birlesik : `${tekil[0]} +${tekil.length - 1} kaynak`;
}

export async function kosuAc(kaynak: string): Promise<string> {
  const kosu = await db.entegrasyonKosusu.create({
    data: { kaynak, tetikleyen: 'api', durum: 'calisiyor', guvenEtiketi: 'otomatik' },
  });
  return kosu.id;
}

/**
 * `hata` yalnizca GERCEK basarisizlik tasir (beklenmeyen ic hata). Reddedilen
 * kayit / kapsam ihlali bir kurulum-veri sorunudur, sistem arizasi degil:
 * o `ayrinti` alanina yazilir ki saglik ekrani ikisini ayni renge boyamasin.
 */
export async function kosuKapat(
  kosuId: string,
  durum: 'basarili' | 'basarisiz',
  ozet: KosuOzeti,
  basla: number,
  not: { hata?: string | null; ayrinti?: string | null } = {},
): Promise<void> {
  await db.entegrasyonKosusu.update({
    where: { id: kosuId },
    data: {
      durum, bitis: new Date(), sureMs: Date.now() - basla,
      kayitSayisi: ozet.kabulEdilen, ...ozet,
      hata: not.hata ? not.hata.slice(0, 500) : null,
      ayrinti: not.ayrinti ? not.ayrinti.slice(0, 500) : null,
    },
  });
}

/**
 * Reddedilen kayit sayisi: alan bazli hatalarda defterdeki kayit sayisi,
 * kapsam ihlalinde ise TUM parti (ya hep ya hic). Sayaclar ayri tutulur;
 * "alinan" ile "kabul edilen" ayni sey degildir.
 */
function reddedilenSayisi(e: unknown, partiBoyu: number): number {
  if (!(e instanceof ApiHata)) return 0;
  const kayitlar = (e.ayrinti as { records?: unknown } | undefined)?.records;
  if (Array.isArray(kayitlar)) return kayitlar.length;
  return e.kod === 'gecersiz_istek' || e.kod === 'kapsam_disi' ? partiBoyu : 0;
}

/**
 * Kosu defterini tutan sarmalayici: is ne yaparsa yapsin kosu satiri KAPANIR.
 * Hata yutulmaz, yeniden firlatilir; ama once kosuya yazilir.
 */
export async function kosuIcinde<T>(
  kaynaklar: string[],
  is: (kosuId: string) => Promise<{ sonuc: T; ozet: KosuOzeti }>,
): Promise<{ sonuc: T; ozet: KosuOzeti; kosuId: string }> {
  const basla = Date.now();
  const kosuId = await kosuAc(kaynakEtiketi(kaynaklar));
  try {
    const { sonuc, ozet } = await is(kosuId);
    await kosuKapat(kosuId, 'basarili', ozet, basla);
    return { sonuc, ozet, kosuId };
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : String(e);
    // 4xx = kaynak verisi/kapsami sorunu (ayrinti); baska her sey gercek hata.
    const istemciSorunu = e instanceof ApiHata && e.kod !== 'ic_hata';
    await kosuKapat(
      kosuId, 'basarisiz',
      { alinan: kaynaklar.length, kabulEdilen: 0, reddedilen: reddedilenSayisi(e, kaynaklar.length), yinelenen: 0 },
      basla,
      istemciSorunu ? { ayrinti: mesaj } : { hata: mesaj },
    );
    throw e;
  }
}

/* Cozumleyiciler */

/** Santral kodu -> Tesis. Bulunamayan kod kayit hatasidir, sessiz atlanmaz. */
export async function tesisHaritasi(kodlar: string[]): Promise<Map<string, { id: string; kod: string }>> {
  const tekil = [...new Set(kodlar.filter(Boolean))];
  if (tekil.length === 0) return new Map();
  const satirlar = await db.tesis.findMany({
    where: { kod: { in: tekil } }, select: { id: true, kod: true },
  });
  return new Map(satirlar.map((t) => [t.kod, t]));
}

export async function varlikTuruHaritasi(kodlar: string[]): Promise<Map<string, string>> {
  const tekil = [...new Set(kodlar.filter(Boolean))];
  if (tekil.length === 0) return new Map();
  const satirlar = await db.varlikTuru.findMany({
    where: { kod: { in: tekil } }, select: { id: true, kod: true },
  });
  return new Map(satirlar.map((t) => [t.kod, t.id]));
}

export async function agBolgesiHaritasi(kodlar: string[]): Promise<Map<string, string>> {
  const tekil = [...new Set(kodlar.filter(Boolean))];
  if (tekil.length === 0) return new Map();
  const satirlar = await db.agBolgesi.findMany({
    where: { kod: { in: tekil } }, select: { id: true, kod: true },
  });
  return new Map(satirlar.map((b) => [b.kod, b.id]));
}

export type EslesenVarlik = { id: string; etiket: string; tesisId: string | null };

/**
 * varlikAnahtari (etiket | hostname | seri | mac | ip) -> Varlik.
 * Birden cok varliga uyan anahtar BELIRSIZDIR: tahmin edilmez, reddedilir.
 */
export async function varlikAnahtarlariniCoz(
  anahtarlar: string[],
): Promise<Map<string, EslesenVarlik | 'belirsiz'>> {
  const tekil = [...new Set(anahtarlar.filter(Boolean))];
  const harita = new Map<string, EslesenVarlik | 'belirsiz'>();
  if (tekil.length === 0) return harita;
  const satirlar = await db.varlik.findMany({
    where: {
      silindi: null,
      OR: [
        { etiket: { in: tekil } }, { hostname: { in: tekil } },
        { seriNo: { in: tekil } }, { macAdresi: { in: tekil } },
        { ipAdresi: { in: tekil } },
      ],
    },
    select: {
      id: true, etiket: true, tesisId: true, hostname: true,
      seriNo: true, macAdresi: true, ipAdresi: true,
    },
  });
  for (const anahtar of tekil) {
    const uyanlar = satirlar.filter((v) =>
      v.etiket === anahtar || v.hostname === anahtar || v.seriNo === anahtar ||
      v.macAdresi === anahtar || v.ipAdresi === anahtar);
    if (uyanlar.length === 1) {
      const v = uyanlar[0];
      harita.set(anahtar, { id: v.id, etiket: v.etiket, tesisId: v.tesisId });
    } else if (uyanlar.length > 1) {
      harita.set(anahtar, 'belirsiz');
    }
  }
  return harita;
}

/**
 * Koken defterinden idempotency: ayni (tip, kaynakSistem, kaynakKayitId) daha
 * once yazildiysa hedef kaydin id'si doner. Tekillik kisiti olmayan tablolarda
 * (KonfigurasyonYedegi gibi) yeniden senkronizasyonu bu saglar.
 */
export async function kokenliKayitlar(
  varlikTipi: string,
  kokenler: { kaynakSistem: string; kaynakKayitId: string }[],
): Promise<Map<string, string>> {
  if (kokenler.length === 0) return new Map();
  const satirlar = await db.veriKokeni.findMany({
    where: {
      varlikTipi,
      OR: kokenler.map((k) => ({ kaynakSistem: k.kaynakSistem, kaynakKayitId: k.kaynakKayitId })),
    },
    select: { kaynakSistem: true, kaynakKayitId: true, varlikId: true },
  });
  return new Map(satirlar.map((s) => [`${s.kaynakSistem} ${s.kaynakKayitId}`, s.varlikId]));
}

export const kokenAnahtari = (k: Koken): string => `${k.kaynakSistem} ${k.kaynakKayitId}`;

/** Kabul edilen kayda koken yazar; transaction istemcisiyle cagrilir. */
export async function kokeniIsle(
  istemci: Parameters<typeof kokenYaz>[1],
  varlikTipi: string,
  varlikId: string,
  g: Gozlem,
  kosuId: string,
): Promise<void> {
  await kokenYaz({
    varlikTipi, varlikId,
    kaynakSistem: g.koken.kaynakSistem,
    kaynakKayitId: g.koken.kaynakKayitId,
    toplanma: g.koken.toplanma,
    guven: g.koken.guven,
    kosuId,
  }, istemci);
}
