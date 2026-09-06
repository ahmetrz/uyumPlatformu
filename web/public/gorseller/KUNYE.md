# Görsel Künyesi ve Lisanslar

Bu dizindeki görsellerin **hiçbiri** üçüncü taraf atıf yükümlülüğü taşımaz:
tamamı ürün sahibi tarafından sağlanmış üretilmiş (AI) görsellerdir,
fotoğraf değildir. Serbest lisanslı bir üçüncü taraf fotoğrafı eklenirse
atıf satırı buraya yazılır.

Gerçek bir tesisin fotoğrafı bu dizine **girmez**; kurgusal demo
kiracısının hiçbir kaydı gerçek bir tesise bağlanmaz.

## Giriş ekranı hero'su

| Dosya | Konu | Kaynak | Kullanım |
|---|---|---|---|
| `giris-genis.webp` (1600×900) | Baraj gölü ve uzak tesis buharı | ürün sahibi · üretilmiş (AI) | `/giris` sol banttaki fotoğrafik alan; `object-fit: cover`, `opacity .62`, üstünde koyu degrade. Dekoratiftir (`alt=""`, `aria-hidden`) — ekranın bilgisi kardeş düğümlerdedir. |

Saha arka plan havuzundaki `saha-04-baraj-gol-plume.webp` ile aynı
karedir; giriş ekranı kendi kopyasını taşır ki havuzun içeriği
değiştiğinde giriş ekranı etkilenmesin.

## Saha arka plan havuzu (`saha/`)

Saha ana ekranının merkezi fotoğrafik alanı için iki görsellik TEK havuz;
kaynak kodda `lib/sahaArkaPlan.ts` (`SAHA_ARKA_PLANLARI`), yalnız
`.ab-b-fon` katmanında kullanılır (dekoratif, `alt=""`, `aria-hidden`).
Görseller ürün sahibi tarafından sağlanmış üretilmiş (AI) görsellerdir;
fotoğraf değildir, üçüncü taraf atıf yükümlülüğü yoktur. Kaynak
1672×941 PNG → 16:9 merkez kırpım → 1600×900 WebP (q70).

| Dosya | Konu | object-position |
|---|---|---|
| `saha-03-res-sirt.webp` | Sırtta türbinler, gün batımı | `78% 42%` |
| `saha-04-baraj-gol-plume.webp` | Baraj gölü ve uzak tesis buharı | `50% 52%` |

Havuz ürün sahibi onayıyla 5'ten 2'ye indirildi (2026-09-03); onaylanmayan
üç görsel repodan silindi. Önceki nötr triptik de kaldırılmıştır.

## Tesis görsel seti ayrı settir

Tesis (kart/hero) görselleri bu dizinde değil,
`public/santraller/genis/` ve `public/santraller/kucuk/` altındadır;
künyesi `public/santraller/KUNYE.md`.
