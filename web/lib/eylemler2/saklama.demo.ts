/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
export const saklamaPolitikasiKaydet = uyar;
export const legalHoldKoy = uyar;
export const legalHoldKaldir = uyar;
export const imhaOnerisiAc = uyar;
export const imhaKarariniOnayla = uyar;
export const imhaKarariniReddet = uyar;
export const imhaKarariniUygula = uyar;
