import { girisZorunlu } from '@/lib/erisim';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import BulguDetayIstemci from './BulguDetayIstemci';


export async function generateStaticParams() {
  const bulgular = await db.bulgu.findMany({ select: { id: true } });
  return bulgular.map((b) => ({ id: b.id }));
}

export default async function BulguDetay({ params }: { params: Promise<{ id: string }> }) {
  await girisZorunlu();
  const { id } = await params;
  const bulgu = await db.bulgu.findUnique({
    where: { id },
    include: {
      sorumlu: true,
      aksiyonlar: { include: { sorumlu: true }, orderBy: { baslangic: 'asc' } },
      projeBaglantilari: { include: { proje: true } },
      maddeDurumu: { include: {
        madde: true, tesis: { include: { tip: true } },
        surec: { include: { regulasyon: true } },
        kanitBaglantilari: { include: { kanit: true } },
      } },
    },
  });
  if (!bulgu) notFound();

  const [aktiviteler, kullanicilar] = await Promise.all([
    db.aktiviteKaydi.findMany({
      where: { OR: [
        { varlikTipi: 'Bulgu', varlikId: id },
        { varlikTipi: 'Aksiyon', varlikId: { in: bulgu.aksiyonlar.map((a) => a.id) } },
        { varlikTipi: 'MaddeDurumu', varlikId: bulgu.maddeDurumuId },
      ] },
      include: { aktor: true }, orderBy: { zaman: 'desc' },
    }),
    db.kullanici.findMany({ where: { aktif: true }, orderBy: { adSoyad: 'asc' } }),
  ]);

  const veri = {
    id: bulgu.id, baslik: bulgu.baslik, aciklama: bulgu.aciklama,
    onem: bulgu.onemDerecesi, durum: bulgu.durum, kaynak: bulgu.kaynak,
    tespit: bulgu.tespitTarihi.toISOString(),
    hedef: bulgu.hedefTarih?.toISOString() ?? null,
    kapanma: bulgu.kapanmaTarihi?.toISOString() ?? null,
    sorumlu: bulgu.sorumlu ? { id: bulgu.sorumlu.id, ad: bulgu.sorumlu.adSoyad } : null,
    madde: { kod: bulgu.maddeDurumu.madde.kod, baslik: bulgu.maddeDurumu.madde.baslik,
      metin: bulgu.maddeDurumu.madde.metin },
    tesis: { kod: bulgu.maddeDurumu.tesis.kod, ad: bulgu.maddeDurumu.tesis.ad,
      tip: bulgu.maddeDurumu.tesis.tip?.kod ?? null },
    surec: { id: bulgu.maddeDurumu.surec.id, kod: bulgu.maddeDurumu.surec.kod,
      regKod: bulgu.maddeDurumu.surec.regulasyon.kod },
    aksiyonlar: bulgu.aksiyonlar.map((a) => ({
      id: a.id, baslik: a.baslik, durum: a.durum,
      sorumlu: a.sorumlu?.adSoyad ?? null,
      hedef: a.hedef?.toISOString() ?? null,
      tamamlanma: a.tamamlanma?.toISOString() ?? null,
    })),
    projeler: bulgu.projeBaglantilari.map((p) => ({ id: p.proje.id, kod: p.proje.kod, ad: p.proje.ad })),
    kanitlar: bulgu.maddeDurumu.kanitBaglantilari.map((kb) => ({
      id: kb.kanit.id, ad: kb.kanit.ad, tip: kb.kanit.tip,
      baslangic: kb.kanit.gecerlilikBaslangic.toISOString() })),
    aktiviteler: aktiviteler.map((a) => ({
      id: a.id, aktor: a.aktor?.adSoyad ?? 'Sistem', eylem: a.eylem,
      alan: a.alan, once: a.oncekiDeger, sonra: a.yeniDeger,
      dosya: a.dosyaAdi, zaman: a.zaman.toISOString(), varlikTipi: a.varlikTipi,
    })),
    kullanicilar: kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad })),
  };

  return (
    <>
      <UstCubuk baslik="Bulgu detayı" cocuklar={
        <Link className="chip mono" href={`/surecler/${veri.surec.id}`}>{veri.surec.kod}</Link>
      } />
      <main className="icerik">
        <BulguDetayIstemci veri={veri} />
      </main>
    </>
  );
}
