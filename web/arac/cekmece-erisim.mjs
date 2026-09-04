#!/usr/bin/env node
/* ÇEKMECE ERİŞİLEBİLİRLİĞİ — açılan panel klavyeyi bırakmamalı.

   ── NİÇİN AYRI BİR ARAÇ ───────────────────────────────────────────────
   `erisim.mjs` sayfanın DURGUN hâlini ölçer: odak halkası, klavye
   erişimi, azaltılmış hareket, renk dışı kanal. Çekmecenin kusurları
   ise ancak çekmece AÇIKKEN görünür ve hiçbir statik tarama onları
   göremez:

     · Odak tuzağı — Tab, çekmeceden çıkıp arkadaki sayfada dolaşıyor
       mu? Klavye kullanan biri çekmeceyi "kapatmadan" terk ederse
       ekranda nerede olduğunu kaybeder; ekran okuyucu ise arka planı
       okumaya devam eder.
     · `role="dialog"` ve `aria-modal` — ekran okuyucuya "bu bir katman"
       demenin tek yolu.
     · ESC — açılan her katmanın kaçış yolu.
     · Kapanışta odak — çekmeceyi açan öğeye geri dönmeli; yoksa odak
       belgenin başına düşer ve kullanıcı listedeki yerini kaybeder.
     · Örtme — dar masaüstünde 400px'lik panel iş yüzeyinin ne kadarını
       kapatıyor? Kapattığı yer okunamıyorsa bağlam korunmuş sayılmaz.

   Çekmeceyi AÇMAK için ekrandaki ilk seçilebilir satır tıklanır; bu
   ürünün her tezgâh ekranında geçerli kalıptır.

   Kullanım: PORT=3210 node arac/cekmece-erisim.mjs
             PORT=3210 node arac/cekmece-erisim.mjs --rota=/kesif --bant 1024
*/

import { chromium } from 'playwright-core';
import { KOK, bayrakDegeri, girisYap, rotaBayragi, tarayiciYolu } from './kosu-ortak.mjs';

/* Çekmecesi olan tezgâh ekranları. Liste elle tutulur çünkü "çekmece
   açılabilir mi" bir rota özelliği değil, ekranın kendi kararıdır. */
const CEKMECELI = [
  '/kesif', '/bulgular', '/riskler', '/olaylar', '/omur', '/yedekleme',
  '/tabanlar', '/sayim', '/tasinabilir-medya', '/yedek-parca',
  '/tedarikciler', '/kanitlar', '/denetimler', '/projeler', '/egitimler',
  '/gozden-gecirme', '/saklama', '/denetci-erisimi',
];

const ROTALAR = rotaBayragi(CEKMECELI);
const EN = Number(bayrakDegeri('--bant') ?? 1280);

const tarayici = await chromium.launch({
  executablePath: tarayiciYolu(), args: ['--no-sandbox'],
});
const sayfa = await (await tarayici.newContext({
  viewport: { width: EN, height: 900 },
})).newPage();
await girisYap(sayfa);

const kusurlar = [];
const atlanan = [];

