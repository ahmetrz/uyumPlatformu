#!/usr/bin/env node
/* Göç zinciri kapısı — BOŞ bir veritabanında bütün göçler sırayla koşar,
   sonuç `schema.prisma` ile karşılaştırılır; fark SIFIR olmalıdır.

   Neden ayrı bir kapı: `kapi:sema-sapmasi` MEVCUT dev.db'yi ölçer. Yerel
   dev.db, elle düzeltilmiş bir göçün ürünü olabilir (ölçüldü, P4 · 2.4:
   `migrate diff` RedefineTables üretti ve uygulandı, göç dosyası sonradan
   ADD COLUMN olarak yeniden yazıldı, dev.db'deki sağlama elle güncellendi).
   O durumda ölçülen şey göç zinciri değil, geliştiricinin diskidir. Müşteri
   kurulumu ise YALNIZ zinciri görür: zincir şemadan ayrışırsa yeni kurulum
   ile mevcut kurulum ayrışır ve bu ancak müşteride ortaya çıkar.

   Ölçüm: geçici dizinde boş SQLite + geçici prisma.config.ts →
   `prisma migrate deploy` (kurulumun yaptığı şeyin aynısı) → veritabanının
   `_prisma_migrations` tablosu dizindeki göç listesiyle BİREBİR olmalı
   (sıfır ya da eksik uygulama kırmızıdır; ölçüm sayısı sıfır olamaz) →
   `prisma migrate diff --from-config-datasource --to-schema schema.prisma
   --exit-code --script` (kaynak = geçici yapılandırmadaki boş db): 0 fark yok · 2 fark var (SQL basılır) · başka =
   araç hatası, kırmızıdır. Geçici dizin sonda silinir ve silindiği ÖLÇÜLÜR.

   Kullanım: node arac/goc-zinciri.mjs          (kapı · çıkış 0/1)
             node arac/goc-zinciri.mjs --json   (ölçüm nesnesi, karar yok)
   Sabotaj: tests/goc-zinciri.test.ts — eksik ADD COLUMN'lu bir zincir
   kopyası kırmızı yanmak ZORUNDADIR. */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

/** Göç dizinindeki göç adları (zaman damgası sırasıyla). */
export function gocAdlari(gocDizini) {
  return readdirSync(gocDizini, { withFileTypes: true })
    .filter((g) => g.isDirectory() && existsSync(path.join(gocDizini, g.name, 'migration.sql')))
    .map((g) => g.name)
    .sort();
}

function kos(web, args) {
  const prisma = path.join(web, 'node_modules', '.bin', 'prisma');
  const r = spawnSync(prisma, args, { cwd: web, encoding: 'utf8', env: { ...process.env, BROWSER: 'none' } });
  return { durum: r.status, cikti: `${r.stdout ?? ''}`, hata: `${r.stderr ?? ''}` };
}

/**
 * Boş veritabanına göç zincirini uygular ve şemayla karşılaştırır.
 * Karar vermez; ölçer. Kararı `karar()` verir (kapı ve test aynı kararı kullanır).
 */
