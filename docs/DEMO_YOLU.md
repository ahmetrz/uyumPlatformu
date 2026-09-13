# Demo yolu — sekiz ekran, sekiz dakika

Bu belge **satış materyalidir**: hangi ekran, ne söylenecek, hangi
tıklama, kaç saniye.

> **Her ekranda üst çubukta "ÖRNEK VERİ" rozeti durur** ve yazdırılan
> her sayfanın başında da bir künye olarak çıkar. Rozet kaldırılmaz,
> ekran görüntüsü alınırken kırpılmaz: kurgusal bir sayı, üstündeki
> işaret olmadan gerçek bir iddiaya dönüşür.

## Demonun tek cümlesi

> Düzenlemeye tabi bir kuruluşun BT ve OT varlıklarını, uyum
> yükümlülüklerini ve açık işlerini tek yerde tutan; **hangi sektörde
> olduğunuzu yapılandırmadan öğrenen** bir yönetişim platformu.

## Kanıtlanacak üç şey

1. **Sektör bağımsızlığı gerçek.** Aynı kurulum, aynı ekranlar, iki
   sektör — sözcük, ölçü birimi, kayıtlar ve mevzuat çerçevesi değişiyor.
2. **Bilinmeyen ≠ sıfır.** Ölçülmemiş alan "—" der; ürün bilmediğini
   bildiğini söylemez.
3. **Müşteri bir şey götürüyor.** Sekizinci ekran yazdırılabilir bir
   karnedir.

---

## Demo öncesi kontrol listesi

- [ ] Tarayıcı ≥1280px (mercek şeridi rahat okunur; her bantta çalışır).
- [ ] Mercek **Çekirdek**te başlasın — 2. adımın etkisi oradan doğar.
- [ ] "ÖRNEK VERİ" rozeti görünüyor.
- [ ] Sekiz rota da açılıyor (`npm run rota:duman`).

---

## Sıra

Portföyden tekile, tekilden karara, karardan **bırakılacak belgeye**.

| # | Ekran | Süre | Birincil soru |
| --- | --- | --- | --- |
| 0 | Açılış (sinematik giriş) | — | *bu belgenin işi değil, aşağıya bakın* |
| 1 | `/` Saha | 40 sn | Portföyümde bugün ne var? |
| 2 | Sektör merceği (üst çubuk) | 80 sn | Bu ürün bizim sektörümüz için mi? |
| 3 | `/portfoy` | 60 sn | Hangi kayıt en zayıf? |
| 4 | `/tesisler/[id]` | 80 sn | Burada ne var, ne eksik? |
| 5 | `/uyum` | 80 sn | Hangi yükümlülükte neredeyiz? |
| 6 | `/bulgular` | 70 sn | Açık iş ne, kim sorumlu, ne zaman? |
| 7 | `/riskler` | 50 sn | Neyi kabul ettik, neyi etmedik? |
| 8 | `/raporlar/karne` | 60 sn | Denetime ne göstereceğiz? |

Toplam **8 dakika 0 saniye**, geçişler dâhil.

---

### 0 · Açılış — **öbür oturumun işi**

Canlı bağlantıyı açan yabancı önce **sinematik açılışı** görür, saha
ekranını değil. O ekranın metni, kareleri ve ritmi bu turda **başka bir
oturumun** elindedir (`web/components/giris/`) ve **bu belge onun
repliğini yazmaz** — yazsaydı, sahibi metni değiştirdiği gün burada bir
yalan kalırdı.

Burada duran tek şey, açılışın demoya karşı **taşıması gereken şart**
ve devir notunun adresi:

- Ürün şartı ve ölçütleri: `docs/ACILIS_DEVIR_NOTU.md` §1 — özeti:
  *açılışta, hiçbir mercekte, o sektöre ait olmayan bir sözcük ya da
  görsel bulunmamalı.* **Bugün karşılanmıyor**: kareler jeotermal, hero
  metni sektöre özgü. Su merceğiyle demo yapacaksanız bunu bilerek yapın
  — ya açılışı atlayın (`#platform-arayuzu` bağı) ya da ilk cümlede
  söyleyin.
- Açılıştaki **sektör seçici** ve **`data-cta`** kancası: aynı belgenin
  §2'si. İkisi de demonun işleyişine bağlıdır; §2 niçin silinmemeleri
  gerektiğini ölçümle anlatır (bir kez silindiler).

Demoyu **açılıştan** başlatacaksanız 2. adımın merceği açılışta da
seçilebilir; ekranın sözcükleri o anda değişmez (kabuk henüz yok),
**ardındaki** ekran seçilmiş mercekle açılır.

### 1 · `/` Saha · 40 sn

**Söyle:** "Sabah açtığınızda gördüğünüz ekran. Tek ekrana sığar —
kaydırma yok."

**Tıklama:** yok.

**Vurgu:** ekran üç bantta da pencereye TAM oturur (768/768 · 900/900 ·
800/800 ölçüldü). Kaydırmak zorunda kalmadığınız bir özet, gerçekten
bir özettir.

### 2 · Sektör merceği · 80 sn — **demonun kalbi**

**Söyle:** "Şimdi bu kurulumun bir su işletmesine ait olduğunu
varsayalım."

**Tıklama:** üst çubuk → **Sektör: Su ve Atıksu**. Sonra **Elektrik
Üretimi**. Sonra **Çekirdek**.

