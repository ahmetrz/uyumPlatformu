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
| Vitest | 68 dosya · 1267 geçti · 1 atlandı | |
| Kapsam (V8) | **satır %69,09 · deyim %66,43** | hedef ≥%90 — altında |
| Tasarım kapısı | kontrast 0 kusur · eski iz 0 | 3 kip × 14 mürekkep × 4 zemin |
| Gezinme | 7 bant (1920…375) · 0 kusur | kabuk içi + kabuklar arası |
| Rota duman | 46/46 | kabuk grameri + aktif öğe + **tek ana bölge** |
| axe (wcag2a/aa) | 39 rota · **0 ciddi/kritik ihlal** | |
| Yatay taşma | 38 rota × 2 bant (375 · 768) · **0 kusur** | yeni kapı: `tasarim:tasma` |
| Dokunma hedefi | WCAG 2.5.8 · eşik altı kalan yok | kalanlar satır içi bağ istisnası |
| Görsel regresyon | 16/16 · eşik %0,5 | altınlar sıfırdan seed ile üretildi |
| Lighthouse | /giris 99 · / 98 · /uyum 99 · /bulgular 99 · **/portfoy 91** | **üretim derlemesinde** (`next start`) |
| Lighthouse (perf dışı) | 5 rotanın 5'inde erişilebilirlik · en iyi uygulama · SEO **100** | |
| Polish turu | 6 ekran × 2 bant · 3 kusur bulundu ve kapatıldı | tek tur + tek doğrulama |
| demo:build | başarılı | yayın · statik · kolon kontrolleri temiz |
| Veri | 98 tablonun **97'si dolu** · 3 649 kayıt | tek boş: `IsKilidi` (çalışma-anı kilidi) |
| CI | `pr-kapisi.yml` + `publish.yml` var | lint → tsc → test → tasarım → derleme |

---

## 2. Kapatılması gereken boşluklar

### P1 — kuruma açılmadan önce

**1. ~~`xlsx` (SheetJS 0.18.5) yüksek önemde açık.~~ KAPANDI.**
Bağımlılık SheetJS'in **kendi dağıtımındaki 0.20.3**'e taşındı
(`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`). İki açık da
kapalı: prototype pollution 0.19.3'te, ReDoS 0.20.2'de. Kütüphane aynı
kütüphanedir, yalnız yamalı sürümüdür — üç çağrı yerinin hiçbiri
değişmedi. Üretim bağımlılıklarındaki yüksek önemli açık 5 → 4'e indi;
kalan dördü (`mysql2`, `deepmerge-ts`, `@prisma/config`, `prisma`) araç
zincirinde ve `mysql2` bu üründe hiç kullanılmıyor (sağlayıcı SQLite).

`exceljs` seçilmedi ve gerekçesi ölçüldü: son yayını **2024-12-20**
(yaklaşık 20 ay sessiz), `.xls` (BIFF8) **okumuyor** — oysa iki yükleme
ekranı da `.xls` kabul ediyor — CSV'yi ayrı bir okuyucuyla alıyor ve
hücre modeli farklı (`{richText}`, `{formula,result}`, 1-indeksli satır).
O farkların düşeceği yer `hucreMetni`dir, yani "bilinmeyen ≠ sıfır"
kuralının kod karşılığı. Bilinen ve yukarıda kapatılmış bir sorunu,
bakımı durmuş bir bağımlılığın bilinmeyen geleceğiyle takas etmek
olurdu.

**Bu kararın iki bedeli vardır ve ikisi de gerçektir:**

· **`npm audit` bu paketi artık göremiyor.** Paket kayıt defterinde
  durmadığı için uyarı kayboldu — ama gelecekteki uyarılar da kaybolacak.
  Yerine `tests/bagimlilik-guvenligi.test.ts` nöbetçisi geçti:
  bağımlılığın npm'in yamasız 0.18.x'ine geri düşmediğini, sürümün 0.20.2
  tabanının üstünde olduğunu, tarball'ın gerçekten depoda durduğunu ve
  **diskteki dosyanın özetinin kilit dosyasındakiyle birebir aynı**
  olduğunu her koşuda ölçüyor. O özet, dosya henüz cdn.sheetjs.com'dan
  inerken npm tarafından yazıldı; depodaki kopya sonradan konuldu ve aynı
  çıktı — zincir kanıtlı. Dosya sessizce takas edilirse test patlar.
