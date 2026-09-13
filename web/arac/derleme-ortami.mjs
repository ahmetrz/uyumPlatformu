/* DERLEME ORTAMI KAPISI — ölçüm ortamı da ölçülmesi gereken bir şeydir.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   7 Eyl 2026: oturumun yazılabilir disk payı %100'e dayandı. O turda
   kayıp olmadı, ama sessiz bir YANLIŞ-YEŞİL yolu açıyor:

     `next build` yer bitince YARIM bir `out/` bırakır; statik kapı o
     yarım siteyi ölçer ve "kusur yok" der.

   Kapı kırmızı yanmaz, çünkü ölçtüğü şey orada değildir. Bu, ürünün
   kendi kuralının araç tarafındaki karşılığıdır: ölçülmeyen şey "geçti"
   diye yazılmaz.

   ── İKİ AYRI SORU ─────────────────────────────────────────────────────
   1. `yerVarMi()` — DERLEMEDEN ÖNCE: yeter alan var mı? Yoksa derleme
      başlatılmaz; başlarsa yarım kalır ve kusur ölçüm anına taşınır.
   2. `ciktiTam()` — ÖLÇMEDEN ÖNCE: elimizdeki `out/` TAM mı? Bu soru
      alandan bağımsızdır — dizin geçmiş bir koşuda yarım kalmış olabilir
      ve o an bol yer bulunabilir. Rota envanterindeki her rotanın
      karşılığı çıktıda YOKSA ölçüm geçersizdir.

   İkisi ayrı: birincisi kusuru önler, ikincisi kusuru YAKALAR. Yalnız
   birincisini koymak, geçmişten kalan yarım bir çıktıyı görmezdi.

   ── EŞİK ÖLÇÜLDÜ, SEÇİLMEDİ ───────────────────────────────────────────
   Aynı gün, temiz ağaçta ölçüldü:
     `npm run build`                     net  78 MB  (`.next` 266 MB)
     `NEXT_PUBLIC_DEMO=1 next build`     net 185 MB  (`.next` 426 MB, `out/` 26 MB)
   Yani tam bir çevrim ~450 MB istiyor. Eşik 1024 MB: ölçülen ayak izinin
   iki katından biraz fazla — npm önbelleği, geçici dosya ve ikinci bir
   derleme için pay bırakır. Sayı ölçümden türedi; hedefe uydurulmadı.
*/
import { existsSync, readFileSync, statfsSync } from 'node:fs';
import path from 'node:path';
import { WEB, rotalarOku } from './kosu-ortak.mjs';

/** Derlemeye dayanan kapılar için asgari boş alan (MB) — yukarıda ölçüldü. */
export const ASGARI_MB = 1024;

/** Yolun bulunduğu dosya sisteminde boş alan (MB); ölçülemezse `null`. */
export function bosAlanMb(yol = WEB) {
  try {
    const s = statfsSync(yol);
    return Math.floor((s.bavail * s.bsize) / (1024 * 1024));
  } catch {
    return null;
  }
}

/**
 * Derlemeden ÖNCE: yer yeterli mi? Değilse GÜRÜLTÜLÜ düşer.
 *
 * `null` (ölçülemedi) kusur SAYILMAZ ama sessiz de geçmez: satır
 * "ölçülemedi" der. Bilinmeyen sıfır değildir; ama bilinmeyen yüzünden
 * çalışan bir kapıyı durdurmak da ölçmemekten kötüdür.
 */
export function yerVarMi(ad, gerekliMb = ASGARI_MB) {
  const bos = bosAlanMb();
  if (bos === null) {
    console.warn(`${ad}: boş alan ÖLÇÜLEMEDİ — derleme yine de denenecek.`);
    return true;
  }
  if (bos < gerekliMb) {
    console.error(`\n${ad}: DİSK YETERSİZ — ${bos} MB boş, en az ${gerekliMb} MB gerekli.`);
    console.error('  Derleme başlatılmadı. Yer bitince `next build` YARIM bir `out/`');
    console.error('  bırakır ve statik kapı o yarım siteyi "kusursuz" ölçer.');
    console.error('  Temizlik: rm -rf .next out  ·  npm cache clean --force\n');
    return false;
  }
  return true;
}

/** `rotalar.json` yolundan statik çıktıdaki dosya adayları. */
function adaylar(cikti, rota) {
  const y = rota === '' || rota === '/' ? '' : rota.replace(/^\//, '');
  return [
    path.join(cikti, y, 'index.html'),
    path.join(cikti, `${y}.html`),
    path.join(cikti, y || 'index.html'),
  ];
}

/**
 * Ölçmeden ÖNCE: statik çıktı TAM mı?
 *
 * Rota envanterindeki her DİNAMİK OLMAYAN rotanın karşılığı çıktıda
 * bulunmalı. `[id]` taşıyan rotalar dışarıda: onların üretilip
 * üretilmediği tohum verisine bağlıdır ve bu kapının sorusu o değil.
 *
 * Dönen `eksik` boş değilse ÖLÇÜM GEÇERSİZDİR — kapı "kusur yok"
 * dememeli, "ölçülmedi" demeli.
 */
export function ciktiTam(cikti) {
  const rotalar = rotalarOku()
    .map((r) => (typeof r === 'string' ? r : r.yol))
    .filter((r) => r !== undefined && !String(r).includes('['));
  const eksik = rotalar.filter((r) => !adaylar(cikti, String(r)).some((y) => existsSync(y)));
  return { toplam: rotalar.length, eksik };
}

/**
 * `ciktiTam` + gürültülü rapor. Kapının ilk satırında çağrılır.
 * `false` dönerse çağıran ÖLÇMEDEN çıkmalı (çıkış kodu 1).
 */
export function ciktiyiDogrula(ad, cikti) {
  if (!existsSync(cikti)) {
    console.error(`${ad}: statik çıktı yok → ${cikti}`);
    return false;
  }
  const { toplam, eksik } = ciktiTam(cikti);
  if (eksik.length > 0) {
    console.error(`\n${ad}: STATİK ÇIKTI YARIM — ${toplam} rotadan ${eksik.length} tanesi yok.`);
    for (const r of eksik.slice(0, 8)) console.error(`  eksik: ${r || '/'}`);
    if (eksik.length > 8) console.error(`  … +${eksik.length - 8} rota daha`);
    const bos = bosAlanMb();
    console.error(bos === null
      ? '  Boş alan ölçülemedi.'
      : `  Boş alan: ${bos} MB (derleme için asgari ${ASGARI_MB} MB).`);
    console.error('  ÖLÇÜM YAPILMADI: yarım bir siteyi ölçmek "kusur yok" yalanı üretir.');
    console.error('  Derlemeyi tekrarlayın: rm -rf .next out && npm run demo:build\n');
    return false;
  }
  return true;
}

/** Paket sürümü gibi küçük okumalar için — kapıların ortak ihtiyacı. */
export function paketSurumu() {
  return JSON.parse(readFileSync(path.join(WEB, 'package.json'), 'utf8')).version ?? null;
}
