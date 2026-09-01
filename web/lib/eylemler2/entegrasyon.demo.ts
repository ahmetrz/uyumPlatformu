/* Statik demo: yazma yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
/* Kapsam görünümü de OKUNAMAZ döner: demo yayınında connector kaydı yoktur
   ve boş bir kapsam listesi göstermek "bu connector her santrale yazabilir"
   diye okunurdu — sahte güvenlik bilgisi üretmiyoruz. */
const okunamaz = async (): Promise<{ ok: false; hata: string }> => ({
  ok: false, hata: 'Demo sürümü: santral kapsamı yalnız canlı kurulumda okunur.' });
export const connectorKaydet = uyar;
export const connectorKapsamGorunumu = okunamaz;
export const connectorKapsamKaydet = uyar;
export const connectorTest = uyar;
export const connectorSenkronize = uyar;
export const connectorKuruKosu = uyar;
export const connectorEtkinlik = uyar;
