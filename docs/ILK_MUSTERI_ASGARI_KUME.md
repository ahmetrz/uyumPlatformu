# İlk müşteri asgari kümesi

**Ölçüm tarihi: 9 Eylül 2026.** Bu belge tek soruya cevap verir: *ilk
ödeyen kiracıyı canlıya almak için bugünkü kod tabanında ne yapılmalı?*
Sayılar ölçülmüştür; ölçülemeyen "ölçülmedi" yazar. Hedef tarih
**yazılmaz** (`docs/GELISTIRME_PAKETLERI.md` §1: süre tahmini yoktur).

Küme beştir: **TR-ENERJI içeriği · R5 (PostgreSQL) · P7 (dağıtım) ·
R3 (yedek + kanıt) · R12 (denetim formları)**. Dördü olmadan kurulum
yapılamaz; R12 olmadan yapılır ama müşteri ürünü denetimde kullanamaz.

---

## 0 · Bugün elde ne var (ölçüldü)

| Ölçüm | Değer | Nasıl ölçüldü |
| --- | --- | --- |
| Şema modeli | 157 | `grep -c '^model ' web/prisma/schema.prisma` |
| Göç | 51 (`migration.sql` taşıyan dizin), boş veritabanında şema farkı 0 | `npm run kapi:goc-zinciri` |
| Test | 3 467 vaka · 189 dosya | `web/arac/test-envanteri.json` |
| Senaryo kütüğü | 319 senaryo · GAP 0 | `npx tsx arac/senaryo-belge.mjs` |
| Kapı | 20 (PR kapısından türetilir) | `npm run kapi:parti --liste` |
| Araç betiği | 60 | `ls web/arac/*.mjs | wc -l` |
| API ucu | 10 (`app/api/v1/`, hepsi `route.api.ts`) | dizin sayımı |
| TR-ENERJI paketi | 601 madde · 584 metinli · 2 çerçeve | `npm run paket:dogrula -- paketler/TR-ENERJI` |
| TR-BANKACILIK paketi | 58 madde · metin YOK (iskelet) | aynı araç |
| Demo paketleri | 3 (ORTAK 11 madde · ENERJI 27 · SU 0) | aynı araç |
| `deploy/` dizini | **yok** | dizin yok |
| `docs/KURULUM.md` | **yok** | dosya yok |
| `kiraciId` taşıyan model | **0** | `grep -c kiraciId schema.prisma` |
| Ham SQL tetikleyici | 6 (`CREATE TRIGGER`) | göç dosyaları |
| Ürün yedeği | `web/arac/yedek.mjs` · 170 satır · yalnız veritabanı | dosya |
| Kanıt deposu | `web/lib/uyum/kanitDeposu.ts` · 145 satır · yerel dosya, içerik adresli | dosya |

---

## 1 · TR-ENERJI içeriği — en yakın kalem

**Bugün.** Yönetmelik gövdesi (4 bölüm + 18 madde + 1 geçici) ve **Ek-3**
(13 aile + 565 kontrol) tam metinle pakette; her metinli maddede kaynak
adresi, belge içi konum ve erişim tarihi var. Çerçeveler uygulanabilirlik
beyan ediyor. Kurulum sonrası sürümler TASLAK gelir.

**Kalan (ölçülmüş).** EPDK yedi ek yayımlar; pakette **bir tanesi** var.
Kalan altı ekin kontrol sayısı `docs/TR_SEKTOR_PAKETLERI.md` §4'te
ölçülü: toplam 3 691 kontrol, Ek-3 dışındakiler **3 126**. Aynı yolla
aktarılırlar — dosya biçimi aynı (XLSX), okuma betiği aynı.

| İş | Dosya / göç | Ölçü |
| --- | --- | --- |
| Ek-1 · Ek-2 · Ek-4 … Ek-7 aktarımı | `web/paketler/TR-ENERJI/cerceve/EPDK-SGYM-EK<N>.{json,csv}` | 6 çerçeve · 3 126 kontrol · şema göçü **yok** |
| Her ekin uygulanabilirlik beyanı | aynı JSON'un `uygulanabilirlik` alanı | ek başına 1 beyan; `epdkEki` özniteliği zaten var |
| Yükümlülükler (7545 · EPDK SOME süreleri) | `web/paketler/TR-ENERJI/yukumlulukler.json` (bugün `[]`) | R10'un girdisi; kaynak metni elde |
| Denetim formu şablonu | `web/paketler/TR-ENERJI/form/` (bugün yok) | R12'nin girdisi |

**Ön koşul.** Yalnız kaynak erişimi. `epdk.gov.tr` erişilebilir (ölçüldü,
9 Eyl 2026); `mevzuat.gov.tr` ve `resmigazete.gov.tr` erişilemedi (HTTP
000) — gerekmedi, EPDK birincil kaynağı sunuyor.

