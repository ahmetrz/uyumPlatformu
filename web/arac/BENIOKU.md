# arac/ — görsel doğrulama araçları

Zorlu Enerji Yönetişim Platformu arayüzünün görsel kalite kapısı (tasarım
sistemi: `../DESIGN.md`, prototip → uygulama haritası:
`../../ORIGINAL_DESIGN_IMPLEMENTATION_MAP.md`). Üretim kodu değildir; derlemeye girmez.

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
yakalanıyordu — ekran görüntüsünde vurgulu görünüyor, `denetim.mjs` bunu
zebra sanıyordu.

Giriş gerektiren rotalar için betiğe oturum açma adımı eklenmelidir
(geliştirme girişi: `ahmet.terzi@zorlu.com`).

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
| — | `test:kapsam` | vitest V8 kapsamı (`lib/**`, ekran `mantik.ts`/`ortak.ts`, `components/**`) | test kırığı |

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
