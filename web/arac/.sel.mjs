import { chromium } from 'playwright-core';
import { girisYap, tarayiciYolu } from './kosu-ortak.mjs';
const KOK = 'http://127.0.0.1:3210';
const t = await chromium.launch({ executablePath: tarayiciYolu() });
const c = await t.newContext({ viewport: { width: 1440, height: 900 } });
const s = await c.newPage();
await girisYap(s, KOK); await s.goto(`${KOK}/uyum`, { waitUntil: 'networkidle' }); await s.waitForTimeout(400);
console.log(await s.evaluate(() => {
  const sel = document.querySelector('.ab-mercek-dar select');
  if (!sel) return 'select yok';
  const st = getComputedStyle(sel);
  const kap = document.querySelector('.ab-mercek-dar');
  const ks = getComputedStyle(kap);
  return [
    `select: appearance=${st.appearance} bg=${st.backgroundColor} border=${st.borderTopWidth} ${st.borderTopColor}`,
    `        image=${st.backgroundImage.slice(0,60)} radius=${st.borderRadius} shadow=${st.boxShadow}`,
    `        padding=${st.padding} font=${st.fontSize} color=${st.color}`,
    `kap .ab-mercek-dar: bg=${ks.backgroundColor} border=${ks.borderTopWidth} pad=${ks.padding}`,
    `kap kutusu: ${JSON.stringify(kap.getBoundingClientRect().toJSON())}`,
    `select kutusu: ${JSON.stringify(sel.getBoundingClientRect().toJSON())}`,
  ].join('\n');
}));
await t.close();
