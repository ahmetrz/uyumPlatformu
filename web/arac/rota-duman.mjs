import { chromium } from 'playwright-core';

/* Faz 2 çıkış kriteri: tüm rotalar gezilebilir; ray genişliği/insetleri
   ve aktif durum referansla eşleşir. Giriş yapıp her rotayı yoklar. */

const KOK = 'http://localhost:3111';
const ATLAS = ['/sistem', '/uyum', '/portfoy', '/yonetim', '/topoloji', '/omur',
  '/yedekleme', '/kimlik', '/tedarikciler'];
const OZALIT = ['/', '/tesisler', '/surecler', '/bulgular', '/riskler', '/denetimler',
  '/envanter', '/operasyon', '/projeler', '/raporlar', '/regulasyonlar', '/eslestirme',
  '/gorevler', '/aktivite', '/saglik', '/tanimlar', '/yetkiler', '/ice-aktarim'];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const s = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(`${s.url()} :: ${e.message.slice(0, 120)}`));

await s.goto(KOK + '/giris', { waitUntil: 'domcontentloaded' });
await s.fill('input[type=email]', 'ahmet.terzi@zorlu.com');
await s.fill('input[type=password]', 'Enerji!2026');
await s.click('button[type=submit]');
await s.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 25000 });

let kotu = 0;
for (const [etiket, yollar] of [['ATLAS', ATLAS], ['OZALIT', OZALIT]]) {
  for (const yol of yollar) {
    const y = await s.goto(KOK + yol, { waitUntil: 'domcontentloaded' });
    await s.waitForTimeout(450);
    const kod = y?.status() ?? 0;
    const olcu = await s.evaluate(() => {
      const ray = document.querySelector('.atlas-ray');
      if (!ray) return null;
      const r = ray.getBoundingClientRect();
      const aktif = document.querySelector('.ray-link[aria-current="page"]');
      const marka = document.querySelector('.ray-marka');
      const ms = marka ? getComputedStyle(marka) : null;
      return {
        genislik: Math.round(r.width),
        aktifSayi: document.querySelectorAll('.ray-link[aria-current="page"]').length,
        aktifAd: aktif ? aktif.textContent.trim().slice(0, 22) : null,
        inset: ms ? ms.paddingLeft : null,
        ustPad: getComputedStyle(ray).paddingTop,
      };
    });
    const iyi = kod === 200;
    if (!iyi) kotu++;
    console.log(`${iyi ? 'OK ' : 'HATA'} ${etiket.padEnd(6)} ${yol.padEnd(16)} ${kod}` +
      (olcu ? `  ray=${olcu.genislik}px inset=${olcu.inset} üst=${olcu.ustPad} aktif=${olcu.aktifSayi}:${olcu.aktifAd}` : ''));
  }
}
console.log(`\nbaşarısız rota: ${kotu} · sayfa hatası: ${hatalar.length}`);
if (hatalar.length) console.log(hatalar.slice(0, 6));
await b.close();
