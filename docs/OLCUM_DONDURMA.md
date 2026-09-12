# Ölçüm dondurma kaydı

**12 Eylül 2026 · Brief M — ölçüm tarafındaki SON planlı PR.**

Bu belge, ölçüm ve alet tarafında bugün NE ölçüldüğünü, NEyin bilerek
ölçülmediğini ve buradan sonra yeni işin hangi koşulla açılacağını yazar.
İçindeki her sayı bir araçtan TÜRETİLMİŞTİR; hiçbiri elle yazılmadı.

Neden bir dondurma kaydı: bu depo beş turda payda körlüğünü beş kez
ölçtü (politika evreni 131 → 184 → 213 → 215 → 216 → 220) ve her tur
aleti biraz daha büyüttü. Alet büyümesinin kendisi bir başarı ölçüsü
değildir; bir noktada ürün yerine ölçüm aleti geliştirilmeye başlanır.
Sınır burada çizildi.

---

## (a) ÖLÇÜLEN

| Kütük | Satır | Mekanizma | İkinci tanık |
| --- | --- | --- | --- |
| `web/arac/politika-cumleleri.json` | **220** · POLITIKA **213** (S1 82 · S2 63 · S3 68) · `IDDIA_DEGIL` 7 · **ölçülmeyen 0** | kaynak türetici (`politika-kutugu.mjs`) — dize tarayıcısı + JSX metni | DOM tanığı: kütüğün **35/220**'ini (%15,9) render edilmiş ekranda görüyor |
| `web/arac/bos-durumlar.json` | **125** · iki ölçütü karşılayan **124** · nedensiz **1** (beyanlı hesaplanan cümle) · **eylemsiz 0** · iyi haber 17 | kaynak türetici (`bos-durum-kutugu.mjs`) — üç yüzey, **dal başına** ölçüm | DOM tanığı: tohumlu koşumda 16, **boş kurulumda 51** boş durum |
| `web/arac/dom-tanik.json` (tohumlu) | 65 rota · atlanan **0** · 43 cümle · 16 boş durum · taranan veri yüzeyi **56** · cümlesiz **0** | gerçek tarayıcı, kaynağı HİÇ OKUMAZ | kaynak türeticisinin kendisi |
| `web/arac/dom-tanik-bos.json` (boş kurulum) | 65 rota · atlanan **6** (tavanlı) · 37 cümle · 51 boş durum · taranan veri yüzeyi **17** · **sıfır satırlı yüzey 0** · cümlesiz **0** · öncül `Kullanici 1 · Tesis 0 · Madde 0` | aynı tanık, KENDİ kurduğu boş veritabanı + kendi kurucu hesabı + kendi sunucusu; "veritabanı boş" öncülü ÖLÇÜLÜR ve kütüğe yazılır | — |
| `web/arac/dom-tanik-kutugu.json` | **8** satır (çalışma anında birleşen cümleler) · ölçümsüz tavanı **0** | elle sınıflanmış, ölçümü adıyla beyanlı | kütükte olmayan cümle kırmızı, kodda olmayan satır da kırmızı |

**Ölçüm tabanları** (`web/arac/olcum-tabani.json`) — her biri yalnız
`--taban-yaz --sebep="…"` ile ve gerekçesi DOSYAYA işlenerek iner:

```
duman.rota 58 · gezinme.bant 7 · tasma.olcum 144 · axe.tarama 216
bos.durum 125 · politika.cumle 220
tanik.rota 65 · tanik.cumle 43 · tanik.bosDurum 16
tanik.veriYuzeyi 17 · tanik.kapsam 35
```

İki mekanizmanın AYRIŞMASI kırmızıdır ve iki yönde de ölçülür: tanığın
ekranda görüp kütükte bulamadığı cümle de, kütükte olup kodda karşılığı
kalmayan satır da (`web/tests/bekci/dom-tanik.test.ts`, URN-TNK-001).

