/* Jeotermal kapak sahnesi — OZALİT çizgi-sanat.
   Yakın plan: kuyu başı vana ağacı (flanş yığını, el çarkları, manometre).
   Orta: genleşme kıvrımlı boru hattı, separatör tankı, buhar hattı (sağa terk eder),
   reenjeksiyon hattı, RTU köşkü. Fon: sırt silüetleri + uzak kuyu sahası.
   Renk yalnız token: currentColor + var(--accent)/var(--glow)/var(--text-3).
   Derinlik opaklıkla; tek odak ışıması + akış hatları. */

export function KapakJEO({ className }: { className?: string }) {
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
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <radialGradient id="kapak-jeo-isik" cx="50%" cy="50%" r="50%">
          <stop offset="0" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".32" />
          <stop offset=".55" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".09" />
          <stop offset="1" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Fon: sırt silüetleri + uzak kuyu sahası */}
      <g strokeWidth={1.2} style={{ stroke: 'var(--text-3)' }}>
        <path opacity=".12" d="M0 132 C 60 120 110 126 168 132 C 226 138 260 124 318 126 C 366 128 420 118 480 128" />
        <path opacity=".16" d="M0 158 C 80 148 160 156 240 158 C 330 162 400 148 480 156" />
        <path opacity=".10" d="M56 129 C 96 122 128 126 158 130" />
        <g opacity=".16">
          <path d="M24 164 V188 M34 164 V188" />
          <path d="M24 164 A5 3.4 0 0 1 34 164" />
          <path d="M42 188 V170 M45 188 V170 M40.5 170 H46.5" />
          <path d="M43.5 167 c-3 -6 3 -9 0 -16 c-2 -5 2 -8 0 -13" />
          <path d="M50 188 V179 H58 V188" />
        </g>
      </g>

      {/* Odak ışıması (tek) */}
      <circle className="parilti" cx="122" cy="132" r="58" fill="url(#kapak-jeo-isik)" stroke="none" />

      {/* Zemin */}
      <g>
        <path opacity=".55" d="M0 188 H480" />
        <g opacity=".25" strokeWidth={1.2}>
          <path d="M62 188 l-5 6" />
          <path d="M84 188 l-5 6" />
          <path d="M148 188 l-5 6" />
          <path d="M170 188 l-5 6" />
          <path d="M254 188 l-5 6" />
          <path d="M348 188 l-5 6" />
          <path d="M394 188 l-5 6" />
          <path d="M462 188 l-5 6" />
          <path d="M206 186 a3.4 3.4 0 0 1 6.8 0" />
          <path d="M366 186.4 a2.8 2.8 0 0 1 5.6 0" />
        </g>
      </g>

      {/* Orta katman: separatör + buhar hattı + destekler */}
      <g opacity=".36" strokeWidth={1.35}>
        <path d="M288 86 V174 M338 86 V174" />
        <path d="M288 86 A25 10 0 0 1 338 86" />
        <path d="M288 174 A25 10 0 0 0 338 174" />
        <path d="M296 180 V188 M330 180 V188" />
        <path d="M309 188 a4.5 4.5 0 0 1 9 0" />
        <path opacity=".55" d="M288 104 Q313 108 338 104" />
        <path opacity=".55" d="M288 166 Q313 170 338 166" />
        <circle cx="301" cy="156" r="6.5" />
        <circle cx="301" cy="156" r="4.4" opacity=".6" />
        <path d="M301 148.4 v2.2 M301 161.4 v2.2 M293.4 156 h2.2 M306.4 156 h2.2" />
        <path d="M282 138 V166 M282 142 H288 M282 162 H288" />
        <path d="M279.8 148 h4.4 M279.8 154 h4.4" />
        <path d="M343 88 V188 M347 88 V188" />
        <path d="M338 96 H343 M338 176 H343" />
        <path d="M343 94 H347 M343 102 H347 M343 110 H347 M343 118 H347 M343 126 H347 M343 134 H347 M343 142 H347 M343 150 H347 M343 158 H347 M343 166 H347 M343 174 H347 M343 182 H347" />
        <path d="M327 77 V71 M330 77 V71 M325.5 71 H331.5" />
        <path opacity=".6" d="M328.5 68 c1 -2 -1 -3.5 0 -6" />
        <path d="M308 71 h10 M308 68 h10" />
        <path d="M310.5 76 V63 Q310.5 55.5 318 55.5 H480" />
        <path d="M315.5 76 V68 Q315.5 60.5 323 60.5 H480" />
        <path d="M352 53 V63 M355 53 V63" />
        <path d="M424 53 V63 M427 53 V63" />
        <path d="M376 61 V188 M371 61 H381 M371 188 H381" />
        <path d="M444 61 V188 M439 61 H449 M439 188 H449" />
        <path opacity=".6" d="M376 168 L370 188 M376 168 L382 188" />
        <path opacity=".6" d="M444 168 L438 188 M444 168 L450 188" />
      </g>

      {/* RTU köşkü (uzaktan izleme) */}
      <g opacity=".30" strokeWidth={1.3}>
        <path d="M402 188 V170 H430 V188" />
        <path d="M400 170 H432" />
        <path d="M418 188 V176 H426 V188" />
        <path d="M406 175 h8 M406 179 h8" />
        <path d="M427 170 V153" />
        <circle cx="427" cy="151.6" r="1.2" />
        <path d="M422.6 148.2 a6 6 0 0 1 8.8 0" opacity=".7" />
        <path d="M402 182 H338" strokeDasharray="2 4" opacity=".7" />
      </g>

      {/* Boru hattı: kuyu — separatör (genleşme kıvrımı) */}
      <g opacity=".55" strokeWidth={1.5}>
        <path d="M162 128 H190 Q196 128 196 122 V104 Q196 98 202 98 H238 Q244 98 244 104 V122 Q244 128 250 128 H288" />
        <path d="M162 134 H199 Q202 134 202 131 V107 Q202 104 205 104 H235 Q238 104 238 107 V131 Q238 134 241 134 H288" />
        <path d="M176 126 V136 M179 126 V136" />
        <path d="M268 126 V136 M271 126 V136" />
        <path d="M283 126 V136 M286 126 V136" />
        <path opacity=".65" d="M186 134 V188 M182 188 h8" />
        <path opacity=".65" d="M262 134 V188 M258 188 h8" />
      </g>

      {/* Reenjeksiyon hattı: separatör dibi — yer altı */}
      <g opacity=".30" strokeWidth={1.35}>
        <path d="M296 175.5 H207 Q201.5 175.5 201.5 181 V188" />
        <path d="M296 180.5 H212 Q206.5 180.5 206.5 186 V188" />
        <path d="M232 173.5 V182.5 M235 173.5 V182.5" />
        <path d="M258 173.5 V182.5 M261 173.5 V182.5" />
        <path opacity=".7" d="M202 190 V198 M206.5 190 V196" />
      </g>

      {/* Buhar: 3 katman kıvrım */}
      <g fill="none">
        <path opacity=".15" strokeWidth={1.3} style={{ stroke: 'var(--text-3)' }} d="M130 140 C 150 120 126 110 144 90 C 156 76 134 68 146 50 C 150 44 157 46 155 42" />
        <path opacity=".30" strokeWidth={1.4} d="M108 150 C 90 132 122 122 106 102 C 94 88 118 82 108 64 C 102 54 90 58 94 48" />
        <path opacity=".55" strokeWidth={1.5} d="M132 148 C 118 134 148 126 138 108 C 130 94 150 90 142 74 C 137 64 126 66 128 58" />
        <path opacity=".40" strokeWidth={1.4} d="M124 150 C 116 140 132 136 126 124" />
        <path opacity=".22" strokeWidth={1.2} d="M118 92 c-6 -2 -6 -8 -1 -10" />
        <path opacity=".18" strokeWidth={1.2} d="M148 106 c6 -2 6 -8 1 -10" />
      </g>

      {/* Yakın plan: kuyu başı vana ağacı */}
      <g opacity=".78" strokeWidth={1.7}>
        <path d="M100 188 v-7 h40 v7" />
        <path d="M104 177 h32 M104 181 h32 M104 177 v4 M136 177 v4 M112 177 v4 M128 177 v4" />
        <path d="M106 171 h28 M106 174 h28 M106 171 v3 M134 171 v3 M114 171 v3 M126 171 v3" />
        <path d="M113 174 v3 M127 174 v3" />
        <path d="M113 156 V171 M127 156 V171" />
        <path opacity=".55" d="M113 163.5 H127" />
        <path d="M107 153 h26 M107 156 h26 M107 153 v3 M133 153 v3 M115 153 v3 M125 153 v3" />
        <path d="M111 153 L120 147.5 129 153" />
        <path d="M111 141 L120 146.5 129 141" />
        <path d="M107 138 h26 M107 141 h26 M107 138 v3 M133 138 v3 M115 138 v3 M125 138 v3" />
        <path d="M116 147 H101.5" />
        <circle cx="95" cy="147" r="6.5" />
        <path d="M95 140.5 V153.5 M88.5 147 H101.5 M90.4 142.4 L99.6 151.6 M99.6 142.4 L90.4 151.6" />
        <circle cx="95" cy="147" r="1.3" />
        <path d="M114 124 V138 M126 124 V138" />
        <path d="M114 128 H104 M114 134 H104" />
        <path d="M104 126 V136 M101 126 V136" />
        <path d="M126 128 H139 M126 134 H139" />
        <path d="M139 126 V136 M142 126 V136" />
        <path d="M142 125.5 L149.5 131 142 136.5" />
        <path d="M158 125.5 L150.5 131 158 136.5" />
        <path d="M158 126 V136 M161 126 V136" />
        <path d="M161 128 H162 M161 134 H162" />
        <path d="M150 125.5 V118" />
        <ellipse cx="150" cy="116" rx="5.5" ry="1.9" />
        <path d="M150 114.1 v3.8" />
        <path d="M109 121 h22 M109 124 h22 M109 121 v3 M131 121 v3" />
        <path d="M114 121 L120 116.5 126 121" />
        <path d="M114 111 L120 115.5 126 111" />
        <path d="M110 108 h20 M110 111 h20 M110 108 v3 M130 108 v3" />
        <path d="M120 108 V101" />
        <circle cx="120" cy="95" r="6" />
        <path d="M120 95 L123.6 91.4" />
        <path opacity=".6" d="M116 91.6 l1.1 1.1 M120 89.4 v1.6 M124 91.6 l-1.1 1.1" />
        <circle cx="120" cy="95" r="1" />
      </g>

      {/* Yer altı: muhafaza boruları */}
      <g strokeWidth={1.4}>
        <path opacity=".28" d="M114 188 V199 M126 188 V199" />
        <path opacity=".16" d="M110 188 V194 M130 188 V194" />
      </g>

      {/* Enerji hatları (akış) */}
      <g style={{ stroke: 'var(--accent)' }} strokeWidth={1.4} fill="none">
        <path className="akis" opacity=".85" d="M120 198 V131 H193 Q199 131 199 125 V107 Q199 101 205 101 H235 Q241 101 241 107 V125 Q241 131 247 131 H288" />
        <path className="akis" opacity=".6" d="M313 76 V65.5 Q313 58 320.5 58 H480" />
      </g>
    </svg>
  );
}
