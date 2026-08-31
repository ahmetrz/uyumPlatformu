import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const OUT = process.env.OUT || '/tmp/kare';
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const s = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const hata = [];
s.on('pageerror', (e) => hata.push('pageerror: ' + e.message.slice(0, 160)));
s.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) hata.push('console: ' + m.text().slice(0, 160)); });

// korumali rotalar icin once giris yap
await s.goto('http://localhost:3111/giris', { waitUntil: 'domcontentloaded' });
if (s.url().includes('/giris')) {
  await s.fill('input[type=email]', 'ahmet.terzi@zorlu.com');
  await s.fill('input[type=password]', 'Enerji!2026');
  await s.click('button[type=submit]');
  await s.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 25000 });
}

const yollar = (process.env.YOLLAR || '/sistem').split(',');
for (const yol of yollar) {
  const ad = yol.replace(/^\//, '').replace(/\//g, '-') || 'kok';
  await s.goto('http://localhost:3111' + yol, { waitUntil: 'domcontentloaded' });
  await s.waitForTimeout(900);
  await s.evaluate(() => document.fonts.ready);
  await s.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 110));
    }
    window.scrollTo(0, 0);
  });
  await s.waitForTimeout(900);
  const font = await s.evaluate(() => {
    const el = document.querySelector('.t-screen') || document.body;
    const c = getComputedStyle(el);
    return { aile: c.fontFamily.split(',')[0], boyut: c.fontSize, yuklu: document.fonts.status };
  });
  await s.screenshot({ path: `${OUT}/${ad}.png`, fullPage: true });
  console.log(`${ad}: font=${font.aile} ${font.boyut} fonts=${font.yuklu}`);
}
console.log('hatalar:', hata.length ? hata.slice(0, 5) : 'YOK');
await b.close();
