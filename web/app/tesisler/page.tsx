import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import type { DurumSayilari } from '@/components/ui';
import type { Durum } from '@/lib/sabitler';
import { TesisKartlari, type TesisKart } from './[id]/Tesis360Istemci';

/* Profilin uygulanabilirlik motoru için kritik alanları — biri bile
   bilinmiyorsa kart "profil eksik" uyarısı taşır. */
const CEKIRDEK_PROFIL_ALANLARI = [
  'kritiklikSinifi', 'teiasScadaEms', 'otMimariTipi', 'internetMaruziyeti', 'kabulDurumu',
] as const;

export default async function Tesisler() {
  await girisZorunlu();
  const [tesisler, durumGruplari, acikBulgular, riskGruplari] = await Promise.all([
    db.tesis.findMany({
      include: { tip: true, tuzelKisi: true, profil: true },
      orderBy: [{ durum: 'asc' }, { kod: 'asc' }],
    }),
    db.maddeDurumu.groupBy({ by: ['tesisId', 'durum'], _count: { _all: true } }),
    db.bulgu.findMany({
      where: { durum: { in: ['acik', 'aksiyonda'] } },
      select: { maddeDurumu: { select: { tesisId: true } } },
    }),
    db.risk.groupBy({
      by: ['tesisId'],
      where: { durum: { in: ['acik', 'islemde'] }, silindi: null, tesisId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const bulguSayilari = new Map<string, number>();
  for (const b of acikBulgular) {
    const t = b.maddeDurumu.tesisId;
    bulguSayilari.set(t, (bulguSayilari.get(t) ?? 0) + 1);
  }
  const riskSayilari = new Map<string, number>();
  for (const g of riskGruplari) if (g.tesisId) riskSayilari.set(g.tesisId, g._count._all);

  const veri: TesisKart[] = tesisler.map((t) => {
    const sayilar: DurumSayilari = {};
    for (const g of durumGruplari) {
      if (g.tesisId !== t.id) continue;
      sayilar[g.durum as Durum] = (sayilar[g.durum as Durum] ?? 0) + g._count._all;
    }
    const profilEksik = !t.profil
      || CEKIRDEK_PROFIL_ALANLARI.some((a) => t.profil?.[a] === null);
    return {
      id: t.id, kod: t.kod, ad: t.ad, durum: t.durum,
      tipKod: t.tip?.kod ?? null, tipAd: t.tip?.ad ?? null,
      tuzelKisi: t.tuzelKisi?.ad ?? null,
      kuruluGucMw: t.kuruluGucMw, konum: t.konum,
      kritiklik: t.profil?.kritiklikSinifi ?? null,
      profilEksik, sayilar,
      acikBulgu: bulguSayilari.get(t.id) ?? 0,
      acikRisk: riskSayilari.get(t.id) ?? 0,
    };
  });

  return (
    <>
      <UstCubuk baslik="Santral 360" />
      <main className="icerik">
        <TesisKartlari tesisler={veri} />
      </main>
    </>
  );
}
