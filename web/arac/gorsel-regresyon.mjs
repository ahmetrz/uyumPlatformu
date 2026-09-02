#!/usr/bin/env node
/* Görsel regresyon — altın görüntüyle piksel karşılaştırması.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Kabuk CSS'i tek dosyadır ve bir kural değişince otuz ekran birden
   değişir; hangisinin nasıl değiştiğini gözle bulmak olanaksız. Bu
   araç sekiz rotayı iki bantta (1440 geniş · 375 telefon) çeker ve
   `arac/altin/<rota>-<bant>.png` altın görüntüsüyle karşılaştırır.
   Farklı piksel oranı %0,5'i aşarsa kusur; fark görüntüsü (kırmızı
   pikseller) FARK_DIZINI'ne yazılır ki "ne değişti" gözle görülsün.

   ── KARARLILIK ────────────────────────────────────────────────────────
   Animasyon ve geçişler yakalama anına göre farklı kare üretir; bağlam
   `prefers-reduced-motion: reduce` ile açılır ve ayrıca her sayfaya
   `animation: none; transition: none` enjekte edilir. İmleç gizlenir.
   Sunucu saatine bağlı metinler (veri kesiti damgası, "3 dk önce") yine
   değişebilir — %0,5 eşiği bunları taşır; taşımıyorsa damga taşıyan
   alanı öğe düzeyinde maskelemek gerekir, eşiği büyütmek DEĞİL.

   ── ALTIN GÖRÜNTÜ DİSİPLİNİ ───────────────────────────────────────────
   Altın yoksa kusurdur ("ALTIN YOK") — karşılaştırılmayan ekran geçmiş
   sayılmaz. `--yaz` altınları yeniler; yalnız bilinçli tasarım
   değişikliğinden sonra ve gözle bakılarak kullanılır.

   Kullanım:
     PORT=3210 node arac/gorsel-regresyon.mjs                 → karşılaştır
     PORT=3210 node arac/gorsel-regresyon.mjs --yaz           → altınları yenile
     PORT=3210 node arac/gorsel-regresyon.mjs --rota=/uyum --bant=375
     npm run tasarim:gorsel
*/
import { chromium } from 'playwright-core';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  KOK, WEB, girisYap, rotaBayragi, tarayiciYolu,
} from './kosu-ortak.mjs';
import { altinDosyaAdi, gorselFark } from './kalite-kurallari.mjs';

const GIRIS_ROTASI = '/giris';
const VARSAYILAN = ['/', '/portfoy', '/uyum', '/bulgular', '/envanter', '/riskler', '/topoloji', GIRIS_ROTASI];
const ROTALAR = rotaBayragi(VARSAYILAN);
const TUM_BANTLAR = [
  { en: 1440, boy: 900 },
  { en: 375, boy: 720 },
];
const bantArg = process.argv.find((a) => a.startsWith('--bant='));
const BANTLAR = bantArg
  ? TUM_BANTLAR.filter((b) => bantArg.slice('--bant='.length).split(',').includes(String(b.en)))
  : TUM_BANTLAR;
const YAZ = process.argv.includes('--yaz');
const ESIK_YUZDE = Number(process.env.ESIK_YUZDE ?? 0.5);
/* Altın dizini depodadır; ALTIN_DIZINI yalnız aracın kendisini sınarken
   (sahte sunucuya karşı) gerçek altınları kirletmemek için değiştirilir. */
const ALTIN = process.env.ALTIN_DIZINI || path.join(WEB, 'arac', 'altin');
/* Fark görüntüleri depoya girmez: geçici dizine yazılır, yol raporda basılır. */
const FARK_DIZINI = process.env.FARK_DIZINI || path.join(os.tmpdir(), 'gorsel-fark');
mkdirSync(ALTIN, { recursive: true });
mkdirSync(FARK_DIZINI, { recursive: true });

const DURDUR_CSS = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
  }
