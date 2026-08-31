import Ray, { RAY_OPERASYONEL } from '@/components/atlas/Ray';

/* Atlas kabuğu — 250px ray | esnek içerik | 420px çekmece (seçim varken).
   Çekmece kolonu CSS :has() ile açılır: ekran <aside class="cekmece">
   render ettiğinde grid ikinci kolonu kazanır, JS gerekmez. */

export default function AtlasYerlesim({ children }: { children: React.ReactNode }) {
  return (
    <div className="atlas atlas-kabuk">
      <Ray ogeler={RAY_OPERASYONEL} />
      <div className="atlas-govde">{children}</div>
    </div>
  );
}
