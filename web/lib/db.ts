import { PrismaClient } from '@/lib/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import path from 'node:path';
import { BAGLANTI, SAGLAYICI } from '@/lib/veritabani';

/* Sürücü SAĞLAYICIDAN seçilir (`lib/veritabani.ts` tek kaynak):
   SQLite geliştirme ve demo için KALIR, PostgreSQL müşteri kurulumudur.
   `DATABASE_URL` yoksa bugünkü davranış aynen sürer — geliştirme
   kurulumunun hiçbir şey yapmasına gerek yoktur. */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function istemciKur(): PrismaClient {
  /* SAĞLAYICI ve BAĞLANTI DİZESİ AYNI değerden okunur (`lib/veritabani.ts`).
     İlk sürümde sağlayıcı `TEST_PG_URL ?? DATABASE_URL`den, dizeyse yalnız
     `DATABASE_URL`den geliyordu: PostgreSQL seçilip `connectionString`
     `undefined` kalabiliyordu (bağımsız inceleme, P2). İki soru tek cevaptan
     çıkmalı — yoksa cevaplar bir gün ayrışır. */
  if (SAGLAYICI === 'postgresql') {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: BAGLANTI! }) });
  }
  /* SQLite tarafında dize göreli olabilir (`file:./dev.db`) ve SORGU DİZESİ
     taşıyabilir (`?connection_limit=1`); sorgu, dosya adının parçası değildir. */
  const dosya = BAGLANTI ? BAGLANTI.replace(/^file:/i, '').split('?')[0] : path.join(process.cwd(), 'prisma', 'dev.db');
  const mutlak = path.isAbsolute(dosya) ? dosya : path.join(process.cwd(), 'prisma', dosya.replace(/^\.\//, ''));
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${mutlak}` }) });
}

export const db = globalForPrisma.prisma ?? istemciKur();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
