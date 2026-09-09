# Sektör-ülke paketi sözleşmesi

**Ürün kararı (bağlayıcı):** ürün sektör-ülke paketleriyle satılır. Müşteri
kurulumda paketini seçer (`TR-ENERJI · TR-BANKACILIK · EU-FINANS ·
US-ENERJI …`); ürün kutudan çıktığı gibi o sektörün diliyle ve o ülkenin
mevzuatıyla çalışır.

**Kalıcı kural:** sektöre özgü hiçbir alan çekirdek kolonu OLMAZ; paketin
beyan ettiği **öznitelik** olur. `TesisProfili`'nin TEİAŞ/black start/EPDK
kolonları bu kuralın ihlaliydi ve B2 göçüyle öznitelik oldu. Bekçi:
`tests/bekci/sema-sektorsuz.test.ts`.

Bu belge **sözleşmedir**, uygulama P4'tür (`docs/GELISTIRME_PAKETLERI.md`).
Her kalemde "bugün" sütunu **ölçülmüştür** (`origin/main` @ `f898de1`,
8 Eylül 2026; komutlar §7).

---

## 1 · Paketin içinde ne var

| # | Kalem | Paket dosyası | Bugünkü modelde karşılığı | Eksik |
| --- | --- | --- | --- | --- |
| 1 | **Sözlük** | `sozluk.json` — anahtar × dil × altı hâl | **VAR** · `SektorSozlugu(sektorId, anahtar, dil, tekil, cogul, iyelik, belirtme, bulunma, yonelme)`; çekirdek 6 anahtar (`lib/dil/terimler.ts`), seed 10 satır | Paketten yükleme yolu (P4); anahtar kümesi B1 ile büyür (`kapsamOgesi`, tür etiketleri) |
| 2 | **Kapsam öğesi türleri** | `kapsam-turleri.json` — kod, ad, sözlük anahtarı, fiziksel tesise bağlı mı, sıra | **B1 ile VAR** · `KapsamOgesiTuru` katalog tablosu (koda gömülü enum değil); çekirdek iki tür getirir (`tesis`, `kurum`), paket ekler (`sistem`, `is_fonksiyonu`, `dis_hizmet`, `birim`, `veri_kapsami`) | Paketten yükleme (P4); tür pasifleşirse öğe **bilinmiyor** (K2) |
| 3 | **Öznitelik şeması** | `oznitelikler.json` — anahtar, tip (`sayi · metin · mantik · tarih`), birim, etiket anahtarı, **rol** (`kapasite · kritiklik`), **grup** (ekranda hangi başlığın altında), **seçenekler** (`[{deger, ad}]`; sunucu değeri listeye karşı doğrular), kuralda kullanılır mı | **VAR** · `SektorOznitelikSemasi` (`rol · grup · secenekler` sütunları B2 göçüyle) + `TesisOzellik`; çekirdek anahtarı adıyla bilmez, **rolü** bilir (`rol = 'kapasite'`; eski `etiketAnahtari` deseni göçte role çevrildi). B2: enerji profil kolonları (8) buraya taşındı; kapasite dışı her şema satırı Tesis 360'ta alan olur (rolü boş olanlar dahil — `tests/tesis360-sektor-profili.test.ts`) | `tarih` tipi B2 ile geldi; kurum düzeyi öznitelik (çalışan sayısı, aktif büyüklüğü) kapsam öğesine asılmalı — bugün `TesisOzellik.tesisId`; B1 sonrası `KapsamOgesi` üzerinden (P4) |
| 4 | **Çerçeveler (madde ağacı)** | `cerceve/<kod>.json` — OSCAL katalog + `uzantilar.json` (seviye, zorunluluk tipi, kanıt beklentisi) | **VAR** · `Regulasyon · FrameworkSurumu · SurumFarki · Madde` (hiyerarşi, `zorunlulukTipi`, `kanitBeklentisi`), `MaddeEslestirmesi`; `/ice-aktarim` (admin onay kuyruğu) | OSCAL okuyucu yok (`grep -rl oscal` → 0); lisans alanı **var** (§2, 9 Eyl 2026); eşleme CSV türü **var** (2.4: `esleme/<KOD>.json` + `kaynak_kod;hedef_kod;denklik;aciklama`; `MaddeEslestirmesi.koken · paketSurumId · aktif`) |
| 5 | **Yükümlülükler ve süreleri** | `yukumlulukler.json` — kod, ad, regülasyon, asgari şiddet, süre (saat), dayanak, merci | **VAR** · `BildirimYukumlulugu(kod, ad, regulasyonId?, asgariSiddet, sureSaat, dayanak, merci, aktif)` | Süre birimi saat sabit; gün/iş günü paket beyan etmeli (`sureBirimi`) |
| 6 | **Denetim formu şablonları** | `form/<kod>.json` (bölümler · alanlar: anahtar, etiket, tip, seçenek, madde referansı) + isteğe bağlı `form/<kod>.xlsx` ve alan başına `hucre` | **VAR (2.2, 9 Eyl 2026)** · `FormSablonu(kod, ad, tur, sektorId, dosyaAdi, tanimJson, aktif, koken, paketSurumId)`; doğrulayıcı XLSX sayfasını ve hücreleri dosyaya karşı okur, telifli pakette XLSX yasak, kopuk madde referansı kurulumda KİMLİK; ekran şablonu henüz okumaz (form hâlâ kod) | Form ekranının şablonu okuması (P4 sonraki dilim) |
| 7 | **Rapor şablonları** | `rapor/<kod>.json` — alanlar (anahtar, etiket, kaynak nokta yolu), sıralama, künye, sayfa | **VAR (2.2)** · `RaporSablonu(kod, ad, sektorId, tanimJson, aktif, koken, paketSurumId)`; sıralama alanların permütasyonu olmak zorunda; ekran şablonu henüz okumaz | Rapor ekranının şablonu okuması; karne "en zayıf beş tesis" → "kapsam öğesi" (B1 sonrası) |
| 8 | **Rol önerileri** | `roller.json` — kod, ad, açıklama, modül × işlem izinleri (`{modül: [okuma · yazma · onay]}`), kapsam ekseni (`global · kapsamOgesi`), sıra | **VAR (2.3, 9 Eyl 2026)** · `RolKatalogu(kod, ad, aciklama, izinlerJson, kapsamEkseni, sira, aktif, koken, paketSurumId)`; doğrulayıcı çekirdek rol kodunu (`lib/erisim.ts` ROL_IZINLERI anahtarları — dokuz rol) KİMLİK, bilinmeyen modül/işlem, boş izin ve merdiven ihlalini (onay yazma ister, yazma okuma ister) BIÇIM ile reddeder; paket biçiminin modül · işlem · çekirdek rol sabitleri çekirdeğe karşı derlemede (`Record<Modul, true>`) ve bekçiyle (`tests/bekci/rol-sabitleri.test.ts`) ölçülür. **Çalışma zamanı yetkisi kataloğu okumaz** — `izinVar` kod sabitinden karar verir; paket rol koduyla verilen yetki izin vermez (ölçüldü, `tests/paket-rol.test.ts`) | Kataloğun koda bağlanması (P2/P6): kiracı paketin önerisini kendi rolü olarak kabul eder ya da ezer; `/paketler` ekranı önerileri gösterir (2.6) |
| 9 | **Örnek süreçler ve demo verisi** | `demo/*.json` — kurgusal kiracı, kapsam öğeleri, süreçler, bulgular | **KISMEN (2.5, 9 Eyl 2026)** · tohumun sözlük, öznitelik şeması, çerçeve ve denklikleri **`DEMO-TR-ORTAK · DEMO-TR-ENERJI · DEMO-TR-SU` paketlerinden** kurulur (`prisma/seed.ts` → `paketiKur`; ilk sürümler tohumu kuran yöneticinin kararıyla aktif); ISO 27001 metinleri telifli kuralıyla düştü (ölçülen kayıp, `docs/P4_TOHUM_TASIMA_OLCUMU.md` §4); kiracı katmanı (BT/OT alan eşlemesi, aile adı, tesisler, tipler, süreçler, durumlar, bulgular) seed'de; kurgusal ad bekçisi (`prisma/kurgusal-adlar.ts`) | Tesis/kapsam öğesi, süreç ve bulgu verisinin `demo/*.json`dan yüklenmesi (P8); tesis tipleri ve uygulanabilirlik kuralı için kalem |

