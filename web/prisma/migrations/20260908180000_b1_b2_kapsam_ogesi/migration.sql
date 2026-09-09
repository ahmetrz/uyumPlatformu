-- B1 · B2 · KAPSAM ÖĞESİ SOYUTLAMASI VE SEKTÖRSÜZ ÇEKİRDEK — TEK GÖÇ
--
-- NİÇİN: uyum zincirinin öznesi (süreç kapsamı, madde durumu,
-- uygulanabilirlik, istisna, kanıt bağı, denetçi kapsamı, aktarım, anlık
-- görüntü, yetki) `Tesis`e çakılıydı. Ölçüldü (#39): bankacılık
-- yükümlülüğü kurum, sistem, iş fonksiyonu ve dış hizmete asılır ve
-- enerji/su tohumu bile kurumu (`MERKEZ-BT`) bir "tesis" olarak
-- taşıyordu. Özne artık `KapsamOgesi`; türü KATALOG (`KapsamOgesiTuru`),
-- enum değil — çekirdek iki tür getirir (tesis, kurum), paket ekler.
--
-- NEDEN TEK GÖÇ: P2 aynı dokuz tabloya `kiraciId` ekleyecek; B2
-- (`TesisProfili`'nin sekiz enerji kolonu → öznitelik) de aynı
-- tabloları yeniden kurar. Üç ayrı göç, aynı tablolara üç yeniden
-- yaratma demekti. Yetki ekseni de burada: RBAC için ikinci bir göç
-- açmak "tek göç"ü ilk günden bozardı.
--
-- VERİ KAYBI YOK (K3): her `Tesis` için bir kapsam öğesi üretilir
-- (kod ve ad tesisinki; `tesisId` köprüsü), omurga satırları öğeye
-- BAĞLANARAK kopyalanır — öznesi çözülemeyen satır NOT NULL kısıtına
-- çarpar ve göç DURUR, satır sessizce düşmez. `KanitTesis` verisi
-- `KanitKapsami`ye taşınır (Prisma iskeleti tabloyu DÜŞÜRÜYORDU; o
-- satır kaldırıldı). Profil değerleri `TesisOzellik` satırı olur;
-- öncesi/sonrası sayım: `node arac/goc-sayimi.mjs` →
-- `arac/goc-sayimlari/`.
--
-- KİMLİKLER DETERMİNİSTİK ('kot-…', 'ko-' || tesis.id, 'ozl-…'):
-- göç elle yeniden koşulabilsin, aynı satır iki kez yazılmasın.
--
-- 'MERKEZ' / 'SU-MERKEZ' tip kodları BU göçte sabittir: mevcut
-- kurulumların "Merkez BT" tipi kurumun kendisidir ve bir kerelik
-- dönüşümdür. Sonrası için tip → tür eşlemesi satırdadır
-- (`TesisTipi.varsayilanKapsamTuruId`) ve paket verisidir.
--
-- TAZE KURULUMDA ZARARSIZ: göçler tohumdan önce koşar; `Tesis` boştur,
-- `SELECT`ler satır üretmez, dolum tohuma kalır (tohum aynı kimlikleri
-- yazar).
--
-- B2 ŞEMA SÜTUNLARI (`SektorOznitelikSemasi`): `rol` (çekirdeğin bildiği
-- tek şey — `kapasite` · `kritiklik`), `grup` (Tesis 360'ta hangi başlığın
-- altına çizileceği; çekirdek grupla aynı ad ona eklenir), `secenekler`
-- (JSON `[{deger, ad}]`; sunucu değeri listeye karşı doğrular). Enerji
-- profil kolonları bu sütunlarla öznitelik satırı olur; su paketi profil
-- özniteliği beyan etmez ve aynı ekran yalnız çekirdeği çizer (K4).

-- AlterTable
ALTER TABLE "SektorOznitelikSemasi" ADD COLUMN "rol" TEXT;
ALTER TABLE "SektorOznitelikSemasi" ADD COLUMN "grup" TEXT;
ALTER TABLE "SektorOznitelikSemasi" ADD COLUMN "secenekler" TEXT;

-- B2 · ROL: P1 kapasite özniteliğini `etiketAnahtari = 'kapasite'` deseniyle
-- işaretliyordu; rol sütunu gelince aynı satır rolünü de taşır (tohum
-- `rol: 'kapasite'` yazar). Yeniden koşulabilir: yalnız rolsüz satır.
UPDATE "SektorOznitelikSemasi" SET "rol" = 'kapasite'
WHERE "etiketAnahtari" = 'kapasite' AND "rol" IS NULL;

-- CreateTable
CREATE TABLE "KapsamOgesiTuru" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "etiketAnahtari" TEXT,
    "sektorId" TEXT,
    "tesiseBagli" BOOLEAN NOT NULL DEFAULT false,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "KapsamOgesiTuru_sektorId_fkey" FOREIGN KEY ("sektorId") REFERENCES "Sektor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KapsamOgesi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "turId" TEXT NOT NULL,
    "tesisId" TEXT,
    "ustId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'aktif',
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KapsamOgesi_turId_fkey" FOREIGN KEY ("turId") REFERENCES "KapsamOgesiTuru" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "KapsamOgesi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KapsamOgesi_ustId_fkey" FOREIGN KEY ("ustId") REFERENCES "KapsamOgesi" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KanitKapsami" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kanitId" TEXT NOT NULL,
    "kapsamOgesiId" TEXT NOT NULL,
    CONSTRAINT "KanitKapsami_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KanitKapsami_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);


-- ── ÇEKİRDEK TÜRLER ───────────────────────────────────────────────────
INSERT INTO "KapsamOgesiTuru" ("id", "kod", "ad", "etiketAnahtari", "sektorId", "tesiseBagli", "sira", "aktif")
SELECT 'kot-tesis', 'tesis', 'Tesis', 'tesis', NULL, true, 10, true
WHERE NOT EXISTS (SELECT 1 FROM "KapsamOgesiTuru" WHERE "kod" = 'tesis');
INSERT INTO "KapsamOgesiTuru" ("id", "kod", "ad", "etiketAnahtari", "sektorId", "tesiseBagli", "sira", "aktif")
SELECT 'kot-kurum', 'kurum', 'Kuruluş', NULL, NULL, true, 20, true
WHERE NOT EXISTS (SELECT 1 FROM "KapsamOgesiTuru" WHERE "kod" = 'kurum');

-- ── HER TESİS İÇİN BİR KAPSAM ÖĞESİ ───────────────────────────────────
-- "Merkez BT" tipi kurumun kendisidir → tür `kurum`; kalanlar `tesis`.
-- Kapalı tesisin öğesi pasiftir; kaydı ve tarihçesi durur.
INSERT INTO "KapsamOgesi" ("id", "kod", "ad", "turId", "tesisId", "ustId", "durum", "olusturuldu")
SELECT 'ko-' || t."id", t."kod", t."ad",
       CASE WHEN tt."kod" IN ('MERKEZ', 'SU-MERKEZ') THEN 'kot-kurum' ELSE 'kot-tesis' END,
       t."id", NULL,
       CASE WHEN t."durum" = 'kapali' THEN 'pasif' ELSE 'aktif' END,
       t."olusturuldu"
FROM "Tesis" t LEFT JOIN "TesisTipi" tt ON tt."id" = t."tipId"
WHERE NOT EXISTS (SELECT 1 FROM "KapsamOgesi" o WHERE o."tesisId" = t."id");

-- ── KANIT BAĞLARI TAŞINIR (tablo düşürülmez, taşınır) ─────────────────
INSERT INTO "KanitKapsami" ("id", "kanitId", "kapsamOgesiId")
SELECT kt."id", kt."kanitId", o."id"
FROM "KanitTesis" kt JOIN "KapsamOgesi" o ON o."tesisId" = kt."tesisId";
DROP TABLE "KanitTesis";

-- ── B2 · PROFİL KOLONLARI ÖZNİTELİK OLUR ─────────────────────────────
-- Enerji paketi sekiz anahtarı beyan eder; çekirdek yalnız ROLÜ bilir
-- (`kritiklik`). Boolean → sayısal 0/1, metin ve tarih → metinDeger.
INSERT INTO "SektorOznitelikSemasi" ("id", "sektorId", "anahtar", "etiketAnahtari", "tip", "birim", "kuraldaKullanilir", "sira", "rol", "grup", "secenekler")
SELECT 'sos-' || s."id" || '-' || v."anahtar", s."id", v."anahtar", v."anahtar", v."tip", NULL, v."kuralda", v."sira", v."rol", v."grup", v."secenekler"
FROM "Sektor" s, (
  SELECT 'lisansTipi' AS anahtar, 'metin' AS tip, false AS kuralda, 110 AS sira, NULL AS rol, 'Lisans ve kabul' AS grup, NULL AS secenekler UNION ALL
  SELECT 'lisansNo', 'metin', false, 111, NULL, 'Lisans ve kabul', NULL UNION ALL
  SELECT 'kabulDurumu', 'metin', false, 112, NULL, 'Lisans ve kabul',
    '[{"deger":"lisans_oncesi","ad":"Lisans öncesi"},{"deger":"insaat","ad":"İnşaat"},{"deger":"gecici_kabul","ad":"Geçici kabul"},{"deger":"kesin_kabul","ad":"Kesin kabul"}]' UNION ALL
  SELECT 'kabulTarihi', 'tarih', false, 113, NULL, 'Lisans ve kabul', NULL UNION ALL
  SELECT 'blackStart', 'mantik', true, 120, NULL, 'Şebeke ve haberleşme', NULL UNION ALL
  SELECT 'teiasScadaEms', 'mantik', true, 121, NULL, 'Şebeke ve haberleşme', NULL UNION ALL
  SELECT 'seriHaberlesme', 'mantik', true, 122, NULL, 'Şebeke ve haberleşme', NULL UNION ALL
  SELECT 'kritiklikSinifi', 'metin', true, 130, 'kritiklik', 'Kritiklik ve maruziyet',
    '[{"deger":"dusuk","ad":"Düşük"},{"deger":"orta","ad":"Orta"},{"deger":"yuksek","ad":"Yüksek"},{"deger":"kritik","ad":"Kritik"}]'
) v
WHERE s."kod" = 'ELEKTRIK-URETIM'
  AND NOT EXISTS (SELECT 1 FROM "SektorOznitelikSemasi" x WHERE x."sektorId" = s."id" AND x."anahtar" = v."anahtar");

-- Etiketler enerji sözlüğüne (ekran öznitelik adını sözlükten çözer; altı hâl `prisma/sozlukler.ts` ile aynı).
INSERT INTO "SektorSozlugu" ("id", "sektorId", "anahtar", "dil", "tekil", "cogul", "iyelik", "belirtme", "bulunma", "yonelme")
SELECT 'szl-' || s."id" || '-' || v."anahtar" || '-tr', s."id", v."anahtar", 'tr', v."tekil", v."cogul", v."iyelik", v."belirtme", v."bulunma", v."yonelme"
FROM "Sektor" s, (
  SELECT 'lisansTipi' AS anahtar, 'lisans tipi' AS tekil, 'lisans tipleri' AS cogul, 'lisans tipinin' AS iyelik, 'lisans tipini' AS belirtme, 'lisans tipinde' AS bulunma, 'lisans tipine' AS yonelme UNION ALL
  SELECT 'lisansNo', 'lisans numarası', 'lisans numaraları', 'lisans numarasının', 'lisans numarasını', 'lisans numarasında', 'lisans numarasına' UNION ALL
  SELECT 'kabulDurumu', 'kabul durumu', 'kabul durumları', 'kabul durumunun', 'kabul durumunu', 'kabul durumunda', 'kabul durumuna' UNION ALL
  SELECT 'kabulTarihi', 'kabul tarihi', 'kabul tarihleri', 'kabul tarihinin', 'kabul tarihini', 'kabul tarihinde', 'kabul tarihine' UNION ALL
  SELECT 'blackStart', 'black start', 'black startlar', 'black start''ın', 'black start''ı', 'black start''ta', 'black start''a' UNION ALL
  SELECT 'teiasScadaEms', 'TEİAŞ SCADA/EMS haberleşmesi', 'TEİAŞ SCADA/EMS haberleşmeleri', 'TEİAŞ SCADA/EMS haberleşmesinin', 'TEİAŞ SCADA/EMS haberleşmesini', 'TEİAŞ SCADA/EMS haberleşmesinde', 'TEİAŞ SCADA/EMS haberleşmesine' UNION ALL
  SELECT 'seriHaberlesme', 'seri haberleşme', 'seri haberleşmeler', 'seri haberleşmenin', 'seri haberleşmeyi', 'seri haberleşmede', 'seri haberleşmeye' UNION ALL
  SELECT 'kritiklikSinifi', 'kritiklik sınıfı', 'kritiklik sınıfları', 'kritiklik sınıfının', 'kritiklik sınıfını', 'kritiklik sınıfında', 'kritiklik sınıfına'
) v
WHERE s."kod" = 'ELEKTRIK-URETIM'
  AND NOT EXISTS (SELECT 1 FROM "SektorSozlugu" x WHERE x."sektorId" = s."id" AND x."anahtar" = v."anahtar" AND x."dil" = 'tr');

INSERT INTO "TesisOzellik" ("id", "tesisId", "anahtar", "sayisalDeger", "metinDeger", "birim", "kaynak", "olcumZamani", "guncellendi")
SELECT 'ozl-' || p."tesisId" || '-lisansTipi', p."tesisId", 'lisansTipi', NULL, p."lisansTipi", NULL, 'goc:B2', NULL, p."guncellendi"
FROM "TesisProfili" p
WHERE p."lisansTipi" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "TesisOzellik" x WHERE x."tesisId" = p."tesisId" AND x."anahtar" = 'lisansTipi');
INSERT INTO "TesisOzellik" ("id", "tesisId", "anahtar", "sayisalDeger", "metinDeger", "birim", "kaynak", "olcumZamani", "guncellendi")
SELECT 'ozl-' || p."tesisId" || '-lisansNo', p."tesisId", 'lisansNo', NULL, p."lisansNo", NULL, 'goc:B2', NULL, p."guncellendi"
FROM "TesisProfili" p
WHERE p."lisansNo" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "TesisOzellik" x WHERE x."tesisId" = p."tesisId" AND x."anahtar" = 'lisansNo');
INSERT INTO "TesisOzellik" ("id", "tesisId", "anahtar", "sayisalDeger", "metinDeger", "birim", "kaynak", "olcumZamani", "guncellendi")
SELECT 'ozl-' || p."tesisId" || '-kabulDurumu', p."tesisId", 'kabulDurumu', NULL, p."kabulDurumu", NULL, 'goc:B2', NULL, p."guncellendi"
FROM "TesisProfili" p
WHERE p."kabulDurumu" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "TesisOzellik" x WHERE x."tesisId" = p."tesisId" AND x."anahtar" = 'kabulDurumu');
INSERT INTO "TesisOzellik" ("id", "tesisId", "anahtar", "sayisalDeger", "metinDeger", "birim", "kaynak", "olcumZamani", "guncellendi")
SELECT 'ozl-' || p."tesisId" || '-kabulTarihi', p."tesisId", 'kabulTarihi', NULL, p."kabulTarihi", NULL, 'goc:B2', NULL, p."guncellendi"
FROM "TesisProfili" p
WHERE p."kabulTarihi" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "TesisOzellik" x WHERE x."tesisId" = p."tesisId" AND x."anahtar" = 'kabulTarihi');
INSERT INTO "TesisOzellik" ("id", "tesisId", "anahtar", "sayisalDeger", "metinDeger", "birim", "kaynak", "olcumZamani", "guncellendi")
SELECT 'ozl-' || p."tesisId" || '-blackStart', p."tesisId", 'blackStart', p."blackStart", NULL, NULL, 'goc:B2', NULL, p."guncellendi"
FROM "TesisProfili" p
WHERE p."blackStart" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "TesisOzellik" x WHERE x."tesisId" = p."tesisId" AND x."anahtar" = 'blackStart');
INSERT INTO "TesisOzellik" ("id", "tesisId", "anahtar", "sayisalDeger", "metinDeger", "birim", "kaynak", "olcumZamani", "guncellendi")
SELECT 'ozl-' || p."tesisId" || '-teiasScadaEms', p."tesisId", 'teiasScadaEms', p."teiasScadaEms", NULL, NULL, 'goc:B2', NULL, p."guncellendi"
FROM "TesisProfili" p
WHERE p."teiasScadaEms" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "TesisOzellik" x WHERE x."tesisId" = p."tesisId" AND x."anahtar" = 'teiasScadaEms');
INSERT INTO "TesisOzellik" ("id", "tesisId", "anahtar", "sayisalDeger", "metinDeger", "birim", "kaynak", "olcumZamani", "guncellendi")
SELECT 'ozl-' || p."tesisId" || '-seriHaberlesme', p."tesisId", 'seriHaberlesme', p."seriHaberlesme", NULL, NULL, 'goc:B2', NULL, p."guncellendi"
FROM "TesisProfili" p
WHERE p."seriHaberlesme" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "TesisOzellik" x WHERE x."tesisId" = p."tesisId" AND x."anahtar" = 'seriHaberlesme');
INSERT INTO "TesisOzellik" ("id", "tesisId", "anahtar", "sayisalDeger", "metinDeger", "birim", "kaynak", "olcumZamani", "guncellendi")
SELECT 'ozl-' || p."tesisId" || '-kritiklikSinifi', p."tesisId", 'kritiklikSinifi', NULL, p."kritiklikSinifi", NULL, 'goc:B2', NULL, p."guncellendi"
FROM "TesisProfili" p
WHERE p."kritiklikSinifi" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "TesisOzellik" x WHERE x."tesisId" = p."tesisId" AND x."anahtar" = 'kritiklikSinifi');

