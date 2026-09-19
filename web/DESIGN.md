---
name: Uyum ve Yönetişim Platformu
description: Tek koyu kabuk, Saha dili (Barlow Condensed · Inter · JetBrains Mono, bakır aksan), üç yoğunluk (amiral · operasyonel · tezgâh), sekiz kademeli tipografik ölçek, radius 0, saç çizgisiyle kompozisyon, mono/tabular sayı.
colors:
  zemin: "#0F1112"
  panel: "#1D1F20"
  panel2: "#292B2C"
  murekkep: "#EDEEEC"
  i2: "#B9BEBC"
  i3: "#8D9497"
  hr: "#333536"
  hr2: "#3C3E3F"
  aksan: "#C2703E"
  aksan-uzeri: "#0F1112"
  secim: "#171211"
  ok: "#6FA07E"
  md: "#D9A03C"
  bd: "#E07262"
  pl: "#85959C"
  unk: "#8D9497"
  tip-a: "#B7734A"
  tip-b: "#5A87A3"
  tip-c: "#93A6AD"
  tip-d: "#C9A24C"
typography:
  display:
    fontFamily: "Barlow Condensed, Inter, sans-serif"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "var(--gorunum)"
    fontSize: "21px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "var(--ui)"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "var(--ui)"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  metric:
    fontFamily: "var(--veri)"
    fontSize: "21px"
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
    backgroundColor: "{colors.aksan}"
    textColor: "{colors.aksan-uzeri}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "5px 12px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.i2}"
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
    textColor: "{colors.aksan}"
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
    backgroundColor: "{colors.panel2}"
    textColor: "{colors.murekkep}"
  drawer:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.murekkep}"
    width: "400px"
  chip-filter:
    backgroundColor: "transparent"
    textColor: "{colors.i3}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "5px 11px"
  chip-filter-active:
    backgroundColor: "{colors.panel2}"
    textColor: "{colors.murekkep}"
---

# Design System: Uyum ve Yönetişim Platformu

<!-- Güncel tasarım sözleşmesi. Token kaynağı `app/kabuk.css`, ortak
     primitifler `components/kabuk/*.tsx`; doğrulama araçları `arac/`
     altındadır. Frontmatter normatiftir. -->

## Sözcük markası

Ürünün ve kurulumun **adı tasarım sisteminin sabiti değildir**; tek
kaynaktan gelir: `lib/marka.ts` (`MARKA_AD`, `KIRACI_AD`;
`NEXT_PUBLIC_*` ile ezilir). Kabuk sözcük markası iki satırdır — üstte
kurulumun adı (`.marka`, Barlow Condensed 17px, `toLocaleUpperCase('tr-TR')`
ile büyütülür), altta ürünün adı (`.marka .ikinci`, mono, bakır aksan,
CSS `text-transform: uppercase`). Monogram **yoktur** ve üretilmez; logo
gelene kadar sözcük markası tek marka varlığıdır.

Adı değiştirmek tek satırdır ve bu bir kabul kriteridir (P0 ·
URN-KUR-004). Ölçüm davranışsaldır: `npm run marka:kapi` nöbetçi bir
adla statik demo derlemesi koşar ve üretilen çıktıya bakar — varsayılan
ad işlenmiş hiçbir yüzeyde geçmemeli, nöbetçi ise sekme başlıklarında ve
sözcük markasında görünmeli.

Bu belgenin başlığı ve frontmatter'ındaki `name` adı düz metin taşır —
Markdown yapılandırma okuyamaz. Ama **sapamaz**: `tests/marka-adi.test.ts`
her iki satırı `marka.ts`'teki varsayılana karşı ölçer ve eşit
değillerse kırmızı yanıp hangi satırın güncelleneceğini söyler. Aynı
kapı `README.md`'nin H1 başlığını da tutar. Yani ad değişimi hâlâ tek
satırlık bir karardır; belgelerin peşinden gelmesi bir söz değil, bir
testtir.

## Overview

**Creative North Star: "Gece Vardiyasındaki Kontrol Odası"**

Ürün düzenlemeye tabi kuruluşların BT/OT yönetişim konsoludur ve tek
temadır: koyu, tek kabuk. Dili saha odaklıdır: fotoğraf, coğrafya, Barlow Condensed
büyük harf başlık ve bakır aksan. Ayrışma yoğunlukla kurulur — amiral
(ana ekran, Plant 360, portföy), operasyonel (kütükler, kayıtlar) ve
tezgâh (keşif, aktarım, sağlık). Yoğunluk rotadan seçilir
(`components/kabuk/yonler.ts`, `yogunlukSec`).

