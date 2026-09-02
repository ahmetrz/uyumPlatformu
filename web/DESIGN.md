---
name: Zorlu Enerji Yönetişim Platformu
description: Üç koyu kabuk (A tezgâh · B saha · C defter), radius 0, saç çizgisiyle kompozisyon, mono/tabular sayı — bir kontrol odası, bir saha, bir defter.
colors:
  a-zemin: "#0D1012"
  a-panel: "#101416"
  a-panel-2: "#181D1F"
  a-murekkep: "#E7EAEA"
  a-murekkep-2: "#B6BEC1"
  a-murekkep-3: "#8A9497"
  a-sac-cizgisi: "#262C2E"
  a-sac-cizgisi-2: "#313739"
  a-aksan-kehribar: "#D9A03C"
  a-aksan-uzeri: "#0D1012"
  a-secim: "#1B1712"
  a-ok: "#6E9E7A"
  a-md: "#D9A03C"
  a-bd: "#DC6154"
  a-pl: "#7A8B93"
  a-unk: "#8A9497"
  b-zemin: "#0A0C0D"
  b-panel: "#0F1213"
  b-panel-2: "#14181A"
  b-murekkep: "#EDEEEC"
  b-murekkep-2: "#B9BEBC"
  b-murekkep-3: "#8D9497"
  b-sac-cizgisi: "#1C2123"
  b-sac-cizgisi-2: "#272D2F"
  b-aksan-bakir: "#C2703E"
  b-aksan-uzeri: "#0A0C0D"
  b-secim: "#171211"
  b-ok: "#6FA07E"
  b-md: "#D9A03C"
  b-bd: "#DB5A48"
  b-pl: "#7A8B93"
  b-unk: "#8D9497"
  c-zemin: "#141210"
  c-panel: "#1A1815"
  c-panel-2: "#221F1B"
  c-murekkep: "#EDE8DF"
  c-murekkep-2: "#C2BBAF"
  c-murekkep-3: "#958E82"
  c-sac-cizgisi: "#2B2823"
  c-sac-cizgisi-2: "#3A362F"
  c-aksan-oxblood: "#B24936"
  c-aksan-uzeri: "#F5F0E8"
  c-secim: "#241A17"
  c-ok: "#8FB39A"
  c-md: "#D4A24A"
  c-bd: "#E0644F"
  c-pl: "#9AAA98"
  c-unk: "#958E82"
  tip-jes: "#C47A3F"
  tip-hes: "#5F8FA8"
  tip-res: "#9DB3A8"
  tip-ges: "#C9A24C"
typography:
  display-a:
    fontFamily: "Archivo, Inter Tight, sans-serif"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "0.01em"
  display-b:
    fontFamily: "Barlow Condensed, Inter, sans-serif"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "0.01em"
  display-c:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "var(--gorunum)"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "var(--ui)"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "var(--ui)"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.6
  metric:
    fontFamily: "var(--veri)"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1
    fontVariation: "tabular-nums"
  colhead:
    fontFamily: "var(--veri)"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.18em"
  label:
    fontFamily: "var(--veri)"
    fontSize: "9.5px"
    fontWeight: 400
    letterSpacing: "0.14em"
rounded:
  none: "0"
  daire: "50%"
spacing:
  s2: "2px"
  s4: "4px"
  s6: "6px"
  s8: "8px"
  s10: "10px"
  s12: "12px"
  s16: "16px"
  s18: "18px"
  s22: "22px"
  s24: "24px"
  s32: "32px"
  s44: "44px"
  col-gap: "16px"
  gutter-op: "24px"
  drawer-w: "400px"
  rail-w: "76px"
