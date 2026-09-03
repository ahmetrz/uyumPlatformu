-- Koordinatın KAYNAĞI ve DOĞRULANMIŞLIĞI (P3-8).
--
-- NEDEN: `20260902020000_tesis_koordinati` enlem/boylam ekledi ama tek
-- bir soruyu cevapsız bıraktı — bu koordinat NEREDEN geldi? Kamuya açık
-- bir kaynaktan (EPDK lisans sicili, OpenStreetMap) bulunmuş yaklaşık
-- bir nokta ile saha ekibinin GPS'le ölçtüğü nokta aynı iki kolona aynı
-- biçimde yazılıyor, ekran ikisini de KESİN gibi gösteriyordu.
--
-- Bu, ürünün kendi kuralına aykırıydı: "bilinmeyen ≠ sıfır". Koordinat
-- iki değil ÜÇ durumludur:
--   · yok            → enlem/boylam NULL
--   · var, doğrulanmadı → koordinat dolu, konumDogrulandi = 0
--   · doğrulandı     → koordinat dolu, konumDogrulandi = 1 + kim/ne zaman
--
-- VERİ KAYBI YOK: dört kolon da ekleyicidir, var olan satırlara
-- dokunulmaz. `konumDogrulandi` varsayılanı 0 — yani bugün girilmiş
-- (ve doğrulanmamış) her koordinat doğru sınıfa düşer. Geriye dönük
-- "doğrulandı" varsaymak, tam da kapatmak istediğimiz yalanı yazmak
-- olurdu.

-- AlterTable
ALTER TABLE "Tesis" ADD COLUMN "konumKaynagi" TEXT;
ALTER TABLE "Tesis" ADD COLUMN "konumDogrulandi" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tesis" ADD COLUMN "konumDogrulayanId" TEXT;
ALTER TABLE "Tesis" ADD COLUMN "konumDogrulandiZaman" DATETIME;
