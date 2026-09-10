/* Statik demo: mevzuat adayı karara bağlanmaz, tarama açılmaz.

   İki ayrı sebep, ikisi de aynı yere çıkar:

   1. Bir mevzuat değişikliğinin "incelendi" ya da "ilgisiz" olduğunu
      demo sürümünde işaretlemek, gerçek sanılabilecek bir yerde bir
      UYUM KARARI beyan etmek olurdu — üstelik denetim izi olmadan.
   2. "Taramayı aç" demo sürümünde çalışsaydı, statik bir sayfadan bir
      kamu kaynağına istek gönderilmesini isteyen bir düğme olurdu.

   Açık ret döner; sessiz düşüş yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };

const kararYok = async (): Promise<Sonuc> => ({
  ok: false,
  hata: 'Demo sürümü: mevzuat adayı karara bağlanmaz —'
    + ' uyum kararı denetim izi ve gerçek bir yetkili gerektirir.',
});

export const adayIncelendi = kararYok;
export const adayIlgisiz = kararYok;

export const taramayiAyarla = async (): Promise<Sonuc> => ({
  ok: false,
  hata: 'Demo sürümü: tarama açılmaz — kaynağa istek göndermek gerçek'
    + ' bir kurulumun kararıdır.',
});
