import type { Metadata } from 'next';
import Galeri from './Galeri';

export const metadata: Metadata = { title: 'Bileşen galerisi' };

export default function BilesenGalerisi() {
  return <Galeri />;
}
