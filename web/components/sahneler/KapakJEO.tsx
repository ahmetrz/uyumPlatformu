/* Jeotermal kapak sahnesi — OZALİT çizgi-sanat.
   Yakın plan: kuyu başı vana ağacı (flanş yığını, el çarkları, manometre).
   Orta: genleşme kıvrımlı boru hattı, separatör tankı, buhar hattı (sağı kopma
   işaretiyle terk eder), reenjeksiyon pompası, atmosferik susturucu.
   Fon: topo kontürleri, sırt silüetleri, uzak kuyu sahası, sondaj kulesi.
   Ozalit dili: eksen (dash-dot), ölçü çizgileri, kesit artıları, antet bloğu,
   yer altı tabakaları. Renk yalnız token: currentColor + var(--accent)/
   var(--glow-a)/var(--glow-b)/var(--text-3). Işıma tema-uyarlı --glow-a/--glow-b
   ile kurulur (açık temada leke yapmaz). Derinlik opaklıkla; tek odak ışıması,
   pirinç tek anlatı: rezervuar → kuyu → separatör → buhar hattı. */

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
          <stop offset="0" style={{ color: 'var(--glow-a)' }} stopColor="currentColor" />
          <stop offset=".5" style={{ color: 'var(--glow-b)' }} stopColor="currentColor" />
          <stop offset="1" style={{ color: 'var(--glow-b)' }} stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Fon: topo kontürleri + sırtlar + uzak kuyu sahası + sondaj kulesi */}
      <g strokeWidth={1.2} style={{ stroke: 'var(--text-3)' }}>
        <path opacity=".10" d="M0 76 C 30 68 58 70 80 76" />
        <path opacity=".14" d="M0 90 C 36 80 70 82 96 90" />
        <path opacity=".17" d="M0 103 C 44 89 92 91 128 103" />
        <path opacity=".13" d="M0 116 C 54 100 110 102 152 116" />
        <path opacity=".13" d="M336 112 C 380 104 432 106 480 112" />
        <path opacity=".18" d="M0 132 C 60 120 110 126 168 132 C 226 138 260 124 318 126 C 366 128 420 118 480 128" />
        <path opacity=".22" d="M0 158 C 80 148 160 156 240 158 C 330 162 400 148 480 156" />
        <g opacity=".24">
          <path d="M152 188 V172 M160 188 V172" />
          <path d="M152 172 A4 2.8 0 0 1 160 172" />
          <path d="M166 188 V175 M168.5 188 V175 M164.8 175 H170.2" />
          <path d="M167.6 172.5 c-2 -4 2 -6 0 -10.5" />
          <path d="M174 188 V181 H183 V188" />
        </g>
        <g opacity=".2">
          <path d="M398 188 L404 130 H410 L416 188" />
          <path d="M400.6 172 H413.4 M402 157 H412 M403.3 143 H410.7" />
          <path d="M400.6 172 L412 157 M413.4 172 L402 157 M402 157 L410.7 143 M412 157 L403.3 143" />
          <path d="M404.6 130 V123.5 H409.4 V130" />
        </g>
      </g>

      {/* Odak ışıması (tek; tema-uyarlı --glow-a/--glow-b) */}
      <circle className="parilti" cx="122" cy="130" r="64" fill="url(#kapak-jeo-isik)" stroke="none" />

      {/* Ozalit: eksen çizgileri, ölçü, kesit artıları, antet */}
      <g strokeWidth={1}>
        <path opacity=".22" strokeDasharray="9 3 2.5 3" d="M120 44 V128" />
        <path opacity=".15" strokeDasharray="9 3 2.5 3" d="M313 104 V178" />
        <g opacity=".34">
          <path d="M288 82 V50" />
          <path d="M120 54 H288" />
          <path strokeWidth={1.2} d="M117 57 L123 51 M285 57 L291 51" />
        </g>
        <g opacity=".26">
          <path d="M196 96 V89 M244 96 V89" />
          <path d="M196 92 H244" />
          <path strokeWidth={1.2} d="M193.5 94.5 L198.5 89.5 M241.5 94.5 L246.5 89.5" />
        </g>
        <path opacity=".16" d="M14 48 h8 M18 44 v8" />
        <path opacity=".14" d="M456 46 h8 M460 42 v8" />
        <g opacity=".5" strokeWidth={1.1}>
          <path d="M432 156 H476 V184 H432 Z" />
          <path d="M432 164 H476 M432 174 H476 M454 174 V184" />
          <path opacity=".65" d="M436 160 h16 M468 160 h4 M436 169 h24 M436 179 h10 M458 179 h13" />
        </g>
      </g>

      {/* Orta-sol: atmosferik susturucu (rock muffler) + tahliye hattı */}
      <g opacity=".4" strokeWidth={1.35}>
        <path d="M38 188 V141 M58 188 V141" />
        <path d="M38 141 A10 4.4 0 0 1 58 141" />
        <path opacity=".5" d="M38 153 Q48 156 58 153" />
        <path opacity=".5" d="M38 170 Q48 173 58 170" />
        <path d="M62 188 V147 M78 188 V147" />
        <path d="M62 147 A8 3.6 0 0 1 78 147" />
        <path opacity=".5" d="M62 159 Q70 161.5 78 159" />
        <path opacity=".55" d="M46 136 C 40 126 52 120 46 108" />
        <path opacity=".4" d="M52 134 C 58 124 48 118 54 106 C 58 98 52 94 55 86" />
        <path opacity=".3" d="M69 142 C 64 132 74 128 69 116" />
      </g>
      <g opacity=".5" strokeWidth={1.5}>
        <path d="M88.5 147 H58" />
        <path d="M64 144 V150 M67 144 V150" />
      </g>

      {/* Zemin */}
      <path opacity=".55" d="M0 188 H480" />
      <g opacity=".25" strokeWidth={1.2}>
        <path d="M86 188 l-5 6" />
        <path d="M146 188 l-5 6" />
        <path d="M254 188 l-5 6" />
        <path d="M348 188 l-5 6" />
        <path d="M388 188 l-5 6" />
        <path d="M466 188 l-5 6" />
        <path d="M268 186 a3.4 3.4 0 0 1 6.8 0" />
        <path d="M366 186.4 a2.8 2.8 0 0 1 5.6 0" />
      </g>

      {/* Yer altı: tabakalar + muhafaza borusu */}
      <g strokeWidth={1.1} style={{ stroke: 'var(--text-3)' }}>
        <path opacity=".18" strokeDasharray="10 6" d="M0 193.5 C 140 191.5 320 195.5 480 193" />
        <path opacity=".12" strokeDasharray="5 7" d="M0 197.8 C 160 196.2 340 199.4 480 197" />
      </g>
      <g strokeWidth={1.4}>
        <path opacity=".4" d="M114 188 V200 M126 188 V200" />
        <path opacity=".22" d="M110 188 V195 M130 188 V195" />
        <path opacity=".28" strokeWidth={1} d="M110 191 l-4 3.5 M130 191 l4 3.5" />
      </g>

      {/* Boru hattı: kuyu -> separatör (genleşme kıvrımı) */}
      <g opacity=".6" strokeWidth={1.5}>
        <path d="M162 128 H190 Q196 128 196 122 V104 Q196 98 202 98 H238 Q244 98 244 104 V122 Q244 128 250 128 H288" />
        <path d="M162 134 H199 Q202 134 202 131 V107 Q202 104 205 104 H235 Q238 104 238 107 V131 Q238 134 241 134 H288" />
        <path d="M176 126 V136 M179 126 V136" />
        <path d="M268 126 V136 M271 126 V136" />
        <path d="M283 126 V136 M286 126 V136" />
        <path opacity=".65" d="M186 134 V188 M182 188 h8" />
        <path opacity=".65" d="M262 134 V188 M258 188 h8" />
      </g>

      {/* Separatör tankı (güçlendirilmiş) */}
      <g opacity=".55" strokeWidth={1.45}>
        <path d="M288 86 V174 M338 86 V174" />
        <path d="M288 86 A25 10 0 0 1 338 86" />
        <path d="M288 174 A25 10 0 0 0 338 174" />
        <path d="M296 180 V188 M330 180 V188" />
        <path d="M309 188 a4.5 4.5 0 0 1 9 0" />
        <path opacity=".5" d="M288 104 Q313 108 338 104" />
        <path opacity=".5" d="M288 166 Q313 170 338 166" />
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
        <circle cx="296" cy="71" r="3.2" />
        <path d="M296 74.2 V79" />
      </g>

      {/* Buhar hattı: separatör -> sağa terk (kopma işaretiyle biter) */}
      <g opacity=".46" strokeWidth={1.4}>
        <path d="M310.5 76 V63 Q310.5 55.5 318 55.5 H452" />
        <path d="M315.5 76 V68 Q315.5 60.5 323 60.5 H452" />
        <path d="M352 53 V63 M355 53 V63" />
        <path d="M398 53 V63 M401 53 V63" />
        <path opacity=".85" strokeWidth={1.2} d="M455 51 q5 4.5 0 9 q-5 4.5 0 9" />
        <path d="M372 60.5 V188 M367 60.5 H377 M367 188 H377" />
        <path opacity=".6" d="M372 168 L366 188 M372 168 L378 188" />
        <path d="M424 60.5 V188 M419 60.5 H429 M419 188 H429" />
        <path opacity=".6" d="M424 168 L418 188 M424 168 L430 188" />
      </g>

      {/* Reenjeksiyon: separatör dibi -> pompa -> yer altı */}
      <g opacity=".36" strokeWidth={1.35}>
        <path d="M296 175.5 H232" />
        <path d="M296 180.5 H232" />
        <path d="M244 173.5 V182.5 M247 173.5 V182.5" />
        <path d="M272 173.5 V182.5 M275 173.5 V182.5" />
        <path d="M214 186 V170 H232 V186" />
        <path d="M217 186 V188 M229 186 V188" />
        <circle cx="223" cy="178" r="4" />
        <path d="M223 178 L226 175" />
        <path d="M214 175.5 H207 Q201.5 175.5 201.5 181 V200" />
        <path d="M214 180.5 H212 Q206.5 180.5 206.5 186 V200" />
        <path opacity=".7" d="M202 194 l2 3.5 2 -3.5" />
      </g>

      {/* Buhar: 3 katman kıvrım (kuyu başından) */}
      <g fill="none">
        <path opacity=".18" strokeWidth={1.3} style={{ stroke: 'var(--text-3)' }} d="M138 142 C 158 122 132 110 150 90 C 162 76 140 66 153 48 C 156 44 162 45 161 42" />
        <path opacity=".34" strokeWidth={1.5} d="M106 150 C 88 132 120 122 104 102 C 92 88 116 80 106 62 C 100 52 88 56 92 46" />
        <path opacity=".62" strokeWidth={1.7} d="M132 148 C 118 134 148 126 138 108 C 130 94 150 90 142 74 C 137 64 126 66 128 56 C 129 51 133 52 132 47" />
        <path opacity=".45" strokeWidth={1.5} d="M122 150 C 114 140 130 136 124 124 C 120 116 127 112 124 104" />
        <path opacity=".24" strokeWidth={1.3} d="M114 92 c-6 -2 -6 -8 -1 -10" />
        <path opacity=".22" strokeWidth={1.3} d="M148 106 c6 -2 6 -8 1 -10" />
        <path opacity=".2" strokeWidth={1.3} d="M150 72 c6 -3 4 -9 -1 -9" />
      </g>

      {/* Yakın plan: kuyu başı vana ağacı */}
      <g opacity=".8" strokeWidth={1.7}>
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

      {/* Enerji hatları (pirinç; tek anlatı: rezervuar -> kuyu -> separatör -> buhar) */}
      <g style={{ stroke: 'var(--accent)' }} strokeWidth={1.4} fill="none">
        <path className="akis" opacity=".85" d="M120 200 V131 H193 Q199 131 199 125 V107 Q199 101 205 101 H235 Q241 101 241 107 V125 Q241 131 247 131 H288" />
        <path className="akis" opacity=".55" d="M313 98 V65.5 Q313 58 320.5 58 H448" />
      </g>
    </svg>
  );
}
