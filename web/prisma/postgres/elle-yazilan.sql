-- ═══════════════════════════════════════════════════════════════════════
-- ELLE YAZILAN DDL · PostgreSQL karşılıkları (R5)
--
-- `prisma migrate diff` YALNIZ Prisma modelini görür. SQLite göç zinciri
-- bunun DIŞINDA da DDL taşıyor: tetikleyiciler, kısmi (partial) tekil
-- indeksler ve ifade indeksleri. Bunlar taban göçüne elle eklenmezse
-- PostgreSQL kurulumu "şema farkı 0" der ve YİNE DE korumasız kalır —
-- ölçüldü (9 Eylül 2026, R5): PostgreSQL'de koşulan test kümesinde
-- `faz-d-eylem` · `yaris-kosullari` · `zimmet-eylem` · `erisim` kırmızı
-- yandı, çünkü iki tetikleyici ve üç indeks yoktu. Kapı artık iki
-- sağlayıcının NESNE ENVANTERİNİ karşılaştırıyor (`arac/pg-goc.mjs`):
-- SQLite'ta olup PostgreSQL'de olmayan tetikleyici/indeks KIRMIZIDIR.
--
-- ── 1 · DENETİM İZİ DEĞİŞMEZLİĞİ
--
-- SQLite tarafı: prisma/migrations/20260830190000_denetim_izi_degismezligi
-- (`RAISE(ABORT, …)`; PostgreSQL'de SÖZDİZİMİ HATASIDIR — tetikleyici
-- gövdesi doğrudan yazılamaz, fonksiyon gerekir).
--
-- ÜÇ FARK, üçü de sessizdir:
--  1. `FOR EACH ROW` ZORUNLU. `FOR EACH STATEMENT` yazılırsa hiçbir satıra
--     dokunmayan `UPDATE … WHERE (yanlış)` bile reddedilir; SQLite'ta
--     reddedilmez. Davranış farkı hiçbir hata vermez.
--  2. TRUNCATE SQLite'ta YOKTUR; PostgreSQL'de vardır ve SATIR
--     tetikleyicilerini ATLAR. İki TRUNCATE tetikleyicisi olmadan
--     "denetim izi değişmezdir" iddiası PostgreSQL'de YALANDIR — bu
--     yüzden altı tetikleyici vardır, dört değil.
--  3. Tablo SAHİBİ `ALTER TABLE … DISABLE TRIGGER` diyebilir. Uygulama
--     rolü tablo sahibi OLMAMALIDIR (docs/POSTGRES_READINESS.md §e.6).
--
-- Mesaj metinleri SQLite tarafıyla AYNI tutulur: iki sağlayıcıda aynı
-- hatayı arayan test ve günlük ayrışmasın.
-- ═══════════════════════════════════════════════════════════════════════

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
  FOR EACH ROW EXECUTE FUNCTION denetim_izi_degismez('Denetim izi kayitlari degistirilemez');

CREATE TRIGGER aktivite_silme_yasak
  BEFORE DELETE ON "AktiviteKaydi"
  FOR EACH ROW EXECUTE FUNCTION denetim_izi_degismez('Denetim izi kayitlari silinemez');

CREATE TRIGGER degerlendirme_tarihcesi_guncelleme_yasak
  BEFORE UPDATE ON "DegerlendirmeTarihcesi"
  FOR EACH ROW EXECUTE FUNCTION denetim_izi_degismez('Degerlendirme tarihcesi degistirilemez');

CREATE TRIGGER degerlendirme_tarihcesi_silme_yasak
  BEFORE DELETE ON "DegerlendirmeTarihcesi"
  FOR EACH ROW EXECUTE FUNCTION denetim_izi_degismez('Degerlendirme tarihcesi silinemez');

CREATE TRIGGER aktivite_truncate_yasak
  BEFORE TRUNCATE ON "AktiviteKaydi"
  FOR EACH STATEMENT EXECUTE FUNCTION denetim_izi_degismez('Denetim izi kayitlari bosaltilamaz');

CREATE TRIGGER degerlendirme_tarihcesi_truncate_yasak
  BEFORE TRUNCATE ON "DegerlendirmeTarihcesi"
  FOR EACH STATEMENT EXECUTE FUNCTION denetim_izi_degismez('Degerlendirme tarihcesi bosaltilamaz');


-- ═══════════════════════════════════════════════════════════════════════
-- 2 · KANIT SÜRÜM GEÇMİŞİ DEĞİŞMEZLİĞİ
-- SQLite karşılığı: prisma/migrations/20260903192431_faz_d_uyum_kanit
-- (`kanit_surumu_guncelleme_yasak` · `kanit_surumu_silme_yasak`).
-- ═══════════════════════════════════════════════════════════════════════

CREATE TRIGGER kanit_surumu_guncelleme_yasak
  BEFORE UPDATE ON "KanitSurumu"
  FOR EACH ROW EXECUTE FUNCTION denetim_izi_degismez('Kanit surum gecmisi degistirilemez');

CREATE TRIGGER kanit_surumu_silme_yasak
  BEFORE DELETE ON "KanitSurumu"
  FOR EACH ROW EXECUTE FUNCTION denetim_izi_degismez('Kanit surum gecmisi silinemez');

CREATE TRIGGER kanit_surumu_truncate_yasak
  BEFORE TRUNCATE ON "KanitSurumu"
  FOR EACH STATEMENT EXECUTE FUNCTION denetim_izi_degismez('Kanit surum gecmisi bosaltilamaz');

-- ═══════════════════════════════════════════════════════════════════════
-- 3 · KISMİ VE İFADE İNDEKSLERİ — Prisma şemasında YAZILAMAZ
--
-- Üçü de uygulama katmanının atlanabildiği yerlerde durur: kısıt
-- veritabanındadır, çünkü "önce oku sonra yaz" kalıbı eşzamanlı iki
-- yazmada ikisini de geçirir.
-- ═══════════════════════════════════════════════════════════════════════

-- Bir regülasyonda YALNIZ BİR aktif sürüm (SQLite: 20260901201000).
-- Arşiv ve taslak sürümler indekse girmez.
CREATE UNIQUE INDEX "FrameworkSurumu_tekAktif"
  ON "FrameworkSurumu"("regulasyonId") WHERE "durum" = 'aktif';

-- Bir varlık için aynı anda tek BEKLEYEN atama talebi (SQLite: 20260904084500).
CREATE UNIQUE INDEX "VarlikAtamaTalebi_tek_aktif"
  ON "VarlikAtamaTalebi"("varlikId") WHERE "durum" = 'bekliyor';

-- Erişim atamasının NULL'lu üçlüsü de tekildir (SQLite: 20260901210000).
-- SQLite `char(31)` yazar, PostgreSQL'de aynı işi `chr(31)` görür: ikisi de
-- birim ayracıdır. `NULLS NOT DISTINCT` yerine ifade indeksi seçildi ki
-- iki sağlayıcıda AYNI kural dursun ve SQLite tarafı değişmesin.
CREATE UNIQUE INDEX "ErisimAtamasi_tekil_coalesce_key"
  ON "ErisimAtamasi"("hesapId", COALESCE("varlikId", chr(31)), COALESCE("kapsam", chr(31)));
