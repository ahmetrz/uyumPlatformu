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

   ── EŞZAMANLI KOŞUM EZİLMEZ · İKİ AYRI DİŞ ────────────────────────────
   Aynı sunucuda başka bir koşum sürüyor olabilir ve onu ezmek, bir artığı
   bir tur daha taşımaktan KÖTÜDÜR. Bu yüzden iki ayrı diş vardır ve
   ikisi de bağımsızdır:

     1. SAHİP YAŞIYOR MU — `uyum_test_<pid>_…` adındaki pid canlıysa
        veritabanı dokunulmaz. Bu diş PID AD ALANINA BAĞLIDIR ve sınır
        budur: pid, veritabanını YARATAN sürecin ad alanındandır;
        `process.kill(pid, 0)` ise SÜPÜRÜCÜNÜN ad alanında değerlendirilir.
        Kapsayıcıdan koşan bir süpürme, host'ta canlı olan bir koşumun
        pid'ini "yok" görebilir (bağımsız inceleme bulgusu, PR #51 tur 1).

     2. BAĞLANTISI VAR MI — veritabanına açık bir oturum varsa (`pg_stat_
        activity`) DOKUNULMAZ, sahibinin pid'i ne derse desin. Bu diş ad
        alanından BAĞIMSIZDIR: bağlantıyı sunucunun kendisi görür. Birinci
        dişin körlüğünü kapatan diş budur.

   `WITH (FORCE)` KALDIRILDI ve bu düzeltmenin ta kendisidir: canlı
   bağlantıları KESEREK düşürmek, PostgreSQL'in "database is being
   accessed by other users" emniyet supabını kapatıyordu — yani birinci
   diş kandırıldığında ikinci bir savunma kalmıyordu. Bugün düşürme
   nazik: kullanımdaysa düşmez, `kalan`a yazılır ve bir sonraki tura
   kalır.

   PID YENİDEN KULLANILIR ve bu da bilinçli bir sınırdır: ölü bir pid'in
   numarasını başka bir süreç almışsa artık YETİM SAYILMAZ ve durur.

   ── SÜPÜRME YALNIZ TEST SUNUCUSUNA BAKAR ──────────────────────────────
   Hedef YALNIZ `TEST_PG_URL`dir. `PG_URL` geri düşüşü KALDIRILDI: o dize
   göç ve yönetim bağlantısıdır (`arac/pg-goc.mjs`), yani yalnız `PG_URL`
   ayarlı bir kabukta süpürme YÖNETİM SUNUCUSUNA yönelirdi. Bir temizlik
   aracının hedefini yanlış sunucuya çevirebilen bir geri düşüş, aracın
   kendisinden daha tehlikelidir.

   Kullanım:
     TEST_PG_URL=… node arac/pg-artik.mjs --say    → yetim artıkları say
     TEST_PG_URL=… node arac/pg-artik.mjs --supur  → süpür ve doğrula
   ═══════════════════════════════════════════════════════════════════════ */
import { spawnSync } from 'node:child_process';

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

/* ── ÖLÇÜM ARACI YOKSA FIRLATILMAZ, ADIYLA SÖYLENİR ────────────────────
   İlk yazım `execFileSync` kullanıyordu ve `psql` bulunamadığında ham bir
   `ENOENT` fırlatıyordu: koşum sebebi görünmeden kırmızı yanardı. Deponun
   kendi kalıbı bunu `arac/pg-goc.mjs`te çoktan çözmüş — `spawnSync` +
   `yokArac` bayrağı + "ÖLÇÜLMEDİ: psql bulunamadı". Aynısı burada.

   Ölçülemeyen bir temizlik TEMİZ SAYILMAZ: `ArtikHatasi` fırlatılır,
   çağıran onu "sızıntı var" ile karıştırmadan raporlar. */
export class ArtikHatasi extends Error {}

function psql(url, sql) {
  const r = spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-tAc', sql], { encoding: 'utf8' });
  if (r.error?.code === 'ENOENT') {
    throw new ArtikHatasi('psql bulunamadı — test artıkları ÖLÇÜLEMEDİ');
  }
  if (r.status !== 0) {
    throw new ArtikHatasi(`psql çıkışı ${r.status}: ${(r.stderr ?? '').trim().split('\n')[0]}`);
  }
  return (r.stdout ?? '').trim();
}

