/* API anahtarı ömür kuralları.

   Neden AYRI dosya: `lib/eylemler2/apiAnahtari.ts` bir `'use server'`
   modülüdür ve oradan yalnız ASENKRON FONKSİYON dışa aktarılabilir. Bir
   sabiti oradan export etmek `tsc`'yi geçer ama derlemede/çalışma anında
   patlar — bu tam olarak bir kez yapıldı ve altı ekranı 500'e düşürdü.
   Sabitler bu yüzden sunucu eylemi olmayan bir modülde yaşar; hem sunucu
   eylemi hem form aynı sayıyı buradan okur. */

/** Süre girilmezse kullanılan ömür. Süresiz anahtar YOKTUR: üreten kişi
    işten ayrıldıktan yıllar sonra da geçerli bir anahtar, rotasyon
    politikasını bir dilek listesine çevirir. */
export const VARSAYILAN_ANAHTAR_GUN = 365;

/** Tavan. Eskiden 3650 (on yıl) idi — pratikte süresiz. */
export const AZAMI_ANAHTAR_GUN = 730;
