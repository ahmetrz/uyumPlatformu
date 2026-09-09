#!/usr/bin/env node
/* PostgreSQL GÖÇ VE DEĞİŞMEZLİK KAPISI (R5).
   ═══════════════════════════════════════════════════════════════════════
   `kapi:goc-zinciri` SQLite zincirini boş bir veritabanında ölçer. Bu kapı
   AYNI ŞEYİ PostgreSQL için yapar — yeni bir şey icat etmez:

     boş veritabanı → taban göçü uygulanır → `_prisma_migrations` okunur
     → şema farkı ÖLÇÜLÜR (0 olmalı) → DEĞİŞMEZLİK SINANIR → veritabanı
     silinir ve silindiği DOĞRULANIR.

   Değişmezlik sınaması sekiz vakadır, altısı yasak biri serbest:
     · AktiviteKaydi UPDATE · DELETE · TRUNCATE → reddedilmeli
     · DegerlendirmeTarihcesi UPDATE · DELETE · TRUNCATE → reddedilmeli
     · Hiçbir satıra dokunmayan UPDATE → GEÇMELİ. Bu vaka `FOR EACH ROW`
       ile `FOR EACH STATEMENT` farkını ölçer: ifade seviyesinde yazılmış
       bir tetikleyici bu UPDATE'i de reddeder ve SQLite'tan sessizce
       ayrışır (docs/POSTGRES_READINESS.md §a.2, fark 1).
     · TRUNCATE vakaları PostgreSQL'e ÖZGÜ boşluğu kapatır: TRUNCATE satır
       tetikleyicilerini ATLAR; onlarsız "denetim izi değişmezdir" iddiası
       PostgreSQL'de yalandır (fark 2).

   Bağlantı: `PG_URL` ortam değişkeni (CI'da postgres servisi). Yoksa kapı
   "ÖLÇÜLMEDİ" der ve KIRMIZI yanar — koşulmayan kapı "geçti" yazılmaz.

   Kullanım: node arac/pg-goc.mjs           (kapı · çıkış 0/1)
             node arac/pg-goc.mjs --json    (ölçüm nesnesi, karar yok)
   ═══════════════════════════════════════════════════════════════════════ */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { GOC_DIZINI, TABAN_ADI, WEB, pgSemasiYaz } from './pg-taban.mjs';

const require = createRequire(import.meta.url);
/** PostgreSQL tanımlayıcı sınırı 63 BAYTTIR ve SQLite'ta böyle bir sınır yoktur:
    uzun `@@unique` adları PostgreSQL tarafında KISALTILIR. Kısaltma sondan
    değil ORTADAN yapılır — sonek (`_key`) korunur, gövde kırpılır (ölçüldü:
    `ProjeBaglantisi_..._varlikId_key` → `ProjeBaglantisi_..._varl_key`).
    Düz kırpma bu iki indeksi "PostgreSQL'de yok" sayıyordu: yalancı kırmızı,
    kapının kendi kusuru. */
export const PG_AD_SINIRI = 63;
export const AD_SONEKLERI = ['_pkey', '_fkey', '_key', '_idx'];
export function pgAdi(ad) {
  if (Buffer.byteLength(ad, 'utf8') <= PG_AD_SINIRI) return ad;
  const sonek = AD_SONEKLERI.find((x) => ad.endsWith(x));
  if (!sonek) return Buffer.from(ad, 'utf8').subarray(0, PG_AD_SINIRI).toString('utf8');
  const govde = ad.slice(0, -sonek.length);
  return Buffer.from(govde, 'utf8').subarray(0, PG_AD_SINIRI - Buffer.byteLength(sonek, 'utf8')).toString('utf8') + sonek;
}

