import type { FiksturSeti } from '@/lib/entegrasyon/sertifika';
import { TANIMSIZ_TESIS_KODU, TESIS_KODLARI, baglanmamisFikstur } from './ortak';

/* OT keşif ürünü fikstürü — SENTETİK. Şekil Claroty/Nozomi varlık
   envanteri yanıtınınkidir: pasif dinlemeyle çıkarılmış envanter.

   Gerçek konsol adresi, gerçek saha ya da gerçek kontrolcü BURADA
   YOKTUR. Aktif sorgulama (Active Queries / Smart Polling) bu adaptörden
   tetiklenmez; fikstür de yalnız OKUNAN envanterin şeklidir. */

export const otKesifFiksturu: FiksturSeti = baglanmamisFikstur({
  tip: 'ot_discovery',
  kaynakSistem: 'SERTIFIKA-SANDBOX · pasif OT keşif envanteri',
  yapilandirma: { siteKapsami: [TESIS_KODLARI.kizildere3], aktifSorgulama: false },
  gecersizYapilandirma: { aktifSorgulama: true },

  gecerli: {
    satirlar: [
      {
        id: 'ot-asset-000001',
        name: 'kd3-plc-01',
        serial_number: 'S71500-KD3-0011',
        mac_address: ['00:1b:1b:11:22:01'],
        ip_addresses: ['10.60.20.11'],
        vendor: 'Siemens',
        product_name: 'SIMATIC S7-1500',
        firmware_version: '2.9.2',
        site: TESIS_KODLARI.kizildere3,
        zone: 'KIZILDERE3-OT',
        purdue_level: 1,
        type: 'PLC',
        confidence: 0.9,
      },
      {
        id: 'ot-asset-000002',
        name: 'kd3-hmi-01',
        mac_address: ['00:1b:1b:11:22:02', '00:1b:1b:11:22:03'],
        ip_addresses: ['10.60.20.12'],
        vendor: 'Siemens',
        product_name: 'SIMATIC HMI',
        site: TESIS_KODLARI.kizildere3,
        zone: 'KIZILDERE3-OT',
        purdue_level: 2,
        type: 'HMI',
      },
    ],
    beklenen: [
      {
        tip: 'varlik',
        kaynakKayitId: 'ot-asset-000001',
        alanlar: {
          hostname: 'kd3-plc-01', seriNo: 'S71500-KD3-0011', macAdresi: '00:1b:1b:11:22:01',
          ipAdresi: '10.60.20.11', uretici: 'Siemens', model: 'SIMATIC S7-1500',
          firmware: '2.9.2', tesisKodu: TESIS_KODLARI.kizildere3, bolgeKodu: 'KIZILDERE3-OT',
          turKodu: 'PLC',
        },
      },
      /* İki NIC → İKİ gözlem. İlk MAC'i alıp diğerini atmak, ikinci
         arayüzden görülen cihazı yeni bir varlık sanmaya yol açar. */
      { tip: 'varlik', kaynakKayitId: 'ot-asset-000002', alanlar: { hostname: 'kd3-hmi-01', macAdresi: '00:1b:1b:11:22:02' } },
      { tip: 'varlik', kaynakKayitId: 'ot-asset-000002', alanlar: { hostname: 'kd3-hmi-01', macAdresi: '00:1b:1b:11:22:03' } },
    ],
  },

  bozuk: {
    satirlar: [
      { name: 'kimliksiz-cihaz', vendor: 'Bilinmiyor' },
      { id: '', name: '' },
    ],
    not: 'ürün varlık kimliği (id) yok — kararlı kaynak kayıt kimliği üretilemez',
  },

  kismi: {
    /* Pasif dinleme cihazı gördü ama protokol sorgusu yapılmadığı için
       seri/firmware ÇIKARILAMADI. Bu bir eksiklik değil, pasif keşfin
       doğasıdır; alanlar null kalmalı ve `confidence` yoksa guven null. */
    satirlar: [{ id: 'ot-asset-000003', mac_address: ['00:1b:1b:11:22:04'], ip_addresses: ['10.60.20.13'], zone: 'KIZILDERE3-OT' }],
    bosAlanlar: ['seriNo', 'firmware', 'model', 'isletimSistemi', 'hostname', 'turKodu'],
  },

  yinelenen: {
    satirlar: [
      { id: 'ot-asset-000004', name: 'kd3-rtu-01', serial_number: 'RTU-KD3-0044' },
      { id: 'ot-asset-000004', name: 'kd3-rtu-01', serial_number: 'RTU-KD3-0044' },
    ],
  },

  bilinmeyenAlan: {
    satirlar: [{
      id: 'ot-asset-000005',
      name: 'kd3-ews-02',
      criticality_score: 8,
      insights: [{ id: 'ins-1', title: 'Zayıf protokol' }],
    }],
    alanlar: ['criticality_score', 'insights'],
  },

  eksikReferans: {
    satirlar: [{ id: 'ot-asset-000006', name: 'saha-cihaz-01', site: TANIMSIZ_TESIS_KODU, zone: 'BILINMEYEN-BOLGE' }],
    korunanAlan: 'tesisKodu',
    not: `site '${TANIMSIZ_TESIS_KODU}' platformda tanımsız — kayıt düşürülmez, santral bilinmiyor kalır`,
  },
});
