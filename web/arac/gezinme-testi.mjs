#!/usr/bin/env node
/* Duyarlı gezinme testi — HİÇBİR ROTA ERİŞİLEMEZ OLMAMALI.

   ── Kapatılan kusur ("bazı sayfalar arası geçiş yapılamıyor") ─────────
   Ürün eskiden üç kabuktan oluşuyordu (A tezgâh · B saha · C defter) ve
   her kabuk yalnız KENDİ ekranlarını listeliyordu: A'dan C'ye, C'den
   portföye gitmenin tek yolu ana ekrana dönmekti; `/sistem` hiçbir
   yerden bağlı değildi. Çözüm beş alanı (Saha · Portföy · Uyum · Varlık
   · Risk) taşıyan ORTAK bir alan gezinmesiydi
   (`nav[aria-label="Alanlar"]`). Kabuklar sonra TEKE indirildi; yoğunluk
   artık kabuğun değil ekranın ölçüsüdür. Bu araç o değişikliğe göre
   güncellendi (aşağıdaki TUR yorumuna bakın).

   ── Bu araç ne ölçer ──────────────────────────────────────────────────
   Dört genişlikte, dokunmatik + klavyeyle:
     1. KARDEŞ rota — `/riskler`'den `/bulgular` bağlantısı görünür mü ve
        dokununca gerçekten oraya mı gidiyor (kabuk İÇİ gezinme).
     2. KABUKLAR ARASI tur — C → A → B → C: alan bağlantıları her kabukta
        görünür, dokununca hedef kabuğa geçiyor. Hiçbir adımda ana ekrana
        dönmek gerekmiyor.
     3. `aria-current="page"` TEKİLLİĞİ — alan gezinmesi `location`
        kullanır; "geçerli sayfa" yalnız kabuğun kendi sekmesinde duyurulur.
     4. KLAVYE — kardeş bağlantı sekmeyle odaklanır, Enter gider.
     5. Sayfa hatası yok.

   Kullanım: PORT=3000 node arac/gezinme-testi.mjs           → yedi bant
             PORT=3000 node arac/gezinme-testi.mjs --hizli   → dört bant
*/

import { chromium } from 'playwright-core';
import { tarayiciYolu } from './kosu-ortak.mjs';

const KOK = `http://localhost:${process.env.PORT || 3000}`;


/* Genişlikler kırılma noktalarının HER BİRİNDEN bir örnek taşır:
   ≥1367 tam · 1101–1366 sıkı · 701–1100 dizin tek kolon, künye sarar
   · ≤700 üst çubuklar yatay kayar.

   Yedi bant: kırılma noktalarının yanına yaygın cihaz genişlikleri de
   girdi (1920 masaüstü · 1024 yatay tablet · 768 dikey tablet) — kırılma
   noktasının hemen üstü ve altı farklı davranır, aynı aralıkta iki
   örnek olması "aralık içinde de sağlam mı" sorusuna cevaptır.
   `--hizli` eski dörtlüyü koşar: yerel döngüde süre için. */
const TUM_BANTLAR = [
  { ad: '1920 · masaüstü', en: 1920, boy: 1080 },
  { ad: '1440 · geniş', en: 1440, boy: 900 },
  { ad: '1100 · orta', en: 1100, boy: 800 },
  { ad: '1024 · yatay tablet', en: 1024, boy: 768 },
  { ad: '900 · tablet', en: 900, boy: 800 },
  { ad: '768 · dikey tablet', en: 768, boy: 1024 },
  { ad: '375 · telefon', en: 375, boy: 720 },
];
const HIZLI = new Set([1440, 1100, 900, 375]);
const BANTLAR = process.argv.includes('--hizli')
  ? TUM_BANTLAR.filter((b) => HIZLI.has(b.en))
  : TUM_BANTLAR;

/* Kabuk içi kardeş: ikisi de C defterindedir. */
const BASLANGIC = '/riskler';
const KARDES = '/bulgular';

/* Kabuklar arası tur: her adım "buradayım → alan bağlantısına dokun →
   oraya vardım". Hedef kabuğun belirtisi kök `.ab[data-yogunluk]` değeridir. */
/* ── ARAÇ TEK KABUĞA GÜNCELLENDİ ──────────────────────────────────────
   Bu tur eskiden ÜÇ KABUK (A tezgâh · B saha · C defter) modelini
   ölçüyordu ve `data-yogunluk` değerini 'a'/'b'/'c' bekliyordu. Ürün o
   modeli bıraktı: tek kabuk var, `data-yogunluk` ise kabuğun değil
   EKRANIN ölçüsüdür (amiral · operasyonel · tezgah) ve rotadan türer.
   Aynı şekilde alan sekmesi `aria-current="location"` değil `"page"`
   taşıyor — `components/kabuk/Kabuk.tsx` bunu açıkça yazıyor: belgede
   TEK "page" alan sekmesindedir.

   Araç bu iki beklentiyi güncellemediği için ölçtüğü şey artık gerçek
   değildi ve her koşuda kırmızı yanıyordu. Kırmızı yanan ama gerçek bir
   şey söylemeyen kapı, insanları kapıyı yok saymaya alıştırır.

   Turun ASIL iddiası değişmedi ve korunuyor: hiçbir rotaya ulaşmak için
   ana ekrana dönmek gerekmez. */
const TUR = [
  { neredeyim: '/riskler', hedef: '/envanter', yogunluk: 'operasyonel', ad: 'Risk → Varlık' },
  { neredeyim: '/envanter', hedef: '/portfoy', yogunluk: 'amiral', ad: 'Varlık → Portföy' },
  { neredeyim: '/portfoy', hedef: '/uyum', yogunluk: 'operasyonel', ad: 'Portföy → Uyum' },
  { neredeyim: '/uyum', hedef: '/', yogunluk: 'amiral', ad: 'Uyum → Saha' },
];

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

