import TemaDugmesi from './TemaDugmesi';
import CikisDugmesi from './CikisDugmesi';
import { aktifKullanici } from '@/lib/auth';
import { DEMO } from '@/lib/demo';

export default async function UstCubuk({
  baslik, cocuklar,
}: { baslik: string; cocuklar?: React.ReactNode }) {
  const kullanici = await aktifKullanici();
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
      <TemaDugmesi />
      {kullanici && !DEMO && <CikisDugmesi />}
    </header>
  );
}
