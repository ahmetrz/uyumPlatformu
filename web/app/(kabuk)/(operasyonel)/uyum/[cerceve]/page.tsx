import { Suspense } from 'react';
import { STATIK_DEMO } from '@/lib/statikDerleme';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { Iskelet, Yetkisiz } from '@/components/kabuk/temel';
import { cerceveKodlari, cerceveYukle } from '../veri';
import CerceveIstemci from './CerceveIstemci';

/* O2 · Çerçeve detayı — "bu regülasyon bizde nerede duruyor?" (03-screens O2)
   Rota parametresi regülasyon KODUDUR (EPDK-SYM), id değil: bağlantı
   paylaşılabilir olsun ve O1'den gelen sıçrama kod üzerinden kurulsun. */

/* PARAMETRE LİSTESİ SUNUCU DERLEMESİNDE HİÇ DIŞA AKTARILMAZ (P7 · ölçüldü).

   `generateStaticParams` VARSA Next rotayı SSG sayar. Sunucu derlemesinde
   liste boş döndürmek YETMEZ: Next rotayı hiç render etmeden "statik"
   kabul eder ve istek geldiğinde on-demand statik üretim dener; orada
   `cookies()` yasaktır ve sayfa 500 döner. Ölçüldü (compose duman kapısı):
   oturumsuz `/tesisler/x` 307 yerine 500 veriyordu — KİMLİK KAPISI bir
   sunucu hatasına dönüşmüştü.

   `force-dynamic` bunu çözer ama statik demoyu BOZAR: `output: 'export'`
   sunucusuzdur ve o kipi reddeder (ölçüldü, CI · `demo:build`). Rota
   kesiti ayarları literal olmak zorunda olduğu için koşullu da yazılamaz.

   Çözüm işlevin KENDİSİNİ koşullu dışa aktarmaktır: `generateStaticParams`
   bir yapılandırma literali değil, derlenmiş modülden okunan bir İŞLEVDİR;
   yoksa rota dinamiktir. Sunucu derlemesinde `undefined`, statik demoda
   gerçek işlev. Ölçüldü: sunucu derlemesinde rota `ƒ`, demo dışa
   aktarımında parametreler üretiliyor. */
async function parametreler() {
  const kodlar = await cerceveKodlari();
  return kodlar.map((cerceve) => ({ cerceve }));
}
export const generateStaticParams = STATIK_DEMO ? parametreler : undefined;

export async function generateMetadata(
  { params }: { params: Promise<{ cerceve: string }> },
): Promise<Metadata> {
  const { cerceve } = await params;
  return { title: `${decodeURIComponent(cerceve)} — Çerçeve detayı` };
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
    <main data-yuzey="defter" style={{ minWidth: 0 }} aria-busy>
      <div className="ab-baglam">
        <nav className="yol" aria-label="Konum"><span className="son">{ad}</span></nav>
      </div>
      <div style={{ padding: 'var(--s36) var(--gutter-op) 0', display: 'grid', gap: 'var(--s16)' }}>
        <Iskelet stil={{ width: 180, height: 12 }} />
        <Iskelet stil={{ width: 420, height: 34 }} />
        <Iskelet stil={{ width: 520, height: 34 }} />
      </div>
    </main>
  );
}
