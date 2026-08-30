/* İletim koridoru kapağı (genel/yedek sahne) — ozalit çizgi-sanat.
   Önde büyük kafes pilon (çapraz örgü, traversler, izolatör zincirleri);
   koridor sağa doğru üç direk hâlinde küçülüp soluklaşır. Enerjili üst faz
   TEK sürekli pirinç akış hattıdır (akis) — sehim + jumper kavisleriyle
   akıcı, uzaklaştıkça gradyanla söner; askı noktasında odak ışıması
   (parilti) nabız atar. Ozalit kimliği: soluk plan gridi, pafta köşeleri,
   kayıt artıları, kuleler arası açıklık ölçü zinciri (eğik tik + eksen
   uzantısı), sehim kirişi + çift oklu sehim ölçüsü, kot sembolü ve zemin
   altı teknik tarama. Derinlik yalnız opaklıkla; tema farkları SVG-içi
   <style> ile ayrışır: açık temada halo kapanır (nokta+halka kalır),
   uzak direkler ve anotasyonlar güçlenir. Renk yalnız CSS token. */

export function KapakSebeke({ className }: { className?: string }) {
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
      <style>{`
        .kapak-sebeke-d2{opacity:.38}
        .kapak-sebeke-d3{opacity:.24}
        .kapak-sebeke-d4{opacity:.16}
        .kapak-sebeke-oz{opacity:.24}
        .kapak-sebeke-halo{opacity:1}
        .kapak-sebeke-sisk{opacity:1}
        @media (prefers-color-scheme: light){
          :root:not([data-theme="dark"]) .kapak-sebeke-d2{opacity:.5}
          :root:not([data-theme="dark"]) .kapak-sebeke-d3{opacity:.36}
          :root:not([data-theme="dark"]) .kapak-sebeke-d4{opacity:.25}
          :root:not([data-theme="dark"]) .kapak-sebeke-oz{opacity:.38}
          :root:not([data-theme="dark"]) .kapak-sebeke-halo{opacity:0}
          :root:not([data-theme="dark"]) .kapak-sebeke-sisk{opacity:.5}
        }
        [data-theme="light"] .kapak-sebeke-d2{opacity:.5}
        [data-theme="light"] .kapak-sebeke-d3{opacity:.36}
        [data-theme="light"] .kapak-sebeke-d4{opacity:.25}
        [data-theme="light"] .kapak-sebeke-oz{opacity:.38}
        [data-theme="light"] .kapak-sebeke-halo{opacity:0}
        [data-theme="light"] .kapak-sebeke-sisk{opacity:.5}
      `}</style>
      <defs>
        <linearGradient id="kapak-sebeke-faz" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="480" y2="0">
          <stop offset="0" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".7" />
          <stop offset=".38" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".78" />
          <stop offset=".64" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".48" />
          <stop offset=".85" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".3" />
          <stop offset="1" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".16" />
        </linearGradient>
        <linearGradient id="kapak-sebeke-faz2" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="480" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity=".42" />
          <stop offset=".42" stopColor="currentColor" stopOpacity=".38" />
          <stop offset=".68" stopColor="currentColor" stopOpacity=".25" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".1" />
        </linearGradient>
        <linearGradient id="kapak-sebeke-toprak" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="480" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity=".13" />
          <stop offset=".35" stopColor="currentColor" stopOpacity=".15" />
          <stop offset=".7" stopColor="currentColor" stopOpacity=".09" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".05" />
        </linearGradient>
        <linearGradient id="kapak-sebeke-sis" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset=".55" stopColor="currentColor" stopOpacity=".07" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".02" />
        </linearGradient>
        <radialGradient id="kapak-sebeke-odak" cx="50%" cy="50%" r="50%">
          <stop offset="0" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".32" />
          <stop offset=".45" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".11" />
          <stop offset="1" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ozalit plan gridi */}
      <g style={{ stroke: 'var(--grid-line)' }} strokeWidth="1" opacity=".8">
        <path d="M64 8 V190 M128 8 V190 M192 8 V190 M256 8 V190 M320 8 V190 M384 8 V190 M448 8 V190" />
        <path d="M0 64 H480 M0 128 H480" />
      </g>

      {/* Pafta köşeleri, kayıt artıları, açıklık ölçü zinciri */}
      <g className="kapak-sebeke-oz" strokeWidth=".9">
        <path d="M8 21 V8 H21 M459 8 H472 V21" opacity=".7" />
        <path d="M36 26 v8 M32 30 h8 M440 30 v8 M436 34 h8" opacity=".8" />
        <path d="M150 46 H408" />
        <path d="M147.4 48.6 l5.2 -5.2 M315.4 48.6 l5.2 -5.2 M405.4 48.6 l5.2 -5.2" />
        <path d="M150 42.5 V49.5" />
        <path d="M318 41.5 V104" strokeDasharray="2 4" />
        <path d="M408 41.5 V140" strokeDasharray="2 4" />
      </g>

      {/* Uzak sırt çizgileri */}
      <path d="M0 146 C 60 140 130 145 210 139 C 290 133 360 140 480 132" opacity=".06" />
      <path d="M0 161 C 90 153 180 159 280 152 C 360 146 430 153 480 148" opacity=".09" />

      {/* Toprak teli — tüm direk tepelerinden geçer, uzaklıkla söner */}
      <path
        d="M0 56 Q68 62 150 34 Q234 96 318 110 Q365 131 406 143 Q433 152 455 159 Q470 162.5 480 163.5"
        stroke="url(#kapak-sebeke-toprak)"
        strokeWidth="1"
      />

      {/* 4. direk (en uzak) */}
      <g className="kapak-sebeke-d4" strokeWidth=".9">
        <path d="M449 192 L454 172 L455 164 M463 192 L458 172 L457 164" />
        <path d="M455 164 L456 160.5 L457 164" />
        <path d="M450.5 184.5 h11 M452.3 177 h7.4" />
        <path d="M449 192 L461.5 184.5 M463 192 L450.5 184.5" />
        <path d="M448 164.5 h16 M450.5 164.5 v2.5 M461.5 164.5 v2.5" />
      </g>

      {/* 3. direk */}
      <g className="kapak-sebeke-d3" strokeWidth="1">
        <path d="M396 192 L404 162 L406 150 M420 192 L412 162 L410 150" />
        <path d="M406 150 L408 144 L410 150" />
        <path d="M398.3 183 h19.4 M400.8 173 h14.4 M403 163 h10" />
        <path d="M396 192 L417.7 183 M420 192 L398.3 183" />
        <path d="M398.3 183 L415.2 173 M417.7 183 L400.8 173" />
        <path d="M393 153 h30 M396 150 h24 M393 153 l3 -3 M423 153 l-3 -3" />
        <path d="M397 153 v4.5 M395.3 154.6 h3.4 M395.3 156.2 h3.4" />
        <path d="M419 153 v4.5 M417.3 154.6 h3.4 M417.3 156.2 h3.4" />
        <path d="M394 192 v2.5 M422 192 v2.5" />
      </g>

      {/* 2. direk */}
      <g className="kapak-sebeke-d2" strokeWidth="1">
        <path d="M300 192 L311 146 L314 120 M336 192 L325 146 L322 120 M314 120 h8" />
        <path d="M315 120 L318 110 L321 120" />
        <path d="M303.6 177 h28.8 M307.2 162 h21.6 M311 146 h14 M312.6 132 h10.8" />
        <path d="M300 192 L332.4 177 M336 192 L303.6 177" />
        <path d="M303.6 177 L328.8 162 M332.4 177 L307.2 162" />
        <path d="M307.2 162 L325 146 M328.8 162 L311 146" />
        <path d="M311 146 L323.4 132 M325 146 L312.6 132" />
        <path d="M302 131 L306 127 H330 L334 131 H302" />
        <path d="M294 147 L300 142 H336 L342 147 H294" />
        <path d="M305 131 v7 M302.5 133.5 h5 M302.5 136 h5" />
        <path d="M331 131 v7 M328.5 133.5 h5 M328.5 136 h5" />
        <path d="M297 147 v7 M294.5 149.5 h5 M294.5 152 h5" />
        <path d="M339 147 v7 M336.5 149.5 h5 M336.5 152 h5" />
        <path d="M301 192 v3 h7 v-3 M328 192 v3 h7 v-3" opacity=".8" />
      </g>

      {/* Sönük alt faz — tek sürekli iletken, gradyanla söner */}
      <path
        d="M0 138 Q48 143 102 115.5 Q150 130 198 115.5 Q248 151 297 154 Q318 160.5 339 154 Q377 172 414 171 Q450 177 480 176.5"
        stroke="url(#kapak-sebeke-faz2)"
        strokeWidth="1"
      />

      {/* Alçak sis + arazi konturları (düz uçlu — pill yok) */}
      <g className="kapak-sebeke-sisk">
        <rect x="0" y="148" width="480" height="44" fill="url(#kapak-sebeke-sis)" stroke="none" />
        <g strokeLinecap="butt" strokeWidth="1">
          <path d="M14 158 H46 M58 158 H70" opacity=".09" />
          <path d="M226 165 H272 M282 165 H291" opacity=".1" />
          <path d="M92 172 H124 M132 172 H143 M330 170 H368 M376 170 H385" opacity=".11" />
          <path d="M178 180 H206 M420 179 H448" opacity=".1" />
        </g>
        <path
          d="M52 157 l2.6 -3.6 M254 163.5 l2.6 -3.6 M370 168.5 l2.6 -3.6 M120 170.5 l2.6 -3.6 M436 177.5 l2.6 -3.6"
          strokeWidth=".9"
          opacity=".16"
        />
      </g>

      {/* Sehim konstrüksiyonu: kiriş + çift oklu sehim ölçüsü */}
      <g className="kapak-sebeke-oz" strokeWidth=".9">
        <path d="M184 87 L301 135.5" strokeDasharray="3 5" opacity=".8" />
        <path d="M243 112.5 V122.5" />
        <path d="M240.9 115.2 L243 112.5 L245.1 115.2 M240.9 119.8 L243 122.5 L245.1 119.8" />
      </g>

      {/* Enerjili üst faz — tek pirinç akış hattı (sehim + jumper kavisleri) */}
      <path
        className="akis"
        d="M0 104 Q58 108 120 84 Q150 96 180 84 Q244 136 305 138 Q318 143.5 331 138 Q364 156 397 157.5 Q408 161.5 419 157.5 Q452 167 480 166.5"
        stroke="url(#kapak-sebeke-faz)"
        strokeWidth="1.4"
      />

      {/* ÖN PLAN: büyük kafes pilon */}
      <g opacity=".82">
        {/* ana profil */}
        <g strokeWidth="1.7">
          <path d="M114 192 L137 98 L141 54 M186 192 L163 98 L159 54 M141 54 h18" />
          <path d="M143 54 L150 34 L157 54" />
        </g>
        {/* gövde kafes örgüsü */}
        <g strokeWidth=".9" opacity=".62">
          <path d="M118.4 174 h63.2 M122.8 156 h54.4 M127.2 138 h45.6 M131.4 121 h37.2 M135.3 105 h29.4 M137 98 h26" />
          <path d="M114 192 L181.6 174 M186 192 L118.4 174" />
          <path d="M118.4 174 L177.2 156 M181.6 174 L122.8 156" />
          <path d="M122.8 156 L172.8 138 M177.2 156 L127.2 138" />
          <path d="M127.2 138 L168.6 121 M172.8 138 L131.4 121" />
          <path d="M131.4 121 L164.7 105 M168.6 121 L135.3 105" />
          <path d="M135.3 105 L163 98 M164.7 105 L137 98" />
          <path d="M138.3 84 h23.4" />
          <path d="M137 98 L161.7 84 M163 98 L138.3 84" />
          <path d="M138.3 84 L160.5 70 M161.7 84 L139.5 70" />
          <path d="M139.5 70 L159 54 M160.5 70 L141 54" />
          <path d="M150 34 v-5" />
        </g>
        {/* üst konsol (travers) */}
        <g strokeWidth="1.4">
          <path d="M116 70 H184 M124 62 H176 M116 70 L124 62 M184 70 L176 62" />
        </g>
        <path
          strokeWidth=".8"
          opacity=".5"
          d="M124 62 L131 70 L138 62 L145 70 L152 62 L159 70 L166 62 L173 70 L176 62"
        />
        {/* alt konsol */}
        <g strokeWidth="1.4">
          <path d="M98 101 H202 M108 92 H192 M98 101 L108 92 M202 101 L192 92" />
        </g>
        <path
          strokeWidth=".8"
          opacity=".5"
          d="M108 92 L117 101 L126 92 L135 101 L144 92 L153 101 L162 92 L171 101 L180 92 L189 101 L192 92"
        />
        {/* izolatör zincirleri */}
        <g strokeWidth="1.1">
          <path d="M120 70 v13 M116.5 72.5 h7 M116.5 75.5 h7 M116.5 78.5 h7 M116.5 81.5 h7" />
          <path d="M180 70 v13 M176.5 72.5 h7 M176.5 75.5 h7 M176.5 78.5 h7 M176.5 81.5 h7" />
          <path d="M102 101 v14 M98.5 103.5 h7 M98.5 106.5 h7 M98.5 109.5 h7 M98.5 112.5 h7" />
          <path d="M198 101 v14 M194.5 103.5 h7 M194.5 106.5 h7 M194.5 109.5 h7 M194.5 112.5 h7" />
        </g>
        {/* temel */}
        <g strokeWidth="1" opacity=".7">
          <path d="M109 192 v4 h10 v-4 M181 192 v4 h10 v-4" />
          <path d="M110 196 l-3 3 M115 196 l-3 3 M182 196 l-3 3 M187 196 l-3 3" />
        </g>
      </g>

      {/* Odak: askı noktası — halo yalnız koyu temada, nokta+halka her temada */}
      <g className="kapak-sebeke-halo">
        <circle className="parilti" cx="180" cy="84.5" r="22" fill="url(#kapak-sebeke-odak)" stroke="none" />
      </g>
      <circle
        className="parilti"
        cx="180"
        cy="84"
        r="8.5"
        style={{ stroke: 'var(--accent)' }}
        strokeWidth=".9"
        strokeDasharray="2.5 3"
        opacity=".35"
      />
      <circle cx="180" cy="84" r="4.5" style={{ stroke: 'var(--accent)' }} strokeWidth="1.1" opacity=".75" />
      <circle cx="180" cy="84" r="1.7" fill="currentColor" stroke="none" style={{ color: 'var(--glow)' }} opacity=".95" />

      {/* Zemin çizgisi, kilometraj tikleri, teknik tarama, kot sembolü */}
      <path d="M0 192 H480" strokeWidth="1.2" opacity=".6" />
      <path
        strokeWidth="1"
        opacity=".2"
        d="M20 192 v3.5 M60 192 v3.5 M100 192 v3.5 M140 192 v3.5 M220 192 v3.5 M260 192 v3.5 M340 192 v3.5 M380 192 v3.5 M440 192 v3.5"
      />
      <path
        strokeWidth=".9"
        opacity=".15"
        strokeLinecap="butt"
        d="M14 193 l-6 6 M27 193 l-6 6 M40 193 l-6 6 M53 193 l-6 6 M66 193 l-6 6 M79 193 l-6 6 M92 193 l-6 6 M105 193 l-6 6 M118 193 l-6 6 M131 193 l-6 6 M144 193 l-6 6 M157 193 l-6 6 M170 193 l-6 6 M183 193 l-6 6 M196 193 l-6 6 M209 193 l-6 6 M222 193 l-6 6 M235 193 l-6 6 M248 193 l-6 6 M261 193 l-6 6 M274 193 l-6 6 M287 193 l-6 6 M300 193 l-6 6 M313 193 l-6 6 M326 193 l-6 6 M339 193 l-6 6 M352 193 l-6 6 M365 193 l-6 6 M378 193 l-6 6 M391 193 l-6 6 M404 193 l-6 6 M417 193 l-6 6 M430 193 l-6 6 M443 193 l-6 6 M456 193 l-6 6 M469 193 l-6 6"
      />
      <g className="kapak-sebeke-oz" strokeWidth=".9">
        <path d="M348.5 186 H355.5 M348.5 186 L352 191.5 M355.5 186 L352 191.5 M355.5 186 H363" />
      </g>
    </svg>
  );
}
