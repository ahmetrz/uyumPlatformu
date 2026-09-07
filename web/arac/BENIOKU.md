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
içinde her PR'da koşar. Aşağıdaki araçlar **canlı sunucu ister** ve CI'da
koşmaz; port 3210'da elle koşulur (`PORT=3210 next dev` başka bir kabukta).
Hepsi tohum geliştirme girişiyle oturum açar (`kosu-ortak.mjs`); gerçek
kurum sistemine giden hiçbir şey yoktur.

| Betik | npm | Ne ölçer | Çıkış 1 |
| --- | --- | --- | --- |
| `rota-duman.mjs` | `rota:duman` | her `page.tsx` → HTTP 200, doğru kabuk, tek aktif öğe | kusurlu / test edilemeyen rota |
| `gezinme-testi.mjs` | `gezinme:test` | yedi bantta kabuk içi + kabuklar arası gezinme, dokunmatik + klavye | gezinme kusuru |
| `tarama.mjs` | `tasarim:rota` | yatay taşma · eski sınıf · boş ekran · sayfa hatası (`EN=1440,1024,768,375` çok bant) | kusurlu rota |
| `lighthouse.mjs` | `kalite:lighthouse` | 4 kategori puanı, `/giris` + 4 kanonik rota | eşik (90) altı |
| `gorsel-regresyon.mjs` | `tasarim:gorsel` | 8 rota × 2 bant, altın görüntüyle piksel farkı | fark > %0,5 ya da altın yok |
| `erisim-axe.mjs` | `tasarim:axe` | axe-core WCAG 2 A/AA, rotalar.json'daki tüm rotalar | ciddi/kritik ihlal |
| `yatay-tasma.mjs` | `tasarim:tasma` | 375 + 768'de her rota yana kayıyor mu, taşmayı üreten öğe kim | taşan rota |
| `dizustu.mjs` | `tasarim:dizustu` | 1366×768'de kaydırılamayan (kırpılan) içerik var mı | kırpılan öğe |
| `iki-sozluk.mjs` | `kapi:iki-sozluk` | üç düzen kapısını (tasma · dizüstü · axe) ÜÇ sözlükle koşar (enerji · su · stres); kusurun hangi sözlükte çıktığını söyler | herhangi bir sözlükte kusur |
| `kolon-hizasi.mjs` | `tasarim:kolon` | statik çıktıda başlık/hücre sayısı, sol kenar hizası (±1px), kaydırma kabını aşma — 1440 · 1366 · 1280. **İki sözlükle ölçülmedi** (istisna, aşağıda) | hiza kusuru |
| — (prisma) | `kapi:sema-sapmasi` | göç sonrası: veritabanı `schema.prisma` ile birebir mi | sapma varsa çıkış 2 |
| `sozluk-farki.mjs` | (iki-sozluk içinde) | **pozitif ölçü**: sözlük ekrana ulaşıyor mu — aynı rotanın metni iki sözlükle alınır, fark çıkarılır | çevrilmiş rotada fark yoksa çıkış 1 |
| `sozluk-metni.mjs` | — (yardımcı) | render edilen `main` metnini JSON'a yazar; sözlüğü bilmez | — |
| `rota-dizini.mjs` | — (kütüphane) | rota → kaynak dizini, `app/` ağacından türetilir | — |
| `izin-listesi.mjs` | — (kütüphane) | izin listesinde SÖZLÜK terimiyle duran dosyalar (şema terimleri ayrı) | — |
| `cekirdek-sozcuk-taramasi.mjs` | — (elle) | bekçinin YAPISAL kör noktası: kaynakta sabit yazılmış ÇEKİRDEK sözcükler | ölü muafiyet varsa çıkış 1 |
| `terim-adaylari.mjs` | — (elle) | terim kalıplarının yanlış pozitif yüzeyini DEPODAN türetir; fikstürün kaynağı | — |
| `derleme-ortami.mjs` | — (kütüphane) | derlemeye dayanan kapıların önkoşulu: boş alan (derlemeden önce) + statik çıktının TAM olduğu (ölçmeden önce) | çağıran kapı düşer |
| `turkce-arama.mjs` | — (kütüphane) | Türkçe metin araması: çift küçültme + Unicode sözcük sınırı. **Sondalarda düz `/…/i` KULLANMAYIN** | — |
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

### `yatay-tasma.mjs`

