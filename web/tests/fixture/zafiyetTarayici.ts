import type { FiksturSeti } from '@/lib/entegrasyon/sertifika';
import { TANIMSIZ_TESIS_KODU, VARLIK_ETIKETLERI, baglanmamisFikstur } from './ortak';

/* Zafiyet tarayıcı fikstürü — SENTETİK.

   Şekil Tenable `workbenches/asset/{uuid}/vulnerabilities` yanıtınınkidir.
   CVE numaraları GERÇEK numaralardır (kamuya açık kayıt), ama hangi
   cihazda bulundukları UYDURMADIR — bu fikstür bir bulgu raporu değildir.

   Adaptör TARAMA BAŞLATMAZ; fikstür de yalnız SONUÇ şeklini taşır. */

export const zafiyetTarayiciFiksturu: FiksturSeti = baglanmamisFikstur({
  tip: 'vuln_scanner',
  kaynakSistem: 'SERTIFIKA-SANDBOX · zafiyet tarayıcı sonuç okuması',
  yapilandirma: { izinliBolgeler: ['KIZILDERE3-OT-DMZ'], disaAktarimIzni: false, sonucKapsami: 'agent' },
  gecersizYapilandirma: { izinliBolgeler: 'hepsi' },

  gecerli: {
    satirlar: [
      {
        asset: { uuid: 'aaaaaaaa-0000-4000-8000-000000000001', hostname: 'kd3-scada-01', ipv4: '10.60.10.11' },
        plugin: { id: 156032, name: 'OpenSSL 3.0.x < 3.0.7 Buffer Overflow', cve: ['CVE-2022-3602'] },
        severity: 'high',
        cvss3_base_score: 7.5,
        patch_publication_date: '2026-06-30T00:00:00Z',
        credentialed_scan: true,
      },
      {
        asset: { uuid: 'aaaaaaaa-0000-4000-8000-000000000002', hostname: 'kd3-ews-01', ipv4: '10.60.10.12' },
        plugin: { id: 118914, name: 'SMBv1 Etkin', cve: ['CVE-2017-0144'] },
        severity: 'critical',
        cvss3_base_score: 8.1,
        credentialed_scan: false,
      },
    ],
    beklenen: [
      {
        tip: 'zafiyet',
        kaynakKayitId: 'aaaaaaaa-0000-4000-8000-000000000001:156032',
        alanlar: { kaynakRef: 'CVE-2022-3602', cvss: 7.5, varlikAnahtari: 'kd3-scada-01' },
      },
      {
        tip: 'zafiyet',
        kaynakKayitId: 'aaaaaaaa-0000-4000-8000-000000000002:118914',
        alanlar: { kaynakRef: 'CVE-2017-0144', cvss: 8.1, varlikAnahtari: 'kd3-ews-01' },
      },
    ],
  },

  bozuk: {
    satirlar: [
      // Varlık kimliği yok: bulgu hangi cihaza ait, bilinmiyor.
      { plugin: { id: 156032, name: 'OpenSSL', cve: ['CVE-2022-3602'] }, severity: 'high' },
      // Plugin kimliği yok: kaynak kayıt kimliği üretilemez.
      { asset: { uuid: 'aaaaaaaa-0000-4000-8000-000000000003' }, severity: 'medium' },
    ],
    not: 'varlık ya da plugin kimliği yok — bulgu kimliği üretilemez',
  },

  kismi: {
    /* Skorsuz bulgu: tarayıcı CVSS vermemiş. `cvss` null kalmalı —
       0.0 yazmak "zararsız" demektir ve bulguyu görünmez yapar. */
    satirlar: [{
      asset: { uuid: 'aaaaaaaa-0000-4000-8000-000000000004', hostname: 'kd3-hmi-01' },
      plugin: { id: 90210, name: 'Üretici bildirimi: firmware güncellemesi mevcut' },
      severity: 'info',
    }],
    bosAlanlar: ['cvss', 'sonTarih'],
  },

  yinelenen: {
    satirlar: [
      { asset: { uuid: 'aaaaaaaa-0000-4000-8000-000000000005', hostname: 'kd3-plc-01' }, plugin: { id: 100001, cve: ['CVE-2021-22779'] } },
      { asset: { uuid: 'aaaaaaaa-0000-4000-8000-000000000005', hostname: 'kd3-plc-01' }, plugin: { id: 100001, cve: ['CVE-2021-22779'] } },
    ],
  },

  bilinmeyenAlan: {
    satirlar: [{
      asset: { uuid: 'aaaaaaaa-0000-4000-8000-000000000006', hostname: 'kd3-scada-02' },
      plugin: { id: 100002, cve: ['CVE-2020-15782'] },
      vpr_score: 8.9,
      exploit_available: true,
    }],
    alanlar: ['vpr_score', 'exploit_available'],
  },

  eksikReferans: {
    satirlar: [{
      asset: { uuid: 'aaaaaaaa-0000-4000-8000-000000000007', hostname: 'bilinmeyen-cihaz-01', site: TANIMSIZ_TESIS_KODU },
      plugin: { id: 100003, cve: ['CVE-2019-6579'] },
      etiket: VARLIK_ETIKETLERI.kizildere3Scada,
    }],
    korunanAlan: 'varlikAnahtari',
    not: 'bulgu CMDB\'de olmayan bir varlığa işaret ediyor — bulgu düşürülmez',
  },
});
