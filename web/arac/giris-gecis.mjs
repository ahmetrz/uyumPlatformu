/* Natural scroll completion must release hit testing, including fractional svh. */
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
    await context.close();
  }
  console.log('Giriş: iki genişlikte doğal scroll sonrası gerçek form tıklanabilir.');
} finally { await browser.close(); }
