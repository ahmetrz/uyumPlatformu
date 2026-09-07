# arac/ — görsel doğrulama araçları

Uyum ve Yönetişim Platformu arayüzünün kalite ve doğrulama araçlarıdır.
Tasarım sözleşmesi `../DESIGN.md` dosyasındadır. Bu araçlar üretim bundle'ına
girmez.

## `yedek.mjs` — görsel değil, İŞLETİM aracı

Bu dizindeki tek görsel olmayan araç; burada durmasının sebebi "üretim
kodu değil, derlemeye girmez" tarifine uymasıdır.

Ürünün KENDİ veritabanını yedekler ve doğrular (`npm run yedek`). Prosedür
`../../docs/URUN_YEDEKLEME.md`, testi `../tests/yedek-araci.test.ts`.

Kısaca: `cp` kullanılmaz — canlı SQLite dosyasını kopyalamak, kopyanın
ortasında bir yazma commit'lenirse tutarsız dosya üretir ve bu ancak geri
yüklerken anlaşılır. `VACUUM INTO` tutarlı anlık görüntü yazar; yan etkisi
olarak yedek canlıdan bayt bayt farklı olur, bu yüzden araç ayrıca
MANTIKSAL (tablo satır sayılarından türeyen) bir özet raporlar.

## `kare.mjs`

Çalışan uygulamadan ekran görüntüsü alır; her karede kullanılan font ailesini,
`document.fonts.status` değerini ve sayfa/konsol hatalarını raporlar.
Tembel yüklenen görseller için sayfayı sonuna kadar kaydırır — aksi hâlde
alt sıradaki kapaklar boş yakalanır.

```bash
PORT=3111 OUT=/yol/kare YOLLAR=/sistem,/,/tesisler node arac/kare.mjs
```

Sunucu portu `PORT` ile verilir (varsayılan 3000). Her gezinmeden önce fare
tuvalin dışına alınır: Playwright fareyi son tıklama koordinatında bırakıyor
ve o nokta bir tablo satırının üstüne düşerse satır `:hover` durumunda
yakalanabiliyor — ekran görüntüsünde vurgulu görünerek görsel kalite
kontrollerini yanıltabiliyor.

Giriş gerektiren rotalar için betiğe oturum açma adımı eklenmelidir
(geliştirme girişi: `kullanici.a@demo.local`).

## `olcek.mjs`

Toplu aktarım yollarının **ölçüm** aracı. Görsel değil, performans kapısıdır:
optimizasyondan ÖNCE ve SONRA aynı harness ile koşulur, sayılar
karşılaştırılır.

```bash
node arac/olcek.mjs                                 # 1.000 + 10.000, üç yol
node arac/olcek.mjs --yol a --olcek 10000 --tekrar 3
node arac/olcek.mjs --etiket ONCE  --json /tmp/once.json
node arac/olcek.mjs --etiket SONRA --json /tmp/sonra.json --karsilastir /tmp/once.json
```

Ölçülen yollar: **a** `lib/eylemler.ts → aktarimOnayla` (regülasyon maddesi),
**b** `lib/entegrasyon/varlikAktarim.ts → aktarimiUygula` ilk aktarım,
**c** aynı yol ikinci kez (hepsi güncelleme — farklı sorgu şekli).

Raporlananlar: süre · SQL sayısı · sorgu/satır · satır/sn · zirve yığın ·
transaction içi gidiş-dönüş; ayrıca ayrıştırma / eşleme / rapor serileştirme
maliyeti ve tablo başına sorgu+süre kırılımı (köken ve denetim izinin payı
buradan okunur).

Değişmezler:

* **Veri SENTETİKTİR**, gerçek sisteme bağlanılmaz. Her senaryo
  `prisma/dev.db`'nin geçici bir kopyasında koşar; gerçek dosyaya yazmayı
  araç içindeki koruma engeller.
* Üretim kaynağına ölçüm kodu girmez: araç `globalThis.prisma`'yı sorgu
  günlüklü bir istemciyle önceden doldurur, `lib/db.ts` onu alır. Almazsa
  ölçüm durur.
* Her senaryo AYRI çocuk süreçte koşar — taze DB kopyası ve komşu senaryodan
  etkilenmeyen zirve yığın için.
* **Makine paylaşımlı olabilir.** Her ölçümün yanında yük ortalaması basılır;
  `--tekrar N` ortanca koşuyu seçer. Sorgu sayısı deterministtir, süre
  gürültülüdür, zirve yığın (GC zamanlamasına bağlı) en gürültülüsüdür.

## Kalite kapıları (KK-1…KK-8)

Statik kapılar (`npm run lint` · `npx tsc --noEmit` · `npm test` ·
`npm run tasarim:kapi` · `npm run build`) `.github/workflows/pr-kapisi.yml`
içinde her PR'da koşar.

**İki tarayıcılı kapı da CI'da koşar ve BLOKLAYICIDIR:**
`yatay-tasma.mjs` ve `erisim-axe.mjs`. CI üretim derlemesini 3210'da
ayağa kaldırır (`next start`), Playwright'ın kendi chromium'unu kurar
(runner imajına bırakılmaz) ve ikisini koşar. Ölçüldü: taşma 89sn, axe
130sn. Bugünün açık bulguları `kalite-borcu.json` izin listesindedir ve
liste bir CIRCIRLA korunur — aşağıda.

Geri kalan tarayıcılı araçlar hâlâ **canlı sunucu ister** ve CI'da
koşmaz; port 3210'da elle koşulur (`PORT=3210 next dev` başka bir
kabukta). Hepsi tohum geliştirme girişiyle oturum açar
(`kosu-ortak.mjs`); gerçek kurum sistemine giden hiçbir şey yoktur.

| Betik | npm | Ne ölçer | Çıkış 1 |
| --- | --- | --- | --- |
| `rota-duman.mjs` | `rota:duman` | her `page.tsx` → HTTP 200, doğru kabuk, tek aktif öğe | kusurlu / test edilemeyen rota |
| `gezinme-testi.mjs` | `gezinme:test` | yedi bantta kabuk içi + kabuklar arası gezinme, dokunmatik + klavye | gezinme kusuru |
| `tarama.mjs` | `tasarim:rota` | yatay taşma · eski sınıf · boş ekran · sayfa hatası (`EN=1440,1024,768,375` çok bant) | kusurlu rota |
| `lighthouse.mjs` | `kalite:lighthouse` | 4 kategori puanı, `/giris` + 4 kanonik rota | eşik (90) altı |
| `gorsel-regresyon.mjs` | `tasarim:gorsel` | 8 rota × 2 bant, altın görüntüyle piksel farkı | fark > %0,5 ya da altın yok |
| `erisim-axe.mjs` **(CI · bloklayıcı)** | `tasarim:axe` | axe-core WCAG 2 A/AA, rotalar.json'daki tüm rotalar, **üç bant** (1440 · 768 · 375) | izin listesinde olmayan ya da tavanı aşan ciddi/kritik ihlal |
| `yatay-tasma.mjs` **(CI · bloklayıcı)** | `tasarim:tasma` | 375 + 768'de **iki kusur türü**: sayfa yana kayıyor mu · `overflow: hidden` kabında sessizce kırpılan içerik var mı | izin listesinde olmayan ya da tavanı aşan bulgu |
| `dizustu.mjs` | `tasarim:dizustu` | 1366×768'de kaydırılamayan (kırpılan) içerik var mı | kırpılan öğe |
| `marka-kapisi.mjs` | `marka:kapi` | ürün adı tek kaynaktan mı geliyor: nöbetçi adla statik demo derlemesi koşar, üretilen çıktıya bakar (tarayıcı istemez) | varsayılan ad işlenmiş yüzeyde geçiyor **ya da** nöbetçi görünmesi gereken yüzeyde yok |
| `turkiye-siniri.mjs` | `harita:sinir` | üretir (kapı değil): Natural Earth'ten Türkiye silüeti | kaynak/öznitelik bulunamadı |
| — | `test:kapsam` | vitest V8 kapsamı (`lib/**`, ekran `mantik.ts`/`ortak.ts`, `components/**`) | test kırığı |

