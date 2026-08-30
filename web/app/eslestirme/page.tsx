import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import EslestirmeIstemci from './EslestirmeIstemci';

export const dynamic = 'force-static';

export default async function Eslestirme() {
  const [regulasyonlar, maddeler, esler] = await Promise.all([
    db.regulasyon.findMany({ where: { aktif: true }, orderBy: { kod: 'asc' } }),
    db.madde.findMany({
      include: { regulasyon: true, altMaddeler: { select: { id: true } } },
      orderBy: { kod: 'asc' },
    }),
    db.maddeEslestirmesi.findMany({ include: {
      kaynak: { include: { regulasyon: true } },
      hedef: { include: { regulasyon: true } } } }),
  ]);

  return (
    <>
      <UstCubuk baslik="Eşleştirme" />
      <main className="icerik">
        <EslestirmeIstemci
          regulasyonlar={regulasyonlar.map((r) => ({ id: r.id, kod: r.kod, ad: r.ad }))}
          maddeler={maddeler.filter((m) => m.altMaddeler.length === 0).map((m) => ({
            id: m.id, kod: m.kod, baslik: m.baslik, regId: m.regulasyonId }))}
          esler={esler.map((e) => ({
            id: e.id, denklik: e.denklik, aciklama: e.aciklama,
            kaynak: { id: e.kaynak.id, kod: e.kaynak.kod, baslik: e.kaynak.baslik, regId: e.kaynak.regulasyonId },
            hedef: { id: e.hedef.id, kod: e.hedef.kod, baslik: e.hedef.baslik, regId: e.hedef.regulasyonId },
          }))} />
      </main>
    </>
  );
}
