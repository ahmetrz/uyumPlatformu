import { ApiHata } from './hatalar';

/* İmleç (cursor) tabanlı sayfalama.

   Sıralama HER ZAMAN `id` artan — kayıt eklendi/silindi diye sayfa kaymaz
   (offset sayfalamanın sızdırdığı/atladığı satır sorunu yok). İmleç son
   satırın id'sidir; silinmiş bir imleç sayfalamayı BOZMAZ (id > imleç). */

export const VARSAYILAN_LIMIT = 50;
export const AZAMI_LIMIT = 200;

export type SayfaSorgusu = { limit: number; imlec: string | null };

export function sayfaSorgusu(url: URL): SayfaSorgusu {
  const hamLimit = url.searchParams.get('limit');
  let limit = VARSAYILAN_LIMIT;
  if (hamLimit !== null) {
    const n = Number(hamLimit);
    if (!Number.isInteger(n) || n < 1 || n > AZAMI_LIMIT) {
      throw new ApiHata('gecersiz_istek', `limit 1–${AZAMI_LIMIT} arası tam sayı olmalı`, {
        ayrinti: [{ alan: 'limit', mesaj: `1–${AZAMI_LIMIT} arası tam sayı bekleniyor` }],
      });
    }
    limit = n;
  }
  const imlec = url.searchParams.get('cursor');
  if (imlec !== null && (imlec.length === 0 || imlec.length > 64)) {
    throw new ApiHata('gecersiz_istek', 'cursor geçersiz', {
      ayrinti: [{ alan: 'cursor', mesaj: 'önceki yanıtın nextCursor değeri olmalı' }],
    });
  }
  return { limit, imlec };
}

/** Prisma `where` parçası — imleçten sonrasını getirir. */
export const imlecKosulu = (imlec: string | null, yon: 'asc' | 'desc' = 'asc') =>
  imlec ? { id: yon === 'asc' ? { gt: imlec } : { lt: imlec } } : {};

/**
 * `limit + 1` satır çekilir; fazlalık varsa bir sonraki sayfa vardır.
 * nextCursor null => son sayfa (bir istek daha atmaya gerek yok).
 */
export function sayfaYaniti<T extends { id: string }, C>(
  satirlar: T[],
  limit: number,
  donustur: (satir: T) => C,
): { data: C[]; nextCursor: string | null } {
  const devam = satirlar.length > limit;
  const sayfa = devam ? satirlar.slice(0, limit) : satirlar;
  return {
    data: sayfa.map(donustur),
    nextCursor: devam && sayfa.length > 0 ? sayfa[sayfa.length - 1].id : null,
  };
}
