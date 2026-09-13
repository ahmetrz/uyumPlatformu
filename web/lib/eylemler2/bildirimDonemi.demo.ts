/* Statik demo: raporlama dönemi kapatılmaz.

   Bir dönem raporunun verildiğini demo sürümünde işaretlemek, resmî bir
   yükümlülüğün yerine getirildiğini gerçek sanılabilecek bir yerde beyan
   etmek olurdu — hem de referans numarası uydurarak. Açık ret döner. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({
  ok: false,
  hata: 'Demo sürümü: raporlama dönemi kapatılmaz —'
    + ' teslim gerçek referans numarası ve denetim izi gerektirir.',
});
export const donemVerildiIsaretle = uyar;
export const donemTeyitIsaretle = uyar;
export const donemUygulanmazIsaretle = uyar;
