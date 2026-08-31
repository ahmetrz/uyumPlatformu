import type { CSSProperties } from 'react';
import { Iskelet } from '@/components/atlas/temel';

/* 03-screens O1 · loading: "matrix grid with real plant names, cells as 11px
   dots". Boş kutu değil — ızgara ve satır etiketleri gerçek, yalnız hücreler
   beklemede. Böylece yükleme sırasında ekranın iskeleti oynamaz. */

export default function MatrisIskeleti({
  eyebrow, adlar, kolonlar,
}: {
  eyebrow: string;
  adlar: { ad: string; alt: string }[];
  kolonlar: string[];
}) {
  const stil = { '--kolon-sayisi': Math.max(kolonlar.length, 1) } as CSSProperties;
  return (
    <main style={{ minWidth: 0 }} aria-busy>
      <header className="ekran-bas">
        <div className="sol">
          <p className="t-eyebrow" style={{ margin: '0 0 var(--s10)' }}>{eyebrow}</p>
          <h1 className="t-screen" style={{ margin: 0 }}>Uyum kontrol odası</h1>
        </div>
      </header>

      <section className="ekran-govde">
        <div className="filtreler-atlas">
          <Iskelet stil={{ display: 'inline-block', width: 92, height: 28 }} />
          <Iskelet stil={{ display: 'inline-block', width: 64, height: 28 }} />
          <Iskelet stil={{ display: 'inline-block', width: 78, height: 28 }} />
        </div>

        <div className="mtx" style={{ ...stil, marginTop: 'var(--s22)' }} role="table">
          <div className="mtx-bas" role="row">
            <span className="t-colhead">Santral</span>
            {kolonlar.map((k) => <span key={k} className="t-colhead bslk">{k}</span>)}
          </div>
          {adlar.map((s) => (
            <div key={s.ad} className="mtx-satir" role="row" style={{ display: 'grid' }}>
              <span>
                <span className="mtx-ad">{s.ad}</span>
                <span className="mtx-alt">{s.alt}</span>
              </span>
              {kolonlar.map((k) => (
                <span key={k} className="mtx-hucre">
                  <Iskelet sinif="yuvarlak" stil={{ width: 11, height: 11 }} />
                </span>
              ))}
            </div>
          ))}
        </div>
        <p className="dip-not">Hücreye gelince özet · tıklayınca çekmece</p>
      </section>
    </main>
  );
}
