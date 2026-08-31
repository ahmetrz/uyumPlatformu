import { chromium } from 'playwright-core';
const OUT = process.env.OUT;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const s = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await s.goto('http://localhost:3111/giris', { waitUntil: 'domcontentloaded' });
await s.fill('input[type=email]', 'ahmet.terzi@zorlu.com');
await s.fill('input[type=password]', 'Enerji!2026');
await s.click('button[type=submit]');
await s.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 25000 });
await s.goto('http://localhost:3111/sistem/bilesenler', { waitUntil: 'domcontentloaded' });
await s.waitForTimeout(1500);
const bolumler = await s.locator('main section').count();
for (const i of (process.env.INDEKS || '0').split(',').map(Number)) {
  const el = s.locator('main section').nth(i);
  const ad = (await el.locator('h2').first().textContent() || `b${i}`).trim().replace(/[^\wçğıöşüÇĞİÖŞÜ]+/g, '-');
  await el.screenshot({ path: `${OUT}/${i}-${ad}.png` });
  console.log(`${i}: ${ad}`);
}
console.log('toplam bölüm:', bolumler);
await b.close();