components:
  button-primary:
    backgroundColor: "{colors.a-aksan-kehribar}"
    textColor: "{colors.a-aksan-uzeri}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "5px 12px"
  button-secondary:
    backgroundColor: "{colors.a-panel}"
    textColor: "{colors.a-murekkep-2}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "5px 12px"
  button-secondary-hover:
    backgroundColor: "{colors.a-panel}"
    textColor: "{colors.a-murekkep}"
  button-reject:
    backgroundColor: "{colors.a-panel}"
    textColor: "{colors.a-bd}"
    rounded: "{rounded.none}"
    padding: "5px 12px"
  button-row:
    backgroundColor: "transparent"
    textColor: "{colors.a-aksan-kehribar}"
    padding: "2px 0"
  input:
    backgroundColor: "{colors.a-panel}"
    textColor: "{colors.a-murekkep}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "6px 8px"
  table-row:
    backgroundColor: "transparent"
    textColor: "{colors.a-murekkep}"
    padding: "10px 0"
  table-row-selected:
    backgroundColor: "{colors.a-panel-2}"
    textColor: "{colors.a-murekkep}"
  drawer:
    backgroundColor: "{colors.a-panel}"
    textColor: "{colors.a-murekkep}"
    width: "400px"
  chip-filter:
    backgroundColor: "transparent"
    textColor: "{colors.a-murekkep-3}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "5px 11px"
  chip-filter-active:
    backgroundColor: "{colors.a-panel-2}"
    textColor: "{colors.a-murekkep}"
---

# Design System: Zorlu Enerji Yönetişim Platformu

<!-- Bu dosya ŞU ANKİ koddan türetilmiştir: token'lar `app/kabuk.css`,
     primitifler `components/kabuk/*.tsx`, ölçümler `arac/kontrast.mjs` ve
     `arac/erisim.mjs`. Frontmatter normatiftir; düzyazı nasıl uygulanacağını
     anlatır. Bir token'ı değiştirmek için önce `kabuk.css`, sonra burası.
     Prototip → uygulama kararları: ../ORIGINAL_DESIGN_IMPLEMENTATION_MAP.md. -->

## Overview

**Creative North Star: "Gece Vardiyasındaki Kontrol Odası"**

Ürün bir enerji üretim grubunun BT/OT yönetişim konsoludur ve tek temadır:
koyu. Üç ayrı kabuk aynı binanın üç katıdır — **A · tezgâh** (Industrial
Precision: enstrüman, kontrol odası, kehribar aksan), **B · saha** (Energy
Intelligence: fotoğraf, coğrafya, bakır aksan), **C · defter** (Operational
Luxury: editoryal, basılı, serif görüntü, oxblood aksan). Ayrıştıkları yer
zemin sıcaklığı (A/B soğuk çelik grisi, C sıcak mürekkep-kahve), görüntü
yazı ailesi, fotoğrafın rolü ve gezinme felsefesidir; renk varyantı
değildirler. Hangi kabuğun çizileceği rotadan seçilir
(`components/kabuk/yonler.ts`).

Üçü de aynı disiplini paylaşır: **radius 0**, saç çizgisiyle kompozisyon
(dolgu ya da gölge değil, 1px kural), mono/tabular sayı, kart-içinde-kart
yok, ikon kütüphanesi yok (monogram ve tipografik glif), donut/radyal
gösterge yok. Ekran olguyu gösterir, yargı vermez: "kritik!" değil, "12 gün
gecikmiş". Bilinmeyen sıfır değildir ve kendi diliminde durur.

**Key Characteristics:**
- Üç koyu kabuk, tek ürün: A kehribar `#D9A03C` · B bakır `#C2703E` · C oxblood `#B24936`
- Yarıçap yok; yalnız durum daireleri ve avatar `50%` (şekil kodlamasının parçası)
- Durum yalnız renkle anlatılmaz: glif ailesi (A/B kare, C daire) + sözcük + erişilebilir ad
- Sayı her yerde mono/tabular; işlevsel metin (gezinme, kolon başlığı) 11px'in altına inmez
- Kritik bilgi ipucunda yaşamaz; bilinmeyen `—` / "ölçülmedi" olarak yazılır, sıfır değil
- Hareket seyrek ve anlamlı; azaltılmış harekette durur

## Colors

Her kabuk kendi paletini `.ab[data-yon='a|b|c']` altında aynı token adlarıyla
tanımlar (`--zemin --panel --panel2 --murekkep --i2 --i3 --hr --hr2 --aksan
--aksan-uzeri --secim --ok --md --bd --pl --unk --jes --hes --res --ges`);
ekranlar yalnız token adı kullanır, kabuk malzemeyi seçer.

