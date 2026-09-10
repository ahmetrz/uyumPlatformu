/* Statik demo: kimlik sağlayıcı yapılandırılmaz.

   Demo yayını bir veritabanı taşımaz ve bir sır sağlayıcısına bağlı
   değildir; kurum hesabıyla girişi burada yapılandırmak, kurulmamış bir
   yolu kurulmuş göstermek olurdu. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({
  ok: false,
  hata: 'Demo sürümü: kimlik sağlayıcı yapılandırılmaz —'
    + ' yapılandırma bir sır referansı ve denetim izi gerektirir.',
});
export const kimlikSaglayiciKaydet = uyar;
export const kimlikSaglayiciBagla = uyar;
export const kimlikSaglayiciAktiflik = uyar;
export const oturumPolitikasiKaydet = uyar;
