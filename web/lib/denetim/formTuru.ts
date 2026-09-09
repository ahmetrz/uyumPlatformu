/* Form türü sabitleri — AYRI DOSYADA, ve bu bir zorunluluk.

   `'use server'` işaretli bir dosya yalnız ASYNC FONKSİYON ihraç edebilir;
   bir dizi ya da sözlük ihraç etmek çalışma zamanında 500 verir ve hata
   yalnız sunucu günlüğünde görünür ("A 'use server' file can only export
   async functions, found object"). Ölçüldü: sabitler eylem dosyasında
   duruyordu, tsc ve lint temizdi, ekran yeşil derlendi ve üretim düğmesi
   tarayıcıda 500 döndü — kusuru ancak canlı sunucuda tıklamak gösterdi.

   Bu yüzden tür sözlüğü hem eylemin hem ekranın içe aktardığı NÖTR bir
   dosyada durur. */

export const FORM_TURLERI = ['oz_denetim', 'soa'] as const;
export type FormTuru = (typeof FORM_TURLERI)[number];

export const FORM_TURU_ADI: Record<FormTuru, string> = {
  oz_denetim: 'Öz denetim formu',
  soa: 'Uygulanabilirlik beyanı (SoA)',
};
