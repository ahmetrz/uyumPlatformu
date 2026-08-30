/* İletim koridoru kapağı (genel/yedek sahne) — ozalit çizgi-sanat.
   Önde büyük kafes pilon (çapraz örgü, traversler, izolatör zincirleri,
   atlama iletkenleri); koridor sağa doğru üç direk hâlinde küçülüp
   soluklaşır. Enerjili üst faz pirinç akış hattıdır (akis), askı noktasında
   tek odak ışıması (parilti) nabız atar. Toprak teli, sehim konstrüksiyon
   anotasyonu, uzak sırt çizgileri, alçak sis şeritleri ve zemin işaretleri
   ozalit karakterini taşır. Derinlik yalnız opaklıkla: uzak .10-.15,
   orta .34, yakın .82. Renk yalnız CSS token: currentColor + --accent /
   --glow / --grid-line. Üst %20 şerit sakin bırakıldı (rozet payı). */

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
      <defs>
        <linearGradient id="kapak-sebeke-sis" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset=".55" stopColor="currentColor" stopOpacity=".09" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".03" />
        </linearGradient>
        <radialGradient id="kapak-sebeke-odak" cx="50%" cy="50%" r="50%">
          <stop offset="0" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".42" />
          <stop offset=".45" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".13" />
          <stop offset="1" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Teknik zemin: kayıt artıları, inşa eksenleri */}
      <g strokeWidth="1">
        <path d="M36 24 v8 M32 28 h8" opacity=".09" />
        <path d="M448 34 v8 M444 38 h8" opacity=".08" />
        <path d="M150 26 V189" strokeDasharray="2 6" opacity=".1" />
        <path d="M318 106 V189" strokeDasharray="2 6" opacity=".08" />
      </g>

      {/* Uzak sırt çizgileri */}
      <path d="M0 146 C 60 140 130 145 210 139 C 290 133 360 140 480 132" opacity=".05" />
      <path d="M0 161 C 90 153 180 159 280 152 C 360 146 430 153 480 148" opacity=".08" />

      {/* Toprak teli — en üst iletken, çok soluk */}
      <g strokeWidth="1">
        <path d="M0 54 Q 68 62 150 33" opacity=".1" />
        <path d="M150 33 Q 234 95 318 110" opacity=".13" />
        <path d="M318 110 Q 371 137 424 144" opacity=".09" />
      </g>

      {/* En uzak direk kırıntısı (4.) */}
      <g opacity=".1" strokeWidth=".9">
        <path d="M456 192 L461 168 L463 160 M470 192 L465 168 L463 160" />
        <path d="M457 172 h12 M459 181 h8" />
      </g>

      {/* Uzak direk (3.) */}
      <g opacity=".15" strokeWidth=".9">
        <path d="M413 192 L420 165 L422 150 L424 144 M435 192 L428 165 L426 150 L424 144" />
        <path d="M416 180 h16 M420 165 h8" />
        <path d="M413 192 L432 180 M435 192 L416 180" />
        <path d="M415 157 h18 M418 154 h12 M415 157 l3 -3 M433 157 l-3 -3" />
        <path d="M411 166 h26 M415 163 h18 M411 166 l4 -3 M437 166 l-4 -3" />
        <path d="M417 157 v5 M431 157 v5 M413 166 v5 M435 166 v5" />
      </g>

      {/* Orta direk (2.) */}
      <g opacity=".34" strokeWidth="1">
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
        <path d="M305 139 Q318 147 331 139" strokeWidth=".9" />
        <path d="M297 155 Q318 163 339 155" strokeWidth=".9" />
      </g>

      {/* İletkenler — sönük alt faz */}
      <g strokeWidth="1">
        <path d="M0 138 Q 48 143 102 116" opacity=".38" />
        <path d="M102 116 Q 150 132 198 116" opacity=".34" />
        <path d="M198 116 Q 247 153 297 155" opacity=".26" />
        <path d="M339 155 Q 376 177 413 171" opacity=".16" />
        <path d="M435 171 Q 458 178 480 177" opacity=".1" />
      </g>

      {/* Sehim konstrüksiyonu — ozalit kılavuz geometrisi */}
      <g strokeWidth=".9">
        <path d="M180 84 L305 139" strokeDasharray="3 5" opacity=".1" />
        <path d="M242 108 V127" strokeDasharray="2 3" opacity=".16" />
        <path d="M240 110 l2 -3 2 3 M240 125 l2 3 2 -3" opacity=".16" />
      </g>

      {/* Enerjili üst faz — pirinç akış hattı */}
      <g style={{ stroke: 'var(--accent)' }} fill="none">
        <path className="akis" d="M0 103 Q 58 107 120 84" strokeWidth="1.4" opacity=".7" />
        <path d="M120 84 Q 150 97 180 84" strokeWidth="1.2" opacity=".55" />
        <path className="akis" d="M180 84 Q 242 135 305 139" strokeWidth="1.3" opacity=".6" />
        <path className="akis" d="M331 139 Q 374 166 417 162" strokeWidth="1.1" opacity=".34" />
        <path className="akis" d="M431 162 Q 456 170 480 168" strokeWidth="1" opacity=".18" />
      </g>

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
        {/* alt faz atlama iletkeni */}
        <path d="M102 116 Q150 132 198 116" strokeWidth="1" opacity=".5" />
        {/* temel */}
        <g strokeWidth="1" opacity=".7">
          <path d="M109 192 v4 h10 v-4 M181 192 v4 h10 v-4" />
          <path d="M110 196 l-3 3 M115 196 l-3 3 M182 196 l-3 3 M187 196 l-3 3" />
        </g>
      </g>

      {/* Odak ışıması: enerjili fazın askı noktası */}
      <circle className="parilti" cx="180" cy="85" r="30" fill="url(#kapak-sebeke-odak)" stroke="none" />
      <circle cx="180" cy="84" r="1.6" fill="currentColor" stroke="none" style={{ color: 'var(--glow)' }} opacity=".9" />

      {/* Alçak sis katmanı */}
      <rect x="0" y="148" width="480" height="44" fill="url(#kapak-sebeke-sis)" stroke="none" />
      <g strokeLinecap="round" style={{ stroke: 'var(--grid-line)' }}>
        <path d="M-20 170 H166" strokeWidth="8" opacity=".5" />
        <path d="M52 180 H288" strokeWidth="9" opacity=".45" />
        <path d="M244 173 H500" strokeWidth="7" opacity=".4" />
        <path d="M148 186 H452" strokeWidth="6" opacity=".4" />
      </g>

      {/* Zemin çizgisi ve işaretleri */}
      <path d="M0 192 H480" strokeWidth="1.2" opacity=".6" />
      <path
        strokeWidth="1"
        opacity=".18"
        d="M20 192 v4 M60 192 v4 M100 192 v4 M140 192 v4 M180 192 v4 M220 192 v4 M260 192 v4 M300 192 v4 M340 192 v4 M380 192 v4 M420 192 v4 M460 192 v4"
      />
      <path strokeWidth="1" opacity=".12" d="M0 197 h30 M54 197 h14 M226 197 h22 M302 197 h30 M382 197 h12" />
      {/* açıklık ölçü çizgisi */}
      <g strokeWidth=".9" opacity=".16">
        <path d="M150 181 v6 M318 181 v6 M150 184 H318" />
      </g>
    </svg>
  );
}
