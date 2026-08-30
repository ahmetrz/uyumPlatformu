/* Boş durum illüstrasyonları — OZALİT çizgi-sanat (üçlü set, onarım turu).
   BosGenel  : boş konsol + antenli izleme ekranı; şebekeden gelen tek aksan
               hattı ekran yanındaki gösterge lambasında son bulur — "henüz veri yok".
   BosTemiz  : dingin ufukta tam simetrik şebeke; tepe fenerinden iki yana
               soluklaşarak akan koruma teli tek aksan sistemidir — "her şey yolunda".
   BosKuyruk : cepheden konveyör + tarama kapısı + boş tepsi; aksan yalnız
               kapı lambası ve altındaki kısa tarama segmenti — "kuyruk boş".
   Kurallar: renk yalnız CSS token (currentColor + --accent/--glow/--grid-line);
   durum renkleri kullanılmaz. Derinlik opaklıkla: uzak .13-.18, orta .30-.45,
   yakın .60-.85. Sahne başına TEK aksan odağı: ışıma + ona bağlanan akış;
   akış uçları linearGradient ile soluklaşır, tam genişlik aksan yoktur.
   Ozalit kimliği: her sahnede var(--grid-line) çizim ızgarası (iki temada da).
   Animasyon sınıfları ürün globals.css'inde: akis / parilti.
   Üst ~%20 şerit sakin (rozet/pill binebilir); alt kenar zemin çizgisi sabittir
   (xMidYMax slice ile kırpılır). defs id'leri "bos-durumlar-" önekiyle benzersizdir. */

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
          <stop offset="0" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".4" />
          <stop offset="1" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bos-durumlar-genel-akis" gradientUnits="userSpaceOnUse" x1="238" y1="0" x2="159" y2="0">
          <stop offset="0" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".05" />
          <stop offset=".5" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".45" />
          <stop offset="1" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".8" />
        </linearGradient>
      </defs>

      {/* ozalit çizim ızgarası */}
      <g style={{ stroke: 'var(--grid-line)' }} strokeWidth={1}>
        <path d="M40 0 V180 M80 0 V180 M120 0 V180 M160 0 V180 M200 0 V180 M240 0 V180 M280 0 V180" />
        <path d="M0 36 H320 M0 72 H320 M0 108 H320 M0 144 H320" />
      </g>

      {/* UZAK: ufuk + soğutma kulesi + trafo bloğu */}
      <path d="M6 132 H314" opacity=".16" strokeWidth={1} />
      <g opacity=".18" strokeWidth={1}>
        <path d="M284 132 C281 118 285 108 287 100 M310 132 C313 118 309 108 307 100 M287 100 H307" />
        <path d="M286 110 c6 2 13 2 19 0" />
        <path d="M176 132 V122 h18 V132 M180 126 h4 M187 126 h4" />
      </g>
      <path d="M292 94 c2 -3 0 -6 2 -9 M300 94 c2 -3 0 -6 2 -9" opacity=".14" strokeWidth={1} />

      {/* ORTA: kafes pilon + iletkenler */}
      <g opacity=".34" strokeWidth={1.1}>
        <path d="M244 172 L253 92 h6 L268 172" />
        <path d="M247 150 L265 138 M265 150 L247 138 M249 128 L263 118 M263 128 L249 118" />
        <path d="M248 138 h16 M250 118 h12" />
        <path d="M238 98 H274 M238 98 L250 106 M274 98 L262 106 M238 98 v4 M274 98 v4" />
        <path d="M234 112 H278 M234 112 L248 120 M278 112 L264 120 M234 112 v4 M278 112 v4" />
        <path d="M253 92 L256 85 L259 92" />
      </g>
      <g opacity=".3" strokeWidth={1}>
        <path d="M274 102 C290 107 304 108 314 108" />
        <path d="M278 116 C294 122 308 124 314 124" />
        <path d="M234 116 C210 124 186 128 159 130" />
      </g>

      {/* AKSAN: şebekeden konsola tek hat — gösterge lambasında biter */}
      <path className="akis" d="M238 102 C214 110 188 116 159 120" stroke="url(#bos-durumlar-genel-akis)" strokeWidth={1.3} />

      {/* YAKIN: boş izleme konsolu */}
      <g opacity=".82" strokeWidth={1.3}>
        <rect x="46" y="64" width="112" height="76" rx="3" />
        <rect x="53" y="71" width="98" height="44" rx="2" />
        <path d="M60 172 V140 M144 172 V140 M60 158 H144" />
        <circle cx="59" cy="124" r="2.5" opacity=".7" />
        <path d="M66 124 H148" strokeDasharray="2 4" opacity=".55" />
        <circle cx="59" cy="133" r="2.5" opacity=".7" />
        <path d="M66 133 H136" strokeDasharray="2 4" opacity=".55" />
      </g>
      <path d="M53 82 H151 M53 93 H151 M53 104 H151 M77 71 V115 M101 71 V115 M125 71 V115" opacity=".22" strokeWidth={1} />
      <path d="M60 76 V108 H144" opacity=".5" strokeWidth={1.1} />
      <path d="M60 100 H144" strokeDasharray="3 5" opacity=".5" strokeWidth={1.1} />
      <circle cx="102" cy="88" r="7" strokeDasharray="2 3.5" opacity=".32" strokeWidth={1} />

      {/* gösterge lambası: aksanın vardığı tek odak */}
      <circle cx="154.5" cy="120" r="8" fill="url(#bos-durumlar-genel-glow)" stroke="none" />
      <circle cx="154.5" cy="120" r="2.4" style={{ stroke: 'var(--accent)' }} opacity=".8" />
      <circle className="parilti" cx="154.5" cy="120" r="1.3" style={{ fill: 'var(--glow)' }} stroke="none" />

      {/* anten: veri bekleniyor */}
      <g opacity=".5" strokeWidth={1.1}>
        <path d="M70 64 V52" />
        <circle cx="70" cy="50" r="1.4" />
      </g>
      <path d="M61 46 A 11 11 0 0 1 79 46" opacity=".18" strokeWidth={1} />
      <path d="M55 41 A 17 17 0 0 1 85 41" opacity=".12" strokeWidth={1} />

      {/* ölçü çizgisi: konsol yüksekliği */}
      <g opacity=".3" strokeWidth={1}>
        <path d="M34 64 V140 M31 64 h6 M31 140 h6 M38 64 H44 M38 140 H44" />
        <path d="M34 64 l-1.8 5 M34 64 l1.8 5 M34 140 l-1.8 -5 M34 140 l1.8 -5" />
      </g>

      {/* sehpa + demlik: operatör molada */}
      <g opacity=".6" strokeWidth={1.2}>
        <path d="M174 172 V151 H202 V172 M178 158 H198" />
        <path d="M182 151 V143 h11 v8" />
        <path d="M193 145 c4 0 4 4 0 4" />
        <path d="M185 138 c2 -2 0 -4 2 -6 M190 138 c2 -2 0 -4 2 -6" opacity=".6" />
      </g>

      {/* gök: kuşlar + nirengi artıları */}
      <path d="M282 48 c3 -3 6 -3 9 0 M296 42 c2.5 -2.5 5 -2.5 7.5 0" opacity=".25" strokeWidth={1} />
      <path d="M22 44 h6 M25 41 v6 M298 62 h6 M301 59 v6" opacity=".25" strokeWidth={1} />
      <path d="M174 48 c3 -3 6 -3 9 0 M190 44 c2 -2 4 -2 6 0" opacity=".2" strokeWidth={1} />

      {/* zemin */}
      <path d="M8 172 H312" opacity=".5" strokeWidth={1.4} />
      <path d="M22 172 l-4 5 M92 172 l-4 5 M170 172 l-4 5 M232 172 l-4 5 M296 172 l-4 5" opacity=".22" strokeWidth={1} />
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
          <stop offset="0" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".45" />
          <stop offset="1" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bos-durumlar-temiz-akis-l" gradientUnits="userSpaceOnUse" x1="158" y1="0" x2="56" y2="0">
          <stop offset="0" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".75" />
          <stop offset="1" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".06" />
        </linearGradient>
        <linearGradient id="bos-durumlar-temiz-akis-r" gradientUnits="userSpaceOnUse" x1="162" y1="0" x2="264" y2="0">
          <stop offset="0" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".75" />
          <stop offset="1" style={{ color: 'var(--accent)' }} stopColor="currentColor" stopOpacity=".06" />
        </linearGradient>
      </defs>

      {/* ozalit çizim ızgarası */}
      <g style={{ stroke: 'var(--grid-line)' }} strokeWidth={1}>
        <path d="M40 0 V180 M80 0 V180 M120 0 V180 M160 0 V180 M200 0 V180 M240 0 V180 M280 0 V180" />
        <path d="M0 36 H320 M0 72 H320 M0 108 H320 M0 144 H320" />
      </g>

      {/* simetri ekseni */}
      <path d="M160 66 V168" strokeDasharray="2 7" opacity=".14" strokeWidth={1} />

      {/* UZAK: ufuk + tepeler + uzak direkler */}
      <path d="M6 134 H314" opacity=".16" strokeWidth={1} />
      <g opacity=".17" strokeWidth={1}>
        <path d="M6 126 C60 119 112 122 160 122 C208 122 260 119 314 126" />
        <path d="M46 130 C92 126 128 128 160 128 C192 128 228 126 274 130" />
        <path d="M104 134 V122 M100 126 h8 M216 134 V122 M212 126 h8" />
      </g>

      {/* gök: fener halkaları + kuşlar + nirengi */}
      <path d="M151 50 A 9 9 0 0 1 169 50" opacity=".2" strokeWidth={1} />
      <path d="M145 50 A 15 15 0 0 1 175 50" opacity=".15" strokeWidth={1} />
      <path d="M139 50 A 21 21 0 0 1 181 50" opacity=".1" strokeWidth={1} />
      <path d="M76 62 c3 -3 6 -3 9 0 M62 70 c2.5 -2.5 5 -2.5 7.5 0" opacity=".22" strokeWidth={1} />
      <path d="M235 62 c3 -3 6 -3 9 0 M250.5 70 c2.5 -2.5 5 -2.5 7.5 0" opacity=".22" strokeWidth={1} />
      <path d="M34 56 h6 M37 53 v6 M280 56 h6 M283 53 v6" opacity=".22" strokeWidth={1} />

      {/* ORTA: aynalı yan pilonlar */}
      <g opacity=".34" strokeWidth={1.1}>
        <path d="M46 172 L53 112 h4 L64 172" />
        <path d="M42 120 H68 M42 120 L52 128 M68 120 L58 128 M42 120 v3 M68 120 v3" />
        <path d="M48 152 L62 142 M62 152 L48 142 M49 142 h12" />
        <path d="M53 112 L55 106 L57 112" />
        <path d="M274 172 L267 112 h-4 L256 172" />
        <path d="M252 120 H278 M252 120 L262 128 M278 120 L268 128 M252 120 v3 M278 120 v3" />
        <path d="M258 152 L272 142 M272 152 L258 142 M259 142 h12" />
        <path d="M263 112 L265 106 L267 112" />
      </g>

      {/* iletkenler: simetrik sarkmalar */}
      <g opacity=".3" strokeWidth={1}>
        <path d="M136 90 C112 102 88 114 68 122" />
        <path d="M184 90 C208 102 232 114 252 122" />
        <path d="M130 108 C102 116 66 121 42 123" />
        <path d="M190 108 C218 116 254 121 278 123" />
        <path d="M42 123 C28 126 16 127 6 128 M278 123 C292 126 304 127 314 128" />
      </g>

      {/* güneş paneli sıraları */}
      <g opacity=".3" strokeWidth={1}>
        <path d="M84 162 l4 -7 h12 l-4 7 z M103 162 l4 -7 h12 l-4 7 z M122 162 l4 -7 h12 l-4 7 z" />
        <path d="M92 162 v8 M111 162 v8 M130 162 v8" />
        <path d="M236 162 l-4 -7 h-12 l4 7 z M217 162 l-4 -7 h-12 l4 7 z M198 162 l-4 -7 h-12 l4 7 z" />
        <path d="M228 162 v8 M209 162 v8 M190 162 v8" />
      </g>

      {/* AKSAN: fenerden iki yana koruma teli — uçlara doğru soluklaşır */}
      <path className="akis" d="M155 58 C124 74 88 94 56 107" stroke="url(#bos-durumlar-temiz-akis-l)" strokeWidth={1.2} />
      <path className="akis" d="M165 58 C196 74 232 94 264 107" stroke="url(#bos-durumlar-temiz-akis-r)" strokeWidth={1.2} />

      {/* YAKIN: merkez pilon */}
      <g opacity=".8" strokeWidth={1.3}>
        <path d="M146 172 L156 62 h8 L174 172" />
        <path d="M149 152 L171 138 M171 152 L149 138 M150 138 h20" />
        <path d="M151 130 L169 118 M169 130 L151 118 M152 118 h16" />
        <path d="M153 110 L167 100 M167 110 L153 100 M154 100 h12" />
        <path d="M136 86 H184 M136 86 L150 96 M184 86 L170 96 M136 86 v4 M184 86 v4" />
        <path d="M130 104 H190 M130 104 L149 114 M190 104 L171 114 M130 104 v4 M190 104 v4" />
        <path d="M156 62 L160 52 L164 62" />
      </g>
      <circle cx="160" cy="50" r="9" fill="url(#bos-durumlar-temiz-glow)" stroke="none" />
      <circle cx="160" cy="50" r="2.6" style={{ stroke: 'var(--accent)' }} opacity=".8" />
      <circle className="parilti" cx="160" cy="50" r="1.5" style={{ fill: 'var(--glow)' }} stroke="none" />

      {/* zemin */}
      <path d="M8 172 H312" opacity=".5" strokeWidth={1.4} />
      <path d="M60 172 l-4 5 M120 172 l-4 5 M200 172 l-4 5 M260 172 l-4 5" opacity=".22" strokeWidth={1} />
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
          <stop offset="0" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity=".42" />
          <stop offset="1" style={{ color: 'var(--glow)' }} stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ozalit çizim ızgarası */}
      <g style={{ stroke: 'var(--grid-line)' }} strokeWidth={1}>
        <path d="M40 0 V180 M80 0 V180 M120 0 V180 M160 0 V180 M200 0 V180 M240 0 V180 M280 0 V180" />
        <path d="M0 36 H320 M0 72 H320 M0 144 H320" />
      </g>

      {/* UZAK: ufuk + fabrika + uzak pilon */}
      <path d="M6 136 H314" opacity=".15" strokeWidth={1} />
      <g opacity=".17" strokeWidth={1}>
        <path d="M12 136 V118 l8 -8 8 8 8 -8 8 8 V136" />
        <path d="M48 136 V112 h5 V136" />
        <path d="M288 136 L293 106 h3 L301 136 M285 114 h17 M290 128 l8 -7 M298 128 l-8 -7" />
      </g>
      <path d="M50 106 c2 -3 0 -6 2 -9" opacity=".13" strokeWidth={1} />

      {/* tavan: sarkıt lambalar */}
      <g opacity=".22" strokeWidth={1}>
        <path d="M70 36 V44 M70 44 L64 50 M70 44 L76 50 M64 50 h12" />
        <path d="M250 36 V44 M250 44 L244 50 M250 44 L256 50 M244 50 h12" />
      </g>

      {/* KONVEYÖR: bant + dönüş makaraları + A-ayaklar */}
      <path d="M6 63 H314 M6 73 H314" opacity=".55" strokeWidth={1.2} />
      <path className="akis" d="M6 68 H314" opacity=".3" strokeWidth={1} />
      <g opacity=".35" strokeWidth={1}>
        <circle cx="30" cy="77" r="2.5" />
        <circle cx="67" cy="77" r="2.5" />
        <circle cx="104" cy="77" r="2.5" />
        <circle cx="141" cy="77" r="2.5" />
        <circle cx="178" cy="77" r="2.5" />
        <circle cx="215" cy="77" r="2.5" />
        <circle cx="252" cy="77" r="2.5" />
        <circle cx="289" cy="77" r="2.5" />
      </g>
      <g opacity=".55" strokeWidth={1.2}>
        <path d="M76 172 L86 73 M96 172 L86 73 M79 148 H93 M79 148 L91 126 M93 148 L81 126 M81 126 h10" />
        <path d="M228 172 L238 73 M231 148 H245 M231 148 L243 126 M245 148 L233 126 M233 126 h10 M248 172 L238 73" />
      </g>

      {/* tarama kapısı — AKSAN: lamba + kısa tarama segmenti (tek odak) */}
      <g opacity=".6" strokeWidth={1.2}>
        <path d="M150 63 V44 M170 63 V44 M150 44 H170 M160 44 V50" />
      </g>
      <circle cx="160" cy="54" r="8" fill="url(#bos-durumlar-kuyruk-glow)" stroke="none" />
      <circle cx="160" cy="54" r="2.4" style={{ stroke: 'var(--accent)' }} opacity=".8" />
      <circle className="parilti" cx="160" cy="54" r="1.3" style={{ fill: 'var(--glow)' }} stroke="none" />
      <path className="akis" d="M151 63 H169" style={{ stroke: 'var(--accent)' }} opacity=".6" strokeWidth={1.5} />
      <path d="M156 59 L138 118 M164 59 L182 118" opacity=".13" strokeWidth={1} />

      {/* bant üstünde geçip giden evraklar */}
      <g opacity=".5" strokeWidth={1.2}>
        <path d="M38 63 V52 h9 l4 4 v7 M47 52 v4 h4" />
        <path d="M104 63 V53 h12 V63 M104 58 h12" />
        <path d="M262 63 V52 h10 l4 4 v7 M272 52 v4 h4" />
      </g>

      {/* YAKIN: boş gelen tepsisi — cepheden */}
      <g opacity=".85" strokeWidth={1.3}>
        <path d="M112 116 H124 M196 116 H208" />
        <path d="M120 116 L126 162 M200 116 L194 162 M126 162 H194" />
        <path d="M132 162 V172 M188 162 V172" />
      </g>
      <path d="M127 122 H193" opacity=".42" strokeWidth={1.1} />
      <path d="M131 154 H189" opacity=".22" strokeWidth={1} />
      <rect x="140" y="136" width="40" height="9" rx="2" strokeDasharray="3 4" opacity=".28" strokeWidth={1.1} />
      <g opacity=".3" strokeWidth={1}>
        <path d="M216 116 V162 M213 116 h6 M213 162 h6" />
      </g>

      {/* ORTA sol: kumanda kaidesi + kapıya giden kablo */}
      <g opacity=".45" strokeWidth={1.1}>
        <path d="M34 172 V134 H62 V172" />
        <path d="M38 140 h16 v9 h-16 z" />
        <circle cx="41" cy="156" r="1.6" />
        <circle cx="48" cy="156" r="1.6" />
        <path d="M54 154 v6 M58 154 v6" />
      </g>
      <path d="M48 134 C68 104 108 80 148 66" opacity=".3" strokeWidth={1} />

      {/* ORTA sağ: işlenmiş arşiv kutuları */}
      <g opacity=".45" strokeWidth={1.1}>
        <path d="M252 172 V148 H290 V172 M271 148 V172" />
        <path d="M258 155 h8 M277 155 h8" />
        <path d="M258 148 V132 h26 v16" />
        <path d="M264 138 h8" />
      </g>

      {/* nirengi artıları */}
      <path d="M96 44 h6 M99 41 v6 M290 46 h6 M293 43 v6" opacity=".22" strokeWidth={1} />

      {/* zemin */}
      <path d="M8 172 H312" opacity=".5" strokeWidth={1.4} />
      <path d="M30 172 l-4 5 M110 172 l-4 5 M180 172 l-4 5 M262 172 l-4 5" opacity=".22" strokeWidth={1} />
    </svg>
  );
}
