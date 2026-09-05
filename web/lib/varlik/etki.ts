/* ═══ OT-05 · OT-08 · Üretim ve iş sürekliliği etkisi ═════════════════

   İki soru, tek dosya, çünkü ikisi aynı hesabın uçlarıdır:

     OT-05  Bu varlık hangi proses adımında devrede?
     OT-08  O adımın durması ne kaybettirir?

   ── ETKİ MİRAS ALINIR ─────────────────────────────────────────────────
   Bir cihazın kendi `uretimEtkisi` etiketi çoğu zaman "bilinmiyor"dur:
   kimse tek tek girmez. Ama o cihaz üretimi durduran bir adımda tek
   noktaysa, etkisi BİLİNİR — adımdan miras alınır. Mirası hesaplamamak,
   envanterin en pahalı sorusunu ("hangi cihaz üretimi durdurur")
   cevapsız bırakırdı.

   ── MİRAS ÖLÇÜLMÜŞ DEĞERİ EZMEZ ───────────────────────────────────────
   Cihazın kendi değeri BİLİNİYORSA o kazanır: insanın ölçtüğü değer,
   türetilmiş bir tahminden üstündür. Miras yalnız BİLİNMEYENİ doldurur
   ve sonuç `kaynak` alanıyla hangisinin geçerli olduğunu söyler.

   ── SIFIR YOK, BİLİNMİYOR VAR ─────────────────────────────────────────
   MW kaybı `null` ise "kayıp yok" değil "hesaplanmadı"dır. Toplama
   girmez ve toplam da bu yüzden `null` olabilir — kısmi bir toplamı tam
   gibi göstermek, kapasite kararını yanlış sayıya dayandırırdı. */

export const ETKI_DUZEYLERI = [
  'bilinmiyor', 'yok', 'dusuk', 'orta', 'yuksek', 'uretim_durur',
] as const;
export type EtkiDuzeyi = (typeof ETKI_DUZEYLERI)[number];

export const ETKI_ETIKETI: Record<EtkiDuzeyi, string> = {
  bilinmiyor: 'bilinmiyor',
  yok: 'etki yok',
  dusuk: 'düşük',
  orta: 'orta',
  yuksek: 'yüksek',
  uretim_durur: 'üretim durur',
};

/**
 * Şiddet sırası. `bilinmiyor` EN ALTTA DEĞİL, kendi kulvarındadır:
 * karşılaştırmalarda hiçbir bilinen değerle yer değiştirmez ve
 * `enAgirEtki` onu yalnız başka hiçbir bilinen değer yoksa döndürür.
 */
const AGIRLIK: Record<EtkiDuzeyi, number> = {
  yok: 0, dusuk: 1, orta: 2, yuksek: 3, uretim_durur: 4, bilinmiyor: -1,
};

export function etkiDuzeyi(ham: string | null | undefined): EtkiDuzeyi {
  if (typeof ham !== 'string') return 'bilinmiyor';
  return (ETKI_DUZEYLERI as readonly string[]).includes(ham)
    ? ham as EtkiDuzeyi
    : 'bilinmiyor';
}

/** Bilinenlerin en ağırı; hiç bilinen yoksa `bilinmiyor`. */
export function enAgirEtki(duzeyler: readonly (string | null | undefined)[]): EtkiDuzeyi {
  let en: EtkiDuzeyi = 'bilinmiyor';
  for (const d of duzeyler) {
    const c = etkiDuzeyi(d);
    if (c === 'bilinmiyor') continue;
    if (en === 'bilinmiyor' || AGIRLIK[c] > AGIRLIK[en]) en = c;
  }
  return en;
}

export type AdimBagi = {
  adimId: string;
  adimAd: string;
  surecKod: string;
  surecAd: string;
  /** kontrol | olcum | iletisim | kayit | emniyet | diger */
  rol: string;
  /** null = değerlendirilmedi */
  tekNokta: boolean | null;
  yedekli: boolean | null;
  /** adımın kendi üretim etkisi */
  adimEtkisi: string;
  rtoSaat: number | null;
  rpoSaat: number | null;
};

export type EtkiSonucu = {
  duzey: EtkiDuzeyi;
  /** `olculdu` = varlığın kendi kaydı · `miras` = adımdan · `yok` = hiçbiri */
  kaynak: 'olculdu' | 'miras' | 'yok';
  /** Mirasın hangi adımdan geldiği (kaynak `miras` ise dolu). */
  mirasAdimId: string | null;
};

/**
 * Varlığın GEÇERLİ üretim etkisi.
 *
 * @param kendi Varlığın kendi etiketi (`Varlik.uretimEtkisi`).
 * @param baglar Varlığın bağlı olduğu proses adımları.
 */
