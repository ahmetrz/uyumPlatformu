---
title: SessionStart Bağlam Enjeksiyonu
aliases: ["SessionStart kancası", "prompt sayacı"]
tags: ["kanca", "baglam", "claude-code"]
sources: ["2026-08-31.md"]
created: 2026-08-31
updated: 2026-08-31
---

# SessionStart Bağlam Enjeksiyonu

SessionStart kancası, her oturum başında yaklaşık 1359 karakterlik bir bağlamı otomatik olarak enjekte eden mekanizmadır. Bu bağlam son oturum özetini, aktif konuları, kuralları, journal ve bilgi tabanı indeksini kapsar. Ayrıca bir prompt sayacı, 15. mesajda kullanıcıya hatırlatma tetikleyecek şekilde çalışır.

## Önemli Noktalar
- SessionStart kancası ~1359 karakter bağlam enjekte ediyor.
- Enjekte edilen bağlam: son oturum, aktif konular, kurallar, journal, bilgi tabanı indeksi.
- mem0 verisi bu bağlama henüz dahil değil (bkz. [[mem0-entegrasyonu]]).
- Prompt sayacı 15. mesajda hatırlatma tetikliyor.
- SessionEnd kancası ve PostToolUse typecheck kancası da sistemin parçası olarak test edildi.

## Detaylar
Kurulum sırasında SessionStart, prompt sayacı ve SessionEnd kancaları canlı olarak test edilmiş ve çalıştığı doğrulanmıştır. Bu kancalar AhmetOS'un oturum içi davranışını ve bağlam sürekliliğini sağlayan temel mekanizmadır.

## İlgili Kavramlar
- [[beyin-sistemi-v2]] — Bu kancalar AhmetOS kurulumunun canlı test edilen bileşenleridir.
- [[mem0-entegrasyonu]] — mem0 verisi henüz bu bağlam enjeksiyonuna dahil edilmemiştir, entegrasyonun eksik kısmı budur.

## Kaynaklar
- 2026-08-31.md
