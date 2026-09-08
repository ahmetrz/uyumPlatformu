/* PARTİ KAPANIŞI — kapanış kapı kümesi, PR kapı kümesiNİN AYNISIDIR.

   ÖLÇÜLDÜ VE MALİYETİ GÖRÜLDÜ: bir parti "yeşil" diye kapatıldığında
   koşulan küme, PR'da koşan kümeden küçüktü. Modül döngüsü İKİ PARTİ
   boyunca kırmızı kaldı çünkü statik demo derlemesi (`demo:build` →
   `demo-yol` · `yayin-kontrol` · `statik-kontrol` · `kolon-hizasi`)
   parti sonunda hiç koşmuyordu. Kusur iki parti sonra, PR açılınca
   göründü; arada yazılan her "parti kapandı" cümlesi yanlıştı.

   Kural: parti kapanış kümesi = PR kapı kümesi. Bu araç kümeyi
   YENİDEN YAZMAZ, `pr-kapisi.yml`den TÜRETİR (`adimlar()`
   `kapi-farki.mjs` içindedir ve tek nüshadır). İş akışına yeni bir kapı
   eklendiği gün parti kapanışı da onu koşar; listeyi güncellemek diye
   bir adım yoktur, çünkü liste yoktur.

   KOŞULMAYAN KAPI "GEÇTİ" DİYE YAZILMAZ. Tarayıcılı kapılar canlı
   sunucu ister; sunucu yoksa ÖLÇÜLMEDİ yazar ve çıkış kodu 1 olur.
   "Ölçemedim" ile "geçti" arasındaki farkı silen bir kapanış aracı,
   kapatmak istediği kusurun ta kendisidir.

   Kullanım:
     npm run kapi:parti                (sunucuyu KENDİ başlatır ve durdurur)
     npm run kapi:parti -- --liste     (kümeyi göster, koşma)
     PORT=3211 npm run kapi:parti      (başka port)
*/
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adimlar, isOrtami } from './kapi-farki.mjs';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEPO = path.resolve(WEB, '..');
const PR_KAPISI = path.join(DEPO, '.github/workflows/pr-kapisi.yml');
const PORT = process.env.PORT || 3210;

/* Yorum satırları atılır — `kapi-farki.mjs` ile aynı gerekçe: yorumlanmış
   bir `npm run X` "koşuyor" sayılsaydı kapıyı yoruma alıp kaçmak mümkündü. */
const metin = readFileSync(PR_KAPISI, 'utf8')
  .split('\n').filter((s) => !s.trimStart().startsWith('#')).join('\n');

/* KAPI MI, KURULUM MU? Kapı, ölçen ve hüküm veren adımdır. Kurulum
   adımları (bağımlılık, veritabanı, tarayıcı indirme, sunucu başlatma /
   durdurma) ölçmez; koşulmamaları bir kapının eksikliği değildir. */
const KAPI_KALIBI = /(npm run [\w:-]+|npm test\b|npx tsc\b|node arac\/)/;
const KURULUM_KALIBI = /(npm ci|prisma |playwright-core\/cli|git fetch|pkill|next start)/;

const tumAdimlar = adimlar(metin);
const sunucuBaslar = tumAdimlar.findIndex((a) => /next start/.test(a.komut));
const sunucuDurur = tumAdimlar.findIndex((a) => /pkill/.test(a.komut));

/* SUNUCU YAŞAM DÖNGÜSÜ ARACIN KENDİSİNDE. İlk tasarımda sunucunun
   dışarıda başlatılmış olması bekleniyordu — ve bu doğrudan TAZELİK
   TUZAĞINA açılıyordu: `kapi:parti` kendi içinde `npm run build` koşar,
   ama sunucu ondan ÖNCE başlatılmışsa tarayıcılı kapılar ESKİ derlemeyi
   ölçer. `next start` silinmiş inode'u tutmaya devam eder ve `curl`
   "hazır" der (bkz. arac/BENIOKU.md → ORTAM TAZELİĞİ; bu oturumda üç
   kez yanlış alarm üretti).

   Çözüm CI'nın kendi sırasıdır: sunucuyu BAŞLATAN ve DURDURAN adımlar da
   iş akışından türetilir ve aynı yerde koşulur. Bunlar kapı değildir
   (ölçmezler, hüküm vermezler) ama koşulmaları gerekir. */
const yasamDongusu = new Set([sunucuBaslar, sunucuDurur].filter((i) => i >= 0));

