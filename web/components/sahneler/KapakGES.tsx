/* GES kapak sahnesi — "Zorlu Uyum Konsolu" ozalit çizgi sanatı (onarım turu).
   Tek kaçış noktasına (292,84) yakınsayan beş panel sırası; derinlik hiyerarşisi
   önden arkaya: en yakın sıra en ağır çizgi + odak ışıması, uzak sıralar soluk.
   Tek pirinç aksan zinciri: parlayan hücre -> arazi kablosu -> inverter -> trafo
   -> ufuktaki pilon. Işıma halkaları tema-ayarlı token dolgularıyla (--glow-a/b),
   gök bandı ozalit imzalarıyla (ızgara, ölçü çizgisi, kayıt işaretleri) dolu ama
   sakin: üst ~%20 rozet/pill bindirmesine uygun. Renk yalnız CSS token'ı. */

export function KapakGES({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 200"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: 'var(--text-2)' }}
    >
      <defs>
      <linearGradient id="kapak-ges-parlak" gradientUnits="userSpaceOnUse" x1="130" y1="121" x2="156" y2="137">
      <stop offset="0" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity="0.32" />
      <stop offset="1" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity="0.04" />
      </linearGradient>
      </defs>

      {/* OZALİT ZEMİNİ: gök ızgarası + zemin yıkaması */}
      <g style={{ stroke: 'var(--grid-line)' }} strokeWidth="0.75">
      <path d="M24 4 V84 M56 4 V84 M88 4 V84 M120 4 V84 M152 4 V84 M184 4 V84 M216 4 V84 M248 4 V84 M280 4 V84 M312 4 V84 M344 4 V84 M376 4 V84 M408 4 V84 M440 4 V84 M472 4 V84" />
      <path d="M0 28 H480 M0 56 H480" />
      </g>
      <path d="M0 84 H480 V200 H0 Z" fill="currentColor" stroke="none" opacity="0.035" />

      {/* Teknik çizim imzaları: kayıt işaretleri + ölçü çizgileri */}
      <g opacity="0.2" strokeWidth="0.7">
      <circle cx="18" cy="14" r="3.2" />
      <path d="M12 14 H24 M18 8 V20" />
      <circle cx="462" cy="14" r="3.2" />
      <path d="M456 14 H468 M462 8 V20" />
      </g>
      <g opacity="0.22" strokeWidth="0.8">
      <path d="M40 22 H206" />
      <path d="M40 18.5 V25.5 M206 18.5 V25.5" />
      <path d="M37.5 24.5 L42.5 19.5 M203.5 24.5 L208.5 19.5" />
      <path d="M123 20 V24" opacity="0.6" />
      </g>
      <g opacity="0.2" strokeWidth="0.75">
      <path d="M471 112 V194" />
      <path d="M468 112 H474 M468 194 H474" />
      <path d="M469 114 L473 110 M469 196 L473 192" />
      </g>

      {/* Gök: bulut taramaları + güneş */}
      <g strokeWidth="0.9" strokeDasharray="1.5 4.5">
      <path d="M120 34 h34" opacity="0.13" />
      <path d="M138 40 h24" opacity="0.1" />
      <path d="M234 27 h38" opacity="0.11" />
      <path d="M448 64 h20" opacity="0.1" />
      </g>
      <g opacity="0.34" strokeWidth="0.95">
      <circle cx="398" cy="40" r="13" />
      <circle cx="398" cy="40" r="19" strokeDasharray="2 5" opacity="0.4" strokeWidth="0.7" />
      <path d="M415 40 L420 40 M381 40 L376 40 M398 23 L398 18 M398 57 L398 62" opacity="0.8" strokeWidth="0.85" />
      <path d="M410 28 L413.6 24.4 M386 28 L382.4 24.4 M410 52 L413.6 55.6 M386 52 L382.4 55.6" opacity="0.8" strokeWidth="0.85" />
      </g>

      {/* Ufuk */}
      <path d="M0 84 H480" opacity="0.2" strokeWidth="0.8" />
      <path d="M6 77.5 H96" strokeDasharray="10 8" opacity="0.08" strokeWidth="0.75" />
      <path d="M118 80.5 H188" strokeDasharray="7 6" opacity="0.07" strokeWidth="0.75" />

      {/* İletim pilonu (ufukta) */}
      <g opacity="0.24" strokeWidth="0.85">
      <path d="M322 82 L328 50 M338 82 L332 50" />
      <path d="M322 82 L335.8 70 M338 82 L324.2 70" opacity="0.8" />
      <path d="M324.2 70 L333.9 60 M335.8 70 L326.1 60" opacity="0.8" />
      <path d="M326.1 60 L332 50 M333.9 60 L328 50" opacity="0.8" />
      <path d="M320 54 H340 M317 60.5 H343" />
      <path d="M320 54 v2.6 M340 54 v2.6 M317 60.5 v2.6 M343 60.5 v2.6" opacity="0.8" />
      <path d="M328 50 L330 44.5 L332 50" />
      </g>

      {/* Uzak çit / arka dizi */}
      <g strokeWidth="0.7">
      <path d="M354 79 H472" strokeDasharray="6 3.5" opacity="0.13" />
      <path d="M362 81.5 H476" strokeDasharray="4 3" opacity="0.1" />
      </g>

      {/* PANEL SIRALARI: uzak -> yakın */}
      <g opacity="0.16">
      <path d="M150 91.5 L272.1 85.1 L272.1 86 L150 94.7 Z" fill="currentColor" stroke="none" opacity="0.03" />
      <path d="M150 91.5 L272.1 85.1" strokeWidth="0.8" />
      <path d="M150 94.7 L272.1 86" strokeWidth="0.8" />
      <path d="M150 91.5 L150 94.7" strokeWidth="0.8" />
      <path d="M272.1 85.1 L272.1 86" strokeWidth="0.6" opacity="0.85" />
      <path d="M177.7 90 L177.7 92.7 M201 88.8 L201 91 M220.6 87.8 L220.6 89.6 M237 86.9 L237 88.5 M250.8 86.2 L250.8 87.5 M262.4 85.6 L262.4 86.6" strokeWidth="0.6" opacity="0.8" />
      </g>
      <g opacity="0.21">
      <path d="M104 97.5 L268.5 85.7 L268.5 86.9 L104 103 Z" fill="currentColor" stroke="none" opacity="0.04" />
      <path d="M104 97.5 L268.5 85.7" strokeWidth="0.85" />
      <path d="M104 103 L268.5 86.9" strokeWidth="0.85" />
      <path d="M104 97.5 L104 103" strokeWidth="0.85" />
      <path d="M268.5 85.7 L268.5 86.9" strokeWidth="0.7" opacity="0.85" />
      <path d="M140.1 94.9 L140.1 99.5 M170.1 92.8 L170.1 96.5 M194.9 91 L194.9 94.1 M215.6 89.5 L215.6 92.1 M232.7 88.3 L232.7 90.4 M246.9 87.2 L246.9 89 M258.7 86.4 L258.7 87.8" strokeWidth="0.6" opacity="0.8" />
      </g>
      <g opacity="0.3">
      <path d="M54 106.5 L263.4 86.7 L263.4 88.3 L54 115.5 Z" fill="currentColor" stroke="none" opacity="0.05" />
      <path d="M54 106.5 L263.4 86.7" strokeWidth="0.95" />
      <path d="M54 115.5 L263.4 88.3" strokeWidth="0.95" />
      <path d="M54 106.5 L54 115.5" strokeWidth="0.95" />
      <path d="M263.4 86.7 L263.4 88.3" strokeWidth="0.8" opacity="0.85" />
      <path d="M99.3 102.2 L99.3 109.6 M136.4 98.7 L136.4 104.8 M166.9 95.8 L166.9 100.8 M191.9 93.5 L191.9 97.6 M212.3 91.5 L212.3 94.9 M229.1 89.9 L229.1 92.8 M242.9 88.6 L242.9 91 M254.2 87.6 L254.2 89.5" strokeWidth="0.7" opacity="0.8" />
      <path d="M99.3 109.6 L99.3 113.8 M166.9 100.8 L166.9 103.9 M212.3 94.9 L212.3 97.2" strokeWidth="0.7" opacity="0.75" />
      </g>
      <g opacity="0.46">
      <path d="M2 123 L258.7 88.5 L258.7 90.7 L2 138 Z" fill="currentColor" stroke="none" opacity="0.05" />
      <path d="M2 123 L258.7 88.5" strokeWidth="1.05" />
      <path d="M2 138 L258.7 90.7" strokeWidth="1.05" />
      <path d="M2 123 L2 138" strokeWidth="1.05" />
      <path d="M258.7 88.5 L258.7 90.7" strokeWidth="0.8" opacity="0.85" />
      <path d="M57.5 115.5 L57.5 127.8 M102.5 109.5 L102.5 119.5 M138.9 104.6 L138.9 112.8 M168.4 100.6 L168.4 107.3 M192.3 97.4 L192.3 102.9 M211.7 94.8 L211.7 99.3 M227.3 92.7 L227.3 96.5 M240 91 L240 94.1 M250.3 89.6 L250.3 92.2" strokeWidth="0.8" opacity="0.8" />
      <path d="M2 130.5 L258.7 89.6" strokeWidth="0.6" opacity="0.55" />
      <path d="M57.5 127.8 L57.5 134.5 M138.9 112.8 L138.9 117.7 M192.3 102.9 L192.3 106.6 M227.3 96.5 L227.3 99.4" strokeWidth="0.8" opacity="0.75" />
      </g>
      <g opacity="0.8">
      <path d="M-14 163 L252.2 94.3 L252.2 98.1 L-14 193 Z" fill="currentColor" stroke="none" opacity="0.06" />
      <path d="M-14 163 L252.2 94.3" strokeWidth="1.35" />
      <path d="M-14 193 L252.2 98.1" strokeWidth="1.35" />
      <path d="M-14 163 L-14 193" strokeWidth="1.35" />
      <path d="M252.2 94.3 L252.2 98.1" strokeWidth="1.1" opacity="0.85" />
      <path d="M44.2 148 L44.2 172.2 M90.8 135.9 L90.8 155.6 M128.1 126.3 L128.1 142.3 M157.9 118.6 L157.9 131.7 M181.8 112.4 L181.8 123.2 M200.9 107.5 L200.9 116.4 M216.2 103.6 L216.2 110.9 M228.4 100.4 L228.4 106.6 M238.1 97.9 L238.1 103.1 M246 95.9 L246 100.3" strokeWidth="1" opacity="0.8" />
      <path d="M-14 173.8 L252.2 95.6" strokeWidth="0.8" opacity="0.55" />
      <path d="M-14 183.4 L252.2 96.9" strokeWidth="0.8" opacity="0.55" />
      <path d="M44.2 172.2 L44.2 184.9 M90.8 155.6 L90.8 166.4 M157.9 131.7 L157.9 139.7 M200.9 116.4 L200.9 122.7 M228.4 106.6 L228.4 111.7" strokeWidth="1.1" opacity="0.75" />
      </g>

      {/* Servis yolu: aynı kaçış noktasına */}
      <g opacity="0.32">
      <path d="M262 197 L289.9 92" strokeWidth="0.9" />
      <path d="M340 197 L295.3 92" strokeWidth="0.9" />
      <path d="M301 197 L294.8 104" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.5" />
      <path d="M264.4 188 h7 M336.2 188 h-7" strokeWidth="0.7" opacity="0.55" />
      <path d="M268.6 172 h6 M329.4 172 h-6" strokeWidth="0.7" opacity="0.55" />
      <path d="M273.2 155 h5 M322.2 155 h-5" strokeWidth="0.7" opacity="0.55" />
      </g>

      {/* Ön plan arazi dokusu */}
      <g strokeWidth="0.8">
      <path d="M56 190 h5 M116 189 h6 M170 190.5 h5 M204 193 h6 M226 191 h5 M356 194 h5" opacity="0.2" />
      <circle cx="146" cy="192.6" r="0.9" opacity="0.2" />
      <circle cx="246" cy="193.4" r="0.9" opacity="0.18" />
      </g>

      {/* İnverter kabini */}
      <g opacity="0.75" strokeWidth="1.05">
      <path d="M352 138 L344 129.7 L344 170.6 L352 186 Z" />
      <path d="M352 138 H390 L382 133.1 L344 129.7" opacity="0.9" />
      <rect x="352" y="138" width="38" height="48" />
      <path d="M371 141 V183" opacity="0.55" />
      <path d="M356 147 h11 M356 151 h11 M356 155 h11 M356 159 h11" opacity="0.5" strokeWidth="0.8" />
      <rect x="375" y="144" width="10" height="6" opacity="0.75" strokeWidth="0.8" />
      <path d="M368.6 161 v6 M373.4 161 v6" opacity="0.7" strokeWidth="0.9" />
      <path d="M375 172 h11 M375 175.5 h11 M375 179 h11" opacity="0.5" strokeWidth="0.8" />
      <path d="M352 181 H390" opacity="0.4" strokeWidth="0.8" />
      <path d="M350 186 H392" strokeWidth="1.15" />
      </g>

      {/* Trafo + portal */}
      <g opacity="0.8" strokeWidth="1.05">
      <path d="M410 144 L401 139 L401 181.3 L410 190 Z" />
      <path d="M410 144 H464 L455 140.6 L401 139" opacity="0.9" />
      <rect x="410" y="144" width="54" height="46" />
      <path d="M414 150 V184 M417.1 150 V184 M420.2 150 V184 M423.3 150 V184 M426.4 150 V184" opacity="0.5" strokeWidth="0.75" />
      <path d="M433 147 V187" opacity="0.55" strokeWidth="0.8" />
      <rect x="441" y="157" width="14" height="9" opacity="0.6" strokeWidth="0.8" />
      <path d="M458 184 h4 v3" opacity="0.5" strokeWidth="0.8" />
      <path d="M422 144 V120 M436 144 V120 M450 144 V120" strokeWidth="0.95" />
      <path d="M418.5 138 h7 M418.5 133 h7 M418.5 128 h7" opacity="0.7" strokeWidth="0.8" />
      <path d="M432.5 138 h7 M432.5 133 h7 M432.5 128 h7" opacity="0.7" strokeWidth="0.8" />
      <path d="M446.5 138 h7 M446.5 133 h7 M446.5 128 h7" opacity="0.7" strokeWidth="0.8" />
      <circle cx="422" cy="118" r="1.4" />
      <circle cx="436" cy="118" r="1.4" />
      <circle cx="450" cy="118" r="1.4" />
      <path d="M408 190 H466" strokeWidth="1.15" />
      <path d="M413 190 v4 M461 190 v4" opacity="0.6" />
      </g>
      <g opacity="0.18" strokeWidth="0.8">
      <path d="M354 189.5 l6 2.6 M363 190 l6 2.6 M372 190.5 l6 2.6" />
      <path d="M412 193 l7 2.6 M424 193.5 l7 2.6 M436 194 l7 2.6 M448 194 l7 2.6" />
      </g>

      {/* TEK AKSAN ZİNCİRİ: panel -> kablo -> inverter -> trafo -> pilon */}
      <path d="M157.9 139.5 L158 141 C 178 150, 198 159, 216 166 C 244 172, 272 175.5, 300 178 C 318 179.6, 333 181, 347 182" className="akis" style={{ stroke: 'var(--accent)' }} opacity="0.42" strokeWidth="1.05" />
      <path d="M216 166 v3 M300 178 v3" opacity="0.3" strokeWidth="0.8" />
      <path d="M390 181 C 394 184.5, 397 184.5, 401 181" style={{ stroke: 'var(--accent)' }} opacity="0.45" strokeWidth="1" />
      <path d="M436 116 C 408 96, 374 78, 342 63" className="akis" style={{ stroke: 'var(--accent)' }} opacity="0.38" strokeWidth="1" />

      {/* ODAK: parlayan hücre (E sırası, f3-f4) */}
      <g className="parilti">
      <circle cx="143" cy="129.5" r="26" fill="var(--glow-b)" stroke="none" />
      <circle cx="143" cy="129.5" r="14" fill="var(--glow-a)" stroke="none" />
      <path d="M147 115 V123 M147 127.5 V135.5 M138.5 125.2 L145 125.2 M149 125.2 L155.5 125.2" style={{ stroke: 'var(--glow)' }} opacity="0.85" strokeWidth="0.9" />
      </g>
      <path d="M128.1 126.3 L157.9 118.6 L157.9 131.7 L128.1 142.3 Z" fill="url(#kapak-ges-parlak)" stroke="none" />
      <path d="M128.1 126.3 L157.9 118.6 L157.9 131.7 L128.1 142.3 Z" style={{ stroke: 'var(--glow)' }} opacity="0.8" strokeWidth="1.1" />
      <path d="M134 134.5 L152 127" style={{ stroke: 'var(--glow)' }} opacity="0.9" strokeWidth="1" />

      {/* Zemin çizgisi + istasyon işaretleri */}
      <path d="M30 194 V196.5 M90 194 V196.5 M150 194 V196.5 M210 194 V196.5 M370 194 V196.5 M430 194 V196.5" opacity="0.3" strokeWidth="0.8" />
      <path d="M0 196.5 H480" opacity="0.6" strokeWidth="1.3" />
    </svg>
  );
}
