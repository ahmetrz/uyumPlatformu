# Veri nereden gelir

Bir isterin karşısında "VAR" yazması tek başına yeterli değildir. Asıl
soru şudur: **o alanı kim, hangi yolla dolduracak?** Cevabı olmayan bir
alan boş kalır ve ekran ilk gün güzel görünüp altıncı ay anlamsızlaşır.

Bu belge o sorunun cevabını verir. Her ister için ayrı ayrı yazılmış
hâli isterler tablosunun **H sütunundadır**; burada o cevapların
dayandığı beş yol ve her yolun kuralları anlatılır.

---

## Beş yol

| Yol | Ne zaman | Bugün |
| --- | --- | --- |
| **Elle giriş** | Kararlar, gerekçeler, iş bilgisi — hiçbir sistemin bilmediği şeyler | Çalışıyor |
| **Excel / CSV** | Kurumda zaten bir liste ya da dışa aktarım varsa | Çalışıyor |
| **API** | Karşı sistem bize gönderebiliyorsa | Çalışıyor |
| **Doğrudan bağlantı** | Kaynak sistemden düzenli çekmek gerekiyorsa | **Sekiz kaynağın yedisi henüz bağlı değil** |
| **Otomatik hesaplama** | Değer başka kayıtlardan çıkarılabiliyorsa | Çalışıyor |

**Hiçbir yol diğerini kapatmaz.** Bir alan otomatik doluyor olsa bile
elle giriş açık kalır. İki kaynak farklı şey söylerse ikisi de saklanır
ve hangi bilginin nereden geldiği kayıtta görünür.

---

## 1. Elle giriş

Şunlar yalnız buradan gelir — hiçbir sistemden çekilemez, çünkü hiçbir
sistem bilmez:

- kritiklik, üretime etkisi, kurtarma hedefleri ve **gerekçeleri**
- süreç ve süreç adımı bağları (bunu süreci bilen kişi bilir)
- onaylı firmware sürümü, onaylı konfigürasyon
- uygulanabilirlik, kapsam dışı ve istisna kararları
- bildirim yükümlülüğü kuralları (kaç saat, hangi kuruma, hangi dayanakla)
- olgunluk seviyesi ve gerekçesi, kontrol testi kaydı
- yönetim gözden geçirmesi ve alınan kararlar
- saha sayımı sonuçları, yedek parça stoğu, taşınabilir medya kaydı
- eğitim tanımı ve katılım kaydı

Ortak kural: **sayı yazan bir değerlendirme gerekçe ister.** Denetimde
ilk sorulan şey odur.

## 2. Excel / CSV

Akış her zaman aynıdır:

```
dosya  →  kolonları eşle  →  DENEME KOŞUSU  →  önizleme  →  onay  →  yazılır
```

- Kolon başlıklarını platform kendi tanır: `Serial Number`, `seri no`,
  `SN` aynı kolon sayılır.
- Tanımadığı kolonu **atmaz**; saklar ve size sorar.
- Deneme koşusu isteğe bağlı değildir. "Şu kadar yeni kayıt, şu kadar
  güncelleme, şu kadar hatalı satır" — hepsi yazılmadan önce görünür.
- Onaylamadığınız hiçbir satır yazılmaz.
- Hatalı satır sessizce düşmez: sebebiyle saklanır, düzeltilip yeniden
  işlenir.

## 3. API

Dış sistemler platformdan **okuyabilir**: varlık listesi, santral
bilgisi, kanıt bilgileri, entegrasyon geçmişi. Ve platforma
**yazabilir**: varlık kaydı, keşif gözlemi, zafiyet bulgusu, yedek
sonucu, erişim gözlemi.

- Her API anahtarı **kendi yetkisini** taşır — onu oluşturan kişinin
  bütün yetkilerini devralmaz. Bir envanter entegrasyonuna verdiğiniz
  anahtar kanıt paketinize erişemez.
