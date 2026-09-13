-- P1 · §0.5 · Çekirdek anahtarda sektör sözcüğü olmaz.
--
-- Saha yerleşimindeki modül kimliği `santralSeridi` bir SEKTÖR sözcüğü
-- taşıyordu. Kimlik ekrana çıkmaz (ad sözlükten yazılır) ama çekirdek
-- koddaki her sektör sözcüğü kaldırılıyor — kimlik de dâhil.
--
-- KAYITLI YERLEŞİMLER TAŞINIR: `saha.yerlesim` ayarı GİZLİ modül
-- kimliklerini ve KPI sırasını JSON olarak tutar. Taşınmasaydı, eski
-- kimliği taşıyan bir kayıt şema doğrulamasından geçemez ("bilinmeyen
-- kimlik") ve kullanıcının kaydettiği yerleşim sessizce varsayılana
-- düşerdi.
--
-- Yalnız TAM anahtar eşleşmesi değişir (tırnaklı biçim), serbest metin
-- değil. Denetim izine (`AktiviteKaydi`) DOKUNULMAZ: eski kimliği anan
-- iz satırları yazıldıkları günü anlatır.
UPDATE "Yapilandirma"
   SET "degerJson" = REPLACE("degerJson", '"santralSeridi"', '"tesisSeridi"')
 WHERE "anahtar" = 'saha.yerlesim' AND "degerJson" LIKE '%"santralSeridi"%';
