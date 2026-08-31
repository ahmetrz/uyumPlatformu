import type { Metadata } from 'next';
import './globals.css';
import './atlas.css';
import Ray from '@/components/Ray';
import Canlandir from '@/components/Canlandir';
import KomutPaleti from '@/components/KomutPaleti';

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
