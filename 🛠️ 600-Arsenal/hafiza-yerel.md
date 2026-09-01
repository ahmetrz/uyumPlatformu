---
title: Hafıza katmanı neden yerelde
created: 2026-09-01
type: note
status: active
tags: [beyin, gizlilik]
---
# Hafıza katmanı yerelde tutulur

Bu depo **public**. Günlük loglar iş içeriği taşıyor (kararlar, PR bulguları, strateji),
o yüzden hafıza katmanı `.gitignore` ile depodan çıkarıldı.

## Ne depoda, ne yerelde

| Depoda (paylaşılır) | Yerelde (paylaşılmaz) |
| --- | --- |
| `.claude/` motoru: kancalar, betikler, beceriler | `daily/*.md` günlük loglar |
| Klasör iskeleti (`.gitkeep`) | `knowledge/index.md`, `log.md` |
| `📋 Templates/beyin-tohum/` tohum şablonlar | `knowledge/concepts/*`, `connections/*` |
| `CLAUDE.md`, `.beyin-version` | `🔮 850-Companion/*.md` ilişki hafızası |

`knowledge/` klasörünün **kendisi** depoda kalmalı: `compile.py` onu
`resolve(strict=True)` ile açıyor, yoksa derleme patlar. İçindeki dosyalar yerelde.

## Yeni bir makinede kurulum

```bash
git clone https://github.com/ahmetrz/uyumPlatformu.git
cd uyumPlatformu
cp "📋 Templates/beyin-tohum/850-Companion/"*.md "🔮 850-Companion/"
cp "📋 Templates/beyin-tohum/knowledge/"*.md knowledge/
```

Tohum şablonlardaki `(tarih)` alanlarını doldur. Sonra `claude` çalıştır, `beyin doktor` ile
doğrula. `.claude/settings.local.json` de elle oluşturulmalı — bkz. `mem0.md`.

## Dikkat: hafızanın yedeği yok

Bu düzenin bedeli bu. `daily/` ve `🔮 850-Companion/` artık hiçbir yere push edilmiyor;
disk giderse hafıza da gider. Seçenekler:

- Ayrı bir **private** depoya yedekle (`git init` + private remote, sadece hafıza klasörleri)
- Vault'u yedeklenen bir klasöre taşı (OneDrive, iCloud, Time Machine)
- Depoyu private yap ve bu gitignore kurallarını geri al — en basiti

## Geçmişteki sızıntı

`daily/2026-08-31.md`, `daily/2026-09-01.md` ve `knowledge/` altındaki ilk derleme
çıktısı bu kural konmadan önce public main'e push edildi (`c407047` ve öncesi).
Bu kural bundan sonrasını kapatır, **geçmişi temizlemez**. Geçmişi de kapatmak için
depoyu private yapmak gerekir.
