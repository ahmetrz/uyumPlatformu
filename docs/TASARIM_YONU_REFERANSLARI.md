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

## 5. Kapsam kararı (18 Eylül 2026)

**Tasarım sistemi yeniden kurulur; bilgi mimarisi KORUNUR.**

Kapsama giren: jetonlar, tipografik ölçek, yoğunluk, component grameri
(tablo · çekmece · boş durum · durum işaretleri · form · çekirdek kabuk).

Kapsam dışı ve bilinçli olarak dokunulmaz: rota kümesi, gezinme modeli ve
ekranların birincil işleri. Bunlar kabul edilmiş kararlardır
(`credit-efficient-enterprise-design-execution` §9: kilitli kararlar yeniden
tartışılmaz) — Saha'nın birincil işi "müdahale" 17 Eyl 2026'da ölçümle
karara bağlandı ve bu turda yeniden açılmaz.

Sonucu şudur: **Faz 1 sıfırdan ürün audit'i DEĞİLDİR.** Ürün audit'i
zaten koşuldu; bu turda koşulan şey, tasarım sistemi katmanının
**delta audit'idir** — belgedeki sistem ile koda GERÇEKTEN girmiş sistem
arasındaki sapma.

## 6. Faz 1 · tasarım sistemi delta audit'i — ÖLÇÜLDÜ (18 Eylül 2026)

Yöntem: `app/kabuk.css` + `app/globals.css` (4 835 satır), **yorumlar
çıkarılarak** taranır — gerekçe metinlerindeki sayılar ölçümü kirletmesin.

| Eksen | `DESIGN.md` beyanı | Kodda ölçülen | Sapma |
| --- | --- | --- | --- |
| font-size | **7** kademe | **23** benzersiz değer · 234 bildirim | **16 kademe beyan dışı · 82 bildirim (%35)** |
| font-weight | 2 (400 · 500) | 5 (300 · 400 · 500 · 600 · 700) | 3 ağırlık beyan dışı · 31 bildirim |
| letter-spacing | 4 | **12** benzersiz | 8 beyan dışı |
| line-height | 6 | **19** benzersiz | 13 beyan dışı |
| hex renk | jetonlar | 25 benzersiz · 35 bildirim | küçük; renk katmanı büyük ölçüde SAĞLAM |

### 6.1 Asıl bulgu: ölçek KARŞITLIK taşımıyor

Sapmanın sayısı değil, **dağılımı** kusurdur:

```
11px ×104   ← bütün bildirimlerin %44'ü tek kademede
12px  ×27
12.5px×21
13px  ×21
13.5px ×4
14px   ×8
```

**Üç piksel aralığında altı kademe var.** 12 ile 13,5 arasındaki fark hiçbir
okuyucuya hiyerarşi anlatmaz; yalnız aynı şeyi söylemenin altı yolunu üretir.
Karşı uçta 26px'in üstü neredeyse boş (34px×3 · 42px×1). Yani ürünün
tipografisi **ortada yığılmış, uçlarda seyrek** — Saha turunda ölçülen
"manşet 68px, eylemli satır 13px" kusuru bu dağılımın tekil belirtisiydi,
sebebi değil.

Referans #15'in bu belgeye girme gerekçesi tam olarak budur ve ölçüyle
eşleşiyor: onun sinematik etkisi 3B'den değil, **ölçek karşıtlığından**
geliyor. Renk katmanı sağlam olduğu için yeniden kurulacak asıl şey
tipografik ölçek ve yoğunluk gramerridir — palet değil.

### 6.2 Bu bir kapı önerisidir, henüz kapı değildir

Yukarıdaki sayılar bugün **hiçbir kapı tarafından tutulmuyor**: `DESIGN.md`
jeton bekçisi jetonun DEĞERİNİ koruyor, kodun o jetonların DIŞINA çıkıp
çıkmadığını ölçmüyor. Faz 2'nin çıktısı yalnız yeni bir ölçek değil, o
ölçeği tutan bir **cırcır** olmalıdır (beyan dışı kademe sayısı tavan,
yalnız küçülür) — yoksa yeni sistem de altı ay içinde 23 kademeye döner.

