import 'server-only';

/* `Date.now()` React render gövdesinde çağrılamaz (`react-hooks/purity`);
   ayrıca sunucu ile istemcinin farklı "şimdi" görmesi, bildirim süresi
   sayacını iki tarafta farklı gösterir. */
export function simdiOku(): number {
  return Date.now();
}
