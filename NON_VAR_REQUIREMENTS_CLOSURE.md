# "VAR olmayan" isterlerin kapatılması — durum kütüğü

**Genel durum: BLOCKED.** 38 maddenin tamamı kapatılmadı. Bu belge neyin
gerçekten kapandığını, neyin kısmen ilerlediğini ve neyin hiç
başlamadığını **dosya kanıtıyla** yazar.

> **"Tamamlandı" ne demek.** Bu kütükte bir madde ancak **kod + test +
> UI/API sözleşmesi** birlikte varsa "tamamlandı" yazılır. Şeması olan
> ama ekranı olmayan madde tamamlanmış sayılmaz; mantığı olan ama
> motoru olmayan madde de öyle. Ölçüt kasıtlı olarak serttir: bu
> belgenin işi ilerlemeyi büyük göstermek değil, kalan işi görünür
> tutmaktır.

Ölçüm tarihi: 03.09.2026 · Dal: `claude/repo-public-github-domain-271hxa`

---

## 1. Ne yapıldı

### 1.1 Denetim — 38 maddenin bugünkü gerçeği

Beş paralel salt-okuma denetimi, her maddenin durumunu `dosya:satır`
kanıtıyla çıkardı. Eski gap dokümanları (`ARCHITECTURE_GAP_ANALYSIS.md`,
`ENTEGRASYON_GAP_MATRIX.md`) **kullanılmadı** — onlar bilerek
güncellenmiyor ve güncel gerçek değiller.

Denetimin en değerli tespiti: **OT-21, OT-22, OT-25 ve OT-26 tek bir
eksik yapı taşına dayanıyordu.** Repoda yapısal sürüm karşılaştırması
hiç yoktu; `semver|compareVersion` araması sıfır sonuç veriyordu. String
karşılaştırma bile yoktu. Aynı biçimde OT-11 ve OT-44 için IP/subnet
matematiği yoktu.

Denetim ayrıca **beklenenden güçlü** üç alan buldu ve bunlar yeniden
yazılmadı:
- **Entegrasyon dürüstlüğü** kusursuza yakın: `CONNECTED` / `NOT_CONFIGURED`
  / `ERROR` ayrımı, `kimlik_bekleniyor` ayrı durumu, kuru koşunun
  "başarılı" sayılmaması, "provider kodu var diye connected yazan" yer
  bulunamadı (`lib/entegrasyon/saglikOzeti.ts:511-526`).
- **Köken (provenance)** olgun ve genel: `VeriKokeni` herhangi bir modele
  takılabilir, güven `null = ölçülmedi`, doğrulama ayrı
  (`prisma/schema.prisma` · `VeriKokeni`).
- **Denetim izi değişmezliği** veritabanı seviyesinde: dört SQLite
  tetikleyicisi `AktiviteKaydi` ve `DegerlendirmeTarihcesi` üzerinde
  güncelleme/silmeyi reddediyor.

### 1.2 Ortak alan primitifleri — üç yapı taşı

| Modül | Ne çözer | Test |
| --- | --- | --- |
| `web/lib/alan/surum.ts` | Sürüm çözümleme, karşılaştırma, uç noktalı aralık | 20 |
| `web/lib/alan/ag.ts` | IPv4/IPv6, subnet, CIDR, çakışma, çift adres | 26 |
| `web/lib/alan/metin.ts` | Kimlik katlama (üretici/model/CPE/sürüm etiketi) | 7 |

Üçünün de ortak kuralı: **karar verilemez ≠ olumsuz.** Sürüm
çözümlenemiyorsa `karsilastir` `null` döner (`0` değil); IP
çözümlenemiyorsa `icindeMi` `null` döner (`false` değil). Çağıran
belirsizliği görmezden gelemez — tip sistemi buna zorlar.

**Ölçülerek bulunan iki gerçek kusur:**
1. Öntakı düzenli ifadesinde `r` alternatifi `rev`den önce eşleşiyordu;
   `"rev 1.2.3"` çözümlenemiyordu.
2. **Türkçe I tuzağının ters yüzü:** `'SIEMENS'.toLocaleLowerCase('tr')`
   `sıemens` verir ve `Siemens` ile eşleşmez. Üreticisi büyük harfle
   yazılmış her cihazın zafiyeti ekranda **hiç görünmezdi**. Kural kayda
   geçti: kullanıcıya gösterilen Türkçe metin `toLocaleLowerCase('tr')`,
   **kimlik** `lib/alan/metin.ts`.

### 1.3 Şema — 13 yeni model, salt ekleyici göç

Göç: `web/prisma/migrations/20260903111746_varlik_guvenlik_durusu`

