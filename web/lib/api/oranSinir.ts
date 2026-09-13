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
  /** Tek bir kovayı düşürür. Giriş ucu bunu BAŞARILI kimlik doğrulamadan
      sonra çağırır: aksi hâlde bir saldırgan, bildiği bir hesaba art arda
      yanlış parola göndererek o hesabın sahibini pencere boyunca dışarıda
      bırakabilirdi (kaba kuvvet koruması, hesap kilitleme silahına döner).
      Uygulaması isteğe bağlıdır — Redis deposunda DEL, bellekte Map.delete. */
  unut?(anahtar: string): Promise<void>;
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

  async unut(anahtar: string) { this.pencereler.delete(anahtar); }
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

/** Tek kovayı düşürür; depo desteklemiyorsa sessizce geçer (sayaç yalnız
    pencere sonunda düşer — güvenliği gevşetmez, yalnız kilit daha uzun sürer). */
export const oranKovasiniUnut = async (anahtar: string): Promise<void> => {
  await depo.unut?.(anahtar);
};

/**
 * Bir kovanın sayacını artırır ve karara çevirir.
 *
 * `ozelAyar` NEDEN var: API uçlarının sınırı (dakikada 120 istek) ile giriş
 * ucunun sınırı (kaba kuvvet için dakikalar içinde bir avuç deneme) aynı
 * sayı OLAMAZ — API sınırını kaba kuvvete uygun daraltmak entegrasyonları
 * kırar, giriş sınırını API'ye uygun genişletmek parola denemesini bedava
 * yapar. İki çağıran aynı sayacı paylaşır ama kendi eşiğini getirir; depo
 * tek yerde kalır, ikinci bir oran sınırı uygulaması doğmaz.
 */
export async function oranSinirla(
  anahtar: string,
  ozelAyar?: Partial<typeof ayar>,
): Promise<OranKarari> {
  const etkin = { ...ayar, ...ozelAyar };
  const simdi = Date.now();
  const { sayac, sifirlanma } = await depo.artir(anahtar, etkin.pencereMs, simdi);
  return {
    izin: sayac <= etkin.sinir,
    sinir: etkin.sinir,
    kalan: Math.max(0, etkin.sinir - sayac),
    sifirlanma,
    yenidenDeneSn: Math.max(1, Math.ceil((sifirlanma - simdi) / 1000)),
  };
}
