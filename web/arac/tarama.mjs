#!/usr/bin/env node
/* Rota taraması — YAPISAL kusur avı.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Otuz dokuz rotanın ekran görüntüsüne tek tek bakmak hem yavaş hem de
   güvenilmez: yatay taşma, sıfır yükseklikli blok ve ESKİ TASARIMDAN
   KALMIŞ sınıf adı gözle kaçar. Bu araç her rotayı açar ve şunları ölçer:

   · yatay taşma  — `scrollWidth > clientWidth` (dar bantta okunmaz ekran)
   · eski sınıf   — DOM'da hâlâ önceki arayüz katmanının sınıfını taşıyan düğüm sayısı
   · çıplak metin — `.ab` kabuğu DIŞINDA kalan içerik (kabuk uygulanmamış)
   · sayfa hatası — pageerror ve console.error
   · boş ekran    — ana içerik yüksekliği 200px'in altında

   Kullanım: PORT=3210 node arac/tarama.mjs [--rota=/uyum,/riskler]
             EN=1440,1024,768,375 PORT=3210 node arac/tarama.mjs   → çok bant
*/
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { tarayiciYolu } from './kosu-ortak.mjs';

const KOK = `http://localhost:${process.env.PORT || 3000}`;
/* Eski KOD ADLARI (`atlas`, `shell`) bilerek listede: kapının işi onların
   geri sızmasını yakalamak. Çıkarılırlarsa kapı körleşir. */
const ESKI_SINIFLAR = [
  'tbl', 'tbl-satir', 'tbl-bas', 'tbl-konu', 'tbl-alt', 'tbl-hucre', 'tbl-ok',
  'cekmece', 'cekmece-blok', 'cekmece-alan', 'cekmece-dip', 'cekmece-bagli',
  'cekmece-bas', 'cekmece-govde', 'cekmece-kimlik', 'cekmece-kapat',
  'im', 'metrikler', 'metrik', 'ekran-bas', 'ekran-govde', 'filtreler-atlas',
  'filtre', 'dg', 'dg-birincil', 'gr', 'gr-hata', 'dip-not', 'blok',
  't-label', 't-caption', 't-colhead', 't-eyebrow', 't-screen', 't-section',
  'mtx', 'mtx-satir', 'gen-satir', 'zaman-atlas', 'omur-serit', 'tuval',
  'baglam', 'koken-rozet', 'odak', 'asamalar', 'ilerleme', 'segment',
  'kesir', 'tik-serit', 'iskelet', 'shell', 'atlas',
];

const argRota = process.argv.find((a) => a.startsWith('--rota='));
const ROTALAR = argRota
  ? argRota.slice('--rota='.length).split(',')
  : JSON.parse(readFileSync(new URL('./rotalar.json', import.meta.url), 'utf8'));

const b = await chromium.launch({ executablePath: tarayiciYolu() });
/* EN tek genişlik ya da virgüllü liste alır (`EN=1440,1024,768,375`).
   Yatay taşma dar bantta çıkar; tek genişlikte "taşma yok" demek geniş
   ekranda bakıp dar ekranı geçmiş saymaktır. */
const BANTLAR = String(process.env.EN || '1440').split(',').map(Number).filter((n) => n > 0);
const s = await b.newPage({ viewport: { width: BANTLAR[0], height: 900 } });

await s.goto(`${KOK}/giris`, { waitUntil: 'domcontentloaded' });
if (s.url().includes('/giris')) {
  await s.fill('input[type=email]', 'ahmet.terzi@zorlu.com');
  await s.fill('input[type=password]', 'Enerji!2026');
  await s.click('button[type=submit]');
  await s.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 25000 });
}

const rapor = [];
for (const en of BANTLAR) {
await s.setViewportSize({ width: en, height: 900 });
for (const yol of ROTALAR) {
  const hatalar = [];
  const dinle = (m) => { if (m.type() === 'error') hatalar.push(m.text().slice(0, 140)); };
  const sayfaHata = (e) => hatalar.push(`pageerror: ${e.message.slice(0, 140)}`);
  s.on('console', dinle);
  s.on('pageerror', sayfaHata);
  try {
    const y = await s.goto(KOK + yol, { waitUntil: 'domcontentloaded' });
    await s.waitForTimeout(650);
    const olcum = await s.evaluate((eski) => {
      const kok = document.documentElement;
      const kabuk = document.querySelector('.ab');
      const sayim = {};
      for (const c of eski) {
        const n = document.querySelectorAll(`.${CSS.escape(c)}`).length;
        if (n > 0) sayim[c] = n;
      }
      const govde = document.querySelector('.ab-a-icerik, .ab-c-govde, .ab-b main, .ab-b > div')
        ?? document.body;
      return {
        tasma: Math.max(0, kok.scrollWidth - kok.clientWidth),
        kabukVar: Boolean(kabuk),
        yon: kabuk?.getAttribute('data-yogunluk') ?? null,
        yukseklik: Math.round(govde.getBoundingClientRect().height),
        eski: sayim,
      };
    }, ESKI_SINIFLAR);
    rapor.push({ yol, en, durum: y?.status() ?? 0, ...olcum, hatalar });
  } catch (e) {
    rapor.push({ yol, en, durum: -1, hata: String(e).slice(0, 160), hatalar });
  }
  s.off('console', dinle);
  s.off('pageerror', sayfaHata);
}
}
await b.close();

writeFileSync(process.env.CIKTI || '/tmp/tarama.json', JSON.stringify(rapor, null, 1));

let kusur = 0;
const cokBant = BANTLAR.length > 1;
console.log(`${'ROTA'.padEnd(30)} ${cokBant ? 'EN    ' : ''}YÖN  DURUM  TAŞMA  YÜKS   ESKİ SINIF / HATA`);
for (const r of rapor) {
  const eskiOzet = Object.entries(r.eski ?? {}).map(([k, v]) => `${k}×${v}`).join(' ');
  const sorun = [
    r.durum !== 200 && `HTTP ${r.durum}`,
    r.tasma > 0 && `taşma ${r.tasma}px`,
    !r.kabukVar && 'KABUK YOK',
    (r.yukseklik ?? 0) < 200 && `boş (${r.yukseklik}px)`,
    eskiOzet,
    ...(r.hatalar ?? []).filter((h) => !/favicon|404 \(Not Found\)/.test(h)),
  ].filter(Boolean);
  if (sorun.length) kusur += 1;
  console.log(
    `${r.yol.padEnd(30)} ${cokBant ? String(r.en).padEnd(6) : ''}${(r.yon ?? '-').padEnd(4)} ${String(r.durum).padEnd(6)} `
    + `${String(r.tasma ?? '-').padEnd(6)} ${String(r.yukseklik ?? '-').padEnd(6)} `
    + sorun.join(' · '),
  );
}
console.log(`\nkusurlu rota: ${kusur} / ${rapor.length}${cokBant ? ` (${BANTLAR.length} bant)` : ''}`);
process.exitCode = kusur > 0 ? 1 : 0;
