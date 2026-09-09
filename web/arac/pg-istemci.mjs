#!/usr/bin/env node
/* PRISMA İSTEMCİSİ SAĞLAYICIYA BAĞLIDIR — ölçüldü (R5, 9 Eylül 2026).
   ═══════════════════════════════════════════════════════════════════════
   `@prisma/adapter-pg` ile SQLite şemasından üretilmiş istemci ÇALIŞMAZ:

     PrismaClientInitializationError: The Driver Adapter `@prisma/adapter-pg`,
     based on `postgres`, is not compatible with the provider `sqlite`
     specified in the Prisma schema.

   Yani "sağlayıcıyı ortam değişkeninden seç" YETMEZ: istemcinin KENDİSİ
   sağlayıcıya göre üretilmiş olmalıdır. `docs/POSTGRES_READINESS.md` bunu
   saymıyordu; sayması gereken bağımlılıklardan biriydi.

   Bu araç `prisma/schema.prisma`yı TEK MODEL KAYNAĞI olarak tutar ve
   yalnız datasource satırını PostgreSQL yapıp istemciyi yeniden üretir.
   Şema dosyası DEĞİŞTİRİLMEZ; geçici kopya `.parti/` altındadır ve
   silindiği doğrulanır.

   Kullanım: node arac/pg-istemci.mjs            → PostgreSQL istemcisi
             node arac/pg-istemci.mjs --sqlite   → SQLite istemcisi (geri dön)

   Kurulum (P7) hangi sağlayıcıya kurulacaksa BUNU koşar. Geliştirme ve
   demo SQLite'ta kalır; `npm run istemci` varsayılana döndürür.
   ═══════════════════════════════════════════════════════════════════════ */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEMA = path.join(WEB, 'prisma', 'schema.prisma');
const SQLITE_BLOK = 'datasource db {\n  provider = "sqlite"\n}';

function uret(saglayici) {
  const ham = readFileSync(SEMA, 'utf8');
  if (!ham.includes(SQLITE_BLOK)) throw new Error('şemanın datasource bloğu beklenen biçimde değil — araç sessizce yanlış istemci üretmesin diye durdu');
  if (saglayici === 'sqlite') {
    const r = spawnSync(path.join(WEB, 'node_modules', '.bin', 'prisma'), ['generate'], { cwd: WEB, encoding: 'utf8', stdio: 'inherit' });
    if (r.status !== 0) throw new Error('prisma generate başarısız');
    return SEMA;
  }
  const yuva = path.join(WEB, '.parti');
  mkdirSync(yuva, { recursive: true });
  const calisma = mkdtempSync(path.join(yuva, 'pg-istemci-'));
  try {
    /* Çıktı yolu ŞEMANIN yerine göre çözülür; geçici şema `.parti/` altında
       olduğu için `output` da oradan `lib/prisma-client`e göre yazılır. */
    const cikti = path.relative(calisma, path.join(WEB, 'lib', 'prisma-client'));
    const sema = path.join(calisma, 'schema.prisma');
    writeFileSync(sema, ham
      .replace(SQLITE_BLOK, 'datasource db {\n  provider = "postgresql"\n}')
      .replace('output   = "../lib/prisma-client"', `output   = ${JSON.stringify(cikti)}`));
    const ayar = path.join(calisma, 'prisma.config.ts');
    writeFileSync(ayar, [
      "import { defineConfig } from 'prisma/config';",
      'export default defineConfig({',
      `  schema: ${JSON.stringify(sema)},`,
      "  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://yok@127.0.0.1:1/yok' },",
      '});',
      '',
    ].join('\n'));
    const r = spawnSync(path.join(WEB, 'node_modules', '.bin', 'prisma'), ['generate', '--config', ayar], { cwd: WEB, encoding: 'utf8', stdio: 'inherit' });
    if (r.status !== 0) throw new Error('prisma generate (postgresql) başarısız');
    return sema;
  } finally {
    rmSync(calisma, { recursive: true, force: true });
    if (existsSync(calisma)) throw new Error(`geçici dizin silinemedi: ${calisma}`);
  }
}

const saglayici = process.argv.includes('--sqlite') ? 'sqlite' : 'postgresql';
uret(saglayici);
console.log(`Prisma istemcisi yeniden üretildi · sağlayıcı: ${saglayici}`);
