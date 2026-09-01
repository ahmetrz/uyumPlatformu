-- ErisimAtamasi tekilliği.
--
-- NEDEN: `lib/api/uclar/erisimler.ts` erişim atamasını `findFirst` →
-- yoksa `create` kalıbıyla yazıyor ve veritabanında hiçbir tekillik kısıtı
-- yok. Farklı Idempotency-Key taşıyan iki eşzamanlı PAM aktarımı ikisi de
-- "atama yok" görüp aynı satırı iki kez yazabiliyor; /kimlik ekranındaki
-- ayrıcalıklı erişim sayısı olduğundan yüksek çıkıyor. Aynı sınıfın diğer
-- üç vakası (KesifKaydi, KonfigurasyonYedegi, TedarikciErisimOturumu)
-- 20260901160000 göçünde kapatılmış, bu atlanmıştı.
--
-- İKİ İNDEKS, TEK KURAL:
--
--   1. ErisimAtamasi_hesapId_varlikId_kapsam_key — şemadaki `@@unique`in
--      karşılığı. Prisma bunu bilir; hata P2002 olarak yüzeye çıkar.
--
--   2. ErisimAtamasi_tekil_coalesce_key — aynı üçlü, ama NULL'lar bir
--      ayraç karakterine (char(31), birim ayracı) indirgenerek. SQLite
--      tekil indekste NULL'ları BİRBİRİNDEN FARKLI sayar; birinci indeks
--      tek başına "varlığı ya da kapsamı olmayan" atamaları hiç
--      kapsamazdı ve API yolunda kapsam çoğu zaman NULL'dur — yani kısıt
--      tam da korumak istediği yerde işlemezdi. İfade indeksi Prisma
--      şemasında yazılamadığı için burada elle kurulur; introspection onu
--      görmez, bu yüzden `migrate diff --from-config-datasource
--      --to-schema` BOŞ döner (ölçüldü).
--
-- MEVCUT VERİ: 121 satır; hem katı hem COALESCE'li üçlüde çakışma sayısı
-- SIFIR ölçüldü (SELECT ... GROUP BY HAVING count(*)>1 → boş). Göç mevcut
-- veriyi reddetmez; tablo yeniden kurulmaz, yalnız iki indeks eklenir.

CREATE UNIQUE INDEX "ErisimAtamasi_hesapId_varlikId_kapsam_key"
  ON "ErisimAtamasi"("hesapId", "varlikId", "kapsam");

CREATE UNIQUE INDEX "ErisimAtamasi_tekil_coalesce_key"
  ON "ErisimAtamasi"("hesapId", COALESCE("varlikId", char(31)), COALESCE("kapsam", char(31)));
