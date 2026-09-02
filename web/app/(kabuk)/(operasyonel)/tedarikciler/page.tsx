import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import TedarikcilerIstemci from './TedarikcilerIstemci';
import { tedarikciEkranVerisi } from './veri';

export const metadata: Metadata = { title: 'Tedarikçiler' };

/* O16 · Tedarikçiler / üçüncü taraf — "hangi tedarikçi bizi açıkta bırakıyor?"
   (03-screens O16).

   Veri toplama ve KAPSAM KURALLARI `veri.ts` içindedir; bu dosya yalnız
   yetki kapısını açar ve sunumu çağırır. Ayrım bilinçli: kapsam sızıntısı
   JSX olmadan, doğrudan test edilebilsin diye (bkz. tests/tedarikci-oturum
   → "kapsam dışı santralin verisi ekrana sızmaz"). */

export default async function Sayfa() {
  const kullanici = await girisZorunlu();
  if (!izinVar(kullanici, 'envanter', 'okuma')) return <Yetkisiz rol="envanter okuma" />;

  const { tedarikciler, yazabilir, sertifikaUfku } = await tedarikciEkranVerisi(kullanici);

  return (
    <TedarikcilerIstemci
      tedarikciler={tedarikciler}
      yazabilir={yazabilir}
      sertifikaUfku={sertifikaUfku}
    />
  );
}
