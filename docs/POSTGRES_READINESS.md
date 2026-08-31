# PostgreSQL geçiş hazırlığı

**Durum: RAPOR. Bu belge hiçbir şeyi uygulamaz.** `datasource` SQLite'tır,
migration yazılmamıştır, `prisma/schema.prisma` değiştirilmemiştir.

`prisma/schema.prisma:9` şöyle der:

> Sağlayıcı SQLite (kurulumsuz); Postgres'e geçişte **yalnızca datasource değişir**.

Bu cümle yanlıştır. Aşağıda sayılan on bir bağımlılığın hiçbiri `datasource`
satırını değiştirmekle çözülmez; ikisi (tetikleyiciler ve `LIKE` duyarlılığı)
**sessizce** yanlış davranır — hata vermez, yanlış sonuç verir.

Ölçümler `web/prisma/dev.db` KOPYALARI üzerinde yapılmıştır; gerçek kurum
verisi kullanılmamıştır ve `dev.db` değiştirilmemiştir.

---

## a) SQLite'a özgü bağımlılıkların tam listesi

### a.1 Sürücü adaptörü — kod seviyesi

| Yer | İçerik |
|---|---|
| `web/lib/db.ts:2` | `import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'` |
| `web/lib/db.ts:5` | `path.join(process.cwd(), 'prisma', 'dev.db')` — dosya yolu, bağlantı dizesi değil |
| `web/lib/db.ts:11` | `new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: \`file:${dbYolu}\` }) })` |
| `web/tests/sahte/db.ts:2,41-43` | Test ikizi aynı adaptörü kurar; `TEST_DB` bir DOSYA YOLUdur |
| `web/prisma.config.ts:11` | `datasource.url = \`file:${path.join('prisma','dev.db')}\`` |
| `web/.env:1` | `DATABASE_URL="file:./dev.db"` |
| `web/prisma/migrations/migration_lock.toml:3` | `provider = "sqlite"` — sağlayıcı değişirse Prisma tüm migration geçmişini reddeder |
| `web/package.json` | `@prisma/adapter-better-sqlite3`, `better-sqlite3` bağımlılıkları |

`better-sqlite3` **eşzamanlı (senkron)** bir sürücüdür; `@prisma/adapter-pg`
asenkron ve havuzludur. Değişim yalnız paket değişimi değildir: test ikizinin
"her test kendi dosya kopyasını açar" izolasyon modeli (`web/tests/sahte/db.ts:19-45`)
PostgreSQL'de **çalışmaz** — dosya kopyalanamaz. 26 test dosyasının tamamı
şema-başına-izolasyon ya da transaction-rollback modeline taşınmalıdır.
Bu, geçişin en büyük tek iş kalemidir.

### a.2 Tetikleyiciler — SQLite sözdizimi PostgreSQL'de çalışmaz

`web/prisma/migrations/20260830190000_denetim_izi_degismezligi/migration.sql`
dört tetikleyici kurar (satır 5, 11, 17, 23):

```sql
CREATE TRIGGER aktivite_guncelleme_yasak
BEFORE UPDATE ON "AktiviteKaydi"
BEGIN
  SELECT RAISE(ABORT, 'Denetim izi kayitlari degistirilemez');
END;
```

`RAISE(ABORT, …)` SQLite'a özgüdür ve PostgreSQL'de **sözdizimi hatası**dır.
PostgreSQL'de tetikleyici gövdesi doğrudan yazılamaz; bir fonksiyon gerekir.

**PostgreSQL karşılığı — yalnızca RAPORDUR, migration olarak eklenmemiştir:**

```sql
-- Tek fonksiyon dört tetikleyiciyi de besler; mesaj TG_ARGV'den gelir ki
-- SQLite'taki iki ayrı metin ("degistirilemez" / "silinemez") korunsun.
CREATE OR REPLACE FUNCTION denetim_izi_degismez()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '%', TG_ARGV[0]
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

CREATE TRIGGER aktivite_guncelleme_yasak
  BEFORE UPDATE ON "AktiviteKaydi"
  FOR EACH ROW EXECUTE FUNCTION
  denetim_izi_degismez('Denetim izi kayitlari degistirilemez');

CREATE TRIGGER aktivite_silme_yasak
  BEFORE DELETE ON "AktiviteKaydi"
  FOR EACH ROW EXECUTE FUNCTION
  denetim_izi_degismez('Denetim izi kayitlari silinemez');

CREATE TRIGGER degerlendirme_tarihcesi_guncelleme_yasak
  BEFORE UPDATE ON "DegerlendirmeTarihcesi"
  FOR EACH ROW EXECUTE FUNCTION
  denetim_izi_degismez('Degerlendirme tarihcesi degistirilemez');

CREATE TRIGGER degerlendirme_tarihcesi_silme_yasak
  BEFORE DELETE ON "DegerlendirmeTarihcesi"
  FOR EACH ROW EXECUTE FUNCTION
  denetim_izi_degismez('Degerlendirme tarihcesi silinemez');

-- SQLite'ta TRUNCATE YOKTUR; PostgreSQL'de vardır ve satır tetikleyicilerini
-- ATLAR. Değişmezlik iddiası bu iki tetikleyici olmadan PostgreSQL'de yalandır.
CREATE TRIGGER aktivite_truncate_yasak
  BEFORE TRUNCATE ON "AktiviteKaydi"
  FOR EACH STATEMENT EXECUTE FUNCTION
  denetim_izi_degismez('Denetim izi kayitlari bosaltilamaz');

CREATE TRIGGER degerlendirme_tarihcesi_truncate_yasak
  BEFORE TRUNCATE ON "DegerlendirmeTarihcesi"
  FOR EACH STATEMENT EXECUTE FUNCTION
  denetim_izi_degismez('Degerlendirme tarihcesi bosaltilamaz');
```

