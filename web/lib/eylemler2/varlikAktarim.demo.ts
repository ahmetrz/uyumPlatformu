/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const MESAJ = 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.';
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: MESAJ });

export const varlikAktarimYukle = async (): Promise<
  { ok: true; veri: { id: string } } | { ok: false; hata: string }
> => ({ ok: false, hata: MESAJ });
export const varlikAktarimEsle = uyar;
export const varlikAktarimOnayla = uyar;
export const varlikAktarimReddet = uyar;
