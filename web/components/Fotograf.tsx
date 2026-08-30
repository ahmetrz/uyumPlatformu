import { KapakSec } from './sahneler';

/* Gerçek santral fotoğrafları (serbest lisanslı — public/gorseller/KUNYE.md).
   Tesis tipi koduna göre seçilir; tanımlar dinamik olduğu için karşılığı
   olmayan tipler çizim setine düşer. Fotoğrafın üzerine tema uyumlu bir
   perde (scrim) konur: metin her iki temada da okunur kalır. */

const FOTOGRAFLAR: Record<string, { dosya: string; ad: string }> = {
  DGKC: { dosya: 'dogalgaz', ad: 'Doğal gaz kombine çevrim santrali' },
  TERMIK: { dosya: 'dogalgaz', ad: 'Termik santral' },
  JEO: { dosya: 'jeotermal', ad: 'Jeotermal santral' },
  HES: { dosya: 'hidro', ad: 'Hidroelektrik santral' },
  RES: { dosya: 'ruzgar', ad: 'Rüzgâr enerji santrali' },
  GES: { dosya: 'gunes', ad: 'Güneş enerji santrali' },
  MERKEZ: { dosya: 'merkez', ad: 'Veri merkezi' },
};

export function fotografVar(tipKod?: string | null): boolean {
  return !!FOTOGRAFLAR[(tipKod ?? '').toUpperCase()];
}

/** Kart kapağı: 2.4:1 fotoğraf + perde. Fotoğrafı olmayan tip çizime düşer. */
export function TesisKapagi({ tipKod, genis, oncelik }: {
  tipKod?: string | null; genis?: boolean; oncelik?: boolean;
}) {
  const f = FOTOGRAFLAR[(tipKod ?? '').toUpperCase()];
  if (!f) {
    return (
      <span className="kapak kapak-cizim" style={{ color: 'var(--text-2)' }}>
        <KapakSec tipKod={tipKod} />
      </span>
    );
  }
  const kaynak = `${TEMEL}/gorseller/${f.dosya}${genis ? '-genis' : ''}.webp`;
  return (
    <span className="kapak">
      {/* eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım: optimizasyon kapalı */}
      <img src={kaynak} alt={f.ad} loading={oncelik ? 'eager' : 'lazy'} decoding="async" />
      <span className="kapak-perde" aria-hidden />
    </span>
  );
}

/** Geniş hero fotoğrafı (dashboard / giriş). */
export function HeroFotograf({ dosya, alt }: { dosya: string; alt: string }) {
  return (
    <span className="hero-foto">
      {/* eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım */}
      <img src={`${TEMEL}/gorseller/${dosya}-genis.webp`} alt={alt} decoding="async" />
      <span className="hero-perde" aria-hidden />
    </span>
  );
}

// Statik dışa aktarımda basePath elle eklenir (next/image kullanılmıyor).
const TEMEL = process.env.NEXT_PUBLIC_DEMO === '1' ? '/uyumPlatformu' : '';
