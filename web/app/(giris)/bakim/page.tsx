import type { Metadata } from 'next';
import BakimEkrani from '@/components/kabuk/BakimEkrani';

/* `/bakim` — bakım ekranının rotası. (giris) grubunda: kabuk yok, oturum
   şartı yok, ray yok. Yük dengeleyici bakım sırasında buraya yönlendirir;
   uygulama içi anahtar için bkz. kök yerleşim (`BAKIM_MODU=1`). */
export const metadata: Metadata = { title: 'Bakım' };

export default function Bakim() {
  return <BakimEkrani />;
}
