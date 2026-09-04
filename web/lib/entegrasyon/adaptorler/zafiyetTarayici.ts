import 'server-only';
import { z } from 'zod';
import { BaglanmamisAdaptor, type IhtiyacKalemi, type Yetenek } from '../sozlesme';
import { AKTIF_ISLEM_YASAK, ORTAK_YAPILANDIRMA } from './ortak';

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
  readonly yapilandirmaSemasi = z.looseObject({
    ...ORTAK_YAPILANDIRMA,
    /* OT bölgesinde yalnız pasif/agent tabanlı sonuç okunur; hangi
       bölgelerin okunacağı LİSTE olmak zorundadır — '*' gibi bir metin
       "hepsi" demektir ve kapsamı sessizce kaldırır. */
    izinliBolgeler: z.array(z.string().min(1)).min(1).optional(),
    sonucKapsami: z.enum(['agent', 'pasif', 'aktif']).optional(),
    disaAktarimIzni: z.boolean().optional(),
    /* Tarama BAŞLATMA yapılandırmayla bile açılamaz: OT'de aktif tarama
       kontrolcü durdurabilir. */
    taramaBaslat: AKTIF_ISLEM_YASAK,
  });
  /* Kimlik doğrulamalı tarama işletim sistemi ve eksik yama listesini
     verir; kimlik doğrulamasız tarama vermez. Hangi kipte koştuğu
     yapılandırmada durur ve güven ona göre yazılır. */
  readonly yetenekler: Yetenek[] = ['asset_inventory', 'asset_state', 'vulnerability'];

  readonly gerekenSirlar = ['env:VULN_API_ANAHTARI'];
  readonly gereken =
    'Tenable.io/Qualys/Rapid7 salt okunur API anahtarı (access + secret key, ' +
    'env:VULN_API_ANAHTARI) · tarayıcı konsolunun taban URL\'i · sonuçların ' +
    'okunacağı tarama/varlık grubu kimlikleri. OT bölgesi için ek şart: ' +
    'yalnız pasif ya da agent tabanlı sonuç kaynağı ve OT sahibinin yazılı ' +
    'onayı — bu adaptör tarama BAŞLATMAZ, yalnız sonuç okur.';

  readonly ihtiyaclar: IhtiyacKalemi[] = [
    { kod: 'taban_url', ad: 'Tarayıcı konsolunun taban URL\'i', tur: 'adres', sir: false,
      aciklama: 'Tenable.io · Qualys · Rapid7 konsol adresi.' },
    { kod: 'api_anahtari', ad: 'Salt okunur API anahtarı çifti', tur: 'kimlik', sir: true,
      aciklama: 'Access + secret key; sır katmanından referansla çözülür.' },
    { kod: 'kapsam', ad: 'Okunacak tarama / varlık grubu kimlikleri', tur: 'kapsam', sir: false,
      aciklama: 'Sonuçların hangi taramadan okunacağı.' },
    { kod: 'ot_onayi', ad: 'OT bölgesi için yazılı sahip onayı', tur: 'izin', sir: false,
      aciklama: 'OT bölgesinde YALNIZ pasif ya da agent tabanlı sonuç kaynağı '
        + 'kullanılır ve OT sahibinin yazılı onayı aranır. Bu adaptör tarama '
        + 'BAŞLATMAZ, yalnız sonuç okur.' },
  ];
}

export const zafiyetTarayiciAdaptoru = new ZafiyetTarayiciAdaptoru();
