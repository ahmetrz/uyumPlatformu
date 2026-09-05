/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });

export const kokNedenKaydet = uyar;
export const tekrarBagiKur = uyar;
export const tekrarAdayiSor = uyar;
