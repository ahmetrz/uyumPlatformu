#!/usr/bin/env node
/* Ekran performansı ölçümü — kabuk geçişi ÖNCE/SONRA karşılaştırması.

   NE ÖLÇER
     · gezinme süresi (istemci tarafı yönlendirme, medyan/N koşu)
     · soğuk yükleme (tam sayfa yükü)
     · DOM düğüm sayısı (sunumun getirdiği ağırlık)
     · yerleşim süresi (`performance` layout+style ölçümü)

   NE ÖLÇMEZ: sunucu sorgusu. Bu araç SUNUM katmanının maliyetini ölçer;
   sorgu maliyeti `arac/olcek.mjs`in işidir. İkisini karıştırmak "tasarım
   yavaşlattı" ile "veri büyüdü"yü ayırt edilemez hâle getirir.

   ÖLÇÜM SINIRI: geliştirme sunucusunda koşar (üretim derlemesi değil) ve
   makine paylaşımlıdır. Süreler GÜRÜLTÜLÜDÜR; medyan alınır ve yalnız
   büyük farklar anlamlıdır. DÜĞÜM SAYISI determinist — asıl karşılaştırma
   odur.

   Kullanım: PORT=3199 ETIKET=SONRA node arac/olcek-ekran.mjs
             PORT=3299 ETIKET=ONCE  node arac/olcek-ekran.mjs
*/

import { chromium } from 'playwright-core';

const KOK = `http://localhost:${process.env.PORT || 3000}`;
const ETIKET = process.env.ETIKET || 'ölçüm';
const TEKRAR = Number(process.env.TEKRAR || 3);

/* Tasarım brifinginin adıyla istediği yüzeyler. */
const YOLLAR = [
  { yol: '/uyum', ad: 'uyum matrisi + dikkat listesi' },
  { yol: '/riskler', ad: 'risk kütüğü' },
  { yol: '/bulgular', ad: 'bulgu → CAPA zinciri' },
  { yol: '/envanter', ad: 'varlık ilişki görünümü' },
  { yol: '/topoloji', ad: 'topoloji' },
  { yol: '/omur', ad: 'ömür zaman çizelgesi' },
  { yol: '/saglik', ad: 'platform sağlığı' },
];

const ortanca = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

const b = await chromium.launch({
  executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const s = await b.newPage({ viewport: { width: 1440, height: 1000 } });

await s.goto(`${KOK}/giris`, { waitUntil: 'load' });
if (s.url().includes('/giris')) {
  for (let d = 1; d <= 3; d += 1) {
    await s.fill('input[type=email]', 'ahmet.terzi@zorlu.com');
    await s.fill('input[type=password]', 'Enerji!2026');
    if ((await s.inputValue('input[type=email]')) === 'ahmet.terzi@zorlu.com') break;
    await s.waitForTimeout(300 * d);
  }
  await s.click('button[type=submit]');
  await s.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 25000 });
}

const satirlar = [];
for (const { yol, ad } of YOLLAR) {
  const soguk = [];
  const yerlesim = [];
  for (let i = 0; i < TEKRAR; i += 1) {
    const t0 = Date.now();
    await s.goto(KOK + yol, { waitUntil: 'load' });
    soguk.push(Date.now() - t0);
    await s.waitForTimeout(250);
    yerlesim.push(await s.evaluate(() => {
      /* Yerleşimi ZORLA ve ölç: `getBoundingClientRect` okuması bekleyen
         style+layout işini senkron yaptırır. Eskiden yanına bir de
         `offsetHeight` okuması vardı; aynı yerleşimi ikinci kez
         zorlamıyordu (ilk okuma zaten tetikler) ve "kullanılmayan
         ifade" uyarısıyla lint kapısını tutuyordu — kaldırıldı. */
      const t = performance.now();
      document.body.getBoundingClientRect();
      return performance.now() - t;
    }));
  }
  const dugum = await s.evaluate(() => document.querySelectorAll('*').length);
  const tik = await s.evaluate(() => document.querySelectorAll('.tik-serit .tik').length);
  satirlar.push({ yol, ad, soguk: ortanca(soguk), yerlesim: ortanca(yerlesim), dugum, tik });
}

await b.close();

console.log(`\n═══ ${ETIKET} · ${KOK} · ${TEKRAR} koşu, ortanca ═══`);
console.log('yol'.padEnd(14) + 'soğuk(ms)'.padStart(11) + 'yerleşim(ms)'.padStart(14)
  + 'düğüm'.padStart(9) + 'tik'.padStart(6) + '  açıklama');
for (const r of satirlar) {
  console.log(
    r.yol.padEnd(14)
    + String(r.soguk).padStart(11)
    + r.yerlesim.toFixed(2).padStart(14)
    + String(r.dugum).padStart(9)
    + String(r.tik).padStart(6)
    + '  ' + r.ad,
  );
}
console.log('\nJSON ' + JSON.stringify(satirlar));
