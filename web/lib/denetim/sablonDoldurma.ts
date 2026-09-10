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
   3 · Alan bir DURUM SAYIMI (`sayimDurumu`: kapsamda şu durumdaki
       kontrol sayısı)
       → sayı yazılır. Sayım YAPILMADIYSA (`sayimlar === null` ya da o
         durum kovası hiç kurulmadıysa) "Değerlendirilmedi" yazılır —
         sayılmamış bir kova SIFIR DEĞİLDİR. Ölçülmüş sıfır ise sıfır
         yazılır ve iyi haberdir; ikisi ekranda da dosyada da ayrı durur.
   4 · Alan hiçbir kontrole bağlı değil (serbest soru: dönem, imza…)
       → "Değerlendirilmedi". Ürün o değeri BİLMEZ ve uydurmaz;
         doldurmak kurumun işidir.

   Hiçbir hücre boş kalmaz — öz denetim formuyla aynı kural, aynı sözler.

   Bu dosya veritabanı, React ve tarayıcı bilmez. */

import { DURUM_ETIKET, type Durum } from '../sabitler';
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
  /** Kapsamda bu durum kodundaki kontrol sayısı — `maddeKod` ile birlikte olmaz. */
  sayimDurumu?: Durum | null;
};

/** Durum kodu → kapsamda o durumdaki kontrol sayısı; `null` = HİÇ SAYILMADI. */
export type DurumSayimlari = ReadonlyMap<string, number> | null;
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
  sayimlar: DurumSayimlari = null,
): SablonSatiri {
  const kod = alan.maddeKod ?? null;
  const sayimKodu = alan.sayimDurumu ?? null;
  const madde = kod === null ? undefined : maddeler.get(kod);

  let deger: FormHucresi;
  let kaynak: FormHucresi;
  if (sayimKodu !== null) {
    /* Durum sayımı: kova KURULMADIYSA sıfır yazılmaz. Sayılmamış bir
       kovaya 0 yazmak, hiçbir şeye bakmadan "hiç yok" demektir; ölçülmüş
       sıfır ise gerçek bir cevaptır ve öyle yazılır. */
    const n = sayimlar === null ? undefined : sayimlar.get(sayimKodu);
    deger = n === undefined
      ? { anahtar: 'deger', deger: DEGERLENDIRILMEDI, isaret: 'olculmedi' }
      : { anahtar: 'deger', deger: String(n), isaret: null };
    kaynak = {
      anahtar: 'kaynak',
      deger: n === undefined
        ? 'Kapsam sayımı yapılmadı'
        : `Kapsamda "${DURUM_ETIKET[sayimKodu]}" sayımı`,
      isaret: null,
    };
  } else if (kod === null) {
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
    {
      anahtar: 'maddeKod',
      /* Sayım alanının "kontrolü" tek bir madde değil, bir DURUM KOVASIDIR;
         "Bağlı kontrol yok" demek sayımı serbest alan gibi gösterirdi. */
      deger: sayimKodu !== null
        ? `Durum sayımı · ${DURUM_ETIKET[sayimKodu]}`
        : kod ?? 'Bağlı kontrol yok',
      isaret: null,
    },
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
  sayimlar: DurumSayimlari = null,
): { ad: string; sutunlar: typeof SABLON_SUTUNLARI; satirlar: SablonSatiri[] }[] {
  return sablon.bolumler.map((b) => ({
    ad: b.baslik,
    sutunlar: SABLON_SUTUNLARI,
    satirlar: b.alanlar.map((a) => sablonSatiri(a, maddeler, sayimlar)),
  }));
}

/** Şablonun kurulumla ne kadar örtüştüğü — sayıyla. */
export function sablonOrtusmesi(
  sablon: Sablon,
  /* Yalnız VARLIK sorulur (`has`), değer okunmaz: çağıran bazen dolu
     girdileri, bazen yalnız kurulu kod kümesini taşır. */
  maddeler: ReadonlyMap<string, unknown>,
): { alan: number; bagli: number; baglanmadi: number; sayim: number; serbest: number } {
  let bagli = 0;
  let baglanmadi = 0;
  let sayim = 0;
  let serbest = 0;
  for (const b of sablon.bolumler) {
    for (const a of b.alanlar) {
      if (a.sayimDurumu) { sayim += 1; continue; }
      if (!a.maddeKod) { serbest += 1; continue; }
      if (maddeler.has(a.maddeKod)) bagli += 1; else baglanmadi += 1;
    }
  }
  return { alan: bagli + baglanmadi + sayim + serbest, bagli, baglanmadi, sayim, serbest };
}
