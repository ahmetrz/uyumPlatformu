/* Statik demo: önizleme gerçek veri ister. */
type Sonuc = { ok: false; hata: string };
export const surumEtkisiOnizle = async (): Promise<Sonuc> => ({
  ok: false,
  hata: 'Demo sürümü: değişiklik etki önizlemesi gerçek veri ve sürüm kütüğü gerektirir.',
});
