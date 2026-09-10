import { geriSayim, type GeriSayim, type SureKurali } from './sureler';

/* ═══════════════════════════════════════════════════════════════════════
   R15 · VERİ SAHİBİ BAŞVURUSU — SAF KARAR

   ── MOTOR CEVABI YAZMAZ ───────────────────────────────────────────────
   Motorun yazabileceği TEK durum `suresi_gecti`dir. Bu yasak burada bir
   liste olarak durur (`MOTORUN_YAZABILECEGI`) ki motor tarafı onu tek
   yerden okusun ve bekçi tek yerden ölçsün — iki kopya, bir gün iki ayrı
   sıkılık demektir (R10 ile aynı gerekçe).

   `yanitlandi` bir İNSAN kararıdır ve `yanitMetni` bir insanın kalemidir:
   bir veri sahibine ürünün cevap yazması, kurumun adına beyanda
   bulunmaktır. Motor yalnız süreyi izler ve GÖREV açar.
   ═══════════════════════════════════════════════════════════════════════ */

export const BASVURU_DURUMLARI = [
  'yeni', 'incelemede', 'yanitlandi', 'reddedildi', 'suresi_gecti',
] as const;
export type BasvuruDurumu = (typeof BASVURU_DURUMLARI)[number];

export const BASVURU_DURUM_SOZU: Record<BasvuruDurumu, string> = {
  yeni: 'Yeni — inceleme bekliyor',
  incelemede: 'İncelemede',
  yanitlandi: 'Yanıtlandı',
  /* Ret bir KARARDIR ve gerekçe ister; başvurunun silinmesi değildir.
     Silinseydi denetçi "bu başvuru neden yanıtlanmadı" sorusunun
     cevabını hiçbir yerde bulamazdı. */
  reddedildi: 'Reddedildi (gerekçeli)',
  suresi_gecti: 'SÜRE GEÇTİ — hâlâ yanıtlanmadı',
};

export const BASVURU_DURUM_SINIFI:
Record<BasvuruDurumu, 'ok' | 'md' | 'bd' | 'unk' | 'pl'> = {
  yeni: 'md', incelemede: 'md', yanitlandi: 'ok', reddedildi: 'pl', suresi_gecti: 'bd',
};

/** MOTORUN yazabileceği durumlar — tek kaynak. */
export const MOTORUN_YAZABILECEGI: readonly BasvuruDurumu[] = ['suresi_gecti'];

export function motorYazabilirMi(durum: string): boolean {
  return (MOTORUN_YAZABILECEGI as readonly string[]).includes(durum);
}

/** Kapanmış başvuruya motor DOKUNMAZ. */
export function basvuruKapali(durum: string): boolean {
  return durum === 'yanitlandi' || durum === 'reddedildi';
}

export type BasvuruSatiri = {
  id: string;
  kod: string;
  alinmaMs: number;
  durum: string;
};

/**
 * Motorun bu başvuru için kararı; dokunmayacaksa `null`.
 *
 * KVK-ENV-002: süre geçince `suresi_gecti` işaretlenir ve GÖREV üretilir.
 * Cevap YAZILMAZ.
 */
export function basvuruKarari(o: {
  mevcutDurum: string;
  geri: GeriSayim;
}): BasvuruDurumu | null {
  if (basvuruKapali(o.mevcutDurum)) return null;
  /* SÜRE YOKSA "geçti" DE YOKTUR. Geçecek bir süre olmadan gecikme
     ilan etmek, olmayan bir ihlal uydurmaktır. */
  if (!o.geri.sureVar) return null;
  if (!o.geri.gecti) return null;
  if (o.mevcutDurum === 'suresi_gecti') return null; /* idempotent */
  return 'suresi_gecti';
}

/** Başvurunun geri sayımı — kural yoksa "süre belirlenmedi". */
export function basvuruGeriSayimi(o: {
  alinmaMs: number; simdiMs: number; kural: SureKurali | null;
}): GeriSayim {
  return geriSayim({ baslangicMs: o.alinmaMs, simdiMs: o.simdiMs, kural: o.kural });
}