Her yoğunluk aynı disiplini paylaşır: **radius 0**, saç çizgisiyle kompozisyon
(dolgu ya da gölge değil, 1px kural), mono/tabular sayı, kart-içinde-kart
yok, ikon kütüphanesi yok (monogram ve tipografik glif), donut/radyal
gösterge yok. Ekran olguyu gösterir, yargı vermez: "kritik!" değil, "12 gün
gecikmiş". Bilinmeyen sıfır değildir ve kendi diliminde durur.

**Key Characteristics:**
- Tek koyu kabuk, tek aksan: bakır `--aksan` `#C2703E`; beş alan Saha · Portföy · Uyum · Varlık · Risk
- Yarıçap yok; yalnız durum daireleri ve avatar `50%` (şekil kodlamasının parçası)
- Durum yalnız renkle anlatılmaz: glif ailesi (10px kare) + sözcük + erişilebilir ad
- Sayı her yerde mono/tabular; işlevsel metin (gezinme, kolon başlığı) 11px'in altına inmez
- Kritik bilgi ipucunda yaşamaz; bilinmeyen `—` / "ölçülmedi" olarak yazılır, sıfır değil
- Hareket seyrek ve anlamlı; azaltılmış harekette durur

## Colors

Tek palet `.ab` altında tanımlıdır (`--zemin --panel --panel2 --murekkep --i2
--i3 --hr --hr2 --aksan --aksan-uzeri --secim --ok --md --bd --pl --unk
--tip-a --tip-b --tip-c --tip-d`); Eylül 2026 denetiminden sonra A
(kehribar/Archivo) ve C
(oxblood/Newsreader) paletleri kaldırıldı, Saha (B) paleti tek kaynak oldu.
Yoğunluk (`data-yogunluk="amiral|operasyonel|tezgah"`) renk değil ölçü değiştirir
(`--gutter --ayak-h --durum-h --satir-h`).

### Primary
- **Bakır** (`--aksan` `#C2703E`): seçili satırın sol kenarı, aktif alan sekmesinin alt çizgisi, birincil düğme dolgusu, odak halkası; fotoğraf üstünde işaretçi kenarı. Yazı rengi olarak yalnız `.ab-dugme.satir` bağlantısında. Düğme dolgusu üzerine zemin rengi mürekkep (`--aksan-uzeri` `#0F1112`).

### Secondary
- **Durum ailesi**: `--ok` uygun (`#6FA07E`), `--md` kısmi / uyarı (`#D9A03C`), `--bd` uygunsuz / kritik (`#E07262`), `--pl` planlı (`#85959C`), `--unk` değerlendirilmedi (`#8D9497`). `--bd` prototipte 3,45:1 kalıyordu; ton korunarak 4,76:1'e açıldı — kritik durumun rengi okunamıyorsa kritikliği taşımıyor demektir.

### Tertiary
- **Tip kimlik yuvaları** (`--tip-a` `#B7734A` · `--tip-b` `#5A87A3` · `--tip-c` `#93A6AD` · `--tip-d` `#C9A24C`): tesis tipinin kimliği. Yuvalar **sektörsüzdür** — hangi tipin hangi yuvayı aldığını CSS bilmez, eşleme `components/kabuk/tip.ts` içindedir ve P4'te sektör paketine taşınır. Renk **kimliktir, durum değil**: yalnız işaretçi ölçeğinde (portföy düzlemi, tesis seçici), asla metinde ya da durum yerine.
- **Kapasite dörttür ve bir sınırdır.** Yuvası olmayan tip nötr mürekkebe (`--i2`) düşer; yuva **sarılmaz** — aynı rengi iki tipe vermek "bunlar aynı" demek olurdu ve renk burada kimliktir. Renksiz kalmanın iki ayrı sebebi `/sistem` sayfasında ayrı cümlelerde yazılır (kapasite eksiği ≠ tasarım gereği).

