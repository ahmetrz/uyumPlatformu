import type { CSSProperties } from 'react';
import { Iskelet } from '@/components/abacus/temel';

/* Yükleme: gerçek kolon başlıklarıyla 7 iskelet satır (03-screens "loading:
   skeleton rows with real type labels"). Sayı uydurulmaz — metrik yerinde
   iskelet durur, `0` yazılmaz. */

const KOLONLAR = '22px minmax(0, 1fr) 190px 150px 150px 26px';

export default function Yukleniyor() {
  return (
    <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
      <header className="ab-lede">
        <div className="sol">
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Tedarikçiler</p>
          <Iskelet stil={{ display: 'block', height: 28, width: 280 }} />
        </div>
        <div className="ab-olcutler">
          {['İzlenmeyen erişim', 'Sertifika doluyor', 'Destek bitiyor'].map((y) => (
            <div key={y} className="">
              <Iskelet sinif="iskelet-metrik" stil={{ display: 'block' }} />
              <span className="yazi etiket">{y}</span>
            </div>
          ))}
        </div>
      </header>

      <section className="ab-ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
        <div className="ab-tablo" style={{ '--kolonlar': KOLONLAR } as CSSProperties}>
          <div className="bas">
            <span />
            <span className="kolonbas">Tedarikçi</span>
            <span className="kolonbas">Santral</span>
            <span className="kolonbas">Uzak erişim</span>
            <span className="kolonbas">Sözleşme</span>
            <span />
          </div>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="satir" style={{ cursor: 'default' }}>
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
