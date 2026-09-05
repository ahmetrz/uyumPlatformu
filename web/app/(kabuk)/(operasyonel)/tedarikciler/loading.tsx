import { Iskelet } from '@/components/kabuk/temel';

/* Yükleme: gerçek kolon başlıklarıyla 7 iskelet satır (03-screens "loading:
   skeleton rows with real type labels"). Sayı uydurulmaz — metrik yerinde
   iskelet durur, `0` yazılmaz. */

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
        <div className="ab-vt-sar" aria-busy="true">
          <table className="ab-vt" aria-label="Tedarikçi kütüğü · yükleniyor">
            <thead>
              <tr>
                {['Tedarikçi', 'Santral', 'Uzak erişim', 'Sözleşme'].map((b) => (
                  <th key={b} scope="col"><span className="kolonbas">{b}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 7 }, (_, i) => (
                <tr key={i} className="iskelet">
                  <td>
                    <Iskelet sinif="iskelet-satir" stil={{ display: 'block' }} />
                    <Iskelet sinif="iskelet-alt" stil={{ display: 'block' }} />
                  </td>
                  <td><Iskelet stil={{ height: 11, width: 120 }} /></td>
                  <td><Iskelet stil={{ height: 11, width: 84 }} /></td>
                  <td><Iskelet stil={{ height: 11, width: 66 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
