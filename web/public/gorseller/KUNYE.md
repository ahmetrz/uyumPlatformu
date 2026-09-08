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

## Sinematik giriş kareleri (`giris/`)

Dört kare aynı kurgusal jeotermal tesisin tek optik eksende çekilmiş
dört durağıdır; ürün sahibi tarafından sağlanmış üretilmiş (AI)
görsellerdir, fotoğraf değildir, gerçek bir tesise karşılık gelmez ve
üçüncü taraf atıf yükümlülüğü taşımaz. Hepsi 1600×900 WebP; kullanım
`components/giris/` (dekoratif: `alt=""`, `aria-hidden`), kamera modeli
`docs/SINEMATIK_GIRIS.md`.

| Dosya | Durak | Ölçülen çapa (piksel) |
|---|---|---|
| `sahne-01-uzak.webp` | uzak tesis | kontrol binası x 648–970 · y 350–470 |
| `sahne-02-yaklasma.webp` | boru koridorundan yaklaşma | kontrol binası x 575–1030 · y 290–455 |
| `sahne-03-bina.webp` | cam kontrol binası | bina x 305–1300 · y 215–590 · video duvarı x 655–955 · y 355–425 |
| `sahne-04-ekran.webp` | kontrol odası ana ekranı | ana ekran x 365–1235 · y 268–520 |

v3 ile önceki WebGL yolunun üç görseli (`dis` · `yaklasma` ·
`kontrol-odasi`) kaldırıldı; kullanılmıyordu.

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
`public/tesisler/genis/` ve `public/tesisler/kucuk/` altındadır;
künyesi `public/tesisler/KUNYE.md`.
