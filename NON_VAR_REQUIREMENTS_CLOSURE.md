# "VAR olmayan" isterlerin kapatılması — durum kütüğü

Bu belge, alternatif ürün değerlendirme matrisinde **Zorlu Enerji
Yönetişim Platformu** sütununda doğrudan "VAR" olmayan 38 maddenin
bugünkü gerçeğini **dosya kanıtıyla** yazar. Yaşayan bir belgedir:
her turda güncellenir.

Ölçüm tarihi: 03.09.2026 · Dal: `claude/repo-public-github-domain-271hxa`

---

## 0. Durum sözlüğü — dört değer, üçüncü seçenek yok

| Durum | Anlamı |
| --- | --- |
| `NOT_STARTED` | Bu programda dokunulmadı. |
| `IN_PROGRESS` | Başlandı ama kapanış ölçütünün en az biri eksik. |
| `CODE_READY_EXTERNAL_DEPENDENCY` | **Repo içinde yapılabilecek her şey bitti.** Kalan tek eksik gerçek bir kurum sistemi, kimlik bilgisi ya da altyapıdır. |
| `COMPLETE` | Aşağıdaki dokuz ölçütün **hepsi** var. |

**Kapanış ölçütü — dokuzu birden.** Bir madde ancak şunların tamamı
varsa `COMPLETE` yazılır:

1. **VERİ MODELİ** — Prisma modeli ve göçü, veri kaybı ölçülmüş.
2. **ALAN MANTIĞI** — veritabanısız, saf, test edilmiş karar kodu.
3. **SUNUCU / API** — yetki + kapsam + doğrulama taşıyan sunucu eylemi.
4. **UI** — kullanıcının onu göreceği ve yöneteceği gerçek ekran.
5. **YÖNETİM / KONFİGÜRASYON** — gerekiyorsa konsol kütüğünde satır.
6. **GÜVENLİK** — RBAC, tesis kapsamı, gerekçe zorunluluğu.
7. **TEST** — kenar durumlarıyla; test kırılarak (sabotajla) doğrulanmış.
8. **DENETİM İZİ** — her yazma `AktiviteKaydi`na düşüyor.
9. **BELGE** — bu kütükte kanıtıyla yazılı.

> **"Backend hazır" bir maddeyi KAPATMAZ.** Şeması olan ama ekranı
> olmayan madde `IN_PROGRESS`tir. Bu ölçüt kasıtlı olarak serttir:
> belgenin işi ilerlemeyi büyük göstermek değil, kalan işi görünür
> tutmaktır.

**Sahte tamamlanmışlık yasaktır.** Gerçek kurum sistemi (AD/Entra, EDR,
SIEM, CMDB, OT keşif ürünü, Vault/KMS, PostgreSQL, Redis, DYS, IdP)
gerektiren hiçbir madde, o bağımlılık taklit edilerek `COMPLETE`
yazılmadı. Böyle maddeler için repo içi hazırlık ayrı ölçülür ve
`CODE_READY_EXTERNAL_DEPENDENCY` ile işaretlenir.

---

## 1. Sayılar

| Ölçü | Değer |
| --- | --- |
| Madde | 38 |
| **COMPLETE** | **8** |
| CODE_READY_EXTERNAL_DEPENDENCY | 0 |
| IN_PROGRESS | 0 |
| NOT_STARTED | 30 |
| Yeni Prisma modeli | 13 |
| Yeni göç | 2 (ikisi de salt ekleyici · veri kaybı 0) |
| Yeni motor | 3 (9 → 12) |
| Yeni rota | 1 (`/tabanlar`) |
| Yeni konsol modülü | 7 |
| Toplam test | 1856 geçti · 1 atlandı |

### Kapı sonuçları (03.09.2026)

