# Uyum Platformu — Tasarım Çıktısı

Canlı site: **https://ahmetrz.github.io/uyumPlatformu/**

| Sayfa | Bağlantı |
| --- | --- |
| Öncelikli ekranlar | [index.html](https://ahmetrz.github.io/uyumPlatformu/) |
| Mockup seti | [mockups.html](https://ahmetrz.github.io/uyumPlatformu/mockups.html) |

## Depo yapısı

- `docs/` — yayınlanan sitenin kaynağı (tasarım çıktısı, `tokens.css`, tasarım notları). **Değişiklikler burada yapılır.**
- `.github/workflows/publish.yml` — `main`'e her push'ta `docs/` içeriğini `gh-pages` dalına aktarır.

## Yayın akışı

Çalışma dalı yalnızca `main`'dir. `gh-pages` dalı elle düzenlenmez; workflow tarafından
üretilir ve GitHub Pages'in yayın kaynağı olarak kullanılır.

Yayın kaynağını ileride "GitHub Actions"a çevirmek isterseniz: Settings → Pages → Source →
GitHub Actions. Bu durumda `gh-pages` dalı ve bu workflow gereksiz kalır.
