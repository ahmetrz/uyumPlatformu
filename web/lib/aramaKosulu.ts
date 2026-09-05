import type { Prisma } from './prisma-client/client';

/* ═══════════════════════════════════════════════════════════════════════
   METİN ARAMA KOŞULU — TEK YER

   ── Kapatılan tuzak ────────────────────────────────────────────────────
   Prisma'nın `contains` koşulu SQLite'ta `LIKE`'a çevrilir ve SQLite'ın
   `LIKE`'ı ASCII harfler için BÜYÜK/KÜÇÜK HARF DUYARSIZDIR. PostgreSQL'in
   `LIKE`'ı DUYARLIDIR.

   Yani bugün "kizildere" yazınca "Kızıldere I JES" bulunuyor; PostgreSQL'e
   geçildiği gün aynı arama HİÇBİR ŞEY bulmuyor. Hata vermez, boş döner —
   komut paletinin tamamı sessizce işlevsizleşir ve sebebi aylarca "arama
   kötü" diye aranır.

   Koşul on bir ayrı yerde tekrarlanıyordu. Artık tek yerde: göç günü
   değişecek satır burasıdır, on bir yer değil.

   ── PostgreSQL'e geçince ne değişecek ──────────────────────────────────
   Tek satır: `mode: 'insensitive'` eklenecek. Bugün EKLENEMEZ — Prisma o
   alanı SQLite sağlayıcısında kabul etmez ve sorgu çalışma zamanında
   patlar. Bu yüzden burada bir bayrak var, ölü kod değil bir kaldıraç.

   ── Türkçe uyarısı ─────────────────────────────────────────────────────
   Ne SQLite'ın `LIKE`'ı ne de PostgreSQL'in `ILIKE`'ı Türkçe İ/ı
   katlamasını doğru yapar: "İSTANBUL" ile "istanbul" ASCII kurallarıyla
   eşleşmez. Bu bilinen bir sınırdır; gerçek çözüm PostgreSQL'de `citext`
   ya da `unaccent` + normalize edilmiş bir gölge kolondur ve o, veri
   modeline dokunan ayrı bir karardır. Burada uydurma bir katlama YAPMIYORUZ
   — yanlış katlama, hiç katlamamaktan daha zor teşhis edilir.
   ═══════════════════════════════════════════════════════════════════════ */

/** Sağlayıcı büyük/küçük harf duyarsız `contains` destekliyor mu.
    SQLite: hayır (ama `LIKE`'ı zaten duyarsız). PostgreSQL: evet. */
export const DUYARSIZ_KIP_DESTEKLI = false;

/**
 * Bir metin alanı için arama koşulu üretir.
 *
 * Çağıranlar `{ ad: { contains: q } }` yazmak yerine
 * `{ ad: aramaKosulu(q) }` yazar; göç günü bu fonksiyon değişir.
 */
export function aramaKosulu(terim: string): Prisma.StringFilter {
  const q = terim.trim();
  return DUYARSIZ_KIP_DESTEKLI
    ? ({ contains: q, mode: 'insensitive' } as Prisma.StringFilter)
    : { contains: q };
}

/**
 * Birden çok alanda arayan `OR` bloğu. Alan adları çağıranda yazılı kalır
 * ki hangi alanların arandığı okunabilsin.
 */
export function aramaOr<A extends string>(
  alanlar: readonly A[], terim: string,
): { [K in A]?: Prisma.StringFilter }[] {
  return alanlar.map((alan) => ({ [alan]: aramaKosulu(terim) }) as { [K in A]?: Prisma.StringFilter });
}