---

## (b) BEYANLI ÖLÇÜLMEYEN

Aşağıdakiler ölçülmüyor ve bu bir eksiklik değil, **yazılı bir karardır**.
Her birinin sahibi, gerekçesi ve BÜYÜYEMEYEN bir tavanı var.

### 1 · R0-23 · çekimli özne sınırı

| | |
| --- | --- |
| **Ne ölçülmüyor** | Özneleri çekim ekiyle yazan politika cümleleri ("kütüğün…", "kaydı…", "ürünün…"). `OZNE` kalıbı özneyi YALIN hâliyle arar. |
| **Ölçülen büyüklük** | Sınırın TAMAMI **357** aday (`korToplamSayisi()`: yüklemi olup YALIN öznesi olmayan). Bunun **51**'i bilinen bir gövdenin çekimli hâlini taşır (`korGovdeSayisi()`) — yani `OZNE`yi gövdeye çevirmenin fiyatı 51, sınırın kendisi 357. Sayı **382'den 357'ye İNDİ** (inceleme bulgusu): aday süzgeci `politikaMi()` ile aynı değildi — "en az dört sözcük" ve "JSX/biçem parçası değil" dişleri yoktu, bu yüzden sınıra bir ithal yolu, bir JSX parçası ve kısa dizeler giriyordu. Bir ithal adının değişmesi dondurulmuş sınırı oynatıyordu; tavan bir MAYINDI. |
| **Neden kapatılmadı** | Kalıbı gövdeye çevirmek 51 satırlık yeni bir borç açar; bu kütüğün yedinci dişi SIFIRDA KİLİTLİ, yani her satır gerçek yol ölçümüyle gelmek zorunda. Yüz satırı bir turda aceleyle ölçmek, bu deponun kaçındığı şeyin ta kendisidir. |
| **Tavan** | `politika-cumleleri.json` → `tavanlar.korToplam = 357` **ve** `tavanlar.korGovde = 51`. İkisi de **büyüyemez**: türeticinin görmediği yeni bir politika adayı kapıyı kırmızı yakar. İlk yazım yalnız 51'i donduruyordu — bağımsız inceleme sınırın sekizde birinin dondurulduğunu ölçtü (P2-14) ve tavan sınırın tamamına genişletildi. |
| **İkinci bekçi** | DOM tanığı — çekimli özneli bir cümle gerçekten ekrana çıkıyorsa tanık onu görür ve kütükte bulamayınca kırmızı yanar. |
| **Sahip / kapanış** | KODLAYAN / P3 · mesaj kataloğu (arayüz metni sözlük anahtarına geçtiğinde tarama metinden ANAHTARA döner ve gövde sorunu ortadan kalkar) |

### 2 · Tanığın ulaşamadığı kütük satırları

Tanık kütüğün **35/220**'ini görüyor. Kalan **185** satır kategorilere
ayrılmıştır ve kategori KODDAN türetilir (`erisimKategorisi`) — elle
işaretlenmez. Üçü birlikte ulaşılamayanların TAMAMINI kaplamak zorundadır;
dördüncü bir hâl doğarsa toplam tutmaz ve kapı kırmızı yanar.

| Kategori | Satır | Ne demek |
| --- | --- | --- |
| `acilista-yok` | **153** | Rota gezildi ama cümle AÇILIŞ hâlinde yok: çekmece, sekme, form ya da koşullu bir durumun arkasında. Tanık etkileşim sürmüyor. |
| `sunucu-eylemi` | **32** | Sunucu eyleminin ret gerekçesi (`lib/**`): ilk DOM'da hiç bulunmaz, ancak kullanıcı bir işlem denediğinde görünür. |
| `rota-gezilmedi` | **0** | Rota hiç gezilmedi. |
| `siniflanmadi` | **0** | **Sıfır olmak ZORUNDA.** Kural sınıflayamadığı satıra `null` döner ve kapı kırmızı yanar. |

