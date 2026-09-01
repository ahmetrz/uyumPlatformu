# arac/ — görsel doğrulama araçları

Atlas tasarım uygulamasının (bkz. `DESIGN_HANDOFF_GAP.md`) görsel kalite kapısı.
Üretim kodu değildir; derlemeye girmez.

## `referans-yakala.mjs`

Handoff paketindeki tasarım dosyalarından **referans artboard'larını** yakalar.
Faz 8'deki piksel karşılaştırmasının tabanıdır.

Tasarım dosyaları `<x-dc>` + `support.js` runtime'ı kullanır ve ham işaretlemeyi
`x-dc{display:none}` ile gizler. README zaten "support.js'i tamamen at" dediği için
dosyalar önce düz HTML'e çevrilir (`design/duz/`), sonra her 1440px'lik artboard
ayrı PNG olarak alınır.

```bash
# 1) handoff paketini bir HTTP sunucusunda ver (fontlar da yanında olmalı)
cd <handoff>/design_handoff_energy_operations_atlas && python3 -m http.server 3400
# 2) yakala
OUT=/yol/referans node arac/referans-yakala.mjs
```

Google Fonts sanal makineden erişilemediği için yerel `public/fontlar/*.woff2`
enjekte edilir — referanslar doğru tipografiyle çıkar.

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
yakalanıyordu — ekran görüntüsünde vurgulu görünüyor, `denetim.mjs` bunu
zebra sanıyordu.

Giriş gerektiren rotalar için betiğe oturum açma adımı eklenmelidir
(geliştirme girişi: `ahmet.terzi@zorlu.com`).

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
