# Energy Operations Atlas — Tasarım Handoff Gap Analizi

Kaynak: `design_handoff_energy_operations_atlas` (README + 01–07 + 6 tasarım dosyası)
Hedef: `web/` (Next.js 16 App Router, React 19, Prisma 7/SQLite, 22 rota)
Tarih: 31.08.2026

---

## 0 · Özet yargı

Bu bir tema ayarı değil, **tam görsel sistem değişimi**. Mevcut ürün "Ozalit" adlı
koyu-lacivert/altın, yuvarlatılmış, kart-tabanlı bir sistem; handoff ise açık kağıt
zeminli, yarıçapsız, kartsız, marker-tabanlı bir workbench sistemi. Ortak nokta yok
denecek kadar az — token katmanı baştan yazılır.

**Buna karşılık iş mantığı hiç etkilenmiyor.** Server action'lar, RBAC/kapsam, motorlar,
Prisma şeması, denetim izi ve testler dokunulmadan kalır. Değişim yalnız sunum
katmanındadır: `app/tokens.css`, `app/globals.css`, `components/*`, ve her rotanın
`*Istemci.tsx` render'ı. `page.tsx` sunucu bileşenleri çoğunlukla korunur; yalnız
drawer'a taşınan alanlar için ek alan seçimi (select) gerekebilir.

---

## 1 · Token katmanı — tam değişim

| Boyut | Mevcut (Ozalit) | Handoff (Atlas) | Etki |
|---|---|---|---|
| Zemin | `--bg #04141F` koyu lacivert | `surface/paper #F6F4EE` açık kağıt | Ters kutupluluk |
| Yüzey | `--surface #082133` | `surface/card #FFFFFF` | — |
| Aksan | `--accent #D9A441` altın | `accent/product #3D4A4E` nötr | Altın **yasak** (etkileşimde) |
| Metin | `--text #E6F0F7` açık | `ink/primary #1E2120` koyu | Ters |
| Yarıçap | 4 / 6 / 10 / 16 / 999px | **0** (istisna: durum noktası, avatar) | 5 token silinir |
| Gölge | 3 seviye (inset + 40px blur) | Yalnız 3 özel durum; tablo/kart/drawer'da **yok** | Neredeyse düz |
| Font (UI) | Instrument Sans | **Manrope** | Değişir |
| Font (mono) | JetBrains Mono | **Azeret Mono** | Değişir |
| Font (display) | Archivo ✅ | Archivo ✅ | Korunur (eksen 86–92%) |
| Tema sayısı | 2 tema × 5 palet | **Tek tema** (açık) | Tema/palet mekanizması emekli |
| Durum rengi | 5 durum × 4 rol | 5 semantik (ok/warn/critical/planned/unknown) | Yeniden eşlenir |
| Üretim tipi rengi | Yok | `gen/jes` `gen/hes` `gen/res` `gen/ges` — **yalnız kimlik** | Yeni |

**Karar:** `01-tokens.md` normatif kabul edildi. Tasarım HTML'i ile iki küçük
tutarsızlık tespit edildi ve doküman lehine çözüldü (aşağıda §7).

---

## 2 · Bileşen eşlemesi

Handoff 18 paylaşılan bileşen istiyor. Mevcut karşılıkları:

| # | Handoff bileşeni | Mevcut karşılık | Durum |
|---|---|---|---|
| 1 | NavRail 250px | `components/Ray.tsx` (244px, 4 grup) | Yeniden ölçülür; operasyonel katmanda grup başlığı **kalkar** |
| 2 | ContextNav (breadcrumb + entity switcher) | — | **YENİ** |
| 3 | MetricRow (max 4) | `.kpi-grid`/`.kpi`, `.band` | Yeniden yazılır, 4 sınırı zorunlu |
| 4 | FilterBar (metin, pill değil) | `.filtreler` + `.btn` | Yeniden yazılır |
| 5 | DataTable | `.tablo` | Grid tabanlıya geçer |
| 6 | DenseTable | — | **YENİ** (aynı bileşen, sıkı config) |
| 7 | MatrixTable | `.matris` | Yakın; hücrede **yalnız marker** kuralı uygulanır |
| 8 | StatusMarker (nokta + 45° elmas) | `.pill` + `.dot` | **Kritik:** pill metni kaldırılır |
| 9 | RecordCard (ekran başına 1) | `.kart` (82 kullanım) | Kart kullanımı 82 → ~20'ye iner |
| 10 | Drawer 420px | `Kip` `<dialog>` (30 örnek/15 dosya) | **Kritik:** modal → drawer göçü |
| 11 | ExpandableRow | `.agac details/summary` | Uyarlanır |
| 12 | Tabs / ModeSwitch | `useState` + `.btn` dizisi | Bileşene çıkarılır |
| 13 | Popover & Tooltip | `title=` + `BildirimZili` | **YENİ** (klavye erişilebilir) |
| 14 | Timeline (denetim + EOL) | `.zaman` | Yeniden yazılır (eksen + ayrılmış şerit) |
| 15 | GraphCanvas | — | **YENİ** (ilişki + topoloji) |
| 16 | ProgressIndicator (bar/segment/kesir) | `.seg-bar`, `.halka` | `.halka` **emekli** (radyal gauge yasak) |
| 17 | Buttons & Actions | `.btn` | Yarıçap 0, ölçüler yeniden |
| 18 | Forms | `.inp`/`.sec` | Yarıçap 0, `· ZORUNLU` mono etiket |
| 19 | Loading/Empty/Error/Unauthorised | `.bos` + `BosDurumlar.tsx` | İllüstrasyon **kalkar** (yasak) |

