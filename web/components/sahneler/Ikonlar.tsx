/* Ozalit kimliğinde navigasyon + eylem ikon seti — teknik çizim dili.
   viewBox 0 0 24 24; üç kalem katmanı (rapido ağırlıkları):
     ana   — kontur, 1.75 / opaklık 1
     yapi  — ikinci ton (iç hatlar, gölge cidarı, taksimat), 1.2 / .58
     ince  — yapım çizgileri, tarama, ölçü tikleri, .9 / .34 — yalnız boy >= 32
   Küçük boyut (ray 17 px, liste 24 px) böylece ayrı optik çizim alır: ince
   katman düşer, ikinci ton yüksek kontrastla kalır. Her ikonun alt kenarında
   sabit zemin çizgisi vardır (kart kapaklarında xMidYMax slice ile kırpılır).
   Renk daima currentColor; derinlik yalnız opaklıkla verilir, durum renkleri
   kullanılmaz. Atölye ve iki tema provaları: atolye/ikonlar. */

import type { ReactElement } from 'react';

type P = { boy?: number };

/** Zemin çizgisi — hafif sehimli (rapido eli); tüm ikonlarda ortak. */
const ZEMIN = 'M4.3 21.4c5.15-.3 10.25-.3 15.4 0';
const ZEMIN_INCE = 'M7.3 21.18v-.8M12 21.14v-.8M16.7 21.18v-.8';

/** İnce katman eşiği: 32 px altı boyutlarda yapım çizgileri çizilmez. */
const detay = (p?: P) => (p?.boy ?? 24) >= 32;

const kok = (p?: P) => ({
  width: p?.boy ?? 24,
  height: p?.boy ?? 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  preserveAspectRatio: 'xMidYMax slice',
  'aria-hidden': true,
});