Dikkat edilecek üç fark:

1. **`FOR EACH ROW` zorunludur.** İfade seviyesinde (`FOR EACH STATEMENT`)
   yazılırsa, hiçbir satıra dokunmayan bir `UPDATE … WHERE (yanlış)` bile
   reddedilir — SQLite'ta reddedilmez. Davranış farkı sessizdir.
2. **TRUNCATE boşluğu.** Yukarıda kapatıldı; SQLite'ta böyle bir açık yoktu.
3. **`ALTER TABLE … DISABLE TRIGGER` yetkisi.** Tablo sahibi tetikleyiciyi
   kapatabilir. Değişmezlik iddiasını korumak için uygulama rolü tablo sahibi
   OLMAMALIDIR (bkz. e.6).

### a.3 Elle yazılmış tablo yeniden kurma migration'ları

SQLite `ALTER TABLE … ALTER COLUMN` desteklemez; kolon tipini/NULL'lanabilirliğini
değiştirmenin tek yolu tabloyu yeniden kurmaktır. Beş migration bunu yapar:

| Migration | Yeniden kurulan tablolar | PostgreSQL'de gerekli olan |
|---|---|---|
| `20260830185919_hedef_mimari_genislemesi` (satır 767-1019) | çok sayıda tablo (`RedefineTables` bloğu) | çoğu `ALTER TABLE … ALTER COLUMN` / `ADD COLUMN` |
| `20260830200500_madde_surum_tekilligi` | — (yalnız indeks) | değişiklik yok |
| `20260901093000_koken_kaynak_kayit_zorunlu` (satır 11-35) | `VeriKokeni` | `ALTER TABLE "VeriKokeni" ALTER COLUMN "kaynakKayitId" SET NOT NULL;` |
| `20260901160000_kapsam_ve_idempotency_kisitlari` (satır 32, 66, 93) | `KesifKaydi`, `KonfigurasyonYedegi`, `TedarikciErisimOturumu` | `ADD COLUMN` + `CREATE UNIQUE INDEX` (yeniden kurma gereksiz) |
| `20260901161000_kolon_sirasi_normalizasyonu` (satır 18-77) | `EntegrasyonKosusu`, `Olay` | **HİÇBİR ŞEY** — bkz. aşağıda |
| `20260901170000_ayricalik_bilinmiyor` (satır 20-39) | `KimlikHesabi` | `ALTER TABLE "KimlikHesabi" ALTER COLUMN "ayricalikli" DROP NOT NULL, ALTER COLUMN "ayricalikli" DROP DEFAULT;` |

`20260901161000_kolon_sirasi_normalizasyonu` tamamen SQLite'a özgü bir
sorunun çözümüdür: SQLite `ADD COLUMN`'u kolonu **sona** ekler, `migrate diff`
bunu kalıcı sapma olarak raporlar. PostgreSQL'de kolon sırası mantıksal
karşılaştırmaya girmez; bu migration PostgreSQL şemasında **hiç var olmaz**.

Geçişte bu migration'lar yeniden yazılmaz — geçmiş SQLite geçmişidir.
Doğru yol geçmişi **kapatıp** PostgreSQL için tek bir taban (baseline)
migration üretmektir (bkz. e.2).

### a.4 `PRAGMA` kullanımları

`PRAGMA` PostgreSQL'de yoktur. Üç migration'da, hepsi `RedefineTables`
bloklarının içinde:

- `20260830185919_hedef_mimari_genislemesi/migration.sql:767,768,1018,1019`
- `20260901161000_kolon_sirasi_normalizasyonu/migration.sql:16,17,76,77`
- `20260901170000_ayricalik_bilinmiyor/migration.sql:18,19,38,39`

Hepsi `defer_foreign_keys` / `foreign_keys` çiftidir. **Uygulama kodunda
(`app/`, `lib/`, `tests/`, `arac/`) tek bir `PRAGMA` yoktur** — bu iyi haber:
runtime'da SQLite'a özgü SQL yok. `$queryRaw` / `$executeRaw` / `queryRawUnsafe`
kullanımı da **sıfırdır** (taranan: `app`, `lib`, `tests`, `arac`, `prisma`).
Ham SQL taşınması gereken bir yüzey yok.

PostgreSQL karşılığı gerekirse: `SET CONSTRAINTS ALL DEFERRED` — ama a.3'teki
gerekçeyle bu bloklar zaten taşınmayacak.

### a.5 NULL semantiği ve tekil indeksler

SQLite ve PostgreSQL'in **varsayılan** davranışı burada AYNIdır: tekil
indekste NULL'lar birbirinden farklı sayılır, dolayısıyla nullable kolon
içeren tekillik kısıtı NULL satırlar için uygulanmaz. Yani varsayılan
`UNIQUE` ile geçişte **davranış değişmez**.