---

## 2 · R5 · PostgreSQL — kurulumun taşıyıcısı

**Neden asgari kümede.** Müşteri kurulumu tek dosyalı SQLite ile
yapılmaz: eşzamanlı yazma, yedek/geri yükleme ve satır düzeyi güvenlik
(P2/RLS) buna dayanır.

**Bugün.** `docs/POSTGRES_READINESS.md` **on bir** SQLite bağımlılığı
sayar; **ikisi sessizce yanlış** davranır (tetikleyiciler ve `LIKE`
büyük/küçük harf duyarlılığı). Ölçülen dokunulacak yerler:

| İş | Dosya / göç | Ölçü |
| --- | --- | --- |
| Sürücü ve bağlantı | `web/lib/db.ts` · `web/prisma.config.ts` · `web/tests/sahte/db.ts` · `web/.env` · `web/package.json` | 5 dosya, `migration_lock.toml` sağlayıcı satırı dâhil |
| Tetikleyicilerin PostgreSQL karşılığı | yeni taban göçü | 6 `CREATE TRIGGER` (UPDATE · DELETE · TRUNCATE üçlüsü) |
| Arama duyarlılığı | `web/lib/aramaKosulu.ts` | tek satır + bekçi testi |
| Test izolasyonu | `web/tests/sahte/db.ts` | dosya kopyası → şema/transaction; 189 test dosyasının tabanı |
| Nullable tekillik | şema | bugün ölçülen **8** `@@unique` nullable kolon taşıyor; `docs/POSTGRES_READINESS.md` **6** sayıyor (bayat) |
| CI | `.github/workflows/pr-kapisi.yml` | PostgreSQL servisi + ikinci koşum |
| Yük ölçümü | `web/arac/yuk.mjs` | 10⁵ varlık · 20 oturum; sonuç `docs/PERFORMANS_TABANI.md` |

**Kapı.** Yeni bir şey icat edilmez: `kapi:goc-zinciri` PostgreSQL'de de
koşar (boş veritabanı → şema farkı 0). Bu, göç zincirinin iki sağlayıcıda
da doğru olduğunu ölçen tek kapıdır.

---

## 3 · P7 · Dağıtım — kurulumun kendisi

**Bugün.** `deploy/` **yok**, `docs/KURULUM.md` **yok**, sağlık ucu
(`/api/v1/health`) **yok** (10 API ucu var, hiçbiri sağlık değil;
`/saglik` bir EKRAN rotasıdır, liveness/readiness ucu değil).
Sağlayıcılar defterde kayıtlı ama bağlı değil (S3, Redis, kuyruk, Vault).
Statik demo derlemesi var ve CI'da koşuyor.

| İş | Dosya / yeni modül | Ölçü |
| --- | --- | --- |
| Tek kiracılı on-prem paket | `deploy/compose/` (yeni) | Compose + `.env` şablonu; K19 kararı: on-prem önce |
| Yapılandırma şeması | `web/lib/yapilandirma/ortam.ts` (yeni) | tek zod şeması; bugün ortam değişkenleri dağınık |
| Kurulum belgesi | `docs/KURULUM.md` (yeni) | ön koşul · adım · doğrulama |
| Sağlık ucu | `web/app/api/v1/health/route.api.ts` (yeni) | liveness + readiness; erişilemezken 503 ve sebep |
| Nesne deposu sağlayıcısı | `web/lib/uyum/kanitDeposu.ts` genişler | S3 uyumlu; içerik adresli anahtar korunur |
| Yapısal log + sır maskesi | mevcut log yolu | bekçi: logda sır referansı değeri yok |

**Kapsam dışı (şimdilik).** Helm ve çok kiracılı SaaS — P2'nin SaaS
tarafı ertelendi; ilk müşteri tek kiracı.

---

## 4 · R3 · Yedek ve kanıt — sözleşmenin şartı

**Bugün.** `web/arac/yedek.mjs` (170 satır) **yalnız veritabanını** alır
(`VACUUM INTO` — tutarlı anlık görüntü). Kanıt dosyaları artık **var ve
diske yazılıyor** (`lib/eylemler2/kanit.ts` `depoAnahtari` + `dosyaHash`
yazar; depo `lib/uyum/kanitDeposu.ts`, içerik adresli, MIME izin listeli)
ama yedeğe **girmiyor**. Hem aracın kendi başlığı hem
`docs/URUN_YEDEKLEME.md` (satır 26 · 29 · 30 · 144) hâlâ "kanıt dosyası
yok" diyor — cümlenin harfi doğru (`Kanit.dosyaYolu` yazılmıyor), sonucu
**yanlış**: dosyalar depoda.

