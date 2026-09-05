/* ═══ Kimlik katlama — üretici, model, etiket karşılaştırması ══════════

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Zafiyet korelasyonunda `'SIEMENS'` ile `'Siemens'` eşleşmiyordu.
   Sebep: karşılaştırma `toLocaleLowerCase('tr')` ile yapılıyordu ve
   Türkçe'de büyük `I`'nin küçüğü NOKTASIZ `ı`dır:

       'SIEMENS'.toLocaleLowerCase('tr') === 'sıemens'
       'Siemens'.toLocaleLowerCase('tr') === 'siemens'

   İkisi farklı dizedir. Sonuç: üreticisi büyük harfle yazılmış her cihaz
   advisory ile eşleşmez ve zafiyeti EKRANDA HİÇ GÖRÜNMEZ. Sessiz, kalıcı
   ve tam olarak kaçınmaya çalıştığımız türden bir kusur.

   Bu depo daha önce aynı tuzağın TERS yüzünü yaşadı: `gezinme:cekmece`
   kapısında `/varlık/i` düzenli ifadesi ekrandaki "VARLIK" ile
   eşleşmiyordu, çünkü JavaScript'in varsayılan katlaması `I`'yı `ı`ya
   DEĞİL `i`ye eşler. Aynı madalyonun iki yüzü: hangi katlamayı seçtiğin
   metnin NE OLDUĞUNA bağlıdır.

   ── KURAL ─────────────────────────────────────────────────────────────
   · KULLANICIYA GÖSTERİLEN TÜRKÇE METİN → `toLocaleLowerCase('tr')`.
     "İZLEME" oradaki doğru küçük hâli "izleme"dir.
   · KİMLİK (üretici, model, seri no, CPE, purl, sürüm etiketi) →
     bu dosya. Bunlar Türkçe metin değil, ürün tanımlayıcısıdır; Türkçe
     katlama onları BOZAR.

   ── I AİLESİ TEK BİR HARFE İNDİRİLİR ──────────────────────────────────
   `İ`, `I`, `ı`, `i` → hepsi `i`. Bu, `KIZILDERE` ile `KİZİLDERE`yi de
   eşitler; yani biraz FAZLA eşleştirir. Ödünleşim bilerek bu yöne
   verildi: kimlik karşılaştırmasında bir zafiyet eşleşmesini KAÇIRMAK,
   fazladan bir aday üretmekten çok daha pahalıdır — ikincisini insan
   eler, birincisi hiç görünmez. */

/** I ailesinin tamamı (noktalı/noktasız, büyük/küçük). */
const I_AILESI = /[İIıi]/g;

/**
 * Kimlik dizesini karşılaştırılabilir hâle getirir:
 * I ailesi tekleştirilir, küçük harfe inilir, ayraçlar ve boşluklar atılır.
 *
 * `null`/boş girdi `null` döner — boş dizeyi boş dizeyle eşleştirip
 * "eşleşti" demek, hiçbir bilgi taşımayan iki kaydı aynı sanmak olurdu.
 */
export function kimlikKatla(ham: string | null | undefined): string | null {
  if (typeof ham !== 'string') return null;
  const katlanmis = ham
    .replace(I_AILESI, 'i')
    .toLowerCase()
    .replace(/[\s._\-/\\]+/g, '');
  return katlanmis || null;
}

/**
 * İki kimlik aynı mı? Biri çözümlenemiyorsa `false` — eşleşmedi demektir,
 * "bilinmiyor" demek değildir; çağıran belirsizliği kendi taşır.
 */
export function ayniKimlikMi(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = kimlikKatla(a);
  const y = kimlikKatla(b);
  return x !== null && y !== null && x === y;
}