Değişen şey seçenektir: PostgreSQL 15+ `CREATE UNIQUE INDEX … NULLS NOT DISTINCT`
sunar; SQLite'ta böyle bir seçenek yoktur. Aşağıdaki altı kısıt bu seçeneğin
adaylarıdır — **hiçbiri kendiliğinden değişmez, karar gerektirir**:

| Kısıt | Yer | Nullable kolonlar | Bugünkü etkisi | Karar |
|---|---|---|---|---|
| `Zafiyet.kaynakRef @unique` | `schema.prisma:1187` | `kaynakRef` | Referanssız zafiyetler kısıt dışı | **KORU (DISTINCT)** — migration yorumu (`20260901160000:7-9`) bunu bilerek seçmiş: "referansı olmayan iki kaydın aynı olduğunu iddia edemeyiz" |
| `Madde @@unique([regulasyonId, surumId, kod])` | `schema.prisma:173` | `surumId` | Sürümsüz maddeler (surumId=null) aynı kodla ÇOĞALABİLİR | **`NULLS NOT DISTINCT` ADAYI — en riskli olan bu.** `lib/eylemler2/arama.ts:30` ve `lib/eylemler2/surum.ts:28` sürümsüz maddeyi aktif sayıyor; kısıt bugün onları korumuyor |
| `ApiIstegi @@unique([anahtarId, idempotencyAnahtari])` | `schema.prisma:1906` | ikisi de | Anahtarsız/idempotency'siz istek tekilliği yok | **KORU** — idempotency yalnız başlık verildiğinde anlamlı |
| `Yetki @@unique([kullaniciId, surecId, tesisId, tuzelKisiId, regulasyonId, modul])` | `schema.prisma:486` | 5 kolon | Aynı kullanıcıya aynı global yetki iki kez verilebilir | **`NULLS NOT DISTINCT` ADAYI** — global yetki (hepsi null) tam da en sık kurulan satır |
| `ProjeBaglantisi @@unique([projeId, maddeId, bulguId, riskId, tesisId, varlikId])` | `schema.prisma:411` | 5 kolon | Aynı bağlantı iki kez kurulabilir | **`NULLS NOT DISTINCT` ADAYI** — tasarım gereği her satırda tek bir hedef dolu, kalan beşi null; kısıt bugün pratikte HİÇ uygulanmıyor |
| `YazilimUrunu @@unique([ad, surum])` | `schema.prisma:1141` | `surum` | Sürümsüz ürün adı çoğalabilir | **`NULLS NOT DISTINCT` ADAYI** (düşük öncelik) |

**Uyarı:** `NULLS NOT DISTINCT`'e geçmeden önce mevcut veride çakışma
aranmalıdır; aksi halde indeks oluşturma başarısız olur ve migration yarıda
kalır. Doğrulama sorgusu e.4'te.

### a.6 Tip eşlemeleri

**`Float` → `double precision`.** Dokuz alan: `Tesis.kuruluGucMw:50`,
`UretimUnitesi.kuruluGucMw:569`, `Lisans.maliyet:1161`, `Zafiyet.cvss:1189`,
`YedeklemeKosusu.boyutMb:1229`, `Butce.planlanan:1328`, `Butce.harcanan:1329`,
`VeriKokeni.guven:1607`, `KesifKaydi.guvenSkoru:1645`.

SQLite `REAL` de IEEE-754 çift duyarlıktır; **değer kaybı yoktur**. Fark
davranıştadır: SQLite tip yakınlığı (affinity) gereği `'9.8'` metnini sessizce
sayıya çevirir, PostgreSQL çevirmez ve hata verir. Prisma istemcisi her iki
uçta da `number` gönderdiği için uygulama yolunda risk yok; risk **seed ve
elle yazılmış SQL** yolundadır.

Para (`Lisans.maliyet`, `Butce.*`) için `Decimal` daha doğru olurdu; `Float`
yuvarlama hatası biriktirir. Bu geçişle bağımsız bir kusurdur ve geçiş,
`Decimal`'e taşımak için doğal fırsattır (`numeric(14,2)`).

