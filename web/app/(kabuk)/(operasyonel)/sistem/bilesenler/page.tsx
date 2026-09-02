import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import Galeri from './Galeri';

export const metadata: Metadata = { title: 'Bileşen galerisi' };

/* Bileşen galerisi hiç kayıt okumaz, kapsamı yoktur; ama kabuğun içinde
   çizilir ve kabuk kurumun bilgi mimarisini gösterir. Oturumsuz açılması
   bu yüzden kapatıldı — kardeş ekranların kalıbı: `girisZorunlu()`. */

export default async function BilesenGalerisi() {
  await girisZorunlu();
  return <Galeri />;
}
