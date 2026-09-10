#!/usr/bin/env node
/* POSTGRESQL TEST KOŞUMU — sağlayıcı yaşam döngüsü ARACIN KENDİSİNDE.
   ═══════════════════════════════════════════════════════════════════════
   Testleri PostgreSQL'de koşturmak üç adım ister ve üçü de sıraya bağlıdır:

     1. Prisma istemcisini PostgreSQL için ÜRET (istemci sağlayıcıya
        bağlıdır — `arac/pg-istemci.mjs` başlığı).
     2. Test şablonunu kur (taban göçü + tohum).
     3. Testleri koştur.
     4. İstemciyi SQLite'a GERİ AL ve geri alındığını DOĞRULA.

   Dördüncü adım olmadan araç, koştuğu dizini bozuk bırakır: sonraki her
   SQLite kapısı "adaptör uyumsuz" diye kırmızı yanar ve sebebi görünmez.
   Bu, deponun "temizlik adımı SON KOŞULUNU doğrular" kuralının aynısıdır —
   geri alma başarısız olabilmelidir ve olduğunda KIRMIZIDIR.

   Adımlar iş akışına ayrı ayrı yazılsaydı `kapi:parti` onları kapı sanır,
   sıralarını bozar ve dizini PostgreSQL istemcisiyle bırakırdı. Bu yüzden
   döngü tek betiktedir; iş akışı da parti kapanışı da TEK kapı görür.

   Bağlantı: `TEST_PG_URL` (yoksa `PG_URL`). İkisi de yoksa ÖLÇÜLMEDİ ve
   KIRMIZI — koşulmayan kapı "geçti" yazılmaz.

   Kullanım: node arac/pg-test-kosumu.mjs [vitest argümanları]
   ═══════════════════════════════════════════════════════════════════════ */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aktifSaglayici } from './pg-istemci.mjs';
import { ArtikHatasi, artikAdlari, dusur, yetimleriSec, yetimleriSupur } from './pg-artik.mjs';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.TEST_PG_URL || process.env.PG_URL;

function kos(komut, args, cevre = {}) {
  const r = spawnSync(komut, args, { cwd: WEB, stdio: 'inherit', env: { ...process.env, ...cevre } });
  return r.status ?? 1;
}

/** İstemciyi SQLite'a geri alır ve GERİ ALINDIĞINI ölçer. */
function sqliteyeDon() {
  kos('node', ['arac/pg-istemci.mjs', '--sqlite']);
  const s = aktifSaglayici();
  if (s !== 'sqlite') {
    console.error(`\nTEMİZLİK KIRIK: Prisma istemcisi SQLite'a dönmedi (ölçülen: ${s}).`
      + ' Dizin bozuk bırakıldı; sonraki SQLite kapıları "adaptör uyumsuz" diye kırmızı yanar.');
    return false;
  }
  return true;
}

if (!url) {
  console.error('ÖLÇÜLMEDİ: TEST_PG_URL (ya da PG_URL) ayarlı değil — PostgreSQL test koşumu yapılamadı.');
  console.error('  yerelde:  TEST_PG_URL=postgresql://postgres@127.0.0.1:5432/postgres npm run test:pg');
  process.exit(1);
}

const sablon = process.env.TEST_PG_SABLON || 'uyum_test_sablonu';
const cevre = { PG_URL: process.env.PG_URL || url, TEST_PG_URL: url, TEST_PG_SABLON: sablon };

/* `prisma/dev.db` PostgreSQL koşusunda da GEREKİR — içeriği için değil,
   VARLIĞI için: doksan yedi test dosyası modül tepesinde koşulsuz
   `copyFileSync('prisma/dev.db', …)` çağırır ve dosya yoksa vitest o
   dosyaları HİÇ TOPLAYAMAZ ("Test Files 1 failed · Tests no tests").
   Bağımsız inceleme bulgusu (P1): CI'nın PostgreSQL işinde dev.db'yi kuran
   adım yoktu; yerelde dosya zaten durduğu için kusur görünmüyordu — yani
   "PostgreSQL'de tam küme yeşil" iddiası CI'da ÖLÇÜLEMEZDİ. */
function sqliteDosyasiVar() {
  const yol = path.join(WEB, 'prisma', 'dev.db');
  if (existsSync(yol)) return 0;
  console.log('prisma/dev.db yok — testlerin kopyaladığı dosya kuruluyor (SQLite şeması + tohum)');
  const d = kos(path.join(WEB, 'node_modules', '.bin', 'prisma'), ['migrate', 'deploy']);
  if (d !== 0) return d;
  /* Tohum ÜRETİLMİŞ istemciyi içe aktarır (`lib/prisma-client/client`) ve o
     dizin TAZE BİR ÇEKİMDE YOKTUR: `npm ci` üretmez. Ölçüldü (CI,
     `kapi-postgres`): tohum `Cannot find module '../lib/prisma-client/client'`
     ile düştü. Yerelde dizin zaten durduğu için kusur görünmüyordu — kapının
     ancak temiz bir çekimde ölçülebilen sınıfı. */
  const u = kos('node', ['arac/pg-istemci.mjs', '--sqlite']);
  if (u !== 0) return u;
  const t = kos(path.join(WEB, 'node_modules', '.bin', 'tsx'), ['prisma/seed.ts'], { DATABASE_URL: '' });
  if (t !== 0) return t;
  if (!existsSync(yol)) { console.error('prisma/dev.db kurulamadı'); return 1; }
  return 0;
}