### `marka-kapisi.mjs` — adın tek kaynaktan geldiğini DAVRANIŞLA ölçer

Kaynak ağacına hiç bakmaz. `NEXT_PUBLIC_MARKA_AD` nöbetçi bir dizgeye
(`ZZ-MARKA-NOBETCI-7`) ayarlanmış hâlde statik demo derlemesi koşar ve
`out/` altındaki üretilmiş dosyaları okur:

- **(a)** `lib/marka.ts` varsayılanı işlenmiş hiçbir yüzeyde geçmemeli —
  HTML, RSC yükü (`.txt`), CSS, manifest. **`*.js` taranmaz:** derleyici
  `env || 'varsayılan'` ifadesinin yedek operandını demette bırakır ve o
  dizge sızıntı değil, yedeğin ta kendisidir. Kapsam kaybolmuyor — biri
  adı bir bileşene düz metin yazarsa nöbetçi koşusunda işlenmiş yüzeyde
  görünür (ölçüldü: tek bir bileşen sabiti 460 dosyada yakalandı).
- **(b)** Nöbetçi ad, görünmesi gereken yüzeylerde geçmeli: kök ve giriş
  sekme başlıkları, kabuk sözcük markasının ikinci satırı ve onun
  `aria-label`'ı. Yalnız (a) ölçülseydi adı her yerden silmek de kapıyı
  geçerdi.

**Neden kaynak taraması değil.** İlk hâli adı kaynak ağacında dizge
olarak arıyordu ve ad Türkçe bir sözcük olduğunda çöküyordu: varsayılan
deneme amaçlı "Kayda" yapıldığında "Kayda git" düğmesi ve üç yorum
kusurlu göründü. Bkz. `docs/URUN_VIZYONU.md` §10 ad seçim ölçütü.

**Sınır.** Statik demoda `/giris` bir yönlendirme koçanıdır (demo kimliği
her zaman dolu), gövdesi boş çıkar; giriş ekranının hero metni bu kapıda
**ölçülmez**, yalnız sekme başlığıyla temsil edilir.

**Yan etki.** Derleme nöbetçi adla yapıldığı için kapı bitince `out/` ve
`.next` silinir — nöbetçi bir derlemenin yayımlanması ürün adının yanlış
görünmesi demektir. Sonraki gerçek derleme sıfırdan koşar.

### `kosu-ortak.mjs` · `kalite-kurallari.mjs`

Yeni araçların ortak parçaları. `kosu-ortak` tarayıcı yolu, oturum açma
(hidrasyon bekler, değerin yerleştiğini doğrular), rota listesi ve
`--rota=` / `--json <yol>` bayraklarını taşır. `kalite-kurallari` SAF
kararlardır — fark yüzdesi eşiği, Lighthouse eşik listesi, axe etki
sınıflandırması, altın dosya adı — ve `tests/kalite-kapilari.test.ts`
bunları tarayıcısız doğrular.

### `lighthouse.mjs`

