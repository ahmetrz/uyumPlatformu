#!/usr/bin/env node
/* Kontrast denetimi — koyu yüzeylerin OKUNABİLİRLİK kapısı.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Abacus'ın üç yönü iki koyu (A, B) bir açık (C) zemin taşıyor.
   Prototiplerdeki mürekkep tonları ölçülmemişti (harita §7 kusur 7):
   ör. A'nın üçüncül mürekkebi `#6E777A`, `#0D1012` üzerinde 4,5:1'in
   ALTINDA kalıyor. Rengi gözle seçip "iyi görünüyor" demek, düşük
   kontrastlı bir ekranda ya da renk görme farkı olan bir okuyucuda ürünü
   OKUNMAZ yapar — ve bu sessizce olur.

   Bu araç token değerlerini KAYNAKTAN okur (`app/abacus.css`), her yön
   için zemin × mürekkep çiftlerini hesaplar ve eşiği geçmeyeni ÇIKIŞ
   KODU 1 ile bildirir. Tahmin yok: WCAG 2.1 bağıl parlaklık formülü.

   Zemin listesi dört yüzeyi kapsar: sayfa · panel · çukur · SEÇİM.
   `--secim` açılan defter satırının zeminidir; oraya da aynı mürekkepler
   yazılır, dolayısıyla oranı ölçülmeden geçirilemez. `--aksan-uzeri`
   ise ters yönde denetlenir: aksan DOLGUSUNUN üzerine yazılan mürekkep.

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
const KAYNAK = readFileSync(path.join(WEB, 'app', 'abacus.css'), 'utf8');

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
  return tokenlar(secici);
}

/* ── Denetlenen çiftler ──────────────────────────────────────────────── */

/* Her satır: mürekkep token'ı · hangi zeminde okunur · eşik.
   Zemin listesi kasıtlı olarak GENİŞ: aynı mürekkep hem sayfa yüzeyinde
   hem kart yüzeyinde hem de çukur (drawer/başlık) yüzeyinde kullanılır ve
   en zayıf halka hangisiyse kapı odur. */
const ZEMINLER = ['--zemin', '--panel', '--panel2', '--secim'];

const CIFTLER = [
  { ink: '--murekkep', esik: METIN, not: 'başlık, anahtar değer' },
  { ink: '--i2', esik: METIN, not: 'gövde metni' },
  { ink: '--i3', esik: METIN, not: 'etiket, meta, kolon başlığı' },
  { ink: '--ok', esik: METIN, not: 'uygun' },
  { ink: '--md', esik: METIN, not: 'kısmi' },
  { ink: '--bd', esik: METIN, not: 'uygunsuz/kritik' },
  { ink: '--pl', esik: METIN, not: 'taslak/süreli' },
  { ink: '--unk', esik: METIN, not: 'değerlendirilmedi' },
  { ink: '--aksan', esik: IRI, not: 'aktif kenar, işaret, odak halkası' },
  { ink: '--hr2', esik: 1.25, not: 'kart kenarı — görünür olmalı' },
];

/* Ters çiftler: zemini ZEMINLER'de olmayan, kendi dolgusunu taşıyan
   mürekkepler. Birincil düğme aksan dolgusu üzerine yazar. */
const TERS = [
  { ink: '--aksan-uzeri', zemin: '--aksan', esik: METIN, not: 'birincil düğme yazısı' },
];

/* Yönler taban token taşımıyor; her biri kendi setini TAM tanımlıyor.
   Bu bilinçli: bir yönün rengi diğerinden miras alınırsa, birinde yapılan
   düzeltme diğerini sessizce bozar. */
const KIPLER = [
  { ad: 'A · Industrial Precision', secici: ".ab[data-yon='a'] {" },
  { ad: 'B · Energy Intelligence', secici: ".ab[data-yon='b'] {" },
  { ad: 'C · Operational Luxury', secici: ".ab[data-yon='c'] {" },
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
  for (const { ink, zemin, esik, not } of TERS) {
    if (!t[ink] || !t[zemin]) { kusurlar.push(`${k.ad} · ${ink}/${zemin} tanımsız`); continue; }
    const o = oran(t[ink], t[zemin]);
    const gecti = o >= esik;
    if (!gecti) {
      kusurlar.push(`${k.ad} · ${ink} (${t[ink]}) / ${zemin} (${t[zemin]}) = ${o.toFixed(2)}:1 < ${esik}:1 — ${not}`);
    }
    if (tam || !gecti) {
      console.log(`  ${gecti ? '✓' : '✗'} ${ink.padEnd(8)} / ${zemin.padEnd(9)} ${o.toFixed(2).padStart(6)}:1  (eşik ${esik})  ${not}`);
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
  console.log(`kontrast kusuru: 0 · ${KIPLER.length} kip × `
    + `(${CIFTLER.length} mürekkep × ${ZEMINLER.length} zemin + ${TERS.length} ters çift)`);
}