**`Boolean`.** 40 Boolean alanın 19'u nullable, yani üç değerli
(true/false/BİLİNMİYOR) — bu bilinçli bir tasarım
(`20260901170000_ayricalik_bilinmiyor` migration'ının tamamı bunu anlatır).
SQLite bunları `INTEGER 0/1/NULL` saklar; PostgreSQL gerçek `boolean` tipine
sahiptir. **Kritik fark:** SQLite `WHERE ayricalikli = 1` yazan bir sorguyu
kabul eder, PostgreSQL `1` ile `boolean`'ı karşılaştırmayı reddeder. Prisma
üzerinden risk yok; ham SQL olmadığı için (a.4) bu geçişte sorun çıkarmaz.
`NULL` üçüncü değeri iki motorda da aynı davranır (`= true` NULL satırı
getirmez) — **üç değerli mantık korunur**.

**`DateTime` → `timestamptz`.** 136 DateTime alanı var. Bugün SQLite'ta
**METİN** olarak saklanıyorlar; `dev.db`'den doğrulandı:

```
devreyeGiris = '1984-01-14T18:46:18.869+00:00'  typeof = text
olusturuldu  = '2026-08-31T18:46:18.880+00:00'  typeof = text
```

Bu üç şeyi ima eder:

1. Sıralama ve `<`/`>` karşılaştırmaları bugün **sözlüksel metin
   karşılaştırmasıdır**. Doğru sonuç veriyorsa, yalnız biçim sabit ve ofset
   her satırda `+00:00` olduğu içindir. Tek bir `+03:00` satırı sıralamayı
   sessizce bozardı. PostgreSQL'de karşılaştırma gerçek zaman
   karşılaştırmasına döner — bu bir **iyileşmedir**, ama aynı zamanda
   davranış değişikliğidir.
2. Veri taşımada metin → `timestamptz` dönüşümü açıkça yapılmalıdır;
   `pgloader`/`COPY` varsayılanı ISO-8601 ofsetli metni doğru okur, ama
   **doğrulanmalıdır** (e.4).
3. `@default(now())` SQLite'ta `CURRENT_TIMESTAMP`, PostgreSQL'de
   `CURRENT_TIMESTAMP`'tır; ikisi de sorunsuz. `@updatedAt` Prisma
   tarafındadır, veritabanı tarafında değil — etkilenmez.

`timestamp` (ofsetsiz) DEĞİL `timestamptz` seçilmelidir: veri hâlihazırda
ofset taşıyor ve TSİ/UTC ayrımı kaybedilirse denetim izi zaman damgaları
tartışmalı hâle gelir.

### a.7 Büyük/küçük harf duyarlılığı — sessiz kırılma

SQLite'ta `LIKE` ASCII için **varsayılan olarak duyarsızdır**; PostgreSQL'de
`LIKE` **duyarlıdır**. Prisma `contains`/`startsWith`/`endsWith`'i `LIKE`'a
çevirir. Bu, geçişin **hata vermeyen** tek büyük farkıdır: arama kutusu
çalışmaya devam eder, sadece daha az sonuç döndürür.

Etkilenen üretim kodu — hepsi **global arama** (`web/lib/eylemler2/arama.ts`):

| Satır | Model | Koşul |
|---|---|---|
| 24 | `Tesis` | `kod contains q`, `ad contains q` |
| 29 | `Madde` | `kod contains q`, `baslik contains q` |
| 33-34 | `Bulgu` | `baslik contains q` |
| 38 | `Risk` | `kod contains q`, `baslik contains q` |
| 41 | `Varlik` | `etiket contains q`, `ad contains q` |
| 44 | `Proje` | `kod contains q`, `ad contains q` |
| 46 | `Denetim` | `kod contains q`, `ad contains q` |

Toplam **11 `contains` koşulu, 7 sorgu, 7 model** — komut paletinin tamamı.
Bugün `kizildere` yazan kullanıcı "Kızıldere I JES"i bulur; PostgreSQL'de
**bulamaz**. Kod alanları (`KIZILDERE-1`) büyük harfle saklandığı için küçük
harfle arayan hiçbir kod eşleşmesi kalmaz.

Ayrıca `web/tests/kesif.test.ts:50` `startsWith: ONEK` ile temizlik yapar;
önek büyük harflidir ve testin kendisi de büyük harf üretir, dolayısıyla
kırılmaz — ama test **duyarsızlığa güvenmemelidir**.

**Üç seçenek, tercih sırasıyla:**

1. Her `contains`/`startsWith`'e `mode: 'insensitive'` eklemek (Prisma bunu
   `ILIKE`'a çevirir). En küçük değişiklik; 11 nokta. **Ama indekssizdir** —
   `ILIKE '%q%'` her zaman tam tarama yapar.
2. `citext` uzantısı ile ilgili kolonları büyük/küçük harf duyarsız tipe
   almak. Şema değişikliği gerektirir.
3. `pg_trgm` + `GIN` indeksi ve `ILIKE`. Arama gerçekten büyürse doğru olan
   budur; bugünkü 7 sorgu × `take: 4-6` için aşırıdır.

Geçiş anında **1 numara zorunludur** (yoksa arama bozulur); 3 numara
performans ölçümüne bağlı olarak sonra gelir.

### a.8 Sorgu parametre sınırı — geçişin İYİLEŞTİRDİĞİ tek şey

SQLite tek ifadede 999 bağlı parametre kabul eder; PostgreSQL 65535.
Bu farkın **ölçülmüş** bir sonucu var: envanter ekranı 998. varlıkta
tamamen çöküyordu (bkz. `PERFORMANS_TABANI.md` §2). Geçiş bu sınıfı
64 kat gevşetir ama **kaldırmaz** — kalıp yine kırılgandır.

---

## b) Transaction davranışı

SQLite **tek yazıcılıdır**: veritabanı seviyesinde aynı anda yalnız bir
yazma transaction'ı koşar; diğerleri bekler ya da `SQLITE_BUSY` alır.
PostgreSQL satır seviyesinde kilitler ve okuyucular yazıcıları hiç bloke
etmez. Bu, aşağıdaki 19 çağrı yerinin **hepsinin** anlamını değiştirir.

### b.1 `$transaction` envanteri

| Yer | Şekli | Ölçülen / tahmin |
|---|---|---|
| `lib/eylemler.ts:654` | 10.000 satırlık madde içe aktarımı, satır başına 3 sorgu, tek transaction | **ÖLÇÜLDÜ: 10.9 s · 30.010 sorgu · 132 MB** |
| `lib/api/uclar/varlikGozlemleri.ts:66` | API tavanı 1000 gözlem, kayıt başına ~5 sorgu | **ÖLÇÜLDÜ: 6.9 s · 5.018 sorgu · 38.8 MB** (uçtan uca POST) |
| `lib/api/uclar/erisimler.ts:97` | aynı şekil (kimlik hesabı + atama döngüsü) | ölçülmedi — şekil aynı, mertebe aynı beklenir (TAHMİN) |
| `lib/api/uclar/varlikYazma.ts:130` | aynı şekil (CMDB yazma döngüsü) | ölçülmedi (TAHMİN) |
| `lib/api/uclar/zafiyetler.ts:51` | aynı şekil + kayıt başına Zafiyet upsert | ölçülmedi (TAHMİN) |
| `lib/api/uclar/yedekler.ts:61` | aynı şekil | ölçülmedi (TAHMİN) |
| `lib/entegrasyon/varlikAktarim.ts:708` | 10.000 satırlık varlık aktarımı; satır başına update/create + köken + aktivite ≈ 4 yazma | ölçülmedi; şekli `eylemler.ts:654`'ten AĞIRdır (TAHMİN: >10 s) |
| `lib/entegrasyon/topoloji.ts:242,342,810,933,973` | anlık üretme / temel belirleme / sapma kararı | kısa (tek kayıt + birkaç ilişki) |
| `lib/entegrasyon/konfigYedek.ts:611`, `lib/eylemler2/konfigYedek.ts:104` | yedek koşusu / "son bilinen iyi" bayrağı | kısa |
| `lib/eylemler2/olay.ts:361,401` | olay etkisi yazma | kısa |
| `lib/entegrasyon/cekirdek.ts:307` | connector koşu kaydı | kısa |
| `lib/entegrasyon/tedarikciOturum.ts:105` | tedarikçi oturumu içe alma | kısa (parti boyutuna bağlı) |
| `lib/entegrasyon/kesif.ts` (`kesifKararUygula`) | keşif kararı → varlık açma | kısa ama **eşzamanlılığa duyarlı**, bkz. c.1 |

### b.2 Uzun süren transaction'lar — SQLite'ta ne demek

`lib/eylemler.ts:654` ölçümü: **10.9 saniye boyunca tek yazıcı kilidi
tutulur.** Bu süre içinde uygulamadaki HER yazma bekler: motorların
zamanlanmış koşuları, başka bir kullanıcının bulgu güncellemesi, oturum
açma (`db.oturum.create`). Aynı ölçüm `maxWait: 15_000, timeout: 120_000`
ayarının (`lib/eylemler.ts:685`) neden konduğunu da açıklar — sınır
gerçekten zorlanıyor.

10.000 satır için 30.010 sorgu = **satır başına 3 sorgu** (üst madde arama +
mevcut madde arama + create/update, artı `maddeAlan` silme). Bu bir yazma
tarafı N+1'idir; PostgreSQL'de transaction daha kısa sürmez, yalnız
**başkalarını bloke etmez**.

Connector ölçümü: 1000 gözlem = 5.018 sorgu (**kayıt başına ~5**), 6.9 s.
100 gözlemde 1.34 s. Ölçek doğrusaldır.

### b.3 PostgreSQL'e geçiş bu transaction'ları nasıl değiştirir

**İyileşen:** eşzamanlılık. İki connector koşusu, bir içe aktarım ve on
kullanıcı aynı anda yazabilir. `SQLITE_BUSY`/`maxWait` sınıfı hatalar biter.

**Kötüleşen — ve bu asıl risk:** SQLite'ın tek yazıcısı bugün **kazara bir
kilit görevi görüyor**. Bir transaction içindeki "önce oku, duruma bak, sonra
yaz" kalıbı SQLite'ta güvenlidir çünkü ikinci transaction birincisi bitene
kadar başlayamaz. PostgreSQL varsayılan `READ COMMITTED` seviyesinde iki
transaction gerçekten eşzamanlı koşar; ikisi de aynı "bekliyor" durumunu
okur, ikisi de yazar. **Kod değişmez, garanti kaybolur.** Bkz. (c).

**En duyarlı üçü:**

1. `lib/entegrasyon/kesif.ts:761-766` — `kesifKararUygula` transaction İÇİNDE
   `durum === 'onaylandi' || 'reddedildi'` kontrolü yapıp varlık açar.
   SQLite'ta güvenli; PostgreSQL'de **iki kez varlık açılabilir**.
2. `lib/eylemler.ts:632-634` — `aktarimOnayla` durum kontrolünü transaction'ın
   **DIŞINDA** yapar. SQLite'ta bile yarış vardır (kontrol ile transaction
   arası pencere), PostgreSQL'de pencere genişler.
