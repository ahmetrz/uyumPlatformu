import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import BulguDetayIstemci from './BulguDetayIstemci';

export const metadata: Metadata = { title: 'Bulgu kaydı — Atlas' };

export async function generateStaticParams() {
  const bulgular = await db.bulgu.findMany({ select: { id: true } });
  return bulgular.map((b) => ({ id: b.id }));
}

/* O7 · kayıt ekranı. Liste çekmecesi özeti taşır; bütün mutasyonlar
   (bulguGuncelle · aksiyonEkle · aksiyonDurumDegistir · kanitEkle) ve tam
   denetim izi burada yaşar. Yerleşim: BaglamCubugu + içerik + 420px panel. */

export default async function Sayfa({ params }: { params: Promise<{ id: string }> }) {
  await girisZorunlu();
  const { id } = await params;

  const bulgu = await db.bulgu.findUnique({
    where: { id },
    include: {
      sorumlu: true,
      kapanisDogrulayan: true,
      aksiyonlar: {
        include: { sorumlu: true, dogrulayan: true },
        orderBy: [{ baslangic: 'asc' }],
      },
      projeBaglantilari: { include: { proje: true } },
      riskler: true,
      maddeDurumu: {
        include: {
          madde: true,
          tesis: { include: { tip: true } },
          surec: { include: { regulasyon: true } },
          kanitBaglantilari: { include: { kanit: true } },
        },
      },
    },
  });
  if (!bulgu) notFound();

  const [aktiviteler, kullanicilar] = await Promise.all([
    db.aktiviteKaydi.findMany({
      where: {
        OR: [
          { varlikTipi: 'Bulgu', varlikId: id },
          { varlikTipi: 'Aksiyon', varlikId: { in: bulgu.aksiyonlar.map((a) => a.id) } },
          { varlikTipi: 'MaddeDurumu', varlikId: bulgu.maddeDurumuId },
        ],
      },
      include: { aktor: true },
      orderBy: { zaman: 'desc' },
    }),
    db.kullanici.findMany({ where: { aktif: true }, orderBy: { adSoyad: 'asc' } }),
  ]);

  const veri = {
    id: bulgu.id,
    maddeDurumuId: bulgu.maddeDurumuId,
    baslik: bulgu.baslik,
    aciklama: bulgu.aciklama,
    durum: bulgu.durum,
    onem: bulgu.onemDerecesi,
    kaynak: bulgu.kaynak,
    kokNeden: bulgu.kokNeden,
    tespit: bulgu.tespitTarihi.toISOString(),
    hedef: bulgu.hedefTarih?.toISOString() ?? null,
    kapanma: bulgu.kapanmaTarihi?.toISOString() ?? null,
    retestGerekli: bulgu.retestGerekli,
    retestSonucu: bulgu.retestSonucu,
    kapanisDogrulama: bulgu.kapanisDogrulama?.toISOString() ?? null,
    kapanisDogrulayan: bulgu.kapanisDogrulayan?.adSoyad ?? null,
    sorumluId: bulgu.sorumluId,
    sorumlu: bulgu.sorumlu?.adSoyad ?? null,
    madde: {
      kod: bulgu.maddeDurumu.madde.kod,
      baslik: bulgu.maddeDurumu.madde.baslik,
      metin: bulgu.maddeDurumu.madde.metin,
    },
    tesis: {
      id: bulgu.maddeDurumu.tesisId,
      kod: bulgu.maddeDurumu.tesis.kod,
      ad: bulgu.maddeDurumu.tesis.ad,
      tip: bulgu.maddeDurumu.tesis.tip?.kod ?? null,
    },
    surec: {
      id: bulgu.maddeDurumu.surecId,
      kod: bulgu.maddeDurumu.surec.kod,
      regKod: bulgu.maddeDurumu.surec.regulasyon.kod,
    },
    aksiyonlar: bulgu.aksiyonlar.map((a) => ({
      id: a.id, baslik: a.baslik, durum: a.durum,
      sorumlu: a.sorumlu?.adSoyad ?? null,
      hedef: a.hedef?.toISOString() ?? null,
      tamamlanma: a.tamamlanma?.toISOString() ?? null,
      dogrulama: a.dogrulamaDurumu,
      dogrulamaTarihi: a.dogrulamaTarihi?.toISOString() ?? null,
      dogrulayan: a.dogrulayan?.adSoyad ?? null,
      not: a.etkinlikNotu,
    })),
    projeler: bulgu.projeBaglantilari.map((p) => ({
      id: p.proje.id, kod: p.proje.kod, ad: p.proje.ad,
    })),
    riskler: bulgu.riskler.map((r) => ({ id: r.id, kod: r.kod, baslik: r.baslik })),
    kanitlar: bulgu.maddeDurumu.kanitBaglantilari.map((kb) => ({
      id: kb.kanit.id, ad: kb.kanit.ad, tip: kb.kanit.tip,
      baslangic: kb.kanit.gecerlilikBaslangic.toISOString(),
    })),
    aktiviteler: aktiviteler.map((a) => ({
      id: a.id, aktor: a.aktor?.adSoyad ?? 'Sistem', eylem: a.eylem,
      varlikTipi: a.varlikTipi, alan: a.alan,
      once: a.oncekiDeger, sonra: a.yeniDeger,
      dosya: a.dosyaAdi, zaman: a.zaman.toISOString(),
    })),
    kullanicilar: kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad })),
  };

  return <BulguDetayIstemci veri={veri} />;
}
