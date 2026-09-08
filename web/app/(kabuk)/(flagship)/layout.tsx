import Kabuk from '@/components/kabuk/Kabuk';
import SinematikGiris from '@/components/giris/SinematikGiris';
import { DEMO } from '@/lib/demo';
import { kabukVerisi } from '@/components/kabuk/kabukVerisi';

/* Flagship rotaları (`/`, `/tesisler/[id]`) B · Energy Intelligence
   kabuğunu alır: ray YOK, 56px yatay sekme çubuğu, fotoğrafik hero.
   Yön seçimi rotadan türer (yonler.ts). */

export default async function FlagshipYerlesim({ children }: { children: React.ReactNode }) {
  /* Veri BİR KEZ okunur: `kabukVerisi()` iki kez çağrılsaydı açılışın
     gördüğü sektör listesiyle kabuğunki ayrışabilirdi. */
  const veri = await kabukVerisi();
  const arayuz = <Kabuk veri={veri}>{children}</Kabuk>;
  return DEMO
    ? (
      <SinematikGiris sadeceAnaSayfa
        sektorler={veri.sektorler.map(({ id, kod, ad }) => ({ id, kod, ad }))}>
        {arayuz}
      </SinematikGiris>
      )
    : arayuz;
}
