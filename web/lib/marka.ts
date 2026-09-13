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

   ── `NEXT_PUBLIC_` DERLEME ANIDIR — KURULUM ANI DEĞİL (P7 · ölçüldü) ──
   `NEXT_PUBLIC_` öneki değeri İSTEMCİ PAKETİNE DERLEME ANINDA gömer.
   Sunucuda ise `process.env` çalışma anında okunur. İkisi aynı olduğu
   sürece (geliştirme, statik demo) sorun görünmez.

   Kurulumda görünür: tek imaj çok müşteriye kurulur ve ad compose ile
   ÇALIŞMA ANINDA verilir. Ölçüldü (compose duman kapısı): sunucu
   kurulumun adını, istemci derleme anındaki varsayılanı çizdi — 58
   sayfada hidrasyon uyuşmazlığı (React #418) ve hidrasyondan sonra
   ekranda YANLIŞ kiracı adı.

   Bu yüzden KURULUMU YANSITMASI GEREKEN yüzeyler adı SUNUCUDAN VERİ
   olarak alır (`kabukVerisi()` → `KabukVerisi.kiraciAd/markaAd`). Buradaki
   `NEXT_PUBLIC_` okumaları kiracısı çözülemeyen yüzeyler (giriş öncesi,
   `global-error`) ve sunucu tarafı için kalır: oralarda gösterilen ad
   kurulumun değil, ÜRÜNÜN adıdır ve derleme sabiti olması doğrudur.

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
