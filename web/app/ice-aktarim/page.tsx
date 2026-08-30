import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import IceAktarimIstemci from './IceAktarimIstemci';

export const dynamic = 'force-static';

export default async function IceAktarim() {
  const [aktarimlar, regulasyonlar, alanlar] = await Promise.all([
    db.iceAktarim.findMany({
      include: { regulasyon: true, yukleyen: true },
      orderBy: { olusturuldu: 'desc' },
    }),
    db.regulasyon.findMany({ where: { aktif: true }, orderBy: { kod: 'asc' } }),
    db.kapsamAlani.findMany({ where: { aktif: true } }),
  ]);

  return (
    <>
      <UstCubuk baslik="İçe aktarım" />
      <main className="icerik">
        <IceAktarimIstemci
          aktarimlar={aktarimlar.map((a) => ({
            id: a.id, kaynakTipi: a.kaynakTipi, kaynakAdi: a.kaynakAdi, durum: a.durum,
            okunan: a.okunan, eklenen: a.eklenen, guncellenen: a.guncellenen, elenen: a.elenen,
            raporJson: a.raporJson, regKod: a.regulasyon.kod,
            yukleyen: a.yukleyen?.adSoyad ?? null,
            zaman: a.olusturuldu.toISOString(),
          }))}
          regulasyonlar={regulasyonlar.map((r) => ({ id: r.id, kod: r.kod, ad: r.ad }))}
          alanKodlari={alanlar.map((a) => a.kod)} />
      </main>
    </>
  );
}
