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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isOrtami, sunucuYasamDongusu } from './kapi-farki.mjs';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEPO = path.resolve(WEB, '..');
const PR_KAPISI = path.join(DEPO, '.github/workflows/pr-kapisi.yml');
const PORT = process.env.PORT || 3210;

/* Kapı çıktılarının ve özetin yeri. `.parti/` gitignore'dadır: ölçüm
   çıktısı depoya girmez, ama koşumdan SONRA okunabilir kalır. */
const OZET_DIZIN = path.join(WEB, '.parti');
mkdirSync(OZET_DIZIN, { recursive: true });

/* Yorum satırları atılır — `kapi-farki.mjs` ile aynı gerekçe: yorumlanmış
   bir `npm run X` "koşuyor" sayılsaydı kapıyı yoruma alıp kaçmak mümkündü. */
const metin = readFileSync(PR_KAPISI, 'utf8')
  .split('\n').filter((s) => !s.trimStart().startsWith('#')).join('\n');

/* KAPI MI, KURULUM MU? Kapı, ölçen ve hüküm veren adımdır. Kurulum
   adımları (bağımlılık, veritabanı, tarayıcı indirme, sunucu başlatma /
   durdurma) ölçmez; koşulmamaları bir kapının eksikliği değildir. */
const KAPI_KALIBI = /(npm run [\w:-]+|npm test\b|npx tsc\b|node arac\/)/;
const KURULUM_KALIBI = /(npm ci|prisma |playwright-core\/cli|git fetch|fuser -k|next start)/;

/* Başlatan/durduran adımların tespiti `kapi-farki.mjs`tedir — bekçi
   testi de oradan okur. Burada ikinci bir arama yapılsaydı, biri
   düzeltilip öbürü bayatlayabilirdi. Durduran adım tanınmazsa bu çağrı
   ATAR: sessiz bir `-1`, sunucuyu ayakta bırakan sessiz bir kusurdu. */
const { baslar: sunucuBaslar, durur: sunucuDurur, adimlar: tumAdimlar } =
  sunucuYasamDongusu(metin);

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

/* ── KÜME SEÇİMİ ──────────────────────────────────────────────────────
   İş akışı dörde bölündü: `kapi` (hızlı · her push), `kapi-yavas`
   (tarayıcılı), `kapi-postgres` (ikinci sağlayıcı) ve `kapi-compose`
   (kurulumun kendisi). Kapanış VARSAYILAN olarak HEPSİNİ koşar — "parti kapanış kümesi = PR kapı kümesi" kuralı
   bölünmeyle gevşemez; bölünme neyin ne zaman koştuğunu değiştirir,
   kapanışın neyi kanıtladığını değil.

   Küme adı rapora YAZILIR. Yazılmasaydı `--hizli` ile koşan bir kapanış
   da "tamamı yeşil" derdi ve tarayıcılı kapılar hiç ölçülmemiş olurdu —
   koşulmayan kapı "geçti" diye yazılmaz. */
const ISLER = {
  hizli: 'kapi', yavas: 'kapi-yavas', postgres: 'kapi-postgres', compose: 'kapi-compose',
};
const KUME_ADLARI = {
  hizli: 'HIZLI', yavas: 'YAVAŞ', postgres: 'POSTGRESQL', compose: 'COMPOSE',
};
const TEK_KUME = ['hizli', 'yavas', 'postgres', 'compose']
  .find((k) => process.argv.includes(`--${k}`));
const secilen = TEK_KUME ? [TEK_KUME] : Object.keys(ISLER);
const secilenIsler = new Set(secilen.map((s) => ISLER[s]));
const KUME_ADI = secilen.length === Object.keys(ISLER).length
  ? `TAM (${Object.keys(ISLER).map((k) => KUME_ADLARI[k].toLocaleLowerCase('tr')).join(' + ')})`
  : `YALNIZ ${secilen.map((s) => KUME_ADLARI[s]).join(' + ')}`;

/* Aynı kapı iki işte de duruyorsa (kurulum ve `npm run build` böyle)
   BİR KEZ koşar: aynı komutu aynı ortamda ikinci kez koşmak yeni bir
   şey ölçmez, yalnız süre yazar. Tekilleştirme komut+ortam üstünden
   yapılır, ADA GÖRE değil — iki işte aynı adla farklı komut durabilir. */
const gorulen = new Set();
const kapilar = tumAdimlar
  .map((a, i) => ({ ...a, sira: i }))
  .filter((a) => !yasamDongusu.has(a.sira)
    && KAPI_KALIBI.test(a.komut) && !KURULUM_KALIBI.test(a.komut))
  .filter((a) => secilenIsler.has(a.is))
  .filter((a) => {
    const anahtar = `${a.komut}\u0000${JSON.stringify(a.cevre)}`;
    if (gorulen.has(anahtar)) return false;
    gorulen.add(anahtar); return true;
  })
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

