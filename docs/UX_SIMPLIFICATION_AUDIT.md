# Son kullanıcı sadeleştirme ve etkileşim denetimi

Bu belge bir **delta denetimidir.** `docs/END_USER_UX_AUDIT.md` yirmi
kusuru (UX-0001…0020) kapattı ve o kararlar burada yeniden açılmaz.
Buranın sorusu başkadır:

> Platformu günlük işinde kullanan bir son kullanıcı, ihtiyacı olan
> bilgiye ve aksiyona **hızlı, doğru ve yorulmadan** ulaşabiliyor mu?

Önceki programın kapattığı şey ölçülebilir kusurdu: kırpılan içerik,
erişilemeyen ekran, yanlış kart ızgarası. Bu programın aradığı şey
**bilişsel yük** — ekranın doğru olduğu hâlde kullanıcıdan gereğinden
fazla iş istemesi.

> **Testler yeşil ≠ kullanıcı dostu.
> Responsive ≠ anlaşılır.
> A11y temiz ≠ düşük bilişsel yük.**

## Yöntem

Denetim üç kaynağa dayanır ve üçü de belgede ayrı ayrı görünür.

**1 · Ölçüm.** `arac/bilissel-yuk.mjs`, 56 rotayı 1440×900'de tarayıcıda
açar ve on iki sayı üretir: görünür etiket · durum imi · ölçüt kutusu ·
düğme · bağ · etiket→değer satırı · tekrar eden çift · ilk birincil
eylemin üstten uzaklığı · iş yüzeyinin üstten uzaklığı · ana yüzeydeki
kanıt/geçmiş yüksekliği · görünür metin uzunluğu · sayfa boyu. Sayılar
aşağıdaki tabloda **olduğu gibi** durur; hiçbiri hedefe uydurulmadı.

**2 · Kaynak okuma.** Her ekranın kendi bileşeni okundu. Ölçüm "birincil
eylem 1098px'te" der; kaynağın kendisi o eylemin neden orada olduğunu
söyler.

**3 · Görev tanımı.** Her ekran için tek cümlelik **birincil kullanıcı
işi** yazıldı. Bu cümle ekranın ne GÖSTERDİĞİ değil, kullanıcının orada
ne YAPMAYA geldiğidir. İki eşit ağırlıklı birincil iş taşıyan ekran, bir
bilgi mimarisi sorusudur.

### Ölçümün bilerek söylemedikleri

Bir sayının kusur olup olmadığına **ekranın işine bakmadan** karar
verilemez; araç bu yüzden eşik koymaz, yalnız sayar.

* **Yüksek metin uzunluğu kusur değildir.** `/yardim` 7 826 karakter
  taşır ve orası bir okuma ekranıdır. Aynı sayı bir kuyruk ekranında
  sorulacak bir sorudur.
* **Çok düğme kusur değildir.** `/uyum` 80 düğme sayar; bunların 70'i
  devrik matrisin hücreleridir ve matrisin kendisi odur. "Bir satırda
  sekiz eşit düğme" kuralı satır eylemleri içindir, ızgara hücreleri
  için değil.
* **Sıfır düğme her zaman kusur değildir.** `/sistem` ve `/yardim` salt
  okunur referans ekranlarıdır.

Bu ayrımlar tek tek yapıldı; aşağıdaki bulguların hiçbiri yalnız bir
sayının büyüklüğüne dayanmıyor.