3. `lib/entegrasyon/varlikAktarim.ts:688-693` — `aktarimiUygula` aynı kalıp;
   satır sayısı 10.000 olduğu için çift işleme maliyeti en yüksek olan bu.

---

## c) Optimistic locking gereken yerler

Tarama: `app/` ve `lib/` altındaki tüm fonksiyonlarda "aynı modeli önce oku,
sonra `update` et" kalıbı arandı; 50 aday bulundu. Aşağıdakiler **gerçek
sorun** olanlardır — yani iki eşzamanlı çağrının farklı ve yanlış bir sonuç
ürettiği yerler. **Hiçbiri uygulanmamıştır.**

> Ortak reçete: `@version` alanı eklemek 92 modele dokunan büyük bir şema
> değişikliğidir ve çoğu yerde gereksizdir. Aşağıdaki vakaların **tamamı
> koşullu `updateMany` ile çözülür**: `updateMany({ where: { id, <beklenen
> durum> }, data })` çağrısının döndürdüğü `count === 0` ise "başkası önce
> davrandı" demektir. Tek istisna P4'tür.

### P1 — `onayKarar` (dört göz onayı) · `lib/eylemler2/gorev.ts:117-140`

Okuma satır 117 (`findUnique`), kontrol satır 132 (`talep.durum !== 'bekliyor'`),
koşulsuz yazma satır 136, ardından satır 144 `onayYanEtkisi(...)`.

