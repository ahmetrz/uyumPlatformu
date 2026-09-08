-- SÖZLÜK GERİ DOLGUSU · P1 · URN-ALN-004
--
-- KUSUR (Codex incelemesi · #30, P1): `20260906230000` göçü
-- `SektorSozlugu` TABLOSUNU yaratıyor ama SATIR yazmıyor. Tek dolum yeri
-- `prisma/seed.ts` ve o da `aktiviteKaydi.count() > 0` ise hiç koşmuyor.
-- Sonuç: DOLU bir veritabanında `migrate deploy` sonrası sözlük boştur,
-- `sektorSozlugu()` `null` döner ve BÜTÜN ekranlar sessizce çekirdeğe
-- düşer — referans kiracı yükseltmede "santral" sözcüğünü kaybeder.
-- Ürünün tek iddiası ("kiracı kendi sözcüğünü görür") yükseltmeyle
-- ortadan kalkıyordu.
--
-- Bu göç, kurulu sektör paketinin sözlüğünü GERİ DOLDURUR.
--
-- Neden AYRI göç: `20260906230000` uygulanmış bir göçtür ve Prisma onu
-- sağlama toplamıyla tutar; içeriğini değiştirmek onu uygulamış her
-- veritabanında sürüklenme (drift) hatası verirdi.
--
-- Neden TAZE veritabanında zararsız: taze kurulumda bu göç koştuğunda
-- `Sektor` tablosu HENÜZ BOŞTUR (tohum göçlerden sonra koşar), bu yüzden
-- `SELECT`ler hiçbir satır üretmez ve dolum tohuma kalır. Yükseltmede
-- ise `Sektor` doludur ve satırlar buradan gelir.
--
-- Neden `WHERE NOT EXISTS`: göç bir kez uygulanır ama elle yeniden
-- koşulabilir; var olan satırı ikizlemek `(sektorId, anahtar, dil)`
-- tekilliğini kırardı. Kimlik de deterministik üretiliyor (rastgele cuid
-- değil) — aynı satır iki kez yazılamasın diye.
--
-- Kaynak: `prisma/sozlukler.ts` → `ENERJI_SOZLUGU`. İki nüsha olduğu
-- doğru değil ama göç SQL'dir ve TypeScript okuyamaz; bu yüzden
-- `tests/sozluk-geri-dolgu.test.ts` iki kaynağın AYNI satırları
-- söylediğini sınar — nüsha var, ama sessizce ayrışamıyor.

INSERT INTO "SektorSozlugu" ("id", "sektorId", "anahtar", "dil", "tekil", "cogul", "iyelik", "belirtme", "bulunma", "yonelme")
SELECT 'szl-' || s."id" || '-tesis-tr', s."id", 'tesis', 'tr',
       'santral', 'santraller', 'santralin', 'santrali', 'santralde', 'santrale'
FROM "Sektor" s
WHERE s."kod" = 'ELEKTRIK-URETIM'
  AND NOT EXISTS (SELECT 1 FROM "SektorSozlugu" x
                  WHERE x."sektorId" = s."id" AND x."anahtar" = 'tesis' AND x."dil" = 'tr');

INSERT INTO "SektorSozlugu" ("id", "sektorId", "anahtar", "dil", "tekil", "cogul", "iyelik", "belirtme", "bulunma", "yonelme")
SELECT 'szl-' || s."id" || '-birim-tr', s."id", 'birim', 'tr',
       'üretim ünitesi', 'üretim üniteleri', 'üretim ünitesinin', 'üretim ünitesini', 'üretim ünitesinde', 'üretim ünitesine'
FROM "Sektor" s
WHERE s."kod" = 'ELEKTRIK-URETIM'
  AND NOT EXISTS (SELECT 1 FROM "SektorSozlugu" x
                  WHERE x."sektorId" = s."id" AND x."anahtar" = 'birim' AND x."dil" = 'tr');

INSERT INTO "SektorSozlugu" ("id", "sektorId", "anahtar", "dil", "tekil", "cogul", "iyelik", "belirtme", "bulunma", "yonelme")
SELECT 'szl-' || s."id" || '-portfoy-tr', s."id", 'portfoy', 'tr',
       'enerji portföyü', 'enerji portföyleri', 'enerji portföyünün', 'enerji portföyünü', 'enerji portföyünde', 'enerji portföyüne'
FROM "Sektor" s
WHERE s."kod" = 'ELEKTRIK-URETIM'
  AND NOT EXISTS (SELECT 1 FROM "SektorSozlugu" x
                  WHERE x."sektorId" = s."id" AND x."anahtar" = 'portfoy' AND x."dil" = 'tr');

INSERT INTO "SektorSozlugu" ("id", "sektorId", "anahtar", "dil", "tekil", "cogul", "iyelik", "belirtme", "bulunma", "yonelme")
SELECT 'szl-' || s."id" || '-tesis360-tr', s."id", 'tesis360', 'tr',
       'Santral 360', 'Santral 360', 'Santral 360', 'Santral 360', 'Santral 360', 'Santral 360'
FROM "Sektor" s
WHERE s."kod" = 'ELEKTRIK-URETIM'
  AND NOT EXISTS (SELECT 1 FROM "SektorSozlugu" x
                  WHERE x."sektorId" = s."id" AND x."anahtar" = 'tesis360' AND x."dil" = 'tr');
