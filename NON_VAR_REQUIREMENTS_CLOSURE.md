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
| **COMPLETE** | **17** |
| CODE_READY_EXTERNAL_DEPENDENCY | 3 |
| IN_PROGRESS | 0 |
| NOT_STARTED | 18 |
| Yeni Prisma modeli | 21 (FAZ A 13 · FAZ B 8) |
| Yeni göç | 4 (dördü de veri kaybı 0 · ölçülerek doğrulandı) |
| Yeni motor | 5 (9 → 14) |
| Yeni rota | 2 (`/tabanlar` · `/prosesler`) |
| Yeni konsol modülü | 22 |
| Toplam test | 2072 geçti · 1 atlandı |

### Kapı sonuçları (03.09.2026 · FAZ B sonu)

| Kapı | Sonuç |
| --- | --- |
| `npm run test` | **2072 geçti · 1 atlandı · 0 kusur** (110 dosya) |
| `npm run lint` · `npx tsc --noEmit` | temiz |
| `tasarim:kapi` | kontrast kusuru 0 · eksik font 0 · eski tasarım izi 0 |
| `rota:duman` | **48/48 rota** · kusurlu 0 · test edilemedi 0 · sayfa hatası 0 |
| `tasarim:dizustu` (1366×768) | 40 rota · **kırpılan öğe 0** · yatay taşan rota 0 |
| `tasarim:axe` (WCAG 2 A/AA) | 41 rota · ciddi/kritik ihlal **0** · kırık tarama 0 |
| `tasarim:tasma` | 80 ölçümde 4 kusur — **hepsi bu programdan ÖNCE de vardı** (`/envanter` ×2, `/sistem`, `/sistem/bilesenler`; 375px ve 768px). FAZ B'nin dokunduğu hiçbir ekran (`/prosesler`, `/yetkiler`, `/yedekleme`, `/kimlik`) listede yok. |
| `npm run build` | başarılı (`/prosesler` dâhil) |

Kapı çıktıları **olduğu gibi** yazıldı; hedefe uydurulmadı. Taşma
kapısındaki 4 kusur bu programın ürünü değildir ve bilerek kapatılmamış
olarak bırakıldı — kaynakları `/envanter` kip çubuğu ile `/sistem`
token tablosudur ve ikisi de ayrı bir işin konusudur.

---

## 2. Madde madde durum

### OT — Envanter ve OT güvenliği

