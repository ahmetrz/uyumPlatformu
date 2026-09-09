# Geliştirme Paketleri — Ürünleştirme ve Pazar Kıyası Yol Haritası

**Tarih:** 5 Eylül 2026 · **Kaynak:** "Yönetişim Platformu Pazar Kıyası" çalışması
(98 GRC / OT ürünü, Türk enerji mevzuatı) + `main` dalının kod düzeyinde
incelemesi + **ürünleştirme kararı** (5 Eylül 2026: platform sektör ve ülke
bağımsız hâle getirilip ürünleştirilecek; `docs/URUN_VIZYONU.md`) ·
**Kapsam:** `ahmetrz/uyumPlatformu`

Bu belge Claude Code'un **iş listesidir**. Her paket tek başına bir PR
olacak büyüklükte yazıldı; kabul kriterleri testle ölçülebilir cümlelerdir.
Belge, `CLAUDE.md` ve `web/AGENTS.md`'deki bağlayıcı kuralların **üstüne**
gelir, onları gevşetmez.

> **Bu belgenin okunma sırası:** `docs/URUN_VIZYONU.md` → §0 (ek kurallar)
> → §1 (paket şablonu) → çalışılacak paketin bölümü → §7 (bağımlılık
> sırası) → §8 (kararlar defteri). Bir paketi okumadan önce §0 mutlaka
> okunur.
>
> **Paket aileleri:** `P` paketleri (Dalga 0) ürünleştirme temelidir —
> çok kiracılılık, sektör-bağımsız model, çoklu dil, içerik paketleri,
> kimlik, dağıtım. `R` paketleri (Dalga 1–3) pazar kıyasından gelen
> özelliklerdir ve Dalga 0 üzerine kurulur; her `R` paketinde
> "Ürünleştirme notu" o özelliğin kiracı/paket/dil boyutunu söyler.

---

## 0. Bu belgeye özgü ek kurallar

`CLAUDE.md`'deki kurallar (Türkçe; gerçek kurum sistemine bağlanma yasağı;
uydurma yok; koyu tema; bilinmeyen ≠ sıfır; PR ile değişiklik; dosyayı
değiştirmeden önce oku; zorunlu UX skill seti) aynen geçerlidir. Bu
paketler için **dört ek kural** vardır:

### 0.1 İçerik uydurulmaz — regülasyon metni ürünle GELMEZ

EPDK Yetkinlik Modeli ekleri, BİG Rehberi tedbirleri, ISO/IEC 27001
kontrol metinleri, SPK tebliğ maddeleri **koddan ya da hafızadan
yazılmaz.** Bu metinler yalnız:

- kurumun `belge/mevzuat/` altına koyduğu resmî kaynak dosyalarından
  (PDF/XLSX/CSV) **içe aktarılır**, ya da
- kurum kullanıcısı tarafından `/ice-aktarim` ekranından girilir.

Kaynak dosya yoksa paket **içe aktarım şablonunu ve doldurma rehberini
üretir ve durur**; "temsilî" madde metni yazmaz. Örnek veri (`seed*.ts`)
bugünkü küçük katalogla kalır ve **örnek veri olduğu belgelenir**.

ISO/IEC 27001 metni lisanslıdır: ürüne yalnız kontrol **kimliği**
(A.5.1…A.8.34) ve **kısa başlık** girilir; metin alanı boş kalır ve ekran
"metin lisans nedeniyle girilmedi" der. EPDK, BİGR, SPK, KVKK metinleri
kamuya açıktır ve tam girilebilir.

### 0.2 Kamuya açık resmî kaynaklar: belgelenmiş sabit, kapalı gelen anahtar

"Gerçek kurum sistemine bağlanılmaz" kuralı **kurumun kendi** sistemleri
içindir (AD, SIEM, PAM…). Resmî Gazete, EPDK, Siber Güvenlik Başkanlığı,
KVKK, SPK, EPİAŞ, USOM, CISA, NVD gibi **kamuya açık resmî kaynaklar**
**kamuya açık vendor uç noktası** sınıfındadır: kimlik gerektirmeyen,
herkese açık uç nokta; **adresi belgelenmiş sabit olarak koda
girebilir.** Şu şartlarla:

1. Her kaynak `etkin = false` ile gelir; yalnız `yonetici` açar.
2. Kaynağa gitmek için ortam değişkeni (`MEVZUAT_RADARI=1` vb.) **ve**
   kaynağın etkin olması ikisi birden gerekir; statik demo derlemesinde
   hiçbir kaynağa gidilmez.
3. `robots.txt` okunur ve **uygulanır**: izin vermeyen kaynak
   `robots_engelli` durumuna düşer ve elle yol açık kalır. Anti-bot
   yanıtı (HTTP 418/403) veren kaynak **atlatılmaz**; tarayıcı
   otomasyonu, kimlik taklidi, oran sınırı zorlaması **yapılmaz**.
4. Kaynak başına günde en fazla **1** istek; `User-Agent` ürün adını ve
   iletişim adresi yer tutucusunu (`<<KURULUMDA-DOLDURULACAK>>`) taşır.
5. Testler ağa **çıkmaz**; her kaynak için fikstür (`tests/fixture/`)
   kullanılır. Ağ çağrısı yapan test kırmızıdır.
6. Alınan içerik saklanır (özet + metin parçası); ürün asla "değişiklik
   yok" **yargısı** yazmaz — "son tarama: <tarih>, fark bulunmadı" yazar.

### 0.3 "Bağlı değil" semantiği her yeni sağlayıcıda korunur

Yeni eklenen her sağlayıcı (SMTP, Teams, RFC 3161 zaman damgası, S3
deposu, LLM, EPİAŞ fiyat, USOM API) mevcut kayıt defteri kalıbını izler:
`bagli: false` ile gelir; **neyin gerektiğini** (`gereken`) ve **bağlı
değilken ne olduğunu** (`bagliDegilkenDavranis`) yazılı taşır; bağlı
değilken sessizce süreç-içi bir yedeğe **düşmez**; ekran "bağlı değil"
der, "çalışıyor" izlenimi vermez. Sır **değeri** hiçbir yerde saklanmaz,
yalnız `sirReferansi` (`env:` · `dosya:` · `vault:`).

### 0.4 Motor önerir, insan karar verir — yeni motorlar dâhil

Bu paketlerle eklenen her motor (`mevzuat_radari`, `kural_analizi`,
`oneri_uretici`…) `lib/motorlar/kayit.ts` defterine girer ve otomasyon
güvenliği anlık görüntüsüne **yasak eylem** ekler. Hiçbir motor:
regülasyon sürümünü aktifleştirmez, değerlendirme durumunu değiştirmez,
bildirim **göndermez** (bildirim kanalı hariç — o da yalnız kullanıcıya
mesaj taşır, mercie değil), sapmayı kabul etmez, eşlemeyi yayınlamaz,
kanıtı "yeterli" işaretlemez. Hepsi **aday/öneri** üretir; kaydı insan
açar, denetim izine gerekçesiyle yazılır.


### 0.5 Sektör ve ülke bağımsızlık — çekirdek hiçbir şey bilmez

Çekirdek kod (şema, motorlar, eylemler, ekranlar) **hiçbir** sektör
terimi ("santral", "MWe", "hasta"), ülke adresi, para birimi, mevzuat
adı ya da dil sabiti taşımaz. Bunların hepsi üç yerden gelir: **içerik
paketi** (çerçeve, yükümlülük, kaynak kataloğu, form, sözlük — P4),
**kiracı yapılandırması** (dil, para birimi, saat dilimi, marka adı —
P2) ve **sektör öznitelik şeması** (P1). Bir özelliğin çekirdeğe sektör
terimi sokması gerekiyorsa tasarım yanlıştır; terim sözlük anahtarına,
nitelik öznitelik şemasına gider. Bekçi testler bunu ölçer
(`tests/bekci/`). **Kalıcı kural (B2, 8 Eylül 2026):** sektöre özgü hiçbir
alan çekirdek KOLONU olmaz; paketin beyan ettiği ÖZNİTELİKTİR
(`SektorOznitelikSemasi`: tip · rol · grup · seçenek) — bekçi
`tests/bekci/sema-sektorsuz.test.ts`. Uyum zincirinin öznesi `Tesis` değil
`KapsamOgesi`dir (B1); omurga tablosu doğrudan `tesisId` taşımaz — bekçi
`tests/bekci/kapsam-omurga.test.ts`. Demo Enerji **referans kiracı**dır; adı ve verisi
yalnız kendi kurulumunda bulunur, depoda yalnız kurgusal demo kiracısı
vardır (P8).

---

## 1. Paket şablonu ve durum sözlüğü

Her paket aynı başlıkları taşır:

| Başlık | Anlamı |
|---|---|
| **Bugün** | Kodda ne var, dosya yollarıyla. Belgeden değil koddan. |
| **Hedef** | Paket bitince kullanıcı ne yapabilir (tek cümle). |
| **Kapsam** | Veri modeli · motor/eylem/API · ekran · dışa aktarım · belge. Model ve alan adları öneridir; mevcut adlandırma diliyle (Türkçe, camelCase) çelişirse depo kazanır. |
| **Kapsam dışı** | Bilerek yapılmayanlar. Paketi büyütmek isteyen her fikir buraya yazılır, yapılmaz. |
| **Kabul kriterleri** | Numaralı, testle ölçülebilir cümleler. Her biri en az bir `it('… [KOD-ALT-NNN]')` testine bağlanır. |
| **Testler** | Yeni test dosyaları; negatif testler; sabotaj kapısına eklenecek kural. |
| **Belgeler** | Güncellenecek belgeler. `npx tsx arac/senaryo-belge.mjs --yaz` her pakette koşar. `node arac/sayimlar.mjs` sayıları basar ama **belgeye yazmaz** — `--yaz` bayrağı bugün yok (R0-7); sayı taşıyan belge satırları o kalem kapanana kadar elle güncellenir ve PR'da komut çıktısıyla gösterilir. |
| **Kararlar** | Açık soru + bu belgenin **varsayılan** cevabı. Kullanıcı değiştirmezse varsayılan uygulanır. |

**Etki / çaba etiketleri** pazar kıyası çalışmasından gelir; süre
tahmini **yoktur** ve yazılmaz.

**Senaryo kimliği** kalıbı mevcut kütükle aynıdır: `ALAN-ALT-NNN`
(ör. `MEV-RAD-001`). Yeni alan kodları bu belgede paket başlığında
verilir; `lib/senaryo/` altındaki kütüğe eklenir, `ters:kapsam` ve
`senaryo-kutugu` testleri yeşil kalır.

**Her yeni `lib/eylemler2/<modül>.ts` için `<modül>.demo.ts` eşlikçisi
zorunludur** (statik demoda yazma kapalı). Her yeni API ucu
`route.api.ts` adıyla açılır (`route.ts` değil — demo derlemesine
girmemesi için). Her yeni ekran `docs/ROTA_HARITASI.md`'ye ve
`arac/rotalar.json`'a eklenir; kabuk yönü `components/kabuk/yonler.ts`
ile kararlaştırılır.

---

## 1.1 Bugünkü durum — ölçüldü (9 Eylül 2026)

Aşağıdaki satırlar **koddan** ölçülmüştür; her biri hangi commit ya da
PR ile kapandığını söyler. Bu tablo yol haritasının tek "biten" beyanıdır:
paket başlıklarındaki "Bugün" paragrafları ayrıntıyı taşır.

| Paket | Durum | Kanıt (kod) | Kapanış |
| --- | --- | --- | --- |
| **P0 · Kurgu ve ad** | **bitti** | ürün adı tek kaynak `web/lib/marka.ts`; marka kapısı `web/arac/marka-kapisi.mjs` CI'da bloklayıcı | `14f27fc` → `a640c0f` |
| **P1 · Sektörsüz alan modeli ve terim sözlüğü** | **bitti** | `web/lib/dil/` (terim katmanı, `SozlukSaglayici`), `SektorSozlugu`, öznitelik satırı (`TesisOzellik`); sektör terimi bekçisi cırcırlı | `a640c0f` · PR #40 (`bdbd808` NULL sınıfı) |
| **B1+B2 · Kapsam öğesi ve öznitelik şeması** | **bitti** | `KapsamOgesi` + `KapsamOgesiTuru`, `SektorOznitelikSemasi`; bekçiler `sema-sektorsuz` · `kapsam-omurga`; enerji–su parite kanıtı `docs/kanit/faz-b-k4/` | `141bf99` · PR #38 · #39 |
| **P4 · İçerik paketi mimarisi** | **bitti** | `web/lib/paket/` (biçim · doğrulayıcı · kurucu · OSCAL), `/paketler` ekranı, `IcerikPaketi*` katalogları, beş paket dizini | `98b50c6` → `c31ee45` · PR #41 · #43 |
| **P8 · Demo verisi** | **bitti (kurgusal ad kısmı)** | tohum paketlerden kurulur (`DEMO-TR-ORTAK · DEMO-TR-ENERJI · DEMO-TR-SU`); kurgusal ad bekçisi `prisma/kurgusal-adlar.ts` | `a100df8` (kurgusal ad) · `16d20fd` (paket biçimi) |
| **Kapı altyapısı** | **bitti ve büyüyor** | 20 kapı (PR kapısından türetilir, `npm run kapi:parti`), 60 araç betiği, göç zinciri kapısı (`kapi:goc-zinciri`) | `5928944` · PR #43 |
| **TR-ENERJI içeriği** | **bitti (0.3.0)** — yönetmelik + YEDİ ekin tamamı tam metin: 8 çerçeve · 3 803 madde (88 aile + 3 691 kontrol + 23 yönetmelik satırı) · metni girilmemiş kontrol 0 | `web/paketler/TR-ENERJI` | `9535808` · PR #43 · ek aktarımı bu dal |

Ölçüm tabanı (aynı gün): **3 467 test vakası · 189 dosya · 319 senaryo ·
GAP 0 · 51 göç · şema farkı 0 · 157 model · 20 kapı**.

