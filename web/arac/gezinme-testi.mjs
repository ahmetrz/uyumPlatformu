#!/usr/bin/env node
/* Duyarlı gezinme testi — HİÇBİR ROTA ERİŞİLEMEZ OLMAMALI.

   ── Kapatılan kusur (PR #1 incelemesi, P1) ────────────────────────────
   Atlas 2 kabuğu iki kademelidir: 64px alan rayı + 192px bağlamsal ikincil
   liste. İkincil liste 1200px altında gizlenir. İlk sürümde onun klavyeyle
   çalışan karşılığı (bağlamsal açılır düğme) YALNIZ 1024–1199 bandında
   çiziliyordu. ≤1023'te ne ikincil liste ne düğme vardı: alan rozetine
   dokunmak kişiyi alanın İLK ekranına atıyor, `/bulgular`, `/projeler`,
   `/yedekleme` gibi kardeş rotalara ulaşmanın tek yolu Ctrl/Cmd+K paleti
   kalıyordu — ve paletin dokunmatik tetikleyicisi yok. Yani tablet/telefon
   kullanıcısı ürünün büyük kısmına ERİŞEMİYORDU.

   ── Bu araç ne ölçer ──────────────────────────────────────────────────
   Dört genişlikte, hem klavye hem dokunmatikle:
     1. Kardeş rotaya ULAŞILABİLİRLİK — açılan listede bağlantı GÖRÜNÜR mü,
        tıklanınca gerçekten oraya mı gidiyor.
     2. `aria-current="page"` TEKİLLİĞİ — panel listenin ikinci bir kopyası
        olsaydı "geçerli sayfa" iki kez duyurulurdu.
     3. KLAVYE sözleşmesi — düğme odaklanabilir, Enter açar, Esc kapatır ve
        odağı düğmeye GERİ VERİR.
     4. HOVER'A BAĞLI OLMAMA — fare hiç yaklaşmadan, yalnız dokunuşla açılır.

   Kullanım: PORT=3000 node arac/gezinme-testi.mjs
*/

import { chromium } from 'playwright-core';

const KOK = `http://localhost:${process.env.PORT || 3000}`;

function tarayiciYolu() {
  return process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
}

/* Genişlikler bantların HER BİRİNDEN bir örnek taşır:
   ≥1200 ikincil kolon açık · 1024–1199 panel sağa · ≤1023 panel aşağı. */
const BANTLAR = [
  { ad: '1440 · geniş', en: 1440, boy: 900, kolonGorunur: true },
  { ad: '1100 · orta', en: 1100, boy: 800, kolonGorunur: false },
  { ad: '900 · tablet', en: 900, boy: 800, kolonGorunur: false },
  { ad: '375 · telefon', en: 375, boy: 720, kolonGorunur: false },
];

/* Başlangıç ekranı ve ulaşılması gereken KARDEŞ rota. İkisi de "Risk &
   denetim" alanındadır; kardeşe gitmek için alan değiştirmek gerekmez —
   kusurun tam senaryosu buydu. */
const BASLANGIC = '/riskler';
const KARDES = '/bulgular';

const kusurlar = [];
const notlar = [];
const bildir = (bant, m) => kusurlar.push(`${bant} · ${m}`);

const b = await chromium.launch({ executablePath: tarayiciYolu() });

async function girisYap(s) {
  await s.goto(`${KOK}/giris`, { waitUntil: 'load' });
  if (!s.url().includes('/giris')) return;
  for (let d = 1; d <= 3; d += 1) {
    await s.fill('input[type=email]', 'ahmet.terzi@zorlu.com');
    await s.fill('input[type=password]', 'Enerji!2026');
    const ok = (await s.inputValue('input[type=email]')) === 'ahmet.terzi@zorlu.com'
      && (await s.inputValue('input[type=password]')).length > 0;
    if (ok) break;
    await s.waitForTimeout(300 * d);
  }
  await s.click('button[type=submit]');
  await s.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 25000 });
}

/** Tek `aria-current="page"` sözleşmesi — panel açıkken de geçerli. */
async function aktifSayisi(s) {
  return s.evaluate(() => document.querySelectorAll('[aria-current="page"]').length);
}

