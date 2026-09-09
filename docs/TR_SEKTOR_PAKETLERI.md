# Türkiye sektör paketleri — v1 kapsamı (TR + çok sektör)

**Rol:** ANALİST · **Tarih:** 8 Eylül 2026 · **Kod değişmedi.**
**Ürün kararı (8 Eylül 2026):** v1 kapsamı **Türkiye + çok sektör**. Ülke
boyutu paket formatında kalır (`manifest.ulke`), ama v1'de yalnız TR
paketleri yazılır. Konumlandırma "GRC platformu" değil, **mevzuatın
adıyla**dır (`docs/URUN_VIZYONU.md` §5).

**Kaynak kuralı.** Her satır kamuya açık **birincil** kaynağa (mevzuat.gov.tr,
Resmî Gazete, düzenleyicinin kendi sitesi) dayanır; erişilemeyen kaynak
"erişilemedi" diye yazılır, bellekten yazılmaz. Bu oturumda mevzuat.gov.tr
ve resmigazete.gov.tr **her denemede HTTP 503** verdi (iki oturum, sekiz
URL); bu yüzden bazı satırlar düzenleyicinin sitesinden indirilen
PDF/XLSX'e (birincil) ya da Lexpera konsolide metnine (**ikincil** —
hukuk veritabanı) dayanır ve sınıfı yazılıdır. **Telifli standart metni
(ISO/IEC, IEC) depoya girmez** (K3); resmî mevzuat metni serbesttir
(5846 s. FSEK md. 31 — `docs/ICERIK_OMURGASI_KARARI.md` §5).

---

## 1 · Yol haritasında ne değişti (özet)

`docs/GELISTIRME_PAKETLERI.md` §2 ve §7 yeniden sıralandı:

- **KALAN (v1):** B1/B2 (PR açık) → P4 (tek ülke, çok sektör) → TR
  paketleri (bu belge) → R1 (TR kaynakları).
- **ERTELENEN (v1 dışı), tek satır gerekçeyle:** P3 (çoklu dil) · EU/US
  içerik paketleri · P2'nin SaaS tarafı.

---

## 2 · TR sektör paketi listesi — ölçüm

Sütunlar: paket kodu · sektör (kimler) · düzenleyici · başlıca düzenleme
(Resmî Gazete tarih/sayı) · madde sayısı (**ölçülen**; ölçülemeyen
"ölçülmedi") · kaynak sınıfı.

