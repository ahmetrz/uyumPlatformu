import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import DokumanlarIstemci from './DokumanlarIstemci';
import { dokumanEkranVerisi } from './veri';

export const metadata: Metadata = { title: 'Belge kütüğü' };

/* C22 politika · C23 doküman kütüğü — "hangi kuralı hangi belge yazıyor,
   hangi kontrolün karşılığı yok?" (C defter yüzeyi).

   Kütük belgenin KÜNYESİNİ tutar: sahibi, sürümü, yürürlük tarihi, gözden
   geçirme takvimi ve karşıladığı kontroller. Dosyanın kendisi kurumun
   doküman sisteminde kalır — ürün bir DYS değildir ve bunu ekranda yazar.

   Kapsam kuralı `veri.ts`tedir: kurumsal (santral bağı olmayan) belge
   herkese görünür, santrale bağlı belge yalnız kapsam içindekilere. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!modulOkuyabilir(k, 'uyum')) return <Yetkisiz rol="uyum okuma" />;

  const veri = await dokumanEkranVerisi(k);
  return (
    <DokumanlarIstemci
      belgeler={veri.belgeler}
      toplam={veri.toplam}
      kapsamDisi={veri.kapsamDisi}
      kontroller={veri.kontroller}
      maddeSecenekleri={veri.maddeSecenekleri}
      tesisSecenekleri={veri.tesisSecenekleri}
      kisiler={veri.kisiler}
      mevcutKodlar={veri.mevcutKodlar}
      yazabilir={veri.yazabilir}
      onaylayabilir={veri.onaylayabilir}
      kapsamli={veri.kapsamli}
    />
  );
}
