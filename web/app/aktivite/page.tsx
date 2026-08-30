import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import AktiviteIstemci from './AktiviteIstemci';

export const dynamic = 'force-static';

export default async function Aktivite() {
  const kayitlar = await db.aktiviteKaydi.findMany({
    include: { aktor: true }, orderBy: { zaman: 'desc' }, take: 400,
  });

  return (
    <>
      <UstCubuk baslik="Aktivite" />
      <main className="icerik">
        <AktiviteIstemci kayitlar={kayitlar.map((a) => ({
          id: a.id, aktor: a.aktor?.adSoyad ?? 'Sistem', varlikTipi: a.varlikTipi,
          varlikId: a.varlikId, eylem: a.eylem, alan: a.alan,
          once: a.oncekiDeger, sonra: a.yeniDeger, dosya: a.dosyaAdi,
          zaman: a.zaman.toISOString(),
        }))} />
      </main>
    </>
  );
}