**Vurgu — sayfa yenilenmedi.** Değişenler:

| | Çekirdek | Elektrik | Su |
| --- | --- | --- | --- |
| Sözcük | tesis | santral | arıtma tesisi |
| Ölçü | — | MW | m³/gün |
| Portföy | 24 kayıt | 16 kayıt · 643 MW | 8 kayıt · 342.700 m³/gün |
| Çerçeve | — | EPDK SYM | ISO 27001 / CBDDÖ |

**"Çekirdek"te dur ve söyle:** "Hiçbir sektör paketi kurulu değilken
ürün böyle görünür — 'tesis' der. Sektör sözcüğü çekirdek koda gömülü
değil."

**Çekirdekte portföy toplamı boştur** ve bu bir kusur değil: iki farklı
ölçü toplanmaz. "Yanlış bir toplamı doğru göstermektense hiç
göstermiyoruz."

> Bir sonraki ekrana geçmeden dinleyiciye merceği **bir kez daha**
> değiştirtin. Ürünün en pahalı ve en kolay kaybedilen özelliği budur.

### 3 · `/portfoy` · 60 sn

**Tıklama:** Sırala → **Uyum endeksi**, sonra **Açık bulgu**.

**Vurgu:** "en zayıf" sözcükle işaretlenir, yalnız renkle değil. Su
merceğinde bir kaydın debisi "ölçülmedi" der — telemetri hattı yok.
"Sıfır yazmıyoruz."

### 4 · `/tesisler/[id]` · 80 sn

**Tıklama:** en zayıf kayda gir.

**Vurgu:** tek kayıt, tek ekran: kimlik, kapasite, uyum, bulgu, risk,
varlık, olay. Fotoğrafı olmayan kayıt **başka bir kaydın fotoğrafını
ödünç almaz** — tipografik döşeme alır.

### 5 · `/uyum` · 80 sn

**Vurgu:**
- Su merceğinde ekran **ISO 27001 / CBDDÖ** açar; enerjiye özgü EPDK
  SYM su kapsamında **değildir**. "Aynı platform, aynı kontrol çatısı,
  sektöre uygun kapsam."
- "Kapsam dışı" gerçek bir durumdur, uygunsuzlukla karıştırılmaz.
- Yüzdenin yanında **bilinmeyen payı** yazılıdır.

### 6 · `/bulgular` · 70 sn

**Tıklama:** kritik bulguya gir.

**Vurgu:** bulgu bir cümle değil bir zincirdir: madde → bulgu → kök neden
→ aksiyon → doğrulama. Aksiyonu tamamlanmış ama doğrulanmamış bulgu
**retest bekliyor** der. Su tarafında bir olayın kök nedeni boştur —
inceleme sürüyor, uydurulmuş bir sebep yazılmaz.

### 7 · `/riskler` · 50 sn

**Vurgu:** skor **olasılık × en yüksek etki**. Su kütüğünde bir riskin
etkisi henüz değerlendirilmedi: skoru **yok**, sıfır değil. Kabul
edilen risk sahibiyle ve süresiyle kayıtlıdır.

### 8 · `/raporlar/karne` · 60 sn — **bırakılacak şey**

**Tıklama:** `/raporlar` → "Uyum karnesi" → tarayıcıdan **Yazdır**.

**Söyle:** "Ve müşteri bunu yanında götürüyor."

**Vurgu:** tek sayfa; endeks, kapsam, açık iş ve en zayıf beş kayıt.
Sözcük ve ölçü mercekten gelir. Çıktının başında "ÖRNEK VERİ" künyesi
kalır. Sayılar portföy ekranıyla **aynı formülden** gelir — iki ekran
birbirini tutar.

---

## Sormaları muhtemel üç soru

**"Bizim sektörümüz listede yok."**
Sektör bir içerik paketidir: sözlük + öznitelik şeması + kontrol çatısı.
Depoda ikisi kurulu; üçüncüsü veri işidir, kod işi değil.

**"Gerçek sistemlerimize bağlanıyor mu?"**
Bu demoda hiçbir sisteme bağlanmıyor ve bağlanmadığını **söylüyor** —
bağlı olmayan sağlayıcı "bağlı değil" der, sessizce boş göstermez.

**"Bu sayılar gerçek mi?"**
Hayır ve ekran bunu her yüzeyde yazıyor. Kurgusal veri, kurgusal
olduğunu söylediği sürece dürüsttür.

---

## Yapılmayanlar ve gerekçeleri

**Üçüncü sözlük (imalat) EKLENMEDİ.** Maliyeti ölçüldü: ikinci sektör
yalnız sözlük değildi — kendi tipleri, öznitelik şeması ve birimi, sekiz
tesis, iki uyum süreci, beş risk, dört olay, beş doküman, iki denetim,
üç proje; ayrıca beş bekçinin fikstür varsayımını kırdı. Üçüncüsü aynı
işi bir kez daha ister. Kazancı küçük: merceğin kanıtladığı cümle iki
sektörle zaten kanıtlanır. Mercek üç ve daha fazla seçeneği hâlihazırda
taşıyor; sektör eklemek kod işi değil veri işidir.

**Canlı yayın `main`'e merge ile tazelenir.** `publish.yml` yalnız
`main`'e push ile tetiklenir; dal koruması gereği bu bir PR'dan geçer.
