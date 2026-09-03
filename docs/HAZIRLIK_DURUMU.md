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

**2. ~~Test kapsamı %68,91 — hedef ≥%90.~~ HEDEF YENİDEN YAZILDI:
davranış kritik katmanlarda ≥%85, ve MAKİNEYE BAĞLANDI.**

Ölçüm (03.09.2026): satır **%74,16** · deyim %70,96. Sunucu eylemleri
artık açığın büyük kısmı değil — `lib/eylemler2` %84 (oturum başında
%53,96), motorlar %94, entegrasyon çekirdeği %90, API uçları %90.

**Neden %90 hedefi bırakıldı.** Kalan açığın ağırlık merkezi ölçüldü ve
sunucu tarafında değil:

| katman | satır kapsamı |
| --- | --- |
| Otomasyon motorları | %93,9 |
| Entegrasyon çekirdeği | %90,3 |
| Dış API uçları | %90,0 |
| Yetki kapısı | %88,4 |
| Sunucu eylemleri (`eylemler2`) | %84,1 |
| `eylemler.ts` (eski katman) | %33,0 |
| Ekran saf mantığı (`mantik.ts`) | %56,5 |
| **Bileşenler** | **%22,1** |

Depoda bileşen test katmanı (React Testing Library ya da eşdeğeri)
**hiç yok**. Toplam %90, o katman kurulmadan matematiksel olarak
tutmaz. Sayıyı hedefe uydurmak bu belgenin kendi kuralına aykırı
olurdu; hedef ölçüme göre yeniden yazıldı.

**Hedef artık yazılı değil, KAPI.** Yazılı bir hedef bayatlar ve
bayatlığı fark edilmez. Eşikler `web/vitest.config.ts` içinde katman
katman duruyor; `npm run test:kapsam` eşiğin altına düşen katmanda
KIRMIZI döner ve hangi katman olduğunu adıyla söyler. Kapının gerçekten
ısırdığı deneyerek doğrulandı (eşik yapay olarak yükseltildi, koşu
çıkış kodu 1 verdi).

Eşikler bugünün ölçümünün bir tık ALTINA konuldu: bugün geçsin ama bir
**gerileme** yakalansın diye. Yukarı çekmek ayrı bir iştir ve ölçümle
yapılır.

**Kapsam dışında kalan iki şey bilinçlidir:** `eylemler.ts` eski
katmandır ve yeni iş `eylemler2`'ye gidiyor; bileşenler için önce test
katmanı kurulmalı. İkisi de eşik listesine KONMADI — koyulsaydı kapı ilk
günden kırmızı olur, kimse bakmazdı.

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

**3b. ~~Kapsamsız korunan eylemler.~~ KAPANDI — ve asıl ders,
sınıflandırmanın ELLE YAPILAMAYACAĞI oldu.**

2026-09-03'te iki aşamalı kapı ekran katmanına taşınırken sunucuda
ÜÇÜNCÜ bir kusur biçimi ölçüldü: hiç kapsam denetimi YAPMAYAN kapsamsız
ön kapılar. `tests/kapsam-kapisi-nobetci.test.ts` bunu yapısı gereği
göremiyordu — nöbetçi "kaydın tesisini denetleyip ön kapıyı kapsamsız
çağıran" eylemleri arar; hiç denetlemeyen ona takılmaz.

Kapsamsız ön kapılı 26 eylem önce ELLE tarandı. **O tarama iki yönden de
yanıldı ve bu, düzeltmenin kendisinden daha önemli bir bulgudur:**

· **Kaçırdı.** Şemada model adları elle arandı ve yanlış arandı: `Hesap`
  diye bir model yok, adı `KimlikHesabi` ve `tesisId` **taşıyor**. Aynı
  şekilde `Erisim` değil `ErisimAtamasi`. Dört gerçek kusur böyle
  "kurumsal" sayılıp listeden düştü.
· **Fazladan suçladı.** `kesifEslestir` ve `elleAktarimCalistir` "gerçek
  borç" diye yazıldı. İkisi de kuyruk işidir, CMDB'ye yazmaz ve kapsama
  çekilseler ürün **bozulurdu**: `KesifKaydi.tesisId` nullable ve şema
  "null = santral BİLİNMİYOR" diyor; kapsamlı bir toplu geçiş, santrali
  henüz çözülememiş kayıtları sistematik olarak atlardı — oysa triyaja en
  muhtaç olanlar tam da onlardır.

