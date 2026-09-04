# Müşteri değerlendirmesi — "Kısmen" kalan dört maddenin durumu

Müşteri karşılaştırma matrisinde **Zorlu Enerji Yönetişim Platformu**
sütununda "Kısmen" işaretlenmiş dört madde bu turda ele alındı. Belge her
maddenin bugünkü gerçeğini **dosya kanıtıyla** yazar.

Ölçüm tarihi: 04.09.2026 · Dal: `feature/customer-partial-to-complete`

---

## 0. Bu belgenin kuralı

**Sahte tamamlanmışlık yasaktır.** Bir madde ancak repo içinde
yapılabilecek her şey bittiğinde ve ekranda gerçekten çalıştığında
"Evet" yazılır. Gerçek bir kurum sistemi gerektiren kısım varsa o kısım
ayrıca ve açıkça yazılır — gizlenmez, "yakında" denmez.

| Durum | Anlamı |
| --- | --- |
| **Evet** | Ürün bunu bugün, kurulumdan sonra ek geliştirme olmadan yapar. |
| **Evet · kaynak bekliyor** | Ürün tarafı bitti; kurumun kendi sisteminden veri akmaya başlayınca çalışır. Bağlantı bir **kurulum** işidir, geliştirme işi değil. |
| Kısmen | Ürün tarafında eksik iş var. |

---

## 1. Özet

| # | Madde | Önce | Şimdi |
| --- | --- | --- | --- |
| 1 | Excel / CSV içe-dışa aktarım | Kısmen | **Evet** |
| 2 | Varlık zimmeti · kabul / red akışı | Kısmen | **Evet** |
| 3 | İşletim sistemi · yama · firmware güncelliği | Kısmen | **Evet · kaynak bekliyor** |
| 4 | Bilinmeyen / sahipsiz cihaz keşfi | Kısmen | **Evet · kaynak bekliyor** |

Üçüncü ve dördüncü maddede "kaynak bekliyor", ürünün eksik olduğu
anlamına gelmez: ikisi de kurumun **kendi** sistemlerinden (uç nokta
yönetimi, SIEM, ağ izleme, OT keşif platformu) beslenir ve o sistemler
bağlanana kadar ekran dürüst davranır — "canlı" demez, "kaynak bağlı
değil" der.

---

## 2. Madde 1 · Excel / CSV içe-dışa aktarım — **Evet**

**Müşterinin sorusu:** Listeleri Excel'e ve CSV'ye alabiliyor muyum?
Türkçe karakterler bozuluyor mu? Dosya güvenli mi?

**Ürün ne yapıyor:** Sekiz ekranda (envanter, keşif, bulgular, aktivite,
denetimler, kontroller, raporlar, platform sağlığı) hem **Excel** hem
**CSV** düğmesi var. Dosya, ekranda o an görünen **süzülmüş ve
sıralanmış** listeyi taşır: dışa aktarılan liste ile bakılan liste
ayrışırsa dosyayı açan kişi başka bir gerçeği okur.

Envanter dosyası 47 sütun taşır: künye, santral/ünite/sistem, ağ bölgesi
ve segment, üretici/model/seri no, IP·IPv6·MAC, işletim sistemi ve
sürümü, firmware, kritiklik, sahip, ekip, yaşam döngüsü, EOL/EOS,
garanti·bakım·destek bitişleri, yama ve firmware durumu, EDR/log/izleme/
yedekleme kapsamaları, internet maruziyeti, son görülme, veri kaynağı,
sahada görülen OS/yama/firmware, duruş kaynağı ve son ölçüm tarihi,
koruma açığı, bilinmeyen alanlar.

**Türkçe karakter:** Dosyanın başına UTF-8 BOM yazılır ve içerik tipi
`text/csv;charset=utf-8` olarak bildirilir. Excel'in Türkçe kurulumları
BOM'suz dosyayı yanlış kod sayfasıyla açar ve "ş" ile "ı" bozulur; BOM
bunu kapatır.

