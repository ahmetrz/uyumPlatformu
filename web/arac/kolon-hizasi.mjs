#!/usr/bin/env node
/* Kütük kolon hizası kapısı — statik çıktı üzerinde, üç genişlikte.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Kütük ızgarası iki ayrı kararla çizilir: `grid-template-columns` kaç
   kolon olduğunu, `display: none` hangi hücrenin çizilmediğini söyler.
   İkisi AYNI kolonu göstermek zorundadır. Ayrışırsa hiçbir şey hata
   vermez — başlıklar hücrelerden bir kolon kayar ve tablo sessizce
   yalan söyler: "Sahip" yazan kolonda son kullanım tarihi görünür.

   Ölçüldü: dar şablon (`--kolon-dar` / `--kolonlar-dar`) beş ekranda
   hesaplanıyor ama hiçbir kural okumuyordu — dar ekranda kolon
   azaltma hiç çalışmamıştı. Bağlandığında üç ekranda başlık kaydı,
   çünkü başlık işareti iki farklı ad taşıyordu.

   Kapı iki şeyi ölçer:
     1. Başlık ve satır satırının ÇÖZÜLMÜŞ ızgara rayları (piksel
        listesi) birebir aynı mı — şablonlar ayrışmışsa burada çıkar.
     2. Görünen hücre sayıları eşit mi — `display: none` kararı iki
        tarafta ayrışmışsa burada çıkar.

   Hücrenin KENDİ kutusu ölçülmez: bir hücre `justify-self: end` ile
   rayının sağına yaslanabilir (satır sonundaki ok böyle) ve kutu
   konumu rayla karışırsa kapı 19px'lik sahte kusur üretir — üretti,
   ölçüldü.

   Kullanım: node arac/kolon-hizasi.mjs [out dizini]
*/
import { existsSync, readFileSync, readdirSync, createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIKTI = path.resolve(process.argv[2] ?? path.join(WEB, 'out'));
const KOK = /export const YAYIN_KOKU = '([^']+)'/
  .exec(readFileSync(path.join(WEB, 'lib', 'demo.ts'), 'utf8'))[1];

const GENISLIKLER = [1440, 1366, 1280];
const ROTALAR = JSON.parse(readFileSync(path.join(WEB, 'arac', 'rotalar.json'), 'utf8'))
  .map((r) => (typeof r === 'string' ? r : r.yol))
  .filter(Boolean);

if (!existsSync(CIKTI)) {
  console.error(`kolon-hizasi: çıktı dizini yok → ${CIKTI}`);
  process.exit(1);
}

const TIP = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.woff2': 'font/woff2', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};
const sunucu = http.createServer((istek, yanit) => {
  const yol = decodeURIComponent(istek.url.split('?')[0]);
  if (!yol.startsWith(`${KOK}/`) && yol !== KOK) { yanit.writeHead(404).end(); return; }
  let hedef = path.join(CIKTI, yol.slice(KOK.length));
  try { if (statSync(hedef).isDirectory()) hedef = path.join(hedef, 'index.html'); }
  catch { yanit.writeHead(404).end(); return; }
  if (!existsSync(hedef)) { yanit.writeHead(404).end(); return; }
  yanit.writeHead(200, { 'content-type': TIP[path.extname(hedef)] ?? 'application/octet-stream' });
  createReadStream(hedef).pipe(yanit);
});
await new Promise((c) => sunucu.listen(0, c));
const TABAN = `http://localhost:${sunucu.address().port}${KOK}`;

function surucuAdaylari(kok) {
  if (!existsSync(kok)) return [];
  return readdirSync(kok).filter((a) => a.startsWith('chromium'))
    .map((a) => path.join(kok, a, 'chrome-linux', 'chrome'));
}
const yol = [process.env.CHROMIUM, process.env.CHROME_PATH,
  ...surucuAdaylari('/opt/pw-browsers'),
  ...surucuAdaylari(path.join(os.homedir(), '.cache', 'ms-playwright')),
  '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
].filter(Boolean).find((y) => existsSync(y));
if (!yol) {
  console.error('kolon-hizasi: çalıştırılabilir bir Chromium bulunamadı (CHROMIUM ile yol verin).');
  process.exit(1);
}

const tarayici = await chromium.launch({
  executablePath: yol,
  args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
});

const kusurlar = [];
let olculen = 0;
for (const gen of GENISLIKLER) {
  const baglam = await tarayici.newContext({ viewport: { width: gen, height: 900 } });
  for (const rota of ROTALAR) {
    const sayfa = await baglam.newPage();
    try {
      const y = await sayfa.goto(TABAN + rota, { waitUntil: 'domcontentloaded', timeout: 40000 });
      if (!y || y.status() >= 400) { await sayfa.close(); continue; }
    } catch { await sayfa.close(); continue; }
    await sayfa.evaluate(() => document.fonts.ready);
    await sayfa.waitForTimeout(250);
    const bulgu = await sayfa.evaluate(() => {
      const out = [];
      const gorunur = (e) => [...e.children].filter((c) => getComputedStyle(c).display !== 'none');
      for (const tab of document.querySelectorAll('.ab-tablo')) {
        const bas = tab.querySelector('.bas');
        const satir = tab.querySelector('.satir:not(.kuyruk)');
        if (!bas || !satir) continue;
        /* Çözülmüş ray listesi: tarayıcı `grid-template-columns`u
           piksele indirger, `1fr` ve `minmax()` dâhil. */
        const bt = getComputedStyle(bas).gridTemplateColumns;
        const st = getComputedStyle(satir).gridTemplateColumns;
        if (bt !== st) { out.push(`ray ayrışması · başlık [${bt}] · satır [${st}]`); continue; }
        const bn = gorunur(bas).length;
        const sn = gorunur(satir).length;
        if (bn !== sn) out.push(`başlık ${bn} hücre, satır ${sn} hücre`);
      }
      return out;
    });
    olculen += 1;
    for (const b of bulgu) kusurlar.push(`${gen}px · ${rota} → ${b}`);
    await sayfa.close();
  }
  await baglam.close();
}

await tarayici.close();
sunucu.close();

if (kusurlar.length) {
  console.error(`\nkolon-hizasi: ${kusurlar.length} kusur\n`);
  for (const k of kusurlar) console.error(`  ${k}`);
  console.error('\nBaşlık ile satır aynı rayları ve aynı sayıda görünen hücreyi taşımalı.\n');
  process.exit(1);
}
console.log(`kolon-hizasi: ${olculen} sayfa ölçüldü (${GENISLIKLER.join('/')}px), kolonlar hizalı.`);
