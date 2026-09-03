#!/usr/bin/env node
/* Dar bant gezinme çekmecesi (P3-10) — canlı sunucu kapısı.

   ── Neden burada, vitest'te değil ─────────────────────────────────────
   Çekmece bir DAVRANIŞ: odak nereye iner, Esc ne yapar, gezinince ne
   olur. Bunlar ancak gerçek bir tarayıcıda ölçülür. Depoda bileşen test
   katmanı yok (bkz. `docs/HAZIRLIK_DURUMU.md` P1-2); onu bu iş için
   kurmak yerine projenin kendi canlı-sunucu kapısı idiomu kullanıldı —
   `gezinme-testi.mjs` ile aynı biçim.

   ── Neyi ölçer ────────────────────────────────────────────────────────
   Kusurun kendisi keşfedilebilirlikti: ≤1100px'te on altı ray öğesi
   yatay şeride iniyor, şerit taşıyor ve kaydırılabildiğini gösteren bir
   işaret olmuyordu. Çekmece bunu çözer ama KENDİ bedelini getirir —
   kapalıyken "hangi ekrandayım" sorusu cevapsız kalır. Bu yüzden
   aşağıdaki üçüncü ölçüm, ötekiler kadar önemlidir: düğme aktif ekranın
   adını YAZMAK ZORUNDA ve gezinince o ad DEĞİŞMEK ZORUNDA. Yazmazsa
   çekmece kusuru düzeltirken yenisini açmış olur.

   Koşum: PORT=3210 npm run dev   (başka bir kabukta)
          npm run gezinme:cekmece */

import { chromium } from 'playwright-core';

const KOK = `http://localhost:${process.env.PORT || 3210}`;
/* Dar bant kuralı 1100px'te başlar; 980 onun altında kalan gerçek bir
   dizüstü genişliği. Geniş bant 1440: çekmecenin ORADA OLMAMASI da bir
   ölçümdür — ikinci bir gezinme katmanı ürünün kapattığı bir hataydı. */
const DAR = 980;
const GENIS = 1440;

const kusurlar = [];
const bildir = (m) => kusurlar.push(m);
const notlar = [];

const b = await chromium.launch({
  executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const ctx = await b.newContext({ viewport: { width: DAR, height: 860 } });
const s = await ctx.newPage();

const sayfaHatalari = [];
s.on('pageerror', (e) => sayfaHatalari.push(e.message.slice(0, 160)));

try {
  await s.goto(`${KOK}/giris`, { waitUntil: 'domcontentloaded' });
  await s.fill('input[type=email]', 'ahmet.terzi@zorlu.com');
  await s.fill('input[type=password]', 'Enerji!2026');
  await s.click('button[type=submit]');
  await s.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 30000 });

  await s.goto(`${KOK}/envanter`, { waitUntil: 'domcontentloaded' });
  await s.waitForTimeout(1000);

  const dugme = s.locator('.ab-a-cekmece-dugme');
  const ray = s.locator('.ab-a-ray');
  /* CSS `text-transform: uppercase` uyguluyor ve `innerText` RENDER
     EDİLMİŞ metni verir: "Varlık" → "VARLIK". Karşılaştırma Türkçe
     kurallarıyla küçültülerek yapılır — JS'in varsayılan katlaması
     `I`'yı `i`'ye eşler, `ı`'ya değil, ve `/varlık/i` "VARLIK" ile
     eşleşmez. Bu tuzak testi bir kez yanlış kırmızıya düşürdü. */
  const gorunenAd = async () =>
    (await dugme.locator('.ad').innerText()).trim().toLocaleLowerCase('tr');

  // 1 · Dar bantta düğme var, ray kapalı.
  if (!(await dugme.isVisible())) bildir(`${DAR}px: çekmece düğmesi görünmüyor`);
  if (await ray.isVisible()) bildir(`${DAR}px: çekmece kapalıyken ray görünür`);

  // 2 · Düğme AKTİF EKRANIN ADINI yazar — çekmecenin bedeli burada kapanır.
  const ilkAd = await gorunenAd();
  if (ilkAd !== 'varlık') bildir(`düğme aktif ekranı yazmıyor: "${ilkAd}" (varlık bekleniyordu)`);

  // 3 · Açılınca ray gelir, aria doğru, odak ilk bağa iner.
  await dugme.click();
  await s.waitForTimeout(300);
  if (!(await ray.isVisible())) bildir('çekmece açılmadı');
  if ((await dugme.getAttribute('aria-expanded')) !== 'true') bildir('aria-expanded açıkta true değil');
  const odakBagda = await s.evaluate(() =>
    document.activeElement?.closest('.ab-a-ray') !== null
    && document.activeElement?.tagName === 'A');
  if (!odakBagda) bildir('açılışta odak ilk bağa inmiyor');

  // 4 · Odak TUZAĞI: Shift+Tab ilk bağdan arkadaki içeriğe kaçmamalı.
  await s.keyboard.press('Shift+Tab');
  const odakIcerdeKaldi = await s.evaluate(() => {
    const a = document.activeElement;
    return !!a && (a.closest('.ab-a-ray') !== null || a.classList.contains('ab-a-cekmece-dugme'));
  });
  if (!odakIcerdeKaldi) bildir('odak tuzağı yok: Shift+Tab arkadaki içeriğe kaçıyor');

  // 5 · Esc kapatır ve odağı AÇAN DÜĞMEYE geri verir.
  await s.keyboard.press('Escape');
  await s.waitForTimeout(250);
  if (await ray.isVisible()) bildir('Esc çekmeceyi kapatmıyor');
  const odakDugmede = await s.evaluate(() =>
    document.activeElement?.classList.contains('ab-a-cekmece-dugme'));
  if (!odakDugmede) bildir('Esc sonrası odak açan düğmeye dönmüyor');

  // 6 · Gezinince çekmece kapanır ve düğmedeki AD GÜNCELLENİR.
  await dugme.click();
  await s.waitForTimeout(250);
  await s.locator('.ab-a-ray a[href="/topoloji"]').click();
  await s.waitForURL('**/topoloji', { timeout: 20000 });
  await s.waitForTimeout(800);
  if (await ray.isVisible()) bildir('gezinme sonrası çekmece açık kalıyor');
  const yeniAd = await gorunenAd();
  if (yeniAd !== 'topoloji') bildir(`gezinme sonrası düğme adı güncellenmiyor: "${yeniAd}"`);

  // 7 · Geniş bantta çekmece YOK, ray normal dikey hâlinde.
  await s.setViewportSize({ width: GENIS, height: 900 });
  await s.waitForTimeout(400);
  if (await dugme.isVisible()) bildir(`${GENIS}px: çekmece düğmesi gizlenmiyor`);
  if (!(await ray.isVisible())) bildir(`${GENIS}px: ray görünmüyor`);

  if (sayfaHatalari.length) bildir(`sayfa hatası: ${sayfaHatalari[0]}`);
  notlar.push(`${DAR}px çekmece + ${GENIS}px dikey ray · 7 ölçüm`);
} finally {
  await ctx.close();
  await b.close();
}

for (const n of notlar) console.log(`OK  ${n}`);
if (kusurlar.length) {
  console.error(`\nÇEKMECE KUSURU: ${kusurlar.length}`);
  for (const k of kusurlar) console.error(`  · ${k}`);
  process.exitCode = 1;
} else {
  console.log('\nçekmece kusuru: 0 · düğme aktif ekranı yazıyor · odak tuzağı + Esc + gezinme');
}