· **Sürüm yükseltmesi elle yapılır.** Depodaki dosyayı npm tazelemez;
  yeni sürüm gelince tarball indirilip `vendor/` içindeki değiştirilir ve
  nöbetçideki `TABAN` sabiti yükseltilir. Yordam `web/vendor/BENIOKU.md`
  içinde yazılıdır.

**Kurumsal registry sorunu YOKTUR.** Tarball bir süre doğrudan
`cdn.sheetjs.com`a bağlıydı; bu, npm'i Nexus/Artifactory üzerinden
proxy'leyen kısıtlı bir koşucuda kurulumu kırardı. Dosya depoya alınınca
o bağımlılık tamamen kalktı: kurulum hiçbir dış adrese çıkmıyor, IT'den
izin gerekmiyor.

**Ayrıştırma dalı artık testli.** Bu göçten önce iki okuyucunun da
`.xlsx` dalı tamamen kapsamsızdı — `varlik-aktarim` testleri yalnız CSV
tamponu besliyordu. Depoda donmuş bir `.xlsx` fikstürü
(`tests/fixture/aktarim-ornek.xlsx`, üreteci `arac/xlsx-fikstur.mjs`) ve
11 vaka eklendi: boş başlık, tekrarlanan başlık, tarih, sayı, mantıksal,
BOŞ hücre (`0` uydurulmamalı), gerçek sıfır, boşluk kırpma, Türkçe
karakter, boş satır düşürme. Fikstür 0.18.5 tarafından yazıldı ve
0.20.3 tarafından aynı biçimde okundu; tarayıcıdaki Excel dışa aktarımı
da uçtan uca doğrulandı (indirilen dosya geri okundu: 53 satır, 0 sayfa
hatası) ve `.xlsx` yükleme ekranından geçirildi (3 satır, boş satır
düştü).

**2. Test kapsamı %68,91 — hedef ≥%90.**
Açığın büyük kısmı sunucu eylemleri (`lib/eylemler2/`) ve ekran
bileşenleridir. Saf mantık katmanı (`mantik.ts` dosyaları) iyi kapsanmış
durumda; kapsanmayan yer, yetki kapısı ve form davranışlarının olduğu yer.

**3. ~~`/impeccable critique` ve `/impeccable audit` hiç koşulmadı.~~ KOŞTU.**
İkisi de dolu ekranlarda koştu ve bulguları uygulandı. Denetimin
çıkardığı ve kapatılan dört kusur:

· **Dar bantta yatay taşma.** Altı rota 375px'te yana kayıyordu, otuz
  dördü 768px'te. Kök sebepler ayrı ayrıydı (ızgara `fr` dağıtımı, satır
  içi kutuda çalışmayan `text-overflow`, `overflow: hidden` ile KIRPILAN
  saha alanı, 34px sabit yükseklikli saha seçici başlığı). Kural tek bir
  yere toplandı (`components/kabuk/tablo.tsx · darSablon`) ve
  `arac/yatay-tasma.mjs` kapısı kondu: taşmayı üreten öğeyi adıyla yazar.
· **`/uyum` ekranının hiç ana bölgesi yoktu** (`<main>` yerine `<div>`).
  axe'ın wcag2a/aa kümesi bunu görmez — `landmark-one-main` en iyi
  uygulama kuralıdır — Lighthouse erişilebilirliği 98'de tutuyordu ve
  gerekçe hiçbir yerde yazmıyordu. Düzeltildi; rota duman kapısı artık
  her rotada tek ana bölge arar.
· **24px altında dokunma hedefleri** (WCAG 2.2 · 2.5.8). Kutu büyütmek
  yoğun kütükleri seyreltir ve alt çizgiyi metinden koparır; alan
  bunun yerine mutlak konumlu bir sözde öğeyle genişletildi — yerleşim
  ve tipografi olduğu gibi kaldı. Kalan küçük hedefler cümle içindeki
  bağlardır ve ölçütün "satır içi" istisnasına girer.
