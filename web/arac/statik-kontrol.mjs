#!/usr/bin/env node
/* Statik yayın davranış kapısı — `out/` üretildikten SONRA.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Geliştirme kipinde HTML her istekte üretilir: sunucu ile tarayıcı aynı
   anı görür. Statik dışa aktarımda HTML DERLEME ANINDA donar ve ziyaretçi
   onu günler sonra açar. Bu iki an arasındaki farkı gören her istemci
   bileşeni hidrasyonu kırar — ve kusur YALNIZ yayında görünür, `next dev`
   üzerinde asla.

   Ölçüldü: `Genel.tsx` istemci tarafında `new Date()` çağırıyordu. HTML
   "1 Eylül 2026" yazıyordu, tarayıcı ziyaret gününü yazıyordu; React
   #418 fırlatıp o alt ağacın sunucu çıktısını atıyordu. Bütün rota
   taramaları bunu kaçırdı çünkü hepsi `next dev` üzerinde koşuyordu.

   Bu kapı ziyaretçinin saatini ileri alarak yayını gerçekçi koşulda
   açar ve konsola düşen HER hatayı kusur sayar.

   Kullanım: node arac/statik-kontrol.mjs [out dizini]
*/
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createReadStream, statSync } from 'node:fs';
import { chromium } from 'playwright-core';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIKTI = path.resolve(process.argv[2] ?? path.join(WEB, 'out'));
const KOK = /export const YAYIN_KOKU = '([^']+)'/
  .exec(readFileSync(path.join(WEB, 'lib', 'demo.ts'), 'utf8'))[1];

if (!existsSync(CIKTI)) {
  console.error(`statik-kontrol: çıktı dizini yok → ${CIKTI}`);
  process.exit(1);
}

/** Ziyaretçi derlemeden bu kadar sonra bakıyor. */
const SAPMA_GUN = 90;

/* Yayında zamana bakan içerik taşıyan rotalar. Tamamı değil: bu kapı
   davranış kapısıdır, kapsama kapısı `arac/tarama.mjs`tir. */
const ROTALAR = ['/', '/portfoy/', '/uyum/', '/riskler/', '/denetimler/',
  '/bulgular/', '/envanter/', '/tesisler/', '/yonetim-tezgahi/', '/giris/'];

const TIP = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.woff2': 'font/woff2', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};

/* GitHub Pages topolojisini taklit et: site `KOK` altından sunulur. */
const sunucu = http.createServer((istek, yanit) => {
  const yol = decodeURIComponent(istek.url.split('?')[0]);
  if (!yol.startsWith(`${KOK}/`) && yol !== KOK) { yanit.writeHead(404).end(); return; }
  let hedef = path.join(CIKTI, yol.slice(KOK.length));
  try {
    if (statSync(hedef).isDirectory()) hedef = path.join(hedef, 'index.html');
  } catch { yanit.writeHead(404).end(); return; }
  if (!existsSync(hedef)) { yanit.writeHead(404).end(); return; }
  yanit.writeHead(200, { 'content-type': TIP[path.extname(hedef)] ?? 'application/octet-stream' });
  createReadStream(hedef).pipe(yanit);
});
await new Promise((c) => sunucu.listen(0, c));
const TABAN = `http://localhost:${sunucu.address().port}${KOK}`;

/* Tarayıcıyı bul. `playwright-core` tarayıcı indirmez; ortam ne
   veriyorsa onu kullanırız. Adaylar sırayla denenir ve BULUNAMAZSA kapı
   sessizce geçmez, açıkça kırılır — "tarayıcı yoktu" bir doğrulama
   değildir. CI'da iş akışı Chrome kurar (bkz. publish.yml). */
function tarayiciYolu() {
  const adaylar = [
    process.env.CHROMIUM,
    process.env.CHROME_PATH,
    ...globSurucu('/opt/pw-browsers'),
    ...globSurucu(path.join(os.homedir(), '.cache', 'ms-playwright')),
    '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
  ].filter(Boolean);
  for (const y of adaylar) if (existsSync(y)) return y;
  console.error(
    'statik-kontrol: çalıştırılabilir bir Chromium bulunamadı.\n'
    + '  CHROMIUM ortam değişkeniyle yol verin ya da Chrome kurun.\n'
    + `  Denenen yollar: ${adaylar.join(', ')}`,
  );
  process.exit(1);
}

/** `/opt/pw-browsers` altındaki chromium sürümlerinin yollarını üretir. */
function globSurucu(kok) {
  if (!existsSync(kok)) return [];
  return readdirSync(kok)
    .filter((ad) => ad.startsWith('chromium'))
    .map((ad) => path.join(kok, ad, 'chrome-linux', 'chrome'));
}

const tarayici = await chromium.launch({
  executablePath: tarayiciYolu(),
  /* CI konteynerlerinde ayrıcalıksız kullanıcı ad alanları kapalıdır;
     Chrome kum havuzunu başlatamaz. Yalnız CI'da devre dışı bırakılır. */
  args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
});
const baglam = await tarayici.newContext({ viewport: { width: 1440, height: 900 } });
/* Ziyaretçinin saati ileri: derleme anı ile ziyaret anı ayrışsın. */
await baglam.addInitScript(`(() => {
  const SAPMA = ${SAPMA_GUN} * 86400000;
  const Ger = Date;
  Date = class extends Ger {
    constructor(...a) { if (a.length === 0) super(Ger.now() + SAPMA); else super(...a); }
    static now() { return Ger.now() + SAPMA; }
  };
})()`);

let kusur = 0;
for (const rota of ROTALAR) {
  const sayfa = await baglam.newPage();
  const hatalar = [];
  sayfa.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|404 \(Not Found\)|ERR_ABORTED/.test(m.text())) {
      hatalar.push(m.text().slice(0, 150));
    }
  });
  sayfa.on('pageerror', (e) => hatalar.push(`pageerror: ${String(e.message).slice(0, 150)}`));
  try {
    await sayfa.goto(TABAN + rota, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sayfa.waitForTimeout(1800);
  } catch (e) {
    hatalar.push(`yüklenemedi: ${String(e).slice(0, 120)}`);
  }
  const benzersiz = [...new Set(hatalar)];
  if (benzersiz.length) {
    kusur += 1;
    console.error(`✗ ${rota}`);
    for (const h of benzersiz.slice(0, 3)) console.error(`    ${h}`);
  } else {
    console.log(`✓ ${rota}`);
  }
  await sayfa.close();
}

await tarayici.close();
sunucu.close();

if (kusur) {
  console.error(
    `\nstatik-kontrol: ${kusur} rota ziyaretçi saati +${SAPMA_GUN} gün iken hata verdi.\n`
    + 'En sık nedeni: bir istemci bileşeni render sırasında `new Date()` /\n'
    + '`Date.now()` çağırıyor. Değeri sunucuda hesaplayıp prop olarak indir.\n',
  );
  process.exit(1);
}
console.log(`\nstatik-kontrol: ${ROTALAR.length} rota temiz (ziyaretçi saati +${SAPMA_GUN} gün).`);
