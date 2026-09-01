import type { Metadata } from 'next';
import './globals.css';
import './atlas.css';
import './abacus.css';

/* Kök yerleşim yalnız belge iskeletini kurar. Kabuk (ray, üst çubuk) rota
   grubuna aittir: (ozalit) eski kabuğu, (atlas) yeni tasarım kabuğunu verir.
   Ekranlar Atlas'a taşındıkça klasörleri (ozalit)'ten (atlas)'a geçer;
   URL'ler değişmez (rota grupları yola yansımaz). */

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