| Kapı | Sonuç |
| --- | --- |
| `npm run test` | 1856 geçti · 1 atlandı · 0 kusur |
| `npm run lint` · `npx tsc --noEmit` | temiz |
| `tasarim:kapi` | kontrast kusuru 0 · eski tasarım izi 0 |
| `rota:duman` | **47/47 rota** · kusurlu 0 · sayfa hatası 0 |
| `tasarim:dizustu` (1366×768) | 39 rota · **kırpılan öğe 0** · yatay taşan rota 0 |
| `tasarim:axe` (WCAG 2 A/AA) | 40 rota · ciddi/kritik ihlal **0** |
| `tasarim:tasma` | 78 ölçümde 4 kusur — **hepsi bu programdan ÖNCE de vardı** (`/envanter`, `/sistem`, `/sistem/bilesenler`, 375px). Bu turda 7'den 4'e indi: üçüncül gezinme sırası ve kip çubuğu artık sayfayı ittirmek yerine kendi içinde kayıyor. |
| `npm run build` | başarılı (`/tabanlar` dâhil) |

---

## 2. Madde madde durum

### OT — Envanter ve OT güvenliği

| ID | İster | Durum | Kanıt | Kalan iş |
| --- | --- | --- | --- | --- |
| OT-03 | Teknik künye standardı | **COMPLETE** | Şema: `Varlik.ipv6Adresi · isletimSistemiSurumu · firmwareYapisi · donanimRevizyonu` + `AlanUygulanabilirligi` · Mantık: `envanter/mantik.ts → kimlikEnvanteri · kimlikTamligi` · Eylem: `alanUygulanamazIsaretle` / `…Kaldir` · UI: Envanter çekmecesi › Duruş › Kimlik alanları · Konsol: `alanUygulanabilirligi` · Test: 12 + 4 | — |
| OT-05 | Varlık ↔ proses ↔ adım | `NOT_STARTED` | — | ProcessStep modeli, M:N bağ, ilişki metadatası, UI |
| OT-08 | Üretim/iş sürekliliği etkisi | `NOT_STARTED` | — | Etki modeli, MW kaybı, miras etki, yazma yolu |
| OT-09 | Sahiplik ve ekip | `NOT_STARTED` | — | Ekip modeli, rol ayrımı, toplu devir, pasif sahip uyarısı |
| OT-11 | Zone / VLAN / subnet | **COMPLETE** | Şema: `AgSegmenti` + `Varlik.segmentId` · Mantık: `lib/alan/ag.ts` · `lib/varlik/agTutarliligi.ts` · Motor: `ag_tutarliligi` · Eylem: `agSegmentiKaydet` · `varligaSegmentAta` · UI: Topoloji › Segmentler kipi (CRUD + çekmece), Envanter › Duruş › Ağ segmenti · Konsol: `agSegmenti` · Test: 26 + 12 + 5 | — |
| OT-16 | Yetkisiz varlık tespiti | `NOT_STARTED` | — | `UNAUTHORIZED`/`IGNORED_WITH_REASON`/`KNOWN`, duplicate candidate, CMDB↔keşif ters karşılaştırma |
| OT-17 | Pasif OT keşfi | `NOT_STARTED` | — | PCAP/CSV gözlem yutma, OUI parmak izi, protokol imzası |
| OT-20 | Garanti/bakım/lisans süresi | `NOT_STARTED` | — | Yaşam döngüsü alanları, `sonTarih` motoruna kaynak, `Lisans` tablosunu canlandırma |
| OT-21 | Yama durumu | **COMPLETE** | Şema: `YamaKaydi` · Mantık: `lib/varlik/yamaKarari.ts` (durum TÜRETİLİR) · Eylem: `yamaKaydiKaydet` · UI: Envanter › Duruş › Yama duruşu (okuma + elle kayıt formu) · Konsol: `yamaKaydi` · Test: 6 + 4 | — |
| OT-22 | Firmware uyumu | **COMPLETE** | Şema: `FirmwareTemeli` · `FirmwareUyumu` · Mantık: `lib/varlik/firmwareKarari.ts` · Motor: `firmware_uyumu` · Eylem: `firmwareTemeliKaydet` · `firmwareIstisnasiKaydet` · UI: `/tabanlar` ekranı + Envanter › Duruş › Firmware uyumu · Konsol: `firmwareTemeli` · Test: 12 + 4 | — |
| OT-25 | CVE ↔ advisory ↔ sürüm | **COMPLETE** | Şema: `Advisory` · `AdvisoryUrunu` · `AdvisoryZafiyeti` · `ZafiyetKorelasyonu` · Mantık: `lib/varlik/zafiyetKarari.ts` · `lib/varlik/advisory.ts` · Motor: `zafiyet_korelasyonu` · Eylem: `advisoryIceAktar` · `korelasyonElleKarar` · UI: `/tabanlar` › Duyurular paneli + Envanter › Duruş › Zafiyet korelasyonu · Test: 14 + 21 + 7 + 8 | — |
| OT-26 | SBOM | **COMPLETE** | Şema: `SbomBelgesi` · `YazilimBileseni` · `SbomGirdisi` · Mantık: `lib/varlik/sbom.ts` (CycloneDX + SPDX) · Eylem: `sbomYukle` · Motor: bileşen → zafiyet korelasyonu (`yontem: sbom_bileseni`) · UI: Envanter › Duruş › SBOM (dosya + yapıştırma) · Konsol: `sbomBelgesi` · Test: 13 + 3 + 4 | — |
| OT-27 | Güvenlik kapsaması | **COMPLETE** | Şema: `GuvenlikKapsami` · Mantık: `lib/varlik/kapsam.ts` (11 tip × 5 durum) · Eylem: `kapsamKaydet` · UI: Envanter › Duruş › Güvenlik kapsaması · Konsol: `guvenlikKapsami` · Test: 9 + 4 | — |
| OT-28 | Konfigürasyon drift | `NOT_STARTED` | — | Baseline modeli, beklenen/gözlenen hash, onaylı/onaysız drift |
| OT-33 | Hesap tipleri | `NOT_STARTED` | — | `yerel`/`uygulama`/`tedarikci` tipleri, MFA/expiration alanları, hesap motoru |
| OT-40 | Otomatik veri toplama | `NOT_STARTED` | — | Auth soyutlaması, HTTP istemcisi, timeout, tombstone; `maksDeneme`/`geriCekilmeMs`in sessizce yok sayılması (ölçülmüş kusur) |
| OT-44 | Veri kalitesi kuralları | **COMPLETE** | Şema: `VeriKalitesiBulgusu` (mevcut) · Mantık: `agTutarliligi.ts` 6 kural + ölçüm borcu kuralları · Motor: açar VE kapatır · Eylem: `veriKalitesiBulgusuKapat` (giderildi ≠ kabul edildi) · UI: Sağlık › Veri kalitesi kipi + karar formu · Konsol: `veriKalitesiKarari` · Test: 12 + 3 | — |
| OT-48 | Üretim ölçeği altyapısı | `NOT_STARTED` | — | DB/nesne deposu/leader election soyutlamaları, startup readiness · sonunda **dış bağımlılık** |
| OT-49 | Performans testi | `NOT_STARTED` | — | p50/p95/p99, API yük üretici, taban dosyası |
| OT-50 | Gerçek entegrasyonlar | `NOT_STARTED` | — | 7 adaptör şablonu · sonunda **dış bağımlılık** |

