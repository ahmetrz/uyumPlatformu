/* arac/olcek.mjs — toplu aktarım yollarının ÖLÇÜM aracı.
 *
 * NEDEN VAR: "burası ağırdır" ya da "PostgreSQL çözer" cümleleri ölçüm
 * değildir. Bu araç iki sıcak yolu — regülasyon maddesi içe aktarımı
 * (lib/eylemler.ts → aktarimOnayla) ve CMDB varlık aktarımı
 * (lib/entegrasyon/varlikAktarim.ts → aktarimiUygula) — ÜRETİM kodunu
 * çağırarak ölçer. Optimizasyondan ÖNCE ve SONRA aynı harness ile koşulur;
 * sayılar karşılaştırılabilir kalsın diye kurulum determinist.
 *
 * ── ÖLÇÜM SINIRI ─────────────────────────────────────────────────────
 * Veri SENTETİKTİR. Gerçek bir sisteme bağlanılmaz, gerçek veri
 * kullanılmaz. Her senaryo `prisma/dev.db` dosyasının GEÇİCİ BİR
 * KOPYASI üzerinde çalışır; gerçek geliştirme veritabanına tek bayt
 * yazılmaz (`dbKorumasi` bunu zorlar).
 *
 * ── NASIL ÇALIŞIR ────────────────────────────────────────────────────
 * 1. Sürücü süreç, her (yol × ölçek) için AYRI bir çocuk süreç açar.
 *    Ayrı süreç iki şey için gerekli: (a) her senaryo taze bir DB kopyası
 *    ister — açık bir SQLite tanıtıcısının altından dosya değiştirilemez;
 *    (b) zirve yığın ölçümü bir önceki senaryonun çöplüğünden etkilenmesin.
 * 2. Çocuk süreçte `globalThis.prisma`, ÖLÇÜMLÜ bir PrismaClient ile
 *    doldurulur. `lib/db.ts` istemciyi `globalForPrisma.prisma ?? new
 *    PrismaClient(...)` diye alır; global önceden dolu olduğu için üretim
 *    kodu bizim izole istemcimizi kullanır. Üretim kaynağında TEK SATIR
 *    değişiklik gerekmez (ve doğrulanır — `lib/db.ts` başka bir istemci
 *    döndürürse ölçüm durur).
 * 3. Prisma `query` olayı ile HER SQL ifadesi sayılır, süresi toplanır ve
 *    tablo adına göre sınıflanır — "köken + denetim izi maliyeti" ve
 *    "transaction içi gidiş-dönüş" buradan çıkar.
 * 4. Yığın 4 ms'de bir örneklenir; zirve raporlanır.
 *
 * TypeScript kaynakları Node'un yerleşik tip sıyırmasıyla doğrudan yüklenir
 * (Node ≥ 22.18). Uzantısız/alias'lı importlar ve Next'e özgü modüller
 * aşağıdaki çözümleyici kancasıyla karşılanır — vitest.config.ts ne
 * yapıyorsa aynısı.
 *
 * ── KULLANIM ─────────────────────────────────────────────────────────
 *   node arac/olcek.mjs                                # 1.000 + 10.000, iki yol
 *   node arac/olcek.mjs --olcek 1000 --yol b
 *   node arac/olcek.mjs --etiket ONCE --json /tmp/once.json
 *   node arac/olcek.mjs --tekrar 3                     # ortanca koşu seçilir
 *   node arac/olcek.mjs --karsilastir /tmp/once.json --json /tmp/sonra.json
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GERCEK_DB = path.join(KOK, 'prisma', 'dev.db');
const BU = fileURLToPath(import.meta.url);

/* ═══════════════════════════════════════════════════════════════════════
   BÖLÜM 1 — SÜRÜCÜ (varsayılan mod)
   ═══════════════════════════════════════════════════════════════════════ */

const YARDIM = `arac/olcek.mjs [--olcek 1000,10000] [--yol a,b,c] [--tekrar N]
                [--etiket AD] [--json dosya] [--karsilastir onceki.json]
  yol a = lib/eylemler.ts → aktarimOnayla (regülasyon maddesi)
  yol b = lib/entegrasyon/varlikAktarim.ts → aktarimiUygula, ilk aktarım (hepsi yeni)
  yol c = aynı yol, aynı dosya İKİNCİ kez (hepsi güncelleme — farklı sorgu şekli)`;

