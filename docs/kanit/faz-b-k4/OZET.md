# K4 · enerji ve su regresyon kanıtı

Ölçüm: 2026-09-08T20:03:39.479Z · sunucu http://localhost:3210 · 1440×900 · `node arac/k4-enerji-su.mjs`

Aynı kod iki mercekte: sekiz demo ekranı (mercek adımı hariç yedi rota) + Tesis 360.
Profil alanı sayısı ekranın kendi metninden okunur ("N/M alan tanımsız").

| Mercek | Rota | HTTP | Karakter | Hata metni | Mercek sözcüğü | Profil alanı (M) | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Elektrik Üretimi | `/` | 200 | 2493 | yok | evet | — | `elektrik-retimi-.jpg` |
| Elektrik Üretimi | `/portfoy` | 200 | 2469 | yok | evet | — | `elektrik-retimi-portfoy.jpg` |
| Elektrik Üretimi | `/tesisler/cmtt22l1w000l507d6dwtsb8d` | 200 | 3023 | yok | evet | 20 | `elektrik-retimi-tesisler-cmtt22l1w000l507d6dwtsb8d.jpg` |
| Elektrik Üretimi | `/uyum` | 200 | 3238 | yok | evet | — | `elektrik-retimi-uyum.jpg` |
| Elektrik Üretimi | `/bulgular` | 200 | 2044 | yok | evet | — | `elektrik-retimi-bulgular.jpg` |
| Elektrik Üretimi | `/riskler` | 200 | 1656 | yok | evet | — | `elektrik-retimi-riskler.jpg` |
| Elektrik Üretimi | `/raporlar/karne` | 200 | 1291 | yok | evet | — | `elektrik-retimi-raporlar-karne.jpg` |
| Su ve Atıksu | `/` | 200 | 2529 | yok | evet | — | `su-ve-at-ksu-.jpg` |
| Su ve Atıksu | `/portfoy` | 200 | 1647 | yok | evet | — | `su-ve-at-ksu-portfoy.jpg` |
| Su ve Atıksu | `/tesisler/cmtt22p9s01zq507dwlc2jkcy` | 200 | 2830 | yok | evet | 12 | `su-ve-at-ksu-tesisler-cmtt22p9s01zq507dwlc2jkcy.jpg` |
| Su ve Atıksu | `/uyum` | 200 | 3170 | yok | evet | — | `su-ve-at-ksu-uyum.jpg` |
| Su ve Atıksu | `/bulgular` | 200 | 1372 | yok | evet | — | `su-ve-at-ksu-bulgular.jpg` |
| Su ve Atıksu | `/riskler` | 200 | 1444 | yok | evet | — | `su-ve-at-ksu-riskler.jpg` |
| Su ve Atıksu | `/raporlar/karne` | 200 | 1278 | yok | evet | — | `su-ve-at-ksu-raporlar-karne.jpg` |

**Sonuç: 14 ölçüm, kırmızı 0.**
