import 'server-only';

/* `Date.now()` render gövdesinde çağrılamaz (`react-hooks/purity`):
   planlanan tarihi az önce geçmiş bir toplantı, sunucu ve istemci
   farklı "şimdi" hesaplarsa hidrasyondan sonra durum değiştirir. */
export function simdiOku(): number {
  return Date.now();
}
