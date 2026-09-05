import type { Durum } from '@/components/kabuk/temel';

/* ═══ OT-05 · İş süreci → proses adımı → varlık ════════════════════════

   Sunucu ile istemcinin PAYLAŞTIĞI tipler ve saf hesaplar; burada
   veritabanı ve React bağımlılığı yoktur.

   ── ÜÇ DEĞERLİLİK BAĞIN KENDİSİNDEDİR ─────────────────────────────────
   `tekNokta` ve `yedekli` üç değerlidir: `true` / `false` / `null`.
   `null` "değil" DEĞİL "değerlendirilmedi"dir. İkisini birleştirmek,
   hiç bakılmamış bir zinciri "tek nokta yok" diye yeşile boyardı ve o
   zincire kimse bir daha bakmazdı. Bu yüzden ekran üç sayacı ayrı
   tutar: TEK NOKTA (kanıtlı risk) · yedekli (kanıtlı sağlamlık) ·
   DEĞERLENDİRİLMEDİ (ölçüm borcu).                                     */

export type BagSatiri = {
  id: string;
  varlikId: string;
  etiket: string;
  ad: string;
  kritiklik: string;
  /** kontrol | olcum | iletisim | kayit | emniyet | diger */
  rol: string;
  /** null = DEĞERLENDİRİLMEDİ; "tek nokta değil" anlamına gelmez. */
  tekNokta: boolean | null;
  /** null = DEĞERLENDİRİLMEDİ; "yedeği yok" anlamına gelmez. */
  yedekli: boolean | null;
  aciklama: string | null;
  /** Bağı düzenlemek varlığın santral kapsamına tabidir. */
  duzenlenebilir: boolean;
};

export type AdimSatiri = {
  id: string;
  kod: string;
  ad: string;
  sira: number;
  aciklama: string | null;
  /** null = BELİRLENMEDİ — sıfır saat değil. */
  rtoSaat: number | null;
  rpoSaat: number | null;
  uretimEtkisi: string;
  varliklar: BagSatiri[];
};

export type SurecSatiri = {
  id: string;
  kod: string;
  ad: string;
  tesisId: string | null;
  tesisAd: string | null;
  uretimEtkisi: string;
  adimlar: AdimSatiri[];
  /** Süreci ve adımlarını düzenlemek `tanimlar/onay` + santral kapsamı ister. */
  duzenlenebilir: boolean;
};

/* ── Sayaçlar ───────────────────────────────────────────────────────── */

export type SurecSayaci = {
  adim: number;
  bag: number;
  /** Kanıtlı tek nokta: `tekNokta === true` ve yedekli DEĞİL. */
  tekNokta: number;
  /** Ölçüm borcu: tek nokta durumu hiç değerlendirilmemiş bağ. */
  degerlendirilmedi: number;
  /** Hiç varlık bağlanmamış adım — zincirin kopuk halkası. */
  bosAdim: number;
  /** RTO'su belirlenmemiş adım sayısı. */
  rtosuz: number;
};

export function sayaclar(s: SurecSatiri): SurecSayaci {
  const baglar = s.adimlar.flatMap((a) => a.varliklar);
  return {
    adim: s.adimlar.length,
    bag: baglar.length,
    tekNokta: baglar.filter((b) => b.tekNokta === true && b.yedekli !== true).length,
    degerlendirilmedi: baglar.filter((b) => b.tekNokta === null).length,
    bosAdim: s.adimlar.filter((a) => a.varliklar.length === 0).length,
    rtosuz: s.adimlar.filter((a) => a.rtoSaat === null).length,
  };
}

/**
 * Sürecin ekran durumu.
 *
 * Sıra bilinçli: KANITLI TEK NOKTA en ağırdır. Adımı olmayan ya da hiç
 * değerlendirilmemiş süreç BİLİNMEYENDİR — "sorunsuz" değil. Zincirin
 * kopuk halkası (varlıksız adım) bir kusurdur ama bir riskten hafiftir.
 */
export function surecImi(s: SurecSatiri): Durum {
  const c = sayaclar(s);
  if (c.adim === 0) return 'unk';
  if (c.tekNokta > 0) return 'bd';
  if (c.bag === 0 || c.degerlendirilmedi > 0) return 'unk';
  if (c.bosAdim > 0) return 'md';
  return 'ok';
}

export function surecSozu(s: SurecSatiri): string {
  const c = sayaclar(s);
  if (c.adim === 0) return 'Adım tanımlanmadı — süreç kırılımı yok';
  if (c.tekNokta > 0) return `${c.tekNokta} bağ tek nokta ve yedeksiz`;
  if (c.bag === 0) return 'Hiçbir adıma varlık bağlanmadı';
  if (c.degerlendirilmedi > 0) return `${c.degerlendirilmedi} bağda tek nokta değerlendirilmedi`;
  if (c.bosAdim > 0) return `${c.bosAdim} adımın varlığı yok`;
  return 'Zincirin tamamı değerlendirildi';
}

/** Bağın ekran durumu — üç değerliliği renkte de korur. */
export function bagImi(b: BagSatiri): Durum {
  if (b.tekNokta === null) return 'unk';
  if (b.tekNokta && b.yedekli !== true) return 'bd';
  if (b.tekNokta && b.yedekli === true) return 'md';
  return 'ok';
}

export function bagSozu(b: BagSatiri): string {
  if (b.tekNokta === null) return 'tek nokta değerlendirilmedi';
  if (b.tekNokta && b.yedekli !== true) {
    return b.yedekli === false ? 'tek nokta · yedeği yok' : 'tek nokta · yedeklilik ölçülmedi';
  }
  if (b.tekNokta) return 'tek nokta ama yedekli';
  return 'tek nokta değil';
}

/** Saat değeri; null = BELİRLENMEDİ ve sıfır diye yazılmaz. */
export function saat(x: number | null): string {
  return x === null ? 'belirlenmedi' : `${x} saat`;
}
