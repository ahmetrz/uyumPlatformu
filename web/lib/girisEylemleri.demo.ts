/* Statik demo: oturum yok; giriş/çıkış işlemsizdir. Gerçek imzadaki
   `next` ve `kod` burada okunmaz — demo hiçbir yere yönlendirmez ve
   ikinci faktör sormaz (sorulacak bir hesap yok). */
export const girisYap = async (): Promise<{ ok: false; hata: string }> =>
  ({ ok: false, hata: 'Demo sürümünde oturum açılmaz; ürün salt-okunur gezilir.' });
export const cikisYap = async (): Promise<void> => {};