### Primary
- **Kehribar** (`#D9A03C`, A `--aksan`): seçili satırın sol kenarı, aktif ray öğesi, birincil düğme dolgusu, odak halkası. Yazı rengi olarak yalnız `.ab-dugme.satir` bağlantısında.
- **Bakır** (`#C2703E`, B `--aksan`): saha kabuğunda aynı roller; fotoğraf üstünde işaretçi kenarı.
- **Oxblood** (`#B24936`, C `--aksan`): defter kabuğunda seçili satır kenarı, aktif serif sekmenin alt çizgisi, birincil düğme. Prototipin `#8A3A2C` tonu koyu zeminde 2,6:1 kaldığı için ton korunarak açıldı (çukurda 3,05:1). **Metinde kullanılmaz**; düğme dolgusu üzerine kâğıt rengi mürekkep (`#F5F0E8`).

### Secondary
- **Durum ailesi** (kabuğa göre ton değişir, rol değişmez): `--ok` uygun (A `#6E9E7A`), `--md` kısmi / uyarı (A `#D9A03C`), `--bd` uygunsuz / kritik (A `#DC6154`), `--pl` planlı (A `#7A8B93`), `--unk` değerlendirilmedi (A `#8A9497`). `--bd` prototipte 3,45:1 kalıyordu; ton korunarak 4,76:1'e açıldı — kritik durumun rengi okunamıyorsa kritikliği taşımıyor demektir.

### Tertiary
- **Üretim tipi kimliği** (`--jes` `#C47A3F` · `--hes` `#5F8FA8` · `--res` `#9DB3A8` · `--ges` `#C9A24C`): jeotermal / hidro / rüzgâr / güneş. Renk **kimliktir, durum değil**: yalnız işaretçi ölçeğinde (portföy düzlemi, santral seçici), asla metinde ya da durum yerine.

### Neutral
- **Zemin** (A `#0D1012` · B `#0A0C0D` · C `#141210`): sayfanın kendisi; C'ninki sıcak mürekkep-kahve, A/B'ninki soğuk çelik.
- **Panel / panel-2** (A `#101416` / `#181D1F`): çekmece, ray, satır hover ve seçili satır zemini. Panel zeminin bir kademe üstüdür; kart değildir, kenarlığı saç çizgisidir.
- **Mürekkep** (A `#E7EAEA`), **mürekkep-2** (`#B6BEC1`, ikincil metin), **mürekkep-3** (`#8A9497`, etiket ve kolon başlığı; prototipteki `#6E777A` 4,5:1 için açıldı).
- **Saç çizgisi / saç çizgisi-2** (A `#262C2E` / `#313739`): satır ayracı, bölüm kuralı, düğme ve girdi kenarlığı. Kompozisyonun tek çizgi aracıdır.
- **Seçim** (A `#1B1712`): açık satırın zemini — aksanın çok soluk tonu.

### Named Rules
**The Tek Tema Rule.** Ürün koyudur; C'nin prototipteki açık kâğıt zemini üründe yoktur. Kabuklar arası geçiş "başka bir platform" hissi vermez — ayrışma zemin sıcaklığı ve tipografiyle kurulur, açık/koyu kontrastıyla değil.

**The Renk Tek Kanal Değil Rule.** Durum daima ikinci bir kanalla gelir: glif biçimi, sözcük, uzunluk (tik şeridi) ya da erişilebilir ad. Renk göremeyen okuyucu için 22 ile 4 aynı görünmez.

**The Aksan Seyrek Rule.** Aksan seçimi, aktif öğeyi ve birincil eylemi işaretler; ekranın yüzde birkaçından fazlasını kaplamaz. Metinde aksan kullanılmaz (C'de kontrast eşiği altındadır, A/B'de de gerekmez).

## Typography

**Display Font:** Archivo (A) · Barlow Condensed (B) · Newsreader (C) — `--gorunum`
**Body Font:** Inter Tight (A) · Inter (B, C) — `--ui`
**Label/Mono Font:** IBM Plex Mono (A, C) · JetBrains Mono (B) — `--veri`

