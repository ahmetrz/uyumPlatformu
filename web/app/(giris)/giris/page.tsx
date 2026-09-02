import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { aktifKullanici } from '@/lib/auth';
import GirisFormu from './GirisFormu';
import { TEMEL } from '@/lib/demo';
import { guvenliHedef, VARSAYILAN_HEDEF } from './mantik';

export const metadata: Metadata = { title: 'Giriş' };

/* Giriş — oturum yok, kayıt yok, karar yok: uygulama kabuğunun dışındaki
   tek ekran. Kabuk çizilmez ama YÜZEY kabuğundur: `.ab[data-yon='b']`
   sarmalayıcısı saha yönünün paletini ve tipografisini getirir — `yonSec`
   de `/giris`i B'ye düşürüyor, iki karar ayrışmasın.

   Yerleşim iki şeritli: solda fotoğrafik kimlik bandı, sağda 400px'lik
   form kolonu — detay panelinin genişliğiyle aynı ölçü. Kart yok,
   yuvarlak köşe yok, gölge yok; ayrımı kenar çizgisi ve yüzey tonu yapar.

   `?next=/yol` (E40): giriş başarınca `next` hedefine dönülür. BUGÜN bu
   parametreyi üreten bir yönlendirme YOK — `girisZorunlu()` çıplak /giris'e
   atar (sunucu bileşeni isteğin yolunu bilmez; middleware/proxy kurulmadı).
   Kapı, elle yazılan ya da ileride bir proxy'nin üreteceği bağ için hazır. Hedef hem burada (zaten oturumu olan
   ziyaretçi için) hem eylemde (`girisYap`) aynı kuralla süzülür —
   yalnız site içi göreli yol, aksi '/'. Süzülmüş hâli forma verilir ki
   dip nottaki "girişten sonra … dönülür" cümlesi yalan söylemesin. */

export default async function Giris({ searchParams }: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const hedef = guvenliHedef((await searchParams).next);
  if (await aktifKullanici()) redirect(hedef);

  return (
    <div className="ab" data-yon="b" style={{
      minHeight: '100dvh', display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) var(--drawer-w)',
    }}>
      <section style={{ position: 'relative', overflow: 'hidden',
        background: 'var(--panel2)', color: 'var(--murekkep)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım: optimizasyon kapalı */}
        <img
          src={`${TEMEL}/gorseller/jeotermal-genis.webp`}
          alt="Kızıldere jeotermal santrali"
          decoding="async"
          fetchPriority="high"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.62 }}
        />
        <span aria-hidden style={{ position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(24,26,24,.52) 0%, rgba(24,26,24,.10) 44%, rgba(24,26,24,.72) 100%)' }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex',
          flexDirection: 'column', justifyContent: 'space-between',
          padding: 'var(--s40) var(--s44)' }}>
          <p className="etiket" style={{ margin: 0, color: 'rgba(246,244,238,.72)' }}>
            Zorlu Enerji Yönetişim Platformu
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
            BT/OT yönetişim · uyum · dönüşüm
          </p>
        </div>
      </section>

      <main style={{ background: 'var(--panel2)',
        borderLeft: 'var(--bw-strong) solid var(--hr2)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'var(--s40) var(--s34)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Kurum hesabı</p>
        <h2 className="ab-bolum-basligi" style={{ margin: '0 0 var(--s26)' }}>Oturum aç</h2>
        <GirisFormu next={hedef === VARSAYILAN_HEDEF ? null : hedef} />
      </main>
    </div>
  );
}
