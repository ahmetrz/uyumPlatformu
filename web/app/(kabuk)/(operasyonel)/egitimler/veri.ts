import 'server-only';

/* `Date.now()` render gövdesinde çağrılamaz (`react-hooks/purity`):
   geçerliliği bugün biten bir eğitim, sunucu ve istemci farklı "şimdi"
   hesaplarsa hidrasyondan sonra durum değiştirir. */
export function simdiOku(): number {
  return Date.now();
}