### UY — Regülasyon ve uyum

| ID | İster | Durum | Kalan iş |
| --- | --- | --- | --- |
| UY-07 | Kontrol sahipliği | `NOT_STARTED` | Rol ayrımı, ekip, **sahip değişikliğinin denetim izine düşmemesi (ölçülmüş kusur)** |
| UY-12 | Kanıt metadata | `NOT_STARTED` | Sınıflandırma, durum, sürüm artırma, hash üretimi, düzenleme eylemi |
| UY-13 | Kanıt dosyası | `NOT_STARTED` | Tüm dosya katmanı + `StorageProvider` |
| UY-16 | Kapsama/tazelik/hazırlık KPI | `NOT_STARTED` | Coverage ve readiness hesabı (tazelik VAR) |
| UY-18 | Kanıt paketi imzası | `NOT_STARTED` | `SigningProvider` · sonunda **dış bağımlılık** |
| UY-20 | DMS entegrasyonu | `NOT_STARTED` | `DocumentProvider` · sonunda **dış bağımlılık** |
| UY-26 | Kök neden standardı | `NOT_STARTED` | Kategori, zorunluluk politikası, **kapanış kapısında RCA kontrolü yok (ölçülmüş kusur)** |
| UY-28 | Tekrarlayan bulgu | `NOT_STARTED` | Motor · `tekrarBulguId` **yazıcısı olmayan ölü alan** |
| UY-36 | Eskalasyon matrisi | `NOT_STARTED` | Kademe, boyut, yönetici eskalasyonu · `Bildirim.tip='eskalasyon'` **hiç yazılmıyor** |
| UY-39 | Değişiklik etki analizi | `NOT_STARTED` | Önizleme (bugün diff yalnız aktifleştirmeden SONRA yazılıyor), zincirin 9 halkası |
| UY-41 | Resmî kaynak takibi | `NOT_STARTED` | `RegulatorySourceProvider` · sonunda **dış bağımlılık** |
| UY-43 | Değerlendirme içe aktarımı | `NOT_STARTED` | Sihirbaz + kuru koşu + köken |
| UY-52 | Dış uyum API'si | `NOT_STARTED` | 8 okuma ucu + OpenAPI + anahtar kapsamı |
| UY-53 | SSO / MFA | `NOT_STARTED` | `AuthProvider` · sonunda **dış bağımlılık** |
| UY-54 | Vault/KMS/Postgres/kuyruk | `NOT_STARTED` | OT-48 ile ortak · sonunda **dış bağımlılık** |
| UY-55 | Gerçek veri performansı | `NOT_STARTED` | OT-49 ile ortak |
| UY-56 | Retention / legal hold | `NOT_STARTED` | Politika motoru, legal hold, kontrollü imha |
| UY-57 | Dış denetçi erişimi | `NOT_STARTED` | Davet, süre sonu, denetim kapsamı, iptal, erişim izi |

