import type { FiksturSeti } from '@/lib/entegrasyon/sertifika';
import { TANIMSIZ_TESIS_KODU, baglanmamisFikstur } from './ortak';

/* Yedekleme fikstürü — SENTETİK. Şekil Veeam `/api/v1/sessions` +
   `/backupObjects` yanıtınınkidir. Gerçek konsol, gerçek repository ve
   gerçek iş kimliği BURADA YOKTUR.

   Kritik ayrım fikstüre gömülüdür: `Warning` (kısmî başarı) sonucu
   `basarili: false` DEĞİLDİR. Kısmî başarıyı başarısızlıkla aynı kovaya
   koymak, yedeği olan bir varlığı "yedeksiz" göstermek olurdu. */

export const yedeklemeFiksturu: FiksturSeti = baglanmamisFikstur({
  tip: 'backup',
  kaynakSistem: 'SERTIFIKA-SANDBOX · yedekleme oturum okuması',
  yapilandirma: { isKapsami: ['OT-Gunluk'], geriYuklemeIzni: false },
  gecersizYapilandirma: { geriYuklemeIzni: true },

  gecerli: {
    satirlar: [
      {
        id: 'ses-0000-0000-0000-0001',
        name: 'OT-Gunluk / kd3-scada-01',
        result: 'Success',
        endTime: '2026-08-31T01:20:00Z',
        backupObject: { name: 'kd3-scada-01', platform: 'Windows' },
        restorePoint: { id: 'rp-0001', checksum: 'sha256:0f1e2d3c' },
        repository: { name: 'OT-Repo-01' },
      },
      {
        id: 'ses-0000-0000-0000-0002',
        name: 'OT-Gunluk / kd3-ews-01',
        result: 'Failed',
        endTime: '2026-08-31T01:44:00Z',
        backupObject: { name: 'kd3-ews-01', platform: 'Windows' },
        message: 'Kaynak makineye erişilemedi',
        repository: { name: 'OT-Repo-01' },
      },
    ],
    beklenen: [
      {
        tip: 'yedek',
        kaynakKayitId: 'ses-0000-0000-0000-0001',
        alanlar: { varlikAnahtari: 'kd3-scada-01', basarili: true, surum: 'rp-0001', depolamaKonumu: 'OT-Repo-01' },
      },
      {
        tip: 'yedek',
        kaynakKayitId: 'ses-0000-0000-0000-0002',
        alanlar: { varlikAnahtari: 'kd3-ews-01', basarili: false, hata: 'Kaynak makineye erişilemedi' },
      },
    ],
  },

  bozuk: {
    satirlar: [
      { name: 'oturum kimliği yok', result: 'Success', endTime: '2026-08-31T02:00:00Z' },
      { id: 'ses-0000-0000-0000-0003', result: 'Success' },   // hangi nesne yedeklendi, belli değil
    ],
    not: 'oturum kimliği ya da yedeklenen nesne yok — kayıt bir varlığa bağlanamaz',
  },

  kismi: {
    /* `Warning`: iş bitti ama bazı dosyalar atlandı. `basarili` alanına
       false yazmak yalan olurdu; uyarı metni `hata` alanında taşınır ve
       üç durumlu bir alan GEREKİYORSA şema sahibine bildirilir. */
    satirlar: [{
      id: 'ses-0000-0000-0000-0004',
      result: 'Warning',
      endTime: '2026-08-31T02:30:00Z',
      backupObject: { name: 'kd3-hmi-01' },
      message: 'Bazı dosyalar kilitli olduğu için atlandı',
    }],
    bosAlanlar: ['surum', 'icerikHash', 'depolamaKonumu'],
  },

  yinelenen: {
    satirlar: [
      { id: 'ses-0000-0000-0000-0005', result: 'Success', endTime: '2026-08-30T01:20:00Z', backupObject: { name: 'kd3-plc-01' } },
      { id: 'ses-0000-0000-0000-0005', result: 'Success', endTime: '2026-08-30T01:20:00Z', backupObject: { name: 'kd3-plc-01' } },
    ],
  },

  bilinmeyenAlan: {
    satirlar: [{
      id: 'ses-0000-0000-0000-0006',
      result: 'Success',
      backupObject: { name: 'kd3-hist-01' },
      immutabilityUntil: '2026-09-30T00:00:00Z',
      malwareStatus: 'Clean',
    }],
    alanlar: ['immutabilityUntil', 'malwareStatus'],
  },

  eksikReferans: {
    satirlar: [{
      id: 'ses-0000-0000-0000-0007',
      result: 'Success',
      backupObject: { name: 'cmdb-de-olmayan-sunucu', site: TANIMSIZ_TESIS_KODU },
    }],
    korunanAlan: 'varlikAnahtari',
    not: 'yedeklenen nesne CMDB\'de yok — yedek kaydı düşürülmez, eşleşmemiş kalır',
  },
});
