import type { Durum } from '@/components/atlas/temel';

/* Keşif inceleme kuyruğunun saf mantığı — sunucu ve istemci ortak kullanır.
   Burada veritabanı, React ve server-only bağımlılığı YOKTUR. */

export type Aday = {
  varlikId: string;
  etiket: string;
  ad: string;
  anahtarlar: string[];
  guven: number | null;
};

export type KesifSatiri = {
  id: string;
  kaynak: string;
  kaynakKayitId: string;
  durum: string;
  connectorAd: string | null;
  /** satırın konusu — en güçlü kimlik alanı */
  konu: string;
  /** kayıt kimliği + en fazla iki olgu */
  alt: string;
  /** eşleşme güveni · 0–1; null = ÖLÇÜLMEDİ (sıfır değil) */
  guvenSkoru: number | null;
  /** KAYNAĞIN kendi beyan ettiği güven — eşleşme güveniyle karıştırılmaz */
  kaynakGuveni: number | null;
  /** eşleştirme geçişi bu kayda hiç uğramadı mı */
  eslestirilmedi: boolean;
  eslesmeAnahtari: string | null;
  eslesen: { id: string; etiket: string; ad: string; tesisId: string | null } | null;
  adaylar: Aday[];
  cakisma: boolean;
  gerekce: string;
  /** gözlemin dolu alanları — çekmecede gösterilir */
  gozlemAlanlari: { etiket: string; deger: string }[];
  ilkGorulme: string;
  sonGorulme: string;
  gunGorulmedi: number;
  inceleyen: string | null;
  incelemeZamani: string | null;
  incelemeNotu: string | null;
  /** kullanıcı bu kayıt için karar verebilir mi (tesis kapsamı dâhil) */
  kararVerilebilir: boolean;
};

export const DURUM_SOZU_KESIF: Record<string, string> = {
  kesfedildi: 'Keşfedildi',
  normalize: 'Normalize edildi',
  eslesti: 'Eşleşti · onay bekliyor',
  inceleme_bekliyor: 'İnceleme bekliyor',
  onaylandi: 'Onaylandı',
  reddedildi: 'Reddedildi',
  yinelenen: 'Yinelenen',
};

export const ANAHTAR_SOZU: Record<string, string> = {
  seri: 'seri numarası',
  mac: 'MAC adresi',
  etiket: 'etiket',
  hostname: 'hostname',
  ip: 'IP adresi',
  uretici_model: 'üretici + model',
};

/** Kaynak kategorisi → insan sözü. Bilinmeyen kod OLDUĞU GİBİ gösterilir. */
export const KAYNAK_SOZU: Record<string, string> = {
  csv: 'CSV / elle aktarım',
  firewall: 'Güvenlik duvarı',
  switch_arp: 'Switch ARP/MAC',
  dhcp: 'DHCP kiraları',
  snmp: 'SNMP (salt okunur)',
  siem: 'SIEM / log',
  historian: 'Historian',
  scada_export: 'SCADA envanter dışa aktarımı',
  vendor_export: 'Tedarikçi dışa aktarımı',
};

export const BEKLEYEN_DURUMLAR = ['kesfedildi', 'normalize', 'eslesti', 'inceleme_bekliyor'];
export const GORUNMEZ_ESIK_GUN = 30;
/** Yoğunluk sözleşmesi: 5–9 görünür satır, gerisi kuyruğa iner. */
export const GORUNUR_TAVAN = 9;

export function bekliyorMu(s: KesifSatiri): boolean {
  return BEKLEYEN_DURUMLAR.includes(s.durum);
}

/** Satır işaretçisi. Bilinmeyen (`unk`) ile kritik (`bd`) aynı DEĞİLDİR. */
export function satirDurumu(s: KesifSatiri): Durum {
  if (s.durum === 'onaylandi') return 'ok';
  if (s.durum === 'reddedildi') return 'pl';
  if (s.cakisma) return 'bd';
  if (s.durum === 'eslesti') return 'md';
  return 'unk';
}

/** Güven hücresi: null "ölçülmedi"dir, `0` ya da `%0` DEĞİLDİR. */
export function guvenYazisi(skor: number | null): string {
  return skor === null ? 'ölçülmedi' : `%${Math.round(skor * 100)}`;
}

export function guvenDurumu(skor: number | null): Durum | undefined {
  if (skor === null) return 'unk';
  if (skor >= 0.8) return undefined;
  return skor >= 0.5 ? 'md' : 'bd';
}

