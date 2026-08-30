import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import OperasyonIstemci from './OperasyonIstemci';

export default async function Operasyon() {
  await girisZorunlu();
  const [degisiklikler, olaylar, politikalar, tedarikciler, sertifikalar, tesisler] =
    await Promise.all([
      db.degisiklik.findMany({ include: { tesis: true, talepEden: true, onaylayan: true },
        orderBy: { olusturuldu: 'desc' } }),
      db.olay.findMany({ include: { tesis: true }, orderBy: { baslangic: 'desc' } }),
      db.yedeklemePolitikasi.findMany({ include: {
        kosular: { orderBy: { zaman: 'desc' }, take: 5,
          include: { geriYuklemeler: true } } } }),
      db.tedarikci.findMany({ where: { silindi: null },
        include: { sozlesmeler: true, _count: { select: { varliklar: true } } } }),
      db.sertifika.findMany({ include: { varlik: true }, orderBy: { bitis: 'asc' } }),
      db.tesis.findMany({ where: { durum: 'aktif' }, orderBy: { kod: 'asc' } }),
    ]);

  return (
    <>
      <UstCubuk baslik="Operasyon" />
      <main className="icerik">
        <OperasyonIstemci
          degisiklikler={degisiklikler.map((d) => ({
            id: d.id, kod: d.kod, baslik: d.baslik, aciklama: d.aciklama,
            tesisKod: d.tesis?.kod ?? null, tesisId: d.tesisId,
            varlikEtiketi: d.varlikEtiketi, otMu: d.otMu, durum: d.durum,
            saglayiciOnayi: d.saglayiciOnayi, bakimPenceresi: d.bakimPenceresi,
            geriAlmaPlani: d.geriAlmaPlani, onDegisiklikYedegi: d.onDegisiklikYedegi,
            uretimEtkisi: d.uretimEtkisi, sonDogrulama: d.sonDogrulama,
            talepEden: d.talepEden?.adSoyad ?? null, onaylayan: d.onaylayan?.adSoyad ?? null,
            planTarihi: d.planTarihi?.toISOString() ?? null,
          }))}
          olaylar={olaylar.map((o) => ({
            id: o.id, kod: o.kod, baslik: o.baslik, tip: o.tip, siddet: o.siddet,
            durum: o.durum, tesisKod: o.tesis?.kod ?? null, tesisId: o.tesisId,
            ozet: o.ozet, baslangic: o.baslangic.toISOString(),
          }))}
          politikalar={politikalar.map((p) => ({
            id: p.id, ad: p.ad, kapsam: p.kapsam, siklik: p.siklik,
            saklamaGun: p.saklamaGun, hedef: p.hedef,
            kosular: p.kosular.map((ks) => ({
              id: ks.id, zaman: ks.zaman.toISOString(), durum: ks.durum,
              boyutMb: ks.boyutMb, hata: ks.hata,
              restoreTestleri: ks.geriYuklemeler.map((g) => ({
                sonuc: g.sonuc, zaman: g.zaman.toISOString() })),
            })),
          }))}
          tedarikciler={tedarikciler.map((t) => ({
            id: t.id, ad: t.ad, tip: t.tip, uzaktanErisimVar: t.uzaktanErisimVar,
            kritiklik: t.kritiklik, sozlesmeSayisi: t.sozlesmeler.length,
            varlikSayisi: t._count.varliklar,
          }))}
          sertifikalar={sertifikalar.map((s) => ({
            id: s.id, ad: s.ad, veren: s.veren, varlikEtiketi: s.varlik?.etiket ?? null,
            bitis: s.bitis.toISOString(),
          }))}
          tesisler={tesisler.map((t) => ({ id: t.id, kod: t.kod }))} />
      </main>
    </>
  );
}