`AgSegmenti` · `AlanUygulanabilirligi` · `YamaKaydi` · `FirmwareTemeli` ·
`FirmwareUyumu` · `Advisory` · `AdvisoryUrunu` · `AdvisoryZafiyeti` ·
`ZafiyetKorelasyonu` · `SbomBelgesi` · `YazilimBileseni` · `SbomGirdisi` ·
`GuvenlikKapsami`. Ayrıca `Zafiyet`e altı alan (`cvssVektor`,
`cvssSurumu`, `cpe`, `istismarDurumu`, `kevMi`, `epss`) ve `Varlik`a
`segmentId`.

**Veri güvenliği ölçüldü, varsayılmadı.** Prisma SQLite'ın tablo-yeniden-
kurma kalıbını kullandı (`Tesis`, `Varlik`, `Zafiyet`). Kolon kolon
karşılaştırıldı:

| Ölçüm | Sonuç |
| --- | --- |
| Taşınmayan kolon | **0** |
| Satır sayısı değişen tablo | **0** (3856 satır, 100 tablo) |
| Denetim izi değişmezlik tetikleyicisi | **4/4 sağlam** |
| Yabancı anahtar kusuru | **0** |

### 1.4 Alan mantığı — beş saf modül

| Modül | Madde | Test |
| --- | --- | --- |
| `lib/varlik/firmwareKarari.ts` | OT-22 | 12 |
| `lib/varlik/zafiyetKarari.ts` | OT-25 | 14 |
| `lib/varlik/sbom.ts` | OT-26 | 13 |
| `lib/varlik/kapsam.ts` | OT-27 | 9 |
| `lib/varlik/agTutarliligi.ts` | OT-11 · OT-44 | 12 |

Hiçbirinde `db` yoktur; hepsi veritabanısız, bütün kenar durumlarıyla
test edilir.

### 1.5 Motorlar — üçü deftere bağlandı

`lib/motorlar/varlikDurusu.ts` → `firmware_uyumu` ·
`zafiyet_korelasyonu` · `ag_tutarliligi`.

Üçü de **önerir, karar vermez**: kendi tablolarına yazar; `Varlik`
satırına, zafiyet durumuna ya da bulgu durumuna dokunmaz. Korelasyon
motoru elle verilmiş kararı (`elleSonuc`) korur — her koşuda silinseydi
yanlış pozitif bastırma işe yaramazdı.

**Deponun nöbetçileri üç kez haklı çıktı** ve üçü de gerçek eksik yakaladı:
1. `IS_TANIMLARI` (sağlık ekranı kataloğu) — görünmez motor bırakılmıyor.
2. `MOTOR_ADLARI_SOZLUK` — güvenli bayrağı olmayan motor zamanlayıcıyı
   "Bilinmeyen yapılandırma anahtarı" ile durduruyor ve **hiç koşmuyordu**.
3. Üç ayrı testteki sabit motor sayısı — defterden sessizce düşen motoru
   yakalayan tek şey.

---

## 2. Madde madde durum

Kısaltmalar: **KAPANDI** = kod + test + UI/API · **İLERLEDİ** = bir
kısmı gerçekten yapıldı, kalanı yazılı · **BAŞLAMADI** = bu programda
dokunulmadı · **DIŞ BAĞIMLILIK** = repo içi hazırlık ayrı ölçülür.

### OT — Envanter

