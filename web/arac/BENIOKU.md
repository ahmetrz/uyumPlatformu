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
OUT=/yol/kare YOLLAR=/sistem,/,/tesisler node arac/kare.mjs
```

Giriş gerektiren rotalar için betiğe oturum açma adımı eklenmelidir
(geliştirme girişi: `ahmet.terzi@zorlu.com`).
