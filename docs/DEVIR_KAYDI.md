# Devir kaydı · 8 Eylül 2026

Bu belge ardıl oturum içindir. Anlatan kimse olmayacak; **buradan
okunacak.** İki bölüm var: neyin açık kaldığı (A) ve kapanış anındaki
sayılar (B).

Kural gereği hiçbir sayı burada tekrar yazılmaz, **ölçülür**: B
bölümündeki her satırın nasıl ölçüldüğü komutuyla yazılı. Ardıl oturumun
İLK İŞİ o komutları kendi ucunda koşmaktır. Tutmuyorsa eşitleme
yapılmamıştır — belge yalan söylemez, ölçüm ortamı bayattır.

---

## 0 · SIFIRDAN BAŞLAYAN OTURUM İÇİN — İLK YARIM SAAT

Bu belgeyi yazan konuşmanın hafızası yok sayılacak. Aşağıdakiler
varsayım değil, **yapılacak iş**.

### 0.1 · Önce oku (sırayla)

1. `CLAUDE.md` — bağlayıcı kurallar. Özellikle "Bağlayıcı kurallar"
   bölümünün tamamı; yedi kural bu turlarda ÖLÇÜLMÜŞ kusurlardan doğdu.
2. `web/arac/BENIOKU.md` → **ORTAM TAZELİĞİ** — ölçüm yapmadan önce
   atlanamaz yordam. Bu oturumda üç kez yanlış alarm üretti.
3. `docs/GELISTIRME_PAKETLERI.md` §6 — R0 kütüğü (açık kalemler).
4. Bu belgenin geri kalanı.

### 0.2 · Önce ORTAMI KUR (ölçüm bunsuz düşer)

`npm ci` YETMEZ. Prisma istemcisi üretilmiş bir çıktıdır
(`lib/prisma-client`, depoda yok) ve tohum verisi olmadan ekran kodu
içe aktarılamaz. Eksikse ölçüm bir kod kusuru gibi düşer — ölçüldü
(8 Eyl 2026): `cekirdek-sozcuk-taramasi.mjs`
`Cannot find module '@/lib/prisma-client/client'` ile çöktü ve bu
kırmızı KODA ait değildi. Sıra CI'nın kendi sırasıdır:

```sh
cd web
npm ci
npx prisma migrate deploy
npx prisma generate            # lib/prisma-client — depoda YOK, üretilir
npx tsx prisma/seed.ts
```

Tarayıcılı kapılar için ayrıca `arac/BENIOKU.md` → **ORTAM TAZELİĞİ**
koşulur (süreçleri öldür → portun kapandığını doğrula → derle → başlat).

### 0.3 · Sonra ÖLÇ (anlatılana güvenme)

```sh
cd web
npx vitest run
npm run sayimlar:denetle             # beklenen sayı BURADAN gelir
npx tsx arac/cekirdek-sozcuk-taramasi.mjs
npx vitest run tests/bekci/sektor-terimi.test.ts
```

Beklenen test sayısı bu belgeye **yazılmaz**: tek kaynak
`web/arac/test-envanteri.json` ve onu `sayimlar:denetle` doğrular
(sıfır keşif "ölçüm" değil KIRIKTIR — `kesifKarari`). Belgeye elle
yazılan bir sayı, ilk test eklendiğinde yalan söyler.

Sayılar §B ile tutmuyorsa **eşitleme yapılmamıştır** — önce onu çöz.

### 0.4 · Ölçüm ortamı tuzakları (üçü de yaşandı)

| Tuzak | Nasıl görünür |
| --- | --- |
| Bayat `next start` | `rota-duman`: "`/` ← kabuk yok"; süreç SİLİNMİŞ inode tutuyor |
| Dolu disk | Vitest keşfi "0 vaka" döner, kapı "doğrulandı" der |
| Kendi kendini bekleyen `pgrep`/`pkill` | `pkill -f "next start"` KENDİ kabuğunu öldürür; `pgrep -f "x.mjs"` bekleyicinin kendi komut satırıyla eşleşir ve süreç hiç bitmez (ölçüldü: 1sa 42dk boşuna bekleme) |

Uzun koşan bir kapı varken portu BAŞKA bir iş için kapatmayın: o kapı
kod kusuru gibi görünen bir hatayla düşer.

