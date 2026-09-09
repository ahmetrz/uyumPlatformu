#!/usr/bin/env node
/* COMPOSE KURULUMU DUMAN KAPISI (P7 · 2.5)
   ═══════════════════════════════════════════════════════════════════════
   Bu, ürünün MÜŞTERİ ORTAMINDA çalıştığının tek kanıtıdır.

   Geliştirme kabuğunda koşan `next dev`, kurulum değildir: orada kaynak
   ağacı, geliştirme veritabanı, ana makinenin `node_modules`'ı ve
   derlenmemiş sayfa vardır. Kurulumda hiçbiri yoktur. Aradaki farkın
   ürünü bozup bozmadığı ancak KURULUMUN KENDİSİ ölçülerek bilinir.

   Sıra:
     1 · imaj derlenir ve yığın kalkar (`docker compose up -d --build`)
     2 · READINESS ucu 200 dönene kadar beklenir — süre ÖLÇÜLÜR
     3 · kurulum tohumlanır (kapı fikstürü; kurulum normalde BOŞ gelir)
     4 · dinamik rota değerleri KURULUMUN veritabanından okunur
     5 · `rota-duman.mjs` yayımlanan porta karşı koşar
     6 · yığın indirilir ve İNDİĞİ DOĞRULANIR

   ── NEDEN TOHUM DEĞERLERİ KURULUMDAN OKUNUR ───────────────────────────
   Kimlikler `@default(cuid())` ile üretilir. Ana makinenin `dev.db`sindeki
   `id`ler bu kurulumda YOKTUR; onlarla URL kurmak her dinamik rotayı 404
   yapar ve kapı, ürün sağlamken kırmızı yanar. Değerler kurulumun kendi
   veritabanından ölçülür ve `TOHUM_JSON` ile duman testine verilir.

   ── NEDEN TEMİZLİK DOĞRULANIR ─────────────────────────────────────────
   "İndirdim" bir iddiadır. Ayakta kalan bir yığın, bir sonraki koşuyu
   bayat kurulumla ölçer ve kusuru koda yazdırır (depo bu tuzağı `next
   start` ile bir kez yaşadı). İndirme SONRA doğrulanır: kapsayıcı listesi
   boş VE port kapalı. Doğrulanamıyorsa KIRMIZI.

   Kullanım:
     node arac/compose-duman.mjs            → tam kapı
     node arac/compose-duman.mjs --tut      → yığını AYAKTA bırakır (hata ayıklama)
     CA_DEMETI=/yol/ca.crt node arac/compose-duman.mjs   → kesici vekil arkasında
   ═══════════════════════════════════════════════════════════════════════ */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KOK = path.resolve(WEB, '..');
const COMPOSE = path.join(KOK, 'deploy', 'compose');
const ENV_DOSYA = path.join(COMPOSE, '.env');
const TUT = process.argv.includes('--tut');
const PORT = Number(process.env.COMPOSE_PORT || 3200);

const yaz = (m) => console.log(m);
function kirmizi(m) { console.error(`\nKIRMIZI · ${m}`); process.exit(1); }

/* ── 0 · araçlar ──────────────────────────────────────────────────── */

function komut(ad, args, o = {}) {
  return spawnSync(ad, args, { encoding: 'utf8', cwd: COMPOSE, ...o });
}

function aracVar(ad, args) {
  const r = spawnSync(ad, args, { encoding: 'utf8' });
  return !r.error && r.status === 0;
}

if (!aracVar('docker', ['--version'])) {
  kirmizi('docker bulunamadı. Bu kapı gerçek bir kurulum ayağa kaldırır; '
    + 'docker olmadan ÖLÇÜLEMEZ — "geçti" yazılmaz, kırmızıdır.');
}
if (!aracVar('docker', ['compose', 'version'])) {
  kirmizi('docker compose (v2) bulunamadı.');
}

/* ── 1 · sırlar ───────────────────────────────────────────────────── */

