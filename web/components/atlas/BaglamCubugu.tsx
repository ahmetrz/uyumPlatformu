'use client';
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';

/* ContextNav — 02-components §2.
   Breadcrumb en fazla ÜÇ seviye; sarmaz, önce ORTA segment kısaltılır.
   Sağda varlık seçici: üretim tipine göre gruplanmış santral thumbnail'ları. */

export type Kirinti = { ad: string; yol?: string };

export type SeciciOgesi = {
  id: string;
  ad: string;
  alt: string;          // kapasite / il — 9.5px mono
  tip: string;          // JES / HES / RES / GES …
  gorsel: string | null; // yoksa tipografik döşeme
  yol: string;
};

/** Üç seviyeye indirger: ilk, (kısaltılmış) orta, son. */
function ucSeviye(kirintiler: Kirinti[]): Kirinti[] {
  if (kirintiler.length <= 3) return kirintiler;
  return [kirintiler[0], { ad: '…' }, kirintiler[kirintiler.length - 1]];
}

export default function BaglamCubugu({
  kirintiler,
  secici,
  seciciEtiketi = 'Santral',
  koyu = false,
  sag,
}: {
  kirintiler: Kirinti[];
  secici?: SeciciOgesi[];
  seciciEtiketi?: string;
  koyu?: boolean;
  /** 1–2 bağlamsal eylem */
  sag?: React.ReactNode;
}) {
  const [acik, setAcik] = useState(false);
  const sarmal = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const yol = ucSeviye(kirintiler);

  useEffect(() => {
    if (!acik) return;
    const disariTik = (e: MouseEvent) => {
      if (sarmal.current && !sarmal.current.contains(e.target as Node)) setAcik(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAcik(false); };
    document.addEventListener('mousedown', disariTik);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', disariTik);
      document.removeEventListener('keydown', esc);
    };
  }, [acik]);

  const tipler = [...new Set((secici ?? []).map((s) => s.tip))];

  return (
    <div className={`baglam${koyu ? ' koyu' : ''}`}>
      <nav className="yol" aria-label="Konum">
        {yol.map((k, i) => (
          <span key={`${k.ad}-${i}`} style={{ display: 'contents' }}>
            {i > 0 && <span className="ayrac" aria-hidden>/</span>}
            {k.yol && i < yol.length - 1 ? (
              <Link href={k.yol} className={i === 1 ? 'kisalt' : undefined}>{k.ad}</Link>
            ) : (
              <span className={i === yol.length - 1 ? 'son' : 'kisalt'}
                aria-current={i === yol.length - 1 ? 'page' : undefined}>{k.ad}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="sag">
        {sag}
        {secici && secici.length > 0 && (
          <div className="secici" ref={sarmal}>
            <button
              type="button"
              className="etiket"
              aria-expanded={acik}
              aria-controls={menuId}
              onClick={() => setAcik((v) => !v)}
              style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0,
                color: 'inherit', font: 'inherit', letterSpacing: 'var(--tr-label)' }}
            >
              {seciciEtiketi} <span aria-hidden>▾</span>
            </button>
            {acik && (
              <div className="menu" id={menuId} role="menu">
                {tipler.map((tip) => (
                  <div key={tip} style={{ display: 'contents' }}>
                    <p className="kolonbas grup" style={{ margin: 'var(--s6) 0 0' }}>{tip}</p>
                    {secici.filter((s) => s.tip === tip).map((s) => (
                      <Link key={s.id} href={s.yol} className="oge" role="menuitem"
                        onClick={() => setAcik(false)}>
                        {s.gorsel ? (
                          // eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım
                          <img src={s.gorsel} alt={`${s.ad} — ${s.tip}`} loading="lazy" decoding="async" />
                        ) : (
                          /* Fotoğrafı olmayan santral tipografik döşeme alır (05 §1.6) */
                          <span style={{ display: 'grid', placeItems: 'center', height: 92,
                            background: 'var(--panel2)', color: 'var(--murekkep)' }}>
                            <span className="kolonbas" style={{ color: 'rgba(246,244,238,.72)' }}>{s.tip}</span>
                          </span>
                        )}
                        <span className="ad">{s.ad}</span>
                        <span className="alt">{s.alt}</span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
