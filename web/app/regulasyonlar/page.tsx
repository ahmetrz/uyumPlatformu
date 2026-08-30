import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import RegulasyonlarIstemci from './RegulasyonlarIstemci';

export const dynamic = 'force-static';

export default async function Regulasyonlar() {
  const [regulasyonlar, alanlar] = await Promise.all([
    db.regulasyon.findMany({
      include: {
        maddeler: { include: { alanlar: { include: { alan: true } },
          _count: { select: { altMaddeler: true, durumlar: true } } },
          orderBy: [{ sira: 'asc' }, { kod: 'asc' }] },
        _count: { select: { surecler: true } },
      },
      orderBy: { kod: 'asc' },
    }),
    db.kapsamAlani.findMany({ where: { aktif: true }, orderBy: { kod: 'asc' } }),
  ]);

  return (
    <>
      <UstCubuk baslik="Regülasyon kütüphanesi" />
      <main className="icerik">
        <RegulasyonlarIstemci
          regulasyonlar={regulasyonlar.map((r) => ({
            id: r.id, kod: r.kod, ad: r.ad, surum: r.surum, aktif: r.aktif,
            surecSayisi: r._count.surecler,
            maddeler: r.maddeler.map((m) => ({
              id: m.id, kod: m.kod, baslik: m.baslik, metin: m.metin,
              ustMaddeId: m.ustMaddeId, kanitTipi: m.kanitTipi,
              alanlar: m.alanlar.map((a) => ({ id: a.alan.id, kod: a.alan.kod })),
              altSayisi: m._count.altMaddeler, kullanimSayisi: m._count.durumlar,
            })),
          }))}
          alanlar={alanlar.map((a) => ({ id: a.id, kod: a.kod, ad: a.ad }))} />
      </main>
    </>
  );
}
