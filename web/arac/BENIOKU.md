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

## ÖLÇÜMDEN ÖNCE: ORTAM TAZELİĞİ — atlanamaz adım

Bir kırmızıyı koda yazmadan önce ölçüm ortamının taze olduğu
DOĞRULANIR. Bu bir öneri değil, ölçümün ön koşuludur; atlandığında
üretilen şey kod kusuru gibi görünen bir yanlış alarmdır. Üç tuzak da
ÖLÇÜLDÜ, üçü de aynı oturumda:

| Tuzak | Nasıl görünür | Gerçek sebep |
| --- | --- | --- |
| Bayat `next start` | `rota-duman`: "`/` ← kabuk yok" · sayfa `__next_error__` döner | Yeni derleme yapıldı ama eski süreç ayakta; süreç SİLİNMİŞ inode'u tutuyor |
| Dolu disk | Vitest keşfi "158 dosya · **0 vaka**" döner, kapı "doğrulandı" der | Test kopyaları `/tmp`i doldurdu (8 188 dizin · 27 GB); ENOSPC bile görünmedi |
| Kapatılmış port | `ERR_CONNECTION_REFUSED` · "sözlükle metin yakalanamadı" | Uzun koşan bir kapı arka plandayken port başka bir iş için kapatıldı |

**SIRA:**

```
1  eski süreçleri öldür     fuser -k -n tcp <port>
2  portun KAPANDIĞINI doğrula   curl -sf localhost:<port> && echo AYAKTA
3  boş alanı gör            df -h .        (< 512 MB ise önce temizle)
4  derle                    npm run build
5  başlat + hazır bekle     next start & → curl döngüsü
6  ÖLÇ
```

Adım 2 atlanamaz: `next start` port doluysa `EADDRINUSE` ile ölür ama
`curl` ESKİ sunucuyu görüp "hazır" der. "Hazır" cevabı yeni sunucudan
geldiğini kanıtlamaz.

Uzun koşan bir kapı varken (`kapi:iki-sozluk` ~25 dk) portu BAŞKA bir iş
için kapatmak, o kapıyı kod kusuru gibi görünen bir hatayla düşürür.

### DÖRDÜNCÜ TUZAK: TÜKETİLMİŞ FİKSTÜR (ölçüldü 10 Eyl 2026)

Bazı kanıt betikleri fikstürü DEĞİŞTİRİR. `bildirim-kaydi-kanit.mjs` bir
taslağı "gönderildi" yapar — çünkü ölçtüğü şey ekranın metni değil,
sunucu eyleminin KAPISIDIR (referanssız gönderim reddediliyor mu) ve o
kapı ancak gerçekten tıklanınca ölçülür.

CI'da bu görünmez: `kapi-rota` · `kapi-gezinme` · `kapi-tasma` ·
`kapi-axe` işlerinin HEPSİ ölçümden önce `npx tsx prisma/seed.ts`
koşar. Yerel `kapi:parti` bu adımı koşmaz (kurulum adımıdır) ve ikinci
kapanışta kapı ölçüm yapamaz. Bugün iki şey yapıldı:

1. Betik bunu **ölçemediğini SÖYLER**: "ÖLÇÜM YETERSİZ: 21 iddia
   ölçüldü, taban 24 … Veritabanını yeniden kurun". Yani kırmızı, "kod
   bozuk" değil "ölçemedim" der.
2. `kapi:parti` artık **koşmadığı `run:` kurulum adımlarını ADIYLA
   yazar** (`kurulum KOMUTU koşulmadı — kapi-rota: … prisma/seed.ts`).
   Bu adımlar `uses:` listesine girmiyordu (onlar `run:`), kapı
   listesine de girmiyordu (kurulum) — arada kayboluyorlardı.

**Fikstür tüketen kapıdan önce:**

```
rm -f prisma/dev.db prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm
npm run db:hazirla
```

`-wal` ve `-shm` de silinir: yalnız `dev.db` silinirse SQLite açık WAL'ı
yeni dosyaya geri oynatabilir ve tohum "Veritabanı dolu" diyerek durur —
ÖLÇÜLDÜ. Sunucu bu silmeden ÖNCE durdurulur, yoksa silinmiş inode'u
tutmaya devam eder (yukarıdaki birinci tuzağın aynısı).

### BEŞİNCİ TUZAK: GÖRÜNMEYEN İÇERİK (ölçüldü 10 Eyl 2026)

`innerText` GÖRÜNEN metni döndürür; gizli bir düğümde BOŞ döner.
`locator(...).count()` ise aynı düğümü DOM'da bulur. İkisini aynı sayfada
kullanan bir betik "bağ var" derken "metin yok" diye kırmızı yakar ve
kusur EKRANDA değil BETİKTEDİR.

Ölçüldü: `kimlik-kanit.mjs` ilk turda `/giris` üzerinde BEŞ kırmızı
verdi. Sebep: giriş ekranı sinematik bir açılışın içinde yaşıyor ve
içerik animasyon bitene kadar görünmüyor. `a[href*="/kimlik/basla"]`
iddiası GEÇİYOR, aynı bağın metnini arayan iddia KIRMIZI yanıyordu —
çelişkinin kendisi tuzağın imzasıdır.

**Kural:** animasyonlu ya da geç görünen yüzeylerde `textContent`
okunur (stil uygulanmadan, ham metin). `text-transform: uppercase`
sorunu da orada kendiliğinden düşer — Türkçe `İ` tuzağı `innerText`e
özgüdür.

**Kum havuzunda `kapi-compose` ÖLÇÜLEMEZ.** Docker derlemesinin ağı yok
(`proxyconnect tcp: dial tcp 127.0.0.1:43743: connect: connection
refused`; ölçüldü 10 Eyl 2026 — imaj katmanı önbellekteyken geçiyor,
önbellek boşaltılınca `apt`/`wget` adımı düşüyor). Bu kapı yerelde
"geçti" ya da "kırmızı" değil **ölçülmedi**dir; gerçek ölçümü CI yapar.