Dar bantta sayfanın yana kaymasını ölçer ve **taşmayı üreten öğeyi**
adlandırır: taşan ama atası taşmayan, ve yol üstünde kaydırma/kırpma kabı
bulunmayan öğe. Kaydırma kabı içindeki taşma kusur DEĞİLDİR — üst çubuklar
dar bantta bilerek yatay kaydırılır.

`tarama.mjs` de taşma ölçer ama tek bir sayı olarak ve varsayılan olarak
tek bantta (`EN=` verilmezse 1440); dar bant kusurları o yüzden yıllarca
görünmedi. Bu araç iki dar bandı (375 · 768) tüm rotalarda VARSAYILAN
koşar ve suçluyu yazar; ikisi birbirinin yerine geçmez.

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

### `kapi:sema-sapmasi` — göç sonrası şema/veritabanı sapması

Bir şema göçünden sonra `schema.prisma` ile veritabanının birebir aynı
olduğunu doğrular. Göç dosyası yazılıp uygulanmamış ya da elle bir kolon
eklenmiş olabilir; ikisi de testlerde görünmez, çünkü testler kendi
kopyalarını `prisma/dev.db`den alır — sapma o kopyaya da taşınır ve
"yeşil" olur.

```
npm run kapi:sema-sapmasi     # "No difference detected." · çıkış 0
```

Şema dokunan her dilimde koşulur. `--exit-code` sapmada 2 döner, yani
komut kapı olarak kullanılabilir.

### `sozluk-farki.mjs` — sözlük ekrana ULAŞIYOR mu (pozitif ölçü)

Bekçi (`tests/bekci/sektor-terimi.test.ts`) **negatif** ölçüdür ve kabul
modelinde bir boşluk bırakır:

> Bekçi "sektör sözcüğü kalmadı" der; **"sözlükten geliyor" demez.**

Bir dosya `santral`ı çekirdek sözcük `tesis` ile **sabit** değiştirirse
bekçi yeşil yanar ve hedef ıskalanır. Ölçüldü (7 Eyl 2026): `envanter`
zincir halka etiketi tam olarak böyle kaçtı. Bu araç, o gün elle yazılan
sondayı **ölçüye** çevirir; `kapi:iki-sozluk` içinde dördüncü iddia
olarak koşar.

**Ölçüm.** Aynı rotanın render edilen metni `enerji` ve `su` sözlükleriyle
alınır. İki şey raporlanır:

| Sinyal | Ne der | Kapı |
| --- | --- | --- |
| **fark sayısı** | kaç yer sözlüğü izliyor | bilgi (insan okur) |
| **çakılı satır** | enerji altında ÇEKİRDEK sözcük görünen yer | çevrilmiş ailede **kusur** |

**Neden fark sayısı tek başına yetmez.** İlk kurgu "çevrilmiş ailenin
rotasında fark boş olamaz" idi ve ilk tam koşumda **üç yanlış alarm**
verdi (`/bakim` · `/api-sozlesmesi` · `/yedek-parca` hiç terim taşımıyor)
artı bir açıklanabilir vaka (`/raporlar/kanit-paketi` — tek sözlük
çağrısı boş-durum dalında, demo veride hiç render edilmiyor). Üstelik
**kısmi kaçağı hiç yakalamıyordu**: iki yerden biri çakılıysa fark yine
> 0 olur ve kapı geçer.

**Keskin sinyal.** Enerji sözlüğü kuruluyken ekranda çekirdek sözcük
("tesis" · "portföy") görünmesi. Sözlükten beslenen hiçbir yer enerji
altında çekirdek sözcüğü yazamaz — yazıyorsa o yer sabit çakılıdır.
Koşula bağlı dallar render edilmedikleri için sessiz kalır; hiç terim
taşımayan rota da öyle. Kısmi kaçak **yakalanır**.

İki incelik ölçümden çıktı, ikisi de kalıcı:

- **Yalnız `main`** ölçülür, gövde değil. Kabuk başlığı ("… · 16 SANTRAL")
  her rotada sözlüğü izler; gövdeyi ölçmek tamamen çakılı bir sayfayı bile
  geçirirdi.
- **Sektör karşılığı önce satırdan silinir**, sonra çekirdek aranır. Enerji
  karşılığı "enerji portföyü" ve içinde çekirdek "portföyü" geçiyor;
  doğrudan aramak doğru çalışan bir yeri çakılı sanardı. Silme
  `kanonik()` ile yapılır — `.replace` Türkçede `İ`'yi katlamaz ve
  silinemeyen kopya yanlış alarm üretir (bu da ölçüldü).

