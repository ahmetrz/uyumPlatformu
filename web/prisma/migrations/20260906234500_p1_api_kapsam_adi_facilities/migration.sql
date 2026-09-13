-- ═══════════════════════════════════════════════════════════════════════
-- API kapsam adı: 'plants' → 'facilities' (P1 · §0.5)
--
-- `/api/v1/plants` ucu `/api/v1/facilities` oldu; uç kimliği aynı zamanda
-- ApiAnahtari.kapsamJson içinde SAKLANAN bir değerdir. Kod tarafını
-- yeniden adlandırıp veriyi olduğu gibi bırakmak, kapsamı 'plants' yazan
-- her anahtarı sessizce KAPSAMSIZ hâle getirirdi: uç kimliği artık
-- listede olmadığı için kapsam kapısı onu tanımaz ve anahtar ucu
-- göremez. Sessiz yetki kaybı, gürültülü hatadan beterdir.
--
-- Bu depodaki örnek veride üç anahtarın da kapsamı NULL (tam kapsam),
-- yani burada ÖLÇÜLEBİLİR bir etkisi yok. Göç yine de yazılıyor: kapsamı
-- daraltılmış anahtarı olan bir kurulumda etkisi gerçek olur.
--
-- JSON metin değiştirme yeterli: kapsam bir dizedir dizisi
-- (`["plants","assets"]`) ve tırnaklı arama kısmi eşleşmeyi engeller.
-- ═══════════════════════════════════════════════════════════════════════

UPDATE "ApiAnahtari"
SET "kapsamJson" = replace("kapsamJson", '"plants"', '"facilities"')
WHERE "kapsamJson" LIKE '%"plants"%';