**Emekli olacaklar:** `.halka` (radyal), `.pill` metinli rozet, `sahneler/Kapak*.tsx`
(7 SVG kapak — fotoğraf + tipografik fallback ile değişir), `BosDurumlar.tsx`
illüstrasyonları, `data-palette` 5 palet, `TemaDugmesi` (tek tema).

---

## 3 · Ekran eşlemesi (20 tasarım ekranı → 22 mevcut rota)

| Tasarım | Rota | Durum |
|---|---|---|
| F1 Executive Overview | `/` | Yeniden yazılır (132px şerit + 1 RecordCard + 3 satır kuyruk) |
| F2 Energy Portfolio | `/tesisler` | Yeniden yazılır (koyu ekran, 300px plaka satırları) |
| F3 Plant 360 | `/tesisler/[id]` | Yeniden yazılır (560px hero + bölüm rayı) |
| O1 Compliance Control Room | `/surecler` | MatrixTable'a geçer |
| O2 Framework Detail | `/surecler/[id]` | ExpandableRow kontrol aileleri |
| O3 Risk Register | `/riskler` | DataTable |
| O4 Risk Detail | `/riskler` → drawer | Modal → drawer |
| O5 Audit Overview | `/denetimler` | + Timeline |
| O6 Audit Detail & Evidence | `/denetimler/[id]` | Lifecycle tabs |
| O7 Findings & CAPA | `/bulgular` | DataTable |
| O8 Transformation Portfolio | `/projeler` | + Timeline |
| O9 Project Detail | `/projeler` → drawer | Modal → drawer |
| O10 Asset Intelligence (ilişki + tablo) | `/envanter` | + GraphCanvas + ModeSwitch |
| O11 Asset Detail | `/envanter` → drawer | Modal → drawer |
| O12 Network / OT Topology | — | **YENİ ROTA** `/topoloji` |
| O13 EOL / EOS & Lifecycle | — | **YENİ ROTA** `/omur` |
| O14 Backup / DR Readiness | `/operasyon` sekmesi | **Kendi rotasına ayrılır** `/yedekleme` |
| O15 Identity & Access Review | `/operasyon` sekmesi | **Kendi rotasına ayrılır** `/kimlik` |
| O16 Vendors / Third Party | `/operasyon` sekmesi | **Kendi rotasına ayrılır** `/tedarikciler` |
| M1/M2 Management Workbench | `/tanimlar` + `/gorevler` | Birleşik yönetim tezgâhı |

**Tasarımda karşılığı olmayan mevcut rotalar** (iş işlevi korunacak, sisteme uydurulacak):
`/eslestirme`, `/raporlar`, `/aktivite`, `/saglik`, `/ice-aktarim`, `/yetkiler`, `/giris`.
Bunlar silinmez — `06` kurallarına göre yeniden stillenir.

`/operasyon` üç ekrana ayrıldığında değişiklik/olay yönetimi de bir yere gitmeli:
`/operasyon` rotası **korunur**, yalnız yedekleme/kimlik/tedarikçi sekmeleri kendi
rotalarına taşınır.

---

## 4 · Veri modeli uyumu

`README §7`'deki varlık listesi mevcut şemayla **birebir örtüşüyor** (adlar Türkçe,
handoff da Türkçe kullanmış): Tesis, TuzelKisi, Regulasyon/FrameworkSurumu (=Cerceve),
Madde (=Kontrol), MaddeDurumu (=Degerlendirme), Kanit, UygulanabilirlikKarari, Risk,
Bulgu, Aksiyon, Denetim, KanitTalebi, Proje, Varlik, AgBolgesi/Gecit, YedeklemePolitikasi/
GeriYuklemeTesti, KimlikHesabi, Tedarikci, AktiviteKaydi (=DenetimIzi).

Handoff'un bozulmamasını istediği üç kural **zaten uygulanmış ve testli**:
1. Unknown ≠ zero → `lib/sabitler.ts:uyumOzeti` + `tests/semantik.test.ts` (8 test)
2. Kural tabanlı uygulanabilirlik + gerekçeli override → `lib/motorlar/uygulanabilirlik.ts` + `tests/uygulanabilirlik.test.ts` (5 test)
3. Her riskli değişiklik gerekçeli → `OnayTalebi` + `AktiviteKaydi` (DB trigger ile değiştirilemez)

