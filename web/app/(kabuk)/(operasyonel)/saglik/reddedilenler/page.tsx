import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import ReddedilenlerIstemci from './ReddedilenlerIstemci';
import { reddedilenlerVerisi } from './veri';

export const metadata: Metadata = { title: 'Reddedilen kayıtlar' };

/* Dead-letter kuyruğu (§ entegrasyon).

   Neden /saglik'ın içinde DEĞİL: /saglik zaten dört metrik ve dört kayıt
   ailesi (motor · connector · veri kalitesi · veri kökeni) taşıyor.
   Beşinci bir aile eklemek Atlas'ın yoğunluk sözleşmesini kırardı —
   metrik bütçesi dörttür ve görünür satır bütçesi 5–9'dur. Kuyruğun
   VARLIĞI /saglik'ta tek satırla görünür, incelemesi burada yapılır.

   Kuyruk `yonetim/okuma` ister; kapatmak `yonetim/yazma`. Ham kayıt
   çekirdek tarafından SIRLARI MASKELENEREK yazılır; bu sayfa ham JSON'a
   ayrıca dokunmaz. Santral kapsamı `veri.ts`te uygulanır (modül: `yonetim`);
   satırın santrali ham yükün `tesisKodu` beyanından ya da connector'ın
   yazma kapsamından türetilir. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  const veri = await reddedilenlerVerisi(k);

  return (
    <ReddedilenlerIstemci
      satirlar={veri.satirlar}
      yetkili={veri.yetkili}
      yazabilir={veri.yazabilir}
      toplam={veri.toplam}
      sinir={veri.sinir}
      kapsamli={veri.kapsamli}
    />
  );
}
