# Santral koordinatları — aday liste

**Bu listedeki hiçbir koordinat doğrulanmış değildir.** Hepsi kamuya açık
kaynaklardan derlenmiş **adaydır** ve ürüne girerken `konumDogrulandi =
false` ile girer; harita onları `DOĞRULANMADI` damgasıyla gösterir.

Doğrulama, ekrandan yapılır (`/harita` → santral künyesi → *Koordinatı
düzelt*): `tanimlar/onay` yetkisi ister, kimin ne zaman doğruladığını
yazar ve denetim izine düşer. Bu belge o adımın **girdisidir**, yerine
geçmez.

Derleme tarihi: 03.09.2026.

---

## 1. Bulunanlar — 5/17

| Kod | Santral | Enlem | Boylam | Kaynak | Güven |
| --- | --- | --- | --- | --- | --- |
| `GOKCEDAG-RES` | Gökçedağ RES | 37.179881 | 36.609711 | [tr.wikipedia · Bahçe Rüzgâr Enerji Santrali](https://tr.wikipedia.org/wiki/Bah%C3%A7e_R%C3%BCzg%C3%A2r_Enerji_Santrali) | **yüksek** |
| `MERKEZ-BT` | Zorlu Enerji Genel Müdürlük | 41.067982 | 29.015300 | [en.wikipedia · Raffles Istanbul](https://en.wikipedia.org/wiki/Raffles_Istanbul) | **yüksek** |
| `KIZILDERE-1` | Kızıldere I JES | 37.950000 | 28.843060 | [tr.wikipedia · Kızıldere Jeotermal Enerji Santrali](https://tr.wikipedia.org/wiki/K%C4%B1z%C4%B1ldere_Jeotermal_Enerji_Santrali) | orta-yüksek |
| `KUZGUN-HES` | Kuzgun HES | 40.185830 | 41.064170 | [tr.wikipedia · Kuzgun Barajı ve HES](https://tr.wikipedia.org/wiki/Kuzgun_Baraj%C4%B1_ve_Hidroelektrik_Santrali) | orta |
| `TERCAN-HES` | Tercan HES | 39.751670 | 40.400280 | [tr.wikipedia · Tercan Barajı ve HES](https://tr.wikipedia.org/wiki/Tercan_Baraj%C4%B1_ve_Hidroelektrik_Santrali) | orta |

**Güven notlarının gerekçesi:**

- **Gökçedağ** — kaynak santrali Zorlu iştiraki Rotor'un işlettiği tesis
  olarak adlandırıyor ve 135 MW kurulu gücü kütüğümüzle birebir tutuyor.
  Ada güveni yükselten şey bu eşleşmedir, adın benzerliği değil.
- **Zorlu Enerji Genel Müdürlük** — koordinat, genel müdürlüğün
  bulunduğu **Zorlu Center** binasındaki otelin maddesinden geliyor.
  Bina adı burada bilerek korundu: koordinatın gerekçesi o binadır,
  kaydın adı değil. Kompleks tek yapı olduğu için nokta genel
  müdürlüğü temsil eder.
- **Kızıldere I** — kaynak 1984'te kurulan 15 MW'lık ilk santrali
  anlatıyor; kütükteki `KIZILDERE-1` (15 MW) ile örtüşüyor. II ve III
  aynı sahada **ayrı tesislerdir** ve bu koordinat onlara kopyalanmadı
  (aşağıya bakın).
- **Kuzgun / Tercan** — koordinatlar **barajın** koordinatıdır. HES
  binası genellikle barajın yanındadır ama aynı nokta değildir; saha
  ekibi için birkaç yüz metre fark eder. Bu yüzden güven "orta".

---

## 2. Bulunamayanlar — 12/17

`ALASEHIR-GES` · `ALASEHIR-JES` · `ATAKOY-HES` · `BEYKOY-HES` ·
`CILDIR-HES` · `DEMIRCILER-RES` · `IKIZDERE-HES` · `KIZILDERE-2` ·
`KIZILDERE-3` · `LULEBURGAZ-DGKC` · `MERCAN-HES` · `SARITEPE-RES`

Bunlar için **koordinat yazılmadı** ve sebepleri ayrı ayrı kayda değer:

### Adres var, koordinat yok
`SARITEPE-RES` ve `DEMIRCILER-RES` için bulunan tek konum bilgisi
"Sarıtepe–Demirciler Mevkii, Bahçe / Osmaniye" adresiydi. **Bir ilçe adı
koordinat değildir.** İlçe merkezinden türetilmiş bir nokta, haritada
kesin görünür ve saha ekibini yanlış tepeye çıkarır — ürünün zaten
yaptığı "il merkezine yaklaştır" davranışı bunu dürüstçe yapıyor.

### Aynı sahada AYRI tesisler
`KIZILDERE-2` ve `KIZILDERE-3`, Kızıldere I ile aynı jeotermal sahadadır
ama ayrı santrallerdir (80 MW ve 165 MW). Kızıldere I'in koordinatını
onlara kopyalamak, **bir santralin görselini başka bir santrale koymakla
aynı hatadır** ve aynı kuralla yasaktır (`web/lib/gorsel.ts` §1). Boş
bırakıldılar.

### Arama YANLIŞ eşleşme döndürdü
`MERCAN-HES` araması "Mercan **Dağları**"nın, `CILDIR-HES` araması bir
**tünel** kaydının koordinatını getirdi. İkisi de santral değil. Bu, tam
olarak `konumDogrulandi` alanının var olma sebebidir: ad benzerliğiyle
gelen bir nokta, doğrulanmadan girdiğinde kesin görünür. Kaydedilmediler.

### Hiç kayıt bulunamadı
`ALASEHIR-GES` · `ALASEHIR-JES` · `ATAKOY-HES` · `BEYKOY-HES` ·
`IKIZDERE-HES` · `LULEBURGAZ-DGKC` için kamuya açık ve güvenilir bir
koordinat kaydına ulaşılamadı.

---

## 3. Yöntem ve sınırları

**Denenen kaynaklar.** OpenStreetMap Overpass API ve Nominatim bu
ortamdan erişilemedi (bağlantı sıfırlandı / paylaşımlı IP oran sınırı).
Kalan derleme web araması + Vikipedi üzerinden yapıldı. Overpass
erişilebilir bir ortamdan tek sorguyla çok daha fazlasını verebilir; bu
liste **tamamlanmış değil, açılmış** bir listedir.

**Bu listenin yerine geçemeyeceği şey.** Kamuya açık bir kaynakta bir
koordinat bulmak, o koordinatın **doğru** olduğu anlamına gelmez. Üç ayrı
yanılma yolu bu derlemede fiilen görüldü: aynı adı taşıyan başka bir
coğrafi öğe (Mercan Dağları), santral yerine tesisin adresi (Sarıtepe),
ve santral yerine barajın kendisi (Kuzgun, Tercan). Dördüncüsü —
kapanmış bir tesisin eski koordinatı — bu listede görülmedi ama
`LULEBURGAZ-DGKC` (devredildi) gibi kayıtlarda beklenmelidir.

**Bir sonraki adım.** Saha ekibinden ya da kurum GIS'inden gelen
doğrulanmış liste, bu adayların hepsini ezer. Geldiğinde ekrandan
girilir, `konumKaynagi` "saha GPS" / "kurum GIS" olarak yazılır ve
doğrulama işaretlenir; **kod değişmez.**
