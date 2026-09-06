# Product

<!-- Güncel ürün sözleşmesi. Görsel kurallar DESIGN.md'de; ürün davranışı
     kaynak kodu, şema, seed ve yaşayan dokümantasyonla doğrulanır. -->

## Platform

web

## Users

Konsolun önünde her gün oturan dört kullanıcı tipi (görüşmede dördü de
onaylandı; hepsi birincil):

- **Grup merkezinde BT/OT uyum sorumlusu** — portföyün tamamına bakar;
  hangi santralde hangi regülasyon maddesi açık, hangi kanıt eksik, hangi
  termin geçmiş. Haftalık ritmi: uyum süreçlerini ilerletmek, bulguları
  aksiyona bağlamak, denetime hazırlanmak.
- **Santral tarafında BT/OT sorumlusu** — tek bir tesise (bazen birkaçına)
  kısıtlı kapsamla çalışır; kendi santralinin varlıklarını, açık maddelerini,
  kendisine düşen aksiyon ve kanıt taleplerini görür. OT ağı ve saha
  kısıtları onun gerçeğidir.
- **İç denetim / denetim sorumlusu** — denetim yaşam döngüsünü yürütür:
  kapsam, kanıt talebi, bulgu, doğrulama, kapanış. Kanıtın kim tarafından ne
  zaman girildiğini ve değiştirilmediğini görmek ister.
- **Yönetim / yönetici özeti** — santral ve regülasyon bazında "neredeyiz,
  ne gecikti, ne riskli" sorusuna sayısal ve karşılaştırmalı yanıt arar;
  detaya nadiren iner.

Ürünleştirmeyle üç kullanıcı tipi daha eklenir; üçü de bugün **yok**,
paketleriyle gelir:

- **Kiracı yöneticisi** — kiracının kendi kurulumunu yönetir: kullanıcı,
  kimlik sağlayıcı, içerik paketi, bağlayıcı, dil ve para birimi. Kiracı
  verisini görür. (P2 · P6)
- **Ürün yöneticisi (hub)** — kiracı açar, askıya alır, arşivler; içerik
  paketi yayımlar; kullanımı ölçer. Kiracı **verisini görmez**. (P2 · P4)
- **Destek (hub)** — yalnız kiracının süreli ve kapsamlı onayıyla, salt
  okunur ve her okuması denetim izine yazılarak bakar; `DenetciErisimi`
  kalıbının ikizi. (P2)

Roller üründe `okuyucu · katkici · denetim_sorumlusu · yonetici` olarak
tanımlıdır (`lib/sabitler.ts` `ROLLER`) ve yetki modül × işlem
(okuma/yazma/onay) ile tesis/süreç kapsamı düzeyinde uygulanır
(`lib/erisim.ts` izin matrisi). *(Not: izin matrisi bugün bu dörtten
fazla rol anahtarı tanıyor; iki listenin birleştirilmesi P2'nin
işidir — `docs/GELISTIRME_PAKETLERI_DURUM.md` Ç30.)*

## Product Purpose