export function gocZinciriOlc({ web = WEB, gocDizini = path.join(web, 'prisma', 'migrations'), sema = path.join(web, 'prisma', 'schema.prisma') } = {}) {
  const gocler = gocAdlari(gocDizini);
  const yuva = path.join(web, '.parti');
  mkdirSync(yuva, { recursive: true });
  const calisma = mkdtempSync(path.join(yuva, 'goc-zinciri-'));
  const db = path.join(calisma, 'bos.db');
  const ayar = path.join(calisma, 'prisma.config.ts');
  /* Geçici yapılandırma web/.parti altında durur: `prisma/config` içe
     aktarımı web/node_modules'tan çözülür; /tmp'de çözülmezdi. */
  writeFileSync(ayar, [
    "import { defineConfig } from 'prisma/config';",
    'export default defineConfig({',
    `  schema: ${JSON.stringify(sema)},`,
    `  migrations: { path: ${JSON.stringify(gocDizini)} },`,
    `  datasource: { url: ${JSON.stringify(`file:${db}`)} },`,
    '});',
    '',
  ].join('\n'));
  try {
    const deploy = kos(web, ['migrate', 'deploy', '--config', ayar]);
    /* Uygulanan göçler stdout'tan değil, VERİTABANINDAN okunur: son koşul ölçülür. */
    let uygulanan = [];
    if (existsSync(db)) {
      const Database = require('better-sqlite3');
      const baglanti = new Database(db, { readonly: true });
      try {
        const var_ = baglanti.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'").get();
        if (var_) {
          uygulanan = baglanti
            .prepare('SELECT migration_name AS ad FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY started_at, migration_name')
            .all().map((s) => s.ad);
        }
      } finally { baglanti.close(); }
    }
    let fark = null; // null: ölçülemedi
    let farkHatasi = '';
    if (deploy.durum === 0) {
      /* Prisma 7'de `--from-url` yok: kaynak, geçici yapılandırmanın datasource'u (boş db). */
      const diff = kos(web, ['migrate', 'diff', '--from-config-datasource', '--to-schema', sema, '--exit-code', '--script', '--config', ayar]);
      if (diff.durum === 0) fark = '';
      else if (diff.durum === 2) fark = diff.cikti.trim();
      else farkHatasi = (diff.hata || diff.cikti).trim();
    }
    return {
      gocDizini, gocler, uygulanan,
      eksik: gocler.filter((g) => !uygulanan.includes(g)),
      fazla: uygulanan.filter((g) => !gocler.includes(g)),
      deployDurumu: deploy.durum,
      deployHatasi: deploy.durum === 0 ? '' : (deploy.hata || deploy.cikti).trim(),
      fark, farkHatasi,
    };
  } finally {
    rmSync(calisma, { recursive: true, force: true });
    /* "Sildim" diyen adım sildiğini ölçer. */
    if (existsSync(calisma)) throw new Error(`geçici dizin silinemedi: ${calisma}`);
  }
}

/** Ölçümden kırmızı listesi. Boş liste = geçti. */
export function karar(o) {
  const k = [];
  if (o.gocler.length === 0) k.push('göç dizini boş — ölçüm sayısı sıfır olamaz');
  if (o.deployDurumu !== 0) k.push(`migrate deploy başarısız (çıkış ${o.deployDurumu}): ${o.deployHatasi.split('\n').slice(-3).join(' · ')}`);
  if (o.eksik.length) k.push(`uygulanmayan göç: ${o.eksik.join(', ')}`);
  if (o.fazla.length) k.push(`dizinde olmayan göç uygulanmış: ${o.fazla.join(', ')}`);
  if (o.fark === null) k.push(`şema farkı ölçülemedi: ${o.farkHatasi.split('\n').slice(-3).join(' · ')}`);
  else if (o.fark !== '') k.push(`göç zinciri ile schema.prisma ayrışıyor — yeni kurulum mevcut kurulumdan farklı olur:\n${o.fark}`);
  return k;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const o = gocZinciriOlc();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(o, null, 2)); process.exit(0); }
  const k = karar(o);
  /* SAĞLAYICI ADIYLA YAZILIR: iki zincir var (SQLite `prisma/migrations`,
     PostgreSQL `prisma/postgres/migrations`) ve bu kapı YALNIZ SQLite'ı
     ölçer. Yazmasaydı çıktısı "göç zinciri geçti" diye okunur, PostgreSQL
     zincirinin hiç ölçülmediği görünmezdi (ölçüldü: `kapi:pg-goc` uzun süre
     `kapi:parti` kümesinin DIŞINDAYDI). */
  console.log(`Göç zinciri · sağlayıcı SQLite (PostgreSQL zinciri: kapi:pg-goc): ${o.gocler.length} göç dizinde · ${o.uygulanan.length} göç boş veritabanına uygulandı · şema farkı ${o.fark === null ? 'ÖLÇÜLMEDİ' : o.fark === '' ? '0' : 'VAR'}`);
  for (const satir of k) console.log(`KIRMIZI  ${satir}`);
  console.log(k.length ? `Göç zinciri kapısı: KIRMIZI (${k.length})` : 'Göç zinciri kapısı: geçti');
  process.exit(k.length ? 1 : 0);
}
