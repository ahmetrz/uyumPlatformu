---
title: mem0 semantik hafıza katmanı
created: 2026-08-31
type: note
status: active
tags: [beyin, hafıza]
---
# mem0 (semantik hafıza katmanı)

## Durum
- API anahtarı `.claude/settings.local.json` içinde `env.MEM0_API_KEY` olarak duruyor.
  Bu dosya `.gitignore`'da — **hiçbir zaman commit edilmez**.
- `uv` kurulu (`uv --version` ile doğrula).
- **Canlı doğrulandı 2026-08-31:** anahtar geçerli, `user_id=ahmet` altında 4 kayıt görüldü.

## Dürüst sınır
beyin.md v2.1 motorunun kendisi (`flush.py`, `compile.py`, kancalar) mem0'ı **okumaz**.
Dosya tabanlı hafıza (`🔮 850-Companion/`, `daily/`, `knowledge/`) mem0 olmadan da tam çalışır.
`MEM0_API_KEY` burada, üstüne semantik arama katmanı ekleyecek bir mem0 MCP sunucusu ya da
betiği bağladığında kullanılmak üzere ortam değişkeni olarak hazır duruyor.

## Hızlı deneme
```bash
uv run --with mem0ai python -c "
from mem0 import MemoryClient
c = MemoryClient()   # MEM0_API_KEY ortamdan okunur
print(c.get_all(filters={'user_id': 'ahmet'}, version='v2'))
"
```

## Anahtarı değiştirmek
`.claude/settings.local.json` içindeki `env.MEM0_API_KEY` değerini düzenle. Başka yerde kopyası yok.
