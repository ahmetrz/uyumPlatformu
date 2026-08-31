/* Oran sınırı — pencere sayacı.

   Depo arayüzü Redis'e taşınabilir olsun diye ayrıldı: tek örnekli kurulumda
   bellek deposu yeterlidir, çok örnekli kurulumda `oranDeposuAyarla()` ile
   Redis (INCR + EXPIRE) uygulaması takılır. Çağıran taraf farkı görmez. */

export type OranKarari = {
  izin: boolean;
  sinir: number;
  kalan: number;
  /** pencerenin sıfırlanacağı epoch ms */
  sifirlanma: number;
  /** 429 için Retry-After (saniye) */
  yenidenDeneSn: number;
};

export interface OranDeposu {
  /** Anahtarın sayacını artırır; pencere dolmuşsa yeni pencere açar. */
  artir(anahtar: string, pencereMs: number, simdi: number): Promise<{ sayac: number; sifirlanma: number }>;
  sifirla(): Promise<void>;
}

/** Tek süreç içi pencere sayacı. Süresi geçen kayıtlar tembel temizlenir. */
export class BellekOranDeposu implements OranDeposu {
  private pencereler = new Map<string, { sayac: number; sifirlanma: number }>();
  private sonSupurme = 0;

  async artir(anahtar: string, pencereMs: number, simdi: number) {
    if (simdi - this.sonSupurme > pencereMs) {
      for (const [k, v] of this.pencereler) if (v.sifirlanma <= simdi) this.pencereler.delete(k);
      this.sonSupurme = simdi;
    }
    const mevcut = this.pencereler.get(anahtar);
    if (!mevcut || mevcut.sifirlanma <= simdi) {
      const yeni = { sayac: 1, sifirlanma: simdi + pencereMs };
      this.pencereler.set(anahtar, yeni);
      return yeni;
    }
    mevcut.sayac += 1;
    return mevcut;
  }

  async sifirla() { this.pencereler.clear(); this.sonSupurme = 0; }
}

let depo: OranDeposu = new BellekOranDeposu();
export function oranDeposuAyarla(yeni: OranDeposu): void { depo = yeni; }

const sayiOku = (ham: string | undefined, varsayilan: number) => {
  const n = Number(ham);
  return Number.isFinite(n) && n > 0 ? n : varsayilan;
};

let ayar = {
  sinir: sayiOku(process.env.API_ORAN_SINIRI, 120),
  pencereMs: sayiOku(process.env.API_ORAN_PENCERE_MS, 60_000),
};

export const oranAyari = () => ({ ...ayar });
export function oranAyariAyarla(yeni: Partial<typeof ayar>): void {
  ayar = { ...ayar, ...yeni };
}
export const oranSayaclariniSifirla = (): Promise<void> => depo.sifirla();

export async function oranSinirla(anahtar: string): Promise<OranKarari> {
  const simdi = Date.now();
  const { sayac, sifirlanma } = await depo.artir(anahtar, ayar.pencereMs, simdi);
  return {
    izin: sayac <= ayar.sinir,
    sinir: ayar.sinir,
    kalan: Math.max(0, ayar.sinir - sayac),
    sifirlanma,
    yenidenDeneSn: Math.max(1, Math.ceil((sifirlanma - simdi) / 1000)),
  };
}
