import Kabuk from '@/components/kabuk/Kabuk';
import SinematikGiris from '@/components/giris/SinematikGiris';
import { DEMO } from '@/lib/demo';
import { kabukVerisi } from '@/components/kabuk/kabukVerisi';

/* Flagship rotaları (`/`, `/tesisler/[id]`) B · Energy Intelligence
   kabuğunu alır: ray YOK, 56px yatay sekme çubuğu, fotoğrafik hero.
   Yön seçimi rotadan türer (yonler.ts). */

export default async function FlagshipYerlesim({ children }: { children: React.ReactNode }) {
  const arayuz = <Kabuk veri={await kabukVerisi()}>{children}</Kabuk>;
  return DEMO ? <SinematikGiris sadeceAnaSayfa>{arayuz}</SinematikGiris> : arayuz;
}
