# Hazırlık durumu — kuruma açılmadan önce ne kaldı?

**Ölçüm tarihi:** 2026-09-02 · **Dal:** `claude/repo-public-github-domain-271hxa`
· **Kapsam:** gerçek kurum sistemine bağlanma DIŞINDA kalan her şey.

Bu belge bir **ölçüm raporudur**. Buradaki her sayı bu makinede koşturuldu;
ölçülemeyenler "ölçülmedi" diye yazılıdır ve tahmin edilmemiştir. Hedefe
uydurulmuş tek bir sayı yoktur.

---

## 1. Bugün ölçülen durum

| Kapı | Sonuç | Not |
|---|---|---|
| Lint / tsc | 0 hata · 0 uyarı | `--max-warnings=0` |
| Vitest | 67 dosya · 1252 geçti · 1 atlandı | |
| Kapsam (V8) | **satır %68,91 · deyim %66,23** | hedef ≥%90 — altında |
| Tasarım kapısı | kontrast 0 kusur · eski iz 0 | 3 kip × 14 mürekkep × 4 zemin |
| Gezinme | 7 bant (1920…375) · 0 kusur | kabuk içi + kabuklar arası |
| Rota duman | 46/46 | kabuk grameri + aktif öğe |
| axe (wcag2a/aa) | 39 rota · **0 ciddi/kritik ihlal** | |
| Görsel regresyon | 16/16 · eşik %0,5 | altınlar sıfırdan seed ile üretildi |
| Lighthouse | /giris 99 · / 94 · /uyum 97 · /bulgular 97 · **/portfoy 89** | dev sunucusunda |
| demo:build | başarılı | yayın · statik · kolon kontrolleri temiz |
| Veri | 98 tablonun **97'si dolu** · 3 649 kayıt | tek boş: `IsKilidi` (çalışma-anı kilidi) |
| CI | `pr-kapisi.yml` + `publish.yml` var | lint → tsc → test → tasarım → derleme |

---

## 2. Kapatılması gereken boşluklar

### P1 — kuruma açılmadan önce

**1. `xlsx` (SheetJS 0.18.5) yüksek önemde açık.**
`npm audit` üretim bağımlılıklarında 5 yüksek önemde açık buluyor; kritik
olanı **Prototype Pollution in SheetJS**. Bu kütüphane `lib/eylemler.ts:709`
ve `lib/entegrasyon/varlikAktarim.ts:222` üzerinden **kullanıcının yüklediği
dosyayı ayrıştırıyor** — yani saldırı yüzeyi doğrudan açık.
npm kayıt defterindeki en yeni sürüm de 0.18.5; düzeltme npm'de **yok**,
SheetJS dağıtımını kendi sitesine taşıdı. Üç seçenek var ve karar Ahmet'in:
paketi SheetJS'in kendi dağıtımından almak, `exceljs` gibi bir alternatife
geçmek, ya da xlsx yolunu kapatıp yalnız CSV kabul etmek.
Diğer dördü (`mysql2`, `deepmerge-ts`, `@prisma/config`, `prisma`) araç
zincirinde; `mysql2` bu üründe hiç kullanılmıyor (sağlayıcı SQLite).

**2. Test kapsamı %68,91 — hedef ≥%90.**
Açığın büyük kısmı sunucu eylemleri (`lib/eylemler2/`) ve ekran
bileşenleridir. Saf mantık katmanı (`mantik.ts` dosyaları) iyi kapsanmış
durumda; kapsanmayan yer, yetki kapısı ve form davranışlarının olduğu yer.

