import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { Iskelet, Yetkisiz } from '@/components/atlas/temel';
import { cerceveKodlari, cerceveYukle } from '../veri';
import CerceveIstemci from './CerceveIstemci';

/* O2 · Çerçeve detayı — "bu regülasyon bizde nerede duruyor?" (03-screens O2)
   Rota parametresi regülasyon KODUDUR (EPDK-SYM), id değil: bağlantı
   paylaşılabilir olsun ve O1'den gelen sıçrama kod üzerinden kurulsun. */

export async function generateStaticParams() {
  const kodlar = await cerceveKodlari();
  return kodlar.map((cerceve) => ({ cerceve }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ cerceve: string }> },
): Promise<Metadata> {
  const { cerceve } = await params;
  return { title: `${decodeURIComponent(cerceve)} — Çerçeve detayı — Atlas` };
}

export default async function Sayfa({ params }: { params: Promise<{ cerceve: string }> }) {
  const kullanici = await girisZorunlu();
  if (!izinVar(kullanici, 'uyum', 'okuma')) return <Yetkisiz rol="uyum okuma" />;

  const { cerceve: kodHam } = await params;
  const kod = decodeURIComponent(kodHam);
  const veri = await cerceveYukle(kod, izinliTesisIdleri(kullanici, 'uyum'));
  if (!veri) notFound();

  /* Kapsam motoru yazma yetkisi `tanimlar/yazma` ister (eylemler2/tesis360). */
  const kapsamYazabilir = izinVar(kullanici, 'tanimlar', 'yazma');

  return (
    <Suspense fallback={<Yukleniyor ad={veri.ad} />}>
      <CerceveIstemci veri={veri} kapsamYazabilir={kapsamYazabilir} />
    </Suspense>
  );
}

function Yukleniyor({ ad }: { ad: string }) {
  return (
    <main style={{ minWidth: 0 }} aria-busy>
      <div className="baglam">
        <nav className="baglam-yol" aria-label="Konum"><span className="son">{ad}</span></nav>
      </div>
      <div style={{ padding: 'var(--s36) var(--gutter-op) 0', display: 'grid', gap: 'var(--s16)' }}>
        <Iskelet stil={{ width: 180, height: 12 }} />
        <Iskelet stil={{ width: 420, height: 34 }} />
        <Iskelet stil={{ width: 520, height: 34 }} />
      </div>
    </main>
  );
}
