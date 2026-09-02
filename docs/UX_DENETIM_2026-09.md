# UX/UI Denetimi — Zorlu Enerji Yönetişim Platformu

**Tarih:** 2 Eylül 2026 · **Denetlenen sürüm:** `main @ a9c1b33` · **Kapsam:** 44 rota, 3 kabuk (A·tezgâh, B·saha, C·defter)
**Amaç:** Yeniden tasarıma geçmeden ÖNCE mevcut durumu ölçmek, sorunları önceliklendirmek ve tek bir yürütme planı çıkarmak.
**Yöntem:** Tek tur kanıt toplama (giriş + 14 kilit rota, 1366×768; Saha `/` ayrıca 1440×900 · 1440×1080 · 1280×800 · 1024×768; dokunmatik genişlik 900px için `/uyum` ve `/envanter`), DOM yükseklik ölçümü, hesaplanmış font aileleri, `kabuk.css` statik taraması, mevcut tasarım kapıları (`tasarim:kapi` → kontrast kusuru 0, eski tasarım izi 0). Bu belgede her yargı bir ölçüme bağlanır; ölçülemeyen yerlerde "doğrulanmalı" denir.
**Kanıt dosyaları:** `docs/denetim-2026-09/` (5 ekran görüntüsü, `olcum.json` ham ölçümler, `kanit-topla.mjs` tekrar üretim betiği — `web/arac/` içinden çalıştırılır).

> Bu denetim tamamlanıp yön onaylanmadan yeniden tasarım başlamaz. Bölüm 11'deki plan, onaydan sonra sırayla uygulanacak tek yoldur.

---

## 1. UX denetim özeti

**Tek cümle:** Platform, iyi belgelenmiş ve güçlü bir karanlık tasarım diline (DESIGN.md) sahip; ama bu dil **üç ayrı kabuğa bölünmüş** olduğu için kullanıcı üç farklı ürün algılıyor, ana sayfa ise tek ekrana sığmayan **dokuz bölgeli** bir yapıya büyüdü.

Ölçülen olgular:

| Olgu | Ölçüm | Kaynak |
|---|---|---|
| Rota başına farklı font ailesi | **7 aile / 24 dosya / 915 KB**. B: Barlow Condensed + Inter + JetBrains Mono · C: Newsreader + Inter + IBM Plex Mono (+ `/uyum`'da **Arial** yedeğe düşen metin) · A: Archivo + Inter Tight + IBM Plex Mono | `font-kontrol.mjs`, hesaplanmış `fontFamily` |
| Rota başına farklı aksan / zemin | B bakır `#C2703E` · C oxblood `#B24936` + sıcak kahve zemin · A amber `#D9A03C` | `kabuk.css` `.ab[data-yon]` |
| Üç ayrı navigasyon modeli | B: 56px sekme çubuğu · C: 122px künye + serif sekmeler + 212px sol dizin · A: 52px kapsam çubuğu + 76px iki-harfli ikon rayı (16 öğe) + 30px durum ayağı | ölçüm: `header.h` 56 / 122 / 52 |
| Saha `/` toplam yükseklik | **1340px** (tüm masaüstü genişliklerinde sabit); 1024px'te 2687px | `scrollHeight` |
| Santral şeridinin başladığı y | **795px** → 1366×768 ve 1280×800'de tamamen kat altı; 1440×900'de kartın yalnızca 105px'i görünür | `.ab-b-serit.top` |
| Saha kat üstü bilgi yoğunluğu | 3 sütun + 4 müdahale satırı + 11 satırlık "değerlendirilmemiş" listesi + 4 etiketli saçılım + 3 üretim tipi barı + 5×5 ısı haritası + 3 KPI kutusu; **61 yaprak metin düğümü 11px altında** | ekran görüntüsü + DOM sayımı |
| Gerçek `<table>` kullanımı | Tüm uygulamada **3**; liste/matris bileşeni `tablo.tsx` div/button grameriyle yazılmış, `aria-sort` yok (kodda not edilmiş) | grep |
| Boş/yükleme/hata primitifleri | `Iskelet`, `BosIlk`, `BosFiltre`, `Hata`, `Yetkisiz` → 5 durum var; "bağlantı yok · ölçülmedi · kısmi · bakım · entegrasyon yapılandırılmamış" **yok** | `temel.tsx` |
| Footer | Kurumsal footer **yok**. Yalnızca A kabukta 30px "Bağlayıcı durumu" ayağı var (sistem durumu, footer değil) | `Kabuk.tsx:364-371` |
| Kırılma noktaları | 700 · 820 · 1100 · 1360 · 1366 · 1400 · 1500 → **7 farklı eşik**, sistemsiz | `@media` taraması |
| Türkçe büyük harf | `text-transform: uppercase` 62 kullanım (güvenli, `lang="tr"` var); `toUpperCase()` 11 çağrıdan **6'sı yerelsiz** → "i→I" riski | grep |
| Erişilebilirlik kapıları | Kontrast kusuru 0 · reduced-motion bloğu var · `aria-current` 15 yerde · **skip-link yok** | `tasarim:kapi`, grep |

Güçlü yanlar (korunacak): radius 0 + hairline kompozisyonu, ikon kütüphanesi yok, bilinmeyen = 45° tarama (asla sıfır değil), `KokenRozeti` provenance, `Metrikler` tek KPI muamelesi, 400px sabit çekmece, motion token'ları, WCAG 2.2 24px hedef, kontrast kapısı, santral fotoğraf şeridi, Saha saçılım grafiği (kurulu güç × uyum endeksi) — bunlar ürünün "premium endüstriyel" imzasıdır ve DESIGN.md'de zaten normatiftir.

---

## 2. En kritik sorunlar — P0 / P1 / P2

**Şiddet tanımı:** P0 = kullanıcının ürünü anlamasını / ana soruya cevap almasını engeller, tüm rotalara yayılır. P1 = bir arketipi veya kilit ekranı bozar, iş akışını yavaşlatır. P2 = tutarlılık, cila, teknik borç.

### P0

| # | Sorun | Kanıt | Etki |
|---|---|---|---|
| P0-1 | **Üç kabuk = üç ürün.** Font, aksan, zemin ısısı ve navigasyon modeli rotaya göre değişiyor. Kullanıcının "Uyum/Varlık/Risk Saha'dan kopuk, bitmemiş duruyor" algısının kökü budur. | 7 font ailesi; 3 aksan; header 56/122/52px; sol dizin yalnızca C'de; ikon rayı yalnızca A'da | Ürün kimliği yok; öğrenilen etkileşim taşınmıyor; 915 KB font yükü |
| P0-2 | **Saha tek ekrana sığmıyor.** İçerik 1340px; santral şeridi 795px'te başlıyor; takvim+akış bandı 998px'te. | `olcum.json` – tüm 4 hedef viewport'ta aynı | Ürünün en görünür yüzeyi "kaydırılmadan okunmuyor"; santral görselleri (ürünün duygusal çıpası) kat altında |
| P0-3 | **Saha'da birincil/ikincil ayrımı yok.** Kat üstünde 9 bölge eşit görsel ağırlıkta; "Bu santral şu an ne durumda, ne yapmalıyım?" sorusunun cevabı (Müdahale gerektirenler) solda dar bir sütunda, saçılım grafiğinin ve 11 satırlık "değerlendirilmemiş" listesinin yanında. Risk ısı haritası `/riskler`'in, düzenleyici takvim `/denetimler`'in kopyası. | Ekran görüntüsü `saha-1366x768-tam.png` | Yüksek bilişsel yük; kritik aksiyon sıradanlaşıyor |
| P0-4 | **Navigasyon iş modelini değil klasör yapısını yansıtıyor.** RİSK üst sekmesi kendi alanı değil: tıklayınca Uyum defterinin "Risk & CAPA" sekmesi açılıyor, sol dizin Uyum grupları gösteriyor. VARLIK altında 16 öğeli ray iki-harfli kısaltmalarla ("VR, KŞ, AĞ, ÖM, YD, FR, TD, OL, DĞ, SĞ, BL, YT, EŞ, VA…") okunamıyor. | `riskler-1366.png`, `envanter-1366.png`; `yonler.ts` C_SEKMELER/A_RAY | Kullanıcı nerede olduğunu ve hangi ailede gezindiğini bilmiyor |
| P0-5 | **Footer yok; sistem durumu footer yerine kullanılıyor.** A kabuktaki 30px "Bağlayıcı durumu" ayağı yalnızca 20 rotada; B ve C'de hiç alt bölge yok. Ürün adı/sürüm/ortam/yardım/destek/gizlilik hiçbir yerde toplanmıyor. | `Kabuk.tsx`; ölçüm `footer: null` (B ve C) | Kurumsal bitmişlik eksik; "sistem durumu" ile "kurumsal bilgi" aynı yerde karışıyor |

### P1

| # | Sorun | Kanıt |
|---|---|---|
| P1-1 | **Liste/matris tabloları semantik değil.** `tablo.tsx` div+button; ekran okuyucu satır/sütun ilişkisini alamıyor; `aria-sort` yok; sabit ilk sütun / sütun yönetimi / satır seçimi / klavye gezinme yok. | `tablo.tsx:54` notu; `<table>` 3 yerde |
| P1-2 | **Varlık ilişki görünümü ilk açılışta boş.** 7 halkalı zincirin 4'ü "VARLIK SEÇİN" yazan boş sütun; ekranın %60'ı noktalı zemin. Filtre satırı 2 satıra kırılıyor (SİNYAL/OT/MARUZ… + KRİTİKLİK). | `envanter-1366.png` |
| P1-3 | **Uyum matrisinde en değerli alan boş bir "EĞİLİM" şeridine gidiyor** ("Henüz anlık görüntü yok"); santral başlık hücreleri 3–4 satıra kırılıyor (`Kızıldere III JES / KIZILDERE-3`); sol dizinde bir metin Arial yedeğe düşmüş. | `uyum-1366.png`; hesaplanmış font listesinde `Arial` |
| P1-4 | **Risk ısı haritası gürültü üretiyor.** 25 hücrenin 17'si "0 DÜŞÜK"; 1 ölçülemeyen risk yalnızca metinde. Aynı matris Saha'da da var (kopya). | `riskler-1366.png` |
| P1-5 | **Durum/boş/hata kapsamı eksik.** 10 gerekli durumdan 5'i yok (bağlantı yok, ölçülmedi, kısmi veri, bakım, entegrasyon yapılandırılmamış). "VERİ KESİTİ YOK" gibi etiketler başlıkta açıklamasız duruyor. | `temel.tsx`; header ölçümü |
| P1-6 | **Yoğunluk/kademe sistemi yok; kırılma noktaları rastgele.** 7 farklı `@media` eşiği; 1024px'te Saha 2687px'e çıkıyor (sağ panel 1228px'e düşüyor). Dokunmatik genişlikte (900px) C kabuk başlığı 143px'e şişiyor, A rayı 76px sabit kalıyor. | `@media` taraması; `saha 1024x768`, `/uyum 900` ölçümleri |
| P1-7 | **Bağlam korunması kısmi.** 6 dosyada storage/searchParams; santral kapsamı korunuyor ama filtre/sıralama/sekme/scroll çoğu rotada URL'e yazılmıyor (doğrulanmalı: rota bazlı test). | grep |
| P1-8 | **11px altı metin yoğunluğu.** Saha 61, Portföy 81 yaprak düğüm <11px (`kabuk.css`'te 45 adet `font-size: 10px`). DESIGN.md 10px'i yalnızca etiket için izin veriyor; sayısal verilerde kullanımı doğrulanmalı. | DOM sayımı |
| P1-9 | **Header'da 4 çerçeveli düğme** (BİLDİRİM · AYARLAR · YARDIM · ÇIKIŞ) birincil navigasyonla aynı görsel ağırlıkta; kullanıcı adı ile "VERİ KESİTİ YOK" aynı satırda anlamsal bağ yok. | tüm başlık ekranları |

### P2

| # | Sorun |
|---|---|
| P2-1 | Skip-link ("Ana içeriğe geç") yok. |
| P2-2 | `toUpperCase()` 6 yerde yerelsiz (Türkçe i/İ riski); `toLocaleUpperCase('tr')` 5 yerde — tek yardımcıya toplanmalı. |
| P2-3 | `/yardim` 3005px tek sayfa; içindekiler/çapa yok. |
| P2-4 | Glif ailesi kabuğa göre değişiyor (A/B kare, C daire) — tek durum dili ilkesine aykırı. |
| P2-5 | Santral şeridi kartlarında "DEĞERLENDİRİLMEMİŞ" ile "—" aynı anlamı iki dilde söylüyor. |
| P2-6 | Saha'da müdahale satırlarında sağdaki "01 02 03 04" sıra numaraları büyük ve açık renkli; içerikle yarışıyor. |
| P2-7 | `SistemSayfasi` ve `global-error` kendi footer metnini taşıyor ("BT/OT yönetişim · uyum · dönüşüm") — merkezi footer ile birleşmeli. |
| P2-8 | Aynı bilgi için üç mono font (JetBrains Mono / IBM Plex Mono ×2 kabuk) yükleniyor. |

---

## 3. Ekran arketipleri

44 rota → **8 arketip.** Yeniden tasarım arketip başına bir kez yapılır; rotalar arketipini devralır.

| Arketip | Rotalar | Kullanıcı sorusu | Yoğunluk kademesi | Ana düzen |
|---|---|---|---|---|
| **A1 · Saha (yönetici bakışı)** | `/` | "Şu an ne durumdayız, ne yapmam gerekiyor?" | Amiral (flagship) | Tek viewport, 3 bölgeli üst + şerit |
| **A2 · Portföy / Harita** | `/portfoy`, `/harita` | "Filo genelinde nerede sorun veya fırsat var?" | Amiral | Kaydırılabilir karşılaştırma; harita tam ekran |
| **A3 · Santral 360** | `/tesisler`, `/tesisler/[id]` | "Bu santralın uyum, varlık ve risk resmi ne?" | Amiral → Operasyonel | Fotoğraflı künye + sekmeli gövde |
| **A4 · Matris** | `/uyum`, `/eslestirme`, `/esleme` | "Nerede uyumsuzuz ve neden?" | Operasyonel | Sabit satır/sütun başlıklı matris + sağ gerekçe çekmecesi |
| **A5 · Kütük (liste + kayıt)** | `/riskler`, `/denetimler`, `/bulgular`, `/projeler`, `/surecler`, `/regulasyonlar`, `/olaylar`, `/tedarikciler`, `/kimlik`, `/yedekleme`, `/omur`, `/envanter` (tablo kipi), `/dokumanlar`, `/kanitlar`, `/bildirimler`, `/aktivite` | "Hangi kayıt önce ele alınmalı?" | Operasyonel | Özet satırı + filtre çubuğu + semantik tablo + 400px çekmece |
| **A6 · Topoloji / İlişki** | `/topoloji`, `/envanter` (ilişki kipi) | "Hangi bağımlılıklar risk yaratıyor?" | Operasyonel | Tuval + seçili düğüm paneli |
| **A7 · Tezgâh (işlem akışı)** | `/kesif`, `/ice-aktarim`, `/varlik-aktarim`, `/yonetim-tezgahi`, `/operasyon`, `/saglik` | "Bu işi adım adım nasıl bitiririm?" | Tezgâh (workbench) | Aşamalar + çalışma alanı + sonuç paneli |
| **A8 · Sistem / Yardımcı** | `/ayarlar`, `/yardim`, `/yetkiler`, `/sistem*`, `/raporlar`, `/giris`, `/bakim` | "Ayarı/bilgiyi nerede bulurum?" | Operasyonel (sakin) | Tek sütun + sol içindekiler |

Not: Risk, Bulgu, Denetim, Proje **aynı arketiptir** (A5); bugün üçü C kabukta ama farklı başlık kompozisyonuyla yazılmış. Tek bir `Kutuk` şablonu dördünü karşılar.

---

## 4. Navigation / IA önerisi

**İlke:** Birincil navigasyon kullanıcının 4 sorusunu yansıtır; alt navigasyon işin akış ailesini; klasör yapısı görünmez.

### Birincil (56px, tüm rotalarda aynı)
`SAHA · PORTFÖY · UYUM · VARLIK · RİSK` — mevcut 5 alan **korunur** (iş modelini doğru yansıtıyor). Değişen: her alanın kendi ikincil satırı olur; kabuk değişmez.

### İkincil satır (36px, alana göre)
- **Uyum** → Matris · Regülasyonlar · Süreçler · Çapraz eşleme ‖ Denetimler · Bulgular & CAPA · Projeler ‖ Raporlar · Kanıt (belge kütüğü + kanıt kütüphanesi + kanıt paketi birleşir) · Denetim izi
  *Yönetişim akışı soldan sağa okunur: Çerçeve → Kontrol → Bulgu → CAPA → Kanıt.*
- **Risk** → Risk kütüğü · Isı haritası · CAPA (Uyum ile paylaşılan aynı rota) · Kabul edilen · Ölçülemeyen
  *Risk artık Uyum defterinin sekmesi değil, kendi alanı; CAPA iki alandan da ulaşılır, tek rota.*
- **Varlık** (tek operasyon ailesi, 16 ray öğesi 5 gruba iner) → Envanter (varlık · keşif · aktarım) · Ağ & bağımlılık (topoloji · eşleme) · Yaşam döngüsü (ömür · yedek · tedarikçi) · Erişim (kimlik · yetki) · Olay & değişiklik (olay · değişiklik · sağlık)
- **Portföy** → Karşılaştırma · Harita
- **Saha** → ikincil satır yok (yükseklik bütçesi için); santral seçici şerit bu rolü üstlenir.

### Yardımcı (sağ üst, tek "kullanıcı" menüsü altında)
Bildirimler (sayaçlı tek düğme) · Ayarlar · Yardım · Yönetim tezgâhı · Sistem · Çıkış — bugünkü 4 çerçeveli düğme yerine 1 rozetli düğme + 1 avatar menüsü.

### Bağlam zincirleri (breadcrumb değil, "künye")
- Operasyon: **Grup → Şirket → Santral → Sistem → Varlık** (Varlık, Topoloji, Santral 360)
- Yönetişim: **Çerçeve → Kontrol → Bulgu → Risk → CAPA** (Uyum, Risk, Bulgu)
Her kayıt sayfasının başında ilgili zincir tek satır mono olarak durur ve her halka tıklanabilir. Ayrıca halkalar arası geçişte **kapsam (santral), filtre, sıralama, sekme ve scroll URL'de** taşınır (`?tesis=…&f=…&s=…&sekme=…`); geri tuşu bağlamı kaybetmez.

### Dikkat yüzeyleri (Saha'ya değil, Bildirimler paneline)
Bugün · Bana atanmış · Kritik · Yaklaşan · Gecikmiş · Doğrulama bekliyor → tek panel, 6 sekme; Saha yalnızca "Kritik + Gecikmiş" toplamını gösterir.

### Dokunmatik (≤1023px)
Birincil sekmeler kalır (yatay kaydırılabilir), ikincil satır açılır menüye döner, sol dizin/ray kaldırılır, hedefler 44px. Nav asla kaybolmaz.

---

## 5. Design system prensipleri

Mevcut DESIGN.md **temel alınır**; aşağıdakiler onu değiştirir/tamamlar. Kilitli kararlar (tek karanlık tema, ürün adı, radius 0, ikon kütüphanesi yok, pill/badge/donut yok, 11px işlevsel taban, bilinmeyen ≠ sıfır) aynen kalır.

1. **Tek kabuk, üç yoğunluk.** `data-yon="a|b|c"` kaldırılır; yerine `data-yogunluk="amiral|operasyonel|tezgah"` gelir. Token adları (`--zemin … --unk`) korunur → ekranlar kırılmaz; yalnızca değerleri tek palete iner.
2. **Tek tipografi sistemi.** Roller token: `--gorunum` = Barlow Condensed (başlık/rakam-vitrin), `--ui` = Inter (gövde/etiket), `--veri` = JetBrains Mono (veri/kimlik/kod). Newsreader, Archivo, Inter Tight, IBM Plex Mono kaldırılır → 7 aile → 3, ~24 dosya → ~9, tahmini yük 915 KB → ~350 KB (build'de ölçülecek). Font hiçbir sayfada değişmez.
3. **Tek aksan, tek zemin.** Bakır `#C2703E` (Saha'nın) tek vurgu; zemin B'nin nötr karanlığı; C'nin sıcak kahve zemini kaldırılır. Durum renkleri (`--ok --md --bd --pl --unk`) tüm alanlarda aynı; **aksan asla durum anlamı taşımaz.**
4. **Durum dili tek ve ayrık.** `ok · md · bd · pl · unk · tamam` + tek glif ailesi (kare; C'nin dairesi kalkar). Bilinmeyen 45° tarama, "ölçülmedi" ≠ "uyumlu", sayı yoksa "—" değil "ölçülmedi" sözcüğü. Her durum en az iki kanalla (renk + glif/metin) kodlanır.
5. **Panel grameri.** Hairline ile ayrılan bölgeler, gölge yok, kart yalnızca gerçek gruplama için (santral kartı, seçili kayıt). Kart-içinde-kart yasak.
6. **Yoğunluk ölçeği.** Satır yüksekliği: amiral 44 / operasyonel 36 / tezgâh 32px; tablo hücre dolgusu 12 / 8 / 6px; etiket 11px taban, veri 12–13px, gövde 13–14px, başlık ölçeği 4 kademe (13/16/22/40+).
7. **Kırılma noktaları 4'e iner:** 1440+ · 1280–1439 · 1024–1279 · ≤1023 (dokunmatik). 700/820/1100/1360/1366/1400/1500 kaldırılır.
8. **Etkileşim karar modeli.** Satır önizleme/hızlı düzenleme → **çekmece (400px)**; açıklama/kaynak → **popover/ipucu**; geri alınamaz eylem → **onay iletişim kutusu**; çok adımlı iş → **tam sayfa tezgâh**. Bir kayıt için ikisi birden kullanılmaz.
9. **Boş/yükleme/hata seti 10 durum:** veri yok · sonuç yok · bağlantı yok · yetki yok · ölçülmedi · yükleniyor (iskelet geometri korur) · kısmi veri · hata · bakım · entegrasyon yapılandırılmamış. Her biri: başlık + neden + tek eylem.
10. **Tablo standardı.** Semantik `<table>`; sabit başlık + sabit ilk sütun; `aria-sort`; sütun yönetimi; satır seçimi; klavye (ok/Enter/Escape); metin taşmasında kısaltma + ipucu; dar ekranda **sütun önceliği** (kör kart yığını yok).
11. **Form standardı.** Etiket üstte, zorunlu işareti, satır içi doğrulama, yardımcı metin, `KokenRozeti` ile kaynak, kaydet/vazgeç sabit alt çubuk.
12. **Hareket.** Yalnızca anlam taşıyan geçişler: çekmece 320ms, iskelet→veri 160ms, durum değişimi 120ms; dekoratif yok; `prefers-reduced-motion` korunur.
13. **Odak ve hedef.** 2px aksan dış çizgi, 24px (dokunmatik 44px) hedef, skip-link eklenir.
14. **Türkçe.** Tek `buyukHarf(tr)` yardımcısı; `lang="tr"` korunur; test dizisi: "ğüşıİöç", "İzmir/ılık", %, MW/MWe/MWp, 12.345,67, tarih "06 Eyl 2026", uzun santral adı kısaltması.
15. **Footer ≠ sistem durumu.** İki ayrı semantik bölge (bkz. Bölüm 9).

---

## 6. Saha sadeleştirme önerisi

Ana soru: **"Bu santral şu anda ne durumda ve müdahale etmem gereken ne var?"** Her bölge bu soruya göre üç katmana ayrılır. Aynı veri korunur; yeri ve ağırlığı değişir.

| Mevcut bölge | Hangi soruyu yanıtlıyor | Katman | Karar | Nereye |
|---|---|---|---|---|
| Grup durumu · %75 uyum endeksi | "Genel durum ne?" | **Birincil** | Kalır, küçülür (40px rakam), yanına "bilinmeyen %14" | Üst özet satırı |
| Müdahale gerektirenler (12 / 4 satır) | "Ne yapmalıyım?" | **Birincil** | Kalır; en fazla 5 satır + "tümü →"; sıra numaraları küçülür; her satırda santral · kontrol · son tarih · sahibi | Sol sütun (genişler) |
| 3 KPI kutusu (kritik risk 5 · gecikmiş 2 · yaklaşan denetim) | "Kaç acil şey var?" | **Birincil** | Özet satırına taşınır; kutu değil, mono sayaç | Üst özet satırı |
| Saçılım: kurulu güç × uyum endeksi | "Filo dağılımı nasıl?" | **İkincil** | Kalır — ana grafik; fotoğraf zemini kalır, 4 etiket kalır | Orta alan |
| "Değerlendirilmemiş güce göre sıralı" 11 satırlık liste | "Kimler ölçülmedi?" | Üçüncül | Grafikte tek şerit + "11 santral · 206 MWe ölçülmedi" tek satır; liste ipucuna/Portföy'e | İpucu + Portföy |
| Üretim tipine göre uyum katmanları (3 bar) | "Tip bazında nerede zayıfız?" | **İkincil** | Kalır, 3 kompakt satır | Sağ panel üstü |
| Risk yoğunluğu 5×5 ısı haritası | "Risk dağılımı?" | Üçüncül (kopya) | Kaldırılır; yerine "6 kritik · 8 yüksek · 1 ölçülemedi → Risk" tek satır | Risk alanına bağlantı |
| Santral seçici şerit (16 kart) | "Hangi santrala bakayım?" | **Birincil** | Kat üstüne çıkar; 148–176px; tip etiketi + ad + MW + endeks | Alt şerit |
| Düzenleyici takvim · 90 gün | "Yaklaşan denetim ne?" | Üçüncül (kopya) | Özet satırında "Yaklaşan: ISO 27001 · 06 Eyl · 4 gün"; liste → Bildirimler/Denetimler | Çekmece |
| Uygunsuzluk akışı · 12 hafta | "Trend nasıl?" | Üçüncül | Saha'dan kalkar; Portföy'e ve Uyum "Eğilim" şeridine (oraya ait) | Portföy / Uyum |
| "SAHA SEÇİCİ · TESİSE GEÇMEK İÇİN SEÇİN · KAPSAM KORUNUR · YATAY KAYDIRIN" açıklama satırı | — | Gürültü | Tek kısa etiket "Santrallar · 16 · 643 MWe" | Şerit başlığı |

Sonuç: kat üstünde **9 → 5 bölge** (özet satırı, müdahale listesi, ana grafik, sağ tip paneli, santral şeridi), sayısal değer sayısı ~60 → ~25, kopya bilgi 0. Görsel kalite düşmez: fotoğraf zemini, saçılım, şerit, Barlow rakamları korunur; kaybolanlar kopyalar ve üçüncül listeler.

---

## 7. Ana sayfa height-budget önerisi

Kural: `main` = `100dvh − üst nav`; `grid-template-rows: auto minmax(0,1fr) auto auto`; iç listeler kendi içinde kırpılır (`min-height:0`), sayfa kaydırılmaz. Bütçeler ölçülen 56px nav'a göre.

| Bölge | 1280×800 | 1366×768 | 1440×900 | 1440×1080 |
|---|---|---|---|---|
| Üst navigasyon | 56 | 56 | 56 | 56 |
| Yönetim özeti satırı (endeks + 3 sayaç + yaklaşan) | 64 | 64 | 72 | 80 |
| Ana alan (müdahale listesi ‖ ana grafik ‖ sağ tip paneli) | **404** | **372** | **480** | **620** |
| Alt durum satırı (bilinmeyen kapsamı · veri tazeliği · kaynak) | 32 | 32 | 36 | 36 |
| Santral kart şeridi | 148 | 148 | 176 | 200 |
| Footer (kompakt) | 28 | 28 | 32 | 32 |
| Aralıklar (4×) | 68 | 68 | 48 | 56 |
| **Toplam** | **800** | **768** | **900** | **1080** |

Sütun genişlikleri (ana alan): sol müdahale 400 / orta grafik esnek / sağ panel 300 (1280'de 360/esnek/280). 1080 yüksekliğinde ekstra alan grafiğe gider; takvim/akış geri **gelmez** (üçüncül kararı her viewport'ta aynı). 1024–1279: sağ panel ana alanın altına 120px'lik satır olarak iner; şerit 132px; toplam bütçe korunur, kaydırma yalnızca müdahale listesinde. ≤1023: tek sütun, kaydırma serbest (dokunmatik istisnası).

Doğrulama kapısı: 4 viewport'ta `document.scrollHeight === innerHeight` ve `.ab-b-serit` tamamen görünür — mevcut `olcek-ekran.mjs`'e eklenir.

---

## 8. Uyum / Varlık / Risk yeniden yapılandırma önerisi

Ortak: hepsi tek kabuğa geçer (Bölüm 5), Saha'nın tipografisi/aksanı/panel gramerini alır; **Saha düzenini kopyalamaz** — Saha "tek ekran yönetici bakışı", bunlar "kaydırılabilir operasyonel çalışma yüzeyi"dir.

### Uyum — "Nerelerde uyumsuzuz ve neden?" (arketip A4)
- Üst: künye zinciri (Çerçeve → Kontrol) + özet satırı (Uygun 36 · Kısmi 18 · Uygunsuz 8 · Endeks %73 · **Ölçülmedi n**) — ölçülmemiş görünür olur.
- Boş "Eğilim" şeridi: veri yoksa **çizilmez**, yerine "ilk anlık görüntü … tarihinde alınacak" tek satır not (durum: ölçülmedi).
- Matris: sabit başlık + sabit kontrol sütunu; santral başlıkları tek satır kısa kod (KZD-3) + ipucunda tam ad; sütun genişliği eşit; satıra tıklayınca 400px gerekçe çekmecesi (neden, kanıt tazeliği, sorumlu, CAPA bağı).
- Sol dizin **filtre paneline** dönüşür (çerçeve, kontrol ailesi) — navigasyon değil; 212 → 200px, ≤1279'da açılır menü.
- "Okuma anahtarı" lejantı matris başlığının sağına tek satır.

### Varlık — "Hangi varlıklar ve bağımlılıklar risk yaratıyor?" (A5 + A6)
- Varsayılan görünüm **tablo** (semantik, sabit ilk sütun, 52/347 sayacı, 39 ölçülmemiş görünür); "İlişki görünümü" ikinci kip.
- İlişki kipi ilk açılışta boş 7 sütun göstermez: en riskli 5 varlığın zinciri **önceden seçili** gelir; boş halka "seçin" yerine "bu varlık için … kaydı yok" der (veri yok ≠ seçilmedi).
- Filtre çubuğu tek satır: sinyal segmentleri + santral + tür + kritiklik + arama; ikinci satır kalkar.
- Ray kalkar; Varlık ikincil satırı (5 grup) gelir. Zincir künyesi: Santral → Sistem → Varlık → Zafiyet → Risk → Kontrol → CAPA.
- Sağlık/ömür/yedek/kimlik/tedarikçi aynı `Kutuk` şablonu; kolonlar farklı, davranış aynı.

### Risk — "Hangi risk önce ele alınmalı ve onu ne çözecek?" (A5)
- Kendi alanı (P0-4). Üst: "5 kritik risk açık" başlığı korunur (iyi), yanında En yüksek 16/25 · Gecikmiş 2 · Kabul 3 · Sahipsiz 2 · **Ölçülemeyen 1**.
- Isı haritası: sıfır hücreler boş kalır (rakam yazılmaz), yalnızca dolu hücrelerde sayı; ölçülemeyen ayrı taramalı hücre; harita 5×5 → 200px, listenin üstünde değil **yanında**.
- Liste: skor · başlık · santral · kontrol · sahip · **çözecek CAPA / durum** sütunu (bugün yok — "onu ne çözecek?" sorusunun cevabı). Satır → çekmece: gerekçe, bağlı bulgu, CAPA, kabul kararı, kaynak.
- CAPA rotası Uyum ile paylaşılır; iki alandan aynı kayıt.

### Portföy — "Filo genelinde nerede sorun veya fırsat var?" (A2)
Yapısı korunur (zaten B dili). Saha'dan kalkan uygunsuzluk akışı ve tam "değerlendirilmemiş" listesi buraya gelir; 81 adet <11px metin gözden geçirilir.

---

## 9. Footer önerisi

İki ayrı semantik bölge; ikisi de tüm rotalarda aynı bileşenden gelir.

**A. Kurumsal footer — `<footer class="ab-alt">` (`role="contentinfo"`)**
- Yükseklik: kompakt 28–32px (Saha, Portföy, tam ekran harita) / standart 44px (kaydırılabilir sayfalar); tek satır, hairline üst çizgi, zemin `--zemin`, metin `--i3`, 11px Inter/mono karışımı.
- İçerik soldan sağa: `Zorlu Enerji Yönetişim Platformu` · `v{sürüm}` · `{ortam: ÜRETİM/TEST}` ‖ Yardım · Destek · Gizlilik · Kullanım koşulları ‖ `© 2026 Zorlu Enerji` · KVKK/iletişim.
- Dokunmatikte iki satıra kırılır; baskıda gizlenir; `SistemSayfasi`/`global-error` kendi dip metinlerini bu bileşenden alır.
- Tasarım dili: kabuğun hairline/mono grameri; düğme yok, ikon yok, renk vurgusu yok (aksan kullanılmaz → durumla karışmaz).

**B. Sistem durumu — `<section class="ab-durum-ayagi" aria-label="Sistem durumu">`**
- Footer'ın **üstünde**, ayrı bölge; bugünkü A kabuk "Bağlayıcı durumu" ayağının tüm rotalara genellenmiş hali (32px).
- İçerik: veri tazeliği ("son senkron 14:32"), bağlayıcı durumu (glif + ad), kaynak/kesit durumu ("veri kesiti yok" başlıktan buraya iner), ortam farkı varsa uyarı.
- Kaydırılabilir sayfalarda sabit (sticky) değil; Saha'da bütçedeki "alt durum satırı" bu bölgedir.

---

## 10. Benchmark ekran listesi

Yeniden tasarım bu 5 ekranda "ispatlanır"; her biri bir arketipi temsil eder ve onaydan sonra kalan rotalar arketipini devralır.

| # | Ekran | Arketip | Neyi ispatlar | Onay ölçütü |
|---|---|---|---|---|
| B1 | `/` Saha | A1 amiral | Tek viewport, katmanlı öncelik, fotoğraf + şerit | 4 viewport'ta scroll 0; 5 bölge; kopya 0 |
| B2 | `/tesisler/[id]` Santral 360 | A3 | Amiral → operasyonel geçiş, künye zinciri | Aynı font/aksan; sekmeler URL'de |
| B3 | `/uyum` Matris | A4 | Sabit başlıklı matris + çekmece, ölçülmedi dili | Başlıklar tek satır; Arial yedeği 0 |
| B4 | `/envanter` Varlık | A5+A6 | Semantik tablo, ilişki kipi, 5 gruplu ikincil nav (ray yok) | `<table>` + `aria-sort`; ilk açılış boş değil |
| B5 | `/riskler` Risk | A5 kütük şablonu | Kendi alanı, "ne çözecek" sütunu, ısı haritası sadeleşmesi | Aynı şablon Bulgu/Denetim/Proje'ye 0 ek tasarımla uygulanabilir |

Footer + sistem durumu bölgesi B1 ve B4'te birlikte gösterilir (tam ekran ve kaydırılabilir örnek).

---

## 11. Kredi-optimize execution planı

Kural seti: tek denetim (bu belge), tek yön, arketip bazlı üretim, kilometre taşında render, değişmeyen ekran tekrar analiz edilmez, kabul edilen karar yeniden tartışılmaz, tam QA yalnızca sonda.

| Faz | İş | Çıktı | Render noktası | Kapı |
|---|---|---|---|---|
| **0 · Onay** | Bu denetimin ve Bölüm 4–9 kararlarının onayı | Onaylı yön | — | Ürün sahibi "devam" |
| **1 · Sistem** | Tek kabuk: `data-yon` → `data-yogunluk`; font 7→3, aksan/zemin tek; 4 kırılma noktası; durum glifi tek; 10 boş-durum primitifi; footer + durum ayağı bileşeni; `Kutuk` ve semantik `Tablo` şablonu; `buyukHarf(tr)`; skip-link. DESIGN.md güncellenir. | Kod + DESIGN.md | **Yok** (yalnızca `tasarim:kapi` + `lint` + `test`) | Kontrast 0 kusur, eski iz 0, lint 0 uyarı |
| **2 · Benchmark** | B1 Saha (yükseklik bütçesiyle) → B3 Uyum → B4 Varlık → B5 Risk → B2 Santral 360 | 5 ekran | **1 tur**: 5 ekran × 1366×768 + Saha × 4 viewport | Bölüm 10 ölçütleri; `scrollHeight===innerHeight` kapısı |
| **3 · Arketip yayılımı** | A5 kütük şablonu → 15 rota; A7 tezgâh → 6 rota; A8 → 8 rota; A2 Portföy düzenlemesi | Kalan 39 rota | **Yok** ara render; `rota:duman` (38 rota 200) | Duman 38/38, `iz-tarama` 0 |
| **4 · Hedefli doğrulama** | Yalnızca değişen arketip başına 1 örnek + dokunmatik 900px × 3 ekran + Türkçe metin test dizisi | Ekran seti | **1 tur** (≈10 görüntü) | `tasarim:tasma` 0, `tasarim:erisim`/axe kritik 0 |
| **5 · Tam QA** | `demo:build` (duman + yayın + statik + kolon), `gorsel-regresyon` altın güncelleme, Lighthouse a11y | Rapor + PR | **1 tur** altın seti | Tüm kapılar yeşil; PR açık, merge ürün sahibinde |

Kilitli (yeniden açılmaz): 5 birincil alan adı, bakır aksan, Barlow/Inter/JetBrains, radius 0, tek karanlık tema, footer ≠ durum ayağı, takvim/akış Saha'dan çıkar, Risk kendi alanı, ray kalkar.
Kasıtlı yapılmayanlar: açık tema, ikon kütüphanesi, mobil-öncelikli düzen, 3–5 varyant, her adımda tam site render.

Tahmini render bütçesi: toplam **3 ekran görüntüsü turu** (Faz 2, 4, 5); bu denetim için 1 tur zaten kullanıldı.

---

*Bu belge onaylanmadan Faz 1'e geçilmez. Onay sonrası ilk iş: Faz 1 sistem birleştirmesi (tek PR), ardından B1 Saha.*
