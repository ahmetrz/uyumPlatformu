/* ═══════════════════════════════════════════════════════════════════════
   DENETİM FORMU DOLDURUCU — SAF

   ── HİÇBİR HÜCRE BOŞ KALMAZ ───────────────────────────────────────────
   Denetim formunda boş hücre üç ayrı şeyi aynı anda söyler ve hiçbirini
   söylemez: "değerlendirdik, sonuç yok" · "değerlendirmedik" · "bu
   kontrol bize uygulanmıyor". Denetçi boş hücreyi kendi okumasıyla
   doldurur ve kurum o okumayı göremez.

   Bu yüzden burada üç ayrı SÖZ vardır ve üçü de yazılır:

     Değerlendirilmedi            ölçüm YAPILMADI (bilinmeyen ≠ sıfır)
     Kapsam dışı — <gerekçe>      gerekçesiyle birlikte
     Kapsam dışı · GEREKÇE YOK    kapsam dışı denmiş, sebebi yazılmamış

   Üçüncüsü bir KUSUR İŞARETİDİR ve gizlenmez. Gerekçe UYDURULMAZ: motor
   önerir, insan karar verir. Bir uyum ürününün kendi formunda gerekçe
   icat etmesi, ürünün en temel vaadini (kanıtın kökeni belli) bozar.

   ── OLGUNLUK: "0" İLE "ÖLÇÜLMEDİ" AYRI ────────────────────────────────
   Olgunluk kademesi 0 GEÇERLİ bir ölçümdür ("hiç uygulanmıyor");
   ölçülmemiş olmak başka bir şeydir. `null` sıfıra çekilmez.

   Bu dosya veritabanı, React ve tarayıcı bilmez; test edilebilir. */

/** Ölçülmemiş her hücrenin sözü. Sayı değil CÜMLE: "0" yazmak ölçüm
    yapıldığını söylerdi. */
export const DEGERLENDIRILMEDI = 'Değerlendirilmedi';

/** Kapsam dışı ama gerekçesiz — kusurun kendisi hücreye yazılır. */
export const GEREKCESIZ_KAPSAM_DISI = 'Kapsam dışı · GEREKÇE YOK';

/** Kapsam dışı; gerekçe çağırandan gelir, üretilmez. */
export const KAPSAM_DISI = 'Kapsam dışı';

export type FormIsareti = 'gerekcesiz_kapsam_disi' | 'olculmedi';

export type MaddeGirdisi = {
  /** `<ÇERÇEVE>-<kod>` — EPDK-SGYM-3 */
  kod: string;
  baslik: string;
  /** Uyum durumu; `null` = ölçülmedi. */
  durum: string | null;
  /** Kademe 0–5; `null` = ölçülmedi. `0` GEÇERLİ bir ölçümdür. */
  hedefOlgunluk: number | null;
  mevcutOlgunluk: number | null;
  kapsamDisi: boolean;
  /** Kapsam dışıysa SEBEBİ. `null` = yazılmamış → kusur işareti. */
  kapsamDisiGerekcesi: string | null;
  /** Kanıt dosyası sayısı; `null` = ölçülmedi (0 ile aynı şey değil). */
  kanitSayisi: number | null;
  sorumlu: string | null;
  /** Görünen tarih; `null` = hiç değerlendirilmedi. */
  sonDegerlendirme: string | null;
};

export type FormHucresi = {
  anahtar: string;
  /** ASLA boş dize değildir. */
  deger: string;
  isaret: FormIsareti | null;
};

export type FormSatiri = {
  maddeKod: string;
  hucreler: FormHucresi[];
  isaretler: FormIsareti[];
};

/** Sütun başlıkları — satırla AYNI sırada ve aynı sayıda. */
export const FORM_SUTUNLARI = [
  { anahtar: 'maddeKod', etiket: 'Madde' },
  { anahtar: 'baslik', etiket: 'Kontrol' },
  { anahtar: 'kapsam', etiket: 'Kapsam' },
  { anahtar: 'durum', etiket: 'Uyum durumu' },
  { anahtar: 'hedefOlgunluk', etiket: 'Hedef olgunluk' },
  { anahtar: 'mevcutOlgunluk', etiket: 'Mevcut olgunluk' },
  { anahtar: 'kanitSayisi', etiket: 'Kanıt sayısı' },
  { anahtar: 'sorumlu', etiket: 'Sorumlu' },
  { anahtar: 'sonDegerlendirme', etiket: 'Son değerlendirme' },
] as const;

/** Boş sayılan değerler. `0` BOŞ DEĞİLDİR — olgunluk 0 bir ölçümdür. */
function bosMu(d: unknown): boolean {
  return d === null || d === undefined || (typeof d === 'string' && d.trim() === '');
}

