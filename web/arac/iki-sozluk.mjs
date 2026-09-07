#!/usr/bin/env node
/* İKİ SÖZLÜKLÜ DÜZEN KAPISI — aile bitince değişen rotalarda koşar.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Bir yüzey ailesi terim sözlüğüne geçtiğinde RENDER EDİLEN METİN
   değişir. Elle tıklayıp bakmak değerli ama taşmayı gözle değil ÖLÇEREK
   görüyoruz; ve bugüne kadarki bütün düzen ölçümleri referans kiracının
   KISA sözlüğüyle ("santral") yapıldı. İkinci sözlük bileşik gövde
   kullanır ("arıtma tesisi") ve aynı yerde ~%60 daha fazla yer ister.

   Uzun sözlükte taşan bir düzen BUGÜN kusurludur. Enerji sözlüğüyle
   yeşil görünmesi onu düzeltmez, yalnız erteler — ve o erteleme ikinci
   kiracı gelene kadar görünmez kalır.

   ── NE KOŞAR ──────────────────────────────────────────────────────────
   Üç düzen kapısı, her sözlük için ayrı ayrı:
     · `yatay-tasma.mjs`  375 + 768 · sayfa yana kayıyor mu
     · `dizustu.mjs`      1366×768 · kaydırılamayan (KIRPILAN) içerik
     · `erisim-axe.mjs`   WCAG 2 A/AA ihlalleri
   Kırpılma ayrı bir kapı olarak burada: `table-layout: fixed` +
   `overflow: hidden` taşan bir sözcüğü SESSİZCE keser, sayfa yana
   kaymaz ve `yatay-tasma` yeşil kalır. Uzun sözlüğün en olası kusur
   biçimi tam olarak budur.

   `rota-duman.mjs` bilerek DIŞARIDA: rota süzgeci yoktur (tüm kümeyi
   koşar) ve ölçtüğü şey düzen değil, rotanın ayakta olup olmadığıdır.
   İki sözlükle ayrıca koşulur, ama aile başına değil.

   ── ÇIKTI ─────────────────────────────────────────────────────────────
   Kapı × sözlük tablosu. Kusur çıkarsa HANGİ SÖZLÜKTE çıktığı yazılır:
     · yalnız `su` → sözlük uzunluğunun ürettiği kusur, bu dilimin işi.
     · iki sözlükte de → sözlükten bağımsız kusur (çoğu zaman eski).
   Kusurlu koşumun tam çıktısı da basılır; özet yeter sanıp kök sebebi
   gizlemek, kapının işini yarıda bırakırdı.

   Kullanım:
     PORT=3210 npm run kapi:iki-sozluk -- --rota=/yedekleme
     PORT=3210 npx tsx arac/iki-sozluk.mjs --rota=/yedekleme,/kanitlar
     PORT=3210 npx tsx arac/iki-sozluk.mjs            (rota süzgeci yok → tüm küme)
*/
import { db } from '../lib/db.ts';
import { SOZLUK_ADLARI, sozlukleKos } from './sozluk-takas.mjs';

const KAPILAR = [
  { ad: 'yatay-tasma', betik: 'arac/yatay-tasma.mjs' },
  { ad: 'dizustu', betik: 'arac/dizustu.mjs' },
  { ad: 'axe', betik: 'arac/erisim-axe.mjs' },
];

const rotaArg = process.argv.find((a) => a.startsWith('--rota='));
const rotalar = rotaArg ? rotaArg.slice('--rota='.length) : null;

/* Taban ÖNCE koşar: `su` kusuru ancak `enerji` sonucuyla yan yana
   konduğunda "sözlük uzunluğundan" diye okunabilir. */
const SIRA = ['enerji', 'su'].filter((a) => SOZLUK_ADLARI.includes(a));

console.log(`iki-sozluk: rota ${rotalar ?? '(tüm küme)'} · sözlük ${SIRA.join(' → ')}\n`);

const sonuclar = [];
for (const kapi of KAPILAR) {
  for (const sozluk of SIRA) {
    const komut = ['node', kapi.betik, ...(rotalar ? [`--rota=${rotalar}`] : [])];
    const { kod, cikti, dogrulama } = await sozlukleKos(sozluk, komut, { yakala: true });
    sonuclar.push({ kapi: kapi.ad, sozluk, kod, cikti, dogrulama });
    console.log(`  ${kapi.ad.padEnd(12)} ${sozluk.padEnd(7)}`
      + ` 'tesis'="${dogrulama ?? '(yok)'}"`
      + `  →  ${kod === 0 ? 'temiz' : `KUSUR (çıkış ${kod})`}`);
  }
}

/* Doğrulama satırı raporun bir parçası: takas ekrana ulaşmadıysa "temiz"
   yanlış sözlüğü ölçmüş demektir ve yeşil bir yalan olur. */
const takasBozuk = sonuclar.filter((s) => s.sozluk === 'su' && s.dogrulama === 'santral');
if (takasBozuk.length > 0) {
  console.error('\nSÖZLÜK TAKASI EKRANA ULAŞMADI — ölçüm geçersiz.');
  await db.$disconnect();
  process.exit(2);
}

const kusurlu = sonuclar.filter((s) => s.kod !== 0);
console.log('');
for (const kapi of KAPILAR) {
  const k = sonuclar.filter((s) => s.kapi === kapi.ad && s.kod !== 0).map((s) => s.sozluk);
  if (k.length === 0) continue;
  console.log(k.length === SIRA.length
    ? `${kapi.ad}: İKİ SÖZLÜKTE DE kusurlu — sözlükten bağımsız.`
    : `${kapi.ad}: YALNIZ ${k.join('/')} sözlüğünde kusurlu — sözcük uzunluğunun ürettiği kusur.`);
}

for (const s of kusurlu) {
  console.log(`\n═══ ${s.kapi} · ${s.sozluk} ═══\n${s.cikti.trimEnd()}`);
}

console.log(`\niki-sozluk: ${KAPILAR.length} kapı × ${SIRA.length} sözlük`
  + ` = ${sonuclar.length} koşum · kusurlu ${kusurlu.length}`);
await db.$disconnect();
process.exit(kusurlu.length > 0 ? 1 : 0);
