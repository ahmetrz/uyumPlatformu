#!/usr/bin/env node
/* TERİM KALIBI YANLIŞ POZİTİF ADAYLARI — fikstürün kaynağı.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Kalıp hataları bugüne kadar TEPKİSEL bulundu: bir kusur patlıyor, ona
   bir vaka yazılıyordu. Üç hata çıktı (`RES` ⊂ "SÜRESİ", `İ` katlaması,
   `plant` ⊂ "toplantı") ve ikisi yanlış-pozitif, biri yanlış-negatif
   yönündeydi — yani liste bir bütün olarak hiç doğrulanmamıştı.

   Bu araç doğrulamayı SİSTEMATİK yapar: tahmin etmez, DEPODAKİ GERÇEK
   TÜRKÇE METNİ kaynak alır. Her terim için kalıbın gövdesini İÇEREN ama
   tam eşleşmeyen sözcükleri çıkarır — yanlış pozitif yüzeyi tam olarak
   budur. "toplantı" bu yöntemle bulunur, kusur patlamasını beklemeden.

   Çıktı `tests/bekci/terim-fikstur.json`in `eslesmemeli` tarafını besler.
   Fikstür elle yazılmaz; buradan gelir ve gözle tasnif edilir (gerçek
   yanlış pozitif mi, yoksa bilinçli körlük mü).

   Kullanım:  npx tsx arac/terim-adaylari.mjs [--json]
*/
import { readFileSync } from 'node:fs';
import { TERIMLER, taranacakDosyalar } from '../tests/bekci/terimler';

const jsonKip = process.argv.includes('--json');
const metin = taranacakDosyalar().map((f) => readFileSync(f, 'utf8')).join('\n');
const sozcukler = [...new Set(metin.match(/[\p{L}\p{N}_-]{2,}/gu) ?? [])];

/** Kalıbın sınır bakışlarını söker — gövdenin kendisi kalır. */
const govdesi = (re) => new RegExp(
  re.source.replace(/\(\?<!\[[^\]]+\]\)|\(\?!\[[^\]]+\]\)/g, ''), 'u');

const sonuc = {};
for (const { ad, kaliplar } of TERIMLER) {
  const esler = new Set();
  const eslesmez = new Set();
  for (const s of sozcukler) {
    for (const { re, hedef } of kaliplar) {
      const hedefler = hedef === 'ham'
        ? [s]
        : [s.toLocaleLowerCase('tr-TR'), s.toLowerCase()];
      if (!hedefler.some((h) => govdesi(re).test(h))) continue;
      const tam = hedefler.some((h) => new RegExp(re.source, re.flags.replace('g', '')).test(h));
      (tam ? esler : eslesmez).add(s);
    }
  }
  sonuc[ad] = { esler: [...esler], eslesmez: [...eslesmez] };
}

if (jsonKip) {
  console.log(JSON.stringify(sonuc, null, 2));
} else {
  console.log('terim-adaylari: her terim için kalıbı İÇEREN ama eşleşmeyen sözcükler\n');
  for (const [ad, { esler, eslesmez }] of Object.entries(sonuc)) {
    console.log(`  ${ad.padEnd(13)} eşleşen ${String(esler.length).padStart(3)}`
      + ` · yanlış pozitif adayı ${String(eslesmez.length).padStart(3)}`
      + (eslesmez.length ? `  →  ${eslesmez.slice(0, 8).join(' · ')}` : ''));
  }
  console.log('\nAdaylar `tests/bekci/terim-fikstur.json` ile karşılaştırılır;'
    + ' fikstürde OLMAYAN yeni bir aday çıkarsa tasnif edilmelidir.');
}