## Kalite kapıları (KK-1…KK-8)

Statik kapılar (`npm run lint` · `npx tsc --noEmit` · `npm test` ·
`npm run tasarim:kapi` · `npm run build`) `.github/workflows/pr-kapisi.yml`
içinde her PR'da koşar.

**DÖRT tarayıcılı kapı CI'da koşar ve BLOKLAYICIDIR:**
`rota-duman.mjs` · `gezinme-testi.mjs` · `yatay-tasma.mjs` ·
`erisim-axe.mjs`. CI üretim derlemesini 3210'da ayağa kaldırır
(`next start`), Playwright'ın kendi chromium'unu kurar (runner imajına
bırakılmaz) ve dördünü bu sırayla koşar: işlevsel duman testleri ÖNCE —
bir rota 404 veriyorsa ya da gezinme kırıksa aynı sayfadaki piksel
ölçümleri gürültüdür. Ölçüldü: duman 32sn, gezinme 45sn, taşma 89sn,
axe 130sn. Taşma ve axe kapılarının açık bulguları `kalite-borcu.json`
izin listesindedir ve liste bir CIRCIRLA korunur — aşağıda.

> **Duman ve gezinme kapıları 7 Eylül 2026'da bağlandı, bir kusur
> ölçüldükten sonra.** İkisi de KENDİ `girisYap` kopyasını taşıyordu;
> PR #28 sinematik girişi eklerken ortak işleve bir CTA adımı verdi,
> kopyalar almadı ve iki araç da giriş yapamaz oldu — `main`'e KIRIK
> girdiler ve kimse görmedi. Kopyaları silmek o günkü örneği kapatır;
> sınıfı kapatan şey CI'ya bağlanmalarıdır: koşmayan bir kapı,
> kırıldığını da bildiremez. Farkın kendisi artık ölçülüyor —
> `npm run kapi:farki`.

Geri kalan tarayıcılı araçlar hâlâ **canlı sunucu ister** ve CI'da
koşmaz; port 3210'da elle koşulur (`PORT=3210 next dev` başka bir
kabukta). Hepsi tohum geliştirme girişiyle oturum açar
(`kosu-ortak.mjs`); gerçek kurum sistemine giden hiçbir şey yoktur.
Hangileri olduğu tahmin değil ölçüm: `npm run kapi:farki` sayar ve her
biri gerekçesiyle beyan edilmiştir.

> **Yerelde ölçerken sunucu TAZE DERLEMEDEN gelmeli.** Ölçüldü (7 Eylül
> 2026): kaynak değiştikten sonra ayakta duran eski `next start`
> süreciyle koşulan kapı, DEĞİŞMEMİŞ sayfayı ölçtü ve yedi bulgunun
> yedisini de aynen tekrarladı — düzeltme çalışmıyor sanıldı. İkinci
> tuzak aynı ailedendir: yeni sunucu `EADDRINUSE` ile bağlanamazken
> `curl` eskisini görüp "hazır" der. Sıra şudur: eski süreçleri PID ile
> öldür → portun GERÇEKTEN kapalı olduğunu doğrula → `npm run build` →
> `next start`. `marka:kapi` `.next`i sildiği için bu adım onun ardından
> zaten zorunludur.

