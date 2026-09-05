import { PrismaClient } from '@/lib/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'node:path';

const dbYolu = path.join(process.cwd(), 'prisma', 'dev.db');

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${dbYolu}` }) });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
