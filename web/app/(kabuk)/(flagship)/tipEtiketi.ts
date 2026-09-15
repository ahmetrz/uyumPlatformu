import { tipAdi } from '@/components/kabuk/tip';

/* ═══ Tip etiketi — aynı ad, iki tip ═══════════════════════════════════
   Ölçüldü (15 Eyl 2026, ana sayfa · çekirdek mercek): enerji tohumunun
   `MERKEZ` tipi ile su tohumunun `SU-MERKEZ` tipi aynı görünen adı taşıyor
   ("Merkez BT"). Katman paneli birini üçlüde, ötekini kalan satırında
   yazıyordu; ekran aynı adı iki kez söylüyordu. Veri doğruydu, cümle
   belirsizdi — "tek tek doğru, birlikte tutarsız" sınıfı.

   Kural: görünen ad ÇAKIŞIYORSA etiket sektör adını taşır ("Merkez BT ·
   Su"); sektörü bilinmeyen tip kodunu taşır. Çakışma yoksa ad olduğu
   gibi kalır — tek sektörlü kiracı hiçbir ek görmez. Sektör sözcüğü
   çekirdeğe gömülmez: `Sektor.ad` veriden okunur (SAH-SDL-001). */
export type TipEtiketGirdisi = { kod: string; ad: string; sektorAd?: string | null };

export function tipEtiketleri(tipler: readonly TipEtiketGirdisi[]): Map<string, string> {
  const adSayaci = new Map<string, number>();
  for (const t of tipler) {
    const ad = tipAdi(t.kod, t.ad);
    adSayaci.set(ad, (adSayaci.get(ad) ?? 0) + 1);
  }
  /* İlk geçiş: çakışan ad sektörle ayrılır. */
  const aday = new Map<string, string>();
  for (const t of tipler) {
    const ad = tipAdi(t.kod, t.ad);
    aday.set(t.kod, (adSayaci.get(ad) ?? 0) < 2 || !t.sektorAd ? ad : `${ad} · ${t.sektorAd}`);
  }
  /* İkinci geçiş: hâlâ çakışan (sektörü de aynı ya da bilinmeyen) etiket
     kodla ayrılır — iki tip hiçbir zaman aynı etiketle çizilmez. */
  const etiketSayaci = new Map<string, number>();
  for (const e of aday.values()) etiketSayaci.set(e, (etiketSayaci.get(e) ?? 0) + 1);
  const sonuc = new Map<string, string>();
  for (const [kod, e] of aday) sonuc.set(kod, (etiketSayaci.get(e) ?? 0) < 2 ? e : `${e} · ${kod}`);
  return sonuc;
}
