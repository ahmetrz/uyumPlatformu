import 'server-only';

/* `Date.now()` render gövdesinde çağrılamaz (`react-hooks/purity`).
   Kural biçimsel değil: sunucu ile istemci farklı "şimdi" hesaplarsa,
   bitişine saatler kalmış bir anahtar hidrasyondan sonra durum
   değiştirir ve ekran kendi kendisiyle çelişir. */
export function simdiOku(): number {
  return Date.now();
}
