# Son kullanıcı UX denetimi

Bu belge platformun **49 ekranını**, ürünü günlük işini yapmak için
kullanan ve sistemin nasıl yazıldığını bilmeyen bir kişinin gözüyle
denetler. Denetim `docs/MASTER_SCENARIO_REGISTRY.md` kütüğündeki ekran ve
durumları temel alır.

Belge iki bölümdür: önce **bulgular** (UX-NNNN, P0–P3), sonra **ekran ekran
yirmi sorunun cevabı**.

---

## Yöntem — neyin ölçüldüğü, neyin göze bırakıldığı

Bulguların hiçbiri "bence" değildir; her biri ya tarayıcıda ölçülmüş ya da
ekran görüntüsünde işaretlenmiştir. Ölçüm araçları repoda durur ve tekrar
koşturulabilir:

| Araç | Ne ölçer | Koşum |
| --- | --- | --- |
| `arac/ux-denetim.mjs` | Gizli kırpma · iş yüzeyi derinliği · yer tutucu · kart ızgarası · küçük dokunma hedefi · başlık kademesi | `PORT=3210 node arac/ux-denetim.mjs` |
| `arac/cekmece-erisim.mjs` | Çekmecede odak tuzağı · `role`/`aria-modal` · ESC · kapanışta odak · iş yüzeyini örtme | `PORT=3210 node arac/cekmece-erisim.mjs` |
| `arac/yatay-tasma.mjs` | Sayfa düzeyinde yatay kayma | `PORT=3210 npm run tasarim:tasma` |
| `arac/erisim.mjs` · `arac/erisim-axe.mjs` | Odak halkası · klavye · azaltılmış hareket · renk dışı kanal · WCAG kuralları | `PORT=3210 npm run tasarim:erisim` |
| `arac/kare.mjs` | Ekran görüntüsü (göz denetimi) | `PORT=3210 EN=1440 YOLLAR=… node arac/kare.mjs` |

**Bantlar.** 1440×1080 · 1440×900 · 1366×768 · 1280×800 · 1199 · 1100 ·
1024 · 768 · 375. 49 rota × 9 bant = **441 ölçüm**, hatasız. Denetim
sırasında bulunan 50. rota (UX-0015) ayrıca ölçüldü.

**Dokunmatik ayrımı.** 700px'in altındaki bantta çubukların yatay kayması
KUSUR DEĞİLDİR ve öyle işaretlenir: parmakla kaydırmak keşfedilmesi gereken
bir jest değil, beklenen jesttir. Aynı davranış masaüstünde — kaydırma
çubuğu gizliyken — kusurdur, çünkü fare kullanan biri orada bir şey
olduğunu göremez. Bu ayrım `arac/yatay-tasma.mjs` içindeki kuralla aynıdır.

**Ölçülemeyen ölçülmedi diye yazılır.** Bir metrik (aynı sayının ekranda
tekrarı) iki turda gürültü verdi; üçüncü turda ekran künyesine daraltıldı
ve gövdedeki tekrarlar göz denetimine bırakıldı. Araç bunu kendi başlığında
yazar. Ölçemediğini ölçüyormuş gibi gösteren bir sayı bu belgede yoktur.

**Neyin denetlenmediği.** `/sistem` ve `/sistem/bilesenler` ekranlarının
okuru geliştiricidir (tasarım sistemi ve primitif galerisi); bu ikisi son
kullanıcı ekranı sayılmaz ve yoğunluk ölçütleriyle yargılanmaz. Yine de
kabuk kuralları (gezinme, erişilebilirlik, taşma) onlarda da geçerlidir ve
ölçülmüştür.

---

## Bulgular

| Kimlik | Önem | Ekran | Kusur | Durum |
| --- | --- | --- | --- | --- |
| UX-0001 | **P0** | Kabuk · Uyum alanı | İkincil gezinme sırası 1440px'te üç ekranı gizliyor | kapatıldı |
| UX-0002 | **P1** | Kabuk · üst çubuk | Arama · bildirim · hesap/çıkış 807px altında ekran dışında | kapatıldı |
| UX-0003 | **P1** | Çekmece (10 ekran) | Panel doklu değil, iş yüzeyinin kimlik kolonlarını örtüyor | kapatıldı |
| UX-0004 | **P1** | `/kesif` | İş yüzeyi 1518px derinde · 2×7 kart ızgarası · iki form kuyruğun üstünde | kapatıldı |
| UX-0005 | **P1** | `/envanter` | Açılışta ekranın çoğu boş sütun ve yönerge | kapatıldı |
| UX-0006 | **P1** | 8 ekran | Sayfanın H1'i cümle değil, parça | kapatıldı |
| UX-0007 | **P2** | Kabuk · ayak | Ayak bağları 14px — 24px'lik dokunma hedefinin altında | kapatıldı |
| UX-0008 | **P2** | `/topoloji` tuval | Sonsuz akış animasyonu azaltılmış harekette durmuyor | kapatıldı |
| UX-0009 | **P2** | `/riskler` | Çekmece 1280px'te tablonun %42'sini örtüyor | kapatıldı (UX-0003 ile) |
| UX-0010 | **P2** | `/esleme` · `/saglik/reddedilenler` bağı | "connector" · "ölü mektup" · "legal hold" son kullanıcı metninde | kapatıldı |
| UX-0011 | **P2** | `/yonetim-tezgahi` | H1 ölçüyle sloganı tek cümlede birleştiriyor | kapatıldı |
| UX-0012 | **P3** | `/kesif` | "28 kayıt" künyede dört kez | kapatıldı (UX-0004 ile) |
| UX-0013 | **P3** | `/dokumanlar` | Boşluk listesi katlanamıyor · "9 karşılıksız" üç yerde | kapatıldı |
| UX-0014 | **P3** | `/prosesler` | H1 sözdizimi bozuk | kapatıldı |
| UX-0016 | **P2** | Kabuk · ayak | 375px'te dört ayak bağı tamamen kırpılıyordu | kapatıldı |
| UX-0017 | **P3** | `/saglik` kip çubuğu | 768px'te beşinci kip gizli kaydırmanın ardında | kapatıldı |
| UX-0018 | **P1** | `/api-sozlesmesi` · `/saklama` | Tablo `role="grid"` diyor ama klavyeyle girilemiyor | kapatıldı |
| UX-0019 | **P1** | `/zimmetlerim` | Süzgeç şeridi sekme rolü taşıyor; tabpanel de gezinen odak da yok | kapatıldı |
| UX-0020 | **P2** | `/api-sozlesmesi` · `/saklama` | Seçilemeyen satır tıklanabilir görünüyor | kapatıldı |
| UX-0015 | **P1** | `/degerlendirme-aktarim` | Ekran bütün kalite kapılarının dışındaydı | kapatıldı |

---

### UX-0001 · P0 · Uyum alanının üç ekranı 1440px'te ulaşılamıyordu

**Ölçüm.** 1440px pencerede `/uyum` alanının ikincil gezinme sırası 1699px'e
uzuyor; son üç bağ — "Denetim izi" (sağ kenar 1476), "Saklama ve imha"
(1594), "Eğitim kütüğü" (1699) — ekranın dışında kalıyordu.

**Niçin kusur.** Sıra `overflow-x: auto` ile teknik olarak kayıyordu ama
`scrollbar-width: none` yüzünden ekranda hiçbir ipucu yoktu. Fare kullanan
bir kişi o üç ekranı bulamıyordu: **üç ekran, keşfedilemediği için yok
gibiydi.** Yatay taşma kapısı bunu göremiyor, çünkü kırpma sıranın kendi
kabında oluyor ve `documentElement.scrollWidth` büyümüyor.

**Çözüm.** Sıra masaüstünde SARAR (`flex-wrap: wrap` + `min-height`).
Dokunmatik bantta (≤700px) yatay kaydırma korunur. `tests/kabuk-gezinme.test.ts`
kuralı dondurur: gizli kaydırma çubuğuna geri dönülemez, sabit yükseklik
konulamaz, sarma iki satırı aşamaz. Üçüncül sıra saramadığı için ayrıca
"1024px'te sığar" ölçüsü alınır.

**Kapatıldı.** `app/kabuk.css` · `tests/kabuk-gezinme.test.ts` ·
senaryolar `SIS-KBK-010…017`.

---

