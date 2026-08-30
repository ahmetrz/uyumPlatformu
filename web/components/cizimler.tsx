/* Ozalit kimliğinde enerji üretimi çizgi-sanat seti.
   Hepsi currentColor ile çizilir; renk ve opaklık kullanıldığı yerden gelir. */

type P = { boy?: number; stil?: React.CSSProperties; className?: string };
const ortak = (boy: number, oran: number, p: P) => ({
  width: p.boy ?? boy, height: (p.boy ?? boy) / oran,
  viewBox: `0 0 ${boy} ${boy / oran}`,
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  style: p.stil, className: p.className, 'aria-hidden': true,
});

/** Doğal gaz kombine çevrim: soğutma kulesi + türbin binası + baca */
export function CizimDGKC(p: P) {
  return (
    <svg {...ortak(120, 1.5, p)}>
      <path d="M14 72 C10 52 18 34 24 24 M46 72 C50 52 42 34 36 24 M24 24 h12" />
      <path d="M20 40 c6 3 14 3 20 0" opacity=".5" />
      <path d="M56 72 V44 h34 v28 M64 44 v-8 h6 v8 M78 36 v-14 M74 22 h8" />
      <path d="M80 14 c3 -2 1 -6 4 -8 M86 16 c3 -2 1 -6 4 -8" opacity=".45" />
      <path d="M60 52 h26 M60 58 h26 M60 64 h26" opacity=".5" />
      <path d="M96 72 v-20 l10 -6 v26 M99 56 h4" opacity=".8" />
      <path d="M4 72 h112" />
    </svg>
  );
}

/** Hidroelektrik: baraj gövdesi + kapaklar + su */
export function CizimHES(p: P) {
  return (
    <svg {...ortak(120, 1.5, p)}>
      <path d="M18 24 h30 C42 42 40 58 42 72 H8 C12 56 14 40 18 24 Z" />
      <path d="M24 34 h20 M22 44 h20 M21 54 h21 M20 64 h23" opacity=".5" />
      <path d="M48 30 c10 4 18 4 28 0 c10 -4 18 -4 28 0" opacity=".6" />
      <path d="M52 40 c10 4 18 4 28 0 c8 -3 16 -3 24 0" opacity=".35" />
      <path d="M56 72 v-14 h12 v14 M74 72 v-14 h12 v14" />
      <path d="M62 58 v14 M80 58 v14" opacity=".5" />
      <path d="M4 72 h112" />
    </svg>
  );
}

/** Rüzgâr: üç türbin, tepe çizgisi */
export function CizimRES(p: P) {
  return (
    <svg {...ortak(120, 1.5, p)}>
      <path d="M28 72 l3 -34 h2 l3 34" />
      <circle cx="32" cy="34" r="2.6" />
      <path d="M32 31 l-3 -14 M34 36 l12 8 M30 36 l-13 6" />
      <path d="M66 72 l3 -28 h2 l3 28" opacity=".85" />
      <circle cx="70" cy="40" r="2.3" />
      <path d="M70 37 l4 -12 M72 42 l10 8 M68 42 l-12 4" opacity=".85" />
      <path d="M96 72 l2.5 -22 h2 l2.5 22" opacity=".65" />
      <circle cx="99.5" cy="46" r="2" />
      <path d="M99.5 44 l-3 -10 M101 48 l9 5 M98 48 l-10 3" opacity=".65" />
      <path d="M4 72 c20 -6 34 -6 56 0 c22 6 36 6 56 0" opacity=".5" />
    </svg>
  );
}

/** Güneş: panel dizisi + güneş */
export function CizimGES(p: P) {
  return (
    <svg {...ortak(120, 1.5, p)}>
      <circle cx="96" cy="18" r="7" />
      <path d="M96 6 v-2 M96 32 v-2 M84 18 h-2 M110 18 h-2 M87 9 l-1.5 -1.5 M106.5 28.5 L105 27 M87 27 l-1.5 1.5 M106.5 7.5 L105 9" opacity=".6" />
      <path d="M14 62 l10 -18 h34 l-10 18 Z M58 62 l10 -18 h34 l-10 18 Z" transform="translate(0,-6)" />
      <path d="M21 50 h33 M65 50 h33 M31 40 l-6 12 M43 40 l-6 12 M75 40 l-6 12 M87 40 l-6 12" opacity=".5" />
      <path d="M30 56 v16 M74 56 v16" />
      <path d="M4 72 h112" />
    </svg>
  );
}

/** Jeotermal: kuyu başı + buhar + boru hattı */
export function CizimJEO(p: P) {
  return (
    <svg {...ortak(120, 1.5, p)}>
      <path d="M26 72 V40 l8 -8 8 8 v32 M26 52 h16 M26 62 h16" />
      <path d="M34 26 c4 -3 0 -8 4 -11 M40 28 c4 -3 0 -8 4 -11 M28 28 c4 -3 0 -8 4 -11" opacity=".5" />
      <path d="M50 60 h28 c6 0 6 -8 12 -8 h14" />
      <path d="M58 60 v6 M70 60 v6" opacity=".5" />
      <path d="M96 72 v-16 h12 v16 M99 62 h6" />
      <path d="M4 72 h112" />
    </svg>
  );
}

/** Merkez BT: veri merkezi rafları */
export function CizimMERKEZ(p: P) {
  return (
    <svg {...ortak(120, 1.5, p)}>
      <path d="M30 72 V30 h24 v42 M62 72 V38 h24 v34" />
      <path d="M35 38 h14 M35 46 h14 M35 54 h14 M35 62 h14 M67 46 h14 M67 54 h14 M67 62 h14" opacity=".5" />
      <circle cx="46" cy="34.5" r="1" /><circle cx="78" cy="42.5" r="1" />
      <path d="M4 72 h112" />
    </svg>
  );
}

/** İletim hattı silueti — panoramik bant (hero zemini) */
export function CizimSebeke(p: P) {
  return (
    <svg {...ortak(560, 5.6, p)} preserveAspectRatio="xMidYMax meet">
      <path d="M60 96 L74 34 h12 L100 96 M66 70 h28 M70 52 h20 M64 34 h32 M60 44 l40 26 M100 44 l-40 26" />
      <path d="M300 96 L314 28 h12 L340 96 M306 66 h28 M310 46 h20 M304 28 h32 M300 38 l40 28 M340 38 l-40 28" opacity=".8" />
      <path d="M480 96 L492 40 h10 L514 96 M486 72 h22 M489 54 h16 M484 40 h26" opacity=".55" />
      <path d="M96 40 C 180 66 240 66 304 34 M336 34 C 400 64 440 64 488 46" opacity=".45" />
      <path d="M0 96 h560" opacity=".7" />
    </svg>
  );
}

/** Tesis tipi koduna göre çizim seçer (tanımlar dinamik; bilinmeyen tip şebeke alır). */
export function TipCizimi({ kod, boy, stil }: { kod?: string | null; boy?: number; stil?: React.CSSProperties }) {
  const secim = (kod ?? '').toUpperCase();
  const M: Record<string, (p: P) => React.ReactNode> = {
    DGKC: CizimDGKC, HES: CizimHES, RES: CizimRES, GES: CizimGES,
    JEO: CizimJEO, MERKEZ: CizimMERKEZ, TERMIK: CizimDGKC,
  };
  const C = M[secim] ?? CizimSebeke;
  return <>{C({ boy, stil })}</>;
}