> İlk yazımda `rota-gezilmedi` **2** görünüyordu ve ikisi de YANLIŞ etiketti:
> kural şablon yolu (`/uyum/[cerceve]`) üretiyor, gezilen liste somut yolu
> (`/uyum/CBDDO`) tutuyordu ve dinamik rotalı hiçbir satır eşleşemiyordu.
> Bağımsız inceleme ölçtü (P2-6); eşleme segment segment yapıldı.
>
> Bölüntü dişi de ilk yazımda **tautolojiydi** (P2-5): kural sonunda
> koşulsuz bir varsayılan döndürdüğü için "toplam tutuyor mu" sorusu
> hiçbir girdide yanlış olamıyordu. Varsayılan kaldırıldı.

**Tavan:** kütük BÜYÜMEDİYSE oran düşemez; kütük BÜYÜDÜYSE tanığın
gördüğü SATIR SAYISI düşemez. Ayrım bağımsız incelemenin ölçümüyle
kondu (P2-8): tek koşullu "oran hiç düşemez" kuralı bir kapı değil bir
MAYINDI — kütüğün %84'ü zaten açılışta görünmediği için tanığın
göremediği SIRADAN bir cümle eklemek her temiz dalı kırmızı yakardı ve
tek çıkışlar cümleyi yanlış yere taşımak, payı yapay büyütmek ya da
cırcırı gevşetmekti. İkisi de türetilmiş; uydurulmuş tolerans katsayısı
yok.
**Sahip:** KODLAYAN. **Kapanış:** bir müşteri ihtiyacı doğurursa.

### 3 · Cümlesiz boş yüzey dişinin popülasyonu BUGÜN SIFIR

| | |
| --- | --- |
| **Ne ölçülmüyor** | Hiçbir şey ölçülmüyor değil — ama dişin baktığı **sıfır satırlı yüzey sayısı boş kurulumda 0**. Sebebi ürünün lehine: altı çağıranın altısı da tablodan ÖNCE kendi boş durumunu çiziyor, yani paylaşılan tablo boş kurulumda hiç render edilmiyor. |
| **Ölçülen büyüklük** | sıfır satırlı yüzey **0** (`dom-tanik-kutugu.json` → `beyan.bosYuzey`, gerekçesiyle) · taranan veri yüzeyi **17** (`tanik.veriYuzeyi` tabanı) |
| **Neden ayrı yazılıyor** | İlk yazımda diş tek bir sayıya (`veriYuzeyi`) taban koyuyordu ve bu YANILTICIYDI: bütün tablolar dolsa bile gezinme listeleri sayesinde o sayı yerinde kalır, diş hiçbir boş yüzeye BAKMAMIŞ olur ve kapı yine "0 kusur" derdi (bağımsız inceleme · P2-1). Bugün iki sayı da ölçülür: taranan yüzey bir TABAN, sıfır satırlı yüzey bir BEYAN taşır. Sıfır bir taban olamaz — deponun kendi kuralı "sıfır ölçüm bir ölçüm değildir" der ve `olcum-tabani.json` bunu bir kapıyla zorluyor; ölçüldü, taban olarak yazma denemesi kırmızı yandı. |
| **Sınır** | Dişin bugün koruduğu şey bir SAYI değil bir SÖZLEŞMEDİR: yarın bir çağıran tabloyu cümlesiz boş bırakırsa işaret basılır, popülasyon 0'dan 1'e çıkar ve cümlesiz tavanı (0) kırmızı yanar. Sabotajla ölçüldü. **Yargı kapsam başınadır** (Codex turu): aynı bölümü paylaşan iki boş yüzeyden birinin cümlesi öbürünü AKLAMAZ — kapsamdaki görünür cümle sayısı boş yüzey sayısından azsa fark kadar yüzey cümlesizdir; S-M8 ile ölçüldü. **Sıfır popülasyonun kendisi de savunulur:** sıfır popülasyonlu bir eşitlik, toplayıcı TAMAMEN BOZUKKEN de geçer ve ikisi dışarıdan aynı görünür. Bu yüzden toplayıcı ürünün DIŞINDA, bilinen bir sentetik sayfada da koşar (dört kart: cümleli yüzey · cümlesiz yüzey · cümlesiz işaret · cümlesiz BOŞ LİSTE) ve sonucu **4/4/3** olarak kütüğe yazar; beklenen sayı araçta değil KAPIDA sabittir. Ürün hiç değişmeden bu sayı düşerse diş ölmüştür. |
| **Sahip / kapanış** | KODLAYAN / bir müşteri ihtiyacı doğurursa |

