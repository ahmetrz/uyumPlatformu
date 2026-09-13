import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { db } from '@/lib/db';
import { Yetkisiz } from '@/components/kabuk/temel';
import TakvimIstemci from './TakvimIstemci';
import { takvimSatirlari, type YukumlulukKaydi } from './mantik';

export const metadata: Metadata = { title: 'Raporlama takvimi' };

/* RAPORLAMA TAKVİMİ (R10+) — takvim tetikli bildirim yükümlülükleri.

   BİRİNCİL İŞ: "hangi raporlama dönemi açık, ne zamana kadar, sırada ne
   var". Olay tetikli yükümlülük `/olaylar` çekmecesinde yaşar ve oradan
   ayrılması bilinçlidir: biri bir OLAYIN sonucudur ve olayla birlikte
   okunur, öbürü olaydan bağımsız TAKVİMDEN doğar ve olay listesinde
   evsizdir. İkisini tek ekrana koymak, "bugün ne oldu" ile "bu yıl ne
   vermem gerek" sorularını aynı listede karıştırırdı.

   ── KAPSAM: KURUMSAL, KAPSAMSIZ SORULUR ───────────────────────────────
   Takvim yükümlülüğü bir tesise bağlı DEĞİLDİR: EPDK'ya verilen yıllık
   öz denetim raporu kurumun raporudur. Bu yüzden kapı `izinVar(k,
   'uyum', 'okuma')` ile KAPSAMSIZ sorulur — `kapsamUyar` gereği tesise
   kısıtlı rol geçmez. Aynı kural eylem katmanında da duruyor
   (`lib/eylemler2/bildirimDonemi.ts`); ekranda gösterip eylemde
   reddetmek ya da tersi, #48'in dışa aktarım bulgusunun bu yüzeydeki
   hâli olurdu.

   ── SAAT SUNUCUDA, BİR KEZ ────────────────────────────────────────────
   Geri sayım tek bir andan türer. İstemci kendi saatini kullansaydı iki
   makinede iki farklı "kalan süre" görünürdü ve hangisinin doğru olduğu
   denetimde sorulacak bir soru olurdu. */

export default async function Sayfa() {
  const simdi = new Date().getTime();
  const k = await girisZorunlu();
  if (!izinVar(k, 'uyum', 'okuma')) return <Yetkisiz rol="uyum okuma (kurum geneli)" />;

  /* PASİF YÜKÜMLÜLÜK LİSTEYE GİRMEZ: paket güncellemesiyle geri çekilmiş
     bir raporlama yükümlülüğünü "açık dönemi var" göstermek, bugünün
     verisiyle dünün mevzuatını okumak olurdu. Motor da yalnız aktif
     yükümlülük için dönem açar (`acikDonemleriKur`). */
  const kayitlar = await db.bildirimYukumlulugu.findMany({
    where: { tetikleyici: 'takvim', aktif: true },
    select: {
      id: true, kod: true, ad: true, merci: true, dayanak: true, kanalNotu: true,
      donem: true, donemBaslangici: true, teslimGun: true,
      donemler: {
        select: {
          id: true, donemEtiketi: true, baslangic: true, bitis: true, sonTarih: true,
          durum: true, referansNo: true, verilmeZamani: true, teyitZamani: true,
          uygulanmazGerekcesi: true,
          veren: { select: { adSoyad: true } },
        },
        orderBy: { baslangic: 'desc' },
      },
    },
    orderBy: { kod: 'asc' },
  });

  const yukumlulukler: YukumlulukKaydi[] = kayitlar.map((y) => ({
    id: y.id, kod: y.kod, ad: y.ad, merci: y.merci, dayanak: y.dayanak,
    kanalNotu: y.kanalNotu, donem: y.donem, donemBaslangici: y.donemBaslangici,
    teslimGun: y.teslimGun,
    donemler: y.donemler.map((d) => ({
      id: d.id,
      donemEtiketi: d.donemEtiketi,
      baslangic: d.baslangic.toISOString(),
      bitis: d.bitis.toISOString(),
      sonTarih: d.sonTarih === null ? null : d.sonTarih.toISOString(),
      durum: d.durum,
      referansNo: d.referansNo,
      verenAd: d.veren?.adSoyad ?? null,
      verilmeZamani: d.verilmeZamani === null ? null : d.verilmeZamani.toISOString(),
      teyitZamani: d.teyitZamani === null ? null : d.teyitZamani.toISOString(),
      uygulanmazGerekcesi: d.uygulanmazGerekcesi,
    })),
  }));

  return (
    <TakvimIstemci
      satirlar={takvimSatirlari(yukumlulukler, simdi)}
      karar={izinVar(k, 'uyum', 'onay')}
    />
  );
}