Lighthouse kendi tarayıcısını açmaz: Playwright'ın **kalıcı bağlamla**
açtığı Chromium'a `--remote-debugging-port` üzerinden bağlanır (port
profil dizinindeki `DevToolsActivePort`'tan okunur). Kalıcı bağlam
seçildi çünkü Lighthouse yeni sekmeyi varsayılan profilde açar; yalıtık
`newContext()` çerezi oraya ulaşmaz. Aynı çerezler `extraHeaders.Cookie`
ile de verilir. `/giris` **oturumsuz** ölçülür (oturumluyken `/`'a atar).

```bash
PORT=3210 node arac/lighthouse.mjs
PORT=3210 node arac/lighthouse.mjs --rota=/,/uyum --esik 85 --json /tmp/lh.json
```

Eşiğin altındaki her kategori için puanı düşüren ilk altı denetim
(ağırlık sırasıyla) basılır. Performans puanı paylaşımlı makinede
gürültülüdür; sayıya değil düşüren denetime bakın.

### `gorsel-regresyon.mjs`

`arac/altin/<rota>-<bant>.png` altınlarıyla karşılaştırır (1440 · 375;
`/`, `/portfoy`, `/uyum`, `/bulgular`, `/envanter`, `/riskler`, `/topoloji`,
`/giris`). Animasyonlar `prefers-reduced-motion` + enjekte CSS ile
durdurulur; imleç gizlenir. Farklı piksel oranı %0,5'i aşarsa kusur ve
fark görüntüsü `FARK_DIZINI`'ne (varsayılan `$TMPDIR/gorsel-fark`) yazılır.
**Altın yoksa kusurdur**; `--yaz` altınları yeniler — yalnız bilinçli
tasarım değişikliğinden sonra, gözle bakarak.

İki eşik vardır ve karıştırılmamalıdır: `ESIK_YUZDE` (%0,5) *sayfanın ne
kadarı* değişince kusur sayılacağını, `PIKSEL_ESIGI` (0,05) *bir pikselin
ne kadar değişince* sayılacağını söyler. İkincisi 2026-09-02'de
pixelmatch varsayılanı olan 0,1'den indirildi: /portfoy şeridine beş
santral fotoğrafı eklendiğinde kapı %0,000 fark demişti — koyu temada
karartılmış bir fotoğraf bandının piksel uzaklığı 0,1'in altında kalıyor,
yani kapı ürünün yalnız parlak yerlerini ölçüyordu. Yeni değer ölçülerek
seçildi; gerekçe ve ölçüm tablosu aracın kendi içinde yazılıdır.

```bash
PORT=3210 node arac/gorsel-regresyon.mjs --yaz            # ilk altınlar
PORT=3210 node arac/gorsel-regresyon.mjs                  # karşılaştır
PORT=3210 node arac/gorsel-regresyon.mjs --rota=/uyum --bant=375
```

Sunucu saatine bağlı metinler (veri kesiti damgası) %0,5'i aşarsa eşiği
büyütmeyin; damgayı taşıyan öğeyi maskeleyin.

### `xlsx-fikstur.mjs`

İçe aktarım hattının `.xlsx` ayrıştırıcısını sınayan DONMUŞ fikstürü
üretir (`tests/fixture/aktarim-ornek.xlsx`). Testin kendi ürettiği bir
tampon işe yaramaz: yazıcı ve okuyucu aynı kütüphaneden gelir, ikisi
birden yanlış olsa bile kendi içinde tutarlı görünür. Depoda duran ikili
ne yazıyorsa onu yazar; sonradan gelen her okuyucu onu doğru çözmek
zorundadır — kütüphane sürümü değişince kapı burada çalar.

Fikstürdeki her satır ölçülmüş bir davranışı taşır: boş başlık, tekrar
eden başlık, tarih/sayı/mantıksal hücre, BOŞ hücre (`0` uydurulmamalı),
gerçek sıfır, baştaki-sondaki boşluk, Türkçe karakter, tümü boş satır.

```bash
node arac/xlsx-fikstur.mjs          # ne yazacağını söyler
node arac/xlsx-fikstur.mjs --yaz    # ikiliyi yeniden üretir
```

Tarayıcı istemez; `npm test` içinde `tests/xlsx-ayristirma.test.ts` onu
okur.

### `kalite-borcu.json` — kapıyı BUGÜN bloklayıcı yapan cırcır

Bir kapıyı "bütün bulgular bitince bloklayıcı yaparız" diye bekletmek,
kapıyı aylarca isteğe bağlı bırakır ve o arada borç sessizce büyür.
Bunun kanıtı bu depoda var: `/omur` taşması ve 49 rotadaki durum şeridi
kırpılması, aylarca kimsenin koşmadığı bir kapının arkasında durdu.

Alternatif: bugünkü borcu YAZIYA DÖK, kapıyı BUGÜN bloklayıcı yap,
listeyi bir cırcırla koru. Liste bir mazeret değil bir **tavandır**.

Satır biçimi — anahtar `kapi + tur + rota + bant + **hedef**`, tavan
`azami` (dinamik rotalarda `rota` KALIPTIR, somut URL değil):

```json
{ "kapi": "tasma", "tur": "kirpilan-icerik", "rota": "/aktivite",
  "bant": 375, "hedef": "span.kimlik-metin@150px", "azami": 1,
  "not": "kütük tablosu · sütun 0 genişliğe çöküyor …" }
```

#### Anahtar HEDEF KİMLİĞİ taşır — yoksa kapının içinde bypass olur

Anahtar uzun süre `kapi + tur + rota + bant` idi ve İKİ kapıda da hedef
kimliği YOKTU. Taşma kapısında hedef yalnız SAYIMA giriyordu (imza),
anahtara değil. Sonuç, artık bloklayıcı olan bir kapının içinde bir
bypass'tı:

> bir PR izinli hedefi kaldırır, aynı rotada + aynı bantta + aynı kuralla
> BAŞKA bir hedef getirir; sayı tavanı aşmadığı için bulgu "mevcut borç"
> sayılır ve ciddi bir ihlal, bir başkasının yerine SESSİZCE geçer.

Hedefi iki kapı ayrı üretir ama sözleşme tektir:

| Kapı | Hedef kimliği | Neden kararlı |
| --- | --- | --- |
| `yatay-tasma` | `etiket@kutuEni` | kutu eni yerleşimden gelir (`table-layout: fixed` sütunu), satır sayısından değil |
| `erisim-axe` | yapısal yol + sıra (`section > div.k#2`) | yol `:nth-child` taşımaz (kardeş eklenince kaymaz); sıra her zaman yazılır (düğüm eklenince kaymaz) |

**Sözleşme teste bağlıdır ve test İKİ kapıya birden sorar**
(`tests/kalite-kapilari.test.ts`): *aynı rota + bant + kural, FARKLI
hedef → FARKLI anahtar*; ayrıca hedef anahtardan düşerse iddia kırılır ve
hedef değiştiğinde bulgu "mevcut borç" SAYILMAZ. Bir sonraki ayrışma
incelemede değil kapıda çıkar.

`kirpilan-icerik` ölçüsü bu yüzden artık **varlıktır** (1): "bu hedef
burada kırpılıyor". Örnek sayısı satır sayısına, yani tohuma bağlı
olurdu; büyümeyi ALT KÜME dişi yakalar — yeni bir hedef, yeni bir satır
demektir.

**axe kimliği, axe'ın SEÇİCİSİNDEN türetilmez.** Bu ölçümle
kararlaştırıldı, tahminle değil. axe hedefi düğümü DOM'da benzersiz kılan
EN KISA seçicidir; yani sayfadaki öteki düğümlere bağlıdır:

> **Ölçüldü** — `/saklama` · 375px, tek bir `LegalHold` kaydı eklenerek
> (ekran üç `<Tablo>` render eder, ikisi koşulludur):
>
> | | 0 kayıt | 1 kayıt |
> | --- | --- | --- |
> | axe hedefi | `.ab-vt-sar` | `section > .ab-vt-sar` |
> | eşleşme | 1 | 2 |
>
> Yani hem eşleşme SAYISI hem HAM SEÇİCİNİN KENDİSİ veriyle değişti.
> Kimliği ikisinden birine bağlamak, veri değişince satırı "yeni"
> gösterir, DİŞ 3 yeniden yazmayı yasaklar ve düzeltmeyi yapan kişi
> KİLİTLENİR — tavanları öğe sayısına bağlayıp CI'yı kırdıran hatanın
> aynı ailesi.

Kimlik bunun yerine **sayfanın yapısından** üretilir:

| Parça | Tanım | Neden |
| --- | --- | --- |
| yapısal yol | gövdeye doğru en fazla dört kademe; her kademe `etiket` + SIRALI sınıfları | `:nth-child` YOK — ilgisiz bir kardeşin eklenmesi kimliği kaydırmaz |
| sıra | aynı yapısal yola uyan düğümler arasındaki sıra, **her zaman** yazılır (`#1` dahil) | yalnız çakışınca eklenseydi, ikinci düğüm çıkınca BİRİNCİNİN kimliği `yol` → `yol#1` diye değişirdi |

> **Kararlılık ÖLÇÜLDÜ.** Aynı iki veri durumunda kimlikler birebir aynı
> çıktı: `/saklama` → `…> div.ab-vt-sar#1`, `/sistem` → `…>
> div.ab-sistem-kaydir#1` ve `#2`. Veri eklenince çıkan tek fark
> GERÇEKTEN yeni bir ihlaldi (`select-name`), kimlik kayması değil.

Aynı yapısal yolu paylaşan düğümler `AYRIŞTIRILDI` diye raporlanır —
"birleştirildi" değil.

##### YORDAM · yeni bir axe borç satırı eklerken

Kimliğin veri altında kararlı olduğunu **ÖLÇ**; varsayma. Bugün
`/saklama` için yapılan ölçümün aynısı:

1. Satırın rotasını iki veri durumunda tara — ilgili kayıt **yokken** ve
   **varken** (`/saklama` için tek bir `LegalHold` satırı yetti).
2. İki koşuda **aynı kimlik** çıkmalı. Çıkmıyorsa satır listeye
   yazılmaz; kimlik önce kararlı hâle getirilir.

Sıra numarası, aynı yapısal yola uyan düğüm kümesi **YAPISAL** ise
kararlıdır — `/sistem`'de bölümler, `/saklama`'da sabit tablolar; ikisi
de ölçüldü. Küme **kayıt başına** üretiliyorsa (her kayıt için bir
kaydırma bölgesi) araya kayıt girdiğinde `#3` `#4` olur ve kilit geri
gelir; o satır için başka bir ayırt edici gerekir.

**Bugün böyle bir satır yok.** Çıktığında bu ölçüm onu gösterir — bu
yüzden buraya makine değil yordam yazıldı: sıfır örneği olan bir durum
için kod, bakımı olmayan bir tahmindir.

**Taşma kapısında aynı soru sorulamaz ve bu bilerek böyledir.** Oradaki
kimlik `etiket@kutuEni`dir ve tekrarlayan tablo satırlarını BİLEREK tek
hedefte toplar; onları ayrıştırmak ölçüyü satır sayısına, yani tohuma
geri bağlardı — bu turda iki kez düzeltilen hatanın aynısı. Yapısal
olarak farklı bir kırpma zaten farklı kutu eni verir ve ayrı hedef olur.
Asimetri kasıtlıdır; "tutarsız" diye tekleştirilmemelidir.

#### Anahtar şeması geçişi — kaldıraç değil, kanıt

Anahtara hedef eklemek tabandaki her satırın anahtarını değiştirir ve
cırcır bunu "hepsi eklenmiş" diye okur. Aynı borcun DAHA KESİN yazılması
büyüme değildir; ama "daha kesin yazmak" da borcu büyütmenin yolu
olamaz. Geçiş üç şartla açılır:

1. Yalnız TABAN satırı hedefsizse — koşul tabanın şeklidir, **dal onu
   belirleyemez**. Taban hedefli satır taşımaya başladığında (yani bu
   değişiklik main'e girdiğinde) yol KALICI olarak kapanır.
2. Bir eski satırın altına o satırın TAVANINDAN çok yeni satır konamaz.
3. Hiçbir yeni satırın tavanı eskisini aşamaz.

Beş vaka bunu sınar; dördü geçişin SINIRLARINI sınar.

**Dört diş.** Biri gevşerse ötekiler kâğıttan kalır:

| Diş | Ne engeller | Kırmızı olduğu an |
| --- | --- | --- |
| **1 · TAVAN** | Var olan borcun büyümesi | ölçüm `azami`yi aşar |
| **2 · ALT KÜME** | Yeni borç açılması | bulgu listede yok |
| **3 · TABAN DAL** | Listeye satır eklenmesi / tavan yükseltilmesi | dal listesi `origin/main` listesinin alt kümesi değil |
| **4 · OKUNAMAZSA KIRMIZI** | Cırcırın sessizce atlanması | taban dal okunamıyor **ve** CI'dayız |

Üçüncü diş olmasaydı ilk ikisi kâğıttan olurdu: bulguyu düzeltmek yerine
listeye bir satır eklemek kapıyı yeşile döndürürdü. Taban dal **dalın
kendisi değil `origin/main`'dir** — dalın kendi listesine bakmak, dalın
kendi eklemesini meşrulaştırırdı. Dördüncü diş de aynı sebeple sert:
karşılaştırılamayan bir izin listesi, listenin büyümediğini KANITLAMAZ,
o yüzden sığ klonda CI kırmızıdır (`fetch-depth: 0` şart).

Yerelde taban dal yoksa **gerekçeli** atlanır; CI'da gerekçe işe yaramaz.
`CI` değişkeni AYRIŞTIRILIR (`ciMi`): kabuklar `CI=false` / `CI=0` ihraç
eder ve `Boolean()` ikisini de doğru sayardı — yerel kabuk kendini CI
sanar, belgelenmiş çıkış sessizce kaybolurdu (ölçüldü: `CI=false` +
gerekçe → yeşil, `CI=true` + gerekçe → kırmızı).


```bash
PORT=3210 node arac/yatay-tasma.mjs --circir-atla="taban dal bu klonda yok"
```

Taban dal erişilebilir ama listeyi **henüz taşımıyorsa** (listeyi kuran
commit) o tur muaftır ve "İLK KURULUM" diye yazar — bu, sığ klondan
ayrıdır ve ayrımı önemlidir: ilki muaf olmalı, ikincisi kırmızı.

Kararlar `kalite-kurallari.mjs → borcSuzgeci · circirKarari` içinde SAF
işlevlerdir ve `tests/kalite-kapilari.test.ts` ile tarayıcısız
doğrulanır; `kalite-borcu.mjs` yalnız dosya/git okur ve raporlar.

> **Dört dişin de ISIRDIĞI denenerek doğrulandı.** DİŞ 1: `/omur` 375
> tavanı 4→3 düşürüldü, kapı kırmızı (`4 > 3 px`). DİŞ 2: aynı satır
> silindi, kapı kırmızı ("izin listesinde OLMAYAN 1 bulgu"). DİŞ 3:
> listeye satır eklendi ve tavan yükseltildi, ikisi de kırmızı. DİŞ 4:
> taban dal olmayan bir dala çevrildi — CI'da kırmızı, yerelde gerekçesiz
> kırmızı, gerekçeli yeşil, CI'da gerekçeyle yine kırmızı. Deneme
> değişiklikleri geri alındı.

**Bir satır düzeldiğinde silinir.** Kapı zaten söyler: "DÜZELMİŞ BORÇ · N
satır — kalite-borcu.json içinden SİLİN". Silinen satır DİŞ 3 yüzünden
geri gelemez. **Liste BOŞALABİLİR** — borçsuz hâl cırcırın hedefidir ve
testler bunu engellemez (`length > 0` beklemek, son satır silindiğinde
`npm test`i kırar ve sonsuza kadar yapay borç tutmayı zorunlu kılardı).

#### Tavan VERİYE BAĞIMLI olamaz

`kirpilan-icerik` ölçüsünün birimi **kusur TÜRÜDÜR**, kırpılan öğe sayısı
değil: **etiket + kırpılma türü + kutu eni** tek imzadır. Kutu eni imzaya
girer çünkü aynı etiketle kırpılan YENİ bir sütun, yoksa mevcut imzanın
arkasına saklanırdı; kutu eni yerleşimden gelir (`table-layout: fixed`
sütun genişliği), satır sayısından değil. Kırpılan px imzaya GİRMEZ — o,
metin uzunluğuyla yani veriyle değişir. Sebep ölçüldü —
kütük tablosunda her SATIR ayrı öğe sayılıyordu ve tavan tohum verisiyle
oynuyordu:

> `/saglik` · 375px: yerelde **8**, CI'da **23** öğe — aynı iki kusur
> türü. Tavanı 8 yazan liste CI'da kırmızı yandı; kusur değişmemişti,
> yalnız satır sayısı değişmişti. İmzaya çevrilince ikisi de **2**.

Aynı sebeple iki şey daha yapılır:

- **Dinamik rota kaydı `id`ye göre SEÇİLMEZ.** `@default(cuid())` her
  seed'de başka bir kaydı "ilk" yapardı ve kapı her koşuda başka bir
  ekranı ölçerdi. Sıra tohumda ELLE yazılmış bir alandan alınır (`kod`,
  yoksa `baslik`); kimlik yalnız URL'e konur.
- **Tavanlar TAZE tohumla ölçülür.** Yeniden ölçmeden önce
  `rm prisma/dev.db && npm run db:hazirla`. Kapının kendi girişi kayıt
  üretir (aktivite, bildirim), yani ikinci koşu birinciden farklı satır
  görebilir. Satır listede olduğu sürece bu salınım kapıyı YAKMAZ:
  eksik çıkan satır "düzelmiş" diye raporlanır, kırmızı değil. Ölçüldü:
  `/bildirimler` peş peşe iki koşuda 0 ve 1 kusur türü verdi, ikisi de
  yeşil.

#### Listenin KENDİSİ silinirse

En sinsi kaçış yolu bir satırı değil DOSYANIN TAMAMINI silmektir: liste
yoksa "muaf değil" diye okunacak bir şey de yoktur. Bu yol iki yerden
kapatılır ve ikisi de ÖLÇÜLDÜ.

**Liste modül seviyesinde okunur.** `kalite-borcu.mjs` listeyi
`borcuUygula` içinde çağrı anında değil, modül yüklenirken okur. Yani
modülü içe aktaran her yol — iki kapı ve testler — liste okunamıyorsa
ilk satırda düşer. Liste kapının PARÇASIDIR, muafiyet defteri değil;
silmek kapıyı susturmaz, kapının kendisini yıkar.

> **Ölçüldü, önce ve sonra.** Okuma çağrı anındayken liste silinince kapı
> gerçekten kırmızı yanıyordu — ama ham bir `ENOENT` yığın iziyle ve
> tarayıcı koşusunun **90 saniyesi harcandıktan sonra**. Şimdi **1
> saniyede** ve adıyla düşüyor:
> `BORÇ LİSTESİ OKUNAMADI · web/arac/kalite-borcu.json`.
>
> Asıl tehlike de ölçüldü: *taban dalda liste yok + çalışma ağacında
> liste yok* kombinasyonu "İLK KURULUM" diye OKUNMUYOR — okuma
> `tabanBorcOku`dan önce patlıyor. Eski hâlde bu, iki satırın SIRASINA
> bağlı bir güvenceydi; şimdi yapıdan geliyor.

**Listenin varlığı AYRI bir iddiadır.** `tests/kalite-borcu-listesi.test.ts`
muafiyet mantığından bağımsız koşar ve `kalite-kurallari.mjs`'i bilerek
içe aktarmaz. Dosya okuması `describe` gövdesinde değil TEST GÖVDESİNDE
yapılır — aradaki fark ölçüldü:

| Liste silinince | `describe` gövdesinde okuma | test gövdesinde okuma |
| --- | --- | --- |
| vitest sonucu | dosya TOPLANAMIYOR · "Tests: **no tests**" | **6 vaka ADIYLA** düşüyor |
| cırcırın 34 birim vakası | hepsi birden adsız hataya dönüşüyor | koşuyor ve geçiyor |

Kaçış yolunun kapalı olduğunu söyleyecek iddia, kaçış denendiğinde
susmamalı.

### `yatay-tasma.mjs` — İKİ kusur türü

**1 · Sayfa yana kayıyor.** Dar bantta sayfanın yana kaymasını ölçer ve
**taşmayı üreten öğeyi** adlandırır: taşan ama atası taşmayan, ve yol
üstünde kaydırma/kırpma kabı bulunmayan öğe. Kaydırma kabı içindeki taşma
kusur DEĞİLDİR — üst çubuklar dar bantta bilerek yatay kaydırılır.

`tarama.mjs` de taşma ölçer ama tek bir sayı olarak ve varsayılan olarak
tek bantta (`EN=` verilmezse 1440); dar bant kusurları o yüzden yıllarca
görünmedi. Bu araç iki dar bandı (375 · 768) tüm rotalarda VARSAYILAN
koşar ve suçluyu yazar; ikisi birbirinin yerine geçmez.

**2 · Kırpılan içerik.** Birinci ölçü tek başına KÖRDÜ. `overflow:
hidden` bir kap taşmayı yutunca sayfa kaymaz, kapı "0 kusur" der — oysa
içerik ekranda yoktur ve hiçbir jestle geri gelmez. Bu, `dizustu.mjs`'in
DİKEY eksende ölçtüğü kusurun yatay eşleniğidir ve aynı iki alt ölçüyü
kullanır:

| Ölçü | Ne der | Ölçülen örnek |
| --- | --- | --- |
| `disari` | Öğenin KUTUSU, kırpan atanın görünür kutusunun dışında kalıyor | `/tesisler/[id]` · 375px: 420px veri paneli `left: -45px`'e oturuyor, sol 45px'i plakanın kenarında kesiliyor ("UYUM ENDEKSİ" → "UM ENDEKSİ") |
| `tasma` | Öğenin AKIŞ İÇİ ve GÖRÜNÜR içeriği kendi kutusuna sığmıyor | aynı rota · 375px: künye ve ölçü şeridi 0px kutuya çöküyor · 768px: beş ölçü 42px sütunlara sıkışıp komşusunun üstüne biniyor |

Ayrım "kaydırılabiliyor mu" DEĞİL, **"erişilebiliyor mu"**: yol üstünde
`auto`/`scroll` bir kap varsa içerik kaydırılarak görülür, kusur değildir;
`hidden`/`clip` kabında görülemez, kusurdur. Kırpan kap hiç yoksa taşma
belgeye çıkar ve birinci ölçü onu zaten yakalar. `tasma` için öğenin KENDİ kırpması ancak
GÖRÜNÜR bir işaret taşıyorsa muaftır: `text-overflow` (üç nokta) ya da
`-webkit-line-clamp`. İşaretsiz kırpma — `overflow: hidden` +
`white-space: nowrap`, üç nokta yok — kusurdur ve `işaretsiz kırpma`
diye raporlanır; metin düğümleri ağaçta gezilmediği için o kayıp başka
hiçbir ölçüde görünmezdi. `disari` için muafiyet öğenin KENDİSİNE değil
**KIRPAN ATAYA** bakar: ata görünür bir kesme işareti taşıyorsa kesme
duyurulmuştur ve ata kutusunun kestiği çocuk da o işaretin kapsamındadır;
işaretsiz kırpan ata suçlu kalır.

> **Ölçüldü · `/kanitlar` · 375px:** kırpan ata `text-overflow: ellipsis`
> VE `title` taşıyordu — kesme kenarında üç nokta çizilir ve "devamı var"
> der. Bu muafiyet olmadan **12 borç satırı yanlış alarmdı**. Hero
> plakası (`overflow: hidden`, işaret yok) muaf DEĞİLDİR ve suçlu
> kalır — ayrım tam olarak oradadır.

> Bugün **`işaretsiz kırpma`** kalıbından **0 bulgu** çıkıyor (son
> koşuda da 0 · ölçüldü): kod tabanındaki kendi kırpmasını yöneten
> öğelerin hepsi ya üç nokta gösteriyor ya da taşmıyor. Kural yine de
> kapıdadır — kalıp yarın girerse yakalanır.

Karar `kalite-kurallari.mjs → kirpilmaKarari` içindedir ve
`tests/kalite-kapilari.test.ts` ile TARAYICISIZ doğrulanır; araç sayfada
yalnız ham geometri toplar.

> **Ölçülen ve elenen yanlış alarm.** İlk uygulama `scrollWidth -
> clientWidth` kullanıyordu ve 8 rotada 60'tan çok yanlış bulgu üretti:
> `scrollWidth` konumlandırılmış ve gizli soyları da sayar, yani her ipucu
> balonu ve her tuval künyesi "kırpılmış" görünüyordu. Ölçü akış içi +
> görünür geometriye çevrildi; yanlış alarmların tamamı düştü.
> `dizustu.mjs`'in kendi dersiyle (ekran okuyucuya bırakılmış görünmez
> metin kırpma değildir) aynı eleme burada da yapılır: `clip-path`
> taşıyan öğe listeye girmez.

> **Bant eklendiği gün ölçüldü** (50 rota × 2 bant): taşan rota **2**
> (`/omur`, `span.ad` ">1 yıl" · 4px / 3px) · kırpılan içerik **51 rota ·
> 106 öğe**. Kök sebep üç tanedir: (a) `.ab-durum` durum şeridi
> `white-space: nowrap` + `overflow: hidden` ile 375'te iki kalemi
> kesiyor — 49 rota × 2 öğe; (b) `/sistem/bilesenler` topoloji düğümleri
> tuvalin kenarında kesiliyor (6 öğe · 375, 2 öğe · 768); (c)
> `/tesisler/[id]` hero plakası (ayrı düzeltildi). `.ab-alt` ayağında
> AYNI kalıp daha önce ölçülüp düzeltilmişti (aşağıda); `.ab-durum` o
> turda atlanmış.

#### Detektörün kendi kör noktaları — üçü inceleme ile bulundu

İlk hâl üç yerde eksikti; üçü de PR incelemesinde işaret edildi,
doğrulandı ve düzeltildi.

**1 · Erişilebilirlik YAPIŞKAN olamaz.** Yol üstünde bir kez `auto`
görülünce aşağısı "erişilir" sayılıyordu. Oysa bir kaydırma kabının
İÇİNDEKİ `overflow: hidden` kap kendi içeriğini yine kırpar ve dıştaki
kabı kaydırmak onu geri getirmez. Durum artık her zaman EN YAKIN kaba
göre kurulur.

> **Maskelediği kusur ölçüldü ve görsel olarak doğrulandı.** Kütük
> tabloları `.ab-vt-sar { overflow: auto }` içindedir; içlerindeki
> `.ab-vt th, .ab-vt td` ise `overflow: hidden` taşır ve
> `table-layout: fixed` dar bantta sütunu **0 genişliğe** çöktürür.
> `/aktivite` · 375px: ekranda yalnız ZAMAN ve DEĞİŞİM sütunları var —
> "KAYIT" başlığı ve her satırın ne olduğu (`span.kimlik-metin`,
> "Kullanıcı A giriş oluşturdu") TÜMÜYLE görünmüyor. Yapışkan bayrak
> bunu platform genelinde saklıyordu.

**Kapatıldı — ve kapatan şey bileşenin KENDİ niyetiydi.** `.ab-vt-sar`
bir kaydırma kabıdır ve kimlik sütunu yatay kaydırmada YAPIŞKAN kalsın
diye yazılmıştır; yani kütük yatay kaydırma için TASARLANMIŞ.
`width: 100%` + `table-layout: fixed` bunu hiç gerçekleşmeden
öldürüyordu: tablo kabını asla aşmadığı için kaydırma HİÇ olmuyor,
sütunlar sıfıra doğru eziliyor ve `overflow: hidden` kalanı sessizce
kesiyordu. `kabuk.css` ≤900px'te düzeni niyete döndürür: sütunlar
İÇERİĞE göre ölçülür (`table-layout: auto` · `min-width: 100%`), tablo
kabı aşar, kap kaydırır, kimlik sütunu yapışkan kalır. Bilgi GİZLENMEZ,
hiçbir sütun DÜŞMEZ. `kolon-hizasi.mjs` ("tablo kabını aşmıyor")
1440 · 1366 · 1280'de koşar, yani bu kuralın ÜSTÜNDE; etkilenmez.

> **Ölçüldü:** kırpılan içerik **51 rota → 4 rota**; borç listesinden
> **80 satır** eridi, karşılığında **0 yeni taşma bulgusu** çıktı.
>
> Kütükler gerçekten kaydırmaya başlayınca axe **yeni bir ciddi ihlal**
> gösterdi: `/api-sozlesmesi` · 375px · `scrollable-region-focusable`.
> Kusur eskiden de oradaydı ama GÖRÜNEMEZDİ — hiç kaydırmayan bir kap
> "klavyeyle erişilemez kaydırma bölgesi" olmaz. `.ab-vt-sar` artık
> `role="region"` + tablonun adı + `tabIndex={0}` taşır; aynı düzeltme
> `/saklama`'nın borç satırını da kapattı.

**2 · Metin şart değildir.** `textContent` boş diye eleme, kırpılan bir
görseli, SVG şemayı ya da yalnız simge taşıyan bir düğmeyi hiç aday
yapmıyordu — kaybolan şey bir bilgi ya da bir EYLEM olabilir. Artık
`img · svg · canvas · video · iframe · object` ve etkileşimli öğeler de
ölçülür; dekoratif gürültü `aria-hidden` · görünmezlik · `clip-path`
elemeleriyle dışarıda kalır.

**3 · Dinamik rotalar taranmıyordu.** `rotalar.json` yalnız statik
rotaları taşır ve `/tesisler` zaten `/portfoy`'a yönlenir; yani altı
kayıt detayı ekranının hiçbiri taranmıyordu — **kapıların koruması
gereken Tesis 360 dahil**. İki kapı da artık `dinamikRotalar()` ile
tohumdan somutlaşan rotaları da tarar (56 rota · 112 ölçüm).

> Borç satırı somut URL'e değil **KALIBA** anahtarlanır
> (`/riskler/[id]`): tohum kimlikleri `@default(cuid())` ile her seed
> koşusunda değişir, somut URL yazılsaydı CI'daki kimlik yerelde
> ölçülene hiç uymaz ve liste kilitlenirdi.

**Her kalıptan tek kayıt değil, ÜÇ KAYIT VARYANTI taranır.** Tek kayıt
ölçmek içeriğe bağlı kusuru kaçırır ve bunun kanıtı bu depodadır: Tesis
360'ın 768px kusuru 17 tesisin **yalnız 5'inde** çıkıyordu (açık bulgusu
olanlarda). `kod`a göre sıralı ilk üç tesis SAHA-A1 · A2 · A3 ve kusurlu
beşin ikisi (A2, A3) bu üçün içindeydi — üç örnek o kusuru YAKALARDI,
tek örnek kaçırırdı. Sayı `TOHUM_ORNEK` ile artırılabilir.

Aynı kalıptan birden çok bulgu geldiğinde tavan **EN KÖTÜ varyanta**
göre tutulur. Toplamak ölçüyü örnek sayısına yani tohuma bağlardı;
ilkini almak kusurlu varyantı temizin arkasına saklardı — ikisi de bu
turda düzeltilen hataların aynısı olurdu.

> **Ölçüldü:** 6 → 18 dinamik rota · taşma 112 → **136 ölçüm · 119sn** ·
> axe 171 → **207 tarama · 176sn**. İkisi de exit 0.

**Çözülemeyen dinamik rota bir uyarı değil, KIRIK TARAMADIR.** Tablo ya
da kolon yeniden adlandırılırsa, tohum tablosu boşalırsa veya
veritabanı okunamazsa rota listeden sessizce düşerdi ve kapı yeşil
kalırdı — kapatılan kör nokta geri açılırdı. Böyle bir rota kapıyı
KIRMIZI yakar ve izin listesine GİREMEZ: ölçülemeyen bir şey "borç"
değildir. `--rota=` ile kapsam elle daraltıldıysa dinamikler zaten
istenmemiştir; orada kırık sayılmaz.

> **Denendi:** `DB_YOL=/olmayan/dev.db` ile iki kapı da altı dinamik
> rotayı çözemedi ve ikisi de exit 1 verdi; `--rota=/uyum` ile aynı
> koşu exit 0.

**Yanlış YÜZEYİ taramak, taramamaktan beterdir.** 404/500 gövdesi ya da
giriş ekranı taşmaz ve "yeni ciddi ihlal yok" der; kapı yeşil kalır.
Tohumdan somutlaşan detay rotalarında bu özellikle kritiktir — geçerli
bir kimlik + bozuk bir işleyici tam olarak bu tuzağı kurar. İki kapı da
artık HTTP durumunu ve varışı denetler; `rota-duman.mjs`'in kuralı
geçerlidir (`BILINCLI_YONLENDIRME`: yalnız yazılı yönlendirme kabul
edilir, bugün tek satır `/tesisler → /portfoy`).

> **Denendi:** `--rota=/boyle-bir-rota-yok` ile axe `KIRIK: HTTP 404 —
> yanlış yüzey tarandı` yazıp exit 1, taşma kapısı `KIRIK TARAMA · 2
> rota YANLIŞ YÜZEY döndürdü` yazıp exit 1 verdi.

```bash
PORT=3210 npm run tasarim:tasma
PORT=3210 node arac/yatay-tasma.mjs --rota=/uyum,/kanitlar
```

### `turkiye-siniri.mjs`

Haritadaki (`/harita`) ülke silüetini **Natural Earth 1:50m Admin 0**
verisinden üretir; çıktı `lib/cografya/turkiyeSiniri.ts`, **elle
düzenlenmez**.

```bash
curl -sL -o /tmp/ne50.geojson \
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
npm run harita:sinir -- --kaynak /tmp/ne50.geojson
```

**Lisans kararı.** Natural Earth **kamu malıdır**: izin gerekmez, atıf
zorunlu değil, ticari kullanım serbest. Elenenler: **GADM** ticari
kullanımı izne bağlar; **OSM türevleri** ODbL ile türev veritabanında
paylaş-benzer yükümlülüğü doğurur — kurumsal bir uyum ürününde açılmaması
gereken bir hukuk sorusu.

**Yalnız Türkiye çizilir**, dünya altlığı değil. Komşu ya da ihtilaflı
sınır çizilmediği için o konu ekranda hiç doğmaz.

**Tolerans ölçüyle seçilir.** Tuval 960×420, iç alan 904×364px; 1px ≈
0,0216° boylam · 0,0187° enlem. Tolerans `0,008°` — sapma ekranda bir
pikselin altında. Sınır bir **kıyı çizgisi değil**, o ölçekte okunabilir
bir silüettir; not ekranda da böyle yazar.

Ölçüldü: ham 562 nokta → **457 nokta · 3 halka**, elenen halka yok, iç
halka yok. Araç deterministiktir (aynı girdi → bayt bayt aynı çıktı).

**Nöbetçisi `tests/turkiye-siniri.test.ts`.** Üretilmiş dosyanın tehlikesi
bayatlamasıdır; test dört şeyi bağlar: kırpma çerçevesi `CERCEVE` ile
aynı mı, tolerans bir pikselin altında mı, izdüşürülen her nokta tuvalin
içinde mi, ve **bu poligon gerçekten Türkiye mi**.

> Sonuncusu şema testiyle yakalanamaz. Denendi: araç yanlışlıkla
> Yunanistan'a yönlendirildiğinde şema ve geometri testlerinin **sekizi de
> geçiyor** — yalnız "Ankara karada olmalı" kırmızıya düşüyor. Yanlış
> ülkeyi çıkaran bir araç, o test olmasa sessizce yayına giderdi.

### `dizustu.mjs`

**Sahada ekranlar dizüstünde açılıyor** (ürün sahibi, 03.09.2026). Bu cevap bir
genişlik sorusu değil, bir **yükseklik** sorusudur:

- 1366px genişlik kabuktaki her kırılma noktasının üstündedir; yatay
  tarafı `yatay-tasma.mjs` (375 · 768) ve `kolon-hizasi.mjs`
  (1440 · 1366 · 1280) zaten ölçüyor.
- 768px yükseklik yeni bir gerçekliktir: `kabuk.css`'teki yükseklik
  sözleşmesi `@media (min-width: 1025px) and (min-height: 680px)` ile
  açılır, yani 768'de **açıktır**. Saha ekranı orada
  `height: calc(100dvh - 56px - ...)` alır, `.ab-b-alan` `overflow: hidden`
  taşır.

Sözleşme + `overflow: hidden` ürünün en sinsi kusur sınıfını üretir:
**kap içeriğinden kısa kalır ve fazlası kaydırılamaz.** Kullanıcı eksik
olduğunu bilmez, ekran dolu görünür.

İki ayrı kayıp biçimi ölçülür ve ikisi de gerekir:

1. **Kap kendi içeriğini kırpıyor** — `scrollHeight > clientHeight` ve
   `overflow-y: hidden`.
2. **Çocuk, kırpan atasının alt kenarının altında kalıyor** — kap taşmaz,
   çünkü çocuk kendi içeriğine sığar; yalnız görünmez. `kabuk.css`'te
   yazılı Santral 360 kusuru (hero plakası `minmax(0,1fr)` satırında 0'a
   ezilip zincir/şerit üst üste binmesi) tam olarak budur ve birinci ölçü
   onu yakalayamaz.

Kusur **olmayan** taşma: kaydırılabilen kap (`auto`/`scroll`) ve bilerek
kısaltma (`text-overflow: ellipsis`, `-webkit-line-clamp`).

> **Ölçülen ve elenen ilk yanlış alarm.** İlk koşu 40 "kırpılma" bildirdi
> ve **kırkı da yanlıştı**: 38 rotada `a.ab-atla`, ikisinde
> `.ab-gizli-okuma`. İkisi de ekran okuyucuya konuşan görünmez metnin
> standart kalıbıdır (`width/height: 1px; clip-path: inset(50%)`); orada
> kırpma öğenin kendisidir ve kimseden bilgi saklamaz — okuyucu metni tam
> okur. Ders `gezinme:cekmece`'nin `/varlık/i` kusuruyla aynı: ölçüm
> yanlışsa hükmü de yanlıştır. Artık görünür kutusu 1px'ten ince olan öğe
> elenir.

**Kapının ısırdığı denenerek doğrulandı:** `.ab-b-alan { height: 120px }`
geçici olarak eklendi, kapı dört kusurla kırmızıya düştü ve dördüncüsü
(`div.katmanlar ⊄ section.ab-b-alan`) yalnız ikinci ölçüyle görünüyordu —
ikinci ölçü yerini böyle hak etti. Kural geri alındı.

Bugünkü ölçüm: **38 rota · kırpılan öğe 0 · yatay taşan rota 0.**

```bash
PORT=3210 npm run tasarim:dizustu
PORT=3210 node arac/dizustu.mjs --rota=/,/portfoy
```

### `erisim-axe.mjs`

`erisim.mjs`'in dört kusur ölçümünü tamamlar: axe-core (`node_modules`
içindeki `axe.min.js` sayfaya enjekte edilir) `wcag2a` + `wcag2aa`
etiketli kuralları `rotalar.json`'daki her rotada ve oturumsuz `/giris`'te
koşar. `serious`/`critical` ihlal çıkış kodu 1; `minor`/`moderate`
listelenir, engellemez.

