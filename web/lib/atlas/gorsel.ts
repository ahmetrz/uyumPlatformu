/* Fotoğraf varlık kataloğu — 05-photography.md.
   Santral→anahtar ilişkisi VERİDE (Tesis.gorselAnahtari) yaşar; burası yalnız
   "o anahtar için hangi boyutlar üretilmiş" sorusunu yanıtlayan manifesttir.

   Bağlayıcı kurallar (§1):
   1. Bir görsel yalnız gösterdiği santrali temsil eder.
   2. Üretim tipleri asla birbirinin yerine geçmez.
   3. Karşılığı yoksa nötr grup kompozisyonu veya hiç hero yok — "yakın" bir
      santralin fotoğrafı ASLA doldurma amacıyla kullanılmaz.
   6. Fallback tipografiktir, kırık görsel değildir. */

const TEMEL = process.env.NEXT_PUBLIC_DEMO === '1' ? '/uyumPlatformu' : '';

/** Tam boy hero kırpımı üretilmiş anahtarlar (560px hero / 300px plaka). */
const HERO: Record<string, string> = {
  kizildere3: 'kizildere3-jes',
  ikizdere: 'ikizdere-hes',
  jhimpir: 'jhimpir-res',
};

/** 240×150 seçici küçük görseli üretilmiş anahtarlar. */
const KUCUK = new Set([
  'alasehir', 'beykoy', 'ikizdere', 'jhimpir', 'kizildere1',
  'kizildere2', 'kizildere3', 'kuzgun', 'mercan', 'tercan',
]);

export const NOTR_TRIPTIK = `${TEMEL}/atlas/portfolio-triptych.webp`;
export const RAY_SERIDI = `${TEMEL}/atlas/rail-strip.webp`;
export const BOLUM_KIRPIMI = `${TEMEL}/atlas/kizildere3-mini.webp`;

/** Hero/plaka fotoğrafı — yoksa null (çağıran tipografik fallback render eder). */
export function heroGorseli(anahtar: string | null | undefined): string | null {
  if (!anahtar) return null;
  const d = HERO[anahtar];
  return d ? `${TEMEL}/atlas/santral/${d}.webp` : null;
}

/** Seçici küçük görseli — yoksa null. */
export function kucukGorsel(anahtar: string | null | undefined): string | null {
  if (!anahtar || !KUCUK.has(anahtar)) return null;
  return `${TEMEL}/atlas/kucuk/${anahtar}.webp`;
}

/** Alt metin santrali ve tipini adlandırmak ZORUNDADIR (§5). */
export function gorselAlt(ad: string, tipAdi: string, konum?: string | null): string {
  return `${ad} — ${tipAdi.toLocaleLowerCase('tr-TR')} santral${konum ? `, ${konum}` : ''}`;
}

/** Üretim tipi kimlik rengi — YALNIZ kimlik, asla durum veya etkileşim. */
export function tipRengi(tipKod: string | null | undefined, koyuYuzey = false): string {
  const t = (tipKod ?? '').toUpperCase();
  if (t === 'JEO') return koyuYuzey ? 'var(--jesd)' : 'var(--jes)';
  if (t === 'HES') return koyuYuzey ? 'var(--hesd)' : 'var(--hes)';
  if (t === 'RES') return koyuYuzey ? 'var(--resd)' : 'var(--res)';
  if (t === 'GES') return 'var(--ges)';
  return 'var(--i3)';
}

export const TIP_ADI: Record<string, string> = {
  JEO: 'Jeotermal', HES: 'Hidroelektrik', RES: 'Rüzgâr', GES: 'Güneş',
  DGKC: 'Doğal gaz kombine çevrim', TERMIK: 'Termik', MERKEZ: 'Merkez BT',
};