-- Türetilmiş enerji alanı (`teiasScadaEmsSeriOlmayan`) çekirdek motordan
-- çıktı; kural iç içe `hepsi` ile aynı şeyi söyler.
UPDATE "UygulanabilirlikKurali"
SET "kosulJson" = REPLACE("kosulJson",
  '{"alan":"teiasScadaEmsSeriOlmayan","islec":"=","deger":true}',
  '{"hepsi":[{"alan":"teiasScadaEms","islec":"=","deger":true},{"alan":"seriHaberlesme","islec":"!=","deger":true}]}')
WHERE "kosulJson" LIKE '%teiasScadaEmsSeriOlmayan%';

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DegerlendirmeAktarimi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regulasyonId" TEXT NOT NULL,
    "kapsamOgesiId" TEXT NOT NULL,
    "surecId" TEXT,
    "kaynakAdi" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'kuru_kosu',
    "okunan" INTEGER NOT NULL DEFAULT 0,
    "eslesen" INTEGER NOT NULL DEFAULT 0,
    "elenen" INTEGER NOT NULL DEFAULT 0,
    "degisen" INTEGER NOT NULL DEFAULT 0,
    "raporJson" TEXT,
    "kuruKosuId" TEXT,
    "yukleyenId" TEXT,
    "uygulandi" DATETIME,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DegerlendirmeAktarimi_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DegerlendirmeAktarimi_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DegerlendirmeAktarimi_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DegerlendirmeAktarimi_kuruKosuId_fkey" FOREIGN KEY ("kuruKosuId") REFERENCES "DegerlendirmeAktarimi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DegerlendirmeAktarimi_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DegerlendirmeAktarimi" ("degisen", "durum", "elenen", "eslesen", "id", "kaynakAdi", "kuruKosuId", "okunan", "olusturuldu", "raporJson", "regulasyonId", "surecId", "uygulandi", "yukleyenId", "kapsamOgesiId") SELECT "degisen", "durum", "elenen", "eslesen", "id", "kaynakAdi", "kuruKosuId", "okunan", "olusturuldu", "raporJson", "regulasyonId", "surecId", "uygulandi", "yukleyenId", (SELECT o."id" FROM "KapsamOgesi" o WHERE o."tesisId" = "DegerlendirmeAktarimi"."tesisId") FROM "DegerlendirmeAktarimi";
