/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
export const denetciDavetEt = uyar;
export const denetciErisimiIptal = uyar;
export const denetciSureleriniIsle = uyar;