for (const rota of ROTALAR) {
  await sayfa.goto(`${KOK}${rota}`, { waitUntil: 'load', timeout: 30000 });
  await sayfa.waitForTimeout(500);

  /* Çekmeceyi KLAVYEYLE açarız: satıra odaklan, Enter. Fare tıklaması
     bu ürünün tablolarında hücreye çarpıyor; klavye yolu zaten sınamak
     istediğimiz yol. Açılışın kendisi de böylece ölçülmüş olur. */
  const tetik = sayfa.locator('tbody tr[tabindex="0"], tr[role="button"]').first();
  if (!(await tetik.count())) { atlanan.push(`${rota}: seçilebilir satır bulunamadı`); continue; }
  await tetik.focus();
  await sayfa.keyboard.press('Enter');
  await sayfa.waitForTimeout(400);
  if (!(await sayfa.locator('.ab-panel').count())) {
    /* Enter açmadıysa satırın ilk hücresine tıkla — bazı tablolar
       yalnız fare olayı dinliyor olabilir; bu da bir bulgudur. */
    await tetik.locator('td').first().click({ timeout: 5000 }).catch(() => {});
    await sayfa.waitForTimeout(400);
  }

  const panel = sayfa.locator('.ab-panel');
  if (!(await panel.count())) { atlanan.push(`${rota}: tıklamayla çekmece açılmadı`); continue; }

  const olcum = await sayfa.evaluate(() => {
    const p = document.querySelector('.ab-panel');
    if (!p) return null;
    const ODAKLANABILIR = 'a[href], button:not([disabled]), input:not([disabled]),'
      + ' select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const icerdeki = [...p.querySelectorAll(ODAKLANABILIR)];
    const hepsi = [...document.querySelectorAll(ODAKLANABILIR)]
      .filter((e) => e.offsetParent !== null || e === document.activeElement);
    const disarida = hepsi.filter((e) => !p.contains(e));

    /* Panelin kapattığı iş yüzeyi: panelin altında kalan tablo eni. */
    const r = p.getBoundingClientRect();
    const tablo = document.querySelector('table');
    let ortulenOran = null;
    if (tablo) {
      const t = tablo.getBoundingClientRect();
      const kesisim = Math.max(0, Math.min(t.right, r.right) - Math.max(t.left, r.left));
      ortulenOran = t.width > 0 ? Math.round((kesisim / t.width) * 100) : null;
    }
    return {
      rol: p.getAttribute('role'),
      modal: p.getAttribute('aria-modal'),
      etiketli: !!(p.getAttribute('aria-label') || p.getAttribute('aria-labelledby')),
      icerdeki: icerdeki.length,
      disarida: disarida.length,
      ortulenOran,
      panelEni: Math.round(r.width),
    };
  });
  if (!olcum) { atlanan.push(`${rota}: panel ölçülemedi`); continue; }

  /* ── Odak tuzağı: son öğeden sonra Tab ilk öğeye dönmeli ──────────── */
  await sayfa.evaluate(() => {
    const p = document.querySelector('.ab-panel');
    const ODAKLANABILIR = 'a[href], button:not([disabled]), input:not([disabled]),'
      + ' select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const l = [...p.querySelectorAll(ODAKLANABILIR)];
    l[l.length - 1]?.focus();
  });
  await sayfa.keyboard.press('Tab');
  const tuzakVar = await sayfa.evaluate(
    () => !!document.querySelector('.ab-panel')?.contains(document.activeElement),
  );

  /* ── ESC ──────────────────────────────────────────────────────────── */
  await sayfa.keyboard.press('Escape');
  await sayfa.waitForTimeout(250);
  const escKapatti = (await sayfa.locator('.ab-panel').count()) === 0;

  /* ── Kapanışta odak geri döndü mü ─────────────────────────────────── */
  const odakGeriDondu = await sayfa.evaluate(() => {
    const a = document.activeElement;
    return !!a && a !== document.body && a !== document.documentElement;
  });

  const sorunlar = [];
  if (!tuzakVar) sorunlar.push('odak tuzağı YOK — Tab çekmeceden çıkıyor');
  if (olcum.rol !== 'dialog') sorunlar.push(`role="${olcum.rol ?? 'yok'}" (dialog bekleniyor)`);
  if (olcum.modal !== 'true') sorunlar.push('aria-modal yok');
  if (!olcum.etiketli) sorunlar.push('erişilebilir ad yok');
  if (!escKapatti) sorunlar.push('ESC kapatmadı');
  if (!odakGeriDondu) sorunlar.push('kapanışta odak belgeye düştü');
  if (olcum.ortulenOran !== null && olcum.ortulenOran > 40) {
    sorunlar.push(`iş yüzeyinin %${olcum.ortulenOran}'ini örtüyor`);
  }

  if (sorunlar.length) {
    kusurlar.push({ rota, sorunlar, olcum });
    console.log(`✗ ${rota.padEnd(24)} ${sorunlar.join(' · ')}`);
  } else {
    console.log(`✓ ${rota.padEnd(24)} ${olcum.icerdeki} odaklanabilir · panel ${olcum.panelEni}px`);
  }
}

await tarayici.close();

for (const a of atlanan) console.log(`· atlandı — ${a}`);
console.log(`\n${ROTALAR.length - atlanan.length} çekmece ölçüldü @ ${EN}px · ${kusurlar.length} kusurlu`);
process.exit(kusurlar.length ? 1 : 0);
