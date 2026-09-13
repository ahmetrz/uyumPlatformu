/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });

export const isSureciKaydet = uyar;
export const prosesAdimiKaydet = uyar;
export const adimVarligiAta = uyar;
export const adimVarligiKaldir = uyar;
export const etkiDegerlendirmesiKaydet = uyar;
export const ekipKaydet = uyar;
export const ekipUyeligiKaydet = uyar;
export const ekipUyeligiKaldir = uyar;
export const varligaEkipAta = uyar;
export const topluSahipDevri = uyar;
export const kesifYetkiKarari = uyar;
export const konfigTemeliOnayla = uyar;
export const konfigSapmasiKarari = uyar;
export const hesapTipiKaydet = uyar;
export const ouiKutuguYukle = async (): Promise<Sonuc> =>
  ({ ok: false, hata: 'Demo sürümü: OUI kütüğü yüklemesi bu ortamda çalışmaz.' });
export const pasifGozlemYukle = async (): Promise<Sonuc> =>
  ({ ok: false, hata: 'Demo sürümü: pasif gözlem yüklemesi bu ortamda çalışmaz.' });
