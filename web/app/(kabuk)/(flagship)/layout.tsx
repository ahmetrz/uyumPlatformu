import Kabuk from '@/components/kabuk/Kabuk';
import { kabukVerisi } from '@/components/kabuk/kabukVerisi';

/* Flagship rotaları (`/`, `/tesisler/[id]`) B · Energy Intelligence
   kabuğunu alır: ray YOK, 56px yatay sekme çubuğu, fotoğrafik hero.
   Yön seçimi rotadan türer (yonler.ts). */

export default async function FlagshipYerlesim({ children }: { children: React.ReactNode }) {
  return <Kabuk veri={await kabukVerisi()}>{children}</Kabuk>;
}
