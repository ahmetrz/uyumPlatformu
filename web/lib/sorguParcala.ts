/* Sorgu parçalama yardımcıları: "ebeveyn başına son kayıt" ve toplu
   okuma/yazmaların SQLite parametre sınırına göre bölünmesi.

   NEDEN VAR: bu ihtiyaç doğal olarak ilişki seviyesinde `take: 1` ile
   yazılır (`kesifler: { orderBy: …, take: 1 }`). Prisma bu kalıbı ebeveyn
   başına BİR bağlı parametre taşıyan TEK bir sorguya çevirir ve — LIMIT
   tüm ebeveyn kümesine birden uygulandığı için — parçalayamaz. SQLite tek
   ifadede en fazla 999 parametre kabul eder (SQLITE_MAX_VARIABLE_NUMBER):
   ebeveyn sayısı 997'yi geçtiği anda sorgu
   `The query parameter limit supported by your database is exceeded`
   ile düşer. Ekran yavaşlamaz, 500 döner.

   Bu yüzden ilişki `take`'i yerine çocuk tablo AYRI ve ebeveynle AYNI
   kapsam koşuluyla (ilişki filtresi) okunur, sıralama veritabanında
   yapılır ve ebeveyn başına ilk satır burada seçilir. Kimlik listesi
   (`id IN (…)`) kullanılmaz: hem aynı sınıra takılır hem de yalnız
   parametre bağlamak için ölçülebilir zaman harcar.

   PostgreSQL'de sınır 65535'tir — eşik yüksektir ama kalıp yine kırılgandır. */

/** Sıralı satır listesinden her anahtar için İLK satırı seçer.
    Çağıran satırları istediği sıraya göre (ör. `zaman desc`) okur;
    burada yalnız ilk görülen tutulur — "ebeveyn başına take: 1"in eşdeğeri. */
export function ilkiniEsle<S, K>(satirlar: readonly S[], anahtar: (s: S) => K | null): Map<K, S> {
  const harita = new Map<K, S>();
  for (const s of satirlar) {
    const k = anahtar(s);
    if (k === null || harita.has(k)) continue;
    harita.set(k, s);
  }
  return harita;
}

/** SQLite tek ifadede en fazla bu kadar parametre bağlar
    (SQLITE_MAX_VARIABLE_NUMBER). PostgreSQL'de sınır 65535'tir; parçalama
    orada da zararsızdır, bu yüzden koşula bağlanmaz. */
export const PARAMETRE_SINIRI = 999;

/**
 * Toplu bir okuma/yazmayı parametre sınırına sığan parçalara böler.
 *
 * NEDEN AÇIK PARAMETRE SAYISI: `createMany` satır başına o satırın KOLON
 * SAYISI kadar parametre bağlar, `id IN (…)` ise öğe başına bir tane.
 * Aynı "1.000 öğe" iki durumda çok farklı ifade büyüklüğü demektir; sınır
 * bu yüzden öğe değil PARAMETRE cinsinden hesaplanır. Yanlış tahmin
 * sessizce yavaşlatmaz — `The query parameter limit supported by your
 * database is exceeded` ile aktarımı düşürür.
 *
 * @param ogeBasinaParametre bir öğenin ifadeye kattığı bağlı parametre sayısı
 */
export function parcala<T>(ogeler: readonly T[], ogeBasinaParametre: number): T[][] {
  if (ogeler.length === 0) return [];
  if (!Number.isInteger(ogeBasinaParametre) || ogeBasinaParametre < 1) {
    throw new Error(`parcala: ogeBasinaParametre en az 1 olmalı (${ogeBasinaParametre})`);
  }
  const boy = Math.max(1, Math.floor(PARAMETRE_SINIRI / ogeBasinaParametre));
  const parcalar: T[][] = [];
  for (let i = 0; i < ogeler.length; i += boy) parcalar.push(ogeler.slice(i, i + boy));
  return parcalar;
}
