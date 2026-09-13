import { birimliToplam, type BirimliToplam } from '@/lib/alan/oznitelik';
import type { PortfoySatiri } from '@/app/(tam)/portfoy/mantik';

/* UYUM KARNESİ — SAF KATMAN.

   Bileşenin içinde kalsaydı bu kararlar ancak tarayıcıyla sınanabilirdi;
   oysa hepsi girdi→çıktı: hangi satırlar sayılır, ne toplanır, ne
   toplanmaz. Ayrı dosya sınanabilirliği verir, ekrana bir şey eklemez. */

export type KarneOzeti = {
  /** Kapsamdaki kayıt sayısı. */
  kayit: number;
  /** Uyum yüzdesi ÖLÇÜLMÜŞ kayıt sayısı — ölçülmemişler sıfır sayılmaz. */
  olculen: number;
  acikBulgu: number;
  acikRisk: number;
  /** Toplam kapasite; farklı ölçüler TOPLANMAZ (`karisikBirim`). */
  kapasite: BirimliToplam;
};

export function karneOzeti(satirlar: readonly PortfoySatiri[]): KarneOzeti {
  return {
    kayit: satirlar.length,
    olculen: satirlar.filter((s) => s.uyumYuzde !== null).length,
    acikBulgu: satirlar.reduce((a, s) => a + s.acikBulgu, 0),
    acikRisk: satirlar.reduce((a, s) => a + s.acikRisk, 0),
    kapasite: birimliToplam(satirlar.map((s) => ({ deger: s.guc, birim: s.gucBirim }))),
  };
}

/** En zayıf `adet` kayıt — YALNIZ ölçülmüş olanlar arasından.

    Ölçülmemiş bir kaydı "en zayıf" listesine koymak, bilinmeyeni en kötü
    saymak olurdu; listeden çıkarmak ise onu yok saymak değildir — özet
    kaç kaydın ölçüldüğünü ayrıca yazar. */
export function enZayif(
  satirlar: readonly PortfoySatiri[], adet = 5,
): PortfoySatiri[] {
  return satirlar
    .filter((s) => s.uyumYuzde !== null)
    .sort((a, b) => (a.uyumYuzde! - b.uyumYuzde!) || a.ad.localeCompare(b.ad, 'tr'))
    .slice(0, adet);
}

/** Merceğe göre süzülmüş satırlar; mercek yoksa hepsi. */
export function mercekle(
  satirlar: readonly PortfoySatiri[], sektorId: string | null,
): PortfoySatiri[] {
  return sektorId === null ? [...satirlar] : satirlar.filter((s) => s.sektorId === sektorId);
}
