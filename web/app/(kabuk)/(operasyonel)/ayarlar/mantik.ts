/* Ayarlar · sunucu ile istemcinin PAYLAŞTIĞI saf kurallar.

   Parola politikası TEK yerde durur: `lib/eylemler2/hesap.ts` (sunucu
   kapısı) ve formlar (anında geri bildirim) aynı sayıyı buradan okur.
   Sunucu eylemi modülü 'use server' olduğu için sabit dışa açamaz; kural
   bu yüzden burada yaşar. */

/** Parola alt sınırı (karakter). Ortak bir parola politikası modülü YOK
    (arandı: lib/istemciAdresi.ts adres politikasıdır, parola değil). */
export const PAROLA_EN_AZ = 12;

/** Formun anında gösterdiği kusur; sunucu aynı kuralı zod ile uygular.
    null = kusur yok. */
export function parolaKusuru(parola: string): string | null {
  if (parola.length === 0) return null;
  if (parola.length < PAROLA_EN_AZ) return `En az ${PAROLA_EN_AZ} karakter · şu an ${parola.length}`;
  return null;
}

/** Oturum süresi metni: "3 sa 12 dk" — ayarlar ekranı okur. */
export function sureMetni(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return 'ölçülmedi';
  const dk = Math.floor(ms / 60_000);
  if (dk < 1) return 'az önce';
  if (dk < 60) return `${dk} dk`;
  const sa = Math.floor(dk / 60);
  return `${sa} sa ${dk % 60} dk`;
}

/* ── Oturum özeti ───────────────────────────────────────────────────── */

/** Bu tarayıcı dışındaki açık oturum sayısı. `aktifSayi` bu tarayıcıyı
    da içerir; 0 ya da negatif hiç çıkmaz ama gelirse "bilinmiyor"
    sayılır, eksi oturum uydurulmaz. */
export function digerOturumSayisi(aktifSayi: number): number | null {
  if (!Number.isFinite(aktifSayi) || aktifSayi < 1) return null;
  return aktifSayi - 1;
}

/** "Diğer oturumları kapat" düğmesinin altına düşen cümle. */
export function oturumCumlesi(aktifSayi: number): string {
  const diger = digerOturumSayisi(aktifSayi);
  if (diger === null) return 'Açık oturum sayısı okunamadı.';
  if (diger === 0) return 'Bu tarayıcı dışında açık oturum yok.';
  return `Bu tarayıcı dışında ${diger} açık oturum var; kapatılınca o cihazlar yeniden giriş ister.`;
}

/** Mutlak bitişe kalan süre: geçmişse "doldu" — oturum zaten düşmüştür,
    "0 dk" yazmak yaşıyormuş gibi gösterirdi. */
export function kalanSureMetni(bitisIso: string, simdi: number): string {
  const bitis = new Date(bitisIso).getTime();
  if (!Number.isFinite(bitis)) return 'ölçülmedi';
  if (bitis <= simdi) return 'doldu';
  return sureMetni(bitis - simdi);
}
