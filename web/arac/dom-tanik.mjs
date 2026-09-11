/* İKİNCİ BAĞIMSIZ POPÜLASYON TANIĞI — RENDER EDİLMİŞ DOM

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   Bu depoda iki kütük, popülasyonunu TEK bir regex türeticisinden alıyor:

     · `arac/politika-kutugu.mjs`  → politika cümleleri
     · `arac/bos-durum-kutugu.mjs` → boş durumlar

   Cırcırın "tavan sıfır" dişi, yalnız TÜRETİCİNİN GÖRDÜĞÜ popülasyonu
   korur. Türetici kör olduğunda kapı, göremediği kadarını "sıfır kusur"
   diye raporlar — ve bu, ölçülmüş bir başarısızlık biçimidir:

     politika evreni : 131 → 184   (tırnaksız JSX metni görülmüyordu)
     boş durum evreni: 74 → 94 → 95 → 102 → 100   (beş kez genişledi)

   Beş kez kör çıkan bir türeticinin "ölçülmeyen 0" çıktısı, popülasyonu
   BAĞIMSIZ doğrulanmadıkça bir ölçüm değildir. Alet, ürün değil.

   ── TANIĞIN MEKANİZMASI FARKLIDIR ─────────────────────────────────────
   Bu betik kaynağı HİÇ OKUMAZ. Ürünü gerçek bir tarayıcıda açar ve
   KULLANICIYA GÖRÜNEN metni toplar. Aynı kusur iki mekanizmada birden
   olmadıkça ayrışma görünür: regex bir metni kaçırırsa DOM onu yakalar,
   DOM bir metni gösteremezse (ölü kütük satırı) regex tarafı açıkta kalır.

   Demo ikizlerinde aynı kalıp zaten kullanıldı: popülasyon hem dosya
   sisteminden hem `import.meta.glob`tan türetilir ve ikisinin aynı
   kümeyi verdiği ölçülür.

   ── NE ÜRETİR ─────────────────────────────────────────────────────────
   `arac/dom-tanik.json`:
     { uretilme, rota: [...], politikaAdaylari: [...], bosDurumlar: [...] }

   Karşılaştırmayı bekçi yapar (`tests/bekci/dom-tanik.test.ts`); bu
   betik yalnız TOPLAR. Toplayan ile yargılayanı ayırmak bilinçlidir:
   yargı saf bir fonksiyonda kalsın ve sentetik kütüklerle sınanabilsin.

   Kullanım: PORT=3210 node arac/dom-tanik.mjs        (canlı sunucu ister)
             PORT=3210 node arac/dom-tanik.mjs --yaz  (kütüğü yaz)        */
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { KOK, WEB, girisYap, sayfaEnvanteri, tarayiciYolu, tohumDegeri } from './kosu-ortak.mjs';

export const CIKTI = path.join(WEB, 'arac', 'dom-tanik.json');

/* ── POLİTİKA ADAYI SEÇİCİSİ ───────────────────────────────────────────
   Kütüğün kendi sınıflandırıcısı (`politikaMi`) burada YENİDEN
   KULLANILIR — bilerek. Tanığın işi "politika nedir"i yeniden tanımlamak
   değil, POPÜLASYONUN kendisini ikinci bir yoldan görmek. Ölçüt aynı
   kalmazsa iki taraf hiçbir zaman örtüşmez ve ayrışma dişi gürültüye
   boğulur. */
const { politikaMi } = await import('./politika-kutugu.mjs');

/** Ekranda görünen metin bloklarını normalleştirir. */
const duz = (m) => String(m ?? '').replace(/\s+/g, ' ').trim();

/* Toplanan metin, kütüğün taşıdığı biçime yaklaştırılır: kütük JSX
   kaynağındaki metni tutar (`&quot;` çözülmüş, satır sonları boşluk).
   Tam eşleşme beklenmez — karşılaştırma NORMALLEŞTİRİLMİŞ ÇEKİRDEK
   üzerinden yapılır (bkz. `cekirdek`, bekçi tarafında). */

