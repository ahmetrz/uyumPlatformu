import type { Metadata } from 'next';
import './globals.css';
import Ray from '@/components/Ray';
import Canlandir from '@/components/Canlandir';
import KomutPaleti from '@/components/KomutPaleti';

export const metadata: Metadata = {
  title: 'Şebeke Uyum Konsolu',
  description:
    'Enerji üretimi BT/OT uyum platformu: regülasyonlar, uyum süreçleri, bulgular, kanıtlar ve tam denetim izi.',
};

const temaBetigi = `try{var t=localStorage.getItem('tema');if(t)document.documentElement.dataset.theme=t;}catch(e){}`;

export default function KokYerlesim({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaBetigi }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- app router kök yerleşimi: tüm sayfalar için tek yükleme */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <div className="shell">
          <Ray />
          <div className="govde">{children}</div>
        </div>
        <Canlandir />
        <KomutPaleti />
      </body>
    </html>
  );
}
