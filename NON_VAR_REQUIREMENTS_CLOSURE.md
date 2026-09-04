# "VAR olmayan" isterlerin kapatılması — durum kütüğü

Bu belge, alternatif ürün değerlendirme matrisinde **Zorlu Enerji
Yönetişim Platformu** sütununda doğrudan "VAR" olmayan **46 maddenin**
bugünkü gerçeğini **dosya kanıtıyla** yazar. Yaşayan bir belgedir:
her turda güncellenir.

İlk 38 madde matrisin kendi listesinden geldi. Kalan 8 madde, isterler
listesi **Regülasyon-Uyum ve OT-Envanter platformu gözüyle** yeniden
okunduğunda ortaya çıkan ve o güne kadar üründe **hiç karşılığı olmayan**
boşluklardır; FAZ G'de kapatıldılar (§9).

Ölçüm tarihi: 04.09.2026 · Dal: `claude/repo-public-github-domain-271hxa`

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
| Madde | 46 |
| **COMPLETE** | **37** |
| CODE_READY_EXTERNAL_DEPENDENCY | 9 |
| IN_PROGRESS | 0 |
| NOT_STARTED | **0** |
| Yeni Prisma modeli | 44 (FAZ A 13 · FAZ B 8 · FAZ D 1 · FAZ E 4 · FAZ F 5 · FAZ G 13) |
| Yeni göç | 9 (dokuzu da veri kaybı 0 · ölçülerek doğrulandı) |
| Yeni motor | 8 (9 → 17) |
| Yeni rota | 11 (`/tabanlar` · `/prosesler` · `/degerlendirme-aktarim` · `/api-sozlesmesi` · `/saklama` · `/denetci-erisimi` · `/sayim` · `/yedek-parca` · `/tasinabilir-medya` · `/gozden-gecirme` · `/egitimler`) |
| Yeni konsol modülü | 54 |
| Toplam test | 2560 geçti · 1 atlandı |

### Kapı sonuçları (04.09.2026 · FAZ G sonu)

| Kapı | Sonuç |
| --- | --- |
| `npm run test` | **2560 geçti · 1 atlandı · 0 kusur** (121 dosya) |
| `npm run lint` · `npx tsc --noEmit` | temiz |
| `tasarim:kapi` | kontrast kusuru 0 · eksik font 0 · eski tasarım izi 0 |
| `rota:duman` | **57/57 rota** · kusurlu 0 · test edilemedi 0 · sayfa hatası 0 |
| `tasarim:dizustu` (1366×768) | 48 rota · **kırpılan öğe 0** · yatay taşan rota 0 |
| `tasarim:axe` (WCAG 2 A/AA) | 49 rota · ciddi/kritik ihlal **0** · kırık tarama 0 |
| `tasarim:tasma` | 96 ölçümde 4 kusur — **hepsi bu programdan ÖNCE de vardı** (`/envanter` ×2, `/sistem`, `/sistem/bilesenler`; 375px ve 768px). FAZ G'de `git stash` ile YENİDEN ölçüldü: FAZ G'siz ağaçta aynı 4 kusur, aynı öğelerle çıktı. FAZ G'nin beş yeni ekranı listede YOK. |
| `npm run build` | başarılı |

Kapı çıktıları **olduğu gibi** yazıldı; hedefe uydurulmadı. Taşma
kapısındaki 4 kusur bu programın ürünü değildir ve bilerek kapatılmamış
olarak bırakıldı — kaynakları `/envanter` kip çubuğu ile `/sistem`
token tablosudur ve ikisi de ayrı bir işin konusudur.

**FAZ F'de ilk koşuda üç kusur çıkmıştı ve düzeltildi.** `rota:duman` o
fazın üç yeni ekranının da ana bölgesiz (`<main>` yok) olduğunu söyledi:
kabuk `<main>` basmaz, onu ekran çizer. Ana bölgesi olmayan sayfada
"içeriğe atla" bağı bir yere varmaz ve axe'ın wcag2a/aa kümesi bunu
GÖRMEZ. Üçüne de kendi `<main data-yuzey=…>` bölgesi eklendi.

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
| OT-55 | Fiziksel envanter sayımı | **COMPLETE** | Şema: `EnvanterSayimi` · `SayimSatiri` · Mantık: `lib/varlik/sayim.ts` (5 sonuç · `sayilmadi` ≠ `bulunamadi` · doğruluk paydası yalnız SAYILAN satırlar · hiç sayılmadıysa oran `null`) · Eylem: `sayimAc` · `sayimDurumu` · `sayimSatiriKaydet` · `sayimKapat` · UI: `/sayim` · Konsol: `envanterSayimi` · `sayimSonuclari` · Test: 38 + 39 (ortak) | — (kanıt: §9.2) |
| OT-56 | Kritik yedek parça stoğu | **COMPLETE** | Şema: `YedekParca` · `YedekParcaVarlik` · Mantık: `lib/varlik/yedekParca.ts` (`yeterli`/`esikte`/`tukendi`/`pasif` · `acikRisk` yalnız stok bittiğinde VE ağır kritiklikte varlık hizmet ediyorsa) · Eylem: `yedekParcaKaydet` · `yedekParcaVarlikBagla` / `…Kaldir` · UI: `/yedek-parca` · Konsol: `yedekParca` · Test: 38 + 39 (ortak) | — (kanıt: §9.3) |
| OT-57 | Taşınabilir medya izlemesi | **COMPLETE** | Şema: `TasinabilirMedya` · `MedyaKullanimi` · Mantık: `lib/varlik/tasinabilirMedya.ts` (90 gün tarama tazeliği · `sifreli` ÜÇ değerli · karantina/imha kullanım kabul etmez, kayıp KABUL EDER) · Eylem: `medyaKaydet` · `medyaTaramaDamgasi` · `medyaKullanimiKaydet` · UI: `/tasinabilir-medya` · Konsol: `tasinabilirMedya` · `medyaKurali` · Test: 38 + 39 (ortak) | — (kanıt: §9.4) · Ürün medyayı **engellemez**; kayıt tutar |

### UY — Regülasyon ve uyum

| ID | İster | Durum | Kalan iş |
| --- | --- | --- | --- |
| UY-07 | Kontrol sahipliği | **COMPLETE** | — (kanıt: §6.2) |
| UY-12 | Kanıt metadata | **COMPLETE** | — (kanıt: §6.3) |
| UY-13 | Kanıt dosyası | **COMPLETE** | — (kanıt: §6.4) · Bugünkü depo `yerel_dosya`dır; S3 uyumlu nesne deposu OT-48 kütüğünde **bağlı değil** yazar |
| UY-16 | Kapsama/tazelik/hazırlık KPI | **COMPLETE** | — (kanıt: §6.5) |
| UY-18 | Kanıt paketi imzası | **CODE_READY_EXTERNAL_DEPENDENCY** | **Kalan tek eksik dış bağımlılık:** kurumun HSM/KMS erişimi. Paket bugün bütünlük damgası taşır ve başlığına "İMZASIZDIR" yazar (kanıt: §6.6) |
| UY-20 | DMS entegrasyonu | **CODE_READY_EXTERNAL_DEPENDENCY** | **Kalan tek eksik dış bağımlılık:** kurumun DYS ürünü ve salt okunur API'si. Belge sürümü elle girilir ve ekran "DYS ile senkron değil" der (kanıt: §6.6) |
| UY-26 | Kök neden standardı | **COMPLETE** | — (kanıt: §7.2) |
| UY-28 | Tekrarlayan bulgu | **COMPLETE** | — (kanıt: §7.3) |
| UY-36 | Eskalasyon matrisi | **COMPLETE** | — (kanıt: §7.4) |
| UY-39 | Değişiklik etki analizi | **COMPLETE** | — (kanıt: §7.5) |
| UY-41 | Resmî kaynak takibi | **CODE_READY_EXTERNAL_DEPENDENCY** | **Kalan tek eksik dış bağımlılık:** takip edilecek resmî kaynakların adresleri ve erişim biçimi. Kaynak KÜTÜĞÜ çalışır; ürün hiçbir adresle gelmez (kanıt: §7.6) |
| UY-43 | Değerlendirme içe aktarımı | **COMPLETE** | — (kanıt: §7.7) |
| UY-52 | Dış uyum API'si | **COMPLETE** | — (kanıt: §8.2) · 9 uç · anahtar başına kapsam · ürüne türetilen OpenAPI 3.1 |
| UY-53 | SSO / MFA | **CODE_READY_EXTERNAL_DEPENDENCY** | **Kalan tek eksik dış bağımlılık:** kurumun IdP'si (tenant, metadata/discovery adresi, istemci kimliği, claim eşlemesi). Ürün bugün kendi kullanıcı kütüğünden giriş yapar ve ekran buna "SSO" DEMEZ (kanıt: §8.3) |
| UY-54 | Vault/KMS/Postgres/kuyruk | **CODE_READY_EXTERNAL_DEPENDENCY** | **Kalan tek eksik dış bağımlılık:** PostgreSQL, nesne deposu, koordinasyon ve Vault/KMS uç noktaları. Dört aile de sağlayıcı kütüğünde ve artık hazırlık ekranında SATIR olarak durur (kanıt: §8.4) |
| UY-55 | Gerçek veri performansı | **CODE_READY_EXTERNAL_DEPENDENCY** | **Kalan tek eksik dış bağımlılık:** gerçek veri hacmi, eşzamanlılık ve gecikme hedefi. Araç tohum verisiyle koşar, bunu her koşuda EKRANA YAZAR ve hazırlık ekranı da söyler (kanıt: §8.4) |
| UY-56 | Retention / legal hold | **COMPLETE** | — (kanıt: §8.5) · 8 kayıt ailesi · legal hold · dört gözle imha |
| UY-57 | Dış denetçi erişimi | **COMPLETE** | — (kanıt: §8.6) · davet gerçek `dis_denetci` yetki satırı yazar, iptal ve süre sonu siler |
| UY-59 | Kontrol olgunluk seviyesi | **COMPLETE** | — (kanıt: §9.5) · ölü şema alanı ekrana bağlandı; ortalama YOK, dağılım var |
| UY-63 | Resmî bildirim süresi sayacı | **COMPLETE** | — (kanıt: §9.6) · süreler ürünle GELMEZ; kural yoksa sayaç hiç işlemez |
| UY-64 | Kontrol testi yöntemi ve örneklemi | **COMPLETE** | — (kanıt: §9.7) · tasarım / işleyiş ayrımı; test kaydı silinmez, düzeltme yeni kayıttır |
| UY-65 | Yönetim gözden geçirmesi | **COMPLETE** | — (kanıt: §9.8) · kararsız toplantı "yapıldı" işaretlenemez |
| UY-66 | Eğitim ve farkındalık kütüğü | **COMPLETE** | — (kanıt: §9.9) · kapsam sıfırken oran `null`; "%100 eğitildi" yazılmaz |

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

