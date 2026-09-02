import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const OUT = process.env.OUT || '/tmp/kare';
/* Geliştirme sunucusunun portu sabit değil: paralel çalışan işler 3000'i
   kapmış olabiliyor. PORT ile geç, varsayılan 3000. */
const KOK = `http://localhost:${process.env.PORT || 3000}`;
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
/* Genişlik dışarıdan verilebilir: tasarım incelemesi 1440/1366/1280'i ve
   gerektiğinde dar bantları aynı araçla ister. */
const EN = Number(process.env.EN || 1440);
const BOY = Number(process.env.BOY || 1000);
const s = await b.newPage({ viewport: { width: EN, height: BOY } });
const hata = [];
s.on('pageerror', (e) => hata.push('pageerror: ' + e.message.slice(0, 160)));
s.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) hata.push('console: ' + m.text().slice(0, 160)); });

// korumali rotalar icin once giris yap
await s.goto(KOK + '/giris', { waitUntil: 'domcontentloaded' });
if (s.url().includes('/giris')) {
  await s.fill('input[type=email]', 'ahmet.terzi@zorlu.com');
  await s.fill('input[type=password]', 'Enerji!2026');
  await s.click('button[type=submit]');
  await s.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 25000 });
}

/* Playwright fareyi son tıklama koordinatında bırakır. O nokta sonraki
   sayfada bir tablo satırının üstüne düşerse satır :hover durumunda
   yakalanır — ekran görüntüsünde vurgulu görünür ve denetim bunu zebra
   sanır. Her gezinmeden önce fare tuvalin dışına alınır. */
const fareyiKenaraAl = () => s.mouse.move(2, 2);
await fareyiKenaraAl();

const yollar = (process.env.YOLLAR || '/sistem').split(',');
for (const yol of yollar) {
  const ad = yol.replace(/^\//, '').replace(/\//g, '-') || 'kok';
  await fareyiKenaraAl();
  await s.goto(KOK + yol, { waitUntil: 'domcontentloaded' });
  await s.waitForTimeout(900);
  await s.evaluate(() => document.fonts.ready);
  await s.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 110));
    }
    window.scrollTo(0, 0);
  });
  await fareyiKenaraAl();
  await s.waitForTimeout(900);
  const font = await s.evaluate(() => {
    const el = document.querySelector('.t-screen') || document.body;
    const c = getComputedStyle(el);
    return { aile: c.fontFamily.split(',')[0], boyut: c.fontSize, yuklu: document.fonts.status };
  });
  /* TAM SAYFA yakalamada `position: fixed` durum ayağı sayfanın ORTASINA
     basılmış görünür — görüntü alanının altına sabitlendiği yere. Bu bir
     ÖRTME KUSURU DEĞİL, yakalama artefaktıdır: `.ab-c-govde` ayak
     yüksekliği kadar alt dolgu taşır ve ölçüldüğünde gizlenen içerik
     0px'tir. Not burada duruyor ki bir sonraki görsel inceleme aynı
     hayaleti kovalamasın. */
  await s.screenshot({ path: `${OUT}/${ad}${process.env.EN ? `-${EN}` : ''}.png`, fullPage: true });
  console.log(`${ad}: font=${font.aile} ${font.boyut} fonts=${font.yuklu}`);
}
console.log('hatalar:', hata.length ? hata.slice(0, 5) : 'YOK');
await b.close();
