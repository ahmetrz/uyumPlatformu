import 'server-only';
import { z } from 'zod';
import { BaglanmamisAdaptor } from '../sozlesme';
import { AKTIF_ISLEM_YASAK, ORTAK_YAPILANDIRMA } from './ortak';

/* ═══════════════════════════════════════════════════════════════════════
   OT varlık keşif ürünü (Claroty CTD · Nozomi Guardian · Dragos ·
   Tenable.ot · Forescout eyeInspect) — BAĞLI DEĞİL.

   ── PASSIVE-FIRST · MİMARİ KARAR ─────────────────────────────────────
   Bu platform OT'de KENDİ TARAYICISINI ÇALIŞTIRMAZ. Sahada zaten kurulu
   olan pasif keşif ürünü SPAN/TAP portundan trafiği dinler, protokolü
   (Modbus, S7comm, DNP3, EtherNet/IP, IEC-104, OPC UA) çözer ve envanteri
   kendi çıkarır. Bizim işimiz o envanteri OKUMAK.

   YASAK — bu ürünlerin "aktif sorgulama" özelliği vardır ve buradan
   TETİKLENMEZ:
     · Claroty "Active Queries" / Nozomi "Smart Polling" / Tenable.ot
       "Active Queries" başlatmak
     · yeni bir keşif işi zamanlamak, sorgulama profili değiştirmek
   Bu özellikler kontrolcüye protokol paketi gönderir; OT sahibinin
   değişiklik yönetiminden geçmesi gerekir, bir CMDB senkronizasyonundan
   tetiklenemez. İstemcide yalnız GET metotları bulunmalıdır.

   ── BAĞLARKEN NEREYE NE YAZILACAK ────────────────────────────────────
   Claroty CTD (salt okunur API kullanıcısı):
     POST /auth/authenticate                → token
     GET  /ranger/assets?page=…&per_page=…  → varlık envanteri
     GET  /ranger/baselines                 → iletişim temeli (topoloji)
   Nozomi Networks Guardian:
     GET /api/open/query/do?query=assets | select id, name, mac_address,
         ip, vendor, product_name, firmware_version, os, zone, level
     GET /api/open/query/do?query=links     → düğümler arası iletişim
   Dragos Platform:
     GET /api/v1/assets?updated_after={imlec}
   Tenable.ot:
     GET /v1/assets  ·  GET /v1/assets/{id}/details

   `fetchChanges` imleci: ürünün desteklediği `updated_after` / `since`
   zaman damgası; desteklemiyorsa envanterin içerik özeti.

   VarlikGozlemi eşlemesi (Claroty/Nozomi ortak alanlarıyla):
     asset.id / insight id       → koken.kaynakKayitId  (KARARLI)
     asset.name / hostname       → hostname
     asset.serial_number         → seriNo        (EN GÜÇLÜ eşleme anahtarı)
     asset.mac_address[0]        → macAdresi     (birden fazla NIC varsa
                                   HER BİRİ için ayrı gözlem üretilir; ilk
                                   MAC seçilip diğerleri atılmaz)
     asset.ip / ip_addresses[0]  → ipAdresi      (tek başına eşleşmez)
     asset.vendor                → uretici
     asset.model / product_name  → model
     asset.os / firmware_version → isletimSistemi / firmware
     asset.site / zone           → tesisKodu / bolgeKodu
     asset.purdue_level          → ham içinde (Purdue seviyesi AgBolgesi'ne
                                   bağlanır; alan uydurulmaz)
     asset.type (PLC/HMI/EWS…)   → turKodu       (kurum sözlüğüne eşlenir)
     tüm varlık nesnesi          → ham

   TopolojiGozlemiGirdi eşlemesi:
     ogeTipi 'dugum'    → asset  (anahtar: asset.id)
     ogeTipi 'baglanti' → link   (anahtar: `${kaynakId}→${hedefId}:${protokol}`)
     ozellikler         → { protokol, portlar, ilkGorulme, sonGorulme,
                            paketSayisi, yon }

   koken.guven: pasif keşif üründen gelen seri numarası protokol
   sorgusuyla doğrulanmışsa yüksektir. Öneri: ürün "confidence" alanı
   veriyorsa 0–1'e ölçekle ve AYNEN kullan; vermiyorsa seri numarası
   varsa 0.85, yoksa 0.6; hiçbir bilgi yoksa null (UYDURMA). */

export class OtKesifAdaptoru extends BaglanmamisAdaptor {
  readonly tip = 'ot_discovery';
  readonly yapilandirmaSemasi = z.looseObject({
    ...ORTAK_YAPILANDIRMA,
    siteKapsami: z.array(z.string().min(1)).min(1).optional(),
    /* Active Queries / Smart Polling kontrolcüye paket gönderir ve OT
       sahibinin değişiklik yönetiminden geçer — bir CMDB
       senkronizasyonundan tetiklenemez. */
    aktifSorgulama: AKTIF_ISLEM_YASAK,
  });
  readonly gerekenSirlar = ['env:OT_KESIF_TOKEN'];
  readonly gereken =
    'Sahada kurulu pasif OT keşif ürünü (Claroty CTD / Nozomi Guardian / ' +
    'Dragos / Tenable.ot) ve konsolunda SALT OKUNUR API kullanıcısı: taban ' +
    'URL, kullanıcı/parola ya da API token (env:OT_KESIF_TOKEN), sertifika ' +
    'doğrulaması için kurum CA\'sı. Ayrıca hangi site/zone kapsamının ' +
    'okunacağı ve platform sunucusundan konsola ağ erişimi (genellikle ' +
    'OT-DMZ üzerinden). Aktif sorgulama (Active Queries / Smart Polling) ' +
    'izni İSTENMEZ — bu adaptör yalnız mevcut envanteri okur.';
}

export const otKesifAdaptoru = new OtKesifAdaptoru();
