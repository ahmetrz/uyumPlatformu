# Entegrasyon Günü Koşu Kitabı

Bu belge, gerçek kurum sistemlerine bağlanma günü için yazıldı. Bugün
**hiçbir gerçek sisteme bağlı değiliz**: sekiz adaptörden yedisi
`BaglanmamisAdaptor`'ı genişletir, `baglanabilir = false` döner ve çekirdek
onları koşturmaz. Bağlanabilen tek adaptör `manual_import`'tur ve dış sistem
gerektirmez.

Bu bir eksiklik değil, bilinçli bir duruştur: gerçek uç nokta ve kimlik
bilgisi olmadan yazılan bir "entegrasyon", çalıştığı sanılan ama hiçbir şey
kanıtlamayan bir kabuktur. Bu yüzden ürün, bağlanmamış bir kaynağı **sahte
başarıyla değil**, `kimlik_bekleniyor` durumuyla gösterir.

Koşu kitabının amacı şudur: bağlantı günü **yalnız yapılandırma, kimlik ve
eşleme** işi kalsın; çekirdek uygulamada yeniden mimari geliştirme
gerekmesin.

---

## 0. Bağlantı gününden ÖNCE tamamlanması gerekenler

| # | Ön koşul | Nasıl doğrulanır |
|---|---|---|
| 1 | Sır sağlayıcısı seçilmiş ve bağlı | `lib/entegrasyon/sir.ts` → `sirSaglayicilari()`; bugün `env` ve `dosya` bağlı, `vault` **bağlı değil** |
| 2 | Hedef sistemin sahibi belli | Aşağıdaki sistem bölümünde "kim verir" satırı |
| 3 | Salt okunur hesap açılmış | Sistem sahibinin yazılı onayı |
| 4 | Platform sunucusundan hedefe ağ erişimi | Ağ ekibi; port ve yön aşağıda |
| 5 | Kurum CA'sı platformda güvenilir | TLS doğrulaması **kapatılmaz** |
| 6 | Kapsam kararı verilmiş | Hangi santral/site/zone okunacak |

**Hiçbir adımda TLS doğrulaması kapatılmaz.** Sertifika hatası bir
yapılandırma eksiğidir, atlanacak bir uyarı değil.

---

## 1. Her sistem için aynı sıra (12 adım)

Bu sıra sistemden sisteme değişmez. Değişen tek şey, 4. adımda girilen
uç nokta ve kimlik tipidir.

1. **Connector kaydı aç** — `ortam` alanını doğru gir. `uretim` seçildiğinde
   ekran bunu ayrı gösterir; test sanılan bir kaydın üretim OT ağına bakması
   en kolay yapılan hatadır.
2. **Sırrı sağlayıcıya koy, referansı gir.** Sır **değeri** hiçbir forma,
   hiçbir veritabanı alanına, hiçbir loga girmez. `Connector.sirReferansi`
   yalnız bir ADRES taşır: `env:AD_PAROLA`, `dosya:/run/secrets/ad#parola`,
   `vault:ot/ad#parola`.
3. **Referansı doğrula** — kaydederken biçim denetlenir; geçersiz referans
   ilk koşuya kadar ertelenmez.
4. **Uç nokta ve kapsamı gir** (`yapilandirmaJson`). Bu alan **sır
   içermez**: host, port, taban URL, filtre, okunacak grup/index/zone.
5. **Kapsam sınırı koy** (`kapsamTesisleriJson`). Bir OT keşif ürünü yalnız
   kendi sahasını görür; kaydın beyan ettiği santrale güvenmek, yanlış
   yapılandırılmış bir kaynağın başka sahaya yazmasına izin vermek olur.
6. **Bağlantıyı test et.** Adaptör bağlanamıyorsa sonuç `kimlik_bekleniyor`
   olur — bu bir HATA değil, bekleyen bir kurulum adımıdır. **Sahte başarı
   yoktur:** gerçek uç nokta yoksa "bağlantı başarılı" yazmaz.
7. **KURU KOŞU yap.** Kuru koşu çeker, normalleştirir, doğrular, eşleştirmeyi
   dener — ama **hiçbir şey yazmaz**. Çıktısı: kaç kayıt gelirdi, kaçı
   reddedilirdi ve neden, kaçı hangi varlıkla eşleşirdi.
