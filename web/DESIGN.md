---
name: Zorlu Enerji Yönetişim Platformu
description: Tek koyu kabuk, Saha dili (Barlow Condensed · Inter · JetBrains Mono, bakır aksan), üç yoğunluk (amiral · operasyonel · tezgâh), radius 0, saç çizgisiyle kompozisyon, mono/tabular sayı.
colors:
  zemin: "#0A0C0D"
  panel: "#0F1213"
  panel-2: "#14181A"
  murekkep: "#EDEEEC"
  murekkep-2: "#B9BEBC"
  murekkep-3: "#8D9497"
  sac-cizgisi: "#1C2123"
  sac-cizgisi-2: "#272D2F"
  aksan-bakir: "#C2703E"
  aksan-uzeri: "#0A0C0D"
  secim: "#171211"
  ok: "#6FA07E"
  md: "#D9A03C"
  bd: "#DB5A48"
  pl: "#7A8B93"
  unk: "#8D9497"
  tip-jes: "#C47A3F"
  tip-hes: "#5F8FA8"
  tip-res: "#9DB3A8"
  tip-ges: "#C9A24C"
typography:
  display:
    fontFamily: "Barlow Condensed, Inter, sans-serif"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "0.01em"
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
    fontSize: "10px"
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
  ayak-h: "32px"
  durum-h: "32px"
  satir-h: "36px"
components:
  button-primary:
    backgroundColor: "{colors.aksan-bakir}"
    textColor: "{colors.aksan-uzeri}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "5px 12px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.murekkep-2}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "5px 12px"
  button-secondary-hover:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.murekkep}"
  button-reject:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.bd}"
    rounded: "{rounded.none}"
    padding: "5px 12px"
  button-row:
    backgroundColor: "transparent"
    textColor: "{colors.aksan-bakir}"
    padding: "2px 0"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.murekkep}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "6px 8px"
  table-row:
    backgroundColor: "transparent"
    textColor: "{colors.murekkep}"
    padding: "10px 0"
  table-row-selected:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.murekkep}"
  drawer:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.murekkep}"
    width: "400px"
  chip-filter:
    backgroundColor: "transparent"
    textColor: "{colors.murekkep-3}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "5px 11px"
  chip-filter-active:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.murekkep}"
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
koyu, tek kabuk. Dili Saha'nın dilidir (Energy Intelligence: fotoğraf,
coğrafya, Barlow Condensed büyük harf başlık, bakır aksan); Eylül 2026
denetimi üç kabuğun (A tezgâh · B saha · C defter) "üç ayrı ürün" hissi
verdiğini ölçtü ve A/C kaldırıldı. Ayrışma artık yoğunlukla kurulur —
amiral (ana ekran, Plant 360, portföy), operasyonel (kütükler, kayıtlar),
tezgâh (keşif, aktarım, sağlık) — hangi yoğunluğun çizileceği rotadan
seçilir (`components/kabuk/yonler.ts`, `yogunlukSec`). Saha'nın YERLEŞİMİ
öteki alanlara kopyalanmaz; kopyalanan dil ve disiplindir.

Her yoğunluk aynı disiplini paylaşır: **radius 0**, saç çizgisiyle kompozisyon
(dolgu ya da gölge değil, 1px kural), mono/tabular sayı, kart-içinde-kart
yok, ikon kütüphanesi yok (monogram ve tipografik glif), donut/radyal
gösterge yok. Ekran olguyu gösterir, yargı vermez: "kritik!" değil, "12 gün
gecikmiş". Bilinmeyen sıfır değildir ve kendi diliminde durur.

**Key Characteristics:**
- Tek koyu kabuk, tek aksan: bakır `#C2703E`; beş alan Saha · Portföy · Uyum · Varlık · Risk
- Yarıçap yok; yalnız durum daireleri ve avatar `50%` (şekil kodlamasının parçası)
- Durum yalnız renkle anlatılmaz: glif ailesi (10px kare) + sözcük + erişilebilir ad
- Sayı her yerde mono/tabular; işlevsel metin (gezinme, kolon başlığı) 11px'in altına inmez
- Kritik bilgi ipucunda yaşamaz; bilinmeyen `—` / "ölçülmedi" olarak yazılır, sıfır değil
- Hareket seyrek ve anlamlı; azaltılmış harekette durur

