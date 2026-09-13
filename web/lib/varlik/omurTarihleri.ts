/* ═══ OT-20 · Garanti · destek · bakım · lisans süreleri ══════════════

   Varlığın ömrü tek bir tarihe indirgenemez. Beş ayrı saat işler ve
   hepsi farklı şey söyler:

     GARANTİ    Üretici arızalı parçayı değiştirir mi?
     DESTEK     Üretici yama ve teknik destek verir mi? (`destekBitis`)
     BAKIM      Kurumun bakım anlaşması sürüyor mu?
     EOL / EOS  Ürün üretimden ve destekten çıktı mı?
     LİSANS     Üzerindeki yazılımın hakkı sürüyor mu?

   Ekran bunları TEK bir "ömür" rozetine indirirse yanlış işi öne alır:
   garantisi bitmiş ama desteği süren bir cihaz için acil bir şey yoktur;
   desteği bitmiş bir cihaz ise yama alamaz ve bu bir güvenlik açığıdır.

   ── GİRİLMEMİŞ TARİH GEÇMİŞ DEĞİLDİR ─────────────────────────────────
   Tarihi olmayan bir saat "doldu" saymaz, "ölçülmedi" der. Bu dosyanın
   her fonksiyonu `null`'ı ayrı bir sonuç olarak taşır. */

export const GUN_MS = 86_400_000;

export const SURE_TIPLERI = [
  'garanti', 'destek', 'bakim', 'eol', 'eos',
] as const;
export type SureTipi = (typeof SURE_TIPLERI)[number];

export const SURE_ETIKETI: Record<SureTipi, string> = {
  garanti: 'Garanti', destek: 'Üretici desteği', bakim: 'Bakım sözleşmesi',
  eol: 'Üretimden kalkma (EOL)', eos: 'Destek sonu (EOS)',
};

/**
 * Bir sürenin durumu.
 *
 * `olculmedi` bir durum, `gecerli` başka bir durumdur; ikisini
 * birleştirmek envanterin en sık yaptığı yalandır ("tarih yok, demek ki
 * sorun yok").
 */
export type SureDurumu = 'gecerli' | 'yaklasiyor' | 'doldu' | 'olculmedi';

export const SURE_SINIFI: Record<SureDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  gecerli: 'ok', yaklasiyor: 'md', doldu: 'bd', olculmedi: 'unk',
};

export type SureKaydi = {
  tip: SureTipi;
  /** ISO tarih; null = girilmedi. */
  tarih: string | null;
  durum: SureDurumu;
  /** Kalan gün; null = tarih girilmemiş (0 DEĞİL). */
  kalanGun: number | null;
};

/** Uyarı eşiği (gün). Ürün genelinde tek yerde durur. */
export const YAKLASMA_ESIGI_GUN = 90;

export function kalanGun(tarih: string | null | undefined, simdi: number): number | null {
  if (!tarih) return null;
  const t = new Date(tarih).getTime();
  return Number.isNaN(t) ? null : Math.ceil((t - simdi) / GUN_MS);
}

export function sureDurumu(
  tarih: string | null | undefined,
  simdi: number,
  esikGun: number = YAKLASMA_ESIGI_GUN,
): SureDurumu {
  const k = kalanGun(tarih, simdi);
  if (k === null) return 'olculmedi';
  if (k < 0) return 'doldu';
  return k <= esikGun ? 'yaklasiyor' : 'gecerli';
}

export type OmurGirdisi = {
  garantiBitis: string | null;
  destekBitis: string | null;
  bakimBitis: string | null;
  eolTarihi: string | null;
  eosTarihi: string | null;
};

export function sureleriCoz(
  g: OmurGirdisi, simdi: number, esikGun: number = YAKLASMA_ESIGI_GUN,
): SureKaydi[] {
  const eslesme: [SureTipi, string | null][] = [
    ['garanti', g.garantiBitis], ['destek', g.destekBitis],
    ['bakim', g.bakimBitis], ['eol', g.eolTarihi], ['eos', g.eosTarihi],
  ];
  return eslesme.map(([tip, tarih]) => ({
    tip, tarih,
    durum: sureDurumu(tarih, simdi, esikGun),
    kalanGun: kalanGun(tarih, simdi),
  }));
}

/**
 * En ACİL süre — hangisi önce bitiyor.
 *
 * Yalnız GİRİLMİŞ tarihler yarışır. Hepsi girilmemişse `null` döner ve
 * çağıran "ölçülmedi" der; en yakın tarihi sıfır kabul edip "bugün
 * doluyor" yazmak, olmayan bir aciliyet üretirdi.
 */
export function enAcilSure(kayitlar: readonly SureKaydi[]): SureKaydi | null {
  const olculen = kayitlar.filter((k) => k.kalanGun !== null);
  if (olculen.length === 0) return null;
  return olculen.reduce((en, k) => (k.kalanGun! < en.kalanGun! ? k : en));
}

/** Ölçülmemiş süre sayısı — kapatılacak veri borcu. */
export function olcumBorcu(kayitlar: readonly SureKaydi[]): SureTipi[] {
  return kayitlar.filter((k) => k.durum === 'olculmedi').map((k) => k.tip);
}

/**
 * Bakım takvimi durumu.
 *
 * `sonrakiBakim` geçmişteyse bakım GECİKMİŞTİR ve bu, sözleşme bitişinden
 * ayrı bir sorundur: sözleşme sürüyor olabilir ama bakım yapılmamıştır.
 */
export type BakimDurumu = 'planlandi' | 'gecikti' | 'planlanmadi';

export const BAKIM_SOZU: Record<BakimDurumu, string> = {
  planlandi: 'Sonraki bakım planlı',
  gecikti: 'Planlanan bakım tarihi geçti',
  planlanmadi: 'Sonraki bakım planlanmadı',
};

export function bakimDurumu(
  sonrakiBakim: string | null | undefined, simdi: number,
): BakimDurumu {
  const k = kalanGun(sonrakiBakim, simdi);
  if (k === null) return 'planlanmadi';
  return k < 0 ? 'gecikti' : 'planlandi';
}
