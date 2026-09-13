/* Ekranın "şimdi"si — sunucu ve tarayıcı AYNI anı görsün diye.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Göreli zaman ("+12 g", "gecikmiş", "destek bitti") bir KARAR üretir ve
   o karar ekranda yazar. Karar `Date.now()` ile alınırsa sunucu bir
   sonuç, tarayıcı başka bir sonuç yazar; React bunu hidrasyon
   uyuşmazlığı sayar (#418) ve o alt ağacın sunucu çıktısını atar.

   Sorun geliştirme kipinde GÖRÜNMEZ: HTML her istekte üretildiği için
   iki taraf saniyeler arayla aynı günü görür. Statik yayında HTML
   derleme anında donar, ziyaretçi onu haftalar sonra açar — ve sayılar
   ayrışır. Ölçüldü: yayınlanan `/bulgular` HTML'i "19 Ağustos · +12 g"
   yazıyordu, tarayıcı aynı satıra "+102 g" yazıyordu.

   `bugunAn()` bir zamanlar bunu gün başına yuvarlayarak çözmeye
   çalışmıştı; o yalnız iki taraf AYNI GÜN çalıştığında işe yarar,
   statik yayında yaramaz.

   ── ÇÖZÜM ─────────────────────────────────────────────────────────────
   An bir kez SUNUCUDA belirlenir ve `<html data-an>` ile belgeye yazılır.
   Tarayıcı onu belgeden okur, kendi saatine BAKMAZ. Böylece iki taraf
   tanım gereği aynı sonucu üretir.

   Sunucuda çalışan (SSR) kurulumda değer her istekte tazelenir. Statik
   yayında derleme anında donar — veri de o anın anlık görüntüsü olduğu
   için doğrusu budur: sayılar birbirini tutar.
*/

/** Tarayıcıda bir kez okunup saklanır; sonraki çağrılar aynı anı verir. */
let onbellek: number | null = null;

/**
 * Ekranın şimdisi (epoch ms).
 *
 * Sunucuda gerçek saat; tarayıcıda belgeye yazılmış sunucu anı. İstemci
 * bileşenlerinde render sırasında `Date.now()` YERİNE bunu kullan.
 */
export function an(): number {
  if (typeof document === 'undefined') return Date.now();
  if (onbellek === null) {
    const ham = document.documentElement.dataset.an;
    const sayi = ham ? Number(ham) : NaN;
    /* Öznitelik yoksa (izole test, gömülü kullanım) gerçek saate düşeriz;
       sessizce yanlış bir tarihe düşmek, uyuşmazlıktan daha kötüdür. */
    onbellek = Number.isFinite(sayi) ? sayi : Date.now();
  }
  return onbellek;
}

/** Günün başlangıcına yuvarlanmış an — "bugün teslim" gecikmiş sayılmasın. */
const GUN = 86_400_000;
export function gunBasi(): number {
  return Math.floor(an() / GUN) * GUN;
}
