import { ApiHata } from './hatalar';

/* Sorgu parametresi okuyucular. Bozuk parametre 400 doner ve HANGI ALAN
   oldugunu soyler; sessizce yok sayilmaz (yok saymak istemciye yanlis
   filtrelenmis veriyi dogruymus gibi gosterir). */

export function metinParam(url: URL, ad: string, azami = 200): string | null {
  const ham = url.searchParams.get(ad);
  if (ham === null) return null;
  const deger = ham.trim();
  if (deger.length === 0 || deger.length > azami) {
    throw new ApiHata('gecersiz_istek', `${ad} gecersiz`, {
      ayrinti: [{ alan: ad, mesaj: `1-${azami} karakter bekleniyor` }],
    });
  }
  return deger;
}

export function secenekParam<T extends string>(url: URL, ad: string, secenekler: readonly T[]): T | null {
  const deger = metinParam(url, ad);
  if (deger === null) return null;
  if (!(secenekler as readonly string[]).includes(deger)) {
    throw new ApiHata('gecersiz_istek', `${ad} gecersiz`, {
      ayrinti: [{ alan: ad, mesaj: `su degerlerden biri olmali: ${secenekler.join(' | ')}` }],
    });
  }
  return deger as T;
}

export function tarihParam(url: URL, ad: string): Date | null {
  const deger = metinParam(url, ad, 40);
  if (deger === null) return null;
  const zaman = Date.parse(deger);
  if (Number.isNaN(zaman)) {
    throw new ApiHata('gecersiz_istek', `${ad} gecersiz`, {
      ayrinti: [{ alan: ad, mesaj: 'ISO-8601 tarih bekleniyor' }],
    });
  }
  return new Date(zaman);
}

/** Bos parcalari eleyerek Prisma `where` birlestirir (id kosullari cakismasin). */
export function nerede(...parcalar: Record<string, unknown>[]): Record<string, unknown> {
  const dolu = parcalar.filter((p) => Object.keys(p).length > 0);
  return dolu.length === 0 ? {} : { AND: dolu };
}
