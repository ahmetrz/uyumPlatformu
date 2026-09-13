-- Değişmez denetim izi (§32, §56): audit kayıtları veritabanı seviyesinde
-- güncellenemez ve silinemez. Uygulama katmanı ne yaparsa yapsın bu
-- tetikleyiciler işlemi reddeder.

CREATE TRIGGER aktivite_guncelleme_yasak
BEFORE UPDATE ON "AktiviteKaydi"
BEGIN
  SELECT RAISE(ABORT, 'Denetim izi kayitlari degistirilemez');
END;

CREATE TRIGGER aktivite_silme_yasak
BEFORE DELETE ON "AktiviteKaydi"
BEGIN
  SELECT RAISE(ABORT, 'Denetim izi kayitlari silinemez');
END;

CREATE TRIGGER degerlendirme_tarihcesi_guncelleme_yasak
BEFORE UPDATE ON "DegerlendirmeTarihcesi"
BEGIN
  SELECT RAISE(ABORT, 'Degerlendirme tarihcesi degistirilemez');
END;

CREATE TRIGGER degerlendirme_tarihcesi_silme_yasak
BEFORE DELETE ON "DegerlendirmeTarihcesi"
BEGIN
  SELECT RAISE(ABORT, 'Degerlendirme tarihcesi silinemez');
END;