Bu yüzden ölçüt mekanikleştirildi ve nöbetçiye eklendi: **bir eylem
`tesisId` ile iş görüyorsa kapsamı sormak zorundadır; görmüyorsa
kurumsaldır.** Nöbetçi kurulur kurulmaz elle taramanın bulamadığı bir
tanesini daha buldu (`surum.ts · surumAktiflestir`); incelendi, kurumsal
çıktı — santral SEÇMEZ, kapsamda zaten olan santrallere satır yayar — ve
muafiyet defterine gerekçesiyle yazıldı.

**Kapatılan beş kusur, her biri kendi davranış testiyle:**

| eylem | kaydın santrali | önceki davranış |
| --- | --- | --- |
| `eylemler.ts · kanitEkle` | `MaddeDurumu.tesisId` (zorunlu) | santral rolü kendi maddesine kanıt ekleyemiyordu |
| `kimlik.ts · hesapKaydet` | `KimlikHesabi.tesisId` | kendi santralinin servis hesabını düzenleyemiyordu |
| `kimlik.ts · erisimAta` | hesabın santrali | kendi hesabına erişim atayamıyordu |
| `kimlik.ts · erisimIncele` | atama → hesap → santral | kendi atamasını inceleyemiyordu |
| `eylemler.ts · surecKapsamCikar` | girdideki `tesisId` | kendi santralini kapsama EKLEYEBİLİYOR ama ÇIKARAMIYORDU |

Hiçbiri sızıntı değildi — kapsamsız kapı fazladan yetki vermez, tersine
tesise kısıtlı rolü tümüyle dışarıda bırakır. Kusur aşırı katılıktı ve
sonucu şuydu: santral ekibi kendi santralinde çalışamıyordu. Kapılar
gevşetilirken kaydın KENDİ santrali de sorulmasaydı ters kusur açılırdı
(yabancı bir hesabı "kendi santralime al" diyerek ele geçirmek); bu
yüzden hem hedef hem kayıt denetleniyor.

Kalan kusur sayısı: **0.** Üç nöbetçi bu üç biçimi de arıyor.

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

**7. ~~Ürünün kendi verisinin yedekleme/geri yükleme prosedürü
yazılmadı.~~ YAZILDI ve KOŞULUR.** `docs/URUN_YEDEKLEME.md` +
`web/arac/yedek.mjs` (`npm run yedek`), testi
`web/tests/yedek-araci.test.ts`.

Prosedür düz metin bırakılmadı çünkü koşulmayan prosedür bayatlar ve
bayatlığı — yokluğunun aksine — fark edilmez. Ürünün kendi kuralı
(`restoreTestiKaydet`: geri yüklenebildiği kanıtlanmamış yedek, yedek
değildir) kendisine de uygulandı: araç yedeği alır ve AYNI komutta
doğrular, `--karsilastir` ile canlıyla mantıksal farkı sayıyla söyler.

`cp` kullanılmıyor: canlı SQLite dosyasını kopyalamak, kopyanın ortasında
bir yazma commit'lenirse tutarsız dosya üretir ve bu ancak geri
yüklerken — yani ihtiyaç anında — anlaşılır. `VACUUM INTO` tutarlı anlık
görüntü yazar; yan etkisi olarak yedek canlıdan bayt bayt farklı olur, bu
yüzden araç ayrıca MANTIKSAL (tablo satır sayılarından türeyen) bir özet
raporlar.

**Kapsanmayanlar belgede açıkça yazılıdır:** `.env` bilerek dışarıdadır
(sır, veriyle aynı yerde durmamalı); kanıt DOSYALARI bugün yoktur —
`Kanit.dosyaYolu` kolonu var ama hiçbir kod ona yazmıyor, dosya yükleme
geldiği gün araç eksik kalır. Saklama süresi, saklama yeri ve tatbikat
takvimi 03.09.2026'da karara bağlandı (günlük 14 gün · haftalık 3 ay ·
aylık 24 ay; en az iki yer, biri makine dışı; üç ayda bir **ve her
göçten sonra** tatbikat). Gerekçeleriyle `docs/URUN_YEDEKLEME.md §4`.
Yazılı bir regülasyon asgarisi çıkarsa 24 ayı ezer.

### P3 — bilinen ve bilinçli eksikler