**Üç bant koşar** (1440×900 · 768×1024 · 375×780). Uzun süre yalnız
1440'ta koştu ve bu onu dar bantta KÖR bırakıyordu: erişilebilirlik
ihlallerinin bir kısmı ancak yerleşim değişince doğar — dar bantta
beliren kaydırma kapları, sarılan başlıklar, küçülen dokunma hedefleri.
Görmediği kusuru "yok" diye raporlayan bir kapı, kusuru kalıcılaştırır.

> **Ölçüldü** (bant eklendiği gün, 51 rota × 3 bant = 153 tarama):
> 1440'ta 0, 768'de 0, **375'te 2 ciddi ihlal** — ikisi de
> `scrollable-region-focusable`: `/saklama` (`.ab-vt-sar`, 1 düğüm) ve
> `/sistem` (`.ab-sistem-kaydir`, 2 düğüm). Yani telefonda üç kaydırma
> bölgesi klavyeyle erişilemiyordu ve kapı bunu hiç görmemişti.

Bant seçimi `yatay-tasma.mjs` ile bilerek AYNIDIR: iki araç aynı kusuru
aynı koşulda görsün. Tek bant koşmak için `--bant=375`.

```bash
PORT=3210 node arac/erisim-axe.mjs --json /tmp/axe.json
PORT=3210 node arac/erisim-axe.mjs --bant=375 --rota=/uyum
```