## 6. FAZ D'de ne yapıldı — kanıtla

**UY-07 · UY-12 · UY-13 · UY-16 · UY-18 · UY-20.** Uyum kanıt katmanı.
Dördü kapandı, ikisi (UY-18 · UY-20) repo içinde bitirilip dış
bağımlılığa dayandı.

### 6.1 Bu fazda hiçbir imza atılmadı, hiçbir anahtar üretilmedi

Bir "yerel imza" sağlayıcısı yazmak teknik olarak kolaydı ve
`lib/uyum/disSaglayicilar.ts` bunun neden YAPILMADIĞINI dosyanın
tepesinde yazar: uygulamanın kendi ürettiği bir anahtarla attığı imza,
imzalayanın kimliğini kanıtlamaz. Denetçi için değeri sıfırdır, ekranda
ise "imzalandı" yazar — **imzasız olmaktan daha kötüdür.**

Aynı sebeple DYS tarafında sahte bir senkron durumu üretilmedi: belge
kütüğünün dip notu, sürümün elle girildiğini ve kurumdaki güncel
sürümün gerisinde kalmış olabileceğini AÇIKÇA yazar.

### 6.2 UY-07 · ölçülmüş kusur: sessizce el değiştiren sorumluluk

`maddeDurumGuncelle` denetim izi satırını **yalnız `durum`
değiştiğinde** yazıyordu. Sorumlu alanı aynı çağrıda güncelleniyor ama
ize hiç düşmüyordu: "bu kontrolün sorumlusu ne zaman, kim tarafından
değişti" sorusunun cevabı üründe YOKTU.

Artık sorumlu ve ekip değişikliği kendi iz satırlarını yazar
(`alan: 'sorumluId'` / `'ekipId'`, önce–sonra değerleriyle).
Kusurun geri geldiğini yakalayan test `tests/faz-d-eylem.test.ts` →
*"SORUMLU DEĞİŞİKLİĞİ kendi iz satırını yazar"*; sabotajla ölçüldü
(iz bloğu kapatıldı → test kırmızı).

**Dört göz.** `dogrulayabilirMi()` kendi değerlendirmesini doğrulamayı
reddeder. Karşılaştırma `MaddeDurumu.sorumluId` ile değil,
**değişmez `DegerlendirmeTarihcesi`nin son satırındaki aktörle**
yapılır: kontrolün sahibi ile kararı veren aynı kişi olmayabilir.
Değerlendirmeyi kimin yaptığı kayıtlı değilse dört göz *kanıtlanamaz*
ve doğrulama yine reddedilir — "muhtemelen başkasıdır" diye geçmek
doğrulamayı anlamsız kılardı.

`dogrulamaDurumu()`nun en ağır hâli `degerlendirme_sonrasi_degisti`dir:
doğrulamadan sonra değerlendirme değiştiyse ekrandaki "doğrulandı"
damgası artık BAŞKA bir kararı işaret eder. Bu, hiç doğrulanmamış
olmaktan tehlikelidir çünkü yanlış bir güven verir.

### 6.3 UY-12 · tarih bir durum değildir

Kanıt kaydında geçerlilik TARİHİ ile kabul DURUMU tek alana
sıkışmıştı. Ayrıldılar: `Kanit.durum` (taslak · geçerli · reddedildi ·
arşivlendi) kabul kararını, `gecerliBitis` tazeliği taşır. Reddedilmiş
bir kanıt artık süresi dolana kadar "geçerli" görünmez.

`kanitGucu()` bir puan değil bir **sınıflamadır** ve tek sayıya
indirilmez: taslak, reddedilmiş ve süresi dolmuş kanıt hiç tartılmaz
(`kanit_degil`); otomatik toplanmış ve özetli kanıt `guclu`; kaynağı
belli olan `orta`; elle girilmiş, kaynaksız, özetsiz olan `zayif`.
`otomatik` alanı **kullanıcı beyanı değildir** — elle açılan kayıtta
daima `false`.

`surumGerekiyorMu()` keskin bir ayrım kurar: **içerik** özeti değişirse
yeni sürüm, **metadata** değişirse değil. Sahibi değişince sürüm açmak
geçmişi anlamsızlaştırır; içerik değişince açmamak kanıtı sessizce
değiştirmektir.

### 6.4 UY-13 · kanıt dosyası: ürünün ilk gerçek deposu

`Kanit.dosyaYolu` alanı vardı ve o alana **hiçbir şey yazılmıyordu**:
ürün kanıt dosyası tutmuyordu.

`lib/uyum/kanitDeposu.ts` içerik adreslidir. Depo anahtarı içeriğin
SHA-256 özetinden türetilir (`<ilk2>/<sonraki2>/<özet>`) ve bu üç şeyi
birden verir: **kullanıcı girdisi dosya yoluna hiç girmez** (yol geçişi
imkânsız), aynı içerik iki kez saklanmaz, dosyanın bütünlüğü adının
kendisiyle doğrulanır. Okuma yolunda anahtar biçimi ikinci kez
denetlenir — anahtar veritabanından gelse bile, çünkü veritabanı da bir
gün yanlış veri taşıyabilir.

Kabul edilen tipler **izin listesidir**, yasak listesi değil; arşiv
(zip) kabul edilmez, çünkü içine bakılmayan bir arşiv ne saklandığı
bilinmeyen bir kutudur. Ürün yüklenen dosyayı **açmaz, ayrıştırmaz,
önizlemez ve çalıştırmaz** — bir kanıt dosyasını ayrıştırmak saldırı
yüzeyini kanıt katmanına taşımak olurdu.

`KanitSurumu` tablosu iki veritabanı tetikleyicisiyle **değişmez ve
silinemez**dir (`kanit_surumu_guncelleme_yasak` ·
`kanit_surumu_silme_yasak`); testi Prisma üzerinden gerçekten dener ve
ret alır.

Depo **repoya girmez**: `.gitignore` `/veri/`yi dışarıda tutar ve
kurulumda `KANIT_DEPO_KOKU` ile ürün dizininin dışına alınması
beklenir.

### 6.5 UY-16 · tek bir "hazırlık puanı" bilerek YOK

Ürün bir "uyum oranı" hesaplıyordu ve o oran tek başına denetimde
hiçbir şey söylemez. Denetçinin sorduğu **üç ayrı soru** ayrı ayrı
cevaplanır: KAPSAMA (kaç kontrol değerlendirildi), TAZELİK (dayanağı
bugün hâlâ geçerli mi), HAZIRLIK (bugün girsek kaçını savunabiliriz).

Bir kurum %95 uyumlu görünüp %30 kapsamalı olabilir; kalan %70 hiç
bakılmamıştır ve ekranda yeşil görünür. `kapsamaCumlesi()` bu yüzden
**önce** kapsamayı söyler: kapsama %50'nin altındaysa cümle diğer
oranların küçük bir örneklem üzerinden hesaplandığını yazar.

`kontrolHazirligi()` iki yönde de dürüsttür: **kanıtsız "uyumlu"
savunulamaz**, **kanıtlı "uyumsuz" savunulabilir** — kurum sorunu
görmüş, kayda geçirmiş ve aksiyona bağlamıştır.

