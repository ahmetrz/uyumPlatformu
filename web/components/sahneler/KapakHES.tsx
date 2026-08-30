/* HES kapak sahnesi — ozalit profil kesiti.
   Solda katmanlı rezervuar (su düzlemi, dalga bantları, kesit taramaları) ve
   yakın kıyı burnu; ortada dar kretli / mansaba açılan etekli baraj gövdesi:
   kret üstü kapak dikmeleri + vinç kirişi, su alma kulesi + yaya köprüsü,
   yüzeyden dolusavak akış çizgileri, gövde içinde kesikli gizli-hat iki cebri
   boru güzergâhı; sağda santral binası + trafo, tek odak ışıması (parilti) ve
   iletim direklerine binen TEK kesikli pirinç enerji hattı (akis) — hat kanvas
   içinde sonlanır. Kot/ölçü notasyonu etiketli (KRET / NSK / MIN / H).
   Derinlik yalnız opaklıkla; renk yalnız CSS token: currentColor + --accent /
   --glow. Uzak katman .14-.18, orta .19-.38, yakın .5-.85. */

export function KapakHES({ className }: { className?: string }) {
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
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* — uzak katman: sırtlar + rezervuarın uzak kıyısı — */}
      <g strokeWidth="1">
        <path d="M0,52 C 60,46 130,46 190,52" opacity=".18" />
        <path d="M56,62 C 112,56.8 160,56.6 206,61.4" opacity=".15" />
        <path d="M300,58 C 356,51 420,51 480,59" opacity=".18" />
        <path d="M330,67 C 380,61.5 430,61.5 480,68.5" opacity=".15" />
        <path d="M58,86 C 120,83.5 180,83 214,84.2" opacity=".14" />
      </g>

      {/* orta-uzak: sağ boğaz duvarı — dolusavak perdesi ardında kaybolur */}
      <path d="M480,92 C 450,94 418,101 390,110 C 358,120 328,112 305,100.5" strokeWidth="1.1" opacity=".24" />

      {/* — rezervuar: su düzlemi + dalga bantları — */}
      <g strokeWidth="1.1">
        <path d="M58,90 H212 M230,90 H245" opacity=".38" />
        <path d="M64,95.5 C 120,94 180,94 242,95.7" opacity=".26" />
        <path d="M74,101 C 130,99.6 190,99.7 240,101" opacity=".19" />
        <path d="M84,106.5 C 130,105.5 190,105.5 236,106.5" opacity=".13" />
        <path d="M118,92.5 c 4,1.5 8,1.5 12,0" opacity=".3" />
        <path d="M156,92.2 c 4,1.5 8,1.5 12,0" opacity=".3" />
        <path d="M194,92.8 c 4,1.5 8,1.5 12,0" opacity=".28" />
        <path d="M138,97.8 c 3.5,1.3 7,1.3 10.5,0" opacity=".2" />
        <path d="M178,97.6 c 3.5,1.3 7,1.3 10.5,0" opacity=".2" />
        <path d="M212,103.2 c 3.5,1.3 7,1.3 10.5,0" opacity=".15" />
        <path d="M232,93 c 3.5,1.4 7,1.4 10.5,0" opacity=".26" />
        <path d="M208,96.5 h7 M210,100.5 h4" opacity=".14" />
      </g>
      {/* su kütlesi: ozalit kesit çizgileri (memba duvarına kadar) */}
      <g strokeWidth="1">
        <path d="M100,118 H243" opacity=".16" />
        <path d="M106,131 H243" opacity=".14" />
        <path d="M112,144 H243" opacity=".13" />
        <path d="M118,158 H243" opacity=".12" />
        <path d="M126,172 H243" opacity=".11" />
        <path d="M136,184 H243" opacity=".1" />
      </g>

      {/* su alma kulesi + krete yaya köprüsü */}
      <g>
        <path d="M216,90 V63 M226,90 V63" strokeWidth="1.2" opacity=".62" />
        <path d="M213.5,63 H228.5" strokeWidth="1" opacity=".55" />
        <path d="M219.5,69 h3.5 M219.5,75 h3.5" strokeWidth="1" opacity=".45" />
        <path d="M228,68.5 C 231.5,70 235,72.5 238,75" strokeWidth="1" opacity=".5" />
        <path d="M228,65.5 C 231.5,67 235,69.5 238,72" strokeWidth=".9" opacity=".35" />
        <path d="M232.5,66.9 v3.2" strokeWidth=".9" opacity=".3" />
      </g>

      {/* — ozalit notasyonu: kret kotu, su kotu, düşey ölçü, istasyon artıları — */}
      <g strokeWidth=".9">
        <path d="M100,76 H210 M229,76 H237" strokeDasharray="7 3 1.2 3" opacity=".32" />
        <path d="M105,73 l-5,3 5,3" opacity=".45" />
        <path d="M148,86 l-6,3.8" opacity=".4" />
        <path d="M96,111 H228" strokeDasharray="6 3 1 3" opacity=".14" />
        <path d="M110,79 V187 M110,79 l-2.2,4.8 M110,79 l2.2,4.8 M110,187 l-2.2,-4.8 M110,187 l2.2,-4.8" opacity=".32" />
        <path d="M70,64 h8 M74,60 v8" opacity=".28" />
        <path d="M316,124 h8 M320,120 v8" opacity=".3" />
        <path d="M440,84 h8 M444,80 v8" opacity=".26" />
      </g>
      <text x="110" y="72.3" fontSize="5.8" letterSpacing=".5" fill="currentColor" stroke="none" opacity=".55" style={{ fontFamily: 'var(--font-mono), monospace' }}>KRET 652.40</text>
      <text x="151" y="87" fontSize="5.4" letterSpacing=".4" fill="currentColor" stroke="none" opacity=".42" style={{ fontFamily: 'var(--font-mono), monospace' }}>NSK 648.10</text>
      <text x="100" y="108.5" fontSize="5.4" letterSpacing=".4" fill="currentColor" stroke="none" opacity=".3" style={{ fontFamily: 'var(--font-mono), monospace' }}>MIN 611.0</text>
      <text x="105.5" y="133" transform="rotate(-90 105.5 133)" textAnchor="middle" fontSize="5.8" letterSpacing=".5" fill="currentColor" stroke="none" opacity=".5" style={{ fontFamily: 'var(--font-mono), monospace' }}>H = 96.0</text>

      {/* — baraj gövdesi: profil kesit — dar kret, mansaba açılan etek — */}
      <g>
        <path d="M238,76 H294" strokeWidth="1.6" opacity=".85" />
        <path d="M240,80 H286" strokeWidth="1" opacity=".4" />
        <path d="M246,80 V90" strokeWidth="1.5" opacity=".8" />
        <path d="M246,90 V189" strokeWidth="1" opacity=".34" />
        <path d="M290,76 C 293,104 304,142 326,174 C 332,182 340,188 348,190.5" strokeWidth="1.5" opacity=".82" />
        {/* etek kademeleri (eğime paralel derzler) */}
        <path d="M282,80.5 C 285,108 295,144 314,172 C 316.5,175.7 319,179 322,182" strokeWidth="1" opacity=".26" />
        <path d="M270,80.5 C 272.5,110 280,146 296,171 C 298,174.3 300.5,177.5 303,180.4" strokeWidth="1" opacity=".19" />
        {/* galeriler + taban çıkışı */}
        <path d="M252,118 h13 M252,146 h18" strokeWidth="1" opacity=".22" />
        <path d="M256,190 V184 h7 V190" strokeWidth="1" opacity=".4" />
        {/* kret üstü kapak dikmeleri + vinç kirişi + korkuluk */}
        <path d="M252,76 V66 M262,76 V65.5 M272,76 V65.5 M282,76 V66" strokeWidth="1.1" opacity=".7" />
        <path d="M248,65.5 H286" strokeWidth="1.1" opacity=".65" />
        <path d="M256,65.5 v-5 h8 v5" strokeWidth="1" opacity=".55" />
        <path d="M274,65.5 v2.8 h6 v-2.8 M277,68.3 v3.5" strokeWidth="1" opacity=".45" />
        <path d="M242,76 v-2.6 M247,76 v-2.6 M288,76 v-2.6 M292,76 v-2.6" strokeWidth=".9" opacity=".35" />
      </g>

      {/* gizli hat: iki cebri boru güzergâhı (memba ağzından santrale) */}
      <g strokeWidth="1" strokeDasharray="2.5 2.5" opacity=".32">
        <path d="M246,120 C 270,122.5 296,132 314,147.5 C 328,159.5 342,168 358,172.5" />
        <path d="M246,136 C 268,138.5 290,147 306,159.5 C 319,169.5 337,178.5 358,183.5" />
      </g>
      <g strokeWidth="1" opacity=".35">
        <path d="M246,116.5 c -5,1 -6,6 0,7" />
        <path d="M246,132.5 c -5,1 -6,6 0,7" />
      </g>
      {/* cebri boru kimliği: flanş tikleri + akış okları */}
      <g strokeWidth="1" opacity=".38">
        <path d="M283,119.5 l-1.6,5.2 M279,135.2 l-1.8,5" />
        <path d="M330,161.5 l-5.8,-.4 M330,161.5 l-3.6,-3.9" />
        <path d="M324,174 l-5.7,-.9 M324,174 l-3.2,-4.2" />
      </g>

      {/* — dolusavak: yüzeyden akış çizgileri + enerji kırıcı havuz — */}
      <g strokeWidth="1.1">
        <path d="M294,79 C 298,106 310,144 332,173 C 338,180 345,185.5 352,188.5" opacity=".5" />
        <path d="M299,81.5 C 303,108 316,144 336,171 C 341.5,178.5 347,184 353,187.5" opacity=".42" />
        <path d="M334,187.5 c 6,-2.6 12,-2.6 18,0" opacity=".5" />
        <path d="M340,190.5 c 5,-2.2 10,-2.2 15,0" opacity=".35" />
      </g>
      <g fill="currentColor" stroke="none">
        <circle cx="340" cy="182.5" r=".9" opacity=".5" />
        <circle cx="349" cy="185" r=".7" opacity=".45" />
      </g>

      {/* — santral binası — */}
      <g>
        <path d="M358,192 V152 H416 V192" strokeWidth="1.5" opacity=".85" />
        <path d="M354.5,152 H419.5" strokeWidth="1.3" opacity=".75" />
        <path d="M362,160 H412" strokeWidth="1" opacity=".28" />
        <path d="M366,166.5 V181 M375,166.5 V181 M384,166.5 V181 M393,166.5 V181" strokeWidth="1.1" opacity=".5" />
        <path d="M400,192 V180 H409 V192" strokeWidth="1.2" opacity=".6" />
        <path d="M367,152 v-4.5 h7 v4.5 M387,152 v-4.5 h7 v4.5" strokeWidth="1" opacity=".5" />
        <path d="M417.5,189.5 c 3.5,-1.5 7,-1.5 10.5,0" strokeWidth="1" opacity=".28" />
      </g>

      {/* trafo + bara */}
      <g>
        <path d="M427,192 V180.5 H439 V192" strokeWidth="1.3" opacity=".75" />
        <path d="M430.5,180.5 V175 M435.5,180.5 V175" strokeWidth="1.1" opacity=".6" />
        <circle cx="430.5" cy="173.5" r="1.2" strokeWidth="1" opacity=".6" />
        <circle cx="435.5" cy="173.5" r="1.2" strokeWidth="1" opacity=".6" />
      </g>

      {/* odak ışıması: santral çıkışı (tek odak) */}
      <g className="parilti">
        <circle cx="433" cy="166.5" r="9" style={{ stroke: 'var(--glow)' }} strokeWidth="1.2" opacity=".45" />
        <circle cx="433" cy="166.5" r="4" style={{ stroke: 'var(--glow)' }} strokeWidth="1.4" />
        <circle cx="433" cy="166.5" r="1.5" style={{ fill: 'var(--glow)' }} stroke="none" />
        <path d="M433,155 v-4.5 M424.5,159.5 l-3.5,-3.5 M441.5,159.5 l3.5,-3.5" style={{ stroke: 'var(--glow)' }} strokeWidth="1" />
      </g>

      {/* enerji hattı: tek kesikli pirinç hat; direğin askılarına biner, kanvas içinde biter */}
      <path className="akis" d="M433,164 C 438,157 443,150.5 448.3,144.2" style={{ stroke: 'var(--accent)' }} strokeWidth="1.5" opacity=".78" />
      <path className="akis" d="M462.7,143.8 C 468,133 472,122 475,111" style={{ stroke: 'var(--accent)' }} strokeWidth="1.5" opacity=".78" />
      <circle cx="475.2" cy="110.5" r="1.1" style={{ fill: 'var(--accent)' }} stroke="none" opacity=".78" />

      {/* iletim direği — tabanı temiz seki üstünde */}
      <g strokeWidth="1.2" opacity=".72">
        <path d="M444,178 L453.5,118 M466,178 L456.5,118" />
        <path d="M452.5,117.5 h5" strokeWidth="1.1" />
        <path d="M447.5,128 h15" strokeWidth="1.1" />
        <path d="M451,128 v3 M459,128 v3" strokeWidth="1" opacity=".8" />
        <path d="M444.5,141 h21.5" strokeWidth="1.1" />
        <path d="M448.5,141 v3 M462.5,141 v3" strokeWidth="1" opacity=".8" />
        <path d="M446.4,163.5 L461.5,151.5 M463.6,163.5 L448.5,151.5" strokeWidth="1" opacity=".7" />
        <path d="M446.3,164 h17.4 M448.4,151 h13.3" strokeWidth="1" opacity=".8" />
        <path d="M439,178.5 h33" strokeWidth="1" opacity=".6" />
      </g>

      {/* sağ köşe yamacı: direğin ardından iner */}
      <g>
        <path d="M480,162 C 475,169 471,177 468.5,185 C 468,187.5 467.6,190 467.5,192" strokeWidth="1.5" opacity=".55" />
        <path d="M475,172 l-4,5 M476.5,182 l-4,5" strokeWidth="1" opacity=".38" />
        <path d="M468.5,165 l4.5,-8 4.5,8 M473,165 v3.5" strokeWidth="1" opacity=".5" />
      </g>

      {/* — yakın kıyı burnu (en ağır katman, kırıklı arazi profili) — */}
      <g>
        <path d="M0,74 C 18,76 34,80.5 47,88 C 58,94.5 66,103 71,114" strokeWidth="1.7" opacity=".8" />
        <path d="M71,114 C 75,131 79,149 81,163 C 82.8,175.5 83.5,184 83.5,192" strokeWidth="1.7" opacity=".8" />
        {/* kırık kontur tireleri (eşmerkezli bant yok) */}
        <path d="M10,112 C 22,115 32,121 41,130" strokeWidth="1" opacity=".3" />
        <path d="M4,144 C 14,148 24,156 31,166" strokeWidth="1" opacity=".24" />
        <path d="M2,170 C 8,173 14,178 19,184" strokeWidth="1" opacity=".17" />
        <path d="M30,100 C 40,105 48,112 54,121" strokeWidth="1" opacity=".26" />
        <path d="M46,138 C 54,146 60,155 64,166" strokeWidth="1" opacity=".22" />
        <path d="M26,86 l-6,7 M44,96 l-6,7 M62,112 l-6,7 M72,130 l-6,7 M78,152 l-6,7 M81,172 l-6,7" strokeWidth="1" opacity=".5" />
        <path d="M14,126 l-5,6 M36,156 l-5,6 M52,180 l-5,6" strokeWidth="1" opacity=".32" />
        <path d="M25.5,78.5 l4.5,-8 4.5,8 M30,78.5 v3.5" strokeWidth="1" opacity=".55" />
        <path d="M47.5,89.5 l4.5,-8 4.5,8 M52,89.5 v3.5" strokeWidth="1" opacity=".6" />
        <path d="M63.5,101 l4.5,-8 4.5,8 M68,101 v3.5" strokeWidth="1" opacity=".55" />
      </g>

      {/* zemin taramaları */}
      <g strokeWidth="1" opacity=".3">
        <path d="M60,193.5 l-5,5 M82,193.5 l-5,5" />
        <path d="M256,193.5 l-5,5 M278,193.5 l-5,5 M300,193.5 l-5,5" />
        <path d="M370,193.5 l-5,5 M392,193.5 l-5,5" />
        <path d="M452,193.5 l-5,5" />
      </g>

      {/* — zemin — */}
      <path d="M0,192 H480" strokeWidth="1.5" opacity=".78" />
    </svg>
  );
}