**3. `/impeccable critique` (#67) ve `/impeccable audit` (#68) hiç koşulmadı.**
`init` koştu (`web/PRODUCT.md` üretildi), `DESIGN.md` var. Bugüne kadar
koşulmamasının teknik bir sebebi vardı: **ekranların yarısı boştu**, boş
ekranda UX değerlendirmesi yanlış sonuç verir. Bu engel bugün kalktı.

### P2 — üretim öncesi

**4. Veritabanı SQLite.** `docs/POSTGRES_READINESS.md` on bir SQLite
bağımlılığı sayıyor ve ikisinin (tetikleyiciler, `LIKE` duyarlılığı)
Postgres'te **sessizce yanlış** davranacağını söylüyor — hata vermeden
yanlış sonuç. Şemadaki "yalnızca datasource değişir" cümlesi yanlış.
Çok kullanıcılı üretim için bu geçiş yapılmalı.

**5. `/portfoy` Lighthouse 89 (LCP/CLS).** Ölçüm **geliştirme
sunucusunda** yapıldı; üretim derlemesinde ölçülmedi. Üretimde 90'ın
üstüne çıkması beklenir ama bu bir tahmindir, ölçülene kadar öyle kalır.

**6. Yük testi yok.** Eşzamanlı kullanıcı, büyük kütük (10⁵ varlık) ve
uzun süren iş koşusu altında davranış ölçülmedi.
`docs/PERFORMANS_TABANI.md` tek kullanıcılı sentetik ölçümdür.

**7. Ürünün kendi verisinin yedekleme/geri yükleme prosedürü yazılmadı.**
Ürün müşterinin yedeklemesini izliyor; kendi yedeği için yazılı bir
prosedür yok.

### P3 — bilinen ve bilinçli eksikler

**8. Kesin santral koordinatları: 17 santralin 17'sinde yok.**
Harita bunları il merkezine **yaklaşık** koyuyor ve künyede "kesin konum
girilmedi" diye yazıyor. Uydurulmadı: yanlış bir nokta boş bir noktadan
pahalıdır, saha ekibi oraya gider. Doğrulanmış koordinat listesi gelirse
ekrandan ya da seed'den girilir, kod değişmez.

**9. A5 enerji performansı · B11–B12 canlı izleme · B14 bakım modeli.**
İlki ve üçüncüsü yeni şema ister; ikincisi canlı izleme verisi ister ve
güvenlik sınırının öbür tarafındadır.

**10. Hamburger / 64px ray varyantı** — tasarım kararı bekliyor.

**11. `?next=` üreticisi** — giriş sayfasındaki kapı güvenli ve çalışıyor,
ama parametreyi üreten taraf yok; middleware/proxy kararı ayrı bir iş.

**12. `public/atlas/` dizin adı** — eski kod adının son kalıntısı. Yayın
URL'lerini değiştireceği için ayrı bir PR'a bırakıldı.

**13. `.abacus.donotdelete`** — şifreli blob, dokunulmadı.

---

## 3. Kapsam dışı (Ahmet'in kesin sınırı)

AD/Entra · EDR · zafiyet tarayıcı · SIEM · yedekleme platformu · firewall
ve ağ cihazları · OT keşif ürünü · PAM/VPN/tedarikçi oturum sistemi ·
herhangi bir kurum içi API · gerçek credential/secret/token · gerçek
üretim OT ağı.

Bunların hiçbirine bağlanılmadı, hiçbiri için endpoint ya da kimlik
bilgisi uydurulmadı. Yedi connector tanımı **`kimlik_bekleniyor`**
durumunda duruyor ve ekran bunu açıkça yazıyor. Ürünün içindeki bütün
veri seed'dir.

Bu sınırın bir yan sonucu vardır ve ekranda görünür: **hiçbir veri kökeni
"doğrulandı" değildir.** Doğrulanmış bir köken hangi koşudan geldiğini
bilmek zorundadır (`kokensiz_dogrulama` kuralı); koşu bağlamı yaratmak da
bağlanmamış bir connector'ı "başarılı" göstermek olurdu ve
`entegrasyon-saglik` testi bunu yasaklar. İki kural da haklı; sonuç,
bugünkü gerçeğin kendisidir.
