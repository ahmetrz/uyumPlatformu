import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import TanimlarIstemci from './TanimlarIstemci';


export default async function Tanimlar() {
  await girisZorunlu();
  const [sektorler, tipler, tesisler, regulasyonlar, alanlar] = await Promise.all([
    db.sektor.findMany({ include: { _count: { select: { tipler: true } } }, orderBy: { kod: 'asc' } }),
    db.tesisTipi.findMany({ include: { sektor: true, _count: { select: { tesisler: true } } },
      orderBy: { sira: 'asc' } }),
    db.tesis.findMany({ include: { tip: true,
      _count: { select: { surecKapsamlari: true } } }, orderBy: { kod: 'asc' } }),
    db.regulasyon.findMany({ include: { _count: { select: { maddeler: true, surecler: true } } },
      orderBy: { kod: 'asc' } }),
    db.kapsamAlani.findMany({ include: { _count: { select: { maddeAlanlari: true } } },
      orderBy: { kod: 'asc' } }),
  ]);

  return (
    <>
      <UstCubuk baslik="Tanımlar" />
      <main className="icerik">
        <TanimlarIstemci
          sektorler={sektorler.map((s) => ({ id: s.id, kod: s.kod, ad: s.ad, tipSayisi: s._count.tipler }))}
          tipler={tipler.map((t) => ({ id: t.id, kod: t.kod, ad: t.ad,
            sektorId: t.sektorId, sektorKod: t.sektor?.kod ?? null, tesisSayisi: t._count.tesisler }))}
          tesisler={tesisler.map((t) => ({ id: t.id, kod: t.kod, ad: t.ad,
            tipId: t.tipId, tipKod: t.tip?.kod ?? null, guc: t.kuruluGucMw, konum: t.konum,
            durum: t.durum, kapanisNedeni: t.kapanisNedeni,
            kapanisTarihi: t.kapanisTarihi?.toISOString() ?? null,
            surecSayisi: t._count.surecKapsamlari }))}
          regulasyonlar={regulasyonlar.map((r) => ({ id: r.id, kod: r.kod, ad: r.ad,
            surum: r.surum, kaynakUrl: r.kaynakUrl, aktif: r.aktif,
            maddeSayisi: r._count.maddeler, surecSayisi: r._count.surecler }))}
          alanlar={alanlar.map((a) => ({ id: a.id, kod: a.kod, ad: a.ad,
            aciklama: a.aciklama, maddeSayisi: a._count.maddeAlanlari }))} />
      </main>
    </>
  );
}
