/* ═══════════════════════════════════════════════════════════════════════
   R10+ · BİLDİRİM DÖNEMİ AÇMA — TEK NÜSHA, İKİ ÇAĞIRAN

   Takvim tetikli yükümlülükler için dönem açan ve süresi geçeni
   işaretleyen döngü BURADADIR; motor (`lib/motorlar/bildirimSuresi.ts`)
   ve tohum (`prisma/seed.ts`) ikisi de bunu çağırır — olay tarafındaki
   `bildirimKaydiAcma.ts` ile aynı gerekçe: motor `server-only` taşır ve
   tohum düz Node'da koşar; tohumun döngüyü taklit etmesi ikinci bir
   gerçek doğururdu.

   MOTORUN YAZABİLECEĞİ İKİ DURUM: `acik` ve `suresi_gecti`.
   `verildi` · `teyit_alindi` · `uygulanmaz` insan kararıdır ve buraya
   ASLA yazılmaz. Bir raporun verildiğini söyleyebilecek tek şey
   insandır — olay tarafındaki kuralın birebir aynısı. */

import type { db as Db } from '../db';
import { iz } from '../eylemler2/ortak';
import {
  DONEMSIZ_SOZU, donemGeriSayimi, donemKarari, donemPenceresi,
  motorYazabilirMiDonem,
} from './bildirimDonemi';

export type DonemKosusu = {
  /** Bu koşuda AÇILAN dönem sayısı (idempotent: ikinci koşuda 0). */
  acilanDonem: number;
  /** Bu koşuda `suresi_gecti` yazılan dönem sayısı. */
  suresiGecen: number;
  /** Periyodu mevzuatta belirlenmediği için dönem AÇILAMAYAN yükümlülük. */
  donemsiz: number;
  /** Dönemi açıldı ama teslim süresi olmadığı için sayacı OLMAYAN. */
  teslimsiz: number;
};

export type TakvimYukumlulugu = {
  id: string;
  kod: string;
  merci: string;
  tetikleyici: string;
  donem: string | null;
  donemBaslangici: string | null;
  teslimGun: number | null;
  aktif: boolean;
};

/**
 * Takvim tetikli her aktif yükümlülük için içinde bulunulan dönemi açar.
 *
 * Periyot bilinmiyorsa dönem AÇILMAZ ve bu bir hata değildir: mevzuat
 * söylemediği sürece ürün bir takvim uydurmaz. Sayılır, gizlenmez.
 */
export async function acikDonemleriKur(istemci: typeof Db): Promise<DonemKosusu> {
  const sonuc: DonemKosusu = {
    acilanDonem: 0, suresiGecen: 0, donemsiz: 0, teslimsiz: 0,
  };

  const kurallar = await istemci.bildirimYukumlulugu.findMany({
    where: { aktif: true, tetikleyici: 'takvim' },
    select: {
      id: true, kod: true, merci: true, tetikleyici: true,
      donem: true, donemBaslangici: true, teslimGun: true, aktif: true,
    },
  });
  if (kurallar.length === 0) return sonuc;

  const simdi = Date.now();
  for (const y of kurallar) {
    const { pencere } = donemPenceresi({
      donem: y.donem, donemBaslangici: y.donemBaslangici,
      teslimGun: y.teslimGun, simdi,
    });
    if (pencere === null) { sonuc.donemsiz += 1; continue; }
    if (pencere.sonTarih === null) sonuc.teslimsiz += 1;

    const gs = donemGeriSayimi({ sonTarih: pencere.sonTarih, simdi });
    const mevcut = await istemci.bildirimDonemi.findUnique({
      where: {
        yukumlulukId_donemEtiketi: { yukumlulukId: y.id, donemEtiketi: pencere.etiket },
      },
      select: { id: true, durum: true },
    });

    if (!mevcut) {
      /* AÇILIŞ DURUMU DA HESAPLANIR — olay tarafında ölçülen çelişkinin
         aynısı buraya taşınmasın diye: teslim süresi çoktan geçmiş bir
         dönem "Dönem açık" diye açılırsa ekran aynı satırda "10 gün
         GECİKME" der ve iki söz çelişir. */
      const acilis = donemKarari({ mevcutDurum: 'acik', geriSayim: gs }) ?? 'acik';
      await istemci.$transaction(async (tx) => {
        const donem = await tx.bildirimDonemi.create({
          data: {
            yukumlulukId: y.id,
            donemEtiketi: pencere.etiket,
            baslangic: new Date(pencere.baslangic),
            bitis: new Date(pencere.bitis),
            sonTarih: pencere.sonTarih === null ? null : new Date(pencere.sonTarih),
            durum: acilis,
          },
        });
        /* Motorun yazdığı da iz bırakır; aktör YOK çünkü kararı insan
           vermedi ve iz bunu saklamaz, adıyla söyler. */
        await iz({
          aktorId: null, varlikTipi: 'BildirimDonemi', varlikId: donem.id,
          eylem: 'olusturma', alan: 'durum', once: null,
          sonra: acilis === 'suresi_gecti' ? 'Süresi geçmiş açıldı' : 'Dönem açıldı',
          gerekce: `motor · ${y.kod} · ${y.merci} · dönem ${pencere.etiket}`
            + ` · ${pencere.sonTarih === null ? DONEMSIZ_SOZU
              : `son tarih ${new Date(pencere.sonTarih).toISOString()}`}`,
        }, tx);
      });
      sonuc.acilanDonem += 1;
      if (acilis === 'suresi_gecti') sonuc.suresiGecen += 1;
      continue;
    }

    /* Kapalı döneme (verildi · teyit · uygulanmaz) motor DOKUNMAZ. */
    const yeniDurum = donemKarari({ mevcutDurum: mevcut.durum, geriSayim: gs });
    if (yeniDurum === null) continue;
    /* Bekçi kuşağı: motorun yazacağı her durum listeden geçer. */
    if (!motorYazabilirMiDonem(yeniDurum)) continue;
    await istemci.$transaction(async (tx) => {
      await tx.bildirimDonemi.update({ where: { id: mevcut.id }, data: { durum: yeniDurum } });
      await iz({
        aktorId: null, varlikTipi: 'BildirimDonemi', varlikId: mevcut.id,
        eylem: 'guncelleme', alan: 'durum',
        once: 'Dönem açık — rapor verilmedi', sonra: 'SÜRE GEÇTİ — rapor hâlâ verilmedi',
        gerekce: `motor · ${y.kod} · ${y.merci} · dönem ${pencere.etiket}`
          + ' · teslim süresi doldu, rapor hâlâ verilmedi',
      }, tx);
    });
    sonuc.suresiGecen += 1;
  }
  return sonuc;
}
