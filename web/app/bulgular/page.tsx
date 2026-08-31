import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import BulgularIstemci from './BulgularIstemci';


export default async function Bulgular() {
  await girisZorunlu();
  const bulgular = await db.bulgu.findMany({
    include: {
      sorumlu: true,
      aksiyonlar: { select: { id: true, durum: true } },
      maddeDurumu: { include: { madde: true, tesis: true, surec: { include: { regulasyon: true } } } },
    },
    orderBy: [{ durum: 'asc' }, { onemDerecesi: 'asc' }, { hedefTarih: 'asc' }],
  });

  const veri = bulgular.map((b) => ({
    id: b.id, baslik: b.baslik, durum: b.durum, onem: b.onemDerecesi,
    kaynak: b.kaynak, tespit: b.tespitTarihi.toISOString(),
    hedef: b.hedefTarih?.toISOString() ?? null,
    sorumlu: b.sorumlu?.adSoyad ?? null,
    maddeKod: b.maddeDurumu.madde.kod,
    maddeBaslik: b.maddeDurumu.madde.baslik,
    tesisKod: b.maddeDurumu.tesis.kod,
    tesisAd: b.maddeDurumu.tesis.ad,
    surecKod: b.maddeDurumu.surec.kod,
    regKod: b.maddeDurumu.surec.regulasyon.kod,
    aksiyonToplam: b.aksiyonlar.length,
    aksiyonBiten: b.aksiyonlar.filter((a) => a.durum === 'tamamlandi').length,
  }));

  return (
    <>
      <UstCubuk baslik="Bulgular" />
      <main className="icerik">
        <BulgularIstemci bulgular={veri} />
      </main>
    </>
  );
}
