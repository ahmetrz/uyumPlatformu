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
   Üç sözlükle: `enerji` (taban) · `su` (gerçek ikinci) · `stres`
   (boşluksuz uzun gövde — kırılma fırsatı garantisinin kalıcı vakası).
   Kırpılma ayrı bir kapı olarak burada: `table-layout: fixed` +
   `overflow: hidden` taşan bir sözcüğü SESSİZCE keser, sayfa yana
   kaymaz ve `yatay-tasma` yeşil kalır. Uzun sözlüğün en olası kusur
   biçimi tam olarak budur.

   `rota-duman.mjs` bilerek DIŞARIDA: rota süzgeci yoktur (tüm kümeyi
   koşar) ve ölçtüğü şey düzen değil, rotanın ayakta olup olmadığıdır.
   İki sözlükle ayrıca koşulur, ama aile başına değil.

   ── DÖRDÜNCÜ İDDİA · SÖZLÜK EKRANA ULAŞIYOR MU ────────────────────────
   Yukarıdaki üç kapı NEGATİF sorular sorar: düzen bozuldu mu, içerik
   kırpıldı mı, erişilebilirlik ihlali var mı. Hiçbiri "sözcük gerçekten
   değişti mi" diye sormaz — ve bekçi de sormaz (o yalnız "sektör sözcüğü
   kaldı mı" der). Bir dosya sektör sözcüğünü ÇEKİRDEK sözcükle sabit
   değiştirirse ikisi de yeşil yanar, hedef ıskalanır.

   O yüzden `sozluk-farki.mjs` burada, POZİTİF ölçü olarak koşar: aynı
   rotanın metni iki sözlükle alınır ve fark çıkarılır. Çevrilmiş ailenin
   rotasında fark BOŞ OLAMAZ. Kapının kendi başlığı yeter açıklamayı
   taşır.

   ── ÇIKTI ─────────────────────────────────────────────────────────────
   Kapı × sözlük tablosu. Kusur çıkarsa HANGİ SÖZLÜKTE çıktığı yazılır:
     · yalnız `su`    → sözcük uzunluğunun ürettiği kusur, bu dilimin işi.
     · yalnız `stres` → kırılma fırsatı garantisi eksik ya da kalkmış.
     · hepsinde       → sözlükten bağımsız kusur (çoğu zaman eski).
   Kusurlu koşumun tam çıktısı da basılır; özet yeter sanıp kök sebebi
   gizlemek, kapının işini yarıda bırakırdı.

   Kullanım:
     PORT=3210 npm run kapi:iki-sozluk -- --rota=/yedekleme
     PORT=3210 npx tsx arac/iki-sozluk.mjs --rota=/yedekleme,/kanitlar
     PORT=3210 npx tsx arac/iki-sozluk.mjs            (rota süzgeci yok → tüm küme)
*/
import { spawnSync } from 'node:child_process';
import { db } from '../lib/db.ts';
import { SOZLUK_ADLARI, sozlukleKos } from './sozluk-takas.mjs';

const KAPILAR = [
  { ad: 'yatay-tasma', betik: 'arac/yatay-tasma.mjs' },
  { ad: 'dizustu', betik: 'arac/dizustu.mjs' },
  { ad: 'axe', betik: 'arac/erisim-axe.mjs' },
];

const rotaArg = process.argv.find((a) => a.startsWith('--rota='));
const rotalar = rotaArg ? rotaArg.slice('--rota='.length) : null;

/* Taban ÖNCE koşar: uzun sözlüğün kusuru ancak `enerji` sonucuyla yan
   yana konduğunda "sözcük uzunluğundan" diye okunabilir.

   `stres` bir sektör değil, KALICI SINAVDIR: boşluksuz uzun gövde, yani
   hiç kırılma fırsatı olmayan terim. `kabuk.css` içindeki `.terim-sar`
   savunmasının vakası odur — savunma kalkarsa burası kırmızı yanar.
   Sözcük ürünün sabiti değil MÜŞTERİ İÇERİĞİ olduğu için bu koşum
   isteğe bağlı değildir. */
const SIRA = ['enerji', 'su', 'stres'].filter((a) => SOZLUK_ADLARI.includes(a));

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
const takasBozuk = sonuclar.filter((s) => s.sozluk !== 'enerji' && s.dogrulama === 'santral');
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
  if (k.length === SIRA.length) {
    console.log(`${kapi.ad}: HER SÖZLÜKTE kusurlu — sözlükten bağımsız.`);
  } else if (k.length === 1 && k[0] === 'stres') {
    console.log(`${kapi.ad}: YALNIZ stres sözlüğünde kusurlu — kırılma fırsatı`
      + ' olmayan terim düzeni bozuyor; `.terim-sar` savunması eksik ya da kalkmış.');
  } else {
    console.log(`${kapi.ad}: YALNIZ ${k.join('/')} sözlüğünde kusurlu —`
      + ' sözcük uzunluğunun ürettiği kusur.');
  }
}

for (const s of kusurlu) {
  console.log(`\n═══ ${s.kapi} · ${s.sozluk} ═══\n${s.cikti.trimEnd()}`);
}

console.log(`\niki-sozluk: ${KAPILAR.length} kapı × ${SIRA.length} sözlük`
  + ` = ${sonuclar.length} koşum · kusurlu ${kusurlu.length}`);

/* ── POZİTİF ÖLÇÜ ──────────────────────────────────────────────────────
   Düzen kapıları temizse bile sözlük ekrana ulaşmamış olabilir. Bu adım
   ayrı bir süreçte koşar (kendi sözlük takasını kendi yapar) ve sonucu
   çıkış koduna katılır: iki ölçüden biri kırmızıysa kapı kırmızıdır. */
console.log('');
const fark = spawnSync('npx', ['tsx', 'arac/sozluk-farki.mjs',
  ...(rotalar ? [`--rota=${rotalar}`] : [])], { stdio: 'inherit', encoding: 'utf8' });
const farkKodu = fark.status ?? 1;

await db.$disconnect();
process.exit(kusurlu.length > 0 || farkKodu !== 0 ? 1 : 0);
