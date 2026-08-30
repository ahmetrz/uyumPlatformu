import { girisZorunlu } from '@/lib/erisim';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import DenetimDetayIstemci from './DenetimDetayIstemci';


export async function generateStaticParams() {
  const denetimler = await db.denetim.findMany({ select: { id: true } });
  return denetimler.map((d) => ({ id: d.id }));
}

export default async function DenetimDetay({ params }: { params: Promise<{ id: string }> }) {
  await girisZorunlu();
  const { id } = await params;
  const denetim = await db.denetim.findUnique({
    where: { id },
    include: {
      surec: { include: { regulasyon: true } },
      kapsamlar: { include: { tesis: true, madde: true } },
      talepler: {
        include: { sorumlu: true, kanit: true },
        orderBy: [{ durum: 'asc' }, { sonTarih: 'asc' }],
      },
      bulgular: {
        where: { silindi: null },
        include: {
          sorumlu: true,
          maddeDurumu: { include: { madde: true, tesis: true } },
        },
        orderBy: [{ durum: 'asc' }, { onemDerecesi: 'asc' }],
      },
    },
  });
  if (!denetim || denetim.silindi) notFound();

  const [kullanicilar, tesisler, maddeler, kanitlar] = await Promise.all([
    db.kullanici.findMany({ where: { aktif: true }, orderBy: { adSoyad: 'asc' } }),
    db.tesis.findMany({ where: { durum: 'aktif' }, orderBy: { kod: 'asc' } }),
    db.madde.findMany({
      where: {
        silindi: null,
        ...(denetim.surec ? { regulasyonId: denetim.surec.regulasyonId } : {}),
      },
      select: { id: true, kod: true, baslik: true },
      orderBy: [{ sira: 'asc' }, { kod: 'asc' }],
    }),
    db.kanit.findMany({
      where: { silindi: null },
      select: { id: true, ad: true, tip: true },
      orderBy: { ad: 'asc' },
    }),
  ]);

  const veri = {
    id: denetim.id, kod: denetim.kod, ad: denetim.ad, tip: denetim.tip,
    denetleyen: denetim.denetleyen, durum: denetim.durum,
    planBaslangic: denetim.planBaslangic?.toISOString() ?? null,
    planBitis: denetim.planBitis?.toISOString() ?? null,
    olusturuldu: denetim.olusturuldu.toISOString(),
    surec: denetim.surec
      ? { id: denetim.surec.id, kod: denetim.surec.kod, regKod: denetim.surec.regulasyon.kod }
      : null,
    kapsamlar: denetim.kapsamlar.map((x) => ({
      id: x.id,
      tesis: x.tesis ? { id: x.tesis.id, kod: x.tesis.kod, ad: x.tesis.ad } : null,
      madde: x.madde ? { id: x.madde.id, kod: x.madde.kod, baslik: x.madde.baslik } : null,
    })),
    talepler: denetim.talepler.map((t) => ({
      id: t.id, baslik: t.baslik, aciklama: t.aciklama, durum: t.durum,
      sonTarih: t.sonTarih?.toISOString() ?? null,
      sorumlu: t.sorumlu ? { id: t.sorumlu.id, ad: t.sorumlu.adSoyad } : null,
      kanit: t.kanit ? { id: t.kanit.id, ad: t.kanit.ad } : null,
    })),
    bulgular: denetim.bulgular.map((b) => ({
      id: b.id, baslik: b.baslik, onem: b.onemDerecesi, durum: b.durum,
      maddeKod: b.maddeDurumu.madde.kod, tesisKod: b.maddeDurumu.tesis.kod,
      sorumlu: b.sorumlu?.adSoyad ?? null,
      hedef: b.hedefTarih?.toISOString() ?? null,
    })),
    kullanicilar: kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad })),
    tesisler: tesisler.map((t) => ({ id: t.id, kod: t.kod, ad: t.ad })),
    maddeler,
    kanitlar,
  };

  return (
    <>
      <UstCubuk baslik="Denetim detayı" cocuklar={
        <>
          <span className="chip mono">{veri.kod}</span>
          {veri.surec && (
            <Link className="chip mono" href={`/surecler/${veri.surec.id}`}>{veri.surec.kod}</Link>
          )}
        </>
      } />
      <main className="icerik">
        <DenetimDetayIstemci veri={veri} />
      </main>
    </>
  );
}
