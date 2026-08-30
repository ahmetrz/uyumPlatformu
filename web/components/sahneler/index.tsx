import { KapakDGKC } from './KapakDGKC';
import { KapakHES } from './KapakHES';
import { KapakRES } from './KapakRES';
import { KapakGES } from './KapakGES';
import { KapakJEO } from './KapakJEO';
import { KapakMERKEZ } from './KapakMERKEZ';
import { KapakSebeke } from './KapakSebeke';

export { Panorama } from './Panorama';
export { BosGenel, BosTemiz, BosKuyruk } from './BosDurumlar';
export { IKONLAR, MarkaIsareti } from './Ikonlar';
export { KapakDGKC, KapakHES, KapakRES, KapakGES, KapakJEO, KapakMERKEZ, KapakSebeke };

/* Tesis tipi koduna göre kapak sahnesi. Tanımlar dinamiktir (panelden yeni
   tip eklenebilir): bilinmeyen tipler şebeke kapağına düşer. */
const KAPAKLAR: Record<string, (p: { className?: string }) => React.ReactNode> = {
  DGKC: KapakDGKC, TERMIK: KapakDGKC, HES: KapakHES, RES: KapakRES,
  GES: KapakGES, JEO: KapakJEO, MERKEZ: KapakMERKEZ,
};

export function KapakSec({ tipKod, className }: { tipKod?: string | null; className?: string }) {
  const K = KAPAKLAR[(tipKod ?? '').toUpperCase()] ?? KapakSebeke;
  return <>{K({ className })}</>;
}
