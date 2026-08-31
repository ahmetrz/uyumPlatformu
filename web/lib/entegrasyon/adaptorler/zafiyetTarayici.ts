import 'server-only';
import { BaglanmamisAdaptor } from '../sozlesme';

/* ═══════════════════════════════════════════════════════════════════════
   Zafiyet tarayıcı (Tenable · Qualys · Rapid7 · Tenable.ot) — BAĞLI DEĞİL.

   ── PASSIVE-FIRST · EN ÖNEMLİ KISIT ──────────────────────────────────
   Bu adaptör TARAMA BAŞLATMAZ. Ne `POST /scans/{id}/launch`, ne bir
   şablon tetikleme, ne de "hızlı doğrulama taraması". Yalnız ZATEN
   ÇALIŞMIŞ taramanın SONUCU okunur.

   Sebep teknik: OT segmentindeki bir PLC/RTU, kimlik doğrulamasız TCP
   bağlantısına ya da beklenmedik pakete kontrolcü durması (fault/stop)
   ile cevap verebilir. Tarama başlatmak üretim durdurabilir; bu bir
   güvenlik özelliği değil, emniyet ihlalidir.

   Bağlantı yazan mühendis için kural: istemcide YALNIZ GET/okuma metotları
   bulunmalı. Bir `tarama başlat` fonksiyonu eklenirse bu bir defect'tir.
   OT bölgesinde ayrıca yalnız "agent tabanlı" ya da "pasif" tarayıcı
   sonuçları alınır; aktif ağ tarayıcısının OT bölgesi sonuçları
   `yapilandirma.izinliBolgeler` ile sınırlandırılır.

   ── BAĞLARKEN NEREYE NE YAZILACAK ────────────────────────────────────
   Tenable.io (salt okunur uçlar):
     GET /workbenches/assets?date_range=…       → varlık listesi
     GET /workbenches/asset/{uuid}/vulnerabilities
     GET /vulns/export  (POST ile export İSTENİR ama tarama BAŞLATMAZ —
         mevcut bulguların dışa aktarımıdır; yine de yapılandırmada
         `disaAktarimIzni` açıkça true olmalı)
   Qualys:  GET /api/2.0/fo/asset/host/vm/detection/?action=list
   Rapid7:  GET /api/3/assets  ·  GET /api/3/assets/{id}/vulnerabilities

   ZafiyetGozlemi eşlemesi:
     plugin_id / qid / vulnerability.id     → koken.kaynakKayitId ile birlikte
                                              varlık kimliğine göre birleştirilir
     cve[0] (ya da plugin adı)              → kaynakRef      (CVE-…)
     plugin_name / title                    → baslik
     cvss3_base_score ?? cvss_base_score    → cvss           (yoksa null = ÖLÇÜLMEDİ)
     asset.hostname ?? asset.ipv4 ?? uuid   → varlikAnahtari
     patch_publication_date / due_date      → sonTarih
     tüm bulgu nesnesi                      → ham
     `${asset_uuid}:${plugin_id}`           → koken.kaynakKayitId  (KARARLI)

   Aynı zamanda VarlikGozlemi üretilebilir (tarayıcı envanteri CMDB'yi
   besler):
     asset.hostname → hostname · asset.mac_address → macAdresi
     asset.ipv4     → ipAdresi · asset.operating_system → isletimSistemi

   koken.guven: tarayıcı "kimlik doğrulamalı" (credentialed) tarama
   yaptıysa sonuç daha güvenilirdir. Öneri: credentialed → 0.9,
   uncredentialed → 0.5, bilgi yoksa null (UYDURMA). */

export class ZafiyetTarayiciAdaptoru extends BaglanmamisAdaptor {
  readonly tip = 'vuln_scanner';
  readonly gereken =
    'Tenable.io/Qualys/Rapid7 salt okunur API anahtarı (access + secret key, ' +
    'env:VULN_API_ANAHTARI) · tarayıcı konsolunun taban URL\'i · sonuçların ' +
    'okunacağı tarama/varlık grubu kimlikleri. OT bölgesi için ek şart: ' +
    'yalnız pasif ya da agent tabanlı sonuç kaynağı ve OT sahibinin yazılı ' +
    'onayı — bu adaptör tarama BAŞLATMAZ, yalnız sonuç okur.';
}

export const zafiyetTarayiciAdaptoru = new ZafiyetTarayiciAdaptoru();
