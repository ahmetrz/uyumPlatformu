#!/usr/bin/env node
/* Kapı farkı — YERELDE KOŞAN AMA CI'DA KOŞMAYAN betikler.

   ── Neden var ─────────────────────────────────────────────────────────
   `rota-duman.mjs` ve `gezinme-testi.mjs` aylarca kendi `girisYap`
   kopyalarını taşıdı; #28 ortak işleve bir adım ekleyince ikisi de giriş
   yapamaz oldu ve HİÇBİR ŞEY bunu söylemedi. Kopyalar sebep değildi:
   asıl sebep, iki aracın CI'da hiç koşmamasıydı. Koşmayan bir kapı
   kırıldığını da bildiremez.

   Bu araç o boşluğu SAYIYA çevirir: `package.json`'daki her betik ya PR
   kapısında koşar, ya burada GEREKÇESİYLE beyan edilir. Üçüncü bir
   ihtimal yok — beyansız betik kapıyı kırmızı yakar. Yeni bir kapı
   yazıp CI'ya bağlamayı unutmak artık sessiz değil.

   ── "CI'da koşuyor" nasıl ölçülür ──────────────────────────────────────
   Adı geçmesi yetmez; KAPSANMASI da sayılır. Her betiğin çağırdığı
   `arac/*.mjs` dosyaları çıkarılır (`npm run` zincirleri çözülerek), iş
   akışının çağırdıklarıyla karşılaştırılır:

     · betiğin adı iş akışında geçiyorsa            → koşuyor
     · betiğin BÜTÜN araçları iş akışında koşuyorsa → kapsanıyor
       (`tasarim:kontrast` · `tasarim:font` · `tasarim:iz` üçü de
        `tasarim:kapi` içinde koşar; ayrıca beyan edilmeleri gereksiz
        ikinci nüsha olurdu)

   Bu ölçüm PR KAPISINA bakar (`pr-kapisi.yml`). `publish.yml` main'e
   girdikten SONRA koşar; birleşmeyi engellemez, dolayısıyla kapı
   sayılmaz — ama beyanı "yalnız yayında koşuyor" diyebilir ve bu ayrı
   bir şeydir.

   Kullanım:  npm run kapi:farki        → tablo + sayı, beyansız betik varsa çıkış 1
              npm run kapi:farki --json → makine okunur özet
*/

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEPO = path.resolve(WEB, '..');
const PR_KAPISI = path.join(DEPO, '.github/workflows/pr-kapisi.yml');

/* ── BEYAN ─────────────────────────────────────────────────────────────
   PR kapısında koşmayan her betik burada, gerekçesiyle. Gerekçe bir
   ETİKET değil bir CÜMLE: "neden koşmuyor" ve "koşması için ne gerek"
   okunabilmeli. Beyan listesi yalnız KÜÇÜLMELİ; bir satırın silinmesi o
   betiğin CI'ya bağlandığı anlamına gelir.

   `kapi` alanı, betiğin kapı olup olmadığını söyler: kapı olmayanlar
   (üretici, işletim, geliştirme betikleri) sayıya girmez. Ayrım
   ölçülemez — bir betiğin "ürünü ölçtüğünü" kaynaktan çıkaramayız — o
   yüzden BEYAN edilir ve gerekçe onu savunur. */
