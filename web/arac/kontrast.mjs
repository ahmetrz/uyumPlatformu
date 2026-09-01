#!/usr/bin/env node
/* Kontrast denetimi — koyu yüzeylerin OKUNABİLİRLİK kapısı.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Atlas 2'nin üç yüzey kipi koyu palete geçti. Açık zemin için ayarlanmış
   mürekkep ve durum renkleri koyu zeminde okunmaz: `--ok: #2B7548` krem
   kâğıtta 5,0:1 verirken #0B0D0E üzerinde 2:1'in altına düşer. Rengi gözle
   seçip "iyi görünüyor" demek, düşük kontrastlı bir ekranda ya da renk
   görme farkı olan bir okuyucuda ürünü OKUNMAZ yapar — ve bu sessizce
   olur.

   Bu araç token değerlerini KAYNAKTAN okur (`app/atlas.css`), her yüzey
   kipi için zemin × mürekkep çiftlerini hesaplar ve eşiği geçmeyeni
   ÇIKIŞ KODU 1 ile bildirir. Tahmin yok: WCAG 2.1 bağıl parlaklık formülü.

   ── EŞİKLER ───────────────────────────────────────────────────────────
   METIN 4.5:1 — gövde metni, etiket, durum sözcüğü, mono kod.
   IRI   3.0:1 — yalnız SÜS ve büyük tipografi (≥24px) ile grafik sınırı.
   `--i4` bilerek IRI eşiğindedir: sözleşme onu METİN OLARAK YASAKLAR
   (bkz. arac/denetim.mjs §9); süs olarak 3:1 yeterlidir.

   Kullanım: node arac/kontrast.mjs        → rapor + çıkış kodu
             node arac/kontrast.mjs --tam  → geçenleri de yazdır
*/

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KAYNAK = readFileSync(path.join(WEB, 'app', 'atlas.css'), 'utf8');

export const METIN = 4.5;
export const IRI = 3.0;

/* ── Renk çözümleme ──────────────────────────────────────────────────── */

function hex(c) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map((x) => x + x).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/** WCAG 2.1 bağıl parlaklık. */
function parlaklik([r, g, b]) {
  const k = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}

export function oran(a, b) {
  const [x, y] = [parlaklik(hex(a)), parlaklik(hex(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/* ── Token okuma ─────────────────────────────────────────────────────── */

/** Bir CSS bloğundaki `--ad: #deger;` çiftlerini toplar. */
function tokenlar(blokBaslangici) {
  const i = KAYNAK.indexOf(blokBaslangici);
  if (i === -1) throw new Error(`kontrast: blok bulunamadı → ${blokBaslangici}`);
  // Bloğun kapanışına kadar oku (iç içe blok yok).
  const son = KAYNAK.indexOf('}', i);
  const govde = KAYNAK.slice(i, son);
  const harita = {};
  for (const m of govde.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    harita[m[1]] = m[2];
  }
  return harita;
}

/** Taban `.atlas` bloğu + bir yüzey kipinin üzerine yazdıkları. */
function kip(secici) {
  const taban = tokenlar('.atlas {');
  return secici ? { ...taban, ...tokenlar(secici) } : taban;
}

/* ── Denetlenen çiftler ──────────────────────────────────────────────── */

/* Her satır: mürekkep token'ı · hangi zeminde okunur · eşik.
   Zemin listesi kasıtlı olarak GENİŞ: aynı mürekkep hem sayfa yüzeyinde
   hem kart yüzeyinde hem de çukur (drawer/başlık) yüzeyinde kullanılır ve
   en zayıf halka hangisiyse kapı odur. */
const ZEMINLER = ['--pp', '--card', '--sunken'];

const CIFTLER = [
  { ink: '--ink', esik: METIN, not: 'başlık, anahtar değer' },
  { ink: '--i2', esik: METIN, not: 'gövde metni' },
  { ink: '--i3', esik: METIN, not: 'etiket, meta, eksen' },
  { ink: '--i4', esik: IRI, not: 'YALNIZ süs — metin olarak yasak (§9)' },
  { ink: '--ok', esik: METIN, not: 'uyumlu' },
  { ink: '--md', esik: METIN, not: 'kısmi' },
  { ink: '--bd', esik: METIN, not: 'uyumsuz/kritik' },
  { ink: '--pl', esik: METIN, not: 'taslak/süreli' },
  { ink: '--unk', esik: METIN, not: 'değerlendirilmedi' },
  { ink: '--bakir', esik: IRI, not: 'kabuk aksanı (kenar/işaret)' },
  { ink: '--hr2', esik: 1.4, not: 'kart kenarı — görünür olmalı' },
];

const KIPLER = [
  { ad: 'kabuk (.atlas)', secici: null },
  { ad: 'saha', secici: ".atlas [data-yuzey='saha'] {" },
  { ad: 'defter', secici: ".atlas [data-yuzey='defter'] {" },
  { ad: 'tezgah', secici: ".atlas [data-yuzey='tezgah'] {" },
];

const tam = process.argv.includes('--tam');
const kusurlar = [];

for (const k of KIPLER) {
  const t = kip(k.secici);
  console.log(`\n═══ ${k.ad} ═══`);
  for (const { ink, esik, not } of CIFTLER) {
    if (!t[ink]) { kusurlar.push(`${k.ad} · ${ink} tanımsız`); continue; }
    for (const zemin of ZEMINLER) {
      if (!t[zemin]) continue;
      const o = oran(t[ink], t[zemin]);
      const gecti = o >= esik;
      if (!gecti) {
        kusurlar.push(`${k.ad} · ${ink} (${t[ink]}) / ${zemin} (${t[zemin]}) = ${o.toFixed(2)}:1 < ${esik}:1 — ${not}`);
      }
      if (tam || !gecti) {
        console.log(`  ${gecti ? '✓' : '✗'} ${ink.padEnd(8)} / ${zemin.padEnd(9)} ${o.toFixed(2).padStart(6)}:1  (eşik ${esik})  ${not}`);
      }
    }
  }
  if (!tam && !kusurlar.some((x) => x.startsWith(k.ad))) console.log('  tüm çiftler eşiğin üstünde');
}

console.log('');
if (kusurlar.length) {
  console.error(`KONTRAST KUSURU: ${kusurlar.length}`);
  for (const x of kusurlar) console.error(`  · ${x}`);
  process.exitCode = 1;
} else {
  console.log(`kontrast kusuru: 0 · ${KIPLER.length} kip × ${CIFTLER.length} mürekkep × ${ZEMINLER.length} zemin`);
}
