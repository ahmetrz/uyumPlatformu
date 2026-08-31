/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
export const yedegiDogrula = uyar;
export const sonBilinenIyiIsaretle = uyar;
export const yedekBulgusunuIsle = uyar;