**"Aile çevrildi mi" elle tutulmaz.** İki kaynaktan türetilir: (1) ailenin
bir dosyası izin listesinden **çıkarılmışsa** (git geçmişi), (2) ya da
ailenin bir dosyası **sözlüğü çağırıyorsa**. "Listede değil" tek başına
yetmez — `/bakim` hiç sektör sözcüğü taşımamıştı, çevrilmedi.

İzin listesinde ayrıca **sözlükle ifade edilebilir** terim ayrımı yapılır:
`MW` · `JES` · `türbin` · `--hes` sözlükte yoktur, şema/öznitelik işidir
(`izin-listesi.mjs`). `envanter/Yonetisim.tsx` yalnız `MW` yüzünden
listede duruyor; `/envanter` yine de çevrilmiş sayılır.

**İlk koşumunda iki gerçek kaçak buldu**, ikisi de çevrilmiş `/raporlar`
ailesinde ve ikisini de bekçi temiz görüyordu: `5 tesis × 3 süreç` ve
`Portföy raporu` / `portföy uyumu`. Sabotajla da doğrulandı: zincir
halkası çekirdeğe çakıldığında (iki yerden BİRİ) `1 fark · 1 ÇAKILI` deyip
çıkış 1 verdi — eski kurgu bunu geçirirdi.

**Beklenen fark sayısı.** "Çakılı 0" sözcüğün SABİT olmadığını söyler,
ekrana ULAŞTIĞINI değil. Rota başına beklenen fark
`arac/beklenen-fark.json`da durur ve HER koşumda denetlenir; ölçülen
altındaysa kapı kırmızı yanar (`--bekle=/rota:N` üzerine yazar). Sayı bir
tahmin değil, aile kapanırken yapılan ölçümdür.

**Sınırı.** Yalnız o an render EDİLEN metni görür: koşula bağlı dallar
(boş durum, yetki kısıtı, modal) ölçülmez. Modül sabitleri için tarayıcı
istemeyen kendi vakaları vardır (`tests/envanter-mantik.test.ts` · zincir
halkası) ve sabotaj kütüğü onları koruyor.

### `cekirdek-sozcuk-taramasi.mjs` — bekçinin yapısal kör noktası

Bekçi **negatif** kanıt üretir: "sektör sözcüğü kalmadı". Bir ekran
`santral`ı çekirdek `tesis`/`portföy` ile **sabit** değiştirirse bekçi
yeşil yanar. `sozluk-farki` bunu ekranda yakalar — ama yalnız **o an
render edilen** metinde; koşula bağlı dallar (boş durum, yetki kısıtı,
modal) görünmez.

Aynı kusur **beş ailede** aynı şekilde bulundu (riskler · kimlik ·
yetkiler · ayarlar · dokümanlar), hepsi `portfoy` anahtarında. Aile aile
keşfetmek, her seferinde aynı dersi yeniden öğrenmek demek. Bu araç
sınıfı **topluca** görünür kılar: kaynakta, dize ve JSX metni içinde.

**İki eleme ölçümden çıktı** — ilk kurgu 554 "bulgu" veriyordu ve çoğu
koddu; gürültü aradığı sinyali gizliyordu:

- `${…}` içi sökülür. `` `${t(sozluk,'tesis')}siz` `` çekirdek sözcük
  taşıyor görünür, oysa taşıdığı şey sözlük **çağrısının anahtarıdır**.
- Ekran metni **prozadır**: boşluk taşır ya da büyük harfle başlar.
  Alan adı ve anahtar küçük harfli tek jetondur (`tesisler`) ve ekranda
  görünmez. JSX `>…<` kalıbı TypeScript'te güvenilmez (ok işlevi,
  jenerik, karşılaştırma) — bırakıldı.

**Muafiyetler gerekçelidir** (`cekirdek-sozcuk-muafiyet.json`): çekirdek
sözcüğün DOĞRU olduğu yerler — R0-9 (saklanan artefakt, API sözleşmesi),
R0-8 (Suspense yedeği), kod eşleştirme anahtarı, ölçü birimi. **Ölü
muafiyet kırmızı verir**: dosya artık çekirdek sözcük taşımıyorsa kayıt
düşmelidir. `rotalar.json` ve izin listesi bu dersi zaten verdi — elle
tutulan liste sessizce bayatlar.

