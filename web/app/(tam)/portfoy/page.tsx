import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { Yetkisiz } from '@/components/abacus/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import Portfoy from './Portfoy';
import { portfoyEkranVerisi } from './veri';

export const metadata: Metadata = { title: 'Enerji portföyü' };

/* F2 · Enerji Portföyü — "hangi santral beni istiyor ve nasıl bir santral bu?"
   Kapsam yalnız ÜRETİM portföyüdür; ZES / OEDAŞ / OEPSAŞ platform dışıdır ve
   veriye de girmez (README §Scope).

   Santral kapsamı `veri.ts`te uygulanır (modül: `uyum`). */

export default async function Sayfa() {
  const k = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her kullanıcıyı ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(k, 'uyum')) return <Yetkisiz rol="uyum okuma" />;

  const veri = await portfoyEkranVerisi(k);
  return (
    <Portfoy
      satirlar={veri.satirlar}
      toplamGucMw={veri.toplamGucMw}
      kapsamli={veri.kapsamli}
    />
  );
}
