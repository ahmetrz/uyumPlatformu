/* Statik demo: MFA kaydı açılmaz.

   Demo kullanıcısı sanaldır ve salt okurdur; ona ikinci faktör kurmak,
   gerçek bir hesabı koruduğu izlenimi verirdi. Şifreleme anahtarı da
   demo yayınında yoktur — sessizce düz metne düşmek yerine açık ret. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const RET = 'Demo sürümü: çok adımlı doğrulama kaydı açılmaz.';
export const mfaKur = async (): Promise<{ ok: false; hata: string }> => ({ ok: false, hata: RET });
export const mfaDogrula = async (): Promise<{ ok: false; hata: string }> => ({ ok: false, hata: RET });
export const mfaKaldir = async (): Promise<Sonuc> => ({ ok: false, hata: RET });
export const mfaGirisDogrula = async (): Promise<{ ok: false; hata: string }> => ({ ok: false, hata: RET });
