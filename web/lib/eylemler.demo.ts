/* Statik demo (GitHub Pages) yayınında lib/eylemler.ts'in yerine geçer.
   Yazma yok; her çağrı kullanıcıya demo uyarısı döndürür. */

type Sonuc = { ok: true } | { ok: false; hata: string };
const DEMO_MESAJI = 'Demo sürümü: değişiklikler bu ortamda kaydedilmez.';
const uyar = async (): Promise<Sonuc> => ({ ok: false, hata: DEMO_MESAJI });

export const sektorKaydet = uyar;
export const tesisTipiKaydet = uyar;
export const tesisKaydet = uyar;
export const tesisKapat = uyar;
export const tesisAc = uyar;
export const regulasyonKaydet = uyar;
export const alanKaydet = uyar;
export const maddeAlanAta = uyar;
export const surecKaydet = uyar;
export const surecDurumDegistir = uyar;
export const surecKapsamEkle = uyar;
export const surecKapsamCikar = uyar;
export const maddeDurumGuncelle = uyar;
export const bulguOlustur = uyar;
export const bulguGuncelle = uyar;
export const aksiyonEkle = uyar;
export const aksiyonDurumDegistir = uyar;
export const kanitEkle = uyar;
export const eslestirmeEkle = uyar;
export const eslestirmeSil = uyar;
export const projeKaydet = uyar;
export const projeBaglantiEkle = uyar;
export const projeBaglantiSil = uyar;
export const kullaniciKaydet = uyar;
export const yetkiVer = uyar;
export const yetkiSil = uyar;
export const aktarimYukle = uyar;
export const aktarimOnayla = uyar;
export const aktarimReddet = uyar;
export const maddeKaydet = uyar;
export const maddeSil = uyar;
export const regulasyonAktifDegistir = uyar;
export const kullaniciAktifDegistir = uyar;
export const tanimSil = uyar;
