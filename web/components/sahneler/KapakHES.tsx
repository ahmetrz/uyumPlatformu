/* HES kapak sahnesi — vadiye kurulu kemer baraj, ozalit çizgi-sanat.
   Ortada mansap yüzü görünen kemer baraj (kret üstü kapak dikmeleri + vinç
   köprüsü, düşey derzler, inşaat kademeleri), merkezde dolusavak oluğu ve
   akış çizgileri; kretin ardında geriye çekilen rezervuar su bantları; sağ
   etekte iki cebri boru ile santral binası ve şalt sahası. Vadi yamaçları
   iki derinlik katmanı + uzak sırt çizgileri. Enerji hattı vadiden akis ile
   çıkar, santral çıkışında tek odak ışıması (parilti). Derinlik yalnız
   opaklıkla; renk yalnız CSS token: currentColor + --accent / --glow. */

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
      {/* — uzak katman: sırt çizgileri — */}
      <g strokeWidth="1">
        <path d="M28,60 C 90,48 148,45 205,54" opacity=".13" />
        <path d="M272,53 C 330,46 392,49 452,60" opacity=".13" />
        <path d="M46,70 C 98,60 142,58 188,64" opacity=".10" />
        <path d="M290,63 C 336,57 388,59 436,68" opacity=".10" />
      </g>

      {/* — orta katman: yamaçlar + rezervuar — */}
      <g strokeWidth="1.1">
        <path d="M0,78 C 48,86 92,96 122,104" opacity=".34" />
        <path d="M0,92 C 40,98 80,106 116,114" opacity=".24" />
        <path d="M480,88 C 434,96 380,100 328,99" opacity=".34" />
        <path d="M480,102 C 436,108 378,111 324,110" opacity=".24" />
        {/* rezervuar su yüzeyi: kret eğrisine paralel, geriye çekilen bantlar */}
        <path d="M118,75.5 C 170,68 270,68 322,75.5" opacity=".3" />
        <path d="M134,70.5 C 180,64 260,64 306,70.5" opacity=".2" />
        <path d="M152,66 C 190,61 250,61 288,66" opacity=".13" />
        {/* küçük dalga tıklamaları */}
        <path d="M158,73 c 4,1.6 8,1.6 12,0" opacity=".26" />
        <path d="M226,71.5 c 4,1.6 8,1.6 12,0" opacity=".26" />
        <path d="M282,73.5 c 4,1.6 8,1.6 12,0" opacity=".26" />
        <path d="M196,68 c 3.5,1.4 7,1.4 10.5,0" opacity=".17" />
        <path d="M252,67.4 c 3.5,1.4 7,1.4 10.5,0" opacity=".17" />
      </g>

      {/* — ozalit notasyonu: kot çizgisi + istasyon artıları — */}
      <g strokeWidth=".8" opacity=".18">
        <path d="M92,84 V188" />
        <path d="M92,84 l-2.5,5 M92,84 l2.5,5 M92,188 l-2.5,-5 M92,188 l2.5,-5" />
        <path d="M86,84 h12 M86,188 h12" />
      </g>
      <g strokeWidth=".8" opacity=".2">
        <path d="M52,128 h9 M56.5,123.5 v9" />
        <path d="M396,168 h9 M400.5,163.5 v9" />
      </g>

      {/* — baraj gövdesi (yakın) — */}
      <g>
        {/* kret */}
        <path d="M108,80 C 164,72 276,72 332,80" strokeWidth="1.5" opacity=".82" />
        <path d="M108,87 C 164,79 276,79 332,87" strokeWidth="1.3" opacity=".6" />
        {/* mansap yüzü kenarları + taban */}
        <path d="M108,87 C 118,118 142,150 168,176" strokeWidth="1.5" opacity=".8" />
        <path d="M332,87 C 322,118 306,142 288,158" strokeWidth="1.5" opacity=".8" />
        <path d="M168,176 C 192,181 214,182 236,182" strokeWidth="1.4" opacity=".7" />
        {/* düşey derz çizgileri */}
        <path d="M136,84 C 148,116 162,148 176,173" strokeWidth="1.1" opacity=".42" />
        <path d="M164,81.5 C 173,114 182,147 191,176" strokeWidth="1.1" opacity=".42" />
        <path d="M306,85.5 C 296,112 287,132 278,150" strokeWidth="1.1" opacity=".42" />
        <path d="M244,80.4 C 241,110 238,130 236,148" strokeWidth="1.1" opacity=".35" />
        {/* inşaat kademeleri (yatay galeriler) */}
        <path d="M115,112 C 160,104 280,104 325,112" strokeWidth="1" opacity=".28" />
        <path d="M128,142 C 168,135 272,135 312,142" strokeWidth="1" opacity=".28" />
        {/* dolusavak oluğu duvarları */}
        <path d="M194,80.3 C 197,114 201,148 205,178" strokeWidth="1.3" opacity=".6" />
        <path d="M230,80 C 229,114 228,148 227,180" strokeWidth="1.3" opacity=".6" />
        {/* kret üstü kapak dikmeleri + vinç köprüsü */}
        <path d="M133.2,76.4 v-7.5 h5.6 v7.5" strokeWidth="1.2" opacity=".75" />
        <path d="M161.2,74.3 v-7.5 h5.6 v7.5" strokeWidth="1.2" opacity=".75" />
        <path d="M191.2,73.4 v-7.5 h5.6 v7.5" strokeWidth="1.2" opacity=".75" />
        <path d="M227.2,73.3 v-7.5 h5.6 v7.5" strokeWidth="1.2" opacity=".75" />
        <path d="M261.2,73.9 v-7.5 h5.6 v7.5" strokeWidth="1.2" opacity=".75" />
        <path d="M295.2,75.9 v-7.5 h5.6 v7.5" strokeWidth="1.2" opacity=".75" />
        <path d="M136,68.7 C 190,64.7 244,64.7 298,68.6" strokeWidth="1" opacity=".5" />
        {/* sol kenarda vana kulesi */}
        <path d="M117,79.5 v-13 h11 v13" strokeWidth="1.2" opacity=".55" />
        <path d="M115,66.5 h15" strokeWidth="1" opacity=".4" />
      </g>

      {/* — dolusavak akışı — */}
      <g strokeWidth="1.2">
        <path d="M202,89 c 3,17 -1,32 2,47 c 2,13 0,24 2,35" opacity=".5" />
        <path d="M212,88 c 2,18 -2,34 1,50 c 2,15 -1,26 2,39" opacity=".55" />
        <path d="M222,89 c 3,17 -1,32 2,47 c 2,13 0,24 2,35" opacity=".5" />
        <path d="M197,182.5 c 6,-5 12,-5 18,0" opacity=".6" />
        <path d="M214,184.5 c 6,-4.6 12,-4.6 17,0" opacity=".45" />
      </g>
      <g fill="currentColor" stroke="none">
        <circle cx="209" cy="178" r="1" opacity=".5" />
        <circle cx="228" cy="180" r=".8" opacity=".45" />
      </g>

      {/* — cebri borular — */}
      <g>
        <path d="M251.5,87 h13" strokeWidth="1.4" opacity=".78" />
        <path d="M277.5,89 h13" strokeWidth="1.4" opacity=".78" />
        <path d="M254,88 C 249,112 247,132 247,156" strokeWidth="1.4" opacity=".78" />
        <path d="M262,88 C 257,112 255,132 255,156" strokeWidth="1.4" opacity=".78" />
        <path d="M280,90 C 276,114 274,134 274,156" strokeWidth="1.4" opacity=".78" />
        <path d="M288,90 C 284,114 282,134 282,156" strokeWidth="1.4" opacity=".78" />
        <path d="M250.4,106.5 l8.2,-.6" strokeWidth="1" opacity=".6" />
        <path d="M248.6,126.5 l8.2,-.4" strokeWidth="1" opacity=".6" />
        <path d="M247.4,146.5 l8.2,-.2" strokeWidth="1" opacity=".6" />
        <path d="M276.8,108.5 l8.2,-.5" strokeWidth="1" opacity=".6" />
        <path d="M275.2,128.5 l8.2,-.3" strokeWidth="1" opacity=".6" />
        <path d="M274.2,148.5 l8.2,-.2" strokeWidth="1" opacity=".6" />
      </g>

      {/* — santral binası — */}
      <g>
        <path d="M236,192 V158 H330 V192" strokeWidth="1.5" opacity=".85" />
        <path d="M232,158 H334" strokeWidth="1.5" opacity=".8" />
        <path d="M236,167 H330" strokeWidth="1" opacity=".35" />
        <path d="M244,157.5 h14 M271,157.5 h14" strokeWidth="1" opacity=".6" />
        <path d="M246,172 v13 M257,172 v13 M268,172 v13" strokeWidth="1.1" opacity=".5" />
        <path d="M301,172 v13 M312,172 v13 M322,172 v13" strokeWidth="1.1" opacity=".5" />
        <path d="M280,192 v-15 h13 v15" strokeWidth="1.3" opacity=".7" />
        <path d="M296,158 v-4 h7 v4 M251,158 v-4 h7 v4" strokeWidth="1" opacity=".5" />
      </g>

      {/* — şalt sahası + çıkış — */}
      <g>
        <path d="M338,192 v-13 h17 v13" strokeWidth="1.4" opacity=".8" />
        <path d="M342,179 v-6 M351,179 v-6" strokeWidth="1.1" opacity=".7" />
        <circle cx="342" cy="171.5" r="1.3" strokeWidth="1" opacity=".7" />
        <circle cx="351" cy="171.5" r="1.3" strokeWidth="1" opacity=".7" />
        <path d="M364,192 v-26 M380,192 v-26 M360,166 h28" strokeWidth="1.2" opacity=".65" />
        <path d="M368,166 v4 M376,166 v4" strokeWidth="1" opacity=".5" />
        <path d="M351,170 C 357,165 362,163 368,164" strokeWidth="1" opacity=".5" />
      </g>

      {/* odak ışıması: santral çıkışı */}
      <g className="parilti">
        <circle cx="372" cy="161" r="10" stroke="var(--glow)" strokeWidth="1" opacity=".35" />
        <circle cx="372" cy="161" r="4.5" stroke="var(--glow)" strokeWidth="1.2" />
        <circle cx="372" cy="161" r="1.6" fill="var(--glow)" stroke="none" />
        <path d="M372,148 v-5 M362.5,152 l-4,-4 M381.5,152 l4,-4 M385,161 h6" stroke="var(--glow)" strokeWidth="1" />
      </g>

      {/* enerji hattı: vadiden çıkış */}
      <path
        className="akis"
        d="M372,161 C 396,148 412,124 430,102 C 446,84 462,78 480,74"
        stroke="var(--accent)"
        strokeWidth="1.6"
        opacity=".9"
      />
      <path
        d="M374,167 C 400,153 416,130 434,108 C 449,92 464,86 480,80"
        stroke="var(--accent)"
        strokeWidth="1.1"
        opacity=".3"
      />

      {/* pilon */}
      <g strokeWidth="1.2" opacity=".7">
        <path d="M422,142 L 431,100" />
        <path d="M442,140 L 433,100" />
        <path d="M426,128 h13 M427.5,118 h10.5 M429,109 h8" />
        <path d="M424,102 h17" />
        <path d="M426,128 l11,-10 M439,128 l-11,-10" opacity=".6" />
      </g>

      {/* — yakın yamaçlar — */}
      <g>
        <path d="M0,118 C 40,132 74,158 104,192" strokeWidth="1.4" opacity=".68" />
        <path d="M0,138 C 34,150 62,170 86,192" strokeWidth="1.2" opacity=".45" />
        <path d="M12,160 C 30,168 46,178 60,189" strokeWidth="1" opacity=".28" />
        <path d="M18,126 l-6,7 M36,138 l-6,7 M53,151 l-6,7 M69,164 l-6,7 M84,178 l-6,7" strokeWidth="1" opacity=".4" />
        <path d="M480,108 C 446,128 414,158 386,192" strokeWidth="1.4" opacity=".68" />
        <path d="M480,128 C 452,144 428,168 408,192" strokeWidth="1.2" opacity=".45" />
        <path d="M462,119 l6,7 M448,131 l6,7 M420,160 l6,7 M407,174 l6,7" strokeWidth="1" opacity=".4" />
        {/* küçük çam işaretleri */}
        <path d="M28,140 l4.5,-8 4.5,8 M32.5,140 v4" strokeWidth="1" opacity=".5" />
        <path d="M56,158 l4.5,-8 4.5,8 M60.5,158 v4" strokeWidth="1" opacity=".55" />
        <path d="M76,174 l4.5,-8 4.5,8 M80.5,174 v4" strokeWidth="1" opacity=".5" />
        <path d="M452,140 l4.5,-8 4.5,8 M456.5,140 v4" strokeWidth="1" opacity=".5" />
        <path d="M430,170 l4.5,-8 4.5,8 M434.5,170 v4" strokeWidth="1" opacity=".45" />
      </g>

      {/* kuyruksuyu */}
      <g strokeWidth="1">
        <path d="M176,196 c 8,-3 16,-3 24,0 c 8,3 16,3 24,0" opacity=".3" />
        <path d="M238,197 c 8,-3 16,-3 24,0" opacity=".2" />
      </g>

      {/* zemin taramaları */}
      <g strokeWidth="1" opacity=".28">
        <path d="M120,193.5 l-5,5 M141,193.5 l-5,5 M162,193.5 l-5,5" />
        <path d="M296,193.5 l-5,5 M318,193.5 l-5,5" />
        <path d="M402,193.5 l-5,5 M426,193.5 l-5,5 M450,193.5 l-5,5" />
      </g>

      {/* — zemin — */}
      <path d="M0,192 H480" strokeWidth="1.5" opacity=".75" />
    </svg>
  );
}
