import type { Metadata } from 'next';
import './globals.css';
import './kabuk.css';
import { an } from '@/lib/an';
import BakimEkrani from '@/components/kabuk/BakimEkrani';

/* Kök yerleşim yalnız belge iskeletini kurar. Kabuk (kapsam çubuğu, ray,
   sekme, künye) rota grubuna aittir ve YÖNÜ ROTADAN seçer
   (`components/kabuk/yonler.ts`). URL'ler rota gruplarına yansımaz.

   Tema anahtarı YOK: ürün tek temadır (koyu), `localStorage`tan tema
   okuyan eski betik hiçbir şey tarafından okunmadığı için kaldırıldı.

   Bakım anahtarı: `BAKIM_MODU=1` ile sunucu HER ekranın yerine bakım
   ekranını çizer (API rotaları etkilenmez — entegrasyonlar kendi
   sözleşmesiyle durdurulur). Statik yayında ortam değişkeni yoktur. */
const BAKIM = process.env.BAKIM_MODU === '1';

export const metadata: Metadata = {
  title: {
    default: 'Zorlu Enerji Yönetişim Platformu',
    template: '%s — Zorlu Enerji Yönetişim Platformu',
  },
  description:
    'Enerji üretimi BT/OT yönetişim ve uyum platformu: regülasyonlar, uyum süreçleri, bulgular, kanıtlar ve tam denetim izi.',
};

export default function KokYerlesim({ children }: { children: React.ReactNode }) {
  /* Ekranın "şimdi"si burada, SUNUCUDA belirlenir ve belgeye yazılır;
     istemci bileşenleri `lib/an.ts` üzerinden bunu okur, kendi saatine
     bakmaz. Göreli zaman değerleri (gecikme günü, tazelik, kalan ömür)
     iki tarafta aynı çıksın diye — aksi hâlde statik yayında React
     hidrasyonu kırılıyordu. Ayrıntı: `lib/an.ts`.

     `Date.now()` DEĞİL `an()` çağırıyoruz: sunucuda ikisi aynı şeyi
     döndürür, ama `an()` tarayıcıda belgeden okuduğu için bu bileşen
     yeniden çalışsa bile aynı sonucu verir — yani saf kalır. */
  const belgeAni = an();

  return (
    <html lang="tr" suppressHydrationWarning data-an={String(belgeAni)}>
      <body>{BAKIM ? <BakimEkrani /> : children}</body>
    </html>
  );
}