| Betik | npm | Ne ölçer | Çıkış 1 |
| --- | --- | --- | --- |
| `rota-duman.mjs` **(CI · bloklayıcı)** | `rota:duman` | her `page.tsx` → HTTP 200, doğru kabuk, tek aktif öğe | kusurlu / test edilemeyen rota |
| `gezinme-testi.mjs` **(CI · bloklayıcı)** | `gezinme:test` | yedi bantta kabuk içi + kabuklar arası gezinme, dokunmatik + klavye | gezinme kusuru |
| `tarama.mjs` | `tasarim:rota` | yatay taşma · eski sınıf · boş ekran · sayfa hatası (`EN=1440,1024,768,375` çok bant) | kusurlu rota |
| `lighthouse.mjs` | `kalite:lighthouse` | 4 kategori puanı, `/giris` + 4 kanonik rota | eşik (90) altı |
| `gorsel-regresyon.mjs` | `tasarim:gorsel` | 8 rota × 2 bant, altın görüntüyle piksel farkı | fark > %0,5 ya da altın yok |
| `erisim-axe.mjs` **(CI · bloklayıcı)** | `tasarim:axe` | axe-core WCAG 2 A/AA, rotalar.json'daki tüm rotalar, **üç bant** (1440 · 768 · 375) | izin listesinde olmayan ya da tavanı aşan ciddi/kritik ihlal |
| `yatay-tasma.mjs` **(CI · bloklayıcı)** | `tasarim:tasma` | 375 + 768'de **üç kusur türü**: sayfa yana kayıyor mu · `overflow: hidden` kabında sessizce kırpılan içerik var mı · akış içi iki taşıyıcı üst üste biniyor mu | izin listesinde olmayan ya da tavanı aşan bulgu |
| `dizustu.mjs` | `tasarim:dizustu` | 1366×768'de kaydırılamayan (kırpılan) içerik var mı | kırpılan öğe |
| `iki-sozluk.mjs` | `kapi:iki-sozluk` | üç düzen kapısını (tasma · dizüstü · axe) ÜÇ sözlükle koşar (enerji · su · stres); kusurun hangi sözlükte çıktığını söyler | herhangi bir sözlükte kusur |
| `kolon-hizasi.mjs` | `tasarim:kolon` | statik çıktıda başlık/hücre sayısı, sol kenar hizası (±1px), kaydırma kabını aşma — 1440 · 1366 · 1280. **İki sözlükle ölçülmedi** (istisna, aşağıda) | hiza kusuru |
| — (prisma) | `kapi:sema-sapmasi` | göç sonrası: veritabanı `schema.prisma` ile birebir mi | sapma varsa çıkış 2 |
| `goc-zinciri.mjs` **(CI · bloklayıcı)** | `kapi:goc-zinciri` | BOŞ veritabanında bütün göçler sırayla (`migrate deploy`) → `schema.prisma` ile fark sıfır mı; uygulanan göç listesi dizinle birebir mi (veritabanından okunur) | fark, eksik göç, deploy hatası ya da ölçülemeyen fark |
| `pg-taban.mjs` **(CI · bloklayıcı)** | `kapi:pg-taban` | PostgreSQL TABAN GÖÇÜ şemadan yeniden üretilir ve depodakiyle karşılaştırılır; veritabanı İSTEMEZ. Şema değişip taban güncellenmezse KIRMIZI — yeni PostgreSQL kurulumu şemadan ayrışırdı. `--yaz` tabanı yeniden yazar. |
| `pg-goc.mjs` **(CI · bloklayıcı · `kapi-postgres` işi)** | `kapi:pg-goc` | Boş PostgreSQL veritabanı → taban göçü → `_prisma_migrations` veritabanından okunur → şema farkı 0 → NESNE ENVANTERİ (SQLite'ta olup PostgreSQL'de olmayan tetikleyici/indeks KIRMIZI; 63 baytlık ad kısaltması yalancı kırmızı üretmez) → DEĞİŞMEZLİK (altı yasak eylem reddedilir, satırsız UPDATE GEÇER — `FOR EACH ROW` kanıtı) → veritabanı silinir ve silindiği doğrulanır. `PG_URL` yoksa ÖLÇÜLMEDİ ve kırmızı. |
| `pg-test-kosumu.mjs` **(CI · bloklayıcı · `kapi-postgres` işi)** | `test:pg` | SAĞLAYICI YAŞAM DÖNGÜSÜ aracın kendisinde: PostgreSQL istemcisini üretir → test şablonunu kurar → testleri koşar → istemciyi SQLite'a GERİ ALIR ve geri aldığını `activeProvider` alanından ÖLÇER. Geri alma başarısız olursa KIRMIZI — yoksa araç dizini bozuk bırakır ve sonraki her SQLite kapısı "adaptör uyumsuz" diye yanar. `TEST_PG_URL` yoksa ÖLÇÜLMEDİ ve kırmızı. |
| `pg-istemci.mjs` | `pg:istemci` | Prisma istemcisi SAĞLAYICIYA BAĞLIDIR: `@prisma/adapter-pg` SQLite şemasından üretilmiş istemciyle çalışmaz. Şema dosyası DEĞİŞMEZ; datasource satırı geçici kopyada çevrilir. `--sqlite` geri döner. |
| `pg-test-sablonu.mjs` | `pg:test-sablonu` | PostgreSQL test şablonu: taban göçü + tohum, sonra `datallowconn=false` (açık bağlantı klonlamayı düşürür). Test dosyaları bundan klonlar. |
| `sozluk-farki.mjs` | (iki-sozluk içinde) | **pozitif ölçü**: sözlük ekrana ulaşıyor mu — aynı rotanın metni iki sözlükle alınır, fark çıkarılır | çevrilmiş rotada fark yoksa çıkış 1 |
| `sozluk-metni.mjs` | — (yardımcı) | render edilen `main` metnini JSON'a yazar; sözlüğü bilmez | — |
| `rota-dizini.mjs` | — (kütüphane) | rota → kaynak dizini, `app/` ağacından türetilir | — |
| `izin-listesi.mjs` | — (kütüphane) | izin listesinde SÖZLÜK terimiyle duran dosyalar (şema terimleri ayrı) | — |
| `cekirdek-sozcuk-taramasi.mjs` | — (elle) | bekçinin YAPISAL kör noktası: kaynakta sabit yazılmış ÇEKİRDEK sözcükler | ölü muafiyet varsa çıkış 1 |
| `terim-adaylari.mjs` | — (elle) | terim kalıplarının yanlış pozitif yüzeyini DEPODAN türetir; fikstürün kaynağı | — |
| `derleme-ortami.mjs` | — (kütüphane) | derlemeye dayanan kapıların önkoşulu: boş alan (derlemeden önce) + statik çıktının TAM olduğu (ölçmeden önce) | çağıran kapı düşer |
| `turkce-arama.mjs` | — (kütüphane) | Türkçe metin araması: çift küçültme + Unicode sözcük sınırı. **Sondalarda düz `/…/i` KULLANMAYIN** | — |
| `marka-kapisi.mjs` | `marka:kapi` | ürün adı tek kaynaktan mı geliyor: nöbetçi adla statik demo derlemesi koşar, üretilen çıktıya bakar (tarayıcı istemez) | varsayılan ad işlenmiş yüzeyde geçiyor **ya da** nöbetçi görünmesi gereken yüzeyde yok |
| `bildirim-donemi-kanit.mjs` **(CI · bloklayıcı)** | `kanit:bildirim-donemi` | Takvim tetikli yükümlülük ekranı iki bantta: dönem açıldı mı · geri sayım doğru mu · SÜRESİZ dönemde sayaç YOK mu · referanssız teslim REDDEDİLİYOR mu. Fikstürü DEĞİŞTİRMEZ (red hiçbir dönemi kapatmaz) | sayaç gösterilen süresiz dönem · kabul edilen referanssız teslim · ölçüm tabanının altına düşen iddia sayısı |
| `kimlik-kanit.mjs` **(CI · bloklayıcı)** | `kanit:kimlik` | P6 kimlik ekranları iki bantta: yapıştırılan SIR DEĞERİ reddediliyor mu · sır ekranda GÖRÜNÜYOR mu · sağlayıcı bağlı değilken giriş ekranında çıkıyor mu. Fikstüre sağlayıcı EKLER ve sonda aktiflikten çıkarıp düğmenin DÜŞTÜĞÜNÜ doğrular | ekranda görünen sır değeri · bağlanmadan aktif olan sağlayıcı · reddedilmesi gereken kaydın geçmesi |
| `kapi-farki.mjs` **(CI · bloklayıcı)** | `kapi:farki` | `package.json` betikleri ile PR kapısında koşanların farkı — tarayıcı istemez | beyansız betik (ne koşuyor ne gerekçeli) ya da bayat beyan |
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