## 7. Faz 2 · tipografik ölçek yeniden kuruldu — ÖLÇÜLDÜ (18 Eylül 2026)

Faz 1'in bulgusu "23 kademe" idi; Faz 2'ye başlarken ölçüm **keskinleşti** ve
hedefi değiştirdi. Jeton katmanı zaten VARDI:

| | Önce | Sonra |
| --- | --- | --- |
| `font-size` bildirimi (gerçek evren) | 682 | 682 |
| **jetondan geçen** | **223 (%33)** | **671 (%98)** |
| tipografi jetonu | 15 | **8** |
| jetonun işaret ettiği benzersiz değer | 10 (iki çakışma) | **8 (çakışma yok)** |

Yani yapılacak iş yeni bir ölçek İCAT ETMEK değil, var olanı sadeleştirip
ürünün üçte ikisini ona bağlamaktı. İki jeton grubu aynı değere çakışıyordu
(dördü 11px, üçü 12,5px) ve `--t-code-lg` adında "büyük" diyip `--t-code` ile
aynı değeri taşıyordu — adın vaat ettiği ayrımı değer vermiyordu.

**Yeni ölçek sekiz kademe, her kademe tek rol**, oranlar üste doğru hızlanıyor:

```
10 → 11 (1,10)   11 → 13 (1,18)   13 → 16 (1,23)   16 → 21 (1,31)
21 → 28 (1,33)   28 → 40 (1,43)   40 → 58 (1,45)
```

Küçük uç BİLEREK dokunulmadı: 11px 104 bildirimlik iş atıdır ve ürün
1366×768'de tek ekran bütçesiyle çalışır. Karşıtlık küçük ucu şişirerek değil,
üst ucu açarak ve ortadaki tekrarı eriterek kuruldu — referans #15'in katkısı
tam olarak buraya düştü.

### 7.1 Kapının İLK yazımı KÖR DOĞDU ve bu bir bulgudur

Yazdığım bekçi önce yalnız `app/kabuk.css`e bakıyordu ve **"sapma 0"** diyordu.
Tarayıcıda ölçünce `/uyum` ekranında 11,5px ve 12px kademeler GÖRÜNDÜ. Sebep:

- **TSX satır içi `style={{ fontSize: 'var(--t-…)' }}` — 305 başvuru, 50
  dosya.** Jeton adlarını değiştirince hepsi tanımsız değişkene düştü; tanımsız
  `var()` özelliği geçersiz kılar ve öğe kalıtımla gelen boya döner. **Ekran
  sessizce bozuldu, kapı yeşil kaldı.** Regresyonu ben ürettim.
- `components/giris/giris.module.css` — 15 bildirim, kapının evreninde hiç yoktu.

Gerçek payda 360 değil **682**'ydi; kapı %47'sini görmüyordu. Bu deponun dört
kez ölçtüğü sınıftır: *payda kör olduğunda oran her zaman iyi görünür.* Bugün
tarama üç yüzeyi birden gezer ve **tanımsız jeton başvurusu ayrı bir diştir**
(altıncı diş) — ekranda görünmesini beklemek geç kalmaktır.

### 7.2 Ölçek değişiminin gerçek tasarım sonucu

Bir kırmızı test kusuru değildi: `.ab-hesap-menu [role='menuitem']` 12,5px'ten
13px'e çıkınca "13px ve üstü büyük harf yalnız gezinme ve koddur" kuralının
eşiğinin ÖNÜNE geldi. Karar gevşetme değil: o yüzey `role="menu"
aria-label="Hesap"`tır, kalemleri Profil · Ayarlar · Çıkış — ad, cümle ya da
değer değil, **gezinme**; kardeşi `.ab-bolum-menu [role='menuitem']` aynı
gerekçeyle ve daha büyük bir kademede (16px) zaten listedeydi. Kuralın istisna
kategorisi bu satırı hep kapsıyordu, yalnız eşiğin altında olduğu için
görünmüyordu.