---

## 3. FAZ A'da ne yapıldı — kanıtla

### 3.1 Ortak alan primitifleri

Denetimin en değerli tespiti: **OT-21, OT-22, OT-25 ve OT-26 tek bir
eksik yapı taşına dayanıyordu.** Repoda yapısal sürüm karşılaştırması
hiç yoktu; `semver|compareVersion` araması sıfır sonuç veriyordu. Aynı
biçimde OT-11 ve OT-44 için IP/subnet matematiği yoktu.

| Modül | Ne çözer | Test |
| --- | --- | --- |
| `lib/alan/surum.ts` | Sürüm çözümleme, karşılaştırma, uç noktalı aralık | 20 |
| `lib/alan/ag.ts` | IPv4/IPv6, subnet, CIDR, çakışma, çift adres | 26 |
| `lib/alan/metin.ts` | Kimlik katlama (üretici/model/CPE/sürüm etiketi) | 7 |

Üçünün de ortak kuralı: **karar verilemez ≠ olumsuz.** Sürüm
çözümlenemiyorsa `karsilastir` `null` döner (`0` değil); IP
çözümlenemiyorsa `icindeMi` `null` döner (`false` değil).

**Ölçülerek bulunan iki gerçek kusur:**
1. Öntakı düzenli ifadesinde `r` alternatifi `rev`den önce eşleşiyordu;
   `"rev 1.2.3"` çözümlenemiyordu.
2. **Türkçe I tuzağının ters yüzü:** `'SIEMENS'.toLocaleLowerCase('tr')`
   `sıemens` verir ve `Siemens` ile eşleşmez. Üreticisi büyük harfle
   yazılmış her cihazın zafiyeti ekranda **hiç görünmezdi**. Kural kayda
   geçti: kullanıcıya gösterilen Türkçe metin `toLocaleLowerCase('tr')`,
   **kimlik** `lib/alan/metin.ts` → `kimlikKatla`.

