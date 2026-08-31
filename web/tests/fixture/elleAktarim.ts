import type { FiksturSeti } from '@/lib/entegrasyon/sertifika';
import {
  SIR_REFERANSLARI, TANIMSIZ_TESIS_KODU, TESIS_KODLARI, VARLIK_ETIKETLERI,
  csvYap, eskiDosyaYaz, jsonYap, olmayanDosyaYolu,
} from './ortak';

/* ═══════════════════════════════════════════════════════════════════════
   ELLE AKTARIM fikstürü (`manual_import`)

   Sekiz adaptörün TEK gerçekten bağlanabileni bu; dolayısıyla çekirdek
   koşusu gerektiren kontrolleri (idempotency, kapsam, retry, dead-letter)
   yalnız bu fikstür besleyebilir. Girdisi ağ değil, bir dışa aktarım
   dosyası/metni — sertifikasyon koşusu hiçbir sisteme paket göndermez.

   Satır biçimi bir SCADA/keşif ürünü dışa aktarımının tipik kolon
   düzenidir; değerler sentetiktir. Etiket ve santral kodları seed'deki
   gerçek kayıtlarla uyumludur ki eşleştirme geçişi de sınanabilsin. */

type Satir = Record<string, string>;

const GECERLI_SATIRLAR: Satir[] = [
  {
    'Record ID': 'SRT-0001',
    'Asset Tag': VARLIK_ETIKETLERI.kizildere3Scada,
    Hostname: 'kd3-scada-01',
    'Serial Number': 'PE740-KD3-0001',
    'MAC Address': '00:1B:1B:AA:BB:01',
    'IP Address': '10.60.10.11',
    Vendor: 'Dell',
    Model: 'PowerEdge R740',
    OS: 'Windows Server 2019',
    'Firmware Version': '2.11.2',
    'Site Code': TESIS_KODLARI.kizildere3,
    Zone: 'KIZILDERE3-OT',
    'Device Type': 'SCADA-SRV',
  },
  {
    'Record ID': 'SRT-0002',
    'Asset Tag': VARLIK_ETIKETLERI.kizildere3Ews,
    Hostname: 'kd3-ews-01',
    'Serial Number': 'EWS-KD3-0002',
    'MAC Address': '00:1B:1B:AA:BB:02',
    'IP Address': '10.60.10.12',
    Vendor: 'Siemens',
    Model: 'SIMATIC IPC647E',
    OS: 'Windows 10 IoT LTSC',
    'Firmware Version': '1.4.0',
    'Site Code': TESIS_KODLARI.kizildere3,
    Zone: 'KIZILDERE3-OT',
    'Device Type': 'EWS',
  },
  {
    'Record ID': 'SRT-0003',
    'Asset Tag': VARLIK_ETIKETLERI.alasehirScada,
    Hostname: 'als-scada-01',
    'Serial Number': 'ALS-SCADA-0003',
    'MAC Address': '00:1B:1B:CC:DD:03',
    'IP Address': '10.70.10.11',
    Vendor: 'Honeywell',
    Model: 'Experion PKS',
    OS: 'Windows Server 2016',
    'Firmware Version': '9.5',
    'Site Code': TESIS_KODLARI.alasehirJes,
    Zone: 'ALASEHIR-OT',
    'Device Type': 'SCADA-SRV',
  },
];

/* Reddedilmesi GEREKEN satırlar: hiçbirinde eşleme anahtarı yok, dolayısıyla
   kararlı bir kaynak kayıt kimliği üretilemez. Bunların sessizce atılması
   değil, sebebiyle reddedilmesi beklenir. */
const BOZUK_SATIRLAR: Satir[] = [
  { Notes: 'kolon başlıkları kaymış', Vendor: 'Siemens', Model: 'S7-1500' },
  { 'Asset Tag': '   ', Hostname: '', 'Serial Number': '', 'MAC Address': '', 'IP Address': '' },
];

/* Kısmî kayıt: kaynak yalnız etiketi ve santrali biliyor. Kalan alanlar
   BİLİNMİYOR — false, 0 ya da boş metne çevrilmemeli. */
