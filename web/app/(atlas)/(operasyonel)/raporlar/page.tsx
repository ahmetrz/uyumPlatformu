import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { db } from '@/lib/db';
import { Yetkisiz } from '@/components/abacus/temel';
import { gecenGun, tarihTR } from '@/lib/sabitler';
import RaporlarIstemci from './RaporlarIstemci';
import { hucreOzeti, kapsamDisiHucre, type Bulgu, type Kanit, type Santral, type Sayilar, type Surec } from './mantik';

export const metadata: Metadata = { title: 'Portföy raporu — Atlas' };

/* Portföy raporu — "hangi santral × süreç hücresi zayıf, rapor nereye gidiyor?"
   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   Kapsam VERİ seviyesinde daraltılır: uyum okuma yetkisi tesise kısıtlıysa
   matriste yalnız o santraller ve onların bulguları görünür. Yetki dışında
   kalan kayıt dışa aktarıma da girmez. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'uyum', 'okuma')) return <Yetkisiz rol="uyum okuma" />;

  const izinli = izinliTesisIdleri(k, 'uyum');

  const [surecler, gruplar, bulgular, kanitlar] = await Promise.all([
    db.uyumSureci.findMany({
      where: { durum: { in: ['aktif', 'planlandi'] } },
      include: { regulasyon: true, kapsam: { include: { tesis: true } } },
      orderBy: { kod: 'asc' },
    }),
    db.maddeDurumu.groupBy({ by: ['surecId', 'tesisId', 'durum'], _count: { _all: true } }),
    db.bulgu.findMany({
      include: { maddeDurumu: { include: { tesis: true, surec: { include: { regulasyon: true } } } } },
    }),
    db.kanit.findMany({ include: { _count: { select: { baglantilar: true } } } }),
  ]);

  const gorulebilir = (tesisId: string) => izinli === null || izinli.includes(tesisId);

  // (süreç, tesis) → durum sayıları
  const hucreler: Record<string, Sayilar> = {};
  for (const g of gruplar) {
    const anahtar = `${g.surecId}|${g.tesisId}`;
    hucreler[anahtar] = hucreler[anahtar] ?? {};
    hucreler[anahtar][g.durum] = (hucreler[anahtar][g.durum] ?? 0) + g._count._all;
  }

  const surecListesi: Surec[] = surecler.map((s) => ({
    id: s.id, kod: s.kod, regKod: s.regulasyon.kod, ad: s.ad,
  }));

  /* Satırlar süreçlerin kapsamındaki santrallerin BİRLEŞİMİ; bir santral
     yalnız bazı süreçlerde olabilir, kalan hücreleri kapsam dışı kalır. */
  const santralHavuzu = new Map<string, { id: string; kod: string; ad: string }>();
  for (const s of surecler) {
    for (const kap of s.kapsam) {
      if (!gorulebilir(kap.tesisId)) continue;
      santralHavuzu.set(kap.tesisId, { id: kap.tesisId, kod: kap.tesis.kod, ad: kap.tesis.ad });
    }
  }
  const kapsamKumesi = new Set(
    surecler.flatMap((s) => s.kapsam.map((kap) => `${s.id}|${kap.tesisId}`)));

  const santraller: Santral[] = [...santralHavuzu.values()].map((t) => ({
    id: t.id,
    kod: t.kod,
    ad: t.ad,
    hucreler: surecListesi.map((s) => (kapsamKumesi.has(`${s.id}|${t.id}`)
      ? hucreOzeti(s.id, hucreler[`${s.id}|${t.id}`])
      : kapsamDisiHucre(s.id))),
  }));

  const bulguVeri: Bulgu[] = bulgular
    .filter((b) => gorulebilir(b.maddeDurumu.tesisId))
    .map((b) => ({
      id: b.id,
      baslik: b.baslik,
      durum: b.durum,
      onem: b.onemDerecesi,
      tesisKod: b.maddeDurumu.tesis.kod,
      regKod: b.maddeDurumu.surec.regulasyon.kod,
      yasGun: gecenGun(b.tespitTarihi),
      acik: b.durum !== 'kapali' && b.durum !== 'kabul_edildi',
    }));

  const kanitVeri: Kanit[] = kanitlar.map((x) => ({
    id: x.id, ad: x.ad, tip: x.tip,
    gun: gecenGun(x.gecerlilikBaslangic),
    baglanti: x._count.baglantilar,
  }));

  return (
    <RaporlarIstemci
      surecler={surecListesi}
      santraller={santraller}
      bulgular={bulguVeri}
      kanitlar={kanitVeri}
      kisitliKapsam={izinli !== null}
      raporZamani={tarihTR(new Date())}
    />
  );
}
