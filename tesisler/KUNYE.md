# Santral Görselleri Künyesi

`tesisler/genis/` (hero, 1672×941) ve `tesisler/kucuk/` (seçici, 240×150) altındaki
tesis görselleri Kullanıcı A tarafından sağlandı — ilk onu 2026-09-01'de,
kalan yedisi 2026-09-02'de; platformda **temsilî** görseller olarak kullanılır. Santral → anahtar eşlemesi
veride (`Tesis.gorselAnahtari`), anahtar → dosya eşlemesi `lib/gorsel.ts`'de yaşar.

| Anahtar | Santral | Tip | Görsel | Neden bu eşleme |
|---|---|---|---|---|
| `sahaa1` | Saha A-1 JES | Jeotermal | çalılık tepeler, dağ fonu | ilk kuşak saha |
| `sahaa2` | Saha A-2 JES | Jeotermal | soğutma kuleli tesis, açık gökyüzü | orta ölçek |
| `sahaa3` | Saha A-3 JES | Jeotermal | gün doğumu, çok sayıda buhar tüyü | portföyün en büyüğü |
| `sahabjes` | Saha B JES | Jeotermal | bağlar arasında tesis | Manisa/Saha B bağ coğrafyası |
| `sahac` | Saha C RES | Rüzgâr | gün batımında tepe sırtı türbinleri | en büyük RES |
| `sahaf` | Saha F HES | Hidroelektrik | yeşil, sisli vadi, dolusavak | Rize/Karadeniz iklimi |
| `sahaj` | Saha J HES | Hidroelektrik | kemer baraj, kurak altın tepeler | Erzurum platosu |
| `sahai` | Saha I HES | Hidroelektrik | küçük gövde, seyrek ağaçlı tepeler | küçük ölçek, Eskişehir |
| `sahak` | Saha K HES | Hidroelektrik | geniş mavi göl, çıplak dağlar | Kars/Saha K gölü |
| `sahah` | Saha H HES | Hidroelektrik | dar kayalık boğaz, turkuaz su | Tunceli/Munzur vadisi |
| `sahag` | Saha G HES | Hidroelektrik | kar lekeli çıplak yayla, geniş rezervuar, dolusavaklı gövde | Erzincan yüksek platosu |
| `sahad` | Saha D RES | Rüzgâr | kayalık sırt boyunca uzanan çok türbinli saha | Osmaniye/Nur dağları, portföyün ikinci büyük RES'i |
| `sahal` | Saha L HES | Hidroelektrik | yeşil tepeler arasında orta ölçek gövde, savak akışı | Tokat/Yeşilırmak havzası |
| `sahabges` | Saha B Hibrit GES | Güneş | jeotermal tesisin yanında geniş panel tarlası | hibrit tesis; Saha B bağ ovası |
| `saham` | Saha M DGKÇ | Doğal gaz kombine çevrim | bacalı kombine çevrim tesisi, tarım ovası | Kırklareli/Trakya (devredildi) |
| `sahae` | Saha E RES | Rüzgâr | kurak tepeler boyunca seyrek türbin dizisi, uzakta sıra | Osmaniye; Saha D'den küçük ölçek (23,3 MWe) |
| `merkezbt` | Demo Enerji Genel Müdürlük | Merkez BT | cam ve taş cepheli genel müdürlük binası, kent silueti | üretim tesisi değil; portföydeki tek merkez kaydı |

Saha B'de iki tesis vardır ve ayrı anahtar taşırlar: `sahabjes` (JES) ve
`sahabges` (hibrit GES). `sahag` küçük görseli 2026-09-02'de kendi hero'sundan
yeniden kırpıldı; önceki paketten kalan eşsiz kopyanın yerini aldı.

Portföydeki 17 tesisin 17'sinin de görseli vardır; şu an tipografik fallback'e
düşen kayıt yoktur. Kural yine de yürürlüktedir ve fallback yolu SİLİNMEMİŞTİR:
görseli olmayan yeni bir tesis eklenirse tipografik fallback alır, **başka bir
tesisin görseli dolgu amacıyla kullanılmaz** — bir görsel yalnız gösterdiği
tesisi temsil eder. Saha E ile Saha D'nin ikisi de Osmaniye'de RES olduğu
hâlde ayrı fotoğraf beklendi; biri ötekinin yerine konmadı.

Tip bazlı genel görseller (giriş ekranı vb.) ayrı settir: `gorseller/KUNYE.md`.