## Colors

Tek palet `.ab` altında tanımlıdır (`--zemin --panel --panel2 --murekkep --i2
--i3 --hr --hr2 --aksan --aksan-uzeri --secim --ok --md --bd --pl --unk --jes
--hes --res --ges`); Eylül 2026 denetiminden sonra A (kehribar/Archivo) ve C
(oxblood/Newsreader) paletleri kaldırıldı, Saha (B) paleti tek kaynak oldu.
Yoğunluk (`data-yogunluk="amiral|operasyonel|tezgah"`) renk değil ölçü değiştirir
(`--gutter --ayak-h --durum-h --satir-h`).

### Primary
- **Bakır** (`#C2703E`, `--aksan`): seçili satırın sol kenarı, aktif alan sekmesinin alt çizgisi, birincil düğme dolgusu, odak halkası; fotoğraf üstünde işaretçi kenarı. Yazı rengi olarak yalnız `.ab-dugme.satir` bağlantısında. Düğme dolgusu üzerine zemin rengi mürekkep (`#0A0C0D`).

### Secondary
- **Durum ailesi**: `--ok` uygun (`#6FA07E`), `--md` kısmi / uyarı (`#D9A03C`), `--bd` uygunsuz / kritik (`#DB5A48`), `--pl` planlı (`#7A8B93`), `--unk` değerlendirilmedi (`#8D9497`). `--bd` prototipte 3,45:1 kalıyordu; ton korunarak 4,76:1'e açıldı — kritik durumun rengi okunamıyorsa kritikliği taşımıyor demektir.

### Tertiary
- **Üretim tipi kimliği** (`--jes` `#C47A3F` · `--hes` `#5F8FA8` · `--res` `#9DB3A8` · `--ges` `#C9A24C`): jeotermal / hidro / rüzgâr / güneş. Renk **kimliktir, durum değil**: yalnız işaretçi ölçeğinde (portföy düzlemi, santral seçici), asla metinde ya da durum yerine.

### Neutral
- **Zemin** (`#0A0C0D`): sayfanın kendisi; soğuk çelik.
- **Panel / panel-2** (`#0F1213` / `#14181A`): çekmece, ikincil sıra, satır hover ve seçili satır zemini. Panel zeminin bir kademe üstüdür; kart değildir, kenarlığı saç çizgisidir.
- **Mürekkep** (`#EDEEEC`), **mürekkep-2** (`#B9BEBC`, ikincil metin), **mürekkep-3** (`#8D9497`, etiket ve kolon başlığı).
- **Saç çizgisi / saç çizgisi-2** (`#1C2123` / `#272D2F`): satır ayracı, bölüm kuralı, düğme ve girdi kenarlığı. Kompozisyonun tek çizgi aracıdır.
- **Seçim** (`#171211`): açık satırın zemini — aksanın çok soluk tonu.

### Named Rules
**The Tek Tema Rule.** Ürün koyudur ve TEK kabuktur. Alanlar arası geçiş "başka bir platform" hissi vermez — ayrışma yoğunlukla (oluk, satır yüksekliği, ayak/durum şeridi) kurulur, palet ya da yazı ailesiyle değil.

**The Renk Tek Kanal Değil Rule.** Durum daima ikinci bir kanalla gelir: glif biçimi, sözcük, uzunluk (tik şeridi) ya da erişilebilir ad. Renk göremeyen okuyucu için 22 ile 4 aynı görünmez.

**The Aksan Seyrek Rule.** Aksan seçimi, aktif öğeyi ve birincil eylemi işaretler; ekranın yüzde birkaçından fazlasını kaplamaz. Metinde aksan kullanılmaz.

## Typography

**Display Font:** Barlow Condensed — `--gorunum` (başlıklar BÜYÜK HARF, `lang="tr"` ile İ/ı doğru)
**Body Font:** Inter — `--ui`
**Label/Mono Font:** JetBrains Mono — `--veri`

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
- **Label** (mono, 10px, `.14em`, büyük harf): YAPISAL KAŞ etiketi `.etiket` — bölüm adı, kolon kaşı; kendi başına bilgi taşımaz. Veri, sayı ve olgu bu kademeye inmez, 11px `--t-code`ta durur.