### Neutral
- **Zemin** (`--zemin` `#0F1112`): sayfanın kendisi; soğuk çelik.
- **Panel / panel-2** (`--panel` `#1D1F20` / `--panel2` `#292B2C`): çekmece, ikincil sıra, satır hover ve seçili satır zemini. Panel zeminin bir kademe üstüdür; kart değildir, kenarlığı saç çizgisidir.
- **Mürekkep** (`--murekkep` `#EDEEEC`), **mürekkep-2** (`--i2` `#B9BEBC`, ikincil metin), **mürekkep-3** (`--i3` `#8D9497`, etiket ve kolon başlığı).
- **Saç çizgisi / saç çizgisi-2** (`--hr` `#333536` / `--hr2` `#3C3E3F`): satır ayracı, bölüm kuralı, düğme ve girdi kenarlığı. Kompozisyonun tek çizgi aracıdır.
- **Seçim** (`--secim` `#171211`): açık satırın zemini — aksanın çok soluk tonu.
- **Kaydırma çubuğu** (`--cubuk` `#6A777A`): başparmak rengi. Karar kabuğun kökünde bir kez verilir ve iki kuraldır, çünkü `scrollbar-color` kalıtımlı, `scrollbar-width` değildir: renk `.ab`ten iner, incelik `.ab, .ab *` ile her kaba yazılır (ölçüldü: yalnız `.ab`e yazıldığında şeridin hesaplanan değeri `auto` kalıyordu). Belge kökü (`globals.css`) aynı değeri literal taşır ve bekçi ikisini eşitler. Çubuk bir METİN değil KONTROLDÜR: eşiği 3:1 (ölçüldü: dört zeminde 4,18 / 4,01 / 3,81 / 3,96). `::-webkit-scrollbar` ile renk/boy verilmez — Chromium'da çubuğu örtüşen kipten klasik kipe düşürür ve her platformda kalıcı yer kaplar. Çubuk gizlenmez; tek istisna yatay kayan gezinme sıralarıdır ve listesi bekçide adıyla durur (`tests/bekci/kaydirma-cubugu.test.ts`, URN-CBK-001).

### Named Rules
**The Tek Tema Rule.** Ürün koyudur ve TEK kabuktur. Alanlar arası geçiş "başka bir platform" hissi vermez — ayrışma yoğunlukla (oluk, satır yüksekliği, ayak/durum şeridi) kurulur, palet ya da yazı ailesiyle değil.

**The Renk Tek Kanal Değil Rule.** Durum daima ikinci bir kanalla gelir: glif biçimi, sözcük, uzunluk (tik şeridi) ya da erişilebilir ad. Renk göremeyen okuyucu için 22 ile 4 aynı görünmez.

**The Aksan Seyrek Rule.** Aksan seçimi, aktif öğeyi ve birincil eylemi işaretler; ekranın yüzde birkaçından fazlasını kaplamaz. Metinde aksan kullanılmaz.

**The Aksan Kimlik Değildir Rule.** Aksan bir **durum** rengidir — aktif, seçili, odakta. **Kimlik rengi değildir**; kimlik `--tip-*` yuvalarından gelir. İkisini karıştırmak, bir tesis tipini "aktif" gibi gösterir ve aksanın tek anlamını da tüketir.

