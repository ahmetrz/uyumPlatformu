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

/* İSTEMCİ TEMBEL KURULUR — modül yüklenirken DEĞİL.

   Ölçüldü (P7, imaj derlemesi): `next build`, rota modüllerini yapılandırma
   toplamak için içe aktarır. İstemci modül gövdesinde kurulduğu için derleme
   makinesinde — veritabanı OLMAYAN ve olmaması gereken bir yerde — bir
   veritabanı istemcisi kuruluyordu. PostgreSQL istemcisiyle derlerken bu
   `Failed to collect page data` diye düştü: üretilmiş istemci `postgres`,
   `DATABASE_URL` derleme sırasında yok, sürücü SQLite seçiliyor, adaptör
   uyuşmuyor. SQLite'ta aynı kusur yıllarca sessiz kaldı çünkü iki taraf da
   tesadüfen SQLite'tı.

   Derleyen makine kurulum ortamı değildir: derleme bir bağlantı dizesi
   uydurarak değil, İSTEMCİYİ KURMAYARAK doğru olur. İlk gerçek sorguda
   kurulur; sağlayıcı uyuşmazlığı orada Prisma'nın kendi ADLI hatasıyla
   çıkar. */
let ornek: PrismaClient | undefined;

function istemci(): PrismaClient {
  ornek ??= globalForPrisma.prisma ?? istemciKur();
  /* Geliştirmede sıcak yeniden yükleme her seferinde yeni istemci kurar ve
     bağlantılar birikir; genel değişken bunu engeller. Üretimde süreç tek
     kez yüklendiği için gerekmez. */
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = ornek;
  return ornek;
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_hedef, ad) {
    const i = istemci() as unknown as Record<string | symbol, unknown>;
    const d = i[ad];
    /* Yöntem BAĞLANARAK döner: `db.$transaction` çağrısı `this`siz
       çağrılırsa Prisma içeride patlar. */
    return typeof d === 'function' ? d.bind(i) : d;
  },
  has(_hedef, ad) { return ad in (istemci() as unknown as object); },
});
