import { redirect } from 'next/navigation';
import { aktifKullanici } from '@/lib/auth';
import GirisFormu from './GirisFormu';

/* Giriş — oturum yok, kayıt yok, karar yok: uygulama kabuğunun dışındaki
   tek ekran. Atlas gramerine giydirildi ama yeri değişmedi (URL sabit).

   Yerleşim iki şeritli: solda fotoğrafik kimlik bandı, sağda 420px'lik
   form kolonu — çekmece genişliğiyle aynı ölçü. Kart yok, yuvarlak köşe
   yok, gölge yok; ayrımı kenar çizgisi ve yüzey tonu yapar. */

// Statik dışa aktarımda basePath elle eklenir (next/image kullanılmıyor).
const TEMEL = process.env.NEXT_PUBLIC_DEMO === '1' ? '/uyumPlatformu' : '';

export default async function Giris() {
  if (await aktifKullanici()) redirect('/');

  return (
    <div className="atlas" style={{
      minHeight: '100dvh', display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) var(--drawer-w)',
      background: 'var(--murekkep)',
    }}>
      <section style={{ position: 'relative', overflow: 'hidden',
        background: 'var(--panel2)', color: 'var(--murekkep)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım: optimizasyon kapalı */}
        <img
          src={`${TEMEL}/gorseller/jeotermal-genis.webp`}
          alt="Kızıldere jeotermal santrali"
          decoding="async"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.62 }}
        />
        <span aria-hidden style={{ position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(24,26,24,.52) 0%, rgba(24,26,24,.10) 44%, rgba(24,26,24,.72) 100%)' }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex',
          flexDirection: 'column', justifyContent: 'space-between',
          padding: 'var(--s40) var(--s44)' }}>
          <p className="etiket" style={{ margin: 0, color: 'rgba(246,244,238,.72)' }}>
            Energy Operations · Atlas
          </p>
          <div>
            <h1 className="ab-pano-basligi" style={{ margin: 0, maxWidth: 620 }}>
              Enerji üretiminde <b>BT/OT uyumu</b> tek kütükte
            </h1>
            <p style={{ margin: 'var(--s16) 0 0', maxWidth: 560,
              fontSize: 'var(--t-cell)', color: 'rgba(246,244,238,.76)' }}>
              Regülasyon maddeleri, santral kapsamı, bulgu ve kanıt zinciri ile
              değişmez denetim izi.
            </p>
          </div>
          <p className="etiket" style={{ margin: 0, color: 'rgba(246,244,238,.52)' }}>
            IT/OT governance · compliance · transformation
          </p>
        </div>
      </section>

      <main data-yuzey="saha" style={{ background: 'var(--panel2)',
        borderLeft: 'var(--bw-strong) solid var(--hr2)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'var(--s40) var(--s34)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Oturum</p>
        <h2 className="ab-bolum-basligi" style={{ margin: '0 0 var(--s26)' }}>Zorlu Uyum Konsolu</h2>
        <GirisFormu />
      </main>
    </div>
  );
}
