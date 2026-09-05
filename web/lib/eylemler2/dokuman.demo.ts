/* Statik demo: yazma yok. Belge kütüğü okunur, kaydedilmez. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const kilit = async (): Promise<Sonuc> =>
  ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });

export const dokumanKaydet = kilit;
export const dokumanDurumDegistir = kilit;
export const dokumanGozdenGecirildi = kilit;
