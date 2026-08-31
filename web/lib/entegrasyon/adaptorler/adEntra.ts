import 'server-only';
import { BaglanmamisAdaptor } from '../sozlesme';

/* ═══════════════════════════════════════════════════════════════════════
   Active Directory / Microsoft Entra ID — BAĞLI DEĞİL.

   Gerçek bir dizin bağlanana kadar bu adaptör sahte hesap üretmez;
   `kimlik_bekleniyor` sağlık durumu döner ve çekirdek onu koşturmaz.

   ── PASSIVE-FIRST NOTU ───────────────────────────────────────────────
   Dizin okuma zaten pasiftir: yalnız Graph/LDAP SORGUSU yapılır, ağ
   taraması yoktur. OT tarafındaki alan denetleyicisine LDAP bağlanırken
   salt okunur (bind) bir servis hesabı kullanılır; yazma izni İSTENMEZ.

   ── BAĞLARKEN NEREYE NE YAZILACAK ────────────────────────────────────
   Uç noktalar (Microsoft Graph v1.0, delta destekli):
     GET https://graph.microsoft.com/v1.0/users/delta
         ?$select=id,userPrincipalName,accountEnabled,signInActivity,
                  onPremisesSamAccountName,userType
     GET https://graph.microsoft.com/v1.0/devices/delta
         ?$select=id,displayName,deviceId,operatingSystem,
                  operatingSystemVersion,approximateLastSignInDateTime
     GET https://graph.microsoft.com/v1.0/directoryRoles/{id}/members
         → ayrıcalıklı rol üyeliği
   Token: POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
          grant_type=client_credentials, scope=https://graph.microsoft.com/.default

   `fetchChanges` imleci: Graph'ın döndürdüğü `@odata.deltaLink` AYNEN
   `CekmeSonucu.yeniImlec` alanına yazılır; sonraki koşu `b.imlec` ile
   oradan devam eder. `@odata.nextLink` varsa `devamVar = true`.

   ErisimGozlemi eşlemesi (users):
     userPrincipalName                    → hesapAdi
     userType ('Member'|'Guest') / servis hesabı sezgisi → hesapTipi
     directoryRoles üyeliği (Global Admin, Priv. Role Admin…) → ayricalikli
     signInActivity.lastSignInDateTime    → sonKullanim
     lastPasswordChangeDateTime           → parolaRotasyon
     assignedLicenses / rol adı           → kapsam
     id                                   → koken.kaynakKayitId  (KARARLI)
     tüm nesne                            → ham

   VarlikGozlemi eşlemesi (devices):
     deviceId                             → koken.kaynakKayitId  (KARARLI)
     displayName                          → hostname
     operatingSystem + Version            → isletimSistemi
     (Entra cihaz kaydında seri/MAC YOKTUR — Intune bağlanırsa
      /deviceManagement/managedDevices üzerinden serialNumber → seriNo,
      wiFiMacAddress/ethernetMacAddress → macAdresi gelir.)
     tüm nesne                            → ham

   koken.guven: Entra kendi kaydının doğruluğunu ÖLÇMEZ. Buradan gelen
   gözlemler `guven: null` (= ölçülmedi) taşır; eşleşme güveni
   lib/entegrasyon/kesif.ts tarafından ayrıca hesaplanır.

   Sır: `Connector.sirReferansi` yalnız ADRES taşır (env:ENTRA_ISTEMCI_SIRRI).
   Değer `lib/entegrasyon/sir.ts → siriCoz()` ile çözülür, LOGLANMAZ. */

export class AdEntraAdaptoru extends BaglanmamisAdaptor {
  readonly tip = 'ad_entra';
  readonly gereken =
    'Entra ID uygulama kaydı (tenant id + client id) · Directory.Read.All ve ' +
    'Device.Read.All uygulama izinleri (yönetici onayı verilmiş) · istemci sırrı ' +
    'ya da sertifika (env:ENTRA_ISTEMCI_SIRRI). Şirket içi AD için ayrıca ' +
    'salt okunur LDAP bind hesabı ve alan denetleyicisine 636/TCP erişimi.';
}

export const adEntraAdaptoru = new AdEntraAdaptoru();
