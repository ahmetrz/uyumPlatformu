/* ═══════════════════════════════════════════════════════════════════════
   UY-13 · Kanıt dosyası KURALLARI — saf, istemciye de iner

   Boyut sınırı, izin listesi ve dosya adı temizliği hem sunucuda hem
   ekranda gerekir: kullanıcı 25 MiB'lik bir dosyayı yükleyip sunucudan
   ret almak yerine SEÇERKEN uyarılmalı. Bu yüzden kural `server-only`
   depo katmanından ayrı, saf bir modülde durur.

   Sunucu yine de kendi denetimini yapar — ekran bir KOLAYLIK katmanıdır,
   bir kapı değil. */

/** Bir kanıt dosyasının en büyük boyutu (25 MiB). */
export const DOSYA_SINIRI = 25 * 1024 * 1024;

/**
 * Kabul edilen içerik tipleri — İZİN LİSTESİ, yasak listesi değil.
 *
 * Yasak listesi tutmak, listede olmayan her yeni tehlikeli tipi sessizce
 * kabul etmek demektir.
 *
 * Liste bilinçli olarak DAR: denetim kanıtı bir belge, bir tablo, bir
 * görüntü ya da düz metindir. Arşiv (zip) kabul edilmez — içine
 * bakılmayan bir arşiv, ne saklandığı bilinmeyen bir kutudur ve
 * denetçiye "kanıt" diye verilemez.
 */
export const IZINLI_TIPLER: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

/** Dosya adından uzantı — depoya YAZILMAZ, yalnız indirme adında kullanılır. */
export function guvenliDosyaAdi(ad: string, mimeTipi: string): string {
  const uzanti = IZINLI_TIPLER[mimeTipi] ?? 'bin';
  /* Kullanıcının verdiği ad yalnız GÖRÜNTÜLEME içindir; yol ayıracı,
     kontrol karakteri ve nokta-nokta temizlenir. */
  const taban = ad
    .replace(/[/\\]/g, '_')
    /* Kontrol karakterleri temizlenir: bir dosya adına gömülü CR/LF,
       indirme başlığında (Content-Disposition) başlık enjeksiyonuna
       açık kapı bırakır. */
    .replace(/\p{Cc}/gu, '')
    .replace(/\.\.+/g, '.')
    .trim()
    .slice(0, 120);
  const govde = taban.replace(/\.[^.]*$/, '') || 'kanit';
  return `${govde}.${uzanti}`;
}
