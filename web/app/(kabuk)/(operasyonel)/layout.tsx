import Kabuk from '@/components/kabuk/Kabuk';
import { kabukVerisi } from '@/components/kabuk/kabukVerisi';

/* Uygulama kabuğu — tek kabuk. Alan ve yoğunluk ROTADAN türetilir
   (`components/kabuk/yonler.ts → alanSec / yogunlukSec`), tek yerde.

   İş mantığına dokunulmadı: veri sözleşmeleri, RBAC ve kapsam aynı. */

export default async function OperasyonelYerlesim({ children }: { children: React.ReactNode }) {
  return <Kabuk veri={await kabukVerisi()}>{children}</Kabuk>;
}