export function gecerliEtki(
  kendi: string | null | undefined,
  baglar: readonly AdimBagi[],
): EtkiSonucu {
  const kendiDuzey = etkiDuzeyi(kendi);
  if (kendiDuzey !== 'bilinmiyor') {
    return { duzey: kendiDuzey, kaynak: 'olculdu', mirasAdimId: null };
  }
  let en: EtkiDuzeyi = 'bilinmiyor';
  let adimId: string | null = null;
  for (const b of baglar) {
    const d = etkiDuzeyi(b.adimEtkisi);
    if (d === 'bilinmiyor') continue;
    if (en === 'bilinmiyor' || AGIRLIK[d] > AGIRLIK[en]) { en = d; adimId = b.adimId; }
  }
  return en === 'bilinmiyor'
    ? { duzey: 'bilinmiyor', kaynak: 'yok', mirasAdimId: null }
    : { duzey: en, kaynak: 'miras', mirasAdimId: adimId };
}

export type EtkiOzeti = {
  /** MW kaybı toplamı; `null` = hiçbir varlıkta hesaplanmamış. */
  toplamMw: number | null;
  /** Toplama giren varlık sayısı. */
  olculen: number;
  /** MW kaybı hesaplanmamış varlık sayısı — ÖLÇÜM BORCU. */
  olculmeyen: number;
  /** Üretimi durduran varlık sayısı (miras dâhil). */
  uretimDurduran: number;
  /** Etkisi hiç bilinmeyen varlık sayısı. */
  etkisiBilinmeyen: number;
};

/**
 * Filo düzeyinde etki özeti.
 *
 * `toplamMw` yalnız ölçülmüş satırları toplar ve `olculmeyen` sayısı
 * yanında durur: kısmi bir toplamı tam gibi göstermek, kapasite kararını
 * yanlış sayıya dayandırırdı. Hiçbir satır ölçülmemişse toplam `null`'dır
 * — `0 MW` yazmak "kayıp yok" demek olurdu.
 */
export function etkiOzeti(
  satirlar: readonly {
    uretimKaybiMw: number | null;
    etki: EtkiSonucu;
  }[],
): EtkiOzeti {
  let toplam = 0; let olculen = 0; let olculmeyen = 0;
  let durduran = 0; let bilinmeyen = 0;
  for (const s of satirlar) {
    if (typeof s.uretimKaybiMw === 'number' && Number.isFinite(s.uretimKaybiMw)) {
      toplam += s.uretimKaybiMw; olculen += 1;
    } else {
      olculmeyen += 1;
    }
    if (s.etki.duzey === 'uretim_durur') durduran += 1;
    if (s.etki.duzey === 'bilinmiyor') bilinmeyen += 1;
  }
  return {
    toplamMw: olculen === 0 ? null : Math.round(toplam * 100) / 100,
    olculen, olculmeyen, uretimDurduran: durduran, etkisiBilinmeyen: bilinmeyen,
  };
}

/**
 * Adımda TEK NOKTA olan ve yedeği bulunmayan bağlar.
 *
 * `tekNokta === null` (değerlendirilmedi) buraya GİRMEZ: değerlendirilmemiş
 * bir bağı tek nokta saymak, olmayan bir riski rapor etmek olurdu. O
 * eksiklik `degerlendirilmemisBaglar` ile ayrıca sayılır.
 */
export function tekNoktaRiskleri(baglar: readonly AdimBagi[]): AdimBagi[] {
  return baglar.filter((b) => b.tekNokta === true && b.yedekli !== true);
}

/** Tek nokta durumu hiç değerlendirilmemiş bağlar — ölçüm borcu. */
export function degerlendirilmemisBaglar(baglar: readonly AdimBagi[]): AdimBagi[] {
  return baglar.filter((b) => b.tekNokta === null);
}

/**
 * En sıkı kurtarma hedefi (saat). Adımların RTO'ları arasından EN
 * KÜÇÜĞÜ geçerlidir: bir varlık iki adımda devredeyse, sıkı olan hedef
 * onu bağlar. Hiçbiri belirlenmemişse `null`.
 */
export function enSikiRto(baglar: readonly AdimBagi[]): number | null {
  const degerler = baglar
    .map((b) => b.rtoSaat)
    .filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  return degerler.length === 0 ? null : Math.min(...degerler);
}

export function enSikiRpo(baglar: readonly AdimBagi[]): number | null {
  const degerler = baglar
    .map((b) => b.rpoSaat)
    .filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  return degerler.length === 0 ? null : Math.min(...degerler);
}