/** Sıralama: karar bekleyen ve en riskli üstte, karara bağlanan altta. */
export function sirala(satirlar: KesifSatiri[]): KesifSatiri[] {
  const agirlik = (s: KesifSatiri) => {
    if (!bekliyorMu(s)) return 4;
    if (s.cakisma) return 0;
    if (!s.eslesen) return 1;
    if (s.guvenSkoru === null) return 2;
    return 3;
  };
  return [...satirlar].sort((a, b) =>
    agirlik(a) - agirlik(b)
    || (a.guvenSkoru ?? -1) - (b.guvenSkoru ?? -1)
    || a.konu.localeCompare(b.konu, 'tr'));
}

/** Kuyruğa inebilir: karar bekleyen hiçbir satır toplanmaz. */
export function toplanabilir(s: KesifSatiri): boolean {
  return !bekliyorMu(s);
}

export type Mercek = 'hepsi' | 'cakisma' | 'eslesmeyen' | 'eslesti' | 'karar';

export const MERCEKLER: { id: Mercek; ad: string }[] = [
  { id: 'hepsi', ad: 'Tümü' },
  { id: 'cakisma', ad: 'Çakışma' },
  { id: 'eslesmeyen', ad: 'Eşleşme yok' },
  { id: 'eslesti', ad: 'Eşleşti' },
  { id: 'karar', ad: 'Karara bağlandı' },
];

export function mercekten(s: KesifSatiri, m: Mercek): boolean {
  switch (m) {
    case 'cakisma': return bekliyorMu(s) && s.cakisma;
    case 'eslesmeyen': return bekliyorMu(s) && !s.eslesen && !s.cakisma;
    case 'eslesti': return bekliyorMu(s) && !!s.eslesen;
    case 'karar': return !bekliyorMu(s);
    default: return true;
  }
}

export type Metrikler = {
  bekleyen: number;
  cakisan: number;
  guvensiz: number;
  gorunmeyen: number;
};

export function metrikleriHesapla(satirlar: KesifSatiri[]): Metrikler {
  const bekleyen = satirlar.filter(bekliyorMu);
  return {
    bekleyen: bekleyen.length,
    cakisan: bekleyen.filter((s) => s.cakisma).length,
    // "Güven ölçülmedi" — sıfır güven değil; ayrı sayılır ve ayrı gösterilir.
    guvensiz: bekleyen.filter((s) => s.guvenSkoru === null).length,
    gorunmeyen: satirlar.filter((s) => s.gunGorulmedi >= GORUNMEZ_ESIK_GUN).length,
  };
}

/* ═══ Kapsam ══════════════════════════════════════════════════════════ */

/**
 * Keşif kuyruğunun kapsam koşulu (Prisma `where` parçası).
 *
 * Bir keşif kaydı üç yoldan bir santrale bağlanabilir: eşleştiği varlığın
 * santrali, kaynağın beyan ettiği santral (`tesisId`), ya da hiçbiri.
 * Kapsamı daraltılmış kullanıcı ilk ikisinden yalnız kendi santrallerini
 * görür; üçüncüsü — santrali BİLİNMEYEN kayıt — herkese görünür.
 *
 * Sonuncusu bilinçli bir karardır: bilinmeyeni gizlemek onu kimsenin
 * incelemeyeceği anlamına gelir ve keşif kuyruğunun varlık sebebi tam da
 * o kayıtlardır. "Bilinmiyor" burada "yasak" değil "henüz atanmadı"dır.
 * Buradaki risk — bilinmeyen kaydın BAŞKA santralin verisini taşıması —
 * kuyruğun kendisinde değil, ÜRETİM tarafında kapatılır: kapsamı
 * yapılandırılmış bir connector kapsam dışı ya da santralsiz kayıt
 * yazamaz (bkz. `lib/entegrasyon/cekirdek.ts → connectorKapsamKodlari`).
 *
 * Sayfadan BURAYA taşındı: kapsam kuralı bir sayfa detayı değil, negatif
 * testi yazılabilmesi gereken bir güvenlik değişmezidir.
 */
export function kesifKapsamKosulu(gorulebilir: string[] | null) {
  if (gorulebilir === null) return {};   // kapsam sınırsız
  return {
    OR: [
      { eslesenVarlik: { tesisId: { in: gorulebilir } } },
      // santralsiz bir varlığa eşleşmiş kayıt da 'bilinmiyor' kümesindedir
      { eslesenVarlik: { tesisId: null } },
      { eslesenVarlikId: null, tesisId: { in: gorulebilir } },
      { eslesenVarlikId: null, tesisId: null },
    ],
  };
}
