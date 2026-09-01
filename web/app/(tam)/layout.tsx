import Kabuk from '@/components/abacus/Kabuk';
import { kabukVerisi } from '@/components/abacus/kabukVerisi';

/* Tam ekran katmanı — kendi üst çubuğunu taşıyan, ray gerektirmeyen
   yüzeyler (enerji portföyü). Kabuk YÖNÜ ROTADAN seçer; `/portfoy` B
   yüzeyine düşer ve saha sekme çubuğunu alır.

   Eskiden burada `.atlas` token kapsamı vardı ve bu rota kabuğun tümüyle
   DIŞINDA kalıyordu: gezinme yoktu, kapsam çubuğu yoktu, ekran tek
   başına duruyordu (rota taraması yakaladı). */
export default async function TamYerlesim({ children }: { children: React.ReactNode }) {
  return <Kabuk veri={await kabukVerisi()}>{children}</Kabuk>;
}
