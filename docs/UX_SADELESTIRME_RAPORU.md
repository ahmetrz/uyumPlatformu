# Sadeleştirme ve etkileşim tasarımı programı — kapanış raporu

Bu program `docs/END_USER_UX_AUDIT.md` ve `docs/UX_KALITE_PROGRAMI_RAPORU.md`
ile kapanan programın **üstüne** biner. Orada kapanmış yirmi kusur
yeniden açılmadı; buranın sorusu başkaydı:

> Platformu günlük işinde kullanan bir son kullanıcı, ihtiyacı olan
> bilgiye ve aksiyona **hızlı, doğru ve yorulmadan** ulaşabiliyor mu?

Denetimin ayrıntısı `docs/UX_SIMPLIFICATION_AUDIT.md` içindedir. Bu belge
sonucu ve gerekçesini yazar.

## Bu programın kendine koyduğu ölçü

Program, kendi bulgularını doğrulamayı da işin parçası saydı. On sekiz
bulgu açıldı; **beşi düzeltmeye geçmeden önce geri çekildi** çünkü ekrana
bakınca ölçümün doğru, ARACIN SINIFLANDIRMASININ yanlış olduğu görüldü.

Bunu ayrıca yazmanın sebebi şu: olmayan bir kusuru "düzeltmek", olan bir
kusuru kaçırmak kadar pahalıdır. İkisi de raporu yalancı yapar. Geri
çekilen beş bulgunun listesi ve gerekçesi denetim belgesindedir; araçların
üçü de düzeltildi ve kör noktaları kendi başlıklarında yazılı.

---

## GENEL: GO

## Kapsam

| | |
| --- | --- |
| Denetlenen rota | 56 (50 kabuk rotası + 6 dinamik) |
| Ölçüm | 12 sayı × 56 rota, 1440×900 |
| Arketip | 6 (kayıt · kuyruk · matris · tuval · tezgâh · referans) |
| Yeni araç | 3 (`bilissel-yuk.mjs` · `eylem-dili.mjs` · `gorev-akisi.mjs`) + 1 kapı (`ters-kapsam.mjs`) |

## Bulgular

| Şiddet | Açılan | Kapanan | Geri çekilen | Açık |
| --- | ---: | ---: | ---: | ---: |
| P0 | 1 | 1 | 0 | **0** |
| P1 | 8 | 7 | 1 (kısmi) | **0** |
| P2 | 8 | 3 | 5 | **0** |
| P3 | 2 | 0 | 0 | **2** |
| **Toplam** | **19** | **11** | **6** | **2** |

Açılan sayısı 18 değil 19: denetim sırasında ölçümden değil **kaynağı
okumaktan** bir bulgu daha çıktı (SDL-0019 · aynı alana yazan iki form).

Açık kalan iki P3 bilinçlidir ve raporda öyle sayılır:

* **SDL-0007** `/api-sozlesmesi` — "Belgeyi göster" 966px'te. Referans
  arketipinde ikincil bir yardımcı; ekranın kendi işi katlamanın üstünde
  tamamlanıyor.
* **SDL-0018** `/sistem/bilesenler` — 2 090px'lik galeride atlama şeridi
  yok. Geliştirici/tasarımcı referansı; son kullanıcı yüzeyi değil.

## Ters kapsama — bu programın ilk kapısı

Yeniden tasarıma geçmeden önce **uygulama davranışı → senaryo** kapısı
kuruldu. Mevcut kapı senaryodan teste bakıyordu ve bir kör noktası vardı:
kimsenin senaryo YAZMADIĞI bir davranışı göremez, çünkü olmayan
senaryonun testi de yoktur.

İlk koşusu **56 boşluk** buldu: dokuz rota kütükte hiç yazılmamış, yirmi
bir sunucu eylemi ve beş motor hiçbir senaryo işaretli testte geçmiyor,
üç ekran yalnız mutlu yol senaryosu taşıyor.

