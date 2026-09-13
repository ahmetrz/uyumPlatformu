/* Statik demo: yazma yok.

   `yamaDurumuTuret` ve `SBOM_PARTI_BOYU` sunucu istemez; ikisi de saf
   kaynaktan YENİDEN DIŞA AKTARILIR, kopyalanmaz — kopya, iki ortamın
   sessizce ayrışması demekti. */
export { yamaDurumuTuret } from '../varlik/yamaKarari';
export { SBOM_PARTI_BOYU } from '../varlik/sbom';

type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });

export const alanUygulanamazIsaretle = uyar;
export const alanUygulanabilirligiKaldir = uyar;
export const agSegmentiKaydet = uyar;
export const varligaSegmentAta = uyar;
export const yamaKaydiKaydet = uyar;
export const firmwareTemeliKaydet = uyar;
export const firmwareIstisnasiKaydet = uyar;
export const korelasyonElleKarar = uyar;
export const sbomYukle = async (): Promise<Sonuc> =>
  ({ ok: false, hata: 'Demo sürümü: SBOM yüklemesi bu ortamda çalışmaz.' });
export const advisoryIceAktar = async (): Promise<Sonuc> =>
  ({ ok: false, hata: 'Demo sürümü: duyuru içe aktarımı bu ortamda çalışmaz.' });
export const kapsamKaydet = uyar;
export const veriKalitesiBulgusuKapat = uyar;
