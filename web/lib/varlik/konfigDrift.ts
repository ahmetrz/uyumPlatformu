/* ═══ OT-28 · Konfigürasyon drift ═════════════════════════════════════

   `KonfigurasyonYedegi` cihazın o günkü konfigürasyonunu saklar.
   `KonfigTemeli` hangisinin ONAYLI olduğunu söyler. Drift ikisi
   arasındaki farktır — ve bu ayrım olmadan "drift" diye bir kavram
   kurulamaz: taban yoksa her yeni yedek yeni gerçek olur ve hiçbir
   değişiklik fark edilmez.

   ── ONAYLI DRIFT BİR KUSUR DEĞİLDİR ───────────────────────────────────
   Planlı bir değişiklikten doğan fark beklenen bir şeydir; ama İZLENMEDEN
   geçmemelidir. Bu yüzden `onayli` da bir sapma satırıdır, yalnız kusur
   sayılmaz ve değişiklik referansını taşır.

   ── TABANSIZ CİHAZ "SORUNSUZ" DEĞİLDİR ────────────────────────────────
   Tabanı olmayan cihaz için drift HESAPLANAMAZ. Bu bir ölçüm borcudur ve
   sayaçta ayrı durur; sıfır sapma diye göstermek, hiç bakılmamış bir
   cihazı temiz göstermek olurdu. */

export const SAPMA_DURUMLARI = ['acik', 'onayli', 'giderildi', 'kabul_edildi'] as const;
export type SapmaDurumu = (typeof SAPMA_DURUMLARI)[number];

export const SAPMA_ETIKETI: Record<SapmaDurumu, string> = {
  acik: 'açık',
  onayli: 'onaylı değişiklik',
  giderildi: 'giderildi',
  kabul_edildi: 'gerekçeyle kabul edildi',
};

export const SAPMA_SINIFI: Record<SapmaDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  acik: 'bd', onayli: 'md', giderildi: 'ok', kabul_edildi: 'md',
};

export const SIDDETLER = ['kritik', 'yuksek', 'orta', 'dusuk', 'bilinmiyor'] as const;
export type Siddet = (typeof SIDDETLER)[number];

/** Karar bir gerekçe ister mi? Kapatan her karar ister. */
export function kararGerekceIster(durum: SapmaDurumu): boolean {
  return durum === 'giderildi' || durum === 'kabul_edildi' || durum === 'onayli';
}

export type KarsilastirmaGirdisi = {
  /** Onaylı tabanın içerik özeti; null = TABAN YOK. */
  temelHash: string | null;
  /** Son gözlemin (yedeğin) içerik özeti; null = gözlem yok/hesaplanmadı. */
  gozlenenHash: string | null;
};

export type KarsilastirmaSonucu = {
  /**
   * `sapma` — özetler farklı · `ayni` — aynı · `karar_verilemedi` —
   * taban ya da gözlem eksik.
   */
  sonuc: 'ayni' | 'sapma' | 'karar_verilemedi';
  gerekce: string;
};

/**
 * Taban ile gözlemi karşılaştırır.
 *
 * Eksik özet `sapma` DEĞİLDİR: bir yedeğin hash'i hesaplanmamışsa cihaz
 * "değişmiş" sayılamaz, "bakılmamış" sayılır. Tersini yapmak, hash
 * hesaplayamayan bir konnektörün bütün filoyu kırmızıya boyaması
 * demekti.
 */
export function driftKarsilastir(g: KarsilastirmaGirdisi): KarsilastirmaSonucu {
  if (!g.temelHash) {
    return {
      sonuc: 'karar_verilemedi',
      gerekce: 'Onaylı konfigürasyon tabanı yok — sapma hesaplanamaz.',
    };
  }
  if (!g.gozlenenHash) {
    return {
      sonuc: 'karar_verilemedi',
      gerekce: 'Gözlenen konfigürasyonun özeti yok — karşılaştırılamadı.',
    };
  }
  return g.temelHash === g.gozlenenHash
    ? { sonuc: 'ayni', gerekce: 'Gözlenen konfigürasyon onaylı tabanla birebir aynı.' }
    : {
      sonuc: 'sapma',
      gerekce: `Gözlenen özet (${g.gozlenenHash.slice(0, 12)}…) onaylı tabandan `
        + `(${g.temelHash.slice(0, 12)}…) farklı.`,
    };
}

export type DriftOzeti = {
  /** Tabanı olan ve karşılaştırılabilen cihaz sayısı. */
  olculen: number;
  /** Tabanı olmayan cihaz — ÖLÇÜM BORCU, sapmasız değil. */
  tabansiz: number;
  ayni: number;
  acikSapma: number;
  onayliSapma: number;
  /**
   * Uyum oranı; payda yalnız ÖLÇÜLEBİLENLERDİR. Tabansız cihazı paydaya
   * koymak, ölçülmemişi başarısız saymak olurdu. Payda sıfırsa `null`.
   */
  oran: number | null;
};

export function driftOzeti(
  satirlar: readonly {
    temelVar: boolean;
    sonuc: KarsilastirmaSonucu['sonuc'];
    acikSapmaVar: boolean;
    onayliSapmaVar: boolean;
  }[],
): DriftOzeti {
  let olculen = 0; let tabansiz = 0; let ayni = 0;
  let acik = 0; let onayli = 0;
  for (const s of satirlar) {
    if (!s.temelVar) { tabansiz += 1; continue; }
    if (s.sonuc === 'karar_verilemedi') { tabansiz += 1; continue; }
    olculen += 1;
    if (s.sonuc === 'ayni') ayni += 1;
    if (s.acikSapmaVar) acik += 1;
    if (s.onayliSapmaVar) onayli += 1;
  }
  return {
    olculen, tabansiz, ayni, acikSapma: acik, onayliSapma: onayli,
    oran: olculen === 0 ? null : Math.round((ayni / olculen) * 100),
  };
}