- Anahtarlar varsayılan olarak **salt okunurdur**; yazma yetkisi ayrıca
  verilir.
- Aynı kayıt iki kez gönderilirse iki satır oluşmaz.
- Teknik sözleşme (OpenAPI) ürünün kendisinden üretilir, elle yazılmaz —
  dolayısıyla doküman ile davranış birbirinden ayrışamaz.

## 4. Doğrudan bağlantı

Sekiz kaynak için bağlantı hazır: kurumsal dizin, uç nokta koruması, log
platformu, OT keşif ürünü, zafiyet tarayıcı, yedekleme yazılımı, ağ ve
güvenlik duvarı, ve dosya aktarımı. **Bugün yalnız sonuncusu
çalışıyor**; diğer yedisi bağlı değil ve ekran bunu açıkça söylüyor.

Her bağlanmamış kaynak, sizden isteyeceği bilgileri liste hâlinde
beyan eder — adres, salt okunur hesap, hangi izinler, hangi kapsam.
Bu liste hazırlık ekranında durur ve bağlantı gününde doğrudan
kullanılır.

### En sert kural: sahaya paket gitmez

Platform OT ağında **kendi taramasını çalıştırmaz** ve hiçbir OT
cihazına sorgu göndermez. Doğru kaynak, sahada zaten çalışan ürünün
**sonucudur**.

Şu işlemler bağlantı ayarlarından bile açılamaz:

| Kaynak | Yapılmayan |
| --- | --- |
| Uç nokta koruması | cihaz izolasyonu, karantina, uzaktan komut |
| Zafiyet tarayıcı | tarama başlatma |
| OT keşif ürünü | aktif sorgulama tetikleme |
| Yedekleme | yedek başlatma, geri yükleme |
| Ağ / güvenlik duvarı | kural değişikliği, cihaz uyandırma |

Sebep teknik: OT segmentinde kimlik doğrulamasız bir bağlantı ya da
beklenmedik bir paket, bir kontrolcüyü durdurabilir. Bu bir güvenlik
tercihi değil, emniyet meselesidir.

Sebep aynı zamanda kurumsaldır: bu platform bir **kayıt ve karar**
ürünüdür. Sahaya müdahale kararı insanındır ve kendi sisteminden verilir.

### Hangi kaynak ne verir

| Kaynak | Ne verir | Ne istenmez |
| --- | --- | --- |
| **OT keşif** (Claroty · Nozomi · Dragos · Tenable.ot · Forescout) | Pasif dinlemeyle çıkarılmış OT envanteri: seri no, MAC, üretici, model, firmware sürümü, ağ bölgesi, Purdue seviyesi; ayrıca cihazlar arası iletişim haritası | Aktif sorgulama izni |
| **Uç nokta koruması** (CrowdStrike · Defender · SentinelOne) | Cihazın kendi raporu: bilgisayar adı, seri no, MAC, üretici/model, işletim sistemi, BIOS sürümü | Müdahale izni |
| **Zafiyet tarayıcı** (Tenable · Qualys · Rapid7) | Zaten çalışmış taramanın sonucu: CVE, CVSS, başlık, son tarih; ayrıca tarayıcının kendi envanteri | Tarama başlatma izni |
| **Yedekleme** (Veeam · Commvault · NetBackup) | İş sonuçları: ne zaman, hangi sürüm, içerik parmak izi, nerede saklandı, başarılı mı | Geri yükleme izni |
| **Kurumsal dizin** (AD / Entra) | Kullanıcılar ve cihazlar, ayrıcalıklı rol üyelikleri, son oturum, parola değişim tarihi | Yazma izni |
| **Log platformu** (Splunk · Sentinel · QRadar · Elastic) | "Kim log gönderiyor" — en pasif keşif kaynağı; ayrıcalıklı oturum izleri | Alarm kapatma, otomasyon tetikleme |
| **Ağ / güvenlik duvarı** (Palo Alto · Fortinet · Cisco · SNMP · DHCP) | Ağ cihazlarının **zaten tuttuğu** tablolar: ARP, MAC/port eşlemesi, DHCP kiraları, VLAN'lar | Kural değişikliği; PLC ve RTU'ya sorgu |

