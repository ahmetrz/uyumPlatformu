import { chromium } from 'playwright-core';
import { tarayiciYolu } from './kosu-ortak.mjs';

/* Yönetim konsolu + Saha ölçümü — ÇEKMECE AÇILARAK ölçülür.

   ── Kapatılan ölçüm hatası ────────────────────────────────────────────
   Bir önceki (geçici) ölçüm betiği yalnız `/yonetim-tezgahi` KÖKÜNÜ açıp
   sayfa metninde "Kanıt tazelik" / "yerleşim" / "Düzenle" aradı ve üçünü
   de `false / 0` yazdı. Oysa ekranda ikisi de vardı. Üç kusur birleşti:
     1. ROTA/DURUM · konsolun bilgi mimarisi üç seviyedir ve adreste yaşar
        (`?bolum=<grup>&modul=<kod>&sec=<ayar>`, bkz. KonsolIstemci.tsx).
        Kök adres grup dizinini gösterir; modül ve çekmece AÇILMADAN
        ayar adı da "Düzenle" düğmesi de DOM'da yoktur. Betik açmadı.
     2. SEÇİCİ · aranan metin UI'daki etiket değildi. Ayar etiketleri
        `lib/yapilandirma/tanimlar.ts`'ten gelir: "Kanıt taze eşiği",
        "Saha · modül görünürlüğü ve KPI sırası". Elle yazılan tahmin
        gerçek metinle eşleşmedi.
     3. YÜZEY · "Düzenle" yalnız çekmecede ve yalnız `izin.yazma` olan
        kullanıcıya çizilir (KonsolFormlar.tsx). Çekmece kapalıyken 0
        saymak yetki yokluğu değil, ölçümün oraya bakmamasıydı.
   Ders: ölçüm, kullanıcının gittiği adrese gider; etiketleri tahmin
   etmez, kaynaktaki sabitten okur; "yok" demeden önce yüzeyi açar.

   Kullanım: PORT=3111 node arac/konsol-olcum.mjs  (sunucu açık olmalı)
   Çıktı: stdout'a tek JSON. Değerler DOM'dan okunur, elle sayı yok. */

const KOK = process.env.KOK ?? `http://localhost:${process.env.PORT ?? 3000}`;

/* Ölçülen iki modül: adres (bolum/modul/sec) ve çekmecede beklenen ayar
   etiketi. Etiketler tanimlar.ts'teki `etiket` alanıyla AYNI olmalıdır;
   ayrışırsa `etiketGorunur=false` düşer ve neden yazılır. */
const MODULLER = [
  { kod: 'kanitTazelik', bolum: 'uyum', modul: 'kanitTazelik', sec: 'kanit.tazelik.taze_gun',
    etiket: 'Kanıt taze eşiği', yerlesimBekle: false },
  { kod: 'moduleGorunurluk', bolum: 'gorunum', modul: 'moduleGorunurluk', sec: 'saha.yerlesim',
    etiket: 'Saha · modül görünürlüğü ve KPI sırası', yerlesimBekle: true },
];

const SAHA_EKRANLARI = [[1366, 768], [1440, 900], [1280, 800]];

/* Giriş — rota-duman.mjs ile aynı gerekçe: form kontrollü bileşendir,
   hidrasyondan önce doldurulan değer geri yazılabilir; yerleştiği doğrulanır. */
async function girisYap(sayfa) {
  await sayfa.goto(`${KOK}/giris`, { waitUntil: 'load' });
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

const b = await chromium.launch({ executablePath: tarayiciYolu() });
const s = await b.newPage({ viewport: { width: 1366, height: 768 } });
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(`${s.url()} :: ${e.message.slice(0, 160)}`));
await girisYap(s);

const sonuc = { kok: KOK, saha: {}, konsol: {}, moduller: {}, hatalar };

/* ── Saha tek-ekran sözleşmesi: scrollHeight === innerHeight, scrollWidth === innerWidth ── */
for (const [w, h] of SAHA_EKRANLARI) {
  await s.setViewportSize({ width: w, height: h });
  await s.goto(`${KOK}/`, { waitUntil: 'networkidle' });
  await s.waitForTimeout(600);
  sonuc.saha[`${w}x${h}`] = await s.evaluate(() => {
    const d = document.documentElement;
    return {
      url: location.pathname, scrollHeight: d.scrollHeight, innerHeight, scrollWidth: d.scrollWidth, innerWidth,
      tekEkran: d.scrollHeight === innerHeight && d.scrollWidth === innerWidth,
    };
  });
}

/* ── Konsol başlığı: EkranBasligi `vurgu` → <b> içinde "Kapsama N/M" ── */
await s.setViewportSize({ width: 1366, height: 768 });
await s.goto(`${KOK}/yonetim-tezgahi`, { waitUntil: 'networkidle' });
await s.waitForTimeout(400);
sonuc.konsol = await s.evaluate(() => {
  const m = (document.body.textContent ?? '').match(/Kapsama\s+(\d+)\/(\d+)/);
  return m ? { baslik: m[0], yonetilen: Number(m[1]), ab: Number(m[2]) } : { baslik: null, yonetilen: null, ab: null };
});

/* ── Modüller: çekmece adresle açılır, ölçüm çekmece yüzeyinde yapılır ── */
for (const m of MODULLER) {
  const adres = `/yonetim-tezgahi?bolum=${m.bolum}&modul=${m.modul}&sec=${encodeURIComponent(m.sec)}`;
  await s.goto(`${KOK}${adres}`, { waitUntil: 'networkidle' });
  // Çekmece (aside.ab-panel) çizilmeden ölçme; çizilmezse neden JSON'a düşer.
  const cekmeceAcildi = await s.waitForSelector('aside.ab-panel', { timeout: 8000 }).then(() => true).catch(() => false);
  const olcum = await s.evaluate(({ etiket, yerlesimBekle }) => {
    const panel = document.querySelector('aside.ab-panel');
    const metin = panel?.textContent ?? '';
    const dugmeler = panel ? [...panel.querySelectorAll('button')] : [];
    const duzenle = dugmeler.filter((d) => (d.textContent ?? '').trim() === 'Düzenle').length;
    const yerlesimSatir = panel ? panel.querySelectorAll('ul.ab-yerlesim li').length : 0;
    return {
      etiketGorunur: metin.includes(etiket),
      duzenle,
      duzenlemeMevcut: duzenle > 0,
      yerlesimSatir,
      yerlesimGorunur: yerlesimBekle ? yerlesimSatir > 0 : null,
    };
  }, m);
  const neden = [];
  if (!cekmeceAcildi) neden.push('çekmece (aside.ab-panel) açılmadı');
  if (!olcum.etiketGorunur) neden.push(`etiket bulunamadı: "${m.etiket}"`);
  if (!olcum.duzenlemeMevcut) neden.push('Düzenle düğmesi yok (izin.yazma yok ya da çekmece kapalı)');
  if (olcum.yerlesimGorunur === false) neden.push('ul.ab-yerlesim satırı yok');
  sonuc.moduller[m.kod] = { adres, cekmeceAcildi, ...olcum, mevcut: neden.length === 0, neden };
}

await b.close();

const tekEkran = Object.values(sonuc.saha).every((v) => v.tekEkran);
const modullerMevcut = Object.values(sonuc.moduller).every((v) => v.mevcut);
sonuc.ozet = { sahaTekEkran: tekEkran, modullerMevcut, hataSayisi: hatalar.length };
console.log(JSON.stringify(sonuc, null, 1));
process.exit(tekEkran && modullerMevcut && hatalar.length === 0 ? 0 : 1);
