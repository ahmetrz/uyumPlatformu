import { geriSayim, type GeriSayim, type SureKurali, TARIHSIZ_SOZU } from './sureler';

/* ═══════════════════════════════════════════════════════════════════════
   R15 · YURT DIŞINA AKTARIM — SAF KARAR

   ── DÖRT DAYANAK ÜLKELER ÜSTÜDÜR, BİLDİRİM DEĞİLDİR ───────────────────
   Yeterlilik kararı · standart sözleşme · bağlayıcı kurumsal kural ·
   istisna: dördü de KVKK'da da GDPR'da da vardır ve çekirdeğin sözlüğü
   olabilirler. Hangi dayanağın MERCIE BİLDİRİM gerektirdiği ise ülkeye
   göre değişir — Türkiye standart sözleşme için bildirim ister, GDPR
   istemez. Bu yüzden bildirim yükümlülüğü çekirdekte DEĞİL, paketin
   koyduğu `VeriKorumaSuresi` satırının VARLIĞINDA yaşar.

   Ayrı bir `bildirimGerekli` bayrağı taşınmadı bilerek: satırı silinmiş
   ama bayrağı açık kalmış bir kural, kimsenin fark etmediği bir sayaç
   bırakırdı. Satır varsa yükümlülük var, yoksa yok.
   ═══════════════════════════════════════════════════════════════════════ */

export const AKTARIM_DAYANAKLARI = [
  'yeterlilik', 'standart_sozlesme', 'baglayici_kurumsal_kural', 'istisna',
] as const;
export type AktarimDayanagi = (typeof AKTARIM_DAYANAKLARI)[number];

export const DAYANAK_SOZU: Record<AktarimDayanagi, string> = {
  yeterlilik: 'Yeterlilik kararı bulunan ülke',
  standart_sozlesme: 'Standart sözleşme',
  baglayici_kurumsal_kural: 'Bağlayıcı kurumsal kural',
  istisna: 'İstisna hâli',
};

/** Bildirim yükümlülüğü doğuran dayanak — POZİTİF yüklem. */
export function bildirimDoguran(dayanak: string): boolean {
  return dayanak === 'standart_sozlesme';
}

export type AktarimDurumu =
  /** Bu dayanak bildirim gerektirmiyor ya da paket böyle bir süre koymamış. */
  | { hal: 'gerekmiyor'; soz: string }
  /** Yükümlülük var ama BİLDİRİM TARİHİ girilmedi — sayaç ÇALIŞMAZ. */
  | { hal: 'tarih_girilmedi'; soz: string }
  /** Yükümlülük var, tarih var, ama süre belirlenmemiş. */
  | { hal: 'sure_belirlenmedi'; soz: string }
  /** Sayaç işliyor. */
  | { hal: 'sayiyor'; geri: GeriSayim; soz: string };

/**
 * Bir aktarımın bildirim hâli.
 *
 * ── KVK-ENV-001 ───────────────────────────────────────────────────────
 * "Standart sözleşme dayanaklı aktarımda bildirim tarihi boşsa sayaç
 * ÇALIŞMAZ ve ekran 'bildirim tarihi girilmedi' der."
 *
 * Boş tarihi bugüne çekmek biçimsel olarak çalışan bir sayaç üretirdi ve
 * ekran, kurumun yapmadığı bir bildirime tarih atfederek olmayan bir
 * gecikme gösterirdi. Bir uyum ürününde uydurulmuş bir gecikme,
 * gösterilmemiş bir gecikmeden daha zararlıdır: insan ona göre iş yapar.
 */
export function aktarimBildirimDurumu(o: {
  dayanak: string;
  bildirimTarihiMs: number | null;
  kural: SureKurali | null;
  simdiMs: number;
}): AktarimDurumu {
  if (!bildirimDoguran(o.dayanak)) {
    return {
      hal: 'gerekmiyor',
      soz: 'Bu dayanak mercie bildirim gerektirmiyor.',
    };
  }
  if (!o.kural || !o.kural.aktif) {
    return {
      hal: 'gerekmiyor',
      soz: 'Kurulu paketlerde bu dayanak için bildirim süresi tanımlı değil'
        + ' — ürün bir yükümlülük UYDURMAZ.',
    };
  }
  if (o.bildirimTarihiMs === null) return { hal: 'tarih_girilmedi', soz: TARIHSIZ_SOZU };
  if (o.kural.gun === null) {
    return {
      hal: 'sure_belirlenmedi',
      soz: 'Bildirim yapıldı ama süre pakette belirlenmedi — geri sayım gösterilmez.',
    };
  }
  const geri = geriSayim({
    baslangicMs: o.bildirimTarihiMs, simdiMs: o.simdiMs, kural: o.kural,
  });
  return { hal: 'sayiyor', geri, soz: geri.soz };
}
