import 'server-only';

/* `Date.now()` render gövdesinde çağrılamaz (`react-hooks/purity`):
   son tarihi az önce geçmiş bir zimmet, sunucu ve istemci farklı
   "şimdi" hesaplarsa hidrasyondan sonra durum değiştirir. */
export function simdiOku(): number {
  return Date.now();
}
