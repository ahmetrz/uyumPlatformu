/* Boş durum illüstrasyonları — OZALİT çizgi-sanat (üçlü set).
   BosGenel  : boş kontrol panosu + sakin şebeke silüeti — "henüz veri yok".
   BosTemiz  : dingin ufukta düzenli şebeke — her şey yolunda hissi, durum
               rengi kullanmadan formla: dümdüz akan hat + tam simetri.
   BosKuyruk : boş gelen tepsisi + üstünden geçip giden konveyör — "kuyruk boş".
   Renk yalnız CSS token: currentColor + --accent / --glow / --grid-line.
   Derinlik yalnız opaklıkla: uzak .08-.14, orta .30-.38, yakın .60-.85.
   Sahne başına tek odak ışıması (parilti) + tutumlu aksan (akis).
   Animasyon sınıfları ürün globals.css'inde tanımlıdır: akis / parilti.
   Üst ~%20 şerit sakin bırakıldı (üzerine rozet/pill gelebilir);
   alt kenar zemin çizgisi sabittir (xMidYMax slice ile kırpılır). */

export function BosGenel({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 180"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      className={className}
      style={{ color: 'var(--text-2)' }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <radialGradient id="bos-durumlar-genel-glow">
          <stop offset="0" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".5" />
          <stop offset="1" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* UZAK: ufuk + soğutma kulesi + santral bloğu */}
      <path d="M6 130 H314" opacity=".08" strokeWidth={1} />
      <g opacity=".14" strokeWidth={1}>
        <path d="M262 172 C257 152 263 136 267 126 M293 172 C298 152 292 136 288 126 M267 126 H288" />
        <path d="M265 140 c8 3 17 3 25 0" />
        <path d="M272 118 c3 -3 0 -8 3 -11 M281 118 c3 -3 0 -8 3 -11" />
        <path d="M228 172 V148 H256 V172 M234 148 V134 h6 v14 M240 154 h10 M240 160 h10" />
      </g>
      {/* alçak sis şeritleri */}
      <g opacity=".08" strokeWidth={4}>
        <path d="M176 152 H298" />
        <path d="M204 160 H312" />
        <path d="M10 148 H40" />
      </g>

      {/* ORTA: kafes pilon + hatlar */}
      <g opacity=".34" strokeWidth={1.1}>
        <path d="M196 172 L205 96 h8 L222 172" />
        <path d="M199 148 L219 134 M219 148 L199 134 M201 126 L217 114 M217 126 L201 114" />
        <path d="M200 134 h18 M202 114 h14" />
        <path d="M192 102 H226 M188 116 H230" />
        <path d="M205 96 l4 -8 4 8" />
        <path d="M192 102 v5 M226 102 v5 M188 116 v5 M230 116 v5" />
        <path d="M192 107 C176 112 168 114 158 115" />
        <path d="M46 118 C30 118 16 115 6 113" />
        <path d="M226 107 C260 112 292 115 314 116" />
        <path d="M230 121 C262 128 292 132 314 132" />
      </g>

      {/* AKSAN: şebekeden konsola gelen enerji */}
      <g className="akis" style={{ stroke: 'var(--accent)' }} opacity=".6" strokeWidth={1.3}>
        <path d="M314 128 C 288 128 258 125 230 121" />
        <path d="M188 121 C176 124 170 125 161 125" />
      </g>
      <path d="M158 122 v6" style={{ stroke: 'var(--accent)' }} opacity=".5" />

      {/* YAKIN: boş kontrol panosu */}
      <g opacity=".82" strokeWidth={1.3}>
        <path d="M60 172 V140 M144 172 V140 M60 158 H144" />
        <rect x="46" y="58" width="112" height="82" rx="3" />
        <rect x="53" y="65" width="98" height="46" rx="2" />
        <g style={{ stroke: 'var(--grid-line)' }} strokeWidth={1}>
          <path d="M53 77 H151 M53 88 H151 M53 99 H151" />
          <path d="M77 65 V111 M101 65 V111 M125 65 V111" />
        </g>
        <path d="M60 70 V104 H144" opacity=".55" />
        <path d="M60 96 H144" strokeDasharray="3 5" opacity=".5" />
        <circle cx="59" cy="122" r="2.5" opacity=".55" />
        <path d="M66 122 H148" strokeDasharray="2 4" opacity=".45" />
        <circle cx="59" cy="131" r="2.5" opacity=".55" />
        <path d="M66 131 H136" strokeDasharray="2 4" opacity=".45" />
      </g>
      <circle cx="149" cy="61.5" r="10" fill="url(#bos-durumlar-genel-glow)" stroke="none" />
      <circle className="parilti" cx="149" cy="61.5" r="2" style={{ fill: 'var(--glow)' }} stroke="none" />

      {/* yan sehpa + fincan: operatör henüz gelmedi */}
      <g opacity=".62" strokeWidth={1.2}>
        <path d="M174 172 V151 H202 V172 M178 158 H198" />
        <path d="M182 151 V143 h11 v8" />
        <path d="M193 145 c4 0 4 4 0 4" />
        <path d="M185 138 c2 -2 0 -4 2 -6 M190 138 c2 -2 0 -4 2 -6" opacity=".6" />
      </g>

      {/* ozalit anotasyonu */}
      <g opacity=".3" strokeWidth={1}>
        <path d="M34 58 V140 M31 58 h6 M31 140 h6" />
        <path d="M17 46 h6 M20 43 v6" />
        <path d="M297 62 h6 M300 59 v6" />
      </g>
      <path d="M248 50 c3 -3 6 -3 9 0 M260 45 c2.5 -2.5 5 -2.5 7.5 0" opacity=".28" strokeWidth={1} />

      {/* zemin */}
      <path d="M8 172 H312" opacity=".5" strokeWidth={1.4} />
      <path d="M22 172 l-4 5 M92 172 l-4 5 M170 172 l-4 5 M244 172 l-4 5 M302 172 l-4 5" opacity=".22" strokeWidth={1} />
    </svg>
  );
}

