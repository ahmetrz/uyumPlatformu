#!/usr/bin/env node
/* PostgreSQL TABAN GÖÇÜ — üreteç ve tazelik kapısı (R5).
   ═══════════════════════════════════════════════════════════════════════
   SQLite göç zinciri 51 göçtür ve ELLE yazılmış ADD COLUMN'lardan oluşur;
   PostgreSQL'e o zincir taşınmaz (`RedefineTables`, `PRAGMA`,
   `RAISE(ABORT)` — hiçbiri PostgreSQL'de çalışmaz). PostgreSQL tarafı TEK
   TABAN GÖÇÜDÜR: şemadan üretilen DDL + elle yazılmış DDL (değişmezlik
   tetikleyicileri, kısmi ve ifade indeksleri — `prisma migrate diff`
   bunların HİÇBİRİNİ görmez, çünkü Prisma modelinde yazılamazlar).

   İki sağlayıcı, tek şema: `prisma/schema.prisma`. Sağlayıcıya göre ayrı
   şema dosyası TUTULMAZ — kopya bir gün ayrışır ve ayrıştığı ancak
   müşteride görülür. Bunun yerine şemanın datasource satırı ÜRETİM ANINDA
   `postgresql` yapılır (geçici kopya, depoya girmez).

   Kapı (varsayılan): taban göçü şemanın BUGÜNKÜ hâlinden yeniden üretilir
   ve depodakiyle karşılaştırılır. Fark varsa KIRMIZI — şema değişmiş ama
   PostgreSQL tabanı güncellenmemiş demektir; bu, "yeni kurulum ile mevcut
   kurulum ayrışır" kusurunun PostgreSQL tarafındaki hâlidir.

   SINIR: `--yaz` taban dosyasının ÜZERİNE yazar. Prisma uygulanan göçün
   sağlama toplamını tutar; taban değişince MEVCUT bir kurulumda
   `migrate deploy` "migration was modified after it was applied" ile düşer.
   Bu yüzden taban yalnız HİÇBİR KURULUM YOKKEN yeniden üretilir; ilk
   müşteri kurulumundan sonra DONAR ve değişiklikler eklemeli göç olur
   (`docs/POSTGRES_READINESS.md` §0.2 — kapanış aşaması P7).

   Kullanım: node arac/pg-taban.mjs           (tazelik kapısı · çıkış 0/1)
             node arac/pg-taban.mjs --yaz     (taban göçünü yeniden yaz)
             node arac/pg-taban.mjs --json    (ölçüm, karar yok)
   ═══════════════════════════════════════════════════════════════════════ */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TABAN_ADI = '00000000000000_pg_taban';
export const PG_DIZINI = path.join(WEB, 'prisma', 'postgres');
export const GOC_DIZINI = path.join(PG_DIZINI, 'migrations');
export const TABAN_YOLU = path.join(GOC_DIZINI, TABAN_ADI, 'migration.sql');
export const DEGISMEZLIK_YOLU = path.join(PG_DIZINI, 'elle-yazilan.sql');

const BASLIK = [
  '-- PostgreSQL TABAN GÖÇÜ — ÜRETİLMİŞTİR, elle düzenlenmez.',
  '-- Üreteç: `node arac/pg-taban.mjs --yaz` (kaynak: prisma/schema.prisma).',
  '-- Sonuna prisma/postgres/elle-yazilan.sql eklenir (tetikleyiciler + elle indeksler).',
  '-- Tazelik kapısı: `npm run kapi:pg-taban` — şema değişip taban güncellenmezse KIRMIZI.',
  '',
].join('\n');

/** Şemanın PostgreSQL sağlayıcılı geçici kopyası; istemci çıktısı da geçiciye taşınır. */
export function pgSemasiYaz(hedefDizin, sema = path.join(WEB, 'prisma', 'schema.prisma')) {
  const ham = readFileSync(sema, 'utf8');
  const sqlite = 'datasource db {\n  provider = "sqlite"\n}';
  if (!ham.includes(sqlite)) throw new Error('şemanın datasource bloğu beklenen biçimde değil — üreteç sessizce yanlış SQL üretmesin diye durdu');
  const pg = ham
    .replace(sqlite, 'datasource db {\n  provider = "postgresql"\n}')
    .replace('output   = "../lib/prisma-client"', `output   = ${JSON.stringify(path.join(hedefDizin, 'istemci'))}`);
  const yol = path.join(hedefDizin, 'schema.prisma');
  writeFileSync(yol, pg);
  return yol;
}

