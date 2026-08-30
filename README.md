# Şebeke Uyum Konsolu

Enerji üretimi şirketinin BT/OT uyum platformu: regülasyonlar, uyum süreçleri (denetim dönemleri),
madde bazında durum, bulgu → aksiyon takibi, kanıt kütüphanesi, regülasyonlar arası eşleştirme
matrisi ve değişmez denetim izi — tesis bazlı kapsamla.

**Canlı demo:** https://ahmetrz.github.io/uyumPlatformu/
(statik yayın; yazma işlemleri demo uyarısı verir, gerçek dağıtımda tümü aktiftir)

## Depo yapısı

- `web/` — ürün: Next.js 16 + Prisma 7 (SQLite) + server actions. Tüm tanımlar
  (sektör, tesis kırılımı, tesis, regülasyon, kapsam alanı, süreç) panelden yönetilir.
- `docs/` — tasarım ve model dokümanları: [TASARIM_PLANI](docs/TASARIM_PLANI.md) ·
  [TASARIM_TOKENLARI](docs/TASARIM_TOKENLARI.md) · [ICERIK_MODELI](docs/ICERIK_MODELI.md) · `tokens.css`
- `.github/workflows/publish.yml` — `main`'e push'ta ürünü derleyip (`NEXT_PUBLIC_DEMO=1`
  statik dışa aktarım) `gh-pages` dalına yayınlar. `gh-pages` elle düzenlenmez.

## Geliştirme

```bash
cd web
npm install
npm run db:hazirla   # migrasyon + prisma generate + örnek veri
npm run dev          # http://localhost:3000
```

Doğrulama: `npx tsc --noEmit && npx eslint app components lib` · Demo derlemesi: `NEXT_PUBLIC_DEMO=1 npm run demo:build`
