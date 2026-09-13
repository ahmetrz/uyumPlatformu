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

/* ── PAKET ŞABLONU SEÇİMİ ──────────────────────────────────────────────
   Çekirdeğin iki formu (öz denetim · SoA) ÜRÜNÜN KENDİ tablolarıdır ve
   kodlarıyla sabittir. Düzenleyicinin formu ise kurulumdan kuruluma
   değişir: kod derleme anında bilinemez, çalışma anında kataloğa bakılır.
   Bu yüzden seçim tek bir dizedir ve şablon seçimi `sablon:` önekiyle
   taşınır — iki ayrı parametre (tur + sablonKod) taşımak, "tur=soa ama
   sablonKod dolu" gibi anlamsız bir birleşimi mümkün kılardı. */
export const SABLON_ONEKI = 'sablon:';
export type FormSecimi = FormTuru | string;

/** Seçim bir paket şablonuysa şablonun KODU, değilse `null`. */
export function sablonKodu(secim: string): string | null {
  if (!secim.startsWith(SABLON_ONEKI)) return null;
  const kod = secim.slice(SABLON_ONEKI.length).trim();
  return kod === '' ? null : kod;
}

/** Seçim çekirdeğin form türlerinden biri mi. */
export function cekirdekTuru(secim: string): secim is FormTuru {
  return (FORM_TURLERI as readonly string[]).includes(secim);
}

