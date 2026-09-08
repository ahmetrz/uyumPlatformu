#!/usr/bin/env node
/* RENDER EDİLEN METNİ YAKALAR — `sozluk-farki.mjs` için ham veri.

   Tek işi var: verilen rotaları gezip ekrandaki metni JSON'a yazmak.
   Hangi sözlüğün kurulu olduğunu BİLMEZ ve bilmemeli — sözlüğü
   `sozluk-takas.mjs` takar, bu betik yalnız o anki ekranı kaydeder.
   Ayrı betik olmasının sebebi bu: aynı kod iki kez, iki sözlükle koşar
   ve aradaki farkı çağıran çıkarır.

   Kullanım (tek başına anlamlı değil, `sozluk-farki.mjs` çağırır):
     node arac/sozluk-metni.mjs --rota=/envanter --cikti=/tmp/enerji.json
*/
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { KOK, girisYap, rotalarOku, tarayiciYolu } from './kosu-ortak.mjs';

const arg = (ad) => process.argv.find((a) => a.startsWith(`--${ad}=`))?.slice(ad.length + 3);
const cikti = arg('cikti');
if (!cikti) throw new Error('--cikti= zorunlu');
const rotaArg = arg('rota');
const rotalar = rotaArg
  ? rotaArg.split(',').map((r) => r.trim()).filter(Boolean)
  : rotalarOku().map((r) => (typeof r === 'string' ? r : r.yol)).filter((r) => r !== undefined);

const tarayici = await chromium.launch({ executablePath: tarayiciYolu() });
const baglam = await tarayici.newContext({ viewport: { width: 1440, height: 900 } });
const sayfa = await baglam.newPage();
await girisYap(sayfa, KOK);

const metinler = {};
for (const rota of rotalar) {
  const yol = rota === '' ? '/' : rota;
  try {
    await sayfa.goto(`${KOK}${yol}`, { waitUntil: 'load', timeout: 30_000 });
    /* Sunucu bileşeni + istemci sulanması bitsin: sözlük ikisinden de
       akabiliyor ve erken okumak istemci tarafını kaçırırdı. */
    await sayfa.waitForTimeout(900);
    /* KABUK DEĞİL, ROTANIN KENDİ İÇERİĞİ. Kabuk başlığı ("… · 16
       SANTRAL") her rotada görünür ve sözlüğü izler; gövdeyi ölçseydik
       o TEK fark, tamamen çakılı bir sayfayı bile "fark var" diye
       geçirirdi — iddianın yakalaması gereken kusuru tam olarak. */
    metinler[yol] = await sayfa.evaluate(() => {
      const ana = document.querySelector('main');
      return ana ? ana.innerText : document.body.innerText;
    });
  } catch (e) {
    metinler[yol] = `__HATA__ ${e.message}`;
  }
}
writeFileSync(cikti, JSON.stringify(metinler, null, 0));
await tarayici.close();
