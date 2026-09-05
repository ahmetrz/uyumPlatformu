import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import KimlikIstemci from './KimlikIstemci';
import { kimlikEkranVerisi } from './veri';

export const metadata: Metadata = { title: 'Erişim incelemesi' };

/* O15 · Identity & Access Review — "kimin fazla yetkisi var?"
   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   Metrikler sabit yazılmaz: hepsi KimlikHesabi / ErisimAtamasi /
   ErisimIncelemesi üçlüsünden hesaplanır (bkz. mantik.ts) ve kaynağı
   `veri.ts`teki DARALTILMIŞ sorgudur.

   Kapı iki katmanlıdır: modül izni burada (`envanter/okuma`), santral
   kapsamı `veri.ts`te. Yalnız oturum kontrolü yeterli DEĞİLDİ — envanterde
   hiç okuma izni olmayan bir rol kurumdaki bütün ayrıcalıklı hesapları
   görebiliyordu. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her kullanıcıyı ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(k, 'envanter')) return <Yetkisiz rol="envanter okuma" />;

  const veri = await kimlikEkranVerisi(k);

  return (
    <KimlikIstemci
      hesaplar={veri.hesaplar}
      tesisler={veri.tesisler}
      kaynaklar={veri.kaynaklar}
      kapsamli={veri.kapsamli}
    />
  );
}
