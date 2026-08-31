import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const s = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await s.goto('http://localhost:3111/giris', { waitUntil: 'domcontentloaded' });
await s.fill('input[type=email]', 'ahmet.terzi@zorlu.com');
await s.fill('input[type=password]', 'Enerji!2026');
await s.click('button[type=submit]');
await s.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 25000 });
await s.goto('http://localhost:3111' + process.env.YOL, { waitUntil: 'domcontentloaded' });
await s.waitForTimeout(1500);
const olc = await s.evaluate(() => {
  const k = (sel) => { const e = document.querySelector(sel); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.x), sag: Math.round(r.right), en: Math.round(r.width), boy: Math.round(r.height) }; };
  const yol = document.querySelector('.baglam-yol'), sag = document.querySelector('.baglam-sag');
  const cakisma = yol && sag ? Math.round(yol.getBoundingClientRect().right - sag.getBoundingClientRect().left) : null;
  return {
    hero: k('.hero360'), alt: k('.hero360 .alt'), saha: k('.hero360 .saha'),
    metrikler: k('.hero360 .metrikler'), baglamYol: k('.baglam-yol'), baglamSag: k('.baglam-sag'),
    cakismaPx: cakisma,
  };
});
console.log(JSON.stringify(olc, null, 1));
await b.close();
