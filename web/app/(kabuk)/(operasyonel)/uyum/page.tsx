import { Suspense } from 'react';
import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { cerceveleriYukle } from './veri';
import UyumIstemci from './UyumIstemci';
import MatrisIskeleti from './MatrisIskeleti';

export const metadata: Metadata = { title: 'Uyum kontrol odası' };

/* O1 · Uyum kontrol odası — "nerede uyumsuzuz?" (03-screens O1)

   Sunucu yalnız veriyi toplar; sunum ve seçim istemcide yaşar. Dört çerçevenin
   tamamı tek seferde yüklenir (kütük küçük) — böylece çerçeve değiştirici bir
   rota gidiş-dönüşü değil, anlık bir filtre olur ve statik dışa aktarımda da
   çalışır.

   `useSearchParams` (derin bağlantı: ?kontrol=…) istemcide okunur; Next bunu
   en yakın Suspense sınırına kadar istemcide render eder, bu yüzden iskelet
   GERÇEK santral adlarıyla önden basılır (03-screens O1 · loading). */

export default async function Sayfa() {
  const kullanici = await girisZorunlu();
  if (!izinVar(kullanici, 'uyum', 'okuma')) return <Yetkisiz rol="uyum okuma" />;

  const izinli = izinliTesisIdleri(kullanici, 'uyum');
  const cerceveler = await cerceveleriYukle(izinli);
  const yazabilir = izinVar(kullanici, 'denetim', 'yazma');

  const ilk = cerceveler.find((c) => c.satirlar.length > 0) ?? cerceveler[0];

  return (
    <Suspense
      fallback={
        <MatrisIskeleti
          eyebrow={ilk ? `${ilk.gorunenAd} · ${ilk.satirlar.length} tesis kapsamda` : 'UYUM'}
          adlar={ilk?.satirlar.map((s) => ({ ad: s.ad, alt: s.alt })) ?? []}
          kolonlar={ilk?.aileler.map((a) => a.kisa) ?? []}
        />
      }
    >
      <UyumIstemci cerceveler={cerceveler} yazabilir={yazabilir} />
    </Suspense>
  );
}
