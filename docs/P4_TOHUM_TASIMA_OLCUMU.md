# P4 · 4.6 — Mevcut enerji ve su tohumu paket biçimine taşınabiliyor mu?

**Ölçüm:** 9 Eylül 2026 · `web/prisma/dev.db` (tohum `npm run seed`) ·
`web/paketler/TR-ENERJI` · `docs/SEKTOR_PAKETI_SOZLESMESI.md` §1'in dokuz
kalemi. **Taşıma bu turda yapılmadı** — yalnız ölçüldü. Sayılar SQL ile
okundu; test kanıtı `web/tests/paket-iskeletler.test.ts` ("4.6 ölçümü").

## 1 · Tohumun paket kalemlerine karşı durumu

| # | Sözleşme kalemi | Tohumda ne var (ölçülen) | Paket biçimine taşınır mı | Not |
| --- | --- | --- | --- | --- |
| 1 | Sözlük | `SektorSozlugu` **18** satır (enerji 13 · su 5), hepsi `koken=kiraci` | **EVET, kayıpsız** — `TR-ENERJI/sozluk.json` 17 satırın 13'ü tohum sabitleriyle birebir (test kanıtı); su sözlüğü aynı yolla `DEMO-SU` paketine gider | Tohum satırları `kiraci` kökenli olduğu için aynı DB'ye kurulunca 13 çelişki üretir ve **dokunulmaz** — ezmeme kuralı gerçek veriyle ölçüldü |
| 2 | Kapsam öğesi türleri | `KapsamOgesiTuru` **2** (`tesis` · `kurum`, çekirdek, sektörsüz) | Çekirdek türler pakete **girmez** (çekirdeğin malı); paket ekler (`kontrol_sistemi`) | `TesisTipi.varsayilanKapsamTuruId` eşlemesi paket kalemi değil — bkz. §2 boşluk 1 |
| 3 | Öznitelik şeması | `SektorOznitelikSemasi` **10** (enerji 9 · su 1) | **EVET, kayıpsız** — enerji 9 satırı `oznitelikler.json`da birebir (tip · rol · grup · seçenek · sıra · birim; test kanıtı); su `gunlukDebi` aynı biçimde | Paket 3 satır ekler (`epdkEki` · `uretimTipi` · `yetkinlikHedefSeviyesi`) |
| 4 | Çerçeveler | `Regulasyon` **4** — `EPDK-SYM` 27 madde · `CBDDO` 4 · `ISO-27001` 4 · `SPK-BS` 3; her biri 1 aktif `FrameworkSurumu`; `lisansTuru` **null** (beyan edilmedi) | **KISMEN.** Yapı taşınır (kod · üst · başlık · sıra · alan · kanıt tipi CSV sütunlarına oturur). Ama: (a) `EPDK-SYM` kodları (`EPDK-SYM-4.2.2`) gerçek yönetmeliğin değil, DEMO'nun kodlarıdır — `TR-ENERJI`'ye değil `DEMO-TR-ENERJI` paketine aittir; (b) `ISO-27001` maddeleri **47–54 karakterlik metin** taşıyor; §2 telifli kuralı metin girişini reddeder — telifli paket biçiminde bu satırlar metinsiz (kimlik+başlık) olmak zorunda | Tohum `ISO-27001` bugün K3'e ("yalnız kimlik+başlık") uymuyor: metin kısa bir açıklama cümlesi. Paket biçimine geçince düşer |
| 5 | Yükümlülükler | `BildirimYukumlulugu` **0** | Taşınacak satır yok | Biçim hazır (`yukumlulukler.json`); `sureSaat` NOT NULL — süresi ölçülmemiş yükümlülük satır açmaz |
| 6 | Denetim formu şablonları | `Denetim` **5** kayıt; form **koddur** (`denetimler/Formlar.tsx`) | **HAYIR** — model yok (`DenetimFormuSablonu`), bu dilimde yazılmadı | P4'ün sonraki dilimi |
| 7 | Rapor şablonları | rapor **koddur** (`raporlar/karne`, `kanit-paketi`) | **HAYIR** — model yok | P4'ün sonraki dilimi |
| 8 | Rol önerileri | `ROLLER` koda gömülü (4) | **HAYIR** — katalog tablosu yok | P2/P6 |
| 9 | Demo verisi | `Tesis` **25** · `TesisTipi` **11** (enerji 6 · su 5) · risk/bulgu/denetim/kanıt tohumu | **HAYIR (bu dilimde)** — `demo/*.json` yükleyici yazılmadı | P8; kurgusal ad bekçisi DB'ye baktığı için paketten yükleme onu kendiliğinden kapsar |