### 4 · `kapi-compose` yerel ölçümü

| | |
| --- | --- |
| **Ne ölçülmüyor** | Compose kurulumunun rota duman testi, geliştirme kum havuzunda. |
| **Sebep** | Kum havuzunda `dockerd` koşmuyor (`Cannot connect to the Docker daemon`). Ortam engeli; etrafından DOLAŞILMADI. |
| **Otorite** | **CI.** Kapı `pr-kapisi.yml` içinde koşar ve orada yeşildir. |
| **Tavan** | Yerel parti bunu "geçti" diye YAZMAZ, "ÖLÇÜLMEDİ" diye yazar ve parti kapanışı kırmızı olur. |
| **Sahip / kapanış** | Gözden geçirenin kararı — `dockerd` kapsam dışı. |

### 5 · Kapının ölçtüğü şeyin sınırı (R-D · R-F · R-G ile aynı, kabul edilmiş)

Kapılar **beyanın VARLIĞINI** ölçer, **DOĞRULUĞUNU** değil:

- paket alan eşlemesi bir beyan taşıyor mu (anlamı doğru mu — değil),
- politika cümlesinin bir ölçümü var mı (ölçüm iddiayı gerçekten sınıyor
  mu — değil),
- boş durum bir şey söylüyor mu (söylediği doğru mu — değil).

Doğruluk **bağımsız incelemenin** işidir; "kapı yeşil" onu doğrulanmış
saymaz. Sınır `docs/SEKTOR_PAKETI_SOZLESMESI.md` §1.10'da da yazılıdır.

---

## (c) DONDURMA KURALI

**Ölçüm ve alet tarafında yeni iş, bir MÜŞTERİ ihtiyacı ya da bir ÜRÜN
kusuru göstermeden açılmaz.**

1. **Yeni bekçi, yeni kütük, yeni tanık İCAT EDİLMEZ.** Var olanlar
   (`politika-cumleleri` · `bos-durumlar` · `dom-tanik` · `dom-tanik-bos`
   · `dom-tanik-kutugu` · `olcum-tabani` · `kalite-borcu`) yeter.
2. **İnceleme turlarının ALETİ ölçen bulguları R0 kütüğüne kaydedilir, o
   turda eritilmez.** Bir bulgunun "gerçek" olması, onu şimdi kapatmayı
   gerektirmez; gerektiren şey bir müşteri yolunun tıkanmasıdır.
3. **Bir ürün kusuru gösteren bulgu bu kuralın dışındadır** ve normal
   yoldan düzeltilir — Brief M'de `/envanter`'in sebepsiz boş durumu
   böyle kapandı.
4. **Tavanlar ve tabanlar yalnız bu belgedeki koşullarla değişir:**
   taban ancak ölçümle ve dosyaya yazılan gerekçeyle iner, tavan
   `tavanGerekceleri` altında `eski → yeni` adıyla anlatılan bir
   gerekçeyle yükselir. Commit mesajı yetmez.
5. **Bu belge bir muafiyet defteri değildir.** (b)'deki her kalem bir
   kapıya bağlıdır; hiçbiri "bakmıyoruz" demez, hepsi "şu kadarını
   görmüyoruz ve o sayı büyüyemez" der.