| İş | Dosya | Ölçü |
| --- | --- | --- |
| Yedek kanıt deposunu da alsın | `web/arac/yedek.mjs` | `--al` tar + manifest (anahtar · boyut · özet); araç bugün `VACUUM INTO` ile yalnız veritabanı alıyor |
| Geri yükleme tatbikatı dosyaları doğrulasın | aynı dosya + `web/tests/yedek-araci.test.ts` | `--karsilastir` `Kanit.dosyaHash` ile |
| Belge düzeltmesi | `docs/URUN_YEDEKLEME.md` | bayat satırlar kalkar |
| Zaman damgası (RFC 3161) | `web/lib/uyum/disSaglayicilar.ts` `imza` ailesi | bağlı değilken bugünkü `imzasiz` davranışı korunur |

**Ön koşul yok.** Bu kalem tamamen kod tarafındadır; müşteri sistemine
bağlanmaz.

---

## 5 · R12 · Denetim formları — ürünü denetimde kullanılır kılan

**Bugün.** Dışa aktarım **CSV** (`lib/disaAktarim/csv.ts`, 148 satır) ve
**JSON kanıt paketi** (`paket.ts`, 668 satır) ile sınırlı: üretim kodunda
**PDF üreten kod yok**, **XLSX yalnız OKUNUYOR** (form doğrulama ve içe
aktarım). `RaporSablonu` · `FormSablonu` katalogları P4 ile geldi ama
`app/` altında bu tablolara **tek bir atıf yok** — şablon kurulur, tabloda
durur, hiçbir yüzeye çıkmaz.

| İş | Dosya / yeni modül | Ölçü |
| --- | --- | --- |
| EPDK öz denetim / fark analizi çıktısı | `web/lib/disaAktarim/formlar/epdkOzDenetim.ts` (yeni) | kapsam öğesi × madde satırı; "değerlendirilmedi" boş bırakılmaz |
| Şablonu ekranın okuması | `/raporlar` + form ekranı | P4'ün bıraktığı tek boşluk |
| Paket tarafı | `web/paketler/TR-ENERJI/form/` | şablon paketle gelir, çekirdek genel doldurucu taşır |

**Neden asgari kümede.** Uyum ürününün satın alma gerekçesi denetimdir;
denetçinin istediği tabloyu üretemeyen ürün, veriyi toplasa da işi
bitirmez.

---

## 6 · Bu kümenin dışında bırakılanlar — koşullu gerekçe

| Kalem | Ne zaman gerekir |
| --- | --- |
| P2 · çok kiracılılık (SaaS) | İkinci kiracı aynı kurulumu paylaşacaksa. Tek müşteride kurulum başına bir veritabanı yeter. |
| P6 · SSO/MFA | Müşteri kendi kimlik sağlayıcısını (Entra/Keycloak) şart koşarsa; yerel hesap + oran sınırı bugün var. |
| P3 · çok dil | İkinci dilde arayüz isteyen kiracı çıkarsa; 263+ dosyaya dokunur, ihtiyaç doğmadan ödenmez. |
| EU/US paketleri | Yurt dışı kiracı ya da yurt dışı yükümlülüğü olan bir kiracı gelirse; paket biçimi ülke boyutunu zaten taşıyor. |
| R6 · SCF/STRM | Telifli çerçeve içeriği hukuki görüşle netleşirse; OSCAL okuyucu hazır, içerik yok. |
| R1 · mevzuat radarı | İlk kurulumdan sonra: müşteri "değişikliği kaçırmayalım" dediği anda. Kaynak kataloğu paket biçiminde hazır. |
| R10 · bildirim akışı | Müşteri gerçek bir olay bildirimi yapacağı gün; `BildirimYukumlulugu` modeli ve süre motoru var, yükümlülük içeriği yok. |
| R7–R9 · R11 · R13–R16 | Ürün canlıda çalışırken ölçülen ihtiyaca göre; hiçbiri kurulumun önünde değil. |

---

## 7 · Sıra

```
TR-ENERJI içeriği (kalan 6 ek)  ─┐
R5 · PostgreSQL ────────────────┼─► P7 · dağıtım ──► ilk kurulum
R3 · yedek + kanıt ─────────────┘        │
R12 · denetim formları ──────────────────┘  (kurulumdan sonra, ilk denetimden önce)
```

R5 ile P7 sıralıdır (dağıtım veritabanını taşır). TR-ENERJI içeriği ve
R3 bunlardan bağımsızdır; paralel yürür. R12 kurulumdan sonra, ilk
denetim tarihinden önce biter.

**Bitiş ölçütü (kümenin tamamı):** boş bir sunucuda `docs/KURULUM.md`
izlenerek kurulum yapılır, PostgreSQL üzerinde tam test kümesi yeşil
koşar, TR-ENERJI paketi kurulur ve çerçeve insan kararıyla
aktifleştirilir, bir kanıt dosyası yüklenip yedeği alınır ve geri
yüklemede doğrulanır, EPDK öz denetim çıktısı üretilir.
