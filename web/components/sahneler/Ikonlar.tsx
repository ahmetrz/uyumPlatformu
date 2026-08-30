/* Ozalit kimliğinde navigasyon + eylem ikon seti.
   Elle çizilmiş 24px stroke ikonları — viewBox 0 0 24 24, stroke 1.75, round.
   Hepsi currentColor ile çizilir; renk kullanıldığı bağlamdan gelir
   (nav rayında --text-2, aktif öğede --accent). Derinlik detay opaklığıyla
   verilir (.4-.55). Durum renkleri kullanılmaz. Atölye: atolye/ikonlar. */

import type { ReactElement } from 'react';

type P = { boy?: number };

const kok = (p?: P) => ({
  width: p?.boy ?? 24,
  height: p?.boy ?? 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

/** Gösterge paneli — kadranlı gauge, ibre + kaide */
export function IkonGenelBakis(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M4.75 17.4A8 8 0 1 1 19.25 17.4" />
      <path d="M5.6 14H4.2M7.6 9.6 6.5 8.5M12 7.8V6.2M16.4 9.6l1.1-1.1M18.4 14h1.4" opacity=".45" />
      <circle cx="12" cy="14" r="1.5" />
      <path d="M13.2 12.3 15.3 9.2" />
      <path d="M8.4 20.6h7.2" opacity=".45" />
    </svg>
  );
}

/** Santral — soğutma kulesi, buhar ve zemin çizgisi */
export function IkonSantral(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M7.7 20.5C9.4 17.5 10.2 14.7 10.1 12 10 9.3 9.6 7.1 9.2 4.9" />
      <path d="M16.3 20.5C14.6 17.5 13.8 14.7 13.9 12 14 9.3 14.4 7.1 14.8 4.9" />
      <path d="M9.2 4.9q2.8-.9 5.6 0" />
      <path d="M10.4 12.4q1.6.55 3.2 0" opacity=".4" />
      <path d="M10.6 3.1c.4-.5.1-1.1.5-1.6M13 3.1c.4-.5.1-1.1.5-1.6" opacity=".45" />
      <path d="M4.6 20.5h14.8" opacity=".45" />
    </svg>
  );
}

/** Süreçler — çift oklu döngü halkası */
export function IkonSurecler(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M5 12a7 7 0 0 1 7-7 7.58 7.58 0 0 1 5.24 2.13L19 8.9" />
      <path d="M19 5v3.9h-3.9" />
      <path d="M19 12a7 7 0 0 1-7 7 7.58 7.58 0 0 1-5.24-2.13L5 15.1" />
      <path d="M8.9 15.1H5V19" />
      <circle cx="12" cy="12" r="1.4" opacity=".45" />
    </svg>
  );
}

/** Bulgular — ince ünlem üçgeni */
export function IkonBulgular(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M13.5 4.5a1.75 1.75 0 0 0-3 0L3.35 16.9a1.75 1.75 0 0 0 1.5 2.65h14.3a1.75 1.75 0 0 0 1.5-2.65Z" />
      <path d="M12 9.6v4" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

/** Riskler — elmas çerçeve, iç elmas ve odak noktası */
export function IkonRiskler(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M3.1 10.7a1.84 1.84 0 0 0 0 2.6l7.6 7.6a1.84 1.84 0 0 0 2.6 0l7.6-7.6a1.84 1.84 0 0 0 0-2.6l-7.6-7.6a1.84 1.84 0 0 0-2.6 0Z" />
      <path d="M12 8.4 15.6 12 12 15.6 8.4 12Z" opacity=".45" />
      <path d="M12 12h.01" />
    </svg>
  );
}

/** Görevler — onay kutusu listesi (biri tamam, biri beklemede) */
export function IkonGorevler(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <rect x="3.6" y="4" width="6" height="6" rx="1.6" />
      <path d="M5.4 7.1l1.2 1.2 2-2.5" />
      <path d="M13 7h7.4" />
      <rect x="3.6" y="14" width="6" height="6" rx="1.6" />
      <path d="M5.7 17h1.8" opacity=".5" />
      <path d="M13 17h7.4" />
    </svg>
  );
}

/** Denetimler — klipsli pano + tik */
export function IkonDenetimler(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M15.4 4.3h1.6A1.9 1.9 0 0 1 18.9 6.2V19a1.9 1.9 0 0 1-1.9 1.9H7A1.9 1.9 0 0 1 5.1 19V6.2A1.9 1.9 0 0 1 7 4.3h1.6" />
      <rect x="8.6" y="2.6" width="6.8" height="3.4" rx="1.2" />
      <path d="M9.1 13.4l2.1 2.1 3.9-4.5" />
    </svg>
  );
}

/** Envanter — üç bölmeli kabin, slot ve LED noktaları */
export function IkonEnvanter(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <rect x="5.6" y="3.2" width="12.8" height="17.6" rx="1.7" />
      <path d="M5.6 9.1h12.8M5.6 15h12.8" />
      <path d="M8.3 6.1h4.2M8.3 12h4.2M8.3 17.9h4.2" opacity=".5" />
      <path d="M15.9 6.1h.01M15.9 12h.01M15.9 17.9h.01" />
    </svg>
  );
}

/** Projeler — eksenli mini gantt */
export function IkonProjeler(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M3.3 3.4v17.2" opacity=".45" />
      <path d="M3.3 6.3h2.3M3.3 12h5.3M3.3 17.7h8.5" opacity=".4" />
      <rect x="6" y="4.7" width="7.2" height="3.2" rx="1.6" />
      <rect x="9" y="10.4" width="8.8" height="3.2" rx="1.6" />
      <rect x="12.2" y="16.1" width="8.4" height="3.2" rx="1.6" />
    </svg>
  );
}