/* Kapının kendi `.env`i ÜRETİLİR ve depoya girmez. Sabit bir parola
   yazmak, depoya sır koymak olurdu; `ornek.env` de boş gelir ve boş
   bırakılan zorunlu değer kurulumu başlatmaz (bu kapının ölçtüğü
   davranışlardan biri). */
let uretildi = false;
if (!existsSync(ENV_DOSYA)) {
  const ornek = readFileSync(path.join(COMPOSE, 'ornek.env'), 'utf8');
  writeFileSync(ENV_DOSYA, ornek
    .replace('PG_PAROLA=', `PG_PAROLA=${randomBytes(24).toString('base64url')}`)
    .replace('KIRACI_AD=', 'KIRACI_AD=Duman Kapısı Kurulumu')
    .replace('UYGULAMA_PORTU=3000', `UYGULAMA_PORTU=${PORT}`));
  uretildi = true;
  yaz(`· .env üretildi (parola rastgele, depoya girmez) · port ${PORT}`);
} else {
  yaz('· mevcut deploy/compose/.env kullanılıyor');
}

const CA = process.env.CA_DEMETI?.trim();
const ortam = { ...process.env, ...(CA ? { CA_DEMETI: CA } : {}) };
const composeArgs = ['compose', '--env-file', '.env'];

function indir() {
  komut('docker', [...composeArgs, 'down', '-v', '--remove-orphans'], { env: ortam, stdio: 'inherit' });
}

/* ── 2 · yığını kaldır ────────────────────────────────────────────── */

yaz('\n1 · yığın kalkıyor (docker compose up -d --build)…');
const kalk = komut('docker', [...composeArgs, 'up', '-d', '--build'],
  { env: ortam, stdio: 'inherit', timeout: 30 * 60_000 });
if (kalk.status !== 0) { indir(); kirmizi('yığın kalkmadı (docker compose up)'); }

/* ── 3 · hazır olana kadar bekle ──────────────────────────────────── */

const SAGLIK = `http://127.0.0.1:${PORT}/api/v1/health`;
const bekle = (ms) => spawnSync(process.execPath, ['-e', `setTimeout(()=>{}, ${ms})`]);

function saglikOku() {
  const r = spawnSync('curl', ['-s', '-o', '/tmp/uyum-saglik.json', '-w', '%{http_code}', SAGLIK],
    { encoding: 'utf8' });
  const govde = existsSync('/tmp/uyum-saglik.json')
    ? readFileSync('/tmp/uyum-saglik.json', 'utf8') : '';
  return { kod: Number(r.stdout || 0), govde };
}

yaz(`\n2 · readiness bekleniyor: ${SAGLIK}`);
const basladi = Date.now();
let saglik = { kod: 0, govde: '' };
for (let i = 0; i < 90; i += 1) {
  saglik = saglikOku();
  if (saglik.kod === 200) break;
  bekle(2000);
}
const sure = ((Date.now() - basladi) / 1000).toFixed(1);
if (saglik.kod !== 200) {
  console.error(`son gövde: ${saglik.govde.slice(0, 400)}`);
  komut('docker', [...composeArgs, 'logs', '--tail', '60', 'uygulama'], { env: ortam, stdio: 'inherit' });
  if (!TUT) indir();
  kirmizi(`kurulum ${sure} sn içinde HAZIR olmadı (son kod ${saglik.kod})`);
}
let saglikJson = {};
try { saglikJson = JSON.parse(saglik.govde); } catch { /* gövde bozuksa aşağıda görünür */ }
yaz(`   HAZIR · ${sure} sn · sağlayıcı ${saglikJson.saglayici ?? '?'} · `
  + `bağımlılık ${(saglikJson.bagimliliklar ?? []).map((b) => `${b.ad}:${b.durum}`).join(' ')}`);
if (saglikJson.saglayici !== 'postgresql') {
  if (!TUT) indir();
  kirmizi(`kurulum PostgreSQL'de değil (saglayici=${saglikJson.saglayici}). `
    + 'Bu, `DATABASE_URL`in kaba ulaşmadığı ve kurulumun geliştirme veritabanına düştüğü anlamına gelir.');
}

/* ── 4 · tohum (kapı fikstürü) ────────────────────────────────────── */