**Paket manifesti** (`manifest.json`): `kod · ad · tur · ulke (ISO 3166-1) ·
sektor · dil (BCP 47) · surum (SemVer) · yayinci · lisans (§2) ·
bagimliliklar[] · icerikOzetleri{dosya: sha256} · imza?`. P4 tanımıyla
aynı; `lisans` alanı bu belgeyle **yapılandırılmış** oldu (önce
`lisansNotu` serbest metindi).

---

## 2 · Lisans sınırı — makine tarafından okunabilir

Yorumda değil, **alanda**. Manifestte paket düzeyi, her çerçeve dosyasında
çerçeve düzeyi:

```json
"lisans": {
  "tur": "kamuya_acik" | "telifli",
  "metinDahil": true | false,
  "kaynak": "https://…",
  "not": "Resmî Gazete 31069 · 15.03.2020" | "ISO telif — yalnız yapı ve kimlikler"
}
```

| `tur` | Örnek | Pakete giren | `metinDahil` |
| --- | --- | --- | --- |
| `kamuya_acik` | Resmî Gazete, EUR-Lex (DORA, NIS2), NERC CIP, CISA, NVD | **tam metin** + yapı + kimlikler | `true` |
| `telifli` | ISO 27001/27019, IEC 62443, PCI DSS, COBIT, NIST SP (kamu malı ama telif notu kontrol edilir) | **yalnız yapı ve kimlikler** (madde kodu, başlık en fazla 120 karakter, hiyerarşi, seviye); `Madde.metin` = `"lisans nedeniyle girilmedi"` | `false` |