---

## Sınırın kendisi de ölçülür

Dondurma kaydının en kolay bozulma biçimi, (b) listesinin sessizce
uzamasıdır. Bu yüzden listedeki üç sayısal kalemin üçü de bir kapıya
bağlı ve üçü de sabotajla kanıtlandı:

| Kalem | Kapı | Sabotaj |
| --- | --- | --- |
| R0-23 · sınır 357 (alt küme 51) | `tests/bekci/politika-olcumu.test.ts` | çekimli özneli cümle eklendi → 51 → 52 → kırmızı; sınırın tamamı da ayrı tavanlı |
| Tanık kapsamı %15,9 | `tests/bekci/dom-tanik.test.ts` | tanık cümlelerinin yarısı düşürüldü → dört diş birden kırmızı |
| Cümlesiz boş yüzey 0 | `tests/bekci/dom-tanik.test.ts` | bir ekranın boş durumu kaldırıldı → tanık yüzeyi gördü → kırmızı |
| Cümlesiz boş yüzey 0 · **kapsam paylaşan ikinci yüzey** | `tests/bekci/dom-tanik.test.ts` | S-M8: bir `.ab-kart` içine `BosIlk` + İKİ boş tablo kondu → YENİ ölçütte sıfır satırlı 2 · cümlesiz 1 · iki diş birden kırmızı (tavan VE popülasyon beyanı); AYNI girdide ESKİ ölçüt (kapsamda bir cümle varsa hepsi aklanır) cümlesiz **0** verip sessiz yeşil kalıyordu |
| Kategori bölüntüsü · siniflanmadi 0 | `tests/bekci/dom-tanik.test.ts` | kurala varsayılan dal geri kondu → tautoloji; kaldırıldı, sınıflanamayan satır artık `null` döner ve kapı yanar |
| Boş kurulum öncülü | `tests/bekci/dom-tanik.test.ts` | `Kullanici 1 · Tesis 0 · Madde 0` ölçülüyor; tohumlu bir veritabanı ölçülürse kapı yanar |
| Tanık kapsamı · **kimlik, kütüğün boyundan bağımsız** | `tests/bekci/dom-tanik.test.ts` | S-M12: tanıktan görülen 1 cümle + kütükten görülmeyen 7 satır düşürüldü → oran %15,9'dan **%16,0'a YÜKSELDİ** (oran dişi geçiyor) ama kimlik dişi **kırmızı**; aynı girdide ESKİ kod (kimlik yalnız büyüme dalında) **geçiyordu** |
| Atlanan rota tavanı 6 · **doğduğu turda da gerekçeli** | `tests/bekci/dom-tanik.test.ts` | S-M11 (tavan 6 → 7) **YAKMADI** — sebebi yapısal: tavan bu dalda DOĞDU, taban dalda karşılaştırılacak bir şey yok; bir tavanın doğduğu tur onu istediği yere koyabileceğin tek turdur. İkinci diş eklendi (taban dalda olmayan tavan GEREKÇE ister) ve S-M11b (gerekçe silindi) **kırmızı** |
| **Dişin CANLILIĞI** · pozitif kontrol 4/4/3 | `tests/bekci/dom-tanik.test.ts` | S-M9: işaret taraması körleştirildi → sentetik sayfada 4/4/3 → **3/3/2** → kırmızı (ürün hiç değişmedi). S-M10: sıfır satırlı yol için yükseklik koşulu geri kondu → **YAKMADI**, çünkü fikstürün üç kartı da `<thead>` taşıyordu; bu bir BULGUDUR ve fikstürün kusuruydu — boş bir `<ul>` taşıyan dördüncü kart eklendi, S-M10b **kırmızı** |

Dördüncü kalem (`kapi-compose`) yerelde ölçülemediği için sabotajı da
yerelde koşulamaz; otoritesi CI'dır ve orada yeşildir.
