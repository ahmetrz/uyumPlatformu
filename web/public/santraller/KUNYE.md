# Santral Görselleri Künyesi

`santraller/genis/` (hero, 1672×941) ve `santraller/kucuk/` (seçici, 240×150) altındaki
santral görselleri Ahmet Terzi tarafından 2026-09-01'de sağlandı; platformda
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

`tercan` küçük görseli önceki paketten kalmıştır; hero'su yoktur.
Fotoğrafı sağlanmayan santraller (Sarıtepe RES, Demirciler RES, Tercan HES hero,
Ataköy HES, Alaşehir GES, Zorlu Center, Lüleburgaz) tipografik fallback alır;
başka bir santralin görseli dolgu amacıyla kullanılmaz.

Tip bazlı genel görseller (giriş ekranı vb.) ayrı settir: `gorseller/KUNYE.md`.
