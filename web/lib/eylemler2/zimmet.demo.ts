/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
export const zimmetAc = uyar;
export const zimmetCevapla = uyar;
export const zimmetIptal = uyar;
export const topluZimmetAc = uyar;
export const zimmetSureSinirlari = async () => ({ varsayilan: 14, azami: 90 });
