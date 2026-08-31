import type { CSSProperties } from 'react';
import { KapakSec } from './sahneler';

/* Gerçek santral fotoğrafları (serbest lisanslı — public/gorseller/KUNYE.md).
   Tesis tipi koduna göre seçilir; tanımlar dinamik olduğu için karşılığı
   olmayan tipler çizim setine düşer.

   Fotoğrafın ÜZERİNDE metin yoktur: kart metni kapağın altında, hero metrik
   bandı fotoğraf şeridinin altında durur. Bu yüzden kontrast fotoğrafı
   soldurarak değil, metnin kendi zemininden alınır (globals.css, "Gerçek
   fotoğraf kapakları"). Kalan iki katman perde değil: .kapak-perde alt kenar
   dikişi, .hero-perde ise hafif vinyettir. */

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

/* Aynı tip birden çok tesiste tekrarlıyor: altı HES kartı aynı baraj karesini
   gösteriyordu ve bu, kaliteli fotoğrafları bile "stok dolgu" gibi
   okutuyordu (atölye jürisi). Kadraj tesis koduna göre kaydırılıyor —
   aynı dosya, kart başına farklı çerçeve. Kaynak 1440x600, kart ~330px
   genişliğinde çizildiği için 1.34x yakınlaştırma bile hâlâ küçültme demek:
   çözünürlük kaybı yok. */
const ODAKLAR = ['22% 30%', '50% 22%', '78% 32%', '18% 54%', '50% 50%',
  '82% 56%', '28% 78%', '54% 74%', '76% 80%'];
const ZUMLAR = ['1.14', '1.24', '1.34'];

function kadraj(anahtar?: string | null): { zum: string; odak: string } | null {
  if (!anahtar) return null;
  let h = 0;
  for (const ch of anahtar) h = (h * 17 + ch.codePointAt(0)!) % 1_000_003;
  // Odak ve yakınlaştırma ayrı basamaklardan okunur: 27 farklı kadraj, aynı
  // tipten altı tesis için çakışma pratikte kalmıyor.
  return { zum: ZUMLAR[Math.floor(h / ODAKLAR.length) % ZUMLAR.length],
    odak: ODAKLAR[h % ODAKLAR.length] };
}

/** Kart kapağı: 2.4:1 fotoğraf, üzerinde metin yok. Fotoğrafı olmayan tip
    çizime düşer. `anahtar` verilirse kadraj o tesise özgü kaydırılır. */
export function TesisKapagi({ tipKod, genis, oncelik, anahtar }: {
  tipKod?: string | null; genis?: boolean; oncelik?: boolean; anahtar?: string | null;
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
  // Geniş şeritlerde (Santral 360, bulgu detayı) kadraj zaten en-boy farkından
  // geliyor; kaydırma yalnızca yan yana dizilen kart kapaklarında anlamlı.
  const k = genis ? null : kadraj(anahtar);
  return (
    <span className="kapak" style={k
      ? ({ '--kapak-zum': k.zum, '--kapak-odak': k.odak } as CSSProperties)
      : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım: optimizasyon kapalı */}
      <img src={kaynak} alt={f.ad} loading={oncelik ? 'eager' : 'lazy'} decoding="async" />
      <span className="kapak-perde" aria-hidden />
    </span>
  );
}

/** Geniş hero fotoğrafı (genel bakış / giriş). Üzerinde metin yoktur:
    genel bakışta metrik bandı fotoğraf şeridinin altına iner. */
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
