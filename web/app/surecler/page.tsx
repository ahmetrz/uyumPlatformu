import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import { uyumYuzdesi, type Durum } from '@/lib/sabitler';
import type { DurumSayilari } from '@/components/ui';
import SureclerIstemci from './SureclerIstemci';


export default async function Surecler() {
  await girisZorunlu();
  const [surecler, gruplar, regulasyonlar, tesisler] = await Promise.all([
    db.uyumSureci.findMany({
      include: { regulasyon: true, kapsam: { include: { tesis: { include: { tip: true } } } },
        _count: { select: { durumlar: true } } },
      orderBy: [{ durum: 'asc' }, { bitis: 'asc' }],
    }),
    db.maddeDurumu.groupBy({ by: ['surecId', 'durum'], _count: { _all: true } }),
    db.regulasyon.findMany({ where: { aktif: true }, orderBy: { kod: 'asc' } }),
    db.tesis.findMany({ where: { durum: 'aktif' }, include: { tip: true }, orderBy: { kod: 'asc' } }),
  ]);

  const sayilar = new Map<string, DurumSayilari>();
  for (const g of gruplar) {
    const s = sayilar.get(g.surecId) ?? {};
    s[g.durum as Durum] = (s[g.durum as Durum] ?? 0) + g._count._all;
    sayilar.set(g.surecId, s);
  }

  const veri = surecler.map((s) => ({
    id: s.id, kod: s.kod, ad: s.ad, durum: s.durum,
    baslangic: s.baslangic?.toISOString() ?? null,
    bitis: s.bitis?.toISOString() ?? null,
    aciklama: s.aciklama,
    regulasyon: { id: s.regulasyonId, kod: s.regulasyon.kod, ad: s.regulasyon.ad },
    tesisler: s.kapsam.map((k) => ({ id: k.tesis.id, kod: k.tesis.kod, ad: k.tesis.ad,
      tip: k.tesis.tip?.kod ?? null })),
    sayilar: sayilar.get(s.id) ?? {},
    yuzde: uyumYuzdesi(sayilar.get(s.id) ?? {}),
    kayitSayisi: s._count.durumlar,
  }));

  return (
    <>
      <UstCubuk baslik="Uyum süreçleri" />
      <main className="icerik">
        <SureclerIstemci
          surecler={veri}
          regulasyonlar={regulasyonlar.map((r) => ({ id: r.id, kod: r.kod, ad: r.ad }))}
          tesisler={tesisler.map((t) => ({ id: t.id, kod: t.kod, ad: t.ad, tip: t.tip?.kod ?? null }))}
        />
      </main>
    </>
  );
}
