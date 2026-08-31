/* Risk ve bulgu verisini var olan veritabanına ekler; dev.db silinmez.
   Kullanım: npx tsx prisma/seed-risk-bulgu-calistir.ts */
import { PrismaClient } from '../lib/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'node:path';
import { riskVeBulgu } from './seed-risk-bulgu';

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${path.join(__dirname, 'dev.db')}` }),
});

riskVeBulgu(db).finally(() => db.$disconnect());
