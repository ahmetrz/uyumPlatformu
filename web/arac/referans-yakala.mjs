/* TARİHSEL ARAÇ — önceki tasarım teslim paketinin (handoff) artboard'larını
   yakalar. Paket depoda değildir; ürünün güncel görsel referansı on iki HTML
   prototipidir (ORIGINAL_DESIGN_IMPLEMENTATION_MAP.md) ve tasarım sistemi
   web/DESIGN.md'dir. Aşağıdaki dosya adları paketin kendi adlarıdır, ürün adı
   değildir. Ayrıntı: arac/BENIOKU.md. */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.env.OUT;
mkdirSync(OUT, { recursive: true });
const KOK = 'http://localhost:3400';

const FONT_CSS = `
@font-face{font-family:'Archivo';src:url('/fontlar/archivo-latin-ext.woff2') format('woff2');font-weight:100 900;font-stretch:50% 125%;font-display:block;
 unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}
@font-face{font-family:'Archivo';src:url('/fontlar/archivo-latin.woff2') format('woff2');font-weight:100 900;font-stretch:50% 125%;font-display:block;
 unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'Manrope';src:url('/fontlar/manrope-latin-ext.woff2') format('woff2');font-weight:200 800;font-display:block;
 unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}
@font-face{font-family:'Manrope';src:url('/fontlar/manrope-latin.woff2') format('woff2');font-weight:200 800;font-display:block;
 unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'Azeret Mono';src:url('/fontlar/azeret-latin-ext.woff2') format('woff2');font-weight:100 900;font-display:block;
 unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}
@font-face{font-family:'Azeret Mono';src:url('/fontlar/azeret-latin.woff2') format('woff2');font-weight:100 900;font-display:block;
 unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
`;

const DOSYALAR = [
  ['flagship', 'Enerji-Atlas-Flagship.html'],
  ['op1', 'Enerji-Atlas-Operasyonel-1.html'],
  ['op2', 'Enerji-Atlas-Operasyonel-2.html'],
  ['op3', 'Enerji-Atlas-Operasyonel-3.html'],
  ['sistem', 'Tasarim-Sistemi.html'],
];

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--font-render-hinting=none', '--disable-lcd-text'],
});
const envanter = [];

for (const [anahtar, dosya] of DOSYALAR) {
  const s = await b.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });
  // Google Fonts erisilemez: yerel woff2'leri enjekte et
  await s.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await s.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await s.goto(`${KOK}/design/duz/${dosya}`, { waitUntil: 'domcontentloaded' });
  await s.addStyleTag({ content: FONT_CSS });
  await s.waitForTimeout(1200);
  await s.evaluate(() => document.fonts.ready);
  // tum gorseller yuklensin
  await s.evaluate(async () => {
    await Promise.all([...document.images].filter((i) => !i.complete)
      .map((i) => new Promise((res) => { i.onload = i.onerror = res; })));
  });
  await s.waitForTimeout(1500);

  const kokSec = await s.evaluate(() => {
    const d = document.querySelector('[data-dir]');
    if (d && d.children.length) { d.setAttribute('data-kok', '1'); return true; }
    document.body.setAttribute('data-kok', '1'); return true;
  });
  void kokSec;
  const sayi = await s.evaluate(() =>
    document.querySelector('[data-kok]').children.length);

  for (let i = 0; i < sayi; i++) {
    const el = s.locator('[data-kok] > *').nth(i);
    const kutu = await el.boundingBox();
    if (!kutu || kutu.height < 120 || kutu.width < 1200) continue;
    const ad = `${anahtar}-${String(i + 1).padStart(2, '0')}`;
    await el.screenshot({ path: `${OUT}/${ad}.png` });
    // artboard basligini cikar (ilk anlamli metin)
    const baslik = await el.evaluate((n) => (n.innerText || '').split('\n')
      .map((x) => x.trim()).filter(Boolean).slice(0, 3).join(' · ').slice(0, 90));
    envanter.push({ ad, dosya, indeks: i + 1, en: Math.round(kutu.width), boy: Math.round(kutu.height), baslik });
    console.log(`${ad}  ${Math.round(kutu.width)}x${Math.round(kutu.height)}  ${baslik}`);
  }
  await s.close();
}

writeFileSync(`${OUT}/envanter.json`, JSON.stringify(envanter, null, 1));
console.log('\ntoplam artboard:', envanter.length);
await b.close();