`;

const b = await chromium.launch({ executablePath: tarayiciYolu() });
const sonuclar = [];

async function yakala(sayfa, rota) {
  await sayfa.goto(KOK + rota, { waitUntil: 'load' });
  await sayfa.addStyleTag({ content: DURDUR_CSS });
  /* Tembel görseller ve yerleşim otursun; fare tuvalin dışında dursun
     (`:hover` durumu yakalanmasın — bkz. kare.mjs notu). */
  await sayfa.mouse.move(0, 0);
  await sayfa.waitForTimeout(600);
  return sayfa.screenshot({ fullPage: true, animations: 'disabled' });
}

function karsilastir(rota, en, yeniPng) {
  const altinYolu = path.join(ALTIN, altinDosyaAdi(rota, en));
  if (YAZ) {
    writeFileSync(altinYolu, yeniPng);
    return { rota, en, durum: 'YAZILDI', not: path.relative(WEB, altinYolu) };
  }
  if (!existsSync(altinYolu)) {
    return { rota, en, durum: 'ALTIN YOK', not: `${path.relative(WEB, altinYolu)} · --yaz ile üretin` };
  }
  const altin = PNG.sync.read(readFileSync(altinYolu));
  const yeni = PNG.sync.read(yeniPng);
  if (altin.width !== yeni.width || altin.height !== yeni.height) {
    /* Boyut farkı piksel karşılaştırmasından ÖNCE kusurdur: sayfa uzadı
       ya da kısaldı — çoğu kez bir bölüm eklendi/kayboldu demektir. */
    const farkYolu = path.join(FARK_DIZINI, altinDosyaAdi(rota, en).replace(/\.png$/, '-yeni.png'));
    writeFileSync(farkYolu, yeniPng);
    return {
      rota, en, durum: 'KUSUR',
      not: `boyut ${altin.width}×${altin.height} → ${yeni.width}×${yeni.height} · yeni görüntü ${farkYolu}`,
    };
  }
  const fark = new PNG({ width: altin.width, height: altin.height });
  const farkPiksel = pixelmatch(altin.data, yeni.data, fark.data, altin.width, altin.height, {
    threshold: 0.1, includeAA: false,
  });
  const karar = gorselFark(farkPiksel, altin.width * altin.height, ESIK_YUZDE);
  if (!karar.kusur) return { rota, en, durum: 'GEÇTİ', not: `fark %${karar.yuzde.toFixed(3)}` };
  const farkYolu = path.join(FARK_DIZINI, altinDosyaAdi(rota, en).replace(/\.png$/, '-fark.png'));
  writeFileSync(farkYolu, PNG.sync.write(fark));
  return { rota, en, durum: 'KUSUR', not: `${karar.sebep} · fark görüntüsü ${farkYolu}` };
}

for (const bant of BANTLAR) {
  const ctx = await b.newContext({
    viewport: { width: bant.en, height: bant.boy },
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  });
  const s = await ctx.newPage();
  try {
    /* Giriş ekranı ÖNCE, oturum açılmadan; sonra giriş, sonra kalanlar. */
    if (ROTALAR.includes(GIRIS_ROTASI)) sonuclar.push(karsilastir(GIRIS_ROTASI, bant.en, await yakala(s, GIRIS_ROTASI)));
    await girisYap(s, KOK);
    for (const rota of ROTALAR.filter((r) => r !== GIRIS_ROTASI)) {
      sonuclar.push(karsilastir(rota, bant.en, await yakala(s, rota)));
    }
  } catch (e) {
    sonuclar.push({ rota: '(bant)', en: bant.en, durum: 'KUSUR', not: `bant koşusu kırıldı: ${String(e).slice(0, 160)}` });
  } finally {
    await ctx.close();
  }
}
await b.close();

const kusurlu = sonuclar.filter((r) => r.durum === 'KUSUR' || r.durum === 'ALTIN YOK');
for (const r of sonuclar) {
  console.log(`${r.durum.padEnd(10)} ${String(r.en).padStart(4)}  ${r.rota.padEnd(14)} ${r.not ?? ''}`);
}
console.log(`\n${YAZ ? 'altın yazıldı' : 'görsel regresyon'}: ${sonuclar.length} yakalama`
  + ` · kusurlu ${kusurlu.length} · eşik %${ESIK_YUZDE} · fark dizini ${FARK_DIZINI}`);
process.exitCode = kusurlu.length ? 1 : 0;
