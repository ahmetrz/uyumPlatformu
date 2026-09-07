# Uyum ve Yönetişim Platformu

Düzenlemeye tabi kuruluşlar için BT/OT yönetişim, uyum ve dönüşüm
platformu. Ürün kodu `web/` altındadır (Next.js 16 · React 19 · Prisma 7 ·
SQLite).

Platform bir enerji şirketi için kurum içi geliştirildi ve **sektör ile
ülke bağımsız bir ürüne** dönüştürülüyor; ilk kurum, ilk ve referans
kiracı oluyor. Ne olduğu ve ne olmadığı `docs/URUN_VIZYONU.md`'de;
nasıl yapılacağı `docs/GELISTIRME_PAKETLERI.md`'de.

Bu dosya bir **yönlendiricidir**. Projenin gerçeği için güncel dosyaları
oku; buradan varsayma. Bu tablodaki her hedefin diskte var olması bir
kabul kriteridir (P0 · URN-KUR-003); ölü atıf eklemeyin.

## Nereye bakılır

| Konu | Yer |
| --- | --- |
| Ürün ne, ne değil · hangi kural değişti | `docs/URUN_VIZYONU.md` |
| İş listesi · paketler · kararlar defteri | `docs/GELISTIRME_PAKETLERI.md` |
| Paketlerin koda karşı durumu · çelişki kütüğü | `docs/GELISTIRME_PAKETLERI_DURUM.md` |
| Ürün / kod kuralları | `web/CLAUDE.md` → `web/AGENTS.md` (Next.js sürüm uyarısı) |
| Ürün bağlamı ve sözlük | `web/PRODUCT.md` |
| Tasarım sistemi | `web/DESIGN.md` |
| Veri modeli | `docs/ICERIK_MODELI.md` · `web/prisma/schema.prisma` |
| Mimari | `docs/MIMARI.md` |
| İsterlerin "nasıl" cevabı · veri yolları | `docs/VERI_NEREDEN_GELIR.md` |
| Ekran envanteri | `docs/ROTA_HARITASI.md` · `web/arac/rotalar.json` |
| PostgreSQL geçiş hazırlığı | `docs/POSTGRES_READINESS.md` |
| Bağlantı günü sırası | `INTEGRATION_DAY_RUNBOOK.md` |
| Ürünün kendi yedeği | `docs/URUN_YEDEKLEME.md` · `web/arac/yedek.mjs` |
| Senaryo kütüğü · test eşlemesi | `docs/MASTER_SCENARIO_REGISTRY.md` · `docs/SCENARIO_TEST_MATRIX.md` (`web/lib/senaryo/` üretir) |
| Kalite araçları ve kapılar | `web/arac/BENIOKU.md` |
| Görsel künyeleri | `web/public/gorseller/KUNYE.md` · `web/public/tesisler/KUNYE.md` |
| Zorunlu UX / ürün tasarımı skill seti | `.claude/skills/` |

Terim sözlüğü belgesi (`docs/TERIMLER_SOZLUGU.md`) **henüz yok**: terim
katmanı P1'de kurulur (`web/lib/dil/terimler.ts`), belge ondan sonra
yazılır. Kodsuz bir sözlük belgesi ilk gün doğru olur, ertesi gün yalan
söyler.

## Bağlayıcı kurallar

Ürünleştirme kararıyla (5 Eylül 2026) bazı kurallar **aynen kaldı**,
bazıları **değişti**. Çelişkide `docs/URUN_VIZYONU.md` §6 tablosu
kazanır.

### Kalan kurallar

**Uydurma veri yok.** Gerçek endpoint, credential, secret veya token
uydurulmaz. Sayılar (kapsam, Lighthouse puanı, kusur sayısı) ölçüldüğü
gibi yazılır, hedefe uydurulmaz. Ölçülemeyen "ölçülmedi" diye yazılır.

**Bilinmeyen ≠ sıfır.** Ölçülmemiş bir değer sıfır olarak gösterilmez,
ortalamaya çekilmez, tahmin edilmez. Ekran "ölçülmedi" der.

**Pasif önce, aktif tarama yok.** OT ağına paket gönderilmez.

**Motor önerir, insan karar verir.** Hiçbir motor durum değiştirmez,
sürüm aktifleştirmez, kanıtı "yeterli" işaretlemez.

**Değişmez denetim izi · dört göz · sır değeri saklanmaz.** Sır yalnız
`sirReferansi` ile taşınır (`env:` · `dosya:` · `vault:`).

