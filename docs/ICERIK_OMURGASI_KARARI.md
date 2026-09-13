# İçerik omurgası kararı — SCF meta-çerçeve mi, kendi çekirdek set mi?

**Rol:** ANALİST · **Tarih:** 8 Eylül 2026 · **Kod değişmedi.** Ölçüm
ortamı: oturumun ağ vekili (bazı resmî siteler 503 veriyor; hangileri
§7'de), depo `origin/main` @ `4c80c06`. Bu belge **hukuki görüş
değildir**; lisans metinleri alıntılanır, yorum yapılan yer ayrı başlık
altında ve "okuma" diye işaretlidir.

---

## 0 · Karar özeti

**Omurga TR mevzuatının kendisidir; SCF omurga değil, isteğe bağlı bir
eşleme hedefidir; UCF dışarıdadır.** Her TR sektör paketi kendi
düzenlemesinin madde ağacını `Madde` olarak taşır (resmî metin; FSEK
md. 31 — §5), çerçeveler arası denklik `MaddeEslestirmesi` ile
mevzuat↔mevzuat ve mevzuat↔ISO (kimlik+başlık, K3) kurulur. SCF,
İngilizce ve **değiştirilmeden**, `INT-SCF` adlı ayrı bir paket olarak
kurulabilir; Türkçeye çevrilmez, türetilmiş içerik üretilmez, SCF
dosyası depoya ve pakete girmez (R6'nın bugünkü tarifi zaten böyle).

Ölçülen üç gerekçe: (1) SCF'nin 200+ eşlemesinde **Türkiye yoktur** —
EPDK/BDDK/SPK/BTK/KVKK için tek satır yok (§2); (2) SCF lisansı
**BY-ND**: paylaşılabilir ama değiştirilip/çevrilip paylaşılamaz;
Türkçe metin isteyen ürün için yıllık 25 000 USD'lik ticari lisans
kapısı var (§1); (3) v1 konumlandırması "GRC platformu" değil
"mevzuatın adıyla"dır — müşterinin denetçisi SCF kontrolü değil EPDK
Ek-3 satırı sorar (`docs/TR_SEKTOR_PAKETLERI.md`).

| Soru | Cevap | Ölçü |
| --- | --- | --- |
| SCF omurga olsun mu? | **Hayır** | TR eşlemesi 0 · ND lisansı · konumlandırma |
| Kendi çekirdek kontrol seti yazılsın mı? | **Hayır (v1)** | Bugün 0 satır; madde metni yazmak içerik işidir ve denetçiye değer katmaz |
| SCF hiç kullanılmasın mı? | **Kullanılabilir — eşleme hedefi olarak, orijinal dilde** | R6 tarifi; `Madde.disKontrolId` hazır; dört alan eksik (§4) |
| UCF? | **Dışarıda** | Tescilli, fiyat kapalı, TR kapsamı doğrulanamadı (§3) |

---

## 1 · SCF — lisans, dağıtım, format (birincil kaynaktan)

Kaynaklar: securecontrolsframework.com (ana sayfa, `/free-content/scf-download`,
`/faqs`, `/commercial-license`, LRF listesi), creativecommons.org legalcode,
GitHub `SCF-Download`. Tamamı 8 Eylül 2026'da çekildi; alıntılar sayfadan
döndüğü gibidir (İngilizce), çevrilmedi.

### 1.1 Lisans metni — alıntı

- İndirme sayfası: SCF *"released at no cost under Creative Commons
  Attribution-NoDerivatives 4.0 International"* (CC BY-ND 4.0); sayfada
  "Standard" / "Commercial" ayrımı **görünmüyor**.
- SSS: *"The SCF is copyrighted material that uses the Creative Commons
  licensing model to keep it free for businesses to use."* ve *"There are
  options for commercial licenses for companies that want to create
  derivative content based on the SCF."*
- CC BY-ND 4.0 legalcode, §2(a)(1) verilen haklar: *"reproduce and Share
  the Licensed Material, in whole or in part; and produce and reproduce,
  but not Share, Adapted Material."*
- Legalcode, "Adapted Material" tanımı: *"Material subject to Copyright
  and Similar Rights that is derived from or based upon the Licensed
  Material and in which the Licensed Material is **translated**, altered,
  arranged, transformed, or otherwise modified in a manner requiring
  permission under the Copyright and Similar Rights held by the
  Licensor."* (vurgu bu belgenin)
- Legalcode, §3(a) atıf: yaratıcı kimliği, telif bildirimi, lisans
  atfı, garanti reddi ve esere bağlantı korunur; değişiklik yapıldıysa
  belirtilir.
- Legalcode, §4 veritabanı hakları: *"You have the right to extract,
  reuse, reproduce, and Share all or a substantial portion of the
  contents of the database, provided You do not Share Adapted
  Material."*
- Legalcode'da **ticari kullanıma dair açık bir cümle bulunamadı**
  (ölçüm: çekilen metinde ne izin ne yasak geçiyor; deed sayfası bu
  oturumda çekilmedi). ND lisansında NC (gayri ticari) şartı yoktur —
  bu bir okumadır, §1.3'te.
- Ticari lisans sayfası: kim ister — *"GRC, or similar technology,
  platforms"* that want to create derivative content. Standart lisans
  *"prohibits the distribution of modified SCF content"*; buna
  *"utilizing Artificial Intelligence (AI) (or similar technologies) to
  leverage SCF content to generate policies, standards, procedures"* de
  dâhil. GRC platformları ticari lisans olmadan SCF içeriğini
  *"rearrange existing SCF content"* edebilir — *"as no new material is
  generated"*. **Tier 1:** *"$25,000 (USD)"* / yıl (ilk yıl %50
  başlangıç indirimi olabilir) — *"Produce, reproduce and share Adapted
  Material"*: uygulama rehberi, anket biçimlendirme, risk hesaplayıcı,
  olgunluk ölçütü ve çözüm rehberi değişiklikleri. **Tier 2:**
  *"$200,000 (USD) + 20% of net sales"* — Tier 1 + politika, kontrol
  hedefi, standart, kılavuz, prosedür, metrik üretimi.

### 1.2 Dağıtım biçimi ve makine okunur format — ölçüm

| Ne | Ölçülen | Kaynak |
| --- | --- | --- |
| Formatlar | Excel/XLSX ("Recommended"), NIST OSCAL JSON ("NIST Standard"); CSV metinde anılıyor, ayrı indirme olarak listelenmiyor | indirme sayfası, ana sayfa |
| Güncel sürüm | **2026.2** (ana sayfa); indirme sayfasında sürüm/tarih yok | ana sayfa |
| Güncelleme sıklığı | *"one (1) update per quarter"* | SSS |
| GitHub | `github.com/SCF-Download` → depo "securecontrolsframework", açıklama "SCF 2025.1", güncelleme 30 Mar 2025; depo sayfası **"This repository is empty"** — LICENSE/README/dosya yok | GitHub |
| Kontrol sayısı | Ana sayfa "1,000+ Controls"; topluluk projesi `hackIDLE/scf-api` **1 468 kontrol · 33 aile · 249 crosswalk** der — **ikincil, doğrulanmadı** (resmî dosya indirilmedi) | arama sonucu |
| Eşlenen çerçeve | *"200+ Laws & Frameworks Mapped"* · *"5 Geographic regions covered"* | ana sayfa, SSS |
| STRM dosyasının sütunları | **ölçülmedi** — dosya bu oturumda indirilmedi; R6 tarifi NIST IR 8477 ilişki türleri + güç der | — |

### 1.3 Bu belgenin okuması (hukuki görüş değildir)

- Değiştirilmemiş SCF metnini, atıfla, bir üründe **göstermek** §2(a)(1)
  "Share … in whole or in part" kapsamındadır; ticari lisans sayfası da
  "rearrange … no new material" yolunu açık bırakır.
- **Türkçe çeviri "Adapted Material"dir** (tanımda "translated" geçer) ve
  standart lisansla paylaşılamaz. Türkçe birinci dilli bir ürün için bu,
  ya İngilizce SCF ya da Tier 1 (25 000 USD/yıl) demektir.
- Bizim yazacağımız **eşleme tablosu** (EPDK maddesi ↔ SCF kimliği)
  SCF metnini değiştirmez; ama "türetilmiş içerik" sınırına yakın durur
  ve sayfa bunu adıyla saymaz. **Ticari kullanım öncesi hukuki görüş
  ister** — bu belge karar vermez, kalemi açık bırakır.
- Resmî GitHub deposunun boş görünmesi, "canonical source GitHub"
  iddiasıyla çelişir; dağıtım kanalı bugün için sitedir.

---

## 2 · SCF eşlemeleri — ülke mevzuatı ve Türkiye

LRF sayfası (`/start-here/included-laws-regulations-frameworks-lrf`),
8 Eylül 2026:

| Bölge | Sayfada görünen | Not |
| --- | --- | --- |
| General | 20+ (CIS, COBIT, COSO, CSA, IEC, NIST…) | çerçeveler |
| USA | 30+ | federal + eyalet |
| EMEA | 25+ | ulusal yasalar: Austria, Belgium, Germany, Greece, Hungary, Ireland, Israel, Italy, Kenya, Nigeria, Norway, Poland |
| APAC | 20+ | |
| Americas | 10+ | |
| **Türkiye / KVKK / BDDK / EPDK / SPK / BTK / "TR"** | **yok** | sayfada tek eşleşme bulunamadı |

Var olanlar (TR paketleriyle kesişen): ISO/IEC 27001, IEC 62443 (birden
çok sürüm), NIS2, DORA, PCI DSS, COBIT 2019.

Sonuç: TR mevzuatı SCF'ye **hiç eşlenmemiş**. TR paketleri için "SCF'den
hazır eşleme almak" diye bir şey yok; her eşleme bizim işimizdir ve
hacmi EPDK eklerinin ölçüsündedir (`docs/TR_SEKTOR_PAKETLERI.md` §4:
yedi ekte binlerce kontrol satırı).

---

## 3 · UCF (Unified Compliance Framework) — karşılaştırma

| Soru | Ölçülen | Kaynak |
| --- | --- | --- |
| Lisans | Sayfada lisans türü yazmıyor; altbilgi *"© 2026 Network Frontiers, LLC d/b/a Unified Compliance. All rights reserved"* — **tescilli** | unifiedcompliance.com |
| Fiyat | **Açık değil** — *"Request a Demo"* / *"Talk to Sales"*; SimpleRisk'in "UCF Extra" sayfasında da fiyat yok | ana sayfa, simplerisk.com |
| Makine okunur erişim | **ControlSight API** (*"Embed UC's Control Fabric directly into your GRC platform via the ControlSight API"*); teknik belge sayfada yok | ana sayfa |
| İddia edilen kapsam | 4 100+ "Regulatory Frameworks" · 15 000+ "Intelligent Controls" · 500 000+ "Requirements Mapped" · 19 patent | ana sayfa (doğrulanmadı) |
| Gömen GRC ürünleri | Archer, ServiceNow, LogicGate, MetricStream, Onspring, Workiva, Apptega, TruOps, RegScale, Riskonnect | `/partners/` |
| Türkiye kapsamı | Sayfalarda **yok**; arama TR "Authority Document" bulamadı — **doğrulanamadı** | arama |
| `/partner/` · `wptest.…/partners/developers/` | 404 · DNS yok | — |

Okuma: UCF, kapalı fiyatlı ve tescilli bir içerik aboneliğidir; ürünümüze
gömülmesi hem lisans hem de maliyet bilinmezliği taşır, TR kapsamı
gösterilemedi. R6 zaten "Kapsam dışı: UCF (ticari)" der; bu belge onu
ölçümle teyit eder.

---

## 4 · `MaddeEslestirmesi` SCF'ye oturuyor mu — R6 tarifi koda karşı

Şema (`web/prisma/schema.prisma` @ `4c80c06`):

```
MaddeEslestirmesi { id · kaynakId · hedefId · denklik (tam | kismi | ilgili) · aciklama?
                    @@unique([kaynakId, hedefId]) · Cascade }
Madde             { regulasyonId · ustMaddeId? · kod · baslik · metin (NOT NULL) · surumId? ·
                    disKontrolId? · alanAdi? · altAlan? · zorunlulukTipi · kanitBeklentisi? … }
Regulasyon        { kod @unique · ad · surum? · kaynakUrl? }   FrameworkSurumu { surumEtiketi · durum }
```

Bugünkü içerik: **38 madde** (EPDK-SYM 27 · CBDDÖ 4 · ISO 4 · SPK 3),
**8** eşleme (tam 1 · kismi 5 · ilgili 2), 25 yaprak madde;
`/eslestirme` yalnız yaprak maddeye izin verir (R6 "Bugün" paragrafıyla
aynı; sayılar `prisma/seed.ts`ten).

| # | SCF öğesi | Modelde karşılığı | Karar | Gerekçe |
| --- | --- | --- | --- | --- |
| 1 | SCF kontrolü (kimlik, alan, metin) | `Regulasyon('INT-SCF')` + `Madde(disKontrolId, alanAdi, altAlan)` | **OTURUYOR** | R6 ESL-SCF-001: OSCAL grup → üst madde, kontrol → yaprak |
| 2 | Kontrol metninin dili | `Madde.metin` NOT NULL, dil alanı yok (P3 ertelendi) | **ZORLAMA** | ND: metin İngilizce ve değiştirilmeden yazılır; ekran TR/EN karışık olur — paket rozetiyle söylenir (`CLAUDE.md` "içerik paketleri kendi dilinde kalır") |
| 3 | STRM ilişki türü (5 tür; R6: `alt_kume · kesisim · esit · ust_kume · iliskisiz`) | `denklik` 3 değer | **ZORLAMA — kayıplı** | `esit→tam`, `alt_kume/ust_kume/kesisim→kismi`, `iliskisiz→satır yok`; R6 `iliskiTuru` göçü çözer |
| 4 | İlişki gücü (1–10) | alan yok | **OTURMUYOR (bugün)** | R6 `guc Int?` — null = belirtilmedi |
| 5 | Eşlemenin dayanağı (SCF STRM dosyası mı, kurum kararı mı) | `aciklama` serbest metin | **ZORLAMA** | R6 `kaynakBelge`; lisans izi de buraya düşer |
| 6 | Onay (dört göz) | alan yok | **OTURMUYOR (bugün)** | R6 `onaylayanId`; "motor önerir, insan karar verir" |
| 7 | Yön | `kaynak → hedef`, `@@unique([kaynakId, hedefId])` | **OTURUYOR** | ters yön ikinci satır ister; STRM tek yönlüdür, uyumlu |
| 8 | Sürüm ve fark (çeyreklik güncelleme) | `FrameworkSurumu` + `SurumFarki`, tek aktif kısıtı | **OTURUYOR** | |
| 9 | Lisans kaydı | `Regulasyon`da lisans alanı yok | **ZORLAMA** | paket manifesti `lisans` (`docs/SEKTOR_PAKETI_SOZLESMESI.md` §2) taşır: `CC-BY-ND-4.0 · turetme: yasak` |
| 10 | Hacim | 8 eşleme elle; SCF ~1 468 kontrol (ikincil) × TR maddeleri | **ZORLAMA** | elle eşleme ölçeği değil; içe aktarım ve öneri (R14) ister |

**Sayım:** 10 öğe → OTURUYOR 3 · ZORLAMA 5 · OTURMUYOR 2. R6'nın teşhisi
doğru: model SCF'yi **R6'nın dört alanı olmadan kayıpla** taşır, dört
alanla (iliskiTuru · guc · kaynakBelge · onaylayanId) taşır. Kod
değişikliği bu belgenin işi değil; R6 göçü sırasında yapılır.

---

## 5 · Karar önerisi — gerekçe ölçümle

### Seçenekler

| Seçenek | Ne demek | Ölçülen bedel | Karar |
| --- | --- | --- | --- |
| **A · SCF omurga** | Her TR maddesi SCF kontrolüne eşlenir; uyum SCF üzerinden toplanır, denetim SCF dilinde konuşur | TR eşlemesi SCF'de **0** → eşlemenin tamamı bizim (EPDK yedi ek, binlerce satır); Türkçe metin için Tier 1 **25 000 USD/yıl** ya da İngilizce omurga; denetçi SCF sormaz | **Hayır** |
| **B · Kendi çekirdek set** | Kendi kontrol kataloğumuzu yazarız, mevzuatlar ona eşlenir | Bugün **0 satır**; madde metni yazmak içerik işidir (kapsam dışı); bakım tamamen bizde; müşteriye görünür değer: denetçi yine mevzuat maddesini sorar | **Hayır (v1)** |
| **C · Mevzuat omurga + SCF isteğe bağlı hedef** | Omurga TR mevzuatının madde ağacı (resmî metin); çapraz denklik mevzuat↔mevzuat ve ↔ISO; SCF `INT-SCF` paketi, İngilizce, değiştirilmemiş, isteyen kiracı kurar | Resmî metin serbest (aşağıda); eşleme işi paket başına ve kademeli; SCF lisans bedeli **0** (türetme yok); UCF **yok** | **Öneri** |

### Resmî metin neden serbest — alıntı

5846 sayılı Fikir ve Sanat Eserleri Kanunu **md. 31** ("Mevzuat ve
içtihatlar"), konsolide metin (Lexpera, sürüm 21, 25.12.2021; mevzuat.gov.tr
503 verdiği için ikincil kaynaktan):

> "Resmen yayımlanan veya ilân olunan kanun, Cumhurbaşkanlığı kararnamesi,
> yönetmelik, tebliğ, genelge ve kazai kararların çoğaltılması, yayılması,
> işlenmesi veya her hangi bir suretle bunlardan faydalanma serbesttir."

Yani EPDK yönetmeliği ve ekleri, BDDK yönetmeliği, SPK tebliği, TCMB
tebliği, BTK yönetmeliği ve 7545 sayılı Kanun metni **pakete girebilir**;
ISO/IEC ve IEC metni giremez (K3: kimlik+başlık). Bu cümle bir okumadır;
"işlenmesi … serbesttir" ifadesinin özel-sektör yeniden dağıtımına
uygulanışı hukukçuya sorulmalıdır — ama risk sınıfı SCF'nin ND
sınırıyla kıyaslanamayacak kadar düşüktür.

### Ne değişir, ne değişmez

- **R6 tarifi:** "SCF beşinci çerçeve olarak içe alınır" → "SCF **isteğe
  bağlı** eşleme hedefi olarak içe alınır (İngilizce, değiştirilmeden;
  STRM ve OSCAL dosyası kurum indirir, depoya/pakete girmez)". Türetilmiş
  durum, `turetilmis_esleme` güven seviyesi, "yüzdeye katılmaz" kuralı
  aynen kalır.
- **Paket manifesti:** `lisans` alanı SCF için `CC-BY-ND-4.0`, `turetme:
  yasak`, `dil: en`; TR mevzuat paketleri için `resmi-metin` (FSEK md.
  31). Sözleşme §2 buna uygundur; yeni alan gerekmez.
- **Kod:** yok. R6 göçünün dört alanı ve OSCAL okuyucu R6 açıldığında.
- **Ticari karar (açık kalem):** SCF'yi Türkçe sunma isteği doğarsa Tier
  1 lisansı; eşleme tablosunun "türetilmiş içerik" sayılıp sayılmadığı —
  ikisi de hukuki görüş ister. Sahibi: ürün sahibi; aşaması: R6
  açılmadan önce.

---

## 6 · Bu belgenin sınırları

- SCF'nin XLSX/OSCAL dosyası ve STRM eşleme dosyası **indirilmedi**;
  sütun yapısı, kontrol sayısı (1 468) ve eşleme biçimi birincil dosyadan
  **doğrulanmadı**. R6 açılırken ilk iş budur.
- UCF'nin fiyatı ve TR kapsamı "bulunamadı"dır, "yoktur" değil.
- Lisans okumaları hukuki görüş değildir.

---

## 7 · Kaynaklar ve erişim durumu (8 Eylül 2026)

| Kaynak | Durum |
| --- | --- |
| [securecontrolsframework.com](https://securecontrolsframework.com/) — ana sayfa | birincil, erişildi (sürüm 2026.2, formatlar, 200+) |
| [SCF indirme](https://securecontrolsframework.com/free-content/scf-download) | birincil, erişildi (CC BY-ND 4.0 ifadesi, formatlar) |
| [SCF SSS](https://securecontrolsframework.com/faqs) | birincil, erişildi (çeyreklik güncelleme, ticari lisans yönlendirmesi) |
| [SCF ticari lisans](https://securecontrolsframework.com/commercial-license) | birincil, erişildi (Tier 1/2 bedelleri, "rearrange" istisnası) |
| [SCF LRF listesi](https://securecontrolsframework.com/start-here/included-laws-regulations-frameworks-lrf) | birincil, erişildi (Türkiye yok) |
| [CC BY-ND 4.0 legalcode](https://creativecommons.org/licenses/by-nd/4.0/legalcode) | birincil, erişildi (§2(a)(1), Adapted Material, §3(a), §4) |
| [github.com/SCF-Download](https://github.com/SCF-Download/) · [securecontrolsframework deposu](https://github.com/SCF-Download/securecontrolsframework) | erişildi — depo **boş** görünüyor ("SCF 2025.1", 30 Mar 2025) |
| [hackIDLE/scf-api](https://github.com/hackidle/scf-api) (arama özeti) | ikincil — 1 468 kontrol · 33 aile · 249 crosswalk; doğrulanmadı |
| [unifiedcompliance.com](https://www.unifiedcompliance.com/) · [/partners/](https://www.unifiedcompliance.com/partners/) | birincil, erişildi (tescilli, fiyat kapalı, 10 ortak) |
| unifiedcompliance.com/partner/ · wptest.unifiedcompliance.com | **erişilemedi** — 404 · DNS yok |
| [SimpleRisk UCF Extra](https://www.simplerisk.com/extras/unified-compliance-framework) | erişildi — fiyat yok |
| [Lexpera — 5846 FSEK konsolide](https://www.lexpera.com.tr/mevzuat/kanunlar/fikir-ve-sanat-eserleri-kanunu-5846) | ikincil (hukuk veritabanı), erişildi — md. 31 alıntısı |
| mevzuat.gov.tr (FSEK ve BDDK yönetmeliği) | **erişilemedi** — HTTP 503 (bu oturumda yeniden denendi) |
| `web/prisma/schema.prisma` · `prisma/seed.ts` · `docs/GELISTIRME_PAKETLERI.md` §R6 · `docs/SEKTOR_PAKETI_SOZLESMESI.md` | birincil ölçüm (kod) |
