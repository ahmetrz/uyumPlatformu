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
| 3 | **Öznitelik şeması** | `oznitelikler.json` — anahtar, tip (`sayi · metin · mantik · tarih`), birim, etiket anahtarı, **rol** (`kapasite · kritiklik`), kuralda kullanılır mı | **VAR** · `SektorOznitelikSemasi` + `TesisOzellik`; çekirdek anahtarı adıyla bilmez, **rolü** bilir (`etiketAnahtari: 'kapasite'` deseni). B2: enerji profil kolonları (8) buraya taşındı | `tarih` tipi B2 ile geldi; kurum düzeyi öznitelik (çalışan sayısı, aktif büyüklüğü) kapsam öğesine asılmalı — bugün `TesisOzellik.tesisId`; B1 sonrası `KapsamOgesi` üzerinden (P4) |
| 4 | **Çerçeveler (madde ağacı)** | `cerceve/<kod>.json` — OSCAL katalog + `uzantilar.json` (seviye, zorunluluk tipi, kanıt beklentisi) | **VAR** · `Regulasyon · FrameworkSurumu · SurumFarki · Madde` (hiyerarşi, `zorunlulukTipi`, `kanitBeklentisi`), `MaddeEslestirmesi`; `/ice-aktarim` (admin onay kuyruğu) | OSCAL okuyucu yok (`grep -rl oscal` → 0); **lisans alanı yok** (§2); eşlemede **köken alanı yok** (§4) |
| 5 | **Yükümlülükler ve süreleri** | `yukumlulukler.json` — kod, ad, regülasyon, asgari şiddet, süre (saat), dayanak, merci | **VAR** · `BildirimYukumlulugu(kod, ad, regulasyonId?, asgariSiddet, sureSaat, dayanak, merci, aktif)` | Süre birimi saat sabit; gün/iş günü paket beyan etmeli (`sureBirimi`) |
| 6 | **Denetim formu şablonları** | `form/<kod>.xlsx` + `form/<kod>.esleme.json` (hücre → madde) | **YOK** · denetim formu **koddur** (`denetimler/Formlar.tsx`, `lib/eylemler2/denetim.ts`); `Denetim · DenetimKapsami · KanitTalebi` var, **şablon modeli yok** | `DenetimFormuSablonu` modeli ve XLSX eşleme okuyucusu (P4) |
| 7 | **Rapor şablonları** | `rapor/<kod>.json` — alanlar, sıralama, künye metni, sayfa boyutu | **YOK** · rapor **koddur** (`raporlar/karne`, `raporlar/kanit-paketi`); sözcük ve ölçü sözlükten gelir ama alan kümesi sabit | `RaporSablonu` modeli (P4). Karne bugün "en zayıf beş tesis" der — B1 sonrası "kapsam öğesi" |
| 8 | **Rol önerileri** | `roller.json` — kod, ad, modül × işlem izinleri, kapsam ekseni | **KISMEN** · roller **koda gömülü** (`lib/sabitler.ts:57` `ROLLER = ['okuyucu','katkici','denetim_sorumlusu','yonetici']`; `Yetki.rol` serbest dize, yorumda 9 değer) | Rol kataloğu tablosu; paket **önerir**, kiracı ezer (P2/P6) |
| 9 | **Örnek süreçler ve demo verisi** | `demo/*.json` — kurgusal kiracı, kapsam öğeleri, süreçler, bulgular | **KISMEN** · seed'de (`prisma/seed*.ts`), kurgusal ad bekçisi (`prisma/kurgusal-adlar.ts`) | JSON'dan yükleme (P8/P4); bekçi kapsamı otomatik büyür |

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
"lisans sınırı: `<kod>` telifli, metin girilemez". Bugün `Regulasyon`
tablosunda lisans alanı **yok** (`grep -n lisans prisma/schema.prisma` →
yalnız `TesisProfili.lisansTipi`); P4 `Regulasyon.lisansTuru` ve
`metinDahil` ekler ve ekran çerçeve başlığında rozetle gösterir.

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

Bugün: doğrulayıcı **yok**; `/ice-aktarim` yalnız madde CSV/XLSX alır ve
elenen satırları sebebiyle raporlar (`lib/eylemler.ts`) — bu davranış
doğrulayıcının çekirdeği olur.

---

## 4 · Sürümleme ve güncelleme

| | Karar | Bugün |
| --- | --- | --- |
| Paket sürümü | SemVer. **Majör** = kapsam türü/öznitelik anahtarı kaldırıldı ya da madde kodu değişti; **minör** = madde/yükümlülük eklendi; **yama** = metin/çeviri | `FrameworkSurumu` + `SurumFarki` çerçeve sürümünü tutuyor; paket sürümü **yok** |
| Kiracının kurulu sürümü | `KiraciPaketi(kiraci × paket × kuruluSurum × kurulumZamani × kuranId × durum)`; `durum ∈ {kurulu, guncelleme_var, kaldirildi}` | **yok** (P2 + P4) |
| "Güncelleme var" | Hub kataloğunda daha yeni sürüm → `guncelleme_var`; ekran fark özetini `SurumFarki` ile gösterir; **uygulama insan kararıdır** (motor önerir) | fark motoru var, katalog yok |
| **Müşterinin eşlemeleri ezilmez** | Her eşleme/istisna/öznitelik satırı **köken** taşır: `koken ∈ {paket, kiraci}` + `paketSurumu?`. Güncelleme yalnız `koken = paket` satırlarını değiştirir; `kiraci` satırları dokunulmaz ve fark raporunda "sizin eşlemeniz, paket eşlemesiyle çelişiyor" diye **işaretlenir**, silinmez | `MaddeEslestirmesi`'nde köken alanı **yok** (`grep koken` → 0); `TesisOzellik.kaynak` var (`goc:P1 · elle · ice_aktarim`) — aynı desen genişletilir |
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
| §1.2 kapsam türleri | `KapsamOgesiTuru` + `KapsamOgesi`; yedi omurga tablosu `kapsamOgesiId`; `TesisTipi.varsayilanKapsamTuru` (tip → tür, paket verisi) | türlerin paketten yüklenmesi |
| §1.3 öznitelik | `tarih` tipi; `rol` alanı (`kapasite` deseni genelleşti: `kritiklik`); enerji profil kolonları öznitelik | kurum öznitelikleri (kapsam öğesine) |
| §5 kalıcı kural | bekçi | — |

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