/** Yasak eylem → beklenen hata metni (SQLite tarafıyla AYNI cümleler). */
export const DEGISMEZLIK_VAKALARI = [
  { ad: 'AktiviteKaydi UPDATE', tablo: 'AktiviteKaydi', sql: (t) => `UPDATE "${t}" SET gerekce = 'sabotaj'`, bekle: 'degistirilemez' },
  { ad: 'AktiviteKaydi DELETE', tablo: 'AktiviteKaydi', sql: (t) => `DELETE FROM "${t}"`, bekle: 'silinemez' },
  { ad: 'AktiviteKaydi TRUNCATE', tablo: 'AktiviteKaydi', sql: (t) => `TRUNCATE "${t}"`, bekle: 'bosaltilamaz' },
  { ad: 'DegerlendirmeTarihcesi UPDATE', tablo: 'DegerlendirmeTarihcesi', sql: (t) => `UPDATE "${t}" SET gerekce = 'sabotaj'`, bekle: 'degistirilemez' },
  { ad: 'DegerlendirmeTarihcesi DELETE', tablo: 'DegerlendirmeTarihcesi', sql: (t) => `DELETE FROM "${t}"`, bekle: 'silinemez' },
  { ad: 'DegerlendirmeTarihcesi TRUNCATE', tablo: 'DegerlendirmeTarihcesi', sql: (t) => `TRUNCATE "${t}"`, bekle: 'bosaltilamaz' },
];

function psql(url, sql, { db } = {}) {
  const hedef = db ? url.replace(/\/[^/?]*(\?|$)/, `/${db}$1`) : url;
  const r = spawnSync('psql', [hedef, '-v', 'ON_ERROR_STOP=1', '-tAc', sql], { encoding: 'utf8' });
  return { durum: r.status, cikti: (r.stdout ?? '').trim(), hata: (r.stderr ?? '').trim(), yokArac: r.error?.code === 'ENOENT' };
}

function prisma(web, args) {
  const bin = path.join(web, 'node_modules', '.bin', 'prisma');
  const r = spawnSync(bin, args, { cwd: web, encoding: 'utf8', env: { ...process.env, BROWSER: 'none' } });
  return { durum: r.status, cikti: `${r.stdout ?? ''}`, hata: `${r.stderr ?? ''}` };
}

/** SQLite göç ZİNCİRİNİN kurduğu tetikleyici ve indeks adları (boş veritabanında). */
export function sqliteEnvanteri({ web = WEB } = {}) {
  const yuva = path.join(web, '.parti');
  mkdirSync(yuva, { recursive: true });
  const calisma = mkdtempSync(path.join(yuva, 'pg-envanter-'));
  const db = path.join(calisma, 'zincir.db');
  try {
    const ayar = path.join(calisma, 'prisma.config.ts');
    writeFileSync(ayar, [
      "import { defineConfig } from 'prisma/config';",
      'export default defineConfig({',
      `  schema: ${JSON.stringify(path.join(web, 'prisma', 'schema.prisma'))},`,
      `  migrations: { path: ${JSON.stringify(path.join(web, 'prisma', 'migrations'))} },`,
      `  datasource: { url: ${JSON.stringify(`file:${db}`)} },`,
      '});',
      '',
    ].join('\n'));
    const r = prisma(web, ['migrate', 'deploy', '--config', ayar]);
    if (r.durum !== 0) return { hata: `SQLite zinciri kurulamadı: ${(r.hata || r.cikti).trim().slice(0, 300)}` };
    const Database = require('better-sqlite3');
    const b = new Database(db, { readonly: true });
    try {
      return {
        tetikleyiciler: b.prepare("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name").all().map((x) => x.name),
        indeksler: b.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_autoindex%' ORDER BY name").all().map((x) => x.name),
      };
    } finally { b.close(); }
  } finally {
    rmSync(calisma, { recursive: true, force: true });
  }
}