## Ölçüm — 56 rota @ 1440×900
| Rota | Etiket | Rozet | KPI | Düğme | Bağ | Meta | Tekrar | İlk aksiyon Y | İş yüzeyi Y | L3 px | Metin |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 9 | 0 | 4 | 1 | 30 | 4 | 0 | 130 | 163 | 0 | 1675 |
| `/aktivite` | 5 | 0 | 4 | 7 | 0 | 4 | 0 | 241 | 305 | 0 | 810 |
| `/api-sozlesmesi` | 7 | 11 | 4 | 1 | 0 | 4 | 0 | 966 | 206 | 0 | 1792 |
| `/ayarlar` | 11 | 0 | 3 | 3 | 2 | 13 | 0 | 446 | — | 0 | 1881 |
| `/bildirimler` | 5 | 2 | 4 | 5 | 0 | 4 | 0 | 107 | 233 | 0 | 574 |
| `/bulgular` | 4 | 18 | 3 | 11 | 0 | 3 | 0 | 241 | 305 | 0 | 1407 |
| `/bulgular/[id]` | 21 | 4 | 3 | 10 | 3 | 9 | 0 | 1098 | 412 | 362 | 2025 |
| `/degerlendirme-aktarim` | 6 | 0 | 4 | 1 | 0 | 4 | 0 | 285 | — | 0 | 416 |
| `/denetci-erisimi` | 6 | 0 | 4 | 1 | 0 | 4 | 0 | 180 | — | 0 | 425 |
| `/denetimler` | 4 | 3 | 3 | 13 | 0 | 3 | 0 | 241 | 483 | 402 | 696 |
| `/denetimler/[id]` | 7 | 9 | 3 | 9 | 2 | 7 | 0 | 381 | 428 | 0 | 1165 |
| `/dokumanlar` | 8 | 33 | 4 | 8 | 9 | 4 | 0 | 646 | 754 | 0 | 2627 |
| `/egitimler` | 6 | 0 | 4 | 2 | 0 | 4 | 0 | 180 | — | 0 | 432 |
| `/envanter` | 3 | 0 | 0 | 19 | 0 | 0 | 0 | 178 | 217 | 0 | 1645 |
| `/esleme` | 5 | 3 | 4 | 7 | 0 | 4 | 0 | 220 | 324 | 0 | 583 |
| `/eslestirme` | 5 | 16 | 4 | 18 | 0 | 4 | 0 | 241 | 307 | 0 | 1099 |
| `/gozden-gecirme` | 6 | 0 | 4 | 1 | 0 | 4 | 0 | 180 | — | 0 | 429 |
| `/harita` | 6 | 0 | 4 | 16 | 0 | 4 | 0 | 464 | 189 | 0 | 1038 |
| `/ice-aktarim` | 4 | 1 | 3 | 2 | 2 | 3 | 0 | 161 | 337 | 0 | 755 |
| `/kanitlar` | 4 | 66 | 3 | 12 | 0 | 3 | 0 | 241 | 347 | 0 | 6403 |
| `/kesif` | 5 | 16 | 4 | 36 | 1 | 4 | 0 | 174 | 692 | 0 | 2035 |
| `/kimlik` | 5 | 11 | 4 | 6 | 0 | 4 | 0 | 235 | 300 | 0 | 1451 |
| `/olaylar` | 4 | 2 | 3 | 6 | 0 | 3 | 0 | 253 | 294 | 0 | 771 |
| `/omur` | 4 | 13 | 3 | 9 | 1 | 3 | 0 | 233 | 570 | 0 | 2116 |
| `/operasyon` | 5 | 7 | 4 | 6 | 0 | 4 | 0 | 235 | 303 | 0 | 1178 |
| `/portfoy` | 53 | 0 | 0 | 6 | 18 | 4 | 0 | 100 | — | 0 | 2400 |
| `/projeler` | 4 | 0 | 3 | 8 | 0 | 3 | 0 | 241 | 502 | 342 | 797 |
| `/prosesler` | 5 | 2 | 4 | 6 | 2 | 4 | 0 | 174 | 428 | 0 | 916 |
| `/raporlar` | 6 | 15 | 4 | 17 | 9 | 4 | 0 | 294 | 251 | 0 | 832 |
| `/raporlar/kanit-paketi` | 5 | 9 | 4 | 0 | 0 | 4 | 0 | — | 251 | 0 | 956 |
| `/regulasyonlar` | 9 | 5 | 4 | 8 | 3 | 4 | 0 | 239 | — | 0 | 1107 |
| `/riskler` | 6 | 0 | 4 | 32 | 0 | 4 | 0 | 205 | 265 | 0 | 1218 |
| `/riskler/[id]` | 10 | 8 | 4 | 4 | 4 | 8 | 0 | 103 | — | 0 | 831 |
| `/saglik` | 5 | 7 | 4 | 7 | 0 | 4 | 0 | 174 | 273 | 0 | 954 |
| `/saglik/reddedilenler` | 5 | 15 | 4 | 1 | 1 | 4 | 0 | 1190 | 219 | 0 | 2357 |
| `/saklama` | 10 | 8 | 4 | 3 | 0 | 4 | 0 | 180 | 312 | 0 | 1101 |
| `/sayim` | 5 | 0 | 3 | 1 | 0 | 3 | 0 | 174 | — | 0 | 379 |
| `/sistem` | 1 | 0 | 0 | 0 | 1 | 0 | 0 | — | 441 | 0 | 2444 |
| `/sistem/bilesenler` | 62 | 50 | 12 | 66 | 7 | 33 | 4 | 978 | 2090 | 358 | 7555 |
| `/surecler` | 5 | 3 | 4 | 13 | 0 | 4 | 0 | 241 | 483 | 402 | 725 |
| `/surecler/[id]` | 6 | 8 | 4 | 9 | 2 | 9 | 0 | 668 | 734 | 0 | 1730 |
| `/tabanlar` | 6 | 0 | 3 | 2 | 2 | 8 | 0 | 174 | — | 0 | 848 |
| `/tasinabilir-medya` | 6 | 0 | 4 | 2 | 0 | 4 | 0 | 174 | — | 0 | 431 |
| `/tedarikciler` | 5 | 9 | 4 | 15 | 7 | 4 | 0 | 305 | 245 | 0 | 1408 |
| `/tesisler` | 53 | 0 | 0 | 6 | 18 | 4 | 0 | 100 | — | 0 | 2400 |
| `/tesisler/[id]` | 21 | 15 | 0 | 1 | 16 | 20 | 0 | 1053 | — | 0 | 2069 |
| `/topoloji` | 6 | 6 | 4 | 9 | 0 | 4 | 0 | 789 | 871 | 0 | 1893 |
| `/uyum` | 12 | 75 | 4 | 80 | 0 | 4 | 0 | 177 | 387 | 0 | 2096 |
| `/uyum/[cerceve]` | 10 | 4 | 4 | 1 | 3 | 7 | 0 | 139 | — | 0 | 619 |
| `/varlik-aktarim` | 4 | 5 | 3 | 1 | 1 | 3 | 0 | 169 | 345 | 0 | 862 |
| `/yardim` | 2 | 6 | 0 | 0 | 12 | 27 | 0 | — | 364 | 0 | 7826 |
| `/yedek-parca` | 6 | 0 | 4 | 1 | 0 | 4 | 0 | 174 | — | 0 | 394 |
| `/yedekleme` | 6 | 15 | 4 | 7 | 0 | 4 | 0 | 233 | 300 | 0 | 2371 |
| `/yetkiler` | 5 | 5 | 4 | 10 | 0 | 4 | 0 | 235 | 299 | 0 | 704 |
| `/yonetim-tezgahi` | 8 | 8 | 4 | 15 | 0 | 4 | 0 | 179 | 358 | 0 | 1702 |
| `/zimmetlerim` | 6 | 0 | 4 | 4 | 0 | 4 | 0 | 254 | — | 0 | 239 |

