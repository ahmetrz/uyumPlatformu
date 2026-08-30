/* MERKEZ kapak sahnesi — veri merkezi koridoru, ozalit çizgi-sanat.
   Tek kaçış noktalı perspektif (KN 240,92): iki kabin sırası ufka soluklaşarak
   kaçar; yakın uçta bize bakan kapak panelleri sahneyi çerçeveler. Yerde
   yükseltilmiş taban ızgarası, tavanda kablo tavası, koridor sonunda soluk NOC
   ekran duvarı + tek odak ışıması (parilti). Kabin diplerinde akan enerji
   hatları (akis), yakın kabin yüzlerinde port dokusu ve pirinç LED nabızları.
   Sol sıra id ile sağa aynalanır; derinlik yalnız opaklıkla; renk yalnız CSS
   token: currentColor + --accent / --glow. Üst şerit (~y<40) rozet için sakin. */

export function KapakMERKEZ({ className }: { className?: string }) {
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
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <radialGradient id="kapak-merkez-glow">
          <stop offset="0" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".38" />
          <stop offset=".42" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".14" />
          <stop offset="1" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── Uzak katman · odak ışıması + koridor sonu NOC ekran duvarı ── */}
      <ellipse className="parilti" cx="240" cy="95" rx="86" ry="44" fill="url(#kapak-merkez-glow)" stroke="none" />
      <ellipse cx="240" cy="108" rx="46" ry="9" fill="url(#kapak-merkez-glow)" stroke="none" opacity=".55" />
      <g opacity=".2">
        <path d="M216 62 h48 v46 h-48 Z" />
        <path d="M220 66 h40 v26 h-40 Z" />
        <path d="M230 66 v26 M240 66 v26 M250 66 v26 M220 79 h40" />
        <path d="M224 100 h32 M228 104 h24" opacity=".8" />
      </g>

      {/* ── Orta-uzak · tavan kablo tavası ── */}
      <g opacity=".18">
        <path d="M216 40 L236.4 84.2 M264 40 L243.6 84.2" />
        <path d="M218.9 46.2 H261.1 M223.2 55.6 H256.8 M228 66 H252 M233.3 77.4 H246.7" />
      </g>

      {/* ── Zemin · yükseltilmiş taban ızgarası ── */}
      <g opacity=".12">
        <path d="M132 200 L223.8 108.2 M168 200 L229.2 108.2 M204 200 L234.6 108.2 M240 200 V108.2 M276 200 L245.4 108.2 M312 200 L250.8 108.2 M348 200 L256.2 108.2" />
      </g>
      <path d="M113.3 187 H366.7" opacity=".2" />
      <path d="M133.4 171.9 H346.6" opacity=".18" />
      <path d="M153.6 156.8 H326.4" opacity=".16" />
      <path d="M172.3 142.8 H307.7" opacity=".14" />
      <path d="M189.6 129.8 H290.4" opacity=".12" />
      <path d="M205.4 117.9 H274.6" opacity=".1" />
      <path d="M218.4 108.2 H261.6" opacity=".09" />

      {/* ── Kabin sırası (sol; sağa aynalanır) ── */}
      <g id="kapak-merkez-sira">
        {/* ray çizgileri */}
        <path d="M96 46 L225.6 87.4" opacity=".5" />
        <path d="M96 200 L225.6 102.8" opacity=".55" />
        <path d="M96 123 L225.6 95.1" opacity=".2" />
        {/* kabin dikey dikişleri, uzağa soldukça */}
        <path d="M96 46 V200" opacity=".8" strokeWidth="1.4" />
        <path d="M121.9 54.3 V180.6" opacity=".5" />
        <path d="M145 61.6 V163.3" opacity=".38" />
        <path d="M165.1 68.1 V148.2" opacity=".3" />
        <path d="M182.4 73.6 V135.2" opacity=".24" />
        <path d="M196.8 78.2 V124.4" opacity=".19" />
        <path d="M208.3 81.9 V115.8" opacity=".15" />
        <path d="M218.4 85.1 V108.2" opacity=".12" />
        <path d="M225.6 87.4 V102.8" opacity=".1" />
        {/* kabin 1 · ünite rafları */}
        <path d="M96 61.4 L121.9 66.9 M96 73.7 L121.9 77 M96 86 L121.9 87.1 M96 98.4 L121.9 97.2 M96 113.8 L121.9 109.9 M96 129.2 L121.9 122.5 M96 144.6 L121.9 135.1 M96 163 L121.9 150.3 M96 181.5 L121.9 165.4" opacity=".45" />
        {/* kabin 2 */}
        <path d="M121.9 73.2 L145 76.9 M121.9 92.2 L145 92.1 M121.9 111.1 L145 107.4 M121.9 130.1 L145 122.6 M121.9 152.8 L145 140.9" opacity=".32" />
        {/* kabin 3-4 */}
        <path d="M145 81.9 L165.1 84.1 M145 107.4 L165.1 104.1 M145 132.8 L165.1 124.2" opacity=".22" />
        <path d="M165.1 108.2 L182.4 104.4" opacity=".16" />
        {/* port dokusu */}
        <path d="M99 75.6 v1.5 M101.7 75.9 v1.5 M104.4 76.2 v1.5 M107.1 76.6 v1.5 M109.8 76.9 v1.5 M112.5 77.2 v1.5 M115.2 77.6 v1.5 M117.9 77.9 v1.5" opacity=".5" />
        <path d="M99 117.9 v1.5 M101.7 117.4 v1.5 M104.4 116.9 v1.5 M107.1 116.4 v1.5 M109.8 115.9 v1.5 M112.5 115.4 v1.5 M115.2 114.9 v1.5 M117.9 114.5 v1.5" opacity=".45" />
        <path d="M124.5 94.6 v1.3 M126.9 94.5 v1.3 M129.3 94.5 v1.3 M131.7 94.4 v1.3 M134.1 94.4 v1.3 M136.5 94.3 v1.3 M138.9 94.3 v1.3 M141.3 94.2 v1.3" opacity=".35" />
        <g fill="currentColor" stroke="none" opacity=".4">
          <circle cx="114" cy="64" r=".8" />
          <circle cx="103" cy="90" r=".8" />
          <circle cx="117" cy="101.5" r=".8" />
          <circle cx="128" cy="80.5" r=".8" />
          <circle cx="136" cy="99" r=".8" />
          <circle cx="150" cy="90" r=".7" />
        </g>
        {/* yakın uç: bize bakan kapak paneli */}
        <path d="M19 200 V46 H96" opacity=".8" strokeWidth="1.4" />
        <path d="M19 50.5 H96" opacity=".3" />
        <path d="M24 195 V56 H91 V195" opacity=".25" />
        <path d="M24 74 L42 56 M24 88 L56 56 M24 102 L70 56 M28 112 L84 56" opacity=".14" />
        <path d="M30 168 H85 M30 173.5 H85 M30 179 H85 M30 184.5 H85 M30 190 H85" opacity=".35" />
      </g>
      <use href="#kapak-merkez-sira" transform="translate(480 0) scale(-1 1)" />

      {/* ── Asimetrik yakın detaylar ── */}
      <path d="M88 196 V52" opacity=".45" />
      <path d="M84.5 116 h7 v12 h-7 Z" opacity=".45" />
      <path d="M30 61.5 h26 M30 65.5 h16" opacity=".4" />
      <path d="M398 62 h14 v18 h-14 Z" opacity=".4" />
      <path d="M401 66 h8 M401 70 h8 M401 74 h8" opacity=".3" />

      {/* ── Aksan · LED nabızları + enerji hatları ── */}
      <g fill="var(--accent)" stroke="none">
        <circle className="parilti" cx="104" cy="72.6" r="1.1" />
        <circle className="parilti" cx="100.5" cy="140.5" r="1" style={{ animationDelay: '-1.8s' }} />
        <circle className="parilti" cx="372" cy="73.1" r="1.1" style={{ animationDelay: '-.9s' }} />
      </g>
      <g stroke="var(--accent)">
        <path className="akis" d="M102 193 L217 110" opacity=".5" />
        <path className="akis" d="M378 193 L263 110" opacity=".5" />
        <path className="akis" d="M240 42 V86" opacity=".4" />
        <path d="M222 105.5 H258" opacity=".22" />
      </g>

      {/* ── Zemin çizgisi (alt kenar sabit) ── */}
      <path d="M0 198.6 H480" opacity=".5" />
    </svg>
  );
}
