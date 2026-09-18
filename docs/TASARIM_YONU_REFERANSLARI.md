# Tasarım yönü · referans değerlendirmesi

Onbeş açık kaynak referans, yeniden tasarım sürecine girip girmeyeceklerine göre
değerlendirildi (18 Eylül 2026). Bu belge **ilham listesi değildir**: her satır
bir karar taşır ve kararın gerekçesi ölçümdür.

## 0. Neden süzgeç gerekiyordu

Referansların onikisi **portfolyo / vitrin** işidir. Onların başarı ölçütü
"ziyaretçi etkilendi ve kaldı"; bu ürünün ölçütü "uyum sorumlusu bugün
dokunması gereken bulguyu buldu ve eylemi tamamladı". Saha ekranının birincil
işi ölçülerek karara bağlandı (17 Eyl 2026): **müdahale**. Gezinmeyi oyuna
çeviren bir yön, bu işin tam tersidir — güzel olduğu için değil, *yanlış işi
kolaylaştırdığı* için dışarıda kalır.

Süzgeç üç kaynaktan gelir ve üçü de bu depoda zaten yazılıdır:

1. `web/DESIGN.md` → hareket doktrini: geçişler 0,15s; sürekli hareket yalnız
   üç yerde; hepsi `prefers-reduced-motion: reduce` altında durur ve
   `arac/erisim.mjs` azaltılmış kipte çalışan animasyon **arar**.
2. `docs/SINEMATIK_GIRIS.md` → sinematik hırs bu üründe yasak değildir, ama
   **karantinalıdır**: giriş ekranına sınırlı, otomatik oynatma yok, tamamlanınca
   sahne tıklama hedefi olmaktan çıkar ve gerçek arayüz devralır.
3. `.claude/skills/enterprise-ux-product-design-auditor` → "generic SaaS
   dashboard yaratma"; aşırı kart, gauge, donut, gradient, glassmorphism, neon
   yasağı; durum semantiği (bilinmeyen · sıfır · ölçülmedi · bağlı değil) asla
   görsel olarak birleştirilmez.

## 1. Ne ölçüldü

| Ölçüm | Nasıl |
| --- | --- |
| Lisans | `raw.githubusercontent.com` üzerinden `main`/`master` × `LICENSE*` taraması, onbeş deponun tamamı |
| Sayfa ağırlığı · istek · canvas · görünen metin | Üretim tarayıcısı, 1440×900, `load` + 6 sn bekleme (`arac/` dışı, tek seferlik betik) |
| Görsel/hareket paketi sayısı | Sığ klon + `package.json` bağımlılık sayımı |

**Ölçülmedi ve öyle yazılıyor:** onbeş demonun görsel kalitesi tek tek
gezilmedi; dördü yakalandı, ikisi göz ile incelendi. Kalanların görsel
iddiası, listedeki tarifleriyle ve depo içerikleriyle değerlendirildi —
bağımsız doğrulama yapılmadı.

### 1.1 Lisans — iki depo kırmızı

Onbeşin onüçü MIT. İkisinde standart yollarda lisans dosyası **yok**:

| Depo | Bulgu | Sonuç |
| --- | --- | --- |
| `brunosimon/folio-2025` | `LICENSE*` bulunamadı | Varsayılan "tüm hakları saklı". **Koddan alıntı yapılamaz.** Listenin 10/10'u budur. |
| `barvian/CodropsCarousels` | README "MIT" diyor, dosya yok | Beyan ile depo çelişiyor. **Kod alınmaz**, yalnız fikir. |

Bu, bu depoda ciddiye alınan bir sınıftır: telifli metin kaçağı izlenen bir
kusur türüdür ve görseller `KUNYE.md` atıf disiplinine tabidir. MIT olanlardan
kod alınırsa telif satırı korunur ve künyeye işlenir.

### 1.2 Ağırlık — 1440×900, üretim sitesi