### UX-0002 · P1 · Arama, bildirim ve çıkış dar masaüstünde ekran dışında

**Ölçüm.** Üst çubuğun sağ ucu (`.ab-ust > .sag`: arama · bildirim ·
hesap menüsü) 807px'lik doğal enini koruyor. Pencere daraldıkça:

```
 860px → sağ kenar  860 · ekran dışı hayır
 820px → sağ kenar  820 · ekran dışı hayır
 800px → sağ kenar  807 · ekran dışı   7px
 768px → sağ kenar  807 · ekran dışı  39px
 720px → sağ kenar  807 · ekran dışı  87px
```

`.ab-ust` 1100px'in altında `overflow-x: auto; scrollbar-width: none`
oluyor. Marka sola yapışkan kalıyor ("çıkış kapısı kaybolmasın" gerekçesiyle)
ama **çıkış kapısı markada değil, hesap menüsünde.**

**Niçin kusur.** 768px görev listesindeki zorunlu bantlardan biridir ve
kabul ölçütü "kırpılmış kritik bilgi: 0"dır. Arama, okunmamış bildirim
sayacı ve çıkış kritik kontrollerdir. UX-0001'le aynı ailedendir: kayan
ama ipucu vermeyen bir şerit.

**Çözüm.** Marka sola yapışkan olduğu gibi sağ öbek de sağa yapışkan
oldu; ortadaki alan sekmeleri ikisinin arasında kayar.

**Kapatıldı.** Ölçüldü: 1100 · 1024 · 960 · 900 · 860 · 820 · 800 · 768 ·
720px — hiçbirinde ekran dışı yok.

---

### UX-0003 · P1 · Çekmece doklu değildi, iş yüzeyini örtüyordu

**İlk ölçüm YANLIŞ YORUMLANDI — bu, denetimin kendi kaydıdır.**
`arac/cekmece-erisim.mjs` ilk sürümü `role="dialog"`, `aria-modal="true"`
ve odak tuzağı arıyordu; bulamayınca on ekranı birden kusurlu saydı.
Oysa `components/kabuk/panel.tsx` bu paneli BİLEREK modal yapmıyor ve
gerekçesini yazıyor: *"okuyucu kütüğü/tuvali GÖRMEYE DEVAM EDER"*. Böyle
bir panelde `aria-modal="true"` yazmak YALAN olurdu (arka plan atıl
değil) ve odak tuzağı, tasarımın okunur bıraktığı tabloya klavyeyle
ulaşmayı ENGELLERDİ. Yanlış olan ekranlar değil, aracın varsayımıydı;
araç düzeltildi ve artık modal işaretlerinin YOKLUĞUNU doğruluyor
(yarım modal — üçünden ikisi — hâlâ kusur).

**Asıl kusur ise gerçekti: panel sözünü tutmuyordu.** `position: fixed`
olduğu için gövde daralmıyor, panel içeriğin ÜSTÜNE biniyordu. Ölçüm
(1440px, kaydın KİMLİK kolonları = ilk iki kolon):

| Bant | Kimlik kolonu örtülen ekran |
| --- | --- |
| 1440 | **7 / 10** (`/riskler`, `/olaylar`, `/omur`, `/yedekleme`, `/tedarikciler`, `/denetimler`, `/projeler`) |
| 1280 | 3 / 10 |
| 1024 | 3 / 10 |

Kusur geniş ekranda daha ağırdı: tablo genişledikçe ilk iki kolon da
sağa uzuyor ve 400px'lik şeridin altına giriyordu. Kullanıcı panelde
incelediği satırı listede bulamıyordu — "maksimum bağlam korunumu"nun
tam tersi.

**Çözüm.** Panel artık gerçekten DOKLU: `.ab:has(.ab-panel)` ile içerik,
durum şeridi ve ayak panelin enini boş bırakır, tablo kalan ende yeniden
akar. `/envanter` bunu zaten böyle yapıyordu (`.ab-a-calisma` ızgarasında
panel gerçek bir sütun); gramer birleşti. 1024'ün ALTINDA panel bilerek
tam eni kaplar: o bantta tabloya kalan 368px kolon başlıklarını bile
taşımaz, kullanıcı tek seferde tek şeye bakar.

**Kapatıldı.** Ölçüldü: 1440 · 1280 · 1024 · 900 · 768 · 375
bantlarında kimlik kolonu örtülmüyor, 10/10 çekmece temiz.

---

### UX-0004 · P1 · `/kesif` iş yüzeyi üç ekran aşağıda

**Ölçüm.** 1440×1080'de inceleme kuyruğunun tablosu sayfanın **1518px**
altında başlıyor — ölçülen 49 rotanın (geliştirici ekranı hariç) en
derini. Kuyruğun üstünde sırasıyla:

1. beş aşamalı tezgâh hattı,
2. **17 düğmelik santral süzgeci** (iki satır),
3. **yedi kutuluk kart ızgarası** — iki sütun, dört satır, ~560px; dördü
   sıfır sayılı ve yine de tam paragraflı,
4. "Bu ürün ağa paket atmaz" politika bloğu,
5. "Dışa aktarım yükle" açılırı,
6. iki yükleme formu ("Pasif gözlem yükle", "OUI kütüğü yükle"),
7. eşleştirme notu, toplu karar tepsisi, mercek şeridi.

Kart ızgarası platformdaki **tek** kart ızgarasıdır: `arac/ux-denetim.mjs`
49 rotayı taradı ve iki sütun × dört kutu kalıbını yalnız burada buldu.

**Niçin kusur.** Görev listesi "generic SaaS card grid YASAK · kart sayısını
artırarak sorun çözme" diyor. Ayrıca kullanıcı bu ekrana kuyruğu incelemek
için gelir; iki veri giriş formunun kuyruğun ÜSTÜNDE durması, seyrek yapılan
bir işi her ziyarette önüne koymaktır.

**Çözüm.** Yedi grup, kart ızgarasından süzgeç şeridine indi (sayı + ad +
durum glifi); gerekçe metni SİLİNMEDİ — grup seçilince şeridin altında tek
satır olarak yazılır, seçilmeden `title` ile durur. Politika sözü bir
cümleye indi ve yapılmayan işlemler düğmenin ardına geçti. İki yükleme
formu kuyruğun ALTINA indi: seyrek yapılan iş, her ziyarette önde durmaz.
Dipnottaki dört sayı da metrik bandıyla çakışıyordu; yalnız metrik
bandının söylemediği iki şey kaldı.

**Kapatıldı.** İş yüzeyi **1518px → 692px**. Sayfa boyu 2309 → 1660px.
Platformdaki tek kart ızgarası kalktı.

---

### UX-0005 · P1 · `/envanter` açılışta kendi verisini göstermiyor

**Ölçüm.** Varsayılan görünüm "İlişki görünümü". Seçim yokken yedi
halkanın **dördü** ("Zafiyet", "Risk", "Kontrol", "Proje / CAPA") boş ve
her biri "VARLIK SEÇİN" yazıyor; sağdaki 400px'lik panel "SEÇİLİ DÜĞÜM ·
YOK" başlığıyla aynı yönergeyi ikinci kez veriyor ("Zincirde ya da tabloda
bir varlık seçin"), üçüncüsü zincirin altında duruyor. 1440px'te ekranın
büyük bölümü boş sütun ve yönergedir.

**Niçin kusur DEĞİL olduğu kısım.** Boş halkaların sahte veriyle
doldurulmaması DOĞRUDUR ve korunmalıdır ("sahte bir zincir çizilmez").
Kusur dürüstlükte değil, YOĞUNLUKTA: doğru olan şey ekranın yarısını
kaplıyor.

**Çözüm.** Seçim yokken (a) dolmayan dört halka tek bir dar bekleme rayına
indi ve yönerge BİR kez yazılıyor, (b) bağlam paneli hiç çizilmiyor —
bağlamı olmayan bir bağlam paneli 400px tutmamalı. Dolan üç halka boşalan
eni aldı. Seçim yapılınca yedi halka ve panel geri geliyor; boş halkalar
o zaman "bağlı kayıt yok" diyor — bir ÖLÇÜM sonucu, yönerge değil.

**Kapatıldı.** Ölçüldü: seçimsiz 3 halka + 1 ray, panel yok; seçimli 7
halka + panel. Sayfa boyu 1180 → 1000px, tuval 1016 → 1392px.