Kapsam dışı kontrol paydaya girmez ama **ayrı raporlanır**: paydayı
küçülterek oranı yükseltmek, kapsamı daraltarak uyumu "iyileştirmenin"
en kolay yoludur ve denetçi ilk oraya bakar. Payda sıfırsa oran `null`
döner — %0 da %100 de yalan olurdu.

### 6.6 UY-18 · UY-20 · imzasız olduğunu söyleyen paket

Kanıt paketi şema sürümü **1 → 2**'ye çıktı ve başlığa `imza` alanı
eklendi. Sürüm artırılmasaydı 1 numaralı şemayı bekleyen bir okuyucu
imza alanını hiç görmez ve paketi imzalı sanabilirdi; sessiz şema
değişikliği tam olarak bu paketin engellemek için var olduğu şeydir.

Paket başlığı bütünlük damgası ile imzayı **ayırır** ve denetçiye şunu
yazar: *"Paket İMZASIZDIR. SHA-256 bütünlük damgası içeriğin
değişmediğini kanıtlar; imzalayanın kimliğini kanıtlamaz."* Aynı cümle
`/raporlar/kanit-paketi` ekranında damganın yanında görünür.

`imzaDurumu()`nun `dogrulanamadi` hâli bugün **ulaşılamazdır** ve bu
bilinçlidir: kod bağlantı gününe hazır durur, ama bugün ürün imza
atmadığı için sonuç daima `imzasiz`tır.

İkisi de `/saglik?kip=hazirlik` ekranında **Uyum katmanının dış
bağımlılıkları** bölümünde listelenir; bağlı olmadıkları gizlenmez ve
bağlı olmadıklarında ürünün ne YAPTIĞI yazılır ("ne yapamadığı" değil —
o cümle kurulumu planlayana hiçbir şey söylemez).

### 6.7 Sabotajla doğrulama — yedi kural, yedi kırmızı

Testlerin gerçekten kural koruduğu ölçülerek doğrulandı. Her kural tek
tek kaldırıldı, hangi testin kırıldığı kaydedildi, kural geri kondu:

| Kaldırılan kural | Kırılan test |
| --- | --- |
| Dört göz karşılaştırması | 2 test (saf + eylem) |
| Depo anahtarı biçim denetimi | *yol geçişi taşıyan anahtar REDDEDİLİR* |
| Dosya adında kontrol karakteri temizliği | *başlık enjeksiyonu kapalı* |
| Boş dosya reddi | *boş dosya REDDEDİLİR* |
| "Aynı özet → sürüm açma" | 2 test (saf + eylem) |
| Sorumlu değişikliği iz satırı | *ölçülmüş kusur* testi |
| Kapsam dışı kontrolün paydadan çıkarılması | 2 test |

Yedi sabotajın yedisi de yakalandı; kurallar geri kondu ve 101 FAZ D
testi yeşil döndü.

---

## 7. FAZ E'de ne yapıldı — kanıtla

**UY-26 · UY-28 · UY-36 · UY-39 · UY-41 · UY-43.** Uyum yönetişimi.
Beşi kapandı, biri (UY-41) repo içinde bitirilip dış bağımlılığa dayandı.

Bu fazın dört maddesi **ölçülmüş kusur** kapatır. Dördü de aynı biçimde
bulundu: şemada bir alan ya da bir sözlük değeri VARDI ve ürün kodunda
onu YAZAN hiçbir yer YOKTU.

| Madde | Ölü olan şey | Sonuç |
| --- | --- | --- |
| UY-26 | Kapanış kapısı kök neden SORMUYORDU | Kök nedeni hiç yazılmamış bir bulgu "kapalı" yapılabiliyordu |
| UY-28 | `Bulgu.tekrarBulguId` — yazıcısı olmayan alan | "Bu bulgu daha önce de açılmış mıydı" sorusu cevapsızdı |
| UY-36 | `Bildirim.tip = 'eskalasyon'` — hiç yazılmıyordu | Bildirim ekranının eskalasyon merceği BOŞ bir kovayı süzüyordu |
| UY-39 | `SurumFarki` yalnız aktifleştirmeden SONRA yazılıyordu | "Aktifleştirirsem ne olur" sorusu sorulamıyordu; aktifleştirme geri alınamaz |

### 7.1 Bu fazda hiçbir resmî kaynak adresi yazılmadı

`lib/uyum/mevzuatKaynagi.ts` içinde tek bir resmî site adresi yoktur ve
olmayacaktır. Bir mevzuat kaynağının adresi kurumun kararıdır: hangi
otoritenin hangi sayfasının takip edileceği, kurumun kendi uyum
kapsamına bağlıdır. Ürüne gömülü bir adres, kurum başka bir kaynağı
takip ediyorsa sessizce yanlış bir izlenim verir.

Sunucu eylemi `izlemeTuru: 'saglayici'` seçimini de REDDEDER: kayıtlı
ve bağlı bir sağlayıcı yokken "otomatik izleniyor" yazan bir kayıt,
hiçbir yere bağlanmayan bir kütük satırı olurdu.

### 7.2 UY-26 · kapanış kapısı artık kök neden soruyor

Kapı `lib/uyum/kokNeden.ts → kapanisKapisi()` içindeki SAF fonksiyondur;
açık aksiyon denetimi de oraya taşındı ki kapanışın TEK bir kuralı
olsun. `lib/eylemler.ts → bulguGuncelle` ve ekran AYNI fonksiyonu
çağırır: ekranın kapıyı önceden göstermesi bir kolaylıktır, asıl kapı
sunucudadır.

**Kapı yalnız zorunlu olduğu yerde kapatır.** Kritik ve yüksek önemli
bulgular ile TEKRAR eden bulgular analiz ister; düşük önemli, ilk kez
görülen bir bulga analizsiz kapatılabilir. Kapıyı her yere koymak,
kapının kendisini anlamsız kılardı — herkes aynı iki cümleyi kopyalamaya
başlar.

**Kategori sayılır, metin anlatır.** İkisi birlikte tutulur ve biri
ötekinin yerine geçmez: yalnız serbest metin olsaydı "aynı kök neden kaç
bulguda tekrarlıyor" sorusu cevaplanamazdı; yalnız kategori olsaydı
analiz bir açılır listeye inerdi ve hiçbir denetçi bunu analiz saymaz.
Bu yüzden metin en az 40 karakterdir ve kapı bunu ölçer.

**Analizin damgası zorunludur.** Kim yaptığı bilinmeyen bir kök neden
analizi `imzasiz` sayılır ve bu bir kusurdur — "bunu kim yazdı"
sorusuna cevap veremeyen bir analiz, bir görüştür. Damga kullanıcıdan
alınmaz, oturumdan yazılır.

### 7.3 UY-28 · tekrar tanımı DAR tutuldu

Tekrar: **aynı kontrol, aynı santral** (aynı `maddeDurumuId`) üzerinde
pencere içinde KAPANMIŞ bir bulgu varsa ve yeni bulgu o kapanıştan
sonra açıldıysa.

**Başlık benzerliğine BAKILMAZ.** Metin benzerliğiyle tekrar aramak,
birbirine benzeyen ama farklı iki sorunu birleştirir ve denetçiye "bu
zaten biliniyordu" diye yanlış bir tarihçe sunar. Aynı kontrolün
yeniden düşmesi ise tartışmasız bir olgudur.

**Açık bir bulgunun yanındaki ikinci bulgu tekrar DEĞİLDİR:** o aynı
sorunun ikinci kaydıdır ve ayrı bir veri kalitesi sorunudur.

**Motor insanın kararını EZMEZ:** `tekrarBulguId` dolu olan bulgu
atlanır. Bağın kim tarafından kurulduğu (`tekrarKaynagi`: motor / elle)
kayda yazılır çünkü insanın gördüğü bir örüntü ile motorun bulduğu bir
eşleşme aynı güvende değildir. Pencere de her bağın kendi kaydına
yazılır (`tekrarPenceresiGun`) ki eşik sonradan değişince eski bağın
hangi eşikle kurulduğu kaybolmasın.

Motorun izi **aktörsüzdür** (`aktorId: null`, `kaynak: 'is_kosusu'`):
bağı bir insan kurmadı ve iz bunu uydurmaz.

### 7.4 UY-36 · eskalasyon bir bildirim türü değil, bir KADEME

`Bildirim.tip` sözlüğünde `eskalasyon` değeri vardı; bildirim ekranı
onun için ayrı bir mercek ve ayrı bir renk taşıyordu. Ürünün tek
bildirim yazıcısı `motorlar/sonTarih.ts` idi ve daima `tip: 'uyari'`
yazıyordu. `motorlar/eskalasyon.ts` o değeri yazan ilk yerdir.

**Her kademe BİR KEZ tetiklenir** (`EskalasyonKaydi` tekil kısıtı).
Motor her koşuda yeniden bildirim yazsaydı, gecikmiş tek bir bulgu her
tikte bir bildirim üretir ve kullanıcı bildirim ekranını kapatırdı —
eskalasyon o gün ölürdü.

