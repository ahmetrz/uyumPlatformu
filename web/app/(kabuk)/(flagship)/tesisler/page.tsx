import { redirect } from 'next/navigation';

/* "Tesisler" listesi F2 Enerji Portföyü ekranıyla aynı soruyu yanıtlıyor
   ("hangi tesis beni istiyor"). İki liste tutmak yerine tek kanona
   yönlendiriyoruz; derin bağlantılar bozulmaz. */
export default function Tesisler() {
  redirect('/portfoy');
}
