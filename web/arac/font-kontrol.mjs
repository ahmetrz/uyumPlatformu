#!/usr/bin/env node
/* Yazı tipi bütünlük kapısı.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   `@font-face` kuralındaki dosya adı yanlışsa tarayıcı SESSİZCE yedek
   aileye düşer: ekran hâlâ "çalışır", yalnız tipografisi başka bir
   yazıdır. Bu oturumda tam olarak bu oldu — `plex-mono-latin.woff2`
   diye bir dosya yoktu, `IBM Plex Mono` hiç yüklenmedi ve tüm veri
   tipografisi sistem monosuna düştü. Gözle bakınca fark edilmiyordu.

   Bu araç CSS'teki HER `url('/fontlar/…')` başvurusunu `public/` içinde
   arar; eksik olan varsa çıkış kodu 1. Ayrıca hiçbir kural tarafından
   kullanılmayan font dosyalarını da bildirir (boşuna taşınan yük).

   Kullanım: node arac/font-kontrol.mjs
*/
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KLASOR = path.join(WEB, 'public', 'fontlar');

const cssler = readdirSync(path.join(WEB, 'app'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => path.join(WEB, 'app', f));

const basvurulan = new Map();   // dosya adı → [css, …]
for (const c of cssler) {
  const metin = readFileSync(c, 'utf8');
  for (const m of metin.matchAll(/url\(['"]\/fontlar\/([^'")]+)['"]\)/g)) {
    const liste = basvurulan.get(m[1]) ?? [];
    liste.push(path.basename(c));
    basvurulan.set(m[1], liste);
  }
}

const mevcut = existsSync(KLASOR) ? readdirSync(KLASOR) : [];
const eksik = [...basvurulan.keys()].filter((f) => !mevcut.includes(f));
const kullanilmayan = mevcut.filter((f) => !basvurulan.has(f));

let boyut = 0;
for (const f of mevcut) boyut += statSync(path.join(KLASOR, f)).size;

console.log(`font dosyası: ${mevcut.length} · başvurulan: ${basvurulan.size} · `
  + `toplam ${(boyut / 1024).toFixed(0)} KB`);

if (kullanilmayan.length) {
  console.log(`  kullanılmayan (${kullanilmayan.length}): ${kullanilmayan.join(', ')}`);
}
/* ── Aile bildirimi ─────────────────────────────────────────────────
   `--ui / --veri / --gorunum` token'larının ilk ailesi @font-face ile
   BİLDİRİLMİŞ olmalı; değilse tarayıcı sessizce yedeğe düşer ve
   tipografi gözle fark edilmeden değişir. */
const abacus = readFileSync(path.join(WEB, 'app', 'abacus.css'), 'utf8');
const bildirilen = new Set(
  [...abacus.matchAll(/@font-face\s*\{[^}]*font-family:\s*'([^']+)'/g)].map((m) => m[1]),
);
const istenen = new Set(
  [...abacus.matchAll(/--(?:ui|veri|gorunum):\s*'([^']+)'/g)].map((m) => m[1]),
);
const bildirilmeyen = [...istenen].filter((a) => !bildirilen.has(a));
console.log(`bildirilen aile: ${bildirilen.size} · token ailesi: ${istenen.size}`);
if (bildirilmeyen.length) {
  console.error(`\nBİLDİRİLMEYEN AİLE: ${bildirilmeyen.join(', ')}`);
  process.exitCode = 1;
}

if (eksik.length) {
  console.error(`\nEKSİK FONT DOSYASI: ${eksik.length}`);
  for (const f of eksik) console.error(`  · /fontlar/${f} — ${basvurulan.get(f).join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('eksik font dosyası: 0');
}