DROP TABLE "DegerlendirmeAktarimi";
ALTER TABLE "new_DegerlendirmeAktarimi" RENAME TO "DegerlendirmeAktarimi";
CREATE INDEX "DegerlendirmeAktarimi_regulasyonId_kapsamOgesiId_durum_idx" ON "DegerlendirmeAktarimi"("regulasyonId", "kapsamOgesiId", "durum");
CREATE TABLE "new_DenetciKapsami" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "erisimId" TEXT NOT NULL,
    "kapsamOgesiId" TEXT NOT NULL,
    CONSTRAINT "DenetciKapsami_erisimId_fkey" FOREIGN KEY ("erisimId") REFERENCES "DenetciErisimi" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DenetciKapsami_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DenetciKapsami" ("erisimId", "id", "kapsamOgesiId") SELECT "erisimId", "id", (SELECT o."id" FROM "KapsamOgesi" o WHERE o."tesisId" = "DenetciKapsami"."tesisId") FROM "DenetciKapsami";
DROP TABLE "DenetciKapsami";
ALTER TABLE "new_DenetciKapsami" RENAME TO "DenetciKapsami";
CREATE UNIQUE INDEX "DenetciKapsami_erisimId_kapsamOgesiId_key" ON "DenetciKapsami"("erisimId", "kapsamOgesiId");
CREATE TABLE "new_Istisna" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "maddeId" TEXT NOT NULL,
    "kapsamOgesiId" TEXT NOT NULL,
    "gerekce" TEXT NOT NULL,
    "baslangic" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" DATETIME NOT NULL,
    "onaylayanId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'onay_bekliyor',
    CONSTRAINT "Istisna_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Istisna_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Istisna_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Istisna" ("baslangic", "bitis", "durum", "gerekce", "id", "maddeId", "onaylayanId", "kapsamOgesiId") SELECT "baslangic", "bitis", "durum", "gerekce", "id", "maddeId", "onaylayanId", (SELECT o."id" FROM "KapsamOgesi" o WHERE o."tesisId" = "Istisna"."tesisId") FROM "Istisna";