/** Tek `aria-current="page"` sözleşmesi. */
async function aktifSayisi(s) {
  return s.evaluate(() => document.querySelectorAll('[aria-current="page"]').length);
}

async function yon(s) {
  return s.evaluate(() => document.querySelector('.ab[data-yogunluk]')?.getAttribute('data-yogunluk') ?? '?');
}

const patika = (s) => new URL(s.url()).pathname;

/** Bağlantıya dokun, hedefe varıldığını doğrula. */
async function dokunVeVar(s, bant, bag, hedef, etiket) {
  if (!(await bag.count())) { bildir(bant, `${etiket}: bağlantı YOK`); return false; }
  if (!(await bag.first().isVisible())) { bildir(bant, `${etiket}: bağlantı görünmüyor`); return false; }
  await bag.first().tap();
  await s.waitForURL((u) => u.pathname === hedef, { timeout: 15000 }).catch(() => {});
  await s.waitForTimeout(300);
  if (patika(s) !== hedef) { bildir(bant, `${etiket}: varış ${patika(s)} (${hedef} olmalı)`); return false; }
  return true;
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

    /* ── 1 · KARDEŞ rota, dokunmatik ─────────────────────────────────── */
    await s.goto(KOK + BASLANGIC, { waitUntil: 'load' });
    await s.waitForTimeout(400);
    const n = await aktifSayisi(s);
    if (n !== 1) bildir(bant.ad, `${BASLANGIC}: aria-current="page" sayısı ${n} (1 olmalı)`);
    /* `.ab-c-nav` üç kabuklu modelin defter rayıydı ve artık YOK; kardeş
       ekranlar tek kabuğun ikincil sırasında (`.ab-ikincil`) duruyor.
       Eski seçici hiçbir şey bulamadığı için araç "bağlantı YOK" diyordu
       — bağlantı oradaydı, arayan yanlış yere bakıyordu. */
    await dokunVeVar(s, bant.ad, s.locator(`.ab-ikincil a[href="${KARDES}"]`), KARDES, 'kardeş (dokunmatik)');
    const n2 = await aktifSayisi(s);
    if (n2 !== 1) bildir(bant.ad, `${KARDES}: aria-current="page" sayısı ${n2} (1 olmalı)`);

    /* ── 2 · KARDEŞ rota, klavye ──────────────────────────────────────
       Sekme tuşuyla bağlantıya varılmalı — odak sırasında görünmez ya da
       atlanmış bir bağlantı klavye kullanıcısı için yoktur. */
    await s.goto(KOK + BASLANGIC, { waitUntil: 'load' });
    await s.waitForTimeout(300);
    let odaklandi = false;
    for (let i = 0; i < 80 && !odaklandi; i += 1) {
      await s.keyboard.press('Tab');
      odaklandi = await s.evaluate((h) => {
        const a = document.activeElement;
        return a instanceof HTMLAnchorElement && a.getAttribute('href') === h
          && !!a.closest('.ab-ikincil');
      }, KARDES);
    }
    if (!odaklandi) {
      bildir(bant.ad, `kardeş ${KARDES} 80 sekmede odaklanamadı`);
    } else {
      await s.keyboard.press('Enter');
      await s.waitForURL((u) => u.pathname === KARDES, { timeout: 15000 }).catch(() => {});
      await s.waitForTimeout(300);
      if (patika(s) !== KARDES) bildir(bant.ad, `klavye: varış ${patika(s)} (${KARDES} olmalı)`);
    }

    /* ── 3 · KABUKLAR ARASI tur ──────────────────────────────────────── */
    for (const adim of TUR) {
      await s.goto(KOK + adim.neredeyim, { waitUntil: 'load' });
      await s.waitForTimeout(400);
      const alanlar = s.locator('nav[aria-label="Alanlar"], nav[aria-label="Saha"]');
      if (!(await alanlar.count())) { bildir(bant.ad, `${adim.ad}: alan gezinmesi YOK`); continue; }
      const ok = await dokunVeVar(
        s, bant.ad, alanlar.locator(`a[href="${adim.hedef}"]`), adim.hedef, adim.ad,
      );
      if (!ok) continue;
      const y = await yon(s);
      if (y !== adim.yogunluk) {
        bildir(bant.ad, `${adim.ad}: yoğunluk ${y} (${adim.yogunluk} olmalı)`);
      }
      const n3 = await aktifSayisi(s);
      if (n3 !== 1) bildir(bant.ad, `${adim.hedef}: aria-current="page" sayısı ${n3} (1 olmalı)`);
      /* Alan sekmelerinden TAM BİRİ "buradasın" demeli — ve belgedeki
         tek "page" odur (yukarıdaki sayım da bunu doğrular). */
      const konum = await s.evaluate(() => document
        .querySelectorAll('nav[aria-label="Alanlar"] [aria-current="page"]').length);
      if (konum !== 1) bildir(bant.ad, `${adim.hedef}: alan sekmesi "page" sayısı ${konum} (1 olmalı)`);
    }

    if (sayfaHatalari.length) bildir(bant.ad, `sayfa hatası: ${sayfaHatalari[0]}`);
    notlar.push(`${bant.ad}: kardeş + ${TUR.length} adımlı tur · dokunmatik + klavye`);
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
  console.log(`\ngezinme kusuru: 0 · ${BANTLAR.length} bant · kabuk içi + kabuklar arası`);
}
