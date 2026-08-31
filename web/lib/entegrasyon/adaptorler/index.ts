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

/* Tipten adaptöre çözüm BURADA YAPILMAZ.

   Bir zamanlar burada `adaptorGetir` vardı ve doğrudan yukarıdaki statik
   haritayı okuyordu; `lib/entegrasyon/kayit.ts` ise aynı işi çalışma
   zamanı kayıt defteri üzerinden yapıyordu. İki ayrı doğruluk kaynağı:
   defterle kaydedilen bir adaptörü statik harita göremez, defterden
   silineni hâlâ döndürürdü. Çözüm tek yerde kaldı — `adaptorCoz`.

   Burası yalnız KATALOG'dur: hangi tipler için adaptör yazılmış.
   Çalışma zamanında gerçekten kayıtlı olanı `kayitliTipler()` söyler. */

/** `gereken` alanı yalnız bağlanmamış adaptörlerde bulunur. */
export function adaptorGerekeni(a: Adaptor): string | null {
  const g = (a as Adaptor & { gereken?: string }).gereken;
  return typeof g === 'string' ? g : null;
}

export {
  adEntraAdaptoru, zafiyetTarayiciAdaptoru, edrAdaptoru, siemAdaptoru,
  yedeklemeAdaptoru, agGuvenlikDuvariAdaptoru, otKesifAdaptoru, elleAktarimAdaptoru,
};