### Bantlar

`gezinme-testi.mjs` yedi bant koşar (1920 · 1440 · 1100 · 1024 · 900 ·
768 · 375); `--hizli` eski dörtlüyü (1440 · 1100 · 900 · 375). `tarama.mjs`
`EN` değişkenini virgüllü liste olarak alır.

## `ux-denetim.mjs` — mevcut kapıların bilerek dışarıda bıraktığı aile

`npm run tasarim:ux` (canlı sunucu ister). 49+1 rota × 9 bant = 450 ölçüm.

Öteki kapıların GÖRMEDİĞİ kusurları ölçer:

| Ölçü | Ne arar |
| --- | --- |
| `gizliKirpma` | Kaydırma çubuğu gizli bir kapta ekran dışında kalan etkileşimli öğe. `yatay-tasma.mjs` kaydırma kabı içindeki taşmayı KUSUR SAYMAZ (ve haklıdır); burada masaüstünde ipucu vermeyen kap kusurdur. |
| `isYuzeyiY` | Ekranın asıl tezgâhının (tablo/ızgara) üstten uzaklığı. Kullanıcı oraya gelmiştir. |
| `kartIzgarasi` | İki+ sütuna dizilmiş, kendi kenarını çizen, çok satırlı kutular — "generic SaaS card grid" yasağının sayısal karşılığı. |
| `yerTutucu` · `tekrarSayi` · `kucukHedef` · `baslikAtlama` | İlk ekrandaki boş-durum metinleri, künyede tekrarlanan sayılar, 24px altı hedefler, atlanan başlık kademesi. |