| | |
| --- | --- |
| Envanterdeki kullanıcı davranışı | 387 |
| Eşlenen | 387 |
| **UNMAPPED USER BEHAVIOR** | **0** |
| Senaryo | 275 |
| Testli senaryo | 275 |
| **SCENARIO TEST GAP** | **0** |

## Önce / sonra — ölçülen

| Ekran | Ölçü | Önce | Sonra |
| --- | --- | ---: | ---: |
| `/bulgular/[id]` | ilk birincil eylem | 1 098px | **390px** |
| `/bulgular/[id]` | ana yüzeyde kanıt/geçmiş | 362px | **0** |
| `/bulgular/[id]` | görünür etiket | 21 | **15** |
| `/bulgular/[id]` | görünür metin | 2 025 | **1 406** |
| `/topoloji` | iş yüzeyi | 871px | **467px** |
| `/topoloji` | ilk eylem | 912px | **509px** |
| `/topoloji` | görünür metin | 1 893 | **1 098** |
| `/tesisler/[id]` | ilk sonraki-adım bağı | yok | **230px** |
| `/portfoy` | görünür etiket | 53 | **8** |
| `/dokumanlar` | iş yüzeyi | 754px | **674px** |
| Platform | cevapsız bozuk durum bloğu | 50 | **0** |
| Platform | son kullanıcı yüzeyinde sistem dili | 0 | **0** |
| Platform | gerekçesiz tekrar eden etiket→değer çifti | 0 | **0** |

Yukarıdaki `bilissel-yuk.mjs` ölçümleri tek bantta (1440×900) ve
denetimin başındaki kayıtlar üzerinde alındı.

**Beş bantta kare seti: `docs/sadelestirme-2026-09/`.** Önce ve sonra
YAN YANA koşturuldu: dalın tabanı (`4cde36f`) ayrı bir çalışma ağacında
3211'de, dalın HEAD'i 3210'da, aynı tohum veritabanının kopyasıyla. Tek
değişken kodun kendisidir. Beş bant (1440×900 · 1366×768 · 1024 · 768 ·
375) × beş ekran; künye, seçilen kaydın niçin seçildiği ve bant bant
ölçüm o klasördeki `KUNYE.md` içindedir.

`/bulgular/[id]` beş bantta gövde metni **2 990 → 2 381** (1440),
**2 795 → 2 287** (375). 375'te sayfa boyu bilerek arttı: kapanış şeridi
telefonda alt alta dizilir ve cevabı tek bakışta verir; eskiden aynı
cevap dört ayrı yerden toplanıyordu.

## Ne değişti

**`/bulgular/[id]` — programın P0'ı.** Ekranın birincil işi "bu bulgunun
kapanması için ne eksik?" sorusuydu ve ekran cevabı hiçbir yerde tek
parça söylemiyordu. `lib/uyum/kapanisYolu.ts` cevabı hesaplıyor; ana
kolonda beş adımlı bir **navigatör** var (her adım o adımın işine
götürür), sıradaki iş görev dilinde tek cümle ve birincil eylem onunla
aynı satırda. Zaman ekseni denetim izi sekmesine indi. Kayıt açılınca
düzenleme formu gelmiyor.

Kural İKİ YERDE YAZILMADI: kapanış kararı için sunucu kapısının kendisi
çağrılıyor ve bir test ikisini yan yana koşturarak ayrışmayı imkânsız
kılıyor. Ekranın "kapanışa hazır" deyip sunucunun reddetmesi, kullanıcının
güvenini bir kez kaybettiren kusurdur.

**Aynı ekranda bir çelişki de kapandı.** Kök nedene yazan İKİ form vardı;
ikincisi kategori istemeden, asgari uzunluk aramadan, imza bırakmadan
yazıyordu — yani kapanış kapısının reddettiği hâli tam olarak o
üretebiliyordu. Kullanıcı kaydediyor, ekran kaydediyor, kapı yine "analiz
yok" diyordu.

