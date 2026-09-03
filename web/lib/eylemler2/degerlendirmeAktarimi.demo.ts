/* Statik demo: değerlendirme aktarımı yapılmaz.

   Sahte bir kuru koşu döndürmek, demoda "42 kontrol değişecek" diye
   gerçek sanılabilecek bir önizleme üretirdi. */
type Sonuc = { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({
  ok: false,
  hata: 'Demo sürümü: değerlendirme aktarımı gerçek veri ve denetim izi gerektirir.',
});

export const degerlendirmeKuruKosu = uyar;
export const degerlendirmeAktarimiUygula = uyar;
export const degerlendirmeAktarimiReddet = uyar;
