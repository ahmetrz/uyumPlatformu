import type { FiksturSeti } from '@/lib/entegrasyon/sertifika';
import { TANIMSIZ_TESIS_KODU, baglanmamisFikstur } from './ortak';

/* EDR fikstürü — SENTETİK. Şekil CrowdStrike `devices/entities/devices`
   yanıtınınkidir. Gerçek konsol, gerçek cihaz ve gerçek agent kimliği
   BURADA YOKTUR.

   EDR'nin CMDB anlamı tek yönlüdür: kayıt onaylanınca `edrDurumu = 'var'`
   yazılabilir; EDR'de GÖRÜNMEYEN varlık için 'yok' değil 'bilinmiyor'
   kalır. Fikstür de bu asimetriyi taşır — "eksik referans" durumu
   yokluğu kanıt saymaz. */

export const edrFiksturu: FiksturSeti = baglanmamisFikstur({
  tip: 'edr',
  kaynakSistem: 'SERTIFIKA-SANDBOX · EDR uç nokta envanteri',
  yapilandirma: { grupKapsami: ['OT-DMZ'], mudahaleIzni: false },
  gecersizYapilandirma: { mudahaleIzni: true },

  gecerli: {
    satirlar: [
      {
        device_id: 'edr0000000000000000000000000001',
        hostname: 'kd3-scada-01',
        serial_number: 'PE740-KD3-0001',
        mac_address: '00-1b-1b-aa-bb-01',
        local_ip: '10.60.10.11',
        system_manufacturer: 'Dell Inc.',
        system_product_name: 'PowerEdge R740',
        os_version: 'Windows Server 2019',
        os_build: '17763',
        bios_version: '2.11.2',
        last_seen: '2026-08-31T05:00:00Z',
      },
    ],
    beklenen: [{
      tip: 'varlik',
      kaynakKayitId: 'edr0000000000000000000000000001',
      alanlar: {
        hostname: 'kd3-scada-01',
        seriNo: 'PE740-KD3-0001',
        macAdresi: '00-1b-1b-aa-bb-01',
        ipAdresi: '10.60.10.11',
        uretici: 'Dell Inc.',
        model: 'PowerEdge R740',
      },
    }],
  },

  bozuk: {
    satirlar: [
      { hostname: 'kimliksiz-agent', local_ip: '10.60.10.99' },
      { device_id: '', hostname: '' },
    ],
    not: 'agent kimliği (device_id) yok — kaynak kayıt kimliği üretilemez',
  },

  kismi: {
    /* Agent kurulu ama envanter alanları henüz raporlanmamış. Seri/MAC
       BİLİNMİYOR; boş metin yazmak "seri numarası yok" demektir. */
    satirlar: [{
      device_id: 'edr0000000000000000000000000002',
      hostname: 'kd3-ews-01',
      last_seen: '2026-08-30T21:15:00Z',
    }],
    bosAlanlar: ['seriNo', 'macAdresi', 'ipAdresi', 'uretici', 'model', 'firmware'],
  },

  yinelenen: {
    satirlar: [
      { device_id: 'edr0000000000000000000000000003', hostname: 'kd3-hmi-01' },
      { device_id: 'edr0000000000000000000000000003', hostname: 'kd3-hmi-01' },
    ],
  },

  bilinmeyenAlan: {
    satirlar: [{
      device_id: 'edr0000000000000000000000000004',
      hostname: 'kd3-hmi-02',
      zero_trust_assessment: { score: 71 },
      reduced_functionality_mode: 'no',
    }],
    alanlar: ['zero_trust_assessment', 'reduced_functionality_mode'],
  },

  eksikReferans: {
    satirlar: [{
      device_id: 'edr0000000000000000000000000005',
      hostname: 'saha-dizustu-01',
      site_name: TANIMSIZ_TESIS_KODU,
    }],
    korunanAlan: 'tesisKodu',
    not: `site_name '${TANIMSIZ_TESIS_KODU}' platformda tanımsız — kayıt düşürülmez`,
  },
});
