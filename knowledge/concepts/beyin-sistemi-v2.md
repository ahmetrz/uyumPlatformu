---
title: Beyin Sistemi v2
aliases: ["AhmetOS", "Beyin v2.1"]
tags: ["sistem", "kurulum", "kisisel-bilgi-yonetimi"]
sources: ["2026-08-31.md"]
created: 2026-08-31
updated: 2026-08-31
---

# Beyin Sistemi v2

Beyin Sistemi v2, Ahmet'in kişisel bilgi ve iş akışı yönetimi için temiz bir Linux/POSIX ortamında kurulan sistemdir. Sistemin partner asistanı Echo, sistem adı ise AhmetOS olarak belirlenmiştir. Kurulum tam kapsamlı yapılmıştır: 000-Inbox'tan 900-Archive'ye kadar 11 klasör, Templates ve makine katmanı (daily/, knowledge/).

## Önemli Noktalar
- Sistem adı AhmetOS, partner asistan adı Echo.
- Tam kapsam kurulum: 11 klasör (000-Inbox → 900-Archive) + Templates + makine katmanı (daily/, knowledge/).
- Motor sürümü v2.1 olarak anılıyor; mem0 gibi bazı entegrasyonlar henüz motor tarafından tam tüketilmiyor.
- Mevcut PostToolUse typecheck kancası kurulumda korunmuştur.

## Detaylar
Kurulum sırasında tüm kancalar (SessionStart, prompt sayacı, SessionEnd) canlı olarak test edilmiştir. Bilgi tabanı (knowledge/) ve günlük (daily/) klasörleri makine katmanının parçası olarak tanımlanmıştır. mem0 anahtarı güvenlik amacıyla settings.local.json içinde ortam değişkeni olarak, gitignore kapsamında saklanacak şekilde planlanmıştır.

## İlgili Kavramlar
- [[mem0-entegrasyonu]] — Beyin Sistemi v2'nin hafıza katmanı olarak planlanan ancak henüz motor tarafından tam okunmayan mem0 entegrasyonu.
- [[session-start-baglam-enjeksiyonu]] — Sistem kurulumunda test edilen SessionStart, PostToolUse ve SessionEnd kancaları AhmetOS'un davranış altyapısını oluşturur.

## Kaynaklar
- 2026-08-31.md