| ID | İster | Durum | Kanıt | Kalan iş |
| --- | --- | --- | --- | --- |
| OT-03 | Teknik künye standardı | **COMPLETE** | Şema: `Varlik.ipv6Adresi · isletimSistemiSurumu · firmwareYapisi · donanimRevizyonu` + `AlanUygulanabilirligi` · Mantık: `envanter/mantik.ts → kimlikEnvanteri · kimlikTamligi` · Eylem: `alanUygulanamazIsaretle` / `…Kaldir` · UI: Envanter çekmecesi › Duruş › Kimlik alanları · Konsol: `alanUygulanabilirligi` · Test: 12 + 4 | — |
| OT-05 | Varlık ↔ proses ↔ adım | **COMPLETE** | Şema: `ProsesAdimi` · `AdimVarligi` (bağın kendisi rol · tekNokta · yedekli taşır) · Mantık: `lib/varlik/etki.ts` + `prosesler/mantik.ts` · Eylem: `isSureciKaydet` · `prosesAdimiKaydet` · `adimVarligiAta` · `adimVarligiKaldir` · UI: `/prosesler` ekranı (süreç + adım CRUD, bağ formu) + Envanter › Yönetişim › Proses adımları · Konsol: `isSureci` · `prosesAdimi` · Test: 20 + 12 | — |
| OT-08 | Üretim/iş sürekliliği etkisi | **COMPLETE** | Şema: `EtkiDegerlendirmesi` (MW · RTO/RPO · emniyet · çevre · gerekçe) · Mantık: `lib/varlik/etki.ts → gecerliEtki` (miras ÖLÇÜLENİ ezmez) · `etkiOzeti` (ölçülmemişte `toplamMw: null`) · Eylem: `etkiDegerlendirmesiKaydet` (sayı yazan değerlendirme gerekçe ister) · UI: Envanter › Yönetişim › Etki + `/prosesler` adım RTO/RPO · Konsol: `etkiDegerlendirmesi` · Test: 21 + 6 | — |
| OT-09 | Sahiplik ve ekip | **COMPLETE** | Şema: `Ekip` · `EkipUyeligi` · `Varlik.ekipId` · Mantık: `lib/varlik/sahiplik.ts` (`pasif` en ağır durum · `etkinSahip` pasif kişi döndürmez · `devirOnizlemesi`) · Eylem: `ekipKaydet` · `ekipUyeligiKaydet` / `…Kaldir` · `varligaEkipAta` · `topluSahipDevri` (gerekçe + 500 tavan + kayıt başına iz) · UI: `/yetkiler` › Ekipler çekmecesi + hesap çekmecesinde Varlık sahipliği/devir + Envanter › Yönetişim › Sahiplik · Konsol: `ekip` · Test: 18 + 11 + 6 | — |
| OT-11 | Zone / VLAN / subnet | **COMPLETE** | Şema: `AgSegmenti` + `Varlik.segmentId` · Mantık: `lib/alan/ag.ts` · `lib/varlik/agTutarliligi.ts` · Motor: `ag_tutarliligi` · Eylem: `agSegmentiKaydet` · `varligaSegmentAta` · UI: Topoloji › Segmentler kipi (CRUD + çekmece), Envanter › Duruş › Ağ segmenti · Konsol: `agSegmenti` · Test: 26 + 12 + 5 | — |
| OT-16 | Yetkisiz varlık tespiti | **COMPLETE** | Şema: `KesifKaydi`ye yetki kararı alanları · Mantık: `lib/varlik/kesifYetkisi.ts` (`karar_verilmedi`/`bilinen`/`yetkisiz`/`gerekceyle_yoksayildi` · `yinelenenAdayMi` yalnız IP eşleşmesinde `null` döner — DHCP) · `tersKarsilastir` · Motor: `envanter_gorunurlugu` (açar, envanterden DÜŞÜRMEZ) · Eylem: `kesifYetkiKarari` · UI: `/kesif` yetki kararı · Konsol: `kesifYetkiKarari` · Test: 17 + 5 | — |
| OT-17 | Pasif OT keşfi | **COMPLETE** | Şema: `OuiKaydi` · Mantık: `lib/varlik/otGozlem.ts` (`macKanonik` · `ouiCoz` · 15 IANA kayıtlı OT portu · `protokolKodu` belirsizde `null`) · Eylem: `ouiKutuguYukle` · `pasifGozlemYukle` · UI: `/kesif` › OUI kütüğü + pasif gözlem yükleme · Konsol: `ouiKutugu` · `pasifGozlem` · Test: 19 + 4 | **Kütük ürünle GELMEZ:** IEEE OUI kaydı boştur; kurum yükleyene kadar üretici alanı "kütükte yok" kalır ve UYDURULMAZ. Ürün OT ağında aktif tarama yapmaz. |
| OT-20 | Garanti/bakım/lisans süresi | **COMPLETE** | Şema: `Varlik.garantiSaglayici · bakimBitis · sonBakim · sonrakiBakim` (mevcut `garantiBitis` · `destekBitis` · `eolTarihi` · `eosTarihi` ile beş saat) · Mantık: `lib/varlik/omurTarihleri.ts` (`gecerli`/`yaklasiyor`/`doldu`/`olculmedi` · `enAcilSure` girilmemişte `null`) · UI: Envanter › Yönetişim › Süreler · Test: 22 | — |
| OT-21 | Yama durumu | **COMPLETE** | Şema: `YamaKaydi` · Mantık: `lib/varlik/yamaKarari.ts` (durum TÜRETİLİR) · Eylem: `yamaKaydiKaydet` · UI: Envanter › Duruş › Yama duruşu (okuma + elle kayıt formu) · Konsol: `yamaKaydi` · Test: 6 + 4 | — |
| OT-22 | Firmware uyumu | **COMPLETE** | Şema: `FirmwareTemeli` · `FirmwareUyumu` · Mantık: `lib/varlik/firmwareKarari.ts` · Motor: `firmware_uyumu` · Eylem: `firmwareTemeliKaydet` · `firmwareIstisnasiKaydet` · UI: `/tabanlar` ekranı + Envanter › Duruş › Firmware uyumu · Konsol: `firmwareTemeli` · Test: 12 + 4 | — |
| OT-25 | CVE ↔ advisory ↔ sürüm | **COMPLETE** | Şema: `Advisory` · `AdvisoryUrunu` · `AdvisoryZafiyeti` · `ZafiyetKorelasyonu` · Mantık: `lib/varlik/zafiyetKarari.ts` · `lib/varlik/advisory.ts` · Motor: `zafiyet_korelasyonu` · Eylem: `advisoryIceAktar` · `korelasyonElleKarar` · UI: `/tabanlar` › Duyurular paneli + Envanter › Duruş › Zafiyet korelasyonu · Test: 14 + 21 + 7 + 8 | — |
| OT-26 | SBOM | **COMPLETE** | Şema: `SbomBelgesi` · `YazilimBileseni` · `SbomGirdisi` · Mantık: `lib/varlik/sbom.ts` (CycloneDX + SPDX) · Eylem: `sbomYukle` · Motor: bileşen → zafiyet korelasyonu (`yontem: sbom_bileseni`) · UI: Envanter › Duruş › SBOM (dosya + yapıştırma) · Konsol: `sbomBelgesi` · Test: 13 + 3 + 4 | — |
| OT-27 | Güvenlik kapsaması | **COMPLETE** | Şema: `GuvenlikKapsami` · Mantık: `lib/varlik/kapsam.ts` (11 tip × 5 durum) · Eylem: `kapsamKaydet` · UI: Envanter › Duruş › Güvenlik kapsaması · Konsol: `guvenlikKapsami` · Test: 9 + 4 | — |
| OT-28 | Konfigürasyon drift | **COMPLETE** | Şema: `KonfigTemeli` · `KonfigSapmasi` · Mantık: `lib/varlik/konfigDrift.ts` (eksik özet `sapma` DEĞİL `karar_verilemedi` · tabansız cihaz oranın PAYDASINA girmez) · Motor: `konfig_drift` (düzelen sapmayı kapatır, elle kararlı satıra dokunmaz) · Eylem: `konfigTemeliOnayla` (özetsiz yedek taban olamaz) · `konfigSapmasiKarari` (onaylı karar değişiklik referansı ister) · UI: `/yedekleme` › Konfigürasyon tabanı ve sapması + Envanter › Yönetişim › Konfigürasyon · Konsol: `konfigTemeli` · Test: 16 + 9 | — |
| OT-33 | Hesap tipleri | **COMPLETE** | Şema: `KimlikHesabi.kaynakTipi · mfaVar · sonaErme · parolaPolitikasi` · Mantık: `lib/varlik/hesapTipi.ts` (5 kaynak tipi · `merkezdenKapatilabilir` üç değerli · MFA bulgusu yalnız ayrıcalık ÖLÇÜLMÜŞSE açılır) · Eylem: `hesapTipiKaydet` · UI: `/kimlik` › Kaynak ve kimlik bloğu (üç değerli MFA seçicisi) · Konsol: `hesapTipi` · Test: 20 + 6 | — |
| OT-40 | Otomatik veri toplama | **CODE_READY_EXTERNAL_DEPENDENCY** | Mantık: `lib/entegrasyon/http.ts` (zaman aşımı · gövde sınırı · yönlendirme İZLENMEZ · SSRF/metadata engeli · TLS zorunluluğu) · `kimlikDogrulama.ts` (api_key · basic · OAuth2 client_credentials + token önbelleği; `certificate` UYGULANMADI der) · `mezarTasi.ts` + `mezarTasiIsle.ts` (kaynakta kaybolan kayıt → bulgu, SİLME YOK) · Çekirdek: `maksDeneme`/`geriCekilmeMs` artık connector kaydından OKUNUR · UI: `/saglik` › Yapılandırma (deneme + geri çekilme alanları) · Konsol: `connectorDeneme` · `mezarTasi` · Test: 46 (yerel sunucuya karşı; sabotajla doğrulandı) | **Kalan tek eksik dış bağımlılık:** kurumun gerçek uç noktası, kimlik bilgisi ve ağ erişimi. Repo içinde yapılabilecek her şey bitti; hiçbir adres ürünle GELMEZ. |
| OT-44 | Veri kalitesi kuralları | **COMPLETE** | Şema: `VeriKalitesiBulgusu` (mevcut) · Mantık: `agTutarliligi.ts` 6 kural + ölçüm borcu kuralları · Motor: açar VE kapatır · Eylem: `veriKalitesiBulgusuKapat` (giderildi ≠ kabul edildi) · UI: Sağlık › Veri kalitesi kipi + karar formu · Konsol: `veriKalitesiKarari` · Test: 12 + 3 | — |
| OT-48 | Üretim ölçeği altyapısı | **CODE_READY_EXTERNAL_DEPENDENCY** | Mantık: `lib/altyapi/saglayicilar.ts` (üç aile × bağlı/bağlı değil; PostgreSQL · S3 uyumlu depo · dağıtık kilit KAYITLI DEĞİL ve neyin gerektiğini yazar) · `hazirlikKarari.ts` (dört durum: hazır · eksik · arızalı · ÖLÇÜLEMEDİ) · `hazirlik.ts` (yazma yoklaması · göç kütüğü · zamanlayıcı · sağlayıcı · çok örnek engeli) · UI: `/saglik` › Kurulum hazırlığı kipi · Konsol: `kurulumHazirligi` · `altyapiSaglayici` · Test: 15 | **Kalan tek eksik dış bağımlılık:** PostgreSQL, nesne deposu ve (gerekirse) dağıtık koordinasyon uç noktaları. Kilit/önderlik zaten `IsKilidi` kira modeliyle çok örnekli çalışır. |
| OT-49 | Performans testi | **COMPLETE** | Araç: `arac/yuk.mjs` (`npm run olcum:yuk`) + saf matematik `arac/yuzdelik.mjs` (nearest-rank; ölçülmeyen yüzdelik `null`, `0 ms` DEĞİL) · Taban: `arac/performans-tabani.json` — ÜRETİM YAPISINA karşı ölçüldü ve kip dosyaya yazıldı · Gerileme için hem oran hem ÖLÇÜLMÜŞ gürültü bandı (50 ms) aşılmalı · Konsol: `performansTabani` · Test: 10 | — |
| OT-50 | Gerçek entegrasyonlar | **CODE_READY_EXTERNAL_DEPENDENCY** | Şablon: 8 adaptör (7'si `BaglanmamisAdaptor` ve bunu AÇIKÇA söyler) · Sözleşme: `IhtiyacKalemi` — bağlanmamış her adaptör kurumdan isteyeceği kalemleri YAPISAL beyan eder (`abstract`, unutulamaz) · Sertifikasyon: 15. kontrol `baglanti_ihtiyaci` boş/yinelenen listeyi ve sırsız beyanı KUSUR sayar · UI: `/saglik` › Kurulum hazırlığı › Bağlantı ihtiyacı · Konsol: `baglantiIhtiyaci` · Test: 27 | **Kalan tek eksik dış bağımlılık:** her adaptör için kurumun uç noktası, salt okunur kimlik bilgisi ve ağ erişimi. Ürün hiçbir gerçek adres ya da kimlik İÇERMEZ. |

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

## 4. FAZ B'de ne yapıldı — kanıtla

FAZ B sekiz maddeyi birden kapattı: **OT-05 · 08 · 09 · 16 · 17 · 20 ·
28 · 33**. Sıra tesadüf değil — sekizi de aynı iki soruya dayanıyordu:
*"bu cihaz dururca ne durur"* ve *"bu cihazın sahibi kim"*.

### 4.1 Şema — sekiz yeni model, tek göç

| Göç | Ne ekler | Veri güvenliği |
| --- | --- | --- |
| `20260903131323_faz_b_ot_veri_modeli` | `ProsesAdimi` · `AdimVarligi` · `EtkiDegerlendirmesi` · `Ekip` · `EkipUyeligi` · `KonfigTemeli` · `KonfigSapmasi` · `OuiKaydi` + `Varlik`a 4 ömür alanı ve `ekipId` + `KimlikHesabi`na 4 kimlik alanı + `KesifKaydi`na yetki kararı alanları | SQLite tablo yeniden kurulumu kolon kolon doğrulandı: `new_X` tanımı ile `INSERT ... SELECT` listesi birebir · taşınmayan kolon **0** · satır sayısı değişen tablo **0** · tetikleyiciler yerinde · `PRAGMA foreign_key_check` **temiz** |

### 4.2 Alan mantığı — yedi saf modül

| Modül | Madde | Kuralın özü | Test |
| --- | --- | --- | --- |
| `lib/varlik/etki.ts` | OT-05 · OT-08 | Miras etki ÖLÇÜLENİ ezmez; hiçbir şey ölçülmemişse `toplamMw: null` | 21 |
| `lib/varlik/sahiplik.ts` | OT-09 | PASİF sahip en ağır durumdur — ekran "sahibi var" der ve kimse bakmaz | 18 |
| `lib/varlik/omurTarihleri.ts` | OT-20 | Beş ayrı saat; girilmemiş tarih "doldu" değil `olculmedi` | 22 |
| `lib/varlik/kesifYetkisi.ts` | OT-16 | Yalnız IP eşleşen aday `null` döner — DHCP'de aynı IP başka cihaz olabilir | 17 |
| `lib/varlik/otGozlem.ts` | OT-17 | 15 IANA kayıtlı OT portu; belirsiz portta (102) protokol `null` | 19 |
| `lib/varlik/konfigDrift.ts` | OT-28 | Özeti olmayan yedek `sapma` DEĞİL `karar_verilemedi` | 16 |
| `lib/varlik/hesapTipi.ts` | OT-33 | MFA üç değerli; ayrıcalığı ölçülmemiş hesapta MFA bulgusu AÇILMAZ | 20 |

### 4.3 Ölçülerek bulunan gerçek kusurlar

1. **MAC katlaması çalışmıyordu.** `lib/alan/metin.ts → kimlikKatla`
   `[\s._\-/\\]` siler ama **`:` silmez**; `AA:BB:CC:DD:EE:FF` ile
   `aa-bb-cc-dd-ee-ff` aynı MAC olduğu hâlde eşleşmiyordu. Yinelenen
   cihaz tespiti biçim farkı yüzünden sessizce kaçırılırdı. Düzeltme:
   `kesifYetkisi.ts` MAC'i `macKanonik()` üzerinden karşılaştırır.
2. **Kapsam nöbetçisi iki gerçek kusur yakaladı.** `prosesAdimiKaydet`
   ve `ekipKaydet` tek aşamalı kapsamsız kapı kullanıyordu: santrale
   kısıtlı bir yönetici KENDİ santralinin sürecine adım, kendi
   santraline ekip yazamıyordu. İkisi de iki aşamalı kapıya geçti;
   `ekipKaydet` ve `isSureciKaydet` ayrıca **eski** santralin kapsamını
   da sorar (yoksa B'ye yetkili biri A'nın kaydını kendine çekerdi).
3. **Testin kendisi zayıftı — sabotajla ölçüldü.** Toplu devirdeki
   kapsam kontrolü kaldırıldığında test yeşil kalıyordu: özne
   `tesis_yoneticisi`ydi ve o rolde `envanter/onay` zaten yok, yani ön
   kapı reddediyor, kapsam kuralı hiç sınanmıyordu. Kapsam testleri
   santrale kısıtlı `yonetici` rolüne geçirildi; aynı sabotaj bu kez
   **5 testi birden** kırdı.
4. **`/yetkiler` kapsamsız yazma kapısı.** Sahiplik devri düğmesi
   `izinVar(k, 'envanter', 'onay')` ile kapsamsız soruluyordu; tesise
   kısıtlı yönetici KENDİ santralinin varlıklarını devredemezdi. Ekran
   nöbetçisi (`tests/ekran-yazma-kapisi.test.ts`) yakaladı,
   `modulYazabilir` ile düzeltildi.

### 4.4 Ekran yüzeyi — sekiz maddenin dokuzuncu ölçütü

| Yüzey | Madde | Ne yapılır |
| --- | --- | --- |
| Envanter › **Yönetişim** sekmesi (yeni) | OT-05 · 08 · 09 · 20 · 28 | Sahiplik zinciri, etki değerlendirmesi, proses adımları, süreler, konfigürasyon tabanı |
| `/prosesler` (yeni rota) | OT-05 · 08 | İş süreci ve adım CRUD, adıma varlık bağlama, üç değerli tek nokta/yedeklilik |
| `/yetkiler` › Ekipler çekmecesi + hesap çekmecesi | OT-09 | Ekip CRUD, üyelik, toplu sahiplik devri; kapalı hesabın üstünde duran varlık sayacı |
| `/yedekleme` › Konfigürasyon tabanı ve sapması | OT-28 | Taban onayı, sapma kararı (onaylı karar değişiklik referansı ister) |
| `/kimlik` › Kaynak ve kimlik | OT-33 | Kaynak tipi, üç değerli MFA, sona erme, parola politikası |
| `/kesif` › yetki kararı · OUI · pasif gözlem | OT-16 · 17 | Yetkisiz cihaz kararı, kütük yükleme, gözlem içe aktarımı |

---

## 5. FAZ C'de ne yapıldı — kanıtla

FAZ C dört maddeye dokundu: **OT-40 · 48 · 49 · 50**. Üçü
`CODE_READY_EXTERNAL_DEPENDENCY` ile kapandı, biri (OT-49) `COMPLETE`.
Bu ayrım bu belgenin en önemli ayrımıdır ve gevşetilmedi: bir madde
ancak repo içinde yapılabilecek her şey bittiğinde ve kalan tek eksik
GERÇEK bir kurum sistemi olduğunda o duruma yazılır.

### 5.1 Bu fazda hiçbir uç nokta, kimlik ya da örnek kurum verisi yazılmadı

`lib/entegrasyon/http.ts` bir HTTP istemcisidir ve **tek bir adres
içermez**: taban URL her zaman connector yapılandırmasından gelir.
Adaptörlerin ihtiyaç listeleri "bize şu bilgiyi verin" der; bilginin
kendisini taşımaz. Ölçüm aracı yalnız 127.0.0.1'e, kendi kurduğu
sunucuya gider.

### 5.2 OT-40 · üç sessiz kusur kapatıldı

Çıplak `fetch` üç kusur taşır ve üçü de OT ağında pahalıdır. İstemci
üçünü de kapatır ve **kapalılığı sabotajla ölçüldü** (kural kaldırıldı,
testler kırıldı, geri alındı):

| Kusur | Sonucu | Kapatılışı |
| --- | --- | --- |
| Zaman aşımı yok | Yanıt vermeyen uç koşuyu `calisiyor`da asar; connector 15 dk kilitlenir | `AbortSignal.timeout` · aşan istek `gecici` hata |
| Yönlendirme sessizce izlenir | `Authorization` başlığı BAŞKA bir origin'e gider — sessiz sır sızıntısı | `redirect: 'manual'` · 3xx bir hatadır ve hedefi yazılır |
| Gövde sınırsız | Yanlış filtreyle açılan uç süreç belleğini tüketir | Akış sınırla okunur; kırpılan gövde AYRIŞTIRILMAZ |

Buna üç kural daha eklendi: bulut metadata adresi her koşulda reddedilir
(SSRF), düz http yalnız ÖZEL AĞDA ve açık izinle kabul edilir, OAuth2
token ucu **özel ağda bile** https ister (gövdesinde istemci sırrı taşır).

### 5.3 OT-40 · ölçülmüş kusur: yazılıp okunmayan ayar

`Connector.maksDeneme` ve `geriCekilmeMs` şemada vardı, ekranda
düzenlenebiliyordu ve **hiçbir yerde okunmuyordu**. Kullanıcı ayarı
değiştiriyor, çekirdek sabit varsayılanı kullanmaya devam ediyordu:
ayarı yazan bir ekran, okumayan bir çekirdek. Artık çekirdek koşu
başlarken connector kaydından okur; sıra çağıranın açık isteği →
connector kaydı → ürün varsayılanıdır.

### 5.4 OT-40 · mezar taşı — silmeyen silme tespiti

Yalnız "yeni ve değişen" çeken bir entegrasyon, hurdaya çıkmış bir cihazı
sonsuza kadar envanterde canlı gösterir. Mezar taşı bunu kapatır ama
**hiçbir kaydı silmez**: bir veri kalitesi bulgusu açar. Üç koşul
birden sağlanmadan tek bir mezar taşı üretilmez — koşu TAM olmalı
(delta'da gelmemek "değişmedi" demektir), koşu EKSİKSİZ bitmiş olmalı
(sayfa sınırına takılan koşu okunmamış sayfayı yok gösterirdi) ve kayıp
oranı eşiği aşmamalı ("filonun %90'ı silinmiş" bir gözlem değil, kaynak
sorgusunun daraldığının belirtisidir).

### 5.5 OT-48 · bağlı olmayan sağlayıcı gizlenmez

Üç aile (veritabanı · nesne deposu · koordinasyon) ve altı sağlayıcı;
üçü bağlı, üçü değil. Bağlı olmayan **listeden çıkarılmaz** — ekranı
"her şey yolunda" gösterirdi; asıl bilgi hangi yeteneğin HENÜZ
olmadığıdır. Hazırlık kontrolü dört durumludur ve `bilinmiyor` griye
çizilir: **zorunlu bir kontrol ölçülemediyse "hazır" cümlesi hiç
kurulmaz.**

Çok örnekli dağıtım engeli ayrı bir BİLGİ kalemidir, kusur değil: tek
örnekli kurulum geçerlidir, ama "yatay ölçekleyelim" denince engelin adı
(sqlite · yerel_dosya) tek bakışta görünür.

### 5.6 OT-49 · taban gerçekten ölçüldü

`arac/performans-tabani.json` uydurulmadı: **üretim yapısına** karşı, 10
rota × 30 istek, eşzamanlılık 4 ile ölçüldü ve dosyaya kip, makine,
Node sürümü ve ayarlar yazıldı. Aracın dürüst sınırı da yazılı: ölçüm
TOHUM VERİSİYLEDİR ve kurumun gerçek veri hacmini temsil etmez — o
UY-55'in konusudur ve gerçek veri gelmeden ölçülemez.

Gerileme eşiği ölçülerek konuldu: aynı koda arka arkaya koşulan
ölçümlerde p95 32–80 ms bandında gezdi, yani gürültü bandı ~50 ms.
Yalnız orana bakan bir kapı her koşuda rastgele bağırır ve üç koşu sonra
kimse ona bakmaz; bu yüzden gerileme sayılmak için **hem oran hem
ölçülmüş band** aşılmalıdır.

### 5.7 OT-50 · ihtiyaç listesi paragraftan çıktı

Bağlanmamış her adaptörün "neye ihtiyacım var" cevabı bir paragraftaydı.
Paragraf insan için iyidir ama kontrol listesine dönüşemez, hangi
kalemin SIR olduğu makinece bilinemez ve eksik bırakılan kalem testle
yakalanamaz. Artık ihtiyaç **yapısal** olarak da beyan edilir ve alan
`abstract`tır — yeni bir adaptör onu doldurmayı unutamaz, derleyici
durdurur. Sertifikasyonun 15. kontrolü boş listeyi, yinelenen kodu ve
"sır lazım ama referans bildirilmemiş" hâlini KUSUR sayar.

---

## 6. Sıradaki iş — bağımlılık sırası

1. **UY-07 / UY-12 / UY-13 / UY-16 / UY-18 / UY-20 (FAZ D)** — kanıt
   katmanı; nesne deposu sağlayıcısı (OT-48) UY-13 ile UY-18'i birlikte
   taşır.
2. **UY-26 / UY-28 / UY-36 / UY-39 / UY-41 / UY-43 (FAZ E)** — altısı da
   `Bulgu` ve değişiklik çevresinde; birlikte yapılmalı.
3. **UY-52 … UY-57 (FAZ F)** — dış erişim, SSO, saklama ve denetçi
   erişimi. UY-54 OT-48'in sağlayıcı kütüğünü kullanır; UY-55 OT-49'un
   aracını gerçek veriyle koşturur.

---

## 7. Gerçek bağlantı için gereken dış bilgiler

Yalnız gerçekten gerekenler. Bu bilgiler gelmeden de **repo içi hazırlık
tamamlanabilir**.

**OT-40 · OT-48 · OT-50 artık gerçekten "bilgi bekliyor" durumundadır**
(`CODE_READY_EXTERNAL_DEPENDENCY`): repo içinde yapılabilecek her şey
bitti. Kalan maddeler ise o hazırlık henüz yapılmadığı için
`NOT_STARTED`tır — ikisi karıştırılmaz.

Adaptör başına ihtiyaç listesinin YAPISAL hâli üründedir:
`/saglik` › Kurulum hazırlığı › Bağlantı ihtiyacı. Aşağıdaki tablo onun
özetidir.

| Madde | Gereken |
| --- | --- |
| OT-40 · OT-50 | Kurum CMDB/EDR/SIEM/OT keşif ürünlerinin adı, API sürümü, kimlik yöntemi |
| OT-48 · UY-54 | PostgreSQL, Redis/kuyruk, nesne deposu, Vault/KMS uç noktaları |
| UY-18 | İmzalama için HSM/KMS erişimi ve sertifika politikası |
| UY-20 | Kurumun DYS ürünü ve API'si |
| UY-41 | Takip edilecek resmî mevzuat kaynaklarının adresleri |
| UY-53 | IdP (Entra/ADFS) tenant, OIDC/SAML metadata, claim eşlemesi |
| OT-49 · UY-55 | Hedef eşikler: eşzamanlı kullanıcı, kabul edilebilir gecikme |
