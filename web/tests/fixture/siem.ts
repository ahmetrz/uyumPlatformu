import type { FiksturSeti } from '@/lib/entegrasyon/sertifika';
import { TANIMSIZ_TESIS_KODU, baglanmamisFikstur } from './ortak';

/* SIEM fikstürü — SENTETİK. Şekil bir `tstats … by host, sourcetype`
   sonucununkidir: "kim log gönderiyor" sorusunun cevabı.

   SIEM keşfin en pasif kaynağıdır; fikstür de ağ değil, arama sonucu
   şeklidir. Gerçek index adı, gerçek workspace ve gerçek host BURADA
   YOKTUR. */

export const siemFiksturu: FiksturSeti = baglanmamisFikstur({
  tip: 'siem',
  kaynakSistem: 'SERTIFIKA-SANDBOX · SIEM log kaynağı envanteri',
  yapilandirma: { indexKapsami: ['ot_syslog'], otSourcetype: 'ot:syslog' },
  gecersizYapilandirma: { indexKapsami: [] },

  gecerli: {
    satirlar: [
      { host: 'kd3-scada-01', sourcetype: 'ot:syslog', index: 'ot_syslog', sonGorulme: '2026-08-31T04:55:00Z', ComputerIP: '10.60.10.11', OSType: 'Windows' },
      { host: 'kd3-otfw-01', sourcetype: 'fortinet:fortigate', index: 'ot_syslog', sonGorulme: '2026-08-31T04:58:00Z', ComputerIP: '10.60.1.1' },
    ],
    beklenen: [
      { tip: 'varlik', kaynakKayitId: 'siem:kd3-scada-01', alanlar: { hostname: 'kd3-scada-01', ipAdresi: '10.60.10.11', isletimSistemi: 'Windows' } },
      { tip: 'varlik', kaynakKayitId: 'siem:kd3-otfw-01', alanlar: { hostname: 'kd3-otfw-01', ipAdresi: '10.60.1.1' } },
    ],
  },

  bozuk: {
    satirlar: [
      // Host alanı boş: `siem:${host}` kimliği üretilemez, kayıt eşleşemez.
      { sourcetype: 'ot:syslog', index: 'ot_syslog', sonGorulme: '2026-08-31T04:00:00Z' },
      { host: '   ', sourcetype: 'ot:syslog' },
    ],
    not: 'host alanı boş — `siem:${host}` kararlı kimliği üretilemez',
  },

  kismi: {
    /* Serbest metin syslog: yalnız host adı var. İşletim sistemi ve IP
       BİLİNMİYOR; SIEM'in bilmemesi cihazın öyle olmadığı anlamına gelmez. */
    satirlar: [{ host: 'kd3-plc-01', sourcetype: 'ot:syslog', sonGorulme: '2026-08-30T12:00:00Z' }],
    bosAlanlar: ['ipAdresi', 'isletimSistemi', 'seriNo', 'macAdresi', 'uretici', 'model'],
  },

  yinelenen: {
    // Aynı host iki sourcetype'ta log üretir; cihaz TEKtir.
    satirlar: [
      { host: 'kd3-ews-01', sourcetype: 'WinEventLog:Security', index: 'ot_syslog' },
      { host: 'kd3-ews-01', sourcetype: 'WinEventLog:System', index: 'ot_syslog' },
    ],
  },

  bilinmeyenAlan: {
    satirlar: [{ host: 'kd3-hist-01', sourcetype: 'ot:syslog', punct: '..--::', linecount: 42 }],
    alanlar: ['punct', 'linecount'],
  },

  eksikReferans: {
    satirlar: [{ host: 'kd3-bilinmeyen-01', sourcetype: 'ot:syslog', site: TANIMSIZ_TESIS_KODU }],
    korunanAlan: 'tesisKodu',
    not: `site '${TANIMSIZ_TESIS_KODU}' platformda tanımsız — kayıt düşürülmez`,
  },
});