**En yüksek hak edilmiş kademe seçilir, alttakiler atlanır.** İlk kez
40 gün gecikmiş bir kayda 7/14/30 günlük üç kademeyi arka arkaya yazmak
üç bildirim üretir ve hiçbiri okunmaz.

**Hedefsiz eskalasyon SESSİZCE düşmez.** Kural kime haber vereceğini
bulamazsa (sorumlu atanmamış, rol boş, hedef kullanıcı pasif) kayıt
YİNE yazılır ve `sebep` alanı bunu söyler; ekran o boşluğu gösterir.
"Kimseye haber verilemedi" bir başarı değildir.

**Matrisin kendi kusurları ölçülür.** Üst kademenin gecikmesi alt
kademeden küçükse alt kademe hiç tetiklenmez ve kimse fark etmez;
`matrisKusurlari()` bunu bulur ve konsol satırı kırmızı gösterir.

**Hedef tarihi olmayan kayıt eskale EDİLMEZ:** gecikme olmayan bir
tarihe göre ölçülemez ve "tarihi yok, demek ki gecikmiş" varsayımı
ölçülmemiş bir şeyi kusur saymak olurdu.

### 7.5 UY-39 · önizleme ile aktifleştirme AYNI fonksiyonu çağırır

`surumEtkisiOnizle` hiçbir şey yazmaz ve `surumAktiflestir` ile aynı saf
fark fonksiyonunu (`lib/uyum/degisiklikEtkisi.ts → surumFarki`)
paylaşır. Önizlemenin gerçekten olacak şeyi göstermesinin tek garantisi
budur; iki ayrı hesap, o gün önizlemeyi bir süse dönüştürürdü.

**Etkilenen kayıtlar HALKA HALKA sayılır, tek sayıya toplanmaz.** "42
kayıt etkilenir" cümlesi, 40'ı kanıt bağı 2'si açık bulgu olduğunda
yanıltıcıdır. Dokuz halka ayrı ayrı raporlanır: değerlendirme · karar
verilmiş değerlendirme · kanıt bağı · açık bulgu · açık aksiyon · risk ·
belge · çapraz eşleme · aktif istisna.

**Yeni maddenin ayak izi halkalara SAYILMAZ:** yeni madde mevcut hiçbir
kaydı etkilemez, ekleyecektir. Sayılsaydı etkilenen kayıt sayısı
olduğundan büyük çıkardı.

Sonuç cümlesi NE OLACAĞINI söyler, "olabilir" demez: belirsiz bir uyarı
kullanıcıyı karar veremez hâlde bırakır.

### 7.6 UY-41 · bağlı olmamak, izlememek demek değildir

Sağlayıcı BAĞLI DEĞİL ve ürün hiçbir siteye kendiliğinden bağlanmaz.
Buna rağmen kütük bağlantıdan ÖNCE de işe yarar: hangi regülasyonun
hangi resmî kaynaktan, hangi aralıkla izleneceği yazılı bir kurum
kararıdır.

`sonKontrol` yalnız bir insan "baktım" dediğinde yazılır ve **not
zorunludur**: notsuz bir bakış takip sayacını sıfırlar ama denetçiye
hiçbir şey söylemez. "Değişiklik yok" da bir nottur ve yazılması
gerekir.

Durum sözlüğü ölçülmemişi kusurdan AYIRIR: `adressiz` (bakılacak yer
yok — önce adres girilmeli), `hic_bakilmadi` (takip hiç başlamadı) ve
`gecikti` üç ayrı hâldir. Adresi olmayan bir kayda "gecikti" demek,
kurumun yapmadığı bir işi kusur saymak olurdu.

### 7.7 UY-43 · kuru koşu bir seçenek değil, bir ADIM

Uygulama kaydı kendi kuru koşusuna KÖKENLE bağlıdır ve bağsız uygulama
yazılamaz. Bir değerlendirme aktarımı tek hamlede yüzlerce kontrolün
durumunu değiştirebilir ve bunların her biri bir DENETİM KARARIDIR.

**Uygulama anında kuru koşu YENİDEN hesaplanır.** Kaydedilmiş rapora
güvenilmez: kuru koşu ile uygulama arasında biri o kontrollerin durumunu
elle değiştirmiş olabilir ve önizlemedeki "eski durum" artık doğru
değildir. Kaydedilen rapora körü körüne yazmak, aradaki insan kararını
sessizce ezerdi.

**Eşleşen ile değişen AYRI sayılır.** 300 satırın 300'ü eşleşip hiçbiri
değişmiyorsa, "300 kayıt güncellendi" demek denetim izini gürültüye
boğar ve gerçek değişikliği görünmez kılar.

**Eleme tavanı bir güvenlik kapısıdır.** Satırların yarısından çoğu
eleniyorsa dosya büyük ihtimalle YANLIŞ regülasyona ya da yanlış
santrale aktarılıyordur; kalan azınlığı sessizce yazmak, doğru görünen
ama yanlış yere yazılmış bir aktarım üretirdi.

**Onaylı istisna ezilmez:** aktif istisnası olan madde elenir. Kurum o
maddeyi bu santral için bilinçli olarak kapsam dışı bırakmıştır ve bir
elektronik tablo satırının o kararı geçersiz kılması kabul edilemez.

**Gerekçe "uyumsuz" ve "kapsam dışı" için zorunludur.** İkisi de
kurumun kendi aleyhine ya da lehine verdiği kararlardır ve denetimde
ilk sorulanlardır; gerekçesiz toplu aktarımla yazılmaları tam olarak
denetimin yakalamak istediği şeydir.

**Her satır kendi izini bırakır:** her durum değişikliği kendi
`DegerlendirmeTarihcesi` ve `AktiviteKaydi` satırını yazar. Toplu
yazmayı tek bir "aktarım yapıldı" satırıyla geçirmek, denetimde en
pahalı boşluktur.

### 7.8 Sabotajla doğrulama — on bir kural, bir de test boşluğu

Her kural tek tek kaldırıldı, hangi testin kırıldığı kaydedildi, kural
geri kondu:

| Kaldırılan kural | Kırılan test |
| --- | --- |
| Kapanış kapısının kök neden sorusu | 5 test (saf + eylem) |
| Tekrar penceresi | *pencere dışında kalan kapanış tekrar üretmez* |
| Kapanmış-bulgu koşulu | **ÖNCE HİÇBİRİ — test boşluğu** (aşağıya bakınız) |
| Motorun "elle kurulan bağı ezme" koruması | 2 test (saf + motor) |
| Özel kuralın geneli ezmesi | *aynı kademe iki kez uygulanmaz* |
| Hedefsizliğin kaydedilmesi | 3 test |
| En yüksek kademe seçimi | 2 test |
| Yeni maddenin halkalardan çıkarılması | *YENİ maddenin ayak izi halkalara SAYILMAZ* |
| Eleme tavanı | *eleme oranı tavanı aşarsa aktarım UYGULANMAZ* |
| Kuru koşu ön koşulu | *KURU KOŞUSUZ uygulama reddedilir* |
| Uyumsuz kararın gerekçe zorunluluğu | 2 test |

**Bir sabotaj yakalanmadı ve bu bir bulgudur.** `tekrarKarari` içindeki
`durum === 'kapali'` koşulu kaldırıldığında HİÇBİR test kırılmadı:
testler açık bulguyu daima `kapanma: null` ile kuruyordu, dolayısıyla
`kapanma !== null` koşulu tek başına yetiyordu. Gerçek boşluk şuydu —
durumu "açık" görünüp kapanma tarihi taşıyan bozuk bir kayıt (elle
düzenleme, hatalı aktarım) tekrar üretebilirdi.

