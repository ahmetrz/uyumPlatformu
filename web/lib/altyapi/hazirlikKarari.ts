/* ═══════════════════════════════════════════════════════════════════════
   OT-48 · Başlangıç hazırlığı — SAF KARAR

   "Bu kurulum çalışmaya hazır mı?" sorusunun cevabı bir evet/hayır
   değildir; kontrol kontrol bir kütüktür. Bu dosya kütüğü YORUMLAR,
   kontrolleri koşmaz (koşan taraf `hazirlik.ts`). Veritabanı ve React
   bağımlılığı yoktur.

   ── DÖRT DURUM, ÜÇE İNMEZ ─────────────────────────────────────────────
     hazir       kontrol koştu ve geçti
     eksik       kontrol koştu ve bir KURULUM işi buldu (yapılabilir)
     bozuk       kontrol koştu ve bir ARIZA buldu (çalışmıyor)
     bilinmiyor  kontrol KOŞAMADI — kusur da olabilir, olmayabilir de

   `eksik` ile `bozuk` ayrımı operasyonun işini böler: biri kurulum
   adımıdır, öteki bir arıza kaydıdır. `bilinmiyor`u ikisinden birine
   sıkıştırmak ise ölçülmemiş bir şeyi ölçülmüş göstermek olurdu.

   ── HAZIR OLMAK ZORUNLU DEĞİLDİR ──────────────────────────────────────
   Kontroller ZORUNLU ve BİLGİ olarak ikiye ayrılır. Tek örnekli bir
   kurulumda "nesne deposu bağlı değil" bir bilgi kalemidir, bir arıza
   değil. Bilgi kalemlerini zorunlu saymak, çalışan bir kurulumu kırmızı
   gösterir ve ekrana bir daha bakılmaz. */

export const KONTROL_DURUMLARI = ['hazir', 'eksik', 'bozuk', 'bilinmiyor'] as const;
export type KontrolDurumu = (typeof KONTROL_DURUMLARI)[number];

export const DURUM_SOZU: Record<KontrolDurumu, string> = {
  hazir: 'hazır',
  eksik: 'kurulum eksik',
  bozuk: 'arızalı',
  bilinmiyor: 'ölçülemedi',
};

/** Ekran sınıfı. `bilinmiyor` GRİDİR — kırmızı değil. */
export const DURUM_SINIFI: Record<KontrolDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  hazir: 'ok', eksik: 'md', bozuk: 'bd', bilinmiyor: 'unk',
};

export type Kontrol = {
  kod: string;
  ad: string;
  /** Zorunlu kontrol geçmezse kurulum ÇALIŞMAYA hazır değildir. */
  zorunlu: boolean;
  durum: KontrolDurumu;
  /** Ne bulundu — ölçüm sonucu, tahmin değil. */
  ayrinti: string;
  /** Eksik/bozuksa ne yapılmalı; hazırsa null. */
  yapilacak: string | null;
};

export type HazirlikOzeti = {
  /** Zorunlu kontrollerin tamamı `hazir` mi? */
  calismayaHazir: boolean;
  /**
   * Zorunlu bir kontrol `bilinmiyor` ise hazırlık İDDİA EDİLEMEZ.
   * Bu ayrı bir alandır: "hazır değil" ile "hazır olduğunu bilmiyoruz"
   * farklı cümlelerdir ve ikincisi ölçüm işidir.
   */
  olculemeyenZorunlu: number;
  hazir: number;
  eksik: number;
  bozuk: number;
  bilinmiyor: number;
  toplam: number;
};

export function hazirlikOzeti(kontroller: readonly Kontrol[]): HazirlikOzeti {
  const say = (d: KontrolDurumu) => kontroller.filter((k) => k.durum === d).length;
  const zorunlular = kontroller.filter((k) => k.zorunlu);
  return {
    calismayaHazir: zorunlular.length > 0 && zorunlular.every((k) => k.durum === 'hazir'),
    olculemeyenZorunlu: zorunlular.filter((k) => k.durum === 'bilinmiyor').length,
    hazir: say('hazir'),
    eksik: say('eksik'),
    bozuk: say('bozuk'),
    bilinmiyor: say('bilinmiyor'),
    toplam: kontroller.length,
  };
}

/**
 * Ekranın tepesindeki tek cümle.
 *
 * Sıra bilinçli: ARIZA en önde, çünkü kurulum eksiği beklenebilir bir
 * durumdur, arıza değildir. Ölçülemeyen zorunlu kontrol ise "hazır"
 * cümlesini kurmayı ENGELLER — ölçülmemişi hazır saymak, bu belgenin
 * bütününde yasak olan şeydir.
 */
export function hazirlikCumlesi(o: HazirlikOzeti): string {
  if (o.toplam === 0) return 'Hiç kontrol koşmadı — hazırlık ölçülmedi.';
  if (o.bozuk > 0) return `${o.bozuk} kontrol ARIZALI — kurulum çalışmıyor.`;
  if (o.olculemeyenZorunlu > 0) {
    return `${o.olculemeyenZorunlu} zorunlu kontrol ölçülemedi; hazırlık iddia edilemez.`;
  }
  if (!o.calismayaHazir) return `${o.eksik} zorunlu kurulum adımı eksik.`;
  if (o.eksik > 0) {
    return `Çalışmaya hazır · ${o.eksik} bilgi kalemi kurulum bekliyor (zorunlu değil).`;
  }
  return 'Çalışmaya hazır · bütün kontroller geçti.';
}

/** En kötü durum önde — ekranın sıralaması. */
const SIRA: Record<KontrolDurumu, number> = { bozuk: 0, bilinmiyor: 1, eksik: 2, hazir: 3 };

export function kontrolleriSirala(kontroller: readonly Kontrol[]): Kontrol[] {
  return [...kontroller].sort((a, b) => {
    /* Zorunlu kontrol aynı durumdaki bilgi kaleminden önce gelir:
       operasyonun önce bakması gereken satır odur. */
    const d = SIRA[a.durum] - SIRA[b.durum];
    if (d !== 0) return d;
    if (a.zorunlu !== b.zorunlu) return a.zorunlu ? -1 : 1;
    return a.ad.localeCompare(b.ad, 'tr');
  });
}
