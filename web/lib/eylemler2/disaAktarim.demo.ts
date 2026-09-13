/* Statik demo: kanıt paketi üretilmez.

   Demo yayını gerçek veriye ve gerçek denetim izine bağlı değildir; sahte
   bir "kanıt paketi" üretmek, denetçiye gerçek sanılabilecek bir dosya
   vermek olurdu. Bu yüzden burada BOŞ paket de dönmez, açık ret döner. */
type PaketSonucu = { ok: false; hata: string };

export const kanitPaketiUretEylem = async (): Promise<PaketSonucu> => ({
  ok: false,
  hata: 'Demo sürümü: kanıt paketi üretilmez — paket gerçek veri ve denetim izi gerektirir.',
});
