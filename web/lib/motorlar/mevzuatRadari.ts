import 'server-only';
import { db } from '../db';
import { AJAN, type Getirme } from '../mevzuat/radar';
import { mevzuatRadariniKos, type RadarKosusu } from '../uyum/mevzuatRadariKosumu';

/* ═══════════════════════════════════════════════════════════════════════
   R1 · MEVZUAT RADARI MOTORU

   Bu dosya, radarın AĞA ÇIKAN TEK YERİDİR ve bilerek incedir: bir
   `fetch` sarmalayıcısı ve zamanlanmış işin girişi. Karar katmanı
   (`lib/mevzuat/`) ile koşum (`lib/uyum/mevzuatRadariKosumu.ts`) ağsızdır
   ve bunu `tests/bekci/radar-agsiz.test.ts` ölçer.

   ── NE YAPMAZ ─────────────────────────────────────────────────────────
   Çerçeve sürümünü, regülasyon kaydını ve `MevzuatKaynagi.etkin` alanını
   DEĞİŞTİRMEZ. Yalnız aday ve tarama kaydı üretir; kararı insan verir.

   ── KİMLİĞİNİ SÖYLER ──────────────────────────────────────────────────
   `User-Agent` başlığı ürünün adını taşır. Kimliğini gizleyen bir
   tarayıcı, robots.txt'e uyduğunu söyleyemez: kaynak kime kural
   koyduğunu bilemez.
   ═══════════════════════════════════════════════════════════════════════ */

/** Kaynağa bir kez, kısa zaman aşımıyla gider. Hata FIRLATMAZ — döner. */
export async function getirmeyiYap(url: string): Promise<Getirme> {
  const iptal = new AbortController();
  const zamanlayici = setTimeout(() => iptal.abort(), 15_000);
  try {
    const y = await fetch(url, {
      redirect: 'follow',
      signal: iptal.signal,
      headers: { 'user-agent': `${AJAN} (uyum platformu · mevzuat radarı)` },
    });
    if (!y.ok) return { ok: false, httpKodu: y.status, hata: `HTTP ${y.status}` };
    return { ok: true, httpKodu: y.status, govde: await y.text() };
  } catch (e) {
    return { ok: false, httpKodu: null, hata: (e as Error).message };
  } finally {
    clearTimeout(zamanlayici);
  }
}

export type RadarSonucu = { islenen: number; uretilen: number; ayrinti: RadarKosusu };

/** Günlük koşu. Etkin olmayan ve engelli kaynağa HİÇ istek gitmez. */
export async function mevzuatRadariniIsle(): Promise<RadarSonucu> {
  const k = await mevzuatRadariniKos(db, { getir: getirmeyiYap });
  return { islenen: k.taranan, uretilen: k.acilanAday, ayrinti: k };
}
