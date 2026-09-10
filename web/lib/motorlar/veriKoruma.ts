import 'server-only';
import { db } from '../db';
import { veriKorumaSurelerini, type VeriKorumaKosusu } from '../uyum/veriKorumaKosumu';

/* ═══════════════════════════════════════════════════════════════════════
   R15 · VERİ SAHİBİ BAŞVURUSU SÜRE MOTORU

   Bu dosya ince: karar `lib/veriKoruma/`de, koşum
   `lib/uyum/veriKorumaKosumu.ts`de. Motor yalnız `server-only` kuşağını
   ve zamanlanmış işin girişini taşır.

   ── NE YAPMAZ ─────────────────────────────────────────────────────────
   · Başvuruya CEVAP YAZMAZ (`yanitMetni` alanına hiç dokunmaz).
   · `yanitlandi` ya da `reddedildi` YAZAMAZ — ikisi de insan kararıdır.
   · Aydınlatma metni ÜRETMEZ (R15 kapsam dışı, bilinçli).
   · Süre kuralı yoksa "süresi geçti" DEMEZ; süre uydurmaz.
   ═══════════════════════════════════════════════════════════════════════ */

export type VeriKorumaSonucu = {
  islenen: number; uretilen: number; ayrinti: VeriKorumaKosusu;
};

export async function veriKorumaSureleriniIsle(): Promise<VeriKorumaSonucu> {
  const k = await veriKorumaSurelerini(db, { simdiMs: Date.now() });
  return { islenen: k.suresiGecen + k.suresiz, uretilen: k.acilanGorev, ayrinti: k };
}
