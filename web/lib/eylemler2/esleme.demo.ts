/* Statik demo: yazma yok.

   Okuma eylemleri (sözlük, önizleme) da burada durdurulur: demo yayınında
   server action yoktur ve "çalışıyor gibi" bir önizleme üretmek, motorun
   gerçekten koştuğu izlenimini verirdi. */
type Sonuc = { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
const okunamaz = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: eşleme tezgâhı yalnız canlı kurulumda çalışır.' });

export const eslemeSozlugu = async () => ({ hedefAlanlar: [], donusumler: [] });
export const eslemeProfilYayinla = uyar;
export const eslemeProfiliBagla = uyar;
export const eslemeProfilGecmisi = okunamaz;
export const eslemeProfilKurallari = okunamaz;
export const connectorEslemeProfili = okunamaz;
export const eslemeOnizle = okunamaz;
