import Kabuk from '@/components/kabuk/Kabuk';
import { kabukVerisi } from '@/components/kabuk/kabukVerisi';

/* Uygulama kabuğu. Yön (A tezgâh / C defter) ROTADAN türetilir — bu grup
   her ikisini birden barındırıyor ve Next rota grubu onları ayırmıyor.
   Seçim `components/kabuk/yonler.ts → yonSec` içinde, tek yerde.

   İş mantığına dokunulmadı: veri sözleşmeleri, RBAC ve kapsam aynı. */

export default async function OperasyonelYerlesim({ children }: { children: React.ReactNode }) {
  return <Kabuk veri={await kabukVerisi()}>{children}</Kabuk>;
}
