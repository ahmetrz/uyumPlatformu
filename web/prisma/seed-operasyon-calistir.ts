/* Operasyonel veriyi VAR OLAN veritabanına ekler — dev.db silinmez.
   İlgili tablolar boş olduğunda çalışır; dolu ise hiçbir şey yapmaz, çünkü
   denetim izi ve mevcut kayıtlar değişmez kabul edilir.

   Kullanım: npx tsx prisma/seed-operasyon-calistir.ts */
import { PrismaClient } from '../lib/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'node:path';
import { operasyonVerisi } from './seed-operasyon';

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${path.join(__dirname, 'dev.db')}` }),
});

async function main() {
  if (await db.tedarikci.count() > 0) {
    console.log('Operasyonel veri zaten var; hiçbir şey yapılmadı.');
    return;
  }
  await operasyonVerisi(db);
}

main().finally(() => db.$disconnect());