### Ölçümün öne çıkardıkları

| Gözlem | Ölçü | Rotalar |
| --- | --- | --- |
| İlk birincil eylem 900px katlamasının ALTINDA | 5 rota | `/saglik/reddedilenler` 1190 · `/bulgular/[id]` 1098 · `/tesisler/[id]` 1053 · `/sistem/bilesenler` 978 · `/api-sozlesmesi` 966 |
| İş yüzeyi 500px'in altında başlamıyor | 8 rota | `/sistem/bilesenler` 2090 · `/topoloji` 871 · `/dokumanlar` 754 · `/surecler/[id]` 734 · `/kesif` 692 · `/omur` 570 · `/projeler` 502 · `/surecler` · `/denetimler` 483 |
| Kanıt/geçmiş (L3) ana yüzeyde | 4 rota | `/surecler` · `/denetimler` 402 · `/bulgular/[id]` 362 · `/projeler` 342 |
| Ana yüzeyde hiç eylem yok | 3 rota | `/raporlar/kanit-paketi` · `/sistem` · `/yardim` |
| Gerekçesiz tekrar eden etiket→değer çifti | **0** | — (yalnız `/sistem/bilesenler` galerisinde 4, bilerek: aynı primitif iki durumda gösteriliyor) |

Son satır önemlidir: **kritik bilgi tekrarı ölçüldü ve sıfır çıktı.**
Önceki programın kapattığı tekrar kusurları geri gelmemiş.

### Dil ve bozuk durum taraması