/** Tek hücre: değer varsa yazılır, yoksa "Değerlendirilmedi" der. */
export function hucre(anahtar: string, deger: string | number | null | undefined): FormHucresi {
  if (bosMu(deger)) return { anahtar, deger: DEGERLENDIRILMEDI, isaret: 'olculmedi' };
  return { anahtar, deger: String(deger), isaret: null };
}

/**
 * Kapsam hücresi. Üç hâl; üçüncüsü kusur işaretidir.
 *
 * Gerekçe UYDURULMAZ: buraya "ilgili değil" gibi bir varsayılan yazmak,
 * denetçiye kurumun VERMEDİĞİ bir beyanı vermek olurdu.
 */
export function kapsamHucresi(
  g: Pick<MaddeGirdisi, 'kapsamDisi' | 'kapsamDisiGerekcesi'>,
): FormHucresi {
  if (!g.kapsamDisi) return { anahtar: 'kapsam', deger: 'Kapsamda', isaret: null };
  if (bosMu(g.kapsamDisiGerekcesi)) {
    return { anahtar: 'kapsam', deger: GEREKCESIZ_KAPSAM_DISI, isaret: 'gerekcesiz_kapsam_disi' };
  }
  return { anahtar: 'kapsam', deger: `${KAPSAM_DISI} — ${g.kapsamDisiGerekcesi}`, isaret: null };
}

/** Bir maddeyi form satırına çevirir. Sütun kümesi SABİT ve tamdır. */
export function formSatiri(g: MaddeGirdisi): FormSatiri {
  const hucreler: FormHucresi[] = [
    { anahtar: 'maddeKod', deger: g.kod, isaret: null },
    { anahtar: 'baslik', deger: g.baslik, isaret: null },
    kapsamHucresi(g),
    /* Kapsam dışı bir kontrolün uyum durumu "Değerlendirilmedi" DEĞİL
       "Kapsam dışı"dır: ölçülmemiş değil, ölçülmesi gerekmiyor. İkisini
       aynı söze düşürmek, gerçek boşluğu kapsam kararının arkasına
       saklardı. */
    hucre('durum', g.kapsamDisi ? KAPSAM_DISI : g.durum),
    hucre('hedefOlgunluk', g.hedefOlgunluk),
    hucre('mevcutOlgunluk', g.mevcutOlgunluk),
    hucre('kanitSayisi', g.kanitSayisi),
    hucre('sorumlu', g.sorumlu),
    hucre('sonDegerlendirme', g.sonDegerlendirme),
  ];
  const isaretler = [...new Set(
    hucreler.map((h) => h.isaret).filter((i): i is FormIsareti => i !== null),
  )];
  return { maddeKod: g.kod, hucreler, isaretler };
}

export type FormOlcumu = {
  satir: number;
  hucre: number;
  /** SIFIR olmalı — kapı budur. */
  bosHucre: number;
  olculmedi: number;
  gerekcesizKapsamDisi: number;
};

/** Formun kendi ölçümü. `bosHucre` sıfır DEĞİLSE üretim durdurulur. */
export function formOlcumu(satirlar: readonly FormSatiri[]): FormOlcumu {
  let hucreSayisi = 0;
  let bos = 0;
  let olculmedi = 0;
  let gerekcesiz = 0;
  for (const s of satirlar) {
    for (const h of s.hucreler) {
      hucreSayisi += 1;
      if (h.deger.trim() === '') bos += 1;
      if (h.isaret === 'olculmedi') olculmedi += 1;
      if (h.isaret === 'gerekcesiz_kapsam_disi') gerekcesiz += 1;
    }
  }
  return {
    satir: satirlar.length,
    hucre: hucreSayisi,
    bosHucre: bos,
    olculmedi,
    gerekcesizKapsamDisi: gerekcesiz,
  };
}

/**
 * BOŞ HÜCRE KAPISI. Sıfır dışında her sayı FIRLATIR.
 *
 * Maskeleyip geçmek, bir dahaki sütun eklendiğinde sessiz boşluk
 * demektir: kimse fark etmez, form denetçiye gider. Üretimi durdurmak
 * gürültülüdür ve gürültü burada doğru davranıştır — kanıt paketinin sır
 * süzgeciyle aynı gerekçe.
 */
export function bosHucreKapisi(olcum: FormOlcumu): void {
  if (olcum.bosHucre > 0) {
    throw new Error(`Denetim formunda ${olcum.bosHucre} BOŞ hücre var`
      + ` (${olcum.satir} satır · ${olcum.hucre} hücre). Boş hücre denetçiye`
      + ' üç ayrı şeyi aynı anda söyler; form üretilmez.');
  }
}
