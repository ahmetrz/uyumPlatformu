import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { db } from '@/lib/db';
import ReddedilenlerIstemci from './ReddedilenlerIstemci';
import type { RedSatiri } from './mantik';

export const metadata: Metadata = { title: 'Reddedilen kayıtlar — Atlas' };

/* Dead-letter kuyruğu (§ entegrasyon).

   Neden /saglik'ın içinde DEĞİL: /saglik zaten dört metrik ve dört kayıt
   ailesi (motor · connector · veri kalitesi · veri kökeni) taşıyor.
   Beşinci bir aile eklemek Atlas'ın yoğunluk sözleşmesini kırardı —
   metrik bütçesi dörttür ve görünür satır bütçesi 5–9'dur. Kuyruğun
   VARLIĞI /saglik'ta tek satırla görünür, incelemesi burada yapılır.

   Kuyruk `yonetim/okuma` ister; kapatmak `yonetim/yazma`. Ham kayıt
   çekirdek tarafından SIRLARI MASKELENEREK yazılır; bu sayfa ham JSON'a
   ayrıca dokunmaz. */

/** Kuyruktan çekilen en fazla satır. Sınır bilinçlidir ve ekranda
    söylenir: sessizce kırpılan bir kuyruk, olmayan bir kuyruktur. */
const SINIR = 300;

export default async function Sayfa() {
  const k = await girisZorunlu();
  const okuyabilir = izinVar(k, 'yonetim', 'okuma');
  const yazabilir = izinVar(k, 'yonetim', 'yazma');

  if (!okuyabilir) {
    return <ReddedilenlerIstemci satirlar={[]} yetkili={false} yazabilir={false}
      toplam={0} sinir={SINIR} />;
  }

  const [ham, toplam] = await Promise.all([
    db.reddedilenKayit.findMany({
      orderBy: [{ durum: 'asc' }, { olusturuldu: 'desc' }],
      take: SINIR,
      select: {
        id: true, kaynakSistem: true, kaynakKayitId: true, asama: true,
        sebep: true, durum: true, incelemeNotu: true, incelemeZamani: true,
        olusturuldu: true, hamJson: true,
        connector: { select: { ad: true } },
        inceleyen: { select: { adSoyad: true } },
      },
    }),
    db.reddedilenKayit.count(),
  ]);

  const satirlar: RedSatiri[] = ham.map((r) => ({
    id: r.id,
    kaynakSistem: r.kaynakSistem,
    kaynakKayitId: r.kaynakKayitId,
    asama: r.asama,
    sebep: r.sebep,
    durum: r.durum,
    connectorAdi: r.connector?.ad ?? null,
    inceleyen: r.inceleyen?.adSoyad ?? null,
    incelemeNotu: r.incelemeNotu,
    incelemeZamani: r.incelemeZamani?.toISOString() ?? null,
    olusturuldu: r.olusturuldu.toISOString(),
    hamJson: r.hamJson,
  }));

  return (
    <ReddedilenlerIstemci satirlar={satirlar} yetkili yazabilir={yazabilir}
      toplam={toplam} sinir={SINIR} />
  );
}
