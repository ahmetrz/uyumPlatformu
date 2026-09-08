# Jeotermal sinematik giriş

İlk ziyaret, aynı jeotermal tesis içinde tek bir fiziksel hedefe doğru ilerleyen dört kareli bir kamera yoludur: uzak tesis → boru koridoru → cam kontrol binası → ana operatör ekranı → gerçek uygulama.

## Görsel yöntem

Kullanıcının sağladığı dört fotogerçekçi kare içerikleri yeniden çizilmeden web için optimize edilir ve `public/gorseller/giris/` altında tutulur:

1. `sahne-01-uzak.webp` — tesisin uzak genel görünüşü,
2. `sahne-02-yaklasma.webp` — borular arasından kontrol binasına yaklaşma,
3. `sahne-03-bina.webp` — aynı cam binanın ön cephesi,
4. `sahne-04-ekran.webp` — aynı kontrol odasındaki ana ekran.

Bu sürümde fotoğraf yolu bir fallback değildir; ana sinematik motordur. Her kare bağımsız bir slayt gibi değil, kendi görsel hedefi çevresinde büyütülür. Büyütme ilerledikçe hedef ortak kamera eksenine kilitlenir. Komşu kareler yalnız kısa ve kontrollü bir bantta birlikte görünür; üç geçiş birbirine binmez.

## Zaman ve hız

Kaydırma mesafesi masaüstünde yaklaşık **6,6 ekran**, tablette **6 ekran**, mobilde **5,6 ekran**dır. Önceki kısa akışa göre kullanıcının her konumu okuyabileceği bilinçli bir seyir mesafesi ayrılmıştır.

Normalize zaman çizgisi:

- **0–20%** — uzak karede yavaş yaklaşma,
- **20–30%** — uzak → boru koridoru kontrollü cross-dissolve,
- **30–46%** — ikinci kare tek başına ilerler,
- **46–57%** — yaklaşma → kontrol binası,
- **57–69%** — kontrol binası tek başına ilerler,
- **69–81%** — cam cephe → kontrol odası,
- **81–90%** — ana ekrana yaklaşma,
- **90–99,2%** — fiziksel ekranın içinde gerçek DOM arayüzü kademeli görünür,
- **100%** — sahne hit-testing'den tamamen çıkar ve gerçek arayüz normal belge akışını devralır.

Hareket scroll oranından deterministik türetilir. Saat tabanlı autoplay, atalet döngüsü veya kendi kendine ilerleme yoktur. Scroll durduğunda kamera da tam olarak durur; geri kaydırma aynı yolu ters yönde kurar.

## Ekrandan gerçek siteye teslim

Final karedeki ana ekranın normalize sınırları `zaman.ts` içindeki `EKRAN` ile tanımlıdır. `fotograf.ts` bu ekranın gerçek piksel dikdörtgenini her scroll konumunda hesaplar. `SinematikGiris.tsx`, canlı uygulamayı aynı dikdörtgene ölçekleyip kırpar; final yaklaşımında ekran viewport'u doldurunca `transform` ve `clip-path` kaldırılır.

Bu nedenle geçiş “fotoğraf bitti, site açıldı” şeklinde bir kesme değildir: fiziksel ekran yüzeyi aynı konumda gerçek arayüze dönüşür.

## Akış ve erişim

- Oturumsuz `/giris` ve demo `/` ilk ziyarette giriş deneyimini gösterir.
- Üretimde oturumlu kullanıcılar, iç rotalar, hash ve `next` hedefleri doğrudan uygulamaya gider.
- `Platforma Gir` ve `Girişi atla` sahneyi kapatır, odağı gerçek arayüze taşır.
- Tamamlanma `v3` oturum anahtarıyla hatırlanır; yeni dört kareli sürüm eski deneyimi görmüş kullanıcılara da bir kez gösterilir.
- Arayüz geçiş tamamlanana kadar `inert` ve `aria-hidden`; tamamlanınca normal belge akışındadır.
- Azaltılmış hareket tercihi ilk kareyi statik gösterir ve çalışan CTA sunar.
- Görsel yükleme başarısız olursa statik giriş ve gerçek arayüz kullanılabilir.

## Performans ve doğrulama

Dört WebP toplamı yaklaşık **615 KB**dır; video ve yeni animasyon paketi yoktur. Kaydırma sırasında yalnız dört mutlak konumlu görselin konum, boyut ve opaklık değerleri güncellenir.

`tests/giris-zaman.test.ts` şunları korur:

- ileri/geri deterministik poz,
- aynı anda en fazla iki komşu karenin görünmesi,
- üç geçiş arasında tek-kare bekleme bölgeleri,
- her karede yalnız ileri zoom,
- kamera sürekliliği,
- final ekran → gerçek DOM geometrik teslimi.

Tarayıcıdaki doğal scroll sonrası tıklanabilirlik ayrıca `arac/giris-gecis.mjs` ile masaüstü ve mobil genişlikte doğrulanır.