export function BosTemiz({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 180"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      className={className}
      style={{ color: 'var(--text-2)' }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <radialGradient id="bos-durumlar-temiz-glow">
          <stop offset="0" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".55" />
          <stop offset="1" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* simetri ekseni (çizim masası izi) */}
      <path d="M160 44 V168" strokeDasharray="2 7" opacity=".16" strokeWidth={1} />

      {/* UZAK: ufuk + geniş hale + ova */}
      <path d="M6 132 H314" opacity=".14" strokeWidth={1} />
      <g strokeWidth={1}>
        <path d="M96 132 A 64 64 0 0 1 224 132" opacity=".1" />
        <path d="M82 132 A 78 78 0 0 1 238 132" opacity=".06" />
        <path d="M6 150 C 60 146 100 146 160 150 C 220 154 260 154 314 150" opacity=".1" />
      </g>
      {/* alçak sis şeritleri */}
      <g opacity=".08" strokeWidth={4}>
        <path d="M22 154 H120" />
        <path d="M200 154 H298" />
      </g>

      {/* ORTA: aynalı yan pilonlar + düzenli panel sıraları */}
      <g opacity=".32" strokeWidth={1.1}>
        <path d="M50 172 L56 118 h4 L66 172" />
        <path d="M52 156 L64 146 M64 156 L52 146" />
        <path d="M46 124 H70 M56 118 l2 -6 2 6 M46 124 v4 M70 124 v4" />
        <path d="M254 172 L260 118 h4 L270 172" />
        <path d="M256 156 L268 146 M268 156 L256 146" />
        <path d="M250 124 H274 M260 118 l2 -6 2 6 M250 124 v4 M274 124 v4" />
      </g>
      <g opacity=".3" strokeWidth={1}>
        <path d="M82 164 l4 -7 h13 l-4 7 z M101 164 l4 -7 h13 l-4 7 z M120 164 l4 -7 h13 l-4 7 z" />
        <path d="M183 164 l4 -7 h13 l-4 7 z M202 164 l4 -7 h13 l-4 7 z M221 164 l4 -7 h13 l-4 7 z" />
        <path d="M90 164 v8 M109 164 v8 M128 164 v8 M191 164 v8 M210 164 v8 M229 164 v8" />
      </g>

      {/* kabolar: simetrik sarkmalar */}
      <g opacity=".3" strokeWidth={1}>
        <path d="M138 89 C 112 108 92 120 70 128" />
        <path d="M182 89 C 208 108 228 120 250 128" />
        <path d="M46 128 C 32 134 18 136 6 137" />
        <path d="M274 128 C 288 134 302 136 314 137" />
      </g>

      {/* AKSAN: dümdüz akan hat — kesintisiz */}
      <g className="akis" style={{ stroke: 'var(--accent)' }} opacity=".55" strokeWidth={1.2}>
        <path d="M6 105 C 48 107 96 106 132 105" />
        <path d="M132 105 H188" />
        <path d="M188 105 C 224 106 272 107 314 105" />
      </g>

      {/* YAKIN: merkez pilon */}
      <g opacity=".8" strokeWidth={1.3}>
        <path d="M146 172 L156 72 h8 L174 172" />
        <path d="M149 150 L171 136 M171 150 L149 136 M151 128 L169 116 M169 128 L151 116 M153 108 L167 98 M167 108 L153 98" />
        <path d="M150 136 h20 M152 116 h16 M154 98 h12" />
        <path d="M138 84 H182 M132 100 H188" />
        <path d="M156 72 L160 62 L164 72" />
        <path d="M138 84 v5 M182 84 v5 M132 100 v5 M188 100 v5" />
      </g>
      <circle cx="160" cy="62" r="10" fill="url(#bos-durumlar-temiz-glow)" stroke="none" />
      <circle className="parilti" cx="160" cy="62" r="2" style={{ fill: 'var(--glow)' }} stroke="none" />

      {/* zemin */}
      <path d="M8 172 H312" opacity=".5" strokeWidth={1.4} />
      <path d="M62 172 l-4 5 M160 172 l-4 5 M262 172 l-4 5" opacity=".22" strokeWidth={1} />
    </svg>
  );
}