/* Kurulum BOŞ gelir; bu doğru üründür (`docs/KURULUM.md` §5). Duman testi
   ekranları oturumlu ve kayıtlı ölçmek için tohuma ihtiyaç duyar ve bunu
   KENDİ FİKSTÜRÜ olarak kurar — ürünün kurulum davranışı değişmez. */
yaz('\n3 · kurulum tohumlanıyor (kapı fikstürü)…');

/* TOHUM ÜRETİM İMAJINDAN KOŞMAZ — ve bu bir engel değil, doğru sınırdır.
   Üretim imajı `lib/` KAYNAĞINI taşımaz (taşımamalı: kaynak `.next` içine
   derlenmiştir ve üretimde okunmaz), `prisma/seed.ts` ise `lib/`den okur.
   Tohumu koşturabilmek için üretim imajına kaynak eklemek, bir KAPI
   fikstürü uğruna müşteri imajını büyütmek olurdu.

   Bunun yerine DERLEME AŞAMASI imajı kullanılır: tam kaynak ve PostgreSQL
   için üretilmiş Prisma istemcisi zaten oradadır. Katmanlar aynı olduğu
   için ek derleme maliyeti yoktur. */
const tohumImaji = 'uyum-platformu-tohum:kapi';
const derle = komut('docker', ['build', '--target', 'derleme', '-t', tohumImaji,
  '-f', path.join(KOK, 'deploy', 'compose', 'Dockerfile'),
  ...(CA ? ['--secret', `id=ca_demeti,src=${CA}`] : []), KOK],
{ env: ortam, stdio: 'inherit', timeout: 30 * 60_000 });
if (derle.status !== 0) { if (!TUT) indir(); kirmizi('tohum imajı derlenemedi'); }

/* Ağ adı TAHMİN EDİLMEZ, kapsayıcıdan okunur: compose proje adı
   değiştiğinde `<proje>_default` varsayımı sessizce yanlış ağa bağlanır
   ve tohum "veritabanı bulunamadı" der — kusur kurulumda sanılırdı. */
const dbKapsayici = (komut('docker', [...composeArgs, 'ps', '-q', 'veritabani'],
  { env: ortam }).stdout || '').trim().split('\n')[0];
const ag = (komut('docker', ['inspect', '-f',
  '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}', dbKapsayici],
{ env: ortam }).stdout || '').trim();
if (!ag) { if (!TUT) indir(); kirmizi('compose ağı okunamadı'); }

