import { chromium } from 'playwright-core';

/* 06 §A4 anti-regresyon + Part B anti-flattening denetimi.
   Tarayıcıda hesaplanmış stiller üzerinden çalışır — kaynak kodu gramerine
   değil, gerçekten render olana bakar. Faz 8'de her ekran için koşulur. */

/* Geliştirme sunucusunun portu sabit değil: paralel çalışan işler 3000'i
   kapmış olabiliyor. PORT ile geç, varsayılan 3000. */
const KOK = `http://localhost:${process.env.PORT || 3000}`;
const YOLLAR = (process.env.YOLLAR || '/sistem/bilesenler').split(',');

const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const s = await b.newPage({ viewport: { width: 1440, height: 1000 } });
/* Giriş: form React ile KONTROLLÜ bir bileşendir. `domcontentloaded`
   sonrası doldurmak yeterli değil — hidrasyon henüz olmamışsa React
   alanı kendi (boş) durumuyla geri yazar ve sunucuya BOŞ e-posta gider.
   Belirtisi kafa karıştırıcıdır: denetim izine "tanımsız e-posta" düşer
   ve kimlik bilgileri yanlış sanılır. Bu yüzden doldurduktan sonra
   değerin GERÇEKTEN durduğu doğrulanır. */
async function girisYap(sayfa, kok) {
  await sayfa.goto(kok + '/giris', { waitUntil: 'load' });
  if (!sayfa.url().includes('/giris')) return;
  for (let deneme = 1; deneme <= 3; deneme += 1) {
    await sayfa.fill('input[type=email]', 'ahmet.terzi@zorlu.com');
    await sayfa.fill('input[type=password]', 'Enerji!2026');
    const yerlesti = await sayfa.inputValue('input[type=email]') === 'ahmet.terzi@zorlu.com'
      && (await sayfa.inputValue('input[type=password]')).length > 0;
    if (yerlesti) break;
    await sayfa.waitForTimeout(300 * deneme);
  }
  await sayfa.click('button[type=submit]');
  await sayfa.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 25000 });
}

await girisYap(s, KOK);

/* Playwright fareyi son tıklama koordinatında bırakır. O nokta sonraki
   sayfada bir tablo satırının üstüne düşerse satır :hover durumunda
   yakalanır — ekran görüntüsünde vurgulu görünür ve denetim bunu zebra
   sanır. Her gezinmeden önce fare tuvalin dışına alınır. */
const fareyiKenaraAl = () => s.mouse.move(2, 2);
await fareyiKenaraAl();

let toplamKusur = 0;