const KISMI_SATIRLAR: Satir[] = [
  {
    'Record ID': 'SRT-PARC-1',
    'Asset Tag': VARLIK_ETIKETLERI.kizildere2Hmi,
    'Site Code': TESIS_KODLARI.kizildere2,
  },
];

/* Aynı kayıt iki kez — kimlik kolonu YOK, kimlik alanlardan türetilecek.
   Kararlı özet üretilmezse aynı cihaz her koşuda çoğalır. */
const YINELENEN_SATIRLAR: Satir[] = [
  {
    'Asset Tag': VARLIK_ETIKETLERI.kizildere3Otfw,
    Hostname: 'kd3-otfw-01',
    'Serial Number': 'FG200F-KD3-0007',
    'Site Code': TESIS_KODLARI.kizildere3,
  },
  {
    'Asset Tag': VARLIK_ETIKETLERI.kizildere3Otfw,
    Hostname: 'kd3-otfw-01',
    'Serial Number': 'FG200F-KD3-0007',
    'Site Code': TESIS_KODLARI.kizildere3,
  },
];

/* Kaynak sürüm atladı: tanımadığımız kolonlar geldi. Kayıt düşmemeli,
   kolonlar ham veride durmalı — denetim izinin girdisi odur. */
const BILINMEYEN_ALANLI_SATIRLAR: Satir[] = [
  {
    'Record ID': 'SRT-BILINMEYEN-1',
    'Asset Tag': VARLIK_ETIKETLERI.kizildere3Scada,
    'Site Code': TESIS_KODLARI.kizildere3,
    'Purdue Level': '2',
    'Safety Instrumented': 'false',
    'Vendor Risk Score': '37',
  },
];

/* Referansı platformda TANIMSIZ olan kayıt: düşürülmez, kodu silinmez.
   Tanımsız bir santralde cihaz bulmak GÖRÜLECEK bir durumdur. */
const EKSIK_REFERANSLI_SATIRLAR: Satir[] = [
  {
    'Record ID': 'SRT-EKSIKREF-1',
    'Asset Tag': 'SERTIFIKA-EKSIKREF-01',
    Hostname: 'eksikref-01',
    'Site Code': TANIMSIZ_TESIS_KODU,
  },
];

const KAPSAM_SATIRLARI: Satir[] = [
  {
    'Record ID': 'SRT-KAPSAM-IC',
    'Asset Tag': VARLIK_ETIKETLERI.kizildere3Scada,
    Hostname: 'kd3-scada-01',
    'Site Code': TESIS_KODLARI.kizildere3,
  },
  {
    'Record ID': 'SRT-KAPSAM-DIS',
    'Asset Tag': VARLIK_ETIKETLERI.alasehirScada,
    Hostname: 'als-scada-01',
    'Site Code': TESIS_KODLARI.alasehirJes,
  },
];

/** Yapıştırılan JSON içeriği — dosya sistemi gerektirmez. */
function jsonYapilandirma(satirlar: unknown[]): Record<string, unknown> {
  return { bicim: 'json', icerik: jsonYap(satirlar) };
}

/* Bayat kaynak: üç gün önce yazılmış bir CSV dışa aktarımı. Tazelik
   dosyanın kendi yaşından okunur; "3 gün" diye bir alan uydurulmaz. */
const BAYAT_YAS_DK = 3 * 24 * 60;
const BAYAT_DOSYA = () => eskiDosyaYaz(
  'bayat-envanter.csv',
  csvYap([{
    'Asset Tag': VARLIK_ETIKETLERI.kizildere3Scada,
    Hostname: 'kd3-scada-01',
    'Site Code': TESIS_KODLARI.kizildere3,
    Vendor: 'Dell',
  }]),
  BAYAT_YAS_DK,
);