/** ÖLÇER, karar vermez. */
export function pgGocOlc({ web = WEB, url = process.env.PG_URL } = {}) {
  const olcum = {
    baglanti: Boolean(url), psqlVar: true, dbAdi: null, uygulanan: [], beklenenGoc: [TABAN_ADI],
    fark: null, farkHatasi: '', degismezlik: [], satirsizGuncelleme: null, temizlendi: null, hata: '',
    eksikTetikleyici: null, eksikIndeks: null, envanterHatasi: '',
  };
  if (!url) { olcum.hata = 'PG_URL ayarlı değil'; return olcum; }
  const deneme = psql(url, 'select 1');
  if (deneme.yokArac) { olcum.psqlVar = false; olcum.hata = 'psql bulunamadı'; return olcum; }
  if (deneme.durum !== 0) { olcum.hata = `PostgreSQL'e bağlanılamadı: ${deneme.hata.slice(0, 300)}`; return olcum; }

  const db = `uyum_pg_kapi_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  olcum.dbAdi = db;
  const olustur = psql(url, `CREATE DATABASE "${db}"`);
  if (olustur.durum !== 0) { olcum.hata = `veritabanı oluşturulamadı: ${olustur.hata.slice(0, 300)}`; return olcum; }

  const yuva = path.join(web, '.parti');
  mkdirSync(yuva, { recursive: true });
  const calisma = mkdtempSync(path.join(yuva, 'pg-goc-'));
  const hedefUrl = url.replace(/\/[^/?]*(\?|$)/, `/${db}$1`);
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

    const deploy = prisma(web, ['migrate', 'deploy', '--config', ayar]);
    if (deploy.durum !== 0) { olcum.hata = `migrate deploy başarısız: ${(deploy.hata || deploy.cikti).trim().slice(0, 600)}`; return olcum; }

    /* Uygulanan göçler stdout'tan değil VERİTABANINDAN okunur — son koşul ölçülür. */
    const uyg = psql(hedefUrl, 'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY started_at, migration_name');
    olcum.uygulanan = uyg.durum === 0 && uyg.cikti ? uyg.cikti.split('\n').map((s) => s.trim()).filter(Boolean) : [];

    const diff = prisma(web, ['migrate', 'diff', '--from-config-datasource', '--to-schema', sema, '--exit-code', '--script', '--config', ayar]);
    if (diff.durum === 0) olcum.fark = '';
    else if (diff.durum === 2) olcum.fark = diff.cikti.trim();
    else olcum.farkHatasi = (diff.hata || diff.cikti).trim();

    /* ── nesne envanteri ─────────────────────────────────────────────────
       `migrate diff` YALNIZ Prisma modelini görür: tetikleyici, kısmi indeks
       ve ifade indeksi ona görünmez. "Şema farkı 0" diyen bir PostgreSQL
       kurulumu bu yüzden KORUMASIZ olabilir — ölçüldü (R5): iki tetikleyici
       ve üç indeks eksikken fark 0'dı ve dört test dosyası PostgreSQL'de
       kırmızı yandı. Kapı artık iki sağlayıcının nesne adlarını karşılaştırır. */
    const sq = sqliteEnvanteri({ web });
    if (sq.hata) olcum.envanterHatasi = sq.hata;
    else {
      const ad = (satirlar) => new Set(satirlar.split('\n').map((x) => x.trim()).filter(Boolean));
      const pgT = psql(hedefUrl, "SELECT tgname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE NOT t.tgisinternal AND n.nspname = 'public'");
      const pgI = psql(hedefUrl, "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'");
      if (pgT.durum !== 0 || pgI.durum !== 0) olcum.envanterHatasi = `PostgreSQL envanteri okunamadı: ${(pgT.hata || pgI.hata).slice(0, 200)}`;
      else {
        const t = ad(pgT.cikti); const i = ad(pgI.cikti);
        olcum.eksikTetikleyici = sq.tetikleyiciler.filter((x) => !t.has(x) && !t.has(pgAdi(x)));
        olcum.eksikIndeks = sq.indeksler.filter((x) => !i.has(x) && !i.has(pgAdi(x)));
      }
    }

    /* ── değişmezlik ─────────────────────────────────────────────────────
       Sınama satır GEREKTİRİR: `FOR EACH ROW` tetikleyicisi boş tabloda
       hiç ateşlenmez ve boş tabloda yapılan sınama HİÇBİR ŞEY ölçmez.
       `DegerlendirmeTarihcesi` yabancı anahtar taşır; sınama satırı için
       kısıtlar bu ATILACAK veritabanında kaldırılır — şema farkı bundan
       ÖNCE ölçüldü. */
    psql(hedefUrl, `INSERT INTO "AktiviteKaydi" (id, "varlikTipi", "varlikId", eylem, kaynak, zaman)
      VALUES ('kapi-1', 'Kapi', 'x', 'olusturma', 'ui', now())`);
    psql(hedefUrl, `DO $$ DECLARE k text; BEGIN
        FOR k IN SELECT conname FROM pg_constraint WHERE conrelid = '"DegerlendirmeTarihcesi"'::regclass AND contype = 'f'
        LOOP EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'DegerlendirmeTarihcesi', k); END LOOP; END $$;`);
    psql(hedefUrl, `INSERT INTO "DegerlendirmeTarihcesi" (id, "maddeDurumuId", "eskiDurum", "yeniDurum", zaman)
      VALUES ('kapi-1', 'yok', 'a', 'b', now())`);
    for (const t of ['AktiviteKaydi', 'DegerlendirmeTarihcesi']) {
      const n = psql(hedefUrl, `SELECT count(*) FROM "${t}"`);
      if (n.cikti !== '1') { olcum.hata = `sınama satırı kurulamadı (${t}: ${n.cikti || n.hata.slice(0, 200)}) — boş tabloda değişmezlik ölçülemez`; return olcum; }
    }
    for (const v of DEGISMEZLIK_VAKALARI) {
      const r = psql(hedefUrl, v.sql(v.tablo));
      olcum.degismezlik.push({ ad: v.ad, reddedildi: r.durum !== 0, mesajUydu: r.hata.includes(v.bekle), mesaj: r.hata.split('\n')[0].slice(0, 200) });
    }
    /* Satırsız UPDATE GEÇMELİ: geçmiyorsa tetikleyici ifade seviyesindedir. */
    const satirsiz = psql(hedefUrl, `UPDATE "AktiviteKaydi" SET gerekce = 'x' WHERE id = 'boyle-bir-kayit-yok'`);
    olcum.satirsizGuncelleme = { gecti: satirsiz.durum === 0, mesaj: satirsiz.hata.split('\n')[0].slice(0, 200) };
    return olcum;
  } finally {
    rmSync(calisma, { recursive: true, force: true });
    psql(url, `DROP DATABASE IF EXISTS "${db}" WITH (FORCE)`);
    const kalan = psql(url, `SELECT count(*) FROM pg_database WHERE datname = '${db}'`);
    olcum.temizlendi = kalan.durum === 0 ? kalan.cikti === '0' : false;
    if (existsSync(calisma)) olcum.temizlendi = false;
  }
}

/** SAF karar — kapı ve test aynı kararı kullanır. */
export function karar(olcum) {
  const kirmizilar = [];
  if (!olcum.baglanti) kirmizilar.push('ÖLÇÜLMEDİ: PG_URL ayarlı değil — koşulmayan kapı "geçti" yazılmaz');
  else if (!olcum.psqlVar) kirmizilar.push('ÖLÇÜLMEDİ: psql bulunamadı');
  else if (olcum.hata) kirmizilar.push(olcum.hata);
  else {
    const beklenen = olcum.beklenenGoc.join(', ');
    if (olcum.uygulanan.length === 0) kirmizilar.push('hiçbir göç uygulanmadı — sıfır ölçümle "fark yok" denmez');
    else if (olcum.uygulanan.join(', ') !== beklenen) kirmizilar.push(`uygulanan göçler beklenenle uyuşmuyor: [${olcum.uygulanan.join(', ')}] ≠ [${beklenen}]`);
    if (olcum.farkHatasi) kirmizilar.push(`şema farkı ÖLÇÜLEMEDİ: ${olcum.farkHatasi.slice(0, 400)}`);
    else if (olcum.fark === null) kirmizilar.push('şema farkı ölçülmedi');
    else if (olcum.fark !== '') kirmizilar.push(`taban göçü ile şema AYRIŞIYOR:\n${olcum.fark.slice(0, 1500)}`);
    if (olcum.degismezlik.length !== DEGISMEZLIK_VAKALARI.length) kirmizilar.push(`değişmezlik vakaları eksik: ${olcum.degismezlik.length}/${DEGISMEZLIK_VAKALARI.length}`);
    for (const d of olcum.degismezlik) {
      if (!d.reddedildi) kirmizilar.push(`DEĞİŞMEZLİK DELİK: "${d.ad}" reddedilmedi — denetim izi PostgreSQL'de değişebiliyor`);
      else if (!d.mesajUydu) kirmizilar.push(`"${d.ad}" reddedildi ama mesaj SQLite tarafıyla uyuşmuyor: ${d.mesaj}`);
    }
    if (olcum.satirsizGuncelleme && !olcum.satirsizGuncelleme.gecti) {
      kirmizilar.push(`satır seviyesi kusuru: hiçbir satıra dokunmayan UPDATE reddedildi — tetikleyici FOR EACH STATEMENT yazılmış (${olcum.satirsizGuncelleme.mesaj})`);
    }
    if (olcum.envanterHatasi) kirmizilar.push(`nesne envanteri ÖLÇÜLEMEDİ: ${olcum.envanterHatasi}`);
    else if (olcum.eksikTetikleyici === null || olcum.eksikIndeks === null) kirmizilar.push('nesne envanteri ölçülmedi');
    else {
      if (olcum.eksikTetikleyici.length) kirmizilar.push(`SQLite'ta olup PostgreSQL'de OLMAYAN tetikleyici: ${olcum.eksikTetikleyici.join(', ')} — koruma sağlayıcı değiştirince buharlaşıyor`);
      if (olcum.eksikIndeks.length) kirmizilar.push(`SQLite'ta olup PostgreSQL'de OLMAYAN indeks: ${olcum.eksikIndeks.join(', ')} — kısıt sağlayıcı değiştirince buharlaşıyor`);
    }
    if (olcum.temizlendi === false) kirmizilar.push(`geçici veritabanı silinemedi: ${olcum.dbAdi}`);
  }
  return { kirmizi: kirmizilar.length > 0, kirmizilar };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const olcum = pgGocOlc();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(olcum, null, 2)); process.exit(0); }
  const k = karar(olcum);
  console.log(`PostgreSQL göç kapısı · göç ${olcum.uygulanan.length}/${olcum.beklenenGoc.length} · şema farkı ${olcum.fark === '' ? '0' : olcum.fark === null ? 'ölçülmedi' : 'VAR'}`
    + ` · değişmezlik ${olcum.degismezlik.filter((d) => d.reddedildi && d.mesajUydu).length}/${DEGISMEZLIK_VAKALARI.length}`
    + ` · satırsız UPDATE ${olcum.satirsizGuncelleme?.gecti ? 'geçti' : 'GEÇMEDİ'}`
    + ` · eksik nesne ${olcum.eksikTetikleyici === null ? 'ölçülmedi' : `${olcum.eksikTetikleyici.length} tetikleyici / ${olcum.eksikIndeks.length} indeks`}`
    + ` · temizlik ${olcum.temizlendi ? 'doğrulandı' : 'DOĞRULANMADI'}`);
  for (const s of k.kirmizilar) console.error(`  KIRMIZI: ${s}`);
  process.exit(k.kirmizi ? 1 : 0);
}