---

### UX-0006 · P1 · Sekiz ekranın H1'i cümle değil, parça

**Ölçüm.** Sayfanın `h1` metni (tarayıcıdan okundu):

| Ekran | H1 | Künye (eyebrow) |
| --- | --- | --- |
| `/egitimler` | "kütüğü" | UY-66 · Eğitim |
| `/sayim` | "sayımı" | OT-55 · Envanter |
| `/tasinabilir-medya` | "medya" | OT-57 · Taşınabilir |
| `/yedek-parca` | "yedek parça" | OT-56 · Kritik |
| `/gozden-gecirme` | "hiç yapılmadı gözden geçirme" | UY-65 · Yönetim |
| `/zimmetlerim` | "bekleyen yok bana atanan varlıklar" | OT-09b · Zimmet |
| `/denetci-erisimi` | "0 açık erişimi" | UY-57 · Dış denetçi |
| `/saklama` | "%0 ve kontrollü imha" | UY-56 · Saklama |

**Niçin kusur.** Bu ekranlar ismin başını künyeye, sonunu H1'e koyuyor ve
okuyucunun ikisini birleştirmesini bekliyor. Oysa H1 tek başına durur:
ekran okuyucunun sayfa başlığı odur, arama sonucunda o görünür, ekranı ilk
kez açan kişinin gözü oraya düşer. "Kütüğü" bir başlık değildir. İki ekranda
(`/gozden-gecirme`, `/zimmetlerim`) ayrıca sözcük sırası bozuk. FAZ M
"Türkçe: doğal, kısa, kurumsal, tutarlı" diyor.

Ayrıca künyedeki `UY-66`, `OT-55` gibi ister kodları son kullanıcının
sözlüğünde yoktur; kodun yeri ürün belgesidir, ekranın künyesi değil.

**Çözüm.** Sekiz ekranın H1'i tek başına okunan cümlelere çevrildi; ister
kodları künyeden düştü (`/api-sozlesmesi`, `/prosesler`, `/tabanlar` dâhil
üç künye daha). `tests/ekran-basligi.test.ts` kuralı dondurur: vurgusuz
kalabilen bir başlık cümle parçası olamaz, künyede `UY-`/`OT-` kodu geçemez.

**Kapatıldı.** `SIS-BSL-001` · `SIS-BSL-002`.

---

### UX-0007 · P2 · Ayak bağları 24px'lik hedefin altında

**Ölçüm.** 49 rotanın hepsinde ayaktaki "Yardım · Destek · Kısayollar ·
Tasarım sistemi" bağları 36×14, 50×14 ve 81×14 piksel. WCAG 2.2'nin
2.5.8 ölçütü 24×24 ister.

**Çözüm.** Bağlar `inline-flex` + `min-height: 24px` oldu; alt çizgi kutuya
değil metne bağlandı. Ayak amiral yoğunlukta 22 → 25px.

**Kapatıldı.** Ölçüldü: 36×24 · 36×24 · 50×24 · 81×24.

---

### UX-0008 · P2 · Akış animasyonu azaltılmış harekette durmuyor

**Ölçüm.** `app/kabuk.css` içinde `prefers-reduced-motion: reduce` bloğu
`.ab-tara::after`, `.ab-halka` ve `.ab-b-takim .halka` animasyonlarını
durduruyor. `.ab-tuval .kenar.akis` (topoloji tuvalindeki sonsuz akış,
`animation: ab-akis 2.4s linear infinite`) listede YOK.

**Niçin kusur.** Kendiliğinden başlayan ve beş saniyeden uzun süren
hareket, azaltılmış hareket isteyen kullanıcı için durdurulabilir olmalıdır.

**Çözüm.** `.ab-tuval .kenar.akis` azaltılmış hareket bloğuna alındı;
açılır oku dönüşü ve fotoğraf soluklaşmaları da aynı blokta durduruldu.
Kenar görünür kalır, yalnız akışı durur — çizginin kendisi bir veridir.

**Kapatıldı.**

---

### UX-0009 · P2 · `/riskler` çekmecesi tabloyu örtüyor

**Ölçüm.** 1280px'te 400px'lik çekmece risk tablosunun **%42'sini**
örtüyor (ölçülen 10 çekmeceden yalnız burada %40 eşiği aşıldı; sebep risk
tablosunun sağ kolonlarının geniş olması).

**Niçin kusur.** "Maksimum bağlam korunumu" seçili kaydı incelerken
listenin okunur kalmasını ister. Yarıya yakını örtülen bir tablo bağlam
sağlamaz.

**Çözüm.** UX-0003'ün doklu panel çözümüyle birlikte kapandı: panel artık
tablonun üstüne binmiyor, gövde daralıyor. Ham örtme yüzdesi de anlamlı
bir ölçü olmadığı için araçta KİMLİK KOLONU ölçüsüyle değiştirildi —
400px'lik bir panel her ekranda tablonun benzer bir dilimini kaplar; asıl
soru kaydın kimliğinin okunur kalıp kalmadığıdır.

**Kapatıldı.**

---

### UX-0010 · P2 · İki geliştirici terimi ekranda

**Ölçüm.**

| Yer | Metin |
| --- | --- |
| `/esleme` H1 ve süzgeç | "6 **connector** gömülü eşlemeyle koşuyor" |
| `/esleme` kolon başlığı | "**Connector** tipi" |
| `/kesif` boş durumu | "…ya da bir **connector** çalıştırın" |
| `components/kabuk/ekran.tsx:139` | "Reddedilen kayıtlar (**ölü mektup**) →" |

Ürün aynı şeye durum şeridinde **"bağlayıcı"** diyor. Yani terim ürünün
kendi içinde tutarsız. "Ölü mektup" ise bir kuyruk terimidir; son kullanıcı
sözlüğünde yoktur.

**Çözüm.** "connector" → "bağlayıcı" (dokuz yerde: H1, iki kolon başlığı,
iki form etiketi, dört boş/açıklama metni); "ölü mektup" bağ metninden
düştü; `/saklama`'da "Hukuki muhafaza (legal hold)" → "Hukuki muhafaza".
Jargon kapısının sözlüğü dördüyle genişletildi ve `components/` dizini de
taranıyor.

**Kapatıldı.** `SIS-DIL-001`.

---

### UX-0011 · P2 · `/yonetim-tezgahi` başlığı iki şeyi birden söylüyor

**Ölçüm.** H1: "Kapsama 72/72 Yapılandırılabilir alanlar tek konsoldan:
doğrudan, onaylı ya da kodda". Bir ölçü (72/72) ile bir tanım cümlesi tek
başlıkta birleşmiş.

**Çözüm yönü.** Ölçü metrik bandına, tanım künye altına; H1 tek bir şey
söyler.

---

### UX-0012 · P3 · `/kesif` künyesinde aynı sayı dört kez