for (const bant of BANTLAR) {
  /* Dokunmatik bağlam: `hasTouch` olmadan `tap()` çalışmaz ve "dokunmatik
     kullanıcı erişebiliyor mu" sorusu ölçülmemiş olur. */
  const ctx = await b.newContext({
    viewport: { width: bant.en, height: bant.boy },
    hasTouch: true, isMobile: false,
  });
  const s = await ctx.newPage();
  const sayfaHatalari = [];
  s.on('pageerror', (e) => sayfaHatalari.push(e.message.slice(0, 120)));

  try {
    await girisYap(s);
    await s.setViewportSize({ width: bant.en, height: bant.boy });
    await s.goto(KOK + BASLANGIC, { waitUntil: 'load' });
    await s.waitForTimeout(400);

    if (await aktifSayisi(s) !== 1) {
      bildir(bant.ad, `aria-current="page" sayısı ${await aktifSayisi(s)} (1 olmalı)`);
    }

    const kolon = s.locator('#ray-ikincil');
    const dugme = s.locator('.ray-baglam-ozet');
    const kardesBag = kolon.locator(`a[href="${KARDES}"]`);

    if (bant.kolonGorunur) {
      /* Geniş bantta kolon zaten açık; düğme HİÇ olmamalı — olsaydı odak
         sırasına giren ve ekran okuyucuya duyurulan ölü bir denetim olurdu. */
      if (!(await kolon.isVisible())) bildir(bant.ad, 'ikincil kolon görünmüyor');
      if (await dugme.isVisible()) bildir(bant.ad, 'geniş bantta bağlamsal düğme görünüyor');
      if (!(await kardesBag.isVisible())) bildir(bant.ad, `kardeş bağlantı ${KARDES} görünmüyor`);
    } else {
      /* Dar bantlar: kolon kapalı başlar, düğme GÖRÜNÜR olmalı. */
      if (await kolon.isVisible()) bildir(bant.ad, 'dar bantta ikincil kolon açık başlıyor');
      if (!(await dugme.isVisible())) {
        bildir(bant.ad, 'bağlamsal düğme YOK — kardeş rotalara erişim yolu kalmıyor');
      } else {
        /* ── 1 · DOKUNMATİK ──────────────────────────────────────────
           Fare hiç yaklaştırılmaz: hover'a bağlı bir çözüm burada
           kırmızı verir. */
        await dugme.tap();
        await s.waitForTimeout(250);
        if (!(await kolon.isVisible())) bildir(bant.ad, 'dokunuşla panel açılmadı');
        if (!(await kardesBag.isVisible())) {
          bildir(bant.ad, `panelde kardeş bağlantı ${KARDES} görünmüyor`);
        }
        if (await aktifSayisi(s) !== 1) {
          bildir(bant.ad, `panel açıkken aria-current sayısı ${await aktifSayisi(s)} (1 olmalı)`);
        }

        /* Kardeşe gerçekten gidiyor mu — görünürlük yetmez. */
        if (await kardesBag.isVisible()) {
          await kardesBag.tap();
          await s.waitForURL((u) => u.pathname === KARDES, { timeout: 15000 })
            .catch(() => bildir(bant.ad, `dokunuşla ${KARDES} açılmadı`));
          await s.waitForTimeout(300);
          if (new URL(s.url()).pathname !== KARDES) {
            bildir(bant.ad, `varış ${new URL(s.url()).pathname} (${KARDES} olmalı)`);
          }
          if (await kolon.isVisible()) bildir(bant.ad, 'gezindikten sonra panel açık kaldı');
        }

        /* ── 2 · KLAVYE ──────────────────────────────────────────────
           Enter açar; Esc kapatır ve odağı düğmeye GERİ VERİR. */
        await s.goto(KOK + BASLANGIC, { waitUntil: 'load' });
        await s.waitForTimeout(300);
        await dugme.focus();
        if (!(await dugme.evaluate((el) => el === document.activeElement))) {
          bildir(bant.ad, 'düğme odaklanamıyor');
        }
        await s.keyboard.press('Enter');
        await s.waitForTimeout(250);
        if (!(await kolon.isVisible())) bildir(bant.ad, 'Enter paneli açmadı');
        if (await dugme.getAttribute('aria-expanded') !== 'true') {
          bildir(bant.ad, 'aria-expanded açıkken true değil');
        }
        await s.keyboard.press('Escape');
        await s.waitForTimeout(250);
        if (await kolon.isVisible()) bildir(bant.ad, 'Escape paneli kapatmadı');
        if (!(await dugme.evaluate((el) => el === document.activeElement))) {
          bildir(bant.ad, 'Escape sonrası odak düğmeye dönmedi');
        }
      }
    }

    if (sayfaHatalari.length) bildir(bant.ad, `sayfa hatası: ${sayfaHatalari[0]}`);
    notlar.push(`${bant.ad}: kolon=${bant.kolonGorunur ? 'açık' : 'kapalı'} · denetimler koştu`);
  } finally {
    await ctx.close();
  }
}

await b.close();

for (const n of notlar) console.log(`OK  ${n}`);
if (kusurlar.length) {
  console.error(`\nGEZİNME KUSURU: ${kusurlar.length}`);
  for (const k of kusurlar) console.error(`  · ${k}`);
  process.exitCode = 1;
} else {
  console.log(`\ngezinme kusuru: 0 · ${BANTLAR.length} bant · klavye + dokunmatik`);
}
