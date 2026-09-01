import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { Yetkisiz } from '@/components/abacus/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import AktiviteIstemci from './AktiviteIstemci';
import { aktiviteVerisi } from './veri';

export const metadata: Metadata = { title: 'Denetim izi — Abacus' };

/* Denetim izi — "kim neyi ne zaman değiştirdi?"
   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   Ekran SALT OKUNURDUR ve öyle kalmalıdır: AktiviteKaydi üzerinde veritabanı
   tetikleyicisi UPDATE ve DELETE'i reddeder (migration
   20260830190000_denetim_izi_degismezligi). Bu yüzden burada hiçbir yazma
   eylemi çağrılmaz.

   ERİŞİM KARARI ve gerekçesi `veri.ts`in başındadır — kısaca: modül kapısı
   `denetim/okuma` (denetçiyi ve yönetimi içeride tutar, operatör rollerini
   dışarıda bırakır), santral kapsamı ise kaydın işaret ettiği santral
   türetilebildiğinde uygulanır. Karar sessizce uygulanmasın diye orada
   uzun uzun yazılıdır. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her kullanıcıyı ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(k, 'denetim')) return <Yetkisiz rol="denetim okuma" />;

  const veri = await aktiviteVerisi(k);

  return (
    <AktiviteIstemci
      kayitlar={veri.kayitlar}
      simdi={veri.simdi}
      pencere={veri.pencere}
      toplam={veri.toplam}
      kapsamli={veri.kapsamli}
    />
  );
}