Ürün (görünen adı `MARKA_AD`'dan gelir — bkz. Brand Commitments),
düzenlemeye tabi, çok tesisli kuruluşlar için BT/OT yönetişim, uyum ve
dönüşüm platformudur. Regülasyon gerekliliklerini tesis
bazında uygulanabilir kontrollere indirger; her kontrol için durum, kanıt,
bulgu, aksiyon ve doğrulamayı tek zincirde tutar; bunu varlık envanteri,
risk kütüğü, denetim döngüsü ve projelerle bağlar. Bugünkü içerik seti
EPDK-SYM, CBDDÖ, ISO 27001 ve SPK-BS çerçevelerini taşır; çerçeveler içerik
paketidir, ürünün kendisi değil.

Başarı: bir denetim geldiğinde "hangi santral hangi maddeyi hangi kanıtla
karşılıyor" sorusunun ekrandan, tartışmasız ve tarihçesiyle yanıtlanabilmesi;
gecikmiş ya da değerlendirilmemiş hiçbir şeyin sessizce kaybolmaması.

**Varış noktası (onaylandı):** ürün kurum içinde gerçek kullanıma girecek
ve gerçek kurum sistemlerine bağlanacaktır. Bugünkü
"hiçbir gerçek sisteme bağlı değil" sınırı geçicidir; bir ürün kararı
değildir. Tasarım ve mimari kararlar bu hedefe göre verilir, demo
kolaylığına göre değil.

## Positioning

Sıradan bir GRC aracının doğru söyleyerek kopyalayamayacağı **beş**
mekanizma (ilk dördü görüşmede onaylandı; beşincisi ürünleştirme
kararıyla geldi — `docs/URUN_VIZYONU.md` §5):

1. **BT ve OT tek kapsam ağacında.** `Grup → Tüzel Kişi → Santral → Ünite →
   Sistem/Servis → Varlık` zinciri ofis BT'sini ve santral OT'sini aynı
   modelde tutar; uyum durumu bu ağaçtan yukarı toplanır.
2. **Kanıt zinciri ve değişmez denetim izi.** `Kontrol → Uygulanabilirlik →
   Değerlendirme → Kanıt → Bulgu → Risk → CAPA → Proje → Doğrulama →
   Kapanış` uçtan uca bağlıdır; denetim izi tabloları veritabanı
   tetikleyicileriyle değiştirilemez.
3. **Regülasyon sürüm ve fark motoru.** Bir çerçevenin yeni sürümü geldiğinde
   madde bazında fark çıkar ve etkilenen değerlendirmeler işaretlenir
   (`FrameworkSurumu`, `SurumFarki`).
4. **Bilinmeyeni sıfır saymaz.** Değerlendirilmemiş kontrol "uyumlu" ya da
   "uyumsuz" değil, açıkça `Değerlendirilmedi`'dir ve toplamlarda ayrı bir
   dilim olarak taşınır. Bağlanmamış bir kaynak "başarılı" değil,
   `kimlik_bekleniyor`'dur.
5. **OT gerçekleri uyum kaydına bağlanır.** Pasif keşif, topoloji sapması,
   yedek ve geri yükleme testi, tedarikçi uzaktan erişim oturumu,
   firmware/EOL — hepsi bir kontrolün kanıtına bağlanır; OT ağına paket
   gönderilmez. Kurumsal GRC bu katmanı tanımaz, OT güvenlik ürünleri de
   uyum yaşam döngüsü sunmaz.

Ve iki dağıtım ilkesi: **veri kiracıda kalır** (kurum içi ya da kiracının
seçtiği bölgede bulut) ve **motor önerir, insan karar verir** (yapay zekâ
dâhil).

## Operating Context

- **Kullanım sahnesi:** masaüstü, ofis ve santral BT odası. Doğrulama
  kapıları 1440 / 1366 / 1280 px genişlikleri hedefler; santral tarafında
  1366 px dizüstü gerçekçi bir alt sınırdır. Mobil bir hedef değildir.
- **Dil:** çok dilli, **Türkçe birinci dil**. Bugün arayüz yalnız
  Türkçedir; mesaj kataloğu ve `t()` katmanı P3'te gelir (TR birinci,
  EN ikinci). Alan sözlüğü Türkçedir (madde, kanıt, bulgu, aksiyon,
  kütük, tezgâh); arayüzde İngilizce ödünç terim kullanılmaz. Sektöre
  bağlı terimler ("santral", "ünite", "MWe") P1'de sektör sözlüğüne
  taşınır; çekirdek "tesis / birim / öznitelik" der.
- **Ritimler:** uyum süreçleri (çerçeve × yıl), denetim dönemleri, termin
  takibi (gün çözünürlüğünde), haftalık erişim incelemesi, yedekleme koşusu
  ve geri yükleme testi kayıtları, tedarikçi uzaktan erişim oturumları.
- **Belgeler ve malzeme:** regülasyon metinleri madde madde; Excel ile
  varlık envanteri içe aktarımı; kanıt dosyaları (politika, prosedür, log,
  ekran görüntüsü, rapor); denetimde "kanıt paketi" dışa aktarımı.
- **Yanındaki araçlar (bağlanacak):** AD / Entra ID, EDR, zafiyet
  tarayıcı, SIEM, yedekleme platformu, güvenlik duvarı, OT keşif ürünü,
  PAM / VPN / tedarikçi oturum sistemleri. Bugün adaptör iskeletleri var,
  bağlantı yok (bkz. kısıtlar).
- **Modüller:** Santral 360, uyum süreçleri, bulgular, risk kütüğü, denetim
  yaşam döngüsü, IT/OT envanteri (CMDB), keşif kuyruğu, ağ topolojisi
  sapma tezgâhı, olay → etki zinciri, yedek & DR, tedarikçi uzaktan erişimi,
  görev & onay merkezi, projeler + adaylar, regülasyon sürüm/diff motoru,
  otomasyon motorları + platform sağlığı, kanıt paketi dışa aktarımı,
  değişmez denetim izi.

## Capabilities and Constraints

**Onaylı işlev:** yukarıdaki modüller. Güncel kaynak ölçümleri
`web/arac/sayimlar.mjs` ile türetilir; dokümana elle sayaç yazılmaz.
Oturum tabanlı kimlik doğrulama; RBAC + tesis/süreç kapsamı veri seviyesinde.

**Teknik zemin:** Next.js 16 (App Router) + React 19 + Prisma 7 + SQLite.
Yazma işlemleri sunucu eylemlerinden geçer.