Dokunmatik bant (≤700px) ayrıdır: orada yatay kaydırma beklenen jesttir
ve kusur sayılmaz — `yatay-tasma.mjs` ile aynı ayrım.

## `cekmece-erisim.mjs` — çekmece AÇIKKEN ölçülenler

`npm run tasarim:cekmece --bant 1440` (canlı sunucu ister).

`erisim.mjs` sayfanın durgun hâlini ölçer; çekmecenin kusurları ancak
çekmece açıkken görünür: ESC, açılışta/kapanışta odak, erişilebilir ad ve
İŞ YÜZEYİNİ ÖRTME.

Bu panel BİLEREK modal değildir (`components/kabuk/panel.tsx`) ve araç
modal işaretlerinin YOKLUĞUNU doğrular; yarı modal (üçünden ikisi) kusurdur.
1024'ün altında panel tam eni kaplar ve bu da ölçülür.

## `ters-kapsam.mjs` — davranış → senaryo (tarayıcı istemez)

`arac/senaryo-belge.mjs` "yazdığım her senaryonun testi var mı" diye
sorar. Bu araç tersini sorar: **koddaki her kullanıcı davranışı kütükte
yazılı mı?**

Fark önemlidir. Senaryo → test kapısı, kimsenin senaryo YAZMADIĞI bir
eylemi göremez: olmayan senaryonun testi de yoktur, sayı yine sıfır
çıkar. Bu araç envanteri kaynak koddan çıkarır — rota, sunucu eylemi,
API ucu, motor, zamanlanmış iş, ve arayüz etkileşimleri (süzgeç, kip,
çekmece, genişleyen satır, form, aşama hattı) — ve kütükle karşılaştırır.

