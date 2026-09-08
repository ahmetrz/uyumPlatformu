# Demo yolu — sekiz ekran, sekiz dakika

Bu belge **satış materyalidir**: hangi ekran, ne söylenecek, hangi
tıklama. Ekran adları ve sayılar depodaki kurgusal tohumdan gelir.

> **Her ekranda üst çubukta "ÖRNEK VERİ" rozeti durur.** Rozet
> kaldırılmaz ve ekran görüntüsü alınırken kırpılmaz: kurgusal bir sayı,
> üstündeki işaret olmadan gerçek bir iddiaya dönüşür.

## Demonun tek cümlesi

> Düzenlemeye tabi bir kuruluşun BT ve OT varlıklarını, uyum
> yükümlülüklerini ve açık işlerini tek yerde tutan; **hangi sektörde
> olduğunuzu yapılandırmadan öğrenen** bir yönetişim platformu.

## Kanıtlanacak üç şey

1. **Sektör bağımsızlığı gerçek.** Aynı kurulum, aynı ekranlar, iki
   sektör — sözcük de ölçü birimi de değişiyor.
2. **Bilinmeyen ≠ sıfır.** Ölçülmemiş alan "—" der; ürün bilmediğini
   bildiğini söylemez.
3. **Motor önerir, insan karar verir.** Hiçbir ekran kendi başına durum
   değiştirmez.

---

## Sıra

Sıra **portföyden tekile, tekilden karara** gider: önce "neye sahibim",
sonra "burada ne var", sonra "ne yapmam gerekiyor". Ters sıra (önce
bulgu) dinleyiciyi bağlamsız bırakır.

| # | Ekran | Süre | Birincil soru |
| --- | --- | --- | --- |
| 1 | `/` Saha | 45 sn | Portföyümde bugün ne var? |
| 2 | Sektör merceği (üst çubuk) | 60 sn | Bu ürün bizim sektörümüz için mi? |
| 3 | `/portfoy` | 60 sn | Hangi tesis en zayıf? |
| 4 | `/tesisler/[id]` (Tesis 360) | 90 sn | Bu tesiste ne var, ne eksik? |
| 5 | `/uyum` | 90 sn | Hangi yükümlülükte neredeyiz? |
| 6 | `/bulgular` | 75 sn | Açık iş ne, kim sorumlu, ne zaman? |
| 7 | `/riskler` | 60 sn | Neyi kabul ettik, neyi etmedik? |
| 8 | `/raporlar` | 60 sn | Denetime ne göstereceğiz? |

Toplam ~8 dakika, geçişler dâhil.

---

### 1 · `/` Saha · 45 sn

**Söylenecek:** "Bu, sabah açtığınızda gördüğünüz ekran. Tek ekrana
sığar — kaydırma yok."

**Tıklama:** yok, sadece göster.

**Vurgu:** ekran tam olarak pencereye oturuyor (üç bantta da ölçüldü).
Kaydırmak zorunda kalmadığınız bir özet, gerçekten bir özettir.

### 2 · Sektör merceği · 60 sn — **demonun kalbi**

**Söylenecek:** "Şimdi bu kurulumun bir su işletmesine ait olduğunu
varsayalım."

**Tıklama:** üst çubuk → **Sektör: Su ve Atıksu**.

**Vurgu:** sayfa yenilenmedi. Değişenler:
- "santral" → "arıtma tesisi", "enerji portföyü" → "su portföyü";
- ölçü birimi **MW → m³/gün** — aynı alan, başka büyüklük;
- liste artık yalnız su tesislerini gösteriyor.

**Sonra "Çekirdek"e tıklayın:** "Hiçbir sektör paketi kurulu değilken
ürün böyle görünür — 'tesis' der. Sektör sözcüğü çekirdek koda gömülü
değil; içerik paketinden geliyor."

> Bu, ürünün en pahalı ve en kolay kaybedilen özelliğidir. Bir sonraki
> ekrana geçmeden önce dinleyiciye merceği bir kez daha değiştirtin.