const YOL_ADI = {
  a: 'A · aktarimOnayla (regülasyon maddesi)',
  b: 'B · aktarimiUygula (CMDB varlık · ilk aktarım = hepsi yeni)',
  c: 'C · aktarimiUygula (CMDB varlık · yeniden aktarım = hepsi güncelleme)',
};

function argOku(argv) {
  const a = { olcekler: [1000, 10000], yollar: ['a', 'b', 'c'], tekrar: 1,
    etiket: process.env.OLCEK_ETIKET || 'ölçüm', json: null, karsilastir: null, cocuk: null };
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i]; const d = () => argv[i += 1];
    if (k === '--olcek') a.olcekler = d().split(',').map((s) => Number(s.trim())).filter(Boolean);
    else if (k === '--yol') a.yollar = d().split(',').map((s) => s.trim().toLowerCase());
    else if (k === '--tekrar') a.tekrar = Math.max(1, Number(d()));
    else if (k === '--etiket') a.etiket = d();
    else if (k === '--json') a.json = d();
    else if (k === '--karsilastir') a.karsilastir = d();
    else if (k === '--cocuk') a.cocuk = d();
    else if (k === '--yardim' || k === '-h') { console.log(YARDIM); process.exit(0); }
    else { console.error(`Bilinmeyen argüman: ${k}\n${YARDIM}`); process.exit(2); }
  }
  return a;
}
const ARG = argOku(process.argv.slice(2));

const mb = (b) => (b / 1048576).toFixed(1);
const sn = (ms) => (ms / 1000).toFixed(2);

async function surucu() {
  if (!fs.existsSync(GERCEK_DB)) {
    console.error(`Şema veritabanı yok: ${GERCEK_DB} — önce \`npx prisma migrate deploy\`.`);
    process.exit(2);
  }
  const cikti = {
    etiket: ARG.etiket, zaman: new Date().toISOString(), tekrar: ARG.tekrar,
    makine: { node: process.version, vcpu: os.cpus().length,
      yukBaslangic: os.loadavg().map((x) => +x.toFixed(2)) },
    olcumler: [],
  };
  for (const y of ARG.yollar) {
    if (!YOL_ADI[y]) { console.error(`Bilinmeyen yol: ${y}`); process.exit(2); }
    for (const n of ARG.olcekler) {
      const kosular = [];
      for (let t = 0; t < ARG.tekrar; t += 1) kosular.push(cocukCalistir(y, n));
      /* Tekrar varsa ORTANCA koşu seçilir: paylaşımlı makinede tek koşu
         başka bir işin CPU'yu kaptığı ana denk gelebilir. */
      const hedef = ortanca(kosular.map((k) => k.sureMs));
      const s = kosular.reduce((a, b) =>
        Math.abs(a.sureMs - hedef) <= Math.abs(b.sureMs - hedef) ? a : b);
      s.tumSurelerMs = kosular.map((k) => Math.round(k.sureMs));
      cikti.olcumler.push(s);
      s.tumYukler = kosular.map((k) => k.yuk?.[0] ?? null);
      console.log(`✓ ${s.yol} · ${n} satır · ${sn(s.sureMs)} s · ${s.sorgu} sorgu · ` +
        `${s.satirSn} satır/sn · zirve yığın ${s.zirveYiginMb} MB · ` +
        `koşular ${s.tumSurelerMs.join('/')} ms · yük ${s.tumYukler.join('/')}`);
    }
  }
  cikti.makine.yukBitis = os.loadavg().map((x) => +x.toFixed(2));
  tabloYaz(cikti);
  if (ARG.karsilastir) karsilastirmaYaz(JSON.parse(fs.readFileSync(ARG.karsilastir, 'utf8')), cikti);
  if (ARG.json) {
    fs.writeFileSync(ARG.json, JSON.stringify(cikti, null, 2));
    console.log(`\nHam ölçüm: ${ARG.json}`);
  }
}

