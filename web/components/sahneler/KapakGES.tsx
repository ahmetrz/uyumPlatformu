/* GES kapak sahnesi — "Şebeke Uyum Konsolu" ozalit çizgi sanatı.
   Tek kaçış noktalı perspektifle ufka kaçan panel dizileri, sağda inverter
   kabini + trafo, ufukta iletim pilonu. Jeneratörle hesaplanmış perspektif;
   renk yalnız CSS token'larından gelir (currentColor + var(--accent)/var(--glow)). */

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
      <linearGradient id="kapakges-parlak" gradientUnits="userSpaceOnUse" x1="128.7" y1="132.8" x2="158.8" y2="140.5">
      <stop offset="0" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".5" />
      <stop offset="1" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".04" />
      </linearGradient>
      <radialGradient id="kapakges-hale" gradientUnits="userSpaceOnUse" cx="143.7" cy="137.5" r="30">
      <stop offset="0" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".4" />
      <stop offset=".55" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".12" />
      <stop offset="1" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity="0" />
      </radialGradient>
      </defs>
      <g opacity="1">
      <path d="M30 71 H128" opacity="0.07" strokeDasharray="12 7" strokeWidth="0.8" />
      <path d="M152 61 H214" opacity="0.05" strokeDasharray="9 6" strokeWidth="0.8" />
      <path d="M372 56 H448" opacity="0.06" strokeDasharray="12 7" strokeWidth="0.8" />
      </g>
      <g opacity="0.13" strokeWidth="0.9">
      <circle cx="86" cy="62" r="8.5" />
      <path d="M86 49.5 v-4 M73.5 62 h-4 M98.5 62 h4 M77 53 l-2.8 -2.8 M95 53 l2.8 -2.8" />
      </g>
      <path d="M0 82 H480" opacity="0.16" strokeWidth="0.8" />
      <g opacity="0.17" strokeWidth="0.8">
      <path d="M322 82 L328 50 M338 82 L332 50" />
      <path d="M322 82 L335.8 70 M338 82 L324.2 70" opacity="0.8" />
      <path d="M324.2 70 L333.9 60 M335.8 70 L326.1 60" opacity="0.8" />
      <path d="M326.1 60 L332 50 M333.9 60 L328 50" opacity="0.8" />
      <path d="M320 54 H340 M317 60.5 H343" />
      <path d="M320 54 v2.6 M340 54 v2.6 M317 60.5 v2.6 M343 60.5 v2.6" opacity="0.8" />
      <path d="M328 50 L330 44.5 L332 50" />
      </g>
      <g opacity="0.11" strokeWidth="0.7">
      <path d="M356 78 H462" strokeDasharray="6 3.5" />
      <path d="M362 80.4 H468" strokeDasharray="4.5 3" />
      </g>
      <g opacity="0.13">
      <path d="M272 83.5 L122 92.2 L122 96.4 L272 84.1 Z" fill="currentColor" stroke="none" opacity="0.06" />
      <path d="M272 83.5 L122 92.2" strokeWidth="0.7" />
      <path d="M272 84.1 L122 96.4" strokeWidth="0.7" />
      <path d="M122 92.2 L122 96.4" opacity="0.9" strokeWidth="0.595" />
      <path d="M208.3 87.2 L208.3 89.4" opacity="0.9" strokeWidth="0.595" />
      <path d="M237.8 85.5 L237.8 86.9" opacity="0.9" strokeWidth="0.595" />
      <path d="M252.7 84.6 L252.7 85.7" opacity="0.9" strokeWidth="0.595" />
      <path d="M261.7 84.1 L261.7 85" opacity="0.9" strokeWidth="0.595" />
      <path d="M267.7 83.8 L267.7 84.5" opacity="0.9" strokeWidth="0.595" />
      <path d="M272 83.5 L272 84.1" opacity="0.9" strokeWidth="0.595" />
      </g>
      <g opacity="0.2">
      <path d="M268 85 L92 102.6 L92 110.8 L268 86.2 Z" fill="currentColor" stroke="none" opacity="0.06" />
      <path d="M268 85 L92 102.6" strokeWidth="0.8" />
      <path d="M268 86.2 L92 110.8" strokeWidth="0.8" />
      <path d="M92 102.6 L92 110.8" opacity="0.9" strokeWidth="0.68" />
      <path d="M185.9 93.2 L185.9 97.7" opacity="0.9" strokeWidth="0.68" />
      <path d="M221 89.7 L221 92.8" opacity="0.9" strokeWidth="0.68" />
      <path d="M239.4 87.9 L239.4 90.2" opacity="0.9" strokeWidth="0.68" />
      <path d="M250.7 86.7 L250.7 88.6" opacity="0.9" strokeWidth="0.68" />
      <path d="M258.3 86 L258.3 87.6" opacity="0.9" strokeWidth="0.68" />
      <path d="M263.8 85.4 L263.8 86.8" opacity="0.9" strokeWidth="0.68" />
      <path d="M268 85 L268 86.2" opacity="0.9" strokeWidth="0.68" />
      </g>
      <g opacity="0.32">
      <path d="M264 87.4 L56 120.7 L56 136.5 L264 89.7 Z" fill="currentColor" stroke="none" opacity="0.06" />
      <path d="M264 87.4 L56 120.7" strokeWidth="0.9" />
      <path d="M264 89.7 L56 136.5" strokeWidth="0.9" />
      <path d="M56 120.7 L56 136.5" opacity="0.9" strokeWidth="0.765" />
      <path d="M160.9 103.9 L160.9 112.9" opacity="0.9" strokeWidth="0.765" />
      <path d="M202.3 97.3 L202.3 103.5" opacity="0.9" strokeWidth="0.765" />
      <path d="M224.5 93.8 L224.5 98.5" opacity="0.9" strokeWidth="0.765" />
      <path d="M238.4 91.5 L238.4 95.4" opacity="0.9" strokeWidth="0.765" />
      <path d="M247.8 90 L247.8 93.3" opacity="0.9" strokeWidth="0.765" />
      <path d="M254.7 88.9 L254.7 91.7" opacity="0.9" strokeWidth="0.765" />
      <path d="M259.9 88.1 L259.9 90.6" opacity="0.9" strokeWidth="0.765" />
      <path d="M264 87.4 L264 89.7" opacity="0.9" strokeWidth="0.765" />
      </g>
      <g opacity="0.55">
      <path d="M260 93.4 L0 171.4 L0 207.2 L260 98 Z" fill="currentColor" stroke="none" opacity="0.06" />
      <path d="M260 93.4 L0 171.4" strokeWidth="1.05" />
      <path d="M260 98 L0 207.2" strokeWidth="1.05" />
      <path d="M254 97.8 L0 189.3" opacity="0.5" strokeWidth="0.756" />
      <path d="M0 171.4 L0 207.2" opacity="0.9" strokeWidth="0.8925" />
      <path d="M82.1 146.8 L82.1 172.7" opacity="0.35" strokeWidth="0.5775000000000001" />
      <path d="M128.7 132.8 L128.7 153.1" opacity="0.9" strokeWidth="0.8925" />
      <path d="M128.7 153.1 L128.7 162.3" opacity="0.5" strokeWidth="0.6825000000000001" />
      <path d="M158.8 123.8 L158.8 140.5" opacity="0.35" strokeWidth="0.5775000000000001" />
      <path d="M179.8 117.5 L179.8 131.7" opacity="0.9" strokeWidth="0.8925" />
      <path d="M179.8 131.7 L179.8 138.1" opacity="0.5" strokeWidth="0.6825000000000001" />
      <path d="M195.3 112.8 L195.3 125.1" opacity="0.35" strokeWidth="0.5775000000000001" />
      <path d="M207.2 109.3 L207.2 120.2" opacity="0.9" strokeWidth="0.8925" />
      <path d="M207.2 120.2 L207.2 125.1" opacity="0.5" strokeWidth="0.6825000000000001" />
      <path d="M216.6 106.4 L216.6 116.2" opacity="0.35" strokeWidth="0.5775000000000001" />
      <path d="M224.3 104.1 L224.3 113" opacity="0.9" strokeWidth="0.8925" />
      <path d="M224.3 113 L224.3 117" opacity="0.5" strokeWidth="0.6825000000000001" />
      <path d="M230.6 102.2 L230.6 110.3" opacity="0.35" strokeWidth="0.5775000000000001" />
      <path d="M235.9 100.6 L235.9 108.1" opacity="0.9" strokeWidth="0.8925" />
      <path d="M235.9 108.1 L235.9 111.5" opacity="0.5" strokeWidth="0.6825000000000001" />
      <path d="M240.5 99.3 L240.5 106.2" opacity="0.35" strokeWidth="0.5775000000000001" />
      <path d="M244.4 98.1 L244.4 104.5" opacity="0.9" strokeWidth="0.8925" />
      <path d="M244.4 104.5 L244.4 107.4" opacity="0.5" strokeWidth="0.6825000000000001" />
      <path d="M247.8 97 L247.8 103.1" opacity="0.35" strokeWidth="0.5775000000000001" />
      <path d="M250.9 96.1 L250.9 101.8" opacity="0.9" strokeWidth="0.8925" />
      <path d="M250.9 101.8 L250.9 104.4" opacity="0.5" strokeWidth="0.6825000000000001" />
      <path d="M253.5 95.3 L253.5 100.7" opacity="0.35" strokeWidth="0.5775000000000001" />
      <path d="M255.9 94.6 L255.9 99.7" opacity="0.9" strokeWidth="0.8925" />
      <path d="M255.9 99.7 L255.9 102" opacity="0.5" strokeWidth="0.6825000000000001" />
      <path d="M258.1 94 L258.1 98.8" opacity="0.35" strokeWidth="0.5775000000000001" />
      <path d="M248 105.7 L24.1 212" opacity="0.28" strokeWidth="0.5775000000000001" />
      </g>
      <g opacity="0.8">
      <path d="M256 103.8 L68 201.6 L68 266 L256 115.6 Z" fill="currentColor" stroke="none" opacity="0.06" />
      <path d="M256 103.8 L68 201.6" strokeWidth="1.2" />
      <path d="M256 115.6 L68 266" strokeWidth="1.2" />
      <path d="M250 111.4 L68 223.1" opacity="0.5" strokeWidth="0.864" />
      <path d="M250 115.9 L68 244.5" opacity="0.5" strokeWidth="0.864" />
      <path d="M68 201.6 L68 266" opacity="0.9" strokeWidth="1.02" />
      <path d="M104.2 182.8 L104.2 237.1" opacity="0.35" strokeWidth="0.66" />
      <path d="M130.5 169.1 L130.5 216" opacity="0.35" strokeWidth="0.66" />
      <path d="M150.5 158.7 L150.5 200" opacity="0.9" strokeWidth="1.02" />
      <path d="M150.5 200 L150.5 216.5" opacity="0.5" strokeWidth="0.78" />
      <path d="M166.3 150.5 L166.3 187.4" opacity="0.35" strokeWidth="0.66" />
      <path d="M179 143.9 L179 177.2" opacity="0.35" strokeWidth="0.66" />
      <path d="M189.5 138.4 L189.5 168.8" opacity="0.9" strokeWidth="1.02" />
      <path d="M189.5 168.8 L189.5 181" opacity="0.5" strokeWidth="0.78" />
      <path d="M198.2 133.9 L198.2 161.8" opacity="0.35" strokeWidth="0.66" />
      <path d="M205.7 130 L205.7 155.8" opacity="0.35" strokeWidth="0.66" />
      <path d="M212.1 126.7 L212.1 150.7" opacity="0.9" strokeWidth="1.02" />
      <path d="M212.1 150.7 L212.1 160.3" opacity="0.5" strokeWidth="0.78" />
      <path d="M217.7 123.7 L217.7 146.2" opacity="0.35" strokeWidth="0.66" />
      <path d="M222.6 121.2 L222.6 142.3" opacity="0.35" strokeWidth="0.66" />
      <path d="M227 118.9 L227 138.8" opacity="0.9" strokeWidth="1.02" />
      <path d="M227 138.8 L227 146.8" opacity="0.5" strokeWidth="0.78" />
      <path d="M230.8 116.9 L230.8 135.7" opacity="0.35" strokeWidth="0.66" />
      <path d="M234.3 115.1 L234.3 133" opacity="0.35" strokeWidth="0.66" />
      <path d="M237.4 113.5 L237.4 130.5" opacity="0.9" strokeWidth="1.02" />
      <path d="M237.4 130.5 L237.4 137.2" opacity="0.5" strokeWidth="0.78" />
      <path d="M240.3 112 L240.3 128.2" opacity="0.35" strokeWidth="0.66" />
      <path d="M242.9 110.7 L242.9 126.1" opacity="0.35" strokeWidth="0.66" />
      <path d="M245.2 109.4 L245.2 124.2" opacity="0.9" strokeWidth="1.02" />
      <path d="M245.2 124.2 L245.2 130.1" opacity="0.5" strokeWidth="0.78" />
      <path d="M247.4 108.3 L247.4 122.5" opacity="0.35" strokeWidth="0.66" />
      <path d="M251.2 106.3 L251.2 119.4" opacity="0.9" strokeWidth="1.02" />
      <path d="M251.2 119.4 L251.2 124.7" opacity="0.5" strokeWidth="0.78" />
      <path d="M254.5 104.6 L254.5 116.8" opacity="0.35" strokeWidth="0.66" />
      <path d="M244 131.2 L155.5 212" opacity="0.28" strokeWidth="0.66" />
      </g>
      <g opacity="0.12" strokeWidth="0.8">
      <path d="M310 106 L348 182" />
      <path d="M306 107.6 L335 200.4" />
      <path d="M462 164 L480 173" />
      </g>
      <g opacity="0.16" strokeWidth="0.8">
      <path d="M236 158 h7 M262 172 h10 M234 187 h12 M296 178 h8" />
      <circle cx="254" cy="190" r="1" />
      <circle cx="318" cy="168" r="1" />
      </g>
      <g opacity="0.18" strokeWidth="0.7">
      <path d="M334 89.9 V83.6" />
      <path d="M366 97 V89.1" />
      <path d="M398 104 V94.5" />
      <path d="M430 111 V99.9" />
      <path d="M462 118.1 V105.4" />
      <path d="M334 83.6 L366 89.1 L398 94.5 L430 99.9 L462 105.4" opacity="0.8" />
      <path d="M334 86.5 L366 92.6 L398 98.8 L430 104.9 L462 111.1" opacity="0.5" />
      <path d="M328 88.6 L480 122" opacity="0.6" />
      </g>
      <g opacity="0.72" strokeWidth="1.05">
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
      <g opacity="0.78" strokeWidth="1.05">
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
      <path d="M208 191 C258 196 306 193 349 184" className="akis" style={{ stroke: 'var(--accent)' }} opacity="0.5" strokeWidth="1.1" />
      <path d="M390 182 C394 185 397 185 401 182" style={{ stroke: 'var(--accent)' }} opacity="0.4" strokeWidth="1" />
      <path d="M436 116 C408 96 366 79 335 62" className="akis" style={{ stroke: 'var(--accent)' }} opacity="0.4" strokeWidth="1" />
      <g className="parilti">
      <circle cx="143.7" cy="137.5" r="30" fill="url(#kapakges-hale)" stroke="none" />
      <path d="M131.7 133.9 L155.8 126.4 L155.8 140 L131.7 149.8 Z" fill="url(#kapakges-parlak)" stroke="none" />
      <path d="M135.7 140.5 L151.7 134.5" style={{ stroke: 'var(--glow)' }} opacity="0.95" strokeWidth="1.1" />
      <path d="M142.3 132.9 L145.1 142.1" style={{ stroke: 'var(--glow)' }} opacity="0.8" strokeWidth="1" />
      <circle cx="143.7" cy="137.5" r="1.5" style={{ stroke: 'var(--glow)' }} opacity="0.9" />
      </g>
      <path d="M0 197 H480" opacity="0.6" strokeWidth="1.2" />
    </svg>
  );
}