**Bağlı olmayan sağlayıcı "bağlı değil" der.** Sessiz düşüş yok.

**Koyu tema.** Bütün ekranlar koyu temadır; açık temaya geçiş yoktur.

**Değişiklikler PR ile gelir.** `main`'e doğrudan push yok, otomatik
merge yok.

**Dosyayı değiştirmeden önce güncel hâlini oku.**

### Değişen kurallar

**Ürün adı yapılandırmadan gelir.** Görünen ad "Uyum ve Yönetişim
Platformu"dur; **geçici ve tanımlayıcı** bir addır, marka değildir,
sektör sözcüğü içermez. Ad koda **gömülmez**: tek kaynak
`web/lib/marka.ts` (`MARKA_AD`, `NEXT_PUBLIC_MARKA_AD` ile ezilir).
Kabuk sözcük markasının ilk satırı kurulumun adıdır (`KIRACI_AD`; P2
bunu `Kiraci.markaAd` alanına taşır). `Regula` **iç çalışma adıdır** ve
arayüzde, sitede, dış iletişimde kullanılmaz; domain alınmaz, marka
başvurusu yapılmaz, logo çizdirilmez (`docs/URUN_VIZYONU.md` §10).

**Dil çok dillidir; Türkçe birinci dil.** Kod yorumları, commit
mesajları ve belgeler Türkçedir. Arayüz metinleri P3'ten sonra mesaj
kataloğundan gelir (TR birinci, EN ikinci); o güne kadar mevcut Türkçe
metinler kalır, **yeni** metin sözlük anahtarıyla yazılır. İçerik
paketleri kendi dilinde kalır ve ekran içeriğin dilini rozetle söyler.

**"Kurum" değil "müşteri/kiracı".** Ürün bir kuruma değil, kiracılara
hizmet eder. İlk kurum **referans kiracıdır**; adı ve verisi yalnız
kendi kurulumunda bulunur.

**Gerçek müşteri sistemine bağlanılmaz.** AD/Entra, EDR, zafiyet
tarayıcı, SIEM, yedekleme platformu, firewall ve ağ cihazları, OT keşif
ürünü, PAM/VPN/tedarikçi oturum sistemi, herhangi bir kurum içi API —
hiçbirine erişilmez. Bu kural **müşterinin kendi** sistemleri içindir:
kamuya açık resmî kaynaklar (Resmî Gazete, EPDK, KVKK, CISA, NVD…)
belgelenmiş sabit olarak koda girebilir, `etkin=false` gelir ve
`robots.txt` uygulanır (`docs/GELISTIRME_PAKETLERI.md` §0.2).

**Depodaki veri kurgusaldır.** Gerçek kurum, tesis ya da kişi adı; gerçek
bir tesisin fotoğrafı; tesise bağlı gerçek güvenlik bulgusu koda
**girmez**. Depo geneldir (public). Şüphedeysen sor.

**Görseller.** Tesis görselleri temsilîdir ve ödünç alınmaz: fotoğrafı
olmayan tesise başka bir tesisin görseli konmaz, üretim tipleri
birbirinin yerine geçmez (`web/public/tesisler/KUNYE.md`). Giriş ve
saha görselleri üçüncü taraf atıf yükümlülüğü taşımaz
(`web/public/gorseller/KUNYE.md`). Kurgusal demo kiracısının kayıtları
gerçek bir tesise bağlanmaz.

**Sektör ve ülke bağımsızlık.** Çekirdeğe sektör terimi ("santral",
"MWe"), ülke adresi, para birimi, mevzuat adı ya da dil sabiti
**girmez**; bunlar içerik paketinden, kiracı yapılandırmasından ve
öznitelik şemasından gelir (`docs/GELISTIRME_PAKETLERI.md` §0.5). P1
öncesi mevcut "santral" metinleri **yeni** kodda çoğaltılmaz.

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

CI'da (`.github/workflows/pr-kapisi.yml`): lint → tsc → vitest →
ters kapsam → dil kapısı → tasarım kapısı → derleme → statik demo
derlemesi. Tarayıcı isteyen kapılar canlı sunucu ister ve elle koşulur
(`PORT=3210 npm run dev` başka bir kabukta); listesi ve gerekçeleri
`web/arac/BENIOKU.md` içindedir. Koşulmayan kapı "geçti" diye
yazılmaz — "ölçülmedi" yazılır.
