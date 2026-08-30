/* DGKÇ kapak sahnesi — doğal gaz kombine çevrim santrali, ozalit çizgi-sanat.
   Pafta dili tam: kesikli çerçeve + köşe crosshair'leri + sağ altta antet
   (title block, kule tabanının önüne biner), ölçü hattı ve etiketli callout'lar.
   Sağda çerçeve İÇİNDE kalan hiperboloit soğutma kulesi; ağzından sola
   sürüklenen akım-çizgisi buhar yelpazesi. Ortada türbin salonu + kuleye
   binen boru köprüsü; solda iletim direği, ince baca, kot bayrağı ve
   güçlendirilmiş hayalet ikinci kule. Pirinç aksan tek sistem: jeneratör
   terminali → trafo odak ışıması (parilti) → direk izolatörü; hat iki
   ucunda da düğüme bağlanır. Derinlik yalnız opaklık + örtüşmeyle; renk
   yalnız CSS token: currentColor + --accent / --glow / --bg. */

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
          <stop offset="0" stopColor="currentColor" style={{ color: 'var(--glow)' }} stopOpacity=".22" />
          <stop offset=".45" stopColor="currentColor" style={{ color: 'var(--glow)' }} stopOpacity=".06" />
          <stop offset="1" stopColor="currentColor" style={{ color: 'var(--glow)' }} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ozalit kot çizgileri (en arka) */}
      <path d="M10 60 H470" strokeWidth=".8" strokeDasharray="2 7" opacity=".07" />
      <path d="M10 132 H470" strokeWidth=".8" strokeDasharray="2 7" opacity=".08" />

      {/* pafta çerçevesi + köşe crosshair */}
      <path d="M10 12 H470 V192 H10 Z" strokeWidth=".8" strokeDasharray="6 4" opacity=".16" />
      <g strokeWidth=".7" opacity=".3">
        <path d="M10 7 V17 M5 12 H15" />
        <path d="M470 7 V17 M465 12 H475" />
        <path d="M10 187 V197 M5 192 H15" />
        <path d="M470 187 V197 M465 192 H475" />
      </g>

      {/* uzak ikinci kule (hayalet) */}
      <g strokeWidth=".9">
        <path d="M10 186 C 22 146 32 110 34 86 C 35.2 71 31.5 60.5 28.5 51" opacity=".2" />
        <path d="M92 186 C 79 146 68 110 66 86 C 64.8 71 68.5 60.5 71.5 51" opacity=".2" />
        <path d="M28.5 51 Q 50 46.5 71.5 51" opacity=".17" />
        <path d="M28.5 51 Q 50 55.5 71.5 51" opacity=".13" />
        <path d="M15 166 Q 50 172 85.5 166" opacity=".13" />
        <path d="M20 134 Q 50 139.5 80 134" opacity=".12" />
        <path d="M25 102 Q 50 107 75 102" opacity=".11" />
        <path d="M64 47 C 58 38 46 35 36 39 C 29 42 27 47.5 18 46.5" opacity=".1" />
        <path d="M72 44.5 C 68 36 58 31.5 46 34" opacity=".12" />
      </g>

      {/* kot bayrağı (sol üst referans) */}
      <g>
        <path d="M20 48 H162" strokeWidth=".7" opacity=".26" />
        <path d="M30.5 43.6 L37.5 43.6 L34 48 Z" strokeWidth=".8" opacity=".4" />
        <text
          x="41"
          y="45.8"
          fontSize="5"
          stroke="none"
          fill="currentColor"
          opacity=".5"
          style={{ fontFamily: 'var(--font-mono)' }}
          letterSpacing=".4"
        >
          +48.00
        </text>
      </g>

      {/* iletim direği (sol orta plan) */}
      <g strokeWidth={1}>
        <path d="M47 186 L53.5 122 M67 186 L60.5 122" opacity=".45" />
        <path d="M53.5 122 L57 114 L60.5 122" opacity=".45" />
        <path d="M42 128 H72" opacity=".5" />
        <path d="M45 140 H69" opacity=".45" />
        <path d="M48.5 172 L65.6 158 M65.5 172 L48.6 158" strokeWidth=".8" opacity=".26" />
        <path d="M50 156 L64 145 M64 156 L50 145" strokeWidth=".8" opacity=".26" />
        <path d="M47 128 V131.6 M67 128 V131.6" strokeWidth=".8" opacity=".35" />
        <path d="M57 140 V145 M55.6 141.6 H58.4 M55.6 143.4 H58.4" strokeWidth=".8" opacity=".5" />
        <path d="M42 128.6 C 30 131 20 133 13 134.8" strokeWidth=".8" opacity=".15" />
        <path d="M45 140.6 C 34 142.5 24 144 13 145.6" strokeWidth=".8" opacity=".15" />
      </g>

      {/* ince baca (sol) */}
      <g strokeWidth={1}>
        <path d="M89 186 L91 22 M99 186 L97 22 M91 22 H97" opacity=".55" />
        <path d="M90.9 30 H97.1 M90.85 34 H97.15" opacity=".38" />
        <path d="M90.5 64 H97.5 M90.1 96 H97.9 M89.7 128 H98.3 M89.35 158 H98.65" opacity=".3" />
        <path d="M101 186 V34" opacity=".18" />
        <path d="M94.2 19 C 93 16.5 95.6 15 94.6 13.5" strokeWidth=".9" opacity=".14" />
      </g>

      {/* soğutma kulesi (sağ, çerçeve içinde) */}
      <path
        d="M333 186 C 345 134 355 82 356.5 60 C 357.6 46 355 35.5 352.2 28 Q 395 23 437.8 28 C 435 35.5 432.4 46 433.5 60 C 434.5 82 445 134 457 186 Z"
        fill="currentColor"
        fillOpacity=".05"
        stroke="none"
      />
      <path d="M395 14 V189" strokeWidth=".7" strokeDasharray="10 4 2 4" opacity=".18" />
      <g strokeWidth={1} opacity=".15">
        <path d="M351.5 186 C 358.5 130 365 78 366.3 58 C 367.1 45 365.6 36 364.2 30.2" />
        <path d="M438.5 186 C 431.5 130 425 78 423.7 58 C 422.9 45 424.4 36 425.8 30.2" />
        <path d="M373.5 186 C 377.5 126 381 72 381.4 56 C 381.7 44 381.2 36 380.9 31.6" />
        <path d="M416.5 186 C 412.5 126 409 72 408.6 56 C 408.3 44 408.8 36 409.1 31.6" />
      </g>
      <g strokeWidth={1}>
        <path d="M337.5 168 Q 395 176 452.5 168" opacity=".3" />
        <path d="M342.5 146 Q 395 153.5 447.5 146" opacity=".26" />
        <path d="M347 124 Q 395 130.5 443 124" opacity=".22" />
        <path d="M351 102 Q 395 108 439 102" opacity=".19" />
        <path d="M354.5 80 Q 395 85.5 435.5 80" opacity=".16" />
        <path d="M356.6 58 Q 395 62.5 433.4 58" opacity=".14" />
        <path d="M355.6 42 Q 395 46 436.4 42" opacity=".13" />
      </g>
      <g strokeWidth={1}>
        <path
          d="M337.5 169 L345.2 186 L352.8 169 L360.5 186 L368.2 169 L375.8 186 L383.5 169 L391.2 186 L398.8 169 L406.5 186 L414.2 169 L421.8 186 L429.5 169 L437.2 186 L444.8 169 L452.5 186"
          opacity=".35"
        />
        <path
          d="M337.5 186 L345.2 169 L352.8 186 L360.5 169 L368.2 186 L375.8 169 L383.5 186 L391.2 169 L398.8 186 L406.5 169 L414.2 186 L421.8 169 L429.5 186 L437.2 169 L444.8 186 L452.5 169"
          opacity=".35"
        />
      </g>
      <path d="M333 186 C 345 134 355 82 356.5 60 C 357.6 46 355 35.5 352.2 28" strokeWidth={1.4} opacity=".55" />
      <path d="M457 186 C 445 134 435 82 433.5 60 C 432.4 46 435 35.5 437.8 28" strokeWidth={1.4} opacity=".55" />
      <path d="M352.2 28 Q 395 23 437.8 28" strokeWidth={1.2} opacity=".5" />
      <path d="M352.2 28 Q 395 33 437.8 28" strokeWidth={1} opacity=".35" />
      <path d="M353.6 24.6 Q 395 20 436.4 24.6" strokeWidth=".8" opacity=".18" />

      {/* buhar: ağızdan çıkan akım çizgisi yelpazesi, rüzgâr sola */}
      <g strokeWidth={1.1}>
        <path d="M382 24 C 381 20 384 18 383 15" strokeWidth=".9" opacity=".12" />
        <path d="M410 24 C 410.5 20 408 18.5 409 15.5" strokeWidth=".9" opacity=".12" />
        <path d="M362 26 C 354 20 342 17.5 330 19 C 322 20 318 23.5 310 24" opacity=".3" />
        <path d="M378 25 C 366 15.5 348 12 330 13.5 C 314 15 306 20.5 292 21 C 282 21.3 276 18.5 266 19.5" opacity=".22" />
        <path
          d="M400 24.5 C 390 14 368 12 346 13 C 328 13.8 320 19 304 19 C 290 19 284 15 270 16 C 258 17 252 21 240 20.5"
          opacity=".15"
        />
        <path
          d="M424 25 C 416 15 398 12.5 376 13 C 352 13.5 344 17.5 326 16.5 C 310 16 304 13.5 288 14.5 C 274 15.5 268 19 256 18.5"
          opacity=".1"
        />
        <path d="M240 20.5 C 230 20 226 16.5 216 17.5" strokeWidth=".9" opacity=".08" />
        <path d="M348 21 a6 6 0 0 0 9 1.5" strokeWidth=".9" opacity=".18" />
        <path d="M312 21.5 a5.5 5.5 0 0 0 8.5 1" strokeWidth=".9" opacity=".15" />
      </g>

      {/* arka ek bina */}
      <g strokeWidth={1}>
        <path d="M148 186 V138 H180" opacity=".35" />
        <path d="M148 142 H180" opacity=".18" />
        <path d="M156 146 V184 M164 146 V184 M172 146 V184" opacity=".13" />
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
          opacity=".13"
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
      </g>

      {/* ölçü hattı (türbin salonu) */}
      <g>
        <path d="M180 108 V80 M320 108 V80" strokeWidth=".7" opacity=".3" />
        <path d="M182 84 H236 M266 84 H318" strokeWidth=".7" opacity=".35" />
        <path d="M188.5 82.5 L182 84 L188.5 85.5 M311.5 82.5 L318 84 L311.5 85.5" strokeWidth=".8" opacity=".45" />
        <text
          x="251"
          y="86"
          fontSize="5.5"
          textAnchor="middle"
          stroke="none"
          fill="currentColor"
          opacity=".55"
          style={{ fontFamily: 'var(--font-mono)' }}
          letterSpacing=".4"
        >
          140.0 m
        </text>
      </g>

      {/* etiketli callout'lar */}
      <g>
        <circle cx="218" cy="92.5" r="1.1" fill="currentColor" stroke="none" opacity=".6" />
        <path d="M218 92.5 L176 68 H162" strokeWidth=".7" opacity=".4" />
        <text
          x="159"
          y="70"
          fontSize="5.5"
          textAnchor="end"
          stroke="none"
          fill="currentColor"
          opacity=".6"
          style={{ fontFamily: 'var(--font-mono)' }}
          letterSpacing=".4"
        >
          TG-01
        </text>
        <circle cx="352.5" cy="90" r="1.1" fill="currentColor" stroke="none" opacity=".6" />
        <path d="M352.5 90 L324 72 H313" strokeWidth=".7" opacity=".4" />
        <text
          x="310"
          y="74"
          fontSize="5.5"
          textAnchor="end"
          stroke="none"
          fill="currentColor"
          opacity=".6"
          style={{ fontFamily: 'var(--font-mono)' }}
          letterSpacing=".4"
        >
          SK-01
        </text>
      </g>

      {/* boru köprüsü (kule önüne biner) */}
      <g strokeWidth={1.1}>
        <path d="M324 186 V138 M338 186 V138 M352 186 V140 M366 186 V140" opacity=".5" />
        <path d="M320 138 H370" opacity=".45" />
        <path d="M324 180 L338 154 M338 180 L324 154" opacity=".26" />
        <path d="M320 142.5 H372 M320 147.5 H372" strokeWidth={1.3} opacity=".65" />
        <path d="M328 142.5 V147.5 M344 142.5 V147.5 M360 142.5 V147.5" strokeWidth=".9" opacity=".35" />
        <path d="M372 140 V150" opacity=".55" />
      </g>

      {/* şalt sahası */}
      <g strokeWidth={1.1}>
        <path d="M110 186 V150 M114 186 V150" opacity=".55" />
        <path d="M110 180 H114 M110 172.5 H114 M110 165 H114 M110 157.5 H114" strokeWidth=".9" opacity=".3" />
        <path d="M162 186 V150 M166 186 V150" opacity=".55" />
        <path d="M162 180 H166 M162 172.5 H166 M162 165 H166 M162 157.5 H166" strokeWidth=".9" opacity=".3" />
        <path d="M106 150 H182 M106 153.5 H182" opacity=".5" />
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

      {/* odak ışıma: radyal + halka + ışık tırnakları */}
      <circle cx="139" cy="160" r="26" fill="url(#kapak-dgkc-parilti)" stroke="none" className="parilti" />
      <circle cx="139" cy="160" r="7.5" strokeWidth={1} opacity=".55" style={{ stroke: 'var(--glow)' }} className="parilti" />
      <path
        d="M139 149.5 V146.5 M139 170.5 V173.5 M128.5 160 H125.5 M149.5 160 H152.5"
        strokeWidth=".9"
        opacity=".45"
        style={{ stroke: 'var(--glow)' }}
        className="parilti"
      />

      {/* enerji hattı: jeneratör terminali → trafo → direk izolatörü */}
      <circle cx="312" cy="178.5" r="1.8" strokeWidth={1} opacity=".8" style={{ stroke: 'var(--accent)' }} />
      <path
        d="M312 178.5 H206 C 192 178.5 184 175 174 170 C 166 165.5 152 160.5 147 158.5"
        className="akis"
        style={{ stroke: 'var(--accent)' }}
        strokeWidth={1.5}
        opacity=".75"
      />
      <path
        d="M132 157 C 116 151 102 148.5 90 148 C 77 147.5 65 147.6 58.2 146.2"
        className="akis"
        style={{ stroke: 'var(--accent)' }}
        strokeWidth={1.3}
        opacity=".55"
      />
      <circle cx="57.2" cy="146" r="1.6" strokeWidth={1} opacity=".7" style={{ stroke: 'var(--accent)' }} />
      <circle cx="139" cy="160" r="2" fill="currentColor" style={{ color: 'var(--glow)' }} stroke="none" opacity=".85" />

      {/* zemin */}
      <path d="M0 186 H480" strokeWidth={1.3} opacity=".6" />
      <path
        d="M20 186 l-5 6 M44 186 l-5 6 M68 186 l-5 6 M92 186 l-5 6 M116 186 l-5 6 M142 186 l-5 6 M168 186 l-5 6 M196 186 l-5 6 M224 186 l-5 6 M252 186 l-5 6 M280 186 l-5 6 M308 186 l-5 6 M336 186 l-5 6 M364 186 l-5 6 M392 186 l-5 6 M420 186 l-5 6 M448 186 l-5 6"
        strokeWidth=".8"
        opacity=".14"
      />

      {/* antet (title block, sağ alt köşe — kule tabanının önüne biner) */}
      <g>
        <path d="M398 170 H470 V192 H398 Z" fill="currentColor" style={{ color: 'var(--bg)' }} stroke="none" />
        <path d="M398 170 H470 V192 H398 Z" strokeWidth={1} opacity=".45" />
        <path d="M398 177.5 H470 M398 184.5 H470" strokeWidth=".7" opacity=".3" />
        <path d="M446 170 V177.5" strokeWidth=".7" opacity=".3" />
        <text
          x="401.5"
          y="175.7"
          fontSize="4.6"
          stroke="none"
          fill="currentColor"
          opacity=".55"
          style={{ fontFamily: 'var(--font-mono)' }}
          letterSpacing=".3"
        >
          ŞEBEKE UYUM
        </text>
        <text
          x="449"
          y="175.7"
          fontSize="4.6"
          stroke="none"
          fill="currentColor"
          opacity=".55"
          style={{ fontFamily: 'var(--font-mono)' }}
          letterSpacing=".3"
        >
          A-03
        </text>
        <text
          x="401.5"
          y="182.7"
          fontSize="4.2"
          stroke="none"
          fill="currentColor"
          opacity=".45"
          style={{ fontFamily: 'var(--font-mono)' }}
          letterSpacing=".3"
        >
          DGKÇ · KOMBİNE ÇEVRİM
        </text>
        <text
          x="401.5"
          y="189.9"
          fontSize="4.2"
          stroke="none"
          fill="currentColor"
          opacity=".45"
          style={{ fontFamily: 'var(--font-mono)' }}
          letterSpacing=".3"
        >
          ÖLÇEK 1:500 · REV 2
        </text>
      </g>
    </svg>
  );
}
