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
| Senaryo | 277 |
| Testli senaryo | 277 |
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

Yeni yazılan 47 senaryonun çoğu MUTLU YOL DEĞİL: bir eylemin en pahalı
kusuru, reddetmesi gereken şeyi kabul etmesidir.

## Kapılar
