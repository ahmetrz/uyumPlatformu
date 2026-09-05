/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
export const degisiklikKaydet = uyar;
export const degisiklikIlerlet = uyar;
export const degisiklikGeriAl = uyar;
export const olayKaydet = uyar;
export const yedeklemePolitikasiKaydet = uyar;
export const yedeklemeKosusuKaydet = uyar;
export const restoreTestiKaydet = uyar;
export const tedarikciKaydet = uyar;
export const sertifikaKaydet = uyar;