İki onaylayan aynı anda karar verirse ikisi de `bekliyor` görür, ikisi de
yazar ve **yan etki iki kez uygulanır** (`onayYanEtkisi` istisna açar /
madde durumu değiştirir — `lib/eylemler2/gorev.ts:154`). Denetim izine iki
onay kaydı düşer. "Dört göz ilkesi" kontrolü (satır 133) de yalnız aynı
kişiye karşı korur, iki farklı kişiye karşı değil.

**Gerçek mi:** evet. **Gerek:** koşullu `updateMany({ where: { id, durum:
'bekliyor' } })`; `count === 0` → "bu talep zaten karara bağlanmış" hatası,
ve yan etki yalnız `count === 1` iken çalışır. **Öncelik: 1 (en yüksek).**

### P2 — İçe aktarım onayı · `lib/eylemler.ts:632-634` ve `lib/entegrasyon/varlikAktarim.ts:688-693`

Durum kontrolü transaction'ın dışında. İki onay → **iki kez içe aktarım**;
`eylemler.ts` yolunda 20.000 madde satırı, `varlikAktarim.ts` yolunda 10.000
varlık iki kez yazılır ya da güncellenir. `varlikAktarim.ts:691` yorumu
"Idempotency: onaylanmış/reddedilmiş aktarım ikinci kez işlenmez" diyor —
iddia doğru ama mekanizma yarışa açık.

**Gerçek mi:** evet, ve maliyeti en yüksek olan bu. **Gerek:** transaction'ın
İLK işlemi olarak `updateMany({ where: { id, durum: 'dogrulama_bekliyor' },
data: { durum: 'isleniyor' } })` ile kaydı "sahiplen"; `count === 0` ise
transaction'ı hemen bırak. **Öncelik: 2.**

### P3 — Keşif kararı · `lib/entegrasyon/kesif.ts:761-766`

Kontrol transaction içinde — **bugün güvenli**, PostgreSQL'de değil. Çift
karar `eslesenVarlikId` boş bir kayıt için iki yeni varlık açar; envanterde
kopya varlık, denetim izinde iki "olusturma" satırı.

**Gerçek mi:** SQLite'ta hayır, PostgreSQL'de evet. Bu tam olarak geçişin
ürettiği bir hatadır. **Gerek:** aynı koşullu `updateMany` kalıbı.
**Öncelik: 3 (geçişten ÖNCE yapılmalı, sonra değil).**

### P4 — Motor / connector koşu çakışması · `lib/motorlar/isKosucu.ts`

`IsKosusu` üzerinde "çalışan koşu var mı?" kontrolü. Bu bir kayıt
güncellemesi değil, bir **kilit** ihtiyacıdır ve koşullu `updateMany` ile
tam çözülmez (kayıt henüz yoktur).