## 8. Faz 3 · disiplin iki eksene daha yayıldı — ÖLÇÜLDÜ (18 Eylül 2026)

Faz 3'ün kapsam kararı "component grameri" idi (tablo · çekmece · boş durum ·
durum işaretleri). Ölçüm o kapsamın **üç dörtlüsünü dayanaksız çıkardı** ve bu
bir bulgudur — kapsamı sessizce daraltmak yerine yazılı olarak yönlendirdim:

| Aday | Ölçüm | Karar |
| --- | --- | --- |
| Boş durum | eylemsiz 0 · nedensiz 1, üç sınıfta da SIFIRDA KİLİTLİ (R-G eki) | dokunulmaz |
| Durum işaretleri | `Im`/glif tek kaynak, `null` = kapsam dışı ayrımı kurulu | dokunulmaz |
| Çekmece | tek bileşen ailesi (`Cekmece*`), ayrışma ölçülmedi | dokunulmaz |
| Tablo | **bulgu var** — aşağıda | kapı yazıldı |

Sağlam olan yeniden kurulmaz. Faz 3 bunun yerine Faz 2'nin ölçtüğü ama
kapatmadığı sapmaya gitti: **jeton disiplini yalnız BOY eksenindeydi.**

| Eksen | Bildirim | Benzersiz değer (önce) | Jetondan geçen (önce → sonra) |
| --- | --- | --- | --- |
| boy `--t-*` | 682 | 23 | %33 → **%98** (Faz 2) |
| harf aralığı `--tr-*` | 104 | 20 | %15 → **%100** |
| satır aralığı `--lh-*` | 83 | 25 | %5 → **%94** |

Kusur üç eksende de aynıydı ve Faz 2'nin kusuruyla aynı sınıftı: jeton katmanı
VARDI, ürün onu kullanmıyordu; üstelik `--tr-section` · `--tr-screen` ·
`--tr-board` **üçü de `-.01em`** taşıyordu — üç ad, tek değer. Bugün beşer rol
var, çakışma yok ve üç eksen de aynı sekiz dişli kapıdan geçiyor
(`tests/bekci/tipografi-olcegi.test.ts`, URN-TIP-001).

`1,15` ile `1,2` **tek role indi**: %4'lük bir fark hiçbir okuyucuya hiyerarşi
anlatmaz. Satır ekseninin jetona zorlanmayan beş bildirimi sınıfıyla beyanlıdır
— dördü kutu geometrisi (sabit yükseklikli rozet/düğmede dikey ortalama
aracıdır, tipografik satır aralığı değil), biri ölçülmüş bir karar (`.92`,
SIS-KBK-031).

**Ölçüm tabanı da kusurluydu ve düzeltildi:** taban yalnız `boy` eksenindeydi,
yani iz ya da satır tarayıcısı sıfıra düşse kapı yeşil kalırdı. Bugün taban
EKSEN BAŞINADIR (682 · 104 · 83).

### 8.1 Tablo bulgusu — göç planı yanlış soruyu soruyordu

İlk ölçüm `<Tablo>` 46 dosyada, `<VeriTablosu>` 7 dosyada dedi ve bu "iki rakip
bileşen, 48 ekran göç edecek" diye okunacaktı. **Kaynağı okuyunca dayanaksız
çıktı:** `Tablo` bir rakip değil, `VeriTablosu` üzerine SARMALAYICIDIR — eski
satır biçimini kolon biçimine çevirip çizimi ona bırakır. 48 ekranı "göç
ettirmek" aynı yolu ikinci kez çağırmak olurdu.