**Boş ekranın son cümlesi.** Bozuk durum bloğunun cümlesi, boş bir
ekranda ekranın TEK içeriğidir. Ürün "ne oldu" sorusunu iyi
cevaplıyordu, "şimdi ne yapabilirim" sorusunu elli yerde hiç
cevaplamıyordu. Otuz sekizine sonraki adım eklendi, on ikisi "beklenen
durum" olarak işaretlendi ("elenen satır yok — hepsi doğrulamayı geçti").
İkincisi bir kaçış kapısı değil: ekranda ayrı çizilir ve yanlış yerde
kullanılırsa ölçülmemiş bir boşluk "her şey yolunda" diye okunur — bu
ürünün en sevmediği kusur.

**Tekrar.** `/portfoy` "Uyum · Bulgu · Risk" üçlüsünü on altı plakada
yeniden yazıyordu: 48 görünür etiket, hepsi aynı üç sözcük. Kaş kolon
başlığı olarak bir kez yukarı çıktı; sayılar `aria-label` ile kendi adını
taşımaya devam ediyor, ekran okuyucu hiçbir şey kaybetmedi.

**Hareket.** Üç süre token'ı ve bir eğri tanımlandı; ürün `.15s`, `.18s`,
`400ms`, `.5s` gibi dağınık değerler kullanıyordu ve aynı jest iki
ekranda iki farklı hızda oluyordu. Çekmeceye kısa bir giriş kayması
eklendi — yüzey değiştiren bir şey nereden geldiğini göstermeli.
`prefers-reduced-motion` altında hepsi sıfırlanır.

## İş kuralları — bozulmadı

RBAC, kapsam, değişmez denetim izi, dört göz, onay, motor kuralları,
connector dürüstlüğü, bilinmeyen semantiği, köken ve migrasyonlar
korundu. Yeniden tasarım hiçbir iş kuralını gevşetmedi; tersine bir
çelişkiyi (iki yoldan yazılan kök neden) kapattı.

Yeni yazılan 45 senaryonun çoğu MUTLU YOL DEĞİL: bir eylemin en pahalı
kusuru, reddetmesi gereken şeyi kabul etmesidir.

## Kapılar

Bütün kapılar bu dalın HEAD'inde koşuldu.

Vitest ve derleme satırları **CI'da**, taze `migrate deploy` + `seed.ts`
üzerinde de koşuldu (bkz. "CI, yerelde göremediğim bir kusuru buldu").
Tarayıcı isteyen kapılar yerel sunucuda koşulur; onlar için ölçüm ortamı
geliştirme veritabanıdır.

| Kapı | Sonuç |
| --- | --- |
| eslint (`--max-warnings=0`) | temiz |
| `tsc --noEmit` | temiz |
| vitest | **2 909 vaka · 139 dosya · 0 kırık** (1 bilerek atlanan) |
| ters kapsama (`ters:kapsam`) | **387/387 · senaryosuz davranış 0** |
| senaryo → test (`senaryo-belge`) | **275 senaryo · 275 testli · GAP 0 · hayalet 0** |
| bozuk durum ve dil (`tasarim:dil`) | **cevapsız blok 0 · sistem dili 0** |
| tasarım kapısı (kontrast · font · eski iz) | **ESKİ TASARIM İZİ 0** |
| rota duman | **58/58 rota · kusurlu 0 · sayfa hatası 0** |
| gezinme (7 bant) | **kusur 0** |
| yatay taşma | **100 ölçüm · 0 kusur** |
| dizüstü kapısı | **50 rota · kırpılan öğe 0** |
| UX denetimi (9 bant × 50 rota) | **450 ölçüm · 0 kusurlu** |
| çekmece erişimi | **10 çekmece · 0 kusurlu** |
| axe (wcag2a + wcag2aa) | **51 rota · ciddi/kritik 0 · diğer 0** |
| klavye erişimi | **50 rota · kusur 0** |
| görev akışı (20 görev) | **ÇIKMAZ 0 · ort. 1,0 tıklama · ort. 0,2 sayfa geçişi** |
| üretim derlemesi (`next build`) | temiz |
| demo derlemesi (`demo:build`) | **10 rota statik · 147 sayfa kolon hizası temiz** |
| sabotaj | **24 sabotaj · yakalanan 24 · kaçırılan 0 · geri yükleme bozuk 0** |
| çakışma imi taraması | **0** |
| sır taraması (fark üzerinde) | **0** — gerçek uç/anahtar/token eklenmedi |