**Ölçüm.** "28 kayıt" — künyede ("pasif kaynaklar · 28 kayıt"), özet
başlığında ("Keşif özeti · 28 kayıt"), dışa aktarım cümlesinde ("ekranda
görünen 28 kaydı taşır") ve tablo dipnotunda ("28 keşif kaydı"). Bekleyen
sayısı da üç yerde ("23 karar bekliyor" metrik + dipnot, "18 inceleme
bekliyor" özet).

**Not.** UX-0004'ün çözümüyle birlikte doğal olarak kapanır.

---

### UX-0013 · P3 · `/dokumanlar` boşluk listesi katlanamıyor

**Ölçüm.** Tablo 745px derinde; üstündeki boşluk bloğu 1 + 8 satır. Aynı
gerçek üç yerde: metrik ("Karşılıksız kontrol 9/25"), blok başlığı ("Kontrol
karşılığı · 9 / 25 eksik") ve iki alt başlık (1 + 8).

**Not.** Blok İÇERİK taşır (hangi kontrol, hangi belge) — silinmez.
Katlanabilir olması ve üçlü sayımın tekleşmesi yeter.

---

### UX-0014 · P3 · `/prosesler` başlığının sözdizimi

**Ölçüm.** H1: "0 bağ tek nokta ve yedeksiz". Okunması "0 bağ tek nokta ve
yedeksiz" — vurgu ("0 bağ") ile gövde arasında bağlaç yok.

---

### UX-0015 · P1 · Bir ekran bütün kapıların dışındaydı

**Ölçüm.** `/degerlendirme-aktarim` Uyum alanının ikincil gezinmesinde
duruyor, sayfası var ve çalışıyor — ama `arac/rotalar.json` içinde YOKTU.
O dosya, tarayıcı isteyen bütün kapıların (yatay taşma, axe, rota dumanı,
UX denetimi, görsel regresyon) okuduğu tek listedir.

**Niçin kusur.** Listede olmayan ekran hiçbir kapıdan geçmez. Bu ekran
sessizce denetim dışında kalmıştı; kaç sürümdür öyle olduğu ölçülemez.
Kusurun kendisi bir ekranda değil, ÖLÇÜM AĞINDA bir deliktir — ve o delik
her yeni ekranda tekrar açılabilirdi.

**Çözüm.** Rota envanterine eklendi ve ölçüldü (1440×1080 · 1440×900:
gizli kırpma yok, sayfa kayması yok). `tests/kabuk-gezinme.test.ts`
(`SIS-KBK-018`) artık `app/` altındaki her kabuklu statik sayfanın
envanterde olmasını şart koşuyor; `(giris)` grubu (kabuksuz, oturumsuz:
`/giris`, `/bakim`), `api/` ve `[dinamik]` rotalar yapısal olarak dışarıda
ve gerekçesi testte yazılı.

**Kapatıldı.** `arac/rotalar.json` · `tests/kabuk-gezinme.test.ts`.

---

### UX-0016 · P2 · 375px'te dört ayak bağı tamamen kırpılıyordu

**Ölçüm.** `.ab-alt` `white-space: nowrap` + `overflow: hidden` idi ve
içeriği 375px'lik ekranda **737px** tutuyordu. Yardım, Destek, Kısayollar
ve Tasarım sistemi kaydırılamıyordu, KESİLİYORDU: telefonda o dört ekrana
ayaktan ulaşmanın hiçbir yolu yoktu.

Bu, UX-0001 ve UX-0002 ile aynı aileden ama daha ağır: orada içerik kayan
bir kapta duruyordu (ipucusuz ama ulaşılabilir), burada tamamen kesiliyordu.

**Çözüm.** Ayak dokunmatik bantta SARAR. İki satır 24px daha yer alır;
dört bağın yok olmasından iyidir. Görev listesinin kabul ölçütü de bunu
ister: "mobilde bilgi kaybı 0".

**Kapatıldı.** Ölçüldü: 375px'te içerik 737 → 375px, dört bağ da görünür.

---

### UX-0017 · P3 · `/saglik` kip çubuğunun beşinci kipi 768px'te gizliydi

**Ölçüm.** `.ab-ikili` (kip çubuğu) `overflow-x: auto; scrollbar-width:
none` idi. `/saglik`'ın beş kipi 768px'te 775px tutuyor ve "Kurulum
hazırlığı" gizli kaydırmanın ardında kalıyordu.

**Çözüm.** İkincil gezinme sırasıyla aynı kural: masaüstünde SARAR, yatay
kaydırma yalnız dokunmatik bantta kalır.

**Kapatıldı.** Ölçüldü: 768px'te içerik 775 → 718px.

---

### UX-0018 · P1 · İki tablo `role="grid"` diyordu ama klavyeye kapalıydı

**Ölçüm.** `role="grid"` bir SÖZDÜR: "buraya Tab ile girilir, ok
tuşlarıyla gezilir". `components/kabuk/tablo.tsx` bu rolü koşulsuz
basıyor, gezinen odağı (`tabIndex` 0/−1) ise yalnız satır seçilebilir
olduğunda basıyordu. Seçilemeyen iki tabloda — `/api-sozlesmesi` ve
`/saklama` — ızgarada **tek bir odak durağı yoktu**: ekran okuyucuya
verilen söz tutulmuyordu.

**Bu ölçümün kendi hikâyesi de var.** `arac/erisim.mjs` bu kusuru
bulabilmek için önce KENDİSİ düzeltildi: kendi giriş kopyasını taşıyordu
ve ortak katmandaki (değeri doğrulanmış) giriş düzeltmesini almadığı için
hidrasyon yarışına düşüp zaman aşımına uğruyordu — araç hiç koşmuyordu.
Koşar hâle geldiğinde ise ilk raporu YANLIŞTI: `tabindex="-1"` taşıyan
her şeyi suçlayıp ürünün bütün tablolarını kusurlu saydı. Oysa o tablolar
gezinen odak kalıbını doğru kuruyor; ölçüldü (`/riskler`): 46. Tab
durağında ızgaraya girildi, ArrowDown/ArrowUp satır değiştirdi, Enter
çekmeceyi açtı ve odak panele geçti. Yanlış olan ekranlar değil kuraldı.
Kural düzeltildikten sonra kalan üç bulgu gerçekti.

**Çözüm.** `role="grid"` yalnız seçilebilir tabloda basılıyor; seçilemeyen
tablo `<table>`ın kendi semantiğiyle (`role="table"`) kalıyor.

**Kapatıldı.** `SIS-ERS-003`.

---

### UX-0019 · P1 · `/zimmetlerim` süzgeci sekme rolü taşıyordu

**Ölçüm.** `role="tablist"` + `role="tab"` kullanılıyordu ama ne
`tabpanel` vardı, ne gezinen odak; `aria-selected` de düz bir `<button>`
üzerinde geçerli değildir. Bunlar sekme değil SÜZGEÇti — sınıf adı bile
`ab-filtre`.

**Çözüm.** Ürünün her yerindeki mercek grameri uygulandı: `role="group"` +
`aria-pressed`. Bir kapı artık `role="tablist"` kullanan her dosyada
`role="tabpanel"` de arıyor.

**Kapatıldı.** `SIS-ERS-003`.

---

### UX-0020 · P2 · Seçilemeyen satır tıklanabilir görünüyordu

**Ölçüm.** `.ab-vt tbody tr { cursor: pointer }` koşulsuzdu; seçilemeyen
tabloların satırları da tıklanabilir görünüyor ama hiçbir şey yapmıyordu.

**Çözüm.** İmleç `role="grid"` koşuluna bağlandı — yani satırın gerçekten
seçilebilir olmasına.

**Kapatıldı.** `SIS-ERS-002`.

---

## Ölçülen ve TEMİZ çıkan kapılar

Bu başlık, denetimin neyi bulamadığını da yazmak içindir; "hiçbir şey
bulunamadı" ile "bakılmadı" aynı şey değildir.

| Ölçüt | Sonuç |
| --- | --- |
| Sayfa düzeyinde yatay kayma | **0** — 441 ölçümün hepsinde |
| Ölçüm hatası / açılmayan rota | **0** |
| Sayfada birden çok `h1` | **0** — 49 rotanın hepsinde tam bir tane |
| Atlanan başlık kademesi (h2→h4) | **0** |
| Kart ızgarası | **1** — yalnız `/kesif` (UX-0004) |
| Künyede sayı tekrarı (ölçülen bant) | **0** |
| Çekmecede ESC | **10/10** |
| Çekmecede kapanışta odak geri dönüşü | **10/10** |
| Çekmecede erişilebilir ad | **10/10** |
| Jargon taraması (`SIS-DIL-001`) | temiz · sözlük dört sözcükle genişletildi |
| axe (wcag2a + wcag2aa) | **51 rota · ciddi/kritik ihlal 0 · diğer 0** |
| `erisim.mjs` (odak halkası · klavye · azaltılmış hareket · renk dışı kanal) | **50 rota · 0 kusur** |
| Çekmece (ESC · odak · ad · kimlik kolonu) | **10/10 temiz** · 1440 · 1280 · 1024 · 900 · 768 · 375 |
| Duyarlılık süpürmesi (`tasarim:ux`) | **450 ölçüm · 0 kusur** |

**Bilinmeyen semantiği (soru 14) platformun en güçlü yanıdır** ve hiçbir
ekranda bozulmuş bulunmadı: "ölçülmedi" sıfır olarak gösterilmiyor,
"yapılandırılmamış" hata sayılmıyor, "bayat" canlı denmiyor. Ekranların
çoğunda bu ayrım metinle de yazılıyor ("güven ölçülmedi", "periyot tanımlı
değil", "anlık yok — topoloji hiç ölçülmedi", "kapsam sıfırsa oran
ölçülmedi"). İlgili kütük senaryoları ve testleri bunu dondurur.

---

## Ekran ekran — yirmi sorunun cevabı

Sorular her ekran için aynıdır:

1. Kullanıcının temel amacı · 2. İlk 3 saniyede anlaması gereken ·
3. İlk eylem · 4. En önemli bilgi · 5. Gereksiz bilgi ·
6. Tekrarlanan bilgi · 7. Yanlış hiyerarşideki bilgi · 8. Teknik/jargon
metin · 9. Bulunması zor aksiyon · 10. Gereksiz sayfa geçişi ·
11. Çekmece/satır içi yapılabilecek işlem · 12. Ana yüzeyden çıkarılabilecek
detay · 13. Boş/hata/yükleme durumu · 14. Bilinmeyen semantiği ·
15. Bağlam kaybı · 16. Süzgeç sonrası konum · 17. Geri dönüş yolu ·
18. Görsel gürültü · 19. Tablo yoğunluğu · 20. Kart/metrik tekrarı.

Cevap "—" ise o soruda bulgu yoktur. Bulgu varsa UX kimliği yazılır.

---

### SAHA

#### `/` — Saha · grup durumu ve öncelikler

1 Grubun bugünkü durumunu ve nereye bakması gerektiğini görmek ·
2 Hangi santralde ne ters gidiyor · 3 Öncelik şeridinden bir maddeye
girmek · 4 Öncelik listesi ve santral şeridi · 5 — · 6 — · 7 — ·
8 — · 9 — · 10 — · 11 — · 12 — · 13 Boş durum "ölçülmedi" diyor,
sıfır demiyor · 14 Doğru: "Eğilim · kayıt yok", "Geri yükleme testi kaydı
bulunamadı" · 15 — · 16 Santral seçimi şeritte işaretli kalıyor ·
17 Marka bağı her ekrandan buraya döner · 18 — · 19 Tablo yok ·
20 —

**Not.** Santral şeridi yatay kayar ama kenarında soluklaşma perdesi
(`::after` gradyanı) vardır; ipucu görünür olduğu için UX-0001 ailesinden
DEĞİLDİR — ölçüm bunu ayırt eder.

#### `/tesisler` — Enerji portföyü · 16 santral · 643 MWe

1 Santralleri karşılaştırmak · 2 Hangi santral kurulu güç ve durum
olarak nerede · 3 Bir santrale girmek · 4 Santral künyeleri ve güç ·
5 — · 6 — · 7 — · 8 — · 9 — · 10 — · 11 — · 12 — · 13 — ·
14 Doğru · 15 — · 16 — · 17 — · 18 — · 19 Tablo yok · 20 —

---

### PORTFÖY

#### `/portfoy` — Enerji portföyü · üretim

1 Santralleri tek ölçekte karşılaştırmak · 2 Portföyün toplam gücü ve
santral sayısı · 3 Bir santralin plakasına girmek · 4 Karşılaştırma
plakaları · 5 — · 6 — · 7 — · 8 — · 9 — · 10 — · 11 — · 12 — ·
13 — · 14 Doğru · 15 — · 16 — · 17 — · 18 — · 19 Tablo yok · 20 —

#### `/harita` — Santral haritası · 16 santral

1 Santrallerin coğrafi dağılımını görmek · 2 Hangi santral nerede ·
3 Bir işaretçiye tıklamak · 4 Konum ve santral kimliği · 5 — · 6 — ·
7 — · 8 — · 9 — · 10 — · 11 — · 12 — · 13 — · 14 Doğru: H1 "16
santral **il merkezine yaklaştırıldı**" — koordinatın kesinliği
gizlenmiyor · 15 — · 16 — · 17 — · 18 — · 19 Tablo yok · 20 —

---

### UYUM

#### `/uyum` — Nerede uygunsuz, ve neden?

1 Kurumun çerçeve karşısındaki durumunu okumak · 2 Hangi santral ×
kontrol kesişimi uygunsuz · 3 Kırmızı bir hücreye girmek · 4 Matrisin
kendisi · 5 — · 6 — · 7 — · 8 — · 9 — · 10 — · 11 Hücre çekmecede
açılıyor, sayfa değişmiyor · 12 — · 13 — · 14 Doğru: ölçülmemiş hücre
"bilinmeyen" işaretçisiyle, sıfırla değil · 15 — · 16 Aktif çerçeve
ikincil sırada işaretli · 17 — · 18 — · 19 Matris yoğun ama yoğunluk
ekranın konusudur · 20 —

**Not.** Bu ekran alanın referans kalıbıdır: künye → ölçü → matris,
araya blok girmeden.

#### `/regulasyonlar` — CBDDÖ · 4 çerçeve kütüphanede

1 Hangi çerçevenin hangi maddeleri var, görmek · 2 Dört çerçeve ve
madde sayıları · 3 Bir çerçeveyi seçmek · 4 Madde ağacı · 5 — · 6 — ·
7 — · 8 — · 9 — · 10 — · 11 — · 12 — · 13 "Kayıtlı resmî kaynak yok
— mevzuat değişikliği izlenmiyor" dürüst boş durum · 14 Doğru · 15 — ·
16 Seçili çerçeve mercek şeridinde işaretli · 17 — · 18 — · 19 — ·
20 —

#### `/surecler` — Uyum kampanyaları · 5 kayıt

1 Yürüyen uyum kampanyalarını takip etmek · 2 Kaç kampanya yürüyor,
kaçı gecikmiş · 3 Gecikmiş kampanyayı açmak · 4 Kampanya tablosu ·
5 — · 6 — · 7 — · 8 — · 9 — · 10 — · 11 — · 12 — · 13 — ·
14 Doğru: "Bilinmeyen" ayrı bir kolon · 15 — · 16 — · 17 — · 18 — ·
19 — · 20 —

#### `/eslestirme` — Çapraz eşleme · EPDK-SYM × ISO-27001

1 Bir çerçevedeki maddenin başka çerçevede karşılığını bulmak ·
2 Kaç madde karşılıksız · 3 Karşılıksız maddeye girmek · 4 Eşleme
matrisi · 5 — · 6 — · 7 — · 8 — · 9 — · 10 — · 11 — · 12 — ·
13 "hiç yok" boş durumu açık · 14 Doğru · 15 — · 16 Satır/sütun
çerçevesi mercek şeridinde · 17 — · 18 — · 19 — · 20 —

#### `/degerlendirme-aktarim` — Değerlendirme aktarımı

1 Matrisin içeriğini toplu değiştirmek · 2 Yüklenen dosyanın ne
yapacağı · 3 Dosya yüklemek · 4 Ön izleme ve elenen satırlar ·
5 — · 6 — · 7 — · 8 — · 9 — · 10 — · 11 — · 12 — · 13 — ·
14 Doğru · 15 — · 16 — · 17 — · 18 — · 19 — · 20 —

**Not.** Bu ekran denetim başlarken hiçbir kalite kapısının listesinde
değildi (**UX-0015**); ölçümü kapı listesine eklendikten sonra yapıldı
ve temiz çıktı.

#### `/denetimler` — Denetim programı · 3 kayıt

1 Denetimlerin takvimini ve kanıt durumunu izlemek · 2 Hangi denetim
takvimini tutmuyor · 3 Gecikmiş denetimi açmak · 4 Denetim tablosu ·
5 — · 6 — · 7 — · 8 — · 9 — · 10 — · 11 Çekmece · 12 — · 13 — ·
14 Doğru · 15 — · 16 — · 17 — · 18 — · 19 — · 20 —

#### `/bulgular` — Bulgu & düzeltici aksiyon · 16 açık

1 Açık bulguları ve aksiyonlarını yürütmek · 2 Kaç bulgu takıldı ·
3 Takılan bulguyu açmak · 4 Bulgu tablosu ve son tarih kolonu ·
5 — · 6 — · 7 — · 8 — · 9 — · 10 — · 11 Çekmece — UX-0003 ·
12 — · 13 "aksiyon yok" ayrı bir mercek · 14 Doğru: "doğrulama
bekleyen" ile "kapalı" ayrı · 15 — · 16 Aktif mercek şeritte ·
17 — · 18 — · 19 — · 20 —

**Not.** Bu ekran ürünün en olgun tezgâhıdır ve yeniden tasarımda
referans alınır.

#### `/projeler` — Dönüşüm portföyü · 9 proje

1 Projelerin durumunu izlemek · 2 Kaç proje riskte · 3 Riskteki
projeyi açmak · 4 İlerleme ve hedef kolonları · 5 — · 6 — · 7 — ·
8 — · 9 — · 10 — · 11 Çekmece — UX-0003 · 12 — · 13 — ·
14 Doğru · 15 — · 16 — · 17 — · 18 — · 19 — · 20 —

#### `/denetci-erisimi` — UY-57 · Dış denetçi

1 Dış denetçiye süreli, kapsamlı erişim vermek · 2 Kaç açık erişim
var · 3 "Denetçi davet et" · 4 Açık erişimlerin süresi ve kapsamı ·
5 — · 6 — · 7 H1 parça — **UX-0006** · 8 Künyedeki "UY-57" ister
kodu — **UX-0006** · 9 — · 10 — · 11 — · 12 — · 13 "Tanımlı dış
denetçi erişimi yok" + "Boş · ilk kurulum" açık · 14 Doğru ·
15 — · 16 — · 17 — · 18 — · 19 — · 20 —

#### `/gozden-gecirme` — UY-65 · Yönetim gözden geçirmesi

1 Yönetim gözden geçirmesi kaydı tutmak · 2 Son gözden geçirmenin ne
zaman yapıldığı · 3 "Toplantı planla" · 4 Kararlar ve son tarihleri ·
5 — · 6 — · 7 H1 sözcük sırası bozuk — **UX-0006** · 8 "UY-65" ·
9 — · 10 — · 11 — · 12 — · 13 "Hiç yönetim gözden geçirmesi kaydı
yok. Çoğu çerçevede bu zorunlu bir kayıttır" — boş durum NİÇİN
önemli olduğunu da söylüyor · 14 Doğru: "yapıldı işaretli ama hiç
karar yok" ayrı bir hâl · 15 — · 16 — · 17 — · 18 — · 19 — · 20 —

#### `/raporlar` — Portföy raporu · 5 santral × 3 süreç

1 Portföyün uyum tablosunu rapor olarak okumak · 2 Kaç hücre eşiğin
altında · 3 Eşik altı hücreye girmek · 4 Rapor tablosu · 5 — ·
6 — · 7 — · 8 — · 9 — · 10 — · 11 — · 12 — · 13 — · 14 Doğru ·
15 — · 16 — · 17 — · 18 — · 19 — · 20 —

#### `/raporlar/kanit-paketi` — Kanıt paketi · 9 kapsam

1 Denetime götürülecek kanıt paketini hazırlamak · 2 Kaç kapsam
hazır · 3 Bir kapsamı paketlemek · 4 "Kökeni yok" kolonu ·
5 — · 6 — · 7 — · 8 — · 9 — · 10 — · 11 — · 12 — · 13 — ·
14 Doğru: kökeni olmayan kanıt pakete girmiyor, sessizce
sayılmıyor · 15 — · 16 — · 17 "← Kanıt paketi" üst bağı var ·
18 — · 19 — · 20 —

#### `/dokumanlar` — Belge kütüğü · 11 belge · 25 kontrol

1 Politika ve prosedürlerin güncelliğini izlemek · 2 Kaç belgenin
gözden geçirmesi geçti · 3 Geçmiş belgeyi açmak · 4 Boşluk listesi
(hangi kontrolün belgesi yok) · 5 — · 6 "9 karşılıksız" üç yerde —
**UX-0013** · 7 Boşluk listesi katlanamıyor — **UX-0013** · 8 — ·
9 — · 10 — · 11 — · 12 Boşluk listesinin sekiz satırı katlanabilir ·
13 — · 14 Doğru: "periyot tanımlı değil" ile "gecikti" ayrı · 15 — ·
16 — · 17 — · 18 — · 19 — · 20 —

#### `/kanitlar` — Kanıt kütüphanesi · 58 kanıt

1 Kanıtların tazeliğini izlemek · 2 Kaç kanıtın süresi doldu ·
3 Süresi dolan kanıtı yenilemek · 4 Tarih ve bağlı kayıt kolonları ·
5 — · 6 — · 7 — · 8 — · 9 — · 10 — · 11 Çekmece — UX-0003 ·
12 — · 13 — · 14 Doğru: "bağlantısız" ayrı mercek · 15 — · 16 — ·
17 — · 18 — · 19 — · 20 —

#### `/aktivite` — Denetim izi · 217 kayıt

1 Kim neyi ne zaman değiştirdi, görmek · 2 Son 24 saatte kaç kayıt ·
3 Bir değişime girmek · 4 Zaman + kayıt + değişim kolonları · 5 — ·
6 — · 7 — · 8 — · 9 — · 10 — · 11 — · 12 — · 13 — · 14 Doğru ·
15 — · 16 Aktif mercek şeritte · 17 — · 18 — · 19 — · 20 —

#### `/saklama` — UY-56 · Saklama ve imha

1 Kayıt ailelerinin saklama süresini yönetmek · 2 Kaç ailenin
politikası var · 3 "Politika" tanımlamak · 4 Süre ve dayanak
kolonları · 5 — · 6 — · 7 H1 parça — **UX-0006** · 8 "UY-56" ·
9 — · 10 — · 11 — · 12 — · 13 "saklama politikası YOK · DEĞİŞMEZ
aile" — boş durum ailenin niteliğini de söylüyor · 14 Doğru ·
15 — · 16 — · 17 — · 18 — · 19 — · 20 —

#### `/egitimler` — UY-66 · Eğitim kütüğü

1 Zorunlu eğitimlerin kapsamasını izlemek · 2 Kaç kişinin kaydı yok ·
3 "Eğitim tanımla" ya da "Kontrole bağla" · 4 Kapsama oranı ·
5 — · 6 — · 7 H1 parça ("kütüğü") — **UX-0006** · 8 "UY-66" ·
9 — · 10 — · 11 — · 12 — · 13 "Tanımlı eğitim yok" + "Boş · ilk
kurulum" · 14 Doğru ve ÖZEL: kapsam sıfırken oran "%100" değil
"ölçülmedi"; süresiz eğitim "ölçülmedi" değil "yenilenmesi
gerekmiyor" · 15 — · 16 — · 17 — · 18 — · 19 — · 20 —

---

### VARLIK

#### `/envanter` — Varlık zihni

1 Kurumun neye sahip olduğunu görmek ve bir varlığın zincirini izlemek ·
2 Kaç varlık kapsamda, kaçı ölçülmemiş, kaçı sahipsiz · 3 Bir varlığa
tıklamak · 4 Varlık listesi · 5 Seçim yokken dört boş halka ve iki kez
yazılan yönerge — **UX-0005** · 6 "Bir varlık seçin" yönergesi üç yerde
— **UX-0005** · 7 Boş bağlam paneli 400px tutuyor — **UX-0005** ·
8 — · 9 — · 10 — · 11 Panelde altı sekme (özet · duruş · yönetişim ·
kayıt · ilişki · yaşam) — düzenleme, ilişkilendirme ve yaşam kararı
sayfa değiştirmeden yapılıyor · 12 — · 13 Boş süzgeç durumu ayrı,
kapsamsız durum ayrı · 14 Doğru: "39 ölçülmemiş" ayrı sayılıyor,
sıfıra karışmıyor · 15 — · 16 Mercek + arama + üç açılır süzgeç şeritte
görünür · 17 — · 18 Boş halkalar gürültü — **UX-0005** · 19 Tablo
görünümü yoğun ama okunur · 20 —

#### `/kesif` — Varlık keşfi · pasif kaynaklar · 28 kayıt

1 Keşfedilen kayıtları inceleyip karara bağlamak · 2 Kaç kayıt karar
bekliyor, kaçı çakışıyor · 3 Çakışan kaydı açmak · 4 İnceleme kuyruğu ·
5 Sayısı sıfır olan grup kutularının tam paragrafı — **UX-0004** ·
6 "28 kayıt" dört kez — **UX-0012** · 7 İki yükleme formu kuyruğun
üstünde — **UX-0004** · 8 "connector" boş durum metninde — **UX-0010** ·
9 Kuyruk ilk ekranda değil — **UX-0004** · 10 — · 11 Karar çekmecede
veriliyor · 12 Politika bloğu ve iki form aşamalı açığa çıkarmaya —
**UX-0004** · 13 Boş durum tam: tezgâh hattı + politika + formlar +
"henüz keşif kaydı yok" · 14 Doğru ve güçlü: "güven ölçülmedi" ile
"güven düşük" ayrı gösteriliyor; "artık görülmüyor" bir silme kararı
değil · 15 — · 16 Grup ve mercek aynı anda açılmıyor, hangi soruya
bakıldığı belli · 17 — · 18 Kart ızgarası — **UX-0004** · 19 — ·
20 Kart ızgarası — **UX-0004**

#### `/sayim` — OT-55 · Envanter sayımı

1 Sahada sayım yapıp envanterle karşılaştırmak · 2 Açık sayım var mı ·
3 "Sayım aç" · 4 Sahada bulunamayan kayıtlar · 5 — · 6 — ·
7 H1 parça ("sayımı") — **UX-0006** · 8 "OT-55" · 9 — · 10 — ·
11 — · 12 — · 13 "Boş · ilk kurulum" · 14 Doğru: "sahada bulunamadı"
ile "sayılmadı" ayrı · 15 — · 16 — · 17 — · 18 — · 19 — · 20 —

#### `/zimmetlerim` — OT-09b · Zimmet

1 Kendine atanan varlıkları görmek ve kabul etmek · 2 Bekleyen zimmet
var mı · 3 Bekleyen zimmeti kabul etmek · 4 Atanan varlık listesi ·
5 — · 6 — · 7 H1 sözcük sırası bozuk — **UX-0006** · 8 "OT-09b" ·
9 — · 10 — · 11 — · 12 — · 13 "Bu bölümde kayıt yok" · 14 Doğru ·
15 — · 16 — · 17 — · 18 — · 19 — · 20 —

#### `/varlik-aktarim` — CMDB toplu aktarım · 5 dosya

1 Toplu varlık dosyası yüklemek · 2 Kaç dosya karar bekliyor ·
3 "Yükle" · 4 Satır/geçerli/hata kolonları · 5 — · 6 — · 7 — ·
8 — · 9 — · 10 — · 11 — · 12 — · 13 — · 14 Doğru: hatalı satır
sessizce atılmıyor, sayılıyor · 15 — · 16 — · 17 — · 18 — · 19 — ·
20 —

#### `/ice-aktarim` — Madde içe aktarımı · 1 dosya

1 Regülasyon maddesi kataloğu yüklemek · 2 Kaç dosya karar bekliyor ·
3 "Yükle" · 4 Okunan/işlenecek/elenen kolonları · 5 — · 6 — · 7 — ·
8 — · 9 — · 10 — · 11 — · 12 — · 13 — · 14 Doğru · 15 — · 16 — ·
17 — · 18 — · 19 — · 20 —

#### `/topoloji` — Topoloji sapması · 18 anlık · pasif gözlem

1 Ağ topolojisindeki sapmaları karara bağlamak · 2 Kaç kritik sapma
bekliyor · 3 Kritik sapmaya girmek · 4 Sapan öğe tablosu ·
5 — · 6 — · 7 Tuval tablonun üstünde 871px yer tutuyor; kabul
edilebilir çünkü tuval ekranın konusudur · 8 — · 9 — · 10 — ·
11 Karar çekmecede · 12 — · 13 "anlık yok — topoloji hiç ölçülmedi"
dürüst · 14 Doğru: "hiç ölçülmedi" ile "sapma yok" ayrı ·
15 — · 16 — · 17 — · 18 Akış animasyonu azaltılmış harekette
durmuyor — **UX-0008** · 19 — · 20 —

#### `/prosesler` — Varlık · Ağ & bağımlılık · OT-05

1 İş süreçlerinin varlık bağımlılığını görmek · 2 Kaç bağ tek nokta ·
3 Tek noktalı bağa girmek · 4 Tek nokta ve değerlendirilmedi
kolonları · 5 — · 6 — · 7 H1 sözdizimi — **UX-0014** · 8 "OT-05" ·
9 — · 10 — · 11 — · 12 — · 13 "Adım tanımlanmadı — süreç kırılımı
yok" · 14 Doğru: "değerlendirilmedi" ayrı kolon, sıfıra karışmıyor ·
15 — · 16 — · 17 — · 18 — · 19 — · 20 —

#### `/esleme` — Eşleme profili · sürümlü kural tanımı

1 Bağlayıcı eşleme kurallarını sürümlemek · 2 Kaç bağlayıcı gömülü
eşlemeyle koşuyor · 3 Gömülü eşlemeli bağlayıcıya girmek · 4 Etkin
sürüm kolonu · 5 — · 6 — · 7 — · 8 "connector" H1'de ve kolon
başlığında — **UX-0010** · 9 — · 10 — · 11 — · 12 — ·
13 "etkin sürüm yok" · 14 Doğru: gömülü eşleme "yok" değil
"BİLİNMİYOR" · 15 — · 16 — · 17 — · 18 — · 19 — · 20 —

#### `/omur` — Ömür yönetimi · 347 varlık

1 Ömür sonuna yaklaşan varlıkların kararını vermek · 2 Kaç varlık
karar bekliyor · 3 Aciliyet merceğinden ilk kayda girmek ·
4 Ömür kararı bekleyenler · 5 — · 6 — · 7 — · 8 — · 9 — · 10 — ·
11 Karar çekmecede — UX-0003 · 12 — · 13 "telafi yok" · 14 Doğru:
EOS tarihi girilmemiş varlık "ömrü var" sayılmıyor · 15 — · 16 — ·
17 — · 18 — · 19 — · 20 —

#### `/tabanlar` — Varlık · Yaşam döngüsü · OT-22

1 Onaylı firmware sürümlerini tanımlamak ve sapmayı görmek ·
2 Kaç cihaz onaylı sürümde değil · 3 "Yeni taban" · 4 Sapan cihaz
listesi · 5 — · 6 — · 7 — · 8 "OT-22" künyede · 9 — · 10 — ·
11 — · 12 — · 13 "Boş · ilk kurulum" · 14 Doğru: sürümü okunamayan
cihaz "uyumlu" sayılmıyor · 15 — · 16 — · 17 — · 18 — · 19 — ·
20 —

#### `/yedekleme` — Yedekleme & kurtarma · 16 santral

1 Kritik varlıkların yedeğini ve geri yükleme testini izlemek ·
2 Kaç kritik varlığın kullanılabilir yedeği yok · 3 Açığı olan
santrale girmek · 4 Son restore testi kolonu · 5 — · 6 — · 7 — ·
8 — · 9 — · 10 — · 11 Çekmece — UX-0003 · 12 — · 13 "Kritik
varlıkta ölçüm yok" ve "test yok" ayrı · 14 Doğru ve örnek
niteliğinde: "ölçülmemiş kritik varlık" kendi merceği · 15 — ·
16 — · 17 — · 18 — · 19 — · 20 —

#### `/yedek-parca` — OT-56 · Kritik yedek parça

1 Kritik parçaların stok durumunu görmek · 2 Kayıtlı parça var mı ·
3 "Parça ekle" · 4 Kritiklik–parça eşleşmesi · 5 — · 6 — ·
7 H1 parça — **UX-0006** · 8 "OT-56" · 9 — · 10 — · 11 — · 12 — ·
13 "Kayıtlı yedek parça yok" + "Boş · ilk kurulum" · 14 Doğru ·
15 — · 16 — · 17 — · 18 — · 19 — · 20 —

#### `/tedarikciler` — Tedarikçiler · 18 kayıt

1 Tedarikçi erişimini ve sözleşme durumunu izlemek · 2 Kaç
tedarikçi kritik açıkta · 3 Açıktaki tedarikçiye girmek ·
4 Uzak erişim ve sözleşme kolonları · 5 — · 6 — · 7 — · 8 — ·
9 — · 10 — · 11 Çekmece — UX-0003 · 12 — · 13 — · 14 Doğru ·
15 — · 16 — · 17 — · 18 — · 19 — · 20 —

#### `/kimlik` — Erişim incelemesi · 75 hesap

1 Hesapların ayrıcalık ve atıllık durumunu incelemek · 2 Kaç hesap
müdahale bekliyor · 3 Ayrıcalıklı/atıl hesaba girmek · 4 Son
kullanım ve sahip kolonları · 5 — · 6 — · 7 — · 8 — · 9 — ·
10 — · 11 — · 12 — · 13 "AD · parola rotasyonu yok" dürüst ·
14 Doğru: "rotasyonsuz" ile "rotasyonu ölçülmedi" ayrı · 15 — ·
16 — · 17 — · 18 — · 19 — · 20 —

#### `/yetkiler` — Kullanıcı ve yetki · 5 hesap

1 Kimin neye yetkili olduğunu görmek · 2 Kaç hesap portföyün
tamamında yetkili · 3 Geniş yetkili hesaba girmek · 4 Rol ve
kapsam kolonları · 5 — · 6 — · 7 — · 8 — · 9 — · 10 — · 11 — ·
12 — · 13 — · 14 Doğru: "artık yetki" ayrı mercek · 15 — ·
16 — · 17 — · 18 — · 19 — · 20 —

#### `/tasinabilir-medya` — OT-57 · Taşınabilir medya

1 Taşınabilir medyanın kaydını ve kullanımını tutmak · 2 Kayıtlı
medya var mı · 3 "Medya ekle" · 4 Kullanım kayıtları · 5 — ·
6 — · 7 H1 parça ("medya") — **UX-0006** · 8 "OT-57" · 9 — ·
10 — · 11 — · 12 — · 13 "Kayıtlı taşınabilir medya yok. Kayıtsız
medya…" — boş durum RİSKİ de söylüyor · 14 Doğru · 15 — · 16 — ·
17 — · 18 — · 19 — · 20 —

#### `/olaylar` — Olaylar · 4 kayıt

1 Olayların etki zincirini doğrulamak · 2 Kaç olayda etki önerisi
doğrulanmadı · 3 Doğrulanmamış olaya girmek · 4 Zincir ve üretim
etkisi kolonları · 5 — · 6 — · 7 — · 8 — · 9 — · 10 — ·
11 Çekmece — UX-0003 · 12 — · 13 "Zinciri kopuk" ayrı mercek ·
14 Doğru: etki ÖNERİSİ ile doğrulanmış etki ayrı · 15 — · 16 — ·
17 — · 18 — · 19 — · 20 —

#### `/operasyon` — Değişiklik yönetimi · 9 kayıt

1 Değişikliklerin kapı ve plan durumunu izlemek · 2 Kaç değişiklik
plan tarihini aştı · 3 Aşan değişikliğe girmek · 4 Kapı ve plan
kolonları · 5 — · 6 — · 7 — · 8 — · 9 — · 10 — · 11 — · 12 — ·
13 "Plan tarihi yok" ve "tarih yok" ayrı · 14 Doğru: "kapısı eksik"
ayrı mercek · 15 — · 16 — · 17 — · 18 — · 19 — · 20 —

#### `/saglik` — Platform sağlığı · 22 motor · 7 bağlantı

1 Motorların ve bağlantıların sağlığını görmek · 2 Kaç kaynak hiç
ölçülmedi · 3 "Tümünü çalıştır" ya da bir motora girmek · 4 Son
koşu ve işlenen→üretilen kolonları · 5 — · 6 — · 7 — · 8 — ·
9 — · 10 — · 11 — · 12 — · 13 "koşu kaydı yok" · 14 Doğru ve
ürünün en sert yeri: hiç koşmamış motor "sağlıklı" değil, bağlı
olmayan kaynak "hatalı" değil · 15 — · 16 — · 17 "Reddedilenler"
alt ekranına açık bağ · 18 — · 19 — · 20 —

#### `/saglik/reddedilenler` — reddedilen kayıtlar

1 Kabul edilmeyen kayıtların nedenini görmek · 2 Kaç kayıt inceleme
bekliyor · 3 Ret sebebine girmek · 4 Ret sebebi ve aşama kolonları ·
5 — · 6 — · 7 — · 8 Bu ekrana giden bağın metninde "ölü mektup" —
**UX-0010** · 9 — · 10 — · 11 — · 12 — · 13 "Yok sayıldı" ·
14 Doğru · 15 — · 16 — · 17 "← Platform sağlığı" bağı var ·
18 — · 19 — · 20 —

---

### RİSK

#### `/riskler` — Risk defteri · 18 aktif

1 Riskleri skorlarıyla yönetmek · 2 Kaç kritik risk açık ·
3 Kritik riske girmek · 4 Skor kolonu · 5 — · 6 — · 7 — · 8 — ·
9 — · 10 — · 11 Çekmece — UX-0003 · 12 — · 13 — · 14 Doğru:
"artık risk ölçülmedi" yazılıyor, sıfır denmiyor · 15 Çekmece
1280px'te tablonun %42'sini örtüyor — **UX-0009** · 16 — · 17 — ·
18 — · 19 — · 20 —

---

### YARDIMCI EKRANLAR

#### `/yonetim-tezgahi` — Yönetim konsolu · 9 grup · 121 modül

1 Yapılandırılabilir alanları tek yerden yönetmek · 2 Kaç modül
doğrudan, kaçı onaylı, kaçı kodda · 3 Bir modüle girmek ·
4 Sınıf ve yönetim yeri kolonları · 5 — · 6 — · 7 H1 ölçüyle
tanımı birleştiriyor — **UX-0011** · 8 — · 9 — · 10 — · 11 — ·
12 — · 13 — · 14 Doğru: "kodda" bir eksiklik değil, bilinçli sınıf ·
15 — · 16 — · 17 — · 18 — · 19 — · 20 —

#### `/ayarlar` — Ayarlar · hesap

1 Kendi hesabını yönetmek · 2 Hangi hesapla oturum açık ·
3 "Parolayı değiştir" · 4 Hesap künyesi · 5 — · 6 — · 7 — ·
8 — · 9 — · 10 — · 11 — · 12 — · 13 — · 14 Doğru · 15 — ·
16 — · 17 — · 18 — · 19 Tablo yok · 20 —

#### `/bildirimler` — Bildirim kutusu · kişisel

1 Kendine gelen uyarıları okumak · 2 Kaç uyarı okunmadı ·
3 "Okundu işaretle" ya da bildirime girmek · 4 Bekleyen gün
kolonu · 5 — · 6 — · 7 — · 8 — · 9 — · 10 — · 11 — · 12 — ·
13 — · 14 Doğru · 15 — · 16 Aktif mercek şeritte · 17 — ·
18 — · 19 — · 20 —

#### `/api-sozlesmesi` — UY-52 · Dış API

1 Dış API sözleşmesini okumak · 2 Kaç uç var · 3 Bir uca girmek ·
4 Yol ve yöntem kolonları · 5 — · 6 — · 7 — · 8 Bu ekranın okuru
geliştiricidir; teknik dil burada YERİNDEDİR ve jargon kapısının
gerekçeli muafiyet listesindedir · 9 — · 10 — · 11 — · 12 — ·
13 — · 14 Doğru · 15 — · 16 — · 17 — · 18 — · 19 — · 20 —

#### `/yardim` — Yardım · okuma anahtarı

1 Ekranların nasıl okunacağını öğrenmek · 2 Hangi alanda ne var ·
3 Bir alanın satırını okumak · 4 Alan × kabuk × ne var tablosu ·
5 — · 6 — · 7 — · 8 — · 9 — · 10 — · 11 — · 12 — · 13 — ·
14 Doğru · 15 — · 16 — · 17 — · 18 — · 19 — · 20 —

---

### GELİŞTİRİCİ EKRANLARI (yoğunluk ölçütlerinin dışında)

#### `/sistem` — Tasarım sistemi

1 Tasarım jetonlarını ve kuralları görmek · 2 Hangi jeton ne işe
yarıyor · 3 Bileşen galerisine geçmek · 4 Jeton tablosu ·
5–20 Bu ekranın okuru geliştiricidir; son kullanıcı yoğunluk ve dil
ölçütleri uygulanmaz. Kabuk kuralları (gezinme, taşma, erişilebilirlik)
ölçüldü ve temiz.

#### `/sistem/bilesenler` — Paylaşılan primitif galerisi

1 Primitifleri her durumda görmek · 2 Kaç primitif var ·
3 Bir primitifin durumlarını incelemek · 4 Primitif örnekleri ·
5–20 Geliştirici ekranı. İş yüzeyi derinliği (2090px) bu ekranda
kusur DEĞİLDİR: galerinin kendisi bir listedir, tablosu örnek
olarak en sonda durur.