### 3.2 Şema — 13 yeni model, iki salt ekleyici göç

| Göç | Ne ekler | Veri güvenliği |
| --- | --- | --- |
| `20260903111746_varlik_guvenlik_durusu` | 13 model + `Zafiyet`e 6 alan + `Varlik.segmentId` | Taşınmayan kolon **0** · satır sayısı değişen tablo **0** (3856 satır / 100 tablo) · denetim izi tetikleyicisi **4/4** · yabancı anahtar kusuru **0** |
| `20260903115951_sbom_kanonik_kimlik` | `YazilimBileseni.kimlik` (kanonik tekillik) | SQLite'ta NULL'lar birbirinden ayrıktır; `@@unique([ad, surum, purl])` her sürümsüz bileşen için yeni satır açardı. Geri doldurma deterministik. |
| `20260903121238_varlik_kimlik_alanlari` | `Varlik`a 4 kimlik alanı (OT-03) | Saf `ALTER TABLE ADD COLUMN` · 347 satır, 114 tablo, 4 tetikleyici, 0 FK kusuru — göç öncesi ve sonrası birebir aynı |

### 3.3 Alan mantığı — yedi saf modül

| Modül | Madde | Test |
| --- | --- | --- |
| `lib/varlik/firmwareKarari.ts` | OT-22 | 12 |
| `lib/varlik/yamaKarari.ts` | OT-21 | 6 |
| `lib/varlik/zafiyetKarari.ts` | OT-25 | 14 |
| `lib/varlik/advisory.ts` | OT-25 | 21 |
| `lib/varlik/sbom.ts` | OT-26 | 13 |
| `lib/varlik/kapsam.ts` | OT-27 | 9 |
| `lib/varlik/agTutarliligi.ts` | OT-11 · OT-44 | 12 |

Hiçbirinde `db` yoktur; hepsi veritabanısız, bütün kenar durumlarıyla
test edilir. `yamaKarari.ts` ve `sbom.ts` ayrıca demo ikizinin de
okuduğu kaynaktır: `'use server'` bir modül sabit ve senkron fonksiyon
dışa aktaramaz, ve kopyalanmış bir ikinci uygulama iki ortamın sessizce
ayrışması demekti.

### 3.4 Motorlar — üçü deftere bağlandı

`lib/motorlar/varlikDurusu.ts` → `firmware_uyumu` ·
`zafiyet_korelasyonu` · `ag_tutarliligi`.

Üçü de **önerir, karar vermez**: kendi tablolarına yazar; `Varlik`
satırına, zafiyet durumuna ya da bulgu durumuna dokunmaz. Korelasyon
motoru elle verilmiş kararı (`elleSonuc`) korur — her koşuda silinseydi
yanlış pozitif bastırma işe yaramazdı.

Korelasyon motoru **iki kaynağı** birlikte okur: cihazın kendi
üretici/model/firmware üçlüsü ve — varsa — SBOM'undaki bileşenler.
İkincisi olmasaydı SBOM yüklenip hiçbir soruya cevap vermeyen bir belge
olurdu; zafiyet çoğu zaman cihazda değil içindeki kütüphanededir.
Bileşenden gelen kararın gerekçesi bileşenin adını taşır, çünkü
"bu cihaz etkilenen" demek yetmez — yamalanacak şey kütüphanedir.

**Deponun nöbetçileri üç kez haklı çıktı** ve üçü de gerçek eksik yakaladı:
1. `IS_TANIMLARI` (sağlık ekranı kataloğu) — görünmez motor bırakılmıyor.
2. `MOTOR_ADLARI_SOZLUK` — güvenli bayrağı olmayan motor zamanlayıcıyı
   "Bilinmeyen yapılandırma anahtarı" ile durduruyor ve **hiç koşmuyordu**.
3. Üç ayrı testteki sabit motor sayısı — defterden sessizce düşen motoru
   yakalayan tek şey.

### 3.5 Ekranlar