DROP TABLE "Istisna";
ALTER TABLE "new_Istisna" RENAME TO "Istisna";
CREATE TABLE "new_MaddeDurumu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surecId" TEXT NOT NULL,
    "maddeId" TEXT NOT NULL,
    "kapsamOgesiId" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'degerlendirilmedi',
    "guven" TEXT NOT NULL DEFAULT 'kanit_yok',
    "kanitBayat" BOOLEAN NOT NULL DEFAULT false,
    "sorumluId" TEXT,
    "ekipId" TEXT,
    "dogrulayanId" TEXT,
    "dogrulamaZamani" DATETIME,
    "not" TEXT,
    "olgunlukSeviyesi" INTEGER,
    "sonDegerlendirme" DATETIME,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "MaddeDurumu_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_ekipId_fkey" FOREIGN KEY ("ekipId") REFERENCES "Ekip" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_dogrulayanId_fkey" FOREIGN KEY ("dogrulayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MaddeDurumu" ("dogrulamaZamani", "dogrulayanId", "durum", "ekipId", "guncellendi", "guven", "id", "kanitBayat", "maddeId", "not", "olgunlukSeviyesi", "sonDegerlendirme", "sorumluId", "surecId", "kapsamOgesiId") SELECT "dogrulamaZamani", "dogrulayanId", "durum", "ekipId", "guncellendi", "guven", "id", "kanitBayat", "maddeId", "not", "olgunlukSeviyesi", "sonDegerlendirme", "sorumluId", "surecId", (SELECT o."id" FROM "KapsamOgesi" o WHERE o."tesisId" = "MaddeDurumu"."tesisId") FROM "MaddeDurumu";
