import type { ZodError } from 'zod';

/* Yapısal API hatası.

   Sözleşme — üç kural:
   1. Gövde HER ZAMAN { error: { code, message, details? } } biçimindedir.
   2. `code` SABİT bir sözlükten gelir; istemci koda göre dallanır, metne değil.
   3. Yığın izi (stack), SQL, dosya yolu, iç mesaj gövdeye ASLA girmez.
      İç ayrıntı yalnız sunucu günlüğüne ve ApiIstegi denetim satırına yazılır. */

export const HATA_DURUMU = {
  /** gövde/parametre doğrulaması başarısız */
  gecersiz_istek: 400,
  /** kimlik yok, geçersiz, süresi dolmuş ya da iptal edilmiş */
  yetkisiz: 401,
  /** kimlik geçerli ama modül/işlem izni yok ya da santral kapsamı dışı */
  kapsam_disi: 403,
  bulunamadi: 404,
  /** idempotency çakışması ya da eşzamanlı yazma */
  cakisma: 409,
  oran_asildi: 429,
  ic_hata: 500,
} as const;

export type HataKodu = keyof typeof HATA_DURUMU;

export type HataGovdesi = {
  error: { code: HataKodu; message: string; details?: unknown };
};

/** İstemciye dönecek mesaj: 500 için sabit metin — iç ayrıntı sızmaz. */
const IC_HATA_MESAJI = 'Beklenmeyen sunucu hatası';

export class ApiHata extends Error {
  readonly kod: HataKodu;
  readonly ayrinti?: unknown;
  readonly basliklar?: Record<string, string>;
  /** yalnız sunucu tarafında saklanır, gövdeye girmez */
  readonly icNot?: string;

  constructor(
    kod: HataKodu,
    mesaj: string,
    secenek: { ayrinti?: unknown; basliklar?: Record<string, string>; icNot?: string } = {},
  ) {
    super(mesaj);
    this.name = 'ApiHata';
    this.kod = kod;
    this.ayrinti = secenek.ayrinti;
    this.basliklar = secenek.basliklar;
    this.icNot = secenek.icNot;
  }
}

export const durumKodu = (kod: HataKodu): number => HATA_DURUMU[kod];

export function hataGovdesi(kod: HataKodu, mesaj: string, ayrinti?: unknown): HataGovdesi {
  const govde: HataGovdesi = {
    error: { code: kod, message: kod === 'ic_hata' ? IC_HATA_MESAJI : mesaj },
  };
  if (ayrinti !== undefined && kod !== 'ic_hata') govde.error.details = ayrinti;
  return govde;
}

/** Bilinmeyen fırlatılanı ApiHata'ya çevirir. Tanınmayan her şey 500'dür ve
    mesajı gövdeye GEÇMEZ — yalnız icNot olarak denetim satırına yazılır. */
export function apiHatasinaCevir(e: unknown): ApiHata {
  if (e instanceof ApiHata) return e;
  const not = e instanceof Error ? e.message : String(e);
  return new ApiHata('ic_hata', IC_HATA_MESAJI, { icNot: not.slice(0, 500).replace(/\s+/g, ' ') });
}

/** zod hatalarını alan adı taşıyan yapısal ayrıntıya çevirir. */
export function zodAyrintilari(e: ZodError): { alan: string; mesaj: string }[] {
  return e.issues.map((i) => ({
    alan: i.path.map((p) => String(p)).join('.') || '(gövde)',
    mesaj: i.message,
  }));
}