const BEYAN = {
  dev: { kapi: false, sebep: 'geliştirme sunucusu; ölçmez' },
  start: { kapi: false, sebep: 'üretim sunucusunu başlatır; ölçmez' },
  seed: { kapi: false, sebep: 'tohum yükler; CI `db:hazirla` adımında zaten koşar' },
  'db:hazirla': { kapi: false, sebep: 'CI aynı üç komutu adım olarak koşar (prisma migrate/generate/seed)' },
  yedek: { kapi: false, sebep: 'işletim aracı: ürünün kendi yedeğini alır, ürünü ölçmez' },
  sabotaj: { kapi: false, sebep: 'kapıların kendini sınadığı el aracı; bilerek KIRMIZI üretir, CI\'da koşarsa kapıyı yalancı yakar' },
  'harita:sinir': { kapi: false, sebep: 'üretici: Natural Earth\'ten silüet çizer, ağ ister; çıktısı depoda' },
  'sayimlar:yenile': { kapi: false, sebep: 'üretici: envanteri YAZAR; CI okuyanı (`sayimlar:denetle`) koşmalı' },
  'konsol:olcum': { kapi: false, sebep: 'ölçüm sondası: konsol gürültüsünü RAPORLAR, eşiği yok' },

  'test:kapsam': { kapi: true, sebep: 'CI `npm test` koşuyor; kapsam raporu eşiksiz ve süreyi ikiye katlıyor — eşik konduğu gün bağlanır' },
  'tasarim:rota': { kapi: true, sebep: 'canlı sunucu · 4 bant × 58 rota; `rota:duman` ile örtüşüyor, ayrıştırılmadan bağlanırsa süre iki katına çıkar' },
  'tasarim:dizustu': { kapi: true, sebep: 'canlı sunucu · 1366×768 kırpılma; `yatay-tasma` üç bandı ölçüyor, dördüncü bant borç listesine girmedi' },
  'tasarim:erisim': { kapi: true, sebep: 'canlı sunucu · `erisim-axe` bunun yerini aldı (axe-core, üç bant, cırcırlı); bu araç emekliye ayrılacak' },
  'tasarim:gorsel': { kapi: true, sebep: 'canlı sunucu · altın görüntüler depoda yok; altınsız koşarsa "altın yok" diye kırmızı yanar' },
  'kalite:lighthouse': { kapi: true, sebep: 'canlı sunucu · runner\'da puanlar donanıma göre kayar; eşik CI\'da anlamsız' },
  'tasarim:ux': { kapi: true, sebep: 'canlı sunucu · bulguları borç listesine girmedi; cırcırsız bağlanırsa ilk turda kırmızı' },
  'tasarim:cekmece': { kapi: true, sebep: 'canlı sunucu · aynı gerekçe: borç listesi yok' },
  'tasarim:yuk': { kapi: true, sebep: 'canlı sunucu · bilişsel yük RAPORLAR, kusur eşiği yok (çıkış kodu hep 0)' },
  'tasarim:gorev': { kapi: true, sebep: 'canlı sunucu · görev akışı sayar, eşiği yok' },
  'olcum:yuk': { kapi: true, sebep: 'canlı sunucu · yük ölçümü; eşiği runner\'a bağlı' },
  'kapi:iki-sozluk': { kapi: true, sebep: 'canlı sunucu · üç kapıyı ÜÇ sözlükle koşar (9 koşum); tarayıcılı bloğu üçe katlar — süre bütçesi ayrılınca bağlanır' },
};

/* ── Betiklerin çağırdığı araçlar ──────────────────────────────────── */

/* Kimlik DOSYA + BAYRAK'tır, yalnız dosya değil. Ölçüldü: `sayimlar:yenile`
   (`--yaz`) ile `sayimlar:denetle` (`--denetle`) AYNI dosyayı çağırır ama
   biri envanteri YAZAR, öbürü DENETLER. Yalnız dosyaya bakan bir kapsama
   kuralı, denetleyici CI'ya bağlandığı anda yazıcıyı da "koşuyor" sayıyordu
   — kapsama kuralının kendi yanlış pozitifi. */
const ARAC_KALIBI = /arac\/([a-z0-9-]+\.mjs)((?:\s+--[\w-]+)*)/g;

/** Bir komut satırındaki `arac/*.mjs` çağrıları + çözülmüş `npm run` zincirleri. */
function araclar(komut, betikler, gorulen = new Set()) {
  const bulunan = new Set();
  for (const [, dosya, bayraklar] of komut.matchAll(ARAC_KALIBI)) {
    const b = (bayraklar || '').trim().split(/\s+/).filter(Boolean).sort();
    bulunan.add(b.length ? `${dosya} ${b.join(' ')}` : dosya);
  }
  for (const [, ad] of komut.matchAll(/npm run ([\w:-]+)/g)) {
    if (gorulen.has(ad) || !betikler[ad]) continue;
    gorulen.add(ad);
    for (const d of araclar(betikler[ad], betikler, gorulen)) bulunan.add(d);
  }
  return bulunan;
}

/** İş akışı metnindeki `run:` gövdeleri — YORUM SATIRLARI ATILIR.

    Yorumlanmış bir `npm run X` satırı "koşuyor" sayılsaydı, bir kapıyı
    yorum içine alıp beyandan da kaçırmak mümkün olurdu. */
function isAkisiKomutlari(yol) {
  return readFileSync(yol, 'utf8')
    .split('\n')
    .filter((s) => !s.trimStart().startsWith('#'))
    .join('\n');
}

