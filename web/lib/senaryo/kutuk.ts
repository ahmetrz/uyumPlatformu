import {
  VARLIK_SENARYOLARI, VARLIK_SENARYOLARI_2, VARLIK_SENARYOLARI_3,
} from './varlik';
import {
  UYUM_SENARYOLARI, UYUM_SENARYOLARI_2, UYUM_SENARYOLARI_3,
} from './uyum';
import {
  PLATFORM_SENARYOLARI, PLATFORM_SENARYOLARI_2, PLATFORM_SENARYOLARI_3,
  PLATFORM_SENARYOLARI_4,
} from './platform';
import { KIMLIK_KALIBI, type Senaryo } from './tipler';

/* Senaryo kütüğünün TEK toplama noktası. Belge üreticisi ve nöbetçi test
   yalnız buraya bakar; alan dosyaları büyüdükçe bölünür ama kütüğün
   kendisi tek kalır. */

export const SENARYOLAR: Senaryo[] = [
  ...VARLIK_SENARYOLARI,
  ...VARLIK_SENARYOLARI_2,
  ...VARLIK_SENARYOLARI_3,
  ...UYUM_SENARYOLARI,
  ...UYUM_SENARYOLARI_2,
  ...UYUM_SENARYOLARI_3,
  ...PLATFORM_SENARYOLARI,
  ...PLATFORM_SENARYOLARI_2,
  ...PLATFORM_SENARYOLARI_3,
  ...PLATFORM_SENARYOLARI_4,
];

/** Kütüğün kendi tutarlılığı — nöbetçi test bu listeyi boş bekler. */
export function kutukTutarli(senaryolar: readonly Senaryo[] = SENARYOLAR): string[] {
  const hatalar: string[] = [];
  const gorulen = new Set<string>();
  for (const s of senaryolar) {
    if (!KIMLIK_KALIBI.test(s.id)) hatalar.push(`kimlik kalıba uymuyor: ${s.id}`);
    if (gorulen.has(s.id)) hatalar.push(`kimlik iki kez: ${s.id}`);
    gorulen.add(s.id);
    if (s.katmanlar.length === 0) hatalar.push(`${s.id}: katman bildirilmemiş`);
    for (const [alan, deger] of Object.entries(s)) {
      if (typeof deger === 'string' && deger.trim() === '') {
        hatalar.push(`${s.id}: ${alan} boş`);
      }
    }
  }
  return hatalar;
}

/** Alan → senaryo sayısı. */
export function alanOzeti(senaryolar: readonly Senaryo[] = SENARYOLAR) {
  const harita = new Map<string, number>();
  for (const s of senaryolar) harita.set(s.alan, (harita.get(s.alan) ?? 0) + 1);
  return [...harita.entries()].sort((a, b) => a[0].localeCompare(b[0], 'tr'));
}
