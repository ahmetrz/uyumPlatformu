import TemaDugmesi from './TemaDugmesi';
import CikisDugmesi from './CikisDugmesi';
import BildirimZili from './BildirimZili';
import { aktifKullanici } from '@/lib/auth';
import { db } from '@/lib/db';
import { DEMO } from '@/lib/demo';

export default async function UstCubuk({
  baslik, cocuklar,
}: { baslik: string; cocuklar?: React.ReactNode }) {
  const kullanici = await aktifKullanici();
  const bildirimler = kullanici && !DEMO
    ? await db.bildirim.findMany({
        where: { kullaniciId: kullanici.id, okundu: null },
        orderBy: { olusturuldu: 'desc' }, take: 20 })
    : [];
  return (
    <header className="topbar">
      <span className="baslik">{baslik}</span>
      {cocuklar}
      <span className="bosluk" />
      {kullanici && (
        <span className="chip" title={kullanici.unvan ?? undefined}>
          {kullanici.adSoyad}
        </span>
      )}
      <BildirimZili bildirimler={bildirimler.map((b) => ({
        id: b.id, baslik: b.baslik, govde: b.govde, tip: b.tip,
        kaynakTipi: b.kaynakTipi, kaynakId: b.kaynakId,
        zaman: b.olusturuldu.toISOString() }))} />
      <TemaDugmesi />
      {kullanici && !DEMO && <CikisDugmesi />}
    </header>
  );
}