export function BosKuyruk({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 180"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      className={className}
      style={{ color: 'var(--text-2)' }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <radialGradient id="bos-durumlar-kuyruk-glow">
          <stop offset="0" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".5" />
          <stop offset="1" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* UZAK: ufuk + fabrika + pilon */}
      <path d="M6 134 H314" opacity=".08" strokeWidth={1} />
      <g opacity=".13" strokeWidth={1}>
        <path d="M252 172 V150 l7 -8 7 8 7 -8 7 8 V172" />
        <path d="M286 172 V138 h6 V172" />
        <path d="M290 132 c3 -3 0 -7 3 -10" />
        <path d="M28 172 L34 122 h4 L44 172" />
        <path d="M24 130 h24 M30 156 l10 -8 M40 156 l-10 -8" />
        <path d="M24 132 C 16 134 10 134 6 134" />
      </g>
      {/* alçak sis şeritleri */}
      <g opacity=".08" strokeWidth={4}>
        <path d="M14 150 H90" />
        <path d="M236 156 H306" />
      </g>

      {/* KONVEYÖR: bant + makaralar + sehpalar */}
      <g opacity=".6" strokeWidth={1.2}>
        <path d="M6 68 H314 M6 78 H314" />
        <path d="M72 172 L84 78 M96 172 L84 78 M76 150 H92 M79 128 H89 M76 150 L89 128 M92 150 L79 128" />
        <path d="M224 172 L236 78 M248 172 L236 78 M228 150 H244 M231 128 H241 M228 150 L241 128 M244 150 L231 128" />
      </g>
      <g opacity=".38" strokeWidth={1}>
        <circle cx="24" cy="73" r="3" />
        <circle cx="56" cy="73" r="3" />
        <circle cx="88" cy="73" r="3" />
        <circle cx="120" cy="73" r="3" />
        <circle cx="184" cy="73" r="3" />
        <circle cx="216" cy="73" r="3" />
        <circle cx="248" cy="73" r="3" />
        <circle cx="280" cy="73" r="3" />
      </g>

      {/* AKSAN: bandın akışı */}
      <path className="akis" d="M6 73 H314" style={{ stroke: 'var(--accent)' }} opacity=".5" strokeWidth={1.2} />

      {/* bant üstünde geçip giden evraklar */}
      <g opacity=".55" strokeWidth={1.2}>
        <path d="M30 68 V57 h9 l5 5 v6 M39 57 v5 h5" />
        <path d="M134 68 V58 h12 v10 M134 63 h12" />
        <path d="M264 68 V57 h13 v11 M264 57 l13 11" />
      </g>

      {/* kapak/sensör: kapalı, damla yok */}
      <path d="M152 80 h16 v8 h-16 z" opacity=".6" strokeWidth={1.2} />
      <circle cx="160" cy="84" r="9" fill="url(#bos-durumlar-kuyruk-glow)" stroke="none" />
      <circle className="parilti" cx="160" cy="84" r="1.8" style={{ fill: 'var(--glow)' }} stroke="none" />
      <path d="M160 95 V119" strokeDasharray="0.1 7" opacity=".35" strokeWidth={1.6} />

      {/* YAKIN: boş gelen tepsisi (açık ağızlı) */}
      <g opacity=".85" strokeWidth={1.3}>
        <path d="M116 122 L108 156 M204 122 L212 156 M108 156 H212" />
        <path d="M112 122 h8 M200 122 h8" />
        <path d="M108 156 V164 H212 V156" />
        <path d="M126 164 V172 M194 164 V172" />
        <path d="M124 134 H196 M124 134 L119 152 M196 134 L201 152 M119 152 H201" opacity=".55" strokeWidth={1.1} />
        <path d="M121 128 l-2 6 M160 128 v6 M199 128 l2 6" opacity=".35" strokeWidth={1} />
      </g>
      {/* hayalet kuyruk yuvası: içerik yok */}
      <rect x="136" y="141" width="48" height="8" rx="2" opacity=".25" strokeDasharray="3 4" strokeWidth={1.1} />

      {/* anotasyon */}
      <g opacity=".3" strokeWidth={1}>
        <path d="M96 122 V156 M93 122 h6 M93 156 h6" />
        <path d="M64 48 h6 M67 45 v6" />
        <path d="M251 50 h6 M254 47 v6" />
      </g>

      {/* zemin */}
      <path d="M8 172 H312" opacity=".5" strokeWidth={1.4} />
      <path d="M30 172 l-4 5 M120 172 l-4 5 M200 172 l-4 5 M288 172 l-4 5" opacity=".22" strokeWidth={1} />
    </svg>
  );
}
