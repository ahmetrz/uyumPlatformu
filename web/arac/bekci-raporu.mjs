#!/usr/bin/env node
/* BEKÇİ RAPORU — A listesinin okunabilir hâli.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   `tests/bekci/sektor-terimi.test.ts` bir KAPIDIR: geçti/kaldı der ve
   kırmızıyken listeyi basar. Çalışırken lazım olan şey başka: "hangi
   küme kaç dosya, hangi dosyada hangi terim, izin listesi ölçümle
   tutuyor mu". Bu bilgi dört ayrı turda tek kullanımlık betiklerle
   yeniden üretildi ve her seferinde biraz farklı hesaplandı — ölçüm
   aracının kendisi tekrar edilince ölçüler de ayrışır.

   Kapı ile rapor AYNI çekirdeği okur (`tests/bekci/terimler.ts`); iki
   ayrı tarama olsaydı biri diğerini yalanlardı.

   ── NE SÖYLER ─────────────────────────────────────────────────────────
   · dosya başına hangi terim kaç kez (süzgeçle daraltılabilir),
   · KÜME özeti (ilk iki yol parçası) — sıradaki partiyi seçmek için,
   · ölçüm ile izin listesinin FARKI: ölü kayıt ve listede olmayan dosya,
   · iki tavanın (dosya · terim) bugünkü durumu.

   Kullanım:
     npx tsx arac/bekci-raporu.mjs              → yalnız özet
     npx tsx arac/bekci-raporu.mjs lib/yonetim  → yolu eşleşen dosyalar
     npx tsx arac/bekci-raporu.mjs MW           → terimi eşleşen dosyalar
*/
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { WEB } from './kosu-ortak.mjs';
import { taranacakDosyalar, terimleriBul } from '../tests/bekci/terimler';

const izin = JSON.parse(
  readFileSync(path.join(WEB, 'tests', 'bekci', 'sektor-terimi-izin.json'), 'utf8'));
const liste = izin.dosyalar;
const suzgec = process.argv[2] ?? '';

const kirli = {};
const kume = {};
let toplam = 0;
for (const yol of taranacakDosyalar()) {
  const bulunan = terimleriBul(yol);
  if (bulunan.length === 0) continue;
  const sayi = bulunan.reduce((a, x) => a + x.sayi, 0);
  kirli[yol] = bulunan.map((x) => `${x.terim}:${x.sayi}`).join(' ');
  toplam += sayi;
  /* Küme = ilk iki yol parçası; tek parçalı yollar (kök dosyalar) kendi
     adlarıyla durur. Parti seçimi bu tabloya bakılarak yapılıyor. */
  const parca = yol.split('/');
  const kok = parca.length > 1 ? parca.slice(0, 2).join('/') : yol;
  kume[kok] ??= { dosya: 0, terim: 0 };
  kume[kok].dosya += 1;
  kume[kok].terim += sayi;
}

const eslesen = Object.keys(kirli)
  .filter((y) => suzgec === '' ? false : (y.includes(suzgec) || kirli[y].includes(suzgec)))
  .sort();
for (const y of eslesen) console.log(`  ${y.padEnd(58)} ${kirli[y]}`);
if (eslesen.length > 0) console.log('');

console.log('KÜME                            dosya  terim');
for (const [k, v] of Object.entries(kume).sort((a, b) => b[1].terim - a[1].terim)) {
  console.log(`  ${k.padEnd(30)} ${String(v.dosya).padStart(3)}  ${String(v.terim).padStart(5)}`);
}

console.log(`\nölçülen: ${Object.keys(kirli).length} dosya · ${toplam} terim`);
console.log(`tavan:   ${izin.tavan} dosya · ${izin.terimTavani} terim`);

/* ÖLÇÜM İLE LİSTENİN FARKI — kapının kırmızı vereceği iki hâl. Rapor
   onları KAPI KOŞMADAN gösterir ki parti sonunda liste elle değil
   ölçümle güncellensin. */
const olu = liste.filter((y) => !kirli[y]);
if (olu.length > 0) console.log(`\nÖLÜ KAYIT (${olu.length}) — listeden düşürün:\n  ${olu.join('\n  ')}`);
const eksik = Object.keys(kirli).filter((y) => !liste.includes(y));
if (eksik.length > 0) console.log(`\nLİSTEDE YOK (${eksik.length}) — sözlükten çözün:\n  ${eksik.join('\n  ')}`);
if (olu.length === 0 && eksik.length === 0) console.log('liste ölçümle birebir.');