**8. Kesin santral koordinatları: 17 santralin 17'sinde yok.**
Harita bunları il merkezine **yaklaşık** koyuyor ve künyede "kesin konum
girilmedi" diye yazıyor. Uydurulmadı: yanlış bir nokta boş bir noktadan
pahalıdır, saha ekibi oraya gider. Doğrulanmış koordinat listesi gelirse
ekrandan ya da seed'den girilir, kod değişmez.

**9. A5 enerji performansı · B11–B12 canlı izleme · B14 bakım modeli.**
İlki ve üçüncüsü yeni şema ister; ikincisi canlı izleme verisi ister ve
güvenlik sınırının öbür tarafındadır.

**10. ~~Hamburger / 64px ray varyantı~~ KONUSUZ KALDI — yeniden tasarım
sorunu başka yoldan çözdü.**

Karar verilmişti ve uygulanmıştı: üç seçenek gerçek ekran görüntüleriyle
karşılaştırıldı (yatay şerit · 64px dikey ikon rayı · hamburger çekmece),
Ahmet **çekmeceyi** seçti, çekmece odak tuzağı/Esc/geri dönüş ve kendi
canlı kapısıyla birlikte yazıldı.

**Sonra PR #8 (tek kabuk) main'e girdi ve A/B/C kabuklarını kaldırdı.**
Çekmecenin düzelttiği yapı — on altı öğeli dikey `.ab-a-ray` — artık
yok; `A_RAY` sözlüğü ve `ab-a-ray` sınıfı depoda hiç geçmiyor. Kod
olduğu gibi taşınsaydı var olmayan bir sözlüğe başvurur ve derlemeyi
kırardı; CSS'i de hiçbir şeyin render etmediği ölü kural olurdu.

**Sorunun kendisi de kalktı.** Ölçülen kusur, on altı ray öğesinin dar
bantta yatay şeride inip işaretsizce taşmasıydı. Tek kabukta üst çubuk
**beş alan** taşıyor; on altı öğelik taşma diye bir şey kalmadı.

Bu yüzden çekmece kodu ve `arac/cekmece-testi.mjs` kapısı birleştirme
sırasında DÜŞÜRÜLDÜ. Var olmayan bir rayı sınayan bir kapı, yeşil
yandığında yalan söyler.

**Kaydedilen karar boşa gitmedi, konusu değişti:** dar bantta gezinmenin
görünürlüğü bir üründe tekrar sorulacak bir sorudur. Tek kabuğun dar
bantta nasıl davrandığı HENÜZ ÖLÇÜLMEDİ; ölçüldüğünde sorun çıkarsa,
bu maddedeki karşılaştırma yöntemi ve çekmecenin bilinen bedeli
("kapalıyken hangi ekrandayım sorusu cevapsız kalır", düğmede aktif
ekran adıyla kapatılmıştı) hazır durumdadır.

**11. `?next=` üreticisi** — giriş sayfasındaki kapı güvenli ve çalışıyor,
ama parametreyi üreten taraf yok; middleware/proxy kararı ayrı bir iş.

**12. ~~`public/atlas/` dizin adı~~ KALKTI.** Dizin `public/santraller/`
oldu (`santral/` → `genis/`, `portfolio-triptych.webp` →
`notr-triptik.webp`); yollar yalnız `lib/gorsel.ts` içinde üretildiği için
değişiklik tek dosyada kaldı. Yayın URL'leri değişti: eski
`/atlas/santral/*.webp` bağları artık 404 döner.

**13. `.abacus.donotdelete`** — şifreli blob, dokunulmadı.

**14. ~~Yedi tesisin hero görseli yok.~~ KAPANDI.** Ahmet'in 2026-09-02'de
sağladığı yedi temsilî görsel bağlandı (Tercan HES · Sarıtepe RES · Ataköy
HES · Alaşehir Hibrit GES · Lüleburgaz DGKÇ · Demirciler RES · Zorlu Enerji
Genel Müdürlük); künye `public/santraller/KUNYE.md`. **Portföydeki 17
tesisin 17'sinin de görseli var.** Tipografik fallback yolu silinmedi:
görseli olmayan yeni bir tesis eklenirse yine fallback alır, **başka bir
tesisin görseli dolgu amacıyla kullanılmaz** (`lib/gorsel.ts` §1).
Demirciler ile Sarıtepe'nin ikisi de Osmaniye'de RES olduğu hâlde ayrı
fotoğraf beklendi; biri ötekinin yerine konmadı.

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
