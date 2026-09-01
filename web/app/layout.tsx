import type { Metadata } from 'next';
import './globals.css';
import './abacus.css';
import { an } from '@/lib/an';

/* Kök yerleşim yalnız belge iskeletini kurar. Kabuk (kapsam çubuğu, ray,
   sekme, künye) rota grubuna aittir ve YÖNÜ ROTADAN seçer
   (`components/abacus/yonler.ts`). URL'ler rota gruplarına yansımaz. */

export const metadata: Metadata = {
  title: 'Zorlu Uyum Konsolu',
  description:
    'Enerji üretimi BT/OT uyum platformu: regülasyonlar, uyum süreçleri, bulgular, kanıtlar ve tam denetim izi.',
};

const temaBetigi = `try{var t=localStorage.getItem('tema');if(t)document.documentElement.dataset.theme=t;}catch(e){}`;

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaBetigi }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
