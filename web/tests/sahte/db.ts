import { PrismaClient } from '@/lib/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

/* Test veritabanı: TEST_DB ortam değişkenindeki dosyaya bağlanır
   (testler seed'li dev.db'nin kopyasını kullanır — gerçek DB'ye dokunulmaz). */
const yol = process.env.TEST_DB ?? 'prisma/dev.db';
export const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${yol}` }) });
