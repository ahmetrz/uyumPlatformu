# Tasarım Token'ları — Zorlu Enerji Yönetişim Platformu

> **Tarihsel belge.** Buradaki token'lar ve `tokens.css` üründe artık
> kullanılmıyor; güncel token'lar `web/app/kabuk.css`, tasarım sistemi
> `web/DESIGN.md`.

Bu doküman [TASARIM_PLANI.md](TASARIM_PLANI.md) kararlarının uygulanabilir token'lara dönüştürülmüş hâlidir.
Makine tarafı: [`tokens.css`](tokens.css) · Görsel karşılık: [`mockups.html`](mockups.html)

---

## 0. Görsel yön

**Gece vardiyasındaki şebeke operasyon konsolu.** Ürün, altı santralin uyum durumunu izleyen bir BT ekibi tarafından çoğu zaman koyu ekranda kullanılacak; bu yüzden **koyu palet birincil kimliktir**, açık mod ondan türetilmiş "gündüz vardiyası"dır.

Seçilen palet: **Ozalit** — teknik çizim mavisi üzerine pirinç. Ozalit (cyanotype) kâğıdı, mühendislik arşivinin kendi rengidir; pirinç ise enstrüman donanımının. Bu eşleşme, ürünü jenerik bir yönetim panelinden ayırıp denetlenebilir bir teknik kayıt ortamına yaklaştırır.

Kimliği taşıyan dört karar:

1. **Zemin renklidir, nötr gri değil.** `#04141F` ozalit mavisi; yüzeyler aynı hue içinde açılır. Çoğu varsayılan tasarımın nötr siyaha yapıştığı yer tam olarak burasıdır.
2. **Tek aksan: pirinç `#D9A441`.** Seçili, aktif ve birincil olan her şey pirinçtir. Yeşil / amber / kırmızı **yalnızca uyum durumunu** anlatır (Vercel Workflow: "renk = durum"); aksanla çakışmaması için "kısmi" tonu turuncuya kaydırılmıştır.
3. **Ambient şebeke katmanı.** Hero ve footer'da canvas ile çizilen ince ızgara ve hatlar boyunca ilerleyen pirinç darbeler; sahne başlıklarında aynı ızgaranın CSS karşılığı; sahneler arasında akan darbeli dikey hat. Sektörün kendi görsel diline (tek hat şeması, SCADA) yaslanır.
4. **İlerlemeli açığa çıkarma.** Hiçbir veri atılmaz, hiçbiri de aynı anda gösterilmez. Ayrıntı sırayla gelir: durağan → hover → panel. Bkz. bölüm 6.

Beş alternatif palet (`grafit`, `patina`, `kehribar`, `gece`, `altin`) `tokens.css` içinde `data-palette` ile korunmuştur; kök öğeye öznitelik verilerek tüm ürün paleti değişir.

---

## 1. Renk

### 1.1 İlke

Tek aksan + nötr zemin disiplini (Sharplink) ile "en fazla 3 kroma" kuralı (Superlist) birlikte uygulanır: ürünün tamamında pirinç aksan ve üç durum kroması (yeşil, amber, kırmızı) vardır. Renk gördüğünüz her yer ya etkileşimli bir öğedir ya da bir uyum sinyalidir.

### 1.2 Zemin ve yüzeyler

| Token | Koyu (birincil) | Açık | Kullanım |
|---|---|---|---|
| `--bg` | `#04141F` | `#E7EDF4` | Uygulama zemini |
| `--bg-2` | `#061A28` | `#DCE5EF` | Sol ray, footer |
| `--surface` | `#082133` | `#FFFFFF` | Kart, tablo, panel |
| `--surface-2` | `#0C2B41` | `#F3F7FB` | Tablo başlığı, hover |
| `--surface-3` | `#113650` | `#E9F0F7` | İpucu, üçüncü katman |
| `--border` | `#123449` | `#D3DEEA` | 1px hairline |
| `--border-strong` | `#1E4C69` | `#B2C2D4` | Input, vurgulu çerçeve |
| `--text` | `#E6F0F7` | `#08151F` | Birincil metin |
| `--text-2` | `#9DB6C9` | `#42566A` | İkincil metin |
| `--text-3` | `#6B8598` | `#6A7E92` | Etiket, meta |

Koyu modda yükseklik **gölgeyle değil** yüzey açılması + 1px iç ışıkla verilir.

### 1.3 Aksan ve ışıma

| Token | Koyu | Açık | Not |
|---|---|---|---|
| `--accent` | `#D9A441` (pirinç) | `#8A6410` | Seçili, aktif, birincil buton |
| `--accent-hover` | `#EBB85C` | `#6C4C06` | |
| `--accent-soft` | `#0E2233` | `#F6EAD2` | Bağlam çubuğu, seçili satır |
| `--glow` | `#F2CE8A` | `#B08A3A` | **Sadece ışıma** — akım darbesi, ilerleme hattı |
| `--grid-line` | `rgba(150,200,240,.09)` | `rgba(20,60,95,.10)` | Ambient ızgara |

