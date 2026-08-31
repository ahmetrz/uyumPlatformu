/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
export const connectorKaydet = uyar;
export const connectorTest = uyar;
export const connectorSenkronize = uyar;
export const connectorKuruKosu = uyar;
export const connectorEtkinlik = uyar;
