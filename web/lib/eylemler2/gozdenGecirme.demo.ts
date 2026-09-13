/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
export const gozdenGecirmeKaydet = uyar;
export const gozdenGecirmeKarariEkle = uyar;
export const gozdenGecirmeKarariDurum = uyar;
export const gozdenGecirmeTamamla = uyar;