`arac/eylem-dili.mjs` iki aile daha sayar (tarayıcı istemez, kaynağı
okur):

| Ölçü | Sonuç |
| --- | --- |
| Son kullanıcı yüzeyinde geliştirici sözcüğü (provider · adapter · registry · mutation · boolean · payload …) | **0** |
| "Ne oldu" deyip "ne yapabilirim" demeyen bozuk durum bloğu | **50** |

İlk satır önceki programın dil geçişinin tuttuğunu gösterir ve burada
yeniden bir bulgu açılmaz. İkinci satır bu programın en yaygın
bulgusudur: kullanıcı doğru bilgilendiriliyor ve orada bırakılıyor.

## Arketipler

Elli altı rota altı arketipe iniyor. Yeniden tasarım rota rota değil,
**arketip arketip** yapılır; bir arketipte alınan karar ailenin
tamamına uygulanır.

| Arketip | Ne yapılır | Rotalar |
| --- | --- | --- |
| **K · Kayıt detayı** | Tek bir kaydın kapanması için gerekeni görüp tamamlamak | `/bulgular/[id]` · `/riskler/[id]` · `/denetimler/[id]` · `/surecler/[id]` · `/tesisler/[id]` |
| **Q · Kuyruk** | Aksiyon bekleyen kaydı bulup karara bağlamak | `/bulgular` · `/riskler` · `/kesif` · `/omur` · `/saglik/reddedilenler` · `/olaylar` · `/gozden-gecirme` · `/sayim` · `/zimmetlerim` · `/bildirimler` · `/denetimler` · `/projeler` · `/surecler` |
| **M · Matris** | İki eksenin kesişiminde boşluğu görmek | `/uyum` · `/uyum/[cerceve]` · `/eslestirme` · `/raporlar` |
| **T · Tuval** | İlişkiyi ve topolojiyi görüp karar vermek | `/envanter` · `/topoloji` · `/harita` · `/prosesler` |
| **W · Tezgâh** | Çok adımlı bir işi baştan sona yürütmek | `/varlik-aktarim` · `/ice-aktarim` · `/degerlendirme-aktarim` · `/esleme` · `/raporlar/kanit-paketi` · `/yonetim-tezgahi` |
| **R · Referans** | Bir şeyi okumak, karar vermemek | `/yardim` · `/sistem` · `/sistem/bilesenler` · `/api-sozlesmesi` · `/regulasyonlar` · `/aktivite` · `/kanitlar` · `/dokumanlar` |

Kalan rotalar (`/` · `/portfoy` · `/ayarlar` · `/yetkiler` · `/kimlik` ·
`/saglik` · `/tedarikciler` · `/saklama` · `/tabanlar` · `/egitimler` ·
`/yedekleme` · `/yedek-parca` · `/tasinabilir-medya` · `/denetci-erisimi` ·
`/operasyon`) Q ve R arketiplerinin karışımıdır ve o iki ailenin
kurallarını miras alır.

## Bulgu kütüğü

Şiddet ölçeği:

| | Anlamı |
| --- | --- |
| **P0** | Görev yapılamıyor ya da kritik bilgi görünmüyor |
| **P1** | Yanlış karar riski ya da ciddi görev zorluğu |
| **P2** | Gereksiz yük · karmaşıklık · fazla tıklama |
| **P3** | Cila; öznel iyileştirme |

Bulgu sayısına üst sınır konmadı. Aşağıdaki her madde ya bir **ölçüme**
ya da **kaynağın kendisine** dayanır; hiçbiri "bence" ile açılmadı.
Ölçülen ama kusur SAYILMAYAN sayılar da yazıldı — çünkü bir sayının
büyük olması tek başına bulgu değildir ve bunu ayırt etmek denetimin
kendisidir.

### P0

**SDL-0001 · `/bulgular/[id]` · "Bu bulgunun kapanması için ne eksik?"
sorusunun cevabı ekranda hiçbir yerde yok.**

Ekranın birincil kullanıcı işi budur ve ekran onu hiçbir yerde tek parça
söylemiyor. Kullanıcı cevabı dört ayrı yerden kendisi toplamak zorunda:
aşama şeridinden hangi aşamada olduğunu, aksiyon tablosundan kaç
aksiyonun açık olduğunu, çekmecedeki kök neden bloğundan analizin
durumunu, "Doğrulama" alanından doğrulamanın yapılıp yapılmadığını.

