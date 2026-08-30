/* MERKEZ kapak sahnesi — veri merkezi koridoru, ozalit çizgi-sanat.
   Tek kaçış noktalı perspektif (KN 240,92): iki kabin sırası ufka soluklaşarak
   kaçar. Tavanda kaçış noktasına yakınsayan kablo tavaları, armatürler, raf
   tepelerine basan traversler ve kablo inişleri; yerde öne doğru ağırlaşan
   yükseltilmiş taban ızgarası. Koridor sonunda NOC portalı: odak vurgusu
   radyal gradyan değil, çizgisel araçlarla — parıldayan ekran tarama hatları,
   köşe ışınları ve zemine ışık saçılımı (parilti). Aksan tek anlatı izler:
   LED nabızları → sol raf dibinde akan tek enerji hattı (akis) → portal.
   Ön plan asimetrik: solda kapalı kapak (patch paneli, havalandırma), sağda
   açık çerçeve kabin (ray, ünite, kablo kavisleri). Ozalit imzaları: köşe
   kırpma işaretleri, ölçü oku, kot nişanı, antet. Derinlik yalnız opaklıkla;
   renk yalnız CSS token: currentColor + --accent / --glow / --text-3.
   Üst şerit (~y<40) rozet için sakin bırakıldı. */

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
      {/* ── Tavan · kablo tavaları + armatürler (KN'ye yakınsar) ── */}
      <g>
        <path d="M150 0 L226.5 78.2" opacity=".16" />
        <path d="M168 0 L229.2 78.2" opacity=".16" />
        <path d="M330 0 L253.5 78.2" opacity=".16" />
        <path d="M312 0 L250.8 78.2" opacity=".16" />
        <path d="M163.5 13.8 H178.8" opacity=".1" />
        <path d="M177 27.6 H189.6" opacity=".12" />
        <path d="M190.5 41.4 H200.4" opacity=".13" />
        <path d="M204 55.2 H211.2" opacity=".13" />
        <path d="M216.6 68.1 H221.3" opacity=".12" />
        <path d="M301.2 13.8 H316.5" opacity=".1" />
        <path d="M290.4 27.6 H303" opacity=".12" />
        <path d="M279.6 41.4 H289.5" opacity=".13" />
        <path d="M268.8 55.2 H276" opacity=".13" />
        <path d="M258.7 68.1 H263.4" opacity=".12" />
        {/* armatürler */}
        <path d="M229 40.6 H251 V42.4 H229 Z" opacity=".17" />
        <path d="M232.5 56.2 H247.5 V57.8 H232.5 Z" opacity=".15" />
        <path d="M235 69.2 H245 V70.6 H235 Z" opacity=".13" />
        {/* kablo inişleri: tavadan raf tepesine */}
        <path d="M204 46 V80.5" opacity=".15" />
        <path d="M290 28.1 V76" opacity=".14" />
        {/* raf tepelerini bağlayan traversler */}
        <path d="M139.2 59.8 H340.8" opacity=".16" />
        <path d="M182.4 73.6 H297.6" opacity=".13" />
      </g>

      {/* ── Koridor sonu · portal + NOC ekran duvarı ── */}
      <g>
        <path d="M222 86.5 H258 V107.2 H222 Z" opacity=".3" strokeWidth="1.1" />
        <path d="M225.5 89.5 H254.5 V105 H225.5 Z" opacity=".24" />
        <path d="M229 92 H251 V102.5 H229 Z" opacity=".28" />
        <path d="M236.3 92 V102.5 M243.7 92 V102.5" opacity=".24" />
        <path d="M229 97.2 H251" opacity=".22" />
        <path d="M227 105 H253" opacity=".25" />
        {/* çıkış tabelası */}
        <path d="M236.5 79.5 H243.5 V83 H236.5 Z" opacity=".28" />
        <path d="M238 79.5 V77.5 M242 79.5 V77.5" opacity=".22" />
      </g>

      {/* ── Zemin · yükseltilmiş taban ızgarası (öne doğru ağırlaşır) ── */}
      <g>
        {/* boyuna hatlar: yakın parça kalın, uzak parça silik */}
        <path d="M132 200 L191.4 140.6 M168 200 L207.6 140.6 M204 200 L223.8 140.6 M276 200 L256.2 140.6 M312 200 L272.4 140.6 M348 200 L288.6 140.6" opacity=".2" />
        <path d="M240 200 V140.6" opacity=".13" />
        <path d="M191.4 140.6 L227 105 M207.6 140.6 L231.4 105 M223.8 140.6 L235.7 105 M256.2 140.6 L253 105 M272.4 140.6 L248.6 105 M288.6 140.6 L244.3 105" opacity=".08" strokeWidth=".8" />
        <path d="M240 140.6 V105" opacity=".06" strokeWidth=".8" />
        {/* enine hatlar */}
        <path d="M113.3 187 H366.7" opacity=".33" strokeWidth="1.4" />
        <path d="M133.4 171.9 H346.6" opacity=".26" strokeWidth="1.25" />
        <path d="M153.6 156.8 H326.4" opacity=".22" />
        <path d="M172.3 142.8 H307.7" opacity=".18" />
        <path d="M189.6 129.8 H290.4" opacity=".15" strokeWidth="1.1" />
        <path d="M205.4 117.9 H274.6" opacity=".12" strokeWidth="1" />
        <path d="M216 110 H264" opacity=".1" strokeWidth=".9" />
      </g>

      {/* ── Kabin sırası (sol; sağa aynalanır) ── */}
      <g id="kapak-merkez-sira">
        <path d="M96 46 L228 88.2" opacity=".5" />
        <path d="M96 200 L228 101" opacity=".55" strokeWidth="1.3" />
        <path d="M96 123 L228 94.6" opacity=".2" />
        <path d="M96 46 V200" opacity=".7" strokeWidth="1.3" />
        <path d="M121.9 54.3 V180.6" opacity=".5" />
        <path d="M145 61.6 V163.3" opacity=".4" />
        <path d="M165.1 68.1 V148.2" opacity=".32" />
        <path d="M182.4 73.6 V135.2" opacity=".26" />
        <path d="M196.8 78.2 V124.4" opacity=".21" />
        <path d="M208.3 81.9 V115.8" opacity=".17" />
        <path d="M218.4 85.1 V108.2" opacity=".14" />
        <path d="M225.6 87.4 V102.8" opacity=".12" />
        <path d="M96 61.4 L121.9 66.9 M96 73.7 L121.9 77 M96 86 L121.9 87.1 M96 98.4 L121.9 97.2 M96 113.8 L121.9 109.9 M96 129.2 L121.9 122.5 M96 144.6 L121.9 135.1 M96 163 L121.9 150.3 M96 181.5 L121.9 165.4" opacity=".48" />
        <path d="M121.9 73.2 L145 76.9 M121.9 92.2 L145 92.1 M121.9 111.1 L145 107.4 M121.9 130.1 L145 122.6 M121.9 152.8 L145 140.9" opacity=".34" />
        <path d="M145 81.9 L165.1 84.1 M145 107.4 L165.1 104.1 M145 132.8 L165.1 124.2" opacity=".24" />
        <path d="M165.1 108.2 L182.4 104.4" opacity=".17" />
        <path d="M99 75.6 v1.5 M101.7 75.9 v1.5 M104.4 76.2 v1.5 M107.1 76.6 v1.5 M109.8 76.9 v1.5 M112.5 77.2 v1.5 M115.2 77.6 v1.5 M117.9 77.9 v1.5" opacity=".55" />
        <path d="M99 117.9 v1.5 M101.7 117.4 v1.5 M104.4 116.9 v1.5 M107.1 116.4 v1.5 M109.8 115.9 v1.5 M112.5 115.4 v1.5 M115.2 114.9 v1.5 M117.9 114.5 v1.5" opacity=".48" />
        <path d="M124.5 94.6 v1.3 M126.9 94.5 v1.3 M129.3 94.5 v1.3 M131.7 94.4 v1.3 M134.1 94.4 v1.3 M136.5 94.3 v1.3 M138.9 94.3 v1.3 M141.3 94.2 v1.3" opacity=".38" />
        <g fill="currentColor" stroke="none" opacity=".45">
          <circle cx="114" cy="64" r=".8" />
          <circle cx="103" cy="90" r=".8" />
          <circle cx="117" cy="101.5" r=".8" />
          <circle cx="128" cy="80.5" r=".8" />
          <circle cx="136" cy="99" r=".8" />
          <circle cx="150" cy="90" r=".7" />
        </g>
      </g>
      <use href="#kapak-merkez-sira" transform="translate(480 0) scale(-1 1)" />

      {/* ── Ön plan · SOL kabin (kapalı kapak: patch paneli + havalandırma) ── */}
      <g>
        <path d="M19 200 V46 H96" opacity=".85" strokeWidth="1.5" />
        <path d="M19 50.5 H96" opacity=".3" />
        <path d="M24 195 V56 H91 V195" opacity=".3" />
        <path d="M24 74 L42 56 M24 88 L56 56 M24 102 L70 56" opacity=".13" />
        <path d="M30 61.5 h26 M30 65.5 h16" opacity=".45" />
        <path d="M30 86 H85 V108 H30 Z" opacity=".3" />
        <path d="M34 90.5 v3 M39.2 90.5 v3 M44.4 90.5 v3 M49.6 90.5 v3 M54.8 90.5 v3 M60 90.5 v3 M65.2 90.5 v3 M70.4 90.5 v3 M75.6 90.5 v3 M80.8 90.5 v3" opacity=".55" />
        <path d="M34 99.5 v3 M39.2 99.5 v3 M44.4 99.5 v3 M49.6 99.5 v3 M54.8 99.5 v3 M60 99.5 v3 M65.2 99.5 v3 M70.4 99.5 v3 M75.6 99.5 v3 M80.8 99.5 v3" opacity=".5" />
        <path d="M80.8 108 C84 116 87 122 87 132" opacity=".3" />
        <path d="M75.6 108 C80 118 84 126 84 138" opacity=".25" />
        <path d="M87.5 116 v14" opacity=".6" strokeWidth="1.3" />
        <path d="M20.5 70 h2 M20.5 120 h2 M20.5 170 h2" opacity=".4" />
        <path d="M30 168 H85 M30 173.5 H85 M30 179 H85 M30 184.5 H85 M30 190 H85" opacity=".4" />
      </g>

      {/* ── Ön plan · SAĞ kabin (açık çerçeve: ray + üniteler + kablo kavisleri) ── */}
      <g>
        <path d="M456 200 V54 H384" opacity=".85" strokeWidth="1.5" />
        <path d="M456 58 H384" opacity=".3" />
        <path d="M451 195 V60 H389 V195" opacity=".3" />
        <path d="M394 62 V192 M446 62 V192" opacity=".35" />
        <path d="M394 78 H446 M394 96 H446 M394 104 H446 M394 118 H446 M394 142 H446" opacity=".4" />
        <path d="M410 96 V104 M424 96 V104 M438 96 V104" opacity=".35" />
        <path d="M446 66 C458 72 458 86 446 92" opacity=".32" />
        <path d="M446 120 C456 127 456 139 446 146" opacity=".28" />
        <g fill="currentColor" stroke="none" opacity=".3">
          <circle cx="396" cy="158" r=".7" /><circle cx="405.6" cy="158" r=".7" /><circle cx="415.2" cy="158" r=".7" /><circle cx="424.8" cy="158" r=".7" /><circle cx="434.4" cy="158" r=".7" /><circle cx="444" cy="158" r=".7" />
          <circle cx="396" cy="167" r=".7" /><circle cx="405.6" cy="167" r=".7" /><circle cx="415.2" cy="167" r=".7" /><circle cx="424.8" cy="167" r=".7" /><circle cx="434.4" cy="167" r=".7" /><circle cx="444" cy="167" r=".7" />
          <circle cx="396" cy="176" r=".7" /><circle cx="405.6" cy="176" r=".7" /><circle cx="415.2" cy="176" r=".7" /><circle cx="424.8" cy="176" r=".7" /><circle cx="434.4" cy="176" r=".7" /><circle cx="444" cy="176" r=".7" />
          <circle cx="396" cy="185" r=".7" /><circle cx="405.6" cy="185" r=".7" /><circle cx="415.2" cy="185" r=".7" /><circle cx="424.8" cy="185" r=".7" /><circle cx="434.4" cy="185" r=".7" /><circle cx="444" cy="185" r=".7" />
        </g>
      </g>

      {/* ── Dış şeritler · sol kablo borusu / sağ duvar kutusu ── */}
      <g>
        <path d="M9 178 V60" opacity=".25" />
        <path d="M6.5 90 h5 M6.5 140 h5" opacity=".3" />
        <path d="M1 199 L15 185 M1 191 L9 183 M8 199 L16 191" opacity=".18" />
        <path d="M461 116 H472 V134 H461 Z" opacity=".4" />
        <path d="M464 121 h5 M464 126 h5" opacity=".3" />
        <path d="M466.5 134 V200" opacity=".25" />
        <path d="M466.5 116 V60" opacity=".2" />
        <path d="M479 199 L465 185 M479 191 L471 183 M472 199 L464 191" opacity=".18" />
      </g>

      {/* ── Ozalit imzaları · köşe/ölçü işaretleri ── */}
      <g style={{ stroke: 'var(--text-3)' }}>
        <path d="M5 14 V5 H14 M475 14 V5 H466 M5 186 V195 H14 M475 186 V195 H466" opacity=".3" />
        <circle cx="24" cy="20" r="4" opacity=".25" />
        <path d="M24 13 V27 M17 20 H31" opacity=".25" />
        <path d="M40 20 H68 M40 18 V22 M54 18.5 V21.5 M68 18 V22" opacity=".25" />
        <path d="M414 10 H472 V30 H414 Z M414 16 H472 M440 16 V30" opacity=".25" />
        <path d="M418 13 h14 M418 21 h16 M418 25.5 h10 M444 21 h20 M444 25.5 h14" opacity=".3" />
        <path d="M204 193 H276 M204 189.5 V196.5 M276 189.5 V196.5" opacity=".35" />
        <path d="M204 193 l5 -1.8 M204 193 l5 1.8 M276 193 l-5 -1.8 M276 193 l-5 1.8" opacity=".35" />
        <path d="M233 189 h14" opacity=".3" />
        <path d="M352 187 L348.5 180.5 H355.5 Z M344 180.5 H364" opacity=".32" />
        <path d="M356 176.5 h10" opacity=".3" />
      </g>

      {/* ── Aksan · LED nabızları → enerji hattı → portal ışıması ── */}
      <g fill="var(--accent)" stroke="none">
        <circle className="parilti" cx="64" cy="63.5" r="1.1" />
        <circle className="parilti" cx="87.5" cy="112" r="1" style={{ animationDelay: '-1.8s' }} />
        <circle className="parilti" cx="449" cy="64" r="1.1" style={{ animationDelay: '-.9s' }} />
      </g>
      <path className="akis" d="M103 193.5 L221.5 104.8" opacity=".6" strokeWidth="1.3" style={{ stroke: 'var(--accent)' }} />
      <g className="parilti" style={{ stroke: 'var(--glow)' }}>
        <path d="M231 94 H249 M231 96.5 H249 M231 99 H249" opacity=".6" strokeWidth=".95" />
        <path d="M232 107.5 L226 116 M240 107.8 L238.5 117 M248 107.5 L254 116" opacity=".32" />
        <path d="M224.5 88.5 L218 82 M255.5 88.5 L262 82" opacity=".25" strokeWidth=".9" />
      </g>

      {/* ── Zemin çizgisi (alt kenar sabit) ── */}
      <path d="M0 198.6 H480" opacity=".5" />
    </svg>
  );
}
