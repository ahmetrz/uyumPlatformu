import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import HaritaIstemci from './HaritaIstemci';
import { portfoyEkranVerisi } from '../portfoy/veri';

export const metadata: Metadata = { title: 'Santral haritası' };

/* A4 · Santral haritası — "santraller nerede ve hangi durumdalar?"

   VERİ PORTFÖYÜN AYNISIDIR: `portfoyEkranVerisi` yeniden kullanılır.
   Ayrı bir sorgu yazmak, kapsam kuralını (santral daraltması, modül
   seçimi, "bilinmeyen ≠ sıfır" sayaçları) ikinci kez uygulamak demekti;
   iki kopya er ya da geç ayrışır. Harita portföyün bir GÖRÜNÜMÜDÜR.

   Koordinat yazma yetkisi ayrı eksende: okuma `uyum`, konum düzeltme
   `tanimlar` (santral sicili). Yetkisi olmayan haritayı görür, düzeltemez. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!modulOkuyabilir(k, 'uyum')) return <Yetkisiz rol="uyum okuma" />;

  const veri = await portfoyEkranVerisi(k);
  return (
    <HaritaIstemci
      satirlar={veri.satirlar}
      yazabilir={izinVar(k, 'tanimlar', 'yazma') || izinVar(k, 'tanimlar', 'yazma', { tesisId: null, surecId: null })}
      kapsamli={veri.kapsamli}
    />
  );
}
