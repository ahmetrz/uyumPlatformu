import Ray, { RAY_FLAGSHIP } from '@/components/atlas/Ray';
import { RAY_SERIDI } from '@/lib/atlas/gorsel';
import { aktifKullanici } from '@/lib/auth';

/** Rayın oturum bloğu için: ad, unvan ve çıkış düğmesinin görünüp
    görünmeyeceği. Oturum yoksa blok hiç çizilmez. */
async function oturumBlogu() {
  const k = await aktifKullanici();
  if (!k) return null;
  return { ad: k.adSoyad, unvan: k.unvan, demo: k.id === 'demo' };
}

/* Flagship katmanı kendi rayını taşır (02-components §1): kısa liste ve
   168px fotoğrafik ayak şeridi. Operasyonel katmanın 11 öğeli düz listesi
   burada görünmez — ray katmana göre değişir. */

export default async function FlagshipYerlesim({ children }: { children: React.ReactNode }) {
  return (
    <div className="atlas atlas-kabuk">
      <Ray ogeler={RAY_FLAGSHIP}
        ayak={{ tip: 'serit', gorsel: RAY_SERIDI,
          alt: 'Zorlu Enerji üretim portföyü — jeotermal, hidro, rüzgâr',
          yazi: 'Enerji üretim grubu · saha' }}
        kullanici={await oturumBlogu()} />
      <div className="atlas-govde">{children}</div>
    </div>
  );
}
