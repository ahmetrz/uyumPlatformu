import { chromium } from 'playwright-core';
import { girisYap, tarayiciYolu } from './kosu-ortak.mjs';
const DIZIN = '/tmp/claude-0/-home-user-uyumPlatformu/1d9d3f20-97cf-5de9-b457-fb472d9022e5/scratchpad/kanit';
const KOK = 'http://localhost:3210';
const BOSLUK = /kayıt yok|bulunamadı|henüz yok|hiç yok|boş|sonuç yok|gösterilecek/i;

const b = await chromium.launch({ executablePath: tarayiciYolu() });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await girisYap(p, KOK);

// Mercek seçenekleri
await p.goto(`${KOK}/portfoy`, { waitUntil: 'networkidle' });
const secenekler = await p.evaluate(() =>
  [...document.querySelectorAll('.ab-mercek-dar option, .ab-mercek button')]
    .map(o => ({ deger: o.value ?? '', ad: o.textContent.trim() })));
console.log('MERCEK SEÇENEKLERİ:', JSON.stringify(secenekler));

async function mercekAyarla(deger) {
  await p.evaluate((d) => {
    try { if (d === '') window.localStorage.removeItem('uyum.sektorMercegi');
          else window.localStorage.setItem('uyum.sektorMercegi', d); } catch {}
    window.dispatchEvent(new Event('uyum:sektor-mercegi'));
  }, deger);
  await p.waitForTimeout(250);
}

const merceker = secenekler.filter(s => s.deger);
for (const m of merceker) {
  await mercekAyarla(m.deger);
  // Bu mercekteki ilk tesis
  await p.goto(`${KOK}/portfoy`, { waitUntil: 'networkidle' });
  await mercekAyarla(m.deger);
  await p.waitForTimeout(300);
  const tesisYolu = await p.evaluate(() => {
    const a = document.querySelector('main a[href^="/tesisler/"]');
    return a ? new URL(a.href).pathname : null;
  });
  const ekranlar = [
    ['1-saha', '/'], ['2-portfoy', '/portfoy'], ['3-tesis360', tesisYolu],
    ['4-uyum', '/uyum'], ['5-bulgular', '/bulgular'], ['6-riskler', '/riskler'],
    ['7-denetimler', '/denetimler'], ['8-karne', '/raporlar/karne'],
  ];
  console.log(`\n═══ MERCEK: ${m.ad} ═══`);
  for (const [ad, yol] of ekranlar) {
    if (!yol) { console.log(`  ${ad.padEnd(14)} ATLANDI — tesis bulunamadı`); continue; }
    await p.goto(KOK + yol, { waitUntil: 'networkidle' });
    await mercekAyarla(m.deger);
    await p.waitForTimeout(400);
    const r = await p.evaluate((re) => {
      const main = document.querySelector('main');
      const metin = main ? main.innerText : '';
      const satir = main ? main.querySelectorAll('tbody tr, article, li.ab-kart').length : 0;
      return { uzunluk: metin.length, satir,
        bosluk: new RegExp(re, 'i').test(metin),
        ornek: !!document.querySelector('.ab-ornek-veri'),
        ilk: metin.split('\n').filter(Boolean).slice(0, 2).join(' | ').slice(0, 90) };
    }, BOSLUK.source);
    const dosya = `${DIZIN}/${m.ad.replace(/[^\p{L}]/gu, '')}-${ad}.png`;
    await p.screenshot({ path: dosya, fullPage: false });
    console.log(`  ${ad.padEnd(14)} satır ${String(r.satir).padStart(3)} · metin ${String(r.uzunluk).padStart(5)} · boşluk-izi ${r.bosluk ? 'VAR' : 'yok'} · örnek-rozet ${r.ornek ? 'var' : 'YOK'} · ${r.ilk}`);
  }
}
await b.close();