İki test eklendi (*"DURUMU açık ama kapanma tarihi dolu kayıt tekrar
ÜRETMEZ"* ve *"kabul_edildi durumundaki bulgu da tekrar üretmez"*),
sabotaj yeniden koşuldu ve bu kez YAKALANDI. Kural değişmedi; eksik
olan testti.

---

## 8. FAZ F'de ne yapıldı — kanıtla

UY-52 · UY-53 · UY-54 · UY-55 · UY-56 · UY-57.

Bu fazın dört yeni Prisma modeli, üç yeni ekranı ve altı sunucu eylemi
var; ama asıl konusu **kapı**dır: bir anahtarın nereye girebildiği, bir
kaydın ne zaman silinebildiği, bir dış denetçinin ne zaman çıktığı.

### 8.1 Göç veri kaybı 0 — ölçülerek

`20260904041111_faz_f_altyapi_saklama_denetci`

| Ölçü | Öncesi | Sonrası |
| --- | --- | --- |
| Tablo | 127 | 132 |
| Toplam satır | 4732 | 4733 (**yalnız `_prisma_migrations` büyüdü**) |
| Kaybolan tablo / satır | — | **0** |
| Tetikleyici | 6 | 6 (hepsi korundu) |
| `PRAGMA foreign_key_check` | — | temiz |

**Göçe elle bir satır eklendi ve sebebi budur:**

```sql
-- UY-52 · MEVCUT ANAHTARLARIN DAVRANIŞI KORUNUR
UPDATE "ApiAnahtari" SET "saltOkunur" = 0 WHERE "kapsamJson" IS NULL;
```

`saltOkunur` şema varsayılanı `true`dur; bu YENİ anahtarlar için doğru
varsayılandır (alanı doldurmayı unutan kod yolu fazla yetkili değil
zararsız bir anahtar üretsin). Ama aynı varsayılanı var olan üç satıra
yazmak, çalışan entegrasyonları **sessizce** kırardı. Bir göçün
yapabileceği en kötü şey, çalışan bir bağlantıyı kimse fark etmeden
kesmektir.

### 8.2 UY-52 · ölçülmüş kusur: anahtarın kendi kapsamı YOKTU

`lib/api/kimlik.ts` şunu yazıyordu ve **rol katmanı için doğruydu**:
"API için paralel bir yetki sistemi YOKTUR." Atladığı şey şuydu: bir
CMDB entegrasyonuna verilen anahtar, sahibi yönetici olduğu için kanıt
paketi de okuyabiliyor, varlık da yazabiliyordu. Salt okunur olması
gereken bir bağlantı kurumun her şeyine erişiyordu.

Artık her anahtar erişebileceği uçları **sayarak** bildirir
(`ApiAnahtari.kapsamJson` + `saltOkunur`). Kapı `lib/api/kapsam.ts`
içindedir ve `lib/api/ucnokta.ts` hattına **kimlikten sonra, rolden
önce** takıldı:

```
demo kilidi → oran sınırı → kimlik → ANAHTAR KAPSAMI → modül izni →
gövde → idempotency → işleyici → denetim satırı
```

Sıra bilinçlidir. Ters sırada, kapsam dışı bir uç için önce rol kapısı
çalışır ve yetkili bir sahiple istek geçerdi.

**Kapsam rolü DARALTIR, genişletmez.** Sahibinde olmayan bir uca kapsam
açmak hiçbir şey vermez; rol kapısı yine reddeder.

**Bu fazda ölçülmüş ikinci kusur — kendi listemdeydi.** `YAZMA_UCLARI`
ilk yazıldığında yalnız `assets.upsert` içeriyordu. Oysa POST alıp
veritabanına yazan **beş** uç var: adı "upsert" olmayan dördü
(`vulnerabilities`, `backup-results`, `access-observations`,
`assets.observations`) listede yoktu. Bu hâliyle salt okunur bir anahtar
zafiyet kaydı yazabilirdi — yani kapının koruduğunu sandığı şeyin dördü
açıkta kalırdı. Bir daha kaymasın diye
`tests/faz-f-api-kapsam.test.ts` listeyi `lib/api/uclar/` içindeki
`islem: 'yazma'` bildirimleriyle **karşılaştırır**: yeni bir yazma ucu
eklenip listeye yazılmazsa test kırılır.

**İki katmanlı savunma.** `saltOkunur` bayrağı kapsam listesinden
BAĞIMSIZ tutulur ve önce bakılır: listeye yanlışlıkla bir yazma ucu
girse bile bayrak kapalıysa yazma geçmez. Çelişki ayrıca üretim anında
da kesilir (`kapsamKapisi`) — ama iki katman ayrı sebeplerle vardır:
biri veritabanına elle dokunan birine karşı, öteki formu dolduran
kişiye karşı.

**Eski anahtarlar kesilmedi, İŞARETLENDİ.** `kapsamJson: null` olan
kayıt çalışmaya devam eder ve yanıt `X-Anahtar-Kapsami: tanimsiz`
başlığını taşır; ekranda da kusur (`bd`) olarak görünür. Bugün kesmek
çalışan entegrasyonları sessizce kırardı; görünmez bırakmak ise boşluğu
gizlerdi.

**Bozuk kapsam "her şey" DEĞİL "hiçbir şey"dir.** Okunamayan bir kapsam
alanını "kısıt yok" diye yorumlamak, kısıtın var olma sebebini ortadan
kaldırırdı.

**OpenAPI belgesi üründen TÜRETİLİR** (`lib/api/sozlesme.ts`): uç
kütüğünden, zod şemalarından (`z.toJSONSchema`) ve hata sözlüğünden.
Elle tutulan bir sözleşme ilk uç değişikliğinde sessizce yanlışa döner
ve entegrasyonu yazan taraf yanlış belgeye göre kod üretir.
`servers` alanı **bilerek yoktur**: ürünün nerede koşacağı ürünle
gelmez ve örnek bir taban adres, üretilen her istemciye yanlış bir adres
koymak olurdu.

**Yeni ekran:** `/api-sozlesmesi` — uç tablosu (yol · yöntem · **o uca
erişen etkin anahtar sayısı**) ve belgenin kendisi. İkinci sütun
birinciden önemlidir: bir uca kaç anahtarın eriştiğini bilmeyen kurum o
ucu kapatamaz. Kapsamı tanımsız anahtarlar BÜTÜN uçlara sayılır —
bugünkü gerçek erişimleri odur.

### 8.3 UY-53 · yerel parola bir SSO değildir

`lib/altyapi/kimlikSaglayici.ts` — `lib/uyum/disSaglayicilar.ts` ile
aynı kalıp: arayüz, kayıt defteri, bağlanmamış sağlayıcının açık beyanı.
**Hiçbir IdP uç noktası, tenant kimliği ya da claim eşlemesi ürünle
gelmez.** Test bunu ayrıca ölçer: kütükte `https://`, `.onmicrosoft.com`
ya da GUID benzeri bir dize bulunursa kırılır.

Ürünün bugünkü girişi kendi kullanıcı kütüğüne bakar. Bu **çalışan bir
kurulumdur** ama SSO değildir: parola politikası, oturum ömrü, ikinci
faktör ve ayrılan personelin kapatılması ürünün dışında yönetilir.
`kimlikBeyani()` bunu bir cümlede söyler ve ekran "SSO ile giriş" DEMEZ.

Ürüne ayrı bir TOTP katmanı da **kurulmadı**. Kurumun IdP'si zaten MFA
uyguluyorken ürüne ikinci bir faktör koymak, kullanıcıyı iki kez
doğrulatır ve kurumun politikasından ayrışan ikinci bir kimlik yüzeyi
üretirdi.

### 8.4 UY-54 · UY-55 — hazırlık ekranında SATIR olmak

İkisinin de altyapısı OT-48 ve OT-49'da vardı; eksik olan, kurulum
hazırlığı ekranının bunları **söylememesiydi**.

`lib/altyapi/hazirlik.ts`e üç kontrol eklendi ve üçü de **bilgi
kalemidir** (`zorunlu: false`):

| Kontrol | Bugünkü hâli |
| --- | --- |
| Sır kasası (Vault/KMS) bağlı | eksik — sırlar `env` / `dosya` sağlayıcılarından çözülüyor; döndürme ve merkezî iptal ürünün dışında |
| Kurumsal kimlik (SSO) | eksik — giriş ürünün kendi kütüğünden |
| İkinci faktör (MFA) | eksik — ürün ikinci faktör istemez ve "MFA korumalı" numarası yapmaz |
| Gerçek veri hacmiyle yük ölçümü | eksik — `npm run olcum:yuk` TOHUM verisiyle koşar |

Zorunlu yapmak, bugün doğru çalışan her kurulumu kırmızı gösterirdi ve
ekrana bir daha bakılmazdı. Satırın hiç olmaması ise "sırlar merkezî
kasada" ya da "SSO var" sanılmasına yol açardı.

`arac/yuk.mjs`in "her koşuda ekrana yazar" iddiası **doğrulandı**:
araç 133-134. satırlarda tohum verisi uyarısını basıyor ve
`arac/performans-tabani.json` aynı notu taşıyor.

Aynı geçişte, `hazirlik.ts` içindeki bir yorum da düzeltildi: nesne
deposunun zorunlu olmama gerekçesi "kanıt dosyası katmanı (UY-13) henüz
yok" diyordu; UY-13 FAZ D'de kapandı ve katman **artık var**
(`lib/uyum/kanitDeposu.ts`, yerel dosya sisteminde). Gerekçe bugünkü
gerçeğe göre yeniden yazıldı.

### 8.5 UY-56 · ürün kendi kendine SİLMEZ

Saklama iki yönlü bir yükümlülüktür: kayıt süresinden önce silinemez
(denetim kanıtı yok olur), süresi dolan da sonsuza kadar tutulamaz
(kişisel veri, sözleşme, kurumun kendi politikası). Ürün bugüne kadar
yalnız birincisini yapıyordu — ve bu bir politika değil,
**politikasızlıktı**.

Üç kütük, bu sırayla: **politika** → **hold** → **imha kararı**.

**Ürün hiçbir kaydı kendiliğinden silmez.** Politika bir ÖNERİ üretir;
silmenin olduğu tek yer `imhaKarariniUygula` ve oraya giden yol dört
kapıdan geçer:

1. Kayıt ailesi **değişmez** mi (`AktiviteKaydi`,
   `DegerlendirmeTarihcesi` — veritabanı tetikleyicisi silmeyi zaten
   reddeder; kapı bunu **baştan** söyler).
2. Politika var ve aktif mi, süre tanımlı mı.
3. **Dört göz:** öneren ile onaylayan aynı kişi olamaz. Toplu ve geri
   alınamaz bir silmeyi tek kişinin kararına bırakmak, bu ürünün hiçbir
   yerde yapmadığı şeydir.
4. **Hold uygulama anında YENİDEN sorulur.** Öneri ile uygulama
   arasında bir soruşturma başlamış olabilir; öneri anındaki "hold yok"
   cevabına güvenmek, dondurulmuş kayıtları silmek demek olurdu.

Kapsanan kayıt sayısı öneri anında **ölçülür** ve karara yazılır;
uygulama anında **yeniden ölçülür** ve ikisi ayrı alanlarda durur.
Farklıysa arada bir şey olmuştur ve bu görünür kalır. Süresi dolmuş
kayıt yoksa boş bir karar kaydı **açılmaz**.

Hold kaydı silinmez, durumu değişir: bir muhafazanın ne zaman konduğu ve
ne zaman kalktığı denetimin sorusudur.

İmhadan sonra geriye kalan tek şey denetim izidir ve o iz değişmez
ailededir — imha edilemez.

**Yeni ekran:** `/saklama`. Politika kütüğünde payda kayıt ailelerinin
kendisidir: politikası **olmayan** aile de satır olarak görünür. Yalnız
tanımlı politikaları listelemek, eksikliği görünmez kılardı.

### 8.6 UY-57 · defter yazmak kapı açmaz

`dis_denetci` rolü `lib/erisim.ts` içinde zaten vardı
(`denetim: ['okuma'], uyum: ['okuma']`) ve **yalnız bir rol adıydı**:
süresi, kapsamı, kim davet etti, ne zaman biter — hiçbiri kayıtlı
değildi. Dış denetçiye kalıcı hesap açmak, denetim bittikten sonra da
açık kalan ve kimsenin kapatmayı hatırlamadığı bir kapı bırakır.

Bu maddenin en kritik kararı şu: **`DenetciErisimi` bir DEFTERDİR,
kapı değil.** Erişimi gerçekten uygulayan şey ürünün var olan yetki
katmanıdır. Bu yüzden davet, kapsamdaki her santral için bir
`dis_denetci` **yetki satırı yazar**; iptal ve süre sonu o satırları
**siler**. İkisini ayırmak — deftere yazıp yetkiye dokunmamak — ekranda
"erişim kapandı" yazarken kapının açık kalması demek olurdu. Bu üründe
en pahalı hata sınıfı budur ve test tam olarak bunu ölçer
(sabotaj 4: yetki silmeyi kaldırınca iki test düştü).

**Süre zorunludur**, tavanı 365 gündür ve **boş kapsam = hiçbir şey**:
kapsamsız bir dış erişim hiçbir santral göstermez; "boş kapsam = her
şey" varsayımı bir dış denetçiye kurumun tamamını açmak olurdu.

Kayıt veritabanında `aktif` görünüp bitiş tarihi geçmiş olabilir
(zamanlayıcı henüz koşmamıştır). `yasayanDurum` o satırı zaten "süresi
doldu" gösterir ve ekran, yetki satırları hâlâ duruyor olabileceği için
bir düğme çıkarır. Ekranın gösterdiği ile kapının yaptığı arasında fark
bırakılmaz.

Süresi dolan erişim bir **kusur değildir**: sistem doğru çalıştı ve kapı
kapandı — `pl` (planlı) ile gösterilir, kırmızıyla değil.

### 8.7 Sabotajla doğrulama — beş kural

Her kural tek tek bozuldu, testler koşturuldu, sonra geri alındı.

| # | Bozulan kural | Sonuç |
| --- | --- | --- |
| 1 | `saltOkunur` katmanı kaldırıldı (`if (false && …)`) | **3 test düştü** |
| 2 | Bozuk kapsam "her şey" sayıldı | **1 test düştü** |
| 3 | Dört göz kuralı kaldırıldı (öneri + onay kapısı) | **3 test düştü** |
| 4 | İptalde `dis_denetci` yetki satırları silinmedi | **2 test düştü** |
| 5 | Uygulama anında hold sorulmadı | **5 test düştü** |

Beş sabotajın beşi de yakalandı. Ağaç sonra geri yüklendi ve
`npx tsc --noEmit` temiz döndü.

---

## 9. FAZ G'de ne yapıldı — kanıtla

FAZ G'nin sekiz maddesi diğer fazlardan **farklı bir yerden** geldi.
İlk 38 madde karşılaştırma matrisinin kendi listesiydi. Bu sekizi,
liste *"bir regülasyon-uyum ve OT-envanter platformundan ne beklenir"*
gözüyle yeniden okunduğunda görülen ve üründe **hiçbir karşılığı
olmayan** boşluklardır:

| ID | Boşluk | Neden gerçek bir boşluktu |
| --- | --- | --- |
| OT-55 | Fiziksel envanter sayımı | Keşif yalnız **ağda görüneni** bulur. Kapalı panodaki yedek PLC, hiç ağa bağlanmayan mühendislik dizüstü, depoya konmuş kart taramada çıkmaz. |
| OT-56 | Kritik yedek parça | EOL/EOS "ne zaman desteksiz kalacak" der; "bugün bozulursa elimizde var mı" sorusunun cevabı yoktu. |
| OT-57 | Taşınabilir medya | OT ortamında en sık bulaşma yollarından biri; ürün hiç kayıt tutmuyordu. |
| UY-59 | Olgunluk seviyesi | Şemada `Madde.olgunlukSeviyesi` alanı VARDI ve **hiçbir ekran, motor ya da tohum veri onu okumuyordu**: ölü alan. |
| UY-63 | Bildirim süresi | `bildirimGerekli` ve `bildirimTarihi` vardı; eksik olan tek şey **süreydi**. "Ne zamana kadar" sorusunun cevabı hiçbir yerde yoktu. |
| UY-64 | Kontrol testi yöntemi | Kontrolün doğrulandığı kayıtlıydı; **hangi yöntemle** doğrulandığı değil. |
| UY-65 | Yönetim gözden geçirmesi | Çoğu çerçevede (ISO 27001 dâhil) zorunlu bir kayıt; ürün için ayrı bir yer yoktu. |
| UY-66 | Eğitim kütüğü | "Eğitim kaydı" bir kanıt *tipi* olarak bağlanabiliyordu; kim–ne–ne zaman–ne kadar geçerli kütüğü yoktu. |

### 9.1 Göç veri kaybı 0 — ölçülerek

İki göç yazıldı, ikisi de **yalnız ekleyici**:

| Göç | İçerik |
| --- | --- |
| `20260904054339_faz_g_sayim_yedekparca_medya_egitim` | 13 yeni tablo |
| `20260904055548_faz_g_madde_durumu_olgunluk` | `MaddeDurumu.olgunlukSeviyesi` tek sütun |

İkinci göçün sebebi bir **atlamadır**: ilk göç yazılırken
`MaddeDurumu` üzerindeki ölçülen olgunluk sütunu unutuldu. Var olan
göçü elle düzeltmek yerine ikinci ve temiz bir `ALTER TABLE ADD COLUMN`
göçü yazıldı — göç dosyası bir kez uygulandıktan sonra geçmişi
değiştirilmez.

| Ölçü | Öncesi | Sonrası |
| --- | --- | --- |
| Tablo | 132 | 145 |
| Toplam satır | 4779 | 4781 |
| Kaybolan tablo | — | **0** |
| Tetikleyici | 6 | 6 |
| `PRAGMA foreign_key_check` | temiz | temiz |

Artan iki satır `_prisma_migrations` kaydıdır. İki göç dosyasında da
`DROP TABLE` ve `DROP COLUMN` **sıfırdır** (metinle doğrulandı).

### 9.2 OT-55 · "sayılmadı" ile "bulunamadı" ayrı şeylerdir

Bu ayrım modülün var olma sebebidir. Henüz gidilmemiş bir raf, kayıp
varlık değildir. İkisini aynı kovaya koymak sayımı ilk gün
"%90 kayıp" gösterir ve kimse bir daha o ekrana bakmaz.

Beş sonuç var: `sayilmadi` · `dogrulandi` · `bulunamadi` ·
`yeri_farkli` · `fazladan`. Üç karar bilinçlidir:

- **Doğruluk oranının paydası yalnız sayılmış satırlardır.** Hiç
  sayılmamışsa oran `null` döner — ekran "ölçülmedi" der, "%0 doğru"
  demez.
- **Payda açılışta DONAR.** Kampanya açıldıktan sonra envantere eklenen
  varlık bu sayımın paydasını değiştirmez; yoksa iki gün arayla alınan
  iki ekran görüntüsü çelişirdi.
- **Sayım hiçbir varlığı silmez.** `lib/eylemler2/sayim.ts` içinde
  `varlik.delete` ya da `varlik.update({ silindi })` YOKTUR. "Bulunamadı"
  bir ölçüm sonucudur; envanterden düşürme ayrı bir insan kararıdır.

`fazladan` satır — sahada var, kayıtta yok — envanter bağı taşıyamaz ve
**saha kimliği zorunludur**: kimliksiz bir "fazladan cihaz" kaydı,
kimsenin bir daha bulamayacağı bir uyarıdır.

### 9.3 OT-56 · stok tükenmesi tek başına kırmızı değildir

`acikRisk` yalnız **ikisi birden** doğruyken açılır: stok tükenmiş VE
ağır kritiklikte (yüksek/kritik) en az bir varlık o parçaya bağlı.
Yalnız stoğa bakmak, kimsenin umursamadığı bir parçayı da kırmızı
gösterirdi ve ekran gürültüye boğulurdu.

Tedarik süresi **ölçülmediyse boş kalır**; `0` yazılmaz. Sıfır gün
"hemen gelir" demektir ve ölçülmemiş süreyi anlatmak için `null` vardır
— kapı `tedarikSuresiGun: 0` girişini reddeder.

### 9.4 OT-57 · ürün medyayı ENGELLEMEZ, kayıt tutar

Bu bir yönetişim ürünüdür; USB portuna müdahale eden bir uç nokta
ajanı değildir. Kütük tutar, tarama tazeliğini (90 gün) söyler, onaysız
kullanımı işaretler.

Üç karar:

- **`sifreli` üç değerlidir**: evet · hayır · **ölçülmedi**. Şifreli
  olup olmadığı bilinmeyen bir medyayı "şifresiz" saymak da
  "şifreli" saymak da uydurmadır.
- **Karantina ve imha kullanım kaydı KABUL ETMEZ**; **kayıp medya
  kabul EDER**. Kayıp bir belleğin en son nerede kullanıldığını
  yazamamak, olay incelemesini kör bırakırdı.
- **Onaysız kullanım reddedilmez, uyarıyla kaydedilir.** Onayı zorunlu
  tutmak, kaydı hiç girilmeyen bir kullanım üretirdi — ve kayıtsız
  kullanım hiç görünmez.

### 9.5 UY-59 · ölçülmüş kusur: yazılıp okunmayan alan

`Madde.olgunlukSeviyesi` şemada **vardı**. Hiçbir ekran, hiçbir motor,
hiçbir tohum veri onu okumuyor ya da yazmıyordu: ölü alan. Bu, matriste
"VAR" görünüp üründe karşılığı olmayan tipte bir satırdır ve bu programın
aramakla yükümlü olduğu şeydir.

FAZ G'de alan **ikiye ayrıldı**: hedef seviye maddenin kendisinde,
**ölçülen** seviye `MaddeDurumu` üzerinde (tesis başına). İkisi aynı
sütunda dursaydı "hedefimiz 4" ile "bugün 2'deyiz" aynı sayıya yazılırdı.

Ölçek koda gömülüdür (0–5) ve konsoldan değiştirilemez: kademeler
ekrandan yeniden yazılabilseydi iki santralin "seviye 3"ü aynı şeyi
anlatmazdı ve karşılaştırma çökerdi.

**Ortalama YOK.** Özet bir dağılım döndürür. Olgunluk kademeleri sıralı
ama eşit aralıklı değildir; ortalaması alınan bir olgunluk puanı,
2 ile 4'ün ortasını 3 diye gösterir ve bu yanlıştır.

Seviye 3 ve üstü **gerekçe ister**: "yazılı ve kurum genelinde aynı"
iddiası denetçinin ilk soracağı şeydir.

### 9.6 UY-63 · süreler ürünle GELMEZ

Kaç saat içinde bildirileceği mevzuattan gelir ve kurumun tabi olduğu
düzenlemeye göre değişir. **Örnek bir süre yazmak**, yanlış bir saatle
çalışan bir sayaç bırakırdı: kimse değiştirmez ve ürün yanlış anda
"geciktiniz" ya da daha kötüsü "vaktiniz var" der. Kural tanımlı
değilse sayaç **hiç işlemez** ve bu bir hata değildir.

Üç karar:

- **Saat olayın BAŞLANGICINDAN işler**, kaydın açıldığı andan değil.
  Bir olay üç gün sonra fark edilip kaydedilmiş olabilir; yükümlülük o
  üç günü beklemez.
- **Birden fazla kural uyuyorsa EN KISA süre kazanır.** En dar
  yükümlülük bağlayıcıdır; en uzunu seçmek kurumu kendi kurallarından
  birine göre geciktirirdi.
- **Elle işaretlenmiş yükümlülük kuralı ezer**: `bildirimGerekli = false`
  yazan olayda kural uysa bile sayaç işlemez — insan bakmış ve "bu
  kapsamda değil" demiştir.

**17. motor** (`bildirim_suresi`) süresi geçen/daralan olaylar için
`Gorev` açar. Üç şeyi bilerek YAPMAZ: olayın kendisine dokunmaz,
`bildirimGerekli`/`bildirimTarihi` alanlarını **yazmaz** ve kural yoksa
hiçbir şey yapmaz. Resmî bir bildirimin yapıldığını söyleyebilecek tek
şey insandır.

`Bildirim` değil `Gorev` açmasının sebebi yapısaldır: `Bildirim` bir
kullanıcıya yazılır, olayın ise atanmış bir sorumlusu yoktur. Sahipsiz
bir uyarıyı kime göndereceğini bilmeyen motor onu ortak iş kuyruğuna
bırakır.

### 9.7 UY-64 · "işleyişini test ettik" bir sayı ister

İki yöntem var: **tasarım** testi (kontrol doğru mu kurgulanmış) ve
**işleyiş** testi (kurgulandığı gibi çalışıyor mu).

- İşleyiş testi **evren + örneklem + uygun sayısı** ister. "İşleyişini
  test ettik" demek, kaç kayda bakıldığını söylemeden bir iddiadır.
- Tasarım testinde bu alanlar **boş kalmalıdır**; sayı yazmak testi
  olduğundan güçlü gösterir.
- Kayıt **kendi sayılarıyla çelişemez**: örneklemin tamamı uygunken
  sonuç "uygun değil" olamaz; uygunsuz kayıt varken sonuç "uygun"
  olamaz.
- Test kaydı **silinmez ve değiştirilmez**; düzeltme yeni bir test
  kaydıdır. Duruş hesaplanırken en yeni **işleyiş** testi tercih edilir.

Tazelik eşiği 365 gündür; daha eski bir test "bayat" gösterilir ve
"test edilmedi" ile karıştırılmaz.

### 9.8 UY-65 · kararsız bir toplantı "yapıldı" değildir

Bir gözden geçirmenin denetimdeki değeri **ürettiği kararlardır**.
Kapı bu yüzden en az bir karar ve bir özet ister; gelecekte olan bir
toplantı "yapıldı" işaretlenemez.

Kararın **sorumlusu ve son tarihi birlikte zorunludur**: sahipsiz bir
karar, bir sonraki toplantıya kadar kimsenin bakmadığı bir satırdır.
Karardan görev açılabilir.

Yaşayan durum üç değerlidir ve dördüncüsü `kararsiz`'dır: yapılmış ama
kararsız bir gözden geçirme, yapılmamış gibi gösterilmez — kendi adıyla
gösterilir. Periyot 365 gündür.

### 9.9 UY-66 · kapsam sıfırken oran YOKTUR

Sıfır kişilik bir eğitimi "%100 tamamlandı" göstermek ekranı yalan
söyler hâle getirirdi; `egitimKapsamasi` bu durumda `oran: null` döner.

Geçerlilik bitişi **tamamlanma tarihinden** hesaplanır, atama
tarihinden değil. Geçerlilik süresi girilmemişse eğitim `suresiz`
sayılır — "süresi dolmuş" değil. Yenilemeye 30 gün kalınca durum
`yenilenmeli` olur.

Zorunlu eğitimin paydası **aktif kullanıcılardır**; eğitim kaydı
kontrol maddesine bağlanabilir ve orada bir kanıt olarak okunur.

### 9.10 Bu fazda hiçbir gerçek kurum verisi yazılmadı

Sekiz maddenin hiçbiri bir dış sisteme bağlanmaz ve hiçbiri kurumdan
veri beklemez — bu yüzden sekizi de `COMPLETE`, hiçbiri
`CODE_READY_EXTERNAL_DEPENDENCY` değildir. Ürüne yazılmayanlar:

- **Bildirim süresi yok.** Hiçbir saat, hiçbir merci, hiçbir mevzuat
  maddesi ürünle gelmez.
- **Olgunluk kademelerinin resmî metni yeniden yazılmadı.** Ölçek
  genel bir 0–5 merdivenidir; kurumun kendi çerçevesiyle eşlemesi bir
  yapılandırma kararıdır.
- **Eğitim adı, süresi, zorunluluğu yok.** Kütük boştur.
- **Yedek parça, medya ve sayım verisi tohumdur** ve tohum olduğu
  söylenir.

### 9.11 Sabotajla doğrulama — on bir kural, on bir kırmızı

Her kural tek tek bozuldu, testler koşturuldu, sonra geri alındı.

| # | Bozulan kural | Sonuç |
| --- | --- | --- |
| 1 | Sayım doğruluk paydasına SAYILMAYAN satırlar da katıldı | **2 test düştü** |
| 2 | Sayımı eksik kapatmak için gerekçe zorunluluğu kaldırıldı | **2 test düştü** |
| 3 | Yedek parça açık riski ağır varlık aranmadan açıldı | **2 test düştü** |
| 4 | Karantinadaki medyaya kullanım kaydı serbest bırakıldı | **2 test düştü** |
| 5 | Olgunluk 3+ için gerekçe zorunluluğu kaldırıldı | **2 test düştü** |
| 6 | Bildirim yükümlülüğünde EN KISA yerine en uzun süre seçildi | **1 test düştü** |
| 7 | Bildirim sayacı olayın başlangıcı yerine ŞİMDİDEN işletildi | **4 test düştü** |
| 8 | Kontrol testinde kendi sayılarıyla çelişen sonuç kabul edildi | **1 test düştü** |
| 9 | Kararsız gözden geçirme "yapıldı" işaretlenebilir yapıldı | **3 test düştü** |
| 10 | Kapsamı boş eğitimin oranı `null` yerine %100 döndürüldü | **1 test düştü** |
| 11 | Motor olaya "bildirildi" tarihi yazdı | **1 test düştü** |

On bir sabotajın on biri de yakalandı. Ağaç sonra geri yüklendi:
sabotaj öncesi alınan on yedek dosyanın onu da geri yüklenen dosyayla
**bayt bayt aynı** çıktı ve `npx tsc --noEmit` temiz döndü.

> **Önceki turda bir ölçüm hatası yapılmıştı ve bu tur düzeltildi.**
> İlk sabotaj koşusunda yedek dosyalar `basename` ile adlandırılmıştı;
> `lib/varlik/sayim.ts` ile `lib/eylemler2/sayim.ts` aynı yedek adını
> paylaştı ve geri yükleme saf modülün üstüne eylem dosyasını yazdı.
> 2–4. sabotajların sonuçları bu yüzden geçersizdi. Yedek adları tam
> yola göre üretilecek şekilde düzeltildi ve **on bir sabotajın hepsi
> baştan koşuldu**; yukarıdaki tablo o koşunun sonucudur.

### 9.12 Dokuz ölçütün karşılığı

| Ölçüt | FAZ G'de karşılığı |
| --- | --- |
| VERİ MODELİ | 13 yeni model + 1 sütun · 2 salt ekleyici göç · veri kaybı 0 (§9.1) |
| ALAN MANTIĞI | 8 saf modül: `lib/varlik/{sayim,yedekParca,tasinabilirMedya}.ts` · `lib/uyum/{olgunluk,bildirimSuresi,kontrolTesti,gozdenGecirme,egitim}.ts` |
| SUNUCU / API | 7 eylem dosyası + 7 demo ikizi: `sayim` · `yedekParca` · `tasinabilirMedya` · `uyumOlcum` · `bildirimYukumlulugu` · `gozdenGecirme` · `egitim` |
| UI | 5 yeni ekran (`/sayim` · `/yedek-parca` · `/tasinabilir-medya` · `/gozden-gecirme` · `/egitimler`) + `/surecler/[id]` içinde olgunluk ve test blokları + `/olaylar` içinde bildirim süresi |
| YÖNETİM / KONFİG. | 11 yeni konsol satırı (3'ü `sinif: 'C'` — kod yeri ve gerekçesiyle) |
| GÜVENLİK | Her eylemde `yetkiZorunlu(KAPSAM_SONRA)` + kayıt okunduktan sonra `kapsamZorunlu` (tesis kapsamı) |
| TEST | 132 yeni vaka (38 + 55 + 39) · 11 sabotajın 11'i yakalandı (§9.11) |
| DENETİM İZİ | Her yazma `AktiviteKaydi`na düşer; sayım eksik kapatıldığında iz kaç satırın hiç sayılmadığını YAZAR |
| BELGE | Bu bölüm |

---

## 10. Sıradaki iş — bağımlılık sırası

**46 maddenin repo içi işi bitti.** `NOT_STARTED` ve `IN_PROGRESS`
kalmadı: 37 madde `COMPLETE`, 9 madde `CODE_READY_EXTERNAL_DEPENDENCY`.

Dokuz maddenin tamamı **tek bir şey** bekliyor ve o şey repo içinde
üretilemez: kurumun gerçek uç noktası, kimlik bilgisi ya da altyapısı
(§11). Hiçbiri "kod eksik" durumunda değildir.

Bağlantı günü sırası `INTEGRATION_DAY_RUNBOOK.md` içindedir. Sıradaki iş
bir geliştirme işi değil, bir **kurulum** işidir:

1. **Kimlik** (UY-53) — IdP bağlanınca giriş yüzeyi değişir ve dış
   denetçi hesapları da oradan gelir; en önce o.
2. **Altyapı** (OT-48 · UY-54) — PostgreSQL ve nesne deposu; UY-13'ün
   kanıt dosyaları ve UY-56'nın imha kararları bunun üstünde durur.
3. **Kaynaklar** (OT-40 · OT-50 · UY-20 · UY-41) — gerçek sistemlerin
   uç noktaları ve salt okunur kimlik bilgileri.
4. **İmza** (UY-18) — HSM/KMS; kanıt paketi imzasız kalmasın.
5. **Ölçüm** (OT-49 · UY-55) — gerçek veri hacmi geldikten SONRA;
   tohum verisiyle alınmış taban gerçeği temsil etmez.

---

## 11. Gerçek bağlantı için gereken dış bilgiler

Yalnız gerçekten gerekenler. Bu bilgiler gelmeden de **repo içi hazırlık
tamamlanabilir**.

**Dokuz madde gerçekten "bilgi bekliyor" durumundadır**
(`CODE_READY_EXTERNAL_DEPENDENCY`): OT-40 · OT-48 · OT-50 · UY-18 ·
UY-20 · UY-41 · UY-53 · UY-54 · UY-55. Hepsinde repo içinde
yapılabilecek her şey bitti; `NOT_STARTED` madde KALMADI.

Adaptör başına ihtiyaç listesinin YAPISAL hâli üründedir:
`/saglik` › Kurulum hazırlığı › Bağlantı ihtiyacı. Aşağıdaki tablo onun
özetidir.

| Madde | Gereken |
| --- | --- |
| OT-40 · OT-50 | Kurum CMDB/EDR/SIEM/OT keşif ürünlerinin adı, API sürümü, kimlik yöntemi |
| OT-48 · UY-54 | PostgreSQL, Redis/kuyruk, nesne deposu, Vault/KMS uç noktaları |
| UY-13 | (repo içi hazırlık bitti) Üretimde `KANIT_DEPO_KOKU` ya da S3 uyumlu nesne deposu uç noktası |
| UY-18 | İmzalama anahtarının tanımlayıcısı, anahtar politikası (kim imzalayabilir), imza algoritması, doğrulama zinciri. **Anahtarın kendisi ürüne verilmez** |
| UY-20 | Kurumun DYS ürünü ve **salt okunur** API'si: taban URL, kimlik yöntemi, okunacak kütüphane kapsamı, sürüm alanının adı |
| UY-41 | Takip edilecek resmî kaynakların adresleri ve erişim biçimi: yayım sayfası ya da besleme (RSS/Atom/API) adresi, kimlik yöntemi, değişikliğin nasıl anlaşılacağı. **Adresler ÜRÜNLE GELMEZ**; kurumun uyum kapsamına göre kurum belirler |
| UY-53 | IdP (Entra/ADFS) tenant, keşif/metadata adresi, istemci kimliği ve sırrı, dönüş adresi, claim eşlemesi (hangi claim kullanıcıyı, hangisi rolü taşıyor), MFA'yı bildiren claim'in adı, ayrılan personelin kapatılmasının ürüne ne zaman yansıyacağı |
| UY-56 | (repo içi hazırlık bitti) Kurumun saklama süreleri ve **dayanakları**: hangi kayıt ailesi kaç yıl, hangi mevzuata göre. Süreler ürünle GELMEZ ve varsayılan bir süre uydurulmaz |
| UY-57 | (repo içi hazırlık bitti) Dış denetçilerin hesapları — bugün ürünün kendi kullanıcı kütüğünden açılır; UY-53 bağlandığında IdP'den gelir |
| OT-49 · UY-55 | Hedef eşikler: eşzamanlı kullanıcı, kabul edilebilir gecikme |