### İki kural, her kaynakta aynı

**Bir sistemde görünmemek, orada olmamanın kanıtı değildir.** Uç nokta
korumasında görünen varlık "kapsanıyor" yazılır; görünmeyen varlık
"kapsanmıyor" **değil**, "bilinmiyor" kalır. Aynısı yedekleme ve log
kaynağı için de geçerlidir.

**Aynı cihazı tanıma sırası:** seri no, sonra MAC, sonra bilgisayar adı.
**IP tek başına eşleştirme için kullanılmaz** — DHCP'de değişir.

### Bağlantı şablonu olmayan kaynaklar

Sahada karşılığı olan ama henüz hazır şablonu yazılmamış kaynaklar
bugün Excel ya da API ile beslenir; ayrı bir bağlantı yazılması ileri
bir iştir:

- **PLC/DCS/SCADA konfigürasyon versiyonlama** (octoplant/versiondog,
  AutoSave benzeri)
- **Ayrıcalıklı erişim (PAM) ve VPN oturum kayıtları**
- **Eğitim ve İK sistemleri**
- **Depo / ERP yedek parça stoğu**

## 5. Otomatik hesaplama

Bazı değerler girilmez, başka kayıtlardan çıkarılır: yama durumu, ağ
tutarsızlıkları, konfigürasyon sapması, kanıt tazeliği, tekrarlayan
bulgular, bildirim süresi. Üç ortak kural:

- **Sistem önerir, insan karar verir.** Hiçbir otomatik hesaplama bir
  varlığı envanterden düşürmez, bir bulguyu kabul etmez, bir kaydı
  silmez.
- **Elle verdiğiniz kararı bozmaz.** Bozsaydı "bu bizi etkilemiyor"
  notunuz her koşuda silinir ve işe yaramazdı.
- **Sahte başarı yoktur.** Koşu geçmişi kaç kayıt işlendiğini ve hata
  sebebini yazar. Kural tanımlanmadığı için hiçbir şey yapmayan bir
  hesaplama bunu ayrıca söyler — bu bir hata değildir, ama sessizlik de
  değildir.

---

## Ürünle gelmeyen veriler

Bunlar kuruma özgüdür ve ürüne gömülmez. Örnek bir değer koymak,
kimsenin değiştirmediği yanlış bir sayaç bırakırdı:

| Ne | Neden |
| --- | --- |
| Bildirim süreleri, ilgili kurumlar, mevzuat dayanakları | Mevzuattan gelir ve kurumun tabi olduğu düzenlemeye göre değişir. Kural tanımlanmadan sayaç **hiç işlemez** |
| Takip edilecek resmî kaynakların adresleri | Uyum kapsamınıza göre siz belirlersiniz |
| Saklama süreleri ve dayanakları | Hangi kayıt kaç yıl, hangi mevzuata göre |
| Eğitim tanımları ve geçerlilik süreleri | Kurumun eğitim programı |
| Onaylı firmware ve konfigürasyon sürümleri | Mühendislik kararı |
| Üretici kodu (OUI) kütüğü | Siz yükleyene kadar üretici alanı "kütükte yok" kalır |
| Sistem adresleri, hesaplar, parolalar | Hiçbiri ürüne yazılmaz ve uydurulmaz |

## Parola ve anahtarlar

Ayarlarda parolanın kendisi değil, **nerede durduğunun adresi** saklanır.
Değer çalışma anında çözülür ve hiçbir kayda yazılmaz. İmzalama anahtarı
platforma hiç verilmez — imzalama işi kurumun kendi altyapısına
yaptırılır.