/** Şemadan PostgreSQL DDL'i üretir (tetikleyiciler hariç). */
export function ddlUret({ web = WEB } = {}) {
  const yuva = path.join(web, '.parti');
  mkdirSync(yuva, { recursive: true });
  const calisma = mkdtempSync(path.join(yuva, 'pg-taban-'));
  try {
    const sema = pgSemasiYaz(calisma);
    const ayar = path.join(calisma, 'prisma.config.ts');
    writeFileSync(ayar, [
      "import { defineConfig } from 'prisma/config';",
      'export default defineConfig({',
      `  schema: ${JSON.stringify(sema)},`,
      `  migrations: { path: ${JSON.stringify(path.join(calisma, 'migrations'))} },`,
      "  datasource: { url: process.env.PG_URL ?? 'postgresql://yok@127.0.0.1:1/yok' },",
      '});',
      '',
    ].join('\n'));
    const prisma = path.join(web, 'node_modules', '.bin', 'prisma');
    const r = spawnSync(prisma, ['migrate', 'diff', '--from-empty', '--to-schema', sema, '--script', '--config', ayar],
      { cwd: web, encoding: 'utf8', env: { ...process.env, BROWSER: 'none' } });
    if (r.status !== 0) throw new Error(`prisma migrate diff başarısız (${r.status}): ${(r.stderr || r.stdout || '').trim().slice(0, 600)}`);
    return r.stdout;
  } finally {
    rmSync(calisma, { recursive: true, force: true });
    if (existsSync(calisma)) throw new Error(`geçici dizin silinemedi: ${calisma}`);
  }
}

/** Taban göçünün TAM metni: üretilen DDL + değişmezlik tetikleyicileri. */
export function tabanMetni({ web = WEB } = {}) {
  const ddl = ddlUret({ web }).trimEnd();
  const tetik = readFileSync(DEGISMEZLIK_YOLU, 'utf8').trimEnd();
  return `${BASLIK}${ddl}\n\n${tetik}\n`;
}

export function taze({ web = WEB } = {}) {
  const ddl = ddlUret({ web }).trimEnd();
  const elle = readFileSync(DEGISMEZLIK_YOLU, 'utf8').trimEnd();
  const beklenen = `${BASLIK}${ddl}\n\n${elle}\n`;
  const mevcut = existsSync(TABAN_YOLU) ? readFileSync(TABAN_YOLU, 'utf8') : null;
  /* HANGİ PARÇA KAYDI — mesaj "şema değişti" diye tek bir teşhis koyamaz:
     taban iki parçadan oluşur (şemadan ÜRETİLEN DDL + ELLE yazılan DDL) ve
     ikisi ayrı sebeplerle bayatlar. Yanlış teşhis, düzeltmeyi yanlış yere
     gönderir (bağımsız inceleme, P2). */
  return {
    var: mevcut !== null,
    taze: mevcut === beklenen,
    ddlKaydi: mevcut !== null && !mevcut.includes(ddl),
    elleKaydi: mevcut !== null && !mevcut.includes(elle),
    beklenenSatir: beklenen.split('\n').length,
    mevcutSatir: mevcut === null ? 0 : mevcut.split('\n').length,
    beklenen,
  };
}

export function yaz({ web = WEB } = {}) {
  mkdirSync(path.dirname(TABAN_YOLU), { recursive: true });
  writeFileSync(TABAN_YOLU, tabanMetni({ web }));
  writeFileSync(path.join(GOC_DIZINI, 'migration_lock.toml'),
    '# Please do not edit this file manually\n# It should be added in your version-control system (e.g., Git)\nprovider = "postgresql"\n');
}

/** Karar SAF: ölçümden kırmızı/yeşil. Kapı ve test aynı kararı kullanır. */
export function karar(olcum) {
  if (!olcum.var) return { kirmizi: true, mesaj: `PostgreSQL taban göçü YOK: ${path.relative(WEB, TABAN_YOLU)} — \`node arac/pg-taban.mjs --yaz\`` };
  if (!olcum.taze) {
    const kayan = olcum.ddlKaydi && olcum.elleKaydi ? 'ŞEMA ve ELLE YAZILAN DDL'
      : olcum.ddlKaydi ? 'ŞEMA (prisma/schema.prisma)'
        : olcum.elleKaydi ? 'ELLE YAZILAN DDL (prisma/postgres/elle-yazilan.sql)'
          : 'başlık ya da biçim';
    return { kirmizi: true, mesaj: `PostgreSQL taban göçü BAYAT — kayan parça: ${kayan}. `
      + `Beklenen ${olcum.beklenenSatir} satır, depodaki ${olcum.mevcutSatir} satır. `
      + 'Yeni PostgreSQL kurulumu bugünkü şemadan AYRIŞIR. `node arac/pg-taban.mjs --yaz`' };
  }
  const tetik = (readFileSync(DEGISMEZLIK_YOLU, 'utf8').match(/^CREATE TRIGGER/gm) ?? []).length;
  const indeks = (readFileSync(DEGISMEZLIK_YOLU, 'utf8').match(/^CREATE UNIQUE INDEX/gm) ?? []).length;
  return { kirmizi: false, mesaj: `PostgreSQL taban göçü taze (${olcum.mevcutSatir} satır · elle yazılan ${tetik} tetikleyici + ${indeks} indeks dâhil)` };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--yaz')) {
    yaz();
    console.log(`yazıldı: ${path.relative(WEB, TABAN_YOLU)} (${readFileSync(TABAN_YOLU, 'utf8').split('\n').length} satır)`);
  } else {
    const olcum = taze();
    if (process.argv.includes('--json')) { console.log(JSON.stringify({ ...olcum, beklenen: undefined }, null, 2)); process.exit(0); }
    const k = karar(olcum);
    console.log(k.mesaj);
    process.exit(k.kirmizi ? 1 : 0);
  }
}
