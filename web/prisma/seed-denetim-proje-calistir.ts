/* Denetim ve proje verisini var olan veritabanına ekler; dev.db silinmez.
   Kullanım: npx tsx prisma/seed-denetim-proje-calistir.ts */
import { PrismaClient } from '../lib/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'node:path';
import { denetimVeProje } from './seed-denetim-proje';

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${path.join(__dirname, 'dev.db')}` }),
});

denetimVeProje(db).finally(() => db.$disconnect());
