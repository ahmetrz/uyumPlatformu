/* Doğal kaydırma sonunda hit-testing serbest kalmalı (kesirli svh dâhil);
   yol boyunca sayfa yana kaymamalı ve aynı anda en fazla iki kare görünmeli. */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { KOK, tarayiciYolu } from './kosu-ortak.mjs';
const browser = await chromium.launch({ executablePath: tarayiciYolu(), headless: true, args: ['--no-sandbox'] });
try {
  mkdirSync('/tmp/giris-inceleme', { recursive: true });
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 480 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await page.goto(`${KOK}/giris`);
    await page.locator('[data-mod="hareketli"][data-ilerleme]').waitFor();
    const tempo = page.getByLabel('Yolculuk temposu');
    const kutu = await tempo.boundingBox();
    assert.ok(kutu && kutu.y >= 0 && kutu.y + kutu.height <= 480, `kısa ekranda tempo görünmüyor: ${JSON.stringify(kutu)}`);
    await tempo.selectOption('0.72');
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 936 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    let serbest;
    const bekle = new Promise(resolve => { serbest = resolve; });
    await page.route('**/sahne-04-ekran.webp', async route => { await bekle; await route.continue(); });
    await page.goto(`${KOK}/giris`, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForFunction(() => document.querySelector('#platform-arayuzu')?.inert);
      await page.mouse.wheel(0, 300);
      await page.waitForFunction(() => window.scrollY > 8);
      const ilerleme = () => page.locator('[data-mod]').evaluate(el => -el.getBoundingClientRect().top / parseFloat(el.style.getPropertyValue('--mesafe')));
      const once = await ilerleme();
      await page.setViewportSize({ width: 1000, height: 600 });
      await page.waitForTimeout(100);
      assert.ok(Math.abs(await ilerleme() - once) < .001, 'yüklemede ekran boyutu ilerlemeyi sıçrattı');
      await page.getByLabel('Yolculuk temposu').selectOption('0.72');
      assert.ok(Math.abs(await ilerleme() - once) < .001, 'yüklemede tempo ilerlemeyi sıçrattı');
    } finally { serbest(); }
    await page.waitForFunction(() => Number(document.querySelector('[data-mod]')?.getAttribute('data-ilerleme')) > 0);
    assert.equal(await page.locator('[data-mod]').getAttribute('data-mod'), 'hareketli', 'erken kaydırma sahneyi iptal etti');
    await page.getByRole('link', { name: 'Girişi atla' }).click();
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-mod]')?.getAttribute('data-ilerleme') !== null);
    assert.equal(await page.locator('[data-mod]').getAttribute('data-mod'), 'hareketli', 'yenilemede giriş kendiliğinden atlandı');
    await context.close();
  }


  for (const durum of ['hata', 'hata-sona-atla', 'zaman-asimi', 'azaltilmis-hareket']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 936 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    let boz;
    const bekle = new Promise(resolve => { boz = resolve; });
    await page.route('**/sahne-04-ekran.webp', async route => { await bekle; await route.abort(); });
    await page.goto(`${KOK}/giris`, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForFunction(() => document.querySelector('#platform-arayuzu')?.inert);
      await page.mouse.wheel(0, 2000);
      await page.waitForFunction(() => window.scrollY > 1000);
      if (durum === 'hata-sona-atla') {
        await page.locator('#platform-arayuzu').evaluate(el => { el.style.minHeight = '3000px'; });
        await page.keyboard.press('End');
        await page.waitForFunction(() => document.querySelector('section[aria-label="Platforma giriş"]').getBoundingClientRect().top < -100);
      }
      if (durum === 'azaltilmis-hareket') await page.emulateMedia({ reducedMotion: 'reduce' });
      if (!durum.startsWith('hata')) await page.locator('[data-mod="statik"]').waitFor({ timeout: 20000 });
    } finally { boz(); }
    await page.locator('[data-mod="statik"]').waitFor();
    const kutu = await page.getByRole('region', { name: 'Platforma giriş' }).boundingBox();
    assert.ok(kutu && Math.abs(kutu.y) < 2, 'yükleme hatası kullanıcıyı girişten aşağı düşürdü');
    await page.getByRole('link', { name: 'Girişi atla' }).click();
    assert.equal(await page.locator('#platform-arayuzu').evaluate(el => el.inert), false);
    await context.close();
  }
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 936 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await page.goto(`${KOK}/giris`);
    await page.locator('[data-mod="hareketli"][data-ilerleme]').waitFor();
    await page.screenshot({ path: `/tmp/giris-inceleme/${width}-baslangic.png` });
    const mesafe = await page.evaluate(() => parseFloat(document.querySelector('[data-mod="hareketli"]').style.getPropertyValue('--mesafe')));
    assert.ok(mesafe > 936 * 7, `kaydırma mesafesi kısa: ${mesafe}px`);
    /* Yol boyunca örnekle: yatay taşma yok, en fazla iki kare görünür, arayüz
       tamamlanana kadar `inert`. Scroll durunca kare de durur (aynı p → aynı transform). */
    for (const oran of [.12, .27, .45, .58, .7, .82]) {
      await page.evaluate(({ oran }) => {
        const root = document.querySelector('[data-mod="hareketli"]');
        window.scrollTo(0, root.getBoundingClientRect().top + window.scrollY + parseFloat(root.style.getPropertyValue('--mesafe')) * oran);
      }, { oran });
      await page.waitForTimeout(80);
      const durum = await page.evaluate(() => {
        const kareler = [...document.querySelectorAll('[data-kare]')].filter(k => getComputedStyle(k).visibility === 'visible' && parseFloat(getComputedStyle(k).opacity) > 0);
        const ui = document.querySelector('#platform-arayuzu');
        return { tasma: document.documentElement.scrollWidth - document.documentElement.clientWidth, gorunen: kareler.length,
          altOpaklik: Number(kareler[0]?.style.opacity),
          inert: ui.inert, ilerleme: document.querySelector('[data-mod]').dataset.ilerleme, transform: kareler[0]?.style.transform };
      });
      assert.equal(durum.tasma, 0, `yatay taşma @${oran}: ${durum.tasma}px`);
      assert.ok(durum.gorunen >= 1 && durum.gorunen <= 2, `görünen kare @${oran}: ${durum.gorunen}`);
      assert.equal(durum.altOpaklik, 1, `alt kare karardı @${oran}`);
      assert.equal(durum.inert, true, `arayüz erken serbest @${oran}`);
      await page.waitForTimeout(120);
      const sonra = await page.evaluate(() => document.querySelector('[data-kare="uzak"]').parentElement.querySelector('[data-kare][style*="visible"]')?.style.transform);
      assert.equal(sonra, durum.transform, `scroll dururken kare hareket etti @${oran}`);
      if ([.27, .45, .7].includes(oran)) await page.screenshot({ path: `/tmp/giris-inceleme/${width}-${oran}.png` });
    }
    const onceTempo = await page.locator('[data-mod="hareketli"]').getAttribute('data-ilerleme');
    await page.getByLabel('Yolculuk temposu').selectOption('1.35');
    await page.waitForTimeout(80);
    const sonraTempo = await page.locator('[data-mod="hareketli"]').getAttribute('data-ilerleme');
    assert.ok(Math.abs(Number(onceTempo) - Number(sonraTempo)) < .001, 'tempo kamera konumunu sıçrattı');
    await page.evaluate(() => {
      const root = document.querySelector('[data-mod="hareketli"]');
      window.scrollTo(0, root.getBoundingClientRect().top + window.scrollY + parseFloat(root.style.getPropertyValue('--mesafe')));
    });
    await page.locator('[data-tamam="true"]').waitFor();
    assert.equal(await page.locator('#platform-arayuzu').evaluate(el => el.inert), false);
    const input = page.locator('#platform-arayuzu input').first();
    await input.click();
    assert.equal(await input.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.locator('section[aria-label="Platforma giriş"]').evaluate(el => [...el.querySelectorAll('*')].every(child => getComputedStyle(child).visibility === 'hidden')), true);
    /* Geri kaydırma: sahne aynı yolu geri kurar ve arayüz yeniden `inert` olur. */
    await page.evaluate(() => window.scrollBy(0, -400));
    await page.waitForTimeout(120);
    assert.equal(await page.locator('#platform-arayuzu').evaluate(el => el.inert), true, 'geri kaydırmada arayüz inert olmadı');
    await page.evaluate(() => {
      const el = document.querySelector('[data-mod]');
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + parseFloat(el.style.getPropertyValue('--mesafe')));
    });
    await page.locator('[data-tamam="true"]').waitFor();
    await page.reload();
    await page.locator('[data-mod="hareketli"][data-ilerleme]').waitFor();
    assert.ok(Number(await page.locator('[data-mod]').getAttribute('data-ilerleme')) < .01, 'yenileme eski scroll konumunu geri getirdi');
    await context.close();
  }
  console.log('Giriş: iki genişlikte yol boyunca taşma yok, ≤2 kare, scroll durunca sahne durur; doğal scroll sonrası gerçek form tıklanabilir.');
} finally { await browser.close(); }