### Named Rules
**The İki Taban Rule.** Prototip kolon başlığını 8.5px, ray etiketini 7.5px çiziyordu. Üründe İKİ taban vardır ve ikisi ayrı iş yapar: İÇERİK taşıyan her şey — eylem (düğme), sayı, olgu, ölçüm — en az **11px** (`--t-code`); yalnız yapısal KAŞ etiketi **10px**'e (`--t-label`) inebilir. Ölçüldü (2026-09-02): tek kademedeyken `Çıkış` düğmesi 10px, risk matrisinin hücre sayıları ve portföy künyeleri 9px kalıyordu — hiçbiri dekoratif değil. 9px ve altı üründe yoktur.

**The Sayı Mono Rule.** Her sayı `--veri` ailesinde ve `tabular-nums` ile yazılır (`.mono`, `.num`); sağa hizalanır. Serif ya da UI ailesinde sayı yalnız C'nin endeks ölçütünde (oran, adet değil).

## Layout

Masaüstü konsol: doğrulama kapıları 1440 · 1366 · 1280 · 1024 px; 700px
altında hiçbir alan erişilemez olamaz (kapsam çubuğu bilgi gruplarını düşürür,
alan dizisi yatay kayar). Mobil hedef değildir — ama **sayfa hiçbir bantta
yana kaymaz**: taşma ya bir kaydırma kabına hapsedilir (üst çubuklar 1100px
altında yatay kayar) ya da yerleşim tek kolona iner. `arac/yatay-tasma.mjs`
375 ve 768'de 38 rotayı ölçer ve taşmayı üreten öğeyi adıyla yazar.

