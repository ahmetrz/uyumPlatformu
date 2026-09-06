# Geliştirme Paketleri — Kod Karşısında Durum

**Tarih:** 6 Eylül 2026 · **Ölçüm noktası:** `fc66712` (dal:
`claude/bt-ot-governance-setup-6d5ftc`, `origin/main` ile aynı commit) ·
**Kapsam:** `docs/GELISTIRME_PAKETLERI.md` §2–§6'daki 26 paketin tamamı

Bu belge `PAKET: PLAN` oturumunun çıktısıdır. Kod **değiştirilmedi**,
migration açılmadı, şema dosyasına dokunulmadı; yalnız okuma, arama ve
kalite kapılarının koşturulması yapıldı.

Belge ile kod çeliştiğinde **kod** gerçek kabul edildi. Her sayının
yanında onu üreten komut ya da dosya:satır kaynağı vardır. Ölçülemeyen
hiçbir şey "geçti" diye yazılmadı.

---

## 1. Sonuç — önce yapılacaklar

**Hemen karar isteyen üç madde (ürün sahibinden):**

1. **Genel depo geçmişinde gerçek kurum ve tesis adları duruyor.**
   6 Eylül temizliği çalışma ağacını temizledi ama **geçmişi
   temizlemedi**. Bugünkü `main`'in ilk üç commit'inde (`128dcd7`,
   `5d5d95e`, `8d7f5e4`) gerçek şirket ve santral adları hâlâ okunabilir
   durumda; depo **public**. Ayrıntı ve sayılar §3'te. Bu, `URUN_VIZYONU`
   §6.5 "gerçek tesis adı koda girmez" kuralının bugün geçmiş tarafında
   **sağlanmadığı** anlamına gelir. Çözüm (geçmiş yazımı ya da depoyu
   geçici olarak private yapmak) ürün sahibinin kararıdır; bu oturumda
   yapılmadı.
2. **Çalışma ağacındaki üç kalıntının ikisi kapatıldı** (§3.2): giriş
   ekranının gerçek santral fotoğrafı ve onu kurgusal "Saha A"ya bağlayan
   cümleler kaldırıldı (K1); iki koddaki gerçek grup şirketi
   kısaltmaları temizlendi (K2). Açık kalan: künye dosyasının kurgusal
   adları gerçek il ve coğrafyalarla eşlemesi (K3) — ürün sahibi kararıyla
   bilerek bırakıldı, P8'e.
3. **P0'ın kabul kriteri URN-KUR-004 bugünkü hâliyle ölçülemez** (§5,
   P0). `grep -ri "regula"` ölçütü Türkçe alan sözcüğü "regülasyon" ile
   çakışıyor: bugün 706 satır / 140 kod dosyası eşleşiyor (üretilmiş
   Prisma istemcisiyle birlikte 4 013), "sıfır" hiçbir zaman
   çıkmayacak. Ölçüt değişmeli.

**Belgede düzeltilecek 32 bayat/yanlış/ölçülemez madde** §6'da
listelendi (Ç1–Ç32). Yedi çelişki (Ç1, Ç2, Ç3, Ç4, Ç16, Ç18, Ç26)
**altı kabul kriterini** bugünkü kodla karşılanamaz hâle getiriyordu:
URN-KUR-004, URN-ALN-001, URN-ALN-002, ALT-PG-002, ALT-PG-003 ve
URN-KIR-005.

**P0 ile 11'i kapatıldı** (Ç1, Ç2, Ç3, Ç4, Ç5, Ç6, Ç11, Ç12, Ç13, Ç14,
Ç15) — üç kabul kriteri gerçek sayılarla yeniden yazıldı (URN-KUR-004,
URN-ALN-001, URN-ALN-002), P0'ın "kod değişikliği yok" kısıtı gerekçesi
belgeye yazılarak kaldırıldı, `CLAUDE.md`'nin 13 ölü atfı temizlendi.
Kalan 21'i ilgili paketlerinde ele alınır; **ALT-PG-002 ve ALT-PG-003
(R5) ile URN-KIR-005 (P2) hâlâ açıktır** ve o paketler açılmadan
düzeltilmelidir.

**Paketlerin hazırlık durumu:** "Bugün" satırı taşıyan **25** paketin
(P5 ve R17 içeriksiz, R0 bir kütük) **21'i** koda birebir oturuyor.
Dördünde sapma var: **P0** ve **P8** bayat (seed adları 6 Eylül'de
kurgusala çevrildi), **R5** kısmen bayat ("yük testi yapılmamış" —
oysa ölçüm var), **P1**'de iki küçük sapma (tip kodu `JES` değil `JEO`;
"Santral 360" render edilen bir başlık değil). Hiçbir pakette "dur ve
sor" koşulu *bugün* tetiklenmiyor; altı paket (R1, R2, R3, R8, R11,
R14) içerik dosyası ya da gerçek kimlik gelmeden **yalnız iskeletine
kadar** ilerleyebilir.

**Önerilen ilk paket:** P0 — belge tarafı bugün başlanabilir, girdi
belgesi (`docs/URUN_VIZYONU.md`) zaten depoda ve ad kararı verilmiş.
25 satırlık planı §8'de.

---

## 2. Nasıl ölçüldü

### 2.1 Koşturulan kapılar (hepsi bu oturumda, bu commit'te)

`web/` dizininde, `npm ci` + `npm run db:hazirla` sonrası:

| Kapı | Komut | Sonuç |
|---|---|---|
| Tip denetimi | `npx tsc --noEmit` | **yeşil** (çıkış 0) |
| Lint | `npx eslint .` | **yeşil** (çıkış 0) |
| Testler | `npx vitest run` | **yeşil** — 139/139 dosya · 2 903 geçti · 1 atlandı |
| Üretim derlemesi | `npx next build` | **yeşil** (çıkış 0) |
| Sabotaj kütüğü | `npm run sabotaj` | **yeşil** — 24 sabotaj · 24 yakalandı · 0 kaçtı |
| Ters kapsam | `npm run ters:kapsam` | **yeşil** — 387 davranış · 387 senaryolu · 0 senaryosuz |
| Senaryo belgesi | `npx tsx arac/senaryo-belge.mjs` | **yeşil** — 273 senaryo · 273 testli · 0 boşluk |
| Şema kayması | `npx prisma migrate diff --from-config-datasource --to-schema=prisma/schema.prisma --script` | **kayma yok** ("empty migration") |

**Ölçülmedi:** tarayıcı isteyen kapılar (`rota:duman`, `tasarim:kapi`,
`tasarim:axe`, `tasarim:tasma`, `gezinme:test`, Lighthouse) — canlı
sunucu gerektiriyor ve bu oturumda koşturulmadı. "Geçti" yazılmadı.
`npm run demo:build` de koşturulmadı.

### 2.2 Kaynaktan sayılan ölçüler

