import { chromium } from 'playwright-core';
const OUT = process.env.OUT;
const KOK = 'http://localhost:3111';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const s = await b.newPage({ viewport: { width: 1440, height: 1100 } });
const hata = [];
s.on('pageerror', (e) => hata.push('pageerror: ' + e.message.slice(0, 200)));
s.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) hata.push('console: ' + m.text().slice(0,200)); });
await s.goto(KOK + '/giris', { waitUntil: 'domcontentloaded' });
if (s.url().includes('/giris')) {
  await s.fill('input[type=email]', 'ahmet.terzi@zorlu.com');
  await s.fill('input[type=password]', 'Enerji!2026');
  await s.click('button[type=submit]');
  await s.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 60000, waitUntil: 'commit' }).catch(() => {});
  await s.waitForTimeout(3000);
}
await s.goto(KOK + '/saglik', { waitUntil: 'domcontentloaded' });
await s.waitForSelector('text=Entegrasyonlar', { timeout: 60000 });
await s.waitForTimeout(800);
console.log('url:', s.url(), '| satır sayısı:', await s.locator('tr').count());
// Nessus satırının (reddedilen>0) Detay düğmesi
const satir = s.locator('tr', { hasText: 'Tenable Nessus' }).first();
await satir.locator('button', { hasText: 'Detay' }).click();
await s.waitForSelector('dialog.kip[open]');
await s.waitForTimeout(400);
await s.screenshot({ path: OUT + '/cekmece-nessus.png' });
await s.keyboard.press('Escape');
await s.waitForTimeout(300);
const satir2 = s.locator('tr', { hasText: 'Zorlu Entra ID' }).first();
await satir2.locator('button', { hasText: 'Detay' }).click();
await s.waitForSelector('dialog.kip[open]');
await s.waitForTimeout(400);
await s.screenshot({ path: OUT + '/cekmece-kimlik.png' });
console.log('hatalar:', hata.length ? hata : 'YOK');
// sır değeri sayfa HTML'inde geçiyor mu?
const html = await s.content();
for (const sir of ['FALCON_CLIENT_SECRET']) console.log('referans HTML de:', html.includes(sir));
await b.close();
