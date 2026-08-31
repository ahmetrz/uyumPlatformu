import Ray, { RAY_OPERASYONEL } from '@/components/atlas/Ray';
import { aktifKullanici } from '@/lib/auth';

/** Rayın oturum bloğu için: ad, unvan ve çıkış düğmesinin görünüp
    görünmeyeceği. Oturum yoksa blok hiç çizilmez. */
async function oturumBlogu() {
  const k = await aktifKullanici();
  if (!k) return null;
  return { ad: k.adSoyad, unvan: k.unvan, demo: k.id === 'demo' };
}

/* Atlas kabuğu — 250px ray | esnek içerik | 420px çekmece (seçim varken).
   Çekmece kolonu CSS :has() ile açılır: ekran <aside class="cekmece">
   render ettiğinde grid ikinci kolonu kazanır, JS gerekmez. */

export default async function AtlasYerlesim({ children }: { children: React.ReactNode }) {
  return (
    <div className="atlas atlas-kabuk">
      <Ray ogeler={RAY_OPERASYONEL} kullanici={await oturumBlogu()} />
      <div className="atlas-govde">{children}</div>
    </div>
  );
}
