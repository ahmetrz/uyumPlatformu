/* ═══════════════════════════════════════════════════════════════════════
   PAKET FORM ŞABLONUNU DOLDURMA — ÇEKİRDEK YALNIZ GENEL DOLDURUCUDUR

   Öz denetim formu ve SoA ürünün KENDİ tablolarıdır: sütunları sektör ve
   ülke bağımsızdır (madde · kapsam · durum · olgunluk · kanıt · sorumlu).
   Düzenleyicinin kendi formu ise ürünün tablosu değildir — bölümleri,
   alanları ve soruları O belirler. Bu yüzden şablon ÇEKİRDEĞE GİRMEZ,
   paketten gelir (`FormSablonu`, P4 · 2.2) ve çekirdek onu yalnız
   DOLDURUR.

   ── ÜÇ ALAN SINIFI, ÜÇ AYRI SÖZ ───────────────────────────────────────
   1 · Alan bir kontrole bağlı ve o kontrol kurulumda VAR
       → kontrolün durumu yazılır.
   2 · Alan bir kontrole bağlı ama o kontrol kurulumda YOK
       → "Şablon alanı ürüne bağlanmadı" ve KUSUR İŞARETİ. Bu sessiz
         kalırsa form dolu görünür, oysa şablonun sorduğu soru ürüne hiç
         sorulmamıştır. Paket ile kurulumun ayrışması tam buradan başlar.
   3 · Alan hiçbir kontrole bağlı değil (serbest soru: dönem, tarih…)
       → "Değerlendirilmedi". Ürün o değeri BİLMEZ ve uydurmaz;
         doldurmak kurumun işidir.

   Hiçbir hücre boş kalmaz — öz denetim formuyla aynı kural, aynı sözler.

   Bu dosya veritabanı, React ve tarayıcı bilmez. */

import {
  DEGERLENDIRILMEDI, KAPSAM_DISI, type FormHucresi, type FormIsareti,
  type MaddeGirdisi,
} from './formDoldurma';

export const BAGLANMADI = 'Şablon alanı ürüne bağlanmadı';

export const SABLON_SUTUNLARI = [
  { anahtar: 'alan', etiket: 'Alan' },
  { anahtar: 'maddeKod', etiket: 'Kontrol' },
  { anahtar: 'deger', etiket: 'Ürünün ölçtüğü' },
  { anahtar: 'kaynak', etiket: 'Kaynak' },
] as const;

export type SablonAlani = {
  anahtar: string;
  etiket: string;
  tip: string;
  maddeKod?: string | null;
};
export type SablonBolumu = { kod: string; baslik: string; alanlar: SablonAlani[] };
export type Sablon = { kod: string; ad: string; bolumler: SablonBolumu[] };

export type SablonSatiri = {
  alanAnahtari: string;
  hucreler: FormHucresi[];
  isaretler: FormIsareti[];
};

/** Alanın ürüne bağlanıp bağlanmadığı — üç sınıf, üç ayrı söz. */
export function sablonSatiri(
  alan: SablonAlani,
  maddeler: ReadonlyMap<string, MaddeGirdisi>,
): SablonSatiri {
  const kod = alan.maddeKod ?? null;
  const madde = kod === null ? undefined : maddeler.get(kod);

  let deger: FormHucresi;
  let kaynak: FormHucresi;
  if (kod === null) {
    /* Serbest alan: ürünün ölçtüğü bir şey yok ve UYDURULMAZ. */
    deger = { anahtar: 'deger', deger: DEGERLENDIRILMEDI, isaret: 'olculmedi' };
    kaynak = { anahtar: 'kaynak', deger: 'Kurum doldurur', isaret: null };
  } else if (madde === undefined) {
    /* Şablon bir kontrole işaret ediyor ama kurulumda o kontrol yok:
       şablonun sorduğu soru ürüne HİÇ sorulmamış. Sessiz kalırsa form
       dolu görünür — bu yüzden kusur işaretiyle yazılır. */
    deger = { anahtar: 'deger', deger: BAGLANMADI, isaret: 'gerekcesiz_kapsam_disi' };
    kaynak = { anahtar: 'kaynak', deger: 'Kurulumda bu kontrol yok', isaret: null };
  } else if (madde.kapsamDisi) {
    deger = { anahtar: 'deger', deger: KAPSAM_DISI, isaret: null };
    kaynak = {
      anahtar: 'kaynak',
      /* Gerekçe AYNEN taşınır; yoksa kusur öz denetim formundaki sözle
         AYNI şekilde yazılır — iki yerde iki farklı söz, aynı kusuru iki
         ayrı şey gibi gösterirdi. */
      deger: madde.kapsamDisiGerekcesi?.trim()
        ? `Kapsam dışı — ${madde.kapsamDisiGerekcesi}` : 'Kapsam dışı · GEREKÇE YOK',
      isaret: madde.kapsamDisiGerekcesi?.trim() ? null : 'gerekcesiz_kapsam_disi',
    };
  } else {
    const d = madde.durum;
    deger = d === null || d.trim() === ''
      ? { anahtar: 'deger', deger: DEGERLENDIRILMEDI, isaret: 'olculmedi' }
      : { anahtar: 'deger', deger: d, isaret: null };
    kaynak = { anahtar: 'kaynak', deger: `Kontrol ${kod}`, isaret: null };
  }

  const hucreler: FormHucresi[] = [
    { anahtar: 'alan', deger: alan.etiket, isaret: null },
    { anahtar: 'maddeKod', deger: kod ?? 'Bağlı kontrol yok', isaret: null },
    deger,
    kaynak,
  ];
  const isaretler = [...new Set(
    hucreler.map((h) => h.isaret).filter((i): i is FormIsareti => i !== null),
  )];
  return { alanAnahtari: alan.anahtar, hucreler, isaretler };
}

/** Şablonun bölümlerini form bölümlerine çevirir; sıra KORUNUR. */
export function sablonuDoldur(
  sablon: Sablon,
  maddeler: ReadonlyMap<string, MaddeGirdisi>,
): { ad: string; sutunlar: typeof SABLON_SUTUNLARI; satirlar: SablonSatiri[] }[] {
  return sablon.bolumler.map((b) => ({
    ad: b.baslik,
    sutunlar: SABLON_SUTUNLARI,
    satirlar: b.alanlar.map((a) => sablonSatiri(a, maddeler)),
  }));
}

/** Şablonun kurulumla ne kadar örtüştüğü — sayıyla. */
export function sablonOrtusmesi(
  sablon: Sablon,
  maddeler: ReadonlyMap<string, MaddeGirdisi>,
): { alan: number; bagli: number; baglanmadi: number; serbest: number } {
  let bagli = 0;
  let baglanmadi = 0;
  let serbest = 0;
  for (const b of sablon.bolumler) {
    for (const a of b.alanlar) {
      if (!a.maddeKod) { serbest += 1; continue; }
      if (maddeler.has(a.maddeKod)) bagli += 1; else baglanmadi += 1;
    }
  }
  return { alan: bagli + baglanmadi + serbest, bagli, baglanmadi, serbest };
}