### `terim-adaylari.mjs` — kalıpları TEPKİSEL değil sistematik doğrula

Bekçinin terim kalıplarında bugüne kadar **üç** hata çıktı ve üçü de bir
kusur patladıktan sonra düzeltildi:

| Hata | Yön |
| --- | --- |
| `\bRES\b` "SÜRESİ" içinde eşleşiyordu | yanlış **pozitif** |
| `/ünite/i` "ÜNİTE" ile eşleşmiyordu | yanlış **negatif** |
| `/plant/gi` "toplantı" içinde eşleşiyordu | yanlış **pozitif** |

Yani liste bir bütün olarak **hiç doğrulanmamıştı**; her terimin hangi
yönde bozuk olduğu bilinmiyordu. Vakalar hep bir hata çıktıkça eklendi.

Bu araç tahmin etmez, **depodaki gerçek Türkçe metni** kaynak alır: her
terim için kalıbın gövdesini İÇEREN ama tam eşleşmeyen sözcükleri
çıkarır. Yanlış pozitif yüzeyi tam olarak budur.

```
npx tsx arac/terim-adaylari.mjs
  tip kodu   eşleşen 10 · yanlış pozitif adayı 45 → SÜRESİ · ADRES · HESAP …
  plant      eşleşen  2 · yanlış pozitif adayı 11 → toplantı · Plant360 …
```

Çıktı `tests/bekci/terim-fikstur.json`e tasnif edilerek girer (gerçek
yanlış pozitif mi, bilinçli körlük mü) ve
`tests/bekci/terim-dogrulama.test.ts` her terimi **iki yönde** sınar.
Test ayrıca **eksiksizlik** şartı koyar: `TERIMLER`deki her kaydın
fikstürde karşılığı olmalı — doğrulanmamış bir terim sessizce listeye
giremez.

`eslesmemeli` listesi boş olan terimlerde bu bir atlama değil **ölçüm
sonucudur**: tarama o terim için tek bir aday bulmadı.

### `turkce-arama.mjs` — Türkçe metin ararken bunu kullanın

**Düz `/…/i` kullanmayın.** `i` bayrağı Unicode BASİT katlama yapar ve
Türkçede iki yönde de kördür: `ı` `I`'ya, `i` `İ`'ye katlanmaz.

```js
/arıtma/i.test('ARITMA TESİSİ')              // false  ✗ kör
katlamaliVarMi(/arıtma/, 'ARITMA TESİSİ')    // true   ✓
```

Bu mantık bekçi testinde doğdu ve orada kalıcı vakalarla korunuyor
(`tests/bekci/katlama-korlugu.test.ts` · URN-ALN-007). Ama tuzak yalnız
bekçiyi vurmuyor: **ölçüm sondalarını da vuruyor ve onları hiçbir test
korumuyor.** Gerçekten oldu (7 Eyl 2026): `/tedarikciler` çekmecesini iki
sözlükle karşılaştıran tek seferlik bir sonda `/arıtma/i` kullandı ve
ekranda AÇIKÇA duran `ARITMA TESİSİ · 7` satırını göremedi; "terim yok"
dedi. Kalıcı test bunu koruyamaz — sonda her ölçümde kalıbı sıfırdan
türetiyor. Çare test değil **araç**: kalıp bir kez burada durur.

| İşlev | Ne yapar |
| --- | --- |
| `kucultmeler(m)` | `[tr-TR katlaması, değişmez katlama]` |
| `katlamaliVarMi(re, m)` | ikisinin birleşiminde `test()` — `/…/i` yerine bu |
| `katlamaliSayi(re, m)` | ikisinin BÜYÜK eşleşme sayısı (toplamaz) |
| `katlamaliSatirlar(re, m)` | kalıbı taşıyan satırlar |
| `sinirKalibi(govde)` | Unicode sözcük sınırı — `\b` ASCII'dir, `RES`i "SÜRESİ" içinde bulur |

Büyük harfli KODLAR (`JES` · `MW`) ham metinde aranır: küçültülmüşte
`res` "süresi"nin, `hes` "hesap"ın içine düşer.

### `derleme-ortami.mjs` — ölçüm ortamı da ölçülür

