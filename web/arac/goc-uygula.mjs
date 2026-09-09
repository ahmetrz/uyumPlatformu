#!/usr/bin/env node
/* KURULUM GÖÇÜ — `DATABASE_URL` neyi gösteriyorsa o zinciri uygular (P7).
   ═══════════════════════════════════════════════════════════════════════
   İki sağlayıcı, İKİ ZİNCİR:
     · SQLite      → `prisma/migrations` (52 eklemeli göç)
     · PostgreSQL  → `prisma/postgres/migrations` (tek taban göçü)

   Yanlış zinciri uygulamak sessiz değildir ama geç fark edilir: Prisma
   `migration_lock.toml` sağlayıcısı uyuşmazsa reddeder. Bu araç zinciri
   BAĞLANTIDAN seçer, tahmin etmez.

   Göç uygulanmadan açılan bir sunucu ilk istekte tablo bulamaz ve kusur
   "uygulama bozuk" diye görünür; bu yüzden kurulum girişi ÖNCE bunu koşar
   ve başarısızsa sunucuyu HİÇ AÇMAZ.

   Kullanım: DATABASE_URL=… node arac/goc-uygula.mjs
   ═══════════════════════════════════════════════════════════════════════ */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL ayarlı değil — hangi veritabanına göç uygulanacağı bilinmiyor.');
  process.exit(1);
}

const postgres = /^postgres(ql)?:\/\//i.test(url);
const gocDizini = path.join(WEB, 'prisma', postgres ? path.join('postgres', 'migrations') : 'migrations');
if (!existsSync(gocDizini)) {
  console.error(`göç dizini yok: ${gocDizini}`);
  process.exit(1);
}

/* Şemanın datasource satırı sağlayıcıya göre çevrilir; şema dosyası
   DEĞİŞMEZ (tek model kaynağı) — geçici kopya üzerinde çalışılır.

   Geçici dizin UYGULAMA AĞACININ İÇİNDEDİR: `prisma/config` içe aktarımı
   `node_modules`tan çözülür ve `/tmp` altından çözülmez (ölçüldü:
   "Cannot find module 'prisma/config'"). */
const yuva = path.join(WEB, '.gecici');
try {
  mkdirSync(yuva, { recursive: true });
} catch (e) {
  /* Kurulumda uygulama ROOT DEĞİLDİR ve kod dizinine yazamaz (bilerek).
     Ham `EACCES` yığın izi operatöre "uygulama bozuk" gibi görünür;
     eksik olan tek şey YAZILABİLİR BİR DİZİNDİR ve o söylenir. */
  console.error(`göç için geçici dizin açılamadı: ${yuva} (${e.code ?? e.message}).`
    + ' Bu dizin uygulama kullanıcısına yazılabilir olmalıdır'
    + ' (imajda: mkdir -p /uygulama/.gecici && chown).');
  process.exit(1);
}
const calisma = mkdtempSync(path.join(yuva, 'goc-'));
try {
  const ham = readFileSync(path.join(WEB, 'prisma', 'schema.prisma'), 'utf8');
  const sema = path.join(calisma, 'schema.prisma');
  writeFileSync(sema, postgres
    ? ham.replace('datasource db {\n  provider = "sqlite"\n}', 'datasource db {\n  provider = "postgresql"\n}')
    : ham);
  const ayar = path.join(calisma, 'prisma.config.ts');
  writeFileSync(ayar, [
    "import { defineConfig } from 'prisma/config';",
    'export default defineConfig({',
    `  schema: ${JSON.stringify(sema)},`,
    `  migrations: { path: ${JSON.stringify(gocDizini)} },`,
    '  datasource: { url: process.env.DATABASE_URL! },',
    '});',
    '',
  ].join('\n'));
  const r = spawnSync(path.join(WEB, 'node_modules', '.bin', 'prisma'),
    ['migrate', 'deploy', '--config', ayar], { cwd: WEB, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`göç uygulanamadı (sağlayıcı: ${postgres ? 'postgresql' : 'sqlite'})`);
    process.exit(r.status ?? 1);
  }
  console.log(`göç uygulandı · sağlayıcı ${postgres ? 'postgresql' : 'sqlite'} · zincir ${path.relative(WEB, gocDizini)}`);
} finally {
  rmSync(calisma, { recursive: true, force: true });
  if (existsSync(calisma)) { console.error(`geçici dizin silinemedi: ${calisma}`); process.exit(1); }
}