const envMetni = readFileSync(ENV_DOSYA, 'utf8');
const envAl = (a) => envMetni.match(new RegExp(`^${a}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
const tohumUrl = `postgresql://${envAl('PG_KULLANICI')}:${encodeURIComponent(envAl('PG_PAROLA'))}`
  + `@veritabani:5432/${envAl('PG_VERITABANI')}`;
const tohum = komut('docker', ['run', '--rm', '--network', ag, '-e', `DATABASE_URL=${tohumUrl}`,
  '-w', '/kaynak/web', tohumImaji, './node_modules/.bin/tsx', 'prisma/seed.ts'],
{ env: ortam, stdio: 'inherit', timeout: 30 * 60_000 });
if (tohum.status !== 0) { if (!TUT) indir(); kirmizi('kurulum tohumlanamadı'); }

/* ── 5 · dinamik rota değerleri KURULUMDAN ────────────────────────── */

const SORGULAR = {
  '/tesisler/[id]': { sql: 'select id from "Tesis" order by kod limit 3', kaynak: 'Tesis.id (kurulum)' },
  '/riskler/[id]': { sql: 'select id from "Risk" where silindi is null order by baslik limit 3', kaynak: 'Risk.id (kurulum)' },
  '/denetimler/[id]': { sql: 'select id from "Denetim" where silindi is null order by ad limit 3', kaynak: 'Denetim.id (kurulum)' },
  '/surecler/[id]': { sql: 'select id from "UyumSureci" order by ad limit 3', kaynak: 'UyumSureci.id (kurulum)' },
  '/bulgular/[id]': { sql: 'select id from "Bulgu" order by baslik limit 3', kaynak: 'Bulgu.id (kurulum)' },
  '/uyum/[cerceve]': { sql: 'select kod from "Regulasyon" order by kod limit 3', kaynak: 'Regulasyon.kod (kurulum)' },
};

function pgSorgu(sql) {
  const r = komut('docker', [...composeArgs, 'exec', '-T', 'veritabani',
    'psql', '-U', envAl('PG_KULLANICI'), '-d', envAl('PG_VERITABANI'), '-At', '-c', sql], { env: ortam });
  if (r.status !== 0) return null;
  return r.stdout.split('\n').map((x) => x.trim()).filter((x) => x.length > 0);
}

yaz('\n4 · dinamik rota değerleri kurulumun veritabanından okunuyor…');
const tohumJson = {};
const eksik = [];
for (const [rota, { sql, kaynak }] of Object.entries(SORGULAR)) {
  const degerler = pgSorgu(sql);
  if (!degerler || degerler.length === 0) { eksik.push(rota); continue; }
  tohumJson[rota] = { degerler, kaynak };
}
if (eksik.length > 0) {
  /* Boş dönen sorgu SESSİZ GEÇMEZ: duman testi o rotayı "ölçülmedi" diye
     raporlayacak ve kapsam sayısı düşecek — ama sebebi burada da yazılır. */
  yaz(`   UYARI · kurulumda kayıt bulunamayan rota: ${eksik.join(', ')}`);
}
const gecici = path.join(WEB, '.gecici');
mkdirSync(gecici, { recursive: true });
const tohumYolu = path.join(gecici, 'compose-tohum.json');
writeFileSync(tohumYolu, `${JSON.stringify(tohumJson, null, 2)}\n`);
yaz(`   ${Object.keys(tohumJson).length} rota · ${tohumYolu}`);

/* ── 6 · rota duman testi KURULUMA karşı ──────────────────────────── */

yaz(`\n5 · rota duman testi · http://localhost:${PORT}`);
const duman = spawnSync(process.execPath, [path.join(WEB, 'arac', 'rota-duman.mjs')], {
  cwd: WEB,
  env: { ...process.env, PORT: String(PORT), TOHUM_JSON: tohumYolu },
  stdio: 'inherit',
  timeout: 30 * 60_000,
});

/* ── 7 · indir ve İNDİĞİNİ DOĞRULA ────────────────────────────────── */

let temizlikKusuru = null;
if (TUT) {
  yaz(`\n6 · --tut verildi: yığın AYAKTA bırakıldı (port ${PORT}). `
    + `İndirmek için: cd deploy/compose && docker compose --env-file .env down -v`);
} else {
  yaz('\n6 · yığın indiriliyor ve indiği DOĞRULANIYOR…');
  indir();
  /* İki AYRI araçla ölçülür: kapsayıcı listesi compose'un kendi
     görüşüdür, port ise dışarıdan bakan bağımsız bir tanıktır. Tek araca
     bakan kontrol, o araç yanılırsa kandırılır. */
  const kalan = komut('docker', [...composeArgs, 'ps', '-q'], { env: ortam });
  const kalanSayi = (kalan.stdout || '').split('\n').filter((x) => x.trim()).length;
  const portKod = saglikOku().kod;
  if (kalanSayi > 0) temizlikKusuru = `${kalanSayi} kapsayıcı ayakta kaldı`;
  else if (portKod !== 0) temizlikKusuru = `port ${PORT} hâlâ cevap veriyor (kod ${portKod})`;
  else yaz(`   temiz · kapsayıcı 0 · port ${PORT} kapalı`);
  if (uretildi) rmSync(ENV_DOSYA, { force: true });
}

if (duman.status !== 0) kirmizi(`rota duman testi düştü (çıkış ${duman.status})`);
if (temizlikKusuru !== null) kirmizi(`temizlik doğrulanamadı: ${temizlikKusuru}`);
yaz('\nYEŞİL · compose ile ayağa kalkan kurulumda rota duman testi geçti.');