### 0.5 · Depo düzeni

- Ürün kodu `web/` altında. Kapılar `web/arac/`, bekçiler
  `web/tests/bekci/`.
- Değişiklik PR ile gelir; `main`'e doğrudan push yok.
- **Merge ön koşulu ikidir: CI yeşil VE açık inceleme yorumu yok.**
- Uzun koşan elle kapı: `PORT=3211 npm run kapi:iki-sozluk` (~22 dk).
- Parti kapanışı: `npm run kapi:parti` (`--liste` ile koşmadan görülür).

---

## A · AÇIK KALEMLER

### A.1 · R0 kütüğündeki açık satırlar

Tam metinleri `docs/GELISTIRME_PAKETLERI.md` §6'dadır; burada yalnız
sahibi ve kapanış aşaması.

| No | Kusur | Sahip | Kapanış |
| --- | --- | --- | --- |
| R0-10 | `/` saha ekranı tek ekran sözleşmesini **3px** ihlal ediyor (`konsol:olcum` kırmızı; 1366×768 → 771/768 · 1440×900 → 903/900 · 1280×800 → 803/800 — sabit 3px, banttan bağımsız) | saha ekranı (F1) · UX dilimi | `konsol:olcum` CI'ya bağlanmadan **önce** |
| R0-11 | `KURULU_GUC = 'kuruluGucMw'` — bir KAYIT ANAHTARI (`TesisOzellik.anahtar` sütununda duruyor), kod adı değil; değiştirmek veri göçü ister | P4 · öznitelik şeması | ekranlar özniteliği adıyla bilmeyi bıraktığında |
| R0-12 | Bloklayıcı erişilebilirlik kapısı **1366×768'i hiç taramıyor** (axe 1440×900 · 768×1024 · 375×780) | kalite kapıları dilimi | `tasarim:dizustu` CI'ya bağlandığı gün |

Kapanan bir kalem daha var ve buraya yazılıyor ki tekrar açılmasın:
**inceleme turu #30'un beş bulgusu** (#32 ile kapandı) — göç sözlüğü
doldurmuyordu (P1), öznitelik profil alanını eziyordu (P1), sınıfsız
tesis "tek sektör" sayılıyordu, `olcek.mjs`de eksik `await`, disk
temizliği başkasının dizinini siliyordu. Beşinin de düzeltme kanıtı
`web/tests/inceleme-30.test.ts`te; beşi de sabotajla doğrulandı.

### A.2 · Sektör terimi izin listesi — ERTELENMİŞ satırların kapanışı

Liste artık **tek karışık sayı değil**: her satır KALICI ya da ERTELENMİŞ.
Makine tarafı `web/tests/bekci/sektor-terimi-izin.json` → `siniflandirma`;
bekçi bunu dişleriyle zorunlu tutar (sınıfsız satır kırmızı, kapanışsız
erteleme kırmızı, kapanışlı "kalıcı" kırmızı).

**KALICI — sıfır BEKLENMİYOR.** Sektör sözcüğü orada ilkesel bir sebeple
duruyor; temizlemek dosyanın işini bozar.

| Dosya | Neden kalıcı |
| --- | --- |
| `lib/dil/terimler.ts` | Sözlük katmanının kendisi; hâl eklerini anlatmak için kiracının sözcüğünü **alıntılamak** zorunda |
| `lib/senaryo/urunlestirme.ts` | Senaryolar terim katmanını anlatıyor ve bekçi kalıbına verilen yazımları alıntılıyor |
| `lib/sahaArkaPlan.ts` | Görsel künyesi **fotoğrafın kendisini** anlatır; karede rüzgâr türbini varsa künye "türbin" der |

**ERTELENMİŞ — kapanış aşaması yazılı.** Asıl eriyecek borç budur ve
kendi tavanını taşır (`ertelenmisTavani`).

