// Tek seferlik kanıt turu: giriş → kilit rotalar → ekran görüntüsü + ölçüm.
// web/ dizininden çalıştır: node /home/ubuntu/energy_governance_platform/denetim/kanit-topla.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const KOK = 'http://localhost:3111';
const CIKTI = '/home/ubuntu/energy_governance_platform/denetim/ekran';
fs.mkdirSync(CIKTI, { recursive: true });
const TESIS = 'cmtkftdpj0007qksiq8mpslu4';

const ROTALAR = ['/', '/portfoy', `/tesisler/${TESIS}`, '/uyum', '/envanter', '/riskler', '/bulgular', '/denetimler', '/topoloji', '/saglik', '/projeler', '/kesif', '/ayarlar', '/yardim'];
const SAHA_VP = [[1440, 900], [1440, 1080], [1366, 768], [1280, 800], [1024, 768]];

const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
const s = await ctx.newPage();
await s.goto(`${KOK}/giris`, { waitUntil: 'load' });
await s.fill('input[type=email]', 'ahmet.terzi@zorlu.com');
await s.fill('input[type=password]', 'Enerji!2026');
await Promise.all([s.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 30000 }), s.click('button[type=submit]')]);

const olcum = {};
const olc = async (etiket) => {
  olcum[etiket] = await s.evaluate(() => {
    const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), h: Math.round(b.height) }; };
    const fonts = new Set();
    for (const e of document.querySelectorAll('h1,h2,h3,p,td,th,span,a,button,dt,dd,li,label,small')) fonts.add(getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, ''));
    return {
      scrollH: document.documentElement.scrollHeight,
      vpH: innerHeight, vpW: innerWidth,
      yon: document.querySelector('.ab')?.dataset.yon,
      header: r('header'), nav: r('nav'), main: r('main'), footer: r('footer'),
      alan: r('.ab-b-alan'), dikkat: r('.ab-b-dikkat'), katman: r('.ab-b-katman'), serit: r('.ab-b-serit'), bant: r('.ab-b-bant'), kpi: r('.ab-kpi'), egilim: r('.ab-b-egilim'), takim: r('.ab-b-takim'),
      h1: document.querySelector('h1')?.textContent?.trim().slice(0, 80),
      h2ler: [...document.querySelectorAll('h2')].map((e) => e.textContent.trim().slice(0, 50)),
      fonts: [...fonts],
      ariaCurrent: document.querySelectorAll('[aria-current]').length,
      tablolar: document.querySelectorAll('table').length,
      svg: document.querySelectorAll('svg').length,
      dugmeler: document.querySelectorAll('button,a').length,
      metin11alti: [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 11).length,
    };
  });
};

for (const [w, h] of SAHA_VP) {
  await s.setViewportSize({ width: w, height: h });
  await s.goto(KOK + '/', { waitUntil: 'networkidle' });
  await s.waitForTimeout(600);
  await s.screenshot({ path: path.join(CIKTI, `saha-${w}x${h}.png`), fullPage: false });
  if (w === 1366) await s.screenshot({ path: path.join(CIKTI, `saha-${w}x${h}-tam.png`), fullPage: true });
  await olc(`saha ${w}x${h}`);
}

await s.setViewportSize({ width: 1366, height: 768 });
for (const rota of ROTALAR.slice(1)) {
  const ad = rota.replace(/\//g, '_').replace(/^_/, '') || 'kok';
  const y = await s.goto(KOK + rota, { waitUntil: 'networkidle' });
  await s.waitForTimeout(500);
  await s.screenshot({ path: path.join(CIKTI, `${ad}-1366.png`), fullPage: false });
  await olc(rota);
  olcum[rota].status = y?.status();
}
// Dokunmatik genişlik: nav kayboluyor mu?
await s.setViewportSize({ width: 900, height: 700 });
await s.goto(KOK + '/uyum', { waitUntil: 'networkidle' });
await s.screenshot({ path: path.join(CIKTI, `uyum-900.png`) });
await olc('/uyum 900');
await s.goto(KOK + '/envanter', { waitUntil: 'networkidle' });
await s.screenshot({ path: path.join(CIKTI, `envanter-900.png`) });
await olc('/envanter 900');

fs.writeFileSync(path.join(CIKTI, 'olcum.json'), JSON.stringify(olcum, null, 2));
console.log(JSON.stringify(olcum, null, 1));
await b.close();