| ID | İster | Önceki | Yeni | Uygulama | Test | Kalan iş |
| --- | --- | --- | --- | --- | --- | --- |
| OT-03 | Teknik künye standardı | KISMİ | **İLERLEDİ** | `AlanUygulanabilirligi` (uygulanamaz≠bilinmiyor) | — | marka/donanım revizyonu/OS sürümü alanları, IP-MAC biçim doğrulaması, IP yineleme kuralı, UI |
| OT-05 | Varlık ↔ proses ↔ adım | KISMİ | **BAŞLAMADI** | — | — | ProcessStep modeli, M:N bağ, ilişki metadatası, UI |
| OT-08 | Üretim/iş sürekliliği etkisi | KISMİ | **BAŞLAMADI** | — | — | Etki modeli, MW kaybı, miras etki, yazma yolu (alanlar bugün ürün içinden doldurulamıyor) |
| OT-09 | Sahiplik ve ekip | KISMİ | **BAŞLAMADI** | — | — | Ekip modeli, rol ayrımı, toplu devir, pasif sahip uyarısı |
| OT-11 | Zone / VLAN / subnet | KISMİ | **İLERLEDİ** | `AgSegmenti` + `agTutarliligi.ts` + motor | 12 + 26 | UI (segment CRUD, topoloji bağı), konsol ayarı |
| OT-16 | Yetkisiz varlık tespiti | KISMİ | **BAŞLAMADI** | — | — | `UNAUTHORIZED`/`IGNORED_WITH_REASON`/`KNOWN` durumları, duplicate candidate, CMDB↔keşif ters karşılaştırma |
| OT-17 | Pasif OT keşfi | KISMİ | **BAŞLAMADI** | — | — | PCAP/CSV gözlem yutma, OUI parmak izi, protokol imzası |
| OT-20 | Garanti/bakım/lisans süresi | KISMİ | **BAŞLAMADI** | — | — | ~10 yaşam döngüsü alanı, `sonTarih` motoruna kaynak ekleme, `Lisans` tablosunu canlandırma |
| OT-21 | Yama durumu | KISMİ | **İLERLEDİ** | `YamaKaydi` şeması | — | Karar mantığı, motor, kaynak adaptörü, UI |
| OT-22 | Firmware uyumu | YOK | **İLERLEDİ** | Şema + `firmwareKarari.ts` + motor | 12 | Taban CRUD ekranı, uyum listesi UI, konsol ayarı |
| OT-25 | CVE ↔ advisory ↔ sürüm | KISMİ | **İLERLEDİ** | Şema + `zafiyetKarari.ts` + motor | 14 | Advisory içe aktarma, korelasyon ekranı, elle bastırma UI |
| OT-26 | SBOM | YOK | **İLERLEDİ** | Şema + CycloneDX/SPDX ayrıştırıcı | 13 | Yükleme eylemi + UI, bileşen→zafiyet korelasyonu |
| OT-27 | Güvenlik kapsaması | KISMİ | **İLERLEDİ** | Şema + `kapsam.ts` (5 durum) | 9 | Motor, kaynak adaptörleri, UI |
| OT-28 | Konfigürasyon drift | KISMİ | **BAŞLAMADI** | — | — | Baseline modeli, beklenen/gözlenen hash, onaylı/onaysız drift |
| OT-33 | Hesap tipleri | KISMİ | **BAŞLAMADI** | — | — | `yerel`/`uygulama`/`tedarikci` tipleri, MFA/expiration alanları, hesap motoru |
| OT-40 | Otomatik veri toplama | KISMİ | **BAŞLAMADI** | — | — | Auth soyutlaması, HTTP istemcisi, timeout, tombstone, `maksDeneme`/`geriCekilmeMs`in sessizce yok sayılması (ölçülmüş kusur) |
| OT-44 | Veri kalitesi kuralları | KISMİ | **İLERLEDİ** | 6 yeni ağ kuralı + kapatma döngüsü | 12 | 12 kural daha, severity, açıklanabilir skor |
| OT-48 | Üretim ölçeği altyapısı | KISMİ | **BAŞLAMADI** | — | — | DB/nesne deposu/leader election soyutlamaları, startup readiness · **DIŞ BAĞIMLILIK** |
| OT-49 | Performans testi | KISMİ | **BAŞLAMADI** | — | — | p50/p95/p99, API yük üretici, taban dosyası |
| OT-50 | Gerçek entegrasyonlar | YOK | **BAŞLAMADI** | — | — | 7 adaptör şablonu · **DIŞ BAĞIMLILIK** |

### UY — Regülasyon ve uyum

| ID | İster | Önceki | Yeni | Kalan iş |
| --- | --- | --- | --- | --- |
| UY-07 | Kontrol sahipliği | KISMİ | **BAŞLAMADI** | Rol ayrımı, ekip, **owner değişikliğinin denetim izine düşmemesi (ölçülmüş kusur)** |
| UY-12 | Kanıt metadata | KISMİ | **BAŞLAMADI** | Sınıflandırma, durum, sürüm artırma, hash üretimi, düzenleme eylemi |
| UY-13 | Kanıt dosyası | YOK | **BAŞLAMADI** | Tüm dosya katmanı + `StorageProvider` |
| UY-16 | Kapsama/tazelik/hazırlık KPI | KISMİ | **BAŞLAMADI** | Coverage ve readiness hesabı (tazelik VAR) |
| UY-18 | Kanıt paketi imzası | KISMİ | **BAŞLAMADI** | `SigningProvider` · **DIŞ BAĞIMLILIK** |
| UY-20 | DMS entegrasyonu | YOK | **BAŞLAMADI** | `DocumentProvider` · **DIŞ BAĞIMLILIK** |
| UY-26 | Kök neden standardı | KISMİ | **BAŞLAMADI** | Kategori, zorunluluk politikası, **kapanış kapısında RCA kontrolü yok (ölçülmüş kusur)** |
| UY-28 | Tekrarlayan bulgu | YOK | **BAŞLAMADI** | Motor · `tekrarBulguId` **yazıcısı olmayan ölü alan** |
| UY-36 | Eskalasyon matrisi | KISMİ | **BAŞLAMADI** | Kademe, boyut, yönetici eskalasyonu · `Bildirim.tip='eskalasyon'` **hiç yazılmıyor** |
| UY-39 | Değişiklik etki analizi | KISMİ | **BAŞLAMADI** | Önizleme (bugün diff yalnız aktifleştirmeden SONRA yazılıyor), zincirin 9 halkası |
| UY-41 | Resmî kaynak takibi | KISMİ | **BAŞLAMADI** | `RegulatorySourceProvider` · **DIŞ BAĞIMLILIK** |
| UY-43 | Değerlendirme içe aktarımı | YOK | **BAŞLAMADI** | Sihirbaz + dry-run + provenance |
| UY-52 | Dış uyum API'si | KISMİ | **BAŞLAMADI** | 8 okuma ucu + OpenAPI + anahtar kapsamı |
| UY-53 | SSO / MFA | YOK | **BAŞLAMADI** | `AuthProvider` · **DIŞ BAĞIMLILIK** |
| UY-54 | Vault/KMS/Postgres/kuyruk | KISMİ | **BAŞLAMADI** | OT-48 ile ortak · **DIŞ BAĞIMLILIK** |
| UY-55 | Gerçek veri performansı | KISMİ | **BAŞLAMADI** | OT-49 ile ortak |
| UY-56 | Retention / legal hold | YOK | **BAŞLAMADI** | Politika motoru, legal hold, kontrollü imha |
| UY-57 | Dış denetçi erişimi | KISMİ | **BAŞLAMADI** | Davet, süre sonu, denetim kapsamı, iptal, erişim izi |

