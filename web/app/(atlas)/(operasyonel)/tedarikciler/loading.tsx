import type { CSSProperties } from 'react';
import { Iskelet } from '@/components/atlas/temel';

/* Yükleme: gerçek kolon başlıklarıyla 7 iskelet satır (03-screens "loading:
   skeleton rows with real type labels"). Sayı uydurulmaz — metrik yerinde
   iskelet durur, `0` yazılmaz. */

const KOLONLAR = '22px minmax(0, 1fr) 190px 150px 150px 26px';

export default function Yukleniyor() {
  return (
    <main style={{ minWidth: 0 }}>
      <header className="ekran-bas">
        <div className="sol">
          <p className="t-eyebrow" style={{ margin: '0 0 var(--s10)' }}>Tedarikçiler</p>
          <Iskelet stil={{ display: 'block', height: 28, width: 280 }} />
        </div>
        <div className="metrikler">
          {['İzlenmeyen erişim', 'Sertifika doluyor', 'Destek bitiyor'].map((y) => (
            <div key={y} className="metrik">
              <Iskelet sinif="iskelet-metrik" stil={{ display: 'block' }} />
              <span className="yazi t-caption">{y}</span>
            </div>
          ))}
        </div>
      </header>

      <section className="ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
        <div className="tbl" style={{ '--kolonlar': KOLONLAR } as CSSProperties}>
          <div className="tbl-bas">
            <span />
            <span className="t-colhead">Tedarikçi</span>
            <span className="t-colhead">Santral</span>
            <span className="t-colhead">Uzak erişim</span>
            <span className="t-colhead">Sözleşme</span>
            <span />
          </div>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="tbl-satir" style={{ cursor: 'default' }}>
              <Iskelet stil={{ width: 10, height: 10 }} />
              <span>
                <Iskelet sinif="iskelet-satir" stil={{ display: 'block' }} />
                <Iskelet sinif="iskelet-alt" stil={{ display: 'block' }} />
              </span>
              <Iskelet stil={{ height: 11, width: 120 }} />
              <Iskelet stil={{ height: 11, width: 84 }} />
              <Iskelet stil={{ height: 11, width: 66 }} />
              <span />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
