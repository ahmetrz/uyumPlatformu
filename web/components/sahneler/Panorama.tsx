/* Enerji filosu panoraması — dashboard hero sahnesi (OZALİT çizgi-sanat).
   Tek ufukta: RES sırtı → uzak HES barajı → DGKÇ santral → iletim koridoru →
   şalt trafosu (tek parıltı odağı) → GES tarlası → jeotermal buhar sütunu.
   Renk yalnız token'lardan gelir; durum renkleri kullanılmaz.
   Animasyon sınıfları ürün globals.css'inde tanımlıdır: akis / parilti / kanat. */

export function Panorama({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 300"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      className={className}
      style={{ color: 'var(--text-2)' }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <radialGradient id="panorama-gok">
          <stop offset="0" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".12" />
          <stop offset=".55" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".05" />
          <stop offset="1" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="panorama-odak">
          <stop offset="0" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".6" />
          <stop offset=".45" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".2" />
          <stop offset="1" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="panorama-tel" gradientUnits="userSpaceOnUse" x1="430" y1="0" x2="1440" y2="0">
          <stop offset="0" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity="0" />
          <stop offset=".11" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".9" />
          <stop offset="1" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".72" />
        </linearGradient>
        <linearGradient id="panorama-tel2" gradientUnits="userSpaceOnUse" x1="430" y1="0" x2="1440" y2="0">
          <stop offset="0" style={{ color: 'var(--text-3)' }} stopColor="currentColor" stopOpacity="0" />
          <stop offset=".12" style={{ color: 'var(--text-3)' }} stopColor="currentColor" stopOpacity=".5" />
          <stop offset="1" style={{ color: 'var(--text-3)' }} stopColor="currentColor" stopOpacity=".4" />
        </linearGradient>
      </defs>

      {/* ambient ızgara */}
      <g opacity=".05" strokeWidth={1}>
        <path d="M0 40 H1440 M0 88 H1440 M0 136 H1440 M0 184 H1440 M0 232 H1440 M0 280 H1440" />
        <path d="M96 12 V292 M192 12 V292 M288 12 V292 M384 12 V292 M480 12 V292 M576 12 V292 M672 12 V292 M768 12 V292 M864 12 V292 M960 12 V292 M1056 12 V292 M1152 12 V292 M1248 12 V292 M1344 12 V292" />
      </g>
      <ellipse cx="940" cy="268" rx="430" ry="120" fill="url(#panorama-gok)" stroke="none" />

      {/* uzak sırtlar */}
      <g opacity=".1" strokeWidth={1.1}>
        <path d="M0 246 C80 240 150 244 210 250 C260 254 300 258 330 262" />
        <path d="M1240 252 C1290 246 1330 244 1370 246 C1400 247 1420 250 1440 252" />
      </g>

      {/* HES barajı — uzak siluet */}
      <g opacity=".18" strokeWidth={1.1}>
        <path d="M486 240 H590" />
        <path d="M486 240 C475 258 462 276 452 292" />
        <path d="M590 240 C598 258 606 276 613 292" />
        <path d="M482 252 C520 256 556 256 594 252" opacity=".6" />
        <path d="M472 268 C518 272 560 272 604 268" opacity=".6" />
        <path d="M460 284 C518 288 562 288 610 284" opacity=".5" />
        <path d="M512 240 V249 M536 240 V249 M560 240 V249" opacity=".8" />
        <path d="M524 249 C523 264 522 278 521 292 M548 249 C549 264 550 278 551 292" opacity=".55" />
        <path d="M444 292 V252 h10" opacity=".8" />
        <path d="M404 248 h26 M432 243 h14" opacity=".7" />
      </g>

      {/* DGKÇ: hiperboloit soğutma kulesi + türbin salonu + HRSG + baca */}
      <g opacity=".38">
        <path d="M718 292 C728 258 740 228 743 202 C746 176 743 148 737 124" />
        <path d="M846 292 C836 258 824 228 821 202 C818 176 821 148 827 124" />
        <path d="M737 124 Q782 114 827 124" />
        <path d="M739 129 Q782 120 825 129" opacity=".5" />
        <path d="M741 150 Q782 157 823 150" opacity=".45" />
        <path d="M743 201 Q782 209 821 201" opacity=".45" />
        <path d="M729 252 Q782 261 835 252" opacity=".45" />
        <path d="M830 292 V228 H950 V292" />
        <path d="M848 228 V216 H916 V228" />
        <path d="M856 216 V222 M872 216 V222 M888 216 V222 M904 216 V222" opacity=".5" />
        <path d="M896 228 V204 H922 V228" />
        <path d="M900 212 H918 M900 220 H918" opacity=".6" />
        <path d="M922 228 V130 M934 228 V130 M919 130 H937" />
        <path d="M922 158 H934 M922 190 H934" opacity=".6" />
        <path d="M838 252 H942" opacity=".35" strokeDasharray="9 7" />
        <path d="M862 228 V292 M890 228 V292" opacity=".25" />
        <path d="M872 292 V274 H886 V292" opacity=".7" />
      </g>
      {/* katmanlı buhar kıvrımları */}
      <path d="M746 116 C736 98 748 90 742 74 C738 62 748 58 746 50" opacity=".16" />
      <path d="M782 112 C777 94 791 88 787 70 C784 58 793 54 791 46" opacity=".12" />
      <path d="M818 116 C826 100 814 92 822 76 C827 64 818 60 822 52" opacity=".09" />
      <path d="M756 100 C770 92 794 92 808 100" opacity=".07" />
      <path d="M762 106 C754 90 766 82 760 66" opacity=".1" />
      <path d="M800 104 C808 90 798 82 806 66" opacity=".08" />
      <path d="M928 124 C924 112 933 106 929 94" opacity=".1" />

      {/* GES tarlası — ufka kaçan sıralar */}
      <g strokeWidth={1.2}>
        <g opacity=".13">
          <path d="M1228 234 H1360 M1225 240 H1357" />
          <path d="M1228 234 L1225 240 M1256 234 L1253 240 M1284 234 L1281 240 M1312 234 L1309 240 M1340 234 L1337 240" />
        </g>
        <g opacity=".2">
          <path d="M1214 241 H1356 M1210 250 H1352" />
          <path d="M1214 241 L1211 250 M1230 241 L1227 250 M1246 241 L1243 250 M1262 241 L1259 250 M1278 241 L1275 250 M1294 241 L1291 250 M1310 241 L1307 250 M1326 241 L1323 250 M1342 241 L1339 250" />
        </g>
        <g opacity=".32">
          <path d="M1198 252 H1352 M1192 266 H1348" />
          <path d="M1198 252 L1193 266 M1216 252 L1211 266 M1234 252 L1229 266 M1252 252 L1247 266 M1270 252 L1265 266 M1288 252 L1283 266 M1306 252 L1301 266 M1324 252 L1319 266 M1342 252 L1337 266" />
        </g>
        <g opacity=".5">
          <path d="M1178 262 H1350 M1170 284 H1345 M1350 262 L1345 284" />
          <path d="M1178 262 L1170 284 M1200 262 L1192 284 M1222 262 L1214 284 M1244 262 L1236 284 M1266 262 L1258 284 M1288 262 L1280 284 M1310 262 L1302 284 M1332 262 L1324 284" />
          <path d="M1186 284 V292 M1252 284 V292 M1318 284 V292" opacity=".7" />
        </g>
        <path d="M1150 292 L1268 246 M1258 292 L1305 248" opacity=".12" />
      </g>

      {/* jeotermal: buhar sütunu + kuyu başı + boru */}
      <path d="M1402 250 C1390 224 1407 208 1397 184 C1390 164 1405 150 1397 128 C1392 110 1404 98 1399 82" opacity=".32" />
      <path d="M1414 250 C1426 222 1409 204 1421 180 C1430 158 1415 146 1425 122 C1430 106 1419 96 1425 80" opacity=".24" />
      <path d="M1408 246 C1403 226 1413 210 1407 190 C1403 176 1411 166 1408 152" opacity=".16" />
      <path d="M1394 88 C1400 72 1418 68 1426 78" opacity=".12" />
      <path d="M1388 128 C1384 114 1392 108 1389 96" opacity=".11" />
      <g opacity=".45" strokeWidth={1.2}>
        <path d="M1408 292 V258 M1400 266 H1416 M1408 258 V252" />
        <circle cx="1408" cy="271" r="3.4" />
        <path d="M1426 292 V274 H1440" />
        <path d="M1398 280 H1352 V270 H1340 V280 H1310" />
        <path d="M1364 280 V284 M1326 280 V284" opacity=".6" />
      </g>

      {/* pilon C (uzak) */}
      <g opacity=".28" strokeWidth={1.1}>
        <path d="M1289 292 L1300 190 M1321 292 L1310 190" />
        <path d="M1300 190 L1303 148 M1310 190 L1307 148 M1303 148 L1305 142 L1307 148" />
        <path d="M1291 274 L1319 258 M1319 274 L1291 258 M1294 250 L1316 238 M1316 250 L1294 238" />
        <path d="M1285 158 H1325 M1285 158 V164 M1325 158 V164" />
      </g>
      {/* pilon B (orta) */}
      <g opacity=".45" strokeWidth={1.2}>
        <path d="M628 292 L642 165 M672 292 L658 165" />
        <path d="M642 165 L646 126 M658 165 L654 126 M646 126 L650 116 L654 126" />
        <path d="M630 270 L670 248 M670 270 L630 248 M634 236 L666 216 M666 236 L634 216 M637 200 L663 184 M663 200 L637 184 M643 162 L657 148 M657 162 L643 148" />
        <path d="M630 248 H670 M634 216 H666 M637 184 H663" />
        <path d="M615 146 H685 M618 146 V152 M682 146 V152" />
        <path d="M626 146 L644 160 M674 146 L656 160" opacity=".7" />
      </g>

      {/* catenary iletkenler — enerji akışı */}
      <path d="M430 172 Q510 196 650 124 Q815 212 1010 74 Q1158 230 1305 146 Q1372 172 1440 138" stroke="url(#panorama-tel2)" strokeWidth={1} />
      <path d="M430 208 Q515 232 682 160 Q862 251 1045 150 Q1185 265 1325 172 Q1382 198 1440 160" stroke="url(#panorama-tel2)" strokeWidth={1} opacity=".7" />
      <path className="akis" d="M430 188 Q515 214 618 152 Q790 240 965 112 Q1125 240 1285 164 Q1362 190 1440 150" stroke="url(#panorama-tel)" strokeWidth={1.4} />
      <path className="akis" d="M430 200 Q515 226 682 152 Q862 243 1045 142 Q1185 257 1325 164 Q1382 190 1440 152" stroke="url(#panorama-tel)" strokeWidth={1.4} />

      {/* pilon A (yakın, detaylı) */}
      <g opacity=".75" strokeWidth={1.5}>
        <path d="M978 292 L1000 150 M1042 292 L1020 150" />
        <path d="M1000 150 L1005 80 M1020 150 L1015 80 M1005 80 L1010 68 L1015 80" />
        <path d="M981 270 L1034 240 M1039 270 L986 240 M986 240 L1029 210 M1034 240 L991 210 M991 210 L1025 180 M1029 210 L995 180 M995 180 L1020 150 M1025 180 L1000 150" />
        <path d="M986 240 H1034 M991 210 H1029 M995 180 H1025 M1000 150 H1020" />
        <path d="M1000 150 L1018 125 M1020 150 L1002 125 M1002 125 H1018 M1002 125 L1016 100 M1018 125 L1004 100" />
        <path d="M965 100 H1055 M975 130 H1045" />
        <path d="M965 100 L1004 117 M1055 100 L1016 117 M975 130 L1001 146 M1045 130 L1019 146" opacity=".8" />
        <path d="M965 100 V112 M962 104 h6 M962 108 h6 M1055 100 V112 M1052 104 h6 M1052 108 h6" />
        <path d="M975 130 V142 M972 134 h6 M972 138 h6 M1045 130 V142 M1042 134 h6 M1042 138 h6" />
        <path d="M974 292 h8 M1038 292 h8" opacity=".7" />
      </g>

      {/* şalt sahası: trafo + tek parıltı odağı */}
      <circle className="parilti" cx="1095" cy="232" r="34" fill="url(#panorama-odak)" stroke="none" />
      <g opacity=".8" strokeWidth={1.5}>
        <rect x="1066" y="254" width="58" height="36" rx="2" />
        <path d="M1054 260 V286 M1059 260 V286 M1064 260 V286 M1054 262 H1066 M1054 284 H1066" opacity=".7" />
        <path d="M1078 254 V240 M1095 254 V240 M1112 254 V240" />
        <path d="M1075 244 h6 M1075 248 h6 M1092 244 h6 M1092 248 h6 M1109 244 h6 M1109 248 h6" opacity=".8" />
        <circle cx="1130" cy="247" r="5" opacity=".7" />
        <path d="M1124 250 h2 M1130 252 V254" opacity=".7" />
        <path d="M1040 292 V281 M1055 292 V281 M1070 292 V281 M1085 292 V281 M1100 292 V281 M1115 292 V281 M1130 292 V281 M1145 292 V281 M1160 292 V281 M1037 281 H1163" opacity=".55" strokeWidth={1} />
      </g>
      <path d="M1097 186 C1095 205 1099 221 1097 238" style={{ stroke: 'var(--accent)' }} opacity=".55" strokeWidth={1.2} />
      <circle cx="1095" cy="240" r="1.8" fill="currentColor" style={{ color: 'var(--accent)' }} stroke="none" opacity=".9" />

      {/* sırt hattı + rüzgâr türbinleri */}
      <path d="M0 262 C90 252 170 258 260 266 C330 272 390 279 452 284 C505 288 545 291 585 292" opacity=".2" />
      <g opacity=".09" strokeWidth={1}>
        <path d="M84 254 V234" />
        <circle cx="84" cy="232.6" r="1.3" />
        <path d="M86 222.8 L84 232.6 L92 240 M84 232.6 L74.4 236" />
      </g>
      <g opacity=".15" strokeWidth={1}>
        <path d="M150 258 V231" />
        <circle cx="150" cy="229" r="1.6" />
        <path d="M153.6 216.5 L150 229 L159.9 239.9 M150 229 L136.5 233.6" />
      </g>
      <g opacity=".22" strokeWidth={1.1}>
        <path d="M234.5 268 L235.6 220 M237.5 268 L236.4 220" />
        <circle cx="236" cy="218" r="2" />
        <path d="M255.7 214.5 L236 218 L229.2 236.8 M236 218 L223.1 202.7" />
      </g>
      <g opacity=".3" strokeWidth={1.2}>
        <path d="M319 276 L321.3 212 M325 276 L322.7 212" />
        <circle cx="322" cy="208" r="2.4" />
        <path d="M341.9 191.3 L322 208 L326.5 233.6 M322 208 L297.6 199.1" />
      </g>
      {/* yakın türbin — dönen rotor */}
      <g opacity=".8" strokeWidth={1.6}>
        <path d="M447 290 L451 158 M459 290 L455 158" />
        <path d="M443 290 h20" />
        <path d="M449 284 v6 h5 v-6" opacity=".6" />
        <path d="M449.6 240 h7 M450.4 212 h6.4" opacity=".4" />
        <rect x="442" y="144" width="20" height="12" rx="4" />
        <g className="kanat">
          <circle cx="452" cy="150" r="62" stroke="none" />
          <circle cx="452" cy="150" r="4.5" />
          <path d="M452 145 C447.5 128 447.5 110 451 93 L453 93 C456.5 110 456.5 128 452 145" />
          <path d="M452 145 C447.5 128 447.5 110 451 93 L453 93 C456.5 110 456.5 128 452 145" transform="rotate(120 452 150)" />
          <path d="M452 145 C447.5 128 447.5 110 451 93 L453 93 C456.5 110 456.5 128 452 145" transform="rotate(240 452 150)" />
        </g>
      </g>

      {/* zemin çizgisi + teknik işaretler */}
      <path d="M0 292 H1440" opacity=".55" strokeWidth={1.6} />
      <path d="M36 292 v4 M118 292 v4 M212 292 v4 M330 292 v4 M414 292 v4 M540 292 v4 M668 292 v4 M780 292 v4 M902 292 v4 M1004 292 v4 M1188 292 v4 M1276 292 v4 M1396 292 v4" opacity=".25" strokeWidth={1} />
      <path d="M64 286 h28 M128 288 h20 M676 288 h24 M708 286 h14" opacity=".14" strokeWidth={1} />
      <path d="M497 282 h8 M501 278 v8 M949 276 h8 M953 272 v8" opacity=".3" strokeWidth={1} />
    </svg>
  );
}
