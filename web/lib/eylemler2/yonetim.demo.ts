/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
export const katalogKaydet = uyar;
export const katalogArsivle = uyar;
export const tesisGorselAta = uyar;
export const ayarKaydet = uyar;
export const etkiHesapla = async (): Promise<{ ok: false; hata: string }> =>
  ({ ok: false, hata: 'Demo sürümü: etki hesabı bu ortamda çalışmaz.' });
export const degisiklikOner = uyar;
export const degisiklikOnayla = uyar;
export const degisiklikReddet = uyar;
export const degisiklikIptal = uyar;
export const degisiklikUygula = uyar;
export const modulSinifi = async (): Promise<null> => null;