İlk koşusunda **56 boşluk** buldu: dokuz rota hiç yazılmamıştı, yirmi bir
sunucu eylemi ve beş motor hiçbir senaryo işaretli testte geçmiyordu,
üç ekran da yalnız mutlu yol senaryosu taşıyordu.

```
npm run ters:kapsam          # rapor; boşluk varsa çıkış kodu 1
node arac/ters-kapsam.mjs --json
```

Bağ mekaniktir; ayrı bir eşleme tablosu tutulmaz. Rota kütükteki `rota`
alanıyla, eylem/motor/iş ise **onu kullanan test dosyasındaki senaryo
işaretleriyle** eşleşir. Dosya düzeyinde tarama bilinçlidir: testler
eylemi çoğu kez bir yardımcının içinden çağırır, `it` gövdesini taramak
gerçekten test edilen bir eylemi "kapsanmadı" gösterirdi.

Arayüz etkileşimleri için kanıt farklıdır: o rotanın kütükte **bozulmuş
veri hâli** de olmalı (`yok · kısmi · bilinmiyor · bayat · çelişen ·
yinelenen · tek`). Her süzgeç boş sonuç, her çekmece eksik kayıt
üretebilir; yalnız mutlu yol senaryosu taşıyan bir rota geçemez.

Nöbetçi: `tests/ters-kapsam.test.ts`. CI'da `pr-kapisi.yml` içinde koşar.