### `kapi-farki.mjs` — koşmayan kapı, kırıldığını bildiremez

`package.json`'daki her betiği PR kapısında GERÇEKTEN koşanla
karşılaştırır. Üç durumdan biri:

| Durum | Ne demek |
| --- | --- |
| `adıyla` | iş akışında `npm run <ad>` (ya da `test` için `npm test`) geçiyor |
| `kapsanıyor` | betiğin BÜTÜN araç çağrıları CI'da koşuyor (`tasarim:kontrast` `tasarim:kapi` içinde koşar) |
| `koşmuyor` | ikisi de değil — o zaman BEYAN edilmiş olmalı |

Beyansız betik kapıyı KIRMIZI yakar. Yeni bir kapı yazıp CI'ya bağlamayı
unutmak artık sessiz değil; unutmak da bir karar hâline geldi ve
gerekçesi yazılıyor.

**Kimlik dosya + BAYRAK'tır.** Ölçüldü: `sayimlar:yenile` (`--yaz`) ile
`sayimlar:denetle` (`--denetle`) aynı dosyayı çağırır ama biri envanteri
YAZAR, öbürü DENETLER. Yalnız dosya adına bakan ilk kural, denetleyici
CI'ya bağlandığı anda yazıcıyı da "koşuyor" saydı — kapsama kuralının
kendi yanlış pozitifi. `tests/kapi-farki.test.ts` bunu vaka olarak tutar.

**Yorum satırları ayıklanır.** Yorumlanmış bir `npm run` satırı "koşuyor"
sayılsaydı, bir kapıyı yorum içine alıp beyandan da kaçırmak mümkün
olurdu.

**Elle sayım yanlış çıktı — o yüzden araç var.** Bu araç yazılmadan önce
fark elle sayıldı: 21. Yapısal ölçüm "kapı olup PR kapısında koşmayan"
için 18 buldu ve elle sayımın üç ayrı hatasını gösterdi:

  · `tasarim:kontrast` · `tasarim:font` · `tasarim:iz` **koşmuyor**
    sayılmıştı — üçü de `tasarim:kapi` zincirinde koşuyor, yalnız iş
    akışında ADLARI geçmiyor;
  · `sayimlar:yenile` · `harita:sinir` **kapı** sayılmıştı — ikisi de
    üretici, ölçmez;
  · `demo:build` · `olcum:yuk` listede hiç yoktu.

"Tahmin değil sayı" demek, sayının da ölçülmüş olmasını gerektiriyor.

**BUGÜNKÜ SAYI** (7 Eylül 2026, iki duman kapısı bağlandıktan sonra):

    betik toplamı            40
    PR kapısında koşuyor     20   (12 adıyla · 8 kapsanıyor)
    koşmuyor · KAPI DEĞİL     9   (üretici · işletim · geliştirme)
    koşmuyor · KAPI          11   ← ölçülen fark

On birin dokuzu canlı sunucu ister; ikisi (`test:kapsam` ·
`tasarim:erisim`) başka gerekçeyle bekliyor. Her biri
`arac/kapi-farki.mjs` BEYAN tablosunda, gerekçesiyle. Liste yalnız
küçülmeli: bir satırın silinmesi o betiğin CI'ya bağlandığı anlamına
gelir, ve bağlanmışsa beyanı kalırsa kapı "BAYAT BEYAN" diye kırmızı
yanar.

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

### `paket-dogrula.ts` — paket yazarının aracı (P4)

```sh
npm run paket:dogrula -- paketler/TR-ENERJI              # yedi hata sınıfı; temizse çıkış 0
npm run paket:dogrula -- paketler/TR-ENERJI --ozet-yaz   # manifest.icerikOzetleri'ni dosyalardan yazar, sonra doğrular
```

Tarayıcısız, saniyeler içinde; her hata bir satır: `dosya:konum — SINIF:
ne yanlış → nasıl düzeltilir`. **Kapı değildir** (yazar aracıdır, `kapi-farki`
beyanlı); iskelet paketlerin doğrulayıcıdan geçtiğini CI `npm test`
içindeki `tests/paket-iskeletler.test.ts` ölçer. Biçim `paketler/BENIOKU.md`.

### `k4-enerji-su.mjs` — enerji ve su BİREBİR aynı davranır (Faz B · K4)

Sekiz demo ekranını (`docs/DEMO_YOLU.md`; mercek adımı hariç yedi rota +
Tesis 360) iki sektör merceğinde açar ve her ekran için HTTP durumu,
gövde uzunluğu, hata metni, merceğin kendi sözcüğü ve Tesis 360 profil
bloğunun alan sayısını ölçer. Sayı **uydurulmaz**, ekranın kendi
"N/M alan tanımsız" metninden okunur — `textContent` ile, çünkü
`innerText` CSS `text-transform`ı uygular ve "TANIMSIZ" (ı → I) düzenli
ifadeye uymaz (ölçüldü). Hata metni hata BİLEŞENİNİN metnidir
(`403 · Yetkisiz`); küçük harf "yetkisiz" aranmaz — su demosunun bir risk
adı o sözcüğü taşır ve ilk koşuda iki sağlam ekranı kırmızı boyadı.

```sh
npm run build && PORT=3210 npm start &      # canlı üretim sunucusu ister
PORT=3210 node arac/k4-enerji-su.mjs --dizin=../docs/kanit/faz-b-k4
```

