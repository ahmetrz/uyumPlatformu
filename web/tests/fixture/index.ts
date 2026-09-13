import type { FiksturSeti } from '@/lib/entegrasyon/sertifika';
import { adEntraFiksturu } from './adEntra';
import { zafiyetTarayiciFiksturu } from './zafiyetTarayici';
import { edrFiksturu } from './edr';
import { siemFiksturu } from './siem';
import { yedeklemeFiksturu } from './yedekleme';
import { agGuvenlikDuvariFiksturu } from './agGuvenlikDuvari';
import { otKesifFiksturu } from './otKesif';
import { elleAktarimFiksturu } from './elleAktarim';

/* Fikstür kataloğu — `Connector.tip` → fikstür.

   Anahtarlar `lib/entegrasyon/adaptorler/index.ts` ile BİREBİR aynıdır;
   sertifikasyon testi ikisinin ayrışmadığını ayrıca doğrular. Bir tip
   için fikstür yoksa o adaptör sertifikasyondan geçemez — sessizce
   atlanmaz.

   Fikstürün varlığı adaptörü bağlanabilir YAPMAZ. */

export const FIKSTURLER: Record<string, FiksturSeti> = {
  ad_entra: adEntraFiksturu,
  vuln_scanner: zafiyetTarayiciFiksturu,
  edr: edrFiksturu,
  siem: siemFiksturu,
  backup: yedeklemeFiksturu,
  network_firewall: agGuvenlikDuvariFiksturu,
  ot_discovery: otKesifFiksturu,
  manual_import: elleAktarimFiksturu,
};

export function fiksturCoz(tip: string): FiksturSeti {
  const f = FIKSTURLER[tip];
  if (!f) {
    throw new Error(
      `Bu connector tipi için sertifikasyon fikstürü yok: '${tip}'. `
      + `Tanımlı olanlar: ${Object.keys(FIKSTURLER).sort().join(', ')}`,
    );
  }
  return f;
}

export * from './ortak';