8. **Kuru koşu çıktısını eşleme profiliyle düzelt.** Eşleme profili
   sürümlüdür; eski içe aktarımların geçmişi bozulmaz.
9. **İlk gerçek koşuyu DAR kapsamda yap** — tek santral, tek site.
10. **Kökeni doğrula.** Gelen her kayıt kaynak bağlamı taşımalı: kaynak
    sistem, koşu kimliği, alınma zamanı, güven etiketi. **Kaynak bağlamı
    olmayan kayıt `doğrulanmış` görünmez.**
11. **Reddedilen kayıtları (dead-letter) incele.** Sessiz kayıp yoktur:
    reddedilen her kayıt sebebiyle saklanır.
12. **Poll aralığını aç** (`pollAralikDk`). Zamanlayıcı bundan sonra
    connector'ı kendisi koşturur; vadesi gelmeyen her hedef sebebiyle
    raporlanır.

### Geri alma (her adımda geçerli)

- `etkin = false` yap → connector koşmaz, veri akmaz.
- İmleç YALNIZ başarılı koşuda ilerler; başarısız koşu veri kaybettirmez.
- Yanlış eşleme profiliyle gelen kayıtlar keşif kuyruğunda **insan onayı
  bekler**; doğrudan Varlık/Zafiyet satırına dönüşmemiştir.

---

## 2. İzin İSTENMEYECEK yetkiler

Bu tablo bir tercih listesi değil, bir sınırdır. Aşağıdaki yetkiler
**istenmez**; sistem sahibi kendiliğinden verse de kullanılmaz.

| Sistem | İstenmeyecek yetki | Sebep |
|---|---|---|
| EDR | İzolasyon / karantina / RTR script | Müdahale kararı insanındır ve platformdan tetiklenmez |
| Zafiyet tarayıcı | Tarama başlatma (`/scans/{id}/launch`) | OT'de PLC/RTU beklenmedik pakete kontrolcü durmasıyla cevap verebilir — emniyet ihlali |
| OT keşif | Active Queries / Smart Polling | Pasif ürünün aktif sorgulaması OT segmentine paket çıkarır |
| Firewall / ağ | Kural yazma, konfigürasyon değiştirme | Ürün ağ değişikliği yapmaz |
| Yedekleme | Yedek başlatma, geri yükleme | Geri yükleme kararı insanındır |
| SIEM | Playbook tetikleme, alarm kapatma | Otomatik kapatma yasak |
| AD / Entra | Dizin yazma | Salt okunur bind yeterlidir |

---

## 3. Sistem sistem

Her bölümde: **kim verir · ne gerekir · nereye bağlanılır · ne eşleşir ·
kabul kriteri.**

Uç nokta ayrıntıları ilgili adaptör dosyasının başlığında, kod ile birlikte
yaşar (kopya belge ayrışır, kodun yanındaki belge ayrışmaz).

### 3.1 Active Directory / Microsoft Entra ID — `ad_entra`

- **Kim verir:** Kimlik ve dizin yönetimi ekibi.
- **Ne gerekir:** Entra uygulama kaydı (tenant id + client id) ·
  `Directory.Read.All` ve `Device.Read.All` uygulama izinleri (yönetici
  onaylı) · istemci sırrı ya da sertifika. Şirket içi AD için ayrıca salt
  okunur LDAP bind hesabı ve alan denetleyicisine 636/TCP.
- **Nereye:** Microsoft Graph v1.0 (`/users/delta`, `/devices/delta`,
  `/directoryRoles/{id}/members`) — genel, kuruma özel olmayan uç noktalar.
- **Ne eşleşir:** Kimlik hesapları (ayrıcalıklı rol üyeliği dâhil) ve Entra
  cihaz kayıtları. Entra cihaz kaydında **seri no ve MAC yoktur** — Intune
  bağlanmadan bu alanlar `bilinmiyor` kalır, sıfır değil.
- **Kabul kriteri:** Ayrıcalıklı hesapların ayrıcalık bilgisi `bilinmiyor`
  değil, ölçülmüş olarak gelmeli. Gelmiyorsa rol üyeliği izni eksiktir.
- **Ayrıntı:** `lib/entegrasyon/adaptorler/adEntra.ts`