**Sınır (dürüstçe söylenir):** mercek 1024px altında gizlidir; demo
dizüstü ya da masaüstünde gösterilir (R0-13).

### 3 · `/portfoy` · 60 sn

**Söylenecek:** "Portföyü tek ölçüde değil, sizin sorduğunuz ölçüde
sıralıyor."

**Tıklama:** Sırala → **Uyum endeksi**. Sonra **Açık bulgu**.

**Vurgu:** "en zayıf" sözcükle işaretleniyor, yalnız renkle değil.
Toplam satırında iki sektör birlikteyken **sayı yazılmıyor** — farklı
birimler toplanmaz. Ürün yanlış bir toplamı doğru göstermektense hiç
göstermiyor.

### 4 · `/tesisler/[id]` — Tesis 360 · 90 sn

**Tıklama:** portföyden en zayıf tesise girin.

**Vurgu:** tek kayıt, tek ekran: kimlik, kapasite, uyum, bulgu, risk,
varlık, olay. Fotoğrafı olmayan tesis **başka bir tesisin fotoğrafını
ödünç almaz** — tipografik döşeme alır.

**Ölçülmemiş alanı gösterin:** su portföyünde bir tesisin debisi
"ölçülmedi" der. "Sıfır yazmıyoruz. Telemetri hattı yoksa ürün bunu
saklamıyor."

### 5 · `/uyum` · 90 sn

**Söylenecek:** "Yükümlülükler burada; madde madde, tesis tesis."

**Vurgu:**
- Su kiracısı **CBDDÖ** ve **ISO 27001** çerçevelerinde değerlendiriliyor
  — enerjiye özgü EPDK-SYM su kapsamında **değil**. Aynı platform, aynı
  kontrol çatısı, sektöre uygun kapsam.
- "Kapsam dışı" gerçek bir durumdur ve uygunsuzlukla karıştırılmaz.
- Yüzdenin yanında **bilinmeyen payı** yazılıdır.

### 6 · `/bulgular` · 75 sn

**Tıklama:** kritik bulguya girin.

**Vurgu:** bulgu bir cümle değil bir zincirdir: madde → bulgu → kök neden
→ aksiyon → doğrulama. Aksiyonu tamamlanmış ama doğrulanmamış bulgu
**retest bekliyor** der — "tamamlandı" demez.

### 7 · `/riskler` · 60 sn

**Vurgu:** skor **olasılık × en yüksek etki**; etkisi girilmemiş riskin
skoru **yok**, sıfır değil. Kabul edilen risk sahibiyle ve süresiyle
kayıtlıdır.

### 8 · `/raporlar` · 60 sn

**Söylenecek:** "Denetçi geldiğinde gösterilecek şey burada."

**Vurgu:** rapor ekranda üretilen bir özet değil, kayda bağlı bir
çıktıdır; her satır kaynağına kadar izlenebilir.

---

## Sormaları muhtemel üç soru

**"Bizim sektörümüz listede yok."**
Sektör bir içerik paketidir: sözlük + öznitelik şeması + kontrol çatısı.
Depoda ikisi kurulu (enerji, su); üçüncüsü veri işidir, kod işi değil.

**"Gerçek sistemlerimize bağlanıyor mu?"**
Bu demoda hiçbir sisteme bağlanmıyor ve bağlanmadığını **söylüyor** —
bağlı olmayan sağlayıcı "bağlı değil" der, sessizce boş göstermez.
Bağlayıcılar ayrı bir pakettir.

**"Bu sayılar gerçek mi?"**
Hayır ve ekran bunu her yüzeyde yazıyor. Kurgusal veri kurgusal
olduğunu söylediği sürece dürüsttür.

---

## Demo öncesi kontrol listesi

- [ ] Tarayıcı ≥1280px genişlikte (mercek üst çubukta görünsün).
- [ ] Mercek **Çekirdek**te başlasın — 2. adımın etkisi oradan doğar.
- [ ] "ÖRNEK VERİ" rozeti görünür.
- [ ] Sekiz rotanın sekizi de açılıyor (`npm run rota:duman`).
