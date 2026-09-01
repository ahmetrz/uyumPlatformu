#!/usr/bin/env node
/* Eski tasarım İZ taraması — Faz C kapısı.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   "Eski tasarımı tamamen kaldırdım" cümlesi kanıt ister. Ürün kodunda
   ölü kalan bir sınıf adı, silinmiş bir dosyaya giden bir içe aktarım ya
   da artık hiçbir kuralın tanımadığı bir CSS değişkeni sessizce yaşar:
   derleme geçer, testler geçer, ekran çalışır — ama tasarım katmanı iki
   tanedir ve bir sonraki değişiklik hangisini bozacağını bilemez.

   Bu araç dört şeyi arar ve HERHANGİ BİRİ bulunursa çıkış kodu 1 döner:
     1 · silinmiş dosyalara/klasörlere giden içe aktarım (atlas, ozalit);
     2 · ürün kodunda geçen ESKİ SINIF adları;
     3 · hiçbir stil dosyasında TANIMLANMAYAN `var(--…)` başvurusu;
     4 · hiçbir kaynak dosyada KULLANILMAYAN CSS sınıfı (ölü kural).

   Kullanım: node arac/iz-tarama.mjs [--ayrinti]
*/
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ayrinti = process.argv.includes('--ayrinti');

function dosyalar(kok, uzantilar) {
  const cikti = [];
  const gez = (d) => {
    for (const ad of readdirSync(d)) {
      if (ad === 'node_modules' || ad === '.next' || ad === 'prisma-client') continue;
      const t = path.join(d, ad);
      if (statSync(t).isDirectory()) gez(t);
      else if (uzantilar.some((u) => ad.endsWith(u))) cikti.push(t);
    }
  };
  if (existsSync(kok)) gez(kok);
  return cikti;
}

const KAYNAK = [
  ...dosyalar(path.join(WEB, 'app'), ['.ts', '.tsx']),
  ...dosyalar(path.join(WEB, 'components'), ['.ts', '.tsx']),
  ...dosyalar(path.join(WEB, 'lib'), ['.ts', '.tsx']),
];
const STIL = dosyalar(path.join(WEB, 'app'), ['.css']);
const kaynakMetni = KAYNAK.map((f) => readFileSync(f, 'utf8')).join('\n');
const stilMetni = STIL.map((f) => readFileSync(f, 'utf8')).join('\n');

const kusurlar = [];

/* ── 1 · silinmiş katmanlara giden yollar ──────────────────────────── */
const OLU_YOLLAR = [
  '@/components/atlas', '@/lib/atlas', './atlas.css', './tokens.css',
  'components/ozalit', 'app/(ozalit)',
];
for (const f of KAYNAK.concat(STIL)) {
  const m = readFileSync(f, 'utf8');
  for (const y of OLU_YOLLAR) {
    if (m.includes(y)) kusurlar.push(`ÖLÜ YOL · ${path.relative(WEB, f)} → ${y}`);
  }
}

/* ── 2 · eski sınıf adları ─────────────────────────────────────────── */
const ESKI_SINIFLAR = [
  'shell', 'atlas', 'ozalit',
  'tbl-satir', 'tbl-konu', 'tbl-alt', 'tbl-hucre', 'tbl-ok', 'tbl-bas',
  'tbl-ikincil', 'tbl-kuyruk', 'tbl-dip', 'tbl-sag',
  'cekmece-blok', 'cekmece-alan', 'cekmece-dip', 'cekmece-bagli',
  'cekmece-bas', 'cekmece-govde', 'cekmece-kimlik', 'cekmece-kapat',
  'mtx-bas', 'mtx-satir', 'mtx-hucre', 'mtx-ad', 'mtx-alt',
  't-label', 't-caption', 't-colhead', 't-eyebrow', 't-screen',
  't-section', 't-board', 't-hero', 't-cell', 't-row',
  'filtreler-atlas', 'ekran-bas', 'ekran-govde', 'kapsam-dugme',
  'dg-birincil', 'dg-ikincil', 'dg-cekmece', 'dg-ret', 'dg-satir',
  'gr-etiket', 'gr-hata', 'dip-not', 'bos-filtre', 'koken-rozet',
  'zaman-atlas', 'zaman-kart', 'omur-serit', 'omur-kart', 'omur-bant',
  'gen-satir', 'gen-cocuk', 'tuval-dip', 'baglam-yol', 'baglam-sag',
  'secici-menu', 'secici-oge', 'secici-grup', 'koyu-yuzey',
  'odak-ust', 'odak-baslik', 'odak-cumle', 'odak-seritler', 'odak-serit',
  'odak-eylem', 'odak-hedef', 'tik-serit', 'yazdirmada-gizle',
  'hero360', 'baglam-serit', 'portfoy-ust', 'portfoy-govde', 'portfoy-kimlik',
  'portfoy-tip', 'dosem', 'metrik-sag',
];
const sinifDeseni = (c) => new RegExp(`(?:className=|class=)["'\`][^"'\`]*(?<![\\w-])${c}(?![\\w-])`);
for (const f of KAYNAK) {
  const m = readFileSync(f, 'utf8');
  for (const c of ESKI_SINIFLAR) {
    if (sinifDeseni(c).test(m)) kusurlar.push(`ESKİ SINIF · ${path.relative(WEB, f)} → .${c}`);
  }
}
for (const f of STIL) {
  const m = readFileSync(f, 'utf8');
  for (const c of ESKI_SINIFLAR) {
    if (new RegExp(`(?<![\\w-])\\.${c}(?![\\w-])`).test(m)) {
      kusurlar.push(`ESKİ KURAL · ${path.relative(WEB, f)} → .${c}`);
    }
  }
}