| Referans | canvas | Bildirilen bayt | İstek | Görünen metin | Görsel paket |
| --- | --- | --- | --- | --- | --- |
| Ethan Piboyeux (#15) | **0** | **0,6 MB** | 13 | 434 karakter | **1** |
| Staggered 3D Grid (#13) | **0** | 2,0 MB | 42 | 389 karakter | — |
| Bruno Simon (#1) | 1 | 4,8 MB | 98 | **0 karakter** | — |
| ITom (#4) | 1 | **13,7 MB** | **281** | 23 817 karakter | — |
| Giats (#6) | — | — | — | — | **9** (fizik motoru dâhil) |

İki satır tek başına karar veriyor. **Bruno Simon'da görünen metin sıfırdır** —
ekran okuyucuya ve metin arayan herhangi bir yardımcı teknolojiye hiçbir şey
sunmaz; bu ürün axe kapısı taşır. **ITom 13,7 MB ve 281 istektir** — bir uyum
sorumlusunun günde onlarca kez açtığı bir yüzeyde bu bir bütçe değil, bir
maliyettir.

## 2. Karar

### 2.1 Sürece GİRER (üç)

| # | Referans | Ne olarak girer | Ölçülmüş gerekçe |
| --- | --- | --- | --- |
| 15 | Ethan Piboyeux | **Yön referansı** | canvas 0 · 0,6 MB · tek görsel paket. Sinematik etkiyi 3B'den değil sanat yönetiminden alıyor: koyu zemin, saç çizgisi ayırıcı, devasa tipografi ile 12px gövde arasında sert ölçek karşıtlığı, tek aksan rengi. Bu ürünün `DESIGN.md`'si zaten bu ailededir — yani bu referans mevcut yönü **değiştirmez, doğrular ve keskinleştirir**. |
| 7 | 14islands scroll-rig | **Mimari kural** (kütüphane DEĞİL) | Taşınan şey şudur: *DOM tek gerçek kaynaktır, canvas ona senkronlanan bir katmandır.* Bu ürüne GPU görselliği girecekse tek güvenli yol budur — düzen, erişilebilirlik ve kapılar DOM'da kalır. Kütüphanenin kendisi beş ağır paket getiriyor (three · R3F · drei · react-spring · scroll-rig); **bağımlılık olarak alınmıyor**, kural olarak alınıyor. |
| 13 | Staggered 3D Grid | **Sınırlı hareket grameri** | canvas 0, 2,0 MB, GSAP. Izgara öğelerinin toplu değil *ritimli* geçişi; bu üründe ızgara ve tablo çok. Kabul koşulu: hareket **değişimi anlatır**, süs değildir; `prefers-reduced-motion` altında tümüyle durur; düzen sıçraması üretmez. |

### 2.2 Fikri alınır, kodu ALINMAZ (iki)

| # | Referans | Fikir | Neden yalnız fikir |
| --- | --- | --- | --- |
| 8 | Repolis | Yapılandırılmış veriyi liste yerine *kuralları olan bir yerleşim* olarak anlatmak | Ürün bunu zaten yapıyor (Saha takımyıldızı: uyum endeksi × kurulu güç). Referans, o dilin envanter/topoloji yüzeylerine genişletilmesi için emsaldir — yeni bir yön değil. |
| 9 | CSS-only carousels | Hareketi JS motoru olmadan, tarayıcının kendi scroll-driven animation özelliğiyle kurmak | En ucuz hareket budur ve doktrine uyar. **Lisans doğrulanamadı** (§1.1) — tek satır kod alınmaz. |

### 2.3 DIŞARIDA (on)

| # | Referans | Dışarıda bırakma gerekçesi |
| --- | --- | --- |
| 1 | Folio 2025 | İki bağımsız diskalifiye: görünen metin **0 karakter** · lisans yok. |
| 4 | ITom | **13,7 MB · 281 istek.** Kalıcı sahne fikri değerli ama bu bedelle değil. |
| 3 · 10 | Interactive Workspace · Island | Gezinmeyi keşif oyununa çeviriyor; ürünün birincil işinin (müdahale) tam tersi. |
| 2 · 5 · 11 · 12 · 14 | Viscose · Cherry Tree · 3D Carousel · Image Expansion · 3D Grid Preview | Galeri/vitrin gösterisi. Üründe bu grameri ödeyecek bir galeri arketipi yok. |
| 6 | Giats | Dokuz görsel paket, fizik motoru dâhil. Okunabilir HTML + kalıcı 3B fikri #7'de zaten ve daha ucuz duruyor. |

**Dışarıda bırakmak "kötü iş" demek değildir.** Onu söylemek için ölçüm yok ve
gerekmiyor: bunlar kendi bağlamlarında güçlü işler. Karar, *bu ürünün birincil
işine* uygunluk kararıdır.

## 3. Sürece nasıl giriyorlar

Sıra `credit-efficient-enterprise-design-execution` skill'inin dayattığı sıradır
ve atlanmaz: **audit → tasarım sistemi → dört kıyas ekranı → arketip doğrulama →
yayma → hedefli doğrulama → tam QA.** Referanslar bu zincirin **beşinci**
halkasına girer, birincisine değil.

| Aşama | Referansın rolü |
| --- | --- |
| 1 · Audit | Referans YOK. Mevcut ekranların birincil işi, 3 saniye kavrama, tekrar ve gezinme maliyeti ölçülür. |
| 2 · Tasarım sistemi | #15 yalnız **ölçek karşıtlığı ve tipografik ritim** için okunur. Jetonlar `DESIGN.md`'den gelir; referans jeton getirmez. |
| 3 · Dört kıyas ekranı | #15 burada sınanır. Tek yön üretilir, varyant üretilmez. |
| 4 · Arketip doğrulama | #13'ün hareket grameri **bir** arketipte denenir, tamamında değil. |
| 5 · Yayma | #7'nin kuralı ancak burada ve ancak gerekiyorsa devreye girer. |
| 6–7 · Doğrulama | Mevcut kapılar. Yeni kapı gerekiyorsa sabotajıyla birlikte gelir. |

## 4. Yeniden tasarımın çarpacağı kilitler

Bunlar engel değil, **yeniden tasarımı güvenli kılan şeydir** — ama sırayı
belirler. Hepsi bugün sıfırda kilitli:

- `politika-cumleleri.json` — ekranın her politika cümlesi koddan türetilir,
  ölçülmeyen 0, yeni satır ölçümünü taşımak zorunda (R-F).
- `bos-durum` — 125 boş durum, eylemsiz 0, üç sınıfta da kilitli (R-G).
- DOM tanığı — kaynağı hiç okumayan ikinci popülasyon tanığı; ayrışma kırmızı.
- `DESIGN.md` jeton bekçisi — belgedeki değer koddan saparsa sabotaj yakalar.
- axe · taşma · dizüstü bandı · gezinme kapıları — dördü de tarayıcıda, bloklayıcı.

Pratik sonucu tek cümle: **ekran metni değişirse politika kütüğü ve boş durum
kütüğü aynı PR'da güncellenir**, yoksa kapı kırmızı yanar.

## 5. Açık kalan

- Yeniden tasarımın **kapsamı** karara bağlanmadı: yalnız görsel dünya mı,
  tasarım sistemi mi, yoksa bilgi mimarisi ve gezinme de mi? Üçü materyal
  olarak farklı işlerdir ve bu belge üçünde de geçerlidir.
- #13'ün hareket grameri henüz **hiçbir arketipte denenmedi**; yukarıdaki
  "girer" kararı, denenmeye değer olduğu kararıdır, çalıştığı kararı değildir.