/** Raporlar — kıvrık köşeli belge + çubuk grafik */
export function IkonRaporlar(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M13.7 3H7.1a1.8 1.8 0 0 0-1.8 1.8v14.4A1.8 1.8 0 0 0 7.1 21h9.8a1.8 1.8 0 0 0 1.8-1.8V8Z" />
      <path d="M13.7 3v3.4a1.5 1.5 0 0 0 1.5 1.5h3.5" opacity=".6" />
      <path d="M9.1 17.2v-3.1M12 17.2v-5.3M14.9 17.2v-1.9" />
    </svg>
  );
}

/** Aktivite — nabız çizgisi + ozalit kopya izi */
export function IkonAktivite(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M3 13.2h3.3l2.2-5.6 3.4 9.8 2.4-6.9 1.5 2.7H21" />
      <path d="M3 13.2h3.3l2.2-5.6 3.4 9.8 2.4-6.9 1.5 2.7H21" opacity=".3" transform="translate(0 3.6)" />
    </svg>
  );
}

/** Regülasyonlar — açık kitap, satır dokusu */
export function IkonRegulasyonlar(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M12 6.1C10.3 4.6 7.9 4 4.5 4.2v13.5c3.4-.2 5.8.4 7.5 1.9 1.7-1.5 4.1-2.1 7.5-1.9V4.2C16.1 4 13.7 4.6 12 6.1Z" />
      <path d="M12 6.1v13.4" opacity=".55" />
      <path d="M6.9 8.3c1.3 0 2.4.2 3.2.6M6.9 11.2c1.3 0 2.4.2 3.2.6M17.1 8.3c-1.3 0-2.4.2-3.2.6M17.1 11.2c-1.3 0-2.4.2-3.2.6" opacity=".4" />
    </svg>
  );
}

/** Eşleştirme — çift yönlü ok köprüsü, ortada bağ */
export function IkonEslestirme(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M4.2 8.3h13.6" />
      <path d="M14.7 5.2 17.8 8.3l-3.1 3.1" />
      <path d="M19.8 15.7H6.2" />
      <path d="M9.3 12.6 6.2 15.7l3.1 3.1" />
      <path d="M12 10.6v2.8" opacity=".4" />
    </svg>
  );
}

/** İçe aktarım — tepsiye inen ok */
export function IkonIceAktarim(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M12 3.2v9.9" />
      <path d="M8.4 9.6l3.6 3.6 3.6-3.6" />
      <path d="M4.4 14.8v3.5a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2v-3.5" />
      <path d="M8.9 17h6.2" opacity=".4" />
    </svg>
  );
}

/** Tanımlar — üç ayar kaydırıcısı */
export function IkonTanimlar(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M3.6 6.2h7.5M17.3 6.2h3.1" />
      <circle cx="14.2" cy="6.2" r="2.1" />
      <path d="M3.6 12h1.9M11.7 12h8.7" />
      <circle cx="8.6" cy="12" r="2.1" />
      <path d="M3.6 17.8h9.1M18.9 17.8h1.5" />
      <circle cx="15.8" cy="17.8" r="2.1" />
    </svg>
  );
}

/** Yetkiler — kalkan içinde anahtar */
export function IkonYetkiler(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M12 3 19.2 5.7v5.6c0 4.6-2.9 7.7-7.2 9.7-4.3-2-7.2-5.1-7.2-9.7V5.7Z" />
      <circle cx="9.6" cy="9.6" r="2" />
      <path d="M11.1 11.1 14.7 14.7" />
      <path d="M13.4 13.4l1.2-1.2" />
    </svg>
  );
}

/** Sağlık — kalp içinde nabız */
export function IkonSaglik(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M12 20.3c-4.5-3-7.5-5.9-7.5-9.5C4.5 7.9 6.3 6 8.7 6c1.4 0 2.6.7 3.3 1.8C12.7 6.7 13.9 6 15.3 6c2.4 0 4.2 1.9 4.2 4.8 0 3.6-3 6.5-7.5 9.5Z" />
      <path d="M7.9 12.1h2l1.1-2 1.7 3.9 1.1-1.9h2.4" />
    </svg>
  );
}

/** Bildirim — zil + tokmak */
export function IkonBildirim(p?: P): ReactElement {
  return (
    <svg {...kok(p)}>
      <path d="M6.1 8.6a5.9 5.9 0 0 1 11.8 0c0 4.1 1.2 5.5 2.4 6.8a1 1 0 0 1-.73 1.7H4.43a1 1 0 0 1-.73-1.7c1.2-1.3 2.4-2.7 2.4-6.8Z" />
      <path d="M10.2 19.3a1.8 1.8 0 0 0 3.6 0" />
    </svg>
  );
}

/** Marka işareti — altıgen içinde açık şalter (ayırıcı) sembolü.
    Bıçak ve pivot pirinç aksanla, açık kontak --glow ile işaretlenir. */
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
      aria-hidden
    >
      <path d="M13 2.7 22 7.9v10.2L13 23.3 4 18.1V7.9Z" />
      <path d="M13 5.5 19.5 9.25v7.5L13 20.5 6.5 16.75v-7.5Z" opacity=".3" />
      <path d="M13 6.6v3.1" />
      <path d="M13 10.2h.01" style={{ stroke: 'var(--glow)' }} />
      <path d="M13 16.5l3.7-5.1" style={{ stroke: 'var(--accent)' }} />
      <path d="M13 16.5h.01" style={{ stroke: 'var(--accent)' }} />
      <path d="M13 19.4v-2.9" />
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