DROP TABLE "MaddeDurumu";
ALTER TABLE "new_MaddeDurumu" RENAME TO "MaddeDurumu";
CREATE INDEX "MaddeDurumu_surecId_kapsamOgesiId_durum_idx" ON "MaddeDurumu"("surecId", "kapsamOgesiId", "durum");
CREATE UNIQUE INDEX "MaddeDurumu_surecId_maddeId_kapsamOgesiId_key" ON "MaddeDurumu"("surecId", "maddeId", "kapsamOgesiId");
CREATE TABLE "new_SurecKapsami" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surecId" TEXT NOT NULL,
    "kapsamOgesiId" TEXT NOT NULL,
    "eklendi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurecKapsami_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SurecKapsami_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SurecKapsami" ("eklendi", "id", "surecId", "kapsamOgesiId") SELECT "eklendi", "id", "surecId", (SELECT o."id" FROM "KapsamOgesi" o WHERE o."tesisId" = "SurecKapsami"."tesisId") FROM "SurecKapsami";
DROP TABLE "SurecKapsami";
ALTER TABLE "new_SurecKapsami" RENAME TO "SurecKapsami";
CREATE UNIQUE INDEX "SurecKapsami_surecId_kapsamOgesiId_key" ON "SurecKapsami"("surecId", "kapsamOgesiId");
CREATE TABLE "new_TesisProfili" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tesisId" TEXT NOT NULL,
    "kritikAltyapiStatusu" BOOLEAN,
    "veriIslemeProfili" TEXT,
    "internetMaruziyeti" TEXT,
    "uzaktanErisim" BOOLEAN,
    "otMimariTipi" TEXT,
    "dcsSaglayici" TEXT,
    "scadaSaglayici" TEXT,
    "plcAileleri" TEXT,
    "iotVar" BOOLEAN,
    "akilliSayacVar" BOOLEAN,
    "yerelAdVar" BOOLEAN,
    "yerelVeriMerkeziVar" BOOLEAN,
    "grupOrtakServisler" TEXT,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "TesisProfili_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TesisProfili" ("akilliSayacVar", "dcsSaglayici", "grupOrtakServisler", "guncellendi", "id", "internetMaruziyeti", "iotVar", "kritikAltyapiStatusu", "otMimariTipi", "plcAileleri", "scadaSaglayici", "tesisId", "uzaktanErisim", "veriIslemeProfili", "yerelAdVar", "yerelVeriMerkeziVar") SELECT "akilliSayacVar", "dcsSaglayici", "grupOrtakServisler", "guncellendi", "id", "internetMaruziyeti", "iotVar", "kritikAltyapiStatusu", "otMimariTipi", "plcAileleri", "scadaSaglayici", "tesisId", "uzaktanErisim", "veriIslemeProfili", "yerelAdVar", "yerelVeriMerkeziVar" FROM "TesisProfili";
