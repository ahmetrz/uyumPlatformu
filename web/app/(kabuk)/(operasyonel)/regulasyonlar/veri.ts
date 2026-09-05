import 'server-only';
import { takipDurumu } from '@/lib/uyum/mevzuatKaynagi';
import type { Kaynak } from './mantik';

/* UY-41 · Resmî kaynak takibinin SUNUCU tarafı.

   "Şimdi" burada okunur, `page.tsx` içinde değil: render gövdesinde saf
   olmayan bir çağrı yapmak (React kuralı) hem lint kapısına takılır hem
   de sunucu ile istemciye farklı zamanlar gösterebilir. Ürünün geri
   kalanı da aynı kalıbı kullanıyor: `Date.now()` rota veri modülünde
   okunur, sayfa bileşeninde değil.

   Bu dosya hiçbir adrese BAĞLANMAZ: yalnız "en son ne zaman bakıldı"
   sorusunu bugünkü tarihe göre yorumlar. */

export type KaynakKaydi = {
  id: string;
  ad: string;
  adres: string | null;
  izlemeTuru: string;
  kontrolAraligiGun: number;
  sonKontrol: Date | null;
  sonNot: string | null;
  sonKontrolEden: { adSoyad: string } | null;
};

export function kaynaklariCoz(kayitlar: readonly KaynakKaydi[]): Kaynak[] {
  const simdi = Date.now();
  return kayitlar.map((kk) => ({
    id: kk.id,
    ad: kk.ad,
    adres: kk.adres,
    izlemeTuru: kk.izlemeTuru,
    araliksGun: kk.kontrolAraligiGun,
    sonKontrol: kk.sonKontrol?.toISOString() ?? null,
    sonKontrolEden: kk.sonKontrolEden?.adSoyad ?? null,
    sonNot: kk.sonNot,
    takip: takipDurumu({
      adres: kk.adres,
      /* `null` = HİÇ BAKILMADI. Sıfıra çevrilmez: ölçülmemiş bir
         tazelik "0 gün önce bakıldı" değildir. */
      sonKontrol: kk.sonKontrol?.getTime() ?? null,
      araliksGun: kk.kontrolAraligiGun,
      simdi,
    }),
  }));
}
