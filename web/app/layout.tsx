import type { Metadata } from 'next';
import './globals.css';
import './abacus.css';

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
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaBetigi }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