**Eksik alan:** `Tesis.heroImage` (05-photography §5: "plant→image ilişkisi component
kodunda değil veride tutulmalı"). Additive migration gerekir.

---

## 5 · Fotoğraf durumu

| Varlık | Pakette | Durum |
|---|---|---|
| Tam boy hero | 3 (kizildere3-jes, ikizdere-hes, jhimpir-res) | ✅ |
| 240×150 thumb | 10 santral | ✅ |
| Nötr triptik / rail şeridi / bölüm kırpımı | 3 | ✅ |
| **Kaynak orijinaller (`assets/originals`)** | **0 / 10** | ❌ **EKSİK** |

10 orijinal (`01_Kizildere_I_JES_Denizli.png` … `10_Jhimpir_RES_Pakistan.png`) sohbete
görsel olarak gönderildi ama dosya olarak ulaşmadığı için kaydedilemedi.

**Etkisi:** Kızıldere 1, Kızıldere 2, Alaşehir, Tercan, Mercan, Beyköy, Kuzgun için
560px Plant 360 hero'su üretilemez. `05-photography §1.6` gereği bu santraller
**tipografik fallback** ile render edilecek — bu spesifikasyona uygun bir davranış,
kusur değil. Orijinaller depoya konursa hero kırpımları üretilir.

**Portföy uyuşmazlığı:** tasarım 10 santral + Jhimpir (Pakistan) varsayıyor; mevcut
seed'de 17 santral var ve Gökçedağ/Sarıtepe/Demirciler RES ile Merkez BT tasarımda yok,
Jhimpir ise seed'de yok. Karar: **seed'e dokunulmaz** (gerçek veri), fotoğrafı olmayan
santraller tipografik plaka alır. Jhimpir eklenmez — veri uydurmak olur; kullanıcı
isterse ayrıca eklenir.

---

## 6 · Yoğunluk (density) borcu

`06 §A2` bütçeleri mevcut ekranlarla karşılaştırıldığında en büyük ihlaller:

| Ekran | Sorun |
|---|---|
| `/` | 5+ modül canvas'ta (hero bandı, ısı matrisi, süreç kartları, bulgular, aktivite). Bütçe: **2** |
| `/envanter` | 783 satırlık istemci; tablo + detay paneli aynı anda | 
| `/operasyon` | 5 sekme tek ekranda |
| Her yerde | `.pill` metinli durum rozetleri (`06 §B3` doğrudan yasaklıyor) |
| Her yerde | `.kart` sarmalama (82 kullanım — `06 §B1` yasaklıyor) |

---

## 7 · Handoff içi tutarsızlıklar (kaydedildi, doküman lehine çözüldü)

1. `gen/hes` koyu varyantı: doküman `#5F8FA8`, tasarım HTML `--hesd:#5f97b4`.
2. `gen/res` koyu varyantı: doküman `#9DB3A8`, tasarım HTML `--resd:#9db9b2`.

İkisi de koyu yüzeyde kimlik amaçlı, nadir kullanımda. **Doküman değeri alındı**
(`01-tokens.md` "All values are final" diyor). Tasarım HTML'inde ayrıca dokümanda
karşılığı olmayan yardımcı token'lar var (`--jesp --bdp --hesp --resp --gold --accd`);
bunlar pastel/parlak varyantlar olarak token katmanına eklendi.

---

## 8 · Kurulan altyapı (bu analiz sırasında)

- **Fontlar self-host edildi:** Archivo / Manrope / Azeret Mono, latin + latin-ext
  alt kümeleri, 6 woff2, toplam **268 KB** → `web/public/fontlar/`.
  Google Fonts dış bağımlılığı kalktı (`07 §Phase 1` zaten bunu istiyordu).
- **Tasarım referansları düzleştirildi:** `support.js`/`<x-dc>`/`<image-slot>` runtime'ı
  çıkarıldı, düz HTML üretildi → `design/duz/*.html`.
- **22 referans artboard'ı 1440px'de yakalandı** (doğru fontlarla) →
  `scratchpad/referans/*.png` + `envanter.json`. Faz 8 piksel karşılaştırmasının tabanı.

---

## 9 · Uygulama planı

`07-implementation-order.md` sırası korunur. Paralelleştirme yalnız dosya sahipliği
ayrık olan işlerde:

| Faz | İçerik | Paralel? |
|---|---|---|
| 1 | Token katmanı + font + reset | Hayır (tek sahip) |
| 2 | AppShell + NavRail + ContextNav + routing | Hayır |
| 3 | 18 paylaşılan primitif + galeri sayfası | Kısmen (bağımlılık sırası var) |
| 4 | Flagship 3 ekran (Plant 360 → Portfolio → Executive) | Faz 5g1 ile paralel |
| 5 | 16 operasyonel ekran (5 grup) | Grup içi paralel |
| 6 | Management Workbench | Hayır (5g3'ten sonra) |
| 7 | Motion | Kısmen |
| 8 | Görsel QA (22 referansla piksel karşılaştırma) | Ekran başına paralel |

Her fazın çıkışında `06 §C` kontrol listesi + mevcut kalite kapısı
(`tsc` · `eslint --max-warnings=0` · `vitest`) çalıştırılır.
