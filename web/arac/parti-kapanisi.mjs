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
     PORT=3210 npm run kapi:parti      (sunucu ayrı kabukta: next start)
     npm run kapi:parti                (sunucusuz: tarayıcılı kapılar ÖLÇÜLMEDİ)
*/
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adimlar } from './kapi-farki.mjs';

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

const kapilar = tumAdimlar
  .map((a, i) => ({ ...a, sira: i }))
  .filter((a) => KAPI_KALIBI.test(a.komut) && !KURULUM_KALIBI.test(a.komut))
  .map((a) => ({
    ...a,
    /* Sunucu isteyen kapı SIRADAN anlaşılır: sunucuyu başlatan adımla
       durduran adımın ARASINDA duruyorsa canlı sunucu ister. Ad listesi
       tutmuyoruz — iş akışı yeniden sıralanırsa liste yalan söylerdi. */
    sunucuIster: sunucuBaslar >= 0 && a.sira > sunucuBaslar
      && (sunucuDurur < 0 || a.sira < sunucuDurur),
  }));

async function sunucuAyakta() {
  try {
    const c = new AbortController();
    const z = setTimeout(() => c.abort(), 2000);
    const y = await fetch(`http://localhost:${PORT}/`, { signal: c.signal });
    clearTimeout(z);
    return y.status > 0;
  } catch { return false; }
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

const ayakta = await sunucuAyakta();

console.log(`PARTİ KAPANIŞI · kapı kümesi ${PR_KAPISI.replace(DEPO + '/', '')} dosyasından türetildi`);
console.log(`  kapı: ${kapilar.length} · tarayıcılı: ${kapilar.filter((k) => k.sunucuIster).length}`
  + ` · sunucu (${PORT}): ${ayakta ? 'AYAKTA' : 'yok'}\n`);

const sonuc = [];
for (const k of kapilar) {
  if (k.sunucuIster && !ayakta) {
    sonuc.push({ ...k, durum: 'ÖLÇÜLMEDİ', not: `canlı sunucu yok (PORT=${PORT})` });
    console.log(`  ÖLÇÜLMEDİ  ${k.ad}`);
    continue;
  }
  const bas = Date.now();
  const r = spawnSync('sh', ['-c', k.komut], {
    cwd: path.join(DEPO, k.dizin), stdio: 'inherit',
    env: { ...process.env, PORT: String(PORT) },
  });
  const sn = Math.round((Date.now() - bas) / 1000);
  const gecti = r.status === 0;
  sonuc.push({ ...k, durum: gecti ? 'geçti' : 'KIRMIZI', not: `${sn}sn` });
  console.log(`\n  ${gecti ? 'geçti' : 'KIRMIZI'}  ${k.ad}  (${sn}sn)\n`);
}

console.log('\n══ PARTİ KAPANIŞ RAPORU ══════════════════════════════════');
for (const s of sonuc) {
  console.log(`  ${s.durum.padEnd(10)} ${s.ad}${s.not ? `  · ${s.not}` : ''}`);
}
const kirmizi = sonuc.filter((s) => s.durum === 'KIRMIZI');
const olculmeyen = sonuc.filter((s) => s.durum === 'ÖLÇÜLMEDİ');
console.log(`\n  geçti ${sonuc.length - kirmizi.length - olculmeyen.length}`
  + ` · KIRMIZI ${kirmizi.length} · ÖLÇÜLMEDİ ${olculmeyen.length}`);

if (kirmizi.length || olculmeyen.length) {
  console.log('\nPARTİ KAPANMADI.');
  if (olculmeyen.length) {
    console.log(`  ${olculmeyen.length} kapı ölçülmedi — bu "geçti" DEĞİLDİR.`);
    console.log(`  Sunucuyu ayrı bir kabukta başlatın: PORT=${PORT} npx next start -p ${PORT}`);
  }
  process.exit(1);
}
console.log('\nParti kapanış kümesi PR kapı kümesiyle AYNI ve tamamı yeşil.');
