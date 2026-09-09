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
| ~~R0-10~~ | **KAPANDI** (8 Eyl 2026) — jetondan hesaplanan yükseklik ızgaraya devredildi; üç bantta da tam oturuyor, sabotajla doğrulandı | — | kapandı |
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

Dokuzuncusu sekizincinin devamı (9 Eylül 2026):
**NULL-olumsuzlama bir SINIFTIR, tek kusur değil.** Depoda ölçüldü: 637
dosya · 1 393 Prisma çağrısı · 37 olumsuz yüklem bulgusu (`not:` 21 ·
`NOT:` 7 · `notIn:` 9 · `isNot:` 0 · ham SQL 0); 34'ü şemaya karşı
güvenli (NULL'un kendisi 14 · NOT NULL kolon 18 · NULL açıkça ele alınmış
2), 3'ü beyanlı (dinamik ilişki olumsuzlaması 1 · çağrı dışı ortak parça
2 — ikisi de NOT NULL kolon). Kusur sayısı: 1 (Faz B'de düzeltilen). Kural motoru `!=` işleci NULL'da
`bilinmiyor` döner (`kosulSagla`), kusur yok. Bekçi
`tests/bekci/null-olumsuzlama.test.ts` (URN-VER-001); izin listesi
yalnız küçülür.

Sekizincisi Faz B'de (B1/B2) ölçüldü:
**Parite EKRANDAN ölçülür, yeşil testten değil.** 3 289 vaka yeşilken
K4 ekran koşusu enerji Tesis 360'ta 20 yerine **13** alan gösterdi:
`NOT: { rol: 'kapasite' }` SQL üç değerli mantıkta rolü NULL yedi satırı
düşürüyordu; saf fonksiyon testleri şemayı hazır aldığı için göremedi.
Bugün veri yolu DB'ye karşı sınanır (`tests/tesis360-sektor-profili.test.ts`,
TES-PRF-006, sabotajla kanıtlı) ve K4 aracı sayıyı ekranın kendi
metninden okur (`web/arac/k4-enerji-su.mjs` → `docs/kanit/faz-b-k4/`).
Aynı koşu aracın kendi iki yanlış alarmını da ölçtü: risk adındaki
"yetkisiz" sözcüğü hata sayılıyordu; CSS `text-transform` yüzünden
"TANIMSIZ" (ı → I) düzenli ifadeye uymuyordu — hata bileşeninin kendi
metni (`403 · Yetkisiz`) ve `textContent` ile düzeltildi.

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
| `kurgusal-adlar` bekçisi | `web/prisma/kurgusal-adlar.ts` + `tests/bekci/kurgusal-adlar.test.ts` | Depoya gerçek bir KURULUŞ ya da ÜRÜN adı girmesini engeller. **Kara liste değil**: ad kaynağı tektir ve bekçi VERİTABANINA bakar (kaynak metnine değil — kusur "tohumda dize var" değil, "ekranda gerçek firma görünüyor"du). Meşru gerçek ad (entegrasyon hedefi · yayımlanmış CVE) `GERCEK_AD_BEYANLARI` içinde kaynağı ve gerekçesiyle **beyan edilir**; beyansız gerçek ad kırmızıdır. İstisnanın kendi dişleri: kullanılmayan beyan · kaynaksız beyan · kurgusal+gerçek adın aynı kayıtta karışması · kaynak referansı olmayan zafiyet · beyansız **adaptör hedefi** (`Adaptor.hedefUrunler`, abstract — yayımlanmış çıktı taranınca bulundu: bekçi veritabanına bakıyordu, adaptör metinleri veritabanından geçmez) |
| İnceleme #30 vakaları | `web/tests/inceleme-30.test.ts` | Bir inceleme turunun beş bulgusunun düzeltme kanıtı; hepsi sabotajla doğrulandı |
| `semaBekcisi` · `omurgaIhlalleri` · `sektorKolonlari` | `web/tests/bekci/semaBekcisi.ts` + `kapsam-omurga.test.ts` · `sema-sektorsuz.test.ts` | Şemayı OKUR, anlatılana bakmaz: omurga modelinde doğrudan `tesisId` (URN-KAP-001, izin listesi `kapsam-omurga-izin.json` yalnız küçülür, taban dal alt küme dişi) · paket anahtarı çekirdek modelde kolon (URN-KAP-002: enerji şemasının anahtarları + `KURULU_GUC` + `GUNLUK_DEBI`, model ve alan adlarında `terimleriBul`). Altı sabotaj vakası (S1–S6) kırmızı-yeşil kanıtlı |
| K3 göç eşitliği | `web/arac/goc-sayimi.mjs` → `arac/goc-sayimlari/*.json` + `tests/kapsam-ogesi-gocu.test.ts` | Göç öncesi/sonrası sayısal eşitlik dosyadan okunur (74 ortak anahtar, 25 tesis → 25 öğe: kurum 2 · tesis 23); tohum ile göç aynı kimlikleri/satırları yazıyor mu (`ko-` kuralı dört yerde, öznitelik şeması UNION bloğundan ayrıştırılır, kapasite rolü UPDATE'i) |
| K4 parite koşusu | `web/arac/k4-enerji-su.mjs` → `docs/kanit/faz-b-k4/OZET.md` | Sekiz demo ekranı iki mercekte; HTTP · gövde uzunluğu · hata metni (bileşenin kendi metni) · mercek sözcüğü · Tesis 360 profil alanı sayısı **ekranın metninden** (`textContent`). Canlı sunucu ister, kapı değildir; sonuç JPEG + OZET.md |
| `sektorProfiliOku` veri yolu | `web/tests/tesis360-sektor-profili.test.ts` | Beklenti şema TABLOSUNDAN ölçülür: kapasite dışı her satır alan olmalı, rolü NULL olanlar dahil (SQL `NOT rol = x` tuzağı). Yalnız kapasite beyan eden paket boş profil verir |
| NULL-olumsuzlama bekçisi | `web/tests/bekci/nullOlumsuzlama.ts` + `null-olumsuzlama.test.ts` + `null-olumsuzlama-izin.json` | SINIF kapısı (URN-VER-001): her `NOT:` · `not:` · `notIn:` · `isNot:` ve ham SQL `NOT IN`/`<>`/`!=` yüklemi, kapsayan Prisma çağrısından modele ve ilişki zincirinden alana çözülüp şemadaki null'lukla okunur. NULL'un kendisini olumsuzlayan, NOT NULL kolondaki ya da NULL'u aynı where içinde açıkça ele alan yüklem güvenli; kalanı gerekçeli listede yoksa kırmızı. Çağrı dışı süzgeç parçası (`const kutuk = { durum: { not } }`) `model` beyanı ister ve beyan şemaya karşı doğrulanır; tohum verisindeki Türkçe `not:` ve yorum/dize bulgu değildir (maskeleme). Ölçüm tabanı: dosya · çağrı · bulgu sıfır olamaz. Sabotaj: `NOT: { rol: 'kapasite' }` geri konunca kırmızı |

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
| **Sonraki ölçüm — Faz B dalı** (`claude/uyumplatformu05-kod-l8y12k`, PR açık) | `kapi:parti` **19 · KIRMIZI 0 · ÖLÇÜLMEDİ 0** · 169 dosya · 3 292 vaka · 1 atlandı · senaryo 296 / GAP 0 · terim 85/85 (`tavan` 11) · çekirdek sözcük 0 · K3 sayımlar eşit · K4 14 ölçüm / kırmızı 0 (enerji Tesis 360 20 alan, su 12). Yedi sabotaj (S1–S7) kırmızı→yeşil |
| **Sonraki ölçüm — NULL sınıfı + P4 dalı** (`claude/uyumplatformu05-kod-l8y12k`, `origin/main`'den yeniden kuruldu, PR açık; `98b50c6`) | `kapi:parti` **19 · KIRMIZI 0 · ÖLÇÜLMEDİ 0** · 174 dosya · 3 344 vaka · 1 atlandı · senaryo 302 / GAP 0 · ters kapsam 390 davranış / senaryosuz 0 · terim 85/85 · çekirdek sözcük 0 · şema sapması 0 · NULL-olumsuzlama 37 bulgu / beyan 3 / kusur 0 · iskelet paketler doğrulayıcı 0 hata (TR-ENERJI 601 madde · TR-BANKACILIK 58). Sabotaj S8 (NOT rol geri) · S9 (izin satırı + tavan) · S10 (iskelet dosyasında tek sözcük) kırmızı→yeşil |
| **Sonraki ölçüm — PR #41 incelemesi sonrası** (`bc71421`; `main` #37 ile birleştirildi, çakışma 0; CI iki iş success, PR "clean", açık inceleme iş parçacığı 0) | `kapi:parti` **19 · KIRMIZI 0 · ÖLÇÜLMEDİ 0** · 174 dosya · 3 356 vaka · 1 atlandı · senaryo 304 / GAP 0 · ters kapsam 390 davranış / senaryosuz 0 · şema sapması 0 · kalite borcu axe 0 / taşma 1 izinli (cırcır 0 eklenen) · NULL-olumsuzlama 645 dosya / 1 428 çağrı / 41 bulgu (güvenli 38 · beyan 3 · kusur 0; +4 yeni bulgu uzlaştırmanın `notIn`leri, NOT NULL kolon) · Codex 8 bulgu (4 P1 · 4 P2) düzeltildi, sabotaj S11–S18 her biri kırmızı→yeşil (56/56) |
| **Sonraki ölçüm — PR #41 incelemesi 2. tur sonrası** (`8ff0978`; açık inceleme iş parçacığı 0 / 15 çözüldü) | `kapi:parti` **19 · KIRMIZI 0 · ÖLÇÜLMEDİ 0** · 174 dosya · 3 363 vaka · 1 atlandı · senaryo 305 / GAP 0 · ters kapsam 390 davranış / senaryosuz 0 · şema sapması 0 · NULL-olumsuzlama 645 dosya / 1 429 çağrı / 41 bulgu (güvenli 38 · beyan 3 · kusur 0) · Codex 7 bulgu (2 P1 · 5 P2) düzeltildi: kurulu sürüm değişmez (URN-PKT-008), bağımlılık kararı transaction içinde, telifli `kanit_beklentisi` red, sektörsüz paket sözlük/öznitelik red, `seviye` 0–5, takvim tarihi, kapanmamış tırnak; sabotaj S19–S25 her biri kırmızı→yeşil (54/54) |
| **Sonraki ölçüm — P4 kalan dilimler 2.1–2.7 + R-A/R-B/R-C** (`claude/uyumplatformu05-kod-l8y12k`, `origin/main` `fdbf3b3` üzerinde, main ilerlemedi; `ölçülen `c31ee45``) | `kapi:parti` **19 · KIRMIZI 0 · ÖLÇÜLMEDİ 0** · 185 dosya · 3 430 vaka · 1 atlandı · senaryo 315 / GAP 0 · ters kapsam 392 davranış / senaryosuz 0 · şema sapması 0 (4 eklemeli göç; `MaddeEslestirmesi.aktif` için migrate diff RedefineTables üretti, elle ADD COLUMN yazıldı) · tohum artık `DEMO-TR-*` paketlerinden (köken sayımı: sözlük 18 · öznitelik 10 · regülasyon 4 · eşleme 8 hepsi `paket`; ölçülen kayıp ISO 27001 4 metin) · `/paketler` iki bant kanıtı 26/26 geçti (13 iddia × 2 bant, 1440×900 · 1024×768: taşma 0px · başlık · kalıcı kural cümlesi · 5 satır ve hâl sözleri · panelde engel nedeni · Kur açık/Kaldır engelli; ilk koşudaki 8 kırmızının dördü de BETİK kusuruydu — innerText CSS büyük harfini uyguluyordu, /TR-ENERJI/ deseni önce DEMO-TR-ENERJI satırına eşleşiyordu — ekran kusuru 0) · sabotaj S35–S79 (45 vaka) her biri kırmızı→yeşil (S61 ilk turda yeşil kaldı, bekçi penceresi düzeltildi) · R-B: şema/kiracı verisi/lisans PR'ı — bağımsız inceleme bekliyor |
| **Sonraki ölçüm — R-D alan eşlemesi + TR-ENERJI 0.3.0 + R5 PostgreSQL + P7 dağıtım + R3 yedek** (`claude/uyumplatformu05-kod-l8y12k`, PR #44; bağımsız inceleme İKİ TUR — tur 2 sonrası ölçüldü) | `kapi:parti` **TAM (hızlı + yavaş + postgresql + compose) · 24 kapı · KIRMIZI 0 · ÖLÇÜLMEDİ 0**; tek koşuda 22'si geçti, iki PostgreSQL kapısı **yerelde `postgres:16` sunucusu ayakta olmadığı için** kırmızı yandı (`connection refused`) ve sunucu kaldırılıp ADIYLA yeniden ölçüldü — kod kusuru değil ölçüm ortamı eksiğiydi, kural gereği "geçti" yazılmadan önce ölçüldü: göç 1/1 · şema farkı 0 · değişmezlik 9/9 · eksik nesne 0 tetikleyici / 0 indeks · temizlik doğrulandı. Tam küme **194 dosya · 3 528 geçti · 1 atlandı (3 529)**, İKİ SAĞLAYICIDA DA aynı sayı · senaryo 324 / GAP 0 · TR-ENERJI 0.3.0: 8 çerçeve / 3 803 madde, alan eşleme beyanı 8/8 (`paket:dogrula` çıktısı) · **compose kurulumunda rota duman 60/60 · kusur 0 · sayfa hatası 0 · readiness 2,5–4,4 sn · temizlik iki tanıkla doğrulandı**; aynı ölçüm CI'da `kapi-compose` işinde de yeşil · R3: SQLite tatbikatı KOŞTURULDU (yedek al → `prisma/dev.db` taşındı, `veri/kanit` silindi → geri yükle → `--karsilastir` SAĞLAM → tam küme geri yüklenen veritabanına karşı yeşil); tatbikat `main` birleştirmesinden (`353c1e7`) SONRA YENİDEN koşuldu — `--al` çıkış 0 · içerik özeti `2c0e42dd6da68991` · `--karsilastir` **SAĞLAM** (göç farkı 0 · iz farkı 0 · sahipsiz dosya 0) · tam küme **194 dosya · 3 528 vaka · 1 atlandı · çıkış 0**, ve AYNI ağaçta depo kökü YOKKEN `--al` çıkış **1** verip `KUSURLU` yazdı (`0 dosya` ile `ölçülemedi` ayrı yazıldı — tur 2 kuralı canlıda sınandı); kanıt dosyalı gidiş-dönüş sabotajla ölçüldü (dosyayı boz / sil → ikisi de ADIYLA yakalandı, çıkış 1; geri yüklenen dosyanın özeti kaynakla aynı); PostgreSQL yolu **inceleme tur 2'sinin `psql -R` bulgusundan SONRA yeniden ölçüldü** (158 tablo · 0,38 MB döküm · `bütünlük`/`yabancı anahtar kusuru` ölçülmedi diye yazılıyor). **Kapının kurulumda bulduğu beş kusur** (hiçbiri `next dev`de görünmüyordu): derleme anında veritabanı sorgusu · yutulan ön-render sinyali · oturumsuz detay rotasında 307 yerine 500 · `/sistem`in okuduğu dosya imajda yok · kiracı adı istemcide derleme sabiti (58 sayfada hidrasyon uyuşmazlığı). Bağımsız inceleme (R-B): tur 1 → 21 bulgu (4 P1 · 7 P2 · 10 P3), tur 2 → 15 bulgu (3 P1 · 4 P2 · 8 P3). Tur 2'nin P1'leri GERÇEKTİ ve ikisi bu turun kendi düzeltmeleriydi: `psql -R` son kaydı newline ile bitirdiği için PostgreSQL yedek yolu HİÇ koşmuyordu (sabotajla kanıtlandı) · yeni `yedek` birimi kapsayıcıda root'a aitti · kapının `--tut` çıktısı operatörün yığınını sildiren bir komut öneriyordu. Ertelenen tek kalem R0-15 (sahibi ve kapanış aşaması yazılı) |

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