· **Lighthouse tam puanın altını sessiz geçiyordu.** Araç yalnız EŞİĞİN
  (90) altındaki kategorilerin gerekçesini topluyordu; 100'den 91'e düşen
  bir kategori sebepsiz kalıyordu. Artık tam olmayan her kategori
  gerekçesini yazar — `/uyum`un eksik ana bölgesi böyle bulundu.

`/impeccable polish` tek turda üç kusur buldu ve üçü de kapatıldı:
telefon dizini tek kolonda 626px sürüyor ve defter ekranlarının içeriği
1035px'te — yani ikinci ekranda — başlıyordu (iki kolona indi, 378px);
portföy süzgecindeki `select` 160px tabanıyla sağ oluğu yiyordu; saha
takımyıldızındaki nabız halkası 2,4× yarıçapla komşu santralin künyesini
süpürüyordu.

### P2 — üretim öncesi

**4. Veritabanı SQLite.** `docs/POSTGRES_READINESS.md` on bir SQLite
bağımlılığı sayıyor ve ikisinin (tetikleyiciler, `LIKE` duyarlılığı)
Postgres'te **sessizce yanlış** davranacağını söylüyor — hata vermeden
yanlış sonuç. Şemadaki "yalnızca datasource değişir" cümlesi yanlış.
Çok kullanıcılı üretim için bu geçiş yapılmalı.

**5. ~~`/portfoy` Lighthouse 89.~~ ÜRETİMDE ÖLÇÜLDÜ: 91–93.**
`next build` + `next start` üzerinde beş rotanın beşi de eşiğin
üstünde (`/giris` 99 · `/` 98 · `/uyum` 99 · `/bulgular` 99 ·
`/portfoy` 91–93; koşudan koşuya oynar). `/portfoy` hâlâ en zayıfı:
LCP 0,78 ve CLS 0,89 puanı düşürüyor. Kaymanın kaynağı kısılmasız
tarayıcıda yeniden üretilemedi (`layout-shift` gözlemcisi sıfır kayıt
verdi); Lighthouse'un 4× CPU kısması altında görünüyor. Eşiğin üstünde
olduğu için kapatılmadı, **açık ve ölçülmüş** bırakıldı.

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

**12. ~~`public/atlas/` dizin adı~~ KALKTI.** Dizin `public/santraller/`
oldu (`santral/` → `genis/`, `portfolio-triptych.webp` →
`notr-triptik.webp`); yollar yalnız `lib/gorsel.ts` içinde üretildiği için
değişiklik tek dosyada kaldı. Yayın URL'leri değişti: eski
`/atlas/santral/*.webp` bağları artık 404 döner.

**13. `.abacus.donotdelete`** — şifreli blob, dokunulmadı.

**14. Yedi santralin hero görseli yok.** Fotoğrafı olmayanlar: Tercan HES
(küçük görseli var, hero'su yok), Sarıtepe RES, Demirciler RES, Ataköy
HES, Alaşehir Hibrit GES, Lüleburgaz DGKÇ, Zorlu Center. Hepsi tipografik
fallback alıyor; **başka bir santralin görseli dolgu amacıyla
kullanılmaz** (`lib/gorsel.ts` §1, `public/santraller/KUNYE.md`).
Ahmet beş temsilî görsel sağladığında eşleme önerisi hazırdır — büyük
beton baraj → Tercan, sırt türbinleri → Sarıtepe, doğalgaz kombine çevrim
→ Lüleburgaz, jeotermal + güneş → Alaşehir Hibrit GES, küçük gövde →
Ataköy. Demirciler RES ve Zorlu Center o beşle de kapanmaz.

**15. Haritada ülke sınırı çizilmiyor.** Tuval şu an yalnız işaretleri ve
enlem/boylam çerçevesini çiziyor. Doğrulanmış bir GeoJSON eklenirse tuval
onu okur ve yerleşim değişmez; veri dosyası kararı verilmedi. Uydurma
sınır çizilmedi.

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
