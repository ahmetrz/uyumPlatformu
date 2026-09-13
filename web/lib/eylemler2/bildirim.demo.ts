/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
export const bildirimOkundu = async (): Promise<Sonuc> =>
  ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