**Kalıcı kısıtlar — gelecek işin koruması gereken:**

- **Gerçek kurum sistemine bağlanma yasağı (geçici ama bugün bağlayıcı):**
  AD / Entra ID, EDR, zafiyet tarayıcı, SIEM, yedekleme, güvenlik duvarı /
  ağ cihazı, OT keşif, PAM / VPN / tedarikçi oturumu, herhangi bir kurum içi
  API, gerçek üretim OT ağı. Bunlara erişilmez.
- **Uydurma yok:** gerçek endpoint, credential, token, şirket içi veri
  depoya girmez. Seed'deki iç adresler `<<KURULUMDA-DOLDURULACAK>>` yer
  tutucusudur; kamuya açık vendor uç noktaları belgelenmiş sabittir.
- **Sahte başarı yok:** bağlanmamış adaptör `kimlik_bekleniyor` döner,
  çekirdek onu koşturmaz; "entegrasyon çalışıyor" izlenimi veren hiçbir
  ekran ya da veri üretilmez.
- **İki dağıtım biçimi tek koddan:** gerçek dağıtım (yazma açık) ve statik
  demo (`NEXT_PUBLIC_DEMO=1`, GitHub Pages, `/uyumPlatformu` kökü, yazma
  işlemleri demo uyarısı verir). Statik yayında HTML derleme anında donar;
  istemci tarafında saat/rastgelelik hidrasyon ayrışması üretir — "an"
  tek kaynaktan gelir (`lib/an.ts`).
- **Terminoloji:** durum işaretçileri `ok · md · bd · pl · unk · tamam`
  (uyumlu · kısmi · uyumsuz · planlı · değerlendirilmedi · kapanmış).
  Kütük satırlarında durum sözcüğü yazılmaz, işaretçi taşır; sözcük yalnız
  panel/çekmece içinde kullanılır.
- **Termin matematiği gün çözünürlüğündedir** ve sunucu ile istemcide aynı
  sonucu vermek zorundadır.

**Açıkça karara bağlanmamış:** bağlantı gününün tarihi ve sırası
(`INTEGRATION_DAY_RUNBOOK.md` sırayı tarif eder, tarih yok); Postgres'e geçiş
zamanı; mobil/tablet kullanım (hedef değil, reddedilmiş de değil).

## Brand Commitments

- **Ad yapılandırmadan gelir.** Tek kaynak `web/lib/marka.ts`:
  `MARKA_AD` (ürün) ve `KIRACI_AD` (kurulum). İkisi de
  `NEXT_PUBLIC_MARKA_AD` / `NEXT_PUBLIC_KIRACI_AD` ile ezilir. Sekme
  başlığı (`app/layout.tsx`), kabuk sözcük markası
  (`components/kabuk/Kabuk.tsx`: kiracı adı + ürün adı), sistem sayfası
  künyesi, giriş ekranı, hata ekranı, dış API sözleşmesi ve ayak künyesi
  varsayılanı **hepsi** oradan okur (P0 · URN-KUR-004). Ölçüm
  davranışsaldır: `npm run marka:kapi` nöbetçi bir adla derleyip üretilen
  çıktıya bakar; `tests/marka-adi.test.ts` ise belge başlıklarının
  varsayılandan sapmadığını tutar. Bugünkü değer
  geçici ve tanımlayıcıdır: sektör taşımaz, marka değildir. `Regula` iç
  çalışma adıdır ve arayüzde kullanılmaz (`docs/URUN_VIZYONU.md` §10).
  Karar: ürün sahibi, 2026-09-01; ad 2026-09-06'da sektörsüz hâle
  getirildi, aynı gün yapılandırmaya taşındı.
- **Kod adları kullanıcıya görünmez:** "Voltaj Atlas" ve "Atlas"
  taşınan tasarımın iç kod adlarıdır; rota grubu `(kabuk)`, `atlas-*`
  sınıfları, `kabuk.css` ve kod yorumlarında kalabilir, ancak arayüz
  metninde, sekme başlığında ve dokümanların ürün adı geçen yerlerinde
  kullanılmaz.
- **Tek tema, koyu:** Üç kabuk (A tezgâh, B saha, C defter) de koyu zemin
  taşır; C'nin prototipteki açık kâğıt zemini üründe yoktur. Kabuklar
  arası geçiş "başka bir platform" hissi vermemelidir — ayrışma zemin
  sıcaklığı ve tipografiyle kurulur, açık/koyu kontrastıyla değil.
  Karar: ürün sahibi, 2026-09-01. Ölçüm kapısı `arac/kontrast.mjs`.
