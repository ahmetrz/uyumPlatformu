/* Belge kütüğünü var olan veritabanına ekler; dev.db silinmez.
   Kullanım: npx tsx prisma/seed-dokuman-calistir.ts */
import { PrismaClient } from '../lib/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'node:path';
import { dokumanKutugu } from './seed-dokuman';

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${path.join(__dirname, 'dev.db')}` }),
});

dokumanKutugu(db).finally(() => db.$disconnect());