## Sabotaj kapısı bu programın kendi kapılarını denedi

Yeni bir kapı, kırılmadığı sürece bir kapı değildir. Bu programın kurduğu
üç kapı (`ters-kapsam`, `tasarim:dil`, `kapanisYolu`) sabotaj kütüğüne
eklendi ve **ilk koşuda ikisi KAÇIRILDI.** İkisi de gerçek zayıflıktı.

**1 · Ters kapsama kütüğü değil, dizini okuyordu.** `kutuguOku()`
`lib/senaryo/` altındaki bütün `.ts` dosyalarını tarıyordu. Kütükten
`...KAPSAMA_SENARYOLARI` düştüğünde 45 senaryo ÜRÜNDEN çıkıyor, dosya
diskte durduğu için araç hiçbir şey olmamış gibi "SENARYOSUZ DAVRANIŞ 0"
diyordu. Aynı kör nokta, kütüğe hiç bağlanmamış bir senaryo dosyasını da
kapsama sayardı. Araç artık `kutuk.ts` içinde `SENARYOLAR` dizisine
GERÇEKTEN serpilen sabitleri ve onların geldiği modülleri çözüyor; yalnız
o dosyaları tarıyor. Sayılar değişmedi (387/387), kapının dayanağı
değişti.

**2 · Kapanış yolu testi yanlış yere bakıyordu.** İddia `sonraki`
üzerindeydi: "ekran sıradaki iş kapanış derse sunucu kapısı da açıktır."
Ama `kapanisKapisi` çağrısını `{ ok: true }` ile değiştirmek `sonraki`yi
DEĞİŞTİRMİYOR — ondan önce eksik bir adım varsa `sonraki` o adımı
gösterir. Değişen şey kapanış ADIMININ kendisiydi: şeritte "Bulgu
kapanışa hazır; kaydı kapatın" cümlesi ve birincil düğme belirir,
kullanıcı basar, sunucu reddeder. Tam olarak önlemek için yazdığım kusur,
testimin baktığı yerin bir adım yanındaydı.

İddia kapanış adımının kendisine taşındı ve altı elle seçilmiş hâl yerine
**2 880 hâllik çarpım** dolaşılıyor (durum × önem × tekrar × altı analiz
hâli × dört aksiyon dağılımı × beş doğrulama kombinasyonu). Çarpımın
sessizce daralmasına ve "hazır" hâli hiç üretmemesine karşı iki alt sınır
testi var.

İkisi düzeltildikten sonra: **23 sabotaj · yakalanan 23 · kaçırılan 0.**

Buradaki ders raporun geri kalanı için de geçerlidir: bir ölçüm aracının
yeşil olması, ölçtüğü şeyin doğru olduğunu göstermez. Aracı da kırmak
gerekir.

## CI, yerelde göremediğim bir kusuru buldu

PR açıldıktan sonra CI kırmızı döndü. Kırılan test **bu programın
yazdığı** testlerden biriydi: `ters-kapsam-eylem.test.ts` →
`firmware istisnası uyum DURUMUNU değiştirmez [ENV-FRM-010]`.

Test şöyle başlıyordu:

```ts
const uyum = await db.firmwareUyumu.findFirstOrThrow();
```

Bu bir iddia değil, sessiz bir **varsayımdı**: "veritabanında bir
firmware uyum kaydı vardır." `FirmwareUyumu` ise TÜRETİLMİŞ veridir —
`firmwareUyumunuIsle` motoru üretir, seed yazmaz. Geliştirme
veritabanımda motor aylar önce koşmuş ve 347 kayıt bırakmıştı; test
yerelde yeşildi. CI ise her koşuda `migrate deploy` + taze `seed.ts`
ile başlıyor ve o tablo boş; test P2025 ile kırıldı.

