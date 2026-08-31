/* Statik demo: yazma yok. next.config.ts'teki alias listesine
   '@/lib/eylemler2/kesif' eklendiğinde devreye girer. */
type Sonuc = { ok: true } | { ok: false; hata: string };
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.' });
export const kesifEslestir = uyar;
export const elleAktarimCalistir = uyar;
export const kesifKarariVer = uyar;
export const kesifTopluKarar = uyar;