function cocukCalistir(yol, n) {
  const r = spawnSync(process.execPath, [BU, '--cocuk', `${yol}:${n}`],
    { cwd: KOK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, NEXT_PUBLIC_DEMO: '' } });
  const satir = (r.stdout || '').split('\n').find((s) => s.startsWith('OLCUM '));
  if (!satir) {
    console.error(r.stdout); console.error(r.stderr);
    throw new Error(`Ölçüm çocuğu sonuç vermedi (yol ${yol}, ${n} satır)`);
  }
  // Uyarı satırları (Node deneysel özellik uyarıları) stderr'de kalır, yutulmaz.
  const gurultu = (r.stderr || '').split('\n')
    .filter((s) => s.trim() && !/ExperimentalWarning|MODULE_TYPELESS|Reparsing|To eliminate|trace-warnings|^\(node:/.test(s));
  if (gurultu.length) console.error(gurultu.join('\n'));
  return JSON.parse(satir.slice(6));
}

const ortanca = (d) => {
  const s = [...d].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

function tabloYaz(c) {
  console.log(`\n═══ ${c.etiket} ═══`);
  console.log(`SENTETİK veri · izole dev.db kopyası · Node ${c.makine.node} · ` +
    `${c.makine.vcpu} vCPU · yük ${c.makine.yukBaslangic.join('/')} → ${c.makine.yukBitis.join('/')} · ` +
    `tekrar ${c.tekrar}\n`);
  const bas = ['yol', 'satır', 'süre (s)', 'sorgu', 'sorgu/satır', 'satır/sn', 'zirve yığın', 'tx gidiş-dönüş'];
  const gov = c.olcumler.map((o) => [
    o.yol.slice(0, 1), String(o.satir), sn(o.sureMs), String(o.sorgu),
    (o.sorgu / o.satir).toFixed(2), String(o.satirSn), `${o.zirveYiginMb} MB`,
    String(o.txGidisDonus)]);
  const gen = bas.map((b, i) => Math.max(b.length, ...gov.map((g) => g[i].length)));
  const yaz = (h) => console.log(h.map((s, i) => s.padEnd(gen[i])).join('  '));
  yaz(bas); console.log(gen.map((g) => '─'.repeat(g)).join('  ')); gov.forEach(yaz);

  console.log('\nKırılım (ms):');
  for (const o of c.olcumler) {
    console.log(`  ${o.yol.slice(0, 1)}/${o.satir}: ayrıştırma ${o.ayristirmaMs}` +
      `${o.eslemeMs == null ? '' : ` · eşleme ${o.eslemeMs}`}` +
      ` · rapor serileştirme ${o.serilestirmeMs}` +
      ` · SQL toplam ${o.sqlSuresiMs} · köken+denetim izi ${o.kokenIzMs} (${o.kokenIzSorgu} sorgu)`);
    console.log(`     tablolar: ${Object.entries(o.tablolar)
      .map(([t, v]) => `${t}×${v.adet}/${v.sureMs}ms`).join(' · ')}`);
  }
}

function karsilastirmaYaz(once, sonra) {
  console.log(`\n═══ ${once.etiket} → ${sonra.etiket} ═══\n`);
  const bas = ['yol', 'satır', 'süre (s)', 'sorgu', 'satır/sn', 'zirve yığın'];
  const gov = [];
  /* Eşleştirme yol HARFİ üzerinden yapılır, tam etiket üzerinden DEĞİL:
     etiket metni bir kez değiştiğinde (ör. "B" → "B · ilk aktarım")
     karşılaştırma sessizce BOŞ tablo basıyordu — yani "fark yok" gibi
     görünüyordu. Sessiz boşluk, yanlış sayıdan beterdir. */
  const harf = (o) => o.yol.slice(0, 1);
  const eslenmeyen = [];
  for (const s of sonra.olcumler) {
    const o = once.olcumler.find((x) => harf(x) === harf(s) && x.satir === s.satir);
    if (!o) { eslenmeyen.push(`${harf(s)}/${s.satir}`); continue; }
    const kat = (a, b) => (b === 0 ? '—' : `${(a / b).toFixed(2)}×`);
    gov.push([
      s.yol.slice(0, 1), String(s.satir),
      `${sn(o.sureMs)} → ${sn(s.sureMs)}  (${kat(o.sureMs, s.sureMs)})`,
      `${o.sorgu} → ${s.sorgu}  (${kat(o.sorgu, s.sorgu)})`,
      `${o.satirSn} → ${s.satirSn}`,
      `${o.zirveYiginMb} → ${s.zirveYiginMb} MB`,
    ]);
  }
  if (gov.length === 0) {
    console.log('(karşılaştırılacak ortak ölçüm yok — ÖNCE dosyası başka yol/ölçek taşıyor)');
  } else {
    const gen = bas.map((b, i) => Math.max(b.length, ...gov.map((g) => g[i].length)));
    const yaz = (h) => console.log(h.map((s, i) => s.padEnd(gen[i])).join('  '));
    yaz(bas); console.log(gen.map((g) => '─'.repeat(g)).join('  ')); gov.forEach(yaz);
  }
  if (eslenmeyen.length > 0) {
    console.log(`ÖNCE dosyasında karşılığı olmayan ölçümler: ${eslenmeyen.join(', ')}`);
  }
  console.log('\nZirve yığın GC ZAMANLAMASINA duyarlıdır; koşudan koşuya iki katına ' +
    'çıkabilir. Süre ve sorgu sayısı gibi okunmamalı — sorgu sayısı determinist, ' +
    'süre gürültülü, zirve yığın en gürültülüsüdür.');
}

/* ═══════════════════════════════════════════════════════════════════════
   BÖLÜM 2 — ÇOCUK (tek senaryo ölçer, tek satır JSON basar)
   ═══════════════════════════════════════════════════════════════════════ */

async function cocuk(istek) {
  const [yol, nMetin] = istek.split(':');
  const n = Number(nMetin);

  const { register } = await import('node:module');
  register('data:text/javascript,' + encodeURIComponent(kancaKaynagi()));

  const calisma = fs.mkdtempSync(path.join(os.tmpdir(), 'uyum-olcek-'));
  const olcumDb = path.join(calisma, 'olcum.db');
  fs.copyFileSync(GERCEK_DB, olcumDb);
  dbKorumasi(olcumDb);

  const { PrismaClient } = await import('@/lib/prisma-client/client');
  const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3');

  const ol = new Olcer();
  const db = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${olcumDb}` }),
    log: [{ emit: 'event', level: 'query' }],
  });
  db.$on('query', (e) => ol.sorgu(e.query, e.duration));
  globalThis.prisma = db; // lib/db.ts bunu görür ve KENDİ istemcisini açmaz

  const gercek = (await import('@/lib/db')).db;
  if (gercek !== db) {
    throw new Error('lib/db.ts ölçüm istemcisini almadı — ölçüm izole DEĞİL, durduruldu.');
  }

  const sonuc = yol === 'a'
    ? await senaryoA(db, n, ol)
    : await senaryoB(db, n, ol, yol === 'c');
  await db.$disconnect();
  fs.rmSync(calisma, { recursive: true, force: true });
  console.log('OLCUM ' + JSON.stringify(sonuc));
}

/** Gerçek dev.db'ye yazmayı kaza eseri bile mümkün kılma. */
function dbKorumasi(yol) {
  const n = (p) => fs.realpathSync(path.resolve(p));
  if (n(yol) === n(GERCEK_DB)) {
    throw new Error('olcek.mjs gerçek prisma/dev.db üzerinde çalışamaz — ölçüm kopya üzerinde yapılır.');
  }
}

/* ── Modül çözümleyici kancası ────────────────────────────────────────
   Node uzantısız ve alias'lı importları çözmez; Next'e özgü modüller de
   bu süreçte yoktur. Liste vitest.config.ts'teki alias listesiyle aynı
   amaca hizmet eder: ölçüm, testlerin gördüğü modül grafiğini görsün. */
function kancaKaynagi() {
  return `
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const KOK = ${JSON.stringify(KOK)};
const SAHTE = {
  'server-only': 'export {};',
  'next/cache': 'export function revalidatePath(){}\\nexport function revalidateTag(){}',
  'next/navigation': 'export function redirect(y){throw new Error("redirect: "+y);}\\nexport function notFound(){throw new Error("notFound");}',
  'next/headers': \`
    const jeton = () => process.env.OLCEK_JETON || '';
    export async function cookies(){ return {
      get: (a) => (a === 'oturum' && jeton() ? { name: a, value: jeton() } : undefined),
      set(){}, delete(){}, has: (a) => a === 'oturum' && !!jeton(),
    }; }
    export async function headers(){ return new Map(); }
  \`,
};
function dosyaBul(t) {
  for (const e of ['', '.ts', '.tsx', '.mjs', '.js', '/index.ts', '/index.js']) {
    const y = t + e;
    if (existsSync(y) && statSync(y).isFile()) return y;
  }
  return null;
}
export async function resolve(spec, ctx, next) {
  if (Object.hasOwn(SAHTE, spec)) {
    return { url: 'data:text/javascript,' + encodeURIComponent(SAHTE[spec]), shortCircuit: true };
  }
  if (spec.startsWith('@/')) {
    const y = dosyaBul(path.join(KOK, spec.slice(2)));
    if (y) return { url: pathToFileURL(y).href, shortCircuit: true };
  }
  if (spec.startsWith('.') && ctx.parentURL && ctx.parentURL.startsWith('file:')) {
    const y = dosyaBul(path.resolve(path.dirname(fileURLToPath(ctx.parentURL)), spec));
    if (y) return { url: pathToFileURL(y).href, shortCircuit: true };
  }
  return next(spec, ctx);
}
`;
}

/* ── Ölçer ────────────────────────────────────────────────────────────── */

class Olcer {
  constructor() { this.acik = false; this.q = []; }
  sorgu(sql, sure) { if (this.acik) this.q.push({ t: tabloAdi(sql), s: sure, k: kontrolMu(sql) }); }

  /** Bir senaryoyu ölçer: süre · SQL sayısı · tablo kırılımı · zirve yığın. */
  async olc(fn) {
    this.q = [];
    let zirveYigin = process.memoryUsage().heapUsed;
    let zirveRss = process.memoryUsage.rss();
    const örnek = setInterval(() => {
      const m = process.memoryUsage();
      if (m.heapUsed > zirveYigin) zirveYigin = m.heapUsed;
      if (m.rss > zirveRss) zirveRss = m.rss;
    }, 4);
    örnek.unref();
    this.acik = true;
    const t0 = performance.now();
    let sonuc;
    try { sonuc = await fn(); } finally {
      this.sureMs = performance.now() - t0;
      this.acik = false;
      clearInterval(örnek);
    }
    const q = this.q; this.q = [];
    const tablolar = {};
    for (const k of q) {
      const t = (tablolar[k.t] ??= { adet: 0, sureMs: 0 });
      t.adet += 1; t.sureMs += k.s;
    }
    for (const t of Object.values(tablolar)) t.sureMs = Math.round(t.sureMs);
    // Transaction içi gidiş-dönüş: son COMMIT/ROLLBACK'e kadarki ifadeler.
    let sonKapanis = -1;
    for (let i = q.length - 1; i >= 0; i -= 1) if (q[i].k) { sonKapanis = i; break; }
    return {
      sonuc,
      sorgu: q.length,
      txGidisDonus: sonKapanis >= 0 ? sonKapanis + 1 : q.length,
      sqlSuresiMs: Math.round(q.reduce((s, k) => s + k.s, 0)),
      zirveYigin, zirveRss,
      tablolar: Object.fromEntries(Object.entries(tablolar).sort((a, b) => b[1].adet - a[1].adet)),
    };
  }
}

/** SQL ifadesinden tablo adını çıkarır (maliyet sınıflaması için). */
function tabloAdi(sql) {
  const m = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|FROM)\s+[`"]?(?:main[`"]?\.)?[`"]?(\w+)[`"]?/i.exec(sql);
  if (m) return m[1];
  const t = sql.trim().toUpperCase();
  if (/^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)/.test(t)) return '(tx)';
  return '(diğer)';
}
const kontrolMu = (sql) => /^\s*(COMMIT|ROLLBACK)/i.test(sql);

/** Saf (veritabanına dokunmayan) bir işin süresini ölçer. */
function olcSaf(fn) {
  const t0 = performance.now();
  const sonuc = fn();
  return { sureMs: performance.now() - t0, sonuc };
}

/* ── Sentetik veri (determinist) ──────────────────────────────────────── */

const pad = (i) => String(i).padStart(6, '0');

/** Yol A: regülasyon maddesi satırları.
    Ağaç şekli gerçekçi tutuldu: her 4 satırın ilki üst madde, kalan 3'ü
    ona bağlanır (satırların %75'i `ustKod` taşır) — üst madde araması
    gerçekten ölçülsün diye. Her satır 1 kapsam alanı taşır. */
function maddeSatirlari(n, regKod, alanKod) {
  const s = new Array(n);
  for (let i = 0; i < n; i += 1) {
    s[i] = {
      kod: `${regKod}-M${pad(i)}`,
      baslik: `Madde ${i} — kontrol başlığı`,
      metin: `Sentetik madde metni ${i}. `.repeat(6),
      ustKod: i % 4 === 0 ? null : `${regKod}-M${pad(i - (i % 4))}`,
      kanitTipi: i % 3 === 0 ? 'kayit' : null,
      alanlar: [alanKod],
      islem: 'yeni',
    };
  }
  return s;
}

/** Yol B: CMDB ham satırları (dosyadan gelmiş gibi: başlık → hücre metni). */
const B_BASLIKLAR = ['tag', 'ad', 'tur', 'tesis', 'kritiklik', 'serino', 'mac', 'ip', 'os', 'uretici'];
const B_ESLEME = {
  tag: 'etiket', ad: 'ad', tur: 'turKodu', tesis: 'tesisKodu', kritiklik: 'kritiklik',
  serino: 'seriNo', mac: 'macAdresi', ip: 'ipAdresi', os: 'isletimSistemi', uretici: 'uretici',
};
const onalti = (x) => (x & 255).toString(16).padStart(2, '0');
function varlikSatirlari(n, turKod, tesisKod, onEk) {
  const kr = ['dusuk', 'orta', 'yuksek', 'kritik'];
  const s = new Array(n);
  for (let i = 0; i < n; i += 1) {
    s[i] = {
      tag: `${onEk}-${pad(i)}`,
      ad: `Sentetik varlık ${i}`,
      tur: turKod, tesis: tesisKod,
      kritiklik: kr[i % 4],
      serino: `SN-${onEk}-${pad(i)}`,
      mac: `02:00:${onalti(i >> 24)}:${onalti(i >> 16)}:${onalti(i >> 8)}:${onalti(i)}`,
      ip: `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`,
      os: i % 2 ? 'Windows Server 2019' : 'Debian 12',
      uretici: i % 3 ? 'Siemens' : 'Cisco',
    };
  }
  return s;
}

/* ── Senaryo A · aktarimOnayla ────────────────────────────────────────── */

async function senaryoA(db, n, ol) {
  const { randomBytes, createHash } = await import('node:crypto');
  const { aktarimOnayla } = await import('@/lib/eylemler');

  const damga = Date.now().toString(36);
  const alan = await db.kapsamAlani.findFirstOrThrow();
  const kul = await db.kullanici.create({
    data: { eposta: `olcek.a.${damga}@sentetik.local`, adSoyad: 'Ölçek Onaycı A' } });
  await db.yetki.create({ data: { kullaniciId: kul.id, rol: 'yonetici' } });
  const jeton = randomBytes(32).toString('base64url');
  await db.oturum.create({ data: {
    kullaniciId: kul.id,
    tokenHash: createHash('sha256').update(jeton).digest('hex'),
    bitis: new Date(Date.now() + 3_600_000) } });
  process.env.OLCEK_JETON = jeton; // next/headers ikizi bunu okur

  const regKod = `OLCEK-A-${damga}`.toUpperCase();
  const reg = await db.regulasyon.create({ data: { kod: regKod, ad: 'Ölçek regülasyonu' } });
  const satirlar = maddeSatirlari(n, regKod, alan.kod);
  const raporJson = JSON.stringify({ satirlar, elenenler: [] });
  const aktarim = await db.iceAktarim.create({ data: {
    regulasyonId: reg.id, kaynakTipi: 'excel', kaynakAdi: `olcek-${n}.xlsx`,
    durum: 'dogrulama_bekliyor', okunan: n, raporJson } });

  /* Ayrıştırma maliyeti: fonksiyonun içinde yaptığı JSON.parse'ın AYNISI
     (aynı metin, aynı süreç) — dışarıdan ölçülüyor ki toplam süreden
     ayrıştırmanın payı görülebilsin. */
  const ayristirma = olcSaf(() => JSON.parse(raporJson)).sureMs;

  const m = await ol.olc(() => aktarimOnayla({ id: aktarim.id }));
  if (!m.sonuc?.ok) throw new Error(`aktarimOnayla başarısız: ${m.sonuc?.hata}`);

  /* SAĞLAMA — hızlanma "daha az iş yapmaktan" gelmesin diye sonuç sayılır. */
  const yazilan = await db.madde.count({ where: { regulasyonId: reg.id } });
  if (yazilan !== n) throw new Error(`Yazılan madde ${yazilan} ≠ ${n}`);
  const alanAdet = await db.maddeAlan.count({ where: { madde: { regulasyonId: reg.id } } });
  if (alanAdet !== n) throw new Error(`MaddeAlan ${alanAdet} ≠ ${n}`);
  const bagli = await db.madde.count({ where: { regulasyonId: reg.id, ustMaddeId: { not: null } } });
  const beklenen = n - Math.ceil(n / 4);
  if (bagli !== beklenen) throw new Error(`Üst madde bağı ${bagli} ≠ ${beklenen}`);
  const kayit = await db.iceAktarim.findUniqueOrThrow({ where: { id: aktarim.id } });
  if (kayit.durum !== 'onaylandi' || kayit.eklenen !== n) {
    throw new Error(`Aktarım kaydı beklenmedik: ${kayit.durum} / ${kayit.eklenen}`);
  }
  return ozet('a', n, ol.sureMs, m, { ayristirmaMs: ayristirma, eslemeMs: null, serilestirmeMs: 0 });
}

/* ── Senaryo B · aktarimiUygula ───────────────────────────────────────── */

/** `yeniden` = aynı satırlar bir kez daha aktarılır (hepsi GÜNCELLEME olur).
    Yeni-kayıt yolu ile güncelleme yolu farklı SQL şekilleri üretir; ikisi de
    ölçülmezse optimizasyonun yalnız bir yarısı görülür. */
async function senaryoB(db, n, ol, yeniden = false) {
  const VA = await import('@/lib/entegrasyon/varlikAktarim');

  const damga = Date.now().toString(36).slice(-4).toUpperCase();
  const tur = await db.varlikTuru.create({
    data: { kod: `OLCEK-TUR-${damga}`, ad: 'Ölçek türü', sinif: 'BT' } });
  const tesis = await db.tesis.create({ data: { kod: `OLCEK-TES-${damga}`, ad: 'Ölçek tesisi' } });
  const kul = await db.kullanici.create({
    data: { eposta: `olcek.b.${damga}@sentetik.local`, adSoyad: 'Ölçek Onaycı B' } });
  const onaylayan = {
    id: kul.id, adSoyad: 'Ölçek Onaycı B', eposta: kul.eposta, unvan: null,
    yetkiler: [{ rol: 'yonetici', surecId: null, tesisId: null, tuzelKisiId: null,
      regulasyonId: null, modul: null }],
  };

  const ham = varlikSatirlari(n, tur.kod, tesis.kod, damga);
  /* AZAMI_SATIR (5.000) dosya AYRIŞTIRMA kapısıdır; rapor burada doğrudan
     kurulduğu için 10.000 satır da ölçülebiliyor. Üretimde tek dosya 5.000
     satırla sınırlı — 10.000 ölçümü SENTETİK bir üst sınır denemesidir. */
  const raporJson = JSON.stringify({ ham });
  const aktarimKur = () => db.varlikAktarimi.create({ data: {
    dosyaAdi: `olcek-${n}.csv`, kaynakTipi: 'csv', durum: 'dogrulama_bekliyor',
    basliklarJson: JSON.stringify(B_BASLIKLAR), eslemeJson: JSON.stringify(B_ESLEME),
    okunan: n, raporJson } });

  if (yeniden) {
    // Ön koşu ÖLÇÜLMEZ: yalnız satırların hepsini "mevcut" hâline getirir.
    const on = await aktarimKur();
    const s = await VA.aktarimiUygula({ aktarimId: on.id, onaylayan });
    if (s.eklenen !== n) throw new Error(`Ön koşu ${s.eklenen} ≠ ${n}`);
  }
  const aktarim = await aktarimKur();

  const ayristirma = olcSaf(() => JSON.parse(raporJson)).sureMs;

  /* Eşleme (mapping) maliyeti: commit içindeki `satirlariCoz` çağrısının
     aynısı, aynı girdilerle. Commit'in kendi çağrısına dokunulmaz. */
  const referanslar = await VA.referanslariYukle();
  const mevcutlar = await VA.mevcutVarliklariYukle();
  const kapsam = VA.kapsamKur(onaylayan);
  const esl = olcSaf(() => VA.satirlariCoz({
    satirlar: ham, esleme: B_ESLEME, referanslar, mevcutlar, kapsam }));
  if (esl.sonuc.sayac.gecerli !== n) {
    throw new Error(`Çözüm ${esl.sonuc.sayac.gecerli}/${n} geçerli: ${esl.sonuc.hatalar[0]?.sebep ?? ''}`);
  }
  /* Rapor serileştirme maliyeti: commit sonunda raporJson yeniden yazılır. */
  const seri = olcSaf(() => JSON.stringify({
    ham, satirlar: esl.sonuc.satirlar, hatalar: esl.sonuc.hatalar,
    yinelenenler: esl.sonuc.yinelenenler, hataMesaji: null })).sureMs;

  const m = await ol.olc(() => VA.aktarimiUygula({ aktarimId: aktarim.id, onaylayan }));
  const beklenen = yeniden ? { eklenen: 0, guncellenen: n } : { eklenen: n, guncellenen: 0 };
  if (m.sonuc.eklenen !== beklenen.eklenen || m.sonuc.guncellenen !== beklenen.guncellenen) {
    throw new Error(`Sonuç ${JSON.stringify(m.sonuc)} ≠ ${JSON.stringify(beklenen)}`);
  }

  /* SAĞLAMA — köken ve denetim izi satır başına GERÇEKTEN yazılmış olmalı;
     yeniden aktarımda köken ÇOĞALMAMALI (idempotency sözleşmesi). */
  const koken = await db.veriKokeni.count({ where: { kaynakSistem: `dosya:olcek-${n}.csv` } });
  if (koken !== n) throw new Error(`Köken ${koken} ≠ ${n}`);
  const iz = await db.aktiviteKaydi.count({ where: { korelasyonId: aktarim.id } });
  if (iz !== n) throw new Error(`Denetim izi ${iz} ≠ ${n}`);
  const varlik = await db.varlik.count({ where: { etiket: { startsWith: `${damga}-` } } });
  if (varlik !== n) throw new Error(`Varlık ${varlik} ≠ ${n}`);

  return ozet(yeniden ? 'c' : 'b', n, ol.sureMs, m,
    { ayristirmaMs: ayristirma, eslemeMs: esl.sureMs, serilestirmeMs: seri });
}

function ozet(yol, n, sureMs, m, ek) {
  const kokenIz = ['VeriKokeni', 'AktiviteKaydi'];
  return {
    yol: YOL_ADI[yol], satir: n,
    /* Makine PAYLAŞIMLI olabilir. Yük ölçümün yanında durmazsa iki koşu
       arasındaki fark "iyileşme" sanılır; oysa yalnız komşu iş bitmiştir. */
    yuk: os.loadavg().map((x) => +x.toFixed(2)),
    sureMs, satirSn: Math.round(n / (sureMs / 1000)),
    sorgu: m.sorgu, txGidisDonus: m.txGidisDonus, sqlSuresiMs: m.sqlSuresiMs,
    zirveYigin: m.zirveYigin, zirveYiginMb: mb(m.zirveYigin),
    zirveRssMb: mb(m.zirveRss),
    ayristirmaMs: Math.round(ek.ayristirmaMs),
    eslemeMs: ek.eslemeMs == null ? null : Math.round(ek.eslemeMs),
    serilestirmeMs: Math.round(ek.serilestirmeMs),
    kokenIzMs: kokenIz.reduce((s, t) => s + (m.tablolar[t]?.sureMs ?? 0), 0),
    kokenIzSorgu: kokenIz.reduce((s, t) => s + (m.tablolar[t]?.adet ?? 0), 0),
    tablolar: m.tablolar,
  };
}

/* ═══════════════════════════════════════════════════════════════════════ */

if (ARG.cocuk) await cocuk(ARG.cocuk);
else await surucu();