## 2 · Boşluklar — paket biçiminde karşılığı olmayan tohum parçaları

| # | Tohum parçası | Ölçülen | Neden paket kalemi değil | Öneri |
| --- | --- | --- | --- | --- |
| 1 | `TesisTipi` (sektör kırılımı: JEO · RES · HES · GES · DGKC · MERKEZ; su: ICME-ARITMA …) + `varsayilanKapsamTuruId` | 11 satır | Sözleşme §1'de yok — sektörün "kırılım" listesi bir kalem olarak yazılmamış | `tesis-tipleri.json` kalemi (kod · ad · sıra · varsayılan kapsam türü); B1 tip → tür eşlemesini "paket verisi" saymıştı |
| 2 | `UygulanabilirlikKurali` (`kosulJson`, B2 kural bileşimi) | 1 satır | Sözleşmede yok; kural paketin beyan ettiği öznitelikleri okur ama kuralın kendisi paketle gelmiyor | `kurallar.json` kalemi (regülasyon kodu · ad · koşul JSON); motor önerir, karar insan — kural paketle gelse de karar `UygulanabilirlikKarari`nda kalır |
| 3 | `MaddeEslestirmesi` (8 elle denklik) | 8 satır | Sözleşme §1.4 eşlemeyi CSV (STRM) sayar; **bu dilimde yazılmadı** (R6 ile birlikte: `iliskiTuru · guc · kaynakBelge`) | `esleme/<kaynak>-<hedef>.csv`; `koken` kolonu bu göçle geldi, kurucu hazır |
| 4 | Sektör kaydının kendisi (`Sektor.kod/ad`) | 2 | Manifest `sektor {kod, ad}` taşır — **var** | — |
| 5 | Tesise bağlı öznitelik DEĞERLERİ (`TesisOzellik`, kuruluGuc vb.) | tohum | Değer demo verisidir (kalem 9), şema değil | `demo/` |

## 3 · Sonuç

- **Taşınabilen ve bu turda ölçülen:** sözlük ve öznitelik şeması — enerji
  için **kayıpsız, birebir** (13 + 9 satır; test kanıtı), su için aynı biçim.
- **Yapı olarak taşınabilen ama içeriği yer değiştiren:** çerçeveler —
  `EPDK-SYM` tohumu demo içeriğidir (`DEMO-TR-ENERJI`), gerçek yönetmelik
  `TR-ENERJI/cerceve/EPDK-SGYM*`; `ISO-27001` metinleri telifli kuralıyla
  düşer.
- **Bu dilimde biçimi olmayan:** form, rapor, rol, demo verisi, tesis
  tipleri, uygulanabilirlik kuralı, eşleme CSV.
- Köken sayımı (göç sonrası): `SektorSozlugu` 18 · `SektorOznitelikSemasi`
  10 · `KapsamOgesiTuru` 2 · `Regulasyon` 4 — hepsi `kiraci`. Tohumun
  pakete taşındığı gün bu satırlar `paket` kökenli olur ve paket
  güncellemesi onları yönetir; bugün kiracı satırı gibi korunurlar.

**Taşıma yapılmadı**; kararı ürün sahibi verir (tohum → `DEMO-TR-ENERJI` +
`TR-ENERJI` ayrımı, P8 ile birlikte).

---

## 4 · Taşıma yapıldı (P4 · 2.5, 9 Eylül 2026) — ölçülen kayıp

**Ölçüm:** 2.5 öncesi `dev.db` (tohum `npm run seed`, `c97320a`) ile 2.5
sonrası taze tohum (`rm prisma/dev.db · prisma migrate deploy · npm run
seed`, 9 sn) tablo tablo karşılaştırıldı (SQL; betik oturum çalışma
alanında, sonuçlar aşağıda). Test kanıtı `web/tests/paket-demo.test.ts`
(URN-PKT-015).

**Ne taşındı.** Tohumun sözlük, öznitelik şeması, çerçeve ve denklikleri
üç pakete çıktı ve `prisma/seed.ts` onları `paketiKur` ile kurar:

| Paket | Tür | İçerik | Bağımlılık |
| --- | --- | --- | --- |
| `DEMO-TR-ORTAK` | `yatay` | `CBDDO` (4 madde, metinli) · `ISO-27001` (**telifli**, 4 madde, metinsiz) · `SPK-BS` (3) · 2 denklik | — |
| `DEMO-TR-ENERJI` | `demo` | sözlük 13 · öznitelik 9 · `EPDK-SYM` demo çerçevesi (5 aile, 27 madde) · 6 denklik | `DEMO-TR-ORTAK` |
| `DEMO-TR-SU` | `demo` | sözlük 5 · öznitelik 1 (`gunlukDebi`, m³/gün) | `DEMO-TR-ORTAK` |

İlk kurulumun taslak sürümlerini tohum aktif yapar (tohumu kuran yönetici
= insan kararı; 2.5 öncesi de doğrudan aktif yazılıyordu). CSV'ye
`kanit_tipi` sütunu eklendi ki `Madde.kanitTipi` (15 EPDK + 11 ortak madde)
kayıpsız taşınsın.

**Köken sayımı (önce → sonra).**

| Tablo | 2.5 öncesi | 2.5 sonrası |
| --- | --- | --- |
| `SektorSozlugu` | 18 `kiraci` | 18 `paket` (içerik birebir eşit) |
| `SektorOznitelikSemasi` | 10 `kiraci` | 10 `paket` (içerik birebir eşit) |
| `Regulasyon` | 4 `kiraci` | 4 `paket` (`surum` ve `yururlukTarih` paket kimliğinden) |
| `FrameworkSurumu` | 4 `kiraci` aktif (`mevcut` · `2024`) | 4 `paket` aktif (`2.0` · `2024` · `2022` · `VII-128.9`), taslak yok |
| `MaddeEslestirmesi` | 8 `kiraci` | 8 `paket` (aynı 8 çift, aynı denklik) |
| `Madde` | 38 | 38 (aynı kodlar) |
| `TesisTipi` · `Tesis` · `MaddeDurumu` | 11 · 25 · 110 | 11 · 25 · 110 (tohumda kaldı) |

**Ölçülen kayıp ve farklar.**

| # | Fark | Ölçülen | Sınıf |
| --- | --- | --- | --- |
| 1 | `ISO-27001` 4 maddenin `metin`i | 47–54 karakterlik dört açıklama cümlesi → `"lisans nedeniyle girilmedi"` | **Kayıp, beklenen** — §2 telifli kuralı; başlık ve kanıt tipi korundu |
| 2 | `EPDK-SYM` ağaç maddelerinin `sira`sı (15) | kardeş indeksi (0, 1, 2) → koddan türetilen sıra (4000, 4100, 4101…) | Kayıp değil — göreli sıra aynı; 6 ve 8 aileleri zaten koddan türetiyordu, artık tek kural |
| 3 | 6 ve 8 ailelerinin 12 maddesi `surumId` | **NULL** → aktif sürüme bağlı | **Kazanç** — tohum bu 12 maddeyi sürüm geri doldurmasından SONRA yazıyordu; "sürümsüz madde" bir geçiş kaydıydı, artık yok |
| 4 | `Regulasyon.yururlukTarih` | göreli `bugün − 720 gün` → sabit `2024-09-19` | Kayıp değil — paket kimliği takvim tarihi ister; ekranda aynı alan dolu |
| 5 | Eski `dev.db`de test artığı `SABIT-REG` (1 regülasyon, 1 taslak, 1 sözlük satırı) | taze tohumda yok | Temizlik — 2.5 öncesi bir test kök veritabanına yazmıştı |

**Tohumda kalan (paket kalemi olmayan) kiracı katmanı:** madde → BT/OT
kapsam alanı eşlemesi (`prisma/seed-madde-alanlari.ts`, 38 madde), 6 ve 8
ailelerinin matris `alanAdi`, tesis tipleri (11), uygulanabilirlik kuralı
(1), tesisler (25), süreçler, madde durumları, bulgular, kanıtlar. Bunlar
§2'deki boşluklardır; `demo/*.json` yükleyicisi P8'dedir.

**Sonuç.** Sözlük, öznitelik ve denklik **kayıpsız**; çerçeve yapısı ve
kanıt tipi **kayıpsız**; tek içerik kaybı telifli `ISO-27001`'in dört kısa
açıklama cümlesi — beklenen ve kabul edilen. Tohum artık ikinci bir
doğruluk kaynağı değildir: sabitler (`prisma/sozlukler.ts`,
`prisma/kapsam-ogesi.ts`) yalnız kiracı katmanı ve göç eşitliği testi
içindir ve paketle birebir olmaları testle ölçülür.