| Dosya | Kapanış aşaması |
| --- | --- |
| `app/(kabuk)/(operasyonel)/sistem/bilesenler/Galeri.tsx` | Sözlük yayılımı `/sistem` ailesine geldiğinde — örnek içerik de sözlükten üretilir |
| `app/(kabuk)/(operasyonel)/sistem/page.tsx` | Aynı dilim (jeton örnek değerleri) |
| `components/kabuk/tip.ts` | **P4** · eşleme `TesisTipi` satırından okunduğunda |
| `lib/sabitler.ts` | **P4** · şema göçü — R0-11 ile aynı gün |
| `lib/entegrasyon/adaptorler/elleAktarim.ts` | **P4** · eşad sözlüğü içerik paketinden geldiğinde |
| `lib/entegrasyon/varlikAktarim.ts` | **P4** · aynı dilim |
| `lib/gorsel.ts` | **P2** · kiracı görselleri kiracı yapılandırmasına taşındığında |
| `app/(kabuk)/(operasyonel)/yonetim-tezgahi/Formlar.tsx` | **P2** · form varsayılanları kiracının tip kümesinden okunduğunda |

### A.3 · Beyanla CI DIŞINDA bırakılan kapılar

Kaynak `web/arac/kapi-farki.mjs` → `BEYAN`; beyansız betik kapıyı kırmızı
yakar. **Her satırda sebebin türü açık yazılıdır** — ikisi aynı şey
değildir ve karıştırılırsa bir kusur "süre sorunu" diye yıllarca bekler.

- **SÜRE** = kapı çalışıyor, sonucu güvenilir; CI'ya bağlanmaması bütçe kararı.
- **KUSUR** = kapı bugün bağlanırsa **kırmızı yanar**; önce kusurun kendisi kapanmalı.

> **BEYAN BİR ÇÖZÜM DEĞİL, BORÇTUR — ve borcun faizi ÖLÇÜLDÜ.** Tek bir
> inceleme turu (#30), beyanla CI dışında bırakılmış kapıların ARKASINDA
> **iki** kusur buldu: `arac/olcek.mjs`de eksik bir `await` (`kapsamKur`
> asenkron; ölçek yolu çağırıp beklemiyordu, `kapsam.yazabilir` tanımsız
> diye atıyordu) ve `tasarim:dizustu`nun bandındaki erişilebilirlik
> boşluğu (R0-12). İkisi de aylardır oradaydı; ikisini de kapı değil,
> bir insan/bot okuması buldu. Beyan listesi uzadıkça, kapının
> göremediği yüzey büyür. Listeye yeni satır eklerken bu ölçüm
> hatırlansın.

| Betik | Tür | Sebep |
| --- | --- | --- |
| `kapi:iki-sozluk` | **SÜRE** | Üç düzen kapısını üç sözlükle koşar (9 koşum, ~22 dk); tarayıcılı bloğu üçe katlar |
| `tasarim:rota` | **SÜRE** | 4 bant × 58 rota; `rota:duman` ile örtüşüyor, ayrıştırılmadan bağlanırsa süre iki katına çıkar |
| `test:kapsam` | **SÜRE** | Kapsam raporu eşiksiz ve süreyi ikiye katlıyor |
| `tasarim:dizustu` | **KUSUR** | 1366×768 kırpılma bandı borç listesinde yok → bağlanırsa kırmızı (**R0-12**) |
| `tasarim:ux` | **KUSUR** | Bulguları borç listesine girmedi; cırcırsız bağlanırsa ilk turda kırmızı |
| `tasarim:cekmece` | **KUSUR** | Aynı gerekçe: borç listesi yok |
| `tasarim:gorsel` | **KUSUR** | Altın görüntüler depoda yok; altınsız koşarsa "altın yok" diye kırmızı |
| `tasarim:erisim` | **EMEKLİ** | `erisim-axe` yerini aldı (axe-core, üç bant, cırcırlı); araç kaldırılacak |
| `tasarim:yuk` · `tasarim:gorev` | **EŞİKSİZ** | Rapor üretir, kusur eşiği yok — çıkış kodu hep 0, kapı değil ölçü |
| `olcum:yuk` · `kalite:lighthouse` | **ORTAMA BAĞLI** | Eşik runner donanımına göre kayar; CI'da anlamsız |
| `kapi:parti` | **TOTOLOJİ** | İş akışının kendisinden türetilir; CI'ya bağlanması iş akışının kendini çağırması olur |

---

## A.4 · BU TURDA KONAN KURALLAR

Beşi de `CLAUDE.md` "Bağlayıcı kurallar" bölümünde tam metniyle yazılı.
Hepsi **ölçülmüş** bir kusurdan doğdu; hiçbiri kuramsal değil.

1. **Parti kapanış kapı kümesi = PR kapı kümesi.**
   Kapanış kümesi elle sayılıyordu ve PR'ınkinden küçüktü: `demo:build`
   parti sonunda hiç koşmadığı için modül döngüsü **iki parti boyunca**
   kırmızı kaldı. Bugün küme `pr-kapisi.yml`den TÜRETİLİR
   (`npm run kapi:parti`, `--liste` ile koşmadan görülür).

2. **Taban indirmesi ve tavan yükseltmesi gerekçe ister — DOSYADA.**
   ÖLÇÜLDÜ: `terimTavani` 85 → 500 yazıldığında bekçinin on bir vakası
   da yeşil kaldı. Bugün tavan ölçümün üstüne çıkamaz; yükselme
   `tavanGerekceleri` altında o yükselmeyi (`eski` → `yeni`) anlatan bir
   gerekçe ister. Taban `--taban-yaz --sebep="..."` olmadan **inmez** ve
   gerekçe `olcum-tabani.json`a işlenir. Commit mesajı yetmez.

3. **Kırmızıyı koda yazmadan önce ölçüm ortamının tazeliğini doğrula.**
   Bayat `next start`, dolu disk, kapatılmış port — üçü de ölçüldü ve
   üçü de kod kusuru gibi görünen yanlış alarm üretti. Sıra
   `web/arac/BENIOKU.md` → **ORTAM TAZELİĞİ**'nde; **2. adım (portun
   kapandığını doğrula) atlanamaz**: `next start` `EADDRINUSE` ile ölür
   ama `curl` eski sunucuyu görüp "hazır" der.

