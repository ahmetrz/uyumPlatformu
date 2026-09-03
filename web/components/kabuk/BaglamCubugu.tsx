'use client';
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════════════
   BAĞLAM ÇUBUĞU

   `a-assets`ın 52px kapsam çubuğunun ekran içi karşılığı: solda en fazla
   ÜÇ seviyelik kırıntı yolu (sarmaz; önce ORTA segment kısalır), sağda
   üretim tipine göre gruplanmış santral seçici.

   Prototipin kapsam çubuğu kabukta yaşar ve GRUP → SANTRAL zincirini
   söyler; bu bileşen aynı zinciri EKRAN içinde, kayıt derinliğinde
   sürdürür. */

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
    <div className={`ab-baglam${koyu ? ' koyu' : ''}`}>
      <nav className="yol" aria-label="Konum">
        {yol.map((k, i) => (
          <span key={`${k.ad}-${i}`} style={{ display: 'contents' }}>
            {i > 0 && <span className="ayrac" aria-hidden>/</span>}
            {k.yol && i < yol.length - 1 ? (
              <Link href={k.yol} className={i === 1 ? 'kisalt' : undefined}>{k.ad}</Link>
            ) : (
              <span className={i === yol.length - 1 ? 'son' : 'kisalt'}
                aria-current={i === yol.length - 1 ? 'location' : undefined}>{k.ad}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="sag">
        {sag}
        {secici && secici.length > 0 && (
          <div className="secici" ref={sarmal}>
            <button type="button" className="ab-dugme"
              aria-expanded={acik} aria-controls={menuId}
              onClick={() => setAcik((v) => !v)}>
              {seciciEtiketi} <span aria-hidden>▾</span>
            </button>
            {acik && (
              <div className="menu" id={menuId} role="menu">
                {tipler.map((tip) => (
                  <div key={tip} style={{ display: 'contents' }}>
                    <p className="kolonbas grup">{tip}</p>
                    {secici.filter((s) => s.tip === tip).map((s) => (
                      <Link key={s.id} href={s.yol} className="oge" role="menuitem"
                        onClick={() => setAcik(false)}>
                        {s.gorsel ? (
                          // eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım
                          <img src={s.gorsel} alt={`${s.ad} — ${s.tip}`} loading="lazy" decoding="async" />
                        ) : (
                          /* Fotoğrafı olmayan santral için sahte görsel
                             UYDURULMAZ: tipografik döşeme (harita §7-3). */
                          <span className="fotoyok"><span className="kolonbas">{s.tip}</span></span>
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
