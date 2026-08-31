import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { db } from '@/lib/db';
import { entegrasyonSagligiOzeti } from '@/lib/entegrasyon/saglikOzeti';
import { etiketle } from '@/lib/sabitler';
import SaglikIstemci from './SaglikIstemci';
import { GECMIS_DERINLIGI, IS_TANIMLARI, type KaliteBulgusu, type Motor } from './mantik';

export const metadata: Metadata = { title: 'Platform sağlığı — Atlas' };

/* Platform sağlığı (§68): otomasyon motorlarının koşu durumu, veri kalitesi
   bulguları ve entegrasyon sağlığı tek ekranda — sessiz hata yok, her koşu
   görünür.

   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   Entegrasyon bölümü aynı sözü dış sistemler için verir: her connector'ın
   son koşusu, kabul/ret/yinelenen sayaçları ve veri tazeliği görünür.
   Bu bölüm `yonetim/okuma` ister — yetkisiz kullanıcıya connector'ın maskeli
   sır referansı bile gitmez (özet katmanı boş döner). Sır DEĞERİ hiçbir
   koşulda bu sayfadan geçmez; yalnız `sirMaskesi()` çıktısı taşınır.
   İş mantığı `lib/entegrasyon/saglikOzeti.ts`te ve DEĞİŞTİRİLMEDİ. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  const yazabilir = izinVar(k, 'yonetim', 'yazma');

  /* Katalogda olmayan ama koşu bırakmış bir motor GİZLENMEZ: kayıt varsa
     ekranda karşılığı da olmalı. */
  const kosanAdlar = await db.isKosusu.findMany({
    distinct: ['isAdi'], select: { isAdi: true }, orderBy: { isAdi: 'asc' },
  });
  const tanimlar = [
    ...IS_TANIMLARI,
    ...kosanAdlar
      .map((x) => x.isAdi)
      .filter((ad) => !IS_TANIMLARI.some((t) => t.ad === ad))
      .map((ad) => ({
        ad, etiket: etiketle(ad), elleCalisir: false,
        aciklama: 'Motor kataloğunda tanımlı değil — koşu kaydı bulunduğu için gösteriliyor',
      })),
  ];

  const [kosuListeleri, kaliteBulgulari, entegrasyon] = await Promise.all([
    /* Her motorun kendi son koşuları çekilir. Ozalit sürümü "son koşu" +
       "genel son 20 koşu" diye iki ayrı sorgu kullanıyordu; çok koşan bir
       motor az koşanı o listeden düşürebiliyordu. Geçmiş artık kaydın
       çekmecesinde yaşadığı için hiçbir motor listeden düşmüyor. */
    Promise.all(tanimlar.map((t) => db.isKosusu.findMany({
      where: { isAdi: t.ad },
      orderBy: { baslangic: 'desc' },
      take: GECMIS_DERINLIGI,
    }))),
    db.veriKalitesiBulgusu.findMany({
      where: { durum: 'acik' },
      orderBy: [{ kural: 'asc' }, { olusturuldu: 'desc' }],
    }),
    entegrasyonSagligiOzeti(k),
  ]);

  // Veri kalitesi bulgularının işaret ettiği kayıtları etiketle/linkle.
  const idler = (tip: string) =>
    [...new Set(kaliteBulgulari.filter((b) => b.kaynakTipi === tip).map((b) => b.kaynakId))];
  const [varliklar, tesisler, kanitlar] = await Promise.all([
    db.varlik.findMany({ where: { id: { in: idler('Varlik') } },
      select: { id: true, etiket: true } }),
    db.tesis.findMany({ where: { id: { in: idler('Tesis') } },
      select: { id: true, kod: true } }),
    db.kanit.findMany({ where: { id: { in: idler('Kanit') } },
      select: { id: true, ad: true } }),
  ]);
  const kayitBilgisi = new Map<string, { etiket: string; href: string | null }>();
  for (const v of varliklar) kayitBilgisi.set(`Varlik|${v.id}`, { etiket: v.etiket, href: '/envanter' });
  for (const t of tesisler) kayitBilgisi.set(`Tesis|${t.id}`, { etiket: t.kod, href: `/tesisler/${t.id}` });
  for (const kn of kanitlar) kayitBilgisi.set(`Kanit|${kn.id}`, { etiket: kn.ad, href: null });

  const motorlar: Motor[] = tanimlar.map((t, i) => ({
    ...t,
    kosular: kosuListeleri[i].map((ko) => ({
      id: ko.id, isAdi: ko.isAdi, durum: ko.durum,
      baslangic: ko.baslangic.toISOString(),
      bitis: ko.bitis?.toISOString() ?? null,
      sureMs: ko.sureMs, islenen: ko.islenen, uretilen: ko.uretilen,
      hata: ko.hata, denemeNo: ko.denemeNo,
    })),
  }));

  const kalite: KaliteBulgusu[] = kaliteBulgulari.map((b) => {
    const bilgi = kayitBilgisi.get(`${b.kaynakTipi}|${b.kaynakId}`);
    return {
      id: b.id, kural: b.kural, aciklama: b.aciklama,
      kaynakTipi: b.kaynakTipi, olusturuldu: b.olusturuldu.toISOString(),
      // Kayıt bulunamadıysa null: "boş etiket" değil, DOĞRULANAMAYAN bulgu.
      kayitEtiket: bilgi?.etiket ?? null, href: bilgi?.href ?? null,
    };
  });

  return (
    <SaglikIstemci
      motorlar={motorlar}
      kalite={kalite}
      entegrasyon={entegrasyon}
      yazabilir={yazabilir}
    />
  );
}