Ölçüm bunu doğruluyor: ana kolonda **tek bir eylem düğmesi yok.**
Ekrandaki ilk birincil eylem çekmecenin içinde, sayfanın tepesinden
**1098px** aşağıda ("Kök nedeni kaydet"). "Aksiyon planla" 1604px'te,
"Kanıt bağla" 1717px'te. 1440×900 bir pencerede kullanıcı ne yapacağını
GÖRMÜYOR.

*Kanıt:* `arac/bilissel-yuk.mjs` ölçümü + `BulguDetayIstemci.tsx`
satır 155-246 (ana kolon) ve 248-420 (çekmece).

### P1

**SDL-0002 · `/bulgular/[id]` · Aşama şeridi dekoratif.**
`Asamalar` bileşeni dört aşamayı ve tarihlerini çiziyor ama hiçbiri
tıklanabilir değil; şerit iş yaptırmıyor, yalnız durum bildiriyor.
Bir kayıt ekranında ilerleme göstergesi, o adımın işine götüren
navigatör olmalıdır.

**SDL-0003 · `/bulgular/[id]` · Okuma hâli ile düzenleme hâli aynı.**
Kayıt açılır açılmaz çekmecede dört seçim kutusu ("Durum", "Önem",
"Sahip", "Son tarih"), kök neden metin alanı, retest alanı, aksiyon
formu ve kanıt formu birden geliyor. Kullanıcı çoğu zaman bakmaya
gelmiştir; düzenleme yüzeyi okumanın önüne geçiyor.
*Kaynak:* `BulguDetayIstemci.tsx` 322-420.

**SDL-0004 · K ve Q arketipleri · Kanıt/geçmiş ana yüzeyde.**
Zaman ekseni ve denetim izi karar yüzeyiyle aynı düzlemde duruyor ve
asıl işi aşağı itiyor: `/bulgular/[id]` 362px · `/surecler` 402px ·
`/denetimler` 402px · `/projeler` 342px. L3 bir kanıt katmanıdır;
sıradaki kararı doğrudan etkilemiyorsa ana yüzeyi işgal etmemeli.

**SDL-0005 · `/saglik/reddedilenler` · Kuyruğun karar eylemi 1190px'te.**
Bu ekran bir dead-letter kuyruğudur; kullanıcı buraya reddedilen kaydı
karara bağlamak için gelir. Karar eylemi ekranın en altında.

**SDL-0006 · `/tesisler/[id]` · İlk eylem 1053px.**
Santral 360 ekranı yirmi meta satırı ve on altı bağ gösteriyor; tek
eylem hepsinin altında.

**SDL-0007 · `/api-sozlesmesi` · Tek eylem 966px'te.**
Referans arketipi olduğu için eylem azlığı doğru; ama VAR OLAN tek
eylemin katlamanın altında kalması, ekranın "bir şey yapılabilir"
olduğunu gizliyor.

**SDL-0008 · `/raporlar/kanit-paketi` · Durağan hâlde ne eylem var ne de
"şimdi ne yapmalıyım" cümlesi.**
Ölçüm: ana yüzeyde **0 düğme**. Birincil eylem ("Paketi üret ve indir")
yalnız bir kapsam satırı seçildikten sonra çekmecede beliriyor. Akışın
kendisi doğru — önce kapsam, sonra üretim — ama ekran bunu söylemiyor.

**SDL-0009 · `/topoloji` · İş yüzeyi 871px'te başlıyor.**
Kullanıcı buraya sapma tezgâhı için gelir; tezgâh katlamanın altında.

**SDL-0010 · Platform geneli · 50 bozuk durum bloğu "ne yapabilirim"
demiyor.**
`arac/eylem-dili.mjs` ölçümü: `BosIlk` · `Olculmedi` · `BaglantiYok` ·
`EntegrasyonYok` · `KismiVeri` · `Bakimda` bileşenlerinden ellisi
`eylem` özelliği olmadan çiziliyor. Boş bir ekranda o cümle ekranın
TEK içeriğidir; sonraki adımı söylemiyorsa kullanıcı orada kalır.
Şiddeti P1'dir çünkü kusur boş ekranda tam yüzeyi kaplar.

### P2

