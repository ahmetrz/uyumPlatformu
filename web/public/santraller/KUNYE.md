# Santral Görselleri Künyesi

`santraller/genis/` (hero, 1672×941) ve `santraller/kucuk/` (seçici, 240×150) altındaki
santral görselleri Ahmet Terzi tarafından sağlandı — ilk on tanesi 2026-09-01'de,
kalan beşi 2026-09-02'de; platformda
**temsilî** santral görselleri olarak kullanılır. Santral → anahtar eşlemesi
veride (`Tesis.gorselAnahtari`), anahtar → dosya eşlemesi `lib/gorsel.ts`'de yaşar.

| Anahtar | Santral | Tip | Görsel | Neden bu eşleme |
|---|---|---|---|---|
| `kizildere1` | Kızıldere I JES | Jeotermal | çalılık tepeler, dağ fonu | ilk kuşak saha |
| `kizildere2` | Kızıldere II JES | Jeotermal | soğutma kuleli tesis, açık gökyüzü | orta ölçek |
| `kizildere3` | Kızıldere III JES | Jeotermal | gün doğumu, çok sayıda buhar tüyü | portföyün en büyüğü |
| `alasehir` | Alaşehir JES | Jeotermal | bağlar arasında tesis | Manisa/Alaşehir bağ coğrafyası |
| `gokcedag` | Gökçedağ RES | Rüzgâr | gün batımında tepe sırtı türbinleri | en büyük RES |
| `ikizdere` | İkizdere HES | Hidroelektrik | yeşil, sisli vadi, dolusavak | Rize/Karadeniz iklimi |
| `kuzgun` | Kuzgun HES | Hidroelektrik | kemer baraj, kurak altın tepeler | Erzurum platosu |
| `beykoy` | Beyköy HES | Hidroelektrik | küçük gövde, seyrek ağaçlı tepeler | küçük ölçek, Eskişehir |
| `cildir` | Çıldır HES | Hidroelektrik | geniş mavi göl, çıplak dağlar | Kars/Çıldır gölü |
| `mercan` | Mercan HES | Hidroelektrik | dar kayalık boğaz, turkuaz su | Tunceli/Munzur vadisi |
| `tercan` | Tercan HES | Hidroelektrik | kar lekeli çıplak yayla, geniş rezervuar, dolusavaklı gövde | Erzincan yüksek platosu |
| `saritepe` | Sarıtepe RES | Rüzgâr | kayalık sırt boyunca uzanan çok türbinli saha | Osmaniye/Nur dağları, portföyün ikinci büyük RES'i |
| `atakoy` | Ataköy HES | Hidroelektrik | yeşil tepeler arasında orta ölçek gövde, savak akışı | Tokat/Yeşilırmak havzası |
| `alasehirges` | Alaşehir Hibrit GES | Güneş | jeotermal tesisin yanında geniş panel tarlası | hibrit tesis; Alaşehir bağ ovası |
| `luleburgaz` | Lüleburgaz DGKÇ | Doğal gaz kombine çevrim | bacalı kombine çevrim tesisi, tarım ovası | Kırklareli/Trakya (devredildi) |

Alaşehir'de iki tesis vardır ve ayrı anahtar taşırlar: `alasehir` (JES) ve
`alasehirges` (hibrit GES). `tercan` küçük görseli 2026-09-02'de kendi hero'sundan
yeniden kırpıldı; önceki paketten kalan eşsiz kopyanın yerini aldı.

Fotoğrafı hâlâ sağlanmayan iki tesis — **Demirciler RES** ve **Zorlu Center Genel
Müdürlük** — tipografik fallback alır. Demirciler de Osmaniye'de bir RES'tir ama
Sarıtepe'nin görseli ona verilmez: bir görsel yalnız gösterdiği santrali temsil
eder, başka bir santralin görseli dolgu amacıyla kullanılmaz.

Tip bazlı genel görseller (giriş ekranı vb.) ayrı settir: `gorseller/KUNYE.md`.
