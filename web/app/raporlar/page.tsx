import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import RaporlarIstemci from './RaporlarIstemci';
import { uyumYuzdesi, gecenGun, type Durum } from '@/lib/sabitler';
import type { DurumSayilari } from '@/components/ui';


export default async function Raporlar() {
  await girisZorunlu();
  const [surecler, gruplar, bulgular, kanitlar] = await Promise.all([
    db.uyumSureci.findMany({
      where: { durum: { in: ['aktif', 'planlandi'] } },
      include: { regulasyon: true, kapsam: { include: { tesis: true } } },
    }),
    db.maddeDurumu.groupBy({ by: ['surecId', 'tesisId', 'durum'], _count: { _all: true } }),
    db.bulgu.findMany({ include: { maddeDurumu: { include: {
      tesis: true, surec: { include: { regulasyon: true } } } } } }),
    db.kanit.findMany({ include: { _count: { select: { baglantilar: true } } } }),
  ]);

  const hucreler: Record<string, DurumSayilari> = {};
  for (const g of gruplar) {
    const k = `${g.surecId}|${g.tesisId}`;
    hucreler[k] = hucreler[k] ?? {};
    hucreler[k][g.durum as Durum] = (hucreler[k][g.durum as Durum] ?? 0) + g._count._all;
  }

  const matris = surecler.map((s) => ({
    id: s.id, kod: s.kod, regKod: s.regulasyon.kod, ad: s.ad,
    tesisler: s.kapsam.map((k) => {
      const sy = hucreler[`${s.id}|${k.tesisId}`] ?? {};
      return { id: k.tesisId, kod: k.tesis.kod, ad: k.tesis.ad,
        sayilar: sy, yuzde: uyumYuzdesi(sy) };
    }),
  }));

  const bulguVeri = bulgular.map((b) => ({
    id: b.id, baslik: b.baslik, durum: b.durum, onem: b.onemDerecesi,
    tesisKod: b.maddeDurumu.tesis.kod, regKod: b.maddeDurumu.surec.regulasyon.kod,
    yasGun: gecenGun(b.tespitTarihi),
    acik: b.durum !== 'kapali' && b.durum !== 'kabul_edildi',
  }));

  const kanitVeri = kanitlar.map((k) => ({
    id: k.id, ad: k.ad, tip: k.tip,
    gun: gecenGun(k.gecerlilikBaslangic),
    baglanti: k._count.baglantilar,
  }));

  return (
    <>
      <UstCubuk baslik="Raporlar" />
      <main className="icerik">
        <RaporlarIstemci matris={matris} bulgular={bulguVeri} kanitlar={kanitVeri} />
      </main>
    </>
  );
}
