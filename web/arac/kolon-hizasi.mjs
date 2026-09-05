#!/usr/bin/env node
/* Kütük kolon hizası kapısı — statik çıktı üzerinde, üç genişlikte.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Faz 3'te kütük `<table class="ab-vt">` semantik tablodur; başlık ve
   hücre aynı sütun modelinden geçer, ray ayrışması yapısal olarak
   mümkün değildir. Geriye tek karar kalır: ≤1366px bantta gizlenen
   İKİNCİL sütun (`.ikincil-k`) başlıkta ve hücrede AYNI anda gizlenmeli.
   Ayrışırsa hiçbir şey hata vermez — "Sahip" yazan sütunun altında son
   kullanım tarihi görünür ve tablo sessizce yalan söyler.

   Kapı üç şeyi ölçer:
     1. Başlık satırında görünen `<th>` sayısı = ilk veri satırında
        görünen hücre sayısı.
     2. Her görünen başlığın sol kenarı, aynı sıradaki hücrenin sol
        kenarıyla ±1px hizalı.
     3. Tablo, kaydırma kabını (`.ab-vt-sar`) yatayda aşmıyor — aşıyorsa
        yapışkan başlık kayar ve genişlik sözleşmesi bozulmuştur.

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
      for (const tab of document.querySelectorAll('table.ab-vt')) {
        const basHucreler = gorunur(tab.querySelector('thead tr') ?? tab);
        const veri = tab.querySelector('tbody tr[aria-rowindex]');
        if (!veri || basHucreler.length === 0) continue;
        const satirHucreleri = gorunur(veri);
        if (basHucreler.length !== satirHucreleri.length) {
          out.push(`başlık ${basHucreler.length} hücre, satır ${satirHucreleri.length} hücre`);
          continue;
        }
        basHucreler.forEach((b, i) => {
          const fark = Math.abs(b.getBoundingClientRect().left - satirHucreleri[i].getBoundingClientRect().left);
          if (fark > 1) out.push(`${i + 1}. sütun · başlık/hücre sol kenarı ${fark.toFixed(1)}px ayrık`);
        });
        const sar = tab.closest('.ab-vt-sar');
        if (sar && tab.scrollWidth > sar.clientWidth + 1) {
          out.push(`tablo ${tab.scrollWidth}px, kap ${sar.clientWidth}px · yatay taşma`);
        }
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
  console.error('\nBaşlık ile satır aynı sayıda görünen hücreyi, aynı sol kenarlarda taşımalı; tablo kabını aşmamalı.\n');
  process.exit(1);
}
console.log(`kolon-hizasi: ${olculen} sayfa ölçüldü (${GENISLIKLER.join('/')}px), kolonlar hizalı.`);
