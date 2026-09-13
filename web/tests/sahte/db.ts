import { PrismaClient } from '@/lib/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { execFileSync } from 'node:child_process';

/* Test veritabanı ikizi.

   Değişmez: testler ASLA gerçek `prisma/dev.db` dosyasına yazmaz.
   Her yazma testi kendi geçici kopyasını açar ve `TEST_DB` ortam
   değişkenini **import'lardan önce** ayarlar.

   Önceki sürümde `process.env.TEST_DB ?? 'prisma/dev.db'` fallback'i vardı:
   TEST_DB'yi ayarlamayı unutan bir yazma testi geliştiricinin gerçek
   veritabanını sessizce bozuyordu. Artık fallback yok.

   Ama hata modül yüklenirken atılamaz: saf birim testleri (erisim,
   semantik, uygulanabilirlik) bu modülü dolaylı olarak yükler ve
   veritabanına hiç dokunmaz. Bu yüzden koruma TEMBELDİR — istemci ilk
   gerçekten kullanıldığında devreye girer. */

let gercekIstemci: PrismaClient | null = null;

function istemciAl(): PrismaClient {
  if (gercekIstemci) return gercekIstemci;
  const yol = process.env.TEST_DB;
  if (!yol) {
    throw new Error(
      'TEST_DB ayarlı değil. Veritabanına dokunan test, import satırlarından ÖNCE ' +
      "kendi kopyasını kurmalı:\n" +
      "  const kopya = path.join(os.tmpdir(), `test-${Date.now()}.db`);\n" +
      "  fs.copyFileSync('prisma/dev.db', kopya);\n" +
      "  process.env.TEST_DB = kopya;\n" +
      'Örnek için tests/motorlar.test.ts dosyasına bakın. ' +
      'Gerçek dev.db üzerine yazmak yasaktır.',
    );
  }
  if (yol.endsWith('prisma/dev.db') || yol.endsWith('prisma\\dev.db')) {
    throw new Error(
      `TEST_DB gerçek geliştirme veritabanını gösteriyor (${yol}). ` +
      'Testler kopya üzerinde çalışır; gerçek dev.db değiştirilemez.',
    );
  }
  gercekIstemci = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${yol}` }),
  });
  return gercekIstemci;
}

/* ── PostgreSQL izolasyonu (R5) ────────────────────────────────────────
   SQLite tarafında izolasyon DOSYA KOPYASIDIR; PostgreSQL'de dosya yoktur.
   İki seçenek ölçüldü:

   · Transaction geri alma — ÇALIŞMAZ. Testlerin kendisi `$transaction`
     kullanıyor (`paketiKur` tek işlemde yazar) ve Prisma etkileşimli
     transaction içinde iç içe transaction'ı desteklemez: dış transaction
     kurulunca kurulum testleri hata verir.
   · Şablondan KLON — çalışır ve seçilen budur. `CREATE DATABASE x
     TEMPLATE <şablon>` sunucu tarafında kopyalar; PostgreSQL'de "şemayı
     klonla" diye bir ilkel işlem YOKTUR, en yakın izolasyon birimi
     veritabanıdır. Her test dosyası kendi veritabanını alır, paralel
     koşucular birbirini görmez.

   Şablon `arac/pg-test-sablonu.mjs` ile kurulur (taban göçü + tohum).
   `TEST_PG_URL` yoksa bu yol hiç açılmaz — SQLite davranışı aynen kalır. */
export const PG_TEST = process.env.TEST_PG_URL ?? null;
const PG_SABLON = process.env.TEST_PG_SABLON ?? 'uyum_test_sablonu';
let pgAdi: string | null = null;

function psql(url: string, sql: string): string {
  return execFileSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-tAc', sql], { encoding: 'utf8' }).trim();
}
/* URL ayrıştırıcısıyla: yolu olmayan bir bağlantı dizesinde regex ana
   bilgisayarı eziyordu (bağımsız inceleme, P2). */
function pgUrl(url: string, db: string): string { const u = new URL(url); u.pathname = `/${db}`; return u.toString(); }

function pgIstemciAl(): PrismaClient {
  if (gercekIstemci) return gercekIstemci;
  const yonetim = PG_TEST!;
  pgAdi = `uyum_test_${process.pid}_${Math.floor(Math.random() * 1e9)}`;
  psql(yonetim, `CREATE DATABASE "${pgAdi}" TEMPLATE "${PG_SABLON}"`);
  gercekIstemci = new PrismaClient({ adapter: new PrismaPg({ connectionString: pgUrl(yonetim, pgAdi) }) });
  /* TEMİZLİK SON KOŞULUNU DOĞRULAR (bağımsız inceleme, P1): ilk sürüm önce
     `pgAdi`'yi boşaltıp DROP sonucunu hiç ölçmüyordu — silinmeyen veritabanı
     sessizce sızıyordu ve tekrar denenmiyordu. Bugün: bağlantı kapatılır,
     DROP koşulur, SİLİNDİĞİ ayrı bir sorguyla ölçülür ve silinmediyse
     GÜRÜLTÜLÜ düşülür; ad ancak doğrulandıktan sonra bırakılır. */
  const birak = () => {
    if (!pgAdi) return;
    const ad = pgAdi;
    try { void gercekIstemci?.$disconnect(); } catch { /* kapanışta bağlantı zaten düşmüş olabilir */ }
    try {
      psql(yonetim, `DROP DATABASE IF EXISTS "${ad}" WITH (FORCE)`);
      const kalan = psql(yonetim, `SELECT count(*) FROM pg_database WHERE datname = '${ad}'`);
      if (kalan !== '0') { console.error(`TEMİZLİK KIRIK: test veritabanı silinemedi: ${ad} (kalan ${kalan})`); return; }
      pgAdi = null;
    } catch (e) {
      console.error(`TEMİZLİK KIRIK: test veritabanı silinemedi: ${ad} — ${(e as Error).message.split('\n')[0]}`);
    }
  };
  process.once('exit', birak);
  process.once('beforeExit', birak);
  /* Sinyalle öldürülen işçi de temizlensin: `exit` kancası SIGINT/SIGTERM'de koşmaz. */
  for (const sinyal of ['SIGINT', 'SIGTERM'] as const) process.once(sinyal, () => { birak(); process.exit(130); });
  return gercekIstemci;
}

/* Proxy: modülü içe aktarmak bedava, ilk erişim koruma kapısından geçer. */
const secilenIstemci = () => (PG_TEST ? pgIstemciAl() : istemciAl());

export const db = new Proxy({} as PrismaClient, {
  get(_hedef, ozellik, alici) {
    return Reflect.get(secilenIstemci() as object, ozellik, alici);
  },
  has(_hedef, ozellik) {
    return Reflect.has(secilenIstemci() as object, ozellik);
  },
}) as PrismaClient;