7 Eyl 2026'da oturumun yazılabilir disk payı %100'e dayandı. O turda kayıp
olmadı ama sessiz bir **yanlış-yeşil** yolu açıyor: `next build` yer
bitince YARIM bir `out/` bırakır, statik kapı o yarım siteyi ölçer ve
"kusur yok" der. Kapı kırmızı yanmaz, çünkü ölçtüğü şey orada değildir.

İki ayrı soru, iki ayrı işlev — ve ikisi de gerekli:

| İşlev | Ne zaman | Niçin |
| --- | --- | --- |
| `yerVarMi(ad)` | derlemeden ÖNCE | Yeter alan yoksa derleme başlatılmaz; başlarsa yarım kalır ve kusur ölçüm anına taşınır. |
| `ciktiyiDogrula(ad, out)` | ölçmeden ÖNCE | Elimizdeki `out/` GEÇMİŞ bir koşuda yarım kalmış olabilir; o an bol yer bulunur. Rota envanterindeki her rotanın karşılığı yoksa ölçüm geçersizdir. |

Yalnız birincisini koymak geçmişten kalan yarım çıktıyı görmezdi.

**Eşik ölçüldü, seçilmedi** (temiz ağaç, aynı gün):

| Derleme | Net alan | Sonuç |
| --- | --- | --- |
| `npm run build` | 78 MB | `.next` 266 MB |
| `NEXT_PUBLIC_DEMO=1 next build` | 185 MB | `.next` 426 MB · `out/` 26 MB |

Tam bir çevrim ~450 MB istiyor; eşik **1024 MB** — ölçülenin iki katından
biraz fazla, npm önbelleği ve ikinci derleme için pay bırakır.

Kapıyı taşıyanlar: `statik-kontrol` · `kolon-hizasi` (çıktıyı ölçerler) ve
`marka-kapisi` (kendi derlemesini yapar). Sabotajla doğrulandı: `out/`tan
üç rota silindiğinde ikisi de eksikleri adıyla yazıp **çıkış 1** verdi.

### `iki-sozluk.mjs` · `sozluk-takas.mjs` · `sozluk-kipi.mjs`

Bir yüzey ailesi terim sözlüğüne geçtiğinde (P1 · Aşama E) **render edilen
metin değişir**. Elle tıklayıp bakmak değerli ama taşmayı gözle değil
ÖLÇEREK görüyoruz — ve bugüne kadarki bütün düzen ölçümleri referans
kiracının KISA sözlüğüyle yapıldı: "santral" 7 harf, "arıtma tesisi" 13.
Yani düzeni iki sözlüğün kolayına karşı doğruluyorduk. **Uzun sözlükte
taşan bir düzen bugün kusurludur**; kısa sözlükle yeşil görünmesi kusuru
düzeltmez, ikinci kiracıya erteler.

```
PORT=3210 npm run kapi:iki-sozluk -- --rota=/yedekleme
```

Üç kapıyı her sözlük için ayrı koşar ve şunu yazar:

| Sonuç | Okuması |
| --- | --- |
| yalnız `su` kusurlu | sözcük uzunluğunun ürettiği kusur — o dilimin işi |
| iki sözlükte de kusurlu | sözlükten bağımsız kusur (çoğu zaman eski) |

`dizustu` bu üçlüde ayrı bir kapı, çünkü uzun sözlüğün en olası kusur
biçimi yatay kayma DEĞİL **sessiz kırpılmadır**: `table-layout: fixed` +
`overflow: hidden` taşan sözcüğü keser, sayfa yana kaymaz, `yatay-tasma`
yeşil kalır. `rota-duman` bilerek dışarıda: rota süzgeci yok ve ölçtüğü
şey düzen değil, rotanın ayakta olup olmadığı.

**Takas nerede olur.** `SektorSozlugu` satırlarında ve yalnız ölçüm
süresince (`sozluk-takas.mjs`; geri yükleme `finally` içinde). Kiracı,
tesis, tip ve sektör kayıtlarına dokunulmaz — ölçülen şey aynı veri, aynı
rota, yalnız daha uzun sözcük. Ürün kodunda sözlüğü ezen bir ortam
değişkeni **yoktur ve olmamalıdır**: kiracının dilini bir bayrakla
değiştirebilmek, yanlış sözcükle çalışan bir kurulum demektir.

