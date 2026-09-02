import { TEMEL } from './demo';

/* Fotoğraf varlık kataloğu — 05-photography.md.
   Santral→anahtar ilişkisi VERİDE (Tesis.gorselAnahtari) yaşar; burası yalnız
   "o anahtar için hangi boyutlar üretilmiş" sorusunu yanıtlayan manifesttir.

   Bağlayıcı kurallar (§1):
   1. Bir görsel yalnız gösterdiği santrali temsil eder.
   2. Üretim tipleri asla birbirinin yerine geçmez.
   3. Karşılığı yoksa nötr grup kompozisyonu veya hiç hero yok — "yakın" bir
      santralin fotoğrafı ASLA doldurma amacıyla kullanılmaz.
   6. Fallback tipografiktir, kırık görsel değildir. */



/** Tam boy hero kırpımı üretilmiş anahtarlar (560px hero / 300px plaka).
    Set: Ahmet'in sağladığı 17 temsilî görsel (10'u 2026-09-01, 7'si
    2026-09-02), künye `public/santraller/KUNYE.md`. Portföydeki her tesis
    kendi görselini taşır. Anahtar → dosya adı `<anahtar>-<tip>.webp`. */
const HERO: Record<string, string> = {
  kizildere1: 'kizildere1-jes',
  kizildere2: 'kizildere2-jes',
  kizildere3: 'kizildere3-jes',
  alasehir: 'alasehir-jes',
  gokcedag: 'gokcedag-res',
  ikizdere: 'ikizdere-hes',
  kuzgun: 'kuzgun-hes',
  beykoy: 'beykoy-hes',
  cildir: 'cildir-hes',
  mercan: 'mercan-hes',
  tercan: 'tercan-hes',
  saritepe: 'saritepe-res',
  atakoy: 'atakoy-hes',
  luleburgaz: 'luleburgaz-dgkc',
  // Alaşehir'de iki tesis var: `alasehir` JES, `alasehirges` hibrit GES.
  alasehirges: 'alasehir-ges',
  demirciler: 'demirciler-res',
  // Üretim tesisi değil, genel müdürlük binası — tipi `MERKEZ`.
  merkezbt: 'merkezbt-merkez',
};

/** 240×150 seçici küçük görseli üretilmiş anahtarlar (hero setinden kırpım).
    Şu an portföydeki 17 tesisin 17'sinin de görseli var; anahtarı olmayan
    bir kayıt eklenirse tipografik fallback'e düşer — §1: başka bir tesisin
    görseli dolgu amacıyla ASLA kullanılmaz. */
const KUCUK = new Set(Object.keys(HERO));

export const NOTR_TRIPTIK = `${TEMEL}/santraller/notr-triptik.webp`;

/** Hero/plaka fotoğrafı — yoksa null (çağıran tipografik fallback render eder). */
export function heroGorseli(anahtar: string | null | undefined): string | null {
  if (!anahtar) return null;
  const d = HERO[anahtar];
  return d ? `${TEMEL}/santraller/genis/${d}.webp` : null;
}

/** Seçici küçük görseli — yoksa null. */
export function kucukGorsel(anahtar: string | null | undefined): string | null {
  if (!anahtar || !KUCUK.has(anahtar)) return null;
  return `${TEMEL}/santraller/kucuk/${anahtar}.webp`;
}

/** Alt metin santrali ve tipini adlandırmak ZORUNDADIR (§5). */
export function gorselAlt(ad: string, tipAdi: string, konum?: string | null): string {
  return `${ad} — ${tipAdi.toLocaleLowerCase('tr-TR')} santral${konum ? `, ${konum}` : ''}`;
}

/* Üretim tipi kimlik rengi ve adı ARTIK BURADA DEĞİL:
   `components/kabuk/tip.ts`. Nedeni eski token'lara (`--jesd`)
   bağlıydı ve koyu/açık yüzeyi ÇAĞIRANIN bilmesini istiyordu; yeni kabukta
   yüzeyi YÖN belirler, ekran değil. */