**Kardeş belgelerdeki bayat sayılar (9 Eyl 2026'da ölçüldü, düzeltilecek):**
`docs/GELISTIRME_PAKETLERI_DURUM.md` 139 dosya · 2 903 vaka · 273 senaryo
der (bugün 189 · 3 467 · 319) ve "33 göç" der (bugün 51);
`docs/POSTGRES_READINESS.md` "dört tetikleyici" der (bugün 6) ve altı
nullable tekillik sayar (bugün 8), `schema.prisma` satır atıflarının
**altısı da** kaymış (B1 sonrası `Yetki` kısıtı `tesisId` değil
`kapsamOgesiId`). Bu iki belge kendi paketlerinde (R5 · kalite) tazelenir;
yol haritası onların sayısını **tekrar etmez**.

**Bitmemiş olanın adı burada geçmez.** Kalan iş §7'de üç kümede durur:
İÇERİK · TESLİM · SATIŞ.

---

## 2. Dalga 0 — Ürünleştirme temeli (sektör ve ülke bağımsızlık)

Amaç: ürünü tek kurumdan çok kiracılı, tek sektörden sözlük/paket
tabanlı, tek dilden çok dilli hâle getirmek. Bu dalga bitmeden Dalga
1–3'teki hiçbir özellik "ürün özelliği" değildir — kurum içi özelliktir.

**v1 kararı (8 Eylül 2026): kapsam TÜRKİYE + ÇOK SEKTÖR.** Ülke boyutu
paket formatında kalır (`manifest.ulke`), ama v1'de yalnız TR paketleri
yazılır; konumlandırma "GRC platformu" değil, mevzuatın adıyladır
(`docs/URUN_VIZYONU.md` §5, `docs/TR_SEKTOR_PAKETLERI.md`).

**KALAN (v1 yolu) — 9 Eylül 2026'da yeniden kümelendi.** P0 · P1 ·
B1/B2 · P4 · P8 **bitti** (ölçüm ve commit'ler §1.1). Kalan iş artık
dalga sırasıyla değil, ilk müşteriye göre üç kümede durur — **A İÇERİK ·
B TESLİM · C SATIŞ** (§7); asgari kesişim
`docs/ILK_MUSTERI_ASGARI_KUME.md`. Bu paragrafın eski sırası (§7 sonunda
kayıt için duruyor) bitmiş işleri taşıdığı için yanıltıcıydı.

**ERTELENEN (v1 dışı) — tek satır gerekçeyle:**

| Kalem | Gerekçe |
| --- | --- |
| **P3 · Çoklu dil** | v1 yalnız Türkiye; ikinci dili isteyen kiracı yok ve mesaj kataloğu 263+ dosyaya dokunur — ihtiyaç doğmadan ödenmez. Yeni metin sözlük anahtarıyla yazılmaya devam eder (kural değişmedi). |
| **EU/US içerik paketleri** (EU-NIS2, DORA, US eyalet yasaları…) | Paket formatı ülke boyutunu KORUR; içerik yazılmaz — konumlandırma TR mevzuatının adıyladır ve kaynak erişimi/doğrulama TR için kuruldu. K21'deki "ilk TR dışı ülke paketi = EU-NIS2" varsayılanı bu satırla askıya alındı. |
| **P2'nin SaaS tarafı** (hub yayın kanalı, çok kiracılı bulut, RLS'nin bulut tarafı) | v1 dağıtımı on-prem/tek kiracı (K19 zaten on-prem önce); `Kiraci` modeli ve izolasyon P2'de kalır ama hub/SaaS parçası ilk SaaS müşterisi olmadan yazılmaz. |

Eski sıra (kayıt için): P0 → (R5 + P2) → P1 → P4 → P8 → P3 → P6 → P7 →
P9. R5 (PostgreSQL) P2 ile birlikte çalışır çünkü kiracı izolasyonunun
ikinci savunması satır düzeyi güvenliktir (RLS) — bu bağ değişmedi,
yalnız v1'in kritik yolundan çıktı.

Demo Enerji bu dalga boyunca **referans kiracı**dır: gerçek kurulumu
ayrı; depoda yalnız kurgusal demo kiracısı kalır.

### P0 · Kurgu güncellemesi — vizyon, kurallar, ad

**Alan kodu:** `URN-KUR` · **Etki:** ön koşul · **Çaba:** düşük (belge)

**Bugün.** *(6 Eylül 2026'da koda karşı doğrulandı —
`docs/GELISTIRME_PAKETLERI_DURUM.md` §5.1.)* `CLAUDE.md`: tek ürün adı
"Uyum ve Yönetişim Platformu" (ad sekiz kod dosyasında düz metin); yalnız
Türkçe; santral fotoğraf politikası. "Grup içi kurumsal araç, pazarlama
dili yok" cümlesi `CLAUDE.md`'de **değil**, `web/PRODUCT.md`'dedir.
`CLAUDE.md`'nin "Nereye bakılır" tablosu var olmayan **13** belgeye
yönlendirir. Seed portföyü **kurgusaldır** (gerçek adlar 6 Eylül'de
çıkarıldı); gerçek tesis fotoğrafı da aynı gün depodan çıkarıldı.

**Hedef.** Belgeler yeni kurguyu anlatır; hangi kuralın kaldığı, hangisinin
değiştiği tek tabloda; ürün adı yapılandırmadan gelir.

**Kapsam.**
- `docs/URUN_VIZYONU.md` depoya alınır (bu paketle birlikte verilen
  taslak); `web/PRODUCT.md` ona göre yeniden yazılır (Users: +kiracı
  yöneticisi, +ürün yöneticisi, +destek; Positioning: beş mekanizma
  sektör-nötr; Brand: ad yapılandırmadan).
- `CLAUDE.md` revizyonu — **kalan** kurallar aynen; **değişen**: ürün adı
  → `MARKA_AD` (görünen ad "Uyum ve Yönetişim Platformu"; `Regula` iç
  çalışma adıdır ve arayüzde geçmez, `URUN_VIZYONU.md` §10. Ad koda
  **gömülmez**; her görünen yer tek kaynaktan okur), dil → çok dilli/TR
  birinci, fotoğraf politikası → gerçek tesis fotoğrafı depoya girmez,
  "kurum" → "müşteri/kiracı". Ayrıca "Nereye bakılır" tablosundaki ölü
  atıflar temizlenir (URN-KUR-003).
- `web/DESIGN.md`: sözcük markasının nereden geldiği yazılır
  (`lib/marka.ts`); koyu tema kalır. *(Not: paketin ilk yazımındaki "`ZE`
  monogram" örneği yanlıştı — üründe öyle bir monogram yok; kabuk sözcük
  markası iki satırdır: kiracı adı + ürün adı.)*
- `docs/TERIMLER_SOZLUGU.md` **P1'e bırakıldı**: terim sözlüğü katmanı
  (`lib/dil/terimler.ts`) orada kurulur; belgeyi ondan önce yazmak
  kodsuz bir sözlük üretirdi. `CLAUDE.md`'nin ona yönlendiren satırı
  P1'e kadar tablodan çıkar.
- `README.md` giriş paragrafları. *(`.github` altında bugün şablon yok,
  yalnız iki iş akışı var; şablon üretmek bu paketin işi değildir.)*
- Depo adı/klasörü değişmez (bu pakette); ad kararı sonrası ayrı küçük PR.

**Kapsam dışı.** Pazarlama metni; logo; sektör terimlerinin
temizliği (P1'e — ürün adı bu paketin işidir, alan sözlüğü değil).

> **Kapsam düzeltmesi (6 Eylül 2026).** Bu paket başlangıçta "kod
> değişikliği yok" kısıtıyla yazılmıştı. Kısıt **kaldırıldı**, kriter
> korundu. Gerekçe: URN-KUR-004 ürün adının tek yerden gelmesini
> istiyor; ad ise bugün sekiz kod dosyasında düz metin duruyor
> (`app/layout.tsx`, `app/global-error.tsx`, `app/(giris)/giris/page.tsx`,
> `components/kabuk/Kabuk.tsx`, `components/kabuk/SistemSayfasi.tsx`,
> `components/kabuk/kabukVerisi.ts`, `lib/api/sozlesme.ts`,
> `lib/yapilandirma/tanimlar.ts`). Koda dokunmadan kriter
> sağlanamıyordu; iki cümle birbirini iptal ediyordu. Kriteri düşürmek
> yerine kısıt düzeltildi — ad değişiminin tek satır olması bu ürünün
> temel bir gereğidir (`URUN_VIZYONU.md` §10).

**Kabul kriterleri.**
1. `CLAUDE.md` "Bağlayıcı kurallar" bölümü **kalan** ve **değişen**
   ayrımıyla yazılıdır; "yalnız Türkçe" ve tek/gömülü ürün adı cümleleri
   kalkmıştır. [URN-KUR-001]
2. `web/PRODUCT.md` yeni kurguyu anlatır: kullanıcı tipleri arasında
   **kiracı yöneticisi**, **ürün yöneticisi** ve **destek** vardır;
   konumlandırma **beş** mekanizma sayar (dört değil); ürün adı düz metin
   olarak geçmez, `MARKA_AD`'a atıf yapar. [URN-KUR-002]
3. `docs/URUN_VIZYONU.md` depodadır ve `CLAUDE.md`'nin "Nereye bakılır"
   tablosundaki **her** hedef diskte vardır — ölü atıf sayısı sıfırdır.
   [URN-KUR-003]
4. Ürün adı **tek bir yerden** gelir: `web/lib/marka.ts`. Ölçüm
   **davranışsaldır**, kaynak taraması değil (`npm run marka:kapi`):
   nöbetçi bir adla statik demo derlemesi koşulur ve üretilen çıktıya
   bakılır. (a) `marka.ts` varsayılanı işlenmiş hiçbir yüzeyde (HTML,
   RSC yükü, CSS, manifest) geçmez; JS demeti **taranmaz** — oradaki
   varsayılan yedeğin kendisidir, sızıntı değil; (b) nöbetçi ad, görünmesi gereken yüzeylerde
   geçer (kök ve giriş sekme başlıkları, kabuk sözcük markası ve onun
   erişilebilir adı). Ayrıca `web/DESIGN.md` ve `README.md` başlıkları
   varsayılandan sapmaz (`tests/marka-adi.test.ts`). Ad değişimi tek
   satırdır. [URN-KUR-004]

   > *Neden kaynak taraması değil:* ilk hâli adı kaynak ağacında dizge
   > olarak arıyordu. 6 Eylül 2026'da ölçüldü — ad Türkçe bir sözcük
   > olduğunda ("Kayda") dört dosyada yanlış alarm veriyor: bir düğme
   > metni, üç yorum. Yanlış güven veren ölçüm silindi.
   > `URUN_VIZYONU.md` §10'a da bir ad seçim ölçütü eklendi.

**Kararlar.** *Ürün adı.* Görünen ad **"Uyum ve Yönetişim Platformu"**;
geçici ve TANIMLAYICI bir addır, marka değildir, sektör sözcüğü
içermez. `Regula` **iç çalışma adıdır** ve arayüzde, sitede, dış
iletişimde kullanılmaz (`URUN_VIZYONU.md` §10: domain, marka başvurusu,
logo yasak). Ad `MARKA_AD` yapılandırmasından okunur
(`NEXT_PUBLIC_MARKA_AD`, varsayılanı `web/lib/marka.ts`); değiştirmek
tek satırdır ve bu bir kabul kriteridir (URN-KUR-004). Kalıcı ad sonra
verilecek — bu pakette domain, marka başvurusu, logo işi **yoktur**.
*Kiracı adı.* Kabuk sözcük markasının ilk satırı `KIRACI_AD`'dan gelir;
P2 bunu `Kiraci.markaAd` alanına taşır.

---

### P1 · Sektör-bağımsız alan modeli ve terminoloji sözlüğü

**Alan kodu:** `URN-ALN` · **Etki:** en yüksek (ürün) · **Çaba:** yüksek
(mekanik, geniş) · **Bağımlılık:** P0

**Bugün.** `Sektor`, `TesisTipi`, `Tesis` (`kuruluGucMw`), `TesisProfili`,
`UretimUnitesi` (`kuruluGucMw`); `UygulanabilirlikKurali.kosulJson`
`kuruluGucMw` gibi sabit alan adlarına bakar; UI metinlerinde "santral",
"ünite", "MWe"; tesis tipi kodları seed'de **`JEO` · `RES` · `HES` ·
`GES` · `DGKC` · `MERKEZ`** (sunum katmanı ayrıca `TERMIK` tanır — `JES`
diye bir tip kodu **yoktur**, yalnız tesis adlarının ekidir);
"Enerji portföyü" ve "Santral haritası" ekran adları. *("Santral 360"
bugün render edilen bir başlık değildir; yalnız yorumlarda ve `/sistem`
demo şeridinde geçer — `docs/GELISTIRME_PAKETLERI_DURUM.md` §5.1.)*

**Hedef.** Çekirdek şema ve UI hiçbir sektör terimi taşımaz; sektöre özgü
nitelikler (kurulu güç, kapasite, yatak sayısı…) öznitelik şemasından
gelir; ekran metinleri terim sözlüğünden; enerji kiracısı "santral / MWe"
görür, su kiracısı "tesis / m³/gün".

**Kapsam.**
- *Model:* `UretimUnitesi` → `OperasyonelBirim` (tablo yeniden
  adlandırma migration'ı; ilişkiler ve indeksler taşınır);
  `Tesis.kuruluGucMw` ve `OperasyonelBirim.kuruluGucMw` → `TesisOzellik` /
  `BirimOzellik` (anahtar, sayısal/metin değer, birim, kaynak, ölçüm
  zamanı; **null = ölçülmedi**); `SektorOznitelikSemasi` (sektör paketinden:
  anahtar, etiket sözlük anahtarı, tip, birim, zorunlu mu, kapsam
  kuralında kullanılabilir mi). Geçiş göçü mevcut `kuruluGucMw` değerlerini
  `kuruluGucMw` anahtarıyla özniteliğe taşır; veri kaybı yok (test).
- *Uygulanabilirlik:* `kosulJson.alan` artık öznitelik anahtarıdır;
  değerlendirici öznitelik yoksa **`bilinmiyor`** döner ("kapsam dışı"
  değil) — mevcut "bilinmeyen ≠ sıfır" kuralı; `UygulanabilirlikKarari`
  buna göre `uygulanabilir: Boolean?`.
- *Terim sözlüğü:* `lib/dil/terimler.ts` — çekirdek anahtarlar (`tesis`,
  `birim`, `sistem`, `varlik`, `portfoy`, `tesis360`…) ve varsayılan TR
  etiketler; `SektorSozlugu` modeli (sektör paketi × anahtar × dil ×
  etiket, tekil/çoğul/iyelik biçimleri — Türkçe ekler için `{tesis}in`
  değil, biçim alanları); `t(anahtar, bicim)` yardımcısı sunucu ve
  istemcide aynı sonucu verir (hidrasyon). Kiracının sektörü yoksa çekirdek
  etiket.
- *UI temizliği:* tüm sabit "santral/ünite/MWe/JES/RES/HES" metinleri
  sözlük anahtarına; ekran adları (`Tesis 360`, `Portföy`); harita
  "tesis haritası"; kapsam ağacı etiketleri; CSV/XLSX başlıkları; kanıt
  paketi alan adları (şema sürümü artar).
- *Bekçi test:* `tests/bekci/sektor-terimi.test.ts` — **kuruldu (7 Eyl
  2026), CIRCIR (ratchet) biçiminde.** `app/`, `components/`, `lib/`
  altındaki `.ts` · `.tsx` · `.css` dosyalarının HAM METNİNİ ve DOSYA
  ADINI tarar: `santral · ünite · MW/MWe/MWp · JES/JEO/RES/HES/GES/DGKÇ/
  TERMİK · türbin · jeotermal/rüzgâr/hidroelektrik · plant`.

  > **Tarife düzeltmesi.** Bu satır önce "JSX/metin literalinde" diyordu.
  > Öyle bir tarama `type Santral`, `santraller: Santral[]`, `santralId`,
  > `Plant360Veri` gibi **406 tanımlayıcı eşleşmesini** görmez ve paketin
  > iddiasını boşa çıkarırdı (`docs/GELISTIRME_PAKETLERI_DURUM.md` §4.4).
  > Tarama artık ham metin üstündedir: literal, tanımlayıcı, yorum, CSS
  > sınıfı ve dosya adı dâhil.

  İstisna listesi ayrı bir dosyadadır — `tests/bekci/sektor-terimi-izin.json`
  — ve **borç kütüğüdür**: kapı kurulduğu gün kirli sayılan **258 dosya**.
  *(Bunların dördü aslında temizdi: `\b` ASCII tanımlı olduğu için
  `\bRES\b` kalıbı "SÜRESİ" içinde eşleşiyordu. Sınır Unicode harflerine
  çevrildi ve o dört dosya düştü — Aşama E · aile 1.)*

  > **Türkçe iki tuzak taşır.** (1) `\b` ASCII tanımlıdır: hem Türkçe
  > sözcüğün ORTASINDA eşleşir (`RES` ⊂ "SÜRESİ") hem de sonu Türkçe
  > harfle biten kodu HİÇ görmez (`DGKÇ`). (2) Tek büyük-harf katlaması
  > her iki yönde de kördür: `ÜNİTE` yalnız `tr-TR` katlamasında,
  > `TERMIK` yalnız değişmez katlamada görünür. Arama bu yüzden **iki
  > küçültmenin birleşimi** üzerinde yapılır. Altı yazım kalıcı vaka
  > olarak `tests/bekci/katlama-korlugu.test.ts` içinde tutulur
  > (URN-ALN-007): her biri için "düzeltme öncesi 0, sonrası 1" iddiası
  > vardır, böylece katlama mantığı sadeleştirilirse körlük sessizce geri
  > gelemez.
  Kural: **listeye dosya EKLENMEZ, yalnız çıkarılır.** Bekçi dört yönlü
  ölçer: (a) listede olmayan dosyada terim → kırmızı, (b) listedeki
  dosyada terim kalmamış → kırmızı (listeden düşür), (c) liste `tavan`ı
  (258) aşamaz, (d) liste **taban daldaki** (`origin/main`) listenin ALT
  KÜMESİ olmalı — eklenen yol adıyla söylenir.

  > **(d) neden ayrı bir diş.** (c) tek başına sayıyı sabit tutar ama
  > **takası** görmez: bir dosyayı temizleyip yerine yenisini listeye
  > koymak sayıyı değiştirmez. Denendi (7 Eyl 2026): listedeki bir dosya
  > gerçekten temizlenip çıkarıldı, yerine yeni ve kirli bir dosya
  > eklendi, sayı 258'de kaldı — (a), (b), (c) yeşil kaldı, **yalnız (d)**
  > kırmızı verdi.
  >
  > **Atlama yolu ortama göre ayrık.** *Yerelde* taban dal okunamıyorsa
  > (sığ klon, `origin` yok) diş **koşmaz**, raporda **atlanmış** görünür
  > ve gerekçesi yazılır; "geçti" yazılmaz. *CI'da* aynı şey
  > **KIRMIZIDIR**: orada taban dalın okunamamasının meşru sebebi yok, iş
  > akışı onu ayrı bir adımda getiriyor. "Ölçülmedi" demek, cırcırın
  > sessizce kapanması olurdu — üstelik o adım `continue-on-error`
  > taşıdığı için boru hattı yeşil kalırdı.
  >
  > Ayrı tutulan tek hâl: **taban dal listeyi henüz taşımıyorsa**
  > (cırcırın kurulduğu birleştirme) karşılaştırılacak önceki hâl yoktur;
  > diş her ortamda atlanır. Kalıcı bir kaçış yolu değildir — listeyi
  > taban daldan silmek için önce çalışma ağacından silmek gerekir, o
  > durumda bekçi baştan çöker.

  `arac/sabotaj.mjs` kapının gerçekten ısırdığını ölçer (25. sabotaj:
  listede olmayan dosyaya terim). (d) git geçmişine baktığı için kaynak
  dosyası bozarak sabote edilemez; elle doğrulaması yukarıdadır.

  Kapsam dışı bırakılan iki terim, gerekçesiyle izin dosyasının
  başlığında yazılıdır: `üretim` (Türkçede genel eylem — yanlış pozitif
  üretir) ve `enerji` (kurulum adı yapılandırmadan gelir).
- *Tip kimlik renkleri:* CSS jetonları üretim tipi kısaltmalarını taşıyordu
  (dört jeton, 12 geçiş, 3 dosya). P1'de **sektörsüz yuvalara** çevrildi:
  `--tip-a` … `--tip-d`. Kapasite dörttür ve bir sınırdır; yuvası olmayan
  tip **nötr mürekkebe** düşer, yuva **sarılmaz** — aynı rengi iki tipe
  vermek "bunlar aynı" demek olurdu ve renk burada kimliktir. Kural sessiz
  değil: `/sistem` sayfası hangi kodun yuvası olduğunu veriden okuyup
  yazar (bugün 6 tip · 4 yuvalı · 2 renksiz).

  Renksiz kalanlar **iki ayrı cümlede** yazılır, çünkü sebepleri aynı
  değil ve tek listede göstermek bakan kişiye iki eksik gösterirdi —
  oysa biri eksik değil: `DGKC` **yuvasız (kapasite eksiği)**, üretim
  tipi olduğu için kimlik rengini hak ediyor ama yuva kalmadı; `MERKEZ`
  **kimlik rengi taşımayan (tasarım gereği)**, üretim tesisi olmadığı
  için yuva açılsa da renk almaz. `tipYuvasi()` ikisine de `null` döner
  ve doğru davranır; ayrım sunumdadır.
  Kontrast kapısı yuvalar üzerinde koştu: dördü de IRI 3:1 eşiğinin
  üstünde (en düşük 4,62:1, dört zemin).

  Tip kodu → yuva eşlemesi GEÇİCİDİR ve `components/kabuk/tip.ts` içinde
  tek bir tablodadır; **kalıcı yeri sektör paketidir (P4)**. P1'de oraya
  konmadı: paket biçimi henüz yok, şimdi tasarlanırsa iki kez tasarlanır.
  Tablo `lib/` yerine `components/`te, çünkü yeni bir `lib/` dosyası enerji
  kodları taşıyacağı için bekçinin izin listesine EKLENMESİ gerekirdi;
  cırcırın tek kuralı listeye ekleme yapılmamasıdır.
- *Enerji sözlüğü:* ilk sektör paketi `SEKTOR-ENERJI-URETIM` (P4 paket
  biçimiyle): öznitelik şeması (`kuruluGucMw`, `uretimTipi`,
  `sebekeBaglantisi`…), sözlük (santral, üretim ünitesi…), tesis tipleri
  (`JEO` · `RES` · `HES` · `GES` · `DGKC` · `MERKEZ`; sunumda `TERMIK`). İkinci sözlük **iskeleti** (su/atıksu ya da
  kullanıcının seçtiği sektör) yalnız anahtar listesiyle.

- *Düzen kapıları İKİ SÖZLÜKLE koşar (Aşama E · aile başına):* bir yüzey
  ailesi sözlüğe geçtiğinde render edilen metin değişir; elle tıklayıp
  bakmak değerli ama **taşmayı gözle değil ölçerek** görüyoruz. Üstelik
  bugüne kadarki bütün düzen ölçümleri referans kiracının **kısa**
  sözlüğüyle yapıldı ("santral", 7 harf); ikinci sözlük bileşik gövde
  kullanır ("arıtma tesisi", 13 harf) ve aynı yerde ~%60 daha fazla yer
  ister. Yani düzeni iki sözlüğün KOLAYINA karşı doğruluyorduk. Uzun
  sözlükte taşan bir düzen **bugün kusurludur**; kısa sözlükle yeşil
  görünmesi kusuru düzeltmez, ikinci kiracıya erteler.

  `npm run kapi:iki-sozluk -- --rota=…` üç düzen kapısını (`yatay-tasma` ·
  `dizustu` · `erisim-axe`) her sözlük için ayrı koşar ve kusurun **hangi
  sözlükte** çıktığını yazar: yalnız uzun sözlükte → sözcük uzunluğunun
  ürettiği kusur, o dilimin işi; iki sözlükte de → sözlükten bağımsız.
  Takas `SektorSozlugu` satırlarında ve **yalnız ölçüm süresince** olur
  (`arac/sozluk-takas.mjs`); ürün kodunda sözlüğü ezen bir bayrak yok ve
  olmamalı — kiracının dilini ortam değişkeniyle değiştirebilmek, yanlış
  sözcükle çalışan bir kurulum demektir. Rapor her koşumda takasın
  gerçekten **ekrana ulaştığını** da yazar; ulaşmadıysa "temiz" yanlış
  sözlüğü ölçmüş olurdu ve kapı ölçümü geçersiz sayar.

  `dizustu` bu üçlüde ayrı bir kapı olarak duruyor, çünkü uzun sözlüğün en
  olası kusur biçimi yatay kayma değil **sessiz kırpılmadır**:
  `table-layout: fixed` + `overflow: hidden` taşan sözcüğü keser, sayfa
  yana kaymaz ve `yatay-tasma` yeşil kalır.

- *Aile dönüşüm TARİFİ (adım adım):* aynı adım dört ailede atlandı ve
  dördünde de lint yakaladı — kodlama hatası değil TARİF eksikliğiydi.
  Bir ekran ailesi sözlüğe geçerken:
  1. Yorumlardaki ve tanımlayıcılardaki sektör sözcüğü çekirdeğe çevrilir.
  2. Ekran metinleri sözlükten kurulur (`useTerim` · `t(sozluk, …)`).
  3. Saf modüller sözlüğü **parametre** alır (React bilmezler).
  4. **`useMemo`/`useCallback` bağımlılık listesine `sozluk`/`tBas`
     EKLENİR.** Yardımcı sözlük parametresi alır almaz onu çağıran her
     bellek kancası sözlüğe bağımlıdır; eklenmezse sözlük değişince
     ekranda ESKİ sözcük kalır. Bekçi bunu göremez (metin doğru), lint
     görür — bu sınıfın tek bekçisi odur ve CI'da bloklayıcıdır
     (`--max-warnings=0`).
  5. Modül seviyesindeki sabit diziler (`KOLONLAR` gibi) modülde kalır;
     yalnız sözlüğe bağlı alan bileşende kopyalanır.
  6. Kapılar: bekçi · `sozluk-farki` (beklenen fark) · vitest · build.

  **KAPANIŞ KOŞULU — İKİ LİSTE.** Bir aile, **A ve B'nin İKİSİ de o aile
  için temiz** olduğunda kapanır:
    · A — bekçi izin listesi (`sektor-terimi-izin.json`): SEKTÖR sözcüğü.
    · B — sınıf taraması (`cekirdek-sozcuk-taban.json`): sabit yazılmış
      ÇEKİRDEK sözcük.
  Biri temiz, öbürü ölçülmemişse aile KAPANMAZ. Bu koşul yazılmadan
  kapatılan aileler yüzünden 41 dosyalık görünmeyen borç birikti
  (ölçüldü, 7 Eyl 2026): hepsi "A temiz" diye kapatılmıştı. Koşul
  yazılmazsa bir sonraki tarama yeni bir 41 bulur.

- *Bekçi NEGATİF ölçüdür; yanına POZİTİF ölçü kondu (7 Eyl 2026):*
  bekçi "sektör sözcüğü kalmadı" der, **"sözlükten geliyor" demez**. Bir
  dosya `santral`ı çekirdek `tesis` ile SABİT değiştirirse bekçi yeşil
  yanar ve hedef ıskalanır — kabul modelindeki boşluk buydu ve kalan 205
  dosya onun altında çevriliyordu. `arac/sozluk-farki.mjs` rotanın
  metnini iki sözlükle alır; **enerji sözlüğü kuruluyken ekranda çekirdek
  sözcük görünmesi** kusurdur (sözlükten beslenen hiçbir yer enerji
  altında "tesis" yazamaz). Aile başına `kapi:iki-sozluk` içinde koşar,
  "aile çevrildi mi" bilgisi izin listesinin git geçmişinden ve sözlük
  çağrılarından TÜRETİLİR — elle tutulan ikinci bir liste yok.

  İlk koşumunda **iki gerçek kaçak** buldu, ikisi de çevrilmiş
  `/raporlar` ailesinde ve ikisini de bekçi temiz görüyordu
  (`5 tesis × 3 süreç` · `Portföy raporu`). Bir de gelecek dilime kalem
  bıraktı: **`lib/api/kapsam.ts` · `UC_ETIKETI`** uç adlarını çekirdek
  sözcükle yazıyor ("Tesisler (okuma)"). Uç KİMLİĞİ (`facilities`) doğru
  şekilde kod anahtarıdır ve öyle kalmalı; sorulacak olan ETİKETİN
  kiracının sözlüğünü izleyip izlemeyeceğidir — dosya veritabanı ve React
  bilmiyor (R0-8 (b) ailesi), o yüzden karar API dilimine ait, bugünkü
  aileye değil.

  > **İstisna (yazılı olmasının sebebi budur).** `kolon-hizasi` **iki
  > sözlükle ölçülmedi**: canlı sunucuda değil statik dışa aktarım
  > (`out/`) üzerinde koşuyor, veri ve sözlük derleme anında gömülüyor;
  > ikinci sözlükle ölçmek `out/`u o sözlükle yeniden derlemeyi
  > gerektirir. Sebep meşru — ama yazılmazsa kural altı ay sonra "hepsi
  > iki sözlükle koşuyor" diye okunur. Ölçülmedi, "geçti" değil
  > (`web/arac/BENIOKU.md`; vakası `SIS-RSP-001`).

- *Kırılma fırsatı garantisi (çekirdek savunma):* sektör sözcüğü ürünün
  yazdığı bir sabit değil **MÜŞTERİ İÇERİĞİDİR**. Bir sektör paketi
  boşluksuz uzun bir bileşik ad gönderdiğinde kusur bizim CI'mızda değil
  o paketi yazanın ekranında çıkar ve hiçbir koşumuz onu görmez. Ölçüldü
  (7 Eyl 2026): boşluksuz 31 harflik gövde `/sistem/bilesenler` rotasını
  375px'te 48px yana kaydırıyordu (`div.ab-baglam > div.sag`).

  Savunma iki katmanlı ve **ikisi de ölçülerek** seçildi:
  `.ab, .ab * { overflow-wrap: break-word }` tabanı kutusuna sığmayan
  sözcüğü kırar ve min-content'e dokunmadığı için mevcut sarma davranışını
  değiştirmez; terimin düştüğü slot ayrıca `.terim-sar`
  (`min-width: 0` + `overflow-wrap: anywhere`) taşır — genişliği
  içeriğinden gelen bir esnek/ızgara izi ancak böyle daralabilir.

  > Genel `overflow-wrap: anywhere` **denendi ve düzeni bozdu**:
  > min-content tek harfe iner ve `/bulgular` 375px'te dağıldı — üst
  > gezinme ("SAHA PORTFÖY UYUM") harf harf alt alta düştü, kolon
  > başlıkları dikey sütuna döndü. Düzeni korumak için konan kural düzeni
  > bozuyordu; ölçüm olmasa fark edilmezdi.

  Kural ürünün kendi ilkesiyle aynı: **içerik sessizce kaybolmaz.**
  Kırılamayan bir terim düzeni bozmasın, yalnız çirkin görünsün.

  Kalıcı vaka: `arac/iki-sozluk.mjs` üçüncü bir **`stres`** sözlüğü koşar
  (boşluksuz uzun gövde — sektör değil, sınav). Savunma kalkarsa o kapı
  kırmızı yanar; `arac/sabotaj.mjs` (27.) bunu ayrıca ölçer. Savunmadan
  sonra tam küme, üç sözlük: 3 kapı × 3 sözlük = 9 koşum, tek kusur
  `/omur` (`span.ad`, `">1 yıl"`) ve o kusur **üç sözlükte de bit-bit
  aynı** — sözlükten bağımsız, borç listesinde duruyor.

  Paket tarafındaki karşılığı **P4'tedir** (`URN-PKT-007`): paket
  kurulurken terim uzunluğu ölçülür, eşiğin üstünde ve kırılamayan terim
  **uyarı** üretir, kurulumu bloklamaz. Eşik bugün seçilmedi — iki gerçek
  paketle ölçülecek. Tip renklerinde yapılan bölmenin aynısı: çekirdek
  savunması şimdi, paket sözleşmesi P4'te.

**Kapsam dışı.** Sektöre özgü motor mantığı (yok — motorlar özniteliğe
bakar); tesis tipi görselleri (P8); dil çevirisi (P3 — bu paket yalnız TR
sözlük katmanını kurar).

**Kabul kriterleri.**
1. Şemada `kuruluGucMw`, `UretimUnitesi`, `santral` geçmez; göç sonrası
   kurulu güç değeri **olan 16 tesis** `TesisOzellik(kuruluGucMw)` olarak
   aynı değerlerle durur (sayısal eşitlik testi). 17. tesis
   (`MERKEZ-BT`) bugün `kuruluGucMw = null` taşıyor ve göçten sonra da
   **öznitelik satırı almaz** — "bilinmeyen ≠ sıfır": ölçülmemiş değer
   sıfırla ya da boş bir satırla temsil edilmez. [URN-ALN-001]
2. Uygulanabilirlik kuralı öznitelik üzerinden **aynı 4 tesisi**
   kapsama alır (regresyon). Bugünkü seed kuralı üç kolludur
   (`herhangi`: `kuruluGucMw >= 100` **veya** black-start **veya** TEİAŞ
   SCADA/EMS seri değil); `>= 100` kolu tek başına **2** tesis getirir
   (`SAHA-A3` 165, `SAHA-C-RES` 135), kuralın tamamı **3** tesisi
   uygulanabilir yapar (`+ SAHA-A2`, SCADA kolundan) ve dördüncüsü
   (`SAHA-D-RES`) **elle değiştirilmiş** karardır — göç bu dördünü de
   korumalıdır. Özniteliği olmayan tesis `bilinmiyor` döner,
   `kapsamdisi` **değil** *(motor bugün de böyle davranıyor:
   `lib/motorlar/uygulanabilirlik.ts` eksik alanda `null` yayıyor —
   kriter mevcut davranışı korur, yenisini getirmez)*. [URN-ALN-002]
3. Bekçi test yeşil **ve izin listesi boş**: çekirdekte (`app/` ·
   `components/` · `lib/`) sabit sektör terimi yok — metin literalinde de
   tanımlayıcıda da. Kapı Aşama F'de **önce** kuruldu; kriter, listenin
   erimesiyle karşılanır. Ara ölçü: kalan dosya sayısı (bugün **258**).
   [URN-ALN-003]
4. Enerji sözlüğü kuruluyken `/tesisler/[id]` başlığı "Santral 360",
   kurulu değilken "Tesis 360"; ikisi de aynı bileşenden. [URN-ALN-004]
5. Kanıt paketi şema sürümü artmış; eski sürüm okuyucusu için alan adı
   eşleme notu paket başlığında. [URN-ALN-005]
6. `İ/ı` yerel ayar testi ve mevcut test kümesi tümüyle yeşil (yeniden
   adlandırma sonrası). [URN-ALN-006]

**Kararlar.** *Tablo yeniden adlandırma mı, görünüm mü?* **Varsayılan:**
yeniden adlandırma (tek doğruluk kaynağı); Prisma `@@map` ile eski tablo
adı **tutulmaz**.

---

### P2 · Çok kiracılılık (hub & spoke)

**Alan kodu:** `URN-KIR` · **Etki:** en yüksek (ürün) · **Çaba:** yüksek ·
**Bağımlılık:** P0; R5 ile birlikte (RLS)

**Bugün.** Tek kurum. `Grup` en üst düğüm; `Kullanici`, `Yetki`, `Oturum`;
RBAC × tesis/süreç kapsamı veri seviyesinde (`lib/erisim.ts`, kapsam
kapısı nöbetçi testleri); `ApiAnahtari`; kanıt deposu tek kök; sır
referansları tek ad alanı; `IsKilidi` tek küme.

**Hedef.** Bir kurulum birden çok kiracıya hizmet eder; kiracı verisi
uygulama katmanında (her sorguda) **ve** veritabanında (RLS) ayrıktır;
hub rolleri kiracı açar, paket dağıtır, kullanım ölçer, ama kiracı
verisini kiracının süreli onayı olmadan göremez.

**Kapsam.**
- *Model:* `Kiraci` (`kod`, `ad`, `durum` (`aktif | askida | arsiv`),
  `varsayilanDil`, `saatDilimi`, `paraBirimi` (ISO 4217), `ulke` (ISO
  3166-1), `sektorPaketiKodu?`, `markaAd?`, `depoKoku`, `sirAdAlani`,
  `olusturuldu`). Kiracıya ait **her** tabloya `kiraciId` (zorunlu,
  indeksli; bileşik tekil kısıtlar `kiraciId` ile genişler). Paylaşılan
  (kiracısız) tablolar açık listede: `IcerikPaketi` kataloğu, `OuiKaydi`,
  `Sektor`/`SektorOznitelikSemasi` (paket kaynaklı), `Yapilandirma`
  (hub). Test bu listeyi şemadan doğrular: listede olmayan ve `kiraciId`
  taşımayan tablo → kırmızı.
- *Kiracı kapısı:* Prisma client extension — her sorguya oturumun
  `kiraciId`'si eklenir (`where` birleşimi; `create` dolgusu); kapı
  atlanamaz (ham sorgu bekçisi mevcut kalıpla). `lib/erisim.ts`
  `yetkiZorunlu` kiracı bağlamını taşır; `Yetki` kiracı içi kalır.
- *Hub rolleri:* `urun_yoneticisi` (kiracı CRUD, paket yayınlama,
  kullanım ölçümü — kiracı **verisi yok**), `destek` (kiracının
  `DestekErisimi` kaydıyla — süreli, kapsamlı, salt okunur, denetim izli;
  `DenetciErisimi` kalıbı yeniden kullanılır). Kiracı içi roller aynen.
- *İzolasyon yüzeyleri:* kanıt deposu kökü `depoKoku/<kiraci>/`; sır
  referansları `vault:<kiraciAdAlani>/…`; `IsKilidi` ve kuyruk anahtarları
  kiracı ön ekli; API anahtarı kiracıya ait, uçlar kiracı kapısından;
  kanıt paketi başlığında kiracı kodu; yedek aracı `--kiraci` ile tek
  kiracı alır/yükler; oran sınırı kovaları kiracı bazlı.
- *RLS (R5 ile):* her kiracılı tabloda `ENABLE ROW LEVEL SECURITY` +
  `current_setting('app.kiraci_id')` politikası; uygulama bağlantı
  başında ayarlar; politika olmadan sorgu boş döner (ikinci savunma).
- *Göç:* mevcut veri `varsayilan` kiracıya taşınır (tek transaction);
  geri dönüş notu.
- *Ekran:* `/hub` (yalnız hub rolleri): kiracı listesi, aç/askıya al/arşiv,
  paket ata, kullanım özeti; `/hub/kiracilar/[kod]`; kiracı içinde
  `/ayarlar/kiraci` (ad, dil, saat dilimi, para birimi, marka adı, destek
  erişimi onayı).
- *Oturum:* kullanıcı tek kiracıya aittir (varsayılan); çok kiracılı
  kullanıcı (danışman/denetçi) **`DenetciErisimi`/`DestekErisimi` ile**,
  ikinci bir üyelikle değil.

**Kapsam dışı.** Faturalama; kiracılar arası veri paylaşımı; kiracı
silme (arşiv var); alt kiracı hiyerarşisi (Grup → Tüzel Kişi zaten var).

**Kabul kriterleri.**
1. Kiracı A oturumu, B'nin her tablosundaki kaydı okuyamaz/yazamaz —
   negatif test seti her `eylemler2` modülü ve her API ucu için üretilir
   (mevcut kapsam kapısı nöbetçisi kiracı boyutuyla genişler). [URN-KIR-001]
2. `kiraciId` taşımayan ve istisna listesinde olmayan tablo yoktur
   (şema testi). [URN-KIR-002]
3. RLS açıkken `app.kiraci_id` ayarlanmamış bağlantı **boş** sonuç alır;
   ayarlıyken yalnız kendi kiracısını. [URN-KIR-003]
4. Hub `urun_yoneticisi` kiracı kanıtını, varlığını, kullanıcısını
   listeleyemez; `destek` yalnız aktif `DestekErisimi` penceresinde ve
   kapsamında, her okuma izde. [URN-KIR-004]
5. Aynı `kod`lu varlık iki kiracıda çakışmaz (bileşik tekil kısıt).
   [URN-KIR-005]
6. Göç sonrası mevcut 17 tesis `varsayilan` kiracıda, sayı ve içerik
   aynı. [URN-KIR-006]
7. Kanıt paketi ve yedek çıktısı kiracı kodunu taşır; başka kiracının
   yedeği yüklenemez (kod uyuşmazlığı reddi). [URN-KIR-007]

**Kararlar.** *Kullanıcı çok kiracılı olabilir mi?* **Varsayılan: hayır**
(erişim kayıtlarıyla). *RLS zorunlu mu?* **Varsayılan: PostgreSQL'de
zorunlu**, SQLite (geliştirme/demo) yalnız uygulama kapısı.

---

### R5 · PostgreSQL göçü ve yük testi

**Alan kodu:** `ALT-PG` · **Etki:** ön koşul · **Çaba:** orta-yüksek ·
**Dalga:** 0 (P2 ile birlikte — kiracı izolasyonunun RLS ayağı)

**Bugün.** `docs/POSTGRES_READINESS.md` 11 SQLite bağımlılığı sayar;
ikisi (6 değişmezlik tetikleyicisi, `LIKE` duyarlılığı) Postgres'te
**sessizce yanlış** davranır. Yarış koşulları P1–P7 kapatılmış. Test
izolasyonu dosya kopyasına dayanır. Yük testi yapılmamış.

**Hedef.** Ürün PostgreSQL üzerinde aynı testlerle yeşil; 10⁵ varlık ve
20 eşzamanlı kullanıcı ölçümü belgelenmiş.

**Kapsam.** Belgedeki plan uygulanır: (1) Prisma datasource provider
değişimi + **tek taban göçü** (P2 `kiraciId` sütunları ve RLS politikaları
aynı taban göçüne girer); (2) tetikleyicilerin PostgreSQL karşılığı
(UPDATE/DELETE/TRUNCATE) taban göçüne; değişmezlik testleri aynen koşar;
(3) `lib/aramaKosulu.ts` tek satır değişikliği; bekçi test yeşil;
(4) test izolasyonu: şema-başına (`CREATE SCHEMA test_<id>`) ya da
transaction geri alma; `tests/sahte/db.ts` yeniden yazılır;
(5) altı nullable tekillik kısıtı için `NULLS NOT DISTINCT` kararı
uygulanır; (6) CI'da PostgreSQL servisi; SQLite yolu **geliştirme ve
demo** için kalır (iki datasource tek şema — belgedeki karar);
(7) yük ölçümü `arac/yuk.mjs` genişletilir: 10⁵ varlık, 20 eşzamanlı
oturum, 10 000 satırlık içe aktarım onayı; sonuç `docs/PERFORMANS_TABANI.md`'ye
**ölçüldüğü gibi** yazılır.

**Kapsam dışı.** Sorgu optimizasyonu (ölçüm sonrası ayrı paket);
bulut-yönetimli Postgres kurulumu (altyapı).

**Kabul kriterleri.**
1. PostgreSQL üzerinde `AktiviteKaydi`, `DegerlendirmeTarihcesi`,
   `KanitSurumu` için UPDATE, DELETE ve **TRUNCATE** reddedilir. [ALT-PG-001]
2. "saha-ı" araması PostgreSQL'de "Saha I HES"i bulur (bugünkü
   davranışı kaydeden test kırmızıya döner ve **güncellenir**). [ALT-PG-002]
3. Tüm test kümesi iki sağlayıcıda da yeşil; atlanan test sayısı artmaz.
   [ALT-PG-003]
4. 10⁵ varlıkta `/envanter` istek süresi ve bellek ölçülmüş, belgeye
   yazılmış; hedef **yazılmaz**, ölçüm yazılır. [ALT-PG-004]

**Kararlar.** *Tek ürün iki datasource mu?* **Varsayılan: evet**
(SQLite geliştirme/demo, PostgreSQL üretim) — belgedeki mevcut yaklaşım.

---

### P3 · Çoklu dil ve yerelleştirme

**Alan kodu:** `URN-DIL` · **Etki:** yüksek (ürün) · **Çaba:** yüksek
(mekanik) · **Bağımlılık:** P1 (terim sözlüğü)

**Bugün.** Yalnız Türkçe; `İ/ı` yerel ayar zorunlu ve testli; tarih/sayı
TR; `lib/an.ts` tek "an" kaynağı (hidrasyon); metinler JSX içinde sabit.

**Hedef.** Kullanıcı ve kiracı dil seçer (TR birinci, EN ikinci); kabuk
ve tüm ekranlar mesaj kataloğundan; tarih, sayı, para birimi `Intl` ile
kiracı yerel ayarında; içerik paketleri kendi dilinde; terim sözlüğü ile
tek `t()`.

**Kapsam.**
- *Katman:* `lib/dil/` — mesaj kataloğu (`mesajlar/tr.json`, `en.json`;
  ICU MessageFormat çoğul/cinsiyet; anahtar adları Türkçe, `ekran.uyum.baslik`
  gibi); `t()` terim sözlüğüyle birleşik; dil oturumdan/kiracıdan sunucu
  tarafında çözülür ve istemciye tek değer olarak iner (hidrasyon
  ayrışması yok — `lib/an.ts` kalıbı).
- *Model:* `Kullanici.dil?` (null = kiracı varsayılanı),
  `Kiraci.varsayilanDil`, `saatDilimi`, `paraBirimi` (P2'de açıldı).
- *Biçimleme:* tarih/sayı/para `Intl.*` ile; gün çözünürlüğünde termin
  matematiği **değişmez** (saat dilimi yalnız gösterimde); `İ/ı`
  dönüşümleri `toLocaleUpperCase('tr')` ile TR'de korunur, EN'de
  standart.
- *Aşamalı geçiş:* (1) kabuk, giriş, yardım, ayarlar; (2) uyum/risk/bulgu/
  denetim; (3) OT ekranları; (4) dışa aktarım başlıkları ve e-posta
  şablonları (R4). Her aşama ayrı PR.
- *Bekçi test:* JSX/metin literalinde Türkçe karakterli çıplak metin →
  kırmızı (istisna listesi: sözlük dosyaları, seed, belgeler).
- *İçerik:* `Madde.metin` gibi içerik alanları çevrilmez — paket dilinde
  kalır; ekran içeriğin dilini rozetle gösterir ("içerik: TR").

**Kapsam dışı.** Sağdan sola diller; makine çevirisi; içerik paketi
çevirisi.

**Kabul kriterleri.**
1. Dil EN iken kabuk ve aşama-1 ekranları EN; TR iken mevcut metinler
   birebir (anlık görüntü testi). [URN-DIL-001]
2. `İ/ı` testi TR'de yeşil; EN'de `title()` standart. [URN-DIL-002]
3. Statik hidrasyon kontrolü (`yayin:statik`) iki dilde yeşil. [URN-DIL-003]
4. Bekçi test yeşil; istisna listesi belgeli. [URN-DIL-004]
5. Para birimi kiracıdan; R13 parasal etki kiracı para biriminde
   biçimlenir (ileri bağımlılık notu). [URN-DIL-005]

> **P1'den devir · R0-8 burada karara bağlanır.** Kiracı bağlamını
> bekleyemeyen yüzeyler kullanıcının diline de erişemez — dil tercihi,
> sözlük gibi, oturumdadır. P1 aynı duvara SÖZLÜK için ÜÇ ayrı yerden
> çarptı (zod şeması · paket sözleşme kapısı · Suspense yedeği) ve
> mesajları çekirdek sözcükte bıraktı; bu paket aynı duvara DİL için
> çarpacak. Karar burada verilir: sınır olduğu yerde mi kalır (bu
> yüzeyler tek dilde), yoksa bağlamın çözülme ANI mı değişir? İki aday
> var ve ikisi de ayrı gerekçe ister: doğrulama sırası (denetim
> gerekçesiyle seçildi — reddedilen isteğin izi aktörsüz kalmasın) ve
> derleme zamanında çözülen mesaj kataloğu (Suspense yedeğini de
> kapsardı). Kalem R0-8'de; üç örnek orada listeli.

**Kararlar.** *Kütüphane:* **Varsayılan** hafif kendi katman (ICU için
`intl-messageformat`); alternatif `next-intl` (Next 16 uyumu
doğrulanmalı). *İkinci dil:* EN.

---

### P4 · İçerik paketi mimarisi

**Alan kodu:** `URN-PKT` · **Etki:** en yüksek (ürün) · **Çaba:** orta-yüksek
· **Bağımlılık:** P1, P2

**Bugün.** `Regulasyon · FrameworkSurumu · SurumFarki · Madde`,
`MaddeEslestirmesi`, `BildirimYukumlulugu`, `RegulasyonKaynagi`;
`/ice-aktarim` madde aktarımı; içerik seed'de. **P4 ilk dilimi uygulandı
(9 Eylül 2026):** paket biçimi + doğrulayıcı (`lib/paket/dogrula.ts`,
`npm run paket:dogrula`), lisans sınırı alanda (`Regulasyon.lisansTuru ·
metinDahil`), kurucu (`lib/paket/kur.ts`: tek transaction, çerçeve TASLAK,
aktifleştirme insan onayıyla; sözlük · tür · öznitelik · çerçeve ·
yükümlülük), köken (`koken · paketSurumId` yedi tabloda; kiracı satırı
ezilmez), kaldırma = arşiv, katalog (`IcerikPaketi · IcerikPaketiSurumu`),
iskelet paketler `paketler/TR-ENERJI` · `paketler/TR-BANKACILIK`, tohum
taşınabilirlik ölçümü `docs/P4_TOHUM_TASIMA_OLCUMU.md`. **PR #41
incelemesiyle sertleşti (9 Eylül 2026):** yükseltme uzlaştırması (yeni
sürümün bırakmadığı paket türü/yükümlülüğü pasif, kendi taslak sürümü
arşiv; sözlük/öznitelik "artık" raporlanır — URN-PKT-006), iz kaydı
kurulum/arşivle AYNI transaction'da ve kaldırmada aktif sürüm kararı arşiv
yazımıyla atomik (URN-PKT-007), taslak yenileme bağ listesi şemadan
bekçiyle (`MaddeAlan` dâhil), dizin adı = manifest kodu, CSV'de tekrar
başlık ve başlığı aşan dolu hücre red, sürüm yürürlük tarihi kalıcı.
İkinci tur: kurulu sürüm değişmez (aynı numarayla farklı içerik SÜRÜM
ile red — URN-PKT-008), bağımlılık kararı transaction içinde, telifli
CSV'de `kanit_beklentisi` de red ve `dis_kontrol_id` sınırlı, sektörsüz
paket sözlük/öznitelik beyan edemez, `seviye` 0–5, tarihler takvimde var
olmalı, kapanmamış tırnak BİÇİM. Üçüncü tur: yapıda yeri olmayan dosya
red, `ust_kod` öz-referansı red, sürüm değişmezliği manifest üstverisini
de kapsar ve aynı içerik madde ağacına dokunmaz, kiracının madde
düzenlemesi (denetim izi) de bağ sayılır, bağımlı kurulu paket varken
kaldırma yok ve geri kurulum arşiv taslağı taslağa döndürür (URN-PKT-009),
madde ağacı partilerle + 120 sn bütçeyle yazılır; bekçi NULL eşleşmesinde
mantık dalını (OR kardeşi) ve izin listesinde dosya içi sırayı sayar.
**2.1 uygulandı (9 Eylül 2026):** `SektorSozlugu.aktif` ·
`SektorOznitelikSemasi.aktif` (elle eklemeli göç); uzlaştırma ve kaldırma
pasifler, geri kurulum aktifler; her okuyucu `aktif: true` süzer ve bekçi
bunu kaynakta ölçer (`tests/bekci/aktif-suzgec.test.ts`, URN-PKT-011).
**2.2 uygulandı:** form (`form/<KOD>.json` + isteğe bağlı XLSX, hücreler
dosyaya karşı okunur, telifli pakette XLSX yasak) ve rapor
(`rapor/<KOD>.json`) şablonu türleri; `FormSablonu · RaporSablonu`
katalogları (köken · aktif · uzlaştırma); ekranlar şablonu henüz okumaz
(URN-PKT-012). **2.3 uygulandı:** rol kataloğu (`roller.json`: modül ×
işlem izinleri, kapsam ekseni; `RolKatalogu`, göç
`20260909140000_p4_rol_katalogu`); çekirdek rol kodu paketle yeniden
tanımlanamaz, izin merdiveni (onay → yazma → okuma) doğrulanır; çalışma
zamanı yetkisi kataloğu OKUMAZ (paket önerir, kiracı karar verir; koda
bağlanması P2/P6) — paket biçiminin modül · işlem · çekirdek rol sabitleri
`lib/erisim.ts`e karşı derlemede ve bekçiyle ölçülür (URN-PKT-013).
**2.4 uygulandı:** eşleme CSV türü (`esleme/<KOD>.json` kimlik: kaynak/hedef
çerçeve + sürüm etiketi, paket içi ya da kurulu; CSV
`kaynak_kod;hedef_kod;denklik;aciklama`); yapı kusuru LİSANS'tan ÖNCE,
açıklama sınırlı ve yalnız metin izinliyken; `MaddeEslestirmesi.aktif`
(göç `20260909150000_p4_esleme_aktif`): bırakılan eşleme pasif, okuyucular
ve `madde.eslestirme*` içermeleri aktif süzer (bekçi genişledi); paketin
kendi eşlemesi taslak yenilemesinde bağ sayılmaz, kiracınınki sayılır
(URN-PKT-014). **2.5 uygulandı:** tohum paket biçimine taşındı —
`paketler/DEMO-TR-ORTAK` (CBDDÖ · ISO 27001 telifli · SPK BS · 2 denklik),
`DEMO-TR-ENERJI` (sözlük 13, öznitelik 9, EPDK-SYM demo 27 madde, 6 denklik),
`DEMO-TR-SU` (sözlük 5, öznitelik 1); `prisma/seed.ts` bunları `paketiKur`
ile kurar ve ilk sürümleri aktif yapar; CSV'ye `kanit_tipi` sütunu (kayıp
olmasın diye); ölçülen kayıp yalnız ISO 27001'in 4 kısa açıklama metni
(`docs/P4_TOHUM_TASIMA_OLCUMU.md` §4); kiracı katmanı (BT/OT eşlemesi,
aile adı, tesisler, tipler, süreçler) tohumda (URN-PKT-015). **2.6
uygulandı:** `/paketler` ekranı (Uyum alanı, Regülasyonlar'ın yanı): disk ×
veritabanı birleşik hâl (güncel · güncelleme var · diskteki kopya eski ·
diskte yok · doğrulanamadı · kurulu değil · arşiv), kur / güncelle /
kaldır (arşiv, gerekçeli), engel nedeni düğmenin yanında; ekran hiçbir
çerçeveyi aktifleştirmez ve lede altında bunu kalıcı cümleyle söyler
(URN-PKT-016). **2.7 uygulandı:** OSCAL 1.1 katalog okuyucu/yazıcı
(`lib/paket/oscal.ts`): `cerceve/<KOD>.oscal.json` CSV'nin alternatifi,
doğrulayıcı OSCAL'ı satıra indirip CSV ile aynı kuralları uygular (telifli
metin `prose` içinden sızamaz), OSCAL dışı alanlar `props` ad alanında,
Türkçe kod prop'ta korunur; gidiş-dönüş üç iskelet çerçevesinde (659
madde) birebir; yazar aracı `--oscal <dizin>` (URN-PKT-017). SCF içe
alımı hukuki görüşe bağlı kalır — okuyucu hazır, içerik yok.
**İÇERİK uygulandı (9 Eylül 2026):** `TR-ENERJI` 0.3.0 artık iskelet değil —
EPDK Yetkinlik Modeli Yönetmeliği (4 bölüm + 18 madde + 1 geçici madde) ve
YEDİ sektör ekinin tamamı (Ek-1 476 · Ek-2 505 · Ek-3 565 · Ek-4 552 · Ek-5 551 ·
Ek-6 578 · Ek-7 464 = 3 691 kontrol, 88 kontrol ailesi) TAM
METİNLE pakette; metni girilmemiş kontrol SIFIR; metin EPDK resmî sitesinden (birincil kaynak) indirildi,
`mevzuat.gov.tr` ve `resmigazete.gov.tr` yine erişilemedi (HTTP 000; ikincil
kaynak içeriğe girmedi). Madde CSV'sine köken sütunları eklendi (`kaynak_url ·
kaynak_yeri · erisim_tarihi · yururluk_tarihi` → `Madde.maddeKaynakUrl ·
kaynakSayfa · kaynakErisimTarihi · gecerliBaslangic`): kaynağı olduğunu SÖYLEYEN
çerçevede metinli madde köken taşımak zorundadır (KAYNAK sınıfı), kaynaksız
çerçeve ve demo paketi muaftır; metni girilmemiş madde "metin girilmedi" der ve
bu sabiti ekran TANIR (`maddeMetniDurumu`) — uydurulmaz, boş bırakılmaz, sıfır
sayılmaz (URN-PKT-019). Çerçeve `uygulanabilirlik` BEYAN eder (hangi kapsam
öğesi türüne, hangi öznitelik koşuluyla, hangi maddeye dayanarak); kurucu bunu
`UygulanabilirlikKurali` (köken paket) yazar, motor `icinde` işlecini tanır ve
kapsam öğesi türünü bağlamın profil tarafından okur — karar hâlâ ÖNERİDİR,
kiracının kuralı ezilmez, bırakılan ve kaldırılan kural pasifler (URN-PKT-020).
`/uyum` aktif sürümü olmayan çerçeveyi "N madde TASLAK · aktifleştirme bekliyor"
diye gösterir — "0 kontrol" diye değil (URN-PKT-021). Kalan:
form/rapor ekranlarının şablonu okuması, rol önerisinin koda bağlanması,
R6 ilişki türü/güç, demo verisinin (tesis · süreç · bulgu) JSON'dan
yüklenmesi (P8), TR-ENERJI'nin kalan 6 EPDK eki.

**Hedef.** Çerçeveler, eşlemeler, yükümlülükler, denetim form şablonları,
mevzuat kaynak katalogları, sektör sözlükleri ve demo verisi **paket**
olarak üretilir (sürümlü, imzalı, ülke × sektör × dil etiketli), hub'dan
kiracıya kurulur ve güncellenir; güncelleme fark motorunu besler.

**Kapsam.**
- *Biçim:* dizin/ZIP + `manifest.json` (`kod`, `ad`, `tur`, `ulke`,
  `sektor`, `dil`, `surum` (SemVer), `yayinci`, `lisansNotu`,
  `bagimliliklar[]`, `icerikOzetleri{dosya: sha256}`, `imza?`); içerik:
  çerçeve → OSCAL katalog JSON (+ `uzantilar.json`: seviye, zorunluluk
  tipi, kanıt beklentisi gibi OSCAL dışı alanlar `props` ile), eşleme →
  CSV (STRM), yükümlülük → JSON, form → XLSX şablon + eşleme JSON,
  kaynak kataloğu → JSON, sözlük → JSON, demo verisi → JSON.
- *Model:* `IcerikPaketi` (katalog; kiracısız), `IcerikPaketiSurumu`,
  `KiraciPaketi` (kiracı × paket × kurulu sürüm × kurulum zamanı ×
  kuranId × durum (`kurulu | guncelleme_var | kaldirildi`)).
- *Kurucu:* `lib/paket/` — okuyucu, manifest/özet/imza doğrulayıcı,
  kurucu: çerçeve → `Regulasyon` + `FrameworkSurumu(taslak)` + `Madde`;
  **aktifleştirme insan onayıyla** (mevcut `surumAktiflestir`); eşleme →
  `MaddeEslestirmesi` taslak; yükümlülük → `BildirimYukumlulugu`; kaynak
  kataloğu → `MevzuatKaynagi` (etkin=false); sözlük → `SektorSozlugu`;
  form → şablon deposu. Kaldırma: içerik **silinmez**, `arsiv`.
- *Paket deposu:* `yerel_dizin` (bağlı; `paket/` klasörü), `uzak_katalog`
  (`bagli:false`; hub yayın kanalı — ileride).
- *İlk paketler (iskelet + kamu metni):* `TR-ENERJI` (EPDK-SYM sürümleri,
  BİGR, SPK VII-128.9, KVKK — **içerik kurumdan**, §0.1; paket iskeleti
  ve OSCAL yapısı bu pakette), `INT-ISO27001-2022` (kimlik+başlık),
  `INT-IEC62443-3-3` (kimlik+başlık), `INT-SCF` (CC; kullanıcı indirir),
  `EU-NIS2` (madde 21 tedbirleri — kamu metni), `US-NERC-CIP` (kamu
  metni; ilk sürüm yalnız standart listesi), `SEKTOR-ENERJI-URETIM`
  (P1), `DEMO-TR-ENERJI` (P8).
- *Ekran:* `/hub/paketler` (yayınla, sürümle, imzala), kiracıda
  `/paketler` (kurulu, güncelleme var, kur/güncelle → onay akışı, lisans
  notu, içerik dili).
- *Sözlük doğrulaması (P1'den devir):* paket kurulurken **terim uzunluğu
  ve kırılabilirliği ölçülür**; eşiğin üstünde VE kırılma fırsatı
  taşımayan (boşluksuz/tiresiz) bir terim **UYARI üretir — kurulumu
  BLOKLAMAZ.** Paket yazarı bilir, ürün çalışmaya devam eder.

  Bloklamamanın sebebi ürünün kendi ilkesidir: motor önerir, insan karar
  verir. Bir kiracının kendi sözcüğü uzun diye paketi reddetmek, ürünün
  bilemeyeceği bir şeye karar vermek olurdu — belki o sektörde gerçekten
  öyle deniyor.

  Uyarı bir kusur değil, bir **ölçüm bildirimidir** ve "ölçülmedi ≠
  sıfır" kuralına tabi: terim ölçülemiyorsa (dil paketi eksik, sözlük
  yarım) uyarı üretilmez, "uzun değil" DENMEZ.

  **Eşik bugün seçilmedi ve seçilmemeli.** P1'de tek bir kurgusal gövdeyle
  (31 harf, boşluksuz) ölçüldü ve çekirdek savunması ona göre kuruldu;
  bir eşik sayısı ancak İKİ GERÇEK paketle ölçülünce dürüst olur. P4'te
  `SEKTOR-ENERJI-URETIM` ve ikinci gerçek sektör paketi elde olduğunda
  ölçülür ve buraya yazılır. Bugün bir sayı yazmak, ölçmeden hedefe
  uydurmak olurdu.

  Çekirdek savunması P1'de **kuruldu** ve bu doğrulamanın önkoşuludur:
  kırılamayan bir terim düzeni bozmaz, yalnız çirkin görünür
  (`app/kabuk.css` · `.terim-sar`; kalıcı vaka `arac/iki-sozluk.mjs`
  `stres` sözlüğü). Yani P4 uyarısı bir ÇÖKME riskini değil, bir
  OKUNABİLİRLİK sorununu bildirir. Ayrım bilinçli: tip renklerinde
  yapılan bölmenin aynısı — çekirdek savunması şimdi, paket sözleşmesi
  P4'te.

**Kapsam dışı.** Paket pazaryeri/ödeme; otomatik güncelleme (insan
onayı şart); paket içeriğinin ürünle telif dışı gelmesi.

**Kabul kriterleri.**
1. Eksik zorunlu manifest alanı → kurulum reddi, sebep adıyla. [URN-PKT-001]
2. Özet/imza uyuşmazlığı → red; kısmi yazma yok. [URN-PKT-002]
3. Aynı sürüm iki kez → tek kurulum (idempotent); yeni sürüm →
   `FrameworkSurumu(taslak)` + aktifleştirmede `SurumFarki`. [URN-PKT-003]
4. Kiracı A'nın kurduğu paket B'de görünmez; katalog (kiracısız) ikisinde
   de görünür. [URN-PKT-004]
5. OSCAL fikstürü içe alınıp tekrar dışa verildiğinde eşdeğer (gidiş-dönüş
   testi). [URN-PKT-005]
6. Lisans notu kiracı ekranında ve kanıt paketinde görünür. [URN-PKT-006]
7. Eşiğin üstünde ve kırılma fırsatı taşımayan terim içeren paket
   **kurulur** ve kurulum raporunda uyarı olarak görünür; terimi
   ölçülemeyen paket uyarı ÜRETMEZ ("uzun değil" demez). Eşik P4'te iki
   gerçek paketle ölçülüp buraya yazılır. [URN-PKT-007]

**Kararlar.** *İmza:* **Varsayılan** SHA-256 özet zorunlu, Ed25519 imza
isteğe bağlı (hub anahtarı sır). *OSCAL dışı alanlar:* `props` ad alanı
`urn:<urun>:…`.

---

### P5 · (birleştirildi) Ülke kaynak katalogları → R1 içinde "Ürünleştirme notu"

Ayrı paket değil. R1'deki kaynak kataloğu P4 paket türü `kaynak_katalogu`
olur; `TR` kataloğu ilk; `EU` (EUR-Lex RSS/API, ENTSO-E NCCS sayfası) ve
`US` (Federal Register API, NERC standart sayfası) katalogları örnek
iskelet olarak paketlenir. Anahtar kelimeler paket dilinde. Aynı motor.

---

### P6 · Kimlik, kiracı yönetimi ve SSO

**Alan kodu:** `URN-KIM` · **Etki:** yüksek (ürün) · **Çaba:** orta ·
**Bağımlılık:** P2

**Bugün.** Yerel hesap (scrypt), oturum 12s/2s, oran sınırı, başarısız
giriş izi; `Connector.kimlikTipi` OAuth2 destekler; **gerçek SSO/MFA yok**.

**Hedef.** Kiracı kendi IdP'sine OIDC ile bağlanır; yerel hesap yedek;
yerel hesaplarda TOTP MFA; kullanım ölçümü lisanslama girdisi olur.

**Kapsam.**
- `KimlikSaglayici` (kiracı × tür (`oidc | yerel`) × yapılandırma
  (issuer, clientId, redirect; **sır referansı**) × rolEslemeJson (IdP
  grup → rol) × `bagli`); OIDC Authorization Code + PKCE; JIT kullanıcı
  oluşturma **kapalı** varsayılan (kullanıcıyı kiracı yöneticisi açar —
  IdP'den gelen bilinmeyen kimlik reddedilir ve ize yazılır); `Kullanici.
  disKimlik` (issuer+sub); TOTP MFA (`MfaKaydi`, kurtarma kodları özetli);
  kiracı politikası "MFA zorunlu"; oturum politikaları kiracı başına
  (varsayılan 12s/2s korunur).
- `KullanimOlcumu` (kiracı × ay × aktif kullanıcı × tesis × varlık ×
  kanıt GB × bağlayıcı sayısı) — koddan sayılır, hub görür, **fatura
  kesmez**.
- Ekran: `/ayarlar/kimlik` (kiracı yöneticisi), giriş ekranında "kurum
  hesabıyla gir" (IdP bağlıysa), `/hub/kullanim`.

**Kapsam dışı.** SAML (ileride), SCIM, parola politikası ötesi.

**Kabul kriterleri.**
1. IdP bağlı değilken yerel giriş çalışır; bağlıyken ikisi de. [URN-KIM-001]
2. Sahte OIDC ile yanlış `iss`/`aud`/`nonce` reddedilir ve ize yazılır.
   [URN-KIM-002]
3. JIT kapalıyken tanınmayan `sub` giriş yapamaz; kullanıcı **oluşturulmaz**.
   [URN-KIM-003]
4. MFA zorunlu kiracıda TOTP'siz yerel hesap giriş **yapamaz**. [URN-KIM-004]
5. Kullanım ölçümü değerleri koddan sayılır; `hub` ekranında kaynak
   komutu yazılıdır. [URN-KIM-005]

---

### P7 · Dağıtım biçimleri ve altyapı sağlayıcıları

**Alan kodu:** `URN-DAG` · **Etki:** yüksek (ürün) · **Çaba:** orta-yüksek
· **Bağımlılık:** R5, P2

**Bugün.** SQLite; yerel dosya deposu; bellek içi oran sınırı; süreç içi
kuyruk; `env`/`dosya` sır; `vault`, `dis` kuyruk, S3, KMS **kayıtlı ama
bağlı değil** (defterler hazır). Statik demo derlemesi var.

**Hedef.** Aynı koddan üç biçim: statik demo; tek kiracılı on-prem (Docker
Compose); çok kiracılı SaaS (Helm). Sağlayıcılar **kod olarak** bağlanır;
kimlik ve adres kurulumda girilir.

**Kapsam.** S3 uyumlu depo sağlayıcısı (`kanitDeposu` ailesi; aynı
içerik-adresli anahtar); Redis oran sınırı deposu (`oranDeposuAyarla`);
BullMQ kuyruk sağlayıcısı (`lib/is/kuyruk.ts` `dis`); Vault sır sağlayıcısı
(`vault:` çözümü, önbelleksiz — mevcut karar); `/api/v1/health`
(liveness/readiness; kiracısız); yapılandırma tek zod şeması
(`lib/yapilandirma/ortam.ts`) ve `docs/KURULUM.md`; `deploy/compose/` ve
`deploy/helm/`; yapısal log + OpenTelemetry izleri (sır maskesi loglarda
ölçülür); yedek/geri yükleme kiracı bazlı (P2).

**Kapsam dışı.** Bulut sağlayıcı seçimi; otomatik ölçekleme politikaları;
CDN.

**Kabul kriterleri.**
1. Her sağlayıcı için sözleşme testi sahte servisle (testcontainers ya da
   sahte) yeşil; bağlı değilken sessiz düşüş yok (mevcut testler).
   [URN-DAG-001]
2. Compose ile ayağa kalkan kurulumda `rota:duman` yeşil (CI işi).
   [URN-DAG-002]
3. Loglarda `sirReferansi` değeri, token, parola bulunmaz (bekçi).
   [URN-DAG-003]
4. `readiness` PostgreSQL ve depo erişilemezken 503 döner, sebebini
   yazar. [URN-DAG-004]

**Kararlar.** *Dağıtım önceliği:* kullanıcı kararı (`URUN_VIZYONU` §9);
**varsayılan** on-prem (Compose) önce.

---

### P8 · Örnek kiracı ve demo verisi

**Alan kodu:** `URN-DEMO` · **Etki:** orta · **Çaba:** orta ·
**Bağımlılık:** P1, P4

**Bugün.** *(6 Eylül 2026'da doğrulandı.)* Seed portföyü
**kurgusaldır**: 17 tesisin hepsi sentetik ad taşır (`Saha A-1 JES` …
`Saha M DGKÇ`), tüzel kişiler de öyle. **Kalan iki iz:** (1) iller ve
coğrafî tarifler gerçektir (`public/tesisler/KUNYE.md`) ve tip +
kurulu güç + il üçlüsü portföyü tanınır kılar; (2) tesis
fotoğraflarının tamamı ürün sahibinin sağladığı **gerçek tesis
fotoğraflarıdır** — paketin hedefi "nötr lisanslı görsel", bugün öyle
değil. Üçüncü taraf fotoğrafı ve onu kurgusal tesise bağlayan künye
cümleleri 6 Eylül'de kaldırıldı.

**Hedef.** Depodaki tek kiracı verisi **tamamen kurgusal** bir demo
kiracısıdır; ikinci bir sektörden minimal demo kiracısı sektör
bağımsızlığı gösterir; Demo'nun gerçek verisi depoda yoktur.

**Kapsam.** `DEMO-TR-ENERJI` paketi: kurgusal ad (kullanıcı verir;
varsayılan "Örnek Enerji Üretim A.Ş."), kurgusal tesis adları/kodları,
gerçekçi ama **kurgusal** kurulu güçler, il bilgisi kurgusal-uyumlu,
koordinat **yok** ("kesin konum girilmedi" mevcut davranış), nötr
lisanslı görseller (ya da yalnız tipografik fallback); operasyon
kayıtları mevcut kurgusal içerikten taşınır. `DEMO-TR-SU` (ya da
kullanıcının seçtiği sektör): 3 tesis, 20 varlık, 1 çerçeve, sözlük
farkı görünür. Statik demo iki kiracı arasında salt okunur geçiş.
Bekçi test: seed/paket dosyalarında "Demo", "Saha A", gerçek
santral adları geçmez. **Uygulandı (P8 · 8 Eyl 2026):** liste dosya
değil, kod sabiti — `prisma/kurgusal-adlar.ts` (bekçi
`tests/bekci/kurgusal-adlar.test.ts`).

**Kapsam dışı.** Demo'nun gerçek kurulumu için veri (o kurulumda, bu
depoda değil).

**Kabul kriterleri.**
1. Bekçi test yeşil: gerçek ad/fotoğraf yok. [URN-DEMO-001]
2. İki demo kiracısı yüklendiğinde `/tesisler/[id]` başlığı birinde
   "Santral 360", diğerinde sözlüğe göre farklı. [URN-DEMO-002]
3. Demo verisi her ekranda "örnek veri" etiketiyle (mevcut demo uyarısı
   kalıbı). [URN-DEMO-003]

---

### P9 · Bağlayıcı SDK ve dış API sürümleme

**Alan kodu:** `URN-SDK` · **Etki:** orta · **Çaba:** orta ·
**Bağımlılık:** P2, R4

**Bugün.** Adaptör sözleşmesi (`lib/entegrasyon/sozlesme.ts`), 15 kontrollü
sertifikasyon harness'ı, `/api-sozlesmesi` ekranı, 10 `v1` ucu
(P1'de sektör terimleri temizlendi: `plants` → `facilities`, `plantCode`
→ `facilityCode`, `capacityMw` → `attributes` haritası),
`ApiAnahtari`.

**Hedef.** OpenAPI belgesi sözleşmeden üretilir; giden webhook
aboneliği; adaptör geliştirme kılavuzu ve harness dışa açılır; kiracı
adaptörü politikası uygulanır. **`v1` dondurma kararı K23'e bağlıdır**:
sözleşme, erişilebilir bir dağıtım ya da ilk dış `ApiAnahtari` ortaya
çıkana kadar **taslaktır**. P9 bu yüzden `v2` açmaz — temiz bir `v1`'in
üstüne SDK yayımlar.

**Kapsam.** OpenAPI 3.1 üretimi (`lib/api/sozlesme.ts` → `openapi.json`,
`/api-sozlesmesi` ekranı indirir); `v1` değişiklik bekçisi (sözleşme
anlık görüntüsü — K23 kapanana kadar değişikliği **bildirir**, kırmızı
yakmaz; K23 kapandıktan sonra kırılma → `v2`); `WebhookAboneligi` (kiracı × olay
türü × adres sır referansı × HMAC anahtarı sır referansı × etkin) +
`WebhookTeslimi` (3 deneme, dead-letter — R4 kalıbı); adaptör geliştirme
kılavuzu (`docs/ADAPTOR_GELISTIRME.md`) ve harness CLI (`arac/sertifika.mjs`);
kiracı adaptörü politikası: **varsayılan** yalnız ürün ekibince imzalı
adaptörler (paket olarak), kiracı verisi CSV/API/webhook ile girer.

**Kapsam dışı.** Dış kod çalıştırma sandbox'ı (karar sonrası); gelen
webhook (API zaten var).

**Kabul kriterleri.**
1. `openapi.json` `api.test.ts` uçlarıyla birebir (uç sayısı, metot,
   şema). [URN-SDK-001]
2. `v1` sözleşme anlık görüntüsü değişince test kırmızı. [URN-SDK-002]
3. Webhook teslimi HMAC imzalı; alıcı 5xx → 3 deneme → dead-letter.
   [URN-SDK-003]
4. Harness CLI bir örnek adaptörü 15 kontrolle raporlar; `uygulanamaz`
   gerekçeli. [URN-SDK-004]

---

## 3. Dalga 1 — Kurum içinde canlı olmak

Amaç: referans kiracının (Demo Enerji) örnek veriden gerçek uyum kaydına
dönmesi — Dalga 0 temeli üzerinde. Sıra: **R4 → R1 → R3 → R2** (R5 Dalga
0'a taşındı ve P2 ile birlikte yapılır). Her paket kiracı bağlamında ve
paket/sözlük katmanıyla uyumlu yazılır; aşağıdaki "Ürünleştirme notu"
satırları bunu paket başına söyler.

### R1 · Mevzuat radarı — değişikliği kendiliğinden yakalama

**Ürünleştirme notu.** Kaynak kataloğu koda sabit yazılmaz; P4 paket türü
`kaynak_katalogu` ile gelir (`TR` ilk; `EU` — EUR-Lex RSS/API, ENTSO-E;
`US` — Federal Register API, NERC sayfası — iskelet). Anahtar kelimeler
paket dilinde. `MevzuatKaynagi` kiracısız **katalog** kaydıdır; kiracı
`KiraciKaynak` ile etkinleştirir (etkin/kapalı kiracı başına). Adaylar
kiracıya aittir. Kaynak tek sefer taranır, adaylar ilgili kiracılara
dağıtılır (aynı içeriğe N istek yok).

**Alan kodu:** `MEV-RAD` · **Etki:** en yüksek · **Çaba:** orta ·
**Bağımlılık:** R4 (bildirim kanalı; yoksa yalnız uygulama içi bildirim)

**Bugün.** `RegulasyonKaynagi` (schema §UY-41): `adres`, `izlemeTuru`
(`elle | saglayici`; `saglayici` seçilemez), `kontrolAraligiGun`,
`sonKontrol`, `sonNot`. `lib/eylemler2/mevzuatKaynagi.ts` yalnız insanın
"baktım" kaydını yazar; ürün hiçbir siteye gitmez. Sürüm/fark motoru
(`lib/eylemler2/surum.ts`, `FrameworkSurumu`, `SurumFarki`) çalışır ama
girdisi elle gelir.

**Hedef.** Resmî bir kaynakta enerji BT/OT mevzuatını ilgilendiren bir
değişiklik yayımlandığında, aynı gün platformda "değişiklik adayı" olarak
görünür; insan onayıyla ilgili regülasyona bağlanır ve gerekirse yeni
sürüm taslağı açılır.

**Kapsam.**

*Veri modeli*
- `MevzuatKaynagi` (yeni; `RegulasyonKaynagi`'ndan ayrı — o, bir
  regülasyonun kaynağıdır; bu, taranan bir **yayın kanalı**dır):
  `kod` (unique), `ad`, `tur` (`rg_fihrist | sayfa_ozet | rss`), `adres`
  (belgelenmiş sabit; §0.2), `robotsDurumu` (`bilinmiyor | izinli |
  engelli`), `robotsKontrol` (DateTime?), `anahtarKelimelerJson`,
  `etkin` (varsayılan **false**), `sonTarama`, `sonBasariliTarama`,
  `sonHata`, `ardisikHata` (devre kesici, eşik 5).
- `MevzuatTaramasi` (yeni; her koşu bir satır): `kaynakId`, `zaman`,
  `httpDurum` (Int?), `icerikOzeti` (SHA-256), `oncekiOzet`,
  `farkVar: Boolean?` (**null = karşılaştırılamadı**, false = fark
  bulunmadı), `adaySayisi`, `hata`, `korelasyonId`.
- `MevzuatDegisiklikAdayi` (yeni): `kaynakId`, `taramaId`, `baslik`,
  `url`, `yayimTarihi` (DateTime?), `metinParcasi` (ilk 2 000 karakter,
  ham), `eslesenAnahtarlarJson`, `durum` (`yeni | incelemede |
  iliskilendirildi | yoksayildi`), `eslenenRegulasyonId?`,
  `uretilenSurumId?`, `kararVerenId?`, `kararZamani?`, `gerekce?`.
  `@@unique([kaynakId, url])` — aynı ilan iki kez aday olmaz.
- `RegulasyonKaynagi.izlemeTuru = 'saglayici'` artık seçilebilir; seçilince
  `mevzuatKaynagiId` bağı zorunlu.

*Kaynak kataloğu (belgelenmiş sabitler, `lib/mevzuat/kaynaklar.ts`)*
Resmî Gazete günlük fihristi (`rg_fihrist`; HTML kazıma, gün başına tek
sayfa) · EPDK mevzuat / duyuru / Yetkinlik Modeli sayfaları
(`sayfa_ozet`) · Siber Güvenlik Başkanlığı rehber ve duyuru sayfaları
(`sayfa_ozet`) · KVKK karar/duyuru sayfası (`sayfa_ozet`) · SPK haftalık
bülten sayfası (`sayfa_ozet`) · EPİAŞ duyuru RSS (`rss`). Adresler
kataloğa **açık URL** olarak yazılır; her satırın yanına "kamuya açık
resmî kaynak, §0.2" notu düşülür. Hukuk bürosu bültenleri kataloğa
**girmez**: kurum isterse `yonetici` ekler (ikincil kaynak).

*Motor* — `mevzuat_radari` (`lib/motorlar/mevzuatRadari.ts`), kayıt
defterine girer; zamanlayıcıda **günlük** (saatlik değil). Adımlar:
(1) `etkin` ve ortam anahtarı kontrolü; (2) `robotsDurumu` bilinmiyorsa
`robots.txt` oku ve yaz; `engelli` ise kaynağı atla, sebebini koşuya yaz;
(3) içeriği al, SHA-256 özetle, `MevzuatTaramasi` yaz; (4) fark varsa
tür-özel ayrıştırıcıyla (fihrist satırları / RSS öğeleri / sayfa
başlıkları) anahtar kelime süzgecinden geçen öğeleri **aday** yap;
(5) her aday için `Bildirim` (tip `mevzuat_adayi`) ve R4 varsa dış
kanal. Motor **hiçbir** `FrameworkSurumu` ya da `RegulasyonKaynagi`
kaydını değiştirmez.

*Eylemler* — `lib/eylemler2/mevzuatRadari.ts` (+ `.demo.ts`):
`kaynakEtkinlestir/kapat` (yönetici; gerekçe zorunlu), `adayIncele`
(durum → `incelemede`), `adayIliskilendir` (regülasyon seç; isteğe bağlı
"sürüm taslağı aç" → mevcut `surumOlustur` çağrılır, `uretilenSurumId`
yazılır), `adayYoksay` (gerekçe zorunlu), `taramaTetikle` (yönetici;
elle tek koşu; oran sınırına tabi).

*Ekranlar* — `/mevzuat-radari` (C · defter yönü önerilir): üst bant
kaynak sağlığı (etkin/kapalı · robots · son tarama · son fark), altta
aday kütüğü (durum işaretçili, mevcut kütük dili). Aday çekmecesi:
metin parçası, kaynak bağlantısı (yeni sekme), eşlenen anahtar
kelimeler, "ilişkilendir / yoksay". `/regulasyonlar` çerçeve satırına
"bu çerçeveyle ilişkili N aday" sayacı. `/saglik` platform sağlığına
motor satırı.

*Dışa aktarım* — aday kütüğü CSV (mevcut `lib/disaAktarim/csv.ts`).

**Kapsam dışı.** Metin içi fark (redline) görünümü (R14'e aday);
mevzuat metninin madde madde otomatik bölünmesi (R14); hukuk bürosu
bültenlerinin ürünle gelmesi; tarayıcı otomasyonu ile anti-bot atlatma;
Lexpera/Kazancı gibi abonelikli kaynaklar.

**Kabul kriterleri.**
1. Ortam anahtarı yok ya da kaynak `etkin=false` iken motor **hiçbir**
   HTTP isteği yapmaz; koşu kaydı `atlandi` sebebiyle yazılır. [MEV-RAD-001]
2. `robots.txt` ilgili yolu yasaklıyorsa kaynak `engelli` olur, istek
   yapılmaz, ekran "robots engelli — elle izleme" der. [MEV-RAD-002]
3. Aynı içerik iki gün üst üste alınırsa `farkVar=false` ve aday
   üretilmez; içerik alınamazsa `farkVar=null` ve hata yazılır — **false
   yazılmaz**. [MEV-RAD-003]
4. Fihrist fikstüründe "Enerji Piyasası Düzenleme Kurumu … Yönetmelik"
   satırı varsa tam olarak bir aday üretilir; aynı fikstür ikinci kez
   verildiğinde aday sayısı artmaz (idempotent). [MEV-RAD-004]
5. Anahtar kelime eşleşmeyen satır aday olmaz; eşleşen anahtarlar adayın
   üzerinde saklanır. [MEV-RAD-005]
6. `adayIliskilendir` yalnız `uyum`/`tanimlar` yazma yetkisiyle çalışır;
   okuyucu rolü reddedilir; işlem denetim izine gerekçeyle yazılır.
   [MEV-RAD-006]
7. "Sürüm taslağı aç" seçilince yeni `FrameworkSurumu` **taslak** açılır,
   aktif sürüm değişmez. [MEV-RAD-007]
8. Ardışık 5 hata devre kesiciyi açar; kaynak `hatali` görünür;
   `kimlik_bekleniyor`/`robots_engelli` sayacı artırmaz. [MEV-RAD-008]
9. Statik demo derlemesinde (`NEXT_PUBLIC_DEMO=1`) ekran açılır, kaynak
   kartları "demo: tarama yapılmaz" der; motor ve eylemler demo uyarısı
   verir. [MEV-RAD-009]
10. Otomasyon güvenliği anlık görüntüsü "mevzuat radarı sürüm
    aktifleştirmez / regülasyon kaydı değiştirmez" kuralını **ölçer**.
    [MEV-RAD-010]

**Testler.** `tests/mevzuat-radari.test.ts` (motor, ayrıştırıcılar —
her kaynak türü için en az bir fikstür: `tests/fikstur/mevzuat/rg-fihrist-
ornek.html`, `epdk-sayfa-ornek.html`, `epias-rss-ornek.xml`; fikstürler
**gerçek sayfadan kopyalanmaz**, yapıyı taklit eden kısa el yapımı
örneklerdir), `tests/mevzuat-radari-eylem.test.ts` (yetki/negatif),
motor defteri testi güncellenir, sabotaj kütüğüne "motor sürüm
aktifleştirdi" kuralı eklenir. Ağa çıkan test → kırmızı (mevcut `http.ts`
sahte istemcisi kullanılır).

**Belgeler.** `docs/VERI_NEREDEN_GELIR.md` (yeni bölüm: mevzuat
değişikliği nereden gelir), `docs/ROTA_HARITASI.md`, `README.md` modül
listesi, `docs/TERIMLER_SOZLUGU.md` ("değişiklik adayı", "yayın
kanalı").

**Kararlar.**
- *Kaynak kataloğu ürünle gelsin mi?* **Varsayılan: evet, kapalı gelir**
  (§0.2). Alternatif: kurum girer — o zaman katalog yalnız şablon olur.
- *EPDK sitesi anti-bot (418) veriyorsa?* **Varsayılan:** kaynak
  `engelli` kalır, elle izleme sürer; kurum EPDK ile resmî abonelik/RSS
  imkânını araştırır. Atlatma **yapılmaz**.
- *Fihristin tamamı mı, yalnız eşleşenler mi saklansın?* **Varsayılan:**
  yalnız özet + eşleşen satırlar; tam sayfa saklanmaz.

---

### R2 · Kontrol içeriğini gerçek boyutuna getirme

**Ürünleştirme notu.** Bu paket artık "içe aktarım şablonu" değil,
**içerik paketi üretimi**dir (P4): `TR-ENERJI` paketinin OSCAL + uzantı
dosyaları ve `DegerlendirmeAktarimi` şablonu. Metin yine kurumdan gelir
(§0.1). Referans kiracı Demo kendi kurulumunda kurar; depoya paket
**iskeleti** ve doğrulayıcı girer; kamu metni (EPDK, BİGR, SPK, KVKK)
paket içeriği olarak eklenebilir; ISO yalnız kimlik+başlık.

**Alan kodu:** `ICE-MAD` · **Etki:** en yüksek · **Çaba:** düşük (kod) /
yüksek (içerik — yazılım işi değil) · **Bağımlılık:** yok; içerik
dosyaları kurumdan.

**Bugün.** `Madde` 25 alanlı, hiyerarşik, sürümlü; `/ice-aktarim`
madde aktarımı var (`IceAktarim`); `DegerlendirmeAktarimi` (UY-43)
değerlendirme sonucu aktarımı var. Örnek veride 38 madde: EPDK-SYM 27
(bölüm başlıkları dâhil), CBDDO 4, ISO-27001 4, SPK-BS 3; 8 çapraz
denklik. Gerçek Yetkinlik Modeli: 13 kontrol alanı × 3 seviye + sektör
eki (Ek-2 elektrik üretim); ISO 27001:2022: 93 kontrol / 4 tema.

**Hedef.** Kurum, resmî kaynak dosyalarını `belge/mevzuat/` altına
koyduğunda dört çerçevenin tam madde seti, sürümleriyle (EPDK için 2023 ·
2024 · 2025 ayrı sürümler) ve seviye/alan bilgisiyle içe alınır; son üç
yılın denetim sonuçları değerlendirme olarak yüklenir.

**Kapsam.**
- **Şablonlar:** çerçeve başına içe aktarım şablonu (`belge/mevzuat/
  sablon/EPDK-SYM.xlsx`, `ISO-27001-2022.xlsx`, `BIGR.xlsx`,
  `SPK-VII-128-9.xlsx`, `KVKK.xlsx`) — sütunlar `Madde` alanlarıyla
  birebir: `kod · ustKod · baslik · metin · alanAdi · altAlan ·
  olgunlukSeviyesi(hedef) · zorunlulukTipi · gereksinimTipi · kanitTipi ·
  kanitBeklentisi · degerlendirmeRehberi · kaynakSayfa · gecerliBaslangic`.
  EPDK şablonuna ek sütun: `seviye (1|2|3|ek)`, `sektorEki (EK-2 …)`,
  `kritiklikSinifi`. Şablonlar **boş** gelir; yalnız başlık satırı ve
  bir açıklama sayfası (`docs/ICERIK_DOLDURMA_REHBERI.md`'nin özeti).
- **Doğrulayıcı:** `/ice-aktarim` önizlemesine kural seti: boş `metin`
  (ISO hariç) → uyarı; `ustKod` çözülmüyor → hata; aynı sürümde çift
  `kod` → hata; `olgunlukSeviyesi` 0-5 dışı → hata; EPDK `seviye` boş
  → hata. Hata listesi ekranda; onay olmadan yazılmaz (mevcut kalıp).
- **Sürüm akışı:** EPDK için üç sürüm ayrı ayrı içe alınır (2023 temel,
  2024 ekler, 2025 denetçi değişikliği); her biri `FrameworkSurumu`
  taslağı → `surumAktiflestir` → `SurumFarki`. Böylece fark motoru
  geçmişi gösterir. ISO 27001:2013 → 2022 geçişi aynı yolla (2013 yalnız
  kimlik+başlık).
- **Uyum sınıfı eşlemesi:** EPDK'nın Tam / Kısmi / Uyumsuz / Kapsam Dışı
  sınıfları `uyumlu / kismi / uyumsuz / kapsamdisi` ile birebir; ekranda
  EPDK süreçlerinde etiket **EPDK sözcükleriyle** gösterilir
  (`lib/sabitler.ts` etiket sözlüğüne çerçeve bazlı takma ad).
- **Değerlendirme aktarımı:** son 3 yılın denetim sonuçları için
  `DegerlendirmeAktarimi` şablonu (`surec · madde kodu · tesis kodu ·
  durum · guven · kanıt referansı · tarih · not`); geçmiş yıllar ayrı
  süreç (`EPDK-SYM-2024`, `EPDK-SYM-2025`) olarak açılır; `UyumAnlik`
  geçmişe dönük **üretilmez** (ölçülmemiş anlık uydurulmaz), yalnız
  değerlendirme tarihçesi taşınır.
- **Belge:** `docs/ICERIK_DOLDURMA_REHBERI.md` — hangi resmî belgeden
  hangi sütun nasıl doldurulur; telif notu; sürüm sırası; kim onaylar.

**Kapsam dışı.** Madde metinlerinin yazılması (§0.1); LLM ile metin
bölme (R14); çapraz eşleme üretimi (R6).

**Kabul kriterleri.**
1. Şablon dosyaları depoda vardır, başlık satırı `Madde` alanlarıyla
   birebir eşleşir (test sütun adlarını şemadan türetir). [ICE-MAD-001]
2. Boş `metin` ISO dışı çerçevede uyarı, ISO'da uyarı **değil**; ekran
   ISO maddesinde "metin lisans nedeniyle girilmedi" der. [ICE-MAD-002]
3. Çözülmeyen `ustKod` içe aktarımı **tamamen** durdurur; kısmi yazma
   olmaz (transaction). [ICE-MAD-003]
4. Aynı çerçeveye ikinci sürüm içe alındığında fark motoru
   `yeni/degisti/kaldirildi/ayni` sayılarını üretir ve eski sürüm
   `arsiv` olur. [ICE-MAD-004]
5. EPDK süreçlerinde durum etiketi "Kapsam Dışı" olarak görünür; toplama
   mantığı değişmez (`kapsamdisi` iki paydadan düşer). [ICE-MAD-005]
6. Geçmiş yıl değerlendirme aktarımı `UyumAnlik` satırı **üretmez**;
   ekran o yıl için "anlık ölçülmedi" der. [ICE-MAD-006]
7. Örnek veri (`seed*.ts`) değişmez; seed'in "örnek katalog" olduğu
   `web/PRODUCT.md` Evidence on Hand bölümünde yazılıdır. [ICE-MAD-007]

**Testler.** `tests/ice-aktarim-sablon.test.ts`, `tests/ice-aktarim-
dogrulayici.test.ts` (negatif ağırlıklı), `tests/surum-cok-sirali.test.ts`
(üç ardışık sürüm), `tests/degerlendirme-aktarim-gecmis.test.ts`.

**Kararlar.**
- *Sürüm etiketi biçimi:* **Varsayılan** `2023-06 · RG 32213`, `2024-09 ·
  RG 32656`, `2025-11 · RG 33088` (Resmî Gazete sayısı etikette).
- *Kim doldurur:* içerik kurumun uyum sorumlusunun işidir; Claude Code
  şablon, doğrulayıcı ve rehberi yapar, **içeriği yazmaz**.

---

### R3 · İlk gerçek bağlayıcı, kanıt dosyalarının yedeği, zaman damgası

**Alan kodu:** `KAN-YED` (yedek) · `KAN-IMZ` (imza) · **Etki:** yüksek ·
**Çaba:** orta

**Bugün.** Adaptörlerin çoğu `kimlik_bekleniyor` (güncel sayı için
`lib/uyum/disSaglayicilar.ts`); bağlantı **kurulum** işidir
(`INTEGRATION_DAY_RUNBOOK.md`) ve Claude Code'un işi **değildir**
(gerçek kimlik gerekir). Kanıt dosyası deposu **var** (UY-13,
`lib/uyum/kanitDeposu.ts`: yerel dosya, içerik adresli, SHA-256, izinli
MIME listesi; `kanitDosyasiYukle` eylemi). Ancak ürünün kendi yedeği
(`arac/yedek.mjs`) yalnız veritabanını alır; `docs/URUN_YEDEKLEME.md`
hâlâ "kanıt dosyası yok" der (**bayat**).
İmza: `lib/uyum/disSaglayicilar.ts` `imza` ailesinde yalnız `kms_hsm`,
`bagli:false`; paket `imzasiz`.

**Hedef.** Kanıt dosyaları ürün yedeğinin ve geri yükleme tatbikatının
parçasıdır; kanıt paketi, bağlı bir zaman damgası sağlayıcısı varsa
RFC 3161 damgası taşır; SIEM bağlantısı için kurumun yapacağı adımlar
tek sayfada hazırdır.

**Kapsam.**
- **Yedek:** `arac/yedek.mjs --al` veritabanıyla birlikte
  `KANIT_DEPO_KOKU` altındaki depoyu alır (tar + manifest: anahtar,
  boyut, özet); `--karsilastir` manifestteki özetleri `Kanit.dosyaHash`
  ile karşılaştırır ve eksik/çürük dosyayı listeler; `--geri-yukle`
  tatbikatı dosyaları da doğrular. `tests/yedek-araci.test.ts` genişler.
- **Belge düzeltme:** `docs/URUN_YEDEKLEME.md` ("kanıt dosyaları bugün
  yok" satırları kaldırılır, yeni kapsam yazılır).
- **Zaman damgası sağlayıcısı:** `imza` ailesine `rfc3161` üyesi:
  `gereken`: TSA adresi, hesap (sır referansı), sertifika zinciri;
  `bagliDegilkenDavranis`: mevcut `imzasiz` davranışı. Bağlıyken paket
  gövdesinin SHA-256'sı TSA'ya gönderilir (**gövde gönderilmez**), dönen
  token pakete `imza: { tur:'rfc3161', tsa, zaman, token }` olarak eklenir;
  doğrulama yardımcı fonksiyonu (`imzaDogrula`) çevrimdışı çalışır.
  KamuSM zaman damgası adresi belgelenmiş kamuya açık sabit olarak
  yazılabilir (§0.2); hesap sırdır.
- **SIEM bağlantı sayfası:** `INTEGRATION_DAY_RUNBOOK.md` §3.4'ten kurum
  için tek sayfalık kontrol listesi üretilir (`docs/ILK_BAGLANTI_SIEM.md`):
  istenecek salt okunur hesap, sorgu kapsamı, poll aralığı, kuru koşu
  çıktısının nasıl okunacağı. **Kod yazılmaz; kimlik istenmez.**

**Kapsam dışı.** Adaptörlerin `fetchChanges/normalize` gövdeleri (gerçek
yanıt olmadan yazılmaz — mevcut karar); S3 uyumlu nesne deposu (ayrı
paket adayı; `saglayicilar.ts` "bağlı değil" kalır); antivirüs taraması
(ürün dosyayı yorumlamaz — mevcut karar; kurumun uç nokta koruması
depo kökünü tarar, belgeye yazılır).

**Kabul kriterleri.**
1. `yedek.mjs --al` çıktısı veritabanı + depo arşivi + manifest içerir;
   manifestte her dosyanın özeti vardır. [KAN-YED-001]
2. Depo kökünden bir dosya silindiğinde `--karsilastir` onu **adıyla**
   listeler ve çıkış kodu sıfır olmaz. [KAN-YED-002]
3. Depo kökü tanımsız ya da boşken araç "kanıt dosyası yok" **yazmaz**;
   "depo kökü: <yol>, dosya: 0" yazar. [KAN-YED-003]
4. `rfc3161` sağlayıcısı bağlı değilken paket `imzasiz` kalır ve üretim
   durmaz (mevcut davranış korunur). [KAN-IMZ-001]
5. Sahte TSA ile testte paket `imza.tur='rfc3161'` taşır; `imzaDogrula`
   gövde değişince `dogrulanamadi` döner. [KAN-IMZ-002]
6. TSA'ya paket gövdesi **gönderilmez**; yalnız özet gider (istek
   yakalayıcı test). [KAN-IMZ-003]
7. Bayat belge cümleleri kalkmıştır; `arac/sayimlar.mjs` belge
   sayımları yeşildir. [KAN-YED-004]

**Kararlar.**
- *TSA:* **Varsayılan** KamuSM (kamu), alternatif kurumun e-imza
  sağlayıcısının TSA'sı. Hesap `sirReferansi` ile.
- *Depo kökü yedekte şifrelensin mi?* **Varsayılan:** hayır; yedek
  ortamının şifrelemesi kurumun işidir, belgeye yazılır.

---

### R4 · Bildirim kanalları: e-posta ve Teams

**Alan kodu:** `BIL-KAN` · **Etki:** pazar standardı · **Çaba:** düşük

**Bugün.** `Bildirim`, `Gorev`, `OnayTalebi`, `EskalasyonKurali/Kaydi`
yalnız uygulama içi kutuya düşer (`/bildirimler`). SMTP/Teams/webhook
**yok**. `lib/is/kuyruk.ts` sağlayıcı defteri var (`dis` bağlı değil).
Sır katmanı `lib/entegrasyon/sir.ts`.

**Hedef.** Kullanıcı kanal tercihini seçer; görev, termin, eskalasyon,
onay talebi ve mevzuat adayı e-posta ve/veya Teams'e düşer; teslim
edilemeyen bildirim görünür kalır.

**Kapsam.**
- *Veri modeli:* `BildirimKanali` (`kullaniciId`, `tur` (`eposta |
  teams`), `adres` (e-posta) / `webhookSirReferansi` (Teams; adres sırdır,
  değeri saklanmaz), `etkin`, `dogrulandi: Boolean?` — **null =
  doğrulanmadı**, `gunlukOzet: Boolean`), `BildirimTeslimi`
  (`bildirimId`, `kanalId`, `durum` (`bekliyor | gonderildi | basarisiz |
  vazgecildi`), `deneme`, `sonHata`, `korelasyonId`, `zaman`).
- *Sağlayıcılar:* `lib/bildirim/saglayicilar.ts` — `smtp` (host/port/TLS
  yapılandırma, kimlik `sirReferansi`), `teams_webhook`. İkisi de
  `bagli:false` gelir; yapılandırma şeması beyan eder (mevcut
  `yapilandirmaSemasi` kalıbı). Demo derlemesinde her ikisi kapalı.
- *Gönderim:* iş kuyruğundan; üstel geri çekilme (mevcut 1s/4s/16s);
  3 denemeden sonra `vazgecildi` ve `/bildirimler`'de "teslim edilemedi"
  işaretçisi; `gonderildi` yalnız sağlayıcı kabul ettiyse yazılır.
- *İçerik:* şablonlar Türkçe, olgu diliyle ("12 gün gecikmiş", "kritik!"
  değil); **sır, OT adresi, kanıt içeriği** e-postaya yazılmaz — yalnız
  başlık, tarih ve ürün içi bağlantı. Sır süzgeci gönderim öncesi koşar.
- *Ekran:* `/ayarlar` içine "Bildirim kanallarım" bölümü (kanal ekle,
  doğrulama e-postası gönder, günlük özet); `/yonetim-tezgahi`'na
  sağlayıcı kartları (bağlı/değil, son hata); `/bildirimler` satırında
  teslim işaretçisi.

**Kapsam dışı.** SMS; anlık mesaj dışındaki Teams botu; kullanıcı
yanıtını e-postadan alma; bildirim içinde eylem düğmesi.

**Kabul kriterleri.**
1. Sağlayıcı bağlı değilken kanal eklenebilir ama "doğrulanmadı" kalır;
   gönderim denenmez, kuyrukta `bekliyor` durmaz — `vazgecildi` ve
   "sağlayıcı bağlı değil" sebebiyle yazılır. [BIL-KAN-001]
2. Gönderilen içerikte `sirReferansi`, IP adresi, kanıt metni bulunmaz
   (süzgeç testi). [BIL-KAN-002]
3. Sahte SMTP kabul ederse `gonderildi`, 5xx dönerse tekrar denenir, 3'te
   `vazgecildi`; her deneme kayıtlıdır. [BIL-KAN-003]
4. Kullanıcı kanalını kapatınca o kanala kuyruklanmış bildirimler
   `vazgecildi` olur, uygulama içi bildirim kalır. [BIL-KAN-004]
5. Demo derlemesinde kanal ekleme "demo" uyarısı verir. [BIL-KAN-005]

**Kararlar.** *Teams webhook adresi sır mı?* **Varsayılan: evet**
(webhook adresi gönderme yetkisi taşır) → `sirReferansi`.

---

## 4. Dalga 2 — Pazar standardını yakalamak, OT'de öne geçmek

Sıra önerisi: **R12 → R10 → R11 → R6 → R7 → R8 → R9** (R12 ve R10
içerikle hemen değer üretir; R6 SCF içe aktarımı ister; R7–R9 OT
derinliği).

### R6 · Ortak kontrol çatısı: SCF içe alma ve STRM eşleme

**Ürünleştirme notu.** SCF `INT-SCF` paketi, eşlemeler `esleme` türü
paketlerdir (`TR-ENERJI→SCF`, `ISO27001→SCF`). Türetilmiş durum kiracı
içinde hesaplanır. Eşleme paketleri hub'dan yayınlanır, kiracı kurar;
kiracının kendi eşlemeleri paketten ayrı tutulur ve paket güncellemesi
onları **ezmez**.

**Alan kodu:** `ESL-SCF` · **Etki:** yüksek · **Çaba:** orta ·
**Bağımlılık:** R2 (madde setleri)

**Bugün.** `MaddeEslestirmesi` (`kaynakId · hedefId · denklik: tam |
kismi | ilgili`), 8 elle denklik, `/eslestirme` yalnız yaprak maddeye
izin verir. Uyum toplama çerçeve içidir.

**Hedef.** SCF (Secure Controls Framework, Creative Commons) beşinci
çerçeve olarak içe alınır; EPDK/BİGR/SPK/ISO maddeleri SCF'ye NIST IR
8477 ilişki türleriyle eşlenir; bir çerçevede yapılan değerlendirme
diğerinde **türetilmiş** durum olarak görünür, ayrı güven seviyesiyle.

**Kapsam.**
- *İçe aktarım:* SCF'nin yayımladığı OSCAL JSON / XLSX (kurum indirir,
  `belge/mevzuat/scf/` altına koyar — lisans CC, dosya depoya
  **girmez**, `.gitignore`); `/ice-aktarim`'a OSCAL katalog yolu
  (`catalog.groups[].controls[]` → `Madde`, `props` → alan/alt alan).
- *Model:* `MaddeEslestirmesi` genişler: `iliskiTuru` (`alt_kume |
  kesisim | esit | ust_kume | iliskisiz`), `guc` (Int? 1–10; **null =
  belirtilmedi**), `kaynakBelge` (eşlemenin dayandığı belge — SCF STRM
  dosyası ya da kurum kararı), `onaylayanId`. Mevcut `denklik` alanı
  korunur ve `iliskiTuru`'ndan türetilebilir (`esit→tam`,
  `alt_kume|ust_kume|kesisim→kismi`).
- *Türetilmiş durum:* `lib/uyum/turetilmis.ts` — bir maddenin
  değerlendirmesi yoksa ama `esit` ya da `ust_kume` ilişkili maddenin
  değerlendirmesi varsa ekranda **türetilmiş** durum gösterilir; yeni
  güven seviyesi `turetilmis_esleme` (`GUVEN_SEVIYELERI`'ne eklenir;
  sıralamada `oz_degerlendirme`nin altında). Türetilmiş durum
  `MaddeDurumu` satırı **yazmaz** (kayıt değil, görünüm); yüzdeye
  **katılmaz** — ayrı sayaç ("N madde türetilmiş durum taşıyor").
- *Ekran:* `/eslestirme` ilişki türü + güç + kaynak belge; `/uyum/[cerceve]`
  madde satırında "türetilmiş" işaretçisi ve kaynağı; SCF STRM
  içe aktarımı için önizleme.
- *Kanıt paketi:* türetilmiş durumlar pakete **girmez**; yalnız gerçek
  değerlendirmeler ve eşleme tablosu girer.

**Kapsam dışı.** Eşlemenin otomatik üretimi (R14 öneri katmanı);
UCF (ticari); türetilmiş durumun `MaddeDurumu`'na yazılması.

**Kabul kriterleri.**
1. OSCAL katalog fikstürü (kısa, el yapımı) içe alındığında grup →
   üst madde, kontrol → yaprak madde olur; `disKontrolId` SCF kimliğini
   taşır. [ESL-SCF-001]
2. `iliskiTuru='esit'` ile bağlı maddede değerlendirme varsa hedef madde
   ekranda türetilmiş görünür; yüzdeye katılmaz; `bilinmeyen` sayısı
   **değişmez**. [ESL-SCF-002]
3. `kesisim` ilişkisi türetilmiş durum **üretmez** (yalnız `esit` ve
   `ust_kume`). [ESL-SCF-003]
4. Bölüm başlığı (çocuğu olan madde) eşlenemez — mevcut kural korunur.
   [ESL-SCF-004]
5. Türetilmiş durum kanıt paketine girmez; eşleme tablosu girer.
   [ESL-SCF-005]
6. Uyum semantiği sabitleri (`GUVEN_SEVIYELERI`) değiştiği için etkilenen
   tüm testler güncellenir; `turetilmis_esleme` `denetci_dogrulamis`
   sayılmaz. [ESL-SCF-006]

**Kararlar.** *Türetilmiş durum "kısmi" mi "uyumlu" mu gösterilir?*
**Varsayılan:** kaynak maddenin durumu aynen, ama işaretçi farklı ve
güven `turetilmis_esleme`; yüzdeye katılmaz.

---

### R7 · Güvenlik duvarı kural analizi ve segmentasyon doğrulama

**Alan kodu:** `TOP-KUR` · **Etki:** yüksek (OT) · **Çaba:** orta-yüksek

**Bugün.** `AgBolgesi` (tip, `guvenlikSeviyesi` Purdue), `AgGeciti`
(kaynak/hedef bölge, `kontrolVarligi`, `protokoller`, `onaylandi`),
`TopolojiSapmasi` 10 tip. `network_firewall` adaptörü yalnız ARP/DHCP/MAC
okur; kural seti okumaz. Adaptör yasakları: hiçbir yazma, konfig push
yok.

**Hedef.** Kurumun dışa aktardığı güvenlik duvarı kural seti salt okunur
içe alınır; kurallar onaylı geçit modeliyle karşılaştırılır; onaysız yol
ve aşırı izinli kural sapma olarak düşer.

**Kapsam.**
- *Model:* `KuralSeti` (`varlikId` (güvenlik duvarı varlığı), `alinma`,
  `kaynakDosyaAdi`, `icerikOzeti`, `uretici` (`panos | fortios |
  cisco_asa | cisco_ios | generic_csv`), `kuralSayisi`, `kokenId`),
  `GuvenlikDuvariKurali` (`kuralSetiId`, `sira`, `ad`, `kaynakAdresler`,
  `hedefAdresler`, `servisler`, `eylem` (`izin | engel`), `etkin`,
  `hamMetin`, `kaynakBolgeId?`, `hedefBolgeId?` (adres → segment → bölge
  çözümü; çözülmezse **null**)).
- *Ayrıştırıcılar:* `lib/ag/kural/` — PAN-OS XML (`security rules`),
  FortiOS `config firewall policy`, Cisco ASA `access-list`, genel CSV.
  Ayrıştırıcı yalnız **dosya** okur; cihaza bağlanmaz.
- *Motor:* `kural_analizi` (kayıt defterine): her kural için
  kaynak/hedef bölge çözümü; onaylı `AgGeciti` yoksa
  `TopolojiSapmasi.tip='onaysiz_yol'`; kaynak veya hedef `any` ve eylem
  `izin` ise `asiri_izinli_kural`; bölge çözülemeyen kural
  `cozulemeyen_kural` (bilinmeyen, sapma değil — ayrı sayaç). BT bölgesinden
  OT bölgesine `izin` ve onaylı geçit yok → şiddet `kritik`, mevcut
  `yeni_bt_ot_koprusu` ile ilişkilendirilir.
- *Ekran:* `/topoloji` tezgâhına "kural analizi" sekmesi: kural seti
  listesi (tarih, üretici, kural sayısı, çözülemeyen), geçit × kural
  matrisi, sapma çekmecesinde kuralın ham metni. NP-View'in "sahte
  denetim" raporu benzeri özet: geçit başına izinli/onaysız kural sayısı.
- *İçe aktarım:* `manual_import` hattı üzerinden dosya yükleme (kural
  seti dosyası kanıt deposuna **kanıt olarak da** eklenebilir).

**Kapsam dışı.** Cihazdan canlı çekme (adaptör yasağı sürer — kurumun
FW yönetim aracından dışa aktarım okunur); kural değişikliği önerisi
üretme; NAT/VPN politikaları.

**Kabul kriterleri.**
1. Fikstür PAN-OS XML'den N kural ayrıştırılır; sıra ve eylem korunur;
   çözülemeyen adres `kaynakBolgeId=null` olur. [TOP-KUR-001]
2. Onaylı geçidi olmayan bölge çifti için `izin` kuralı `onaysiz_yol`
   sapması üretir; onaylı geçit varsa üretmez. [TOP-KUR-002]
3. `any→any izin` kuralı `asiri_izinli_kural`; `engel` kuralı sapma
   üretmez. [TOP-KUR-003]
4. Bölgesi çözülemeyen kural sapma **değil**, "çözülemeyen" sayacına
   girer; toplamda bilinmeyen olarak taşınır. [TOP-KUR-004]
5. Motor `AgGeciti.onaylandi`'yi **değiştirmez**; sapma kabulü insan
   eylemidir (mevcut kural). [TOP-KUR-005]
6. Adaptör yasak listesi (`AKTIF_ISLEM_YASAK`) değişmez; kural seti için
   hiçbir HTTP/SSH istemcisi eklenmez (içerik tarayan bekçi test).
   [TOP-KUR-006]

**Kararlar.** *Adres → bölge çözümü:* **Varsayılan** `AgSegmenti` CIDR
eşleşmesi; eşleşmezse null. Alias/adres-grubu çözümü yalnız aynı dosya
içinde.

---

### R8 · Konfigürasyon ve proje dosyasından envanter zenginleştirme

**Alan kodu:** `KES-DOS` · **Etki:** yüksek (OT) · **Çaba:** orta

**Bugün.** `KonfigurasyonYedegi` modeli ve `lib/entegrasyon/konfigYedek.ts`
var; ayrıştırıcı yok. `KesifKaydi.kaynak` 9 tür; `Varlik.firmware`,
`firmwareYapisi`, `seriNo`, `model`, `uretici`; `VeriKokeni.guven`.
Pasif ilke: OT ağına paket yok.

**Hedef.** Zaten alınan konfigürasyon yedekleri ve proje dosyası dışa
aktarımları okunarak firmware, seri no, model, modül yapısı keşif
kuyruğuna **gözlem** olarak düşer; insan onayıyla envantere yazılır.

**Kapsam.**
- *Ayrıştırıcılar* (`lib/varlik/dosyaAyristirici/`): (a) ağ cihazı
  `show version` / `show inventory` metin çıktısı (Cisco IOS, FortiOS
  `get system status`), (b) OT platformu CSV dışa aktarımı (Claroty /
  Nozomi sütun adları — adaptör başlıklarındaki eşleme alanları
  kullanılır), (c) Siemens TIA "donanım kataloğu dışa aktarımı" CSV /
  Rockwell Studio 5000 "controller organizer" CSV/XML dışa aktarımı.
  Tescilli ikili proje dosyaları (`.ap1x`, `.ACD`) **açılmaz** — yalnız
  aracın kendi dışa aktarımı.
- *Model:* `KesifKaydi.kaynak`'a `konfig_dosyasi | proje_disa_aktarimi`;
  `KonfigurasyonYedegi`'ne `ayristirildi: Boolean?`, `ayristirmaOzeti`.
- *Akış:* dosya → ayrıştırıcı → `Gozlem` (mevcut sözleşme) →
  `manual_import` hattı → keşif kuyruğu (eşleştirme + güven skoru) →
  insan onayı → `Varlik` alanları + `VeriKokeni` (`kokenTipi='otomatik'`,
  `guven` dosya türüne göre sabit tablo; ölçülmediyse null).
- *Motor etkisi:* `zafiyet_korelasyonu` daha kesin firmware ile çalışır;
  `firmware_uyumu` (OT-22) taban karşılaştırmasında `firmwareYapisi`
  kullanır.
- *Ekran:* `/kesif` kuyruğuna kaynak işaretçisi; `/yedekleme` konfig
  yedeği satırına "ayrıştırıldı / ayrıştırılamadı (sebep)".

**Kapsam dışı.** İkili proje dosyası ayrıştırma; PLC'ye bağlanma; dosya
içeriğinin kanıt olarak otomatik bağlanması.

**Kabul kriterleri.**
1. Cisco `show version` fikstüründen model, seri no, sürüm çıkar; eksik
   alan null kalır (`0`/boş değil). [KES-DOS-001]
2. Ayrıştırılamayan dosya `ayristirildi=false` + sebep; **sessiz atlama
   yok**. [KES-DOS-002]
3. Aynı dosya iki kez → keşif kuyruğunda tek kayıt (idempotency,
   `kaynakKayitId` = dosya özeti + satır anahtarı). [KES-DOS-003]
4. Keşif kaydı **otomatik onaylanmaz**; envanter yazımı insan onayı
   ister (mevcut kural, yeni kaynakta yeniden ölçülür). [KES-DOS-004]
5. Yeni kaynak türleri için `AKTIF_ISLEM_YASAK` bekçisi yeşil; hiçbir
   ayrıştırıcı ağ istemcisi içermez. [KES-DOS-005]

**Kararlar.** *Güven sabitleri:* **Varsayılan** proje dışa aktarımı
0.9, ağ cihazı çıktısı 0.8, OT platformu CSV 0.7 (kurum değiştirebilir;
`lib/varlik/dosyaAyristirici/guven.ts`).

---

### R9 · IEC 62443 bölge güvenlik seviyesi (SL-T / SL-A)

**Alan kodu:** `BOL-SL` · **Etki:** yüksek (OT) · **Çaba:** orta ·
**Bağımlılık:** R2 (62443-3-3 kimlik+başlık seti — metin lisanslı, §0.1)

**Bugün.** `AgBolgesi.guvenlikSeviyesi` (Purdue), `AgGeciti`.
`MaddeDurumu` santral × madde × süreç bazlı; bölge boyutu yok. Olgunluk
hedef/ölçülen ayrımı `lib/uyum/olgunluk.ts`.

**Hedef.** Her bölge için hedef güvenlik seviyesi (SL-T 1–4) tanımlanır;
62443-3-3 sistem gereksinimleri bölge bazında değerlendirilir; ölçülen
seviye (SL-A) türetilir; eksik gereksinimler listelenir.

**Kapsam.**
- *Çerçeve:* `IEC-62443-3-3` regülasyonu — 7 FR (üst madde) × SR'ler
  (yaprak); **yalnız kimlik + kısa başlık** (lisans); her SR için hangi
  SL'lerde zorunlu olduğu `zorunlulukSeviyeleriJson` (ör. `[1,2,3,4]`)
  ve RE'ler (enhancement) alt yaprak. İçe aktarım şablonu R2 kalıbıyla.
- *Model:* `AgBolgesi.hedefSL` (Int? 1–4; **null = belirlenmedi**),
  `BolgeDegerlendirmesi` (yeni; `bolgeId · maddeId · durum · guven ·
  sorumluId · dogrulayanId · sonDegerlendirme · not`; unique çift).
  `MaddeDurumu`'nun santral ekseni **bozulmaz**.
- *Hesap:* `lib/uyum/guvenlikSeviyesi.ts` — `olculenSL(bolge)`: hedef
  seviyeye kadar zorunlu tüm SR'ler `uyumlu` ise o seviye; ilk `uyumsuz`
  ya da `degerlendirilmedi` SR'de durur ve **hangi SR'de durduğunu**
  döner. `degerlendirilmedi` varsa sonuç `null` + "ölçülmedi: N SR
  değerlendirilmedi" — kısmi puan **verilmez**.
- *Ekran:* `/topoloji` bölge çekmecesine "Güvenlik seviyesi: hedef 2 ·
  ölçülen — (3 SR değerlendirilmedi)"; `/uyum/IEC-62443-3-3` bölge
  sütunlu matris (santral yerine bölge).
- *Kanıt paketi:* bölge değerlendirmeleri ayrı bölüm olarak girer.

**Kapsam dışı.** 62443-3-2 risk değerlendirme iş akışı (ayrı paket
adayı); 62443-2-1 (program) — EPDK modeliyle örtüşür, R6 eşlemesiyle
çözülür; 62443-4-2 bileşen gereksinimleri.

**Kabul kriterleri.**
1. Hedef SL 2 olan bölgede SL1+SL2 zorunlu tüm SR `uyumlu` → ölçülen 2;
   biri `uyumsuz` → ölçülen 1 ve duran SR adı döner. [BOL-SL-001]
2. Herhangi bir zorunlu SR `degerlendirilmedi` ise ölçülen **null**;
   ekran "ölçülmedi" der, sıfır ya da alt seviye **göstermez**. [BOL-SL-002]
3. `hedefSL=null` bölgede hesap çalışmaz; ekran "hedef belirlenmedi".
   [BOL-SL-003]
4. Dört göz: `BolgeDegerlendirmesi.dogrulayanId ≠ sorumluId` sunucuda
   zorlanır (mevcut kalıp). [BOL-SL-004]
5. 62443 maddelerinde `metin` boş, ekran lisans notunu gösterir.
   [BOL-SL-005]

---

### R10 · Olay → regülatif bildirim akışı

**Ürünleştirme notu.** Yükümlülükler `yukumluluk` türü paketten gelir
(`TR-ENERJI`: 7545, EPDK SOME, KVKK 72s, SPK; `EU-NIS2`: 24s/72s/1 ay;
`US-NERC-CIP`: CIP-008). Merci adı ve kanal notu paket dilinde. Süre
`null` kuralı her ülke için aynı.

**Alan kodu:** `OLY-BIL` · **Etki:** yüksek (TR) · **Çaba:** düşük-orta

**Bugün.** `Olay` + ilişki tabloları, `olay_etki` motoru;
`BildirimYukumlulugu` (`asgariSiddet`, `sureSaat`, `dayanak`, `merci`);
`bildirim_suresi` motoru yalnız `Gorev` üretir, "bildirildi" **yazmaz**.

**Hedef.** Olay açıldığında geçerli yükümlülükler listelenir, her biri
için geri sayım ve mercinin istediği alanlarla **taslak** hazırlanır;
insan gönderir ve gönderim kaydını (referans no, zaman, kanıt) işler.

**Kapsam.**
- *Model:* `BildirimKaydi` (`olayId · yukumlulukId · sonTarih ·
  durum (taslak | gonderildi | teyit_alindi | suresi_gecti | uygulanmaz)
  · taslakMetin · gonderenId · gonderimZamani · referansNo · kanitId? ·
  uygulanmazGerekcesi`), unique `[olayId, yukumlulukId]`.
  `BildirimYukumlulugu`'ne `alanSablonuJson` (mercinin istediği alanlar:
  olay zamanı, etkilenen sistem, etki, alınan tedbir…), `kanalNotu`
  (metin: "SİP üzerinden", "EPBS", "KVKK VERBİS ihlal formu" — adres
  **değil**).
- *Motor:* `bildirim_suresi` genişler: eşiği aşan olay için her geçerli
  yükümlülüğe `BildirimKaydi(taslak)` açar (idempotent), `sonTarih`
  hesaplar, `Gorev` bağlar; süre geçince `suresi_gecti` yazar — **ama
  gönderim yapmaz, "gönderildi" yazmaz**.
- *Eylemler:* `bildirimTaslakDuzenle`, `bildirimGonderildiIsaretle`
  (referans no zorunlu, kanıt bağlanabilir, dört göz: gönderen ≠ olay
  sahibi **değil** — bu şartta ısrar edilmez, yalnız denetim izi),
  `bildirimUygulanmaz` (gerekçe zorunlu).
- *Seed (örnek veri, işaretli):* dört yükümlülük **şablonu** —
  7545 md. 7 "gecikmeksizin" (süre alanı **boş**: ikincil mevzuat
  belirleyecek; ekran "süre mevzuatta henüz yok" der, saat uydurulmaz),
  EPDK sektörel SOME bildirimi (süre boş, dayanak SOME Tebliği),
  KVKK 72 saat (Kurul kararı 2019/10 — dayanak alanına yazılır),
  SPK önemli bulgu 10 iş günü (III-62.2). Süreler kurumun hukuk
  görüşüyle doldurulur; `sureSaat` **nullable** yapılır.
- *Ekran:* `/olaylar/[id]` çekmecesine "Bildirim yükümlülükleri" bölümü:
  geri sayım, taslak, gönderim kaydı; `/olaylar` listesine "bildirim
  bekliyor" işaretçisi.

**Kapsam dışı.** Merci sistemlerine (SİP, EPBS, VERBİS) otomatik
gönderim — **yapılmaz**, kural §0.4; NIS2 şablonu yalnız "kıyas"
olarak belge, kod değil.

**Kabul kriterleri.**
1. Şiddeti `yuksek` olay açıldığında `asgariSiddet ≤ yuksek` her aktif
   yükümlülük için tam bir taslak açılır; motor ikinci koşuda ikinci
   taslak açmaz. [OLY-BIL-001]
2. `sureSaat=null` yükümlülükte geri sayım **gösterilmez**, "süre
   mevzuatta belirlenmedi" yazılır; `suresi_gecti` asla yazılmaz.
   [OLY-BIL-002]
3. Motor `gonderildi` durumunu **yazamaz** (otomasyon güvenliği
   anlık görüntüsüne yeni yasak). [OLY-BIL-003]
4. `bildirimGonderildiIsaretle` referans no olmadan reddedilir; kaydın
   denetim izinde `gerekce` vardır. [OLY-BIL-004]
5. Kanıt paketine olayın bildirim kayıtları (taslak metin hariç) girer.
   [OLY-BIL-005]

**Kararlar.** *7545 süresi:* **Varsayılan boş** — ikincil mevzuat
çıkınca R1 adayı üzerinden güncellenir.

---

### R11 · Tehdit / zafiyet duyuru akışı (USOM, CISA ICS, KEV, EPSS)

**Alan kodu:** `SAG-ADV` (mevcut alan) · **Etki:** orta · **Çaba:** düşük

**Bugün.** `Advisory · AdvisoryUrunu · AdvisoryZafiyeti`, `Zafiyet`
(`kevMi`, `epss`, `cvssVektor`, `istismarDurumu`), `zafiyet_korelasyonu`
motoru, `lib/alan/surum.ts` sürüm karşılaştırıcı. Besleme yok.

**Hedef.** Kamuya açık duyuru ve puan kaynakları düzenli okunur; envanterle
korelasyon adayları üretir.

**Kapsam.**
- *Adaptör:* `advisory_feed` (9. `Connector.tip`; adaptör kataloğuna).
  Kaynaklar (belgelenmiş kamuya açık sabitler, §0.2): CISA ICS
  Advisories (RSS/JSON), CISA KEV (JSON), FIRST EPSS (CSV), NVD API 2.0
  (anahtar isteğe bağlı → sır referansı), USOM güvenlik bildirimleri
  (API anahtarı gerekiyorsa `kimlik_bekleniyor`). Her biri ayrı
  `Connector` kaydı; `etkin=false` gelir.
- *Normalize:* CISA ICS → `Advisory(kaynak='icscert')` + `AdvisoryUrunu`
  (üretici, ürün, sürüm aralığı — ayrıştırılamayan aralık **null**,
  "tümü" değil); KEV → `Zafiyet.kevMi=true` (yalnız var olan CVE'lerde;
  yeni CVE açmaz); EPSS → `Zafiyet.epss`; USOM → `Advisory(kaynak='usom')`.
- *Motor:* mevcut `zafiyet_korelasyonu` yeni kayıtları işler; sonuç
  `ZafiyetKorelasyonu` (aday); `Bulgu` açmaz.
- *Ekran:* `/saglik` bağlayıcı kartları; `/envanter` varlık çekmecesinde
  "ilgili duyurular"; `/omur` EOL satırında duyuru sayısı.

**Kapsam dışı.** Ticari tehdit istihbaratı; otomatik önceliklendirme
kararı ("Now/Next/Never" gibi bir yargı) — ekran KEV/EPSS/CVSS'i yan yana
gösterir, sıralamayı kullanıcı seçer.

**Kabul kriterleri.**
1. CISA fikstüründen sürüm aralığı `>=2.0 <2.4.5` iki uçlu olarak
   yazılır; "all versions" ifadesi aralık **yazmaz**, `null` + not.
   [SAG-ADV-010]
2. KEV fikstüründeki CVE envanterde yoksa kayıt **açılmaz**. [SAG-ADV-011]
3. Sürüm karşılaştırıcı çözemediği biçimde korelasyon üretmez (`null`),
   "etkilenmiyor" **demez**. [SAG-ADV-012]
4. Adaptör sertifikasyon harness'ından 15 kontrolü geçer/uygulanamaz
   gerekçeli; `kaldi` yok. [SAG-ADV-013]
5. Testler ağa çıkmaz. [SAG-ADV-014]

---

### R12 · Denetim formatına otomatik çıktı (EPDK öz denetim · ISO SoA · BİGR · SPK)

**Ürünleştirme notu.** Form şablonları `form` türü paketten gelir (XLSX
şablon + alan eşleme JSON); çekirdek yalnız genel "form doldurucu"yu
taşır. EPDK/BİGR/SPK formları `TR-ENERJI`, SoA `INT-ISO27001-2022`,
NERC RSAW `US-NERC-CIP` paketinde. Ölçülmemiş hücre kuralı ve sır süzgeci
çekirdekte.

**Alan kodu:** `DIS-FRM` · **Etki:** yüksek (TR) · **Çaba:** düşük-orta ·
**Bağımlılık:** R2 (tam madde seti olmadan çıktı örnek veriyle sınırlı)

**Bugün.** `lib/disaAktarim/paket.ts` (JSON paket), `csv.ts`, sekiz
ekranda CSV/XLSX (vendored `xlsx` 0.20.3). `UygulanabilirlikKarari.gerekce`,
`MaddeDurumu.guven`, `KanitBaglantisi`.

**Hedef.** Denetçinin beklediği tablo tek tıkla iner: EPDK öz denetim /
fark analizi, ISO 27001 Uygulanabilirlik Bildirgesi (SoA), BİGR denetim
soru formu, SPK bilgi sistemleri yönetim beyanı eki.

**Kapsam.**
- `lib/disaAktarim/formlar/epdkOzDenetim.ts`: santral × madde satırı —
  `madde kodu · alan · seviye · uyum sınıfı (EPDK sözcükleri) · kanıt
  referansları · sorumlu · son değerlendirme · not`; `degerlendirilmedi`
  → "Değerlendirilmedi" (boş bırakılmaz, "Uyumsuz" yazılmaz).
- `soa.ts`: ISO 27001 93 kontrol — `uygulanabilir mi · gerekçe
  (UygulanabilirlikKarari.gerekce ya da kural) · uygulama durumu · kanıt`.
  Gerekçesi olmayan kapsam dışı kontrol "gerekçe girilmedi" ile işaretli.
- `bigrDenetim.ts`: Denetim Rehberi soru formatı (kurum soru listesini
  şablon olarak yükler — sorular ürünle gelmez, §0.1).
- `spkBeyan.ts`: VII-128.9 madde × durum × kanıt.
- Hepsi XLSX + CSV; sır süzgeci ve köken kuralı paket ile aynı; dosya
  adı ve şema sürümü başlıkta; üretim denetim izine yazılır.
- Ekran: `/raporlar` içine "Denetim formları" bölümü; `/denetci-erisimi`
  kapsamlı denetçi aynı formu **salt okunur** indirir.

**Kapsam dışı.** Merci portalına yükleme; PDF üretimi (XLSX yeter);
imzalı form (R3 damgası pakete uygulanır, forma değil).

**Kabul kriterleri.**
1. Öz denetim çıktısında hiçbir hücre boş kalmaz; ölçülmemiş değer
   "Değerlendirilmedi"/"ölçülmedi" yazılır. [DIS-FRM-001]
2. SoA'da gerekçesiz kapsam dışı kontrol işaretlenir; gerekçe
   **uydurulmaz**. [DIS-FRM-002]
3. Çıktıda `sirReferansi`, IP, hostname bulunmaz (süzgeç). [DIS-FRM-003]
4. Kapsamı iki santral olan denetçi üçüncü santrali indiremez.
   [DIS-FRM-004]
5. Formül enjeksiyonu kalkanı (`=`, `+`, `-`, `@` ile başlayan hücre)
   mevcut CSV kuralı gibi XLSX'te de uygulanır. [DIS-FRM-005]

---

## 5. Dalga 3 — Fark yaratan

### R13 · Üretim kaybı temelli parasal risk

**Ürünleştirme notu.** Para birimi kiracıdan (`Kiraci.paraBirimi`);
"kurulu güç" ve "durma saati" sektör özniteliklerinden (P1 — enerji için
`kuruluGucMw`, başka sektörde paketin tanımladığı kapasite özniteliği ya
da doğrudan "saatlik kayıp" girdisi). Fiyat sağlayıcısı takılabilir
(`epias_ptf` TR paketi; başka ülke paketi kendi sağlayıcısını getirir;
`elle` her yerde). Ceza bandı dayanağı paketten örnek, kayıtta zorunlu
metin.

**Alan kodu:** `RSK-PAR` · **Etki:** en yüksek (enerji) · **Çaba:** orta

**Bugün.** `Risk` 8 etki ekseni (1–5), `dogalRisk/artikRisk`,
`kabulBitis`; `UretimUnitesi.kuruluGucMw`, `Tesis.kuruluGucMw`. Parasal
alan yok.

**Hedef.** Risk kaydı "kaç TL" sorusuna üç nokta tahminiyle (düşük /
beklenen / yüksek) cevap verir; girdi olmayan yerde "hesaplanmadı" der.

**Kapsam.**
- *Model:* `Risk`'e `durmaSaatiDusuk/Beklenen/Yuksek` (Float?),
  `etkilenenUniteIdlerJson`, `fiyatKaynagi` (`elle | epias_ptf`),
  `fiyatTlMwh` (Float?), `fiyatTarihi`, `cezaBandiDusuk/Yuksek` (TL,
  Float?; dayanak metni zorunlu), `parasalEtkiDusuk/Beklenen/Yuksek`
  (**türetilir, saklanır**, hesap zamanı ile), `hesapNotu`.
- *Hesap:* `lib/risk/parasal.ts` — `Σ(ünite MWe) × durma saati × fiyat`
  + ceza bandı; herhangi bir girdi `null` ise sonuç `null` ve eksik
  girdi adı döner; sıfır **üretilmez**. Fiyat elle ya da EPİAŞ Şeffaflık
  API'si (`epias_ptf` sağlayıcısı, `bagli:false`, hesap sır referansı).
- *Ekran:* `/riskler/[id]` "Parasal etki" bölümü: girdiler, üç nokta,
  hesap zamanı, "eksik girdi: fiyat"; `/riskler` listesinde beklenen
  etki sütunu (hesaplanmayanlar "—" değil "hesaplanmadı"); yönetici
  özetinde toplam beklenen etki **yalnız hesaplananlar** üzerinden ve
  "N risk hesaplanmadı" notuyla.
- *Kanıt paketi / SPK formu:* parasal etki sütunu.

**Kapsam dışı.** Monte Carlo; FAIR taksonomisi; sigorta hesapları;
dengesizlik maliyeti modeli (fiyat tek sayı kalır).

**Kabul kriterleri.**
1. Tüm girdiler varsa `parasalEtkiBeklenen = Σ MWe × saat × fiyat +
   ceza(beklenen)` gün çözünürlüğünde tutarlı; testte örnek sayı.
   [RSK-PAR-001]
2. Fiyat `null` ise sonuç `null`, eksik girdi listesi `['fiyat']`; ekran
   "hesaplanmadı". [RSK-PAR-002]
3. Yönetici özeti toplamı hesaplanmayan riski **katmaz** ve sayısını
   yazar. [RSK-PAR-003]
4. EPİAŞ sağlayıcısı bağlı değilken `fiyatKaynagi='epias_ptf'`
   seçilemez (R1'deki "sağlayıcı seçilemez" kalıbı). [RSK-PAR-004]
5. Ceza bandı dayanak metni olmadan kaydedilemez. [RSK-PAR-005]

---

### R14 · Dar kapsamlı, insan onaylı yapay zekâ yardımcısı

**Alan kodu:** `ONR-YZ` · **Etki:** orta · **Çaba:** orta ·
**Bağımlılık:** R1 (mevzuat metni), R6 (eşleme)

**Bugün.** LLM yok. Motor felsefesi "tespit → öneri → insan onayı".
Sır süzgeci `lib/entegrasyon/sir.ts`.

**Hedef.** Dört dar iş için **öneri** üretilir; her öneri kabul/ret ile
kapanır; model çıktısı hiçbir kaydı doğrudan değiştirmez; OT verisi ve
sır modele gitmez.

**Kapsam.**
- *Sağlayıcı:* `lib/oneri/saglayicilar.ts` — `llm` ailesi; `bagli:false`;
  `gereken`: uç nokta (kurum içi ya da 7545 md. 7'ye uygun yetkili
  sağlayıcı), model kimliği, sır referansı; yapılandırma şeması.
- *Model:* `OneriKaydi` (`tur` (`mevzuat_bolme | kanit_on_inceleme |
  esleme_onerisi | mevzuat_ozeti`), `hedefTipi/hedefId`, `girdiOzeti`
  (gönderilen metnin SHA-256), `girdiAlanlariJson` (hangi alanlar
  gönderildi — beyaz liste), `cikti` (metin/JSON), `modelKimligi`,
  `uretildi`, `karar` (`bekliyor | kabul | ret | kismi`), `kararVerenId`,
  `kararZamani`, `kararNotu`).
- *Beyaz liste:* modele gidebilecek alanlar sabit listede: mevzuat
  metni, madde başlık/metin, kanıt **açıklaması** (dosya içeriği
  **değil**), eşleme adayı başlıkları. `Varlik`, `AgBolgesi`, `Connector`,
  IP/hostname, sır referansı, kullanıcı adı **hiçbir zaman**. Sır süzgeci
  istek öncesi koşar; sızıntı → istek **yapılmaz**.
- *Motor:* `oneri_uretici` — yalnız `OneriKaydi` yazar; kayıt defteri ve
  otomasyon güvenliği anlık görüntüsüne yasaklar: sürüm/eşleme/kanıt
  durumu değiştirmez.
- *Dört iş:* (1) R1 adayının metnini madde adaylarına böl, eski sürümle
  eşleştirme öner → kabulde R2 içe aktarım önizlemesine düşer;
  (2) kanıt açıklaması × madde `kanitBeklentisi` → "karşılıyor / eksik /
  belirsiz" önerisi ve gerekçe → kabul `MaddeDurumu.guven`'i **değiştirmez**,
  yalnız not ekler; (3) R6 için ilişki türü önerisi → kabul
  `MaddeEslestirmesi` taslağı; (4) Türkçe özet + "etkilenen santral"
  taslağı → adayın notuna.
- *Ölçüm:* kabul/ret oranı `/saglik`'te; oran ölçülür, eşik yorumu
  kullanıcıya bırakılır.
- *Ekran:* ilgili çekmecelerde "öneri" bölümü, kaynağı ve model kimliği
  görünür; denetim izinde `kaynak='oneri'`.

**Kapsam dışı.** Serbest sohbet arayüzü; politika **üretme**; risk
puanı önerme; dosya içeriğini modele gönderme; modelin kendi başına
herhangi bir kaydı yazması.

**Kabul kriterleri.**
1. Beyaz liste dışı alan içeren istek **gönderilmez**; test bir `Varlik`
   alanı sızdırmayı dener, reddedilir. [ONR-YZ-001]
2. Sağlayıcı bağlı değilken öneri düğmesi "bağlı değil" der; kayıt
   açılmaz. [ONR-YZ-002]
3. Kabul edilen `kanit_on_inceleme` önerisi `MaddeDurumu.durum` ve
   `guven`'i **değiştirmez**. [ONR-YZ-003]
4. Her `OneriKaydi` denetim izinde model kimliği ve karar vereniyle
   görünür. [ONR-YZ-004]
5. Otomasyon güvenliği anlık görüntüsü `oneri_uretici` için üç yasağı
   ölçer. [ONR-YZ-005]
6. Testlerde sahte sağlayıcı; ağa çıkış yok. [ONR-YZ-006]

**Kararlar.** *Hangi model?* Belgede yazılmaz; kurum 7545 md. 7
çerçevesinde seçer. **Varsayılan:** kurum içi uç nokta.

---

### R15 · KVKK modülü

**Ürünleştirme notu.** Modül adı çekirdekte "Kişisel veri koruma"dır;
KVKK terimleri (VERBİS, 72 saat, 5 iş günü) `TR-ENERJI`/`TR-GENEL`
yükümlülük paketinden, GDPR karşılıkları (72 saat, DPIA, kayıt yükümlülüğü)
`EU-GDPR` paketinden gelir. Modül kiracı başına açılır/kapanır.

**Alan kodu:** `KVK-ENV` · **Etki:** düşük-orta · **Çaba:** orta

**Bugün.** Yalnız `Risk.etkiVeri` ekseni, seed'de `veriIslemeProfili`
serbest alanı, `SaklamaPolitikasi`. Dedike model yok.

**Hedef.** Kişisel veri işleme envanteri, VERBİS kaydı takibi, yurt dışı
aktarım kaydı, ihlal (72 saat, R10 ile ortak) ve veri sahibi başvurusu
(30 gün) tek modülde.

**Kapsam.** Modeller: `VeriIslemeFaaliyeti` (`isSureciId`, amaç, hukuki
sebep, veri kategorileri, ilgili kişi grubu, alıcılar, saklama →
`SaklamaPolitikasi`, teknik/idari tedbir → `Madde` bağı),
`YurtDisiAktarim` (alıcı ülke, dayanak: yeterlilik / standart sözleşme
(bildirim tarihi, 5 iş günü sayacı) / BŞK / istisna), `VeriSahibiBasvurusu`
(alınma, konu, 30 gün son tarih, durum), `VerbisKaydi` (kayıt/güncelleme
tarihleri, sorumlu). İhlal `Olay`'a bağlanır; R10 yükümlülüğü KVKK 72
saat. Ekran `/kvkk` (C yönü). Kanıt paketine işleme envanteri özeti.

**Kapsam dışı.** Aydınlatma metni üretimi; çerez yönetimi; DSAR portalı.

**Kabul kriterleri.**
1. Standart sözleşme dayanaklı aktarımda bildirim tarihi boşsa 5 iş günü
   sayacı **çalışmaz**, "bildirim tarihi girilmedi" der. [KVK-ENV-001]
2. Veri sahibi başvurusu 30 günü geçince `suresi_gecti` işaretlenir,
   görev üretilir; motor cevabı **yazmaz**. [KVK-ENV-002]
3. İhlal olayı R10 KVKK yükümlülüğünü tetikler (entegrasyon testi).
   [KVK-ENV-003]
4. Envanter satırı bir iş sürecine bağlı olmadan kaydedilemez.
   [KVK-ENV-004]

---

### R16 · İş etki analizi ve süreklilik hedefi (BIA / RTO-RPO)

**Alan kodu:** `SUR-BIA` · **Etki:** orta · **Çaba:** düşük-orta

**Bugün.** `IsSureci → SistemServis → Varlik` zinciri;
`YedeklemePolitikasi/Kosusu`, `GeriYuklemeTesti`; `yedek_dogrulama`
motoru test edilmemiş yedeği bulgu yapar. Hedef süre yok.

**Hedef.** Sistem/servis başına RTO/RPO hedefi; gerçek geri yükleme
testi hedefle karşılaştırılır; tatbikat kaydı tutulur.

**Kapsam.** `SistemServis.rtoSaat / rpoSaat` (Float?; null =
belirlenmedi), `kritiklikGerekcesi`; `GeriYuklemeTesti.sureSaat`
(zaten yoksa eklenir), `hedefiAsti: Boolean?` (hedef yoksa null);
`SureklilikTatbikati` (tarih, kapsam, senaryo, sonuç, katılımcı sayısı,
bulgu bağı). `yedek_dogrulama` motoru "hedef aşıldı" veri kalitesi
bulgusu; `olay_etki` motoru olayın etkilediği servislerin RTO'sunu
çekmeceye taşır ("bu olay üretimi en fazla N saat durdurabilir" —
**yalnız hedef girilmişse**). Ekran: `/yedekleme`'ye hedef/ölçülen
sütunları; `/olaylar/[id]` etki bölümüne RTO.

**Kapsam dışı.** Tam BCP dokümantasyonu; ISO 22301 çerçevesinin içe
alınması (R2 kalıbıyla ayrı iş).

**Kabul kriterleri.**
1. RTO hedefi 4 saat, son geri yükleme 6,3 saat → `hedefiAsti=true` ve
   bulgu; hedef null → `hedefiAsti=null`, bulgu **yok**, ekran "hedef
   belirlenmedi". [SUR-BIA-001]
2. Olay çekmecesi RTO'yu yalnız hedef girilmiş servislerde gösterir.
   [SUR-BIA-002]
3. Tatbikat kaydı tarih ve sonuç olmadan kaydedilemez. [SUR-BIA-003]

---

### R17 · (kapandı) Ürünleştirme kararı verildi → Dalga 0

Pazar kıyasında "karar bekliyor" olan bu madde 5 Eylül 2026'da karara
bağlandı: platform sektör ve ülke bağımsız ürün olacak. Tasarım notu
yerine uygulama paketleri yazıldı: **P0–P9** (Dalga 0). Bu başlık numara
sürekliliği için kalır; içeriği yoktur.

---

## 6. R0 · Bilinen açık kalemler

Açık kalemlerin kütüğü artık bu belgedir; her kalem ilgili paketle
birlikte ele alınır:

| # | Kalem | Ne yapılır | Not |
|---|---|---|---|
| R0-1 | Santral kesin koordinatları (17/17 yok) | Koordinatları kurum verir, depoda aday liste yok; Claude Code **yalnız** içe aktarım yolu ve "kesin/yaklaşık" işaretçisini ekler | Koordinat uydurulmaz |
| R0-2 | Haritada ülke sınırı | **Kapandı** — sınır üretilmiş (`web/lib/cografya/turkiyeSiniri.ts`: `TURKIYE_SINIRI`, `SINIR_CERCEVESI`) ve haritada çiziliyor (`app/(tam)/harita/HaritaIstemci.tsx:101-102`, `SINIR_YOLLARI`). Not: bu sabit çekirdekte duran bir ÜLKE verisidir; §0.5 gereği P1'de içerik paketine taşınmalı | Kapandı (doğrulama: 6 Eyl 2026) |
| R0-3 | `?next=` üreticisi | Giriş sonrası dönüş adresi üretilir; kapı zaten güvenli | Küçük |
| R0-4 | Bayat belgeler | `URUN_YEDEKLEME` | R3 ile |
| R0-5 | `.abacus.donotdelete` | 5 Eylül 2026 temizliğinde silindi; ürün deposuna geri alınmayacak. Arşivde duruyor (`ahmetrz/uyumPlatformu-arsiv`, `830c174` ile eklenmiş, 22 520 baytlık Fernet şifreli blob); içeriği anahtarsız okunamaz ve ne olduğu tek satırdan fazla belgelenmemiş (arşivdeki `docs/HAZIRLIK_DURUMU.md` §13: "şifreli blob, dokunulmadı"). İçeriği bilinmediği için arşiv deposu **private kalmalı**. | Kapandı |
| R0-6 | Uygulanmamış tasarım teslimi | Eylül 2026'da ayrı bir depoda alternatif bir tasarım sistemi üretildi (`tokens.css`, `TASARIM_TOKENLARI.md`, `TASARIM_PLANI.md`, `mockups.html`); ürünün canlı jetonlarıyla yalnız 1 jetonu ortaktı. Değerlendirildi ve **terk edildi**: ürün `web/app/kabuk.css` dilinde devam eder. Kayıt: `ahmetrz/uyumPlatformu-arsiv` deposu, `arsiv/tasarim-denemesi-2026-09` dalı (public depodan kaldırıldı: mockup verisi gerçek filodan türetilmiş tesis adları ve kişi adları taşıyordu). | Kapandı |
| R0-7 | Belge–kod bağı koptu | `web/arac/sayimlar.mjs` ve `web/tests/belge-sayimlari.test.ts` duruyor ama Eylül 2026 temizliğinde içleri boşaltıldı: araç 6 046 → 2 633 bayt (`--yaz`, `--tablo`, `blok()`, `BASLA`/`BITIS` işaretleri düştü), test 199 → 63 satır (belgelere bakan yarısı ile `KANONIK`/`TARIHSEL` listeleri düştü). Sonuç: belgeler yeniden elle yazılmış sayaç taşımaya açık — bu belgede bir günde iki örneği çıktı. Bu belgedeki `node arac/sayimlar.mjs --yaz` şartı da bu yüzden karşılıksız. Geri kurulacaksa kaynak: `ahmetrz/uyumPlatformu-arsiv` deposu. **6 Eyl 2026 doğrulaması:** araç gerçekten 2 633 bayt ve `--yaz` bayrağı yok; test 63 satır ve hiçbir belgeye bakmıyor. P0 bunu **kapsamına almadı** — ürün adı ve belge kurgusu ile aynı PR'a sığmıyor; ayrı kalem olarak açık kalır ve o gelene kadar bu belgedeki `arac/sayimlar.mjs --yaz` şartı geçersizdir (araç yalnız JSON basar). | açık — ayrı kalem |
| R0-8 | Kiracı bağlamını bekleyemeyen yüzeyler | Kiracı bağlamı (sektör **SÖZLÜĞÜ** ve **DİLİ**) oturumdan ve kapsamdan çözülür. O bağlamı bekleyemeyen her yüzey ikisine de erişemez — sebepleri farklı, sınır aynı. Bugün **üç** örnek var ve üçü ayrı istisna gibi birikiyordu: (a) **zod şemaları** — doğrulama oturumdan ÖNCE koşuyor ve sıra denetim gerekçesiyle seçildi (`lib/eylemler2/disaAktarim.ts`: reddedilen isteğin izi aktörsüz kalmasın); (b) **paket sözleşme kapıları** — `lib/disaAktarim/paket.ts` kiracının sözlüğünü bilmez ve BİLMEMELİ, ürettiği denetim artefaktının alanları kod anahtarıdır; (c) **Suspense yedekleri** — `loading.tsx` anında render edilmek zorunda, `async` olamaz, `useTerim()` ise istemci bağlamı ister (`app/(kabuk)/(operasyonel)/tedarikciler/loading.tsx`). **SINIR DARALDI (7 Eyl 2026):** sayfa `metadata` SABİTİ de bu sınırdaydı, ama `generateMetadata` **async olabiliyor** ve orada sınır YOK — sekme başlıkları sözlüğe bağlandı (`harita` · `raporlar` · `portfoy` · `tesisler/[id]`). Yani sınır `metadata` sabitini kapsar, async yolu KAPSAMAZ. Kayıt daraltılmazsa P3 çok-dil turunda aynı yanlış sınır yeniden okunur ve çözümü olan bir yer çözümsüz sanılır. Üçü de bugün çekirdek sözcükte ve tek dilde. **P3 aynı sınıra DİL için çarpacak**; karar orada verilir: sınır olduğu yerde mi kalır, yoksa bağlamın çözülme anı mı değişir (doğrulama sırası, derleme zamanında çözülen mesaj kataloğu). Kalem burada ki dördüncü örnek çıktığında yeniden keşfedilmesin, her seferinde ayrı bir gerekçe yazılmasın. | açık — P3 ile karar |
| R0-9 | Saklanan artefakta kiracı sözcüğü gömülmez | Bir metin ekrana çıkmadan **önce saklanıyorsa** (denetim izi, öneri gerekçesi, dışa aktarılan sözleşme) kiracının sözlüğüne göre değişen sözcük içeremez. Sözlük satırı bugün düzenlenirse dün kaydedilmiş kayıt başka sözcükle okunur ama **kayıt değişmemiş görünür** — "değişmez denetim izi" kuralı sessizce delinir. **R0-8'den AYRIDIR** ve karıştırılmamalı: R0-8 kiracı bağlamını BEKLEYEMEYEN yüzeylerdir; buradaki yüzeyler bekleyebilir (`lib/motorlar/olayEtki.ts` sunucuda, async, `tesisId` elinde), sebep **saklamadır**. Bugün üç örnek: (a) motor öneri gerekçeleri (`Olay.etkiOnerisiJson`); (b) OpenAPI sözleşmesinin `summary` alanı (`lib/api/kapsam.ts` · `UC_ETIKETI` → `lib/api/sozlesme.ts`) — entegratörün okuduğu sözleşme iki kiracıda iki türlü okunamaz; (c) dışa aktarım paketinin alan adları (`lib/disaAktarim/paket.ts`). **Ayrım şu**: aynı sabit hem sözleşmeye hem ekrana gidiyorsa İKİYE BÖLÜNÜR — `UC_ETIKETI` sözleşmede çekirdek kalır, `ucEtiketi(sozluk, uc)` ekranda sözlüğü izler (vakaları `tests/faz-f-api-kapsam.test.ts`). Uç KİMLİĞİ (`facilities`) her hâlde kod anahtarıdır. Doğru uzun çözüm saklanan metni **yapısal** tutmak (kod anahtarı + değerler) ve sözcüğü okuma anında üretmek; artefakt biçimini değiştirir, kendi dilimidir. | açık — (a) yapısal gerekçe dilimi |
| R0-10 | `/` saha ekranı tek ekran sözleşmesini 3px ihlal ediyordu | **Kapandı** (8 Eyl 2026). Sebep ölçüldü: `.ab-b-genel` yüksekliğini `calc(100dvh - 56px - var(--durum-h) - var(--ayak-h))` ile JETONLARDAN hesaplıyordu ve `--ayak-h` gerçeği takip etmiyordu — amiral yoğunlukta 22px yazıyor, ayak 25px render ediliyor (min-height + üst kenarlık + satır yüksekliği). Fark tam 3px'ti ve banttan bağımsız olması zaten "kırılma noktası değil, sabit artık" diyordu. Jetonu 25'e çekmek kusuru bugün kapatır yarın açardı; sayı İKİ NÜSHA olmaktan çıkarıldı: kabuk ızgarası kesin yüksekliğe alındı (`:has()` ile yalnız Saha kabuğu) ve içerik `minmax(0,1fr)` satırından geliyor. Ölçüm: 1366×768 → 768/768 · 1440×900 → 900/900 · 1280×800 → 800/800, `tekEkran: true`. SABOTAJLA doğrulandı: eski `calc` geri konunca üç bandın üçünde de 3px kırmızı aynen döndü. | Kapandı |
| R0-11 | `KURULU_GUC` veri anahtarı sektör birimi taşıyor | `lib/alan/oznitelik.ts` → `KURULU_GUC = 'kuruluGucMw'`. Değer bir KAYIT ANAHTARIDIR (`TesisOzellik.anahtar` sütununda duruyor), kod adı değil: değiştirmek veri göçü ister. Kod adları temizlendi (`gucMw` → `guc`) ve birim artık satırdan geliyor (`TesisOzellik.birim`); geriye yalnız anahtarın kendisi kaldı. Dosya bunu zaten "GEÇİCİ" diye işaretliyor. **Sahip:** P4 · öznitelik şeması dilimi. **Kapanış:** ekranlar özniteliği adıyla bilmeyi bıraktığında (sektör şemasından gelen etiketle çizdiğinde) sabit düşer; o gün anahtar da göçle sektörsüzleşir. | açık — P4 ile |
| R0-12 | Bloklayıcı erişilebilirlik kapısı 1366×768'i hiç taramıyor | `erisim-axe` ÜÇ bant tarar: 1440×900 · 768×1024 · 375×780. Dizüstünün en yaygın bandı olan **1366×768 yalnız düzen kapısının** (`tasarim:dizustu`) bandıdır ve o kapı CI'da koşmuyor (beyanı `kapi-farki.mjs` içinde). Boşluk kuramsal değil, ÖLÇÜLDÜ: `/` saha ekranının katman paneli 1366×768'de sözlüğe göre kayıyor (`enerji` 427/427 → kaymıyor · `su` 437 → 10px · `stres` 471 → 44px), axe'ın taradığı üç bantta ise kaymıyor (1440×900'de 535/535, dar bantta `overflow-y: visible`). Kaydırılabilir ama odaklanamayan bölge klavye kullanıcısı için erişilemezdir (axe · serious · `scrollable-region-focusable`) — bu bulgu kapıdan değil ELLE ölçümden çıktı, düzeltmesi (`tabindex=0`) bu pakette yapıldı ama **kapı hâlâ o bandı görmüyor**: aynı sınıftan bir sonraki kusur yine sessiz geçer. Bant sayısını artırmak axe süresini üçte bir uzatır ve yeni borç açabilir; bu yüzden ölçülüp yazıldı, kapıya tek başına eklenmedi. **Sahip:** kalite kapıları dilimi (`arac/erisim-axe.mjs`). **Kapanış:** `tasarim:dizustu` CI'ya bağlandığı gün — dördüncü bant borç listesine girip cırcıra alındığında; o gün axe bandı da aynı listeyle 1366×768'e açılır. | açık — ölçüldü, kapı genişletilmedi |

| R0-13 | Üst çubuk dokunmatik bantlarda taşıyordu | **Kapandı** (8 Eyl 2026). Ölçüldü: viewport 768 iken `.ab-ust` 999px, 375 iken 938px — çubuk 1024 altında kendi içinde kırpılıyordu. Yerleşim önceliğe göre yeniden kuruldu (marka → mercek → gezinme → hesap): 1024 altında çubuk SARAR, gezinme kendi satırına iner ve yatay kaydırılır, marka ile hesap daralır; hiçbir öğe gizlenmez ve **mercek her bantta erişilebilir**. Mercek `.sag` kümesinden çıkarılıp üst çubuğun doğrudan çocuğu yapıldı — içindeyken `order` o kümenin içine hapsoluyordu. Saran gezinme ilk denemede ikincil sıranın üstüne bindi ve taşma kapısı 768px'te **168 yeni örtüşme** saydı; kabuk ızgarasının ilk satırı da dar bantta `auto` yapıldı. Ölçüm: 1440/1024/768/375'te taşma 0, mercek dört bantta da görünür; gezinme kapısı 7 bant 0 kusur, taşma kapısı yeni 0. | Kapandı |
| R0-14 | Zafiyet ↔ varlık eşleşmesi RASTGELE — gerçek CVE kurgusal varlığa tutarsız bağlanıyor | Ölçüldü (8 Eyl 2026): `seed-operasyon.ts` varlıkların ~%7'sine `zafiyetler[Math.floor(rnd() * zafiyetler.length)]` ile kura çekiyor. On CVE'nin dokuzu yayımlanmış gerçek kayıtlardır ve ürünleri beyanlıdır (`kurgusal-adlar.ts`), ama bağlandıkları varlık türüyle ilgisi yok: bir ağ anahtarı Rockwell ControlLogix CVE'si taşıyabiliyor. Bu bir GERÇEKLİK kusuru değil (kayıt kurgusal, rozeti ekranda) ama bir İNANDIRICILIK kusurudur ve demonun tek ölçütü inandırıcılıktır — güvenlikten anlayan bir izleyici bunu ilk bakışta görür. Düzeltmesi kura yerine eşleştirme ister: CVE'nin ürünü ↔ varlığın `uretici`/`isletimSistemi` alanı. Bu turda YAPILMADI çünkü kapsam kurgusallaştırma ve bekçiydi; kurayı eşleştirmeye çevirmek tohumun zafiyet bloğunu yeniden yazmak demek. **Sahip:** demo verisi dilimi. **Kapanış:** demo yolunun zafiyet ekranı gösterime girdiğinde — bugün sekiz ekranlık yolda değil; yola girdiği gün eşleştirme ondan önce yazılır. | açık — ölçüldü, düzeltilmedi |

---

## 7. Kalan iş — üç küme (yeniden yazıldı, 9 Eylül 2026)

Yol haritası "dalga" diliyle yazılmıştı; dalga sırası kod ilerledikçe
gerçeği anlatmaz oldu. Kalan iş bugün **ilk müşteriye göre** üç kümededir.
Her kalemin büyüklüğü ÖLÇÜLMÜŞTÜR (dosya sayısı ya da içerik hacmi);
tahmin yazılmamıştır. Kümelerin ilk müşteri için asgari olanı
`docs/ILK_MUSTERI_ASGARI_KUME.md`'de tek sayfada durur.

### A · İÇERİK — ürünü "kutudan çıktığı gibi hazır" yapan

| Kalem | Ölçülmüş büyüklük | Bugün nerede |
| --- | --- | --- |
| **TR-ENERJI · kalan 6 EPDK eki** | **3 126 kontrol** (Ek-1 476 · Ek-2 505 · Ek-4 552 · Ek-5 551 · Ek-6 578 · Ek-7 464; §4 tablosu) | Ek-3 (565) aktarıldı; aynı XLSX yolu, şema göçü gerekmez |
| **TR-ENERJI · yükümlülükler** | `yukumlulukler.json` bugün `[]` — 7545 sayılı Kanun + EPDK SOME süreleri | R10'un girdisi |
| **TR-BANKACILIK içeriği** | **58 madde iskelet, metin YOK**; BDDK hedefi §4'te "47 madde, birincil erişim ön koşul" | kaynak erişimi ölçülmedi (mevzuat.gov.tr HTTP 000) |
| **KVKK (yatay paket)** | depoda KVKK içeriği YOK; R15 modülü ayrı | 6698 metni kamuya açık; paket biçimi hazır |
| **R1 · mevzuat radarı** | kaynak kataloğu paket biçiminde (`RegulasyonKaynagi` var), motor ve ekran yok | değişikliği yakalayan tek şey bugün insandır |

**Neden bu küme önce:** paket mimarisi bitti (P4); ürünün eksiği artık
**mimari değil içerik**. İçeriksiz bir uyum ürünü, müşterinin kendi
Excel'inden daha az şey bilir.

### B · TESLİM — ürünü müşteri sunucusunda çalıştıran

| Kalem | Ölçülmüş büyüklük | Bugün nerede |
| --- | --- | --- |
| **R5 · PostgreSQL** | **11 SQLite bağımlılığı** (`docs/POSTGRES_READINESS.md`), **ikisi sessizce yanlış**; 6 ham SQL tetikleyici; 189 test dosyasının izolasyonu dosya kopyasına dayanır | `datasource` SQLite; göç zinciri kapısı hazır (iki sağlayıcıda da koşar) |
| **P7 · dağıtım** | `deploy/` **yok** · `docs/KURULUM.md` **yok** · sağlık ucu **yok** (10 API ucu var, hepsi `route.api.ts`); S3 · Redis · kuyruk · Vault kayıtlı ama bağlı değil | statik demo derlemesi var ve CI'da koşuyor |
| **R3 · yedek + kanıt** | `arac/yedek.mjs` 170 satır, **yalnız veritabanı** (`VACUUM INTO`); kanıt dosyaları artık **yazılıyor** (`eylemler2/kanit.ts` → `depoAnahtari` + `dosyaHash`) ama yedeğe girmiyor; hem araç hem `docs/URUN_YEDEKLEME.md` (satır 26 · 29 · 30 · 144) hâlâ "dosya yok" diyor | depo `lib/uyum/kanitDeposu.ts` 145 satır, içerik adresli, MIME izin listeli |
| **P6 · kimlik (SSO/MFA)** | yerel hesap + oturum + oran sınırı var; **OIDC ve TOTP yok** | `Connector.kimlikTipi` OAuth2 tanıyor, ürün girişi tanımıyor |
| **P2 · çok kiracılılık (yalnız SaaS tarafı)** | şemada **`kiraciId` taşıyan model 0 / 157**; `Kiraci` modeli yok | tek kurulum tek kiracı; RLS P2 ile gelir |

**Neden bu küme:** ilk müşteri kurulumu bu kümenin ilk üçü olmadan
yapılamaz. P6 ve P2 müşterinin şartına bağlıdır (aşağıda koşul).

### C · SATIŞ — ürünü denetimde ve olayda kullanılır kılan

| Kalem | Ölçülmüş büyüklük | Bugün nerede |
| --- | --- | --- |
| **R12 · denetim formları** | dışa aktarım **CSV** (`disaAktarim/csv.ts` 148 satır) + **JSON kanıt paketi** (`paket.ts` 668 satır); **PDF üreten kod yok**, **XLSX yalnız okunuyor**; `FormSablonu` · `RaporSablonu` katalogları var ama `app/` altında **sıfır atıf** — şablon tabloda durur, yüzeye çıkmaz | P4'ün bıraktığı tek boşluk + paket tarafı form dosyası |
| **R10 · bildirim yükümlülüğü** | model · motor (`lib/uyum/bildirimSuresi.ts` 241 satır saf karar + `lib/motorlar/` DB katmanı) · **ekran zinciri TAM** (`/olaylar` üçlüsü çağırıyor); eksik olan **`BildirimKaydi` modeli** ve **içerik**: `yukumlulukler.json` iki sektör paketinde de `[]` | süre motoru "bildirildi" yazmaz — insan kararı korunur |

### SONRAYA — koşulu yazılı erteleme

Her satır "sonra bakılır" değil, **hangi koşul oluşunca gerekeceğini**
söyler. Koşul oluşmadan açılan paket, ürünü değil yol haritasını büyütür.

| Kalem | Hangi koşul oluşunca gerekir |
| --- | --- |
| **P3 · çok dil** | Arayüzü ikinci dilde isteyen bir kiracı sözleşmeye girdiğinde. Mesaj kataloğu 263+ dosyaya dokunur; ihtiyaç doğmadan ödenmez. |
| **EU/US içerik paketleri** | Yurt dışında yükümlülüğü olan bir kiracı geldiğinde. Paket biçimi ülke boyutunu (`manifest.ulke`) zaten taşıyor; yalnız içerik yazılır. |
| **R6 · SCF/STRM** | Telifli çerçeve içeriğinin hukuki durumu netleştiğinde. OSCAL okuyucu hazır (2.7), içerik yok — bu bir hukuk kararı, mühendislik kararı değil. |
| **R7 · güvenlik duvarı kural analizi** | Müşteri firewall konfigürasyonunu vermeye razı olduğunda ve OT ağ topolojisi ürüne girdiğinde. |
| **R8 · konfigürasyondan envanter** | Envanterin elle girilmesi müşteride darboğaz olduğunda (ilk kurulumda envanter zaten içe aktarımla gelir). |
| **R9 · IEC 62443 SL-T/SL-A** | Müşteri 62443 sertifikasyonuna girdiğinde; bugün EPDK modeli seviyeyi kendi ölçeğiyle veriyor. |
| **R11 · zafiyet/duyuru akışı** | Kurulum canlıya çıkıp bir bakım penceresi tanımlandığında; kaynaklar (USOM · CISA · NVD) kamuya açık ve `etkin=false` gelir. |
| **R13 · parasal risk** | Müşteri üretim kaybı fiyatını (gizli veri) paylaşmayı kabul ettiğinde. |
| **R14 · yapay zekâ yardımcısı** | Ürün canlıda çalışıp yeterli kanıt/karar verisi biriktiğinde; "motor önerir, insan karar verir" kuralı burada da geçerli. |
| **R15 · KVKK modülü** | KVKK yükümlülüğü sözleşmede yer aldığında (yatay paket içeriği bu kümede A'ya girer, modül C'ye). |
| **R16 · BIA / RTO-RPO** | Müşteri iş sürekliliği tatbikatını ürün üzerinden yürütmek istediğinde. |

### Sıra ve bağımlılık

```
A · İÇERİK   TR-ENERJI kalan ekler ──► yükümlülükler ──► TR-BANKACILIK · KVKK ──► R1
B · TESLİM   R5 (PostgreSQL) ──► P7 (dağıtım) ──► [P6 · P2 — müşteri şartına göre]
             R3 (yedek + kanıt) ── bağımsız, paralel
C · SATIŞ    R12 ──► R10        (A'nın içeriği üzerine oturur)
```

İlk müşteri için asgari kesişim: **A'nın TR-ENERJI kalemi + B'nin ilk
üçü + C'nin R12'si** (`docs/ILK_MUSTERI_ASGARI_KUME.md`).

**Eski dalga sırası (kayıt için):** Dalga 0 P0 → (R5 + P2) → P1 → P4 →
P8 → P3 → P6 → P7 → P9; Dalga 1 R4 → R1 → R3 → R2; Dalga 2 R12 · R10 ·
R11 · R6 · R7 · R8 · R9; Dalga 3 R13 · R14 · R15 · R16. Bu sıra
**yanlış** değildi, **bitmiş işleri** taşıyordu: P0 · P1 · B1/B2 · P4 ·
P8 kapandığı için kalan iş yeniden kümelendi (§1.1).

Her paket **ayrı dal ve PR**: `paket/r5-postgres`, `paket/p7-dagitim`.
Aynı anda en fazla bir paket açık. PR açıklaması: kabul kriterlerinin her
biri için test adı; koşulan kapıların çıktısı; güncellenen belgeler;
alınan kararlar.

---

## 8. Kararlar defteri (varsayılanlar)

| # | Soru | Varsayılan | Değiştirmek için |
|---|---|---|---|
| K1 | Resmî kaynak kataloğu ürünle gelsin mi? | Evet, `etkin=false` | Kullanıcı "hayır" derse yalnız şablon |
| K2 | Anti-bot veren resmî site | Atlatılmaz; `engelli` + elle | — |
| K3 | ISO 27001 metni | Yalnız kimlik + başlık | Kurum lisansı varsa metin de |
| K4 | EPDK sürüm etiketleri | `YYYY-AA · RG NNNNN` | — |
| K5 | Teams webhook adresi | Sır | — |
| K6 | TSA | KamuSM (hesap sır) | Kurum e-imza TSA'sı |
| K7 | Türetilmiş uyum durumu | Görünüm; yüzdeye katılmaz; `MaddeDurumu` yazmaz | — |
| K8 | Adres → bölge çözümü | `AgSegmenti` CIDR; çözülmezse null | — |
| K9 | Dosya kaynağı güven sabitleri | 0.9 / 0.8 / 0.7 | Kurum konsolundan |
| K10 | 7545 bildirim süresi | Boş (mevzuat bekleniyor) | R1 adayı ile |
| K11 | LLM sağlayıcı | Kurum içi uç nokta, `bagli:false` | 7545 md. 7'ye uygun sağlayıcı |
| K12 | İki datasource (SQLite dev/demo, PG üretim) | Evet | — |
| K13 | R17 | Kapandı — ürünleştirme kararı verildi (Dalga 0) | — |
| K14 | Ürün adı | Görünen ad **"Uyum ve Yönetişim Platformu"** — geçici, TANIMLAYICI ad; sektör sözcüğü içermez. `Regula` **iç çalışma adıdır**, arayüzde/sitede/dış iletişimde kullanılmaz (`URUN_VIZYONU.md` §10). Değer `MARKA_AD`'dan okunur (`web/lib/marka.ts`) | Kalıcı ad seçilince `NEXT_PUBLIC_MARKA_AD` ya da `marka.ts` varsayılanı değişir — tek satır |
| K15 | Kullanıcı çok kiracılı olabilir mi? | Hayır; `DenetciErisimi`/`DestekErisimi` ile | — |
| K16 | RLS | PostgreSQL'de zorunlu; SQLite yalnız uygulama kapısı | — |
| K17 | i18n kütüphanesi · ikinci dil | Hafif kendi katman + ICU · İngilizce | `next-intl` / Almanca |
| K18 | Paket imzası | SHA-256 zorunlu, Ed25519 isteğe bağlı | — |
| K19 | Dağıtım önceliği | On-prem (Compose) önce | SaaS önce |
| K20 | Kiracı adaptörü | Yalnız imzalı ürün adaptörleri; kiracı verisi CSV/API/webhook | Sandbox (ayrı karar) |
| K21 | İlk enerji dışı sektör · ilk TR dışı ülke paketi | **Güncellendi (9 Eyl 2026):** ilk enerji dışı SATILABİLİR sektör bankacılık (`TR-BANKACILIK`; `docs/TR_SEKTOR_PAKETLERI.md`). Su/atıksu yalnız **demo sektörü** — sektörel düzenleyici bulunamadı, satılmaz, ürün vaadinde geçmez. İlk TR dışı ülke paketi (EU-NIS2) **ertelendi** (v1 TR, §2) | Kullanıcı seçer |
| K22 | Tema | Koyu tek tema kalır | Kiracı teması |
| K23 | **`v1` ne zaman donar?** | Yayımlanmış bir belge değil, **erişilebilir dağıtım + dağıtılmış kimlik**. `v1` şu iki olaydan **ilki** gerçekleştiğinde donar: (a) API'yi servis eden bir dağıtım dışarıdan erişilebilir hâle gelir, (b) ilk **dış** `ApiAnahtari` düzenlenir. O ana kadar sözleşme **taslaktır** ve `v2` açılmadan değiştirilebilir. Gerekçe: kıran değişikliğin maliyeti kırılan tüketici sayısıdır ve o sayı bugün sıfırdır | İlk olay gerçekleşince K23 kapanır; sonraki kıran değişiklik `v2` ister |
| K24 | Taslak sözleşme **görünür** olmalı | `/api-sozlesmesi` ekranı, açık adreste duran tarifin örtük bir taahhüt sayılmaması için başında tek satır uyarı taşır: "`v1` taslaktır; ilk dış tüketiciye kadar haber verilmeden değişebilir." Statik demo bu ekranı yayımladığı için uyarı da yayımlanır | K23 kapanınca uyarı kalkar |
| K25 | **Ürün sektör-ülke PAKETLERİYLE satılır** (8 Eyl 2026) | Çekirdek sektör bilmez; paket çerçeve, yükümlülük, kapsam türü, öznitelik şeması, form ve sözlük getirir (`docs/SEKTOR_PAKETI_SOZLESMESI.md`). **Kalıcı:** sektöre özgü alan çekirdek kolonu OLMAZ, paketin beyan ettiği özniteliktir; bekçi `tests/bekci/sema-sektorsuz.test.ts` (URN-KAP-002) | — (kalıcı) |
| K26 | Uyum zincirinin öznesi (B1) | `KapsamOgesi`; tür katalog (`KapsamOgesiTuru`: çekirdek `tesis` · `kurum`, paket ekler). Dokuz omurga tablosu `kapsamOgesiId`; tesis `tesisId` köprüsüyle bağlı. Yetki ekseni de öğe. Bekçi `tests/bekci/kapsam-omurga.test.ts` (URN-KAP-001), istisna listesi yalnız küçülür | — (kalıcı) |

---

## 9. Tanımlar (bu belgeye özgü)

**Değişiklik adayı** — bir resmî kaynakta anahtar kelimeyle eşleşen,
henüz bir regülasyona bağlanmamış ilan. **Yayın kanalı** — taranan kaynak
(fihrist, sayfa, RSS); bir regülasyonun "kaynağı"ndan farklıdır.
**Türetilmiş durum** — eşleme üzerinden görünen, kayıt olmayan uyum
durumu. **SL-T / SL-A** — IEC 62443 hedef / ölçülen güvenlik seviyesi.
**STRM** — NIST IR 8477 ilişki türleri. **Öneri** — model ya da motor
çıktısı; insan kararına kadar hiçbir kaydı değiştirmez. **Belgelenmiş
kamuya açık sabit** — kimlik gerektirmeyen resmî adres; koda açık
yazılır, kapalı gelir (§0.2). **Kiracı** — bir kurulumda verisi
diğerlerinden ayrık müşteri kuruluş. **Hub** — kiracıları, paketleri ve
kullanımı yöneten ürün tarafı; kiracı verisini görmez. **İçerik paketi**
— sürümlü, imzalı, ülke × sektör × dil etiketli çerçeve/eşleme/yükümlülük/
form/kaynak kataloğu/sözlük/demo verisi kümesi. **Sektör sözlüğü** —
çekirdek terim anahtarlarına sektör etiketi veren paket ("tesis" →
"santral"). **Öznitelik şeması** — sektöre özgü tesis/birim niteliklerinin
(kurulu güç vb.) tipi ve birimi. **Referans kiracı** — Demo Enerji;
ürünün ilk gerçek kurulumu, depoda verisi yok.
