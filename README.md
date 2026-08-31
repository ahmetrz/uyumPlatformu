# Zorlu Uyum Konsolu

Türkiye'de elektrik üretimi yapan bir şirketler grubu için **IT/OT Governance,
Compliance & Transformation platformu**. Hedef mimari: `ENERJI_IT_OT_PLATFORM_HEDEF_MIMARI`
referansı; mevcut durum ve yol haritası: [ARCHITECTURE_GAP_ANALYSIS.md](ARCHITECTURE_GAP_ANALYSIS.md).

Çekirdek zincirler veri modelinde uçtan uca bağlıdır:
`Grup → Tüzel Kişi → Santral → Ünite → Sistem/Servis → Varlık` ve
`Framework → Sürüm → Kontrol → Uygulanabilirlik → Assessment → Kanıt → Bulgu → Risk → CAPA → Proje → Bütçe → Doğrulama → Kapanış`.

Modüller: Santral 360 (profil + gerekçeli uygulanabilirlik + birleşik eksikler),
uyum süreçleri, bulgular, risk kütüğü (8 etki boyutu, süreli/onaylı kabul),
9 aşamalı denetim yaşam döngüsü, IT/OT envanteri (CMDB), görev & onay merkezi,
projeler + adaylar, regülasyon sürüm/diff motoru, otomasyon motorları +
platform sağlığı, değişmez denetim izi.

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
# geliştirme girişi: ayse.demir@enerji.example / Enerji!2026
```

Güvenlik: oturum tabanlı kimlik doğrulama; RBAC + tesis/süreç kapsamı veri
seviyesinde uygulanır; denetim izi tabloları veritabanı tetikleyicileriyle
değiştirilemez. Motorlar sunucu açıkken saatte bir otomatik koşar
(`ISLER_OTOMATIK=0` ile kapatılır); her koşu Platform sağlığı ekranında izlenir.

Doğrulama: `npx tsc --noEmit && npx eslint app components lib` · Demo derlemesi: `NEXT_PUBLIC_DEMO=1 npm run demo:build`