| Yüzey | Madde | Ne yapar |
| --- | --- | --- |
| Envanter çekmecesi › **Duruş** sekmesi | OT-03 · 11 · 21 · 22 · 25 · 26 · 27 | Varlığın kendi satırında OLMAYAN yedi kaydı tek yüzeyde toplar; yazma yüzeyleri de burada |
| Topoloji › **Segmentler** kipi | OT-11 | VLAN + CIDR + ağ geçidi CRUD, açık veri kalitesi bulgusu sayacı |
| **`/tabanlar`** (Varlık › Yaşam döngüsü) | OT-22 · OT-25 | Firmware tabanı CRUD + duyuru içe aktarımı |
| Sağlık › Veri kalitesi kipi | OT-44 | Bulguyu GİDERİLDİ / KABUL EDİLDİ diye karara bağlama |

Her ekran aynı üç ayrımı korur: **ölçülmedi ≠ yok**, **uygulanamaz ≠
eksik**, **motor kararı ≠ insan kararı.**

En keskin örnek OT-03'te: uygulanamaz işaretli kimlik alanı doluluk
oranının **paydasından düşer.** Ölçülmemiş alan bir borçtur, uygulanamaz
alan bir karardır; ikisini aynı sayaçta toplamak kapatılması imkânsız
bir borç üretir ve o sayaca kimse bakmaz. Payda sıfırlanırsa oran
`null`'dır — `%0` da `%100` de yalan olurdu.

### 3.6 Yönetim konsolu

Yedi yeni modül kaydı: `agSegmenti` · `firmwareTemeli` ·
`guvenlikKapsami` · `alanUygulanabilirligi` · `yamaKaydi` ·
`sbomBelgesi` · `veriKalitesiKarari`.

**Kapsama paydası elle yazılmaz.** `lib/yonetim/moduller.ts →
kapsamaOzeti` sayıyı kütükten türetir; `kutukTutarli` her modülün
sınıf/yer sözleşmesini test içinde doğrular. Bu belgede de, ekranda da
sabit bir "40/40" yoktur.

---

## 4. Sıradaki iş — bağımlılık sırası

1. **OT-05 / OT-08 / OT-09 / OT-20** — ortak `Sahiplik`, `Ekip` ve
   `ProsesAdimi` primitifleri dördünü birden açar.
2. **OT-16 / OT-17 / OT-28** — keşif ve drift; üçü de aynı "gözlenen ↔
   beklenen" karşılaştırmasına dayanır.
3. **UY-12 / UY-13 / UY-16** — kanıt katmanı; `StorageProvider`
   soyutlaması UY-13 ile UY-18'i birlikte taşır.
4. **UY-26 / UY-28 / UY-36** — üçü de `Bulgu` çevresinde; birlikte
   yapılmalı.
5. **OT-48 / UY-54 tek sağlayıcı mimarisi** — OT-40, OT-50, UY-41, UY-53
   ondan sonra anlamlı.

---

## 5. Gerçek bağlantı için gereken dış bilgiler

Yalnız gerçekten gerekenler. Bu bilgiler gelmeden de **repo içi hazırlık
tamamlanabilir**; aşağıdaki maddeler o hazırlık henüz yapılmadığı için
`NOT_STARTED`tır, "bilgi bekliyor" değil.

| Madde | Gereken |
| --- | --- |
| OT-40 · OT-50 | Kurum CMDB/EDR/SIEM/OT keşif ürünlerinin adı, API sürümü, kimlik yöntemi |
| OT-48 · UY-54 | PostgreSQL, Redis/kuyruk, nesne deposu, Vault/KMS uç noktaları |
| UY-18 | İmzalama için HSM/KMS erişimi ve sertifika politikası |
| UY-20 | Kurumun DYS ürünü ve API'si |
| UY-41 | Takip edilecek resmî mevzuat kaynaklarının adresleri |
| UY-53 | IdP (Entra/ADFS) tenant, OIDC/SAML metadata, claim eşlemesi |
| OT-49 · UY-55 | Hedef eşikler: eşzamanlı kullanıcı, kabul edilebilir gecikme |
