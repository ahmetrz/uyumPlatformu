/* ═══════════════════════════════════════════════════════════════════════
   UY-16 · Kapsama · tazelik · denetime hazırlık

   Ürün bir "uyum oranı" hesaplıyordu ve o oran tek başına denetimde
   hiçbir şey söylemez. Denetçinin sorduğu şey üç ayrı sorudur ve
   BİRLEŞTİRİLEMEZLER:

     KAPSAMA  — kaç kontrol DEĞERLENDİRİLDİ? (uyumlu olması gerekmez)
     TAZELİK  — değerlendirmelerin dayanağı bugün hâlâ geçerli mi?
     HAZIRLIK — bugün denetime girsek kaç kontrolü savunabiliriz?

   Bir kurum %95 uyumlu görünüp %30 kapsamalı olabilir: kalan %70 hiç
   bakılmamıştır ve ekranda yeşil görünür. Tek bir orana indirgemek tam
   olarak bu yanılsamayı üretir.

   Bu dosya veritabanı ve React bilmez.

   ── PAYDA TARTIŞMASI ──────────────────────────────────────────────────
   KAPSAM DIŞI kontrol paydaya girmez: bir santralde uygulanamayan bir
   maddeyi "değerlendirilmedi" saymak, kapatılamayacak bir borç üretir.
   Ama kapsam dışı sayısı AYRI raporlanır — çünkü paydayı küçülterek
   oranı yükseltmek, kapsamı daraltarak uyumu "iyileştirmenin" en kolay
   yoludur ve denetçi ilk oraya bakar. */

export const HAZIRLIK_DUZEYLERI = ['savunulabilir', 'zayif', 'savunulamaz'] as const;
export type HazirlikDuzeyi = (typeof HAZIRLIK_DUZEYLERI)[number];

export const HAZIRLIK_SOZU: Record<HazirlikDuzeyi, string> = {
  savunulabilir: 'denetimde savunulabilir',
  zayif: 'zayıf — dayanağı eksik ya da bayat',
  savunulamaz: 'savunulamaz — dayanağı yok',
};

export const HAZIRLIK_SINIFI: Record<HazirlikDuzeyi, 'ok' | 'md' | 'bd'> = {
  savunulabilir: 'ok', zayif: 'md', savunulamaz: 'bd',
};

export type KontrolSatiri = {
  /** uyumlu | kismi | uyumsuz | degerlendirilmedi | incelemede | kapsamdisi */
  durum: string;
  /** otomatik_kanit | denetci_dogrulamis | oz_degerlendirme | bayat_kanit | kanit_yok */
  guven: string;
  kanitBayat: boolean;
  /** UY-07 · dört göz doğrulaması yapıldı mı (ve hâlâ geçerli mi). */
  dogrulandi: boolean;
  /** UY-12 · bu kontrole bağlı GEÇERLİ kanıt sayısı. */
  gecerliKanit: number;
};

export const DEGERLENDIRILDI = new Set(['uyumlu', 'kismi', 'uyumsuz']);

/**
 * Bir kontrolün denetime hazırlık düzeyi.
 *
 * "Uyumlu" olmak hazırlık DEĞİLDİR: kanıtsız bir "uyumlu" denetimde
 * savunulamaz ve bulguya döner. Tersi de doğrudur — kanıtlı bir
 * "uyumsuz" savunulabilir bir karardır: kurum sorunu görmüş, kayda
 * geçirmiş ve aksiyona bağlamıştır.
 */
export function kontrolHazirligi(k: KontrolSatiri): HazirlikDuzeyi {
  if (k.durum === 'kapsamdisi') return 'savunulabilir';
  if (!DEGERLENDIRILDI.has(k.durum)) return 'savunulamaz';
  if (k.gecerliKanit === 0) return 'savunulamaz';
  if (k.kanitBayat || k.guven === 'bayat_kanit') return 'zayif';
  if (!k.dogrulandi) return 'zayif';
  return 'savunulabilir';
}

export type KapsamaOzeti = {
  /** Kapsamdaki (kapsam dışı OLMAYAN) kontrol sayısı — oranların paydası. */
  kapsamda: number;
  /** Bilinçli olarak kapsam dışı bırakılmış kontroller — AYRI raporlanır. */
  kapsamDisi: number;
  degerlendirilen: number;
  /** Kapsama oranı; payda sıfırsa `null` — %0 da %100 de yalan olurdu. */
  kapsamaOrani: number | null;

  /** En az bir geçerli kanıtı olan değerlendirilmiş kontrol. */
  kanitli: number;
  /** Kanıtı olan ama BAYAT olan kontrol — kanıtsızdan ayrı sayılır. */
  bayatKanitli: number;
  kanitOrani: number | null;

  dogrulanan: number;
  dogrulamaOrani: number | null;

  savunulabilir: number;
  zayif: number;
  savunulamaz: number;
  /** Denetime hazırlık oranı; payda kapsamdaki kontrollerdir. */
  hazirlikOrani: number | null;
};