const kapilar = tumAdimlar
  .map((a, i) => ({ ...a, sira: i }))
  .filter((a) => !yasamDongusu.has(a.sira)
    && KAPI_KALIBI.test(a.komut) && !KURULUM_KALIBI.test(a.komut))
  .map((a) => ({
    ...a,
    /* Sunucu isteyen kapı SIRADAN anlaşılır: sunucuyu başlatan adımla
       durduran adımın ARASINDA duruyorsa canlı sunucu ister. Ad listesi
       tutmuyoruz — iş akışı yeniden sıralanırsa liste yalan söylerdi. */
    sunucuIster: sunucuBaslar >= 0 && a.sira > sunucuBaslar
      && (sunucuDurur < 0 || a.sira < sunucuDurur),
  }));

/* ── ÇÖZÜLEMEYEN İFADELER ─────────────────────────────────────────────
   İş akışı `${{ github... }}` ifadeleri taşır; bunlar yalnız GitHub'da
   çözülür. Düz metin olarak geçirmek sessiz bir kusurdur: kalite borcu
   cırcırı `KALITE_TABAN_DAL` değerini `git show <ref>:...` ile okur ve
   `${{ ... }}` dizesi ref değildir — kapı "taban okunamadı" der, biz
   "koştu" yazarız.

   Bilinen bir karşılığı olan tek ifade PR'ın taban commit'idir; yerelde
   karşılığı `origin/main`tir. Karşılığı olmayan her ifade DÜŞÜRÜLÜR ve
   raporda ADIYLA söylenir — "aynı kümeyi koştum" cümlesi ancak farkı
   yazınca dürüst olur. */