Rapor her koşumda `'tesis'` teriminin o an veritabanındaki hâlini yazar.
Takas ekrana ulaşmadıysa "temiz" yanlış sözlüğü ölçmüş olurdu; kapı bunu
görür ve ölçümü geçersiz sayar (çıkış 2).

`sozluk-kipi.mjs` tek sözlükle ad-hoc koşum için ince kabuktur
(`npx tsx arac/sozluk-kipi.mjs su -- node arac/dizustu.mjs --rota=/x`).

#### Kuralın tek istisnası: `kolon-hizasi`

"Düzen kapıları iki sözlükle koşar" kuralının **bugün bir istisnası var** ve
burada yazılı olmasının sebebi tam olarak budur: yazılmazsa kural altı ay
sonra "hepsi iki sözlükle koşuyor" diye okunur ve boşluk kimsenin aklına
gelmez.

`kolon-hizasi.mjs` **iki sözlükle ölçülmedi.** Sebep: canlı sunucuda değil
**statik dışa aktarım** (`out/`) üzerinde koşuyor; veri ve sözlük derleme
anında gömülüyor. İkinci sözlükle ölçmek `out/`u o sözlükle yeniden
derlemeyi gerektirir (`npm run demo:build`), yani `sozluk-takas.mjs`'in
çalışma zamanı takası oraya ulaşmaz. Ölçülmedi — "geçti" DEĞİL.

Kapatma yolu (P4 ile birlikte değerlendirilecek): `demo:build`'i sözlük
kipi altında koşturup `out/`u ikinci sözlükle üretmek. Bugün yapılmadı,
çünkü tam derleme başına birkaç dakika ve kolon hizası sözcük
uzunluğundan çok **sütun sayısına** duyarlı — ama bu bir varsayım, ölçüm
değil; kapatıldığında ölçülecek.

#### Kırılma fırsatı garantisi (`stres` sözlüğü)

Üçüncü sözlük bir sektör değil, `kabuk.css` içindeki savunmanın **kalıcı
vakasıdır**: boşluksuz uzun bir gövde, yani hiçbir kırılma fırsatı
sunmayan terim. Sözcük ürünün sabiti değil **müşteri içeriğidir**; bir
sektör paketi böyle bir ad gönderdiğinde kusur bizim CI'mızda değil o
paketi yazanın ekranında çıkar.

Savunma iki katmanlı ve **ikisi de ölçülerek** seçildi:

| Katman | Kural | Niçin |
| --- | --- | --- |
| taban | `.ab, .ab * { overflow-wrap: break-word }` | Kutusuna sığmayan sözcüğü kırar; min-content'e dokunmadığı için mevcut sarma davranışı **değişmez**. |
| slot | `.ab .terim-sar { min-width: 0; overflow-wrap: anywhere }` | Genişliği içeriğinden gelen esnek/ızgara izi ancak böyle daralabilir. Elle konur; unutulan yeri `stres` koşumu söyler. |

Genel `overflow-wrap: anywhere` **denendi ve düzeni bozdu**: min-content
tek harfe iner, `/bulgular` 375px'te üst gezinme ("SAHA PORTFÖY UYUM")
harf harf alt alta düştü, kolon başlıkları dikey sütuna döndü. Düzeni
korumak için konan kural düzeni bozuyordu; ölçüm olmasa fark edilmezdi.

**Ölçüldü (7 Eyl 2026).** Boşluksuz 31 harflik gövde savunma konmadan
önce `/sistem/bilesenler` rotasını 375px'te 48px yana kaydırıyordu
(`div.ab-baglam > div.sag`); `.terim-sar` + `min-width: 0` ile
temizlendi. Savunmadan sonra tam küme, üç sözlük: 3 kapı × 3 sözlük = 9
koşum, tek kusur `/omur` (`span.ad`, `">1 yıl"`) ve o kusur **üç sözlükte
de bit-bit aynı** — sözlükten bağımsız, bu dalda dokunulmamış.

### `erisim-axe.mjs`

`erisim.mjs`'in dört kusur ölçümünü tamamlar: axe-core (`node_modules`
içindeki `axe.min.js` sayfaya enjekte edilir) `wcag2a` + `wcag2aa`
etiketli kuralları `rotalar.json`'daki her rotada ve oturumsuz `/giris`'te
koşar. `serious`/`critical` ihlal çıkış kodu 1; `minor`/`moderate`
listelenir, engellemez.

```bash
PORT=3210 node arac/erisim-axe.mjs --json /tmp/axe.json
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
