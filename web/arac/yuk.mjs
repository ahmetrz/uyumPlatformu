import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ozetle, tabanaGoreKarsilastir } from './yuzdelik.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   OT-49 · Yük üreteci ve performans tabanı

   ── NE ÖLÇER, NE ÖLÇMEZ ──────────────────────────────────────────────
   ÖLÇER: bu üründeki rotaların, BU MAKİNEDE, TOHUM VERİSİYLE, verilen
   eşzamanlılıkta ürettiği yanıt süresi dağılımı.

   ÖLÇMEZ: kurumun gerçek veri hacmindeki davranışı. Tohum veritabanı
   birkaç yüz satırdır; gerçek envanter on binlerce olabilir. Bu ölçümü
   "ürün 10.000 varlıkta şu kadar" diye okumak YANLIŞTIR ve çıktı bunu
   her koşuda yazar. Gerçek veri performansı UY-55'in konusudur ve
   gerçek veri gelmeden ölçülemez.

   ── Neden taban dosyası ───────────────────────────────────────────────
   Tek bir ölçüm hiçbir şey söylemez: 180 ms iyi mi kötü mü? Anlamlı olan
   DEĞİŞİMDİR. `arac/performans-tabani.json` bir önceki ölçümü tutar ve
   bu koşu ona göre karşılaştırılır. Taban yoksa sonuç `taban_yok`tur —
   "geçti" DEĞİL.

   ── Kullanım ──────────────────────────────────────────────────────────
     PORT=3210 node arac/yuk.mjs                 → ölç ve karşılaştır
     PORT=3210 node arac/yuk.mjs --taban-yaz     → sonucu taban yap
     PORT=3210 node arac/yuk.mjs --tekrar 40 --esz 8

   Canlı sunucu ister (`PORT=3210 npm run dev` başka bir kabukta).
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = path.resolve(import.meta.dirname, '..');
const TABAN_DOSYASI = path.join(KOK, 'arac', 'performans-tabani.json');
const PORT = process.env.PORT ?? '3210';
const TABAN_URL = `http://127.0.0.1:${PORT}`;

/** Ölçülen rotalar. Kütük, matris ve tezgâh yüzeylerinden birer temsilci;
    hepsini ölçmek koşuyu dakikalara çıkarır ve kimse koşturmaz. */
const ROTALAR = [
  '/', '/portfoy', '/uyum', '/envanter', '/bulgular', '/riskler',
  '/saglik', '/yedekleme', '/kimlik', '/prosesler',
];

function sayi(bayrak, varsayilan) {
  const i = process.argv.indexOf(bayrak);
  if (i === -1) return varsayilan;
  const d = Number(process.argv[i + 1]);
  return Number.isFinite(d) && d > 0 ? d : varsayilan;
}

const TEKRAR = sayi('--tekrar', 20);
const ESZAMANLI = sayi('--esz', 4);
const TABAN_YAZ = process.argv.includes('--taban-yaz');

/* Ölçülen sunucunun KİPİ araçtan güvenilir biçimde okunamaz (Next bunu
   bir başlıkta bildirmez) ve TAHMİN EDİLMEZ. Geliştirme sunucusu her
   isteği derler ve üretim yapısından kat kat yavaştır; iki kipin sayısını
   aynı tabanda karşılaştırmak sahte bir "gerileme" ya da sahte bir
   "iyileşme" üretir. O yüzden kip SÖYLENİR; söylenmezse `bildirilmedi`
   yazılır ve karşılaştırmada uyarı çıkar. */
function kipOku() {
  const i = process.argv.indexOf('--kip');
  const d = i === -1 ? '' : String(process.argv[i + 1] ?? '');
  return ['uretim', 'gelistirme'].includes(d) ? d : 'bildirilmedi';
}
const KIP = kipOku();

/** Tek istek. Süre yanıtın GÖVDESİ OKUNANA kadar sayılır: baş harfleri
    hızlı gönderip gövdeyi geç üreten bir sayfa "hızlı" görünmesin. */