Gerçek kusur altı ham `<table>` bildirimindeydi ve **beşi haklıydı** (baskı
karnesi · fark tablosu · yardım çizelgesi · kontrast matrisi ×2 — her biri
kendi gramerini taşıyor, paylaşılan CSS'e dokunmuyor). Altıncısı bulgudur:
`tedarikciler/loading.tsx` paylaşılan sınıfı (`ab-vt`) ELLE yazıyor. Paylaşılan
CSS'i miras aldığı için ekranda doğru görünür, `VeriTablosu`nun kendi iskelet
dalıyla hiçbir bağı yoktur ve biri değişirse öbürü değişmez. Kopya bilinçlidir
(Suspense yedeği `'use client'` bileşeni çağıramaz); bedeli artık ÖLÇÜLÜYOR —
yapısal sözleşmesini kaybederse kapı kırmızı (`tests/bekci/tablo-grameri.test.ts`,
URN-TBL-001, altı diş).

### 8.2 Sabotaj iki kez kendi kapımı düzeltti (R-E)

Yedi yeni sabotajın biri kırmızı yakmadı: *Matris ızgarasının tablo rolünü
düşür.* Diş, rolün kaynakta **bulunmasını** ölçüyordu; konu sütununun rolü
silindiğinde veri sütunlarının rolü hâlâ oradaydı ve kapı yeşil kaldı. Bu,
deponun kütüğünde adı konmuş sınıftır — *"kapı yalnız maddenin VARLIĞINI
ölçüyordu"*. Düzeltme: her kolon kaşı tek tek ölçülür. İkinci tur **7/7**.

Aynı dişin ÖNCEKİ yazımı da yanlıştı ve onu kapının kendisi buldu: `Matris`in
de `VeriTablosu` çağırdığını VARSAYMIŞTIM. `Matris` bir `<table>` değil, ARIA
rolleriyle tablo olan bir CSS ızgarasıdır — sütun sayısı veriden geldiği için.
Varsayım kaynağa bakılarak düzeltildi.

### 8.3 Faz 2'den sağ kalan ölü satır

`DESIGN.md` hâlâ `- **Display** (A/B 500, 26px, 1.15 …)` maddesini taşıyordu:
ölçek 28px ve 1,2 iken **iki değer de yanlış**. İki parti hayatta kalmasının
sebebi ölçüldü — `tests/uyum-odak.test.ts` "cümle düzeni kararı belgede
yazılıdır" iddiasını **eski kademe adına** çakılı sınıyordu, yani ölü satırı
canlı tutan şey kapının kendisiydi. Kapı bugün jetona (`--t-ekran`) bağlanır ve
`**Display**` ibaresinin YOKLUĞUNU ayrıca ölçer.

## 9. Saha rayı kendi bandına çekildi — ÖLÇÜLDÜ (19 Eylül 2026)

Kullanıcı Saha şeridini **üç kez** bildirdi: görsel boyları (15 Eyl),
kaydırma çubuğu (15 ve 18 Eyl). İlk iki tur çubuğu ve şeridin uzunluğunu
düzeltti; üçüncüde soru değişti — "hangisi fazla, sen karar ver".

### Bölge denetimi (1914×900, gerçek tarayıcı)

| Bölge | Alan | Metin parçası | Etkileşimli |
| --- | --- | --- | --- |
| takımyıldız | 691k px² | 54 | 9 |
| tesis şeridi | **304k px²** | 38 | 9 |
| dikkat paneli | 228k px² | 32 | 5 |
| ├ müdahale listesi | 137k px² | 25 | 5 |
| ├ öncelik şeridi | 122k px² | 21 | 4 |
| └ eğilim | 6k px² | 1 | 0 |
| tip paneli | 171k px² | 21 | 1 |
| durum şeridi | 50k px² | 10 | **0** |

İlk koşumda `dikkat paneli` ve `öncelik şeridi` "YOK" döndü — **seçicilerim
yanlıştı, bölgeler değil**. Bir denetimde okunamayan bölge sıfır sayılamaz
("bilinmeyen ≠ sıfır"); seçiciler düzeltilip tablo yeniden ölçüldü. Payda
kör olduğunda oran her zaman iyi görünür.

### Bulgu: şeridin sekiz bağı takımyıldızın sekiz bağıydı

Şeridin `/tesisler/<id>` hedeflerinin **kimlik kümesi**, takımyıldızın
hedefleriyle birebir aynıydı — altı bantta da (1914 · 1366 · 1280 · 1024 ·
768 · 390). Yani şerit hiçbir bantta tek seçici değildi.

### Kaldırıldı — sonra GERİ ALINDI: kod kendi karşı ölçümünü taşıyordu

Şerit tümüyle kaldırıldı (bölüm + `SahaKarti` + kütük modülü). Sonra
`kabuk.css`te 17 Eylül'de yazılmış bir not okundu:

> KALDIRILMADI ve sebebi ölçüldü: 1024 ve 375'te tuval künyeleri
> çizilmiyor — tesis **adlarının** okunduğu tek yüzey bu ray.

Not haklıydı ve benim ölçümüm o eksende **kördü**: hedef saydım, görünür
**ad** saymadım. Yeniden ölçüldü ve sınır iki pikselde kesin çıktı:

| Bant | Künye | Güçsüz şerit | Ray | **Raya özgü ad** |
| --- | --- | --- | --- | --- |
| 1101px | 4 | 4 | 8 | **0** |
| 1100px | 0 | 4 | 8 | **4** |

1101'de ray ekrana tek bir yeni ad katmıyor; 1100'de en kötü dört tesisin
(Saha A-3 · C · A-2 · D) adının okunduğu **tek** yüzey. "Tekrar, bilgi
kaybına tercih edilir" dengesi geniş bantta hiç kurulmuyormuş: orada kayıp
yoktu, yalnız tekrar vardı.

Ray bu yüzden **kaldırılmadı, bandına çekildi**: `≥1101px` gizli, `≤1100px`
görünür. Eşik künyeyi susturan kuralın (`max-width: 1100px`) bitişiğidir.
Geniş bantta ray başlığı da gizlendiği için portföyün sayısı ve güç toplamı
takımyıldızın başlığına taşındı (orada "uyum × güç" duruyordu — eksen
adlarının dördüncü kanalıydı).

### İki eşik, iki kapı

Eşikler ayrı dosyalarda durur; ayrışırlarsa arada **dört adın ekrandan
tümüyle kaybolduğu** bir pencere açılır ve iki kural da tek başına doğru
olduğu için hiçbir kapı görmez ("tek tek doğru, BİRLİKTE tutarsız").

- `tests/bekci/saha-serit.test.ts` beşinci diş — eşiklerin **bitişikliği**
- `arac/tuval-kanit.mjs` — iki bantta **okunan ad kümesinin eşitliği**,
  gerçek tarayıcıda (15 → 22 iddia)

Sabotaj: eşik 1101 → 1000 çekilip **yeniden derlendi**; kapı kırmızı yandı ve
kaybolan dördü **adıyla** yazdı. Üç kaynak sabotajının üçü de yaktı
(yakmayan sabotaj: **0/4**).

### Kaldırılmayanlar ve sebepleri

- **durum şeridi** (50k px², 0 etkileşimli): eyleme dönmüyor ama ekrandaki
  bütün sayıların köken uyarısıdır ("bağlayıcı 7 · kimlik bekliyor 6 · son
  başarılı koşu —"). Doğru semantik, kullanılabilirliğin üstündedir.
- **tip paneli** (171k px², 1 etkileşimli): takımyıldızın cevaplamadığı ayrı
  bir soruyu cevaplıyor — hangi üretim tipi zayıf.

## 10. Açık kalan

- #13'ün hareket grameri henüz **hiçbir arketipte denenmedi**; yukarıdaki
  "girer" kararı, denenmeye değer olduğu kararıdır, çalıştığı kararı değildir.