4. **Gerekçe kusuru anlatır, maliyeti değil.**
   Bir gerekçe kusurun kendisini değil düzeltme maliyetini anlatıyorsa,
   o bir gerekçe değildir. `npm run gerekce:tarama` mevcut bütün
   muafiyet/beyan gerekçelerini bu ölçüte vurur (bugün 69 gerekçe).

5. **Ölçüm tabanı — ölçümlerin tavanı var, tabanı yok idi.**
   Sayı raporlayan her kapı beklenen ASGARİ sayıyı da doğrular
   (`arac/olcum-tabani.mjs`). Cırcır borç için tavan tutar; bu taban
   kapsam için taban tutar. Doğuran kusur: disk dolunca test keşfi
   "158 dosya · **0 vaka**" döndü ve sayım kapısı "doğrulandı" dedi.

Altıncısı bu turda eklendi ve aynı sınıfta:
**Düzelttiğini iddia eden değişiklik SABOTAJLA kanıtlanır** — yama geri
alındığında kırmızı geri gelmiyorsa düzelttiğin şey o değildi.

Yedincisi bir merge hatasından doğdu:
**Merge ön koşulu İKİDİR — CI yeşil VE açık inceleme yorumu yok.** Biri
öbürünün yerine geçmez. ÖLÇÜLDÜ: #30'da otomatik inceleme 06:58'de beş
bulgu (ikisi P1) bildirdi, merge 07:00'de yalnız CI'ya bakılarak yapıldı
ve beşi de `main`e girdi. Düzeltmeleri #32 kapattı.

**KAPANDI · depo ayarı (8 Eylül 2026).** Kural artık YAPISAL: `main`
ruleset'inde PR zorunlu (0 onay) · **Require conversation resolution
before merging** · status check `kapi` + **Require branches to be up to
date** · force push engelli · silme kısıtlı. **Bypass listesi boş** —
istisnası olan bir kural, kural değildir. Elle yapılan kontrol bir gün
yapılmaz; artık yapılmasına gerek yok. Bu satır kalemi KAPATIR: ardıl
oturum bunu bir daha sormaz.

---

## A.5 · DEDEKTÖRLER NEREDE

Kusuru bulan şey ekran değil, dedektördür. Örnekleri temizleyip
dedektörü kapatmamak, borcu **görünmez** yapar — bu turda iki kez oldu.

