/* Statik demo: kişisel veri koruma kayıtları yazılmaz.

   İşleme envanteri, veri sahibi başvurusu yanıtı ve yurt dışına aktarım
   bildirimi — üçü de kurumun BEYANIDIR. Demo sürümünde beyanda bulunmak,
   gerçek sanılabilecek bir yerde kurumun adına konuşmak olurdu; üstelik
   denetim izi olmadan. Açık ret döner; sessiz düşüş yok. */
type Sonuc = { ok: true } | { ok: false; hata: string };

const beyanYok = async (): Promise<Sonuc> => ({
  ok: false,
  hata: 'Demo sürümü: kişisel veri kaydı yazılmaz —'
    + ' beyan gerçek bir yetkili ve denetim izi gerektirir.',
});

export const veriFaaliyetiKaydet = beyanYok;
export const basvuruyuYanitla = beyanYok;
export const basvuruyuReddet = beyanYok;
export const aktarimBildirimiIsaretle = beyanYok;
