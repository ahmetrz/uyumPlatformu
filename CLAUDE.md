# Zorlu Enerji Yönetişim Platformu

Enerji üretim grubu için IT/OT yönetişim, uyum ve dönüşüm platformu.
Ürün kodu `web/` altındadır (Next.js 16 · React 19 · Prisma 7 · SQLite).

Bu dosya bir **yönlendiricidir**. Projenin gerçeği için güncel dosyaları
oku; buradan varsayma.

## Nereye bakılır

| Konu | Yer |
| --- | --- |
| Ürün / kod kuralları | `web/CLAUDE.md` · `web/AGENTS.md` |
| Ürün bağlamı ve sözlük | `web/PRODUCT.md` |
| İsterler listesi terimleri | `docs/TERIMLER_SOZLUGU.md` |
| İsterlerin "nasıl" cevabı · veri yolları | `docs/VERI_NEREDEN_GELIR.md` |
| Tasarım sistemi | `web/DESIGN.md` |
| Zorunlu UX / ürün tasarımı skill seti | `.claude/skills/` |
| Kalite araçları ve kapılar | `web/arac/BENIOKU.md` |
| Güncel durum · yol haritası | `PRE_INTERNAL_INTEGRATION_READINESS.md` |
| Kuruma açılma öncesi boşluklar | `docs/HAZIRLIK_DURUMU.md` |
| Müşteri matrisi · "Kısmen" maddeleri | `CUSTOMER_REQUIREMENTS_STATUS.md` |
| Bağlantı günü sırası | `INTEGRATION_DAY_RUNBOOK.md` |
| Ürünün kendi yedeği | `docs/URUN_YEDEKLEME.md` · `web/arac/yedek.mjs` |
| Tarihsel denetim kayıtları | `ARCHITECTURE_GAP_ANALYSIS.md` · `ENTEGRASYON_GAP_MATRIX.md` · `DESIGN_HANDOFF_GAP.md` · `docs/UX_DENETIM_2026-09.md` (bilerek güncellenmez) |
| Son kullanıcı UX denetimi ve kapanışı | `docs/END_USER_UX_AUDIT.md` · `docs/UX_KALITE_PROGRAMI_RAPORU.md` |
| Senaryo kütüğü · test eşlemesi | `docs/MASTER_SCENARIO_REGISTRY.md` · `docs/SCENARIO_TEST_MATRIX.md` |

## Bağlayıcı kurallar

**Dil.** Ürün metinleri, kod yorumları, commit mesajları ve belgeler
Türkçedir. Ürünün adı **Zorlu Enerji Yönetişim Platformu**'dur; eski kod
adları kod, belge ve arayüzde geçmez.

**Gerçek kurum sistemine bağlanılmaz.** AD/Entra, EDR, zafiyet tarayıcı,
SIEM, yedekleme platformu, firewall ve ağ cihazları, OT keşif ürünü,
PAM/VPN/tedarikçi oturum sistemi, herhangi bir kurum içi API — hiçbirine
erişilmez. **Gerçek endpoint, credential, secret veya token uydurulmaz.**
Şirket içi veri kullanılmaz. Üründeki bütün veri seed'dir.

**Koyu tema.** Bütün ekranlar koyu temadır; açık temaya geçiş yoktur.

**Santral görselleri temsilîdir ve ödünç alınmaz.** Görsel seti Ahmet'in
sağladığı fotoğraflardır (`public/santraller/KUNYE.md`). Fotoğrafı olmayan
santrale **başka bir santralin görseli konmaz**; tipografik fallback alır.
Üretim tipleri de birbirinin yerine geçmez.

**Bilinmeyen ≠ sıfır.** Ölçülmemiş bir değer sıfır olarak gösterilmez,
ortalamaya çekilmez, tahmin edilmez. Ekran "ölçülmedi" der.

**Uydurma veri yok.** Sayılar (kapsam, Lighthouse puanı, kusur sayısı)
ölçüldüğü gibi yazılır, hedefe uydurulmaz. Ölçülemeyen "ölçülmedi" diye
yazılır.

**Değişiklikler PR ile gelir.** `main`'e doğrudan push yok, otomatik
merge yok.

**Dosyayı değiştirmeden önce güncel hâlini oku.**

## Zorunlu UX / ürün tasarımı skill seti

UX, UI, ürün tasarımı, etkileşim tasarımı, bilgi mimarisi, responsive
tasarım, erişilebilirlik veya kullanıcı akışıyla ilgili **her** görevde
aşağıdaki üç skill birlikte kullanılmalıdır:

1. `.claude/skills/enterprise-ux-product-design-auditor/SKILL.md`
2. `.claude/skills/credit-efficient-enterprise-design-execution/SKILL.md`
3. `.claude/skills/enterprise-interaction-simplification-auditor/SKILL.md`

Bunlar opsiyonel referans değildir; çalışma talimatıdır.

UX/UI işi başlamadan önce:

- üç skill dosyasının da güncel hâlini oku,
- mevcut kullanıcı yolculuğunu ve ekranın birincil kullanıcı görevini tanımla,
- mevcut audit ve kabul edilmiş kararları tekrar üretmek yerine delta üzerinden ilerle,
- iş kuralları, RBAC, kapsam, değişmez denetim izi, köken ve bilinmeyen veri
  semantiğini koru,
- bilişsel yükü, görev tamamlama süresini, gereksiz tıklamayı, bilgi tekrarını,
  bağlam kaybını ve gereksiz navigasyonu ayrı kalite eksenleri olarak ölç,
- responsive/axe/test kapılarının yeşil olmasını tek başına iyi UX kanıtı sayma,
- mümkün olduğunda tek güçlü tasarım yönü seç; gereksiz varyant üretme,
- önce örnek/archetype ekranlarda doğrula, sonra platform geneline yay.

Çelişki durumunda öncelik sırası:
1. güvenlik ve veri bütünlüğü,
2. iş kuralları / yetki / kapsam / audit,
3. doğru semantik ve gerçeklik,
4. kullanılabilirlik,
5. görsel iyileştirme,
6. yürütme/credit optimizasyonu.

Claude Code görevin başlangıcında bu üç skill'in okunduğunu kısa bir
`SKILL LOAD CHECK` ile doğrulamalı ve her biri için bu görevde uygulanacak
en az üç kuralı belirtmelidir. Bu kontrol audit veya kod değişikliğinden önce
yapılır.

## Kalite kapıları

CI'da (`.github/workflows/pr-kapisi.yml`): lint → tsc → vitest → tasarım
kapısı → derleme. Tarayıcı isteyen kapılar canlı sunucu ister ve elle
koşulur (`PORT=3210 npm run dev` başka bir kabukta); listesi ve
gerekçeleri `web/arac/BENIOKU.md` içindedir.
