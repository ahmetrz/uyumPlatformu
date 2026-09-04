# Veri nereden gelir

İsterler listesindeki "nasıl" sorusunun ortak cevabı. Her madde için ayrı
ayrı yazılmış hâli isterler tablosunun **H sütunundadır**; bu belge o
cevapların dayandığı **beş yolu** ve her yolun kurallarını anlatır.

Bir ekranın "VAR" demesi tek başına yeterli değildir: o alanı kimin,
hangi yolla dolduracağı sorusunun cevabı yoksa alan boş kalır. Bu
belgenin işi o cevabı tek yerde tutmaktır.

---

## Beş yol

| # | Yol | Ne zaman kullanılır | Bugün çalışıyor mu |
| --- | --- | --- | --- |
| 1 | **Elle giriş** | Kararlar, gerekçeler, iş bilgisi — hiçbir sistemin bilmediği şeyler | Evet |
| 2 | **Dosya** (CSV · XLSX · JSON) | Kurumda zaten bir dışa aktarım varsa | Evet |
| 3 | **API** (9 uç) | Karşı taraf bize gönderebiliyorsa | Evet |
| 4 | **Connector adaptörü** (8 şablon) | Kaynak sistemden düzenli çekmek gerekiyorsa | **7'si bağlı değil** |
| 5 | **Motor** (17 motor) | Değer başka kayıtlardan türetiliyorsa | Evet |

**Hiçbir yol diğerini kapatmaz.** Bir alan otomatik doluyor olsa bile
elle giriş açık kalır; elle girilen değer kökeninde `manuel` olarak
işaretlenir ve otomatik gelen değerle çakışırsa hangisinin kazanacağına
köken güveni karar verir. İki değer de saklanır.

---

## 1. Elle giriş

Ekranın kendi formu. Şunlar **yalnız** buradan gelir ve hiçbir sistemden
çekilemez:

- kritiklik, üretim etkisi, RTO/RPO ve **gerekçeleri**
- proses ve proses adımı bağları (bu bilgi süreç sahibinin kafasındadır)
- onaylı firmware tabanı, konfigürasyon tabanı onayı
- uygulanabilirlik, kapsam dışı ve istisna kararları
- bildirim yükümlülüğü kuralları (süre, merci, dayanak)
- olgunluk seviyesi ve gerekçesi, kontrol testi kaydı
- yönetim gözden geçirmesi ve kararları
- fiziksel sayım sonuçları, yedek parça stoğu, taşınabilir medya kütüğü
- eğitim tanımı ve katılım kaydı

Ortak kural: **sayı yazan bir değerlendirme gerekçe ister.** Denetimde
ilk sorulacak şey odur.

## 2. Dosya

CSV, XLSX ve JSON. Hat her zaman aynı beş adımdır:

```
dosya → kolon eşleme → KURU KOŞU → önizleme → insan onayı → yazma
```

- Kolon adları normalleştirilerek eşlenir: `Serial Number`, `seri no`,
  `SN` aynı kolondur.
- Tanınmayan kolon **sessizce atılmaz**; satırın tamamı ham olarak
  saklanır ve denetim izinin girdisi olur.
- Kuru koşu bir seçenek değil, bir **adımdır**: kaç yeni, kaç güncelleme,
  kaç hata — hepsi yazmadan önce görünür.
- Hatalı satır sebebiyle ölü mektup kuyruğuna yazılır ve düzeltildikten
  sonra yeniden işlenir.

Ekranlar: `/varlik-aktarim` (varlık), `/ice-aktarim` (kontrol seti ve
uyum değerlendirmesi).

## 3. API

Dokuz uç. **Okuma:** `GET /api/v1/assets` (imleç sayfalamalı, filtreli) ·
`/plants` · `/evidence` · `/integration-runs`.
**Yazma:** `POST /api/v1/assets/upsert` · `/assets/observations` ·
`/vulnerabilities` · `/backup-results` · `/access-observations`.

- Her anahtar **kendi kapsamını** taşır; sahibinin bütün yetkilerini
  miras almaz. Bir CMDB entegrasyonuna verilen anahtar kanıt paketi
  okuyamaz.
- Anahtarlar varsayılan olarak **salt okunurdur**.
- Aynı kayıt iki kez gönderilirse iki satır açılmaz — idempotency köken
  defterine dayanır.
- OpenAPI 3.1 sözleşmesi uç kütüğünden ve zod şemalarından **türetilir**,
  elle yazılmaz; `/api-sozlesmesi` ekranında durur. `servers` alanı
  bilerek yoktur.

## 4. Connector adaptörü

Sekiz şablon: dizin (AD/Entra) · EDR · SIEM · OT keşif · zafiyet tarayıcı
· yedekleme · ağ ve güvenlik duvarı · elle aktarım. **Yalnız sonuncusu
çalışır**; diğer yedisi bağlı değildir ve bunu ekranda açıkça söyler.

Her bağlanmamış adaptör kurumdan isteyeceği kalemleri **yapısal olarak**
beyan eder (adres · kimlik · izin · kapsam) — beyan zorunludur,
unutulamaz. Liste `/saglik › Kurulum hazırlığı › Bağlantı ihtiyacı`
ekranındadır.

### Passive-first — bu ürünün en sert kısıtı

Platform OT'de **kendi tarayıcısını çalıştırmaz** ve hiçbir OT cihazına
paket göndermez. Doğru kaynak, sahada zaten çalışan ürünün **sonucudur**.

Şema seviyesinde yasak olan ve yapılandırmayla bile açılamayan işlemler:

