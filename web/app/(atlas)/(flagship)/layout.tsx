import Ray, { RAY_FLAGSHIP } from '@/components/atlas/Ray';
import { RAY_SERIDI } from '@/lib/atlas/gorsel';

/* Flagship katmanı kendi rayını taşır (02-components §1): kısa liste ve
   168px fotoğrafik ayak şeridi. Operasyonel katmanın 11 öğeli düz listesi
   burada görünmez — ray katmana göre değişir. */

export default function FlagshipYerlesim({ children }: { children: React.ReactNode }) {
  return (
    <div className="atlas atlas-kabuk">
      <Ray ogeler={RAY_FLAGSHIP}
        ayak={{ tip: 'serit', gorsel: RAY_SERIDI,
          alt: 'Zorlu Enerji üretim portföyü — jeotermal, hidro, rüzgâr',
          yazi: 'Enerji üretim grubu · saha' }} />
      <div className="atlas-govde">{children}</div>
    </div>
  );
}
