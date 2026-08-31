import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import { uyumOzeti } from '@/lib/sabitler';
import Portfoy from './Portfoy';

export const metadata: Metadata = { title: 'Enerji portföyü — Atlas' };

/* F2 · Enerji Portföyü — "hangi santral beni istiyor ve nasıl bir santral bu?"
   Kapsam yalnız ÜRETİM portföyüdür; ZES / OEDAŞ / OEPSAŞ platform dışıdır ve
   veriye de girmez (README §Scope). */

export default async function Sayfa() {
  await girisZorunlu();

  const [tesisler, durumSayimlari, bulguSayimlari, riskSayimlari] = await Promise.all([
    db.tesis.findMany({
      where: { durum: 'aktif' },
      include: { tip: true, tuzelKisi: true, profil: { select: { kritiklikSinifi: true } } },
      orderBy: [{ kuruluGucMw: 'desc' }, { ad: 'asc' }],
    }),
    db.maddeDurumu.groupBy({ by: ['tesisId', 'durum'], _count: { _all: true } }),
    db.bulgu.groupBy({
      by: ['maddeDurumuId'], _count: { _all: true },
      where: { durum: { in: ['acik', 'aksiyonda'] }, silindi: null },
    }),
    db.risk.groupBy({
      by: ['tesisId'], _count: { _all: true },
      where: { silindi: null, durum: { in: ['acik', 'islemde'] } },
    }),
  ]);

  // Bulgu sayısı tesise madde durumu üzerinden bağlanır
  const bulguDurumIdleri = bulguSayimlari.map((b) => b.maddeDurumuId);
  const durumTesis = bulguDurumIdleri.length
    ? await db.maddeDurumu.findMany({
        where: { id: { in: bulguDurumIdleri } }, select: { id: true, tesisId: true },
      })
    : [];
  const bulguTesise = new Map<string, number>();
  for (const b of bulguSayimlari) {
    const t = durumTesis.find((d) => d.id === b.maddeDurumuId)?.tesisId;
    if (t) bulguTesise.set(t, (bulguTesise.get(t) ?? 0) + b._count._all);
  }
  const riskTesise = new Map(riskSayimlari.map((r) => [r.tesisId ?? '', r._count._all]));

  const satirlar = tesisler.map((t) => {
    const sayim: Record<string, number> = {};
    for (const d of durumSayimlari) {
      if (d.tesisId === t.id) sayim[d.durum] = d._count._all;
    }
    const ozet = uyumOzeti(sayim);
    return {
      id: t.id,
      kod: t.kod,
      ad: t.ad,
      tipKod: t.tip?.kod ?? null,
      tipAdi: t.tip?.ad ?? 'Diğer',
      tuzelKisi: t.tuzelKisi?.ad ?? null,
      konum: t.konum,
      gucMw: t.kuruluGucMw,
      gorselAnahtari: t.gorselAnahtari,
      kritiklik: t.profil?.kritiklikSinifi ?? null,
      uyumYuzde: ozet.yuzde,
      bilinmeyenOran: ozet.bilinmeyenOran,
      acikBulgu: bulguTesise.get(t.id) ?? 0,
      acikRisk: riskTesise.get(t.id) ?? 0,
    };
  });

  const toplamGuc = satirlar.reduce((a, s) => a + (s.gucMw ?? 0), 0);

  return <Portfoy satirlar={satirlar} toplamGucMw={Math.round(toplamGuc * 10) / 10} />;
}