| Ne | Nerede | Ne yapar |
| --- | --- | --- |
| `camelKalibi` | `web/arac/turkce-arama.mjs` | camelCase yazımları görür (`gucMw` · `kuruluGucMw` · `uretimKaybiMw`); `tests/bekci/terimler.ts` MW kalıbında kullanılıyor |
| `plant` kalıbı | `web/tests/bekci/terimler.ts` | Sağ sınır rakama AÇIK → `Plant360` görünür; sol sınır sözcük sınırı → "toplantı" görünmez. Alt çizgili yazım bilerek dışarıda (depoda 0 eşleşme, körlük yazılı) |
| `olcum-tabani` | `web/arac/olcum-tabani.mjs` + `.json` | Sayı raporlayan kapının asgari kapsamı; `tabanKarari` · `yazimKarari` saf, tarayıcısız sınanır |
| tek-nüsha değişmezi | `web/tests/tek-nusha.test.ts` | Kapı betikleri ortak yardımcıyı İÇE AKTARIR, yeniden tanımlamaz; ikiz liste dosyası da kırmızıdır |
| `kesifKarari` | `web/arac/test-envanteri.mjs` + `tests/kesif-karari.test.ts` | Sıfır keşif ölçüm değil KIRIKTIR |
| `kapi-farki` | `web/arac/kapi-farki.mjs` | `package.json` betikleri ile CI'da gerçekten koşanın farkı; beyansız betik kırmızı. `adimlar()` ve `isOrtami()` de burada |
| `kapi:parti` | `web/arac/parti-kapanisi.mjs` | Parti kapanış kümesini iş akışından türetip koşar; tanımadığı her anahtarı **ORTAM FARKI** olarak sayar |
| `durdurmaKarari` · `sunucuYasamDongusu` | `web/arac/kapi-farki.mjs` + `tests/sunucu-durdurma.test.ts` | "Başarısız OLAMAYAN temizlik adımı" sınıfı: süreç adıyla öldürme · `\|\| true` · son koşulu doğrulamayan adım. Yaşam döngüsü adımlarının tespiti de burada — **tek nüsha**; `parti-kapanisi.mjs` koşar, bekçi sınar. Başlatan var da duran tanınmıyorsa ATAR, sessiz `-1` dönmez |
| `gerekce:tarama` | `web/arac/gerekce-tarama.mjs` | Muafiyet/beyan gerekçelerini maliyet diline karşı tarar. **Kapı değildir**, tarayıcıdır — kendi sınırı başlığında yazılı |
| `kirpanAta` vakaları | `web/tests/kirpan-ata.test.ts` | Düzen kapısının kırpan-ata yürüyüşü; kaydırılabilen içerik kayıp sayılmaz, `auto` ama kaymayan kap yürüyüşü durdurmaz |
| `sozlukDurumu` | `web/lib/dil/sozlukDurumu.ts` | "Sözlük yok" ile "sözlük BOŞ"u ayırır: SEKTÖRSÜZ (doğru cevap) · EKSİK (kusur) · VAR. `kapsamKarari` da burada — bilinmeyen sektör "tek sektör" sayılmaz |
| İnceleme #30 vakaları | `web/tests/inceleme-30.test.ts` | Bir inceleme turunun beş bulgusunun düzeltme kanıtı; hepsi sabotajla doğrulandı |

---

## A.6 · ARŞİV DALLARI — ne oldukları ve neden duruyorlar

İkisi de **ölü koddur ve öyle kalmalıdır**; hiçbir dal onlardan
dallanmaz, hiçbiri `main`e gitmez. Var olma sebepleri tek: kapanan bir
oturumun diskiyle birlikte kaybolacak olmalarıydı. "Bu dallar ne?" diye
sorulup silinmesinler diye buraya yazıldılar.