async function sayfaTopla(page) {
  return page.evaluate(() => {
    const cikan = { politika: [], bos: [] };
    const gorunur = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    /* POLİTİKA ADAYI: kendi içinde başka blok taşımayan metin taşıyıcıları.
       İç içe elemanları iki kez saymamak için yalnız "yaprak blok"lar
       alınır — yoksa aynı cümle sarmalayıcılarıyla birlikte onlarca kez
       görünürdü. */
    const bloklar = document.querySelectorAll('p, li, span, div, td, th, h1, h2, h3, h4, summary, figcaption, label');
    for (const el of bloklar) {
      if (el.querySelector('p, li, div, td, th, h1, h2, h3, h4, summary')) continue;
      if (!gorunur(el)) continue;
      const metin = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (metin.length < 25 || metin.length > 400) continue;
      cikan.politika.push(metin);
    }
    /* BOŞ DURUM: ürünün kendi işaretleri. Kütükle AYNI işaretler okunur
       (`className="bos"` ailesi); tanık burada "boş durum nedir"i yeniden
       tanımlamaz, aynı sözleşmeyi RENDER EDİLMİŞ tarafta okur. */
    for (const el of document.querySelectorAll('[class*="bos"]')) {
      if (!gorunur(el)) continue;
      const metin = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (metin.length < 3) continue;
      cikan.bos.push({
        metin,
        sinif: el.getAttribute('class') || '',
        eylem: !!el.querySelector('a[href], button'),
      });
    }
    return cikan;
  });
}

/** Gezilecek rota kümesi — envanterden TÜRETİLİR, elle liste yok. */
function rotalar() {
  const liste = [];
  for (const s of sayfaEnvanteri()) {
    if (s.dinamik.length === 0) { liste.push(s.rota); continue; }
    if (s.dinamik.length > 1) continue;           // çok parametreli rota bu turda dışarıda
    const kalip = s.rota;
    const t = tohumDegeri(kalip);
    if (t.hata || !t.degerler?.length) continue;  // değeri çözülemeyen rota atlanır, sayılır
    liste.push(kalip.replace(/\[[^\]]+\]/, t.degerler[0]));
  }
  return [...new Set(liste)].sort();
}

const ROTALAR = rotalar();
const politikaAdaylari = new Map();   // metin → [rota]
const bosDurumlar = new Map();        // metin → { rota, sinif, eylem }
const atlanan = [];

const browser = await chromium.launch({
  executablePath: tarayiciYolu(), headless: true, args: ['--no-sandbox'],
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await girisYap(page);
  for (const rota of ROTALAR) {
    try {
      const yanit = await page.goto(`${KOK}${rota}`, { waitUntil: 'networkidle', timeout: 30_000 });
      if (!yanit || yanit.status() >= 400) { atlanan.push({ rota, sebep: `HTTP ${yanit?.status() ?? '—'}` }); continue; }
      const { politika, bos } = await sayfaTopla(page);
      for (const m of politika) {
        if (!politikaMi(m)) continue;
        const k = duz(m);
        if (!politikaAdaylari.has(k)) politikaAdaylari.set(k, []);
        if (!politikaAdaylari.get(k).includes(rota)) politikaAdaylari.get(k).push(rota);
      }
      for (const b of bos) {
        const k = duz(b.metin);
        if (!bosDurumlar.has(k)) bosDurumlar.set(k, { rota, sinif: b.sinif, eylem: b.eylem });
      }
    } catch (e) { atlanan.push({ rota, sebep: e.message.slice(0, 120) }); }
  }
  await context.close();
} finally { await browser.close(); }

const kutuk = {
  uretilme: new Date().toISOString(),
  rota: ROTALAR,
  atlanan,
  politikaAdaylari: [...politikaAdaylari.entries()]
    .map(([cumle, rotalar]) => ({ cumle, rotalar })).sort((a, b) => a.cumle.localeCompare(b.cumle)),
  bosDurumlar: [...bosDurumlar.entries()]
    .map(([metin, d]) => ({ metin, ...d })).sort((a, b) => a.metin.localeCompare(b.metin)),
};

console.log(`DOM tanığı: ${ROTALAR.length} rota gezildi · atlanan ${atlanan.length}`);
console.log(`  politika adayı: ${kutuk.politikaAdaylari.length}`);
console.log(`  boş durum: ${kutuk.bosDurumlar.length}`);
for (const a of atlanan) console.log(`  atlandı ${a.rota} — ${a.sebep}`);

/* ÖLÇÜM TABANI: sıfır rota gezen bir tanık, sıfır ayrışma bulur. */
if (ROTALAR.length < 30) {
  console.error(`\nÖLÇÜM YETERSİZ: ${ROTALAR.length} rota gezildi, taban 30.`);
  process.exit(1);
}

if (process.argv.includes('--yaz')) {
  writeFileSync(CIKTI, `${JSON.stringify(kutuk, null, 2)}\n`);
  console.log(`güncellendi: ${path.relative(WEB, CIKTI)}`);
}