**SDL-0011 · `/dokumanlar` · İş yüzeyi 754px, ilk eylem 646px.**
"Karşılıksız kontroller" paneli belge kütüğünün üstünde duruyor. İkisi
de gerçek iştir ama biri ötekini katlamanın altına itiyor.

**SDL-0012 · `/kesif` · İş yüzeyi 692px.**
Önceki program bunu 1518px'ten 692px'e indirdi; hâlâ katlamanın
dörtte üçü kuyruğun üstünde.

**SDL-0013 · `/omur` · İş yüzeyi 570px.**

**SDL-0014 · `/surecler` · `/denetimler` · `/projeler` · İş yüzeyi
483-502px ve üstünde L3 var.**

**SDL-0015 · `/portfoy` · Aynı üç etiket on altı kez tekrar ediyor.**
Ölçüm: 53 görünür etiket; bunların 48'i santral şeridindeki
"Uyum · Bulgu · Risk" üçlüsünün her santral için yeniden yazılması.
Üç etiket bir kez yazılıp değerler hizalanabilir.

**SDL-0016 · `/ayarlar` · İlk eylem 446px, 13 meta satırı, iş yüzeyi yok.**

**SDL-0017 · `/harita` · İlk eylem 464px.**

**SDL-0018 · `/sistem/bilesenler` · İlk eylem 978px, iş yüzeyi 2090px,
sayfada atlama şeridi yok.**
Galeri arketipi gereği uzun; ama uzun bir referans sayfasının içindekiler
şeridi olmalı.

### Ölçüldü, kusur SAYILMADI

Bu maddeler ölçümde büyük çıktı ve tek tek incelendikten sonra bulgu
açılmadı. Yazılmalarının sebebi, bir sonraki denetimin aynı sayıları
yeniden "bulgu" sanmaması.

| Ölçü | Neden kusur değil |
| --- | --- |
| `/uyum` 80 düğme · 75 durum imi | 70'i devrik matrisin hücresi. Matris bu ekranın kendisidir; hücre sayısı bir yoğunluk kusuru değil, ekranın işidir. "Bir satırda sekiz eşit düğme" kuralı satır eylemleri içindir. |
| `/kanitlar` 66 durum imi · 6 403 karakter | 58 kanıt satırının tazelik imleri. Ekranda 7 süzgeç var ve kullanıcı listeyi daraltabiliyor. |
| `/yardim` 7 826 karakter · 0 düğme | Referans arketipi; okuma ekranıdır, karar ekranı değil. |
| `/sistem` 0 düğme | Token referansı; değer iddia etmez, okur. |
| `/sistem/bilesenler` 4 tekrar eden çift | Galeri aynı primitifi bilerek iki durumda gösteriyor. |
| Son kullanıcı yüzeyinde sistem dili | Tarandı: **0**. Önceki programın dil geçişi tutmuş. |
| Gerekçesiz tekrar eden etiket→değer çifti | Tarandı: galeri dışında **0**. |
| `/envanter` `/portfoy` `/tesisler/[id]` ölçütü 0 | Aracın kör noktası, ekranın kusuru değil. Üçü de kendi ölçüt bandını kuruyor: `/envanter` üstünde "52 / 347 varlık · 39 ölçülmemiş · 13 sahipsiz" yazıyor, `/portfoy` kendi uyum endeksini çiziyor. Araç ORTAK primitif sözlüğüne bakar; sınır aracın başlığında yazılıdır. |

## Ekran ekran

Her ekran için **birincil kullanıcı işi** tek cümledir ve ekranın ne
GÖSTERDİĞİNİ değil, kullanıcının orada ne YAPMAYA geldiğini söyler.

**3 saniye testi** beş sorunun kaçına cevap verildiğidir: *neredeyim ·
burada ne oluyor · problem var mı · en önemli problem ne · şimdi ne
yapmalıyım.* Üçü ölçümden gelir (ölçüt bandı var mı · durum imi var mı ·
birincil eylem 900px katlamasının üstünde mi); "en önemli problem" için
ekranın sıralamasına, "neredeyim" için künye ve kırıntıya bakıldı.

