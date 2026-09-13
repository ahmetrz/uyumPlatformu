/* Giriş · sunucu ile istemcinin PAYLAŞTIĞI saf kurallar (E40).

   `?next=` DÖNÜŞ HEDEFİ — AÇIK YÖNLENDİRME KAPISI
   ──────────────────────────────────────────────
   Giriş başarınca `next` hedefine dönülür. Bu parametreyi üreten bir
   yönlendirme bugün yok (bkz. giris/page.tsx); kapı yine de sıkıdır çünkü
   URL'yi kimin yazdığı denetlenemez. Bu parametre
   İSTEMCİDEN gelir ve olduğu gibi `redirect()`e verilirse bir "açık
   yönlendirme" olur: `?next=https://sahte.site` ya da `?next=//sahte.site`
   ile kurum giriş ekranı, kimlik avı sayfasına köprü hâline gelir.

   Kural: yalnız SİTE İÇİ GÖRELİ yol kabul edilir —
     · '/' ile başlar,
     · '//' ile BAŞLAMAZ (tarayıcı bunu protokol-göreli dış adres okur),
     · '/\' ile başlamaz (bazı tarayıcılar ters bölüyü bölü sayar),
     · satır sonu/denetim karakteri taşımaz (başlık enjeksiyonu),
     · '/giris' değildir (döngü: giriş ekranı kendine dönmesin).
   Uymayan her şey sessizce '/'a düşer; hata mesajı üretilmez, çünkü bu
   parametre kullanıcının yazdığı bir alan değil, taşınan bir bağlamdır. */

/** Giriş sonrası varsayılan hedef. */
export const VARSAYILAN_HEDEF = '/';

export function guvenliHedef(next: string | string[] | null | undefined): string {
  const aday = Array.isArray(next) ? next[0] : next;
  if (typeof aday !== 'string' || aday.length === 0 || aday.length > 2000) return VARSAYILAN_HEDEF;
  if (!aday.startsWith('/')) return VARSAYILAN_HEDEF;
  if (aday.startsWith('//') || aday.startsWith('/\\')) return VARSAYILAN_HEDEF;
  if (/[\u0000-\u001f\u007f]/.test(aday)) return VARSAYILAN_HEDEF;
  const yol = aday.split(/[?#]/)[0];
  if (yol === '/giris' || yol.startsWith('/giris/')) return VARSAYILAN_HEDEF;
  return aday;
}
