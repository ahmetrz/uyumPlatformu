import { PrismaClient } from '@/lib/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

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

/* Proxy: modülü içe aktarmak bedava, ilk erişim koruma kapısından geçer. */
export const db = new Proxy({} as PrismaClient, {
  get(_hedef, ozellik, alici) {
    return Reflect.get(istemciAl() as object, ozellik, alici);
  },
  has(_hedef, ozellik) {
    return Reflect.has(istemciAl() as object, ozellik);
  },
}) as PrismaClient;
