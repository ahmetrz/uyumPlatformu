import Kabuk from '@/components/kabuk/Kabuk';
import { kabukVerisi } from '@/components/kabuk/kabukVerisi';

/* Flagship rotaları (`/`, `/tesisler/[id]`) doğrudan uygulama kabuğunu açar.
   Sinematik açılış ve scroll kontrollü giriş kaldırılmıştır. */

export default async function FlagshipYerlesim({ children }: { children: React.ReactNode }) {
  return <Kabuk veri={await kabukVerisi()}>{children}</Kabuk>;
}
