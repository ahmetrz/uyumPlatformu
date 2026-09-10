#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   POSTGRESQL TEST ARTIKLARI — SÜPÜRME VE KAPI [SIS-IZO-001]

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Kurulum provası sırasında yerel test PostgreSQL'inde **228 sızmış test
   veritabanı** bulundu (~4,1 GB; birimin tamamı 4,5 GB). Her biri
   `uyum_test_<pid>_<rastgele>` biçimindeydi — yani test koşumlarının
   şablondan klonladığı ve DÜŞÜRMEDİĞİ veritabanları.

   `tests/sahte/db.ts` içindeki temizlik kancası KUSURSUZ değildi, EKSİKTİ:
   `exit` · `beforeExit` · `SIGINT` · `SIGTERM` dinliyor, DROP'u koşuyor ve
   silindiğini ayrı bir sorguyla ölçüyor. Ama bir süreç kancası
   `SIGKILL`i yakalayamaz — ne OOM öldürmesini, ne disk dolunca gelen
   ölümü. Bu depoda disk dolması ÖLÇÜLMÜŞ bir olaydır.

   Kusur ÜRETİLDİ (10 Eyl 2026): iki dosyalık bir PostgreSQL koşumu
   başlatıldı, koşucu `kill -9` ile öldürüldü — iki veritabanından biri
   arkada kaldı. Yani kanca yarışı kaybedebiliyor ve kaybettiğinde kimse
   görmüyor.

   ── ÇÖZÜM: SÜPÜRME KOŞUCUNUNDUR ───────────────────────────────────────
   Süreç kancası bir NEZAKETTİR; garanti değildir. Garantiyi koşum sahibi
   verir:

     · KOŞUMDAN ÖNCE — YETİM artıkları süpür (geçmişin borcu ödenir).
     · KOŞUMDAN SONRA — bu koşumda DOĞAN ve hâlâ duran veritabanı KALMAZ;
       kaldıysa süpürülür ve koşum KIRMIZI biter.

   ── EŞZAMANLI KOŞUM EZİLMEZ ───────────────────────────────────────────
   Aynı sunucuda başka bir koşum sürüyor olabilir. Bu yüzden ölçüt SAHİBİN
   YAŞAYIP YAŞAMADIĞIDIR: `uyum_test_<pid>_…` adındaki pid bu makinede
   canlıysa veritabanı DOKUNULMAZ. Sonrasındaki kapı da yalnız "benim
   koşumda doğan + sahibi ölmüş" olanları sayar; eşzamanlı bir koşumun
   canlı veritabanı ne süpürülür ne de kırmızı yakar.

   PID YENİDEN KULLANILIR ve bu bilinçli bir sınırdır: ölü bir pid'in
   numarasını başka bir süreç almışsa artık YETİM SAYILMAZ ve durur.
   Güvenli taraf budur — yanlışlıkla canlı bir koşumun veritabanını
   düşürmek, bir artığı bir tur daha taşımaktan kötüdür.

   Kullanım:
     node arac/pg-artik.mjs --say        → yetim artıkları say
     node arac/pg-artik.mjs --supur      → yetimleri süpür ve doğrula
   ═══════════════════════════════════════════════════════════════════════ */
import { execFileSync } from 'node:child_process';

/** Test veritabanı adının kalıbı — şablon (`uyum_test_sablonu`) HARİÇ. */
export const ARTIK_KALIBI = /^uyum_test_(\d+)_\d+$/;

/** Adı artık kalıbına uyuyorsa sahibinin pid'i, uymuyorsa null. */
export function sahipPid(ad) {
  const m = ARTIK_KALIBI.exec(ad);
  return m ? Number(m[1]) : null;
}

/**
 * Sahip süreç BU MAKİNEDE yaşıyor mu?
 *
 * `process.kill(pid, 0)` sinyal göndermez, yalnız erişilebilirliği sorar:
 * `ESRCH` → süreç yok · `EPERM` → var ama bizim değil (yani YAŞIYOR).
 */
export function sahipYasiyor(pid, oldur = process.kill.bind(process)) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { oldur(pid, 0); return true; } catch (e) { return e?.code === 'EPERM'; }
}

/** Yetim = adı artık kalıbına uyan ve sahibi ölmüş veritabanı. */
export function yetimleriSec(adlar, yasiyorMu = sahipYasiyor) {
  return adlar.filter((ad) => {
    const pid = sahipPid(ad);
    return pid !== null && !yasiyorMu(pid);
  });
}

function psql(url, sql) {
  return execFileSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-tAc', sql], { encoding: 'utf8' }).trim();
}

/** Sunucudaki test veritabanlarının adları (şablon dâhil değil). */
export function artikAdlari(url, calistir = psql) {
  const cikti = calistir(url, "SELECT datname FROM pg_database WHERE datname LIKE 'uyum\\_test\\_%'");
  return cikti.split('\n').map((s) => s.trim()).filter((s) => s && sahipPid(s) !== null);
}

/**
 * Verilen veritabanlarını düşürür ve DÜŞTÜĞÜNÜ ölçer.
 * "Sildim" diyen adım sildiğini ölçmelidir; başarısız olamayan bir adım
 * adım değildir.
 */
export function dusur(url, adlar, calistir = psql) {
  const kalan = [];
  for (const ad of adlar) {
    try {
      calistir(url, `DROP DATABASE IF EXISTS "${ad}" WITH (FORCE)`);
      const sayi = calistir(url, `SELECT count(*) FROM pg_database WHERE datname = '${ad}'`);
      if (sayi !== '0') kalan.push(ad);
    } catch { kalan.push(ad); }
  }
  return kalan;
}

/** Yetimleri süpürür. Döndürdüğü `kalan` boş değilse temizlik KIRIKTIR. */
export function yetimleriSupur(url, calistir = psql, yasiyorMu = sahipYasiyor) {
  const hepsi = artikAdlari(url, calistir);
  const yetim = yetimleriSec(hepsi, yasiyorMu);
  return { hepsi, yetim, kalan: dusur(url, yetim, calistir) };
}

if (process.argv[1] && /pg-artik\.mjs$/.test(process.argv[1])) {
  const url = process.env.TEST_PG_URL || process.env.PG_URL;
  if (!url) {
    console.error('ÖLÇÜLMEDİ: TEST_PG_URL (ya da PG_URL) yok — artık süpürmesi yapılamadı.');
    process.exit(1);
  }
  const supur = process.argv.includes('--supur');
  const hepsi = artikAdlari(url);
  const yetim = yetimleriSec(hepsi);
  if (!supur) {
    console.log(`test veritabanı: ${hepsi.length} · yetim: ${yetim.length}`);
    process.exit(0);
  }
  const kalan = dusur(url, yetim);
  console.log(`süpürüldü: ${yetim.length - kalan.length} · yetim: ${yetim.length} · toplam: ${hepsi.length}`);
  if (kalan.length > 0) {
    console.error(`TEMİZLİK KIRIK: düşürülemeyen ${kalan.length} veritabanı: ${kalan.join(', ')}`);
    process.exit(1);
  }
}