/** Sunucudaki test veritabanlarının adları (şablon dâhil değil). */
export function artikAdlari(url, calistir = psql) {
  const cikti = calistir(url, "SELECT datname FROM pg_database WHERE datname LIKE 'uyum\\_test\\_%'");
  return cikti.split('\n').map((s) => s.trim()).filter((s) => s && sahipPid(s) !== null);
}

/** Ad güvencesi ÇAĞIRANDA DEĞİL, FONKSİYON SINIRINDA. Bugün tek çağrı
    yolu `artikAdlari` süzgecinden geçiyor ve güvenli — ama iki fonksiyon
    da `export` ve yarın başka bir çağrı (ya da bir test yardımcısı) o
    süzgeçten geçmeyebilir (bağımsız inceleme, PR #51 tur 2). Kalıp zaten
    modülde; güvence onun yanında durmalı. */
function adiDogrula(ad) {
  if (!ARTIK_KALIBI.test(ad)) {
    throw new ArtikHatasi(`artık kalıbına uymayan ad reddedildi: ${JSON.stringify(ad)}`);
  }
}

/**
 * Veritabanına AÇIK OTURUM var mı?
 *
 * PID ad alanından BAĞIMSIZ ikinci diş: bağlantıyı sunucunun kendisi
 * görür, süpürücünün hangi kapsayıcıda koştuğunun önemi yoktur. Bir
 * koşum sürüyorsa işçisinin veritabanına bağlıdır.
 */
export function baglantiVar(url, ad, calistir = psql) {
  adiDogrula(ad);
  const s = calistir(url,
    `SELECT count(*) FROM pg_stat_activity WHERE datname = '${ad}'`);
  return Number(s) > 0;
}

/**
 * Verilen veritabanlarını düşürür ve DÜŞTÜĞÜNÜ ölçer.
 * "Sildim" diyen adım sildiğini ölçmelidir; başarısız olamayan bir adım
 * adım değildir.
 *
 * KULLANIMDAKİ veritabanı DÜŞÜRÜLMEZ: `kalan`a yazılır ve bir sonraki
 * tura kalır. Bu bir başarısızlık değil, ikinci diştir — ad alanı farkı
 * yüzünden yetim SANILAN canlı bir koşum burada kurtulur.
 *
 * DÖNÜŞ İKİ LİSTEDİR: `kalan` (düşmedi) ve `olculemedi` (ölçüm aracı
 * cevap vermedi). İkisi aynı şey değildir ve aynı kovaya atılmaları
 * `sizintiKarari`nin ayırdığı üç hâli geri birleştirirdi.
 */
export function dusur(url, adlar, calistir = psql, baglantiliMi = baglantiVar) {
  const kalan = [];
  const olculemedi = [];
  for (const ad of adlar) {
    try {
      adiDogrula(ad);
      if (baglantiliMi(url, ad, calistir)) { kalan.push(ad); continue; }
      calistir(url, `DROP DATABASE IF EXISTS "${ad}"`);
      const sayi = calistir(url, `SELECT count(*) FROM pg_database WHERE datname = '${ad}'`);
      if (sayi !== '0') kalan.push(ad);
    } catch (e) {
      /* "ÖLÇEMEDİM" İLE "DÜŞMEDİ" AYRI ŞEYLERDİR. Kör bir `catch`,
         `psql`in geçici bir hatasını da gerçek bir DROP reddini de aynı
         kovaya atıyordu ve `sizintiKarari`nin özenle ayırdığı üç hâl
         burada geri birleşiyordu (bağımsız inceleme, PR #51 tur 2). */
      if (e instanceof ArtikHatasi) olculemedi.push(ad); else kalan.push(ad);
    }
  }
  return { kalan, olculemedi };
}

/** Yetimleri süpürür. Döndürdüğü `kalan` boş değilse temizlik KIRIKTIR. */
export function yetimleriSupur(url, calistir = psql, yasiyorMu = sahipYasiyor,
  baglantiliMi = baglantiVar) {
  const hepsi = artikAdlari(url, calistir);
  const yetim = yetimleriSec(hepsi, yasiyorMu);
  const d = dusur(url, yetim, calistir, baglantiliMi);
  return { hepsi, yetim, kalan: d.kalan, olculemedi: d.olculemedi };
}

