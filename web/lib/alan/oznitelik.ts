/* ═══════════════════════════════════════════════════════════════════════
   ÖZNİTELİK OKUMA — sektör niteliklerine tek kapı (P1 · URN-ALN)

   Nitelikler `TesisOzellik` / `BirimOzellik` satırlarında yaşar. Bu dosya
   yalnız OKUMA yardımcısı verir; veritabanı ve React bilmez.

   ── SATIRIN YOKLUĞU ÖLÇÜMÜN YOKLUĞUDUR ────────────────────────────────
   `sayisalOzellik` bulamadığında `null` döner ve çağıran bunu 0 ile
   karıştırmamalıdır. Kolon devrinde bu ayrımı şema tutuyordu (`Float?`);
   satır devrinde tutan şey, arayanın `?? 0` yazmamasıdır. Bu yüzden
   yardımcı `varsayilan` parametresi ALMAZ — kolaylık olsun diye eklenen
   böyle bir parametre, "bilinmeyen ≠ sıfır" kuralını sessizce delerdi.

   ── ANAHTARLAR NEDEN BURADA SABİT ─────────────────────────────────────
   `KURULU_GUC` GEÇİCİDİR. §0.5 çekirdeğin sektör terimi taşımamasını
   ister; nihai hâlde ekran, tesiste HANGİ öznitelikler varsa onları
   sektör şemasından gelen etiketle çizer ve hiçbir anahtarı adıyla
   bilmez. Bugün ekranlar hâlâ "kurulu güç" diye özel bir alan çiziyor;
   o ekranlar sözlük katmanına geçtiğinde (P1 · Aşama D/E) bu sabit
   düşer. Kolon adı zaten aynıydı — bu sabit yeni bir bağımlılık
   getirmiyor, mevcut olanı tek yere topluyor.
   ═══════════════════════════════════════════════════════════════════════ */

export type OzellikSatiri = {
  anahtar: string;
  sayisalDeger: number | null;
  metinDeger?: string | null;
};

/** GEÇİCİ — Aşama D/E'de sözlük katmanına devredilecek. */
export const KURULU_GUC = 'kuruluGucMw';

/** Sayısal öznitelik; satır yoksa ya da sayısal değilse `null` (ÖLÇÜLMEDİ). */
export function sayisalOzellik(
  ozellikler: readonly OzellikSatiri[] | null | undefined,
  anahtar: string,
): number | null {
  const o = ozellikler?.find((x) => x.anahtar === anahtar);
  return o?.sayisalDeger ?? null;
}

/** Metin özniteliği; satır yoksa `null`. */
export function metinOzellik(
  ozellikler: readonly OzellikSatiri[] | null | undefined,
  anahtar: string,
): string | null {
  const o = ozellikler?.find((x) => x.anahtar === anahtar);
  return o?.metinDeger ?? null;
}

/** Bir öznitelik listesinin sayısal toplamı; ölçülmemişler ATLANIR.
    Toplam, ölçülmüş olanların toplamıdır — eksikler sıfır sayılmaz.
    `olculen` kaç kayıttan geldiğini söyler ki ekran "17 tesisin 16'sı"
    diyebilsin. */
export function ozellikToplami(
  kayitlar: readonly { ozellikler: readonly OzellikSatiri[] }[],
  anahtar: string,
): { toplam: number; olculen: number; toplamKayit: number } {
  let toplam = 0;
  let olculen = 0;
  for (const k of kayitlar) {
    const d = sayisalOzellik(k.ozellikler, anahtar);
    if (d !== null) { toplam += d; olculen += 1; }
  }
  return { toplam, olculen, toplamKayit: kayitlar.length };
}

/** Sayısal özniteliğe göre AZALAN, eşitlikte ada göre artan sıralama.

    Kolon devrinde bunu veritabanı yapıyordu:
    `orderBy: [{ kuruluGucMw: 'desc' }, { ad: 'asc' }]`. Öznitelik bir
    ilişki olduğu için `orderBy` ona bakamıyor; sıra JS'e taşındı ve
    SQLite'ın davranışı BİREBİR korundu: `DESC` NULL'ları sona koyar,
    burada da ölçülmemiş olan sona iner. Ölçülmemişi başa almak, onu
    "en büyük" göstermek olurdu. */
export function ozelligeGoreSirala<T extends { ad: string; ozellikler: readonly OzellikSatiri[] }>(
  kayitlar: readonly T[],
  anahtar: string,
): T[] {
  return [...kayitlar].sort((a, b) => {
    const x = sayisalOzellik(a.ozellikler, anahtar);
    const y = sayisalOzellik(b.ozellikler, anahtar);
    if (x === null && y === null) return a.ad.localeCompare(b.ad, 'tr');
    if (x === null) return 1;
    if (y === null) return -1;
    if (x !== y) return y - x;
    return a.ad.localeCompare(b.ad, 'tr');
  });
}
