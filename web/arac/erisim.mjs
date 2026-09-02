#!/usr/bin/env node
/* Erişilebilirlik kapısı — prototiplerin kusurlarına karşı.

   Orijinal prototipler statik HTML'di ve dört şeyi hiç tanımlamıyordu
   (ORIGINAL_DESIGN_IMPLEMENTATION_MAP.md §7): klavye gezinmesi, odak
   halkası, azaltılmış hareket ve durum bilgisinin renk dışı kanalı.
   Bu araç dördünü de GERÇEK TARAYICIDA ölçer.

     1 · ODAK HALKASI — Tab ile gezilen her öğede görünür bir outline
         var mı? (`outline-width` 0 ise kusur.)
     2 · KLAVYE ERİŞİMİ — tıklanabilir görünen (`cursor: pointer`) ama
         odaklanamayan öğe var mı?
     3 · AZALTILMIŞ HAREKET — `prefers-reduced-motion: reduce` iken
         çalışan animasyon kaldı mı?
     4 · RENK TEK KANAL DEĞİL — `role="img"` taşıyan her durum glifinin
         erişilebilir adı var mı? (Renk göremeyen okuyucunun tek kanalı.)

   Kullanım: PORT=3210 node arac/erisim.mjs [--rota=/uyum,/riskler]
*/
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const KOK = `http://localhost:${process.env.PORT || 3000}`;
const argRota = process.argv.find((a) => a.startsWith('--rota='));
const ROTALAR = argRota
  ? argRota.slice('--rota='.length).split(',')
  : JSON.parse(readFileSync(new URL('./rotalar.json', import.meta.url), 'utf8'));

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

async function otur(ctxSecenek) {
  const s = await b.newPage({ viewport: { width: 1440, height: 900 }, ...ctxSecenek });
  await s.goto(`${KOK}/giris`, { waitUntil: 'domcontentloaded' });
  await s.fill('input[type=email]', 'ahmet.terzi@zorlu.com');
  await s.fill('input[type=password]', 'Enerji!2026');
  await s.click('button[type=submit]');
  await s.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 25000 });
  return s;
}

const kusurlar = [];
const s = await otur();

for (const yol of ROTALAR) {
  await s.goto(KOK + yol, { waitUntil: 'domcontentloaded' });
  await s.waitForTimeout(450);

  const olcum = await s.evaluate(() => {
    /* 2 · imleç işaretçi ama klavyeyle ulaşılamaz */
    const ODAK = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';
    const yalanci = [];
    for (const el of document.querySelectorAll('*')) {
      if (getComputedStyle(el).cursor !== 'pointer') continue;
      if (el.matches(ODAK)) continue;
      if (el.closest(ODAK)) continue;
      if (el.querySelector(ODAK)) continue;
      yalanci.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`);
    }

    /* 4 · durum glifinin erişilebilir adı */
    const adsiz = [...document.querySelectorAll('[role="img"]')]
      .filter((el) => !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'))
      .map((el) => (el.className || '').toString().slice(0, 40));

    return { yalanci: [...new Set(yalanci)], adsiz: [...new Set(adsiz)] };
  });

  /* 1 · ODAK HALKASI — GERÇEK Tab ile. `:focus-visible` programatik
     `el.focus()` çağrısında güvenilir tetiklenmiyor; klavye kullanıcısının
     gördüğü şey ancak klavyeyle ölçülür. İlk 25 durak örneklenir. */
  await s.evaluate(() => document.body.focus());
  const halkasiz = new Set();
  for (let i = 0; i < 25; i += 1) {
    await s.keyboard.press('Tab');
    const d = await s.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      if (el.tagName.toLowerCase() === 'nextjs-portal') return null;
      const c = getComputedStyle(el);
      const kalinlik = parseFloat(c.outlineWidth) || 0;
      const golge = c.boxShadow !== 'none';
      return {
        ad: `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`,
        gorunur: (kalinlik >= 1 && c.outlineStyle !== 'none') || golge,
      };
    });
    if (d && !d.gorunur) halkasiz.add(d.ad);
  }
  if (halkasiz.size) kusurlar.push(`ODAK HALKASI YOK · ${yol} → ${[...halkasiz].join(', ')}`);

  if (olcum.yalanci.length) kusurlar.push(`KLAVYEYLE ERİŞİLEMEZ · ${yol} → ${olcum.yalanci.join(', ')}`);
  if (olcum.adsiz.length) kusurlar.push(`ADSIZ GLİF · ${yol} → ${olcum.adsiz.join(', ')}`);
}
await s.close();

/* 3 · azaltılmış hareket */
const sr = await otur({ reducedMotion: 'reduce' });
for (const yol of ROTALAR.slice(0, 12)) {
  await sr.goto(KOK + yol, { waitUntil: 'domcontentloaded' });
  await sr.waitForTimeout(350);
  const hareketli = await sr.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      const c = getComputedStyle(el);
      const sure = parseFloat(c.animationDuration) || 0;
      if (sure > 0.01 && c.animationName !== 'none') {
        out.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} → ${c.animationName}`);
      }
      for (const sozde of ['::before', '::after']) {
        const p = getComputedStyle(el, sozde);
        const ps = parseFloat(p.animationDuration) || 0;
        if (ps > 0.01 && p.animationName !== 'none') {
          out.push(`${el.tagName.toLowerCase()}${sozde} → ${p.animationName}`);
        }
      }
    }
    return [...new Set(out)];
  });
  if (hareketli.length) kusurlar.push(`AZALTILMIŞ HAREKETTE ANİMASYON · ${yol} → ${hareketli.join(', ')}`);
}
await sr.close();
await b.close();

console.log(`rota: ${ROTALAR.length}`);
if (kusurlar.length === 0) {
  console.log('erişilebilirlik kusuru: 0');
} else {
  console.error(`\nERİŞİLEBİLİRLİK KUSURU: ${kusurlar.length}`);
  for (const k of kusurlar) console.error(`  · ${k}`);
  process.exitCode = 1;
}