| Dal | Uç | Nedir | Neden duruyor |
| --- | --- | --- | --- |
| `arsiv/p1-eski-yerel-2026-09` | `a5668f4` | P1 terim çevirisinin **yerel kopyası**. Uzak dal 13 commit ilerlemişti ve öbür oturum aynı işi yapmıştı (71/75 dosya tek commit'te örtüşüyordu); benim çoğaltılmış parti commit'lerim atıldı, yalnız dedektör/alet işi üstakımın ucuna yeniden kuruldu | Atma kararının **kaydı**. Hangi işin neden atıldığı sorulursa cevabı burada; yeniden kurulan `90c1e21` ile karşılaştırılabilir |
| `arsiv/yerel-main-2026-09` | `4cde36f` | Yerel `main`de duran ve **hiçbir uzak dalda bulunmayan 10 commit** — 2 Eylül tarihsel UX denetimi (FAZ F–Q), zorunlu UX skill seti, iki ölçüm aracı | İçeriğinin `origin/main`de olup olmadığı satır satır doğrulanmadı; skill dosyaları her ikisinde de var ama 498 dosyalık bir fark duruyor. Silmeden önce o farkın incelenmesi gerekir |

İkisi de bu oturumda **geri okumayla** doğrulandı
(`git ls-remote --heads origin 'arsiv/*'`), "push başarılı" mesajıyla
değil.

---

## B · SON ÖLÇÜM RAPORU

**Ardıl oturum bu bölümü okumakla yetinmez, komutları koşar.**

### Ölçüm künyesi

| | |
| --- | --- |
| **Ölçüm commit'i** | `85bd880` — `Merge pull request #31 from ahmetrz/kapanis-devir` |
| Ölçüm tarihi | 8 Eylül 2026 |
| Ölçülen ağaç | `origin/main` (devir kaydı birleştirildikten SONRA) |
| Önceki ölçüm | `640c837` (#32 · inceleme düzeltmeleri) — sayılar AYNI çıktı; #31 terim borcuna dokunmadı |
| Kapı kümesi | `npm run kapi:parti` → **geçti 18 · KIRMIZI 0 · ÖLÇÜLMEDİ 0** |
| Test keşfi | 162 dosya · 3215 vaka geçti · 1 atlandı |

### Sayılar

```
A · KALICI      :  3 dosya /  13 terim
A · ERTELENMİŞ  :  8 dosya /  72 terim
A · TOPLAM      : 11 dosya /  85 terim
B               :  0 bulgu /   0 dosya   (65/65 muafiyet kullanıldı)
ölçüm commit'i  : 85bd880
```

Cırcır tavanları aynı uçta: `tavan` 11 · `terimTavani` 85 ·
`ertelenmisTavani` 72. Üçü de ölçümün ÜSTÜNDE değil, TAM ÜSTÜNDE —
gevşeklik dişi bunu zorunlu tutuyor.

### Nasıl yeniden ölçülür

**A (sektör terimi izin listesi)** — sınıf başına dosya ve terim:

```sh
cd web
npx tsx -e "
import { readFileSync } from 'node:fs';
import { terimleriBul } from './tests/bekci/terimler';
const izin = JSON.parse(readFileSync('tests/bekci/sektor-terimi-izin.json','utf8'));
const say = (d) => terimleriBul(d).reduce((a,x)=>a+x.sayi,0);
let k={d:0,t:0}, e={d:0,t:0};
for (const d of izin.dosyalar) {
  const n = say(d), s = izin.siniflandirma[d];
  if (s.tur==='kalici') { k.d++; k.t+=n; } else { e.d++; e.t+=n; }
}
console.log('KALICI', k.d, '/', k.t, '· ERTELENMİŞ', e.d, '/', e.t);
"
```

**B (çekirdek sözcük taraması)**:

```sh
cd web && npx tsx arac/cekirdek-sozcuk-taramasi.mjs
```

**Cırcırın kendisi** (on iki diş, ikisi taban dal ister):

```sh
cd web && npx vitest run tests/bekci/sektor-terimi.test.ts
```

### Tutmazsa ne demektir

Sayı **büyükse**: ya uç bu commit'ten geride, ya da yeni bir sızıntı
girmiş — bekçi zaten kırmızı yanar, önce onu okuyun.

Sayı **küçükse**: birileri temizlemiş ama tavanı indirmemiş olabilir;
gevşeklik dişi bunu kırmızı yakar ve tavanı ölçüme çekmenizi ister.

**Hiç ölçülemiyorsa** (komut çöküyor, 0 dönüyor): bu bir "geçti" değil.
Önce ölçüm ortamının tazeliğini doğrulayın (`web/arac/BENIOKU.md` →
ORTAM TAZELİĞİ); bu oturumda dolu disk yüzünden test keşfi "0 vaka"
dönmüş ve kapı "doğrulandı" demişti.

