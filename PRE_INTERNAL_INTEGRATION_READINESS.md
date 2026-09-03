# Şirket İçi Entegrasyon Öncesi Hazırlık Raporu

**Tarih:** 2026-09-01 · **Kapsam:** `ahmetrz/uyumPlatformu`

Bu belge tek bir soruya yanıt verir: **gerçek kurum sistemlerine bağlanma
izni verildiği anda, çekirdek uygulamada yeniden mimari geliştirme
gerekmeden yalnız yapılandırma + kimlik + eşleme yaparak entegrasyona
geçebilir miyiz?**

Yanıt evet — ama koşulları ve kalan işler aşağıda kanıtlarıyla yazılı.

> ### Bugünkü sınır
> Ürün **hiçbir gerçek kurum sistemine bağlı değildir.** Sekiz adaptörden
> yedisi `BaglanmamisAdaptor`'ı genişletir, `baglanabilir = false` döner ve
> çekirdek onları koşturmaz. Bağlanan tek adaptör `manual_import`'tur ve dış
> sistem gerektirmez. Bu bir eksiklik değil, bilinçli bir duruştur: gerçek uç
> nokta ve kimlik olmadan yazılan bir entegrasyon, çalıştığı sanılan ama
> hiçbir şey kanıtlamayan bir kabuktur. Bu yüzden ürün bağlanmamış bir
> kaynağı sahte başarıyla değil, `kimlik_bekleniyor` durumuyla gösterir.
>
> Repoda **gerçek endpoint, credential, token ya da şirket içi veri
> yoktur.** Seed'deki iç adresler `<<KURULUMDA-DOLDURULACAK>>` yer
> tutucusudur; kamuya açık vendor uç noktaları (Microsoft Graph, CrowdStrike
> bölge API'si) belgelenmiş sabitlerdir ve öyle kalır.

---

## 1. Bugünkü durum — sayılarla

Aşağıdaki blok elle yazılmaz: `web/arac/sayimlar.mjs` onu kaynaktan
türetir ve `tests/belge-sayimlari.test.ts` sapma olduğu an KIRMIZI olur.
Elle yazılmış bir sayaç, yazıldığı gün doğru olsa bile ertesi gün yalan
söylemeye başlar ve yalanı kimse fark etmez.

<!-- SAYIMLAR:BASLA -->
<!-- Bu blok `node arac/sayimlar.mjs --yaz` ile üretilir. ELLE DÜZENLEME. -->

| Ölçü | Değer |
|---|---|
| test dosyası | 107 |
| test vakası | 1975 |
| atlanan test | 1 |
| ekran (rota) | 47 |
| API ucu | 9 |
| otomasyon motoru | 14 |
| connector adaptörü | 8 |
| sunucu eylemi modülü | 33 |
| Prisma modeli | 121 |
| uygulanmış göç | 25 |

<!-- SAYIMLAR:BITIS -->

Sayılara eşlik eden nitel gerçekler: connector adaptörlerinin yalnız BİRİ
(`manual_import`) bağlanabilir, kalanı `kimlik_bekleniyor` döndürür ve
çekirdek onları koşturmaz. Otomasyon motorlarının tamamı tek kayıt
defterinde (`lib/motorlar/kayit.ts`) yaşar; zamanlayıcı ve "hepsini
çalıştır" düğmesi aynı defteri okur.

## 2. Kalan boşlukların sınıflandırması

### 2.1 `MUST_FIX_BEFORE_INTERNAL_INTEGRATION` — bu oturumda kapatıldı

| # | Boşluk | Neden bağlanmadan önce | Kanıt |
|---|---|---|---|
| 1 | Zamanlayıcı connector'ları hiç koşturmuyordu | `pollAralikDk` yapılandırılıyor, ekranda görünüyor, tazelik yargısında kullanılıyor — ama hiçbir şey ona bakıp senkronize etmiyordu. Ürün kendi zamanlayıcı boşluğunu "kaynak sistem bayat veri veriyor" diye gösteriyordu. | `lib/is/zamanlayici.ts`, `tests/zamanlayici.test.ts` |
| 2 | Çakışma önleme kontrol-sonra-kullan yarışıydı | İki örnekli dağıtımda her motor iki kez koşardı. Beş eşzamanlı istekle ölçüldü: eski yolda beşi de kilidi alıyordu. | `lib/is/kilit.ts`, mutasyon ölçümü |
| 3 | Tek başarısız koşu connector'ı kalıcı durduruyordu | Zamanlayıcı `hatali` olanı bir daha koşturmaz. Tek ağ zaman aşımı = kalıcı kesinti. | `ardisikHata` devre kesici, `tests/entegrasyon-hata-modeli.test.ts` |
| 4 | Reddedilen kaydın kendisi kayboluyordu | Ham yük olmadan eşlemeyi düzeltmek için kaynağa geri dönmek gerekir; çoğu kaynakta o kayıt bir daha bulunamaz. | `ReddedilenKayit`, dört aşamada yazım |
| 5 | Connector santral kapsamı zorlanmıyordu | Şemada saldırıyı anlatan yorum vardı, kodda karşılığı yoktu. Yanlış yapılandırılmış bir OT connector'ı başka sahaya yazabilirdi. | `connectorKapsamKodlari`, `tests/guvenlik-negatif.test.ts` |
| 6 | Başarısız giriş hiç kaydedilmiyordu | Yüz yanlış parola ile hiç deneme yapılmaması denetim izinde aynı görünüyordu. | `lib/girisKorumasi.ts` |
| 7 | Giriş ucunda oran sınırı yoktu | scrypt bir yavaşlatmadır, sınır değil; üstelik kendisi bir DoS yüzeyi. | `GIRIS_ORANI`, `tests/giris-guvenligi.test.ts` |
| 8 | Oturumda atıl zaman aşımı yoktu | `sonKullanim` şemada vardı, hiç yazılmıyordu — olmayan bir kontrol var görünüyordu. | `oturumGecerli`, `tests/oturum-yasam-dongusu.test.ts` |
| 9 | Hesap pasifleştirme oturumları kesmiyor, ize yazmıyordu | "Kaç açık oturum var" sorusunun yanıtı yanlıştı. | `tumOturumlariKapat` |
| 10 | Hiçbir güvenlik başlığı yoktu | CSP, çerçeveleme, MIME sniff — hiçbiri. | `next.config.ts` |
| 11 | Sır katmanı takılabilir değildi | Bağlanmamış sağlayıcı "yok" diyemez, "bilinmiyor" demeli. | `lib/entegrasyon/sir.ts`, `tests/sir-katmani.test.ts` |
| 12 | Kuru koşu yoktu | Bağlantı günü ilk yapılacak şey budur: hiçbir şey yazmadan ne olacağını görmek. | `lib/entegrasyon/kuru.ts` |
| 13 | Eşleme sürümlü değildi | Eşleme değişince eski kayıtların hangi kuralla üretildiği kaybolurdu. | `EslemeProfili`, `tests/esleme.test.ts` |
| 14 | Adaptörler yapılandırma şeması beyan etmiyordu | Yanlış yapılandırma ancak ilk koşuda anlaşılıyordu. | `Adaptor.yapilandirmaSemasi` |
| 15 | Sertifikasyon harness'ı yoktu | Her adaptörün aynı sözleşmeye uyduğu ölçülemiyordu. | `lib/entegrasyon/sertifika.ts`, 14 kontrol |
| 16 | Envanter 997 varlığın üzerinde HTTP 500 | Gerçek CMDB bu eşiğin çok üstünde. | `lib/sorguParcala.ts` |
| 17 | Aktarılan veri kalitesi kuralları yoktu | Kuralı veri geldikten sonra yazmak ilk kötü aktarımı kaçırmaktır. | `lib/motorlar/veriKalitesi.ts` B grubu |
| 18 | Topoloji sapması erişilemezdi | Motor sapma üretiyor, ekran iskeleydi, yedi eylem çağrılmıyordu. | `/topoloji` tezgâhı |

### 2.2 `MUST_FIX_BEFORE_INTERNAL_INTEGRATION` — AÇIK

**Yok.** Yazılım tarafında bağlantı gününü geciktiren açık kalem kalmadı.

Bir zamanlar bu başlıkta duran iki kalem (dağıtık oran sınırı deposu ve
PostgreSQL denetim tetikleyicileri) §2.6'ya taşındı: ikisi de KOD eksikliği
değil, **dağıtım altyapısı** bekleyen işlerdir. İkisini "kapatılmamış iş"
diye burada tutmak, yazılım borcunu altyapı borcuyla karıştırmaktı ve
"daha yapılacak kod var" izlenimi veriyordu — yoktu.

**Kapananlar** (bu oturumun ikinci yarısı):

| # | Boşluk | Nasıl kapandı |
|---|---|---|
| B | Arama koşulu PostgreSQL'de sessizce boşalacaktı | On bir yerdeki ham `contains` tek yardımcıya indi; göç günü değişecek satır bir tane. İçerik tarayan bir bekçi test yeni ham `contains` eklenmesini engelliyor. Bugünkü duyarsız davranışı KAYIT ALTINA alan test, göç günü kırmızıya dönecek — ve dönmesi gerekiyor. |
| C | Kontrol-sonra-yaz yarışları | Üç nokta (dört göz onayı, içe aktarım onayı, keşif kararı) koşullu `updateMany` ile sahiplenmeye çevrildi. Eşzamanlı iki çağrıdan tam birinin kazandığı, kaybedenin hiçbir yan etki bırakmadığı testle donduruldu; mutasyonla ölçüldü. |
| E | API anahtarı süresiz üretilebiliyordu | Süresiz anahtar kaldırıldı: tavan 3650 günden (on yıl) 730'a indi, boş bırakılan alan sonsuza değil 365 güne düşer. |

### 2.3 `NICE_TO_HAVE_BEFORE_INTERNAL_INTEGRATION`

| Boşluk | Not |
|---|---|
| CSP'de `script-src 'unsafe-inline'` | Next'in satır içi önyüklemesi nonce olmadan çalışmaz; nonce middleware ister. Bilinçli borç, `next.config.ts`'te yazılı. |
| Anonim oran sınırı kovası tek | Bir saldırgan tüm kimliksiz çağıranları 429'a düşürebilir. Etkisi düşük (hepsi zaten 401 alır). |
| Kanıt paketi imzalı değil | SHA-256 yalnız bütünlük kanıtlar. İnkâr edilemezlik gerçek imzalama anahtarı (HSM/PKI) ister — uydurulmadı. |
| `AktiviteKaydi` hiç silinmiyor | Yalnız büyür. `@@index([zaman])` önerildi, bugünkü hacimde ölçülemedi. |
| Kanıt paketi arşivlenmiyor | Sunucu dosya yazmaz; denetçinin elindeki dosya iz satırındaki özetle eşleşir. |

### 2.4 `REQUIRES_REAL_INTERNAL_SYSTEM` — dokunulmadı

Bunlar eksiklik değildir; gerçek sistem olmadan **yapılması yanlış** olan
işlerdir. Hiçbirine sahte bir uygulama yazılmadı.

| Kalem | Neden bekliyor |
|---|---|
| Yedi adaptörün `fetchChanges` / `normalize` gövdesi | Gerçek yanıt biçimi olmadan yazılan ayrıştırıcı, ilk gerçek yanıtta çöpe gider. Beklenen eşleme her adaptörün başlığında ve fikstürlerde yazılı. |
| Vault / KMS sağlayıcısı | Kayıtlı, `bagli: false`, neyin gerektiğini söylüyor. |
| Dağıtık iş kuyruğu (Redis/Temporal) | Kayıtlı, `bagli: false`. İstenip de bağlı olmayan kuyruğa sessizce süreç-içinden düşülmez. |
| Gerçek SSO / MFA | `kimlikTipi` `oauth2_client_credentials` ve `certificate` destekliyor; gerçek IdP bağlanmadı. |
| OT ağı üzerinde herhangi bir ölçüm | Ürün PASİF-ÖNCEDİR; aktif sorgulama izni istenmez. |
| Gerçek üretim verisiyle performans | Ölçümler sentetik veriyle yapıldı ve öyle etiketlendi. |
| Kurum içi hostname ve adresler | `<<KURULUMDA-DOLDURULACAK>>` yer tutucusu. |

### 2.5 `REQUIRES_PRODUCTION_INFRASTRUCTURE`

Bu kalemler ne **kod eksikliğidir** ne de **kurum sistemi** bekler; bir
üretim dağıtımının getirdiği altyapı bileşenlerini bekler. Ayrı bir başlık
olmalarının sebebi şudur: aynı listede tutulduklarında "hâlâ yazılacak kod
var" gibi okunuyorlar ve bağlantı gününün önünde duruyormuş gibi
görünüyorlardı. Görünmüyorlar — hiçbiri connector bağlamayı geciktirmez.

Hepsinde **dikiş hazır**: kod bir sağlayıcı arayüzü görür, bağlı olmayanı
`bagli: false` diye bilir ve sessizce başka bir şeye DÜŞMEZ.

| Kalem | Bugün ne var | Bağlandığında ne değişir |
|---|---|---|
| Dağıtık oran sınırı deposu (Redis vb.) | `oranDeposuAyarla()` kancası + bellek içi depo. Tek süreçte doğru çalışır; N örnekli kümede saldırgana N katı deneme hakkı verir. | Tek bir depo uygulaması kaydedilir; çağıran kod değişmez. |
| PostgreSQL denetim izi tetikleyicileri | SQLite tetikleyicileri çalışıyor ve değişmezlik testle kanıtlı. PostgreSQL karşılıkları (TRUNCATE tetikleyicileri dâhil) `docs/POSTGRES_READINESS.md` §a.2'de HAZIR ama **PostgreSQL olmadan denenemez**. | Taban göçe eklenir ve aynı değişmezlik testleri PostgreSQL üzerinde koşar. |
| Dağıtık iş kuyruğu (Redis/BullMQ, Temporal) | `lib/is/kuyruk.ts` sağlayıcı defteri; `dis` sağlayıcı KAYITLI ama `bagli: false`. İstenip de bağlı olmayan kuyruğa **sessizce süreç-içinden düşülmez**. | Sağlayıcı bağlanır; zamanlayıcı ne koşacağını zaten veritabanından TÜRETTİĞİ için davranış değişmez. |
| Üretim sır kasası (Vault / KMS) | `lib/entegrasyon/sir.ts` defterinde kayıtlı, `bagli: false`, neyin gerektiğini söylüyor; varlık sorgusu `yok` değil **`bilinmiyor`** döner. | `vault:` referansları çözülmeye başlar; `env`/`dosya` yolları olduğu gibi kalır. |
| İmzalama anahtarı (HSM / PKI) | Kanıt paketi SHA-256 ile **bütünlük** kanıtlar; inkâr edilemezlik kanıtlamaz ve bunu açıkça söyler. | Paket imzalanır; özet hesabı değişmez. |

### 2.6 `DEFERRED_BY_DESIGN`

| Karar | Gerekçe |
|---|---|
| Toplu sapma kabulü yok | Her sapma açılıp farkın iki yakası görülmeden kapatılamasın. |
| "Tarama başlat" düğmesi yok | OT'de PLC/RTU beklenmedik pakete kontrolcü durmasıyla cevap verebilir. Emniyet ihlali. |
| EDR izolasyon/karantina yok | Müdahale kararı insanındır ve platformdan tetiklenmez. |
| "Kökeni olmayan her kayıt" kuralı yok | Bugün 347 varlığın hiçbirinin kökeni yok (hepsi elle girildi); kural gürültü üretip gerçek bulguyu gömerdi. |
| `izinVar` küresel rol önceliği | Hem santral kısıtlı hem kapsamsız rol taşıyan kullanıcı kapsamsızdır. Kayıtlı bir işletme riski; testi bu davranışı bilerek donduruyor. |
| CSV içe aktarım kendi kolon eşlemesini kullanır | Connector eşleme profiliyle sözlüğü paylaşır, profili paylaşmaz. |

## 3. Sır yönetimi

Sır **değeri** hiçbir yerde saklanmaz. `Connector.sirReferansi` yalnız bir
ADRES taşır: `env:AD`, `dosya:/yol#alan`, `vault:yol#alan`.

- Sunucu eylemi sır **değeri kabul etmez**; yalnız referans alır ve biçimini
  kaydederken doğrular — geçersiz referans ilk koşuya kadar ertelenmez.
- Değer çözülürken **önbelleğe alınmaz**: rotasyondan sonraki ilk çözüm
  yenisini getirir. Önbellek olsaydı eski değer yaşar ve kimlik doğrulama
  sessizce başarısız olurdu.
- Üç sağlayıcı kayıtlı: `env` ve `dosya` **bağlı**, `vault` **bağlı değil**
  ve neyin gerektiğini söylüyor.
- **Bağlanmamış sağlayıcı "sır yok" DEMEZ, "bilinmiyor" der.** "Yok" demek,
  kurulumu eksik olmayan bir connector'ı eksik göstermek olurdu.
- Son savunma katmanı: koşu kaydına, ham yüke ve hata metnine yazılmadan
  önce sır değeri maskelenir. Bu tek hat değildir — asıl kural sırrı hiç
  yazmamaktır.
- Kanıt paketi üretimi, serileştirmeden sonra sır süzgecinden geçer;
  sızıntıda **maskelemez, üretimi durdurur**. Maskeleyip geçmek, bir dahaki
  alan eklendiğinde sessiz sızıntı demektir.

## 4. Connector sertifikasyonu

On dört kontrol, sekiz adaptör, tek sözleşme. Harness `db` içe aktarmaz,
ağa çıkmaz, sır çözmez (yalnız varlığını sorar).

Kontroller: yapılandırma şeması · sır referansları · yük ayrıştırıcı ·
normalize doğruluğu · bilinmeyen ≠ yanlış değer · yinelenen tespiti ·
idempotency · santral kapsamı · bozuk kayıt reddi · kısmî başarısızlık ·
retry/backoff · bayat connector · köken eksiksizliği · kuru koşu.

**`KALDI` sayısı: sıfır.** Ama bu "hepsi geçti" demek değildir: yedi
adaptörde içerik kontrolleri `uygulanamaz` çıkar, çünkü `normalize()`
sözleşme gereği boş döner. Harness uygulanamayan kontrole `gecti` YAZMAZ —
her `—` gerekçelidir.

## 5. Kuru koşu ve eşleme tezgâhı

Kuru koşu çeker, normalleştirir, doğrular, eşleştirmeyi dener ve **hiçbir
şey yazmaz.** Bu bir yorum değil yapısal bir özelliktir: kuru defter `db`yi
hiç içe aktarmaz, ihtiyaç duyduğu tek okuma dışarıdan enjekte edilir.

Ölçüm sayıları değil **tüm satır içeriğini** karşılaştırır; aynı testte
gerçek koşu mutasyon kontrolü olarak farkı gösterir. Kuru koşu connector
satırına dokunmaz: dokunsaydı `sonBasariliKosu` tazelenir ve sağlık ekranı
hiç veri gelmemişken "veri geldi" derdi.

Eşleme profili sürümlüdür. Yayınlanan sürümün kuralları bir daha değişmez;
yeni yayın yeni sürüm açar. Her kaydın kökenine hangi sürümle yorumlandığı
yazılır — yoksa bir denetimde "bu alan neden böyle" sorusunun yanıtı olmaz.

## 6. Hata modeli ve dayanıklılık

- Üstel geri çekilme (1s/4s/16s), yalnız **geçici** hatalar için. Yetki
  hatası tekrar denenmez: aynı sonucu verir ve hesabı kilitletir.
- Hata **sınıflandırılır**: `gecici | yetki | yapilandirma | sir | sozlesme
  | yazma | bilinmeyen`. Tanınmayan hata `bilinmeyen` kalır, `gecici`
  sayılmaz — bilinmeyeni geçici saymak kalıcı arızayı sonsuz denemeye
  çevirirdi.
- **Devre kesici sayar.** Tek hata durdurmaz (kalıcı kesinti olurdu);
  hiç durmamak da yanlıştır (süresi dolmuş kimlikle tekrar tekrar vurmak
  servis hesabını kilitletir). Varsayılan eşik 5.
- `kimlik_bekleniyor` sayacı **artırmaz**: bekleyen kurulum arıza değildir.
- Her koşu bir satır bırakır; **sessiz hata yoktur**. Süreç ölse bile koşu
  `calisiyor` kalmaz.
- İmleç **yalnız başarılı koşuda** ilerler.
- Reddedilen her kayıt ham yüküyle dead-letter'a yazılır.
- **Korelasyon kimliği** koşuyu, dead-letter satırlarını ve denetim izini
  bağlar; koşu satırı hiç açılmayan `atlandi` yolunda bile döner.

## 7. Veri kökeni ve veri kalitesi

Her aktarılan kayıt kaynak bağlamı taşır: kaynak sistem, kaynak kayıt
kimliği, koşu, connector, alınma zamanı, güven etiketi, eşleme profili
sürümü, ham kayıt özeti (SHA-256).

- **Güven `null` = ÖLÇÜLMEDİ**, sıfır güven değil. Kaynak ölçmüyorsa
  uydurulmaz.
- Kaynak bağlamı olmayan kayıt `doğrulanmış` görünemez; kanıt paketinde
  elenmez, `kökeni yok` diye işaretlenir.
- Veri kalitesi motoru artık aktarılan veriyi de denetler: koşu bağlamı
  olmayan doğrulama · susmuş otomatik kaynak (eşik connector'ın kendi poll
  aralığından türetilir) · tek kaynak kaydının iki varlığa yazılması ·
  santrali çözülemeyen keşif kaydı · tıkanmış insan inceleme kuyruğu.
- Bu kurallar bugün **sessizdir** — entegrasyon tabloları boştur — ve
  koşulları testte yapay olarak yaratılarak ölçülmüştür.

## 8. Otomasyon güvenliği

Akış her zaman **Tespit → Korelasyon → ÖNERİ → İNSAN ONAYI**.

Hiçbir motor ya da ekran otomatik olarak yapamaz: yama · firmware
güncelleme · ağ/firewall konfigürasyon değişikliği · PLC/DCS değişikliği ·
agresif aktif tarama · risk kabulü · bulgu kapatma · uygulanabilirlik
override'ı · varlık silme · temel (baseline) kabulü · keşif kaydını CMDB'ye
onaylama · **tedarikçi/uzaktan erişim oturumunu sonlandırma**.

Bu kurallar düzyazı değil, çalışan bir regresyon testidir: otomasyon
güvenliği anlık görüntüsü her yasak eylemi ayrı ayrı ÖLÇER (bir zamanlar
üçü ölçülüyor, sekizi yalnız başlık yorumunda anlatılıyordu).

### Erişim değerlendirme motoru — sınırın örneği

Dokuzuncu motor (`erisim_degerlendirme`) tedarikçi/uzaktan erişim
oturumlarını değerlendirir ve tam olarak bu sınırın nasıl çizildiğini
gösterir:

- **Okur, dokunmaz.** Koşu öncesi ve sonrası `TedarikciErisimOturumu`
  satırları birebir aynıdır; test bunu donduruyor. Motor oturum
  kapatmaz, PAM/VPN'e erişmez, erişim kesmez.
- **Üretebildiği tek şey iş kuyruğudur:** görev, veri kalitesi bulgusu ve
  saklanmayan bir risk/bulgu ADAYI. Kaydı insan açar.
- **`null` ihlal değildir.** `onayli`, `mfaVar`, `izlendi` üç değerlidir;
  `=== false` ihlaldir, `null` "ölçülmedi"dir ve puana hiç katkı vermez —
  ayrı bir sayaca girer ve kendi veri kalitesi bulgusunu üretir.
- **Ölçülmemiş kritiklik "düşük" sayılmaz.** Hedefin kritikliği
  çözülemezse şiddet, `yuksek` ile aynı basamağa yükselir; sıfır vermek
  onu sessizce önemsizleştirirdi.
- **Kaynak susarsa açık kayıtlar çözülmez.** Oturum kaynağı bağlı değilse
  koşu `kaynak_yok` ile kapanır; kaynağın susması ihlalin düzelmesi
  değildir.

## 9. PostgreSQL hazırlığı

**Bugün geçilmedi ve geçilmemeli.** Ayrıntı: `docs/POSTGRES_READINESS.md`.

### Kapatılan iki sessiz engel

Bunlar geçişin ÜRETECEĞİ hatalardı — hata vermeden yanlış davranırlardı ve
göçten sonra düzeltmek, aradaki pencerede bozulan veriyi geriye dönük
ayıklamak demek olurdu.

1. **`LIKE` büyük/küçük harf duyarlılığı.** Bugün "kizildere" → "Kızıldere I
   JES" bulunuyor; PostgreSQL'de aynı arama boş dönerdi. Koşul tek yardımcıya
   indi (`lib/aramaKosulu.ts`), göç günü değişecek satır bir tane ve bir
   bekçi test yeni ham `contains` eklenmesini engelliyor.
2. **Kontrol-sonra-yaz yarışları.** SQLite'ın tek yazıcısı kazara bir kilit
   görevi görüyordu; READ COMMITTED altında görmeyecekti. `docs/POSTGRES_READINESS.md`
   §c'deki P1–P7'nin **tamamı** kapatıldı: koşullu sahiplenme, atomik iş
   kilidi ve bir kısmi tekil indeks.

### Kalan engeller

3. **Sert hata:** denetim izi değişmezliği tetikleyicileri SQLite
   sözdizimi. Karşılıkları yazılı ama PostgreSQL olmadan denenemez
   (§2.5).
4. **En büyük iş kalemi:** test izolasyonu (`tests/sahte/db.ts`) dosya
   kopyasına dayanıyor; bu model PostgreSQL'de var olamaz ve tüm test
   kümesini etkiler.
5. **Sert hata:** provider değişimi mevcut göçlerin tamamını geçersiz
   kılar; tek bir PostgreSQL taban göçüyle değiştirilmeli.
6. **Karar:** altı nullable tekillik kısıtı `NULLS NOT DISTINCT` adayı.

## 10. Performans ve ölçek

Ayrıntı: `docs/PERFORMANS_TABANI.md`. Tüm ölçümler **sentetik** veriyle,
tek istek ve seri; gerçek üretim verisi kullanılmadı, eşzamanlılık
ölçülmedi.

| Ekran / iş | Ölçek | Önce | Sonra |
|---|---|---|---|
| envanter | 347 | 82 ms | 55 ms |
| envanter | 1.347 | **HTTP 500** | 237 ms |
| envanter | 10.347 | **HTTP 500** | 1990 ms |
| ömür | 10.347 | 426 ms · 81 sorgu | 359 ms · 48 sorgu |
| yedekleme | 10.347 | 106 ms · 17 sorgu | 58 ms · 7 sorgu |

Ölçülüp **düzeltilmeyen** iki şey (düzeltmek atomiklik sözleşmesini
değiştirir, ayrı bir karar):
- 10.000 satırlık içe aktarım onayı: **10,9 s**, tek transaction, 30.010
  sorgu. SQLite'ta bu süre boyunca giriş dâhil hiçbir yazma ilerleyemez.
- Envanter 10.347 varlıkta istek başına **178 MB** yığın ister.

## 11. Entegrasyon günü kontrol listesi

Sistem sistem koşu kitabı: **`INTEGRATION_DAY_RUNBOOK.md`**.

Bağlantı gününde her sistem için aynı sıra: connector kaydı (ortam doğru) →
sırrı sağlayıcıya koy, referansı gir → referansı doğrula → uç nokta ve
kapsam → santral kapsam sınırı → bağlantı testi (sahte başarı yok) → **kuru
koşu** → eşleme profilini düzelt → dar kapsamda ilk gerçek koşu → kökeni
doğrula → dead-letter'ı incele → poll aralığını aç.

İzin **istenmeyecek** yetkiler: EDR izolasyon/karantina · tarayıcıda tarama
başlatma · OT'de aktif sorgulama · firewall/ağ yazma · yedek başlatma ve
geri yükleme · SIEM playbook tetikleme · dizin yazma.

## 12. Sonraki tek adım

**İlk gerçek sistem için salt okunur hesabı istemek ve kuru koşuyu yapmak.**

Kod tarafında bağlantı gününü geciktiren bir şey kalmadı: §2.2 boş.
Bekleyen her kalem ya gerçek bir kurum sistemi (§2.4) ya bir üretim
altyapı bileşeni (§2.5) ister; hiçbiri yazılacak kod değildir.

İlk bağlanacak sistem olarak **SIEM** önerilir: keşfin en pasif kaynağıdır
(cihazlar zaten log gönderir, ağa hiçbir paket çıkmaz), OT bölgesinde bile
emniyetlidir ve `manual_import` dışındaki tüm hattı — kimlik, imleç,
eşleme profili, köken, dead-letter, zamanlayıcı — ilk kez gerçek veriyle
sınar. `INTEGRATION_DAY_RUNBOOK.md` §3.4 neyin isteneceğini yazıyor.
