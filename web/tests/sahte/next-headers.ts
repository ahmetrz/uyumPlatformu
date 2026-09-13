/* Test ikizi: çerezler. Varsayılan OTURUMSUZDUR — üretimde kimliksiz bir
   isteğin karşılığı budur ve testlerin çoğu tam olarak bunu ister.

   `oturumCereziAyarla()` ile bir test gerçek bir oturum taklit edebilir:
   `lib/auth.ts` çerezdeki jetonun SHA-256 özetini `Oturum.tokenHash` ile
   eşleştirir, yani test gerçek bir oturum satırı açıp jetonunu buraya
   koyar. Sahte bir `AktifKullanici` enjekte etmiyoruz — o, üretimdeki
   yetki modelini atlayan ve bu yüzden hiçbir şey kanıtlamayan bir test
   üretirdi. */
const cerezDeposu = new Map<string, string>();

export function oturumCereziAyarla(jeton: string | null): void {
  if (jeton === null) cerezDeposu.delete('oturum');
  else cerezDeposu.set('oturum', jeton);
}

export async function cookies() {
  return {
    get: (ad: string) => {
      const deger = cerezDeposu.get(ad);
      return deger === undefined ? undefined : { name: ad, value: deger };
    },
    set: (ad: string, deger: string) => { cerezDeposu.set(ad, deger); },
    delete: (ad: string) => { cerezDeposu.delete(ad); },
  };
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