> Bu kural bir kez çiğnendi: `JEO` tipi kimlik rengi olarak `--aksan`ı kullanıyordu (P1'de `--tip-a`ya alındı). Kod düzeltildi; kural buraya yazıldı ki birkaç ay sonra "boşta duran güzel bir renk" diye geri gelmesin.

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
**SEKİZ KADEME, HER KADEME TEK ROL** (18 Eyl 2026'da yeniden kuruldu). Ölçek jetondan gelir ve ürünün %98'i jetondan geçer; kalan 11 bildirim baskı puntosu, akışkan `clamp` ya da bilinçli `inherit`tir ve kapıda adıyla beyanlıdır (`tests/bekci/tipografi-olcegi.test.ts`, URN-TIP-001).

- **Dev** (58px, 1) `--t-dev`: tek sayının ekranı taşıdığı yer — panel tepesi.
- **Manşet** (40px) `--t-manset`: pano / kök hata / durum manşeti.
- **Ekran** (A/B 500, 28px, 1.2, **cümle düzeni**) `--t-ekran`: ekran başlığı `.ab-lede h1`; vurgu `<b>` ile 700 ve gerekirse durum rengi. Büyük harf DEĞİLDİR (15 Eyl 2026).
- **Bölüm** (500, 21px, 1.2, `-.01em`) `--t-bolum`: bölüm başlığı `.ab-bolum-basligi`; ölçüt satırı değeri de bu kademededir (mono, tabular) — boy aynı, ROL ailesiyle ayrılır.
- **Başlık** (500, 16px) `--t-baslik`: odak kartı, satır başlığı, lead.
- **Gövde** (400, 13px, 1.6) `--t-govde`: hücre, form alanı, düzyazı, çekmece cümlesi. Düzyazı en fazla bir cümle, 560–620px.
- **Veri** (mono, 11px) `--t-veri`: kolon başlığı `.kolonbas` (`.18em`, büyük harf), kod, sayı, yardımcı metin — 11px zemini buradadır.
- **Etiket** (mono, 10px, `.14em`, büyük harf) `--t-etiket`: YAPISAL KAŞ etiketi `.etiket` — bölüm adı, kolon kaşı; kendi başına bilgi taşımaz. Veri, sayı ve olgu bu kademeye inmez, 11px `--t-veri`de durur.

Komşu kademeler arasındaki oran üste doğru HIZLANIR (1,10 → 1,18 → 1,23 → 1,31 → 1,33 → 1,43 → 1,45) ve bu bir kapıdır: %8'in altında bir adım ekranda ayırt edilmez ve hiyerarşi değil tekrar üretir. Eski ölçekte üç piksel aralığında altı kademe vardı (11 · 12 · 12,5 · 13 · 13,5 · 14) ve tek başına 11px bütün bildirimlerin %44'üydü.

**ÜÇ EKSEN, AYNI DİSİPLİN.** Boy tek başına hiyerarşi kurmaz: harf
aralığı (`--tr-*`) ve satır aralığı (`--lh-*`) de jetondan gelir ve aynı
kapıda ölçülür (üç eksen · sekiz diş). Ölçüldü (18 Eyl 2026): iz ekseni
104 bildirimde **11 benzersiz değer**, satır ekseni 83 bildirimde **25
benzersiz değer** taşıyordu; bugün beşer rol var ve bildirimlerin %100'ü
(iz) ve %94'ü (satır) jetondan geçiyor.

| İz `--tr-*` | Değer | Rol |
| --- | --- | --- |
| `govde` | `0` | normal metin — izsiz |
| `gezinme` | `.06em` | gezinme · düğme büyük harfi |
| `etiket` | `.14em` | kaş etiketi |
| `kolonbas` | `.18em` | kolon kaşı — en geniş, yapısal |
| `manset` | `-.01em` | manşet · başlık — sıkıştırma |

| Satır `--lh-*` | Değer | Rol |
| --- | --- | --- |
| `birim` | `1` | tabular ölçüm — satır aralığı yok |
| `sikisik` | `.85` | büyük manşet sayısı |
| `manset` | `1.2` | ekran ve bölüm başlığı |
| `baslik` | `1.4` | satır ve kart başlığı |
| `govde` | `1.6` | gövde · dipnot · düzyazı |

`1,15` ile `1,2` TEK ROLE indi: aradaki %4'lük fark hiçbir okuyucuya
hiyerarşi anlatmaz — boy ekseninde geçerli olan %8 eşiği burada da
geçerlidir. Satır ekseninin beş bildirimi jetona ZORLANMAZ ve sebebi
sınıfıyla kütüktedir: dördü KUTU GEOMETRİSİDİR (`14px` · `16px`×2 ·
`20px` — sabit yükseklikli rozet ve düğmede dikey ortalama aracı,
tipografik satır aralığı değil), biri ÖLÇÜLMÜŞ BİR KARARDIR (`.92`,
SIS-KBK-031: plaka kimlik başlığında `g · y · ş` kuyruğu alt satıra
girmesin diye `.84`ten çıkarılmıştı; en yakın jeton `.85` o kusuru geri
getirirdi).


### Named Rules
**The İki Taban Rule.** Prototip kolon başlığını 8.5px, ray etiketini 7.5px çiziyordu. Üründe İKİ taban vardır ve ikisi ayrı iş yapar: İÇERİK taşıyan her şey — eylem (düğme), sayı, olgu, ölçüm — en az **11px** (`--t-veri`); yalnız yapısal KAŞ etiketi **10px**'e (`--t-etiket`) inebilir. Ölçüldü (2026-09-02): tek kademedeyken `Çıkış` düğmesi 10px, risk matrisinin hücre sayıları ve portföy künyeleri 9px kalıyordu — hiçbiri dekoratif değil. 9px ve altı üründe yoktur.

**The Büyük Harf Rule.** Büyük harf YAPISAL KAŞA aittir — veriye, ada, cümleye değil.
Kural KABUĞUN KENDİSİNDE de geçerlidir ve orada çiğneniyordu: ölçüldü (18 Eyl 2026), 56px'lik başlık **17 büyük harfli dize** taşıyordu ve altısı DEĞERDİ — üç sektör adı (içerik paketinin kataloğundan gelir), kullanıcının unvanı, arama eylemi, bildirim bağı. Bugün **9**; kaynaktaki kural sayısı **5** ve tavanlıdır (`tests/bekci/kabuk-kromu.test.ts` · altıncı diş): ürün kaşı · birincil gezinme · örnek-veri işareti · "Sektör" kaşı (geniş + dar). Büyük harf bekçisi yalnız ≥13px'e baktığı için barın 10–11px'lik yükünü GÖREMİYORDU; o körlük bu dişle kapandı. Ölçüldü (15 Eyl 2026, odak turu): ana sayfada 83 büyük harfli metin parçasının 24'ü tesis adıydı (20px), 3'ü üretim tipi adı (18px), biri tam bir cümle; portföyde seçili tesis adı 34px, tesis dosyasında 78px büyük harfti. Kaşla aynı sesle konuşan veri, kaşı işlevsiz kılar. Kural iki dişlidir: (1) ad, başlık (h1/h2), cümle, boş durum ve değer hiçbir boyda büyük harf olmaz; (2) **13px ve üstü büyük harf yalnız gezinme ve koddur** (alan sekmesi, ikincil sıra, bölüm seçici, üretim tipi sekmeleri, birim kodu) — izin listesi bekçide adıyla durur ve yalnız küçülür (`tests/bekci/buyuk-harf.test.ts`, URN-KBK-021). Cümle ve sayı taşıyan bir satır `.etiket` değil `.ab-dip`tir.

**The Sayı Mono Rule.** Her sayı `--veri` ailesinde ve `tabular-nums` ile yazılır (`.mono`, `.num`); sağa hizalanır. Serif ya da UI ailesinde sayı yalnız C'nin endeks ölçütünde (oran, adet değil).

## Layout

Masaüstü konsol: doğrulama kapıları 1440 · 1366 · 1280 · 1024 px; 700px
altında hiçbir alan erişilemez olamaz (kapsam çubuğu bilgi gruplarını düşürür,
alan dizisi yatay kayar). **Mobil İKİNCİL hedeftir: çalışır, ama
tasarlanmaz** (ürün sahibi kararı, 16 Eylül 2026; PRODUCT.md · Operating
Context). Yeni bir yüzey mobil için tasarlanmaz; mobilde de kırılmaz ve
erişilemez kalmaz. Bunun ölçülen karşılığı: dokunma hedefi boyu, katlanan
ikincil sıra, dokunulabilir harita, dar bantta sadeleşen ekranlar — ve
**sayfa hiçbir bantta yana kaymaz**: taşma ya bir kaydırma kabına
hapsedilir (üst çubuklar 1100px altında yatay kayar) ya da yerleşim tek
kolona iner. `arac/yatay-tasma.mjs` 375 ve 768'de rota haritasının
tamamını ölçer ve taşmayı üreten öğeyi adıyla yazar; kapsam sayısı
kapının kendi çıktısındadır, buraya elle yazılmaz (eski "38 rota" ölçümle
78'e çıkmıştı ve belge bunu göremiyordu).

- **Kabuk** (`.ab`, satırlar `56px auto 1fr auto auto`): 56px üst çubuk (marka · beş alan sekmesi · arama · kişi · Bildirim/Ayarlar/Yardım · Çıkış) → 36px ikincil sıra (`.ab-ikincil`; alanın bölümleri gruplu, sağda kapsam; Saha'da ve yardımcı rotalarda çizilmez) → `#icerik` → 32px sistem durumu şeridi (`.ab-durum`; veri kesiti, bağlayıcı sayımları, son koşu — yalnız yetkiliye) → 32px ayak (`.ab-alt`; künye · Yardım · Destek · Kısayollar · Tasarım sistemi · telif). Durum ve ayak AYRI şeritlerdir: biri ölçüm, öteki künye.
- **Yoğunluk**: `amiral` (`/`, `/tesisler/*`, `/portfoy`, `/harita`) oluk 0, durum şeridi 26px + ayak ~24px — iki ayrı bölge, BİRLEŞMEZ (ürün sahibi kabulü 2026-09, `Kabuk.tsx`; ölçüldü 15 Eyl 2026: bu satır "durum şeridi yok" derken ekran çiziyordu, belge ekrana uydu); `operasyonel` oluk 24px, satır 36px; `tezgah` satır 32px. Ana ekran 1366×768 / 1440×900 / 1280×800'de tek ekrana sığar (`scrollHeight === innerHeight`).
- **Ölçek**: boşluk `--s2 … --s44` (2·3·4·6·8·9·10·12·14·16·18·20·22·24·26·28·30·32·34·36·40·44px); kolon aralığı 16px; operasyonel oluk 24px; bölüm üst dolgu 22px, alt 40px; çekmece 400px.
- **Tablo**: kütük Faz 3'ten beri semantik `<table class="ab-vt" role="grid">`; `table-layout: fixed`, satır dolgusu `--satir-y` 10px (`.sik` kipinde 7px — tipografi değil dolgu daralır), yatay dolgu 8px, kimlik sütunu 10px ve yapışkan. Başlıkla hücre AYNI sütun modelinden geçtiği için ray ayrışması yapısal olarak mümkün değil; geriye tek karar kalır: 1366px altında ikincil sütun `.ikincil-k` başlıkta ve hücrede birlikte düşer (`display: none`) ve sıralı başlıklar sarar (`white-space: normal`) — kırpmak bilgi kaybettirir, sarmak kaybettirmez. `arac/kolon-hizasi.mjs` üç bantta (1440 · 1366 · 1280) görünen başlık/hücre sayısını, sol kenar hizasını (±1px) ve tablonun kaydırma kabını (`.ab-vt-sar`) aşmadığını ölçer. 700px altında kimlik sütununun sol dolgusu 10 → 8px iner: 335px'lik iç alanda konu sütunu dört satıra kırılıyordu (ölçüldü).
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
- **Şerit kartı** (`.ab-b-serit .kart`; Saha seçicisi ve Tesis 360 kapsam şeridi): iki satırlık ızgara — üst satır fotoğraf bandı (kalan yükseklik, `object-fit: cover`, %82 opaklık + hafif gri, fotoğrafsız tesiste aynı boyda düz panel), alt satır metin bloğu panel zemininde, iki satır: üstte tip · güç solda, skor sağda; ad tam genişlikte; 3px yığın (üç satırlık blok 1366×768'de banda 39px bırakıyordu, ölçüldü). Perde ve çerçeve YOK — ölçüldü (15 Eyl 2026): boydan boya fotoğraf + gradyan perde + kırmızı iç çerçeve, eşit boydaki 24 kartı farklı yükseklikte gösteriyordu. Uygunsuzluk yığın çubuğu, skor rengi ve bağ başlığındaki sözcükle söylenir; fotoğraf hiçbir zaman metnin altına gömülmez.
- **Şerit BANDA BAĞLIDIR** (Saha seçicisi; Tesis 360 kapsam şeridi bağlı DEĞİL): Saha'nın şeridi yalnız `≤1100px`te çizilir, `≥1101px`te gizlidir. Eşik keyfî değil, künyeyi susturan kuralın (`max-width: 1100px`) bitişiğidir — ikisi tek kararın iki yarısıdır: künye nerede susarsa şerit orada konuşur. Ölçüldü (19 Eyl 2026): 1101px'te şeridin sekiz adının sekizi de künyeler (4) ve güçsüz şerit (4) tarafından zaten yazılıyordu — **şeride özgü ad 0**, karşılığında 304k px² ve tek ekran bütçesinden 159px. 1100px'te künye çizilmediği için şerit, en kötü dört tesisin adının okunduğu TEK yüzey — orada **şeride özgü ad 4**. Eşikler ayrışırsa arada adların ekrandan tümüyle kaybolduğu bir pencere açılır; ikisi de kapılıdır (`tests/bekci/saha-serit.test.ts` beşinci diş = bitişiklik; `arac/tuval-kanit.mjs` = iki bantta okunan ad kümesinin eşitliği, gerçek tarayıcıda). Geniş bantta şeridin başlığı da gizlendiği için portföyün sayısı ve güç toplamı takımyıldızın başlığına taşındı.
- **Panel blokları** (`.ab-blok`): boş / hata / yetkisiz durumları; panel zemin + 1px `--hr2`, hata `--bd` kenar; 620px en fazla. Spinner, illüstrasyon, cesaretlendirme yok; iskelet (`Iskelet`) gerçek etiketleri hemen çizer, yalnız değerler blok olur.
- **Kart-içinde-kart yok**; internal dolgu 22px 24px.

### Inputs / Fields (`Alan`, `.ab-alan`, `.ab-gr`)
- **Style:** panel zemin, 1px `--hr2` kenar, 12.5px UI ailesi, `6px 8px`; etiket 10px mono üstte; zorunlu alan mono etiketle işaretlenir.
- **Focus:** aksan odak halkası (global kural).
- **Error:** `.hata` 11px `--bd` tek satır, `aria-invalid`; snackbar ve toast yok.

### Navigation
- **Alan sekmeleri** (`.ab-ust > nav`): beş alan (`ALANLAR`: Saha · Portföy · Uyum · Varlık · Risk), Barlow Condensed **13px** (`--t-govde`) 600 büyük harf. Marka bir kademe ÜSTTEDİR (16px `--t-baslik`) ve barın tek 16px nesnesidir — ölçüldü (18 Eyl 2026): ikisi de 16px'ken 56px'lik barda altı eşit ağırlıklı tipografik nesne vardı ve hiçbiri öne çıkmıyordu. Aktif sekme ÜÇ ipucu taşır (mürekkep · panel zemini · bakır alt çizgi), `aria-current="page"` tekil. Rota → alan eşlemesi `alanSec` (yonler.ts). Bekçi: `tests/bekci/kabuk-kromu.test.ts` (URN-KBK-022).
- **İkincil sıra** (`.ab-ikincil`): alanın bölümleri (`IKINCIL`), gruplar 10px etiketle ayrılır; aktif öğe mürekkep + 500 + bakır alt çizgi, `aria-current="true"`. Sekmede yeri olmayan ekran kendi dizinini (`.ab-c-ekrandizin[data-dizin="ekran"]`) verebilir.
- **Üst bağlar**: Bildirimler · Ayarlar · Yardım · Çıkış; okunmamış bildirim rozeti sayıdır (`99+` tavan, sıfırda rozet yok). Komut paleti Ctrl/⌘+K.
- **Ayak** (`.ab-alt`): İKİ küme, iki soru. Solda KİMLİK (künye · sürüm+ortam · telif) — "bu kurulum nedir"; sağda GEZİNME (Yardım · Destek · Kısayollar · Tasarım sistemi) — "nereye gidebilirim". Kümeleri boşluk ayırır, yeni kutu ya da çizgi değil. Telif kiracı adını ve yılı HESAPLAR (`veri.kiraciAd` · `getFullYear()`); koda gömülmesi kapıyı kırmızı yakar (aynı bekçi + `arac/marka-kapisi.mjs` kiracı nöbetçisi). Bağların alt çizgisi `--hr`de dinlenir, odak ve hover'da bakıra çıkar; 24px dokunma hedefi korunur.
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
- **Do** sektör sözlüğünden gelen bir sözcüğün düştüğü slota `terim-sar` ver. **Terim ürünün sabiti değil, müşteri içeriğidir**: uzunluğunu ve kırılabilirliğini biz seçmiyoruz. Taban `overflow-wrap: break-word` her yerde açık, ama genişliği içeriğinden gelen bir esnek/ızgara izi ancak `min-width: 0` ile daralır — ikisi bir arada olmadan hiçbiri yetmez (ölçüldü). Kırılamayan bir terim düzeni bozmasın, yalnız çirkin görünsün; kalıcı vakası `arac/iki-sozluk.mjs` `stres` sözlüğüdür.
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
- **Don't** `overflow-wrap: anywhere` kuralını kabuğun tamamına verme. Denendi ve düzeni bozdu: min-content tek harfe iner, `/bulgular` 375px'te üst gezinme harf harf alt alta düştü, kolon başlıkları dikey sütuna döndü. `anywhere` yalnız terimin düştüğü slotta (`terim-sar`) ve içeriği zaten uzun olan tekil yerlerde (hash, dosya adı) durur.