| Paket | Sektör | Düzenleyici | Başlıca düzenleme | Madde (ölçülen) | Kaynak sınıfı · erişim |
| --- | --- | --- | --- | --- | --- |
| **TR-ENERJI** | Elektrik üretim · iletim · dağıtım, doğal gaz iletim · dağıtım · depolama, rafineri, ham petrol iletim lisans sahipleri (EKS işletenler) | EPDK | **Enerji Sektöründe Siber Güvenlik Yetkinlik Modeli Yönetmeliği** — RG 06.06.2023/32213; değişiklik 28.01.2024/32443 ve 08.09.2024/32656; son hâli RG 25.11.2025/33088. Ekler: Ek-1 Elektrik Dağıtım · Ek-2 Doğal Gaz Dağıtım · Ek-3 Elektrik Üretim · Ek-4 Rafineri · Ek-5 Doğal Gaz Depolama · Ek-6 Doğal Gaz ve Ham Petrol İletim · Ek-7 Elektrik İletim; referans topolojiler Ek-1a, Ek-2a, Ek-3a (HES · RES · GES · Termik DCS) | Yönetmelik **18 madde + 1 geçici** (PDF'te 18 ayrı "MADDE n"); ekler **3 780 kontrol satırı** (7 ek; ek başına 476–591; §4) | **BİRİNCİL** — epdk.gov.tr'den yönetmelik PDF'i ve 7 ek XLSX indirildi ve ayrıştırıldı; RG sayfası 503. Madde 5/c TS ISO/IEC 27001, 5/ç TS EN ISO/IEC 27019 atfı (Lexpera özeti) |
| **TR-BANKACILIK** | Bankalar (5411 s. Kanun md. 93 dayanak) | BDDK | **Bankaların Bilgi Sistemleri ve Elektronik Bankacılık Hizmetleri Hakkında Yönetmelik** — RG 15.03.2020/31069; yürürlük 01.07.2020 (bazı maddeler 01.01.2021) | **47 madde**, 4 kısım; II. kısım ("BS'ye ilişkin risk yönetimi ve kontrollerin tesisi") 7 bölüm: BS yönetişimi · BS risklerinin yönetilmesi · bilgi güvenliği yönetimi · sistem geliştirme ve değişiklik · süreklilik ve erişilebilirlik · dış hizmet alımı · iç kontrol ve iç denetim; III. kısım elektronik bankacılık | **İKİNCİL** — Lexpera konsolide metin (madde sayısı, kısımlar, madde numaraları); bölüm adları TBB/hukuk bürosu notları. **Birincil erişilemedi:** mevzuat.gov.tr (No 34211 · 34360 · GeneratePdf) 503 · RG 20200315-11 503 · bddk.org.tr DokumanGetir/1171 503 · tbb.org.tr PDF bağı gezinme sayfası döndü |
| **TR-ODEME** | Ödeme kuruluşları, elektronik para kuruluşları, ödeme hizmeti sağlayıcıları (veri paylaşım servisleri) | TCMB | **Ödeme ve Elektronik Para Kuruluşlarının Bilgi Sistemleri ile Ödeme Hizmeti Sağlayıcılarının Ödeme Hizmetleri Alanındaki Veri Paylaşım Servislerine İlişkin Tebliğ** — RG 01.12.2021/31676 | **34 madde**, 5 bölüm (PDF ölçümü) | **BİRİNCİL** — tcmb.gov.tr PDF indirildi; RG 503 |
| **TR-SERMAYE** | Borsa İstanbul, borsalar ve piyasa işleticileri, aracı kurumlar (sermaye piyasası kurumları), portföy saklayıcıları, Takasbank, MKK, emeklilik yatırım fonları, halka açık ortaklıklar, TSPB, TDUB, kripto varlık hizmet sağlayıcıları (Lexpera md. 2 listesi) | SPK | **Bilgi Sistemleri Yönetimine İlişkin Usul ve Esaslar Tebliği (VII-128.10)** — RG 13.03.2025/32840; yürürlük 30.06.2025; VII-128.9 (RG 05.01.2018/30292) yürürlükten kalktı | **34 madde + 1 geçici + Ek** | **İKİNCİL** — Lexpera konsolide; RG erişilmedi. **Not:** depodaki `SPK-BS` (3 madde) hangi tebliğe ait, ölçülmedi — sürüm kontrolü ister |
| **TR-HABERLESME** | Elektronik haberleşme işletmecileri; ilave tedbir yükümlüleri Kurul Kararı 2014/DK-BTD/438 ile (10 milyon TL yıllık net satış eşiği) | BTK | **Elektronik Haberleşme Sektöründe Şebeke ve Bilgi Güvenliği Yönetmeliği** — RG 13.07.2014/29059 | **43 madde**, 5 bölüm (PDF ölçümü) | **BİRİNCİL** — btk.gov.tr mevzuat sayfası + yönetmelik PDF'i indirildi |
| **TR-SIGORTA** | Sigorta, reasürans ve emeklilik şirketleri | SEDDK | **Sigortacılık ve Özel Emeklilik Sektörlerinde İç Sistemlere Dair Yönetmelik** — RG 25.11.2021/31670; değişiklik 14.02.2025. Bilgi sistemlerine özgü ayrı yönetmelik **bulunamadı** (SEDDK listesindeki ~60 yönetmelikte "Bilgi Sistemleri / Siber" başlıklı yok) | ölçülmedi | **BİRİNCİL** (seddk.gov.tr liste ve duyuru) — BS hükmü taşıyıp taşımadığı ölçülmedi; paket adayı **zayıf** |
| **TR-SAGLIK** | Hastaneler, sağlık bilgi sistemleri (kamu + özel) | Sağlık Bakanlığı (SBSGM) | **Bilgi Güvenliği Politikaları Yönergesi** ve **Kılavuzu** (v2.0 03.09.2018 · v2.1 16.07.2019) — yönerge/kılavuz, yönetmelik değil | ölçülmedi | **İKİNCİL** — arama özeti; saglik.gov.tr sayfaları bu oturumda çekilmedi |
| **TR-KAMU-KRITIK** (yatay) | Kamu kurum ve kuruluşları + kritik altyapı hizmeti veren işletmeler; 7545 kapsamı "siber uzayda … kamu kurum ve kuruluşları, … gerçek ve tüzel kişiler" | Siber Güvenlik Başkanlığı (7545) · CBDDÖ (BİG Rehberi) | **7545 sayılı Siber Güvenlik Kanunu** — RG 19.03.2025/32846, yayımı tarihinde yürürlük (md. 20). **2019/12 sayılı Cumhurbaşkanlığı Genelgesi** — RG 06.07.2019/30823 → **Bilgi ve İletişim Güvenliği Rehberi** (cbddo.gov.tr) | 7545: **21 madde + 1 geçici**; md. 7 sorumluluklar (veri/bilgi sağlama, tedbir, zafiyet ve olay bildirimi, yetkili ürün/hizmet, onay, Başkanlık düzenlemelerine uyum); md. 9(4)(ç) kritik altyapı sektörlerini Siber Güvenlik Kurulu belirler; md. 16(10) idari para cezası "bir milyon Türk lirasından on milyon Türk lirasına kadar" ve "on milyon Türk lirasından yüz milyon Türk lirasına kadar". Rehber: ölçülmedi | 7545 **İKİNCİL** (Lexpera orijinal metin; RG 20250319-1 erişilmedi). Genelge **İKİNCİL** (arama özeti; RG 503; cbddo.gov.tr çekilmedi) |
| **TR-KVKK** (yatay) | Kişisel veri işleyen gerçek ve tüzel kişiler (md. 2/1 alıntısı §7) | KVKK Kurumu | **6698 sayılı Kişisel Verilerin Korunması Kanunu** — RG 07.04.2016/29677; son değişiklik 7499 s. Kanun (12.03.2024), yürürlük 01.06.2024 | **33 madde + 3 geçici**; md. 12/1 veri güvenliği yükümlülükleri, md. 12/5 ihlal bildirimi "en kısa sürede" | **İKİNCİL** — Lexpera konsolide; kvkk.gov.tr sayfası kanun metnini vermedi |
| **TR-SU** | Su ve atıksu idareleri (belediye) — demo ikinci sektörü (K21) | **Sektörel düzenleyici bulunamadı** | Sektöre özgü bilgi sistemi/siber düzenlemesi **bulunamadı** (arama). Çatı: 7545 (kritik altyapı sektörünü Kurul belirler — md. 9(4)(ç)); "su ve atık yönetimi"nin kritik altyapı sayıldığı yalnız **ikincil** kaynakta (tedarikçi blogu) geçiyor; Ulusal Siber Güvenlik Stratejisi 2024-2028 PDF'i **404** | — | İçerik yatay paketlerden gelir (TR-KAMU-KRITIK + TR-KVKK) + ISO/IEC 27001 kimlik+başlık; sektörel çerçeve **yok** |

**Araştırılmayan adaylar** (bu oturumda ölçülmedi, listeye alınmadı):
ulaştırma (UAB), savunma sanayii, kamu e-hizmetleri.

---

## 3 · Kapsam taslakları — Faz A sözleşmesine birebir

Kalemler `docs/SEKTOR_PAKETI_SOZLESMESI.md` §1 tablosunun dokuz satırıdır.
"Bugün" sütunu koddan ölçülmüştür (`origin/main` @ `4c80c06` + Faz B PR'ı).

### 3.1 TR-ENERJI

| # | Kalem | Paket içeriği (taslak) | Bugün | Kaynak |
| --- | --- | --- | --- | --- |
| 1 | Sözlük | `ENERJI_SOZLUGU` (P1: tesis → "santral", birim → "üretim ünitesi", kapasite → "kurulu güç") + 8 öznitelik etiketi (B2) | **VAR** (`prisma/sozlukler.ts`) | kod |
| 2 | Kapsam öğesi türleri | çekirdek `tesis` + `kurum` (lisans sahibi tüzel kişi); paket ekler: **`kontrol_sistemi`** (EKS — yönetmeliğin öznesi; Ek-3a topolojileri HES/RES/GES/Termik DCS tesisin altında) | `tesis` · `kurum` VAR (B1); `kontrol_sistemi` **YOK** — P4 tür yükleme | EPDK md. 1 amaç: "endüstriyel kontrol sistemlerinin siber güvenliği" (Lexpera) |
| 3 | Öznitelik şeması | Mevcut 9: `kuruluGuc` (rol kapasite), `lisansTipi`, `lisansNo`, `kabulDurumu`, `kabulTarihi`, `blackStart`, `teiasScadaEms`, `seriHaberlesme`, `kritiklikSinifi` (rol kritiklik). **Eklenecek:** `epdkEki` (metin, seçenek: Ek-1…Ek-7 — hangi kontrol seti uygulanır), `uretimTipi` (HES · RES · GES · Termik — Ek-3a topolojisi), `yetkinlikHedefSeviyesi` (sayı 1–3; md. "Yetkinlik seviyeleri"), `sektorelKritiklikDerecesi` (md. "Sektörel kritiklik derecesi belirleme") | 9 satır **VAR** (B2); 4 satır **YOK** | yönetmelik PDF madde başlıkları (§7) |
| 4 | Çerçeveler | (a) `EPDK-SGYM` yönetmelik madde ağacı — 18 madde, `zorunlulukTipi: REGULATION`; (b) `EPDK-SGYM-EK1…EK7` kontrol setleri — aile → üst madde (12–13 aile: endüstriyel ağ güvenliği, istemci/sunucu, tehdit ve zafiyet, endüstriyel risk, varlık ve konfigürasyon, kimlik ve erişim, olay yönetimi ve süreklilik, akıllı cihaz, endüstriyel operasyon, İK, fiziksel, tedarikçi, PLC), kontrol satırı → yaprak, seviye → `olgunlukSeviyesi`; (c) ISO/IEC 27001 · 27019 kimlik+başlık (K3); (d) yatay bağımlılık: TR-KAMU-KRITIK, TR-KVKK | Depoda `EPDK-SYM` **27 madde** (örnek, gerçek ağaç değil); ek kontrol seti **YOK**; ISO-27001 4 madde | XLSX sayfa adları (ölçüm) |
| 5 | Yükümlülükler ve süreler | Olay/zafiyet bildirimi: 7545 md. 7 (süre sayısal değil); EPDK yönetmeliğinde bildirim süresi **ölçülmedi** (Lexpera özeti "not found"); KVKK 12/5 "en kısa sürede". `sureSaat` **null = belirtilmedi** | `BildirimYukumlulugu` VAR; TR satırları ölçülmedi | Lexpera |
| 6 | Denetim formu şablonları | Ek XLSX'lerin kendisi form yapısındadır (kontrol × seviye × durum); şablon = Ek dosyası + hücre eşlemesi; R12 "EPDK öz denetim" bunun çıktısıdır | **YOK** (`DenetimFormuSablonu` modeli yok — sözleşme §1.6) | — |
| 7 | Rapor şablonları | Yetkinlik karnesi (aile × seviye 1/2/3); denetim raporu künyesi — md. "Uyumluluk ve denetim", "Denetim yapma yetkisinin verilmesi", "…firma ve personelinde aranacak nitelikler" (yetkili denetim firması) | **YOK** (`RaporSablonu` yok); karne ekranı koddur | yönetmelik PDF başlıkları |
| 8 | Rol önerileri | Paket rol önermez (ölçülmedi); çekirdek 4 rol | `ROLLER` koda gömülü (sözleşme §1.8) | — |
| 9 | Demo verisi | Kurgusal Demo Enerji: 25 tesis → 25 kapsam öğesi (kurum 2 · tesis 23), K3 sayımı | **VAR** (seed) | `arac/goc-sayimlari/` |

### 3.2 TR-BANKACILIK

| # | Kalem | Paket içeriği (taslak) | Bugün | Kaynak |
| --- | --- | --- | --- | --- |
| 1 | Sözlük | `tesis` anahtarı bankada "lokasyon" değil; uyum öznesi kurum/sistem — anahtarlar: `kurum` → "banka", `sistem` → "bilgi sistemi", `dis_hizmet` → "dış hizmet sağlayıcı"; kapasite sözcüğü yok (aktif büyüklüğü öznitelik) | `SektorSozlugu` VAR; bankacılık satırı **YOK** | — |
| 2 | Kapsam öğesi türleri | `kurum` (banka — yönetmeliğin öznesi), **`sistem`** (birincil/ikincil sistemler — md. 25), **`dis_hizmet`** (dış hizmet alımı — md. 29), **`is_fonksiyonu`** (süreklilik — md. 28), `komite` (BS strateji/yönlendirme komiteleri — **ikincil** kaynak) | `kurum` VAR (B1); dört tür **YOK** — P4 | Lexpera madde tablosu; komiteler TBB/hukuk notları |
| 3 | Öznitelik şeması | Kurum: `aktifBuyuklugu` (sayı, birim), `calisanSayisi` (sayı); sistem: `sistemSinifi` (birincil · ikincil — md. 25), `yurtIcindeMi` (mantık — md. 25 "birincil ve ikincil sistemlerin yurt içinde bulundurulması"), `kritiklik` (rol kritiklik); dış hizmet: `kritikHizmetMi` (mantık), `altYukleniciVar` (mantık) | Kurum öznitelikleri bugün `TesisOzellik.tesisId`'ye asılı — sözleşme §1.3 "kapsam öğesine (P4)" | Lexpera |
| 4 | Çerçeveler | (a) `BDDK-BS` yönetmelik madde ağacı — 47 madde, 4 kısım, II. kısım 7 bölüm, `REGULATION`; (b) yatay: TR-KAMU-KRITIK (7545), TR-KVKK; (c) ISO/IEC 27001 kimlik+başlık; (d) **koşullu:** TCMB tebliği (veri paylaşım servisi sağlayan bankalar — kapsam maddesi **ölçülmedi**), SPK VII-128.10 (yatırım hizmeti veren bankalar — Lexpera md. 2 listesinde "banka" ayrıca **görünmüyor**, ölçülmedi) | `BDDK-BS` **YOK** (depo: EPDK-SYM · CBDDO · ISO-27001 · SPK-BS) | Lexpera |
| 5 | Yükümlülükler ve süreler | Siber olay bildirimi **md. 18** ve sızma testi **md. 18** (Lexpera madde tablosu); süre sayısı **ölçülmedi**; KVKK 12/5 | `BildirimYukumlulugu` VAR; satır yok | Lexpera |
| 6 | Denetim formu şablonları | BS denetimi **md. 30–31**; bağımsız denetim raporu biçimi — ayrı BDDK BS denetim düzenlemesi var mı **ölçülmedi** | **YOK** | Lexpera |
| 7 | Rapor şablonları | BS strateji planı (**md. 4**); yönetim kurulu/komite raporu; süreklilik planı (md. 28) | **YOK** | Lexpera |
| 8 | Rol önerileri | `komite_uyesi` (BS strateji · yönlendirme komiteleri — ikincil); `bs_ic_denetci` (md. 30–31) | `ROLLER` 4 | ikincil |
| 9 | Demo verisi | **YOK** — kurgusal banka demo verisi yazılır (P8); tek "merkez tesisi" tuzağı B1 ile kalktı (`docs/TESIS_DISI_SEKTOR_UYUM_TESTI.md` §3 madde 1) | — | — |

---

## 4 · Efor ölçümü — madde/yükümlülük sayısı, içe aktarım yolu, iş türü

**Ölçüm yöntemi (EPDK ekleri):** her ek XLSX'te aile sayfaları (`01-…`
… `13-…`) sayıldı; sayfa başına değer taşıyan satır − 1 başlık. Kontrol
kimliği sütunu ayrıştırılmadı; alt başlık ve not satırları sayıma
girmiş olabilir — sayı **üst sınırdır**. Önceki oturumda farklı yöntemle
3 694 ölçülmüştü; iki ölçüm de aynı büyüklük sırasındadır.

| Ek | Sektör | Aile sayfası | Kontrol satırı |
| --- | --- | --- | --- |
| Ek-1 | Elektrik Dağıtım | 12 | 488 |
| Ek-2 | Doğal Gaz Dağıtım | 13 | 518 |
| Ek-3 | Elektrik Üretim | 13 | 578 |
| Ek-4 | Rafineri | 13 | 565 |
| Ek-5 | Doğal Gaz Depolama | 13 | 564 |
| Ek-6 | Doğal Gaz ve Ham Petrol İletim | 13 | 591 |
| Ek-7 | Elektrik İletim | 12 | 476 |
| **Toplam** | | | **3 780** |

| Paket | Madde / kontrol (ölçülen) | Metin | İçe aktarım yolu — bugün | İş türü |
| --- | --- | --- | --- | --- |
| TR-ENERJI yönetmelik | 18 (+1 geçici) | resmî metin, serbest | `/ice-aktarim` XLSX → `Madde` (R2: şablon üretici **yok**) | **içerik** |
| TR-ENERJI ekleri | 3 780 satır, 7 ek | resmî metin, serbest | XLSX doğrudan; sütun → alan eşlemesi (`xlsx` vendored 0.20.3, R12); seviye → `olgunlukSeviyesi` | **içerik + küçük kod** (sütun eşleyici) |
| TR-BANKACILIK | 47 | resmî metin — birincil erişim gerekli | XLSX/`/ice-aktarim` | **içerik** (kaynak erişimi ön koşul) |
| TR-ODEME | 34 | resmî metin (PDF elde) | aynı | **içerik** |
| TR-SERMAYE | 34 (+1 geçici + Ek) | resmî metin | aynı | **içerik** |
| TR-HABERLESME | 43 | resmî metin (PDF elde) | aynı | **içerik** |
| TR-KAMU-KRITIK | 7545: 21 (+1 geçici); Rehber: ölçülmedi | resmî metin | aynı | **içerik** |
| TR-KVKK | 33 (+3 geçici) | resmî metin | aynı | **içerik** |
| ISO/IEC 27001 · 27019 | ölçülmedi (kimlik+başlık, K3) | **telifli — girmez** | mevcut ISO-27001 4 madde kalıbı | içerik (kimlik listesi) |
| **Toplam madde** | **230** madde (+ geçiciler) + **3 780** kontrol satırı | | | |

**Kod işi mi, içerik işi mi?** Sayıların tamamı içerik işidir: 230 madde
ve 3 780 kontrol satırı yazılmaz, **resmî metinden aktarılır**. Kod işi
P4'ün sözleşmede "YOK/KISMEN" duran dört kalemidir: paket okuyucu +
manifest doğrulayıcı (`lib/paket/`), `DenetimFormuSablonu` + XLSX hücre
eşlemesi, `RaporSablonu`, rol kataloğu; artı kapsam türlerinin ve
özniteliklerin **paketten** yüklenmesi ve kurum özniteliklerinin kapsam
öğesine asılması (sözleşme §6). OSCAL okuyucu (R6/SCF) v1 için gerekli
**değildir** (`docs/ICERIK_OMURGASI_KARARI.md`). Süre tahmini bu belgede
yazılmaz (§1 kuralı).

---

## 5 · Sıra önerisi

1. **TR-ENERJI** — referans kiracı, birincil kaynak elde (PDF + 7 XLSX),
   sözlük ve öznitelikler zaten kodda.
2. **TR-KAMU-KRITIK + TR-KVKK** — yatay, küçük (21 + 33 madde), her
   paketin bağımlılığı.
3. **TR-ODEME · TR-HABERLESME** — birincil PDF elde; içerik.
4. **TR-BANKACILIK · TR-SERMAYE** — kaynak ikincil; birincil erişim
   (mevzuat.gov.tr) sağlanınca.
5. **TR-SU** — sektörel çerçeve yok; yatay paketlerle demo.
6. **TR-SIGORTA · TR-SAGLIK** — kaynak zayıf; ölçüm tamamlanınca.

---

## 6 · Bu belgenin sınırları

- mevzuat.gov.tr, resmigazete.gov.tr, bddk.org.tr, cbddo.gov.tr, uab.gov.tr
  bu oturumda erişilemedi; ikincil kaynakla yazılan satırlar birincil
  metinle **doğrulanmalıdır** (özellikle BDDK madde numaraları).
- EPDK ek sayımı üst sınırdır (yöntem §4).
- SEDDK ve Sağlık satırları paket adayı olarak zayıftır; içerik
  ölçülmedi.
- Madde metni bu belgeye **kopyalanmadı**; yalnız sayı, yapı ve kısa
  alıntı.

---

## 7 · Kaynaklar ve erişim durumu (8 Eylül 2026)

| Kaynak | Durum |
| --- | --- |
| [EPDK — Yetkinlik Modeli Yönetmeliği sayfası](https://www.epdk.gov.tr/Detay/Icerik/3-33068/enerji-sektorunde-siber-guvenlik-yetkinlik-modeli-) | **birincil, erişildi** — yönetmelik PDF (son hâli RG 25.11.2025/33088) ve Ek-1…Ek-7 XLSX + Ek-1a/2a/3a topolojileri indirildi |
| [Lexpera — EPDK yönetmeliği konsolide](https://www.lexpera.com.tr/mevzuat/yonetmelikler/enerji-sektorunde-siber-guvenlik-yetkinlik-modeli-yonetmeligi-1) | ikincil — 18 madde + geçici, ek listesi, md. 5/c–ç standart atıfları, md. 7–8 seviyeler, md. 10 denetim |
| resmigazete.gov.tr/eskiler/2023/06/20230606-2.htm | **erişilemedi** — 503 |
| Lexpera — Bankaların BS ve EBH Hk. Yönetmelik konsolide ([bağlantı](https://www.lexpera.com.tr/mevzuat/yonetmelikler/bankalarin-bilgi-sistemleri-ve-elektronik-bankacilik-hizmetleri-hakkinda-yonetmelik/1)) | ikincil — 47 madde, 4 kısım, madde tablosu (4 · 11 · 18 · 25 · 28 · 29 · 30–31 · 34) |
| mevzuat.gov.tr (MevzuatNo 34211 · 34360 · GeneratePdf 34360) · resmigazete 20200315-11 · bddk.org.tr DokumanGetir/1171 | **erişilemedi** — 503 (iki oturumda yeniden denendi) |
| [TBB duyuru](https://www.tbb.org.tr/faaliyetler/teknoloji-ve-odeme-sistemleri/ilgili-duzenlemeler/pdf/1300) · Erdem&Erdem · Güner · ProCompliance notları | ikincil — 7 bölüm yapısı, komiteler; TBB PDF bağı belge vermedi |
| [TCMB — Tebliğ PDF](https://www.tcmb.gov.tr/wps/wcm/connect/80b75c08-7e61-4c79-ab5f-6791f2f2973d/Tebli%C4%9F.pdf?MOD=AJPERES) | **birincil, erişildi** — 34 madde, 5 bölüm (metin çıkarılıp sayıldı) |
| resmigazete.gov.tr/eskiler/2021/12/20211201-3.htm | **erişilemedi** — 503 |
| [Lexpera — SPK VII-128.10 konsolide](https://www.lexpera.com.tr/mevzuat/tebligler/bilgi-sistemleri-yonetimine-iliskin-usul-ve-esaslar-tebligi-vii-128-10-1) | ikincil — 34 madde, kapsam listesi, yürürlük 30.06.2025 |
| [BTK — Şebeke ve Bilgi Güvenliği mevzuat sayfası](https://www.btk.gov.tr/sebeke-ve-bilgi-guvenligi-mevzuat) · [yönetmelik PDF](https://www.btk.gov.tr/uploads/pages/elektronik-habeles-me-sekto-ru-nde-s-ebeke-ve-bilgi-gu-venlig-i-yo-netmelig-i-5a341795a1773.pdf) | **birincil, erişildi** — 43 madde, 5 bölüm; Kurul Kararı 2014/DK-BTD/438 |
| [SEDDK — sigortacılık yönetmelikleri](https://www.seddk.gov.tr/tr/mevzuat/sigortacilik/yonetmelikler) · [İç Sistemler duyurusu](https://seddk.gov.tr/tr/sigortacilik-ve-ozel-emeklilik-sektorlerinde-ic-sistemlere-dair-yonetmelik-yayimlandi) | **birincil, erişildi** — BS'ye özgü yönetmelik yok |
| Sağlık Bakanlığı BG Politikaları Yönergesi/Kılavuzu (arama özeti: bursaism.saglik.gov.tr · sbsgm.saglik.gov.tr) | ikincil — sayfalar çekilmedi |
| [Lexpera — 7545 Siber Güvenlik Kanunu](https://www.lexpera.com.tr/resmi-gazete/metin/7545-siber-guvenlik-kanunu-32846) | ikincil — 21 madde + geçici; md. 2, 7, 9(4)(ç), 16(10), 20 |
| resmigazete.gov.tr/eskiler/2025/03/20250319-1.htm | erişilmedi (denenmedi; RG 503 veriyor) |
| 2019/12 sayılı Genelge — RG 06.07.2019/30823 (arama özeti; tbb.gov.tr · alomaliye · cbddo.gov.tr bağlantıları) | ikincil — RG 503; cbddo.gov.tr çekilmedi |
| [Lexpera — 6698 KVKK konsolide](https://www.lexpera.com.tr/mevzuat/kanunlar/kisisel-verilerin-korunmasi-kanunu-6698) · [kvkk.gov.tr](https://www.kvkk.gov.tr/Icerik/6649/6698-Sayili-Kisisel-Verilerin-Korunmasi-Kanunu) | ikincil (madde 2/1 alıntısı, 12/1, 12/5, 33 madde) · birincil sayfa metin vermedi |
| Ulusal Siber Güvenlik Stratejisi ve Eylem Planı 2024-2028 — [uab.gov.tr PDF](https://www.uab.gov.tr/uploads/pages/siber-guvenligin-yol-haritasi-yerli-ve-milli-tekno/ulusal-siber-gu-venlik-stratejisi-ve-eylem-plani-2024-2028.pdf) · [HGM duyurusu](https://hgm.uab.gov.tr/duyurular/ulusal-siber-guvenlik-stratejisi-ve-eylem-plani-2024-2028-yayimlandi) | **erişilemedi** — PDF 404; duyuru sektör listesi vermedi |
| Su/atıksu sektörel düzenleme araması | **bulunamadı** — yalnız tedarikçi blogları (ikincil) |
| [Lexpera — 5846 FSEK md. 31](https://www.lexpera.com.tr/mevzuat/kanunlar/fikir-ve-sanat-eserleri-kanunu-5846) | ikincil — resmî metinlerin serbestliği (alıntı `docs/ICERIK_OMURGASI_KARARI.md` §5) |
| `web/prisma/schema.prisma` · `prisma/seed*.ts` · `prisma/sozlukler.ts` · `prisma/kapsam-ogesi.ts` · `docs/SEKTOR_PAKETI_SOZLESMESI.md` · `docs/TESIS_DISI_SEKTOR_UYUM_TESTI.md` | birincil ölçüm (kod ve belge) |

**KVKK md. 2/1 alıntısı (Lexpera konsolide):** "Bu Kanun hükümleri,
kişisel verileri işlenen gerçek kişiler ile bu verileri tamamen veya
kısmen otomatik olan ya da herhangi bir veri kayıt sisteminin parçası
olmak kaydıyla otomatik olmayan yollarla işleyen gerçek ve tüzel kişiler
hakkında uygulanır."
