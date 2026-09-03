import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { kapsamdaYetkili, modulYazabilir } from '@/app/kapsam';
import { Yetkisiz } from '@/components/kabuk/temel';
import { db } from '@/lib/db';
import SurecDetayIstemci, { type DetayVerisi } from './SurecDetayIstemci';
import { kisaKod, sayimla, type Degerlendirme, type S } from '../ortak';

export const metadata: Metadata = { title: 'Uyum kampanyası' };

/* Kampanya kaydı — "bu kampanyada hangi madde hangi santralde takılı?"

   Ekranın atomu bir DEĞERLENDİRMEDİR (kampanya × madde × santral). /uyum
   aynı veriden santral × kontrol ailesi ÖZETİ üretir; burada tek tek
   kayıtlar yönetilir (durum, sorumlu, kanıt, bulgu, istisna). İki ekran
   aynı satırı iki farklı soruyla okur, biri diğerinin matrisini tekrar
   etmez. */

export async function generateStaticParams() {
  const surecler = await db.uyumSureci.findMany({ select: { id: true } });
  return surecler.map((s) => ({ id: s.id }));
}

export default async function Sayfa({ params }: { params: Promise<{ id: string }> }) {
  const kullanici = await girisZorunlu();
  if (!izinVar(kullanici, 'uyum', 'okuma')) return <Yetkisiz rol="uyum okuma" />;
  const { id } = await params;

  const izinli = izinliTesisIdleri(kullanici, 'uyum');
  /* Tesise kısıtlı rol kapsamsız (global) yazma yapamaz ama KENDİ
     santralinde yazabilir — düğmeler bu yüzden `modulYazabilir` ile
     sorulur ("yazabildiğin santral var mı"), `izinVar` ile değil.
     Bu ekran o soruyu üç dosyada ayrı ayrı elle yazıyordu; yüklem
     `app/kapsam.ts` içinde tek yere indi. Sunucu her kayıtta tesis
     kapsamını yeniden doğrular. */
  const yazabilir = izinVar(kullanici, 'uyum', 'yazma');
  /* UY-07 · Doğrulama `uyum/onay` ister. Kaba kapı `modulYazabilir` ile
     sorulur ("onay verebildiğin santral var mı"); satır kararı ayrıca
     `kapsamdaYetkili` ile verilir — ekran sunucudan gevşek olamaz. */
  const onaylayabilir = modulYazabilir(kullanici, 'uyum', 'onay');

  const simdi = new Date().getTime();
  const tesisSuzgeci = izinli === null ? {} : { tesisId: { in: izinli } };

  const surec = await db.uyumSureci.findUnique({
    where: { id },
    include: {
      regulasyon: { select: { id: true, kod: true, ad: true } },
      kapsam: { include: { tesis: { select: { id: true, kod: true, ad: true } } } },
      denetimler: { where: { silindi: null }, select: { id: true, kod: true, durum: true } },
    },
  });
  if (!surec) notFound();

  const [durumlar, agac, kullanicilar, alanlar, ekipler] = await Promise.all([
    db.maddeDurumu.findMany({
      where: { surecId: id, ...tesisSuzgeci },
      include: {
        madde: {
          include: {
            alanlar: { include: { alan: { select: { kod: true } } } },
            eslestirmeKaynak: { include: { hedef: { select: { kod: true } } } },
            eslestirmeHedef: { include: { kaynak: { select: { kod: true } } } },
          },
        },
        tesis: { select: { id: true, kod: true, ad: true } },
        sorumlu: { select: { id: true, adSoyad: true, aktif: true } },
        /* UY-07 · ekip ve doğrulayan. Ekibin AKTİF ÜYE sayısı da okunur:
           aktif üyesi olmayan bir ekip "sorumlusu var" göstermemeli. */
        ekip: {
          select: {
            id: true, kod: true, ad: true, aktif: true,
            uyeler: { where: { kullanici: { aktif: true } }, select: { id: true } },
          },
        },
        dogrulayan: { select: { id: true, adSoyad: true } },
        /* Değerlendirmeyi KİM yaptı: değişmez tarihçenin son satırı.
           `MaddeDurumu` üzerinde ayrıca tutulmaz — iki doğruluk kaynağı
           olurdu. */
        tarihce: {
          orderBy: { zaman: 'desc' }, take: 1,
          select: { aktorId: true, aktor: { select: { id: true, adSoyad: true } } },
        },
        bulgular: {
          where: { silindi: null },
          select: { id: true, baslik: true, durum: true, onemDerecesi: true },
        },
        kanitBaglantilari: { include: { kanit: true } },
      },
    }),
    // Bölüm başlığı için hiyerarşi: yaprak maddenin KÖK atası hangi bölüm?
    db.madde.findMany({
      where: { regulasyonId: surec.regulasyonId },
      select: { id: true, kod: true, baslik: true, ustMaddeId: true },
    }),
    db.kullanici.findMany({
      where: { aktif: true },
      select: { id: true, adSoyad: true },
      orderBy: { adSoyad: 'asc' },
    }),
    db.kapsamAlani.findMany({
      where: { aktif: true },
      select: { kod: true, ad: true },
      orderBy: { kod: 'asc' },
    }),
    /* UY-07 · Sorumlu ekip seçenekleri. Yalnız AKTİF ekipler listelenir:
       pasif ekip kontrol sorumlusu olamaz (sunucu da reddeder) ve
       seçilebilir göstermek kullanıcıyı kesin bir hataya yürütürdü. */
    db.ekip.findMany({
      where: { aktif: true },
      select: {
        id: true, kod: true, ad: true,
        uyeler: { where: { kullanici: { aktif: true } }, select: { id: true } },
      },
      orderBy: { kod: 'asc' },
    }),
  ]);

  /* Kök bölüm: yaprak maddeden yukarı yürünür. Döngüsel veri ihtimaline
     karşı adım sayısı sınırlıdır — bozuk katalog sayfayı kilitlemesin. */
  const agacIdx = new Map(agac.map((m) => [m.id, m]));
  const kokBasligi = (maddeId: string): string => {
    let mevcut = agacIdx.get(maddeId);
    for (let i = 0; mevcut?.ustMaddeId && i < 12; i += 1) {
      const ust = agacIdx.get(mevcut.ustMaddeId);
      if (!ust) break;
      mevcut = ust;
    }
    return mevcut?.baslik ?? '—';
  };

  const kayitlar: Degerlendirme[] = durumlar.map((d) => {
    const kanitlar = d.kanitBaglantilari
      .map((b) => b.kanit)
      .filter((k) => !k.silindi);
    return {
      id: d.id,
      madde: {
        id: d.madde.id,
        kod: d.madde.kod,
        kisaKod: kisaKod(d.madde.kod, surec.regulasyon.kod),
        baslik: d.madde.baslik,
        metin: d.madde.metin,
        bolum: kokBasligi(d.madde.id),
        kanitTipi: d.madde.kanitTipi,
        alanlar: d.madde.alanlar.map((a) => a.alan.kod),
        esler: [
          ...d.madde.eslestirmeKaynak.map((e) => ({ kod: e.hedef.kod, denklik: e.denklik })),
          ...d.madde.eslestirmeHedef.map((e) => ({ kod: e.kaynak.kod, denklik: e.denklik })),
        ],
      },
      tesis: d.tesis,
      durum: d.durum,
      guven: d.guven,
      kanitBayat: d.kanitBayat,
      not: d.not,
      sorumlu: d.sorumlu ? { id: d.sorumlu.id, ad: d.sorumlu.adSoyad } : null,
      sorumluAktif: d.sorumlu?.aktif ?? false,
      ekip: d.ekip ? {
        id: d.ekip.id, kod: d.ekip.kod, ad: d.ekip.ad, aktif: d.ekip.aktif,
        aktifUye: d.ekip.uyeler.length,
      } : null,
      dogrulayan: d.dogrulayan
        ? { id: d.dogrulayan.id, ad: d.dogrulayan.adSoyad } : null,
      dogrulamaZamani: d.dogrulamaZamani?.toISOString() ?? null,
      degerlendiren: d.tarihce[0]?.aktor
        ? { id: d.tarihce[0].aktor.id, ad: d.tarihce[0].aktor.adSoyad } : null,
      /* Dört göz kararı SUNUCUDA verilir; ekran düğmeyi ona göre gösterir.
         `degerlendirmeDogrula` aynı kuralı yeniden uygular — ekran
         sunucudan gevşek olamaz. */
      dogrulayabilir: onaylayabilir
        && kapsamdaYetkili(kullanici, 'uyum', 'onay', d.tesisId)
        && d.sonDegerlendirme !== null
        && d.tarihce[0]?.aktorId != null
        && d.tarihce[0].aktorId !== kullanici.id,
      sonDegerlendirme: d.sonDegerlendirme?.toISOString() ?? null,
      bulgular: d.bulgular.map((b) => ({
        id: b.id, baslik: b.baslik, durum: b.durum, onem: b.onemDerecesi,
      })),
      kanitlar: kanitlar.map((k) => ({
        id: k.id, ad: k.ad, tip: k.tip,
        baslangic: k.gecerlilikBaslangic.toISOString(),
      })),
      /* UY-16 · GEÇERLİ kanıt: kabul durumu `gecerli` VE süresi dolmamış.
         Reddedilmiş ya da süresi dolmuş bir belgeye dayanarak "uyumlu"
         denemez; kapsama hesabı bu sayıyı kullanır. */
      gecerliKanit: kanitlar.filter(
        (k) => k.durum === 'gecerli'
          && (k.gecerliBitis === null || k.gecerliBitis > new Date()),
      ).length,
      acikBulgu: d.bulgular.filter((b) => b.durum === 'acik' || b.durum === 'aksiyonda').length,
    };
  });

  const hamSayim: Record<string, number> = {};
  for (const d of durumlar) hamSayim[d.durum] = (hamSayim[d.durum] ?? 0) + 1;

  const s: S = {
    id: surec.id, kod: surec.kod, ad: surec.ad, durum: surec.durum,
    baslangic: surec.baslangic?.toISOString() ?? null,
    bitis: surec.bitis?.toISOString() ?? null,
    aciklama: surec.aciklama,
    regulasyon: surec.regulasyon,
    tesisler: surec.kapsam
      .map((k) => k.tesis)
      .filter((t) => izinli === null || izinli.includes(t.id)),
    sayim: sayimla(hamSayim),
    acikBulgu: kayitlar.reduce((a, k) => a + k.acikBulgu, 0),
    denetimler: surec.denetimler,
  };

  const veri: DetayVerisi = {
    surec: s,
    simdi,
    kayitlar,
    kullanicilar: kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad })),
    alanlar,
    yazabilir,
    ekipler: ekipler.map((e) => ({
      id: e.id, kod: e.kod, ad: e.ad, aktifUye: e.uyeler.length,
    })),
  };

  return <SurecDetayIstemci veri={veri} />;
}
