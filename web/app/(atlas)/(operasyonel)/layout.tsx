import Kabuk from '@/components/abacus/Kabuk';
import { kabukVerisi } from '@/components/abacus/kabukVerisi';

/* Abacus kabuğu. Yön (A tezgâh / C defter) ROTADAN türetilir — bu grup
   her ikisini birden barındırıyor ve Next rota grubu onları ayırmıyor.
   Seçim `components/abacus/yonler.ts → yonSec` içinde, tek yerde.

   İş mantığına dokunulmadı: veri sözleşmeleri, RBAC ve kapsam aynı. */

export default async function OperasyonelYerlesim({ children }: { children: React.ReactNode }) {
  return <Kabuk veri={await kabukVerisi()}>{children}</Kabuk>;
}