### 1.4 Durum semantiği

| Durum | Anlam | Koyu `dot` | Açık `dot` |
|---|---|---|---|
| `uyumlu` | Kanıtlı, kapalı | `#3FC98F` | `#1E8A5F` |
| `kismi` | Aksiyon devam ediyor | `#F0842B` | `#C9640D` |
| `uyumsuz` | Açık bulgu var | `#F0555C` | `#C4442E` |
| `incelemede` | Kanıt değerlendiriliyor | `#A9C4D8` | `#514D45` |
| `kapsamdisi` | Uygulanabilir değil | `#5E7789` | `#8C887F` |

Türetilenler — yeni renk açılmaz:
- **Önem derecesi:** `kritik` = uyumsuz + dolu nokta · `yuksek` = uyumsuz + halka (`.hollow`) · `orta` = kismi · `dusuk` = kapsamdisi
- **Kanıt tazeliği:** `taze` (<90 gün) = uyumlu · `yenilenmeli` (90–180) = kismi · `suresi-doldu` (>180) = uyumsuz

**Erişilebilirlik:** durum asla tek başına renkle anlatılmaz — pill'de metin, tablo satırının başında 2px şerit, noktada dolu/halka biçim farkı bulunur (WCAG 1.4.1).

### 1.5 Grafik

`--chart-1` pirinç `#D9A441` / `#8A6410`, `--chart-2` sönük mavi-gri. Grafikler durum renklerini kullanmaz; trend bir durum değil ölçümdür.

---

## 2. Tipografi — üç rol

| Rol | Aile | Kullanım |
|---|---|---|
| Display | **Archivo** (değişken `wdth` 62–125, `wght` 400–800) | Hero, sahne başlıkları, KPI ve metrik sayıları |
| Arayüz | **Instrument Sans** | Gövde, tablo, etiket, buton — latin-ext, Türkçe diakritikler tam |
| Veri | **JetBrains Mono** | Madde kodu (`EPDK-SYM-4.2.1`), timestamp, hash, dosya adı, versiyon, büyük harf etiketler |

Display eksen ayarları: `--wdth-wide: 118` (hero, sahne başlığı), `--wdth-metric: 112` (sayı), `--wdth-narrow: 74` (hero içindeki vurgu kelimesi). Genişlik kontrastı, tipografiyi teslimin karakteristik unsuru yapar.

| Token | Boyut | Kullanım |
|---|---|---|
| `--fs-hero` | `clamp(3.4rem, 9vw, 6rem)` | Hero başlığı, satır yüksekliği .94 |
| `--fs-scene` | `clamp(1.9rem, 3.4vw, 3rem)` | Sahne başlıkları |
| `--fs-metric` | `clamp(1.9rem, 2.6vw, 2.5rem)` | Telemetri metrikleri |
| `--fs-h1` … `--fs-h3` | 24 / 19 / 16 px | Sayfa, kart, alt başlık |
| `--fs-body` | 14 px | Arayüz temel boyutu |
| `--fs-sm` / `--fs-xs` | 13 / 12 px | Tablo hücresi / pill, chip |
| `--fs-micro` | 11 px | Mono etiket, `letter-spacing: .16em`, büyük harf |

Kurallar: sayıların hizalandığı her yerde `font-variant-numeric: tabular-nums`; başlıklarda `text-wrap: balance`; okuma metni ≤ 76 karakter; harf aralığı yalnızca büyük harf etiketlerde açılır, gövde metinde asla; ondalık ayırıcı Türkçe virgül (`78,4`).

---

## 3. Boşluk, ölçü, yarıçap

4px tabanlı skala `--sp-1` (4) → `--sp-24` (96).

Yapısal: sol ray 244px / daraltılmış 64px · üst çubuk 56px · tablo satırı 44px (yoğun 36px) · içerik maks. 1600px · dokunma hedefi min. 40px.

