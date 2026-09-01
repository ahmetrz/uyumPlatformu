# Product

<!-- impeccable:product-schema 1 -->

<!-- Bu dosya ürün GERÇEĞİNİ kaydeder; görsel dünya burada yazılmaz (o iş
     DESIGN.md'nindir). Başlıklar impeccable'ın ayrıştırdığı şemadır, İngilizce
     kalır; içerik Türkçedir. Kaynak: 2026-09-01 init görüşmesi (Ahmet) +
     depo kanıtı (README, PRE_INTERNAL_INTEGRATION_READINESS, şema, seed). -->

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

Roller üründe `okuyucu · katkici · denetim_sorumlusu · yonetici` olarak
tanımlıdır ve yetki modül × işlem (okuma/yazma/onay) ile tesis/süreç kapsamı
düzeyinde uygulanır (`lib/erisim.ts`).

## Product Purpose

**Zorlu Enerji Yönetişim Platformu**, Türkiye'de elektrik üretimi yapan bir şirketler
grubu için IT/OT governance, uyum ve dönüşüm platformudur. Grubun santral
portföyünde regülasyon gerekliliklerini (EPDK-SYM, CBDDÖ, ISO 27001, SPK-BS)
tesis bazında uygulanabilir kontrollere indirger; her kontrol için durum,
kanıt, bulgu, aksiyon ve doğrulamayı tek zincirde tutar; bunu varlık
envanteri, risk kütüğü, denetim döngüsü ve projelerle bağlar.

Başarı: bir denetim geldiğinde "hangi santral hangi maddeyi hangi kanıtla
karşılıyor" sorusunun ekrandan, tartışmasız ve tarihçesiyle yanıtlanabilmesi;
gecikmiş ya da değerlendirilmemiş hiçbir şeyin sessizce kaybolmaması.

**Varış noktası (onaylandı):** ürün Zorlu Enerji grubu içinde gerçek
kullanıma girecek ve gerçek kurum sistemlerine bağlanacaktır. Bugünkü
"hiçbir gerçek sisteme bağlı değil" sınırı geçicidir; bir ürün kararı
değildir. Tasarım ve mimari kararlar bu hedefe göre verilir, demo
kolaylığına göre değil.

## Positioning

Sıradan bir GRC aracının doğru söyleyerek kopyalayamayacağı dört mekanizma
(görüşmede dördü de onaylandı):

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

## Operating Context

- **Kullanım sahnesi:** masaüstü, ofis ve santral BT odası. Doğrulama
  kapıları 1440 / 1366 / 1280 px genişlikleri hedefler; santral tarafında
  1366 px dizüstü gerçekçi bir alt sınırdır. Mobil bir hedef değildir.
- **Dil:** yalnız Türkçe. Alan sözlüğü Türkçedir (santral, madde, kanıt,
  bulgu, aksiyon, kütük, tezgâh); arayüzde İngilizce ödünç terim
  kullanılmaz.
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

**Onaylı işlev:** yukarıdaki modüller; 40 ekran, 95 Prisma modeli, 9 API
ucu, 9 otomasyon motoru, 8 connector adaptörü (sayımlar
`web/arac/sayimlar.mjs` ile türetilir, elle yazılmaz). Oturum tabanlı
kimlik doğrulama; RBAC + tesis/süreç kapsamı veri seviyesinde.

**Teknik zemin:** Next.js 16 (App Router) + React 19 + Prisma 7 + SQLite
(Postgres hazırlığı `docs/POSTGRES_READINESS.md`). Sunucu eylemleri.

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

- **Ad:** Zorlu Enerji Yönetişim Platformu. Tek ürün adı budur; kısa ad
  yok. Sekme başlığı (`app/layout.tsx` şablonu), kabuk sözcük markaları
  (`components/kabuk/Kabuk.tsx`: A monogram "ZE", B iki satırlı sözcük
  markası, C künye) ve giriş ekranı bu adı taşır. Karar: Ahmet, 2026-09-01.
- **Kod adları kullanıcıya görünmez:** "Voltaj Atlas" ve "Atlas"
  taşınan tasarımın iç kod adlarıdır; rota grubu `(kabuk)`, `atlas-*`
  sınıfları, `kabuk.css` ve kod yorumlarında kalabilir, ancak arayüz
  metninde, sekme başlığında ve dokümanların ürün adı geçen yerlerinde
  kullanılmaz.
- **Ses:** Türkçe, doğrudan, kurumsal ama kuru değil; ürün kendini
  açıklamaz, olguyu gösterir. Metin durum yargısı vermez ("kritik!" değil,
  "12 gün gecikmiş").
- **Kimlik kısıtı:** grup içi kurumsal araçtır; pazarlama dili, vaat ve
  slogan yoktur. Marka varlığı (logo) depoda yok; yer tutucu üretilmez,
  gelene kadar sözcük markası kullanılır.
- **Fotoğraf politikası:** yalnız fotoğrafı sağlanmış santral görsel alır;
  "yakın" bir santralin fotoğrafı asla ödünç alınmaz. Künye ve lisanslar
  `web/public/gorseller/KUNYE.md`.

## Evidence on Hand

- **Örnek veri:** `web/prisma/seed*.ts` — Zorlu Enerji'nin kamuya açık
  santral portföyü (adlar, tipler, iller) + kurgusal operasyon kayıtları
  (kullanıcılar, bulgular, aksiyonlar, kanıtlar, denetimler). Kurgusal
  kısım gerçek şirket verisi DEĞİLDİR ve öyle sunulmaz.
- **Fotoğraflar:** `web/public/gorseller/` — 7 konu × 2 kırpım, serbest
  lisans, künyeli. Kızıldere fotoğrafı gerçek Zorlu santralidir.
- **Belgeler:** `README.md`, `PRE_INTERNAL_INTEGRATION_READINESS.md`
  (güncel durum, tek kaynak), `INTEGRATION_DAY_RUNBOOK.md`,
  `docs/ICERIK_MODELI.md`, `docs/TASARIM_PLANI.md`,
  `docs/TASARIM_TOKENLARI.md`, `docs/PERFORMANS_TABANI.md`. Tarihsel denetim
  kayıtları: `ARCHITECTURE_GAP_ANALYSIS.md`, `ENTEGRASYON_GAP_MATRIX.md`
  (dondurulmuş, güncellenmez).
- **Doğrulama araçları:** `web/arac/` — rota duman testi, kontrast,
  erişilebilirlik (klavye/odak/ARIA), font kontrolü, tasarım izi tarama,
  yayın kökü kontrolü, statik hidrasyon kontrolü, kolon hizası. 1021 test
  vakası (`npm test`).
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
