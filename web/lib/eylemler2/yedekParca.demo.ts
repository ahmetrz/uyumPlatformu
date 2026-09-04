/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
export const yedekParcaKaydet = uyar;
export const yedekParcaVarlikBagla = uyar;
export const yedekParcaVarlikCoz = uyar;
export const yedekParcaSay = uyar;
