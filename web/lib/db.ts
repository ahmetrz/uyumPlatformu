import { PrismaClient } from '@/lib/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import path from 'node:path';
import { SAGLAYICI } from '@/lib/veritabani';

/* Sürücü SAĞLAYICIDAN seçilir (`lib/veritabani.ts` tek kaynak):
   SQLite geliştirme ve demo için KALIR, PostgreSQL müşteri kurulumudur.
   `DATABASE_URL` yoksa bugünkü davranış aynen sürer — geliştirme
   kurulumunun hiçbir şey yapmasına gerek yoktur. */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function istemciKur(): PrismaClient {
  if (SAGLAYICI === 'postgresql') {
    const url = process.env.DATABASE_URL!;
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }
  const ham = process.env.DATABASE_URL;
  /* SQLite tarafında `DATABASE_URL` göreli olabilir (`file:./dev.db`);
     yokluğunda bugünkü sabit yol kullanılır. */
  const dosya = ham ? ham.replace(/^file:/i, '') : path.join(process.cwd(), 'prisma', 'dev.db');
  const mutlak = path.isAbsolute(dosya) ? dosya : path.join(process.cwd(), 'prisma', dosya.replace(/^\.\//, ''));
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${mutlak}` }) });
}

export const db = globalForPrisma.prisma ?? istemciKur();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
