/* ═══ OT-27 · Güvenlik kapsaması — BEŞ durum ══════════════════════════

   Bugünkü `Varlik.edrDurumu` üç değerlidir: `var | yok | bilinmiyor`.
   Denetim iki eksiği ölçtü ve ikisi de ekranda yanlış cevap üretiyor:

   1. UYGULANAMAZ yok. Bir OT PLC'ye EDR ajanı kurulamaz. Bugün ya `yok`
      yazılır (kalıcı kırmızı; kapatılamayan bir açık gibi görünür) ya
      `bilinmiyor` (ölçülmemiş gibi görünür; oysa ölçüldü ve cevap
      "kurulamaz"). İkisi de yanlıştır.
   2. KISMİ yok. Bir sunucu ailesinin yarısı kapsanmışsa tek bir `var`/`yok`
      bunu anlatamaz.

   Ayrıca kapsamın KAYNAĞI ve DOĞRULANMA ZAMANI yoktu: bir kez `var`
   yazılan alan sonsuza kadar `var` kalıyordu. Bu dosya beş durumu, tazelik
   kuralını ve toplulaştırmayı tanımlar. */

export const KAPSAM_TIPLERI = [
  'edr', 'antivirus', 'siem', 'izleme', 'yedekleme', 'pam', 'mfa',
  'zafiyet_yonetimi', 'konfig_yedek', 'ntp', 'syslog',
] as const;
export type KapsamTipi = (typeof KAPSAM_TIPLERI)[number];

export const KAPSAM_DURUMLARI = [
  'kapsanan', 'kismi', 'kapsanmayan', 'uygulanamaz', 'bilinmiyor',
] as const;
export type KapsamDurumu = (typeof KAPSAM_DURUMLARI)[number];

export const KAPSAM_ETIKETI: Record<KapsamDurumu, string> = {
  kapsanan: 'kapsanıyor',
  kismi: 'kısmen',
  kapsanmayan: 'kapsanmıyor',
  uygulanamaz: 'uygulanamaz',
  bilinmiyor: 'bilinmiyor',
};

/** Ekran durum sınıfı — `uygulanamaz` KUSUR DEĞİLDİR, nötr çizilir. */
export const KAPSAM_DURUM_SINIFI: Record<KapsamDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  kapsanan: 'ok',
  kismi: 'md',
  kapsanmayan: 'bd',
  uygulanamaz: 'unk',
  bilinmiyor: 'unk',
};

export type KapsamKaydi = {
  tip: KapsamTipi;
  durum: KapsamDurumu;
  sonDogrulama: Date | null;
};

/**
 * Kapsam AÇIK bir eksik mi?
 *
 * Yalnız `kapsanmayan` ve `kismi` açıktır. `bilinmiyor` bir eksik DEĞİL,
 * bir ÖLÇÜM BORCUDUR; ikisini aynı sayaçta toplamak "kaç cihaz korumasız"
 * sorusunu yanlış cevaplar.
 */
export function acikMi(durum: KapsamDurumu): boolean {
  return durum === 'kapsanmayan' || durum === 'kismi';
}

/** Ölçüm borcu mu? (`bilinmiyor` — uygulanamaz DEĞİL) */
export function olcumBorcuMu(durum: KapsamDurumu): boolean {
  return durum === 'bilinmiyor';
}

/**
 * Kapsam kaydı BAYAT mı? Doğrulanmamış ya da eşikten eski kayıt, bugünkü
 * gerçeği temsil etmeyebilir.
 *
 * `null` = hiç doğrulanmamış — bayat SAYILIR, çünkü "ne zaman bakıldığı"
 * bilinmeyen bir `kapsanan` kaydı, bakılmamış bir kayıttan ayırt edilemez.
 */
export function bayatMi(sonDogrulama: Date | null, esikGun: number, simdi: Date): boolean {
  if (sonDogrulama === null) return true;
  const gecen = (simdi.getTime() - sonDogrulama.getTime()) / 86_400_000;
  return gecen > esikGun;
}

export type KapsamOzeti = {
  kapsanan: number;
  kismi: number;
  kapsanmayan: number;
  uygulanamaz: number;
  bilinmiyor: number;
  /** Açık eksik sayısı (kapsanmayan + kısmi). */
  acik: number;
  /** Ölçüm borcu sayısı (bilinmiyor). */
  borc: number;
  /**
   * Kapsama oranı — **paydadan `uygulanamaz` ve `bilinmiyor` DÜŞER.**
   *
   * Uygulanamaz olanı paydaya koymak, ulaşılamayacak bir hedefe göre puan
   * vermek olurdu. Bilinmeyeni paydaya koymak ise ölçülmemiş olanı
   * başarısız saymaktır — "bilinmeyen ≠ sıfır" kuralının ihlali.
   *
   * Payda sıfırsa oran **null**'dır: ölçülmüş hiçbir kalem yoksa yüzde
   * hesaplanamaz ve `%0` yazmak yalan olurdu.
   */
  oran: number | null;
};

export function kapsamOzeti(kayitlar: readonly KapsamKaydi[]): KapsamOzeti {
  const s = {
    kapsanan: 0, kismi: 0, kapsanmayan: 0, uygulanamaz: 0, bilinmiyor: 0,
  };
  for (const k of kayitlar) s[k.durum] += 1;
  const payda = s.kapsanan + s.kismi + s.kapsanmayan;
  return {
    ...s,
    acik: s.kapsanmayan + s.kismi,
    borc: s.bilinmiyor,
    /* Kısmi yarım sayılır: tam saymak "kapsandı" demek, hiç saymamak
       yapılan işi yok saymak olurdu. */
    oran: payda === 0 ? null : Math.round(((s.kapsanan + s.kismi * 0.5) / payda) * 100),
  };
}

/**
 * Eksik kapsam kayıtlarını `bilinmiyor` olarak tamamlar.
 *
 * Bir tip için hiç kayıt yoksa o tip ÖLÇÜLMEMİŞTİR; listeden düşürmek
 * onu sessizce "sorun yok" saymak olurdu.
 */
export function tamKapsamListesi(
  kayitlar: readonly KapsamKaydi[],
  tipler: readonly KapsamTipi[] = KAPSAM_TIPLERI,
): KapsamKaydi[] {
  const harita = new Map(kayitlar.map((k) => [k.tip, k]));
  return tipler.map((tip) => harita.get(tip)
    ?? { tip, durum: 'bilinmiyor' as const, sonDogrulama: null });
}