Çıktı: `<mercek>-<rota>.jpg` (tam sayfa, JPEG %45) + `OZET.md`; kırmızı
varsa çıkış 1. **Kapı değildir** (canlı sunucu ve iki mercek ister),
parite kanıtıdır: ilk koşu 3 289 yeşil vakanın görmediği bir kusuru
yakaladı (enerji Tesis 360'ta 20 yerine 13 alan; `NOT rol = x` SQL'de
NULL satırı düşürür). Kanıt `docs/kanit/faz-b-k4/OZET.md`.

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

> **Liste bugün BOŞ** (7 Eylül 2026 · ölçüldü): taşan rota 0 · kırpılan
> içerik 0 · axe ciddi/kritik 0. Cırcır 100 satırdan sıfıra indi; her
> satır SİLİNDİ, hiçbiri tavan yükseltilerek kapatılmadı. Boş liste
> kapıyı gevşetmez, TERSİNE sıkar: artık her bulgu "listede yok"
> demektir, yani kırmızıdır. Listenin boşalabildiği ayrıca sınanır
> (`tests/kalite-borcu-listesi.test.ts`) — boş dizi ile dosyanın
> SİLİNMESİ aynı şey değildir ve ikincisi kapıyı kırmızı yakar.

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

**Kimlik DÜĞÜMÜN KENDİSİNDEN üretilir** (`axe.run(..., { elementRef: true })`),
hedef seçicisi geri çözülerek değil. İlk hâl hedef seçicilerini
tekilleştirip `document.querySelector` ile öğeye çeviriyordu ve bu,
seçici tekilliğine güvenen SESSİZ bir varsayımdı: iki ihlal düğümü aynı
ham seçiciyi taşısa ikisi de İLK eşleşen öğeye çözülür, aynı yapısal yolu
ve aynı sırayı alır, tek borç hedefinde toplanırdı — bir ihlal düğümünün
yerine başkasının geçmesi izinli kalırdı. Düğümden üretilen kimlik o
varsayımı hiç kurmaz (PR #29 incelemesi).

> **Uçtan uca doğrulandı:** `/sistem`in düzeltmesi geçici geri alınıp iki
> bilinen ihlal yeniden üretildi; kimlikler `#1` ve `#2` çıktı ve kapı
> ikisini AYRI bulgu olarak raporladı.

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

#### YENİ KUSUR TÜRÜ — kapıyı KURMAK borcu büyütmez

Yeni bir ölçü eklendiğinde (üçüncüsü: örtüşme) o türün ilk bulguları
taban dalda OLAMAZ — tabanın aracı o türü hiç ölçmemiştir. DİŞ 3 bunu
"eklendi" diye okusaydı yeni bir kapı kurmak imkânsız olurdu; oysa
kapıyı kurmak borcu büyütmez, GÖRÜNÜR yapar.

Kapı BEYANA bağlıdır (`kalite-borcu.json → _yeni_tur`, `kapi/tur`
biçiminde) ve kaldıraç değildir, çünkü açılma koşulu yine **TABANIN
şeklidir**: yalnız taban o türü henüz beyan etmemişken açılır. Beyan
main'e girdiği an bu yol o tür için kalıcı olarak ölür — anahtar şeması
geçişiyle aynı sınır.

Kapı ÜÇ koşulun birden sağlanmasını ister ve üçü de dalın elinde
değildir:

1. Dal `_yeni_tur` ile BEYAN etmiş olacak.
2. Tür, dalın KAYIT DEFTERİNDE (`_olculen_turler`) olacak — aracın
   gerçekten ürettiği bir tür. Uydurma ad buradan geçemez.
3. Taban o türü HİÇ ÖLÇMEMİŞ olacak: ne kayıt defterinde ne borcunda.

> **Üçüncü koşul PR incelemesinde eklendi ve eklenmeden önce beyan bir
> KALDIRAÇTI.** `_yeni_tur` alanı bu turda geldiği için tabanın beyanı
> zorunlu olarak BOŞTUR; kapı yalnız "taban beyan etmiş mi" diye sorsaydı
> `tasma/kirpilan-icerik` gibi ÇOKTAN ÖLÇÜLEN bir tür beyan edilip o
> türde istenildiği kadar satır eklenebilirdi — cırcırın engellemek için
> var olduğu büyümenin ta kendisi. Kapıyı kapatan şey artık türün
> ölçülmüş OLMASIDIR; beyan bir niyettir, ölçüm değil.
>
> Kayıt defteri tabana girene kadar (yani bu değişiklik main'e alınana
> kadar) ÖNYÜKLEME kilidi tabanın BORCUNA bakar: bir türün tabanda satırı
> varsa o tür ölçülmüştür.

**Kayıt defteri yalnız BÜYÜR.** Küçülebilseydi bir PR türü defterden
düşürür, bir sonrakinde onu "yeni tür" diye yeniden beyan ederdi; düşen
tür kapıyı kırmızı yakar. axe kural kimlikleri açık uçludur ve deftere
girmez: yeni bir axe kuralının ilk bulgusu yeni bir ÖLÇÜ değil, yeni bir
İHLALDİR. Dokuz birim vakası bunların hepsini ayrı ayrı sınar.

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

### `yatay-tasma.mjs` — ÜÇ kusur türü

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

**3 · Örtüşen içerik.** İlk iki ölçü "içerik KAYIP mı" diye sorar. Üçüncü
ölçü başka bir şey sorar: **okunuyor mu.** İki metin üst üste binerse
ikisi de oradadır, ikisi de görünürdür ve ikisi de okunmaz — sayfa
kaymaz, kırpan ata yoktur, axe örtüşme ölçmez. Kusur bu depoda gözle
bulundu (`/riskler/[id]` · 375px, bağlam çubuğu) ve göz 69 rota × 2
bantta ölçeklenmez.

Muafiyet **kasıtlı KATMANLARDIR**: ipucu balonu, açılır menü, yapışkan
başlık, kip penceresi — hepsi bir şeyin üstüne binmek için vardır.
Ayrım "üst üste mi" değil, **"aynı AKIŞ mı yerleştirdi"**: her adaya en
yakın akış-dışı atasının kimliği yazılır (`absolute` · `fixed` ·
`sticky` · `float` · `transform` · offsetli `relative`) ve yalnız AYNI
bağlamdaki çiftler karşılaştırılır. Ataları farklıysa biri bilerek
katmanlanmıştır.

> **İlk koşuda iki yanlış alarm ailesi çıktı; ikisi de ölçülüp elendi.**
>
> **(a) Ata-torun · 69 rotanın 69'u.** Doğrudan metni VE eleman çocuğu
> olan öğeler (`<a>DEMO<span>alt</span></a>`) ikisi de aday olur ve
> atanın kutusu çocuğunu ZATEN kapsar. `contains` elemesiyle 138 → 5.
>
> **(b) Satır içi birleşim kutusu · kalan 5'in 4'ü.** Satır içi bir
> öğenin `getBoundingClientRect`i bütün satır kutularının BİRLEŞİMİDİR:
> iki satıra sarılan bir `<span>`in kutusu ilk satırın sağındaki boşluğu
> da kapsar ve oraya düşen komşusuyla "kesişiyor" görünür. Karşılaştırma
> `getClientRects()` ile satır PARÇALARINA indirildi; 5 → 3.
>
> Kalan 3 bulgu tek gerçek kusurdur (`/denetimler/[id]`'nin üç kayıt
> varyantı): `.ab-ikili` bölmeli denetim kendi kutusunu 59px aşıyor ve
> "Bulgu 0/0" komşu düğmenin altına 43×26px giriyor.
>
> **İnceleme sonrası üçüncü aile:** `transform` ve offsetli
> `position: relative` MUAF SAYILAMAZ (ikisi de öğeyi akıştan çıkarmaz,
> yalnız boyandığı yeri kaydırır) — muafiyet kalkınca `/harita`'da 9
> "bulgu" çıktı ve hepsi birbirine yakın şehirlerin harita işaretiydi.
> Eleme SVG'ye kondu: `<svg>`in KENDİSİ akıştadır ve ölçülür, İÇİ ise
> SVG koordinat sistemiyle (cx/cy, viewBox) yerleşir — onları "aynı
> yerleşim algoritması koydu" diye karşılaştırmak kategori hatasıdır.
> Grafik etiketlerinin çakışması ayrı bir ölçünün konusudur ve bu kapı
> onu iddia etmez.

**Aday tanımı KIRPILMA ölçüsüyle aynıdır** ve olmalıdır: girdi, seçim
kutusu, metin alanı ve yalnız simge taşıyan düğme doğrudan metin
taşımaz, ama bir girdinin komşusunun altına girmesi tam olarak kusurdur.

**Çiftler TOPLANIRKEN tekilleştirilir.** Ham liste tutulup sonra
tekilleştirilseydi tekrarlayan satırlar tavanı tek başına doldurur ve
sayfanın aşağısındaki gerçekten yeni bir örtüşme hiç ölçülmezdi. Tavan
artık AYRI hedef çifti sayar ve ona ulaşmak KIRIK TARAMADIR — kısmi bir
sonucu "başarılı" diye döndürmek, ölçmediğini ölçtüm demektir.

**Örtüşme hedefi YAPISAL yoldur, `etiket@kutuEni` DEĞİL.** Öteki iki
ölçüde en yerleşimden gelir (sabit sütun, sabit panel); örtüşmede iki
tarafın da eni METİNDEN gelebilir ve ölçüldü: aynı kalıbın üç kaydında
ikinci düğme `102px` ve `101px` çıkıyor, çünkü etiket kayıt sayacı
taşıyor. Kimlik `erisim-axe.mjs`'teki kuralın aynısıdır (en fazla dört
kademe, `etiket` + sıralı sınıflar) ve üç kaydın üçünde de AYNI çıktı.

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

