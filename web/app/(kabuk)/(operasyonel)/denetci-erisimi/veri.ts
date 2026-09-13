import 'server-only';

/* `Date.now()` bir SAF OLMAYAN çağrıdır ve React render gövdesinde
   çağrılamaz (`react-hooks/purity`). Kural bir biçim kuralı değil:
   sunucuda ve istemcide farklı "şimdi" hesaplanırsa, süresi bitmek üzere
   olan bir erişim hidrasyondan sonra durum değiştirir. Ekranların hepsi
   şimdiyi buradan okur. */
export function simdiOku(): number {
  return Date.now();
}
