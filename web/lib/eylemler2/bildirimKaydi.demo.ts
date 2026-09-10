/* Statik demo: mevzuat bildirimi işaretlenmez.

   Bir bildirimin gönderildiğini demo sürümünde işaretlemek, resmî bir
   yükümlülüğün yerine getirildiğini gerçek sanılabilecek bir yerde beyan
   etmek olurdu — hem de referans numarası uydurarak. Açık ret döner. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({
  ok: false,
  hata: 'Demo sürümü: mevzuat bildirimi işaretlenmez —'
    + ' gönderim gerçek referans numarası ve denetim izi gerektirir.',
});
export const bildirimGonderildiIsaretle = uyar;
export const bildirimTeyitIsaretle = uyar;
export const bildirimUygulanmazIsaretle = uyar;
export const bildirimTaslakDuzenle = uyar;