Hepsi self-host (`public/fontlar`, latin + latin-ext; Türkçe `ş ğ İ ı`
latin-ext'tedir). Çalışma anında Google Fonts'a çıkış yoktur (statik dışa
aktarım + CSP). `arac/font-kontrol.mjs` her başvurunun diskte ve `@font-face`
ile bildirilmiş olduğunu denetler.

**Character:** Görüntü ailesi kabuğun sesidir — A dar ve büyük harfli bir
enstrüman etiketi, B sıkıştırılmış bir saha pankartı, C ağırlıksız bir serif
manşet. Gövde nötr kalır; sayı ve kod daima mono. Kabuk değişince görüntü
ve mono ailesi değişir, kademe değişmez.

### Hierarchy
- **Display** (A/B 500, 26px, 1.15, büyük harf · C 400, 34px, 1.1): ekran başlığı `.ab-lede h1`; vurgu `<b>` ile 700 ve gerekirse durum rengi.
- **Board** (34px, 1.1): pano / kök hata başlığı `--t-board`.
- **Headline** (500, 18px, 1.2, `-.01em`): bölüm başlığı `.ab-bolum-basligi`.
- **Title** (500, 14px): odak kartı ve lead `--t-lead`.
- **Body** (400, 12.5px, 1.6): hücre, form, düzyazı `--t-cell / --t-body / --t-field`; tablo konusu 13.5px; çekmece cümlesi 12.5px. Düzyazı en fazla bir cümle, 560–620px.
- **Metric** (mono, 19px, tabular; C'de görüntü ailesi 24px): ölçüt satırı değeri; payda 12px `--i3`.
- **Colhead** (mono, 11px, `.18em`, büyük harf): kolon başlığı `.kolonbas` — 11px zemini buradadır.
- **Label** (mono, 9.5px, `.14em`, büyük harf): etiket `.etiket`, kod, köken işareti. Yalnız veri kademesi; gezinme ve başlık etiketi bu boya inmez.

### Named Rules
**The 11px Tabanı Rule.** Prototip kolon başlığını 8.5px, ray etiketini 7.5px çiziyordu; üründe işlevsel metin 11px'in altına inmez (ray sütunu bu yüzden 60px'ten 76px'e çıktı). 9.5–10px yalnız mono veri etiketi ve kod içindir.

**The Sayı Mono Rule.** Her sayı `--veri` ailesinde ve `tabular-nums` ile yazılır (`.mono`, `.num`); sağa hizalanır. Serif ya da UI ailesinde sayı yalnız C'nin endeks ölçütünde (oran, adet değil).

## Layout

Masaüstü konsol: doğrulama kapıları 1440 · 1366 · 1280 · 1024 px; 700px
altında hiçbir alan erişilemez olamaz (kapsam çubuğu bilgi gruplarını düşürür,
alan dizisi yatay kayar). Mobil hedef değildir.

- **A · tezgâh**: 52px kapsam çubuğu (`KAPSAM · tüzel kişi · santral` + çerçeve + veri kesiti damgası) + 76px ikon rayı (`--rail-w`; iki harf monogram + 11px etiket, öğe 40px, altıncı öğeden sonra ayraç) + içerik + 30px durum ayağı (bağlayıcı sayımları, yalnız yetkiliye). Ray daralmaz, genişlemez.
- **B · saha**: 56px yatay sekme çubuğu, ray yok. Ana ekranda 648px fotoğrafik alan (sol 430px dikkat paneli, sağ 320px katman paneli), 168px kartlı saha şeridi, 430px takvim + akış bandı. Gezinme kısmen mekânsaldır (fotoğrafik şerit, düzlem).
- **C · defter**: künye (`padding: 28px 56px 16px`, Newsreader 26px marka + mono alan dizisi) → 2px mürekkep kuralı → 15px serif sekmeler → 1px kural → gövde `212px + 1fr`, 44px aralık, `36px 56px 64px` dolgu. Sol dizin içindekiler tablosu ve okuma anahtarıdır; kendi dizinini veren ekran (`data-dizin="ekran"`) varsayılanı düşürür.
- **Ölçek**: boşluk `--s2 … --s44` (2·3·4·6·8·9·10·12·14·16·18·20·22·24·26·28·30·32·34·36·40·44px); kolon aralığı 16px; operasyonel oluk 24px; bölüm üst dolgu 22px, alt 40px; çekmece 400px.
- **Tablo**: satır dolgusu 10px (`.sik` kipinde 7px — tipografi değil dolgu daralır); 1366px altında `ikincil` kolon düşer (`--kolon-dar`), başlık ve satır aynı şablonu kullanır (`arac/kolon-hizasi.mjs` ölçer).
- **Detay**: A sağ çekmece 400px (kalıcı), B alt levha, C satır içi genişleme (defteri terk etmeden; dört sütun: neden · kanıt · yönetişim zinciri · sorumluluk).
- **Yazdırma**: koyu kabuk kâğıda gitmez — beyaz zemin, siyah mürekkep, ray/sekme/künye düşer.

## Elevation & Depth

Gölge yoktur. Derinlik **tonal katmanlama** ve **saç çizgisiyle** kurulur:
zemin → panel → panel-2 üç kademe; her katman 1px `--hr` / `--hr2` kenarlıkla
ayrılır. Çekmece `position: fixed`, `border-left: 1px var(--hr2)`, gölgesiz.
Fotoğraf üstünde okunabilirlik `.veil` yatay gradyanıyla sağlanır (fotoğrafa
dokunmadan). Hover, panel-2 zeminiyle ifade edilir; kaldırma/yükseltme yoktur.

### Named Rules
**The Saç Çizgisi Rule.** İki alanı ayırmak için gölge, dolgu bloğu ya da kart kenarlığı değil, 1px kural kullanılır. Kart-içinde-kart yoktur; grup yalnız ince bir üst çizgiyle ayrılır.

## Shapes

Köşe yarıçapı her yerde `0` (`.ab, .ab *, ::before, ::after`). Tek istisna
`.daire` (`50%`): durum daireleri ve avatar — yarıçap süs değil şekil
kodlamasının parçasıdır; dolu daire ile dolu kare farklı şey söyler.

- **Glif ailesi**: A/B 10px kare (dolu = uygun, içi boş = kısmi, dolu kırmızı = uygunsuz, noktalı = değerlendirilmedi, çizgi = kapsam dışı); C 13px daire ailesi (● ○ ⊖ ◌ –). Satırın en kötüsü `scale(1.35)`.
- **Bilinmeyen**: içi boş / noktalı — asla dolu nokta.
- **Kenar**: 1px `--bw-hair`, 2px `--bw-edge` (seçili satırın sol kenarı, aşama şeridinin 3px alt çizgisi).
- **Pill, hap, rozet yok**: köken işareti bile zemin/kenarlık taşımaz; 9.5px mono etiket + kaynak adı.

## Components

Paylaşılan primitifler `components/kabuk/` altındadır ve `/sistem/bilesenler`
galerisinde her durumda görülür. Sınıf grameri yalnız `.ab-*` ve alt
sınıfları (`.etiket .deger .cumle .mono .eylem .kod .konu .alt .sag`).

### Buttons (`Dugme`, `.ab-dugme`)
- **Shape:** köşesiz (0), 1px kenarlık, mono 10px büyük harf `.1em`.
- **Primary** (`.birincil`): aksan dolgu + `--aksan-uzeri` mürekkep, `5px 12px`. Panelin tam genişlikte eylemi `.tam` (`8px 12px`).
- **Secondary** (varsayılan): panel zemin, `--hr2` kenar, `--i2` mürekkep; hover mürekkep + `--i3` kenar.
- **Reject** (`.ret`): `--bd` kenar ve metin; hover dolgu `--bd`.
- **Row** (`.satir`): kenarsız, aksan renkli satır içi bağlantı. **Bağlı** (`.bagli`) çekmece zincir bağlantısı.
- **Disabled:** `opacity .55`, `not-allowed`; yetkisiz kullanıcıya düğme gösterilir ve NEDENİ yanına yazılır.
- **Focus:** `outline: 2px solid var(--aksan); outline-offset: 2px` (her etkileşimli öğe).

### Chips — süzgeç şeridi (`Filtreler`, `.ab-suzgec`)
- **Style:** bitişik mono düğmeler, 1px `--hr2` kenar, sağ kenar paylaşımlı; aktif `aria-pressed` panel-2 zemin + mürekkep; taşan seçenekler `.tasma` kesik kenar. En fazla beş görünür süzgeç + taşma. Pill, kayan gösterge yok.
- **Kip ikilisi** (`KipDegistir`, `.ab-ikili`): 26px, aktif aksan dolgu.
- **Aşama şeridi** (`Asamalar`, `.ab-asamalar`): sekme DEĞİLDİR — sıralı liste, `aria-current="step"`, 3px alt çizgi (tamam `--ok`, şimdi `--aksan`).

### Cards / Containers
- **Odak kartı** (`OdakKarti`): ekran başına bir tane, 5px sol kenar sürükleyen durumun renginde, en fazla bir cümle düzyazı, dört şerit, iki eylem.
- **Panel blokları** (`.ab-blok`): boş / hata / yetkisiz durumları; panel zemin + 1px `--hr2`, hata `--bd` kenar; 620px en fazla. Spinner, illüstrasyon, cesaretlendirme yok; iskelet (`Iskelet`) gerçek etiketleri hemen çizer, yalnız değerler blok olur.
- **Kart-içinde-kart yok**; internal dolgu 22px 24px.

### Inputs / Fields (`Alan`, `.ab-alan`, `.ab-gr`)
- **Style:** panel zemin, 1px `--hr2` kenar, 12.5px UI ailesi, `6px 8px`; etiket 9.5px mono üstte; zorunlu alan mono etiketle işaretlenir.
- **Focus:** aksan odak halkası (global kural).
- **Error:** `.hata` 11px `--bd` tek satır, `aria-invalid`; snackbar ve toast yok.

### Navigation
- **A rayı** (`.ab-a-ray`): 76px, monogram + 11px etiket, aktif panel-2 zemin + kehribar sol kenar, `aria-current="page"` tekil.
- **B sekmeleri** (`.ab-b-ust`): 56px çubuk, beş alan sekmesi = ortak alan listesi (`ALANLAR`).
- **C künyesi** (`.ab-c-kunye`, `.ab-c-nav`, `.ab-c-dizin`): mono alan dizisi (`aria-current="location"` aksan alt çizgi), Newsreader 15px sekmeler, 212px dizin satırları 12.5px + sağa hizalı 10px mono sayaç; aktif satır mürekkep + 500, aksan yalnız kenar taşır.
- **Üst bağlar**: Ayarlar · Yardım · Çıkış her kabukta; okunmamış bildirim rozeti sayıdır (`99+` tavan, sıfırda rozet yok). Komut paleti Ctrl/⌘+K.
- **Bağlam çubuğu** (`BaglamCubugu`, `.ab-baglam`): en fazla üç seviyelik kırıntı (orta segment kısalır), sağda üretim tipine göre gruplu santral seçici; fotoğrafı olmayan santral tipografik döşeme alır.

### Tables (`Tablo`, `Matris`, `GenisleyenSatir`)
- Satır bir `<button>`: seçim `aria-pressed`; 2px sol kenar durumun şiddetini taşır, olgunun sözcüğü kendi kolonunda yazar. Zebra yok, satır içi eylem yok. Kolon başlığı 11px mono `.18em`; sıralanabilir başlık dolgusuz düğme.
- **Matris**: hücrede yalnız glif (`Im`, `role="img"` + erişilebilir ad), asla metin; satırın en kötüsü büyür; sakin satır %58 opaklık; C defter matrisi devriktir (satır = kontrol, sütun = santral) ve detay satır içinde açılır.
- **Genişleyen satır**: `<details>`; aynı anda tek aile açık.

### Drawer (`Cekmece*`, `.ab-panel`)
400px sabit sağ panel; 42px başlık (kod + kapat), kimlik bloğu (glif + durum SÖZÜ 9.5px büyük harf — sözcük yalnız burada), alan çiftleri (`dl`), zincir bağlantıları, eylem bloğu + dip not. Esc kapatır, odak panele iner.

### Signature: durum işaretçisi ve göstergeler
- **`Im`** — `Durum` kümesi `ok · md · bd · pl · unk · tamam`; sözcükleri `DURUM_SOZU` (uyumlu · kısmi · uyumsuz · planlı · değerlendirilmedi · kapanmış). Kütük satırında sözcük yazılmaz, işaretçi taşır.
- **`Metrikler`** — üründeki tek KPI muamelesi: etiket üstte, mono 19px değer; kart, kenarlık, ikon, sparkline yok; renk yalnız sayının kendisi alarm olduğunda.
- **`Bar` · `Segment` · `Kesir` · `TikSeridi`** — donut/radyal yok. Segment'te bilinmeyen dilimi daima sonda ve kendi gri tonunda; tik şeridi oran değil dizi/ağırlık anlatır, `null` tik "kayıt yok"tur.
- **`KokenRozeti` / `KokenSatiri`** — "bu satırı nereden biliyoruz": ELLE GİRİLDİ · OTOMATİK · DOĞRULANMIŞ · REDDEDİLDİ; güven `null` "ölçülmedi" yazar, `%0` değil.
- **`Tuval`** — ilişki grafiği: ilk render bölgeler + kritik düğümler; akış yalnız yön anlatır, azaltılmış harekette durur, kesik çizgi kalır.
- **`ZamanCizelgesi` / `OmurUfku`** — etiketler eksenin üstünde, kartlar ayrı şeritte; sığmayan kart çizilmez, "+N kayıt daha" der.

### Motion
`--ez: cubic-bezier(.2, 0, 0, 1)`, `--mo-reveal: 320ms`; hover geçişleri
0.15s linear; fotoğraf söndürme 0.5s. Sürekli hareket yalnız üç yerde
(`.ab-tara` tarama ışığı 6s, `.ab-halka` kritik işaretçi halkası 3.6s,
`.ab-tuval .akis` kenar akışı 2.4s) ve hepsi `prefers-reduced-motion: reduce`
altında durur — `arac/erisim.mjs` azaltılmış kipte çalışan animasyon arar.

## Do's and Don'ts

### Do:
- **Do** her yeni ekranı `page.tsx → veri.ts → *Istemci.tsx → mantik.ts` kalıbı ve yalnız `.ab-*` grameriyle kur; token'ı `kabuk.css`ten oku, satır içinde hex yazma.
- **Do** durumu iki kanalla ver: `Im` glifi + sözcük ya da erişilebilir ad; skor gibi büyüklükleri `TikSeridi` ile ikinci kez kodla.
- **Do** ölçülmemişi `null` taşı ve "—" / "ölçülmedi" yaz; bilinmeyen dilimini toplamda ayrı göster.
- **Do** işlevsel metni 11px ve üstünde tut; sayıyı mono/tabular ve sağa hizalı yaz.
- **Do** devre dışı düğmenin nedenini yanına yaz; hata detayını açılır `ab-teknik` bloğuna koy; uzun adı kırpma, sar (`overflow-wrap: anywhere`).
- **Do** her etkileşimli öğeye görünür odak ver ve klavyeyle ulaşılır kıl; `aria-current` tekil olsun.
- **Do** kontrastı `arac/kontrast.mjs` ile ölç (metin 4,5:1, kenar/işaret 3:1) — yeni renk açmadan önce.

### Don't:
- **Don't** yarıçap, gölge, pill, rozet, kart-içinde-kart, zebra satır, ikon kütüphanesi kullanma.
- **Don't** durumu yalnız renkle anlatma; kütük satırında durum sözcüğünü işaretçinin yanında tekrar etme (sözcük çekmece kimliğinde yaşar).
- **Don't** donut, radyal gösterge, yüzde halkası, sparkline'lı KPI kartı çizme.
- **Don't** bilinmeyeni sıfır say; boş yığını "sağlıklı" gösterme; bağlanmamış kaynağı "canlı" yazma.
- **Don't** kritik bilgiyi yalnız hover/ipucuna koy; spinner, illüstrasyon ya da cesaretlendirme metniyle boş durum doldurma.
- **Don't** aksanı metinde kullanma (C'de eşik altındadır); kabuğa açık tema ya da tema anahtarı ekleme.
- **Don't** eski sınıf adlarına dönme (`t-label`, `cekmece-*`, `atlas-*`, `kart` …) — `arac/iz-tarama.mjs` yasak listeyi zorlar.
