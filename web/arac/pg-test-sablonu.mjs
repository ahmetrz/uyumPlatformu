#!/usr/bin/env node
/* PostgreSQL TEST ŞABLONU (R5) — taban göçü + tohum, bir kez.
   ═══════════════════════════════════════════════════════════════════════
   SQLite tarafında her yazma testi `prisma/dev.db`nin kopyasını açar.
   PostgreSQL'de dosya yoktur: test dosyası kendi veritabanını ŞABLONDAN
   klonlar (`CREATE DATABASE … TEMPLATE`), şablon da burada kurulur.

   Şablon kurulduktan sonra `datallowconn=false` yapılır: PostgreSQL bir
   veritabanını ancak BAŞKA BAĞLANTI YOKKEN şablon olarak kullanır; açık
   bir bağlantı klonlamayı "source database is being accessed by other
   users" ile düşürür. Bu, testleri sebebi görünmeyen biçimde kırar.

   Kullanım: PG_URL=postgresql://… node arac/pg-test-sablonu.mjs
             (varsayılan şablon adı: uyum_test_sablonu · --ad ile değişir)

   Not: istemci SAĞLAYICIYA BAĞLIDIR — bu araçtan önce
   `node arac/pg-istemci.mjs` koşmalıdır (bkz. o dosyanın başlığı).
   ═══════════════════════════════════════════════════════════════════════ */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { GOC_DIZINI, WEB, pgSemasiYaz } from './pg-taban.mjs';
import { veritabaniniDegistir } from './pg-goc.mjs';

const url = process.env.PG_URL;
if (!url) { console.error('PG_URL ayarlı değil'); process.exit(1); }
const i = process.argv.indexOf('--ad');
const ad = i > -1 ? process.argv[i + 1] : 'uyum_test_sablonu';

const psql = (hedef, sql) => execFileSync('psql', [hedef, '-v', 'ON_ERROR_STOP=1', '-tAc', sql], { encoding: 'utf8' }).trim();
const hedefUrl = veritabaniniDegistir(url, ad);

psql(url, `UPDATE pg_database SET datallowconn = true WHERE datname = '${ad}'`);
psql(url, `DROP DATABASE IF EXISTS "${ad}" WITH (FORCE)`);
psql(url, `CREATE DATABASE "${ad}"`);

const yuva = path.join(WEB, '.parti');
mkdirSync(yuva, { recursive: true });
const calisma = mkdtempSync(path.join(yuva, 'pg-sablon-'));
try {
  const sema = pgSemasiYaz(calisma);
  const ayar = path.join(calisma, 'prisma.config.ts');
  writeFileSync(ayar, [
    "import { defineConfig } from 'prisma/config';",
    'export default defineConfig({',
    `  schema: ${JSON.stringify(sema)},`,
    `  migrations: { path: ${JSON.stringify(GOC_DIZINI)} },`,
    `  datasource: { url: ${JSON.stringify(hedefUrl)} },`,
    '});',
    '',
  ].join('\n'));
  const deploy = spawnSync(path.join(WEB, 'node_modules', '.bin', 'prisma'), ['migrate', 'deploy', '--config', ayar],
    { cwd: WEB, encoding: 'utf8', stdio: 'inherit' });
  if (deploy.status !== 0) throw new Error('migrate deploy başarısız');
  const tohum = spawnSync(path.join(WEB, 'node_modules', '.bin', 'tsx'), ['prisma/seed.ts'],
    { cwd: WEB, encoding: 'utf8', stdio: 'inherit', env: { ...process.env, DATABASE_URL: hedefUrl } });
  if (tohum.status !== 0) throw new Error('tohum başarısız');
} finally {
  rmSync(calisma, { recursive: true, force: true });
  if (existsSync(calisma)) throw new Error(`geçici dizin silinemedi: ${calisma}`);
}

/* Şablon KİLİTLENİR: açık bağlantı klonlamayı düşürür. */
psql(url, `UPDATE pg_database SET datallowconn = false WHERE datname = '${ad}'`);
const kayit = psql(url, `SELECT count(*) FROM pg_database WHERE datname = '${ad}' AND datallowconn = false`);
if (kayit !== '1') { console.error(`şablon kilitlenemedi: ${ad}`); process.exit(1); }
console.log(`PostgreSQL test şablonu hazır ve kilitli: ${ad}`);
