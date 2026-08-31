import { chromium } from 'playwright-core';
const KOK = `http://localhost:${process.env.PORT || 3111}`;
const OUT = process.env.OUT || '/tmp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const s = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const hata = [];
s.on('pageerror', (e) => hata.push('pageerror: ' + e.message.slice(0, 300)));
s.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) hata.push('console: ' + m.text().slice(0, 300)); });

await s.goto(KOK + '/giris', { waitUntil: 'domcontentloaded', timeout: 120000 });
if (s.url().includes('/giris')) {
  await s.fill('input[type=email]', 'ahmet.terzi@zorlu.com');
  await s.fill('input[type=password]', 'Enerji!2026');
  await s.click('button[type=submit]');
  await s.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 120000 });
}
await s.mouse.move(2, 2);
await s.goto(KOK + '/kesif', { waitUntil: 'domcontentloaded', timeout: 120000 });
await s.waitForTimeout(2000);

// mevcut bir varlığın etiketini al (eşleşme olsun diye)
await s.goto(KOK + '/envanter', { waitUntil: 'domcontentloaded', timeout: 120000 });
await s.waitForTimeout(1500);
const etiketler = await s.evaluate(() => [...document.querySelectorAll('.tbl-konu')].slice(0, 3).map((e) => e.textContent.trim()));
console.log('ETIKETLER:', etiketler);

await s.goto(KOK + '/kesif', { waitUntil: 'domcontentloaded', timeout: 120000 });
await s.waitForTimeout(1500);
await s.click('summary:has-text("Dışa aktarım yükle")');
await s.waitForTimeout(300);
await s.fill('input.gr', 'GECICI GORSEL DENEME — SCADA dışa aktarımı');
const csv = [
  'asset_tag,hostname,serial_number,mac,ip,vendor,model,firmware',
  `${etiketler[0] ?? 'VRL-1'},plc-kizildere-01,,,10.20.30.11,Siemens,S7-1500,FW-4.2.1`,
  `${etiketler[1] ?? 'VRL-2'},hmi-op-02,SN-GD-2,,10.20.30.12,Siemens,TP1500,`,
  ',ews-yeni-03,SN-GD-3,00:1B:1B:AA:BB:03,10.20.30.13,Siemens,IPC427,',
  ',bilinmeyen-dugum,,,10.20.30.44,,,',
  ',rtu-saha-06,SN-GD-6,00:1B:1B:AA:BB:06,10.20.30.16,ABB,RTU560,FW-2.0',
].join('\n');
await s.fill('textarea.gr', csv);
await s.click('button:has-text("Keşif kuyruğuna işle")');
await s.waitForTimeout(5000);
await s.mouse.move(2, 2);
await s.reload({ waitUntil: 'domcontentloaded' });
await s.waitForTimeout(2500);
console.log('--- LISTE ---');
console.log((await s.evaluate(() => document.body.innerText)).slice(0, 1800));
await s.screenshot({ path: OUT + '/kesif-liste.png', fullPage: true });

// ilk satırı seç → çekmece
const satir = await s.$('.tbl-satir:not(.tbl-kuyruk)');
if (satir) { await satir.click(); await s.waitForTimeout(1200); await s.mouse.move(2, 2); await s.waitForTimeout(300); }
await s.screenshot({ path: OUT + '/kesif-cekmece.png', fullPage: true });
console.log('--- CEKMECE ---');
console.log((await s.evaluate(() => document.querySelector('.cekmece')?.innerText ?? '(çekmece yok)')).slice(0, 1500));
console.log('--- HATA ---');
console.log(hata.join('\n') || '(yok)');
await b.close();