Muafiyet YALNIZ **satır içi metne** uygulanır. `text-overflow` ancak
kendi satır kutusundaki taşan satır içi içeriği temsil eder; blok bir
çocuk, bir düğme, bir görsel ya da SVG o üç noktanın kapsamında
DEĞİLDİR ve sessizce kesilmeye devam eder. İlk hâl ata üç noktasının
altındaki HER şeyi aklıyordu (PR #29 incelemesi).

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

#### Kapanan son üç bulgu — ve ikisinin kök sebebi dar bant DEĞİLDİ

**1 · `/omur` · bir yıl bandı (375'te 4px, 768'de 3px).** Suçlu `span.ad
· ">1 yıl"` idi; ilk okuma "dar bantta etiket sığmıyor" der. Ölçüm başka
bir şey söyledi: `>1 yıl` bandı **her ende 1px**tir (1440 · 768 · 375),
etiketi şeridin 27px dışındadır ve sayfa **1440'ta da** 3px kayar. Kapı
1440'ta koşmadığı için kusur yıllarca dar bandın kusuru sanılabilirdi.

Kök sebep bir birim uyuşmazlığı: ufuk TAM AY adımlarıyla kuantalanır ve
tabanı 12 aydır (12 × 30,44 = **365,28 gün**), eşik ise **365 gün**.
Taban ufuk eşiği 0,28 gün AŞIYOR, yani `>1 yıl` bandı her zaman
çiziliyor — şeridin %0,08'i kadar, kendi adını taşıyamayan bir kıl payı.
12 ay tabanında bir yılın ötesinde gösterilecek bir şey de yoktur. Bant
artık ufuk bir yılı BİR AY aşınca belirir (`tests/omur-ufuk.test.ts`;
düzeltme geri alındığında iki test kırmızıya döner — sınandı).

> **Bir sonraki adım ölçüldü ve kusur DEĞİL.** 13 aylık ufukta bant
> şeridin %7,8'i olur: 1440'ta 108px, 768'de 56px, 375'te 25px. 375'te
> etiket şeridin 3px dışına taşar ama sayfayı kaydırmaz ve kırpan ata
> olmadığı için kırpılmaz da — iki ölçüde de kusur yok, oluk payına
> giren bir çıkıntı var. 14 aydan itibaren tam olarak 0. Bu yüzden
> "etiketi eşik çizgisinin soluna çevir" gibi bir kural YAZILMADI:
> ölçülmüş kusuru olmayan bir kural, bakımı olmayan bir tahmindir.

**2 · `/riskler/[id]` · bağlam paneli (375'te 49px).** Izgara
`minmax(0, 1fr) 400px` idi; dar bantta içerik sütunu 0px'e çöküyor,
400px panel şeridi taşırıyordu. Asıl mesele şu: yerleşim ekranın içinde
**satır içi `style`** ile yazılmıştı ve satır içi stil bir medya
sorgusuyla EZİLEMEZ — ekran yapısı gereği düzelemiyordu. Yerleşim kabuk
gramerine taşındı (`.ab-kayit-ikili`) ve dar bant kararı `.ab-a-calisma`
ile aynı: panel GİZLENMEZ, içeriğin ALTINA iner, kenarlığını sola değil
üste alır; eşik yine 820px.

**3 · `/sistem/bilesenler` · topoloji düğümleri (375'te 4 düğüm/39px,
768'de 2 düğüm/16px).** Düğüm kutusu SABİT 168px, konumu YÜZDE — uçtaki
düğüm kenardan 84px içeride durmak zorunda. `x=16%` tuvalin ≥525px,
`x=90%` ≥840px olmasını ister; altında `overflow: hidden` sessizce
keser. Şema küçültülerek çözülemez: kenarlar SVG'de düğümün yüzde
koordinatına çizilir, düğümü kenara çivilemek çizgiyi düğüme YALANCI
bağlar — olmayan bir bağlantı gösterirdi. Tuval kendi içsel enini
(840px) korur ve KAYDIRILIR; kap `role="region"` + ad + `tabIndex`
taşır, çünkü kaydıran ama odaklanamayan kap klavyede erişilemezdir.
`/sistem`'in iki kontrast/tipografi matrisi de aynı grameri aldı ve son
iki axe satırı böyle kapandı.


#### Kapıların GÖRMEDİĞİ bir kusur — ölçüm bunu görsel doğrulamada buldu

Yedi satır kapandıktan sonra `/riskler/[id]` 375px'te gözle bakıldı ve
metin metnin üstüne binmiş hâlde bulundu. **İki kapı da bunu göremez**:
sayfa kaymıyor (`sayfa-kayiyor` sessiz), kırpan ata yok
(`kirpilan-icerik` sessiz), axe örtüşmeyi ölçmez. Kusur "eksik bir şey"
de değildi — iki metin de ORADA, üst üste, ikisi de okunmuyor.

Kök sebep: `.ab-baglam` `nowrap` bir flex satırı. `.yol` kırıntı
şeridinde `min-width: 0` var (orta kırıntının üç noktası için) ve dar
bantta şerit kendi min-content eninin ALTINA eziliyor; son kırıntı
kutusundan taşıp eylem düğmelerinin üstüne biniyor.

> **ÖLÇÜLDÜ · 375px · dört rota:** `/riskler/[id]` son kırıntı `.yol`dan
> **34px** kaçıyor, düğmeyle **18px** örtüşüyor; `/sistem/bilesenler`
> 24px / 8px. Çubuk ≤700px'te SARINCA kaçış 0'a düşer ve örtüşme 375 ·
> 768 · 1440'ın üçünde de 0'dır. `.ab-durum` ve `.ab-alt` ile aynı
> karar, aynı eşik.

Ders kapıya değil YORDAMA yazılır: kapı yeşil olduğu için ekran doğru
değildir. `enterprise-interaction-simplification-auditor` bunu kural
olarak söylüyor — "axe geçti, taşma yok" bir kullanılabilirlik kanıtı
değildir. ÖRTÜŞME ölçen bir kapı bugün yoktur; yazılırsa yeri budur.

#### OTURUMSUZ yüzeyler — ürünün ilk gördüğü ekran kapının dışındaydı

İki tarayıcılı kapı da ölçmeden ÖNCE oturum açar. axe kapısı `/giris`i
bu yüzden ayrıca, girişten önce tarıyordu; taşma kapısı ise listeyi hiç
bilmiyordu ve `rotalar.json` da `/giris`i taşımaz — yani ürünün İLK
gördüğü yüzey taşma kapısının dışındaydı.

> **Çapraz kontrol BEYANDAN BAĞIMSIZ koşar.** İlk hâli
> `if (OTURUMSUZ.length > 0)` koşuluna bağlıydı: listeyi BOŞALTMAK
> kontrolü de susturuyor, iki kapı da her oturumsuz yüzeyi atlayıp yeşil
> çıkıyordu — listeyi silmenin kapıyı yıkması gerekirken susturması, borç
> listesinde kapatılan kaçışın aynısı (PR #29 incelemesi). Kontrol listeye
> değil DİSKE bakar; boş liste onun cevabını değiştirmez, yalnız "beyan
> edilmemiş" sayısını büyütür.

Liste artık tek kaynaktadır (`kosu-ortak.mjs → OTURUMSUZ_ROTALAR`) ve
iki kapı da onu okur; bir sonraki oturumsuz yüzeyin birinde ölçülüp
ötekinde atlanması yapısal olarak imkânsızdır. Her satır bir NÖBETÇİ
seçici taşır: oturum çerezi sızarsa `/giris` panoya yönlenir ve kapı
sessizce PANOYU ölçmeye başlardı. Yönlendirme denetimi "başka yere gitti
mi" der, nöbetçi "doğru yere geldi mi" der; ikisi ayrı kilittir.

**Liste ÇAPRAZ KONTROL edilir — elle tutulan liste yetmez.** `rotalar.json`
da elle tutuluyordu, dinamik rotaları kaçırdı ve altı kayıt detayı ekranı
aylarca taranmadı; aynı hatanın tekrarı beklenmelidir. Liste TÜRETİLEMEZ
(koruma bir middleware'de değil, sayfa başına `lib/erisim.ts` içindedir
ve statik okunamaz) ama ÖLÇÜLEBİLİR: **diskten** türeyen her `page.tsx`
oturumsuz istenir ve `/giris`e yönlenmesi beklenir. Yönlenmeyen ve beyan
edilmemiş her yüzey kapıyı KIRMIZI yakar ve izin listesine giremez —
ölçülmeyen bir yüzey "borç" değildir.

> **Kapsamın diskten gelmesi ŞARTTIR ve bu denendi.** İlk uygulama
> kapsamı `rotalar.json`dan alıyordu, yani elle tutulan bir listeyi elle
> tutulan başka bir listeye karşı kontrol ediyordu: `/giris` ikisinde de
> yok, diş ısırmadı (beyan silindiğinde kapı yeşil kaldı). Kapsam
> `sayfaEnvanteri()`ye — `app` altındaki her `page.tsx`e — çevrilince diş
> ilk koşuda **`/bakim`**'ı buldu: kodunda "kabuk yok, oturum şartı yok"
> yazılı, `rotalar.json`da yok, iki kapının da dışındaydı.
>
> İki ölçüm kusuru daha yolda elendi: (a) `domcontentloaded` ile
> `/tedarikciler` "oturumsuz açık" görünüyordu — yakalanan şey
> `loading.tsx` iskeletiydi, sunucu yönlendirmesi henüz inmemişti;
> `networkidle` şart. Yanlış bir güvenlik alarmı, kaçırılan bir yüzey
> kadar zararlıdır. (b) "Giriş ekranına varmak korunma kanıtıdır" kuralı
> giriş ekranının KENDİSİ için geçerli değildir; yazılmasaydı `/giris`
> beyandan düştüğünde çapraz kontrol tam da kaçırdığı yüzeyi kaçırmaya
> devam ederdi.

Bugün beyanda üç yüzey var: `/giris`, **404** (yanlış adres yazan herkes
görür; bir rota değil, rotasızlığın ekranı) ve `/bakim`. Her satır bir
BEKLENEN HTTP KODU taşır — 404 yüzeyinde 404 doğru cevaptır, 200 yanlış
yüzeydir. `global-error.tsx` bilerek dışarıdadır: göstermek için kök
düzende istek üzerine istisna fırlatmanın deterministik bir yolu yok ve
ölçülemeyen bir yüzey için kapı yazmak, tahmini kapı diye satmak olurdu.

> **İlk oturumsuz ölçüm ne buldu:** `/giris` 375px'te sayfayı 25px
> kaydırıyor, kendi `<h1>`ini %100 kırpıyordu. Kök sebep daha ağırdı:
> ekran `className="ab"`ı belirteç ve tipografi için kullanıyor ama
> uygulama KABUĞU değil — `.ab`'nin altı satırlık şablonu
> (`56px auto auto minmax(0, 1fr) auto auto`) ona da uygulanıyor ve iki
> paneli de kabuğun 56 piksellik BAŞLIK satırına çakıyordu. Ölçüldü,
> üç bantta da: görsel alanı 1040×56 · 368×56 · 0×56 ve e-posta alanının
> üst kenarı **−15px**, yani form GÖRÜNTÜ ALANININ ÜSTÜNDE. Kusur her
> ende vardı ve satır içi `style` ile düzelemezdi: orada yalnız
> `grid-template-columns` yazılıydı.


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

### `goc-zinciri.mjs` — göç ZİNCİRİ şemayla birebir mi (boş veritabanı)

`kapi:sema-sapmasi` MEVCUT dev.db'yi ölçer; o dosya elle düzeltilmiş bir
göçün ürünü olabilir (ölçüldü, P4 · 2.4: `migrate diff` RedefineTables
üretti ve uygulandı; göç dosyası ADD COLUMN olarak yeniden yazıldı, dev.db
sağlaması elle güncellendi — disk doğru, zincir doğrulanmamıştı). Müşteri
kurulumu yalnız zinciri görür: zincir şemadan ayrışırsa YENİ kurulum ile
MEVCUT kurulum ayrışır ve bu ancak müşteride çıkar.

Kapı `web/.parti/` altında boş bir SQLite ve geçici bir `prisma.config.ts`
açar, `prisma migrate deploy` koşar (kurulumun yaptığı şeyin aynısı),
uygulanan göçleri STDOUT'tan değil `_prisma_migrations` tablosundan okur
ve dizindeki listeyle karşılaştırır (sıfır ya da eksik uygulama kırmızı —
ölçüm sayısı sıfır olamaz), sonra `migrate diff --from-config-datasource
--to-schema --exit-code` ile farkı ölçer: 0 fark yok · 2 fark var (SQL
basılır) · başka = araç hatası, kırmızı. Geçici dizin sonda silinir ve
silindiği ölçülür.

```
npm run kapi:goc-zinciri            # "50 göç dizinde · 50 göç ... uygulandı · şema farkı 0" · çıkış 0
node arac/goc-zinciri.mjs --json    # ölçüm nesnesi; karar vermez
```

Sabotaj kalıcıdır: `tests/goc-zinciri.test.ts` bir göçten ADD COLUMN
silinmiş zincir kopyasını ve göçsüz bir şema kolonunu kırmızı yakar
(URN-KUR-008).

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
