/* DGKÇ kapak sahnesi — doğal gaz kombine çevrim santrali, ozalit çizgi-sanat.
   Sağda kadrajı taşan hiperboloit soğutma kulesi (kabuk ızgarası + taban makas
   kafesi), içinden sola sürüklenen kademeli buhar katmanları; ortada türbin
   salonu (fener çatı, cephe panelleri, panjurlar, boru köprüsü); solda ince
   baca ve uzak ikinci kule silüeti. Zeminde enerji hattı (akis) şalt sahasına
   akar, trafo noktasında tek odak ışıması (parilti). Derinlik yalnız opaklıkla;
   renk yalnız CSS token: currentColor + --accent / --glow. */

export function KapakDGKC({ className }: { className?: string }) {
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
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <radialGradient id="kapak-dgkc-parilti">
          <stop offset="0" stopColor="currentColor" style={{ color: 'var(--glow)' }} stopOpacity=".55" />
          <stop offset=".45" stopColor="currentColor" style={{ color: 'var(--glow)' }} stopOpacity=".16" />
          <stop offset="1" stopColor="currentColor" style={{ color: 'var(--glow)' }} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="kapak-dgkc-sonum" gradientUnits="userSpaceOnUse" x1="0" y1="-14" x2="0" y2="186">
          <stop offset="0" stopColor="currentColor" stopOpacity=".26" />
          <stop offset=".3" stopColor="currentColor" stopOpacity=".8" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".8" />
        </linearGradient>
      </defs>

      {/* ozalit kot çizgileri (en arka) */}
      <path d="M0 60 H480" strokeWidth=".8" strokeDasharray="2 7" opacity=".05" />
      <path d="M0 132 H480" strokeWidth=".8" strokeDasharray="2 7" opacity=".06" />

      {/* uzak ikinci kule */}
      <g strokeWidth=".9">
        <path d="M-8 186 C 4 150 16 112 18 84 C 19 70 14 60 10 52" opacity=".14" />
        <path d="M78 186 C 66 150 54 112 52 84 C 51 70 56 60 60 52" opacity=".14" />
        <path d="M10 52 Q 35 46 60 52" opacity=".12" />
        <path d="M10 52 Q 35 58 60 52" opacity=".1" />
        <path d="M6 130 Q 35 136 64 130" opacity=".1" />
        <path d="M22 44 C 18 30 26 20 20 8" opacity=".07" />
        <path d="M40 44 C 44 32 36 22 42 10" opacity=".07" />
      </g>

      {/* buhar kıvrımları (kademeli, sola sürükleniyor) */}
      <g strokeWidth={1.2}>
        <path d="M272 -4 C 268 14 246 26 220 22 C 210 20 206 14 196 15" opacity=".05" />
        <path d="M310 -6 C 306 12 288 24 264 21 C 250 19 246 10 234 12 C 226 13 224 20 212 18" opacity=".08" />
        <path d="M340 -8 C 336 8 322 18 304 16 C 290 14 286 5 274 7 C 264 8 262 16 250 14" opacity=".12" />
        <path d="M366 -8 C 362 4 352 12 338 11 C 326 10 322 2 312 3 C 302 4 300 12 288 11" opacity=".17" />
        <path d="M372 -2 C 380 6 396 6 404 -2" opacity=".1" />
      </g>

      {/* ince baca (sol) */}
      <g strokeWidth={1}>
        <path d="M89 186 L91 22 M99 186 L97 22 M91 22 H97" opacity=".5" />
        <path d="M90.9 30 H97.1 M90.85 34 H97.15" opacity=".35" />
        <path d="M90.5 64 H97.5 M90.1 96 H97.9 M89.7 128 H98.3 M89.35 158 H98.65" opacity=".28" />
        <path d="M101 186 V34" opacity=".15" />
        <path d="M94 18 C 92 10 97 4 95 -4" opacity=".12" />
      </g>

      {/* soğutma kulesi (sağ, kadraj üstünden taşar) */}
      <path
        d="M333 186 C 344 122 353 62 355 28 C 356 14 354 -2 351 -14 L 439 -14 C 436 -2 434 14 435 28 C 437 62 446 122 457 186 Z"
        fill="currentColor"
        fillOpacity=".045"
        stroke="none"
      />
      <g opacity=".2" strokeWidth=".8">
        <path d="M395 -10 V186" stroke="url(#kapak-dgkc-sonum)" strokeDasharray="10 5 2 5" />
      </g>
      <g opacity=".16" strokeWidth={1}>
        <path d="M351.5 186 C 357 130 364 62 367 28 C 368 14 366 -2 364 -14" stroke="url(#kapak-dgkc-sonum)" />
        <path d="M438.5 186 C 433 130 426 62 423 28 C 422 14 424 -2 426 -14" stroke="url(#kapak-dgkc-sonum)" />
        <path d="M373.5 186 C 377 120 380.5 60 381 28 C 381.3 12 380.6 -4 380 -14" stroke="url(#kapak-dgkc-sonum)" />
        <path d="M416.5 186 C 413 120 409.5 60 409 28 C 408.7 12 409.4 -4 410 -14" stroke="url(#kapak-dgkc-sonum)" />
      </g>
      <g strokeWidth={1}>
        <path d="M337 168 Q 395 177.5 453 168" opacity=".3" />
        <path d="M341 144 Q 395 152 449 144" opacity=".26" />
        <path d="M344.5 120 Q 395 127 445.5 120" opacity=".22" />
        <path d="M347.5 97 Q 395 103 442.5 97" opacity=".18" />
        <path d="M350 74 Q 395 79 440 74" opacity=".15" />
        <path d="M353 50 Q 395 54 437 50" opacity=".12" />
      </g>
      <g strokeWidth={1}>
        <path
          d="M334.5 186 L342 170 L350 186 L357.5 170 L365 186 L372.5 170 L380 186 L387.5 170 L395 186 L402.5 170 L410 186 L417.5 170 L425 186 L432.5 170 L440 186 L447.5 170 L455 186"
          opacity=".4"
        />
        <path
          d="M334.5 170 L342 186 L350 170 L357.5 186 L365 170 L372.5 186 L380 170 L387.5 186 L395 170 L402.5 186 L410 170 L417.5 186 L425 170 L432.5 186 L440 170 L447.5 186 L455 170"
          opacity=".4"
        />
      </g>
      <path d="M333 186 C 344 122 353 62 355 28 C 356 14 354 -2 351 -14" stroke="url(#kapak-dgkc-sonum)" strokeWidth={1.5} />
      <path d="M457 186 C 446 122 437 62 435 28 C 434 14 436 -2 439 -14" stroke="url(#kapak-dgkc-sonum)" strokeWidth={1.5} />
      <g strokeWidth=".8">
        <path d="M389 28 H401 M395 22 V34" opacity=".22" />
        <path d="M401 28 H418" opacity=".16" />
        <circle cx="421.5" cy="28" r="2.2" opacity=".2" />
        <path d="M333 191 V196 M457 191 V196 M333 193.5 H457 M395 192 V195" opacity=".16" />
      </g>

      {/* arka ek bina */}
      <g strokeWidth={1}>
        <path d="M148 186 V138 H180" opacity=".35" />
        <path d="M148 142 H180" opacity=".18" />
        <path d="M156 146 V184 M164 146 V184 M172 146 V184" opacity=".12" />
      </g>

      {/* türbin salonu */}
      <g>
        <path d="M180 186 V112 H320 V186" strokeWidth={1.4} opacity=".7" />
        <path d="M180 116 H320" opacity=".28" />
        <path d="M200 112 V100 H300 V112" strokeWidth={1.2} opacity=".62" />
        <path d="M197 100 H303" opacity=".45" />
        <path
          d="M206 103 V109 M214 103 V109 M222 103 V109 M230 103 V109 M238 103 V109 M246 103 V109 M254 103 V109 M262 103 V109 M270 103 V109 M278 103 V109 M286 103 V109 M294 103 V109"
          strokeWidth=".9"
          opacity=".26"
        />
        <path d="M220 100 V94 H226 V100 M250 100 V94 H256 V100 M280 100 V94 H286 V100" opacity=".4" />
        <path
          d="M196 120 V184 M212 120 V184 M228 120 V184 M244 120 V184 M260 120 V184 M276 120 V184 M292 120 V184 M308 120 V184"
          strokeWidth=".9"
          opacity=".12"
        />
        <path d="M188 126 H312 V140 H188 Z" opacity=".4" />
        <path
          d="M200 126 V140 M212 126 V140 M224 126 V140 M236 126 V140 M248 126 V140 M260 126 V140 M272 126 V140 M284 126 V140 M296 126 V140 M308 126 V140"
          strokeWidth=".9"
          opacity=".2"
        />
        <path d="M196 154 H216 V176 H196 Z M234 154 H254 V176 H234 Z M272 154 H292 V176 H272 Z" opacity=".35" />
        <path
          d="M196 159 H216 M196 163.5 H216 M196 168 H216 M196 172.5 H216 M234 159 H254 M234 163.5 H254 M234 168 H254 M234 172.5 H254 M272 159 H292 M272 163.5 H292 M272 168 H292 M272 172.5 H292"
          strokeWidth=".9"
          opacity=".22"
        />
        <path d="M300 186 V160 H316 V186" opacity=".5" />
        <path d="M300 166 H316 M300 172 H316 M300 178 H316" strokeWidth=".9" opacity=".25" />
        <path d="M186 186 V174 H194 V186" opacity=".4" />
        <path d="M200 100 L190 88 H178" strokeWidth=".8" opacity=".18" />
        <circle cx="175" cy="88" r="2.2" strokeWidth=".8" opacity=".2" />
      </g>

      {/* boru köprüsü */}
      <g strokeWidth={1.1}>
        <path d="M324 186 V138 M338 186 V138 M350 186 V140" opacity=".5" />
        <path d="M320 138 H352" opacity=".45" />
        <path d="M324 180 L338 154 M338 180 L324 154" opacity=".26" />
        <path d="M320 142.5 H352 M320 147.5 H352" strokeWidth={1.3} opacity=".65" />
        <path d="M328 142.5 V147.5 M344 142.5 V147.5" strokeWidth=".9" opacity=".35" />
        <path d="M352 140 V150" opacity=".55" />
      </g>

      {/* şalt sahası */}
      <g strokeWidth={1.1}>
        <path d="M110 186 V150 M114 186 V150" opacity=".55" />
        <path d="M110 180 H114 M110 172.5 H114 M110 165 H114 M110 157.5 H114" strokeWidth=".9" opacity=".3" />
        <path d="M162 186 V150 M166 186 V150" opacity=".55" />
        <path d="M162 180 H166 M162 172.5 H166 M162 165 H166 M162 157.5 H166" strokeWidth=".9" opacity=".3" />
        <path d="M106 150 H170 M106 153.5 H170" opacity=".5" />
        <path
          d="M106 153.5 L110 150 L114 153.5 L118 150 L122 153.5 L126 150 L130 153.5 L134 150 L138 153.5 L142 150 L146 153.5 L150 150 L154 153.5 L158 150 L162 153.5 L166 150 L170 153.5"
          strokeWidth=".8"
          opacity=".28"
        />
        <path d="M126 153.5 V161 M150 153.5 V161" opacity=".45" />
        <path
          d="M123.5 155.5 H128.5 M123.5 158 H128.5 M123.5 160.5 H128.5 M147.5 155.5 H152.5 M147.5 158 H152.5 M147.5 160.5 H152.5"
          strokeWidth=".8"
          opacity=".4"
        />
        <path d="M126 161 Q 129 166 132 159 M150 161 Q 148 166 146 159" strokeWidth=".9" opacity=".45" />
      </g>

      {/* trafo */}
      <g>
        <path d="M122 166 H156 V186 H122 Z" strokeWidth={1.3} opacity=".75" />
        <path d="M125.5 169 V183 M128.5 169 V183 M131.5 169 V183" strokeWidth=".9" opacity=".35" />
        <path d="M132 166 V158 M146 166 V158" opacity=".6" />
        <path
          d="M129.5 160 H134.5 M129.5 162.5 H134.5 M129.5 165 H134.5 M143.5 160 H148.5 M143.5 162.5 H148.5 M143.5 165 H148.5"
          strokeWidth=".8"
          opacity=".5"
        />
        <path d="M126 186 V183 M152 186 V183" opacity=".4" />
      </g>

      {/* odak ışıma */}
      <circle cx="139" cy="160" r="30" fill="url(#kapak-dgkc-parilti)" stroke="none" className="parilti" />

      {/* enerji hatları */}
      <path
        d="M312 178.5 H206 C 192 178.5 184 175 174 170 C 166 165.5 152 160.5 147 158.5"
        className="akis"
        style={{ stroke: 'var(--accent)' }}
        strokeWidth={1.5}
        opacity=".85"
      />
      <path
        d="M132 157 C 124 152 118 151.5 110 151.5 C 80 152 40 157 4 155"
        className="akis"
        style={{ stroke: 'var(--accent)' }}
        strokeWidth={1.5}
        opacity=".7"
      />
      <circle cx="139" cy="160" r="2" fill="currentColor" style={{ color: 'var(--glow)' }} stroke="none" opacity=".85" />

      {/* zemin */}
      <path d="M0 186 H480" strokeWidth={1.3} opacity=".6" />
      <path
        d="M20 186 l-5 6 M44 186 l-5 6 M68 186 l-5 6 M92 186 l-5 6 M116 186 l-5 6 M142 186 l-5 6 M168 186 l-5 6 M196 186 l-5 6 M224 186 l-5 6 M252 186 l-5 6 M280 186 l-5 6 M308 186 l-5 6 M336 186 l-5 6 M364 186 l-5 6 M392 186 l-5 6 M420 186 l-5 6 M448 186 l-5 6 M472 186 l-5 6"
        strokeWidth=".8"
        opacity=".14"
      />
      <path d="M0 194 H480" strokeWidth=".8" opacity=".08" />
    </svg>
  );
}
