# Zorlu Enerji Yönetişim Platformu

Zorlu Enerji üretim portföyü için IT/OT yönetişim, uyum, risk, denetim ve dönüşüm süreçlerini tek yerde yöneten kurumsal web uygulaması.

Uygulama; tesis ve varlık envanterini, regülasyon kontrollerini, kanıtları, bulguları, riskleri, aksiyonları, denetimleri, projeleri ve otomasyon durumunu aynı veri zincirinde tutar. Gerçek kurum sistemleri için entegrasyon altyapısı vardır; aktif kimlik bilgileri veya kurum içi uç noktalar repoda tutulmaz.

## Teknoloji

- Next.js 16 / React 19
- TypeScript
- Prisma 7
- SQLite (mevcut geliştirme ve demo veri tabanı)
- Vitest
- GitHub Actions

## Repo yapısı

- `web/app/` — Next.js App Router ekranları ve API uçları
- `web/components/` — ortak arayüz bileşenleri
- `web/lib/` — iş kuralları, yetkilendirme, entegrasyon, otomasyon ve veri erişimi
- `web/prisma/` — şema, migration'lar ve seed
- `web/tests/` — birim ve entegrasyon testleri
- `web/arac/` — kalite, erişilebilirlik, yayın ve bakım araçları
- `web/public/` — statik varlıklar ve gerekli lisans/künye bilgileri
- `docs/` — yaşayan mimari ve işletim dokümantasyonu
- `.github/workflows/` — PR kalite kapısı ve GitHub Pages yayını

## Yerel geliştirme

```bash
cd web
npm ci
npm run db:hazirla
npm run dev
```

Demo/seed kullanıcıları geliştirme verisi olarak oluşturulur. Gerçek ortamlarda seed kimlik bilgileri kullanılmamalıdır.

## Kalite kapıları

```bash
cd web
npm run lint
npx tsc --noEmit
npm test
npm run ters:kapsam
npm run tasarim:kapi
npm run build
NEXT_PUBLIC_DEMO=1 npx next build
```

`main` dalına açılan pull request'ler aynı temel kalite kontrollerinden geçer. `main` güncellendiğinde statik demo GitHub Pages'a otomatik yayınlanır.

Canlı statik demo: https://ahmetrz.github.io/uyumPlatformu/

## Yaşayan dokümantasyon

- [Ürün sözleşmesi](web/PRODUCT.md)
- [Tasarım sistemi](web/DESIGN.md)
- [Mimari](docs/MIMARI.md)
- [İçerik modeli](docs/ICERIK_MODELI.md)
- [Rota haritası](docs/ROTA_HARITASI.md)
- [Veri kaynakları](docs/VERI_NEREDEN_GELIR.md)
- [Ürün yedekleme ve geri yükleme](docs/URUN_YEDEKLEME.md)
- [Entegrasyon günü runbook'u](INTEGRATION_DAY_RUNBOOK.md)
- [Ana senaryo kütüğü](docs/MASTER_SCENARIO_REGISTRY.md)
- [Senaryo-test matrisi](docs/SCENARIO_TEST_MATRIX.md)

Tarihsel audit, geçici analiz, tasarım araştırması ve tek-seferlik çalışma çıktıları repoda tutulmaz.