/* GERÇEK ortam, iş akışının BEYAN ETTİĞİ ortamı EZER. Sebep ölçüldü:
   `kapi-postgres` işi bağlantı dizesini `127.0.0.1:5432` diye beyan eder
   (CI servisinin adresi); yerelde PostgreSQL başka portta olabilir.
   İş akışının değeri kabuktakini ezseydi kapı olmayan bir sunucuya bağlanır
   ve "PostgreSQL'e bağlanılamadı" derdi — kusur kodda değil, araçta olurdu. */
const KABUK_EZER = new Set(['PG_URL', 'TEST_PG_URL', 'TEST_PG_SABLON']);

function cevreCoz(cevre = {}, adAd = '') {
  const cikti = {};
  for (const [k, v] of Object.entries(cevre)) {
    if (KABUK_EZER.has(k) && process.env[k]) { cikti[k] = process.env[k]; continue; }
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
  console.log(`PARTİ KAPANIŞ KÜMESİ · ${KUME_ADI}`);
  console.log(`  (${PR_KAPISI.replace(DEPO + '/', '')} dosyasından türetildi)\n`);
  for (const k of kapilar) {
    console.log(`  ${k.is.padEnd(10)} ${k.sunucuIster ? 'tarayıcılı' : 'statik    '}  ${k.ad}`);
    console.log(`              ${k.komut.replace(/\n/g, ' ⏎ ')}`);
  }
  console.log(`\n  kapı ${kapilar.length} · tarayıcılı ${kapilar.filter((k) => k.sunucuIster).length}`);
  process.exit(0);
}

console.log(`PARTİ KAPANIŞI · ${KUME_ADI}`);
console.log(`  kapı kümesi ${PR_KAPISI.replace(DEPO + '/', '')} dosyasından türetildi`);
console.log(`  kapı: ${kapilar.length} · tarayıcılı: ${kapilar.filter((k) => k.sunucuIster).length}`
  + ` · port: ${PORT}\n`);

/** Portta HTTP konuşan bir şey var mı.

    Öldürmeyle AYNI aracı KULLANMAZ: öldüren `fuser`, doğrulayan `curl`.
    Tek araca bakan bir doğrulama, o araç ortamda yoksa "boş" der ve
    kandırılır. `-f` YOK — 500 dönen bir sunucu da ayaktadır. */
function portAcik() {
  const r = spawnSync('sh', ['-c',
    `curl -s -o /dev/null --max-time 2 http://localhost:${PORT}/`], { stdio: 'ignore' });
  return r.status === 0;
}

/** Portun kapandığını `saniye` boyunca bekler; kapandıysa true. */
function portKapandi(saniye = 10) {
  for (let i = 0; i < saniye; i++) {
    if (!portAcik()) return true;
    spawnSync('sleep', ['1']);
  }
  return !portAcik();
}

/* Bayat süreç kalmasın: derlemeden sonra başlatılacak sunucunun portu
   ÖNCE boşaltılır.

   `fuser -k` portu TUTAN SÜREÇ YOKSA da sıfırdan farklı döner — bu iyi
   hâldir, hata değildir. Bu yüzden onun çıkış kodu değil SON KOŞUL
   ölçülür: port gerçekten boşaldı mı. Boşalmadan devam etmek, bayat bir
   sunucuyu ölçmektir (arac/BENIOKU.md → ORTAM TAZELİĞİ, 1. tuzak) ve
   çıkan kırmızı koda değil ortama aittir. */
spawnSync('sh', ['-c', `fuser -k -n tcp ${PORT} 2>/dev/null`], { stdio: 'ignore' });
if (!portKapandi()) {
  console.error(`\n  PORT ${PORT} BOŞALMADI — ölçüm bayat bir sunucuya yapılırdı.`);
  console.error(`  Elle: fuser -k -n tcp ${PORT}  ·  bkz. arac/BENIOKU.md → ORTAM TAZELİĞİ`);
  process.exit(1);
}

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
     ortamda başka bir kapıdır (bkz. `demo:build` · NEXT_PUBLIC_DEMO).

     ÇIKTI DOSYAYA, EKRANA ÖZET. Tam çıktı `.parti/` altında durur ve
     kırmızı olan kapının SON satırları burada gösterilir — yeşil bir
     kapının 600 satırı kimseye bir şey söylemez, kırmızı olanın son
     kırk satırı her şeyi söyler. Çıktı atılmaz, taşınır: atılsaydı
     kapanış "ölçtüm" der ama ölçümü gösteremezdi. */
  const r = spawnSync('sh', ['-c', k.komut], {
    cwd: path.join(DEPO, k.dizin), stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...cevreCoz(k.cevre, k.ad), PORT: String(PORT) },
  });
  const cikti = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const dosyaAdi = `${k.ad.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.log`;
  writeFileSync(path.join(OZET_DIZIN, dosyaAdi), cikti);
  const sn = Math.round((Date.now() - bas) / 1000);
  const gecti = r.status === 0;
  /* `continue-on-error: true` taşıyan adım CI'da BLOKLAMAZ; burada da
     bloklamaz. Sonucu gizlenmez — "bilgi" olarak yazılır ve kırmızıysa
     görünür kalır, ama kapanışı düşürmez. Aksi hâlde araç iş akışını
     yansıtmayı bırakıp kendi kuralını koyardı. */
  const durum = gecti ? 'geçti' : (k.bloklamaz ? 'bilgi·kırmızı' : 'KIRMIZI');
  sonuc.push({ ...k, durum, sn, gunluk: dosyaAdi,
    not: `${sn}sn${k.bloklamaz ? ' · CI\'da bloklamıyor' : ''}` });
  console.log(`  ${durum.padEnd(13)} ${k.ad}  (${sn}sn)  → .parti/${dosyaAdi}`);
  if (!gecti) {
    console.log(`  ── ${k.ad} · son 40 satır ─────────────────────────────`);
    for (const s of cikti.trimEnd().split('\n').slice(-40)) console.log(`  │ ${s}`);
    console.log('  ──────────────────────────────────────────────────────\n');
  }
}

