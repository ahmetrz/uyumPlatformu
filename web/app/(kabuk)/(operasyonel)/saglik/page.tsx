import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { db } from '@/lib/db';
import { entegrasyonSagligiOzeti } from '@/lib/entegrasyon/saglikOzeti';
import {
  bayatKokenler, dogrulanmamisKayitlar, kaynakSistemDagilimi, kokenSayimlari,
} from '@/lib/entegrasyon/kokenRapor';
import { etiketle } from '@/lib/sabitler';
import SaglikIstemci from './SaglikIstemci';
import {
  BAYAT_KOKEN_GUN, BEKLEYEN_SINIRI, GECMIS_DERINLIGI, IS_TANIMLARI,
  type BayatSatiri, type BekleyenSatiri, type KaliteBulgusu, type KaynakSatiri,
  type KokenOzeti, type KokenSayimSatiri, type Motor,
} from './mantik';

export const metadata: Metadata = { title: 'Platform sağlığı' };

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
   İş mantığı `lib/entegrasyon/saglikOzeti.ts`tedir.

   Köken bölümü (§12 + §18) aynı sözü GELEN VERİ için verir: hangi kaynak
   sistem kaç kaydı besliyor, hangi kayıt insan doğrulaması bekliyor, hangi
   köken bayatlamış. Kapsamı `envanter/okuma` belirler ve santral kapsamı
   `izinliTesisIdleri` ile daraltılır; doğrulama eylemi ayrıca
   `envanter/onay` ister. Kökeni OLMAYAN kayıt bu bölümde gizlenmez —
   `kokenSayimlari` onu `manuel` kovasında sayar ve ekran "kökeni yok"
   diye yazar. İş mantığı `lib/entegrasyon/kokenRapor.ts`tedir. */

/** Bir varlık tipinden kuyruğa alınacak en fazla bekleyen kayıt.
    Tip başına kırpılır ki çok kayıtlı bir tip diğerlerini listeden
    düşürmesin — sağlık ekranının motorlarda çözdüğü kusurun aynısı. */
const TIP_BASI_BEKLEYEN = 40;

/** Köken bölümünün verisi. Yetki yoksa BOŞ değil, `yetkili:false` döner:
    "kayıt yok" ile "kapı kapalı" aynı şey değildir. */
async function kokenOzetiGetir(
  k: Awaited<ReturnType<typeof girisZorunlu>>,
): Promise<KokenOzeti> {
  const bos: KokenOzeti = {
    yetkili: false, sayimlar: [], kaynaklar: [], bekleyenler: [], bayatlar: [],
    esikGun: BAYAT_KOKEN_GUN, kapsanamayanTipler: [], tesisiBilinmeyen: 0,
    dogrulayabilir: false,
  };
  if (!izinVar(k, 'envanter', 'okuma')) return bos;

  const kapsam = { tesisIdler: izinliTesisIdleri(k, 'envanter') };
  const [sayim, dagilim, bayat] = await Promise.all([
    kokenSayimlari(kapsam),
    kaynakSistemDagilimi(kapsam),
    bayatKokenler(BAYAT_KOKEN_GUN, kapsam),
  ]);

  /* Doğrulama kuyruğu tip başına çekilir: `dogrulanmamisKayitlar` bir tip
     ister. Yalnız gerçekten bekleyeni olan tipler sorgulanır. */
  const bekleyenTipler = sayim.satirlar.filter((r) => r.otomatik > 0);
  const listeler = await Promise.all(bekleyenTipler.map((r) =>
    dogrulanmamisKayitlar(r.varlikTipi, TIP_BASI_BEKLEYEN, kapsam)));

  const bekleyenler: BekleyenSatiri[] = listeler
    .flatMap((l) => l.satirlar)
    .sort((a, b) => b.bekleyenGun - a.bekleyenGun)
    .slice(0, BEKLEYEN_SINIRI)
    .map((r) => ({
      kokenId: r.kokenId, varlikTipi: r.varlikTipi, varlikId: r.varlikId,
      kaynakSistem: r.kaynakSistem, kaynakKayitId: r.kaynakKayitId,
      guven: r.guven, aktarim: r.aktarim.toISOString(), bekleyenGun: r.bekleyenGun,
    }));

  const bayatlar: BayatSatiri[] = bayat.satirlar.map((r) => ({
    kokenId: r.kokenId, varlikTipi: r.varlikTipi, varlikId: r.varlikId,
    kaynakSistem: r.kaynakSistem, dogrulamaDurumu: r.dogrulamaDurumu,
    guven: r.guven, sonAktarim: r.sonAktarim.toISOString(), gecenGun: r.gecenGun,
  }));

  // Kaynak başına bayat sayısı: kaynağın kaç kaydı artık tazelenmiyor.
  const bayatSayaci = new Map<string, number>();
  for (const b of bayatlar) {
    bayatSayaci.set(b.kaynakSistem, (bayatSayaci.get(b.kaynakSistem) ?? 0) + 1);
  }

  const kaynaklar: KaynakSatiri[] = dagilim.satirlar.map((r) => ({
    kaynakSistem: r.kaynakSistem, kayit: r.kayit, dogrulanmis: r.dogrulanmis,
    dogrulanmadi: r.dogrulanmadi, reddedildi: r.reddedildi,
    guveniOlculen: r.guveniOlculen, guveniOlculmemis: r.guveniOlculmemis,
    ortalamaGuven: r.ortalamaGuven, sonAktarim: r.sonAktarim.toISOString(),
    bayat: bayatSayaci.get(r.kaynakSistem) ?? 0,
  }));

  const sayimlar: KokenSayimSatiri[] = sayim.satirlar.map((r) => ({
    varlikTipi: r.varlikTipi, manuel: r.manuel, otomatik: r.otomatik,
    dogrulanmis: r.dogrulanmis, reddedildi: r.reddedildi,
    kokenli: r.kokenli, toplam: r.toplam,
  }));

  return {
    yetkili: true, sayimlar, kaynaklar, bekleyenler, bayatlar,
    esikGun: bayat.esikGun,
    // Kapsamın yuttuğu kayıtlar görünmez olmaz; ekran bunu dip notta yazar.
    kapsanamayanTipler: [...new Set([
      ...sayim.not.kapsanamayanTipler, ...dagilim.not.kapsanamayanTipler,
    ])].sort(),
    tesisiBilinmeyen: Math.max(sayim.not.tesisiBilinmeyen, dagilim.not.tesisiBilinmeyen),
    dogrulayabilir: izinVar(k, 'envanter', 'onay'),
  };
}

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

  const [kosuListeleri, kaliteBulgulari, entegrasyon, koken] = await Promise.all([
    /* Her motorun kendi son koşuları çekilir. Önceki sürüm "son koşu" +
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
    kokenOzetiGetir(k),
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
      koken={koken}
      yazabilir={yazabilir}
    />
  );
}