### 3.2 EDR / uç nokta koruması — `edr`

- **Kim verir:** Uç nokta güvenliği ekibi.
- **Ne gerekir:** Salt okunur API istemcisi — CrowdStrike için client
  id + secret ve `Hosts: Read`; Defender için Entra uygulaması +
  `Machine.Read.All`; SentinelOne için salt okunur token. Ayrıca konsolun
  bölge taban URL'i ve okunacak site/grup listesi.
- **Ne eşleşir:** Varlık envanteri (hostname, seri no, MAC, üretici, model,
  işletim sistemi, firmware).
- **Kritik kural:** EDR'de **görünmeyen** varlık `edrDurumu = yok` DEĞİL,
  `bilinmiyor` kalır. Yokluk kanıt değildir.
- **Kabul kriteri:** `local_ip` tek başına eşleme anahtarı olarak
  kullanılmamalı (DHCP'de gezer). Eşleşme seri no / MAC / hostname
  üçlüsünden kurulmalı.
- **Ayrıntı:** `lib/entegrasyon/adaptorler/edr.ts`

### 3.3 Zafiyet tarayıcı — `vuln_scanner`

- **Kim verir:** Zafiyet yönetimi ekibi + **OT bölgesi için OT sahibinin
  yazılı onayı**.
- **Ne gerekir:** Tenable.io / Qualys / Rapid7 salt okunur API anahtarı ·
  konsol taban URL'i · okunacak tarama/varlık grubu kimlikleri.
- **Ne eşleşir:** Zafiyet bulguları (CVE, başlık, CVSS, son tarih) ve
  tarayıcının varlık envanteri.
- **Kritik kural:** Bu adaptör **tarama başlatmaz**. Yalnız zaten çalışmış
  taramanın sonucu okunur. OT bölgesinde yalnız pasif ya da agent tabanlı
  sonuç kaynağı kullanılır.
- **Kabul kriteri:** CVSS gelmiyorsa `null` (= ölçülmedi) kalır, sıfır
  yazılmaz. Credentialed / uncredentialed bilgisi geliyorsa güven etiketine
  yansır; gelmiyorsa güven `null` kalır — **uydurulmaz**.
- **Ayrıntı:** `lib/entegrasyon/adaptorler/zafiyetTarayici.ts`

### 3.4 SIEM / log platformu — `siem`

- **Kim verir:** SOC / log yönetimi ekibi.
- **Ne gerekir:** Salt okunur arama hesabı ve token — Splunk için REST
  token + arama yetkisi olan rol; Sentinel için workspace id + Entra
  uygulaması (`Log Analytics Reader`); QRadar için SEC token. Ayrıca
  okunacak index/workspace/domain ve OT loglarının hangi sourcetype altında
  toplandığı.
- **Ne eşleşir:** "Kim log gönderiyor" — log kaynağı envanteri.
- **Neden ilk tercih:** SIEM keşfin **en pasif** kaynağıdır; cihazlar zaten
  log gönderir, ağa hiçbir paket çıkmaz. OT bölgelerinde ilk bağlanacak
  kaynak budur.
- **Kabul kriteri:** İmleç geriye alınmaz; aynı pencere iki kez okunursa
  kayıtlar `kaynakKayitId` üzerinden idempotent birleşmeli (ikinci koşu
  kayıt sayısını artırmamalı).
- **Ayrıntı:** `lib/entegrasyon/adaptorler/siem.ts`

### 3.5 Yedekleme platformu — `backup`

- **Kim verir:** Altyapı / yedekleme ekibi.
- **Ne gerekir:** Salt okunur hesap (**Restore Operator DEĞİL**) ve API
  erişimi — Veeam için Enterprise Manager taban URL + kullanıcı/parola ya da
  OAuth istemcisi; Commvault için webconsole URL + token; NetBackup için API
  key. Ayrıca okunacak iş/politika kapsamı.
- **Ne eşleşir:** Yedek işleri, koşu sonuçları, geri yükleme testleri.
- **Kabul kriteri:** "Hiç yedek doğrulaması yapılmadı" ile "yedek
  doğrulaması başarısız" ekranda **ayrı** görünmeli. Bunlar aynı görünürse
  DR duruşu olduğundan iyi sanılır.
- **Ayrıntı:** `lib/entegrasyon/adaptorler/yedekleme.ts`

### 3.6 Firewall / ağ ekipmanı — `network_firewall`

- **Kim verir:** Ağ ekibi.
- **Ne gerekir:** **Salt okunur** yönetim hesabı — Palo Alto için XML API
  anahtarı + salt okunur yönetici rolü; Fortinet için read-only REST API
  kullanıcısı ve trusted-host kaydı; Cisco için RESTCONF/NETCONF salt okunur
  kullanıcı ya da SNMPv3 authPriv (yalnız ağ ekipmanı OID'leri). DHCP kira
  dosyasına salt okunur erişim. Yönetim ağından hedeflere erişim izni ve
  okunacak cihaz/VLAN listesi.
- **Ne eşleşir:** Ağ topolojisi, cihaz envanteri, DHCP kiraları.
- **Kritik kural:** Yazma izni **istenmez ve verilmemelidir**.
- **Ayrıntı:** `lib/entegrasyon/adaptorler/agGuvenlikDuvari.ts`

### 3.7 OT keşif ürünü — `ot_discovery`

- **Kim verir:** OT / saha otomasyon ekibi. **En yüksek dikkat gerektiren
  bağlantı budur.**
- **Ne gerekir:** Sahada zaten kurulu **pasif** OT keşif ürünü (Claroty CTD /
  Nozomi Guardian / Dragos / Tenable.ot) ve konsolunda salt okunur API
  kullanıcısı: taban URL, kullanıcı/parola ya da API token, sertifika
  doğrulaması için kurum CA'sı. Okunacak site/zone kapsamı ve platform
  sunucusundan konsola ağ erişimi (genellikle OT-DMZ üzerinden).
- **Ne eşleşir:** OT varlık envanteri ve ağ topolojisi.
- **Kritik kural:** **Aktif sorgulama (Active Queries / Smart Polling) izni
  istenmez.** Bu adaptör yalnız ürünün zaten topladığı envanteri okur. Ürün
  PASİF-ÖNCEDİR; OT ortamında agresif aktif tarama yapılmaz.
- **Kabul kriteri:** İlk koşu tek zone ile sınırlı olmalı ve OT sahibi koşu
  sırasında hazır bulunmalı.
- **Ayrıntı:** `lib/entegrasyon/adaptorler/otKesif.ts`

### 3.8 Elle aktarım — `manual_import`

Tek **bağlı** adaptör. Dış sistem gerektirmez; CSV/Excel yükler. Diğer
sistemlerden hiçbiri bağlanamasa bile ürün bu yolla gerçek envanterle
çalışabilir. Bağlantı gününde bir sistem gecikirse geçici köprü budur —
ama gelen kayıtların kökeni `manuel` etiketiyle işaretlenir ve **otomatik
kaynaktan gelmiş gibi görünmez**.

---

## 4. Bağlantıdan sonra ilk hafta

| Gün | Kontrol |
|---|---|
| 1 | Kuru koşu çıktısı ile ilk gerçek koşu sayıları tutuyor mu |
| 1 | Reddedilen kayıtlar incelendi mi; sebepleri tekrar eden bir eşleme hatası mı |
| 2 | Kökensiz kayıt var mı (olmamalı) |
| 3 | Zamanlayıcı connector'ı gerçekten koşturuyor mu — `/saglik` ekranında son başarılı koşu ilerliyor mu |
| 5 | Ardışık hata sayacı artıyor mu; devre kesici tetiklendi mi |
| 7 | Aynı kaydın iki koşuda iki kez yazılmadığı doğrulandı mı (idempotency) |

## 5. Bu koşu kitabının kapsamadıkları

- **Gerçek kimlik bilgisi ve uç nokta değerleri.** Bu belge hangi izne
  ihtiyaç olduğunu söyler; değerleri söylemez ve söylememelidir.
- **Kurum içi ağ topolojisi ve hostname'ler.** Seed verisindeki iç adresler
  `<<KURULUMDA-DOLDURULACAK>>` yer tutucusudur; gerçek adres uydurulmamıştır.
- **Vendor sözleşmesi ve lisans kapsamı.** Bir API'nin teknik olarak açık
  olması, sözleşme kapsamında olduğu anlamına gelmez.