const oran = (pay: number, payda: number): number | null =>
  (payda === 0 ? null : Math.round((pay / payda) * 100));

export function kapsamaOzeti(satirlar: readonly KontrolSatiri[]): KapsamaOzeti {
  const kapsamDisi = satirlar.filter((s) => s.durum === 'kapsamdisi').length;
  const kapsamda = satirlar.filter((s) => s.durum !== 'kapsamdisi');
  const degerlendirilen = kapsamda.filter((s) => DEGERLENDIRILDI.has(s.durum)).length;
  const kanitli = kapsamda.filter(
    (s) => DEGERLENDIRILDI.has(s.durum) && s.gecerliKanit > 0 && !s.kanitBayat,
  ).length;
  const bayatKanitli = kapsamda.filter(
    (s) => DEGERLENDIRILDI.has(s.durum) && s.gecerliKanit > 0 && s.kanitBayat,
  ).length;
  const dogrulanan = kapsamda.filter((s) => s.dogrulandi).length;
  const duzeyler = kapsamda.map(kontrolHazirligi);
  const savunulabilir = duzeyler.filter((d) => d === 'savunulabilir').length;

  return {
    kapsamda: kapsamda.length,
    kapsamDisi,
    degerlendirilen,
    kapsamaOrani: oran(degerlendirilen, kapsamda.length),
    kanitli,
    bayatKanitli,
    kanitOrani: oran(kanitli, kapsamda.length),
    dogrulanan,
    dogrulamaOrani: oran(dogrulanan, kapsamda.length),
    savunulabilir,
    zayif: duzeyler.filter((d) => d === 'zayif').length,
    savunulamaz: duzeyler.filter((d) => d === 'savunulamaz').length,
    hazirlikOrani: oran(savunulabilir, kapsamda.length),
  };
}

/**
 * Ekranın tepesindeki tek cümle.
 *
 * Sıra bilinçli: kapsama en önde, çünkü kapsamı düşük bir kurumda öteki
 * bütün oranlar KÜÇÜK BİR ÖRNEKLEM üzerinden hesaplanır ve olduğundan
 * iyi görünür. "%98 hazırlık" cümlesi, kontrollerin %20'si
 * değerlendirilmişse bir bilgi değil bir yanılsamadır.
 */
export function kapsamaCumlesi(o: KapsamaOzeti): string {
  if (o.kapsamda === 0) {
    return 'Kapsamda kontrol yok — oran hesaplanamaz.';
  }
  if (o.kapsamaOrani !== null && o.kapsamaOrani < 50) {
    return `Kontrollerin yalnız %${o.kapsamaOrani}'i değerlendirildi; `
      + 'geri kalan oranlar bu küçük örneklem üzerinden hesaplanıyor.';
  }
  if (o.savunulamaz > 0) {
    return `${o.savunulamaz} kontrol denetimde savunulamaz — dayanağı yok.`;
  }
  if (o.zayif > 0) {
    return `${o.zayif} kontrolün dayanağı zayıf: kanıtı bayat ya da doğrulanmamış.`;
  }
  return `Kapsamdaki ${o.kapsamda} kontrolün tamamı savunulabilir.`;
}

/**
 * Denetime hazırlık tek bir sayıya İNDİRİLMEZ.
 *
 * Bu fonksiyon bilerek bir puan döndürmez; hangi eksiğin kaç kontrolü
 * etkilediğini SAYAR. Tek puan, üç farklı işi (değerlendir · kanıt
 * topla · doğrula) tek bir yüzdeye gömer ve o yüzdeyi yükseltmenin en
 * kolay yolu kapsamı daraltmak olur.
 */
export type EksikDagilimi = {
  degerlendirilmedi: number;
  kanitYok: number;
  kanitBayat: number;
  dogrulanmadi: number;
};

export function eksikDagilimi(satirlar: readonly KontrolSatiri[]): EksikDagilimi {
  const kapsamda = satirlar.filter((s) => s.durum !== 'kapsamdisi');
  return {
    degerlendirilmedi: kapsamda.filter((s) => !DEGERLENDIRILDI.has(s.durum)).length,
    kanitYok: kapsamda.filter(
      (s) => DEGERLENDIRILDI.has(s.durum) && s.gecerliKanit === 0,
    ).length,
    kanitBayat: kapsamda.filter(
      (s) => DEGERLENDIRILDI.has(s.durum) && s.gecerliKanit > 0 && s.kanitBayat,
    ).length,
    dogrulanmadi: kapsamda.filter(
      (s) => DEGERLENDIRILDI.has(s.durum) && !s.dogrulandi,
    ).length,
  };
}