| Rota | Birincil kullanıcı işi | 3sn | Birincil eylem | Bulgu |
| --- | --- | :-: | --- | --- |
| `/` | Bugün yönetim dikkatinin nereye gitmesi gerektiğini görmek | 5/5 | Odak kaydını aç | — |
| `/aktivite` | Belirli bir değişikliğin kim tarafından ne zaman yapıldığını bulmak | 5/5 | Merceği daralt | — |
| `/api-sozlesmesi` | Hangi anahtarın hangi uca eriştiğini görmek | 4/5 | Kapsamı düzenle (966px) | SDL-0007 |
| `/ayarlar` | Kendi yetkimi ve oturumumu doğrulamak | 5/5 | Oturumu kapat | SDL-0016 |
| `/bildirimler` | Bana yazılanları görüp okundu işaretlemek | 5/5 | Okundu işaretle | — |
| `/bulgular` | Gecikmiş ve yüksek şiddetli bulguyu bulup açmak | 5/5 | Bulgu satırını aç | — |
| `/bulgular/[id]` | **Bu bulgunun kapanması için eksik olan işi görüp tamamlamak** | 2/5 | Yok (ilk eylem 1098px) | **SDL-0001** · 0002 · 0003 · 0004 |
| `/degerlendirme-aktarim` | Değerlendirme dosyasını önizleyip uygulamak | 5/5 | Kuru koşu | — |
| `/denetci-erisimi` | Dış denetçiye süreli erişim vermek ve süresi dolanı kapatmak | 5/5 | Erişim tanımla | — |
| `/denetimler` | Takvimini tutmayan denetimi bulmak | 5/5 | Denetim satırını aç | SDL-0004 · 0014 |
| `/denetimler/[id]` | Denetimin kapanmasını engelleyen eksiği görüp gidermek | 5/5 | Kanıt talebi | — |
| `/dokumanlar` | Karşılıksız kontrolü ve gözden geçirmesi geçmiş belgeyi bulmak | 5/5 | Belge satırını aç (646px) | SDL-0011 |
| `/egitimler` | Eğitim kaydını maddeye bağlamak | 5/5 | Eğitim tanımla | — |
| `/envanter` | Aksiyon gerektiren varlığı hızlıca bulup işlem yapmak | 5/5 | Varlık düğümünü seç | — |
| `/esleme` | Kaynağın alanlarını hedefe eşleyip profili yayına almak | 5/5 | Profil sürümü aç | — |
| `/eslestirme` | Hangi maddenin hangi maddeyi karşıladığını görmek | 5/5 | Eşleme kur | — |
| `/gozden-gecirme` | Dönem sonu gözden geçirmesini kayda geçirmek | 5/5 | Gözden geçirme aç | — |
| `/harita` | Coğrafi dağılımda hangi santralin dikkat istediğini görmek | 5/5 | Santral seç (464px) | SDL-0017 |
| `/ice-aktarim` | Madde dosyasını doğrulayıp onaya göndermek | 5/5 | Dosya yükle | — |
| `/kanitlar` | Süresi dolmuş ya da bağlantısız kanıtı bulmak | 5/5 | Kanıt satırını aç | — |
| `/kesif` | Yeni veya bilinmeyen cihazı sınıflandırıp karar vermek | 5/5 | Kayıt eşle | SDL-0012 |
| `/kimlik` | Fazla yetkisi olan hesabı bulup incelemeyi başlatmak | 5/5 | İnceleme aç | — |
| `/olaylar` | Olayın hangi varlıkları etkilediğini görüp zinciri onaylamak | 5/5 | Etki önerisi yenile | — |
| `/omur` | Ömrü yaklaşan varlığa telafi edici kontrol ya da proje bağlamak | 5/5 | Varlık satırını aç | SDL-0013 |
| `/operasyon` | OT emniyet kapısı olan değişikliği karara bağlamak | 5/5 | Değişiklik aç | — |
| `/portfoy` | Hangi santralin dikkat istediğini tek düzlemde görmek | 5/5 | Santral seç | SDL-0015 |
| `/projeler` | Taahhüdünü tutmayan projeyi bulmak | 5/5 | Proje satırını aç | SDL-0004 · 0014 |
| `/prosesler` | Bir iş sürecinin tek nokta bağımlılığını görmek | 5/5 | Adım varlığı bağla | — |
| `/raporlar` | Santral × süreç boşluğunu görüp rapor hedefi koymak | 5/5 | Rapor hedefi | — |
| `/raporlar/kanit-paketi` | Denetçiye verilecek kanıt paketini üretmek | 3/5 | Yok (kapsam seçilince belirir) | SDL-0008 |
| `/regulasyonlar` | Bir çerçevenin madde kataloğunu ve sürümünü görmek | 5/5 | Madde aç | — |
| `/riskler` | Skoru yüksek ya da ölçülmemiş riski bulup işlem yapmak | 5/5 | Risk satırını aç | — |
| `/riskler/[id]` | Riskin kapanma zincirini görüp sonraki işlemi seçmek | 5/5 | Risk işlemi | — |
| `/saglik` | Hangi motorun ya da kaynağın beklendiği gibi çalışmadığını görmek | 5/5 | Connector koştur | — |
| `/saglik/reddedilenler` | Reddedilen kaydı inceleyip karara bağlamak | 4/5 | Kaydı kapat (1190px) | SDL-0005 |
| `/saklama` | Süresi dolan kaydın imha kararını açmak; muhafazayı korumak | 5/5 | İmha kararı aç | — |
| `/sayim` | Envanter sayımını açıp farkları karara bağlamak | 5/5 | Sayım aç | — |
| `/sistem` | Bir token'ın gerçek değerini ve kontrastını görmek | 3/5 | Yok (referans ekranı) | — |
| `/sistem/bilesenler` | Bir primitifin bütün durumlarını tek yerde görmek | 4/5 | Galeri örneği (978px) | SDL-0018 |
| `/surecler` | Denetim tarihine yetişmeyen kampanyayı bulmak | 5/5 | Kampanya satırını aç | SDL-0004 · 0014 |
| `/surecler/[id]` | Kampanyada değerlendirilmemiş madde × santral hücresini kapatmak | 5/5 | Değerlendirme (668px) | SDL-0014 |
| `/tabanlar` | Firmware tabanını tanımlayıp uyumu ölçülebilir yapmak | 5/5 | Taban tanımla | — |
| `/tasinabilir-medya` | Kayıtlı taşınabilir medyayı ve iznini görmek | 5/5 | Medya kaydet | — |
| `/tedarikciler` | Sertifikası ya da sözleşmesi süresi dolan tedarikçiyi bulmak | 5/5 | Tedarikçi aç | — |
| `/tesisler` | (Yönlendirme) Santral listesine ulaşmak | — | `/portfoy` | — |
| `/tesisler/[id]` | Bu santralin kontrol altında olup olmadığını doğrulamak | 3/5 | Yok (ilk eylem 1053px) | SDL-0006 |
| `/topoloji` | Ağ anlığını temele karşı karşılaştırıp sapmayı karara bağlamak | 5/5 | Anlık karşılaştır (789px) | SDL-0009 |
| `/uyum` | Hangi kontrolün hangi santralde açık olduğunu görmek | 5/5 | Matris hücresi | — |
| `/uyum/[cerceve]` | Bu regülasyonun bizde nerede durduğunu görmek | 5/5 | Kontrol satırını genişlet | — |
| `/varlik-aktarim` | CMDB dosyasını eşleyip onaya göndermek | 5/5 | Dosya yükle | — |
| `/yardim` | Bir ekranın nasıl okunduğunu öğrenmek | 3/5 | Yok (okuma ekranı) | — |
| `/yedek-parca` | Kritik varlığın yedek parçasını ve tedarik süresini görmek | 5/5 | Parça kaydet | — |
| `/yedekleme` | Geri yükleme testi geçmemiş yedeği bulmak | 5/5 | Koşu başlat | — |
| `/yetkiler` | Kimin neye eriştiğini görüp yetki değişikliği başlatmak | 5/5 | Yetki ata | — |
| `/yonetim-tezgahi` | Bana düşen onayı bulup karara bağlamak | 5/5 | Görev aç | — |
| `/zimmetlerim` | Üzerimdeki zimmeti görüp iade etmek | 5/5 | Zimmet iade | — |

**Platform geneli bulgu:** SDL-0010 (50 eylemsiz bozuk durum bloğu)
yukarıdaki tabloda tek tek yazılmadı; 46 ekranı ilgilendiriyor ve
listesi `node arac/eylem-dili.mjs` çıktısındadır.

## Kapanış durumu

Bu bölüm yeniden tasarım ilerledikçe güncellenir; ölçümler kapanışta
YENİDEN alınır ve önce/sonra sayıları buraya yazılır.