- **Kabuk** (`.ab`, satırlar `56px auto 1fr auto auto`): 56px üst çubuk (marka · beş alan sekmesi · arama · kişi · Bildirim/Ayarlar/Yardım · Çıkış) → 36px ikincil sıra (`.ab-ikincil`; alanın bölümleri gruplu, sağda kapsam; Saha'da ve yardımcı rotalarda çizilmez) → `#icerik` → 32px sistem durumu şeridi (`.ab-durum`; veri kesiti, bağlayıcı sayımları, son koşu — yalnız yetkiliye) → 32px ayak (`.ab-alt`; künye · Yardım · Destek · Kısayollar · Tasarım sistemi · telif). Durum ve ayak AYRI şeritlerdir: biri ölçüm, öteki künye.
- **Yoğunluk**: `amiral` (`/`, `/tesisler/*`, `/portfoy`, `/harita`) oluk 0, durum şeridi yok, ayak 28px tek satır; `operasyonel` oluk 24px, satır 36px; `tezgah` satır 32px. Ana ekran 1366×768 / 1440×900 / 1280×800'de tek ekrana sığar (`scrollHeight === innerHeight`).
- **Ölçek**: boşluk `--s2 … --s44` (2·3·4·6·8·9·10·12·14·16·18·20·22·24·26·28·30·32·34·36·40·44px); kolon aralığı 16px; operasyonel oluk 24px; bölüm üst dolgu 22px, alt 40px; çekmece 400px.
- **Tablo**: satır dolgusu 10px (`.sik` kipinde 7px — tipografi değil dolgu daralır); 1366px altında `ikincil` kolon düşer (`--kolon-dar`), başlık ve satır aynı şablonu kullanır (`arac/kolon-hizasi.mjs` ölçer). Dar bant şablonunu `darSablon` üretir: sabit kolon oransal olur (`minmax(0, min(Npx, T%))`, bütçe %58 paydaşlara bölünür), `minmax` tabanı sıfırlanır, 1'in altındaki esneme katsayısı 1'e çıkar. Küçük izler (im · ok, ≤40px) daralmaz. 700px altında kolon aralığı 16 → 10px iner ve kolon başlıkları sarar — kırpmak bilgi kaybettirir, sarmak kaybettirmez.
- **Detay**: sağ çekmece 400px (kalıcı); uyum ekranlarında satır içi genişleme (beş sütun: neden · kanıt · **karşılayan belge** · yönetişim zinciri · sorumluluk). Sütun sayısı bantla 5 → 3 → 1'e iner.
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

- **Glif ailesi**: A/B 10px kare (dolu = uygun, içi boş = kısmi, dolu kırmızı = uygunsuz, **45° taralı = değerlendirilmedi**, çizgi = kapsam dışı); C 13px daire ailesi, aynı beş rol. Satırın en kötüsü `scale(1.35)`.
- **Bilinmeyen**: 45° TARAMA — asla dolu nokta, asla noktalı çerçeve. Noktalı çerçeve denenip bırakıldı: 10px kutuda `kısmi`nin düz çerçevesinden bir cihaz pikseliyle ayrılıyordu ve 1× ölçekte ayırt edilemiyordu, yani "bilinmeyen görünür kalır" ilkesi tam da bilinmeyeni gösteren işarette çöküyordu. Tarama ödünç değil: yığın çubuğunun `bilinmeyen` dilimi de aynı deseni taşır.
- **Kenar**: 1px `--bw-hair`, 2px `--bw-edge` (seçili satırın sol kenarı, aşama şeridinin 3px alt çizgisi).
- **Pill, hap, rozet yok**: köken işareti bile zemin/kenarlık taşımaz; 10px mono kaş etiketi + kaynak adı.

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
- **Style:** panel zemin, 1px `--hr2` kenar, 12.5px UI ailesi, `6px 8px`; etiket 10px mono üstte; zorunlu alan mono etiketle işaretlenir.
- **Focus:** aksan odak halkası (global kural).
- **Error:** `.hata` 11px `--bd` tek satır, `aria-invalid`; snackbar ve toast yok.

### Navigation
- **Alan sekmeleri** (`.ab-ust > nav`): beş alan (`ALANLAR`: Saha · Portföy · Uyum · Varlık · Risk), Barlow Condensed 15px büyük harf, aktif sekme bakır alt çizgi, `aria-current="page"` tekil. Rota → alan eşlemesi `alanSec` (yonler.ts).
- **İkincil sıra** (`.ab-ikincil`): alanın bölümleri (`IKINCIL`), gruplar 10px etiketle ayrılır; aktif öğe mürekkep + 500 + bakır alt çizgi, `aria-current="true"`. Sekmede yeri olmayan ekran kendi dizinini (`.ab-c-ekrandizin[data-dizin="ekran"]`) verebilir.
- **Üst bağlar**: Bildirimler · Ayarlar · Yardım · Çıkış; okunmamış bildirim rozeti sayıdır (`99+` tavan, sıfırda rozet yok). Komut paleti Ctrl/⌘+K.
- **Bağlam çubuğu** (`BaglamCubugu`, `.ab-baglam`): en fazla üç seviyelik kırıntı (orta segment kısalır), sağda üretim tipine göre gruplu santral seçici; fotoğrafı olmayan santral tipografik döşeme alır.

### Tables (`Tablo`, `Matris`, `GenisleyenSatir`)
- Satır bir `<button>`: seçim `aria-pressed`; 2px sol kenar durumun şiddetini taşır, olgunun sözcüğü kendi kolonunda yazar. Zebra yok, satır içi eylem yok. Kolon başlığı 11px mono `.18em`; sıralanabilir başlık dolgusuz düğme.
- **Matris**: hücrede yalnız glif (`Im`, `role="img"` + erişilebilir ad), asla metin; satırın en kötüsü büyür; sakin satır %58 opaklık; C defter matrisi devriktir (satır = kontrol, sütun = santral) ve detay satır içinde açılır.
- **Genişleyen satır**: `<details>`; aynı anda tek aile açık.
- **Dokunma hedefi (WCAG 2.2 · 2.5.8, 24px)**: metin yüksekliğinde duran bağ ve düğmelerin KUTUSU büyütülmez — vuruş alanı `.ab-genis-hedef` ile mutlak konumlu bir sözde öğeye açılır. Yoğunluk, tipografi ve alt çizgi olduğu gibi kalır; ölçülen şey kutu değil vuruş alanıdır. Cümle içindeki bağlar ölçütün kendi "satır içi" istisnasındadır ve büyütülmez.

### Drawer (`Cekmece*`, `.ab-panel`)
400px sabit sağ panel; 42px başlık (kod + kapat), kimlik bloğu (glif + durum SÖZÜ 10px büyük harf — sözcük yalnız burada), alan çiftleri (`dl`), zincir bağlantıları, eylem bloğu + dip not. Esc kapatır, odak panele iner.

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