for (const yol of YOLLAR) {
  await fareyiKenaraAl();
  await s.goto(KOK + yol, { waitUntil: 'domcontentloaded' });
  await fareyiKenaraAl();
  await s.waitForTimeout(1200);

  const rapor = await s.evaluate(() => {
    const kok = document.querySelector('.ab[data-yogunluk]') || document.body;
    const hepsi = [...kok.querySelectorAll('*')];
    const gorunur = (e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const bulgular = [];

    // B1/§A4-4 · yarıçap: yalnız durum noktası ve avatar dairesi serbest
    for (const e of hepsi) {
      if (!gorunur(e)) continue;
      const c = getComputedStyle(e);
      const r = parseFloat(c.borderTopLeftRadius) || 0;
      if (r > 0 && !e.classList.contains('yuvarlak') && !/^im /.test(e.className + ' ')
          && !e.className.toString().includes('im-')) {
        bulgular.push({ kural: 'B1 yarıçap', sec: e.className || e.tagName, deger: c.borderRadius });
      }
    }

    // B4 · zebra: ardışık kardeş satırların zemini değişiyor mu
    for (const tb of kok.querySelectorAll('.tbl, .mtx')) {
      const satirlar = [...tb.children].filter((x) => /tbl-satir|mtx-satir/.test(x.className));
      const zeminler = satirlar.filter((x) => x.getAttribute('aria-selected') !== 'true')
        .map((x) => getComputedStyle(x).backgroundColor);
      const tekil = [...new Set(zeminler)];
      if (tekil.length > 1) bulgular.push({ kural: 'B4 zebra', sec: tb.className, deger: tekil.join(' / ') });
    }

    // §A4-3 · durum sözcüğü: canvasta marker'ın YANINDA durum kelimesi olamaz
    const SOZCUKLER = /\b(uyumlu|uyumsuz|kısmi|kritik|planlı|değerlendirilmedi|tamamlandı|gecikmiş|bloke)\b/i;
    let muaf = 0;
    for (const im of kok.querySelectorAll('.im')) {
      if (im.closest('.cekmece')) continue;           // çekmece kimlik bloğu tek istisna
      if (im.closest('[data-efsane]')) { muaf++; continue; }  // bileşen kataloğu efsanesi
      const ebeveyn = im.parentElement;
      if (!ebeveyn) continue;
      const metin = [...ebeveyn.childNodes]
        .filter((n) => n.nodeType === 3 || (n.nodeType === 1 && n !== im))
        .map((n) => n.textContent || '').join(' ').trim();
      if (SOZCUKLER.test(metin)) {
        bulgular.push({ kural: 'A4-3 durum sözcüğü', sec: ebeveyn.className, deger: metin.slice(0, 60) });
      }
    }

    // B3 · pill/chip/badge: eski tasarımın yuvarlak rozet sınıfları
    for (const e of kok.querySelectorAll('.pill, .chip, .badge, .tag')) {
      if (gorunur(e)) bulgular.push({ kural: 'B3 pill/chip', sec: e.className, deger: e.textContent.slice(0, 40) });
    }

    // B9 · renk kayması: önceki arayüz katmanının altını etkileşimde kullanılmamalı
    for (const e of hepsi) {
      if (!gorunur(e)) continue;
      const c = getComputedStyle(e);
      if (/217,\s*164,\s*65/.test(c.backgroundColor) || /217,\s*164,\s*65/.test(c.color)) {
        bulgular.push({ kural: 'B9 altın aksan', sec: e.className || e.tagName, deger: c.color });
      }
    }

    // §9 · --i4 asla metin olmaz
    for (const e of hepsi) {
      if (!gorunur(e) || !e.textContent?.trim()) continue;
      const c = getComputedStyle(e);
      if (/141,\s*145,\s*140/.test(c.color) && e.children.length === 0) {
        bulgular.push({ kural: '§9 i4 metin', sec: e.className || e.tagName, deger: e.textContent.slice(0, 40) });
      }
    }

    // §A2 · metrik bütçesi
    for (const m of kok.querySelectorAll('.metrikler')) {
      const n = m.children.length;
      if (n > 5) bulgular.push({ kural: 'A2 metrik bütçesi', sec: m.className, deger: `${n} metrik` });
    }

    return {
      bulgular,
      muaf,
      sayim: {
        metin: kok.innerText.trim().length,
        dugum: hepsi.length,
        marker: kok.querySelectorAll('.im').length,
      },
    };
  });

  const gruplu = {};
  for (const x of rapor.bulgular) (gruplu[x.kural] ??= []).push(x);
  toplamKusur += rapor.bulgular.length;

  console.log(`\n══ ${yol} ══  metin=${rapor.sayim.metin} düğüm=${rapor.sayim.dugum} ` +
    `marker=${rapor.sayim.marker}${rapor.muaf ? ` (efsane muafiyeti: ${rapor.muaf})` : ''}`);
  if (!rapor.bulgular.length) console.log('  06 §A4 + Part B: TEMİZ');
  for (const [kural, liste] of Object.entries(gruplu)) {
    console.log(`  ${kural}: ${liste.length}`);
    for (const x of liste.slice(0, 4)) console.log(`     ${String(x.sec).slice(0, 52)} → ${x.deger}`);
  }
}

console.log(`\ntoplam kusur: ${toplamKusur}`);
await b.close();
process.exit(toplamKusur > 0 ? 1 : 0);
