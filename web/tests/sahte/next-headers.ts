export async function cookies() {
  return { get: () => undefined, set: () => {}, delete: () => {} };
}

/* Test ikizi: istek başlıkları. Testler `basliklariAyarla()` ile bir istek
   bağlamı taklit eder; hiç ayarlanmazsa başlık YOKTUR (üretimdeki "arka
   plan işi / istek dışı çağrı" durumunun karşılığı). */
let baslikDeposu = new Map<string, string>();

export function basliklariAyarla(yeni: Record<string, string>): void {
  baslikDeposu = new Map(Object.entries(yeni).map(([k, v]) => [k.toLowerCase(), v]));
}

export function basliklariTemizle(): void {
  baslikDeposu = new Map();
}

export async function headers() {
  return { get: (ad: string) => baslikDeposu.get(ad.toLowerCase()) ?? null };
}