/* ── 3 · tanımsız CSS değişkeni ────────────────────────────────────── */
const tanimli = new Set();
for (const m of stilMetni.matchAll(/(--[\w-]+)\s*:/g)) tanimli.add(m[1]);
/* Bileşenin satır içi stilinde tanımlanan değişkenler (ızgara şablonu
   veriden gelir, CSS'te sabitlenemez): `['--kolon' as string]: …` */
for (const m of kaynakMetni.matchAll(/['"](--[\w-]+)['"]\s*(?:as string\s*)?\]?\s*:/g)) {
  tanimli.add(m[1]);
}
const basvurulan = new Map();
for (const f of KAYNAK.concat(STIL)) {
  const metin = readFileSync(f, 'utf8');
  for (const m of metin.matchAll(/var\((--[\w-]+)/g)) {
    if (!basvurulan.has(m[1])) basvurulan.set(m[1], path.relative(WEB, f));
  }
}
for (const [ad, nerede] of basvurulan) {
  if (!tanimli.has(ad)) kusurlar.push(`TANIMSIZ TOKEN · ${nerede} → var(${ad})`);
}

/* ── 3b · tanımlı ama okunmayan CSS değişkeni ───────────────────────
   Tanımsız token'ı zaten yakalıyorduk (kullanılan ama tanımlanmayan).
   Ters yön de kusurdur: tanımlanmış ama hiçbir yerden `var(...)` ile
   okunmayan token bir sonraki okuyucuya YALAN söyler — "bu ölçü
   burada ayarlanıyor" der, oysa hiçbir şeyi ayarlamaz. Bu denetim
   yokken yedi tane birikmişti (--rail-inset, --rail-pad-top,
   --rail-alan-w, --rail-bg, --ayak-h, --drawer-pad ve 60px'te donmuş
   bir --rail-w); ray genişliği elle üç yere kopyalanmıştı.

   Yön paleti bilerek muaf: `--jes/--hes/--res/--ges` gibi token'lar
   üç yön bloğunda da tanımlanır ama yalnız bazıları okunur; palet
   eksiksiz olmak zorundadır. */
const PALET_ONEKI = /^--(jes|hes|res|ges|i[0-9]|ok|md|bd|pl|unk)$/;
const okunmayan = [...tanimli].filter((t) => !basvurulan.has(t) && !PALET_ONEKI.test(t));
for (const t of okunmayan) kusurlar.push(`ÖLÜ TOKEN · app/*.css → ${t}`);

/* ── 4 · kullanılmayan CSS sınıfı ──────────────────────────────────── */
const cssSiniflari = new Set();
for (const m of stilMetni.matchAll(/\.([a-zA-Z][\w-]*)/g)) cssSiniflari.add(m[1]);
const kullanilmayan = [...cssSiniflari].filter((c) => {
  if (!c.startsWith('ab-')) return false;
  if (new RegExp(`\\b${c}\\b`).test(kaynakMetni)) return false;
  /* CSS'in KENDİ içinde kullanım: `@keyframes ab-halka` ve
     `animation: ab-halka …` gibi. Sınıf tanımı dışında geçiyorsa canlıdır. */
  const gecisler = [...stilMetni.matchAll(new RegExp(`\\b${c}\\b`, 'g'))];
  const tanimlar = [...stilMetni.matchAll(new RegExp(`\\.${c}(?![\\w-])`, 'g'))];
  return gecisler.length <= tanimlar.length;
});
for (const c of kullanilmayan) kusurlar.push(`ÖLÜ KURAL · app/*.css → .${c}`);

/* ── rapor ─────────────────────────────────────────────────────────── */
const gruplar = new Map();
for (const k of kusurlar) {
  const tur = k.split(' · ')[0];
  gruplar.set(tur, (gruplar.get(tur) ?? 0) + 1);
}
console.log(`kaynak dosya: ${KAYNAK.length} · stil dosyası: ${STIL.length}`);
console.log(`tanımlı token: ${tanimli.size} · başvurulan: ${basvurulan.size}`);
console.log(`kabuk sınıfı (ab-): ${[...cssSiniflari].filter((c) => c.startsWith('ab-')).length}`);
if (kusurlar.length === 0) {
  console.log('\nESKİ TASARIM İZİ: 0');
} else {
  console.error(`\nESKİ TASARIM İZİ: ${kusurlar.length}`);
  for (const [t, n] of gruplar) console.error(`  ${t}: ${n}`);
  if (ayrinti) for (const k of kusurlar) console.error(`  · ${k}`);
  else console.error('  (--ayrinti ile tek tek listelenir)');
  process.exitCode = 1;
}
