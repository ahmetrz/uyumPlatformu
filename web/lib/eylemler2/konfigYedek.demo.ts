/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
export const yedegiDogrula = uyar;
export const sonBilinenIyiIsaretle = uyar;
export const yedekBulgusunuIsle = uyar;
/* Okuma yüzeyi de sunucu gerektirir; statik dışa aktarımda çağrılamaz.
   "Kayıt yok" DEMEZ — ölçülemediğini söyler (bilinmeyen ≠ sıfır). */
export const varlikYedekDurumu = async () => ({
  ok: false as const,
  hata: 'Demo sürümü: varlık yedek detayı sunucudan okunur, bu ortamda ölçülemez.',
});