**Not:** bu ölçümün yapıldığı sırada başka bir ajan `IsKilidi` modelini ve
`20260901190000_is_kilidi` migration'ını ekleyerek bunu tam olarak doğru
biçimde (birincil anahtar + kira) çözüyordu. Bu maddeyi **kapanmış kabul
edin**; yalnız PostgreSQL'de aynı kalıbın `INSERT … ON CONFLICT DO UPDATE
WHERE gecerlilik < now()` biçimine çevrilmesi gerektiğini not edin.
**Öncelik: — (başka ajan tarafından ele alındı).**

### P5 — Aşama makineleri · `lib/eylemler2/denetim.ts:78-103` (`asamaIlerlet`), `:111` (`asamaGeriAl`), `lib/eylemler2/operasyon.ts:62` (`degisiklikIlerlet`)

Mevcut aşama okunur, bir sonraki hesaplanır, koşulsuz yazılır. İki kez
"ilerlet" zararsızdır (ikisi de aynı hedefi yazar), ama **"ilerlet" +
"geri al" eşzamanlı** koşarsa kaybeden sessizce yutulur ve denetim izine
gerçekleşmemiş bir geçiş yazılır. `asamaIlerlet` ayrıca kapanış öncesi açık
bulgu/talep sayar (satır 88-89); sayım ile yazma arasında yeni bir bulgu
açılabilir ve denetim açık bulguyla kapanır.

**Gerçek mi:** evet ama düşük sıklıklı. **Gerek:** `updateMany({ where: { id,
durum: d.durum } })`. **Öncelik: 4.**

### P6 — Topoloji sapma kararı ve türetilmiş kayıt açma · `lib/entegrasyon/topoloji.ts:789` (`sapmaKarari`), `:918` (`riskKaydiAc`), `:958` (`bulguKaydiAc`)

`riskKaydiAc` / `bulguKaydiAc` "bu sapmadan zaten risk açılmış mı?"
kontrolünden sonra kayıt açar. Çift çalıştırma **kopya risk/bulgu** üretir.

**Gerçek mi:** evet (özellikle motor ve kullanıcı aynı anda tetiklerse).
**Gerek:** koşullu `updateMany` ile `uretilenRiskId`/`uretilenBulguId`'yi
sahiplen. **Öncelik: 5.**

### P7 — Sürüm aktifleştirme · `lib/eylemler2/surum.ts:61` (`surumAktiflestir`)

Bir regülasyonda yalnız bir aktif sürüm olmalı. Kalıp "eskileri pasifleştir,
yeniyi aktifleştir"; eşzamanlı iki aktifleştirme **iki aktif sürüm**
bırakabilir ve `arama.ts:30`, `uyum/veri.ts:121` gibi "aktif sürüm" filtreleri
iki kat sonuç döndürür.

**Gerçek mi:** evet, ama nadiren tetiklenir. **Gerek:** veritabanı seviyesinde
kısmi tekil indeks — PostgreSQL'de bu bir şema çözümüdür ve kod kilidi
gerektirmez:
`CREATE UNIQUE INDEX ON "FrameworkSurumu" ("regulasyonId") WHERE "durum" = 'aktif';`
SQLite kısmi tekil indeksi destekler ama Prisma şeması `@@unique` üzerinden
`WHERE` yazamaz; ham migration gerekir. **Öncelik: 6.**

### İyi yapılmış olan — örnek alınacak kalıp

`lib/eylemler2/konfigYedek.ts:104-118` (`sonBilinenIyiIsaretle`) zaten
doğru: transaction içinde önce koşullu `updateMany` ile eski bayrakları
düşürüyor, sonra yenisini kaldırıyor. P1-P6 bu kalıba çevrilmelidir.

---

## d) Eksik indeks tespiti

Yöntem: 1.309 Prisma çağrısı ayrıştırıldı; okuma çağrılarının (`findMany`,
`findFirst`, `count`, `aggregate`, `groupBy`, `findFirstOrThrow`) üst seviye
`where` alanları şemadaki indekslerin **ilk kolonlarıyla** karşılaştırıldı.
Test ve seed dosyaları hariç tutuldu. Sonuç: **135 üretim sorgusu** hiçbir
indeksin ilk kolonuna dokunmuyor.

Bunların çoğu **önemsizdir**: `Tesis.durum` (17 satır), `Kullanici.aktif`
(5 satır), `Regulasyon.aktif` (4 satır), `KapsamAlani.aktif`,
`VarlikTuru.aktif` gibi boyut tablolarında tam tarama zaten en hızlı
plandır ve indeks yalnız yazma maliyeti ekler.

**Ölçülerek doğrulanmış, gerçekten gereken indeksler** ve tam Prisma
sözdizimleri `PERFORMANS_TABANI.md` §5'tedir. Buraya PostgreSQL'e özgü
farkı yazıyorum:

- SQLite `NULL`'ları indeksler ve `IS NULL` için indeks kullanabilir;
  PostgreSQL de kullanır. `silindi IS NULL` (yumuşak silme) filtreleri
  iki motorda da düşük seçicilikte olduğu için düz indeks kazandırmaz.
  PostgreSQL'de doğru araç **kısmi indekstir**:
  `CREATE INDEX ON "Varlik" ("etiket") WHERE "silindi" IS NULL;`
  Bu, SQLite'ta da mümkündür ama Prisma şeması ifade edemez; her iki motorda
  da ham migration gerekir. 11 üretim sorgusu `Varlik.silindi` ile filtreler.
- `EXPLAIN QUERY PLAN` (SQLite) yerine `EXPLAIN (ANALYZE, BUFFERS)`
  kullanılmalı; SQLite'ta kabul edilebilir olan "tam tarama + geçici B-ağacı
  sıralama" PostgreSQL'de disk üzerine dökülen sıralamaya (`external merge`)
  dönüşebilir. `work_mem` ayarlanmalıdır.

---

## e) Geçiş adım listesi

Sıra **bağlayıcıdır**; her adımın doğrulaması geçmeden sonrakine geçilmez.

**e.0 — Ön koşul (geçişten ÖNCE, SQLite üzerinde).**
(c)'deki P1, P2, P3 koşullu `updateMany`'ye çevrilir. Gerekçe: bunlar
SQLite'ın tek yazıcısıyla gizlenen hatalardır; geçişten sonra düzeltilirse
aradaki pencerede sessiz veri bozulması olur. *Doğrulama:* iki eşzamanlı
çağrının ikincisinin reddedildiğini gösteren birer test.

**e.1 — Test izolasyon modelinin değiştirilmesi.**
`tests/sahte/db.ts` "dosya kopyala" modelinden çıkarılır; her test dosyası
kendi PostgreSQL şemasını (`CREATE SCHEMA test_xxx`) alır ya da her test bir
transaction içinde koşup geri alınır. 26 test dosyası, 485 test.
*Doğrulama:* SQLite üzerinde `npx vitest run` hâlâ yeşil (yeni model iki
motorda da çalışmalı).

**e.2 — Migration geçmişinin kapatılması.**
SQLite migration'ları PostgreSQL'e taşınmaz (a.3). `prisma migrate diff`
ile mevcut şemadan **tek bir PostgreSQL taban migration'ı** üretilir;
`migration_lock.toml` `postgresql` olur. Tetikleyiciler (a.2, TRUNCATE
tetikleyicileri dâhil) bu tabana elle eklenir.
*Doğrulama:* boş bir PostgreSQL veritabanında `prisma migrate deploy`
ardından `prisma migrate diff --exit-code` sapma göstermez.

**e.3 — Adaptör değişimi.**
`lib/db.ts`, `tests/sahte/db.ts`, `prisma.config.ts`, `.env`; paketler
`@prisma/adapter-pg` + `pg`. Bağlantı havuzu boyutu belirlenir.
*Doğrulama:* `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` yeşil.

**e.4 — Veri taşıma ve doğrulama.**
`dev.db` üretim verisi DEĞİLDİR; gerçek taşıma kurum veritabanından yapılır.
Taşımadan **önce** çalıştırılacak doğrulamalar:

```sql
-- (1) DateTime metinlerinin tamamı aynı biçimde ve UTC ofsetli mi?
--     Tek bir aykırı satır sıralamayı bozar.
SELECT COUNT(*) FROM "Tesis"
 WHERE "olusturuldu" NOT LIKE '____-__-__T__:__:__.___+00:00';