`node arac/sayimlar.mjs` çıktısı (bu commit'te):

| Ölçü | Değer |
|---|---|
| test dosyası | 139 |
| test vakası | 2 904 |
| atlanan test | 1 |
| ekran (rota) | 58 |
| API ucu (`route.api.ts`) | 10 |
| otomasyon motoru | 18 |
| connector adaptörü | 8 |
| sunucu eylemi modülü | 49 |
| Prisma modeli | 146 |
| uygulanmış göç | 33 |

Örnek veriden (seed'li `prisma/dev.db`, Prisma sorgusuyla):
17 tesis · 27 üretim ünitesi · 4 regülasyon · 38 madde (EPDK-SYM 27 ·
CBDDÖ 4 · ISO-27001 4 · SPK-BS 3) · 8 madde eşleştirmesi · 343 varlık ·
6 tesis tipi · 13 uygulanabilirlik kararı (4 "uygulanabilir").

---

## 3. Gerçek ad ve gerçek veri taraması

Ürün sahibinin isteği: "Kurum ve tesis adları 6 Eylül 2026'da kurgusala
çevrildi; gerçek ad bulursan RAPORLA."

### 3.1 Çalışma ağacında gerçek tesis/şirket **adı** yok

`git grep -i` ile taranan gerçek adların (eski portföyün tesis adları ve
grup şirketi adı — 15 ayrı ad) **hiçbiri** bugünkü ağaçta yok. Seed'deki 17 tesisin
tamamı kurgusal: `SAHA-A1 / "Saha A-1 JES"` … `SAHA-M-DGKC / "Saha M
DGKÇ (devredildi)"`, tüzel kişiler `Demo Enerji Üretim A.Ş.` vb.
(`web/prisma/seed.ts:68-84`).

`gh-pages` dalı da temiz — `6d7b125 "Yayın: fc66712"` ile bugünkü temiz
tepe noktasından yeniden yayımlanmış.

### 3.2 Üç kalıntı vardı — ikisi kapatıldı

| # | Nerede | Ne | Durum |
|---|---|---|---|
| K1 | `web/public/gorseller/KUNYE.md` · `web/app/(giris)/giris/page.tsx` · `web/PRODUCT.md` | Giriş ekranının hero fotoğrafı gerçek ve **adı verilmiş** bir santraldi (künyedeki kaynak URL adı yüzde-kodlu taşıyordu, bu yüzden düz metin aramasına takılmıyordu); künye ve `PRODUCT.md` ayrıca kurgusal "Saha A"yı o gerçek santrale açıkça bağlıyordu; `alt` metni de öyle. | **kapatıldı** — görsel, atıf yükümlülüğü olmayan üretilmiş (AI) bir görselle değiştirildi (`giris-genis.webp`), üçüncü taraf fotoğrafı depodan çıkarıldı, bağ cümleleri ve `alt` metni kaldırıldı |
| K2 | `web/prisma/seed-operasyon.ts:9-10` · `web/app/(tam)/portfoy/page.tsx:11` | Referans kurumun üç gerçek grup şirketi kısaltması yorum olarak duruyordu; aynı yorum "Rakamlar … üretim portföyünün **gerçek yapısına** oturur" diyordu. | **kapatıldı** — kısaltmalar ve "gerçek yapısına oturur" cümlesi kaldırıldı; kapsam cümlesi kuruluş adı vermeden yazıldı |
| K3 | `web/public/santraller/KUNYE.md` | Kurgusal adlar gerçek illerle ve gerçek coğrafî tariflerle eşleniyor ("Manisa/… bağ ovası", "Tunceli/Munzur vadisi", "Kars/… gölü", "Kırklareli/Trakya"). Tip + kurulu güç + il üçlüsü portföyü tanınır kılar. Ayrıca tesis fotoğrafları ürün sahibinin sağladığı **gerçek tesis fotoğraflarıdır** — P8'in hedefi "nötr lisanslı görsel"; bugün öyle değil. | **açık** — ürün sahibi kararıyla bu temizlikte bilerek dokunulmadı; P8'e |

K3'ün il bilgisi `URUN_VIZYONU` P8 kapsamında "il bilgisi
kurgusal-uyumlu" diye zaten kabul edilmiş bir tercihtir; buraya
tanınırlık riski olarak yazıldı, kural ihlali olarak değil. K1 ve K2
kural ihlaliydi ve kapatıldı.

### 3.3 Geçmiş temizlenmedi — depo public

Bu, taramanın en ağır bulgusu.

| Commit | Gerçek ad taşıyan dosya sayısı |
|---|---|
| `128dcd7` "Initial clean production baseline" | **83** |
| `5d5d95e` "Temizlikte düşen taşıyıcı dosyalar geri alındı" | 61 |
| `8d7f5e4` "Ürün vizyonu ve geliştirme paketleri…" | 61 |
| `5363920` "Gerçek kurum kimliği kurgusal demo kiracısıyla değiştirildi" | **0** |
| `fc66712` (bugünkü tepe) | **0** |

Ölçüm: `git grep -il -E '<gerçek adlar>' <commit> -- .` — adların
kendisi bu belgeye yazılmadı.

Gerçek adlı fotoğraf dosyaları da geçmişte duruyor
(`git ls-tree -r 128dcd7 -- web/public/santraller` 17 dosya listeler;
15'i gerçek santral adıyla adlandırılmış `.webp`).

GitHub API'ye göre depo `"visibility":"public"`, varsayılan dal `main`,
`main` = `fc66712`. Yani temizlik **tepe noktasını** temizledi;
`git log -p` ya da GitHub'da commit görünümü gerçek adları hâlâ
gösteriyor.

**Bu oturumda düzeltilmedi.** Geçmiş yazımı geri alınamaz ve dış
görünürlüğü değiştirir; ürün sahibinin kararı olmadan yapılmaz.
Seçenekler: (a) `main`'i tek commit'e indirip force-push, (b) depoyu
kalıcı ada kadar private yapmak, (c) kabul edip `R0` kütüğüne yazmak.

---

## 4. §0.5 sektör-sabit terim envanteri (P1 iş yükü)

Arama: `grep -rE` · dizinler `app/ components/ lib/` · uzantılar
`.ts .tsx .css` · üretilmiş Prisma istemcisi (`lib/prisma-client/`,
`.gitignore`'da) hariç.

### 4.1 Dizin bazında

| Dizin | Terim geçen dosya | Toplam dosya | Eşleşen satır |
|---|---|---|---|
| `app/` | 163 | 230 | 1 264 |
| `components/` | 8 | 22 | 24 |
| `lib/` | 92 | 247 | 620 |
| **toplam** | **263** | **499** | **1 908** |

Yani çekirdek kaynak dosyalarının **%53'ü** en az bir sektör terimi
taşıyor.

### 4.2 Terim bazında (aynı üç dizin)

| Terim / desen | Dosya | Satır |
|---|---|---|
| `santral` (her biçim) | 255 | 1 752 |
| tip kodları `JEO\|RES\|HES\|GES\|DGKC\|DGKÇ\|TERMIK\|JES` | 25 | 46 |
| `kuruluGucMw` | 14 | 34 |
| `MW` (kelime sınırlı) | 12 | 33 |
| `MWe` | 13 | 32 |
| `ünite` | 10 | 21 |
| `UretimUnitesi` / `uretimUnitesi` | 7 | 20 |
| `enerji` / `elektrik` | 16 | 19 |

Depo geneli (şema, seed, testler ve araçlar dâhil) aynı desenlerle
**2 357** satır "santral" eşleşmesi verir; P1'in bekçi testi yazılırken
istisna listesi buna göre kurulmalı.

### 4.3 En yoğun 20 dosya

| Dosya | Eşleşen satır |
|---|---|
| `app/(kabuk)/(operasyonel)/yedekleme/YedeklemeIstemci.tsx` | 77 |
| `lib/senaryo/varlik.ts` | 69 |
| `app/(kabuk)/(flagship)/Genel.tsx` | 56 |
| `lib/senaryo/uyum.ts` | 48 |
| `lib/senaryo/platform.ts` | 46 |
| `app/(kabuk)/(operasyonel)/yedekleme/mantik.ts` | 40 |
| `app/(kabuk)/(operasyonel)/raporlar/RaporlarIstemci.tsx` | 39 |
| `lib/eylemler2/yonetim.ts` | 33 |
| `app/(kabuk)/(operasyonel)/uyum/UyumIstemci.tsx` | 31 |
| `lib/yonetim/moduller.ts` | 29 |
| `app/kabuk.css` | 28 |
| `app/(kabuk)/(operasyonel)/sistem/bilesenler/Galeri.tsx` | 28 |
| `app/(kabuk)/(flagship)/tesisler/[id]/Plant360.tsx` | 28 |
| `lib/senaryo/kapsama.ts` | 26 |
| `app/(kabuk)/(operasyonel)/yedekleme/page.tsx` | 26 |
| `app/(kabuk)/(flagship)/veri.ts` | 26 |
| `app/(tam)/portfoy/Portfoy.tsx` | 24 |
| `app/(kabuk)/(flagship)/tesisler/[id]/veri.ts` | 23 |
| `lib/entegrasyon/cekirdek.ts` | 22 |
| `app/(kabuk)/(operasyonel)/saglik/reddedilenler/veri.ts` | 21 |

Şema tarafı ayrıca: `prisma/seed.ts` 83 satır, `prisma/schema.prisma`
46 satır, `prisma/seed-operasyon-kayitlari.ts` 36 satır.

### 4.4 P1'in bekçi testi bugünkü tarifiyle işi kaçırır

`GELISTIRME_PAKETLERI.md:254-256` bekçi testi "**JSX/metin
literalinde**" arıyor. Oysa terim kodda üç yerde daha yaşıyor:

- **Tip ve prop adlarında:** `export type Santral` (en az iki ekranda),
  `santraller` prop'u, `santralId` alanı — üç desen birlikte **406**
  eşleşme veriyor (`Santral` 245 · `santraller` 193 · `santralId` 10).
  Hiçbiri metin literali değildir.
- **CSS jetonlarında ve yorumlarda:** `app/kabuk.css` 28 satır.
- **Yayınlanmış API sözleşmesinde:** `/api/v1/plants` ucu ve
  `capacityMw` yanıt alanı (`lib/api/sozlesme.ts`, `SOZLESME_SURUMU =
  '1.0.0'`). Yeniden adlandırma **kırıcı değişikliktir** ve P1 kapsamında
  yazılı değil — P9'un sözleşme dondurma kararıyla çakışır.

Ayrıca `lib/cografya/turkiyeSiniri.ts` çekirdekte bir **ülke** sabitidir
(Türkiye sınır poligonu, `SINIR_CERCEVESI`); §0.5 "çekirdeğe ülke
girmez" kuralının bugünkü tek net ihlali budur ve P1 kapsamında
anılmıyor.

---

## 5. Paket paket durum

"Bugün doğru mu" sütunu, paketin **Bugün** paragrafındaki iddiaların
koda karşı doğrulanmasıdır. "Dosya" sütunu, paketi uygulamak için
değişmesi beklenen **mevcut** dosya sayısı (+ yeni açılacak dosya).
Sayılar grep ölçümüdür, tahmin değil; ölçülemeyen yere "—" yazıldı.

### 5.1 Dalga 0 — ürünleştirme temeli

| Paket | Bugün doğru mu | Bağımlılık | Açık karar (§8) | İlk adım | Dosya |
|---|---|---|---|---|---|
| **P0** `URN-KUR` | **Uygulandı (6 Eyl 2026).** *Doğrulama anındaki hâli:* **Kısmen — bayat.** "Seed gerçek santral adları taşır" bugün YANLIŞ (6 Eyl `5363920` ile kurgusala çevrildi). "Bir gerçek fotoğraf" DOĞRU (§3.2 K1). "CLAUDE.md tek ürün adı" kısmen — CLAUDE.md zaten "geçici ad, P0 `MARKA_AD`'a taşıyacak" diyor. "grup içi kurumsal araç, pazarlama dili yok" cümlesi CLAUDE.md'de YOK, `web/PRODUCT.md:158`'de. | yok (zincirin başı) | K14 ürün adı: görünen ad geçici ve tanımlayıcı; `Regula` iç çalışma adı, arayüzde geçmez; K22 koyu tek tema | ~~`CLAUDE.md`'deki 13 ölü belge atfını temizlemek~~ → **yapıldı**; sıradaki paket P2 + R5 | **19 mevcut + 3 yeni** (ölçülen: 8 kod + 6 belge + kütük/testler) |
| **P1** `URN-ALN` | **Doğru.** `Sektor`, `TesisTipi`, `Tesis.kuruluGucMw`, `TesisProfili`, `UretimUnitesi.kuruluGucMw`, `kosulJson`→`kuruluGucMw`, "Santral haritası", "Enerji portföyü" hepsi kodda. İki küçük sapma: tip kodu **JES değil `JEO`** (+`MERKEZ`, sunumda `TERMIK`); "Santral 360" bugün **render edilen bir başlık değil**, yalnız yorumlarda ve `sistem` demo şeridinde geçiyor. | P0 (başlık) · §7'ye göre P2/R5 sonrası | Tablo yeniden adlandırma (varsayılan: evet, `@@map` yok); K21 ikinci sektör = su/atıksu | `lib/dil/terimler.ts` + `tests/bekci/sektor-terimi.test.ts`'i **kırmızı** taban ölçüm olarak kurmak | 263 mevcut (app+components+lib) · depo geneli ~339 · + ~14 yeni |
| **P2** `URN-KIR` | **Doğru.** `Kiraci` modeli ve `kiraciId` şemada **hiç yok** (grep 0). `Grup` en üst düğüm (`schema.prisma`), `Kullanici`/`Yetki`/`Oturum` var, RBAC × kapsam `lib/erisim.ts` + `tests/kapsam-kapisi-nobetci.test.ts`, `ApiAnahtari` var, `IsKilidi.ad` tek `@id` (tek küme). | P0; R5 ile birlikte (RLS) | K15 kullanıcı tek kiracılı; K16 RLS PostgreSQL'de zorunlu | `Kiraci` modeli + "kiracısız tablo istisna listesi" şema testi (bugün 146 modelin tamamı kiracısız) | **211 mevcut + ~18 yeni** (şema + 10 seed + 48 eylem modülü + 10 API ucu + kapsam kapısı çağıran 62 dosya + testler) |
| **R5** `ALT-PG` | **Çoğu doğru, biri bayat.** `docs/POSTGRES_READINESS.md` gerçekten "on bir bağımlılık" sayıyor (satır 10); değişmezlik tetikleyicisi **6** (`20260830190000` 4 + `20260903192431` 2) — paketin "6" sayısı doğru; yarış koşulları kapalı; test izolasyonu gerçekten dosya kopyası (`tests/sahte/db.ts:23-44`). **Ama "yük testi yapılmamış" YANLIŞ**: `arac/yuk.mjs` + `arac/olcek.mjs` var ve `arac/performans-tabani.json` 3 Eylül 2026 ölçümünü taşıyor ("TOHUM VERİSİYLE ölçüldü; gerçek veri hacmini temsil etmez"). Eksik olan **10⁵ ölçeğinde** ölçüm ve `docs/PERFORMANS_TABANI.md` belgesi. | Dalga 0, P2 ile birlikte | K12 iki datasource (SQLite dev/demo + PG üretim) | Taban göçünü açıp dört + iki tetikleyiciyi PostgreSQL fonksiyonuna çevirmek | **134 mevcut + ~2 yeni** (33 göç · `lib/db.ts` · `prisma.config.ts` · `aramaKosulu.ts` · `tests/sahte/db.ts` · sağlayıcıya bağlı testler) |
| **P3** `URN-DIL` | **Doğru.** Yalnız Türkçe; `İ/ı` testli (`tests/alan-metin.test.ts`, `lib/alan/metin.ts`); `lib/an.ts` tek "an" kaynağı; metinler JSX içinde sabit; `lib/dil/` yok. | P1 (terim sözlüğü) | K17 hafif kendi katman + ICU · ikinci dil EN | `lib/dil/mesajlar/tr.json` + `t()` ve kabuk ekranlarının aşama-1 geçişi | 263+ (P1 ile aynı yüzey) + ~5 yeni |
| **P4** `URN-PKT` | **Doğru.** `Regulasyon · FrameworkSurumu · SurumFarki · Madde · MaddeEslestirmesi · BildirimYukumlulugu · RegulasyonKaynagi` var; `/ice-aktarim` ekranı var; içerik seed'de (38 madde). `IcerikPaketi`/`lib/paket/`/`paket/` dizini yok. | P1, P2 | K18 SHA-256 zorunlu, Ed25519 isteğe bağlı | `lib/paket/` okuyucu + `manifest.json` şeması ve doğrulayıcı | ~12 mevcut + ~15 yeni |
| **P5** | Ayrı paket değil — R1'e "Ürünleştirme notu" olarak birleştirildi. Doğrulanacak kod iddiası yok. | — | K1 katalog ürünle gelir, `etkin=false` | — | — |
| **P6** `URN-KIM` | **Doğru.** Yerel scrypt hesap; oturum **12 saat mutlak / 2 saat atıl** (`lib/auth.ts:34,36`); oran sınırı ve başarısız giriş izi var; `Connector.kimlikTipi` OAuth2 destekliyor; `KimlikSaglayici`/`MfaKaydi` yok, gerçek SSO/MFA yok. | P2 | — (paketin kendi kararı yok) | `KimlikSaglayici` modeli + OIDC PKCE akışı; JIT **kapalı** varsayılan | ~10 mevcut + ~8 yeni |
| **P7** `URN-DAG` | **Doğru.** SQLite; yerel dosya deposu; bellek içi oran sınırı; süreç içi kuyruk; `env:`/`dosya:` sır. `vault` (`lib/entegrasyon/sir.ts:112`), `dis` kuyruk (`lib/is/kuyruk.ts:123`), `s3_uyumlu` ve `postgresql` (`lib/altyapi/saglayicilar.ts`), `kms_hsm` (`lib/uyum/disSaglayicilar.ts:37`) **kayıtlı ama `bagli:false`**. `deploy/` dizini yok. | R5, P2 | K19 dağıtım önceliği = on-prem (Compose) | `lib/yapilandirma/ortam.ts` tek zod şeması + `/api/v1/health` | ~8 mevcut + ~12 yeni |
| **P8** `URN-DEMO` | **Kısmen — bayat.** "Gerçek santral adları, iller, kurulu güçler" bugün YANLIŞ (adlar kurgusal). "`public/santraller/` fotoğraflar (biri gerçek)" DOĞRU ve daha geniş: fotoğrafların **tamamı** ürün sahibinin sağladığı gerçek tesis fotoğrafı (`KUNYE.md`), ayrıca `public/gorseller/` hero'su adı verilmiş gerçek bir santral (§3.2 K1). `KUNYE.md` var. | P1, P4 | K21 ikinci sektör = su/atıksu | `tests/bekci/gercek-ad.json` + bekçi testi; sonra `DEMO-TR-ENERJI` paket biçimi | ~6 mevcut (seed dosyaları + iki künye) + ~4 yeni |
| **P9** `URN-SDK` | **Doğru.** `lib/entegrasyon/sozlesme.ts` var; sertifikasyon harness'ı tam **15** kontrol (`sertifika.ts:38-55` `KONTROL_KODLARI`); `/api-sozlesmesi` ekranı var; `/api/v1` altında tam **10** `route.api.ts`; `ApiAnahtari` var. | P2, R4 | K20 yalnız imzalı ürün adaptörleri | `lib/api/sozlesme.ts` → `openapi.json` üreteci + sözleşme anlık görüntüsü testi | ~6 mevcut + ~6 yeni |

### 5.2 Dalga 1–3 ve R0

| Paket | Bugün doğru mu | Bağımlılık | Açık karar (§8) | İlk adım | Dosya |
|---|---|---|---|---|---|
| **R1** `MEV-RAD` | **Doğru — birebir.** `RegulasyonKaynagi` alanları belgede sayıldığı gibi: `adres`, `izlemeTuru` (varsayılan `elle`), `kontrolAraligiGun` (90), `sonKontrol`, `sonNot`. `lib/eylemler2/mevzuatKaynagi.ts` ve `lib/eylemler2/surum.ts` var; `MevzuatKaynagi`/`MevzuatTaramasi`/`MevzuatDegisiklikAdayi` yok. | R4 (yumuşak) | K1 katalog kapalı gelir · K2 anti-bot atlatılmaz | `lib/mevzuat/kaynaklar.ts` katalog sabiti + `tests/fikstur/mevzuat/` el yapımı fikstürler | ~10 mevcut + ~12 yeni |
| **R2** `ICE-MAD` | **Doğru — sayılar birebir.** Örnek veride tam **38** madde: EPDK-SYM **27**, CBDDÖ **4**, ISO-27001 **4**, SPK-BS **3**; **8** çapraz denklik. `IceAktarim` ve `DegerlendirmeAktarimi` modelleri var; `/ice-aktarim` ekranı var. | yok (içerik kurumdan) | K3 ISO yalnız kimlik+başlık · K4 sürüm etiketi `YYYY-AA · RG NNNNN` | `belge/mevzuat/sablon/*.xlsx` başlıklarını `Madde` alanlarından türeten üretici + doğrulayıcı | ~6 mevcut + ~8 yeni · **içerik dosyası yoksa iskelette durulur (§0.1)** |
| **R3** `KAN-YED`/`KAN-IMZ` | **Doğru.** Kanıt dosyası deposu **var** (`lib/uyum/kanitDeposu.ts`); `arac/yedek.mjs` yalnız veritabanını alıyor; `docs/URUN_YEDEKLEME.md` hâlâ "kanıt dosyaları bugün yoktur" diyor (satır 26, 29, 144) — **bayat, R0-4 doğrulandı**. `imza` ailesinde yalnız `kms_hsm`, `bagli:false`. | yok | K6 TSA = KamuSM (hesap sır) | `arac/yedek.mjs --al` içine depo arşivi + manifest; ardından `URUN_YEDEKLEME.md`'nin üç bayat satırını düzeltmek | ~5 mevcut + ~3 yeni |
| **R4** `BIL-KAN` | **Doğru.** `Bildirim`, `Gorev`, `OnayTalebi`, `EskalasyonKurali/Kaydi` var ve yalnız `/bildirimler` kutusuna düşüyor; SMTP/Teams yok; `lib/is/kuyruk.ts` sağlayıcı defteri var (`dis`, `bagli:false`); `lib/entegrasyon/sir.ts` var. | yok | K5 Teams webhook adresi = sır | `lib/bildirim/saglayicilar.ts` (`smtp`, `teams_webhook`, ikisi `bagli:false`) + `BildirimKanali`/`BildirimTeslimi` modelleri | ~8 mevcut + ~8 yeni |
| **R6** `ESL-SCF` | **Doğru.** `MaddeEslestirmesi.denklik` = `tam \| kismi \| ilgili`; örnek veride **8** elle denklik; `/eslestirme` ekranı yaprak madde kuralını uyguluyor; `GUVEN_SEVIYELERI` bugün **5** üye (`otomatik_kanit`, `denetci_dogrulamis`, `oz_degerlendirme`, `bayat_kanit`, `kanit_yok`). | R2 (madde setleri) | K7 türetilmiş durum görünümdür, yüzdeye katılmaz | `MaddeEslestirmesi`'ne `iliskiTuru/guc/kaynakBelge/onaylayanId` göçü + `lib/uyum/turetilmis.ts` | ~10 mevcut + ~4 yeni |
| **R7** `TOP-KUR` | **Doğru.** `AgBolgesi` (`tip` 6 değer, `guvenlikSeviyesi` Purdue), `AgGeciti`, `TopolojiSapmasi` — `SAPMA_TIPLERI` tam **10** tip (`lib/entegrasyon/topoloji.ts:33-37`). `network_firewall` adaptörü kural seti okumuyor. **Ama:** örnek veri (`prisma/seed-doluluk.ts:926,931,936`) bu 10'un dışında üç tip yazıyor — §6/Ç7. | yok | K8 adres→bölge = `AgSegmenti` CIDR, çözülmezse null | `lib/ag/kural/` ayrıştırıcıları + `KuralSeti`/`GuvenlikDuvariKurali` modelleri | ~12 mevcut + ~10 yeni |
| **R8** `KES-DOS` | **Doğru.** `KonfigurasyonYedegi` modeli ve `lib/entegrasyon/konfigYedek.ts` var, ayrıştırıcı yok. `KesifKaydi.kaynak` şema yorumunda tam **9** tür sayılı. `Varlik.firmware/firmwareYapisi/seriNo/model/uretici` ve `VeriKokeni.guven` var. **Ama:** seed bu 9'un dışında serbest metin yazıyor — §6/Ç8. | yok | K9 dosya kaynağı güven sabitleri 0,9 / 0,8 / 0,7 | `lib/varlik/dosyaAyristirici/` + Cisco `show version` fikstürü | ~8 mevcut + ~8 yeni |
| **R9** `BOL-SL` | **Doğru.** `AgBolgesi.guvenlikSeviyesi` (Purdue/IEC 62443) ve `AgGeciti` var; `MaddeDurumu` tesis × madde × süreç bazlı, bölge boyutu yok; `lib/uyum/olgunluk.ts` hedef/ölçülen ayrımını taşıyor. | R2 kalıbı | K3 (IEC 62443 lisans: yalnız kimlik+başlık) | `IEC-62443-3-3` çerçevesini kimlik+başlıkla açan içe aktarım şablonu | ~8 mevcut + ~6 yeni |
| **R10** `OLY-BIL` | **Doğru.** `Olay` + 6 ilişki tablosu (`OlayVarlik`, `OlaySistem`, `OlayRisk`, `OlayBulgu`, `OlayProje`, `OlayDegisiklik`) var; `olay_etki` ve `bildirim_suresi` motor defterinde (`lib/motorlar/kayit.ts:39,71`); `BildirimYukumlulugu` alanları (`asgariSiddet`, `sureSaat`, `dayanak`, `merci`) birebir; `BildirimKaydi` yok. | R2 içeriği | K10 7545 bildirim süresi boş (mevzuat bekleniyor) | `BildirimKaydi` modeli + `[olayId, yukumlulukId]` tekil kısıtı | ~10 mevcut + ~6 yeni |
| **R11** `SAG-ADV` | **Doğru.** `Advisory`, `AdvisoryUrunu`, `AdvisoryZafiyeti`, `Zafiyet` (`kevMi`, `epss`, `cvssVektor`, `istismarDurumu`) var; `zafiyet_korelasyonu` motoru ve `lib/alan/surum.ts` var; besleme yok (adaptör sayısı bugün **8**, `advisory_feed` 9. olacak). | yok | K1/K2 (kamu kaynağı kuralları) | `advisory_feed` adaptörünü kataloğa `kimlik_bekleniyor` olarak eklemek | ~8 mevcut + ~8 yeni · **NVD/USOM anahtarı gerekirse dur ve sor** |
| **R12** `DIS-FRM` | **Doğru.** `lib/disaAktarim/paket.ts` ve `csv.ts` var; CSV/XLSX dışa aktarımı tam **8** ekranda (`aktivite`, `bulgular`, `denetimler`, `envanter`, `kesif`, `raporlar`, `saglik`, `surecler`); `xlsx` gerçekten vendored **0.20.3** (`web/vendor/xlsx-0.20.3.tgz`). | R2/P4 içeriği | K4 sürüm etiketi | `lib/disaAktarim/formlar/epdkOzDenetim.ts` | ~10 mevcut + ~5 yeni |
| **R13** `RSK-PAR` | **Doğru.** `Risk` tam **8** etki ekseni taşıyor (`etkiUretim`, `etkiEmniyet`, `etkiRegulasyon`, `etkiFinans`, `etkiSiber`, `etkiItibar`, `etkiCevre`, `etkiVeri`), `dogalRisk`/`artikRisk`, `kabulBitis` var; **parasal alan yok** (grep 0). `UretimUnitesi.kuruluGucMw` ve `Tesis.kuruluGucMw` var. | P1 (öznitelik), P3 (para birimi) | EPİAŞ fiyatı = `bagli:false` sağlayıcı | `Risk`'e üç nokta tahmini alanları + `hesapNotu` göçü | ~6 mevcut + ~4 yeni |
| **R14** `ONR-YZ` | **Doğru.** Depoda LLM sağlayıcısı yok (`lib/oneri/` yok, `OneriKaydi` modeli yok); motor felsefesi "tespit → öneri → insan onayı" 18 motorda uygulanıyor; sır süzgeci `lib/entegrasyon/sir.ts` var. | R1, R2 | K11 LLM = kurum içi uç nokta, `bagli:false` | `lib/oneri/saglayicilar.ts` (`llm` ailesi, `bagli:false`) + `OneriKaydi` modeli | ~4 mevcut + ~8 yeni · **gerçek uç nokta gerekirse dur ve sor** |
| **R15** `KVK-ENV` | **Doğru.** Yalnız `Risk.etkiVeri` ekseni, seed'de `veriIslemeProfili` serbest alanı (`prisma/seed.ts:454,493`) ve `SaklamaPolitikasi` var; `VeriIslemeFaaliyeti`, `YurtDisiAktarim`, `VeriSahibiBasvurusu`, `VerbisKaydi` **yok**. | R10 (ihlal), P4 (KVKK paketi) | — | `VeriIslemeFaaliyeti` modeli + `SaklamaPolitikasi` bağı | ~6 mevcut + ~8 yeni |
| **R16** `SUR-BIA` | **Doğru.** `IsSureci → SistemServis → Varlik` zinciri, `YedeklemePolitikasi/Kosusu`, `GeriYuklemeTesti` var; `yedek_dogrulama` motoru defterde; `SistemServis`'te `rtoSaat`/`rpoSaat` **yok** (grep 0); `SureklilikTatbikati` yok. | yok | — | `SistemServis.rtoSaat/rpoSaat` (null = belirlenmedi) göçü | ~6 mevcut + ~4 yeni |
| **R17** | Kapandı (ürünleştirme kararı → Dalga 0). Doğrulanacak kod iddiası yok. | — | K13 kapandı | — | — |
| **R0** açık kalemler | **Kısmen bayat.** R0-1 (koordinat) doğru: 17 tesisin hepsinde `enlem`/`boylam` null. R0-2 **artık açık değil** — sınır üretildi (`lib/cografya/turkiyeSiniri.ts`) ve haritada çiziliyor (`HaritaIstemci.tsx:102`); tablo hâlâ "araç hazır" diyor. R0-3 doğru: `?next=` kapısı var, üreticisi yok (`app/(giris)/giris/page.tsx:19-22`). R0-4 doğru (yukarıda). R0-7 **birebir doğru**: `arac/sayimlar.mjs` 2 633 bayt, `--yaz`/`--tablo`/`BASLA`/`BITIS` yok; `tests/belge-sayimlari.test.ts` 63 satır ve hiçbir belgeye bakmıyor. | P8 / P0 | — | R0-2'yi kapalı işaretlemek; R0-7 için `--yaz` ve belge blok işaretlerini geri kurmak | ~3 mevcut |

---

## 6. Belge–kod çelişkileri (düzeltilecekler)

Sıra: paket açılmadan düzeltilmesi gerekenler önce.

> **P0 ile kapatılanlar (6 Eylül 2026):** Ç1 · Ç2 · Ç3 · Ç4 · Ç6 · Ç11 ·
> Ç12 · Ç13 · Ç14 · Ç15 ve Ç5'in P0/P8 "Bugün" satırları. Kapanan
> satırlar aşağıda **[kapandı]** işaretiyle durur — kütük silinmez,
> kararın izi kalır. Kalanlar ilgili paketlerine bırakıldı.

| # | Nerede | Belge diyor | Kod diyor | Ağırlık |
|---|---|---|---|---|
| **Ç1** [kapandı] | `GELISTIRME_PAKETLERI.md:203-205` (URN-KUR-004) | "`grep -ri "regula"` sonucu … **sıfır** kod eşleşmesi verir" | Aynı grep bugün **706** satır / **140** dosya eşleştiriyor (üretilmiş Prisma istemcisi hariç; onunla birlikte 4 013 satır) — hepsi Türkçe alan sözcüğü "regülasyon"/`Regulasyon` yüzünden. Ölçüt hiçbir zaman sıfır vermez. | **yüksek** — kabul kriteri ölçülemez, yeniden yazılmalı (ör. `MARKA_AD` dışında ürün adının düz metin geçtiği kod dosyası sayısı = 0) |
| **Ç2** [kapandı] | `GELISTIRME_PAKETLERI.md:191` vs `:178-179` | P0 "Kapsam dışı: **kod değişikliği** (P1'e)" · aynı paket "ad koda gömülmez, her görünen yer yapılandırmadan okur" | Ürün adı bugün **8 kod dosyasında** düz metin: `app/layout.tsx`, `app/global-error.tsx`, `app/(giris)/giris/page.tsx`, `components/kabuk/Kabuk.tsx`, `components/kabuk/SistemSayfasi.tsx`, `components/kabuk/kabukVerisi.ts`, `lib/api/sozlesme.ts`, `lib/yapilandirma/tanimlar.ts`. Kod dokunmadan URN-KUR-004 sağlanamaz. | **yüksek** — P0'ın kapsam cümlesi ya da kabul kriteri değişmeli |
| **Ç3** [kapandı] | `GELISTIRME_PAKETLERI.md:271-273` (URN-ALN-002) | "`kuruluGucMw >= 100` … aynı **5 tesisi** kapsama alır" | `kuruluGucMw >= 100` olan tesis **2** (SAHA-A3 = 165, SAHA-C-RES = 135). Seed'deki kural üç kollu bir `herhangi` (güç ≥ 100 **veya** black-start **veya** TEİAŞ SCADA/EMS seri değil) ve toplam **4** tesisi "uygulanabilir" yapıyor (biri elle override ile). "5" hiçbir okumada çıkmıyor. | **yüksek** — regresyon testi yanlış sayıya bağlanır |
| **Ç4** [kapandı] | `GELISTIRME_PAKETLERI.md:268-270` (URN-ALN-001) | "göç sonrası **17 tesisin** kurulu gücü … aynı değerlerle durur (sayısal eşitlik testi)" | 17 tesisin **16'sının** değeri var; `MERKEZ-BT` (`Demo Enerji Genel Müdürlük`) `kuruluGucMw = null`. "Bilinmeyen ≠ sıfır" gereği bu null kalmalı; test 17 satır beklerse kırmızı olur. | **yüksek** |
| **Ç5** [kapandı] | `GELISTIRME_PAKETLERI.md:165-166` (P0 Bugün) ve `:620-622` (P8 Bugün) | "Seed Demo'nun kamuya açık portföyü (**gerçek santral adları**, iller, kurulu güçler)" | 17 tesisin tamamı kurgusal (`Saha A-1 JES` …). 6 Eylül `5363920` ile değişti; belge bir gün bayat. Fotoğraf tarafı hâlâ geçerli (§3.2). | orta |
| **Ç6** [kapandı] | `CLAUDE.md:15-29` "Nereye bakılır" tablosu | 13 belgeye yönlendiriyor | 13'ü de diskte **yok**: `docs/TERIMLER_SOZLUGU.md`, `PRE_INTERNAL_INTEGRATION_READINESS.md`, `docs/HAZIRLIK_DURUMU.md`, `CUSTOMER_REQUIREMENTS_STATUS.md`, `ARCHITECTURE_GAP_ANALYSIS.md`, `ENTEGRASYON_GAP_MATRIX.md`, `DESIGN_HANDOFF_GAP.md`, `docs/UX_DENETIM_2026-09.md`, `docs/END_USER_UX_AUDIT.md`, `docs/UX_KALITE_PROGRAMI_RAPORU.md`, `docs/UX_SIMPLIFICATION_AUDIT.md`, `docs/UX_SADELESTIRME_RAPORU.md`, `docs/sadelestirme-2026-09/`. Ayrıca `web/CLAUDE.md` yalnız `@AGENTS.md` diyor ve `web/AGENTS.md` 9 satırlık Next.js bloğundan ibaret — "ürün/kod kuralları" orada değil. | **yüksek** — P0'ın kapsamında yazılı değil, eklenmeli |
| **Ç7** | `SAPMA_TIPLERI` (`lib/entegrasyon/topoloji.ts:33-37`) vs seed | Kod 10 sapma tipi tanımlıyor | `prisma/seed-doluluk.ts:926,931,936` bu listede **olmayan** üç tip yazıyor: `protokol_degisimi`, `kaybolan_dugum`, `gecit_yonu`. Etiket sözlüğü eşleşmeyince ekran ham kodu gösteriyor (`topoloji.ts:995` `?? sapma.tip`). R7 bu alanın üstüne kuruluyor. | orta — R7 öncesi düzeltilmeli |
| **Ç8** | `schema.prisma` `KesifKaydi.kaynak` yorumu vs seed | Şema yorumu 9 değer sayıyor (`firewall \| switch_arp \| dhcp \| snmp \| siem \| historian \| scada_export \| vendor_export \| csv`) | Seed serbest metin yazıyor: `"CMDB elle içe aktarım"`, `"OT pasif keşif dışa aktarımı"`. R8 bu alana iki yeni değer ekleyecek. | orta |
| **Ç9** | `docs/POSTGRES_READINESS.md:44-45` | "`20260830190000_denetim_izi_degismezligi` **dört tetikleyici** kurar" | Depoda **6** değişmezlik tetikleyicisi var; ikisi (`kanit_surumu_guncelleme_yasak`, `kanit_surumu_silme_yasak`, göç `20260903192431_faz_d_uyum_kanit`) belgede **hiç geçmiyor**. R5'in kabul kriteri 1 `KanitSurumu`'nu sayıyor — yani paket doğru, hazırlık belgesi eksik. PostgreSQL'e geçerken bu iki tetikleyici sessizce düşerse değişmezlik iddiası yalan olur. | orta |
| **Ç10** | `docs/ROTA_HARITASI.md` | 51 satırlık rota tablosu | Kodda **58** `page.tsx` var; belgede olmayan 14 ekran: `/api-sozlesmesi`, `/bakim`, `/degerlendirme-aktarim`, `/denetci-erisimi`, `/egitimler`, `/gozden-gecirme`, `/harita`, `/prosesler`, `/saklama`, `/sayim`, `/tabanlar`, `/tasinabilir-medya`, `/yedek-parca`, `/zimmetlerim`. Buna karşılık belge 7 `/api/v1/*` ucunu rota gibi listeliyor. (`arac/rotalar.json` **doğru** — 50 kabuk rotası; `/bakim` ve `/giris` bilerek dışarıda.) | orta — §3.6 her pakette bu belgeyi güncellettiriyor, taban zaten 14 ekran geride |
| **Ç11** [kapandı] | `GELISTIRME_PAKETLERI.md:222` ve `:259-260` | "tip kodları **JES**/RES/HES/GES/DGKÇ seed'de" | Seed kodları: `JEO`, `RES`, `HES`, `GES`, `DGKC`, `MERKEZ` (6). Sunum katmanı ayrıca `TERMIK` tanıyor. **`JES` diye bir tip kodu yok** — yalnız tesis *adlarının* eki. `DGKÇ` da kodda `DGKC`. | düşük |
| **Ç12** [kapandı] | `GELISTIRME_PAKETLERI.md:182-184` | "kabuk sözcük markaları (**`ZE` monogram**) → yapılandırmadan" | `ZE` monogramı kodda, `DESIGN.md`'de ve `PRODUCT.md`'de **hiç geçmiyor**. | düşük |
| **Ç13** [kapandı] | `GELISTIRME_PAKETLERI.md:163-165` | "'grup içi kurumsal araç, pazarlama dili yok'" cümlesi `CLAUDE.md`'nin içeriği sayılıyor | Cümle `CLAUDE.md`'de yok; `web/PRODUCT.md:158`'de. | düşük |
| **Ç14** [kapandı] | `GELISTIRME_PAKETLERI.md:1670` (R0-2) | "`arac/turkiye-siniri.mjs` çıktısı haritaya **bağlanacak** — araç hazır" | Zaten bağlı: `lib/cografya/turkiyeSiniri.ts` (`TURKIYE_SINIRI`, `SINIR_CERCEVESI`) üretilmiş ve `app/(tam)/harita/HaritaIstemci.tsx:101-102` `SINIR_YOLLARI`'nı çiziyor. Kalem **kapanmış**. | düşük |
| **Ç15** [kapandı] | `GELISTIRME_PAKETLERI.md:126` ve §3.5 | "her pakette `node arac/sayimlar.mjs --yaz` koşar" | Araçta `--yaz` bayrağı **yok**; tek davranışı JSON basmak (`arac/sayimlar.mjs:78-80`). R0-7 bunu zaten tespit etmiş ve "P0 ile" işaretlemiş, ama P0'ın kapsamında geri kurma işi **yazılı değil**. `npx tsx arac/senaryo-belge.mjs --yaz` çalışıyor. | orta |

### 6.2 R5'e özgü çelişkiler (PostgreSQL geçişini bugün riske atanlar)

| # | Belge diyor | Kod diyor | Ağırlık |
|---|---|---|---|
| **Ç16** | ALT-PG-002: "'saha-ı' araması PostgreSQL'de 'Saha I HES'i bulur (**bugünkü davranışı kaydeden test kırmızıya döner** ve güncellenir)" | Bugün SQLite'ta da bulmuyor ve bunu kaydeden bir test yok; `lib/aramaKosulu.ts:26-33` yorumu zaten "ne SQLite'ın `LIKE`'ı ne PostgreSQL'in `ILIKE`'ı Türkçe İ/ı katlamasını doğru yapar" diyor. Yani sağlayıcı değişimi tek başına bu kriteri **sağlamaz**; `citext`/`unaccent` + gölge kolon kararı gerekir — ki aynı yorum bunu "ayrı bir karar" ilan ediyor. | **yüksek** — kabul kriteri bugünkü kapsamla karşılanamaz |
| **Ç17** | "`lib/aramaKosulu.ts` **tek satır** değişikliği" + "SQLite yolu geliştirme ve demo için kalır (iki datasource tek şema)" | `DUYARSIZ_KIP_DESTEKLI` (`aramaKosulu.ts:35`) derleme zamanı sabiti; ortamdan/sağlayıcıdan okumuyor. "Tek satır" ile "aynı koddan iki sağlayıcı" aynı anda doğru olamaz — bayrak çalışma zamanında sağlayıcıya bağlanmalı. Ayrıca `schema.prisma:17-19`'daki `provider` sabittir, env okumaz; `migration_lock.toml` tek sağlayıcı kilitler. | **yüksek** — K12 kararının teknik karşılığı yazılmalı |
| **Ç18** | Kapsam(2): "değişmezlik testleri **aynen** koşar" | Üç değişmez tablodan yalnız **biri** için test var (`tests/faz-d-eylem.test.ts:267-270`, `KanitSurumu`); `AktiviteKaydi` ve `DegerlendirmeTarihcesi` için update/delete reddi testi yok, TRUNCATE için hiç test yok. "Aynen koşar" diyecek bir taban yok — önce yazılmalı. | **yüksek** |
| **Ç19** | `POSTGRES_READINESS.md:147-151`: "Uygulama kodunda tek bir PRAGMA yoktur… ham SQL kullanılmaz" | Ham SQL yok ama **sürücüye özgü hata şekli** okunuyor: `lib/eylemler2/ortak.ts:15,29` P2002 ihlalinde `meta.driverAdapterError.cause.constraint.fields` alanına bakıyor. PostgreSQL adaptörü bu şekli aynı vermezse kısıt mesajları sessizce genelleşir. Belgede geçmiyor. | **yüksek** |
| **Ç20** | Kapsam(7) ve ALT-PG-004: sonuç `docs/PERFORMANS_TABANI.md`'ye yazılır | Dosya **yok**; `POSTGRES_READINESS.md` ona dört yerden atıf yapıyor. Mevcut ölçüm `arac/performans-tabani.json`'da duruyor (3 Eyl 2026, tohum verisiyle). | orta |
| **Ç21** | Kapsam(5): "altı nullable tekillik kısıtı" | Sayı **doğru** (6 kısıt), ama `POSTGRES_READINESS.md:166-172` tablosundaki satır numaraları bayat; gerçek yerler `schema.prisma:227, 559, 677, 1849, 1908, 2830`. | düşük |
| **Ç22** | Kapsam(7): "10 000 satırlık içe aktarım onayı" ölçümü için `arac/yuk.mjs` genişletilir | O ölçümü zaten `arac/olcek.mjs` yapıyor (28 532 bayt, madde içe aktarımı sıcak yolu). `arac/BENIOKU.md`'de `yuk.mjs` hiç geçmiyor; `olcek.mjs` geçiyor (satır 41-51). Yanlış araç seçilmiş. | düşük |
| **Ç23** | — | `prisma/schema.prisma:9` hâlâ "Postgres'e geçişte **yalnızca datasource değişir**" diyor. `POSTGRES_READINESS.md`'nin tamamı bu cümlenin yanlış olduğunu göstermek için yazılmış. Cümle hiçbir paketin kapsamında düzeltme kalemi değil. | orta |

### 6.3 P2'ye özgü çelişkiler (çok kiracılılık planını bugün riske atanlar)

| # | Belge diyor | Kod diyor | Ağırlık |
|---|---|---|---|
| **Ç24** | Kapsam: "kapı atlanamaz (**ham sorgu bekçisi mevcut kalıpla**)" | Böyle bir kalıp **yok**: `arac/sabotaj.mjs`, `arac/kalite-kurallari.mjs`, `arac/statik-kontrol.mjs` içinde `Raw` geçmiyor (grep 0). Kiracı kapısını atlayan `$queryRaw`/`$executeRaw` bugün hiçbir kapıda yakalanmaz. Bekçi P2'de **sıfırdan** yazılacak. | **yüksek** |
| **Ç25** | Göç: "mevcut veri `varsayilan` kiracıya taşınır (**tek transaction**)" | Üç tabloda 6 `BEFORE UPDATE/DELETE` tetikleyicisi UPDATE'i `ABORT` ediyor (`AktiviteKaydi`, `DegerlendirmeTarihcesi`, `KanitSurumu`). `kiraciId` geri doldurma bu tablolarda **doğrudan çalışmaz**; tetikleyiciyi düşürüp yeniden kurmak ya da tabloyu yeniden yaratmak gerekir. Göç planında yazılı değil. | **yüksek** |
| **Ç26** | URN-KIR-005: "Aynı **`kod`**lu varlık iki kiracıda çakışmaz" | `Varlik` modelinde `kod` alanı **yok**; tek benzersiz alanı `etiket` (asset_tag). Kriter bugünkü şemaya birebir yazılamaz. | orta |
| **Ç27** | "bileşik tekil kısıtlar `kiraciId` ile **genişler**" | Şemada 103 `@unique`'in 61'i bileşik (`@@unique`), **42'si alan seviyesi**. Alan seviyesindekiler genişletilemez; her biri `@@unique([kiraciId, alan])`'a **dönüştürülmeli** — göçün en büyük tek kalemi ve kapsamda görünmüyor. | orta |
| **Ç28** | Paylaşılan (kiracısız) tablo listesinde **`Yapilandirma` (hub)** | `Yapilandirma` bugün kiracıya özgü operasyonel eşikleri **ve marka künyesini** (`kabuk.kunye`) tutuyor. Kiracısız bırakılırsa bir kiracının eşiği hepsini etkiler; P0'ın `MARKA_AD`'ı da kiracı başına ayarlanamaz. | **yüksek** |
| **Ç29** | Kapsam: "`IsKilidi` ve kuyruk anahtarları **kiracı ön ekli**" (sütun değil, ad öneki) | URN-KIR-002 "`kiraciId` taşımayan ve istisna listesinde olmayan tablo yoktur" diyor; `IsKilidi` istisna listesinde **değil**. İki kural birbirini kesiyor — `IsKilidi` (ve ön ekle çözülen benzerleri) istisna listesine yazılmalı. | orta |
| **Ç30** | "Kiracı içi roller **aynen**" (tek rol kümesi varsayıyor) | Kodda iki liste var: `lib/sabitler.ts:54` `ROLLER` (4 rol, zod ile doğrulanan) ve `lib/erisim.ts:13-32` izin matrisi (9 rol anahtarı). Hub rollerinin hangisine ekleneceği belirsiz. | düşük |
| **Ç31** | K15 "kullanıcı çok kiracılı **olamaz**" | `Kullanici.eposta` bugün **global `@unique`**. Kriter 2 gereği `Kullanici` de `kiraciId` alınca kısıt `@@unique([kiraciId, eposta])`'ya döner ve aynı e-posta iki kiracıda açılabilir — K15 şema tarafından korunmaz, yalnız kural olarak kalır. | düşük |
| **Ç32** | URN-KIR-003 (RLS) dayanağı `docs/POSTGRES_READINESS.md` | O belge **satır düzeyi güvenlikten (RLS) hiç söz etmiyor** — 288. satırdaki "satır seviyesinde kilitler" ifadesi MVCC kilitleriyle ilgilidir, RLS ile değil. RLS politikalarının tasarımı R5'in mevcut planında yok; P2 ile birlikte yazılmalı. | orta |

### 6.4 Belge içi tutarsızlıklar (kod dışı)

- **P1'in bağımlılığı iki yerde farklı.** Paket başlığı (`:216-217`)
  "Bağımlılık: **P0**" diyor; §7 zinciri (`:1684`) P1'i P2/R5'ten
  **sonraya** koyuyor; §7 metni (`:1696`) ise "P1 mümkün olduğunca
  **erken** yapılmalıdır" diyor. Hangisinin bağlayıcı olduğu
  kararlaştırılmalı.
- **P1 ↔ P4 döngüsü.** P1 kapsamı enerji sözlüğünü "**P4 paket
  biçimiyle**" istiyor (`:257`); P4'ün bağımlılığı ise "**P1, P2**"
  (`:465`). Biri gevşetilmeli — öneri: P1 sözlüğü düz TS sabiti olarak
  kursun, P4 onu paket biçimine taşısın.
- **P1 kapsamı yayınlanmış API sözleşmesini görmüyor.** `/api/v1/plants`
  ucu ve `capacityMw` alanı (`lib/api/sozlesme.ts`, sürüm `1.0.0`)
  sektör terimi taşıyor; yeniden adlandırma kırıcı değişikliktir ve
  P9'un "`v1` dondurulur" kararıyla çakışır. Karar gerekiyor.

---

## 7. Sıra, hazırlık ve durma koşulları

### 7.1 §7 sırası bugünkü kodla uyumlu mu

Belgedeki zincir **P0 → (R5 + P2) → P1 → P4 → P8 → P3 → P6 → P7 → P9**
kodla çelişmiyor; hiçbir paket kendinden öncekinin bıraktığı bir şeyi
bugün zaten bulmuyor. İki not:

- **P2 + R5 birlikteliği zorunlu görünüyor.** P2'nin RLS ayağı (kabul
  kriteri URN-KIR-003) PostgreSQL ister; SQLite'ta yalnız uygulama
  kapısı ölçülebilir (K16). Ayrıca 146 modele `kiraciId` eklemek ile
  sağlayıcı değişimi aynı taban göçünde yapılmazsa 33 göçün üstüne
  ikinci bir büyük göç dalgası biner.
- **P1'i erkene almak `/api/v1` sözleşmesini kırar.** Yukarıdaki §6.1'e
  bakın; karar verilmeden P1 açılmamalı.

### 7.2 Hazırlık durumu

| Durum | Paketler |
|---|---|
| **Bugün başlanabilir** (dur-ve-sor koşulu yok) | P0, P1, P2, R5, P3, P4, P6, P7, P8, P9, R4, R6, R7, R9, R10, R12, R13, R15, R16, R0 |
| **Yalnız iskelete kadar** (içerik dosyası ya da gerçek kimlik gerekiyor — §0.1 / §0.2) | R1 (kaynak kataloğu yazılır, `etkin=false`; tarama fikstürle test edilir), R2 (şablon + doğrulayıcı + rehber üretilir, **madde metni yazılmaz**), R3 (yedek ve `rfc3161` sağlayıcısı yazılır; **TSA hesabı istenmez**), R8 (ayrıştırıcı fikstürle yazılır), R11 (adaptör `kimlik_bekleniyor` gelir; NVD/USOM anahtarı **istenmez**), R14 (`llm` ailesi `bagli:false` gelir; **uç nokta istenmez**) |

Hiçbir pakette bugün "dur ve sor" koşulu **tetiklenmiş** değil; yukarıdaki
altı paket kendi kapsamının iskelet kısmını tamamlayıp durur.

### 7.3 Bu oturumun ölçemediği kapılar

`rota:duman`, `tasarim:kapi`, `tasarim:axe`, `tasarim:tasma`,
`gezinme:test`, `kalite:lighthouse`, `tasarim:gorsel`, `demo:build` —
canlı sunucu ya da tarayıcı gerektirdikleri için **ölçülmedi**. Ekran
işi içeren ilk pakette bunlar koşulmalı ve çıktıları PR'a yazılmalıdır.

---

## 8. P0 için 25 satırlık plan

```
1  Dal: paket/p0-kurgu-guncellemesi (main = fc66712 üzerinden).
2  Dokunulacak belgeler: CLAUDE.md · web/PRODUCT.md · web/DESIGN.md ·
3    README.md · docs/GELISTIRME_PAKETLERI.md (§6 Ç1–Ç15 düzeltmeleri).
4  Dokunulacak kod (URN-KUR-004 için zorunlu, kapsam cümlesi düzeltilerek):
5    lib/yapilandirma/tanimlar.ts (kabuk.kunye → MARKA_AD, varsayılan
6    "Uyum ve Yönetişim Platformu"), components/kabuk/kabukVerisi.ts,
7    Kabuk.tsx, SistemSayfasi.tsx, app/layout.tsx, app/global-error.tsx,
8    app/(giris)/giris/page.tsx, lib/api/sozlesme.ts — 8 dosyada düz
9    metin ad kaldırılıp tek okuma yolundan (ayar) beslenir.
10 CLAUDE.md: "Nereye bakılır" tablosundaki 13 ölü atıf silinir; kalan
11   hedefler doğrulanır; "Bağlayıcı kurallar" kalan/değişen ayrımına
12   çevrilir (dil → çok dilli/TR birinci; ad → MARKA_AD; kurum → kiracı;
13   fotoğraf → §3.2 K1/K3 gerçeğiyle uyumlu yazılır, "gerçek fotoğraf
14   yok" DENMEZ çünkü bugün var).
15 web/PRODUCT.md: Users +kiracı yöneticisi/+ürün yöneticisi/+destek;
16   Positioning dörtten beş mekanizmaya; Brand = MARKA_AD; bayat sayaç
17   ("7 konu × 2 kırpım" → gerçek 3 dosya) ve yanlış künye atfı düzeltilir.
18 Kabul kriterleri: URN-KUR-001 (kalan/değişen tablosu) · URN-KUR-002 ve
19   -003 bugün ZATEN sağlanıyor, ölçmüyor → yeniden yazılır ·
20   URN-KUR-004 ölçütü "ürün adı düz metin geçen kod dosyası = 0"
21   olarak değiştirilir (grep "regula" ölçütü Ç1 nedeniyle atılır).
22 Testler: tests/marka-adi.test.ts — ad yalnız tanımlarda; 8 dosyada
23   düz metin yok; senaryo kütüğüne URN-KUR-001..004 eklenir (4 test).
24 Kapılar: tsc · eslint · vitest · next build · sabotaj · ters:kapsam +
25   ekran metni değiştiği için rota:duman · tasarim:kapi · tasarim:axe.
```

**Bu plandaki tek kapsam genişletmesi:** P0 "kod değişikliği yok" diyor
ama URN-KUR-004 kod dokunmadan sağlanamıyor (Ç2). İki seçenek var —
(a) 8 dosyayı bu pakette `MARKA_AD`'a bağlamak, (b) URN-KUR-004'ü P1'e
ertelemek. Plan (a)'yı varsayıyor; ürün sahibi (b) derse 4–9. satırlar
düşer ve paket saf belge işine iner.

**Bu plana dâhil olmayan, ayrı karar isteyen:** §3.3'teki geçmiş
sorunu. P0 belgeleri düzeltir; geçmişte duran gerçek adları
temizlemez.

---

## 9. Bu belgenin sınırları

- **Derinlik eşit değil.** §5'teki "Bugün doğru mu" sütunu **26 paketin
  tamamı** için koda karşı doğrulandı. §6.2 ve §6.3'teki paket-içi derin
  çelişki taraması bugün yalnız **R5 ve P2** için yapıldı; aynı derinlik
  diğer paketlere uygulanırsa yeni kalemler çıkması beklenir. Paket
  açılmadan önce o paket için aynı tarama tekrarlanmalıdır.
- **Tarayıcı kapıları ölçülmedi** (§2.1). Bu belgedeki hiçbir cümle
  erişilebilirlik, taşma, gezinme ya da Lighthouse hakkında iddia
  içermiyor.
- **Sayılar `fc66712`'ye aittir.** Kod değiştikçe §4'teki envanter ve
  §5'teki dosya sayıları kayar; her paket PR'ında yeniden ölçülmelidir.
- **Kod değiştirilmedi.** Bu oturumda yalnız bu belge eklendi;
  `git status` başka değişiklik göstermez. `npm ci`, `prisma generate` ve
  `npm run db:hazirla` çalıştırıldı — üçünün de çıktısı `.gitignore`'da.
