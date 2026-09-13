import 'server-only';

/* `Date.now()` render gövdesinde çağrılamaz (`react-hooks/purity`).
   Sunucu ile istemci farklı "şimdi" hesaplarsa, taraması bayatlamak
   üzere olan bir medya hidrasyondan sonra durum değiştirir. */
export function simdiOku(): number {
  return Date.now();
}
