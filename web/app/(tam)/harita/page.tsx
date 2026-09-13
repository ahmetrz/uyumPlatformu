import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { kapsamAnahtari, kapsamSozlugu } from '@/lib/dil/sozlukOku';
import { tBas } from '@/lib/dil/terimler';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import HaritaIstemci from './HaritaIstemci';
import { portfoyEkranVerisi } from '../portfoy/veri';

/* Sekme başlığı SÖZLÜKTEN. Sabit `metadata` kiracı bağlamını bekleyemezdi
   (R0-8); `generateMetadata` async olabildiği için burada böyle bir sınır
   YOK — bağlam kullanıcının kapsamıdır. Aynı desen
   `tesisler/[id]/page.tsx`te kayıt bazlı kullanılıyor. */
export async function generateMetadata(): Promise<Metadata> {
  const k = await girisZorunlu();
  const sozluk = await kapsamSozlugu(kapsamAnahtari(izinliTesisIdleri(k, 'uyum')));
  return { title: `${tBas(sozluk, 'tesis')} haritası` };
}

/* A4 · Tesis haritası — "tesisler nerede ve hangi durumdalar?"

   VERİ PORTFÖYÜN AYNISIDIR: `portfoyEkranVerisi` yeniden kullanılır.
   Ayrı bir sorgu yazmak, kapsam kuralını (tesis daraltması, modül
   seçimi, "bilinmeyen ≠ sıfır" sayaçları) ikinci kez uygulamak demekti;
   iki kopya er ya da geç ayrışır. Harita portföyün bir GÖRÜNÜMÜDÜR.

   Koordinat yazma yetkisi ayrı eksende: okuma `uyum`, konum düzeltme
   `tanimlar` (tesis sicili). Yetkisi olmayan haritayı görür, düzeltemez. */

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
