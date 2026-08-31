'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* NavRail — 02-components §1.
   Düz liste, operasyonel katmanda grup başlığı YOK. Aynı anda tek aktif öğe.
   Sayaç yalnız bir kararı değiştiren yerde; gecikmiş varsa state/critical. */

export type RayOgesi = {
  ad: string;
  yol: string;
  sayi?: number | null;
  kritik?: boolean;
};

/* Flagship katmanı — kısa liste + ayak (efsane veya fotoğraf şeridi) */
export const RAY_FLAGSHIP: RayOgesi[] = [
  { ad: 'Bugün', yol: '/' },
  // Tasarımın rayında "Enerji portföyü" ve "Santraller" ayrı öğeler; bu
  // uygulamada ikisi de aynı ekranı (F2) açtığı için tek öğede birleştirildi.
  // Kayıtlı sapma: iki aktif öğe göstermemek için (02-components §1).
  { ad: 'Enerji portföyü', yol: '/portfoy' },
  { ad: 'Uyum', yol: '/uyum' },
  { ad: 'Risk', yol: '/riskler' },
  { ad: 'Denetim', yol: '/denetimler' },
  { ad: 'Yönetim', yol: '/yonetim' },
];

/* Operasyonel katman — 11 tezgâh ekranı */
export const RAY_OPERASYONEL: RayOgesi[] = [
  { ad: 'Uyum', yol: '/uyum' },
  { ad: 'Risk', yol: '/riskler' },
  { ad: 'Denetim', yol: '/denetimler' },
  { ad: 'Bulgu & CAPA', yol: '/bulgular' },
  { ad: 'Projeler', yol: '/projeler' },
  { ad: 'Varlıklar', yol: '/envanter' },
  { ad: 'Topoloji', yol: '/topoloji' },
  { ad: 'Ömür', yol: '/omur' },
  { ad: 'Yedek & DR', yol: '/yedekleme' },
  { ad: 'Erişim', yol: '/kimlik' },
  { ad: 'Tedarikçiler', yol: '/tedarikciler' },
  { ad: 'Olaylar', yol: '/olaylar' },
];

export type RayAyagi =
  | { tip: 'efsane'; bantlar: string[]; yazi: string }
  | { tip: 'serit'; gorsel: string; alt: string; yazi: string }
  | null;

function aktifMi(yol: string, patika: string): boolean {
  if (yol === '/') return patika === '/';
  return patika === yol || patika.startsWith(yol + '/');
}

export default function Ray({
  ogeler,
  ayak = null,
  sayilar,
}: {
  ogeler: RayOgesi[];
  ayak?: RayAyagi;
  /** Rota → sayaç. Sunucudan gelir; sıfır/undefined ise sayaç gösterilmez. */
  sayilar?: Record<string, { sayi: number; kritik?: boolean }>;
}) {
  const patika = usePathname() ?? '/';

  return (
    <nav className="atlas-ray" aria-label="Ana menü">
      <Link href="/" className="ray-marka">
        <span className="ad">Energy Operations</span>
        <span className="alt">Atlas</span>
      </Link>

      {ogeler.map((o) => {
        const aktif = aktifMi(o.yol, patika);
        const s = sayilar?.[o.yol] ?? (o.sayi != null ? { sayi: o.sayi, kritik: o.kritik } : null);
        return (
          <Link
            key={o.yol}
            href={o.yol}
            className="ray-link"
            aria-current={aktif ? 'page' : undefined}
          >
            <span className="etiket">{o.ad}</span>
            {s && s.sayi > 0 && (
              <span className={`sayi${s.kritik ? ' kritik' : ''}`}>{s.sayi}</span>
            )}
          </Link>
        );
      })}

      {ayak && (
        <div className="ray-ayak">
          {ayak.tip === 'efsane' ? (
            <div className="ray-efsane">
              <p className="t-colhead" style={{ margin: '0 0 var(--s10)' }}>Grup kesiti</p>
              {ayak.bantlar.map((renk, i) => (
                <div key={i} className="bant" style={{ background: renk }} />
              ))}
              <p className="t-colhead" style={{ margin: 'var(--s10) 0 0', lineHeight: 1.6 }}>
                {ayak.yazi}
              </p>
            </div>
          ) : (
            <div className="ray-serit">
              {/* eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım: optimizasyon kapalı */}
              <img src={ayak.gorsel} alt={ayak.alt} loading="lazy" decoding="async" />
              <span className="perde" aria-hidden />
              <span className="yazi">{ayak.yazi}</span>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