DROP TABLE "TesisProfili";
ALTER TABLE "new_TesisProfili" RENAME TO "TesisProfili";
CREATE UNIQUE INDEX "TesisProfili_tesisId_key" ON "TesisProfili"("tesisId");
CREATE TABLE "new_TesisTipi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "sektorId" TEXT,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "varsayilanKapsamTuruId" TEXT,
    CONSTRAINT "TesisTipi_sektorId_fkey" FOREIGN KEY ("sektorId") REFERENCES "Sektor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TesisTipi_varsayilanKapsamTuruId_fkey" FOREIGN KEY ("varsayilanKapsamTuruId") REFERENCES "KapsamOgesiTuru" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TesisTipi" ("ad", "aktif", "id", "kod", "sektorId", "sira") SELECT "ad", "aktif", "id", "kod", "sektorId", "sira" FROM "TesisTipi";
DROP TABLE "TesisTipi";
ALTER TABLE "new_TesisTipi" RENAME TO "TesisTipi";
UPDATE "TesisTipi" SET "varsayilanKapsamTuruId" = CASE WHEN "kod" IN ('MERKEZ', 'SU-MERKEZ') THEN 'kot-kurum' ELSE 'kot-tesis' END
WHERE "varsayilanKapsamTuruId" IS NULL;
CREATE UNIQUE INDEX "TesisTipi_kod_key" ON "TesisTipi"("kod");
CREATE TABLE "new_UygulanabilirlikKarari" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kapsamOgesiId" TEXT NOT NULL,
    "regulasyonId" TEXT NOT NULL,
    "uygulanabilir" BOOLEAN NOT NULL,
    "gerekce" TEXT NOT NULL,
    "kuralId" TEXT,
    "kuralSurumu" INTEGER,
    "hesaplandi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "elIleDegistirildi" BOOLEAN NOT NULL DEFAULT false,
    "degistirmeGerekcesi" TEXT,
    "onaylayanId" TEXT,
    CONSTRAINT "UygulanabilirlikKarari_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UygulanabilirlikKarari_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UygulanabilirlikKarari_kuralId_fkey" FOREIGN KEY ("kuralId") REFERENCES "UygulanabilirlikKurali" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UygulanabilirlikKarari_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_UygulanabilirlikKarari" ("degistirmeGerekcesi", "elIleDegistirildi", "gerekce", "hesaplandi", "id", "kuralId", "kuralSurumu", "onaylayanId", "regulasyonId", "uygulanabilir", "kapsamOgesiId") SELECT "degistirmeGerekcesi", "elIleDegistirildi", "gerekce", "hesaplandi", "id", "kuralId", "kuralSurumu", "onaylayanId", "regulasyonId", "uygulanabilir", (SELECT o."id" FROM "KapsamOgesi" o WHERE o."tesisId" = "UygulanabilirlikKarari"."tesisId") FROM "UygulanabilirlikKarari";