**Yerel yeşil, CI yeşili değildir.** Raporun "kapılar bu dalın HEAD'inde
koşuldu" cümlesi doğruydu ama eksikti: kapılar benim geliştirme
veritabanımda koşulmuştu ve o veritabanı, ürünün taze kurulumundan
farklıdır. Bu farkı ölçmediğim için raporda vitest'i yeşil yazdım.

Düzeltme testin girdisini kendi eline verdi: kayıt önce silinip yeniden
kuruluyor, böylece test her ortamda AYNI yolu koşuyor. Durum bilerek
`eski` seçildi — `taban_yok` bir kayıtta "durum değişmedi" demek ucuzdur;
pahalı kusur, eski firmware'li bir cihazın istisna kaydedildikten sonra
uyumlu görünmesidir.

Ayrım önemli: depodaki öbür yirmi dört koşulsuz `findFirstOrThrow()`
çağrısı tesis, kullanıcı, madde gibi **seed'in yazdığı** tablolara bakar
ve taze veritabanında da doludur; hepsi CI'da geçti. Kusur "koşulsuz ilk
kaydı al" deseninde değil, türetilmiş bir tabloyu seed sanmaktaydı.

Kural artık bir sabotajla korunuyor (24'üncü): `firmwareIstisnasiKaydet`
eylemine `durum: 'uyumlu'` eklendiğinde test kırmızı olur. İstisna
"biliniyor ve kabul edildi" der; "artık uyumlu" DEMEZ — aksi hâlde risk
raporu gerçekte yamalanmamış bir filoyu temiz gösterirdi.

## Görev akışı — ölçülen

Yirmi gerçek görev baştan sona koşuldu.

| Ölçü | Sonuç |
| --- | --- |
| Görev | 20 |
| Çıkmaz | **0** |
| Ortalama tıklama | **1,0** |
| Ortalama sayfa geçişi | **0,2** |
| En uzun görev | TASK-002 · 3 tıklama · 1 geçiş (bulgu → kayıt → sıradaki iş) |

Hedef "0–1 gezinme + 1–3 etkileşim" idi; ölçüm bunun içinde kaldı.

**Aracın ilk koşusu dört ÇIKMAZ raporladı ve dördü de yanlıştı.** Üçü
görev tanımımın hatasıydı (`/bulgular` satırı çekmece açar, kayıt sayfası
"Kaydı aç" ile gelir; `/yardim` bir okuma ekranı, katlanır bölüm taşımaz;
`/dokumanlar` bağı çekmeceye götürür), biri yanlış hedef seçicisiydi.
Düzeltildi. Yanlış bir çıkmaz raporlamak, gerçek bir çıkmazı kaçırmak
kadar zararlıdır: ikisi de aracın söylediğine güveni bitirir.

## Ne YAPILMADI

* **Görsel yeniden tasarım yapılmadı.** Premium koyu endüstriyel dil
  korundu; generic SaaS kart ızgarası eklenmedi, kart sayısı artırılarak
  hiçbir sorun çözülmedi.
* **Hiçbir iş kuralı gevşetilmedi.** RBAC, kapsam, dört göz, denetim izi,
  köken ve bilinmeyen semantiği aynen duruyor.
* **Hiçbir kurum sistemine bağlanılmadı**, gerçek uç/anahtar/token
  uydurulmadı, şirket içi veri kullanılmadı. Bütün veri seed.
* **`main` dalına merge EDİLMEDİ.**

## SON KARAR: GO

P0 = 0 · P1 = 0 · P2 = 0 · unmapped davranış = 0 · testsiz senaryo = 0 ·
çıkmaz görev = 0.

Açık kalan iki madde P3'tür, ikisi de referans ekranındadır ve raporda
açık olarak sayılmıştır.