**Doğrulayıcı kuralı (§3):** `tur = telifli` iken herhangi bir `Madde.metin`
120 karakteri aşarsa ya da `metinDahil = true` ise paket **reddedilir** —
"lisans sınırı: `<kod>` telifli, metin girilemez". **Bugün (9 Eylül 2026):** `Regulasyon.lisansTuru` ve `metinDahil` **var**
(göç `20260909090000_p4_icerik_paketi`); doğrulayıcı telifli çerçevede
metni ve 120 karakteri aşan başlığı LİSANS sınıfıyla reddeder; kurucu
telifli maddede `Madde.metin = "lisans nedeniyle girilmedi"`, kamuya açık
iskelette `"metin paketle gelmedi"` yazar (`lib/paket/kur.ts`). Ekran
rozeti henüz yok.

"Bellekten" işaretli PCI DSS / COBIT ayrıntıları (bkz.
`docs/TESIS_DISI_SEKTOR_UYUM_TESTI.md`) birincil kaynaktan doğrulanmadan
**hiçbir pakete yazılmaz**.

---

## 3 · Kod bilmeyen biri paketi yazabilmeli — gereksinim

| | Karar |
| --- | --- |
| **Dosya biçimleri** | Yalnız üç: **JSON** (manifest, sözlük, türler, öznitelikler, yükümlülükler, roller, rapor şablonu, demo), **CSV** (madde ağacı ve eşlemeler — Excel'de açılır; UTF-8, `;` ayraç, başlık satırı zorunlu), **XLSX** (denetim formu şablonu). OSCAL JSON **kabul edilir** ama zorunlu değildir: CSV → OSCAL dönüşümünü doğrulayıcı yapar |
| **Şablon paket** | `paketler/ORNEK-SEKTOR/` — her dosyanın doldurulmuş örneği ve `BENIOKU.md`; yeni paket bunun kopyasıyla başlar |
| **Doğrulayıcı** | `npm run paket:dogrula <dizin>` — tarayıcısız, 10 saniyenin altında; çıktı **Türkçe**, dosya + satır/anahtar + ne yanlış + nasıl düzeltilir. Örnek: `cerceve/BDDK-BS.csv:47 — "ust_kod" değeri "3.2" bulunamadı; üst madde satırı bu satırdan ÖNCE gelmeli.` |
| **Hata sınıfları** | `BIÇIM` (dosya okunamadı / başlık eksik) · `KİMLİK` (tekil kod çakışması, dangling referans) · `SÖZLÜK` (anahtar altı hâlden birini boş bırakmış) · `ÖZNİTELİK` (tip/birim uyumsuz, rol bilinmiyor) · `LİSANS` (§2) · `SÜRÜM` (§4) · `KAPSAM TÜRÜ` (tür kodu türler dosyasında yok) |
| **Her hata bir satır, her satır düzeltme cümlesi taşır** | Doğrulayıcı "hata var" demez; nerede, ne, nasıl der. Kural, kapıların kendi kuralıdır: gerekçe kusuru anlatır |
| **Kabul ölçütü** | Kodu olmayan bir kişi `ORNEK-SEKTOR` kopyasını Excel + metin düzenleyiciyle 1 günde geçerli pakete çevirebilir; ölçüm P4 kabulünde yapılır (kim, kaç saat, kaç doğrulayıcı turu) |

**Bugün (9 Eylül 2026):** doğrulayıcı **var** — `npm run paket:dogrula --
<dizin> [--ozet-yaz]` (`lib/paket/dogrula.ts`): yedi hata sınıfı, çıktı
`dosya:konum — SINIF: ne yanlış → nasıl düzeltilir`, tarayıcısız. Şablon
paket `paketler/ORNEK-SEKTOR/` henüz yok; `paketler/BENIOKU.md` biçimi
anlatır ve `paketler/TR-ENERJI` örnek alınır. Kabul ölçütü (kodsuz kişi, 1
gün) **ölçülmedi**. `/ice-aktarim` eski yol olarak duruyor.

---

## 4 · Sürümleme ve güncelleme

| | Karar | Bugün |
| --- | --- | --- |
| Paket sürümü | SemVer. **Majör** = kapsam türü/öznitelik anahtarı kaldırıldı ya da madde kodu değişti; **minör** = madde/yükümlülük eklendi; **yama** = metin/çeviri | `FrameworkSurumu` + `SurumFarki` çerçeve sürümünü tutuyor; paket sürümü **`IcerikPaketiSurumu`** (SemVer, `@@unique([paketId, surum])`) — 9 Eyl 2026 |
| Kiracının kurulu sürümü | `KiraciPaketi(kiraci × paket × kuruluSurum × kurulumZamani × kuranId × durum)`; `durum ∈ {kurulu, guncelleme_var, kaldirildi}` | `IcerikPaketi(durum ∈ {kurulu, arsiv})` + `IcerikPaketiSurumu(durum ∈ {kurulu, onceki, arsiv}, kurulumZamani, kuranId, raporJson)` — kiracısız (tek kurulum); P2 kiracı boyutunu ekler |
| "Güncelleme var" | Hub kataloğunda daha yeni sürüm → `guncelleme_var`; ekran fark özetini `SurumFarki` ile gösterir; **uygulama insan kararıdır** (motor önerir) | **`/paketler` ekranı var (2.6, 9 Eyl 2026):** hub yerine diskteki `paketler/<KOD>` kopyası kaynaktır; diskteki sürüm kurulu sürümden yeniyse "Güncelleme var", doğrulayıcıdan geçmiyorsa "Doğrulanamadı", dizin yoksa "Diskte yok" (bilinmeyen ≠ güncel); güncelleme düğmesi insan kararıdır, çerçeve taslak gelir ve aktifleştirme Regülasyonlar ekranındadır. Hub kataloğu yok |
| **Müşterinin eşlemeleri ezilmez** | Her eşleme/istisna/öznitelik satırı **köken** taşır: `koken ∈ {paket, kiraci}` + `paketSurumu?`. Güncelleme yalnız `koken = paket` satırlarını değiştirir; `kiraci` satırları dokunulmaz ve fark raporunda "sizin eşlemeniz, paket eşlemesiyle çelişiyor" diye **işaretlenir**, silinmez | `koken` + `paketSurumId` **yedi tabloda var** (`Regulasyon · FrameworkSurumu · MaddeEslestirmesi · SektorSozlugu · KapsamOgesiTuru · SektorOznitelikSemasi · BildirimYukumlulugu`); kurucu yalnız `paket` kökenli satırı değiştirir, aynı anahtardaki `kiraci` satırını kurulum raporuna **çelişki** olarak yazar ve dokunmaz; kiracı kaydı bağlı taslak sürüm üzerine yazılmaz — bağ listesi (`MADDE_BAG_ILISKILERI`: kapsam alanı, durum, eşleme, istisna, proje, risk, denetim kapsamı, belge, eğitim, yerine geçme) şemadaki her `Madde` liste ilişkisini kapsar ve bekçi bunu şemaya karşı ölçer (`tests/paket-kur.test.ts`; ölçüldü: `MaddeAlan` listede yoktu, kaskatla siliniyordu — PR #41 incelemesi). **Eşleme CSV'si 2.4 ile var (9 Eyl 2026, URN-PKT-014):** kimlik kaynak/hedef çerçeve + sürüm etiketi (paket içi ya da kurulu) taşır, satır yalnız madde kodu; aynı kaynak→hedef çiftindeki `kiraci` eşlemesi çelişki olarak raporlanır ve dokunulmaz; paketin KENDİ eşlemesi taslak yenilemesinde bağ sayılmaz (kiracının ve başka paketin eşlemesi sayılır — NULL köken açıkça dâhil); bırakılan eşleme `aktif=false` (silme yok), okuyucular ve `madde.eslestirme*` içermeleri aktif süzer (bekçi). Yapı kusuru (tekrar başlık, başlığı aşan dolu hücre) LİSANS'tan önce; açıklama ≤ 200 ve yalnız metin izinliyken. R6 `iliskiTuru · guc · kaynakBelge` ile genişletir |
| **Yükseltmede bırakılan içerik** | Majör sürüm tür/öznitelik anahtarı kaldırabilir; kaldırılan içerik **silinmez**, pasifleşir; kiracı satırı yine dokunulmaz | **Uzlaştırma var (9 Eyl 2026, URN-PKT-006):** yeni sürümün beyan etmediği paket kökenli `KapsamOgesiTuru` ve `BildirimYukumlulugu` `aktif=false`, paketin kendi taslak `FrameworkSurumu`su `arsiv`; süzgeç `paketSurumId` (kiracı satırına dokunulmaz). `SektorSozlugu` ve `SektorOznitelikSemasi` de `aktif` taşır (2.1, göç `20260909120000_p4_aktif_bayragi`): bırakılan satır pasifleşir, silinmez (R-C — altında kiracı değeri olabilir); pasifleşen anahtarlar raporda `pasifAnahtarlar`; okuyucular yalnız aktif satırı görür (bekçi `tests/bekci/aktif-suzgec.test.ts`, URN-PKT-011); kaldırma pasifler, geri kurulum aktifler |
| **Kurulu sürüm değişmez** | SemVer sürümü değişmezdir: içerik ya da kimlik üstverisi değiştiyse numara yükselir; aynı numarayla farklı içerik kurulamaz | **Var (9 Eyl 2026, URN-PKT-008):** sürüm kaydı manifest ve özetleri taşır; aynı `surum` ile değişmez alanları (`kod · tur · ulke · sektor · dil · yayinci · lisans · bagimliliklar · icerikOzetleri`) farklı paket SÜRÜM hatasıyla reddedilir, kayıt ve içerik olduğu gibi kalır; `ad`/`aciklama` değişebilir. Aynı içerikle yeniden kurulum idempotent ve madde ağacına dokunmaz (kimlikler korunur). Bağımlılık kararı da transaction içinde (URN-PKT-007). Kiracının madde DÜZENLEMESİ (denetim izinde `Madde` kaydı) de bağ sayılır: taslak yenilenmez, yeni etiket ister |
| **Kaldırma bağımlıları korur · geri kurulum** | Bağımlı kurulu paket varken kaldırma yok; kaldırılan paket aynı içerikle geri kurulabilir | **Var (9 Eyl 2026, URN-PKT-009):** kurulu sürüm manifestlerinde bu pakete bağımlılık beyan eden paket varsa kaldırma reddedilir (adıyla); geri kurulumda paketin kendi arşiv taslağı taslağa döner, madde kimlikleri korunur. Madde ağacı 200'lük partilerle (`createManyAndReturn`) ve 120 sn transaction bütçesiyle yazılır |
| Durum değişimi + iz | Kurulum/arşiv ve iz kaydı ya birlikte var ya ikisi de yok | **Aynı transaction (URN-PKT-007):** `paketiKur`/`paketiKaldir` `ayniIslemde` kancasıyla izi transaction içinde yazar; iz yazılamazsa kurulum/arşiv geri alınır. Kaldırmada "aktif sürüm var mı" sayımı da arşiv yazımıyla aynı transaction'da — arada aktifleştirme giremez |
| Geri alma | Önceki sürüm paketi hub'da kalır; geri alma = önceki sürümü kurma; `kiraci` satırları yine korunur | — |

---

## 5 · Paketin çekirdeğe dokunmadığı yerler (kalıcı kural)

Paket **veri** getirir, kod getirmez. Çekirdeğe giren tek şey `KapsamOgesiTuru`,
`SektorOznitelikSemasi`, `SektorSozlugu`, `Regulasyon/Madde`,
`BildirimYukumlulugu` satırlarıdır. Bir paket ihtiyacı çekirdeğe kolon
istiyorsa tasarım yanlıştır: ihtiyaç ya bir özniteliktir (rol ile) ya bir
kapsam öğesi türüdür. Bekçi `tests/bekci/sema-sektorsuz.test.ts` şemadaki
model ve kolon adlarını sektör sözcüklerine karşı tarar; istisna listesi
gerekçeli ve yalnız küçülür.

---

## 6 · Bu sözleşmenin B1/B2 ile ilişkisi

| Sözleşme kalemi | B1/B2'de yapılan | P4'e kalan |
| --- | --- | --- |
| §1.2 kapsam türleri | `KapsamOgesiTuru` + `KapsamOgesi`; **dokuz** omurga tablosu `kapsamOgesiId` (`SurecKapsami · MaddeDurumu · UygulanabilirlikKarari · Istisna · KanitKapsami · DenetciKapsami · DegerlendirmeAktarimi · UyumAnlik · Yetki`); `TesisTipi.varsayilanKapsamTuru` (tip → tür, paket verisi); bekçi `tests/bekci/kapsam-omurga.test.ts` (URN-KAP-001) | türlerin paketten yüklenmesi |
| §1.3 öznitelik | `tarih` tipi; `rol` alanı (`kapasite` deseni genelleşti: `kritiklik`); `grup` ve `secenekler`; enerji profil kolonları öznitelik; bekçi `tests/bekci/sema-sektorsuz.test.ts` (URN-KAP-002: paket anahtarı çekirdek şemada kolon olamaz) | kurum öznitelikleri (kapsam öğesine) |
| §5 kalıcı kural | bekçi | — |
| §1.1 · §1.2 · §1.3 · §1.4 · §1.5 kurulum | **P4 dilimi (9 Eyl 2026):** `lib/paket/` — `bicim.ts` (şemalar, CSV) · `dogrula.ts` (yedi hata sınıfı) · `kur.ts` (tek transaction, TASLAK sürüm, köken, çelişki raporu, arşiv). Eylemler `lib/eylemler2/paket.ts` (`paketKur` · `paketKaldir`, `tanimlar/yazma`, iz). İskeletler `paketler/TR-ENERJI` · `paketler/TR-BANKACILIK` (`tests/paket-iskeletler.test.ts`). Tohum taşınabilirliği `docs/P4_TOHUM_TASIMA_OLCUMU.md` | demo (§1.9) · ekran (`/paketler`) · OSCAL okuyucu; form (§1.6) · rapor (§1.7) · rol (§1.8) katalogları 2.2–2.3, eşleme CSV 2.4 ile geldi — ekranların ve çalışma zamanının şablon/rolü okuması kaldı |

---

## 7 · Ölçüm komutları

```sh
cd web
awk '/^model SektorSozlugu \{/{f=1} f{print} f&&/^\}/{exit}' prisma/schema.prisma
grep -cE "^\s+\| '[a-zA-Z]+'" lib/dil/terimler.ts            # çekirdek anahtar
grep -c "anahtar: '" prisma/sozlukler.ts                      # sözlük satırı
grep -nE "lisans|koken" prisma/schema.prisma                  # lisans/köken alanı
grep -nE "^model .*(Sablon|Form|Rapor|IcerikPaketi|Kiraci)" prisma/schema.prisma
grep -n "ROLLER" lib/sabitler.ts
grep -rln "oscal" lib arac --include=*.ts --include=*.mjs
```