-- (aynı sorgu 136 DateTime kolonunun her biri için üretilmeli)

-- (2) NULLS NOT DISTINCT adaylarında mevcut çakışma var mı?
--     Varsa indeks oluşturma başarısız olur ve migration yarıda kalır.
SELECT "regulasyonId", "kod", COUNT(*) FROM "Madde"
 WHERE "surumId" IS NULL AND "silindi" IS NULL
 GROUP BY 1,2 HAVING COUNT(*) > 1;

SELECT "kullaniciId", "rol", COUNT(*) FROM "Yetki"
 WHERE "surecId" IS NULL AND "tesisId" IS NULL AND "tuzelKisiId" IS NULL
   AND "regulasyonId" IS NULL AND "modul" IS NULL
 GROUP BY 1,2 HAVING COUNT(*) > 1;
```

Taşımadan **sonra**: her tablo için satır sayısı eşitliği, `AktiviteKaydi`
ve `DegerlendirmeTarihcesi` için tetikleyicilerin gerçekten reddettiğini
gösteren birer negatif test.

**e.5 — `LIKE` duyarlılığının kapatılması.**
`lib/eylemler2/arama.ts`'teki 11 `contains` koşuluna `mode: 'insensitive'`
eklenir. *Doğrulama:* küçük harfle "kizildere" araması "Kızıldere I JES"i
bulur — bu bir testle sabitlenmelidir; bugün böyle bir test **yoktur** ve
regresyon sessizdir.

**e.6 — Yetki modeli.**
Uygulama rolü tabloların **sahibi olmamalıdır**; aksi halde
`ALTER TABLE … DISABLE TRIGGER` ile denetim izi değişmezliği aşılabilir
(a.2). Ayrı bir migration rolü (sahip) ve bir uygulama rolü (yalnız DML)
kurulur.
*Doğrulama:* uygulama rolüyle `ALTER TABLE "AktiviteKaydi" DISABLE TRIGGER
ALL;` reddedilir.

**e.7 — İndeksler ve ölçüm tekrarı.**
`PERFORMANS_TABANI.md` §5'teki indeksler eklenir; aynı belgede tarif edilen
ölçüm PostgreSQL üzerinde tekrarlanır. SQLite tabanı **karşılaştırma
noktasıdır, hedef değildir**: PostgreSQL tek bağlantıda daha yavaş, çok
bağlantıda karşılaştırılamayacak kadar hızlıdır.

**e.8 — Uzun transaction'ların parçalanması.**
(b.2)'deki 10.9 s'lik içe aktarım PostgreSQL'de başkalarını bloke etmez ama
hâlâ 10.9 s sürer ve tek bir hata her şeyi geri alır. Parti parti commit
(ör. 500 satırlık gruplar, ilerleme kaydıyla) geçişten SONRA ele alınmalıdır —
geçişle birleştirilirse hangi değişikliğin neyi bozduğu ayırt edilemez.

---

## Ölçülemeyenler

- **PostgreSQL üzerinde hiçbir şey ölçülmedi.** Ortamda PostgreSQL yok;
  bu belgedeki tüm PostgreSQL ifadeleri belge/davranış bilgisine dayanır,
  ölçüme değil. SQLite tarafındaki her sayı ölçülmüştür.
- `lib/api/uclar/{erisimler,varlikYazma,zafiyetler,yedekler}.ts` transaction
  süreleri ölçülmedi; yalnız `varlikGozlemleri` ucu uçtan uca ölçüldü.
  Diğerlerinin kod şekli aynıdır, mertebe tahminidir.
- `lib/entegrasyon/varlikAktarim.ts:708` (10.000 satırlık varlık aktarımı)
  ölçülmedi: uçtan uca çalıştırmak geçerli bir yüklenmiş aktarım kaydı ve
  kolon eşlemesi gerektiriyor.
- Gerçek kurum verisinin dağılımı bilinmiyor; tüm ölçekleme sentetik veriye
  dayanır (bkz. `PERFORMANS_TABANI.md` §1).
