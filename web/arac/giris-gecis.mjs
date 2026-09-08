/* Doğal kaydırma sonunda hit-testing serbest kalmalı (kesirli svh dâhil);
   yol boyunca sayfa yana kaymamalı ve aynı anda en fazla iki kare görünmeli. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { KOK, tarayiciYolu } from './kosu-ortak.mjs';
const browser = await chromium.launch({ executablePath: tarayiciYolu(), headless: true, args: ['--no-sandbox'] });
try {
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 936 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await page.goto(`${KOK}/giris`);
    await page.locator('[data-mod="hareketli"]').waitFor();
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
          inert: ui.inert, ilerleme: document.querySelector('[data-mod]').dataset.ilerleme, transform: kareler[0]?.style.transform };
      });
      assert.equal(durum.tasma, 0, `yatay taşma @${oran}: ${durum.tasma}px`);
      assert.ok(durum.gorunen >= 1 && durum.gorunen <= 2, `görünen kare @${oran}: ${durum.gorunen}`);
      assert.equal(durum.inert, true, `arayüz erken serbest @${oran}`);
      await page.waitForTimeout(120);
      const sonra = await page.evaluate(() => document.querySelector('[data-kare="uzak"]').parentElement.querySelector('[data-kare][style*="visible"]')?.style.transform);
      assert.equal(sonra, durum.transform, `scroll dururken kare hareket etti @${oran}`);
    }
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
    await context.close();
  }
  console.log('Giriş: iki genişlikte yol boyunca taşma yok, ≤2 kare, scroll durunca sahne durur; doğal scroll sonrası gerçek form tıklanabilir.');
} finally { await browser.close(); }
