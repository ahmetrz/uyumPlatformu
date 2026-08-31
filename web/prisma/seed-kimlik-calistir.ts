/* Yalnız kimlik & erişim tablolarını yeniden kurar (boşsa).
   Kullanım: npx tsx prisma/seed-kimlik-calistir.ts */
import { PrismaClient } from '../lib/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'node:path';
import { kimlikErisim } from './seed-operasyon';

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${path.join(__dirname, 'dev.db')}` }),
});

async function main() {
  if (await db.kimlikHesabi.count() > 0) {
    console.log('Kimlik verisi zaten var; hiçbir şey yapılmadı.');
    return;
  }
  await kimlikErisim(db);
  console.log(`Kimlik: ${await db.kimlikHesabi.count()} hesap · ` +
    `${await db.erisimAtamasi.count()} atama · ${await db.erisimIncelemesi.count()} inceleme`);
}

main().finally(() => db.$disconnect());
