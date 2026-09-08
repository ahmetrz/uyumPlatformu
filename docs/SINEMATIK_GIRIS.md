# Jeotermal sinematik giriş

İlk ziyaret, akşam ışıkları ve buharla çevrili jeotermal tesise yaklaşır; kontrol odasının büyük ekranından mevcut uygulamaya geçer. Kullanıcının seçtiği görsel yön, fotogerçekçi dış/iç sahneler ve bakır ışıklardır.

## Görsel yöntem

Bu çalışma tamamen modellenmiş bir santral değildir. Kullanıcının sağladığı üç görsel dokusu perspektif kamera ile sahnelenir. Three.js ön planda fiziksel borular/bağlantılar ve kaydırmaya bağlı yarı saydam buhar ekler. Dışarıdan içeriye geçişte ardışık sahneler kısa süre birlikte görünür; siyaha kesme veya video yoktur. Fotogerçekçi görünüm ile web performansı arasında bilinçli bir hibrit uygulamadır.

Görseller içerikleri değiştirilmeden kullanılır: santral, cam cepheli bina ve kontrol odası. Kamera operatörün ekranına yaklaştığında gerçek arayüz kademeli görünür. Aynı kamera izdüşümü gerçek DOM arayüzünün ölçeğini, konumunu ve kırpma sınırını belirler. Uygulama bir ekran görüntüsü veya sahte panel değildir; aynı sunucu verisi ve aynı bileşen ağacı korunur.

## Akış ve erişim

- Oturumsuz `/giris` ve demo `/` ilk ziyarette giriş deneyimini gösterir.
- Üretimde oturumlu kullanıcılar, iç rotalar, hash ve `next` hedefleri doğrudan uygulamaya gider.
- `Platforma Gir` ve `Girişi atla` sahneyi kapatır, odağı gerçek arayüze taşır. Form içinde kaydırma sahneyi tekrar açmaz.
- Kaydırmayla tamamlanan geçiş tersine kaydırılabilir. Poz ve buhar yalnız kaydırma oranına bağlıdır; zaman tabanlı döngü yoktur.
- Sekme oturumu boyunca tamamlanma hatırlanır. Yeni görsel yönün eski girişten ayrı `v2` anahtarı vardır.
- Tamamlanan sahnenin bütün görsel alt öğeleri gizlenir ve sahne tıklama hedefi olmaktan çıkar. Son pikseldeki kesirli kaydırma farkı tamamlanmayı engellemez.
- Arayüz geçiş tamamlanana kadar `inert` ve `aria-hidden`; tamamlanınca normal belge akışındadır.
- Azaltılmış hareket tercihi statik fotoğraf ve çalışan CTA sunar.
- WebGL kullanılamazsa aynı perspektif hesaplarıyla fotoğraf tabanlı kaydırma sürer; borular ve ek buhar çizilmez. Görseller de yüklenemezse statik giriş ve gerçek arayüz kullanılabilir.
- Geç gelen yükleme, kullanıcı ilerlemişse veya atlamışsa sayfayı yerinden oynatmaz.

## Performans ve bakım

Üç WebP yaklaşık 448 KB toplamdır. Aynı kaynak adresleri DOM ve Three.js tarafından kullanılır. Yeni paket veya video bağımlılığı yoktur. Three.js dinamik yüklenir; DPR mobilde 1,25 ve masaüstünde 1,6 ile sınırlıdır. Geometri, dokular, malzemeler, renderer ve olay dinleyicileri temizlenir. Kaydırma durduğunda yeni frame üretilmez.

`zaman.ts`: poz, ortak kamera ve ekran yerleşimi. `cekirdek.ts`: WebGL sahnesi. `fotograf.ts`: WebGL gerektirmeyen fotoğraf alternatifi. `SinematikGiris.tsx`: yaşam döngüsü, atlama, odak ve DOM geçişi. Görsel dosyaları `public/gorseller/jeotermal/` altındadır; kullanıcının seçtiği sinematik görsellerdir.

`tests/giris-zaman.test.ts` tersinirliği, hareket sürekliliğini, kamera/DOM izdüşüm eşliğini (Three.js kamera ile karşılaştırarak) ve mobil/tablet/masaüstü/geniş ekranda tam ekran teslimini denetler. Görsel kalite ve hareketli sahne ayrıca tarayıcıda incelenmelidir; testlerin geçmesi gözle incelemenin yerine geçmez.
