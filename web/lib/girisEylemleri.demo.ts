/* Statik demo: oturum yok; giriş/çıkış işlemsizdir. */
export const girisYap = async (): Promise<{ ok: false; hata: string }> =>
  ({ ok: false, hata: 'Demo sürümünde oturum açılmaz; ürün salt-okunur gezilir.' });
export const cikisYap = async (): Promise<void> => {};
