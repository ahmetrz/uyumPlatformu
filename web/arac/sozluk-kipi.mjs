#!/usr/bin/env node
/* Tek sözlükle koşum — ad-hoc ölçüm için ince kabuk.

   Takasın kendisi ve gerekçesi `arac/sozluk-takas.mjs` içindedir. Bu
   dosya yalnız komut satırı yüzeyidir: bir kapıyı ELLE ikinci sözlükle
   koşturmak istediğinizde. Aile başına düzenli koşum için
   `arac/iki-sozluk.mjs` (npm run kapi:iki-sozluk) kullanılır — o, iki
   sözlüğü karşılaştırır ve kusurun HANGİ sözlükte çıktığını söyler.

   Kullanım:
     npx tsx arac/sozluk-kipi.mjs --durum
     PORT=3210 npx tsx arac/sozluk-kipi.mjs su -- node arac/dizustu.mjs --rota=/yedekleme
*/
import { db } from '../lib/db.ts';
import { SOZLUKLER, SOZLUK_ADLARI, satirlariOku, sozlukleKos } from './sozluk-takas.mjs';

const argv = process.argv.slice(2);
const ayirac = argv.indexOf('--');
const ad = argv[0];
const komut = ayirac >= 0 ? argv.slice(ayirac + 1) : [];

async function bitir(kod) {
  await db.$disconnect();
  process.exit(kod);
}

if (argv.includes('--durum') || !ad) {
  const satirlar = await satirlariOku();
  const ornek = satirlar.find((s) => s.anahtar === 'tesis');
  console.log(`sektör sözlüğü satırı: ${satirlar.length}`
    + ` · 'tesis' tekil: ${ornek ? `"${ornek.tekil}"` : '(yok)'}`);
  console.log(`bilinen sözlükler: ${SOZLUK_ADLARI.join(' · ')}`);
  await bitir(0);
}

if (!(ad in SOZLUKLER)) {
  console.error(`sozluk-kipi: bilinmeyen sözlük "${ad}" — ${SOZLUK_ADLARI.join(' · ')}`);
  await bitir(2);
}
if (komut.length === 0) {
  console.error('sozluk-kipi: koşulacak komut yok — "-- <komut>" verin');
  await bitir(2);
}

const { kod, dogrulama } = await sozlukleKos(ad, komut);
console.log(`── sözlük kipi: ${ad} · 'tesis' tekil = "${dogrulama ?? '(yok)'}" · geri yüklendi ──`);
await bitir(kod);
