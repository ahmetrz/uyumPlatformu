/* Enerji filosu panoraması — dashboard hero sahnesi (OZALİT çizgi-sanat).
   Tek ufukta: RES sırtı → vadideki HES kemeri → DGKÇ santral → iletim koridoru →
   şalt trafosu (tek pirinç odağı) → GES tarlası → jeotermal buhar sütunu.
   Derinlik üç kademede kurulur: uzak (op .10-.26, ince kontur), orta (.34-.52),
   yakın (.85, kalın kontur). Gök bölgesi ozalit anotasyonları taşır: ölçü
   çizgisi, kot oku, nirengi artıları, kontur bulutları, revizyon bulutu.
   Renk yalnız token'lardan gelir; durum renkleri kullanılmaz. Aksan tek ailedir:
   akan iletken gradyanı, trafo iniş hattı ve parıltı halkası hep --accent /
   --glow-a / --glow-b'den türer ve trafoda tepe yapar.
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
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <linearGradient id="panorama-aksan" gradientUnits="userSpaceOnUse" x1="640" y1="0" x2="1440" y2="0">
          <stop offset="0" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".28" />
          <stop offset=".38" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".62" />
          <stop offset=".56" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".95" />
          <stop offset=".8" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".45" />
          <stop offset="1" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="panorama-tel" gradientUnits="userSpaceOnUse" x1="640" y1="0" x2="1440" y2="0">
          <stop offset="0" style={{ color: 'var(--text-3)' }} stopColor="currentColor" stopOpacity=".5" />
          <stop offset=".8" style={{ color: 'var(--text-3)' }} stopColor="currentColor" stopOpacity=".38" />
          <stop offset="1" style={{ color: 'var(--text-3)' }} stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="panorama-tel-sol" gradientUnits="userSpaceOnUse" x1="660" y1="0" x2="440" y2="0">
          <stop offset="0" style={{ color: 'var(--text-3)' }} stopColor="currentColor" stopOpacity=".4" />
          <stop offset="1" style={{ color: 'var(--text-3)' }} stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ozalit ızgarası — token kendi alfasını taşır, iki temada da hissedilir */}
      <g style={{ stroke: 'var(--grid-line)' }} strokeWidth={0.7}>
        <path d="M0 48 H1440 M0 96 H1440 M0 144 H1440 M0 192 H1440 M0 240 H1440 M0 288 H1440" />
        <path d="M96 6 V296 M192 6 V296 M288 6 V296 M384 6 V296 M480 6 V296 M576 6 V296 M672 6 V296 M768 6 V296 M864 6 V296 M960 6 V296 M1056 6 V296 M1152 6 V296 M1248 6 V296 M1344 6 V296" />
      </g>
      <ellipse cx="920" cy="276" rx="330" ry="92" style={{ fill: 'var(--glow-b)' }} stroke="none" opacity=".7" />

      {/* gök anotasyonları: ölçü çizgisi, nirengi artıları, kontur bulutları, revizyon bulutu */}
      <g strokeWidth={0.9}>
        <g opacity=".16">
          <path d="M162 100 h16 M170 92 v16 M718 72 h16 M726 64 v16 M1238 92 h16 M1246 84 v16" />
          <circle cx="170" cy="100" r="2.6" />
          <circle cx="726" cy="72" r="2.6" />
          <circle cx="1246" cy="92" r="2.6" />
        </g>
        <g opacity=".14">
          <path d="M452 84 V66 M1010 78 V62" />
          <path d="M452 72 H1010" />
          <path d="M459 69 L452 72 L459 75 M1003 69 L1010 72 L1003 75" />
        </g>
        <path d="M500 98 C556 89 620 89 672 98" opacity=".08" />
        <path d="M236 120 C288 112 352 112 402 120" opacity=".07" />
        <path d="M1076 112 C1128 103 1194 103 1244 112" opacity=".08" />
        <path d="M1308 88 a8 8 0 0 1 16 0 a8 8 0 0 1 16 0 a8 8 0 0 1 16 0 a8 8 0 0 1 16 0 a8 8 0 0 1 16 0 a8 8 0 0 1 16 0" opacity=".11" />
        <g opacity=".1">
          <path d="M64 98 H240" />
          <path d="M64 94 v8 M108 95 v6 M152 95 v6 M196 95 v6 M240 94 v8" />
        </g>
        <path d="M146 98 l4 -7 l4 7" opacity=".14" />
      </g>

      {/* uzak sırtlar */}
      <g strokeWidth={1}>
        <path d="M0 238 C64 233 118 234 176 240" opacity=".1" />
        <path d="M0 252 C90 244 170 248 252 256 C330 263 392 268 452 273" opacity=".16" />
        <path d="M1226 258 C1290 252 1352 250 1440 255" opacity=".12" />
      </g>

      {/* sol sırt: uzak türbin dizisi + ölçüm direği */}
      <g opacity=".2" strokeWidth={1}>
        <path d="M84 256 V235" />
        <circle cx="84" cy="233" r="1.4" />
        <path d="M84 233 L86.4 222.4 M84 233 L92 239.4 M84 233 L74 236.4" />
      </g>
      <g opacity=".24" strokeWidth={1}>
        <path d="M148 258 V229" />
        <circle cx="148" cy="227" r="1.7" />
        <path d="M148 227 L152 214.5 M148 227 L158.5 233.8 M148 227 L135.4 231.6" />
      </g>
      <g opacity=".34" strokeWidth={1.1}>
        <path d="M230.9 262 L231.7 216 M233.1 262 L232.3 216" />
        <circle cx="232" cy="214" r="2.1" />
        <path d="M232 214 L237.8 198.1 M232 214 L242.9 227 M232 214 L215.3 217" />
      </g>
      <g opacity=".22" strokeWidth={1}>
        <path d="M272 266 V216 M268 216 h8" />
        <path d="M272 224 L256 266 M272 224 L288 266" />
        <path d="M266.5 240 h11 M267.5 254 h9" />
      </g>
      <g opacity=".44" strokeWidth={1.15}>
        <path d="M316.6 270 L317.6 208 M319.4 270 L318.4 208" />
        <circle cx="318" cy="205.5" r="2.5" />
        <path d="M318 205.5 L338.3 200 M318 205.5 L312.6 225.8 M318 205.5 L303.2 190.7" />
      </g>

      {/* HES: vadiye oturan kemer baraj — uzak siluet */}
      <g opacity=".26" strokeWidth={1.1}>
        <path d="M478 292 C490 276 500 259 506 240" />
        <path d="M626 292 C615 277 605 260 599 240" />
        <path d="M506 240 H599" />
        <path d="M509 246 H596" opacity=".7" />
        <path d="M512 246 C518 262 524 277 528 292" />
        <path d="M593 246 C588 262 583 277 579 292" />
        <path d="M515 258 C542 262 566 262 590 258" opacity=".65" />
        <path d="M520 272 C544 276 564 276 585 272" opacity=".6" />
        <path d="M524 284 C545 288 562 288 581 284" opacity=".5" />
        <path d="M536 247 C535 262 534 277 534 292 M553 247 C553 262 553 277 553 292 M570 247 C571 262 572 277 572 292" opacity=".4" />
        <path d="M527 240 V246 M553 240 V246 M579 240 V246" opacity=".8" />
        <path d="M545 292 v-9 h16 v9" opacity=".7" />
        <path d="M488 246 h12 M470 252 h14" opacity=".6" />
        <path d="M604 234 h12 M620 229 h10" opacity=".6" />
      </g>

      {/* GES tarlası: uzak ve orta sıralar (pilon C önlerine gelsin diye önce) */}
      <g strokeWidth={1.15}>
        <g opacity=".16">
          <path d="M1222 234 H1352 M1219 240 H1349" />
          <path d="M1222 234 L1219 240 M1248 234 L1245 240 M1274 234 L1271 240 M1300 234 L1297 240 M1326 234 L1323 240 M1352 234 L1349 240" />
        </g>
        <g opacity=".24">
          <path d="M1208 242 H1350 M1204 251 H1346" />
          <path d="M1208 242 L1204 251 M1226 242 L1222 251 M1244 242 L1240 251 M1262 242 L1258 251 M1280 242 L1276 251 M1298 242 L1294 251 M1316 242 L1312 251 M1334 242 L1330 251 M1350 242 L1346 251" />
        </g>
        <g opacity=".36">
          <path d="M1192 254 H1348 M1186 268 H1342" />
          <path d="M1192 254 L1186 268 M1210 254 L1204 268 M1228 254 L1222 268 M1246 254 L1240 268 M1264 254 L1258 268 M1282 254 L1276 268 M1300 254 L1294 268 M1318 254 L1312 268 M1336 254 L1330 268 M1348 254 L1342 268" />
        </g>
        <path d="M1354 240 h12 M1352 251 h14 M1350 262 h16" opacity=".1" />
      </g>

      {/* pilon C: ufka doğru sönümlenen hat direği */}
      <g opacity=".26" strokeWidth={1.05}>
        <path d="M1289 292 L1300 192 M1321 292 L1310 192" />
        <path d="M1300 192 L1303 150 M1310 192 L1307 150 M1303 150 L1305 143 L1307 150" />
        <path d="M1291 274 L1319 258 M1319 274 L1291 258 M1294 250 L1316 238 M1316 250 L1294 238 M1296 226 L1314 216 M1314 226 L1296 216" />
        <path d="M1285 160 H1325 M1285 160 V166 M1325 160 V166" />
      </g>

      {/* DGKÇ: hiperboloit kule + türbin salonu + baca */}
      <g opacity=".52" strokeWidth={1.3}>
        <path d="M712 292 C723 257 735 226 738 200 C741 174 738 147 732 122" />
        <path d="M844 292 C833 257 821 226 818 200 C815 174 818 147 824 122" />
        <path d="M732 122 Q778 112 824 122" />
        <path d="M734 128 Q778 119 822 128" opacity=".55" />
        <path d="M736 150 Q778 157 820 150" opacity=".45" />
        <path d="M738 199 Q778 207 818 199" opacity=".45" />
        <path d="M724 254 Q778 263 832 254" opacity=".45" />
        <path d="M718 276 Q778 286 838 276" opacity=".35" />
        <path d="M828 292 V226 H952 V292" />
        <path d="M846 226 V214 H918 V226" />
        <path d="M854 214 V220 M868 214 V220 M882 214 V220 M896 214 V220 M910 214 V220" opacity=".55" />
        <path d="M898 226 V202 H924 V226" />
        <path d="M902 210 H920 M902 218 H920" opacity=".6" />
        <path d="M926 226 V120 M938 226 V120 M923 120 H941" />
        <path d="M926 152 H938 M926 186 H938" opacity=".6" />
        <path d="M836 252 H944" opacity=".4" strokeDasharray="9 7" />
        <path d="M860 226 V292 M888 226 V292 M916 226 V292" opacity=".25" />
        <path d="M868 292 V272 H884 V292" opacity=".75" />
      </g>
      {/* kot ölçü çizgisi */}
      <g opacity=".15" strokeWidth={0.9}>
        <path d="M696 288 V126" />
        <path d="M692 126 h8 M692 288 h8" />
        <path d="M693.5 133 L696 126 L698.5 133 M693.5 281 L696 288 L698.5 281" />
        <path d="M702 122 l4 -6 l4 6" />
      </g>
      {/* katmanlı buhar kıvrımları */}
      <path d="M742 116 C731 98 745 88 738 70 C734 62 742 58 740 56" opacity=".26" />
      <path d="M778 112 C772 93 786 85 781 66" opacity=".21" />
      <path d="M814 116 C823 99 810 90 819 73 C824 64 816 60 820 56" opacity=".16" />
      <path d="M752 96 C768 87 792 87 806 96" opacity=".12" />
      <path d="M760 104 C752 88 764 80 757 64" opacity=".16" />
      <path d="M797 102 C805 88 795 80 803 64" opacity=".13" />
      <path d="M746 66 C762 58 786 57 800 64" opacity=".1" />
      <path d="M932 116 C927 103 936 96 931 84 C928 76 934 72 932 66" opacity=".15" />
      <path d="M940 112 C944 100 937 94 942 82" opacity=".11" />

      {/* jeotermal: buhar sütunu + kuyu başı + boru */}
      <path d="M1372 252 C1361 226 1377 210 1368 186 C1361 166 1375 152 1367 130 C1362 112 1373 102 1369 88" opacity=".34" />
      <path d="M1383 252 C1394 224 1378 206 1389 182 C1397 160 1383 148 1392 124 C1397 108 1387 98 1392 84" opacity=".26" />
      <path d="M1377 248 C1373 228 1382 212 1376 192 C1372 178 1379 168 1376 154" opacity=".18" />
      <path d="M1363 96 C1369 82 1385 78 1393 86" opacity=".13" />
      <path d="M1357 132 C1353 118 1361 112 1358 100" opacity=".12" />
      <g opacity=".4" strokeWidth={1.2}>
        <path d="M1377 292 V260 M1369 268 H1385 M1377 260 V254" />
        <circle cx="1377" cy="274" r="3.4" />
        <path d="M1394 292 V276 H1408" opacity=".8" />
        <path d="M1367 282 H1322 V272 H1310 V282 H1284" />
        <path d="M1334 282 V286 M1296 282 V286" opacity=".6" />
      </g>

      {/* pilon B: orta plan */}
      <g opacity=".45" strokeWidth={1.25}>
        <path d="M655 292 L669 168 M699 292 L685 168" />
        <path d="M669 168 L673 128 M685 168 L681 128 M673 128 L677 118 L681 128" />
        <path d="M657 270 L697 248 M697 270 L657 248 M661 236 L693 216 M693 236 L661 216 M664 200 L690 184 M690 200 L664 184 M670 164 L684 150 M684 164 L670 150" />
        <path d="M657 248 H697 M661 216 H693 M664 184 H690" />
        <path d="M642 148 H712 M645 148 V154 M709 148 V154" />
        <path d="M653 148 L671 162 M701 148 L683 162" opacity=".7" />
      </g>

      {/* iletkenler: sol devam soluk, koridor pirinç akışla trafoya yönelir */}
      <path d="M645 152 C585 180 520 188 462 180" stroke="url(#panorama-tel-sol)" strokeWidth={1} />
      <path d="M647 156 C592 186 528 194 470 187" stroke="url(#panorama-tel-sol)" strokeWidth={1} opacity=".8" />
      <path d="M648 150 Q812 230 974 104 M1046 104 Q1180 238 1290 158 M1320 158 Q1378 188 1436 174" stroke="url(#panorama-tel)" strokeWidth={1} />
      <path d="M706 154 Q866 242 976 134 M1044 134 Q1178 248 1292 162 M1318 162 Q1376 194 1434 180" stroke="url(#panorama-tel)" strokeWidth={1} opacity=".75" />
      <path className="akis" d="M652 152 Q814 234 973 106 L1047 106 Q1180 242 1291 159 Q1374 191 1430 177" stroke="url(#panorama-aksan)" strokeWidth={1.45} />
      <path className="akis" d="M703 156 Q864 244 977 135 L1043 135 Q1178 246 1293 161 Q1372 195 1428 182" stroke="url(#panorama-aksan)" strokeWidth={1.45} />

      {/* GES yakın sıra: ön plan katmanı */}
      <g strokeWidth={1.2} opacity=".52">
        <path d="M1170 264 H1344 M1161 287 H1336 M1344 264 L1336 287" />
        <path d="M1170 264 L1161 287 M1192 264 L1183 287 M1214 264 L1205 287 M1236 264 L1227 287 M1258 264 L1249 287 M1280 264 L1271 287 M1302 264 L1293 287 M1324 264 L1315 287" />
        <path d="M1178 287 V292 M1246 287 V292 M1314 287 V292" opacity=".75" />
      </g>
      <path d="M1136 292 L1250 246 M1246 292 L1298 248" opacity=".13" strokeWidth={1.1} />

      {/* yakın türbin: dönen rotor */}
      <g opacity=".85" strokeWidth={1.7}>
        <path d="M446 290 L450.8 158 M458 290 L453.2 158" />
        <path d="M441 290 h22" />
        <path d="M448.5 284 v6 h7 v-6" opacity=".6" />
        <path d="M449.3 244 h5.4 M450 214 h4.6 M450.6 186 h3.8" opacity=".4" />
        <rect x="441.5" y="143.5" width="21" height="13" rx="4" />
        <g className="kanat">
          <circle cx="452" cy="150" r="63" stroke="none" />
          <circle cx="452" cy="150" r="4.6" />
          <path d="M452 145 C447.5 128 447.5 110 451 93 L453 93 C456.5 110 456.5 128 452 145" />
          <path d="M452 145 C447.5 128 447.5 110 451 93 L453 93 C456.5 110 456.5 128 452 145" transform="rotate(120 452 150)" />
          <path d="M452 145 C447.5 128 447.5 110 451 93 L453 93 C456.5 110 456.5 128 452 145" transform="rotate(240 452 150)" />
        </g>
      </g>

      {/* pilon A: yakın, detaylı */}
      <g opacity=".85" strokeWidth={1.6}>
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

      {/* şalt sahası: tek parıltı odağı + trafo */}
      <circle cx="1095" cy="236" r="46" style={{ fill: 'var(--glow-b)' }} stroke="none" />
      <circle cx="1095" cy="236" r="24" style={{ fill: 'var(--glow-a)' }} stroke="none" />
      <circle className="parilti" cx="1095" cy="238" r="15" style={{ stroke: 'var(--accent)' }} strokeWidth={1} strokeDasharray="2 4" />
      <path d="M1096 172 C1093 198 1098 220 1095 240" style={{ stroke: 'var(--accent)' }} opacity=".55" strokeWidth={1.15} />
      <circle cx="1095" cy="240" r="1.8" style={{ fill: 'var(--accent)' }} stroke="none" />
      <g opacity=".85" strokeWidth={1.55}>
        <rect x="1066" y="254" width="58" height="36" rx="2" />
        <path d="M1054 260 V286 M1059 260 V286 M1064 260 V286 M1054 262 H1066 M1054 284 H1066" opacity=".7" />
        <path d="M1078 254 V240 M1095 254 V240 M1112 254 V240" />
        <path d="M1075 244 h6 M1075 248 h6 M1092 244 h6 M1092 248 h6 M1109 244 h6 M1109 248 h6" opacity=".8" />
        <circle cx="1130" cy="247" r="5" opacity=".7" />
        <path d="M1124 250 h2 M1130 252 V254" opacity=".7" />
        <path d="M1040 292 V281 M1055 292 V281 M1070 292 V281 M1085 292 V281 M1100 292 V281 M1115 292 V281 M1130 292 V281 M1145 292 V281 M1160 292 V281 M1037 281 H1163" opacity=".55" strokeWidth={1} />
      </g>
      <path d="M1032 292 V264 M1162 292 V264 M1032 266 H1162" opacity=".3" strokeWidth={1} strokeDasharray="2 5" />

      {/* servis yolu: sol ön planı türbine bağlar */}
      <g opacity=".24" strokeWidth={1.2}>
        <path d="M0 282 C150 277 300 273 440 272" />
        <path d="M0 296 C155 289 310 281 452 277" />
        <path d="M40 289 l30 -1.6 M120 286.5 l30 -1.4 M210 284 l30 -1.2 M310 281.6 l28 -1 M398 279.6 l26 -.8" opacity=".6" />
        <path d="M66 281 v-6 M180 278.5 v-6 M296 276 v-5 M400 274.5 v-5" opacity=".8" />
      </g>

      {/* zemin çizgisi + teknik işaretler */}
      <path d="M0 292 H1440" opacity=".6" strokeWidth={1.7} />
      <path d="M36 292 v4 M118 292 v4 M212 292 v4 M330 292 v4 M414 292 v4 M540 292 v4 M668 292 v4 M780 292 v4 M902 292 v4 M1004 292 v4 M1188 292 v4 M1276 292 v4 M1396 292 v4" opacity=".25" strokeWidth={1} />
      <g opacity=".18" strokeWidth={1}>
        <path d="M338 292 l-6 6 M352 292 l-6 6 M366 292 l-6 6 M380 292 l-6 6" />
        <path d="M950 292 l-6 6 M964 292 l-6 6 M978 292 l-6 6 M992 292 l-6 6" />
        <path d="M1220 292 l-6 6 M1234 292 l-6 6 M1248 292 l-6 6" />
      </g>
      <path d="M497 282 h8 M501 278 v8 M905 276 h8 M909 272 v8" opacity=".3" strokeWidth={1} />
    </svg>
  );
}
