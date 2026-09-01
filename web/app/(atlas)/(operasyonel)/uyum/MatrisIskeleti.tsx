import type { CSSProperties } from 'react';
import { Iskelet } from '@/components/abacus/temel';

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
    <main data-yuzey="defter" style={{ minWidth: 0 }} aria-busy>
      <header className="ab-lede">
        <div className="sol">
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>{eyebrow}</p>
          <h1 className="ab-ekran-basligi" style={{ margin: 0 }}>Uyum kontrol odası</h1>
        </div>
      </header>

      <section className="ab-ekran-govde">
        <div className="ab-suzgec">
          <Iskelet stil={{ display: 'inline-block', width: 92, height: 28 }} />
          <Iskelet stil={{ display: 'inline-block', width: 64, height: 28 }} />
          <Iskelet stil={{ display: 'inline-block', width: 78, height: 28 }} />
        </div>

        <div className="ab-matris" style={{ ...stil, marginTop: 'var(--s22)' }} role="table">
          <div className="bas" role="row">
            <span className="kolonbas">Santral</span>
            {kolonlar.map((k) => <span key={k} className="kolonbas kesik">{k}</span>)}
          </div>
          {adlar.map((s) => (
            <div key={s.ad} className="satir" role="row" style={{ display: 'grid' }}>
              <span>
                <span className="baslik">{s.ad}</span>
                <span className="alt">{s.alt}</span>
              </span>
              {kolonlar.map((k) => (
                <span key={k} className="hucre">
                  <Iskelet sinif="yuvarlak" stil={{ width: 11, height: 11 }} />
                </span>
              ))}
            </div>
          ))}
        </div>
        <p className="ab-dip">Hücreye gelince özet · tıklayınca çekmece</p>
      </section>
    </main>
  );
}