DROP TABLE "UygulanabilirlikKarari";
ALTER TABLE "new_UygulanabilirlikKarari" RENAME TO "UygulanabilirlikKarari";
CREATE UNIQUE INDEX "UygulanabilirlikKarari_kapsamOgesiId_regulasyonId_key" ON "UygulanabilirlikKarari"("kapsamOgesiId", "regulasyonId");
CREATE TABLE "new_UyumAnlik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surecId" TEXT NOT NULL,
    "kapsamOgesiId" TEXT,
    "tarih" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ozetJson" TEXT NOT NULL,
    CONSTRAINT "UyumAnlik_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UyumAnlik_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_UyumAnlik" ("id", "ozetJson", "surecId", "tarih", "kapsamOgesiId") SELECT "id", "ozetJson", "surecId", "tarih", (SELECT o."id" FROM "KapsamOgesi" o WHERE o."tesisId" = "UyumAnlik"."tesisId") FROM "UyumAnlik";
DROP TABLE "UyumAnlik";
ALTER TABLE "new_UyumAnlik" RENAME TO "UyumAnlik";
CREATE INDEX "UyumAnlik_surecId_tarih_idx" ON "UyumAnlik"("surecId", "tarih");
CREATE TABLE "new_Yetki" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kullaniciId" TEXT NOT NULL,
    "surecId" TEXT,
    "kapsamOgesiId" TEXT,
    "tuzelKisiId" TEXT,
    "regulasyonId" TEXT,
    "modul" TEXT,
    "rol" TEXT NOT NULL,
    CONSTRAINT "Yetki_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Yetki_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Yetki_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Yetki_tuzelKisiId_fkey" FOREIGN KEY ("tuzelKisiId") REFERENCES "TuzelKisi" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Yetki" ("id", "kullaniciId", "modul", "regulasyonId", "rol", "surecId", "tuzelKisiId", "kapsamOgesiId") SELECT "id", "kullaniciId", "modul", "regulasyonId", "rol", "surecId", "tuzelKisiId", (SELECT o."id" FROM "KapsamOgesi" o WHERE o."tesisId" = "Yetki"."tesisId") FROM "Yetki";
DROP TABLE "Yetki";
ALTER TABLE "new_Yetki" RENAME TO "Yetki";
CREATE UNIQUE INDEX "Yetki_kullaniciId_surecId_kapsamOgesiId_tuzelKisiId_regulasyonId_modul_key" ON "Yetki"("kullaniciId", "surecId", "kapsamOgesiId", "tuzelKisiId", "regulasyonId", "modul");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "KapsamOgesiTuru_kod_key" ON "KapsamOgesiTuru"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "KapsamOgesi_kod_key" ON "KapsamOgesi"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "KapsamOgesi_tesisId_key" ON "KapsamOgesi"("tesisId");

-- CreateIndex
CREATE INDEX "KapsamOgesi_turId_idx" ON "KapsamOgesi"("turId");

-- CreateIndex
CREATE UNIQUE INDEX "KanitKapsami_kanitId_kapsamOgesiId_key" ON "KanitKapsami"("kanitId", "kapsamOgesiId");

