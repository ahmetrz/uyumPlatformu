/* Statik demo: denetim formu üretilmez.

   Demo yayını gerçek kapsam kararına, gerçek olgunluk ölçümüne ve gerçek
   denetim izine bağlı değildir. Sahte bir "öz denetim formu" ya da "SoA"
   üretmek, denetçiye gerçek sanılabilecek bir beyan vermek olurdu — hem de
   ürünün en hassas iddiasında: hangi kontrolün neden kapsam dışı olduğu.
   Bu yüzden burada BOŞ form da dönmez, açık ret döner. */
type FormSonucu = { ok: false; hata: string };

export const denetimFormuUretEylem = async (): Promise<FormSonucu> => ({
  ok: false,
  hata: 'Demo sürümü: denetim formu üretilmez —'
    + ' form gerçek kapsam kararı ve denetim izi gerektirir.',
});
