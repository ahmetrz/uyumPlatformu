/* Statik demo: yazma yok — parola ve profil değişmez, oturum yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
export const parolaBelirle = uyar;
export const parolaDegistir = uyar;
export const profilGuncelle = uyar;
export const digerOturumlariKapat = uyar;
