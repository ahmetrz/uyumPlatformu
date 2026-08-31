import { redirect } from 'next/navigation';

/* "Santraller" listesi F2 Enerji Portföyü ekranıyla aynı soruyu yanıtlıyor
   ("hangi santral beni istiyor"). İki liste tutmak yerine tek kanona
   yönlendiriyoruz; derin bağlantılar bozulmaz. */
export default function Santraller() {
  redirect('/portfoy');
}
