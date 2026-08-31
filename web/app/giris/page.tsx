import { redirect } from 'next/navigation';
import { aktifKullanici } from '@/lib/auth';
import { HeroFotograf } from '@/components/Fotograf';
import GirisFormu from './GirisFormu';


export default async function Giris() {
  if (await aktifKullanici()) redirect('/');
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center',
      padding: 'var(--sp-6)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <HeroFotograf dosya="jeotermal" alt="Kızıldere jeotermal santrali" />
      </div>
      <div className="kart" style={{ width: 'min(400px, 100%)', position: 'relative' }}>
        <div className="kart-icerik" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="rail-marka" style={{ padding: 0 }}>
            <span className="isaret">ZU</span><span>Zorlu Uyum Konsolu</span>
          </div>
          <p className="mikro-etiket">IT/OT GOVERNANCE · COMPLIANCE · TRANSFORMATION</p>
          <GirisFormu />
        </div>
      </div>
    </main>
  );
}
