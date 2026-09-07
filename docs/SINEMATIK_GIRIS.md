# Sinematik giriş

Giriş deneyimi mevcut koyu paleti, bakır vurguyu ve yerel yazı tiplerini kullanır. Regülasyon, kontrol, kanıt, risk, denetim ve uyum; aynı açıklığı paylaşan altı mimari katmanla temsil edilir.

## Nerede çalışır?

- Oturumsuz `/giris`: mevcut giriş formuna geçer. Oturum kontrolü ve sunucuda süzülen `next` hedefi aynen korunur.
- Statik demo `/`: mevcut, sunucuda hazırlanmış gerçek `Kabuk` ve `Genel` bileşenlerine geçer.
- Üretimde oturum açmış kullanıcılar ve bütün iç rotalar doğrudan mevcut ekranı kullanır.
- `next` parametresi veya hash taşıyan bağlantılar giriş deneyimini atlar.
- Tamamlanan/atlanan deneyim sekme oturumu boyunca hatırlanır. Depolama kullanılamazsa CTA ve uygulama çalışmaya devam eder.

## Hareket ve geçiş

`components/giris/zaman.ts` kaydırma oranından deterministik bir poz üretir. Saat, otomatik oynatma, yay veya yumuşatma döngüsü yoktur. Aynı kaydırma noktası aynı pozu verir.

`cekirdek.ts` gerçek Three.js katmanlarını çizer. Arka katmanın fiziksel açıklığı kamera üzerinden ekran koordinatlarına yansıtılır. Bu sınırlar, önceden render edilmiş gerçek HTML arayüzünün kırpma alanıdır. Merkezdeki iki kapak kaydırmayla açılır; kamera yaklaştıkça açıklık tüm ekranı kapsar. Arayüz aynı DOM ağacında kalır; ekran görüntüsü, ikinci dashboard veya geçiş sırasında veri isteği yoktur.

Geçiş bittiğinde arayüz normal belge akışındadır. Kaydırma mesafesi korunur; geri kaydırma aynı geometrik geçişi yeniden kurar. Kullanıcı açık CTA ile doğrudan sona geçebilir.

## Performans ve erişim

- Three.js dinamik olarak, yalnız uygun girişte yüklenir. GSAP veya başka bir animasyon motoru eklenmez.
- Ortak düşük karmaşıklıklı geometri; doku, parçacık, gölge haritası veya postprocessing yoktur.
- DPR masaüstünde 1,6; mobilde 1,25 ile sınırlandırılır. Mobil kamera ve kaydırma mesafesi ayrıdır.
- Sürekli render döngüsü yoktur. Kaydırma, yeniden boyutlandırma ve görünürlük değişimi en fazla tek bekleyen frame oluşturur.
- Geometri, malzeme, renderer ve olay dinleyicileri temizlenir.
- Geçiş boyunca gerçek arayüz `inert` ve `aria-hidden` durumundadır; sonunda kullanılabilir olur. Atla eylemi odağı arayüze taşır.
- Reduced motion, WebGL/yükleme hatası ve JavaScript yokluğunda statik giriş ve gerçek ekran sunulur. Hareket tercihi çalışırken değişirse statik moda dönülür.

## Geliştirme

Normal `npm run dev` Next.js geliştirme sunucusunu açar. `arac/dev.mjs`, denetimli önizlemenin `--host` / `--strictPort` parametrelerini Next.js parametrelerine çevirir. Yalnız `--strictPort` kullanılan önizleme modu demo verisiyle çalışır; normal komutun oturum davranışı değişmez.

## Doğrulama sınırı

Kaydırma pozlarının tersinirliği, kamera son konumu ve hizalama/açılma sırası `tests/giris-zaman.test.ts` ile doğrulanır.

Bu çalışma ortamındaki tarayıcı denemesinde masaüstü ve 375 × 812 çerçevede statik giriş, CTA'nın gerçek arayüze bağlantısı ve `/uyum` rotası görüldü. Denetimli Next.js sunucusu JavaScript dosyalarını sunarken `uv_resident_set_memory` hatası verdi. Bu nedenle hareketli WebGL akışı, scroll-stop, ters kaydırma, 3D → DOM geçişinin görsel sürekliliği ve tarayıcıda reduced-motion emülasyonu henüz doğrulanmış değildir. Bu kontroller tamamlanmadan sürüm yayın onayı almış sayılmaz.
