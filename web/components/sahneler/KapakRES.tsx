/* RES kapak sahnesi — rüzgâr santrali sırtı, ozalit çizgi-sanat.
   Sağda kadrajı taşan büyük türbin (dönen rotor: kanat), göbeğinde tek odak
   ışıması (parilti); sırt hattı boyunca dört türbin derinlik sırasıyla küçülüp
   soluklaşır. Solda gergi telli ölçüm direği, kıvrılan bakım yolu, ortada şalt
   kabinine akan enerji hattı (akis). İki katmanlı tepe silüeti, rüzgâr akış
   eğrileri, teknik artılar ve zemin taramaları. Derinlik yalnız opaklıkla;
   renk yalnız CSS token: currentColor + --accent / --glow. */

export function KapakRES({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 200"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      className={className}
      style={{ color: 'var(--text-2)' }}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <radialGradient id="kapak-res-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".45" />
          <stop offset="100%" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* gökyüzü: rüzgâr akış eğrileri, teknik artılar, kuşlar */}
      <g strokeWidth=".9">
        <path d="M30 62 C80 55 120 68 170 60 C220 52 260 64 306 55 C332 50 350 54 366 49" opacity=".2" />
        <path d="M64 94 C120 86 160 97 214 89 C262 82 300 93 344 84 C356 82 366 83 374 80" opacity=".2" />
        <path d="M118 116 C160 110 196 118 236 112 C262 108 280 112 298 108" opacity=".14" />
      </g>
      <g strokeWidth=".8" opacity=".12">
        <path d="M57 52 h6 M60 49 v6" />
        <path d="M247 44 h6 M250 41 v6" />
        <path d="M201 74 h6 M204 71 v6" />
      </g>
      <g strokeWidth=".9" opacity=".22">
        <path d="M300 64 c3 -2.6 6 -2.6 8.5 0" />
        <path d="M312 59 c2.6 -2.2 5.2 -2.2 7.4 0" />
      </g>

      {/* uzak sırt + en uzak türbinler */}
      <path d="M0 169 C40 163 90 162 140 166 C200 171 250 165 300 170 C360 176 420 168 480 172" opacity=".13" strokeWidth="1" />
      <path d="M64 167 C96 164.5 128 164.5 158 167" opacity=".08" strokeWidth=".8" />

      <g opacity=".15" strokeWidth="1">
        {/* T5 */}
        <path d="M325.3 170.5 L325.7 149.5 M326.7 170.5 L326.3 149.5 M324 170.5 h4" />
        <circle cx="326" cy="148" r="1.2" />
        <path d="M327.3 146.5 L335.6 136.5 M326.7 149.9 L331.1 162.1 M324 148.3 L311.2 150.6" />
      </g>
      <g opacity=".25" strokeWidth="1.1">
        {/* T4 */}
        <path d="M284.9 169 L285.6 138.6 M287.1 169 L286.4 138.6 M283.4 169 h5.2" />
        <circle cx="286" cy="136" r="1.6" />
        <path d="M288.5 135.8 L307.9 134.1 M284.9 138.3 L276.7 155.9 M284.6 134 L273.4 118" />
      </g>

      {/* orta sırt + kontur çizgileri */}
      <path d="M0 191 C40 186 82 183 120 185.5 C160 188.5 184 181 214 179 C250 176.5 292 183 336 190 C372 195 425 193.5 480 195" opacity=".3" strokeWidth="1.2" />
      <g strokeWidth=".8" opacity=".13">
        <path d="M46 189.5 C74 187 98 187 124 189" />
        <path d="M154 185 C178 182.5 200 181.5 224 182.5" />
        <path d="M254 181 C280 179.5 304 181.5 328 186" />
      </g>

      <g opacity=".4" strokeWidth="1.2">
        {/* T3 */}
        <path d="M210.4 179 L211.3 133.4 M213.6 179 L212.7 133.4 M208.6 179 h6.8" />
        <circle cx="212" cy="130" r="2" />
        <path d="M213.8 127 L228.5 101.4 M213.8 133 L228.5 158.6 M208.5 130 L179 130" />
      </g>
      <g opacity=".58" strokeWidth="1.3">
        {/* T2 */}
        <path d="M115.8 185.5 L117 124.5 M120.2 185.5 L119 124.5 M113.5 185.5 h9 M116.3 155 h3.4" />
        <rect x="114.8" y="117.3" width="6.4" height="5.4" rx="1.6" />
        <path d="M120.2 115.3 L125.6 76.7 L117.6 114.9" />
        <path d="M121 124.2 L151.7 148.3 L122.7 122.2" />
        <path d="M112.9 120.5 L76.7 135 L113.7 122.9" />
        <circle cx="118" cy="120" r="2.7" />
      </g>

      {/* ölçüm direği (sol ön) */}
      <g opacity=".55">
        <path d="M25.8 194 L27.3 118 M30.2 194 L28.7 118" strokeWidth="1" />
        <path d="M26 190 L30 184 L26 178 L30 172 L26 166 L30 160 L26 154 L30 148 L26.6 142 L29.6 136 L27 130 L29 124" strokeWidth=".7" opacity=".8" />
        <path d="M27.6 130 L12 194 M28.4 130 L44 194" strokeWidth=".6" opacity=".55" />
        <path d="M27.8 152 L17 194 M28.2 152 L39 194" strokeWidth=".6" opacity=".55" />
        <path d="M11 194 h3 M42.5 194 h3" strokeWidth=".8" />
        <path d="M23 121 h10" strokeWidth=".9" />
        <path d="M23 121 v-1.6" strokeWidth=".8" />
        <circle cx="23" cy="117.9" r="1.2" strokeWidth=".8" />
        <path d="M33 119.6 l5 1.4 -5 1.4" strokeWidth=".8" />
      </g>

      {/* bakım yolu */}
      <g opacity=".34" strokeWidth=".9">
        <path d="M82 200 C98 193.5 100 190.5 122 188.5 C154 185.5 180 184 210 181 C224 179.6 236 179.4 246 180" />
        <path d="M98 200 C110 194.5 112 191.5 128 189.5 C150 187 172 185.6 200 183.3" />
      </g>

      {/* zemin çizgisi + taramalar */}
      <path d="M0 196 H480" opacity=".8" strokeWidth="1.6" />
      <path d="M10 196 l-3.2 3.4 M22 196 l-3.2 3.4 M34 196 l-3.2 3.4 M46 196 l-3.2 3.4 M58 196 l-3.2 3.4" opacity=".22" strokeWidth=".8" />
      <path d="M372 196 l-3.2 3.4 M384 196 l-3.2 3.4 M396 196 l-3.2 3.4 M408 196 l-3.2 3.4 M420 196 l-3.2 3.4 M432 196 l-3.2 3.4 M444 196 l-3.2 3.4 M456 196 l-3.2 3.4 M468 196 l-3.2 3.4" opacity=".22" strokeWidth=".8" />

      {/* ot öbekleri */}
      <g opacity=".25" strokeWidth=".8">
        <path d="M141 196 l1.4 -3.4 M144 196 l.2 -4 M147 196 l-1.2 -3.2" />
        <path d="M232 196 l1.4 -3.2 M235 196 l0 -3.8 M238 196 l-1.4 -3" />
        <path d="M349 196 l1.4 -3.4 M352 196 l.2 -4 M355 196 l-1.2 -3.2" />
        <path d="M67 190.6 l1.2 -2.8 M69.6 190.6 l-.2 -3.2 M72 190.6 l-1.2 -2.6" opacity=".8" />
      </g>

      {/* şalt kabini + enerji hatları */}
      <g opacity=".5" strokeWidth="1">
        <rect x="300" y="182" width="17" height="12" />
        <path d="M298.5 182 L308.5 177.5 L318.5 182" />
        <path d="M308.5 182 V194 M303 186 h4 M303 189 h4" />
      </g>
      <path className="akis" d="M413 191.5 C380 188.5 345 186.5 312 179.5" style={{ stroke: 'var(--accent)' }} opacity=".5" strokeWidth="1.1" />
      <path className="akis" d="M299 187 C240 186 160 189 60 190.5 C40 191 20 191 0 191" style={{ stroke: 'var(--accent)' }} opacity=".5" strokeWidth="1.1" />

      {/* odak ışıması + rotor süpürme dairesi */}
      <circle className="parilti" cx="418" cy="92" r="26" fill="url(#kapak-res-glow)" stroke="none" />
      <circle cx="418" cy="92" r="87.5" opacity=".1" strokeWidth=".8" strokeDasharray="1 6" />

      {/* T1: en yakın türbin */}
      <g opacity=".85">
        <path d="M409 196 h18" opacity=".5" strokeWidth="1.4" />
        <path d="M411 196 h14" strokeWidth="1.7" />
        <path d="M414.5 196 L416.4 97 M421.5 196 L419.6 97" strokeWidth="1.7" />
        <path d="M415 171 h6 M415.5 146 h5.1 M415.9 121 h4.2" strokeWidth="1" opacity=".7" />
        <path d="M415.8 196 v-6.5 a2.2 3 0 0 1 4.4 0 V196" strokeWidth="1" />
        <rect x="412.5" y="86.5" width="13" height="11" rx="3.2" strokeWidth="1.5" />
      </g>
      <g className="kanat" opacity=".9" strokeWidth="1.4">
        {/* görünmez daire: bbox'ı göbek merkezli tutar (fill-box döngüsü) */}
        <circle cx="418" cy="92" r="86" stroke="none" />
        <g transform="rotate(20 418 92)">
          <path d="M415.9 86.8 C414.2 62 415.3 34 417.3 9 L418.8 9 C420.6 34 421.3 62 420.3 86.8" />
          <path d="M417.2 78 C416.6 55 417.1 32 417.8 14" strokeWidth=".8" opacity=".35" />
        </g>
        <g transform="rotate(140 418 92)">
          <path d="M415.9 86.8 C414.2 62 415.3 34 417.3 9 L418.8 9 C420.6 34 421.3 62 420.3 86.8" />
          <path d="M417.2 78 C416.6 55 417.1 32 417.8 14" strokeWidth=".8" opacity=".35" />
        </g>
        <g transform="rotate(260 418 92)">
          <path d="M415.9 86.8 C414.2 62 415.3 34 417.3 9 L418.8 9 C420.6 34 421.3 62 420.3 86.8" />
          <path d="M417.2 78 C416.6 55 417.1 32 417.8 14" strokeWidth=".8" opacity=".35" />
        </g>
      </g>
      <circle cx="418" cy="92" r="4.6" strokeWidth="1.6" opacity=".9" />
      <circle cx="418" cy="92" r="1.7" strokeWidth="1.2" opacity=".9" />
    </svg>
  );
}
