import 'server-only';
import type { Adaptor } from '../sozlesme';
import { adEntraAdaptoru } from './adEntra';
import { zafiyetTarayiciAdaptoru } from './zafiyetTarayici';
import { edrAdaptoru } from './edr';
import { siemAdaptoru } from './siem';
import { yedeklemeAdaptoru } from './yedekleme';
import { agGuvenlikDuvariAdaptoru } from './agGuvenlikDuvari';
import { otKesifAdaptoru } from './otKesif';
import { elleAktarimAdaptoru } from './elleAktarim';

/* Adaptör kaydı — `Connector.tip` → adaptör.

   Sekiz adaptörden YEDİSİ bağlı değildir ve bunu açıkça söyler
   (`baglanabilir = false`, sağlıkta `kimlik_bekleniyor`). Yalnız
   `manual_import` gerçekten çalışır; dış sistem gerektirmez.

   Buradaki tip anahtarları `prisma/schema.prisma` → `Connector.tip`
   yorumundaki listeyle BİREBİR aynıdır. Yeni tip eklenirse şema sahibine
   bildirilir; burada uydurma bir tip açılmaz. */

export const ADAPTORLER = {
  ad_entra: adEntraAdaptoru,
  vuln_scanner: zafiyetTarayiciAdaptoru,
  edr: edrAdaptoru,
  siem: siemAdaptoru,
  backup: yedeklemeAdaptoru,
  network_firewall: agGuvenlikDuvariAdaptoru,
  ot_discovery: otKesifAdaptoru,
  manual_import: elleAktarimAdaptoru,
} as const satisfies Record<string, Adaptor>;

export type AdaptorTipi = keyof typeof ADAPTORLER;

export const ADAPTOR_TIPLERI = Object.keys(ADAPTORLER) as AdaptorTipi[];

/**
 * Tipe göre adaptör verir. Bilinmeyen tip için FIRLATIR — sessizce
 * "bağlı değil" davranışına düşmek, yanlış yapılandırılmış bir connector'ı
 * doğru sanmamıza yol açar.
 */
export function adaptorGetir(tip: string): Adaptor {
  const a = (ADAPTORLER as Record<string, Adaptor>)[tip];
  if (!a) {
    throw new Error(
      `Bilinmeyen connector tipi: ${tip} — tanımlı tipler: ${ADAPTOR_TIPLERI.join(', ')}`,
    );
  }
  return a;
}

/** `gereken` alanı yalnız bağlanmamış adaptörlerde bulunur. */
export function adaptorGerekeni(a: Adaptor): string | null {
  const g = (a as Adaptor & { gereken?: string }).gereken;
  return typeof g === 'string' ? g : null;
}

export {
  adEntraAdaptoru, zafiyetTarayiciAdaptoru, edrAdaptoru, siemAdaptoru,
  yedeklemeAdaptoru, agGuvenlikDuvariAdaptoru, otKesifAdaptoru, elleAktarimAdaptoru,
};