| Kaynak | Yasak |
| --- | --- |
| EDR | izolasyon / karantina, süreç sonlandırma, uzaktan script (RTR) |
| Zafiyet tarayıcı | tarama başlatma (OT'de kontrolcü durdurabilir) |
| OT keşif | Active Queries / Smart Polling tetikleme |
| Yedekleme | yedek başlatma, geri yükleme tetikleme |
| Ağ / firewall | kural, ACL, konfigürasyon değişikliği; SNMP ile cihaz uyandırma |

İstemcilerde yalnız okuma metotları bulunur. Bir "tarama başlat"
fonksiyonu eklenmesi bir kusur sayılır ve sertifikasyon kontrolü bunu
her koşuda sınar.

### Kaynak başına ne okunur

| Kaynak | Ne verir | Ne İSTENMEZ |
| --- | --- | --- |
| **OT keşif** (Claroty · Nozomi · Dragos · Tenable.ot · Forescout) | Pasif dinlemeyle çıkarılmış OT envanteri: seri no, MAC, üretici, model, firmware sürümü, zone, Purdue seviyesi; düğüm ve bağlantı listesi | Aktif sorgulama izni |
| **EDR** (CrowdStrike · Defender · SentinelOne) | Agent'ın kendi raporu: hostname, seri no, MAC, üretici/model, işletim sistemi, BIOS sürümü | Müdahale izni |
| **Zafiyet tarayıcı** (Tenable · Qualys · Rapid7) | Zaten çalışmış taramanın sonucu: CVE, CVSS, başlık, son tarih; ayrıca tarayıcı envanteri | Tarama başlatma izni |
| **Yedekleme** (Veeam · Commvault · NetBackup) | İş sonuçları: zaman, sürüm, içerik özeti, depolama konumu, başarı/hata | Geri yükleme izni |
| **Dizin** (AD / Entra) | Kullanıcı ve cihaz delta'sı, ayrıcalıklı rol üyeliği, son oturum, parola rotasyonu | Yazma izni |
| **SIEM** (Splunk · Sentinel · QRadar · Elastic) | "Kim log gönderiyor" — en pasif keşif kaynağı; ayrıcalıklı oturum izleri | Playbook tetikleme, alarm kapatma |
| **Ağ / firewall** (PAN-OS · FortiOS · IOS-XE · SNMP · DHCP) | Ekipmanın **zaten tuttuğu** tablolar: ARP, MAC/port, DHCP kirası, VLAN | Kural değişikliği; PLC/RTU'ya SNMP |

### İki kural, her kaynakta aynı

**Yokluk kanıt değildir.** EDR'de görünen varlık "kapsanıyor" yazabilir;
görünmeyen varlık "kapsanmıyor" **değil**, `bilinmiyor` kalır. Aynısı
yedekleme ve log kaynağı için de geçerlidir.

**Eşleme anahtarı sırası:** seri no > MAC > hostname. **IP tek başına
eşleme yapmaz** — DHCP'de gezer.

### Bir adaptörü olmayan kaynaklar

Sahada karşılığı olan ama ürüne şablonu yazılmamış kaynaklar dosya ya da
API yoluyla beslenir; ayrı bir adaptör yazılması ileri bir iştir:

- **PLC/DCS/SCADA konfigürasyon versiyonlama** (octoplant/versiondog,
  AutoSave sınıfı) → `POST /api/v1/backup-results` ya da CSV
- **PAM / VPN oturum kayıtları** → `POST /api/v1/access-observations`
  ya da CSV
- **LMS / İK eğitim kayıtları** → CSV
- **Depo / ERP yedek parça stoğu** → CSV

## 5. Motor

On yedi motor. Türetilmiş değerleri hesaplar, bağ kurar, görev ve bulgu
açar. Üç ortak kural:

- **Motor önerir, insan karar verir.** Hiçbir motor bir varlığı
  envanterden düşürmez, bir bulguyu kabul etmez, bir kaydı silmez.
- **Elle verilmiş kararı ezmez.** Ezseydi yanlış pozitif bastırma her
  koşuda silinir ve işe yaramazdı.
- **Sahte başarı yoktur.** Koşu defteri işlenen/üretilen sayısını ve hata
  sebebini yazar; kural tanımlı olmadığı için hiçbir şey yapmayan motor
  bunu ayrıca söyler.

---

## Ürünle GELMEYEN veriler

Bunlar kuruma özgüdür ve ürüne gömülmez. Örnek bir değer yazmak,
kimsenin değiştirmediği yanlış bir sayaç bırakırdı:

| Ne | Neden ürüne yazılmaz |
| --- | --- |
| Bildirim süreleri, merciler, mevzuat dayanakları | Mevzuattan gelir ve kurumun tabi olduğu düzenlemeye göre değişir. Kural tanımlanmadıysa sayaç **hiç işlemez** |
| Resmî kaynak adresleri (mevzuat takibi) | Kurumun uyum kapsamına göre kurum belirler |
| Saklama süreleri ve dayanakları | Hangi kayıt ailesi kaç yıl, hangi mevzuata göre — kurum girer |
| Eğitim tanımları ve geçerlilik süreleri | Kurumun eğitim programı |
| Onaylı firmware ve konfigürasyon tabanları | Mühendislik kararı |
| IEEE OUI kütüğü | Kurum yükleyene kadar üretici alanı "kütükte yok" kalır |
| Uç noktalar, kimlik bilgileri, token'lar | Hiçbiri ürüne yazılmaz ve uydurulmaz |

---

## Sır katmanı

Yapılandırmada sırrın **değeri** değil **adresi** durur
(`env:EDR_ISTEMCI_SIRRI` gibi). Değer çalışma anında çözülür ve hiçbir
yere loglanmaz. İmzalama anahtarı ürüne hiç verilmez — imzalama servise
yaptırılır.
