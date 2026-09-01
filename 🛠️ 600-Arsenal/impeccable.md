---
title: impeccable
updated: 2026-09-01
---
# impeccable — arayüz tasarım denetçisi

Frontend tasarımı için beceri + dedektör. `pbakaus/impeccable`, Apache 2.0.
Site: https://impeccable.style · Depo: https://github.com/pbakaus/impeccable

## Nerede duruyor
`.claude/skills/impeccable/` (sürüm 4.1.2, depoya işlendi) ve dört yardımcı
ajan `.claude/agents/impeccable-*.md`. Lisans ve NOTICE beceri klasöründe.

Depoya kopyalandı, sembolik bağ DEĞİL: uzak konteyner geçici, senin
makinende de aynı sürüm çalışsın diye.

## Nasıl kullanılır
| İş | Komut |
| --- | --- |
| Dedektör (deterministik, LLM yok) | `npx impeccable detect <dizin\|dosya\|URL>` |
| JSON çıktı (CI için) | `npx impeccable detect … --json` |
| Beceri | `/impeccable <alt-komut> <hedef>` |

Alt komutlar: `shape` · `critique` · `audit` · `polish` · `typeset` ·
`layout` · `colorize` · `animate` · `bolder` · `quieter` · `distill` ·
`clarify` · `adapt` · `harden` · `optimize` · `onboard` · `delight` ·
`overdrive` · `init` · `document` · `extract` · `live`

## Bu kurulumda öğrenilenler
- **Kum havuzu:** kök kullanıcıda Chrome açılmıyor. `CI=1` ile çalıştır —
  aracın kendi mekanizması `--no-sandbox` ekliyor.
- **`npx impeccable install` çalışmadı** (indirme "invalid zip data" verdi);
  depo klonlanıp `plugin/skills/impeccable` elle kopyalandı.
- **Dedektör yanlış pozitif üretir, doğrulamadan düzeltme yapma.**
  Ölçülen üç örnek:
  · `low-contrast` — fotoğraf üstündeki etiketleri kırık saydı; ekran
    görüntüsünün pikselleri ölçüldüğünde gerçek kontrast ≈5.9:1, geçiyor.
    Dedektör fotoğrafın kendi pikselini örnekliyor, üstündeki perdeyi değil.
  · `text-occlusion` — kapalı `<details>` menüsünün içindeki düğmeleri
    "örtülmüş" saydı. Tarayıcı onları boyamıyor; 45 Tab basışında odak hiç
    düşmedi.
  · `text-overflow` — `text-overflow: ellipsis` ile kasten kırpılan tablo
    hücreleri. Kırpma bir karar, kusur değil.
- **Gerçek yakaladığı:** `script-error` → React #418. Bu kusur bütün
  kapılarımızdan geçmişti (hepsi `next dev` üzerinde koşuyordu, orada
  görünmüyor). Bkz. `web/arac/statik-kontrol.mjs`.

## Güncelleme
`npx impeccable update`, ya da Claude Code'da `/plugin marketplace add
pbakaus/impeccable` + `/plugin`. Depodaki kopyayı güncellersen sürümü
bu dosyada da yaz.
