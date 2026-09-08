-- SÖZLÜK GERİ DOLGUSU · `kapasite` anahtarı · P1 · URN-ALN-004
--
-- NİÇİN: ekranlar tesisin birincil ölçüsünü `kuruluGuc` diye SABİT bir
-- anahtarla biliyordu; §0.5 çekirdeğin sektör terimi taşımamasını ister.
-- Anahtar artık `SektorOznitelikSemasi`ndan, ETİKETİ ise sözlükten
-- gelir: çekirdek nötr "kapasite" der, enerji "kurulu güç", su "günlük
-- debi". Yeni çekirdek anahtar bir sözlük satırı ister.
--
-- NEDEN AYRI GÖÇ: `20260908080000` uygulanmış bir göçtür ve Prisma onu
-- sağlama toplamıyla tutar; içine satır eklemek onu uygulamış her
-- veritabanında sürüklenme (drift) hatası verirdi. Aynı gerekçenin
-- ikinci uygulanışı — kural bir kez yazıldı, burada da geçerli.
--
-- NEDEN TAZE VERİTABANINDA ZARARSIZ: taze kurulumda göçler tohumdan
-- ÖNCE koşar, `Sektor` tablosu boştur, `SELECT` hiçbir satır üretmez ve
-- dolum tohuma kalır. Yükseltmede `Sektor` doludur ve satır buradan
-- gelir.
--
-- `WHERE NOT EXISTS`: göç elle yeniden koşulabilir; var olan satırı
-- ikizlemek `(sektorId, anahtar, dil)` tekilliğini kırardı.
--
-- Kaynak: `prisma/sozlukler.ts` → `ENERJI_SOZLUGU`. Nüshanın sessizce
-- ayrışmaması `tests/inceleme-30.test.ts` ile sınanır ve o vaka BÜTÜN
-- geri dolgu göçlerinin birleşimine bakar — tek dosyaya değil.

INSERT INTO "SektorSozlugu" ("id", "sektorId", "anahtar", "dil", "tekil", "cogul", "iyelik", "belirtme", "bulunma", "yonelme")
SELECT 'szl-' || s."id" || '-kapasite-tr', s."id", 'kapasite', 'tr',
       'kurulu güç', 'kurulu güçler', 'kurulu gücün', 'kurulu gücü', 'kurulu güçte', 'kurulu güce'
FROM "Sektor" s
WHERE s."kod" = 'ELEKTRIK-URETIM'
  AND NOT EXISTS (SELECT 1 FROM "SektorSozlugu" x
                  WHERE x."sektorId" = s."id" AND x."anahtar" = 'kapasite' AND x."dil" = 'tr');
