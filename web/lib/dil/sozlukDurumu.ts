/* SÖZLÜK DURUMU — "sözlük yok"un İKİ hâli aynı şey değildir.

   ÖLÇÜLDÜ (Codex incelemesi · #30, P1): göç `SektorSozlugu` tablosunu
   yaratıyor ama doldurmuyordu; dolu bir veritabanında `migrate deploy`
   sonrası sözlük boş kalıyor, `sektorSozlugu()` `null` dönüyor ve bütün
   ekranlar sessizce çekirdek sözcüğe düşüyordu. Ekranda hiçbir şey
   "bozuk" görünmez — yalnız kiracının sözcüğünü taşıyan her yer çekirdek
   sözcüğe döner ("tesis"). Kusur
   bu yüzden aylarca görünmeyebilirdi.

   Kök sebep dolum eksikliğiydi ve göçle kapandı. Ama tek başına
   düzeltme eksik: aynı boşluk (silinen satır, yarım kalan sektör
   paketi, elle bozulan veri) yarın yeniden oluşabilir ve yine SESSİZ
   olur. O yüzden ayrım koda giriyor:

     · SEKTÖRSÜZ  — kaydın sektörü yok. Çekirdek sözcük DOĞRU cevaptır;
                    kusur değildir (bkz. `sozlukOku.ts` başlığı).
     · EKSİK      — sektör VAR ama sözlüğünde satır YOK. Bu bir KUSURDUR:
                    kurulu bir sektör paketi kendi dilini taşımıyor.
     · VAR        — satırlar okundu.

   "Bilinmeyen ≠ sıfır" kuralının bu katmandaki karşılığı: sözlüğün
   yokluğu ile sözlüğün BOŞLUĞU aynı sayıya indirgenemez. */

export type SozlukDurumu = 'var' | 'sektorsuz' | 'eksik';

/** SAF KARAR — veritabanı bilmez, ölçüyü alır ve hükmü döner. */
export function sozlukKarari(sektorId: string | null, satirSayisi: number): SozlukDurumu {
  if (!sektorId) return 'sektorsuz';
  return satirSayisi > 0 ? 'var' : 'eksik';
}

/** `eksik` hâlinin insan diline çevrimi — kapı ve kütük aynı cümleyi yazsın. */
export function eksikSozlukMesaji(sektorId: string): string {
  return `SÖZLÜK EKSİK: sektör ${sektorId} kurulu ama SektorSozlugu satırı yok. `
    + 'Ekranlar çekirdek sözcüğe düşer ve bu SESSİZ olur. Göç '
    + '`20260908080000_p1_sozluk_geri_dolgu` bu dolumu yapar; koşmadıysa '
    + '`npx prisma migrate deploy` ile uygulayın.';
}

/** SAF KARAR: kapsamdaki tesislerin sektör kimliklerinden HANGİ sözlük?

    Girdi, kapsamdaki her tesisin sektör kimliği (`null` = bilinmiyor).
    Çıktı `null` ise çekirdek sözcük kullanılır.

    ÜÇ HÂL, İKİSİ AYNI CEVABA GİDER AMA AYNI SEBEPLE DEĞİL:
      · bilinmeyen VAR   → null. Bilinmeyen bir sektöre ad veremeyiz.
      · birden çok sektör → null. Birinin sözcüğü öbürü için yanlış olur.
      · tam olarak bir    → o sektörün sözlüğü.

    Ayrı ve saf: kararın kendisi veritabanı olmadan sınanabilsin diye. */
export function kapsamKarari(sektorIdler: readonly (string | null | undefined)[]): string | null {
  if (sektorIdler.length === 0) return null;
  if (sektorIdler.some((x) => !x)) return null;
  const tekil = new Set(sektorIdler as string[]);
  return tekil.size === 1 ? [...tekil][0] : null;
}