## `bilissel-yuk.mjs` — "bu ekran kullanıcıdan ne kadar iş istiyor?"

Mevcut kapılar ekranın DOĞRU olduğunu söyler; hiçbiri "kullanıcı burada
ne yapacağını üç saniyede anlıyor mu" demez. Bu araç o soruya giden
yoldaki engelleri sayar: görünür etiket · durum imi · ölçüt kutusu ·
düğme · bağ · etiket→değer satırı · tekrar eden çift · ilk birincil
eylemin üstten uzaklığı · iş yüzeyinin üstten uzaklığı · ana yüzeydeki
kanıt/geçmiş yüksekliği · görünür metin uzunluğu.

```
PORT=3210 npm run tasarim:yuk
PORT=3210 node arac/bilissel-yuk.mjs --rota=/envanter --json cikti.json
```

Tek bant (1440×900) ölçer: buradaki sayılar banda değil BİLGİ MİMARİSİNE
bağlıdır; dokuz bantta dokuz kez ölçmek aynı sayıyı dokuz kez üretirdi.
Duyarlılık ayrı bir kapının işidir (`ux-denetim.mjs`).

Araç **eşik koymaz.** Sonuçlar ekranın göreviyle birlikte değerlendirilir;
tek başına yüksek bir sayı kusur kabul edilmez.

Bilinen sınır: sayımlar ORTAK primitif sözlüğüne bakar. Kendi ölçüt
bandını kuran ekran (`/envanter`, `/portfoy`) `kpi: 0` görünür ve bu, o
ekranda durum bilgisi olmadığı anlamına gelmez — aracın başlığında
yazılıdır.

## `eylem-dili.mjs` — boş ekranın söylediği son cümle

Bir ekranın en çok okunan cümlesi çoğu zaman hiçbir şeyin olmadığı anda
yazdığı cümledir. Kullanıcı o anda iki şey sorar: *ne oldu* ve *şimdi ne
yapabilirim.* Araç ikinciyi cevaplamayan blokları sayar: `BosIlk`,
`Olculmedi`, `BaglantiYok`, `EntegrasyonYok`, `KismiVeri`, `Bakimda`
bileşenlerinden `eylem` özelliği verilmeden çizilenler.

Ayrıca son kullanıcı yüzeyinde geliştirici sözcüğü (provider · adapter ·
registry · mutation · boolean · payload …) arar; bu aile bir kez
temizlendi, araç geri sızmasın diye nöbet tutar.

```
npm run tasarim:dil
```

Tablo hücresindeki "kayıt yok" bir durum ETİKETİDİR ve sayılmaz; araç
yalnız bozuk durum BİLEŞENLERİNE bakar. `BosFiltre` listede yoktur:
eylemi (`temizle`) zorunlu bir parametre olduğu için tip kuralı zaten
dayatıyor.

## `gorev-akisi.mjs` — "bu işi kaç tıkla bitiriyorum?"

`bilissel-yuk.mjs` bir EKRANI ölçer. Kullanıcı ise ekranda değil bir
İŞİN içinde yaşar ve iş çoğu zaman üç ekrandan geçer: bir ekran tek
başına temiz olabilir, iki ekran arasındaki geçiş kaybolduğunda iş yine
bitmez.

Yirmi gerçek görev baştan sona koşulur; dört şey sayılır: tıklama · sayfa
geçişi · çıkmaz · süre.

```
PORT=3210 npm run tasarim:gorev
PORT=3210 node arac/gorev-akisi.mjs --gorev TASK-001
```

Araç **eşik koymaz.** Bazı işler doğası gereği çok adımlıdır (dosya yükle
→ eşle → önizle → onayla) ve onları tek tıka indirmek onaysız yazmak
demek olurdu. Kusur sayılan tek şey **ÇIKMAZ**: hedefe hiç ulaşılamaması.
Sayıların yorumu `docs/UX_SIMPLIFICATION_AUDIT.md` içindedir.

Görevlerin hepsi YALNIZ OKUR; hiçbiri kayıt yazmaz.
