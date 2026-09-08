# Jeotermal sinematik giriş (v3 · sürekli kamera)

İlk ziyaret, aynı jeotermal tesis içinde tek bir fiziksel hedefe doğru ilerleyen kesintisiz bir kamera yolculuğudur: uzak tesis → boru koridoru → cam kontrol binası → kontrol odasındaki ana ekran → gerçek uygulama. Kaydırma kamerayı sürer; saat yoktur.

## Neden slayt değil

v2, dört kareyi kendi hedefi çevresinde büyütüp komşu kareye çözüyordu; kareler hâlâ ayrı fotoğraflar gibi okunuyordu çünkü çözünme anında iki karedeki hedef farklı büyüklük ve konumdaydı.

v3 dört kareyi **tek bir dünya koordinatına diker**. Komşu iki karede aynı fiziksel nesne (kontrol binası, sonra video duvarı, sonra ana ekran) 1600×900 kaynakta ölçülmüştür; ölçüm iç kareyi dış karenin içine yerleştirir. Kamera tek bir logaritmik zoom eğrisinde ilerler ve bir kare görüntü alanını kapladığı anda öndeki kareye çözünür. Çözünme boyunca iki kare **aynı hedefi aynı piksel dikdörtgeninde** tutar; test bunu her kaydırma noktasında ölçer (`tests/giris-zaman.test.ts`). Sonuç, mevcut dört onaylı kare arasında tutarlı in-between hissi veren "cinematic scrub"tır; yeni görsel üretilmedi.

## Ölçülen bağlar (piksel · 1600×900)

| Bağ | Hedef | Dış kare | İç kare | Ölçek |
| --- | --- | --- | --- | --- |
| 1 → 2 | kontrol binası | x 648–970 · y 350–470 | x 575–1030 · y 290–455 | 0,714 |
| 2 → 3 | kontrol binası | x 575–1030 · y 290–455 | x 305–1300 · y 215–590 | 0,449 |
| 3 → 4 | video duvarı → ana ekran | x 655–955 · y 355–425 | x 365–1235 · y 268–520 | 0,312 |

Ölçek, hedefin iki karedeki genişlik ve yükseklik oranlarının geometrik ortalamasıdır. Dört karenin dünya ölçekleri 1 · 0,714 · 0,321 · 0,100; toplam kamera zoom'u yaklaşık **32×**.

Tanımlar `web/components/giris/zaman.ts` içindedir: `BAGLAR` (ölçümler), `dunyaKur` (dünya koordinatı), `poz` (kaydırma oranı → kamera durumu), `EKRAN` (son karedeki ana ekran).

## Zaman ve hız

Kaydırma mesafesi masaüstünde **9,2 ekran**, tablette **8,2**, mobilde **7,4** (`kaydirmaKatsayisi`); v2'de 6,6 · 6 · 5,6 idi.

Hız eğrisi `hizEgrisi`: sinüs ease-in-out ile doğrusal karışımı (0,76 / 0,24). Başlangıç yavaş ama ölü değil, orta bölüm yaklaşık 1,4× hızlı, bitiş yeniden yavaş.

Çözünme bantları cihazdan bağımsızdır ve zoom cinsinden tanımlıdır: iç kare, hedef sapmasına rağmen görüntü alanını kapladıktan sonra (`a ≥ 1/(1−2d)`) 1,45× büyüyene kadar çözünür. 1440×900'de yaklaşık zaman çizgisi:

- **0–25%** — uzak kare tek başına; editoryal metin %12–20 arasında söner,
- **25–31%** — uzak → boru koridoru (bina aynı dikdörtgende),
- **31–43%** — ikinci kare tek başına,
- **43–48%** — koridor → cam bina,
- **48–67%** — üçüncü kare tek başına, video duvarı büyür,
- **67–73%** — cam cephe → kontrol odası (video duvarı → ana ekran),
- **75–84%** — ana ekran yüzeyinde canlı arayüz belirir (son kare tek başınayken; üç katman asla üst üste gelmez),
- **84–100%** — iris: arayüz tamamen görününce ekran çerçevesi görüntü alanına açılır,
- **100%** — sahne hit-testing'den çıkar; gerçek arayüz normal belge akışını devralır.

Her şey kaydırma oranından deterministik türer: scroll durunca kamera durur, geri kaydırma aynı yolu geri kurar (`arac/giris-gecis.mjs` bunu tarayıcıda ölçer).

## Ekrandan gerçek siteye teslim

`poz`, son karedeki ana ekranın piksel dikdörtgenini her konumda verir; `SinematikGiris.tsx` canlı uygulamayı `ekranYerlestir` ile aynı dikdörtgene ölçekleyip kırpar (`transform` + `clip-path`). Kamera odağı ekran merkezini görüntü alanı merkezine kilitler; bu yüzden ölçek 1'e ulaştığında konum sıçraması olmaz. Arayüz görünür olduktan sonra dikdörtgen "iris" ile görüntü alanına açılır ve %100'de `transform`/`clip-path` kaldırılır. Kesme yoktur: fiziksel ekran yüzeyi aynı konumda gerçek arayüze dönüşür.

## İşleyici ve performans

`web/components/giris/sahne.ts` dört `<img>` öğesini bir kez kaplama boyutuna diker; her kaydırma karesinde yalnız `transform: translate3d(...) scale(...)` ve `opacity` değişir (kompozitör, yerleşim yok). Görünmeyen kare `visibility: hidden` ile kompozisyondan çıkar; aynı anda en fazla iki kare çizilir. WebGL/three.js yolu ve kullanılmayan üç eski görsel kaldırıldı; dört WebP toplamı yaklaşık **615 KB**, video yok.

## Akış ve erişim

- Oturumsuz `/giris` ve demo `/` ilk ziyarette deneyimi gösterir; iç rotalar, hash ve `next` hedefleri doğrudan uygulamaya gider.
- `Platforma Gir` ve `Girişi atla` sahneyi kapatır, odağı gerçek arayüze taşır.
- Tamamlanma `v4` oturum anahtarıyla hatırlanır; sürekli kamera sürümü eski deneyimi görmüş kullanıcılara da bir kez gösterilir.
- Arayüz teslim tamamlanana kadar `inert` ve `aria-hidden`; geri kaydırmada yeniden `inert` olur.
- Azaltılmış hareket tercihi ilk kareyi statik gösterir ve çalışan CTA sunar; görsel yüklenemezse statik giriş kalır.

## Doğrulama

`tests/giris-zaman.test.ts` beş görüntü alanında (375×780 · 768×1024 · 1366×768 · 1440×900 · 2560×1080) şunları ölçer: ileri/geri determinizm · ortak hedefin dünya koordinatında çakışması · her anda en fazla iki komşu kare, toplam opaklık 1 ve görünen her karenin görüntü alanını kaplaması (boşluk yok) · çözünme boyunca hedefin iki karede aynı piksel merkezinde olması · yalnız ileri zoom ve hız profili · arayüzün yalnız son kare tek başınayken belirmesi ve sıçramasız teslim.

`arac/giris-gecis.mjs` (PR kapısında) iki genişlikte yol boyunca yatay taşma olmadığını, en fazla iki kare göründüğünü, scroll dururken karenin durduğunu, doğal kaydırma sonunda gerçek formun tıklanabildiğini ve geri kaydırmada arayüzün yeniden `inert` olduğunu doğrular.