/** Genel Bakış — Gösterge paneli — kadran, ibre, ana/ara taksimat ve eşel yayı */
export function IkonGenelBakis(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M5.48 16.44A7.2 7.2 0 1 1 18.52 16.44" />
      <path d="M12 13.4 9.6 8.95" />
      <path d="M12 13.4l1.05 1.9" />
      <circle cx="12" cy="13.4" r="1.35" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M6.29 16.06 5.48 16.44M6.08 11.24 5.23 10.94M9.34 7.69 8.96 6.88M12 7.1V6.2M14.66 7.69l.38-.81M17.92 11.25l.85-.31M17.71 16.06l.81.38" />
        <path d="M7.83 15.34A4.6 4.6 0 0 1 15.52 10.44" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <path d="M7.02 8.84 6.69 8.53M11.71 6.66l-.02-.45M16.56 8.42l.31-.33M18.74 13.11l.45-.02" />
          <path d="M6.65 15.89A5.9 5.9 0 1 1 17.35 15.89" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Santral — Soğutma kulesi — hiperbolik gövde, bilezikler, buhar ve duvar taraması */
export function IkonSantral(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M8.1 20.3C9.55 17.4 10.3 14.9 10.2 12.4 10.1 10 9.7 7.7 9.35 5.4" />
      <path d="M15.9 20.3C14.45 17.4 13.7 14.9 13.8 12.4 13.9 10 14.3 7.7 14.65 5.4" />
      <path d="M9.35 5.4q2.65-.85 5.3 0" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M9.55 5.92q2.45.7 4.9 0" />
        <path d="M9.82 8.7q2.18.68 4.36 0" />
        <path d="M10.32 12.9q1.68.6 3.36 0" />
        <path d="M10.95 3.85c.5-.55.12-1.25.62-1.8M13.25 3.85c.5-.55.12-1.25.62-1.8" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <path d="M12.1 3.3c.45-.5.1-1.15.55-1.7" />
          <path d="M10.15 16.45q1.85.58 3.7 0" />
          <path d="M9.05 13.8l1.1-.4M9.35 15.3l1.15-.42M9.55 16.8l1.2-.45M9.75 18.3l1.25-.45" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Süreçler — Döngü — çift ok halkası, mihver artısı ve yapım dairesi */
export function IkonSurecler(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M5.2 12a6.8 6.8 0 0 1 6.8-6.8c1.98 0 3.78.74 5.12 2.1L18.8 8.96" />
      <path d="M18.8 5.2v3.76h-3.76" />
      <path d="M18.8 12a6.8 6.8 0 0 1-6.8 6.8c-1.98 0-3.78-.74-5.12-2.1L5.2 15.04" />
      <path d="M5.2 18.8v-3.76h3.76" />
      <path d="M12 12h.01" />
      <g opacity=".58" strokeWidth="1.2">
        <circle cx="12" cy="12" r="1.9" />
        <path d="M12 9.15v-1M12 14.85v1M9.15 12h-1M14.85 12h1" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <circle cx="12" cy="12" r="4.35" strokeDasharray="1.5 2.3" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Bulgular — Ünlem üçgeni — iç kalıp üçgeni, taban taraması ve tepe aplomb çizgisi */
export function IkonBulgular(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M13.45 4.55a1.68 1.68 0 0 0-2.9 0L3.72 16.4a1.68 1.68 0 0 0 1.45 2.52h13.66a1.68 1.68 0 0 0 1.45-2.52Z" />
      <path d="M12 9.4v3.7" />
      <path d="M12 15.85h.01" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M12 7.15 17.62 16.9H6.38Z" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <path d="M6.3 18.35l.75-1.3M8 18.35l.75-1.3M9.7 18.35l.75-1.3M14.3 18.35l.75-1.3M16 18.35l.75-1.3" />
          <path d="M12 3.35v-.95" />
          <path d="M2.7 18.92h.95M20.35 18.92h.95" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Riskler — Elmas radar — iç baklava, tarama kolu, menzil yayı ve köşe nirengileri */
export function IkonRiskler(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M3.1 10.7a1.84 1.84 0 0 0 0 2.6l7.6 7.6a1.84 1.84 0 0 0 2.6 0l7.6-7.6a1.84 1.84 0 0 0 0-2.6l-7.6-7.6a1.84 1.84 0 0 0-2.6 0Z" />
      <path d="M12 12h.01" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M12 8.2 15.8 12 12 15.8 8.2 12Z" />
        <path d="M12.8 11.2 15.9 8.1" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <path d="M13.92 6.74A5.6 5.6 0 0 1 17.26 10.08" />
          <path d="M2.05 12h1.05M20.9 12h1.05M12 2.1v1.05" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Görevler — Onay listesi — kutu gölgeleri, çift satır çizgisi ve sıra nirengileri */
export function IkonGorevler(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <rect x="3.7" y="3.9" width="5.6" height="5.6" rx="1.3" />
      <path d="M5.5 6.95l1.2 1.2 2.1-2.55" />
      <path d="M12.9 5.7c2.45-.2 4.9-.2 7.35 0" />
      <rect x="3.7" y="13.1" width="5.6" height="5.6" rx="1.3" />
      <path d="M12.9 14.9c2.45-.2 4.9-.2 7.35 0" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M10.15 5.2v3.6a1.35 1.35 0 0 1-1.35 1.35H5.2" />
        <path d="M10.15 14.4v3.6a1.35 1.35 0 0 1-1.35 1.35H5.2" />
        <path d="M12.9 8.1h4.7M12.9 17.3h5.6" />
        <path d="M5.7 16.2h1.8" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <path d="M12.9 6.55h7.35M12.9 15.75h7.35" />
          <path d="M2.55 6.7h.85M2.55 15.9h.85" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Denetimler — Klipsli pano — kâğıt satırları, klips taraması, sağ derinlik ve uzatma uçları */
export function IkonDenetimler(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M15.35 4.45h1.5a1.85 1.85 0 0 1 1.85 1.85V18.95a1.85 1.85 0 0 1-1.85 1.85H7.15a1.85 1.85 0 0 1-1.85-1.85V6.3A1.85 1.85 0 0 1 7.15 4.45h1.5" />
      <rect x="8.65" y="2.7" width="6.7" height="3.3" rx="1.1" />
      <path d="M9.1 14.7l2.05 2.05 3.75-4.4" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M8.6 9.5c2.27-.16 4.53-.16 6.8 0" />
        <path d="M8.6 11.5h4.8" />
        <path d="M12 4.35h.01" />
        <path d="M19.55 7.6v10.4" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <path d="M9.75 7.3l1.05-1.05M11.55 7.3l1.05-1.05M13.35 7.3l1.05-1.05" />
          <path d="M8.6 18.2h4.4" />
          <path d="M4.35 4.45h.95M18.7 4.45h.95" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Envanter — Kabin — üç bölme, kulplar, LED noktaları, sağ derinlik ve havalandırma taraması */
export function IkonEnvanter(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <rect x="5.5" y="3.1" width="13" height="17.4" rx="1.6" />
      <path d="M5.5 8.9h13M5.5 14.7h13" />
      <path d="M16.05 6h.01M16.05 11.8h.01M16.05 17.6h.01" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M8.15 6c1.45-.14 2.9-.14 4.35 0M8.15 11.8c1.45-.14 2.9-.14 4.35 0M8.15 17.6c1.45-.14 2.9-.14 4.35 0" />
        <path d="M19.7 5.5v13.6" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <path d="M6.85 13.85l1.1-1.1M8.5 13.85l1.1-1.1M10.15 13.85l1.1-1.1" />
          <path d="M4.45 8.9h.8M4.45 14.7h.8" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Projeler — Yol haritası — gantt çubukları, bağımlılık okları, kilometre taşı ve üst cetvel */
export function IkonProjeler(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <rect x="6" y="4.9" width="7" height="3" rx="1.5" />
      <rect x="9.2" y="10.4" width="8.6" height="3" rx="1.5" />
      <rect x="12.4" y="15.9" width="8" height="3" rx="1.5" />
      <path d="M16.3 5.4l1 1-1 1-1-1Z" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M3.5 3.6v17.75" />
        <path d="M3.5 6.4h2.5M3.5 11.9h5.7M3.5 17.4h8.9" />
        <path d="M13 8v2.3M16.55 13.5v2.3" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <path d="M12.45 9.75l.55.6.55-.6M16 15.25l.55.6.55-.6" />
          <path d="M5.2 3.15h14.6" />
          <path d="M8.85 2.7v.9M12.5 2.7v.9M16.15 2.7v.9" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Raporlar — Belge — kıvrık köşe taraması, çubuk grafik, hedef çubuğu ve sağ derinlik */
export function IkonRaporlar(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M13.6 3.05H7.2A1.85 1.85 0 0 0 5.35 4.9v13.3a1.85 1.85 0 0 0 1.85 1.85h9.6a1.85 1.85 0 0 0 1.85-1.85V8.1Z" />
      <path d="M8.95 16.5v-2.9M11.7 16.5v-5M14.45 16.5v-1.9" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M13.6 3.05v3.4a1.6 1.6 0 0 0 1.6 1.6h3.4" />
        <path d="M8.1 16.55c2.57.16 5.13.16 7.7 0" />
        <path d="M8.1 5.8h3.2M8.1 7.8h2.2" />
        <path d="M19.6 9.9v8.3" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <path d="M14.7 5.8l1.75-1.75M15.6 7.05l2.15-2.15" />
          <path d="M17.2 16.5v-3.9" />
          <path d="M7.3 13.6h.7M7.3 11.5h.7" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Aktivite — Nabız — osiloskop ekseni, kesikli referans, tepe ölçüm halkası ve dip nirengisi */
export function IkonAktivite(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M3.4 13.1h3.1l2.2-5.5 3.4 9.6 2.4-6.7 1.5 2.6h4.6" />
      <path d="M20.6 13.1h.01" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M3.4 5.9v11.9" />
        <path d="M5.4 8.6h14.9" strokeDasharray="1.6 2.2" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <circle cx="8.7" cy="7.6" r="0.95" />
          <path d="M12.1 17.35v1.45M11.35 18.8h1.5" />
          <path d="M2.6 8.6h.8M2.6 13.1h.8" />
          <path d="M13.6 17.2h5.9" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Regülasyonlar — Açık kitap — sırt, satır dokusu, madde imleri ve alttaki cilt katmanları */
export function IkonRegulasyonlar(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M12 6.2C10.3 4.7 7.9 4.1 4.6 4.3V17.6c3.3-.2 5.7.4 7.4 1.9 1.7-1.5 4.1-2.1 7.4-1.9V4.3C16.1 4.1 13.7 4.7 12 6.2Z" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M12 6.2v13.3" />
        <path d="M6.9 8.4c1.25 0 2.3.18 3.1.55M6.9 10.9c1.25 0 2.3.18 3.1.55M6.9 13.4c1.25 0 2.3.18 3.1.55" />
        <path d="M17.1 8.4c-1.25 0-2.3.18-3.1.55M17.1 10.9c-1.25 0-2.3.18-3.1.55M17.1 13.4c-1.25 0-2.3.18-3.1.55" />
        <path d="M5.3 18.6c2.85-.1 4.95.42 6.7 1.7 1.75-1.28 3.85-1.8 6.7-1.7" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <path d="M6.1 19.8c2.3.1 4.15.6 5.9 1.55 1.75-.95 3.6-1.45 5.9-1.55" />
          <path d="M4.6 3.55v-.85M19.4 3.55v-.85" />
          <path d="M5.75 8.4h.01M5.75 10.9h.01M5.75 13.4h.01" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Eşleştirme — Eşleme köprüsü — iki kayıt ayracı, çapraz bağlar, kavşak düğümü ve ölçü tikleri */
export function IkonEslestirme(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M6.8 5.4H5.1a1.5 1.5 0 0 0-1.5 1.5v10.2a1.5 1.5 0 0 0 1.5 1.5h1.7" />
      <path d="M17.2 5.4h1.7a1.5 1.5 0 0 1 1.5 1.5v10.2a1.5 1.5 0 0 1-1.5 1.5h-1.7" />
      <path d="M8.1 7.8h7.8" />
      <path d="M8.1 12.1 15.9 16.4" />
      <path d="M8.1 16.4 15.9 12.1" />
      <path d="M14.3 16.37 15.9 16.4 15.03 15.06" />
      <path d="M9.7 16.37 8.1 16.4l.87-1.34" />
      <path d="M7.35 7.8h.01M16.65 7.8h.01M7.35 12.1h.01M16.65 12.1h.01" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M12 14.25h.01" />
        <path d="M21.15 7.5v9.1" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <path d="M10.6 7.4v.85M13.4 7.4v.85" />
          <path d="M3.6 4.5v.8M20.4 4.5v.8M3.6 18.7v.8M20.4 18.7v.8" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** İçe Aktarım — Tepsiye iniş — yankı şevronu, çift cidarlı tepsi, kesikli kılavuz ve uzatma uçları */
export function IkonIceAktarim(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M12 3.3v8.5" />
      <path d="M8.6 8.4l3.4 3.5 3.4-3.5" />
      <path d="M4.6 14.3v3.7a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2v-3.7" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M6.35 14.3v2.75a1.05 1.05 0 0 0 1.05 1.05h9.2a1.05 1.05 0 0 0 1.05-1.05V14.3" />
        <path d="M9.75 5.5l2.25 2.3 2.25-2.3" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <path d="M12 13.3v4.4" strokeDasharray="1.4 2" />
          <path d="M2.85 14.3h1.05M20.1 14.3h1.05" />
          <path d="M12 2v.85" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Tanımlar — Ayar kaydırıcıları — imleç çizgili düğmeler, ray durakları ve eşel tikleri */
export function IkonTanimlar(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M3.6 6.2h7.4M17.4 6.2h3" />
      <circle cx="14.3" cy="6.2" r="2.1" />
      <path d="M3.6 12h1.8M11.9 12h8.5" />
      <circle cx="8.6" cy="12" r="2.1" />
      <path d="M3.6 17.8h9M19.2 17.8h1.2" />
      <circle cx="16" cy="17.8" r="2.1" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M14.3 5.35v1.7M8.6 11.15v1.7M16 16.95v1.7" />
        <path d="M3.6 5.5v1.4M20.4 5.5v1.4M3.6 11.3v1.4M20.4 11.3v1.4M3.6 17.1v1.4M20.4 17.1v1.4" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <path d="M13.2 13.3v.7M15 13.3v.7M16.8 13.3v.7M18.6 13.3v.7" />
          <path d="M5.5 7.3v.7M7.4 7.3v.7M9.3 7.3v.7" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Yetkiler — Kalkan ve anahtar — iç kalkan hattı, omuz taraması, yapım dairesi ve iki dişli anahtar */
export function IkonYetkiler(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M12 3 19.2 5.7v5.6c0 4.6-2.9 7.7-7.2 9.7-4.3-2-7.2-5.1-7.2-9.7V5.7Z" />
      <circle cx="9.6" cy="9.6" r="2.05" />
      <path d="M11.1 11.1 14.55 14.55" />
      <path d="M13.35 13.35l1.2-1.2" />
      <path d="M14.55 14.55l1.1-1.1" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M12 5.15 17.1 7.1v4.1c0 3.45-2.1 5.85-5.1 7.4-3-1.55-5.1-3.95-5.1-7.4V7.1Z" />
        <path d="M9.6 9.6h.01" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <circle cx="9.6" cy="9.6" r="3.1" strokeDasharray="1.4 2.1" />
          <path d="M6.15 6.55l1.5-1.05M6.15 8.35l2.5-1.75" />
          <path d="M12 2.1v.85" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Sağlık — Kalpten geçen EKG — dış uzatma hatları, elektrot tikleri ve iç et kalınlığı */
export function IkonSaglik(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M12 19.8c-4.4-2.95-7.3-5.75-7.3-9.25 0-2.8 1.75-4.65 4.1-4.65 1.35 0 2.5.68 3.2 1.75.7-1.07 1.85-1.75 3.2-1.75 2.35 0 4.1 1.85 4.1 4.65 0 3.5-2.9 6.3-7.3 9.25Z" />
      <path d="M7.7 12h1.9l1.1-2 1.7 3.9 1.1-1.9h2.8" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M2.9 12h1.3M19.8 12h1.3" />
        <path d="M7.4 13.1c1 1.7 2.5 3.2 4.6 4.75" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <path d="M3.55 11.2v1.6M20.45 11.2v1.6" />
          <path d="M12 7.45v-1.3" />
          <path d="M16.6 13.1c-.9 1.5-2.2 2.85-3.9 4.15" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Bildirim — Zil — etek bileziği, omuz hattı, askı, çınlama yayları ve etek taraması */
export function IkonBildirim(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M6.3 9a5.7 5.7 0 0 1 11.4 0c0 3.95 1.15 5.3 2.3 6.55a.95.95 0 0 1-.7 1.6H4.7a.95.95 0 0 1-.7-1.6C5.15 14.3 6.3 12.95 6.3 9Z" />
      <path d="M10.3 19.65a1.75 1.75 0 0 0 3.4 0" />
      <g opacity=".58" strokeWidth="1.2">
        <path d="M5.4 14.75c2.1.5 11.1.5 13.2 0" />
        <path d="M9.15 4.6C8.3 5.35 7.75 6.35 7.5 7.55" />
        <path d="M12 3.25v-1.1" />
        <path d="M19.55 6.5c-.35-1.2-1.05-2.2-2-2.95" />
        <path d={ZEMIN} />
      </g>
      {detay(p) && (
        <g opacity=".34" strokeWidth=".9">
          <path d="M21.1 5.85c-.45-1.55-1.4-2.85-2.7-3.85" />
          <path d="M6.35 13.95l.8-1.9M7.55 14.2l.75-1.8" />
          <path d={ZEMIN_INCE} />
        </g>
      )}
    </svg>
  );
}

/** Marka işareti — Altıgen rozet içinde açık şalter — nötr gövde, tek pirinç kontak.
    Gövde nötrdür (kök renk --text): pirinç yalnız tek kontak noktasında kalır,
    böylece ray'daki aktif öğenin aksanıyla yarışmaz. */
export function MarkaIsareti(p?: P): ReactElement {
  return (
    <svg
      width={p?.boy ?? 26}
      height={p?.boy ?? 26}
      viewBox="0 0 26 26"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: 'var(--text)' }}
      aria-hidden
    >
      <path d="M13 2.6 22.1 7.85v10.3L13 23.4 3.9 18.15V7.85Z" />
      <path d="M13 6.85v3.1" />
      <path d="M13 16.35l3.6-4.85" />
      <circle cx="13" cy="16.35" r="0.62" />
      <path d="M13 17v2.1" />
      <g style={{ stroke: 'var(--accent)' }}>
        <circle cx="13" cy="10.6" r="0.62" />
      </g>
      <g opacity=".58" strokeWidth="1.2">
        <path d="M13 5.55 19.5 9.3v7.4L13 20.45 6.5 16.7V9.3Z" />
      </g>
      {(p?.boy ?? 26) >= 32 && (
        <g opacity=".34" strokeWidth=".9">
          <circle cx="13" cy="13" r="8.15" strokeDasharray="1.5 2.6" />
          <path d="M13.74 10.34A6.05 6.05 0 0 1 16.02 11.11" strokeDasharray="1.2 1.6" />
          <path d="M13 1.7v.85M13 23.45v.85M22.35 7.7l.72-.42M22.35 18.3l.72.42M3.65 7.7l-.72-.42M3.65 18.3l-.72.42" />
        </g>
      )}
    </svg>
  );
}

/** Anahtar adıyla erişim — nav kayıtları ve kart kapakları için. */
export const IKONLAR: Record<string, (p?: { boy?: number }) => ReactElement> = {
  'genel-bakis': IkonGenelBakis,
  'santral': IkonSantral,
  'surecler': IkonSurecler,
  'bulgular': IkonBulgular,
  'riskler': IkonRiskler,
  'gorevler': IkonGorevler,
  'denetimler': IkonDenetimler,
  'envanter': IkonEnvanter,
  'projeler': IkonProjeler,
  'raporlar': IkonRaporlar,
  'aktivite': IkonAktivite,
  'regulasyonlar': IkonRegulasyonlar,
  'eslestirme': IkonEslestirme,
  'ice-aktarim': IkonIceAktarim,
  'tanimlar': IkonTanimlar,
  'yetkiler': IkonYetkiler,
  'saglik': IkonSaglik,
  'bildirim': IkonBildirim,
};
