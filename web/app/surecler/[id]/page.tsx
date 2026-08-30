import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import SurecDetayIstemci from './SurecDetayIstemci';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  const surecler = await db.uyumSureci.findMany({ select: { id: true } });
  return surecler.map((s) => ({ id: s.id }));
}

export default async function SurecDetay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const surec = await db.uyumSureci.findUnique({
    where: { id },
    include: {
      regulasyon: true,
      kapsam: { include: { tesis: { include: { tip: true } } } },
      durumlar: {
        include: {
          sorumlu: true,
          bulgular: { select: { id: true, durum: true, onemDerecesi: true, baslik: true } },
          kanitBaglantilari: { include: { kanit: true } },
        },
      },
    },
  });
  if (!surec) notFound();

  const [maddeler, kullanicilar, alanlar] = await Promise.all([
    db.madde.findMany({
      where: { regulasyonId: surec.regulasyonId },
      include: {
        alanlar: { include: { alan: true } },
        eslestirmeKaynak: { include: { hedef: true } },
        eslestirmeHedef: { include: { kaynak: true } },
      },
      orderBy: [{ sira: 'asc' }, { kod: 'asc' }],
    }),
    db.kullanici.findMany({ where: { aktif: true }, orderBy: { adSoyad: 'asc' } }),
    db.kapsamAlani.findMany({ where: { aktif: true } }),
  ]);

  const veri = {
    id: surec.id, kod: surec.kod, ad: surec.ad, durum: surec.durum,
    baslangic: surec.baslangic?.toISOString() ?? null,
    bitis: surec.bitis?.toISOString() ?? null,
    aciklama: surec.aciklama,
    regulasyon: { id: surec.regulasyonId, kod: surec.regulasyon.kod, ad: surec.regulasyon.ad },
    tesisler: surec.kapsam.map((k) => ({
      id: k.tesis.id, kod: k.tesis.kod, ad: k.tesis.ad, tip: k.tesis.tip?.kod ?? null })),
    maddeler: maddeler.map((m) => ({
      id: m.id, kod: m.kod, baslik: m.baslik, metin: m.metin,
      ustMaddeId: m.ustMaddeId, kanitTipi: m.kanitTipi,
      alanlar: m.alanlar.map((a) => a.alan.kod),
      esler: [
        ...m.eslestirmeKaynak.map((e) => ({ kod: e.hedef.kod, denklik: e.denklik })),
        ...m.eslestirmeHedef.map((e) => ({ kod: e.kaynak.kod, denklik: e.denklik })),
      ],
    })),
    durumlar: surec.durumlar.map((d) => ({
      id: d.id, maddeId: d.maddeId, tesisId: d.tesisId, durum: d.durum,
      not: d.not, sorumlu: d.sorumlu ? { id: d.sorumlu.id, ad: d.sorumlu.adSoyad } : null,
      sonDegerlendirme: d.sonDegerlendirme?.toISOString() ?? null,
      bulgular: d.bulgular,
      kanitlar: d.kanitBaglantilari.map((k) => ({
        id: k.kanit.id, ad: k.kanit.ad, tip: k.kanit.tip,
        baslangic: k.kanit.gecerlilikBaslangic.toISOString() })),
    })),
    kullanicilar: kullanicilar.map((k) => ({ id: k.id, ad: k.adSoyad })),
    alanlar: alanlar.map((a) => ({ id: a.id, kod: a.kod, ad: a.ad })),
  };

  return (
    <>
      <UstCubuk baslik={surec.ad} />
      <main className="icerik">
        <SurecDetayIstemci veri={veri} />
      </main>
    </>
  );
}
