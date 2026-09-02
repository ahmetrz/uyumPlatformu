import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import KanitlarIstemci from './KanitlarIstemci';
import { kanitEkranVerisi } from './veri';

export const metadata: Metadata = { title: 'Kanıt kütüphanesi' };

/* C21 · Kanıt kütüphanesi — "elimizde hangi belge var, taze mi, neyi
   karşılıyor?" (C defter yüzeyi).

   Tek tablo: kanıt · tip · tarih · bağlı kayıt · yükleyen. Satır seçilince
   sağ çekmece künyeyi ve bağlı bulgu/madde/santral kayıtlarına giden
   zinciri açar. Dosya yükleme bu sürümde YOKTUR; ekran bunu saklamaz.

   Santral kapsamı, satır tavanı ve bağlantısız sayımı `veri.ts`tedir
   (modül: `uyum`). */

export default async function Sayfa() {
  const k = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her kullanıcıyı ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(k, 'uyum')) return <Yetkisiz rol="uyum okuma" />;

  const veri = await kanitEkranVerisi(k);
  return (
    <KanitlarIstemci
      kanitlar={veri.kanitlar}
      toplam={veri.toplam}
      kapsamDisi={veri.kapsamDisi}
      maddeDurumlari={veri.maddeDurumlari}
      yazabilir={veri.yazabilir}
      kapsamli={veri.kapsamli}
    />
  );
}