/**
 * SAF KARAR: koşum sonrası sızıntı var mı?
 *
 * Ayrı ve saf olması bilerek — aynı gerekçe `tabanKarari` ve
 * `yeniSatirKusurlari` için de yazılıydı: "sızıntı var" hâlini üretmek
 * için gerçekten bir koşumu `kill -9` ile öldürmek gerekmesin.
 *
 * ÜÇ HÂL AYRI ve ikisi "temiz" DEĞİLDİR:
 *   · `oncekiler === null` → ÖLÇÜLEMEDİ. Karşılaştırma tabanı yok;
 *     sızıntı İDDİA EDİLMEZ. Bağımsız inceleme (PR #51, tur 1) ölçtü:
 *     taban alınamadığında boş dizi varsayan bir okuma, koşumdan ÖNCE de
 *     var olan yetimleri "bu koşum bıraktı" diye yazıyordu — uydurulmuş
 *     bir sızıntı iddiası.
 *   · sızan yok → temiz.
 *   · sızan var → KIRMIZI; sayılan şey BU KOŞUMDA DOĞAN ve sahibi ÖLMÜŞ
 *     olanlardır, eşzamanlı bir koşumun canlı veritabanı değil.
 *
 * @param {string[]|null} oncekiler koşum öncesi liste; ölçülemediyse null
 * @param {string[]} sonrakiler koşum sonrası liste
 * @param {(a: string[]) => string[]} yetimSec yetim seçici (enjekte edilebilir)
 */
export function sizintiKarari(oncekiler, sonrakiler, yetimSec = yetimleriSec) {
  if (oncekiler === null || oncekiler === undefined) {
    return { hal: 'olculemedi', sizanlar: [] };
  }
  const once = new Set(oncekiler);
  const sizanlar = yetimSec(sonrakiler.filter((a) => !once.has(a)));
  return { hal: sizanlar.length > 0 ? 'sizinti' : 'temiz', sizanlar };
}

if (process.argv[1] && /pg-artik\.mjs$/.test(process.argv[1])) {
  /* YALNIZ `TEST_PG_URL`. Geri düşüş yok — başlıktaki gerekçe. */
  const url = process.env.TEST_PG_URL;
  if (!url) {
    console.error('ÖLÇÜLMEDİ: TEST_PG_URL yok — artık süpürmesi yapılamadı.');
    console.error('  `PG_URL` KABUL EDİLMEZ: o dize göç/yönetim bağlantısıdır ve '
      + 'süpürmeyi yanlış sunucuya yöneltebilir.');
    process.exit(1);
  }
  /* `ArtikHatasi` YAKALANIR. Modül başlığı bu sınıfı "ham `ENOENT`
     fırlatıyordu" diye düzelttiğini yazıyordu; düzeltme yalnız
     kütüphane yolundaydı ve CLI ölçemediğini YIĞIN İZİYLE söylüyordu
     (bağımsız inceleme, PR #51 tur 1). */
  try {
    const supur = process.argv.includes('--supur');
    const hepsi = artikAdlari(url);
    const yetim = yetimleriSec(hepsi);
    if (!supur) {
      console.log(`test veritabanı: ${hepsi.length} · yetim: ${yetim.length}`);
      process.exit(0);
    }
    const { kalan, olculemedi } = dusur(url, yetim);
    console.log(`süpürüldü: ${yetim.length - kalan.length - olculemedi.length} `
      + `· yetim: ${yetim.length} · toplam: ${hepsi.length}`);
    if (olculemedi.length > 0) {
      console.error(`ÖLÇÜLMEDİ: ${olculemedi.length} veritabanı için ölçüm aracı `
        + `cevap vermedi: ${olculemedi.join(', ')}`);
    }
    if (kalan.length > 0) {
      console.error(`TEMİZLİK KIRIK: düşürülemeyen ${kalan.length} veritabanı: ${kalan.join(', ')}`);
    }
    if (kalan.length > 0 || olculemedi.length > 0) process.exit(1);
  } catch (e) {
    const olculemedi = e instanceof ArtikHatasi;
    console.error(`${olculemedi ? 'ÖLÇÜLMEDİ' : 'ARTIK SÜPÜRMESİ DÜŞTÜ'}: `
      + `${(e?.message ?? String(e)).split('\n').find(Boolean) ?? ''}`);
    process.exit(1);
  }
}