/* ── ARTIK SÜPÜRMESİ KOŞUCUNUNDUR ──────────────────────────────────────
   `tests/sahte/db.ts` her işçi için bir veritabanı klonlar ve süreç
   kancalarıyla düşürür. Kanca kusursuz değil, EKSİKTİR: `SIGKILL`i,
   OOM öldürmesini ve disk dolunca gelen ölümü hiçbir kanca yakalayamaz.
   Kusur ÜRETİLDİ (10 Eyl 2026): iki dosyalık bir koşum `kill -9` ile
   öldürüldü, iki veritabanından biri arkada kaldı. Provada bulunan 228
   sızmış veritabanı da (~4,1 GB) bu sınıftandır.

   Bu yüzden garanti koşum sahibinin: ÖNCE yetimler süpürülür (geçmişin
   borcu), SONRA bu koşumda doğan ve hâlâ duran veritabanı KALMAZ —
   kalırsa süpürülür ve koşum KIRMIZI biter. Ayrıntı `arac/pg-artik.mjs`. */
let oncekiler = [];
try {
  const on = yetimleriSupur(url);
  oncekiler = artikAdlari(url);
  if (on.yetim.length > 0) {
    console.log(`artık süpürmesi: ${on.yetim.length - on.kalan.length} yetim veritabanı düşürüldü`);
  }
  if (on.kalan.length > 0) {
    console.error(`TEMİZLİK KIRIK: düşürülemeyen yetim: ${on.kalan.join(', ')}`);
  }
} catch (e) {
  console.error(`artık süpürmesi yapılamadı: ${e.message.split('\n')[0]}`);
}

let cikis = 0;
try {
  cikis = sqliteDosyasiVar();
  if (cikis === 0) cikis = kos('node', ['arac/pg-istemci.mjs'], cevre);
  if (cikis === 0) cikis = kos('node', ['arac/pg-test-sablonu.mjs', '--ad', sablon], cevre);
  if (cikis === 0) cikis = kos(path.join(WEB, 'node_modules', '.bin', 'vitest'), ['run', ...process.argv.slice(2)], cevre);
} finally {
  /* KOŞUM SONRASI ARTIK SIFIRDIR.
     Sayılan şey "sunucuda kaç test veritabanı var" DEĞİL: eşzamanlı bir
     koşumun canlı veritabanı ne süpürülür ne de kırmızı yakar. Sayılan
     şey BU KOŞUMDA DOĞAN ve sahibi ÖLMÜŞ olanlardır — yani sızıntının
     kendisi. */
  try {
    const sonrakiler = artikAdlari(url);
    const oncekiKume = new Set(oncekiler);
    const sizanlar = yetimleriSec(sonrakiler.filter((a) => !oncekiKume.has(a)));
    if (sizanlar.length > 0) {
      const kalan = dusur(url, sizanlar);
      console.error(`\nSIZINTI: koşum ${sizanlar.length} test veritabanı bıraktı `
        + `(${sizanlar.join(', ')}). Süpürüldü: ${sizanlar.length - kalan.length}.`
        + ' Test izolasyonu kendi veritabanını düşürmüyor — koşum KIRMIZI.');
      cikis = cikis || 1;
    }
  } catch (e) {
    /* ÜÇ HÂL AYRI: sızıntı VAR (yukarıda) · sızıntı YOK · ÖLÇÜLEMEDİ.
       Üçüncüsü "temiz" değildir ve öyle yazılmaz — ama testlerin kendi
       sonucunu da EZMEZ: kırmızı yalnız CI'da, çünkü orada ölçüm
       ortamı bizim elimizdedir ve ölçemeyen bir kapı bir kusurdur.
       Yerelde `psql` olmayabilir ve bu, koşumu kırmızı yakmaz. */
    const olculemedi = e instanceof ArtikHatasi;
    console.error(`${olculemedi ? 'ÖLÇÜLMEDİ' : 'artık ölçümü yapılamadı'}: `
      + `${e.message.split('\n')[0]}`);
    if (!olculemedi || process.env.CI) cikis = cikis || 1;
  }
  if (!sqliteyeDon()) cikis = cikis || 1;
}
process.exit(cikis);
