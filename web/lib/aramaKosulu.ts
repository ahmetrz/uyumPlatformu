import type { Prisma } from './prisma-client/client';
import { DUYARSIZ_KIP_DESTEKLI as SAGLAYICI_DUYARSIZ } from './veritabani';

/* ═══════════════════════════════════════════════════════════════════════
   METİN ARAMA KOŞULU — TEK YER

   ── Kapatılan tuzak ────────────────────────────────────────────────────
   Prisma'nın `contains` koşulu SQLite'ta `LIKE`'a çevrilir ve SQLite'ın
   `LIKE`'ı ASCII harfler için BÜYÜK/KÜÇÜK HARF DUYARSIZDIR. PostgreSQL'in
   `LIKE`'ı DUYARLIDIR.

   Yani bugün "saha-ı" yazınca "Saha I" bulunuyor; PostgreSQL'e
   geçildiği gün aynı arama HİÇBİR ŞEY bulmuyor. Hata vermez, boş döner —
   komut paletinin tamamı sessizce işlevsizleşir ve sebebi aylarca "arama
   kötü" diye aranır.

   Koşul on bir ayrı yerde tekrarlanıyordu. Artık tek yerde: göç günü
   değişecek satır burasıdır, on bir yer değil.

   ── Bugün (R5, 9 Eylül 2026) ───────────────────────────────────────────
   Kip artık SAĞLAYICIDAN gelir (`lib/veritabani.ts`): PostgreSQL'de
   `mode: 'insensitive'` eklenir, SQLite'ta EKLENMEZ (Prisma o alanı
   SQLite sağlayıcısında kabul etmez, sorgu çalışma zamanında patlar).
   Arama İKİ SAĞLAYICIDA DA büyük/küçük harf duyarsızdır; "göç günü
   değişecek satır" artık yoktur, çünkü satır kendini sağlayıcıdan
   okuyor.

   ── Türkçe uyarısı ─────────────────────────────────────────────────────
   Ne SQLite'ın `LIKE`'ı ne de PostgreSQL'in `ILIKE`'ı Türkçe İ/ı
   katlamasını doğru yapar: "İSTANBUL" ile "istanbul" ASCII kurallarıyla
   eşleşmez. Bu bilinen bir sınırdır; gerçek çözüm PostgreSQL'de `citext`
   ya da `unaccent` + normalize edilmiş bir gölge kolondur ve o, veri
   modeline dokunan ayrı bir karardır. Burada uydurma bir katlama YAPMIYORUZ
   — yanlış katlama, hiç katlamamaktan daha zor teşhis edilir.
   ═══════════════════════════════════════════════════════════════════════ */

/** Sağlayıcı büyük/küçük harf duyarsız `contains` KİPİ destekliyor mu.
    SQLite: hayır (ama `LIKE`'ı zaten duyarsız). PostgreSQL: evet.
    Tek kaynak `lib/veritabani.ts` — burada yeniden karar VERİLMEZ. */
export const DUYARSIZ_KIP_DESTEKLI = SAGLAYICI_DUYARSIZ;

/**
 * Bir metin alanı için arama koşulu üretir.
 *
 * Çağıranlar `{ ad: { contains: q } }` yazmak yerine
 * `{ ad: aramaKosulu(q) }` yazar; göç günü bu fonksiyon değişir.
 */
export function aramaKosulu(terim: string, duyarsizKip = DUYARSIZ_KIP_DESTEKLI): Prisma.StringFilter {
  const q = terim.trim();
  return duyarsizKip
    ? ({ contains: q, mode: 'insensitive' } as Prisma.StringFilter)
    : { contains: q };
}

/**
 * Birden çok alanda arayan `OR` bloğu. Alan adları çağıranda yazılı kalır
 * ki hangi alanların arandığı okunabilsin.
 */
export function aramaOr<A extends string>(
  alanlar: readonly A[], terim: string, duyarsizKip = DUYARSIZ_KIP_DESTEKLI,
): { [K in A]?: Prisma.StringFilter }[] {
  return alanlar.map((alan) => ({ [alan]: aramaKosulu(terim, duyarsizKip) }) as { [K in A]?: Prisma.StringFilter });
}