- **Ses:** Türkçe, doğrudan, kurumsal ama kuru değil; ürün kendini
  açıklamaz, olguyu gösterir. Metin durum yargısı vermez ("kritik!" değil,
  "12 gün gecikmiş").
- **Kimlik kısıtı:** ürün içi metin olgu dilidir; pazarlama dili, vaat ve
  slogan yoktur. Pazarlama/ürün sitesi bu depoda **yoktur**. Marka varlığı (logo) depoda yok; yer tutucu üretilmez,
  gelene kadar sözcük markası kullanılır.
- **Fotoğraf politikası:** yalnız görseli sağlanmış tesis görsel alır;
  "yakın" bir tesisin görseli asla ödünç alınmaz. Gerçek bir tesisin
  fotoğrafı depoya girmez. Künye ve lisanslar
  `web/public/santraller/KUNYE.md` (tesis seti) ve
  `web/public/gorseller/KUNYE.md` (giriş ve saha görselleri).

## Evidence on Hand

- **Örnek veri:** `web/prisma/seed*.ts` — kurgusal demo kiracısı: tesis
  portföyü (adlar, tipler, iller) ve operasyon kayıtları (kullanıcılar,
  bulgular, aksiyonlar, kanıtlar, denetimler). Tamamı kurgudur, gerçek
  şirket verisi DEĞİLDİR ve öyle sunulmaz.
- **Görseller:** `web/public/gorseller/` — 3 dosya (giriş hero'su + iki
  saha arka planı), tamamı ürün sahibinin sağladığı üretilmiş (AI)
  görsel, üçüncü taraf atıf yükümlülüğü yok; künyesi
  `web/public/gorseller/KUNYE.md`. Tesis görsel seti ayrıdır:
  `web/public/santraller/`, künyesi `web/public/santraller/KUNYE.md`.
  Gerçek bir tesisin fotoğrafı depoda yoktur.
- **Belgeler:** kök `README.md`, `INTEGRATION_DAY_RUNBOOK.md`,
  `docs/MIMARI.md`, `docs/ICERIK_MODELI.md`, `docs/ROTA_HARITASI.md`,
  `docs/VERI_NEREDEN_GELIR.md` ve `docs/URUN_YEDEKLEME.md`.
- **Doğrulama araçları:** `web/arac/` — rota, erişilebilirlik, tasarım,
  yayın, veri ve kalite kontrolleri. Testlerin güncel sonucu `npm test`
  ve CI kapılarından alınır.
- **Canlı demo:** https://ahmetrz.github.io/uyumPlatformu/ (statik anlık
  görüntü; gerçek dağıtımı temsil etmez).

**Elde OLMAYAN ve uydurulmayacak olan:** müşteri referansı, kullanıcı
alıntısı, vaka çalışması, basın, kıyaslama sayısı, fiyat/lisans, gerçek
entegrasyon koşusu sonucu, gerçek denetim raporu, logo.

## Product Principles

1. **Olgu, yargı değil.** Ekran gecikme gününü, kanıt tarihini, doğrulayanı
   gösterir; "iyi/kötü" demez. Yorum kullanıcının işidir.
2. **Bilinmeyen görünür kalır.** Değerlendirilmemiş, bağlanmamış,
   kanıtsız olan her şey kendi adıyla ve kendi diliminde durur; hiçbir
   toplam onu yutmaz.
3. **Zincir kopmaz.** Her bulgu bir maddeye, her aksiyon bir bulguya, her
   kapanış bir doğrulamaya bağlıdır; bağsız kayıt üretilmez, ekran bağı
   gizlemez.
4. **Santral tarafı da birinci sınıf.** Kapsamı dar kullanıcı, merkezdeki
   kadar eksiksiz ve hızlı bir ekran görür; 1366 px'te hiçbir bilgi
   "sonra" değildir.
5. **Sahte ilerleme yok.** Demo, yer tutucu ve bağlanmamış kaynak açıkça
   etiketlenir. Çalışıyor gibi görünen ama hiçbir şey kanıtlamayan yüzey
   üretilmez.

## Accessibility & Inclusion

- Belirli bir yasal standart şartı görüşmede kurulmadı; ürün pratiği
  **klavye erişimi, görünür odak, ARIA adları, metin kontrastı** kapılarını
  otomatik koşturur (`arac/erisim.mjs`, `arac/kontrast.mjs`) ve kırmızıda
  yayın durur.
- Durum yalnız renkle taşınmaz: işaretçilerin erişilebilir adı vardır,
  segmentler `aria-label` ile sayısal okunur.
- Türkçe yerel ayar (tarih, sayı, büyük/küçük harf `İ/ı`) zorunludur.
- Yönetici özeti okuyucusu için sayılar tek başına anlamlı olmalı; renk
  körlüğü için işaretçi biçimi + ad ayrımı korunur.
