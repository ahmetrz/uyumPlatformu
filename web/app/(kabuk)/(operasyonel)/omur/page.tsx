import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import OmurIstemci from './OmurIstemci';
import { omurEkranVerisi } from './veri';

export const metadata: Metadata = { title: 'Ömür yönetimi' };

/* O13 · EOL / EOS & Ömür yönetimi — "önce neyi değiştiriyoruz?"
   Yerleşim kabuğu (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir;
   bu sayfa yalnız <main> ve seçim varsa <aside class="cekmece"> üretir.

   Ömür kuyruğu tek sorguda kurulur: varlığın kendi tarihleri + üstündeki
   yazılım ürünlerinin EOS'u + risk→kontrol (telafi edici kontrol) +
   risk→proje / varlık→proje (bağlı proje). Hiçbir eşik sabit yazılmaz;
   kuyruk seed değiştiğinde kendiliğinden değişir.

   Kapı iki katmanlıdır: modül izni burada (`envanter/okuma`), santral
   kapsamı `veri.ts`te. Kuyruk ölçütü ve satır tavanı da `veri.ts`tedir —
   ekran artık `Varlik` tablosunun tamamını belleğe almaz. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her kullanıcıyı ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(k, 'envanter')) return <Yetkisiz rol="envanter okuma" />;

  const veri = await omurEkranVerisi(k);

  return (
    <OmurIstemci
      kayitlar={veri.kayitlar}
      toplamVarlik={veri.toplamVarlik}
      kuyrukToplami={veri.kuyrukToplami}
      metrikler={veri.metrikler}
      simdi={veri.simdi}
      kapsamli={veri.kapsamli}
    />
  );
}
