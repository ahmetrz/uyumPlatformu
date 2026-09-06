/* ═══════════════════════════════════════════════════════════════════════
   MARKA ADLARI — ürünün ve kiracının görünen adları

   ── NEDEN TEK DOSYA ──────────────────────────────────────────────────
   Ürünün adı GEÇİCİDİR. `docs/URUN_VIZYONU.md` §10: bugünkü ad tanımlayıcı
   bir çalışma adıdır, kalıcı marka değildir ve marka taraması yapılmadan
   kalıcıya geçilmez. Ad koda gömülürse değiştirmek bir tarama–değiştir
   turu olur ve her turda bir yer atlanır; o yer de en görünür yerde
   (sekme başlığı, hata ekranı) yakalanır.

   Bu yüzden ad TEK yerden gelir ve değiştirmek TEK satırdır. Kural
   `docs/GELISTIRME_PAKETLERI.md` P0 · URN-KUR-004 ile ölçülür: bu dosya
   dışında hiçbir kod dosyasında ürün adı düz metin geçmez.

   ── NEDEN `NEXT_PUBLIC_` ─────────────────────────────────────────────
   Ad hem sunucuda (sayfa `metadata`'sı, API sözleşmesi) hem istemcide
   (kabuk sözcük markası, `global-error`) görünür. `NEXT_PUBLIC_` öneki
   olmadan istemci paketinde değer `undefined` iner ve iki taraf farklı
   ad gösterir — hidrasyon uyuşmazlığı ve daha kötüsü, yalan bir başlık.
   Değer derleme zamanında gömülür; statik demo derlemesi de aynı yolu
   kullanır.

   ── KİRACI ADI AYRI ──────────────────────────────────────────────────
   `KIRACI_AD` kurulumun kendi adıdır, ürünün adı değildir; kabuk sözcük
   markasının BİRİNCİ satırıdır. Bugün tek kurulum var, bu yüzden ortam
   değişkeni. P2 (çok kiracılılık) bunu `Kiraci.markaAd` alanına taşır ve
   burası yalnız kiracısı çözülemeyen yüzeyler (giriş, hata ekranı) için
   varsayılan kalır.

   ── BÜYÜK HARF ───────────────────────────────────────────────────────
   Adı BURADA büyük harfe çevirmiyoruz: `toLocaleUpperCase('tr-TR')`
   çağrısı gösterim kararıdır ve çağıran yerde durur (depo kalıbı). Ad
   sabitinin kendisi okunur biçimde kalır ki belgede ve künyede aynı
   dizge kullanılabilsin.
   ═══════════════════════════════════════════════════════════════════════ */

/** Ürünün görünen adı. Geçici tanımlayıcı ad — `docs/URUN_VIZYONU.md` §10. */
export const MARKA_AD = process.env.NEXT_PUBLIC_MARKA_AD?.trim() || 'Uyum ve Yönetişim Platformu';

/** Kurulumun (kiracının) görünen adı; kabuk sözcük markasının ilk satırı. */
export const KIRACI_AD = process.env.NEXT_PUBLIC_KIRACI_AD?.trim() || 'Demo Enerji';

/** Sekme başlığı şablonu: ekran adı + ürün adı. */
export const BASLIK_SABLONU = `%s — ${MARKA_AD}`;