const IFADE = /\$\{\{/;
const YEREL_KARSILIK = { '${{ github.event.pull_request.base.sha }}': 'origin/main' };
const dusenler = [];

function cevreCoz(cevre = {}, adAd = '') {
  const cikti = {};
  for (const [k, v] of Object.entries(cevre)) {
    if (!IFADE.test(v)) { cikti[k] = v; continue; }
    const karsilik = YEREL_KARSILIK[v.trim()];
    if (karsilik) { cikti[k] = karsilik; dusenler.push(`${adAd} · ${k} → ${karsilik} (yerel karşılık)`); }
    else dusenler.push(`${adAd} · ${k} DÜŞÜRÜLDÜ (yerelde çözülemez: ${v})`);
  }
  return cikti;
}

/** İş akışının kendi adımını koşar (sunucu başlat / durdur). */
function yasamAdimi(sira, etiket) {
  const a = tumAdimlar[sira];
  if (!a) return false;
  console.log(`  · ${etiket}: ${a.ad}`);
  const r = spawnSync('sh', ['-c', a.komut.replace(/3210/g, String(PORT))], {
    cwd: path.join(DEPO, a.dizin), stdio: 'inherit',
    env: { ...process.env, ...cevreCoz(a.cevre, a.ad), PORT: String(PORT) },
  });
  return r.status === 0;
}

/* `--liste`: kümeyi göster, KOŞMA. Kapanışın hangi kapıları koşacağı
   koşmadan önce görülebilmeli — aksi hâlde küme ancak 25 dakika sonra
   öğrenilir. */
if (process.argv.includes('--liste')) {
  console.log(`PARTİ KAPANIŞ KÜMESİ (${PR_KAPISI.replace(DEPO + '/', '')} dosyasından türetildi)\n`);
  for (const k of kapilar) {
    console.log(`  ${k.sunucuIster ? 'tarayıcılı' : 'statik    '}  ${k.ad}`);
    console.log(`              ${k.komut.replace(/\n/g, ' ⏎ ')}`);
  }
  console.log(`\n  kapı ${kapilar.length} · tarayıcılı ${kapilar.filter((k) => k.sunucuIster).length}`);
  process.exit(0);
}

console.log(`PARTİ KAPANIŞI · kapı kümesi ${PR_KAPISI.replace(DEPO + '/', '')} dosyasından türetildi`);
console.log(`  kapı: ${kapilar.length} · tarayıcılı: ${kapilar.filter((k) => k.sunucuIster).length}`
  + ` · port: ${PORT}\n`);

/* Bayat süreç kalmasın: derlemeden sonra başlatılacak sunucunun portu
   ÖNCE boşaltılır. */
spawnSync('sh', ['-c', `fuser -k -n tcp ${PORT} 2>/dev/null || true`], { stdio: 'ignore' });

const sonuc = [];
let ayakta = false;
for (const k of kapilar) {
  /* Sunucu, kendisini isteyen İLK kapıdan hemen önce başlatılır — yani
     derlemeden SONRA. Sıra iş akışının sırasıdır. */
  if (k.sunucuIster && !ayakta) {
    ayakta = yasamAdimi(sunucuBaslar, 'sunucu');
    if (!ayakta) {
      sonuc.push({ ...k, durum: 'ÖLÇÜLMEDİ', not: 'sunucu açılmadı' });
      console.log(`  ÖLÇÜLMEDİ  ${k.ad}`);
      continue;
    }
  }
  const bas = Date.now();
  /* Adımın `env:` bloğu komutla birlikte taşınır — aynı komut farklı
     ortamda başka bir kapıdır (bkz. `demo:build` · NEXT_PUBLIC_DEMO). */
  const r = spawnSync('sh', ['-c', k.komut], {
    cwd: path.join(DEPO, k.dizin), stdio: 'inherit',
    env: { ...process.env, ...cevreCoz(k.cevre, k.ad), PORT: String(PORT) },
  });
  const sn = Math.round((Date.now() - bas) / 1000);
  const gecti = r.status === 0;
  sonuc.push({ ...k, durum: gecti ? 'geçti' : 'KIRMIZI', not: `${sn}sn` });
  console.log(`\n  ${gecti ? 'geçti' : 'KIRMIZI'}  ${k.ad}  (${sn}sn)\n`);
}

if (ayakta) yasamAdimi(sunucuDurur, 'sunucu durduruluyor');

console.log('\n══ PARTİ KAPANIŞ RAPORU ══════════════════════════════════');
for (const s of sonuc) {
  console.log(`  ${s.durum.padEnd(10)} ${s.ad}${s.not ? `  · ${s.not}` : ''}`);
}
/* ── ORTAM FARKI · TAM LİSTE ──────────────────────────────────────────
   "Aynı kümeyi koştum" cümlesi ancak FARKI yazınca dürüst olur. Araç
   iş akışının yalnız dört adım anahtarını uygular (`name` · `run` ·
   `working-directory` · `env`); geri kalan her şey — adım anahtarları,
   iş düzeyi ortamı, kurulum adımları — burada ADIYLA sayılır.

   `env:` körlüğü bu sınıfın İLK örneğiydi ve sessizce atlandığı için
   bir kapıyı yanlış ortamda koşturmuştu. İkincisini beklemek yerine
   sınıfın tamamı rapora alındı: tanımadığını sessizce atlayan bir araç,
   ne kadarını ölçtüğünü de bilemez. */
const ortam = isOrtami(metin);
const adimFarklari = tumAdimlar
  .flatMap((a) => Object.entries(a.bilinmeyen ?? {}).map(([k, v]) => `${a.ad} · ${k}: ${v}`));

console.log('\n  ORTAM FARKI (CI ile birebir DEĞİL) — uygulanan adım anahtarları:'
  + ' name · run · working-directory · env');
for (const [k, v] of Object.entries(ortam.bulunan)) {
  console.log(`    · iş düzeyi ${k}: ${v} — yerelde taklit EDİLMEZ`);
}
if (ortam.nodeSurumu) {
  console.log(`    · node: CI ${ortam.nodeSurumu} · yerel ${process.version}`);
}
for (const k of ortam.kurulumlar) {
  console.log(`    · kurulum adımı koşulmadı: ${k}`);
}
for (const d of adimFarklari) console.log(`    · UYGULANMAYAN adım anahtarı — ${d}`);
for (const d of dusenler) console.log(`    · ${d}`);

const kirmizi = sonuc.filter((s) => s.durum === 'KIRMIZI');
const olculmeyen = sonuc.filter((s) => s.durum === 'ÖLÇÜLMEDİ');
console.log(`\n  geçti ${sonuc.length - kirmizi.length - olculmeyen.length}`
  + ` · KIRMIZI ${kirmizi.length} · ÖLÇÜLMEDİ ${olculmeyen.length}`);

if (kirmizi.length || olculmeyen.length) {
  console.log('\nPARTİ KAPANMADI.');
  if (olculmeyen.length) {
    console.log(`  ${olculmeyen.length} kapı ölçülmedi — bu "geçti" DEĞİLDİR.`);
  }
  process.exit(1);
}
console.log('\nParti kapanış kümesi PR kapı kümesiyle AYNI ve tamamı yeşil.');