Yarıçap: `--r-sm` 4 (pill içi) · `--r-md` 6 (buton, chip) · `--r-lg` 10 (kart) · `--r-xl` 16 (çerçeve, modal) · `--r-full` (avatar, durum pill'i).

---

## 4. Hareket

| Token | Süre | Kullanım |
|---|---|---|
| `--mo-instant` | 120 ms | Hover, odak halkası |
| `--mo-fast` | 180 ms | Pill, ipucu, caret dönüşü |
| `--mo-base` | 240 ms | Satır açılımı, ray daraltma, panel |
| `--mo-theme` | 280 ms | Açık↔koyu radyal geçiş (View Transitions) |
| `--mo-reveal` | 700 ms | Sahneye giriş (opacity + 20px yükselme) |
| `--mo-draw` | 1400 ms | Uyum halkası, trend çizgisi, ilerleme çubuğu çizilmesi |
| `--mo-count` | 900 ms | KPI sayaç animasyonu (cubic ease-out) |

Easing: `--ease` `cubic-bezier(.32,.72,0,1)`, `--ease-out` `cubic-bezier(.16,1,.3,1)`.

Kademe (stagger): kardeş öğeler `--d` özel özelliğiyle 80–100 ms aralıklarla gecikir. Hero sekansı ~380 ms'de tamamlanır; sahneler IntersectionObserver ile bir kez tetiklenir.

**`prefers-reduced-motion: reduce`** altında: tüm süreler 1 ms, sahneye giriş ve çizilme anında tamamlanır, sayaç son değere atlar, ambient ızgara donar (tek kare çizilir), radyal tema geçişi devre dışı kalır.

---

## 5. Komponent token'ları (özet)

- **Durum pill'i (`.st`):** 22px, `--r-full`, 6px nokta + metin; `--s-fg/-bg/-bd/-dot` üçlüsü `data-s` ile değişir.
- **Eşleştirme chip'i (`.chip`):** `--r-md`, `--surface-2`, mono kod + çerçeve kısaltması (`ISO 27001 A.8.2`), hover'da aksan.
- **Filtre chip'i (`.chip.filter`):** `--accent-soft` zemin, × ile kaldırılabilir.
- **Tablo satırı:** 44px, tek satırlık madde hücresi (mono kod + başlık yan yana), sol kenarda 2px durum şeridi, hover `--surface-2`, açık satır `--accent-soft` + iç gölge.
- **Yoğunluk kuralı:** bir tablo satırında en fazla **bir** renkli pill bulunur. Kanıt tazeliği ayrı kolon değildir — yalnızca dikkat gerektirdiğinde durum pill'inin yanında küçük bir saat ikonu (`.ev-flag`) olarak belirir. Çerçeve eşleştirmesi satırda sessiz mono metindir (`ISO A.8.2 +1`); chip'lerin tamamı satır açıldığında görünür.
- **Uyum halkası:** 84px çap, 6px kalınlık, iz `--border`, yay durum rengi, `stroke-dashoffset` ile çizilir.
- **Timeline:** 1px dikey çizgi (scaleY ile büyür), 24px aktör düğümü, mono timestamp, önce→sonra diff satırı.
- **Yaşam döngüsü şeridi:** 10px segmentli çubuk, genişlikler gün sayısıyla orantılı, aktif segment aksan renginde.
- **Odak:** `0 0 0 2px var(--bg), 0 0 0 4px var(--accent)` — her odaklanabilir öğede görünür.

---

## 6. Tema mimarisi kuralı

Çıplak `:root` **koyu** paleti tanımlar (birincil kimlik). `@media (prefers-color-scheme: light)` içinde `:root:not([data-theme="dark"])` token'ları açık palete çevirir; `:root[data-theme="light"]` aynısını tekrar tanımlar ki manuel geçiş her iki yönde de kazansın. Böylece üç durum da doğru çözülür: damgasız (sistem), `data-theme="dark"`, `data-theme="light"`. Hiçbir renk yalnızca media/`[data-theme]` bloğunda tanımlı değildir ve `body` zemini daima token'dan boyanır.

---

## 6. İlerlemeli açığa çıkarma

Kural: **hiçbir veri atılmaz, hiçbiri de aynı anda gösterilmez.** Ayrıntı üç kademede gelir ve her kademe bir kullanıcı niyetine karşılık düşer.

| Kademe | Tetikleyici | Ne görünür | Nerede |
|---|---|---|---|
| **Durağan** | — | Yalnızca karar için gereken: kimlik + durum | Madde satırı: kod, başlık, durum pill'i |
| **Hover / odak** | Fareyle bekleme veya `Tab` | İkincil alanlar sağdan kayarak belirir; yer önceden ayrıldığı için sayfa zıplamaz | Sorumlu, eşleştirme, kanıt uyarısı |
| **Panel** | Tıklama | Tam kayıt — hiçbir alan eksik değil | Sağdan çekmece (kayıt) veya ortada diyalog (arşiv listesi) |

Panel tipi seçimi:
- **Çekmece (`.sheet`, sağdan):** tek bir kaydın künyesi — madde detayı. Liste yerinde kalır, bağlam kaybolmaz.
- **Diyalog (`.dialog`, ortada):** bir listenin tamamı — denetim izi, aksiyon planı, kanıt kütüphanesi, aktivite akışı, 90 günlük takvim.

Kırpma DOM'da değil, sunumda yapılır: `.trim` sınıfı fazla kayıtları gizler, panel açılırken kaldırılır. Böylece arama, kopyalama ve ekran okuyucu erişimi tam kalır.

Ekranda kalan blok sayısı bu ilkeyle düştü: bulgu detayında 6 karttan 3'e, madde listesinde 6 kolondan 3'e, dashboard listelerinde 5 satırdan 3'e — kayıp sıfır.
