/* ═══════════════════════════════════════════════════════════════════════
   OT-49 · Gecikme yüzdelikleri — SAF MATEMATİK

   Yük üreticisinin (`arac/yuk.mjs`) kullandığı hesap burada durur ki
   testler ağa çıkmadan sınayabilsin.

   ── ORTALAMA YALAN SÖYLER ─────────────────────────────────────────────
   Bir API'nin ortalaması 80 ms olabilir ve kullanıcıların %5'i 4 saniye
   bekliyor olabilir. Performans hedefi bu yüzden yüzdelikle konur:
   p50 tipik deneyimi, p95 kötü günü, p99 en kötü dilimi söyler.

   ── ÖLÇÜLMEYEN YÜZDELİK "0 ms" DEĞİLDİR ───────────────────────────────
   Boş ölçüm kümesinde yüzdelik `null` döner. Sıfır dönmek, hiç
   ölçülmemiş bir ucu "anında yanıt veriyor" göstermek olurdu — bu
   belgedeki her sayaçta olduğu gibi burada da yasak.

   ── Yöntem: EN YAKIN SIRA (nearest-rank) ──────────────────────────────
   Ara değer üretilmez. 20 ölçümde p95, sıralı listenin 19. elemanıdır —
   gerçekten ölçülmüş bir değer. Doğrusal ara değer, hiç gözlenmemiş bir
   süreyi rapora yazardı. */

/**
 * Nearest-rank yüzdelik.
 * @param {number[]} degerler ölçülen süreler (ms)
 * @param {number} p 0–100
 * @returns {number|null} ölçüm yoksa null
 */
export function yuzdelik(degerler, p) {
  const temiz = degerler.filter((d) => typeof d === 'number' && Number.isFinite(d));
  if (temiz.length === 0) return null;
  if (!(p > 0 && p <= 100)) throw new Error(`Yüzdelik 0 ile 100 arasında olmalı: ${p}`);
  const sirali = [...temiz].sort((a, b) => a - b);
  const sira = Math.ceil((p / 100) * sirali.length);
  return sirali[Math.min(sira, sirali.length) - 1];
}

/**
 * Bir ölçüm kümesinin özeti.
 * `basarisiz` ayrı sayılır ve gecikme hesabına GİRMEZ: hata veren bir
 * isteğin süresi hızlı görünür ve p50'yi olduğundan iyi gösterir.
 */
export function ozetle(olcumler) {
  const basarili = olcumler.filter((o) => o.ok).map((o) => o.sureMs);
  const basarisiz = olcumler.filter((o) => !o.ok);
  return {
    istek: olcumler.length,
    basarili: basarili.length,
    basarisiz: basarisiz.length,
    /* Hata oranı ölçülemeyen bir şey değil: istek sayısı sıfırsa null. */
    hataOrani: olcumler.length === 0 ? null : basarisiz.length / olcumler.length,
    p50: yuzdelik(basarili, 50),
    p95: yuzdelik(basarili, 95),
    p99: yuzdelik(basarili, 99),
    enHizli: basarili.length ? Math.min(...basarili) : null,
    enYavas: basarili.length ? Math.max(...basarili) : null,
    /* Durum kodu dağılımı: 200'lerin arasına karışmış tek bir 500,
       yüzdeliklerde görünmez ama burada görünür. */
    durumlar: olcumler.reduce((h, o) => {
      const k = String(o.durum ?? 'ag_hatasi');
      h[k] = (h[k] ?? 0) + 1;
      return h;
    }, {}),
  };
}

/**
 * Oranla BİRLİKTE aranan mutlak fark (ms).
 *
 * Neden gerekli: 39 ms'den 62 ms'ye çıkmak %59'dur ama 23 ms'dir ve bu,
 * paylaşımlı bir makinede ölçüm gürültüsünün ta kendisidir. Yalnız orana
 * bakan bir kapı her koşuda rastgele "gerileme" bağırır; üç koşu sonra
 * kimse ona bakmaz ve gerçek gerileme de kaçar.
 *
 * Değer TAHMİN DEĞİL, ÖLÇÜMDÜR: aynı üretim yapısına arka arkaya koşulan
 * ölçümlerde p95 değerleri 32–80 ms bandında gezdi (aynı kod, aynı
 * makine, aynı veri). Yani gürültü bandı yaklaşık 50 ms. Eşik onun biraz
 * üstüne konur; bu bandın altındaki bir fark bu ortamda GERİLEME OLARAK
 * OKUNAMAZ ve öyle raporlanmaz.
 *
 * Bu, aracın dürüst sınırıdır ve gizlenmez: tek koşuluk bir fark, ancak
 * hem oranı hem bandı aşarsa iddia edilir.
 */
export const MUTLAK_TABAN_MS = 50;

/**
 * Taban dosyasıyla karşılaştırma.
 *
 * `esik` bir ORANDIR (0.25 = %25 yavaşlama). Taban yoksa `durum` DAİMA
 * `taban_yok`tur — ilk ölçümü "geçti" saymak, hiçbir şeye karşı
 * karşılaştırmadan başarı ilan etmek olurdu.
 */
export function tabanaGoreKarsilastir(simdiki, taban, esik = 0.25, mutlak = MUTLAK_TABAN_MS) {
  if (!taban) {
    return { durum: 'taban_yok', gerekce: 'Karşılaştırılacak taban ölçümü yok.' };
  }
  const sapmalar = [];
  for (const anahtar of ['p50', 'p95', 'p99']) {
    const yeni = simdiki[anahtar];
    const eski = taban[anahtar];
    if (yeni === null || yeni === undefined || eski === null || eski === undefined) {
      /* Ölçülemeyen yüzdelik "iyileşme" DEĞİLDİR ve "gerileme" de değil. */
      sapmalar.push({ anahtar, durum: 'olculmedi' });
      continue;
    }
    if (eski === 0) { sapmalar.push({ anahtar, durum: 'olculmedi' }); continue; }
    const oran = (yeni - eski) / eski;
    const fark = yeni - eski;
    sapmalar.push({
      anahtar, eski, yeni, oran, fark,
      durum: oran > esik && fark > mutlak ? 'geriledi' : 'kabul',
    });
  }
  const geri = sapmalar.filter((s) => s.durum === 'geriledi');
  return {
    durum: geri.length > 0 ? 'geriledi' : 'kabul',
    sapmalar,
    gerekce: geri.length > 0
      ? geri.map((s) => `${s.anahtar} ${s.eski}→${s.yeni} ms `
        + `(+${s.fark} ms · %${Math.round(s.oran * 100)})`).join(' · ')
      : 'Bütün yüzdelikler eşik içinde.',
  };
}
