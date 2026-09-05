import type { FiksturSeti } from '@/lib/entegrasyon/sertifika';
import { TANIMSIZ_TESIS_KODU, baglanmamisFikstur } from './ortak';

/* AD / Entra ID fikstürü — SENTETİK.

   Alan adları Microsoft Graph `users/delta` yanıtının ŞEKLİDİR; değerler
   uydurmadır ve hiçbir dizinden gelmemiştir. Gerçek tenant kimliği,
   gerçek UPN ya da gerçek token BURADA YOKTUR ve olmayacaktır.

   Adaptör bağlı olmadığı için `normalize()` boş döner: ayrıştırıcı
   kontrolleri `uygulanamaz` çıkar. `beklenen` bloğu, dizin bağlandığında
   ayrıştırıcının üretmesi GEREKENİ yazılı tutar. */

export const adEntraFiksturu: FiksturSeti = baglanmamisFikstur({
  tip: 'ad_entra',
  kaynakSistem: 'SERTIFIKA-SANDBOX · Entra ID dizin okuması',
  // Uç nokta YOK: yalnız hangi kapsamın okunacağı gibi ayarlar.
  yapilandirma: { kiraciTakmaAdi: 'sertifika-sandbox', kullaniciKapsami: 'tümü', cihazKapsami: 'tümü' },
  gecersizYapilandirma: { kullaniciKapsami: 42 },

  gecerli: {
    satirlar: [
      {
        id: '00000000-0000-4000-8000-00000000e001',
        userPrincipalName: 'ot.operator1@sertifika.sandbox',
        accountEnabled: true,
        userType: 'Member',
        onPremisesSamAccountName: 'ot.operator1',
        signInActivity: { lastSignInDateTime: '2026-08-20T06:12:00Z' },
        directoryRoles: [],
      },
      {
        id: '00000000-0000-4000-8000-00000000e002',
        userPrincipalName: 'svc.scada.backup@sertifika.sandbox',
        accountEnabled: true,
        userType: 'Member',
        onPremisesSamAccountName: 'svc.scada.backup',
        signInActivity: { lastSignInDateTime: '2026-08-29T22:03:00Z' },
        directoryRoles: ['Privileged Role Administrator'],
      },
    ],
    beklenen: [
      {
        tip: 'erisim',
        kaynakKayitId: '00000000-0000-4000-8000-00000000e001',
        alanlar: { hesapAdi: 'ot.operator1@sertifika.sandbox', hesapTipi: 'Member', ayricalikli: false },
      },
      {
        tip: 'erisim',
        kaynakKayitId: '00000000-0000-4000-8000-00000000e002',
        alanlar: { hesapAdi: 'svc.scada.backup@sertifika.sandbox', hesapTipi: 'Member', ayricalikli: true },
      },
    ],
  },

  bozuk: {
    // Dizin kaydı kimliksiz gelemez; geldiyse kayıt reddedilmelidir.
    satirlar: [
      { userPrincipalName: 'kimliksiz@sertifika.sandbox' },
      { id: '', userPrincipalName: '' },
    ],
    not: 'Graph nesne kimliği (id) yok — idempotency anahtarı üretilemez',
  },

  kismi: {
    /* Hiç oturum açmamış hesap: `signInActivity` alanı Graph tarafından
       HİÇ GÖNDERİLMEZ. Bu "hiç kullanılmadı" demek değildir — ölçülmedi
       demektir; `sonKullanim` null kalmalı, epoch sıfırı YAZILMAMALI. */
    satirlar: [{
      id: '00000000-0000-4000-8000-00000000e003',
      userPrincipalName: 'yeni.muhendis@sertifika.sandbox',
      accountEnabled: true,
      userType: 'Member',
    }],
    bosAlanlar: ['sonKullanim', 'parolaRotasyon', 'ayricalikli', 'varlikAnahtari'],
  },

  yinelenen: {
    // Delta iki sayfada aynı nesneyi verebilir; kimlik kararlı kalmalı.
    satirlar: [
      { id: '00000000-0000-4000-8000-00000000e004', userPrincipalName: 'ot.operator2@sertifika.sandbox', userType: 'Member' },
      { id: '00000000-0000-4000-8000-00000000e004', userPrincipalName: 'ot.operator2@sertifika.sandbox', userType: 'Member' },
    ],
  },

  bilinmeyenAlan: {
    satirlar: [{
      id: '00000000-0000-4000-8000-00000000e005',
      userPrincipalName: 'ot.operator3@sertifika.sandbox',
      userType: 'Member',
      employeeOrgData: { division: 'OT' },
      customSecurityAttributes: { otYetkisi: 'seviye2' },
    }],
    alanlar: ['employeeOrgData', 'customSecurityAttributes'],
  },

  eksikReferans: {
    // Hesap, platformda tanımlı olmayan bir sahaya bağlanmış görünüyor.
    satirlar: [{
      id: '00000000-0000-4000-8000-00000000e006',
      userPrincipalName: 'saha.operator@sertifika.sandbox',
      userType: 'Member',
      officeLocation: TANIMSIZ_TESIS_KODU,
    }],
    korunanAlan: 'kapsam',
    not: `officeLocation '${TANIMSIZ_TESIS_KODU}' platformda tanımsız — kayıt düşürülmez`,
  },
});