---

## 3. Sayılar

| Ölçü | Değer |
| --- | --- |
| Madde | 38 |
| **KAPANDI** | **0** |
| İLERLEDİ | 7 (OT-03 · OT-11 · OT-21 · OT-22 · OT-25 · OT-26 · OT-27 · OT-44) |
| BAŞLAMADI | 31 |
| Yeni Prisma modeli | 13 |
| Yeni göç | 1 (salt ekleyici, veri kaybı 0) |
| Yeni motor | 3 (9 → 12) |
| Yeni test vakası | 121 |
| Toplam test | 1776 geçti · 1 atlandı |

---

## 4. Neden BLOCKED

Repo içinde çözülebilecek iş **bitmedi.** Yukarıdaki 31 madde dış
bağımlılık beklemiyor; kod, test ve ekran işi bekliyor. Bu belge onları
"KISMİ" diye yumuşatmıyor: gerçek dış bağımlılığı olan yedi madde
(OT-48 · OT-50 · UY-18 · UY-20 · UY-41 · UY-53 · UY-54) ayrıca
işaretlendi, kalanlar repo içi borçtur.

**Bu programda hiçbir madde sahte tamamlanmışlıkla kapatılmadı.** Şeması
yazılan ama ekranı olmayan yedi madde "İLERLEDİ" diye yazıldı,
"tamamlandı" diye değil.

---

## 5. Sıradaki iş — bağımlılık sırası

1. **İlerleyen yedi maddenin UI + konsol ayağı.** Şema ve mantık hazır;
   ekran ve yönetim konsolu satırları eksik. En kısa yoldan gerçek
   kapanma buradadır.
2. **OT-03/05/08/09/20 şeması** — ortak `Sahiplik` ve `Ekip` primitifleri
   bu beşini birden açar.
3. **UY-12/13/16 kanıt katmanı** — `StorageProvider` soyutlaması UY-13 ve
   UY-18'i birlikte taşır.
4. **UY-26/28/36 yönetişim** — üçü de `Bulgu` çevresinde; birlikte
   yapılmalı.
5. **OT-48/UY-54 tek sağlayıcı mimarisi** — OT-50, UY-41, UY-53 ondan
   sonra anlamlı.

---

## 6. Gerçek bağlantı için gereken dış bilgiler

Yalnız gerçekten gerekenler:

| Madde | Gereken |
| --- | --- |
| OT-50 · OT-40 | Kurum CMDB/EDR/SIEM/OT keşif ürünlerinin adı, API sürümü, kimlik yöntemi |
| OT-48 · UY-54 | PostgreSQL, Redis/kuyruk, nesne deposu, Vault/KMS uç noktaları |
| UY-18 | İmzalama için HSM/KMS erişimi ve sertifika politikası |
| UY-20 | Kurumun DYS ürünü ve API'si |
| UY-41 | Takip edilecek resmî mevzuat kaynaklarının adresleri |
| UY-53 | IdP (Entra/ADFS) tenant, OIDC/SAML metadata, claim eşlemesi |
| OT-49 · UY-55 | Hedef eşikler: eşzamanlı kullanıcı, kabul edilebilir gecikme |

Bu bilgiler gelmeden de **repo içi hazırlık tamamlanabilir**; yukarıdaki
listede o hazırlık henüz yapılmadığı için maddeler "BAŞLAMADI"dır,
"bilgi bekliyor" değil.