export function fark({ betikler, isAkisiMetni, beyan = BEYAN }) {
  const ciAraclari = araclar(isAkisiMetni, betikler);
  const adiGecen = new Set();
  for (const [, ad] of isAkisiMetni.matchAll(/npm run ([\w:-]+)/g)) adiGecen.add(ad);
  if (/npm test\b/.test(isAkisiMetni)) adiGecen.add('test');

  const satirlar = [];
  for (const [ad, komut] of Object.entries(betikler)) {
    const kendi = araclar(komut, betikler);
    const dogrudan = adiGecen.has(ad);
    /* Araçsız betikler (`next build`, `vitest run`) yalnız ADLA sayılır:
       boş küme her kümenin alt kümesidir, kapsama kuralı onları
       yanlışlıkla "koşuyor" yapardı. */
    const kapsanan = !dogrudan && kendi.size > 0 && [...kendi].every((d) => ciAraclari.has(d));
    satirlar.push({
      ad, komut,
      araclar: [...kendi].sort(),
      durum: dogrudan ? 'adıyla' : kapsanan ? 'kapsanıyor' : 'koşmuyor',
      beyan: beyan[ad] ?? null,
    });
  }
  return satirlar;
}

/* ── Rapor ─────────────────────────────────────────────────────────── */

if (import.meta.url === `file://${process.argv[1]}`) {
  const betikler = JSON.parse(readFileSync(path.join(WEB, 'package.json'), 'utf8')).scripts;
  const satirlar = fark({ betikler, isAkisiMetni: isAkisiKomutlari(PR_KAPISI) });

  const kosan = satirlar.filter((s) => s.durum !== 'koşmuyor');
  const kosmayan = satirlar.filter((s) => s.durum === 'koşmuyor');
  const beyansiz = kosmayan.filter((s) => !s.beyan);
  const kapiBorcu = kosmayan.filter((s) => s.beyan?.kapi === true);
  const kapiDegil = kosmayan.filter((s) => s.beyan?.kapi === false);
  /* CI'da koşup da beyanı olan betik: beyan bayatlamış demektir. Liste
     yalnız küçülmeli; küçüldüğünü söyleyecek olan da bu kontrol. */
  const bayatBeyan = kosan.filter((s) => s.beyan);

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({
      toplam: satirlar.length,
      kosan: kosan.length,
      kapiBorcu: kapiBorcu.map((s) => s.ad),
      kapiDegil: kapiDegil.map((s) => s.ad),
      beyansiz: beyansiz.map((s) => s.ad),
      bayatBeyan: bayatBeyan.map((s) => s.ad),
    }, null, 2));
  } else {
    console.log('KAPI FARKI · PR kapısında koşan ile `package.json` betikleri\n');
    console.log(`  betik toplamı            ${satirlar.length}`);
    console.log(`  PR kapısında koşuyor     ${kosan.length}` +
      `  (${kosan.filter((s) => s.durum === 'adıyla').length} adıyla · ` +
      `${kosan.filter((s) => s.durum === 'kapsanıyor').length} kapsanıyor)`);
    console.log(`  koşmuyor · KAPI DEĞİL    ${kapiDegil.length}`);
    console.log(`  koşmuyor · KAPI          ${kapiBorcu.length}   ← ölçülen fark\n`);

    if (kapiBorcu.length) {
      console.log('KAPI OLUP CI\'DA KOŞMAYANLAR');
      for (const s of kapiBorcu) console.log(`  · ${s.ad.padEnd(20)} ${s.beyan.sebep}`);
      console.log('');
    }
    if (bayatBeyan.length) {
      console.log('BAYAT BEYAN — bu betikler artık CI\'da koşuyor, beyan satırı silinmeli:');
      for (const s of bayatBeyan) console.log(`  · ${s.ad}  (${s.durum})`);
      console.log('');
    }
    if (beyansiz.length) {
      console.log('BEYANSIZ BETİK — ne CI\'da koşuyor ne beyan edilmiş:');
      for (const s of beyansiz) console.log(`  · ${s.ad.padEnd(20)} ${s.komut}`);
      console.log('\n  Her betik ya PR kapısında koşar ya `arac/kapi-farki.mjs`');
      console.log('  BEYAN tablosunda gerekçesiyle durur. Üçüncü ihtimal yok.\n');
    }
  }

  process.exitCode = beyansiz.length || bayatBeyan.length ? 1 : 0;
}