export const elleAktarimFiksturu: FiksturSeti = {
  tip: 'manual_import',
  kaynakSistem: 'SERTIFIKA-SANDBOX · SCADA envanter dışa aktarımı',
  // Kaynak yerel bir metin/dosya: sertifikasyon koşusu ağa çıkmaz.
  disBaglantiGerekmez: true,
  yapilandirma: jsonYapilandirma(GECERLI_SATIRLAR),
  /* Ne `dosyaYolu` ne `icerik`: adaptör bunu açık hatayla reddeder.
     Şema beyanı geldiğinde şemanın da reddetmesi beklenir. */
  gecersizYapilandirma: { bicim: 'json' },
  sir: { ...SIR_REFERANSLARI },

  gecerli: {
    satirlar: GECERLI_SATIRLAR,
    beklenen: [
      {
        tip: 'varlik',
        kaynakKayitId: 'SRT-0001',
        alanlar: {
          etiket: VARLIK_ETIKETLERI.kizildere3Scada,
          hostname: 'kd3-scada-01',
          seriNo: 'PE740-KD3-0001',
          macAdresi: '00:1B:1B:AA:BB:01',
          ipAdresi: '10.60.10.11',
          uretici: 'Dell',
          model: 'PowerEdge R740',
          isletimSistemi: 'Windows Server 2019',
          firmware: '2.11.2',
          tesisKodu: TESIS_KODLARI.kizildere3,
          bolgeKodu: 'KIZILDERE3-OT',
          turKodu: 'SCADA-SRV',
        },
      },
      {
        tip: 'varlik',
        kaynakKayitId: 'SRT-0002',
        alanlar: {
          etiket: VARLIK_ETIKETLERI.kizildere3Ews,
          seriNo: 'EWS-KD3-0002',
          tesisKodu: TESIS_KODLARI.kizildere3,
          turKodu: 'EWS',
        },
      },
      {
        tip: 'varlik',
        kaynakKayitId: 'SRT-0003',
        alanlar: {
          etiket: VARLIK_ETIKETLERI.alasehirScada,
          seriNo: 'ALS-SCADA-0003',
          tesisKodu: TESIS_KODLARI.alasehirJes,
        },
      },
    ],
  },

  bozuk: {
    satirlar: BOZUK_SATIRLAR,
    not: 'hiçbirinde eşleme anahtarı yok — kararlı kaynak kayıt kimliği üretilemez',
  },
  bozukKaynak: {
    // Dizinin ikinci öğesi nesne değil: ayrıştırıcı açık hata vermeli.
    yapilandirma: { bicim: 'json', icerik: '[{"Asset Tag":"SRT-BOZUK"}, 42]' },
    not: 'JSON dizisinde nesne olmayan kayıt',
  },

  kismi: {
    satirlar: KISMI_SATIRLAR,
    bosAlanlar: [
      'hostname', 'seriNo', 'macAdresi', 'ipAdresi', 'uretici', 'model',
      'isletimSistemi', 'firmware', 'bolgeKodu', 'turKodu',
    ],
  },

  yinelenen: { satirlar: YINELENEN_SATIRLAR },

  bayat: {
    get yapilandirma() { return { bicim: 'csv', dosyaYolu: BAYAT_DOSYA() }; },
    // Ölçüm dakikaya yuvarlanıyor; bir dakikalık kayma sınamayı bozmasın.
    enAzDk: BAYAT_YAS_DK - 5,
  },

  bilinmeyenAlan: {
    satirlar: BILINMEYEN_ALANLI_SATIRLAR,
    alanlar: ['Purdue Level', 'Safety Instrumented', 'Vendor Risk Score'],
  },

  eksikReferans: {
    satirlar: EKSIK_REFERANSLI_SATIRLAR,
    korunanAlan: 'tesisKodu',
    not: `santral kodu '${TANIMSIZ_TESIS_KODU}' platformda tanımlı değil`,
  },

  kosum: {
    gecerli: jsonYapilandirma(GECERLI_SATIRLAR),
    karisik: jsonYapilandirma([...GECERLI_SATIRLAR, ...BOZUK_SATIRLAR]),
    yinelenen: jsonYapilandirma(YINELENEN_SATIRLAR),
    kapsam: {
      yapilandirma: jsonYapilandirma(KAPSAM_SATIRLARI),
      kapsamKodlari: [TESIS_KODLARI.kizildere3],
      icKod: TESIS_KODLARI.kizildere3,
      disKod: TESIS_KODLARI.alasehirJes,
    },
    get okunamayan() {
      return { bicim: 'json', dosyaYolu: olmayanDosyaYolu('envanter.json') };
    },
  },
};
