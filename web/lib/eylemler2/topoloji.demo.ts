/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
export const kayittanAnlikAl = uyar;
export const temelOlarakOnayla = uyar;
export const anligiKarsilastirEylem = uyar;
export const sapmayiIncelemeyeAl = uyar;
export const sapmaKararVer = uyar;
export const sapmadanRiskAc = uyar;
export const sapmadanBulguAc = uyar;
