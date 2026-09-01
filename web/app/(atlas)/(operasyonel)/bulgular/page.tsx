import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { Yetkisiz } from '@/components/abacus/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import BulgularIstemci from './BulgularIstemci';
import { bulguEkranVerisi } from './veri';

export const metadata: Metadata = { title: 'Bulgu & CAPA — Atlas' };

/* O7 · Bulgu & Düzeltici Aksiyon — "nerede takıldı?" (03-screens O7).
   Tek 5 kolonlu tablo soldan sağa bir ilerleme gibi okunur:
   bulgu · aksiyon · sahip · son tarih · doğrulama.
   Yerleşim kabuğu (.atlas atlas-kabuk + Ray) üst katmandan gelir; bu sayfa
   yalnız <main> ve seçim varsa <aside class="cekmece"> render eder.

   Santral kapsamı, satır tavanı ve metrik sayımları `veri.ts`tedir
   (modül: `uyum`). */

export default async function Sayfa() {
  const k = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her kullanıcıyı ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(k, 'uyum')) return <Yetkisiz rol="uyum okuma" />;

  const veri = await bulguEkranVerisi(k);
  return (
    <BulgularIstemci
      bulgular={veri.bulgular}
      toplam={veri.toplam}
      metrikler={veri.metrikler}
      kapsamli={veri.kapsamli}
    />
  );
}