async function birIstek(yol) {
  const t0 = performance.now();
  try {
    const yanit = await fetch(`${TABAN_URL}${yol}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    });
    await yanit.text();
    return {
      ok: yanit.status < 400, durum: yanit.status,
      sureMs: Math.round(performance.now() - t0),
    };
  } catch (e) {
    return {
      ok: false, durum: null, sureMs: Math.round(performance.now() - t0),
      hata: e?.message ?? 'bilinmeyen',
    };
  }
}

/** Sabit eşzamanlılıkla N istek. Hepsini birden atmak eşzamanlılığı
    ölçmez, sunucuyu boğar ve sayılar anlamsızlaşır. */
async function rotayiOlc(yol) {
  const olcumler = [];
  let sonraki = 0;
  async function isci() {
    for (;;) {
      const n = sonraki; sonraki += 1;
      if (n >= TEKRAR) return;
      olcumler.push(await birIstek(yol));
    }
  }
  await Promise.all(Array.from({ length: Math.min(ESZAMANLI, TEKRAR) }, isci));
  return ozetle(olcumler);
}

async function sunucuAyaktaMi() {
  try {
    const y = await fetch(TABAN_URL, { redirect: 'manual', signal: AbortSignal.timeout(5_000) });
    return y.status > 0;
  } catch { return false; }
}

const ms = (x) => (x === null ? 'ölçülmedi' : `${x} ms`);

async function ana() {
  if (!await sunucuAyaktaMi()) {
    console.error(`Sunucu yok: ${TABAN_URL}. Başka bir kabukta PORT=${PORT} npm run dev.`);
    process.exit(1);
  }

  const taban = existsSync(TABAN_DOSYASI)
    ? JSON.parse(readFileSync(TABAN_DOSYASI, 'utf8')) : null;

  console.log(`OT-49 · yük ölçümü · ${ROTALAR.length} rota × ${TEKRAR} istek `
    + `· eşzamanlılık ${ESZAMANLI} · kip ${KIP}`);
  if (KIP === 'bildirilmedi') {
    console.log('NOT: sunucu kipi bildirilmedi (--kip uretim | --kip gelistirme).');
  }
  if (taban && taban.kip && taban.kip !== KIP) {
    console.log(`UYARI: taban "${taban.kip}" kipinde alınmış, bu koşu "${KIP}". `
      + 'Karşılaştırma anlamsızdır.');
  }
  console.log('UYARI: bu ölçüm TOHUM VERİSİYLE yapılır. Kurumun gerçek veri');
  console.log('hacmindeki davranışını GÖSTERMEZ (o UY-55\'in konusudur).\n');

  const sonuc = {};
  let gerileyen = 0;
  let olculemeyen = 0;

  console.log('rota                    istek  hata   p50      p95      p99      karşılaştırma');
  for (const yol of ROTALAR) {
    const o = await rotayiOlc(yol);
    sonuc[yol] = o;
    const k = tabanaGoreKarsilastir(o, taban?.rotalar?.[yol] ?? null);
    if (k.durum === 'geriledi') gerileyen += 1;
    if (o.p50 === null) olculemeyen += 1;
    console.log(
      `${yol.padEnd(22)}  ${String(o.istek).padStart(5)}`
      + `  ${String(o.basarisiz).padStart(4)}`
      + `  ${ms(o.p50).padStart(7)}  ${ms(o.p95).padStart(7)}  ${ms(o.p99).padStart(7)}`
      + `  ${k.durum === 'taban_yok' ? 'taban yok' : k.gerekce}`,
    );
  }

  console.log('');
  if (!taban) {
    console.log('TABAN YOK: bu koşu hiçbir şeye karşı karşılaştırılmadı.');
    console.log('Tabanı yazmak için: node arac/yuk.mjs --taban-yaz');
  } else {
    console.log(gerileyen > 0
      ? `GERİLEME: ${gerileyen} rota tabana göre eşiği aştı.`
      : 'Bütün rotalar taban eşiği içinde.');
  }
  if (olculemeyen > 0) {
    console.log(`${olculemeyen} rotada hiç başarılı istek yok — yüzdelik ölçülmedi.`);
  }

  if (TABAN_YAZ) {
    /* Zaman damgası ve ortam bilgisi taban dosyasına yazılır: farklı bir
       makinede alınmış bir tabanla karşılaştırmak yanıltıcıdır ve
       okuyanın bunu görebilmesi gerekir. */
    writeFileSync(TABAN_DOSYASI, `${JSON.stringify({
      olcum: new Date().toISOString(),
      not: 'TOHUM VERİSİYLE ölçüldü; gerçek veri hacmini temsil etmez (UY-55).',
      ortam: { node: process.version, platform: process.platform, cpu: os_cpu() },
      kip: KIP,
      ayar: { tekrar: TEKRAR, esZamanli: ESZAMANLI, taban: TABAN_URL },
      rotalar: sonuc,
    }, null, 2)}\n`, 'utf8');
    console.log(`\ntaban yazıldı: ${path.relative(KOK, TABAN_DOSYASI)}`);
  }

  /* Gerileme çıkış kodunu DEĞİŞTİRİR: kapı olarak koşturulabilsin.
     Taban yokluğu ise başarısızlık değildir — ilk koşu. */
  process.exit(gerileyen > 0 ? 1 : 0);
}

function os_cpu() {
  try {
    return process.report?.getReport?.()?.header?.cpus?.[0]?.model ?? 'bilinmiyor';
  } catch { return 'bilinmiyor'; }
}

ana();
