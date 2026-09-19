import { chromium } from 'playwright-core';
import { girisYap, tarayiciYolu } from './kosu-ortak.mjs';
const KOK = 'http://127.0.0.1:3210';
const CIK = '/tmp/claude-0/-home-user-uyumPlatformu/1d9d3f20-97cf-5de9-b457-fb472d9022e5/scratchpad';
const t = await chromium.launch({ executablePath: tarayiciYolu() });
for (const [ad, w] of [['genis', 1440], ['telefon', 390]]) {
  const c = await t.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 3 });
  const s = await c.newPage();
  await girisYap(s, KOK);
  await s.goto(`${KOK}/uyum`, { waitUntil: 'networkidle' });
  await s.waitForTimeout(900);
  for (const [par, sec] of [['ust', '.ab-ust'], ['alt', '.ab-alt'], ['sistem', '.ab-sistem-durumu, .ab-sistem']]) {
    const el = await s.$(sec.split(',')[0].trim()) ?? await s.$(sec.split(',')[1]?.trim() ?? 'nope');
    if (el) { await el.screenshot({ path: `${CIK}/kabuk-${par}-${ad}.png` }); console.log(`${par} ${ad} ✓`); }
    else console.log(`${par} ${ad} — seçici bulunamadı (${sec})`);
  }
  await c.close();
}
await t.close();
