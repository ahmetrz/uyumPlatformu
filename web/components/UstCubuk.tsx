import TemaDugmesi from './TemaDugmesi';

export default function UstCubuk({
  baslik, cocuklar,
}: { baslik: string; cocuklar?: React.ReactNode }) {
  return (
    <header className="topbar">
      <span className="baslik">{baslik}</span>
      {cocuklar}
      <span className="bosluk" />
      <TemaDugmesi />
    </header>
  );
}
