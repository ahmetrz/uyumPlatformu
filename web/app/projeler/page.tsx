import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import ProjelerIstemci from './ProjelerIstemci';

export const dynamic = 'force-static';

export default async function Projeler() {
  const [projeler, kullanicilar, maddeler, bulgular] = await Promise.all([
    db.proje.findMany({
      include: { sahip: true, baglantilar: { include: {
        madde: true, bulgu: { include: { maddeDurumu: { include: { tesis: true } } } } } } },
      orderBy: [{ durum: 'asc' }, { hedef: 'asc' }],
    }),
    db.kullanici.findMany({ where: { aktif: true }, orderBy: { adSoyad: 'asc' } }),
    db.madde.findMany({ orderBy: { kod: 'asc' }, select: { id: true, kod: true, baslik: true } }),
    db.bulgu.findMany({ orderBy: { tespitTarihi: 'desc' },
      select: { id: true, baslik: true, durum: true } }),
  ]);

  const veri = projeler.map((p) => ({
    id: p.id, kod: p.kod, ad: p.ad, aciklama: p.aciklama, durum: p.durum,
    baslangic: p.baslangic?.toISOString() ?? null,
    hedef: p.hedef?.toISOString() ?? null,
    sahip: p.sahip ? { id: p.sahip.id, ad: p.sahip.adSoyad } : null,
    baglantilar: p.baglantilar.map((b) => ({
      id: b.id,
      madde: b.madde ? { id: b.madde.id, kod: b.madde.kod, baslik: b.madde.baslik } : null,
      bulgu: b.bulgu ? { id: b.bulgu.id, baslik: b.bulgu.baslik, durum: b.bulgu.durum,
        tesisKod: b.bulgu.maddeDurumu.tesis.kod } : null,
    })),
  }));

  return (
    <>
      <UstCubuk baslik="Projeler" />
      <main className="icerik">
        <ProjelerIstemci projeler={veri}
          kullanicilar={kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad }))}
          maddeler={maddeler.map((m) => ({ id: m.id, kod: m.kod, baslik: m.baslik }))}
          bulgular={bulgular.map((b) => ({ id: b.id, baslik: b.baslik, durum: b.durum }))} />
      </main>
    </>
  );
}