**Ayraç ve kaçış:** Ayraç noktalı virgüldür (Türkçe Excel'in beklediği).
İçinde ayraç, tırnak ya da satır sonu geçen her hücre tırnaklanır, hücre
içindeki tırnak ikilenir. Satır sonu CRLF'tir; Excel, LibreOffice ve
Numbers üçü de aynı dosyayı aynı şekilde okur.

**Formül enjeksiyonu:** `=`, `+`, `-`, `@`, sekme ve satır başı ile
BAŞLAYAN hücrelerin önüne tek tırnak konur. Bu, bir hücreye yazılmış
`=cmd|...` gibi bir metnin, dosyayı açan kişinin makinesinde formül
olarak çalışmasını engeller. Sayı gibi görünen değerler (`-12`, `+3,5`)
kalkandan muaftır — onlar gerçekten sayıdır ve metne çevrilirse tablo
bozulur.

**Dosya adı:** Ada tarih-saat damgası eklenir ve ad, harf/rakam dışındaki
her şeyden temizlenir; dizin geçişi (`../`) içeren bir ad üretilemez.

**Kapsam:** Dosya, kullanıcının **görmeye yetkili olduğu** kayıtları
taşır. Santral kapsamı ekrandan önce sorguda uygulanır; dışa aktarım o
kümenin dışına çıkamaz.

| Kanıt | Yer |
| --- | --- |
| CSV üretimi ve kalkanlar | `web/lib/disaAktarim/csv.ts` |
| İndirme katmanı | `web/components/disaAktar.ts` |
| Envanter sütunları | `web/app/(kabuk)/(operasyonel)/envanter/mantik.ts` |
| Test | `web/tests/disa-aktarim-csv.test.ts` — 41 vaka |

Testler: Türkçe karakter, noktalı virgül, virgül, tırnak, satır sonu,
formül enjeksiyonu, boş/`null` hücre, 10.000 kayıt, süzülmüş dışa
aktarım, kapsam sızıntısı.

---

## 3. Madde 2 · Varlık zimmeti — **Evet**

**Müşterinin sorusu:** Bir cihazı birine zimmetleyebiliyor muyum? Kişi
kabul ediyor mu, reddedebiliyor mu?

**Önceki durum:** Varlığın bir "sahip" alanı vardı ve yönetici oraya bir
isim yazıyordu. Bu bir zimmet değil bir **alan doldurmaktı**: denetimde
"bu cihazı kim üstlendi" sorusunun cevabı, kimsenin onaylamadığı bir
isimdi.

**Şimdi:** Atama bir **talep** açar; sahiplik ancak kişi **kabul edince**
geçer. On dört kural üründe çalışıyor:

1. Atama doğrudan sahiplik değiştirmez, talep açar.
2. Kişi kendi bekleyen taleplerini "Bana Atanan Varlıklar" ekranında görür.
3. Kabul ve red kişinin kendi eylemidir.
4. Red **gerekçe ister** — gerekçesiz red, kapatılmış bir kusurdan ayırt edilemezdi.
5. Kabulde sahiplik kesinleşir.
6. Redde sahiplik önceki sahibine döner; dönecek aktif kimse yoksa varlık sahipsiz kalır ve **veri kalitesi bulgusu** açılır.
7. Atayan kişi, atadığı kişi adına **kabul edemez**.
8. Yönetici yalnız **iptal** edebilir; kimse adına kabul edemez.
9. Bir varlık için aynı anda **tek** aktif talep olur.
10. Kullanıcı pasifleştirilirse bekleyen talebi düşer.
11. Sahip dışarıdan değişirse bekleyen talep iptal olur.
12. Süre dolunca talep `süresi doldu` olur — **kimse adına kabul edilmez** ve varlığın sahibi değişmez.
13. Süresi yaklaşan ve geçen talepler için görev ve bildirim üretilir.
14. Her geçiş ayrı bir denetim kaydı yazar.

**Tek aktif talep kuralı iki katmanda tutulur:** uygulama kapısı ve
veritabanı düzeyinde kısmi tekil indeks. Test, uygulama kapısını atlayıp
doğrudan veritabanına yazmayı dener ve veritabanının reddettiğini
gösterir.

| Kanıt | Yer |
| --- | --- |
| Kurallar (saf) | `web/lib/varlik/zimmet.ts` |
| Sunucu eylemleri | `web/lib/eylemler2/zimmet.ts` |
| Süre motoru | `web/lib/motorlar/zimmetSuresi.ts` |
| Kişinin ekranı | `web/app/(kabuk)/(operasyonel)/zimmetlerim/` |
| Envanter · sahiplik | `web/app/(kabuk)/(operasyonel)/envanter/Yonetisim.tsx` |
| Toplu zimmet | `web/app/(kabuk)/(operasyonel)/yetkiler/Formlar.tsx` |
| Veritabanı kısıtı | `web/prisma/migrations/20260904084500_faz_h_tek_aktif_atama/` |
| Test | `web/tests/zimmet.test.ts` (37) · `web/tests/zimmet-eylem.test.ts` (23) |

Testler: kendi adına sahtecilik, başkası adına cevap, kapsam dışı varlık,
yinelenen aktif talep, pasif kullanıcı, sahip değişimi, red, kabul, süre
dolması, denetim izi, eşzamanlılık.

**Konsol:** Cevap süresi yönetim konsolundan ayarlanır (1–90 gün). Tavan
koda gömülüdür: sonsuza kadar bekleyen bir zimmet, zimmet değildir.

---

## 4. Madde 3 · OS / yama / firmware güncelliği — **Evet · kaynak bekliyor**

**Müşterinin sorusu:** Bir cihazın işletim sistemi, yaması ve firmware'i
güncel mi? Bunu nereden biliyorum?

**Ürün ne yapıyor:** Varlık çekmecesinde **Canlı duruş** bölümü, dört
alanın (işletim sistemi, OS sürümü/yapısı, yama seviyesi, firmware) her
biri için beş şeyi yan yana yazar:

- **sahada görülen** değer — bir kaynak sistemin bildirdiği ölçüm,
- **envanter kaydı** — bir insanın girdiği değer,
- **veri kaynağı** — bunu hangi sistemin söylediği,
- **son veri** — ölçümün ne kadar eski olduğu,
- **durum** — canlı · güncel · bayat · kaynak bağlı değil · hata · ölçülmedi.

İkisi çeliştiğinde ekran **söyler** ve ürün envanteri kendiliğinden
değiştirmez: hangisinin doğru olduğuna insan karar verir. İki kaynak
aynı alan için farklı şey söylerse **en yeni ölçüm** kazanır ve diğerleri
gizlenmez, altında listelenir.

**"Canlı" sözcüğü bir iddiadır ve yalnız üç koşul birlikte sağlanınca
yazılır:** kaynak gerçekten bağlı, son koşusu başarılı, veri kaynağın
**kendi sorgu aralığı** içinde gelmiş. Eşik sabit bir dakika değildir —
beş dakikada bir sorgulanan bir uç nokta ürünü ile günde bir koşan bir
tarayıcı aynı ölçüye vurulamaz. Yalnız elle beslenen bir kaynak ne kadar
yeni olursa olsun canlı sayılmaz: bir dosya yüklemesi bir akış değildir.

Kaynak bağlı değilken ekran **"KAYNAK BAĞLI DEĞİL"** yazar ve değerlerin
elle girildiğini söyler. Bu bir kusur işareti değil, bir kurulum
adımıdır ve kırmızı gösterilmez.

**Bugünkü sınır — dürüst hâli:** Kurumun uç nokta yönetimi, CMDB'si,
zafiyet tarayıcısı ya da OT keşif platformu **bağlı değil**. Ürün tarafı
hazır: gözlem tablosu, alım ucu (`POST /api/v1/asset-state`), tazelik
hesabı, çakışma çözümü ve ekran çalışıyor. Kurumun sistemi bağlandığı
gün bu bölüm kendiliğinden dolar; ek geliştirme gerekmez.

Geç gelen bir paket, daha yeni bir ölçümü **geri almaz**: kaynağın
ölçtüğü an mevcut kayıttakinden eskiyse yazma atlanır ve cevapta ayrıca
sayılır — sessizce düşseydi gönderen taraf verinin işlendiğini sanırdı.

| Kanıt | Yer |
| --- | --- |
| Tazelik ve çakışma (saf) | `web/lib/varlik/canliDurus.ts` |
| Gözlem tablosu | `web/prisma/schema.prisma` → `VarlikDurusGozlemi` |
| Alım ucu | `web/lib/api/uclar/durusGozlemleri.ts` |
| Ekran | `web/app/(kabuk)/(operasyonel)/envanter/Durus.tsx` |
| Test | `web/tests/canli-durus.test.ts` (33) · `web/tests/api.test.ts` (8 duruş vakası) |

**Konsol:** Canlı ve güncel eşikleri (poll aralığının katı olarak) ve
çakışmada berabere bozan kaynak sırası ayarlanabilir. **"Canlı yalnız
bağlı kaynakta yazılır"** kuralı panelden gevşetilemez.

---

## 5. Madde 4 · Bilinmeyen / sahipsiz cihaz keşfi — **Evet · kaynak bekliyor**

**Müşterinin sorusu:** Ağımda envanterde olmayan ya da sahibi belli
olmayan cihaz var mı?

### 5.1 Önce güvenlik: ürün ağa paket ATMAZ

Bu üründe **port taraması, SNMP deneme-yanılması, Modbus ya da başka bir
OT protokol sorgusu, PLC yoklaması ve aktif keşif paketi YOKTUR** — ve
bu bir yapılandırma seçeneği de değildir.

Gerekçe teknik değil **emniyettir**: bir OT ağında beklenmeyen bir paket,
eski bir kontrolörün haberleşme yığınını kilitleyebilir ve bunun bedeli
bir üretim durması, en kötü hâlde bir emniyet olayıdır. Bir envanter
aracının bu riski alması savunulamaz.

Bir kurum aktif tarama istiyorsa bunu **kendi** tarama ürünüyle, kendi
değişiklik yönetimiyle yapar; bu ürün o çıktıyı **okur**.

Yapılmayan işlemler gerekçeleriyle ürünün kendi ekranında yazar:
Varlık keşfi › **"Bu ürün ağa paket ATMAZ"**.

### 5.2 Nereden besleniyor

Kurumun **zaten çalışan** gözlem kaynaklarının çıktısından: SIEM / log
toplama, ağ izleme ve akış telemetrisi, güvenlik duvarı oturum kayıtları,
switch MAC/CAM tablosu, ARP gözlemleri, DHCP kiraları, ağ erişim kontrolü
(NAC), uç nokta koruma/yönetim ajanı, OT pasif keşif platformu, SNMP salt
okunur çıktı, historian, SCADA envanter dışa aktarımı, tedarikçi cihaz
listesi, elle yüklenen tablo.

Kütükte **hiçbir ürün ya da satıcı adı geçmez**: kurum hangi ürünü
kullanıyorsa çıktısı ilgili **kategoriye** bağlanır. Her kategorinin ne
verdiği ve ürünün onunla ne **yapmadığı** ayrıca yazılıdır.

### 5.3 Eşleştirme — IP tek başına kimlik değildir

Sıra: seri numarası → varlık etiketi → MAC adresi → hostname (+ üretici/
model destekleyici). **IP tek başına eşleşme kurmaz**: DHCP adresi gezer,
iki hafta önce bir kontrolörün olan adres bugün bir dizüstünde olabilir.
Her eşleşme bir **güven skoru** taşır; hesaplanamadıysa "ölçülmedi" yazar,
sıfır yazmaz.

### 5.4 Yedi grup

Ekran bütün gözlemleri yedi kovaya ayırır ve sayar:

| Grup | Ne demek |
| --- | --- |
| **Kimlik çakışması** | Kaydın kimlik alanları birden çok varlığa uyuyor; otomatik çözülmez. |
| **Yetkisiz / tanınmayan** | Cihazın ağda olması gerektiğine dair karar yok ya da "yetkisiz" kararı verilmiş. |
| **Envanterde yok** | Gözlemde var, envanterde karşılığı bulunamadı. |
| **Envanterde var, SAHİBİ YOK** | Kaydı var ama sorumlusu yok — hesap verebilirlik zinciri burada kopar. |
| **Artık görülmüyor** | Eşiği aşan süredir hiçbir kaynakta görülmedi. Kayıt **silinmez**. |
| **Yeri çözülemedi** | Hangi santrale ait olduğu bilinmiyor; **gizlenmez**. |
| **Envanterde var, sahibi belli** | Yapılacak bir şey yok. |

Gruplar **dışlayıcıdır** ve sayıları toplama eşittir. Bir kayıt birden
çok tarife uyduğunda **önce yapılacak iş** kazanır; sıra kodda sabittir
ve panelden değiştirilemez — aynı kuyruğa bakan iki kişi aynı önceliği
görmelidir.

Özet **santral bazında** süzülür ve **Excel + CSV** olarak dışa aktarılır.

### 5.5 Sahiplik boşluğu veri kalitesine bağlı

Bir gözlem kaynağının sahada gördüğü, envanterde karşılığı olan ama
sorumlusu olmayan her varlık için veri kalitesi motoru bulgu açar
(`sahipsiz_gorulen_varlik`). Bulgu **varlık başınadır**: aynı cihazı beş
kaynak görünce beş bulgu açılsaydı kuyruk gürültüye boğulurdu.

### 5.6 Keşfedilen cihaz kendiliğinden envantere GİRMEZ

Akış beş adımdır: **Tespit → Eşleştirme → Öneri → İnsan onayı →
Envanter** (ekle · mevcut kayda bağla · gerekçeyle yoksay). En yüksek
güvenli eşleşme bile doğrudan yazılmaz. Yanlış eşleşen bir kayıt sessizce
yazılsaydı envanter düzelmez, **kirlenirdi**.

**Bugünkü sınır — dürüst hâli:** Yukarıdaki kaynakların hiçbiri bağlı
değil. Ürün tarafı hazır ve elle yüklenen bir dışa aktarımla bugün
çalışır; bir kaynak bağlandığı gün akış kendiliğinden dolar.

| Kanıt | Yer |
| --- | --- |
| Kaynak kütüğü · yedi grup · yasak listesi | `web/lib/varlik/pasifKesif.ts` |
| Eşleştirme ve güven | `web/lib/entegrasyon/kesif.ts` |
| Ekran | `web/app/(kabuk)/(operasyonel)/kesif/` |
| Sahiplik boşluğu kuralı | `web/lib/motorlar/veriKalitesi.ts` |
| Test | `web/tests/pasif-kesif.test.ts` (30) · `web/tests/veri-kalitesi-aktarim.test.ts` |

**Konsol:** "Görülmüyor" eşiği (1–365 gün) ayarlanabilir. Grup sırası ve
**aktif tarama yasağı** panelden değiştirilemez.

---

## 6. Kapı sonuçları (04.09.2026)

| Kapı | Sonuç |
| --- | --- |
| `npm run test` | **2746 geçti · 1 atlandı · 0 kusur** (127 dosya) |
| `npx tsc --noEmit` · `npm run lint` | temiz |
| `npm run build` | başarılı |
| `demo:build` (statik demo) | başarılı · 3853 varlık başvurusu doğrulandı |
| `rota:duman` | **58/58 rota** · kusurlu 0 · sayfa hatası 0 |
| `tasarim:axe` (WCAG 2 A/AA) | 50 rota · ciddi/kritik ihlal **0** |
| `tasarim:tasma` | 98 ölçüm · 2 bant × 49 rota · **0 kusur** |
| `tasarim:dizustu` (1366×768) | 49 rota · kırpılan öğe **0** |
| `tasarim:kapi` | kontrast kusuru 0 · eksik font 0 · eski tasarım izi 0 |
| Göç doğrulaması | 147 tablo · 6 tetikleyici · yabancı anahtar temiz · yeni üç göçte **0 DROP** |

Kapı çıktıları **olduğu gibi** yazıldı; hedefe uydurulmadı.

---

## 7. Kuruma bağlanınca ne olacak

Üçüncü ve dördüncü maddenin "kaynak bekliyor" kısmı için kurumdan
istenecekler `INTEGRATION_DAY_RUNBOOK.md` ve ürünün kendi ekranında
(`/saglik` › Kurulum hazırlığı › Bağlantı ihtiyacı) yazılıdır. Özetle:

- **Canlı duruş için:** uç nokta yönetimi / CMDB / zafiyet tarayıcısı /
  OT keşif platformundan **salt okunur** bir okuma yolu ve o kaynağın
  sorgu aralığı. Ürün bu kaynakların hiçbirine yazmaz.
- **Pasif keşif için:** yukarıdaki gözlem kaynaklarından en az birinin
  dışa aktarımı ya da salt okunur akışı. Ürün hiçbirine sorgu üretmez.

Hiçbiri gelmeden de ürün çalışır ve **yalan söylemez**: bağlı olmayan
alan "kaynak bağlı değil" der, ölçülmemiş değer "ölçülmedi" der, sıfır
yazılmaz.
