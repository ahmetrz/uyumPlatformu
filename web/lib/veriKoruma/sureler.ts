/* ═══════════════════════════════════════════════════════════════════════
   R15 · KİŞİSEL VERİ KORUMA · SÜRE KARARLARI — SAF KATMAN

   Bu dosya veritabanı, React ve tarayıcı bilmez. İçinde tek bir ülke
   sabiti, tek bir mevzuat adı ve tek bir gün sayısı YOKTUR: süreler
   `VeriKorumaSuresi` satırından, yani PAKETTEN gelir.

   ── SÜRE YOKSA SAYAÇ YOKTUR ───────────────────────────────────────────
   `gun === null` bir eksiklik değil, kuralın kendi hâlidir: bir ülkede
   standart sözleşmenin mercie bildirimi vardır, başkasında yoktur.
   Süresiz hâlde:
     · son tarih HESAPLANMAZ,
     · geri sayım GÖSTERİLMEZ,
     · "süresi geçti" ASLA yazılmaz,
     · ekran "süre belirlenmedi" der.
   Sıfır gün ile aynı şey değildir: sıfır "bugün doldu", null "dolacak
   bir süre yok". İkisi karışırsa ürün olmayan bir ihlal uydurur.

   ── TARİH YOKSA DA SAYAÇ YOKTUR ───────────────────────────────────────
   Bir aktarımın bildirim tarihi girilmemişse sayaç ÇALIŞMAZ (KVK-ENV-001).
   Bugünü varsayıp geri saymak, kurumun yapmadığı bir bildirime tarih
   atfetmek ve olmayan bir gecikme uydurmak olurdu.
   ═══════════════════════════════════════════════════════════════════════ */

/** Sayaç konusu — satırın VARLIĞI yükümlülüğün varlığıdır. */
export const SURE_KONULARI = [
  'basvuru_yanit',
  'aktarim_bildirim_standart_sozlesme',
] as const;
export type SureKonusu = (typeof SURE_KONULARI)[number];

/** Paketten gelen süre kuralı. */
export type SureKurali = {
  konu: string;
  /** `null` = süre BELİRLENMEDİ. Sıfır değildir. */
  gun: number | null;
  isGunu: boolean;
  /** Hafta sonu günleri (0 = Pazar … 6 = Cumartesi); `null` = varsayım. */
  haftaSonu: number[] | null;
  dayanak: string;
  aktif: boolean;
};

const GUN_MS = 24 * 60 * 60 * 1000;

/** Ürünün hafta sonu VARSAYIMI — beyan edilir, gizlenmez. */
export const VARSAYILAN_HAFTA_SONU = [0, 6] as const;

export const VARSAYIM_SOZU =
  'Hafta sonu Cumartesi–Pazar varsayıldı (paket belirtmedi);'
  + ' resmî tatiller hesaba KATILMADI — tatil takvimi pakette yok.';

export const SURESIZ_SOZU = 'Süre belirlenmedi — geri sayım yok.';
export const TARIHSIZ_SOZU = 'Bildirim tarihi girilmedi — sayaç çalışmaz.';

/**
 * Bir tarihe `gun` kadar İŞ GÜNÜ ekler.
 *
 * Hafta sonu ülkeye göre değişir (Körfez'de Cuma–Cumartesi); bu yüzden
 * küme dışarıdan gelir ve gelmezse ürün Cumartesi–Pazar VARSAYAR ve
 * varsayımı ekranda söyler. RESMÎ TATİL hesaba katılmaz: tatil takvimi
 * pakette yoktur ve ürün bir tatil listesi UYDURMAZ.
 */
export function isGunuEkle(
  baslangicMs: number, gun: number, haftaSonu: readonly number[] = VARSAYILAN_HAFTA_SONU,
): number {
  /* Hafta sonu kümesi HER GÜNÜ kapsıyorsa döngü sonsuza giderdi: böyle
     bir yapılandırma bir kural değil, bir kusurdur ve öyle söylenir. */
  if (haftaSonu.length >= 7) {
    throw new Error('Hafta sonu kümesi haftanın tamamını kapsıyor — iş günü kalmıyor.');
  }
  let kalan = Math.max(0, Math.trunc(gun));
  let simdi = baslangicMs;
  while (kalan > 0) {
    simdi += GUN_MS;
    if (!haftaSonu.includes(new Date(simdi).getUTCDay())) kalan -= 1;
  }
  return simdi;
}

/** Takvim günü ekler — iş günü olmayan sayaçlar için. */
export function takvimGunuEkle(baslangicMs: number, gun: number): number {
  return baslangicMs + Math.max(0, Math.trunc(gun)) * GUN_MS;
}

/** Kurala göre son tarih; kural yoksa ya da süresizse `null`. */
export function sonTarih(baslangicMs: number, kural: SureKurali | null): number | null {
  if (!kural || !kural.aktif || kural.gun === null) return null;
  return kural.isGunu
    ? isGunuEkle(baslangicMs, kural.gun, kural.haftaSonu ?? VARSAYILAN_HAFTA_SONU)
    : takvimGunuEkle(baslangicMs, kural.gun);
}

/* ── GERİ SAYIM ────────────────────────────────────────────────────── */

export type GeriSayim =
  | { sureVar: false; soz: string }
  | { sureVar: true; sonTarihMs: number; kalanMs: number; gecti: boolean; soz: string };

export function geriSayim(o: {
  baslangicMs: number; simdiMs: number; kural: SureKurali | null;
}): GeriSayim {
  const st = sonTarih(o.baslangicMs, o.kural);
  if (st === null) return { sureVar: false, soz: SURESIZ_SOZU };
  const kalanMs = st - o.simdiMs;
  const gecti = kalanMs < 0;
  const gun = Math.floor(Math.abs(kalanMs) / GUN_MS);
  const saat = Math.floor((Math.abs(kalanMs) % GUN_MS) / (60 * 60 * 1000));
  return {
    sureVar: true, sonTarihMs: st, kalanMs, gecti,
    soz: gecti ? `${gun} gün ${saat} saat GECİKME` : `${gun} gün ${saat} saat kaldı`,
  };
}