/* DURDURMA ADIMININ SONUCU YUTULMAZ. Eskiden dönüş değeri atılıyordu:
   adım hiçbir şey öldürmese de kapanış "tamamı yeşil" yazıyordu. Kendi
   sonucuna bakmayan bir temizlik adımı, temizlik yapmadığını da
   söyleyemez. */
let durdurmaKirmizi = false;
if (ayakta) {
  const durdu = yasamAdimi(sunucuDurur, 'sunucu durduruluyor');
  if (!durdu || portAcik()) {
    durdurmaKirmizi = true;
    console.error(`\n  SUNUCU DURMADI · port ${PORT} hâlâ açık —`
      + ' sonraki ölçüm bayat sunucuya yapılırdı.');
  }
}

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
const bilgi = sonuc.filter((s) => s.durum === 'bilgi·kırmızı');
const olculmeyen = sonuc.filter((s) => s.durum === 'ÖLÇÜLMEDİ');
console.log(`\n  geçti ${sonuc.length - kirmizi.length - bilgi.length - olculmeyen.length}`
  + ` · KIRMIZI ${kirmizi.length} · bilgi·kırmızı ${bilgi.length}`
  + ` · ÖLÇÜLMEDİ ${olculmeyen.length}`);
if (bilgi.length) {
  console.log('  (bilgi·kırmızı: iş akışında `continue-on-error: true` —'
    + ' CI da bloklamıyor, kapanış da bloklamıyor)');
}

/* ── ÖZET DOSYASI ─────────────────────────────────────────────────────
   Kapanışın makine okunur kaydı. Koşan küme ADIYLA yazılır: bir özet
   dosyası hangi kümeyi ölçtüğünü söylemiyorsa, "yeşil" kelimesi neyi
   kapsadığını da söylemiyor demektir. */
writeFileSync(path.join(OZET_DIZIN, 'ozet.json'), `${JSON.stringify({
  kume: KUME_ADI,
  isler: [...secilenIsler],
  zaman: new Date().toISOString(),
  port: PORT,
  kapilar: sonuc.map((s) => ({
    ad: s.ad, is: s.is, durum: s.durum, saniye: s.sn ?? null,
    tarayiciIster: s.sunucuIster, gunluk: s.gunluk ?? null,
  })),
  sayim: {
    gecti: sonuc.filter((s) => s.durum === 'geçti').length,
    kirmizi: kirmizi.length, bilgiKirmizi: bilgi.length, olculmedi: olculmeyen.length,
  },
  sunucuDurdu: !durdurmaKirmizi,
}, null, 2)}\n`);
console.log(`\n  özet: web/.parti/ozet.json · kapı günlükleri: web/.parti/*.log`);

if (kirmizi.length || olculmeyen.length || durdurmaKirmizi) {
  console.log('\nPARTİ KAPANMADI.');
  if (olculmeyen.length) {
    console.log(`  ${olculmeyen.length} kapı ölçülmedi — bu "geçti" DEĞİLDİR.`);
  }
  /* Kapıların hepsi yeşilken de kapanmayabilir: ortamı arkasında bayat
     bırakan bir koşum, bir sonraki ölçümü kendi kusuruyla kirletir. */
  if (durdurmaKirmizi) {
    console.log(`  Kapılar yeşil ama SUNUCU DURMADI — ortam bayat kaldı.`);
  }
  process.exit(1);
}
if (secilen.length === 2) {
  console.log('\nParti kapanış kümesi PR kapı kümesiyle AYNI ve tamamı yeşil.');
} else {
  console.log(`\n${KUME_ADI} kümesi yeşil — ama bu KAPANIŞ DEĞİLDİR:`
    + ' koşulmayan küme "geçti" diye yazılmaz. Kapanış için `npm run kapi:parti`.');
}
