/* ═══ İMHA KAPSAMININ TEK KOŞULU ═══════════════════════════════════════

   Saklama politikası dolduğunda hangi satırların imhaya gireceği burada
   karar verilir. Saf katmandadır ve bunun iki sebebi var: karar bir İŞ
   KURALIDIR (veritabanı sorgusu değil), ve `lib/eylemler2/saklama.ts`
   bir `'use server'` dosyasıdır — oradan sabit ihraç edilemez
   (URN-KUR-010; bekçi bunu yakaladı).

   ── NEDEN TEK NÜSHA ───────────────────────────────────────────────────
   Bağımsız inceleme bulgusu (P2, #47 turu 2): öneri sayımı (dört göze
   sunulan rakam) ve gerçek silme KENDİ koşullarını ayrı ayrı yazıyordu.
   Koruma yalnız silmeye eklenince öneri "100 kanıt imha edilecek" diyor,
   onay alınıyor, gerçekte 90 siliniyor ve fark hiçbir yerde
   AÇIKLANMIYORDU — iz yalnız "(öneri anında 100 ölçülmüştü)" yazıyor,
   NEDEN farklı olduğunu söylemiyordu. İki nüsha ayrı ayrı bayatlar.

   ── BAĞLI KAYIT İMHA EDİLMEZ ──────────────────────────────────────────
   Aşağıdaki bağların hepsi şemada `ON DELETE SET NULL` taşır: bağlı
   satır silinince öbür taraftaki referans SESSİZCE düşer. Bir uyum
   ürününde bu, zincirin ortasından bir halkanın yok olmasıdır — kayıt
   "gönderildi" ya da "bu talebi şu kanıt karşıladı" demeye devam eder,
   dayanağı yoktur.

   Saklama politikası KURUMUN kararıdır; ürün onu geçersiz kılmaz. Ürünün
   işi, o kararın denetim zincirini FARKINDA OLMADAN kesmesini
   engellemektir: bağ düştüğünde (kayıt arşivlendi, talep kapandı) satır
   süpürmeye normal şekilde girer. Koruma kalıcı bir muafiyet değil,
   zincir dururken geçerli bir kilittir.

   Ölçüldü: tur 1'de koruma YALNIZ `Kanit` → `BildirimKaydi` için
   eklenmişti; aynı dosyada, aynı `case`te iki komşu ilişki
   (`talepler` · `egitimKayitlari`) ve komşu bir `case` (`Bulgu` →
   `tekrarlar` · `riskler`) aynı sınıf kusuru taşımaya devam ediyordu. */

/** Yaş alanı aile başına değişir; imha kapsamı bu alanla ölçülür. */
export const YAS_ALANI: Record<string, string> = {
  /* Bulgunun yaşı TESPİT tarihinden sayılır: kaydın veritabanına ne
     zaman girdiği değil, olayın ne zaman görüldüğü. Saklama süresi de
     mevzuatta böyle yazılır. */
  Bulgu: 'tespitTarihi',
  Kanit: 'olusturuldu',
  IsKosusu: 'baslangic',
  ApiIstegi: 'zaman',
  Bildirim: 'olusturuldu',
  EskalasyonKaydi: 'zaman',
};

/** Bir satırı imhadan KORUYAN bağlar — hepsi `ON DELETE SET NULL`. */
export const BAGLI_KORUMA: Record<string, readonly string[]> = {
  Kanit: ['bildirimKayitlari', 'talepler', 'egitimKayitlari'],
  Bulgu: ['tekrarlar', 'riskler'],
};

/**
 * İmha kapsamının TEK koşulu — sayan da silen de bunu kullanır.
 *
 * Ayrı yazılsalardı biri korumayı alır öbürü almazdı; onay ekranındaki
 * sayı ile silinen sayı ayrışır ve fark kimseye görünmezdi.
 *
 * Bilinmeyen tip SESSİZ GEÇMEZ: boş koşul döndürmek "hepsini sil"
 * demektir ve bir imha aracında bu, yazılabilecek en pahalı varsayılan
 * olurdu.
 */
export function imhaKosulu(varlikTipi: string, esik: Date): Record<string, unknown> {
  const alan = YAS_ALANI[varlikTipi];
  if (!alan) throw new Error(`Bilinmeyen varlık tipi: ${varlikTipi}`);
  const kosul: Record<string, unknown> = { [alan]: { lt: esik } };
  for (const bag of BAGLI_KORUMA[varlikTipi] ?? []) kosul[bag] = { none: {} };
  return kosul;
}
