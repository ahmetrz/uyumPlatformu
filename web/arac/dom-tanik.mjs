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
import { CUMLE_TABANI, CUMLE_TAVANI } from './politika-kutugu.mjs';
import { sebepBayragi, tabanDogrula, tabanYaz } from './olcum-tabani.mjs';

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
  /* ── SINIRLAR TÜRETİCİDEN GELİR (düzeltme turu · tur 2 · P2-7) ──────
     Tanık `25` ve `400`ü KENDİ İÇİNE yazıyordu. İki ayrı yerde iki ayrı
     sayı tutmak, tanığın var oluş sebebini yok eder: türeticinin sınırı
     değiştiği gün ayrışma GERÇEK bir körlüğü değil, iki sabitin
     kaymasını gösterirdi — ve bu, tanığın yakaladığı dördüncü körlüğün
     ta kendisiydi. Sayılar `page.evaluate`e argüman olarak geçer;
     tarayıcı bağlamı modül kapsamını görmez. */
  return page.evaluate(({ taban, tavan }) => {
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
      if (metin.length < taban || metin.length > tavan) continue;
      cikan.politika.push(metin);
    }
    /* ── BOŞ DURUM · TANIĞIN KENDİ KUSURU DÜZELTİLDİ ──────────────────
       İlk yazım `[class*="bos"]` kullanıyordu ve bu İKİ YÖNDE de yanlıştı:

       (a) YANLIŞ POZİTİF: alt dize eşleşmesi `ab-dok-bosluk` ve
           `ab-harita-bos` gibi YERLEŞİM sınıflarını da yakalıyordu.
           `/topoloji`nin "22 kapsam · 4 temeli onaylı" ÖZET paneli boş
           durum sanılıp "eylemsiz" diye kırmızı yakmıştı.
       (b) YANLIŞ NEGATİF: ürünün asıl boş durum bileşeni `BosIlk`
           `bos` sınıfını HİÇ basmıyor — `div.ab-blok` + `span.etiket`
           ("Boş · ilk kurulum") basıyor. Yani tanık, aradığı şeyi hiç
           göremiyordu.

       Bugün ürünün KENDİ sözleşmesi okunur: bileşenin etiket metni ve
       satır içi `bos` SINIF ADI (alt dize değil, tam belirteç). */
    const ETIKETLER = { 'Boş · ilk kurulum': 'BosIlk', 'Beklenen durum': 'BosIlk-iyi', 'Süzgeç': 'BosFiltre' };
    const ekle = (el, tur) => {
      if (!gorunur(el)) return;
      const metin = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (metin.length < 3) return;
      cikan.bos.push({
        metin,
        tur,
        sinif: el.getAttribute('class') || '',
        iyiHaber: tur === 'BosIlk-iyi' || el.classList.contains('iyi'),
        eylem: !!el.querySelector('a[href], button'),
      });
    };
    for (const el of document.querySelectorAll('div.ab-blok > span.etiket')) {
      const tur = ETIKETLER[(el.textContent || '').replace(/\s+/g, ' ').trim()];
      if (tur) ekle(el.parentElement, tur);
    }
    for (const el of document.querySelectorAll('.bos')) ekle(el, 'satirIci');
    return cikan;
  }, { taban: CUMLE_TABANI, tavan: CUMLE_TAVANI });
}

/** Gezilecek rota kümesi — envanterden TÜRETİLİR, elle liste yok. */
/* ── ATLANAN ROTA SESSİZ DÜŞMEZ (düzeltme turu · tur 2 · P3-10) ──────
   Eski yazımda iki `continue` vardı ve birinin yorumu "atlanır, SAYILIR"
   diyordu — ama sayılmıyordu: rota `atlanan`a hiç girmiyor, kütükte iz
   bırakmıyordu. Bekçi de `atlanan` listesinin BOŞ olmasını istiyordu,
   yani tanık rota kaybettikçe kapı daha da mutlu oluyordu. Tanığın
   göremediği yer, ayrışmanın göremediği yerdir: körlük sıfır kusura
   dönüşüyordu.

   Bugün atlama İŞARETLİ: sebebiyle `atlanan`a girer ve bekçi sebebin
   BİLİNEN bir sınıftan olmasını ve sayının tavan altında kalmasını
   ister. Atlamanın kendisi meşru olabilir; SESSİZ olması olamaz. */
function rotalar(atlananListesi) {
  const liste = [];
  for (const s of sayfaEnvanteri()) {
    if (s.dinamik.length === 0) { liste.push(s.rota); continue; }
    if (s.dinamik.length > 1) {
      atlananListesi.push({ rota: s.rota, sebep: 'cok-parametreli' });
      continue;
    }
    const kalip = s.rota;
    const t = tohumDegeri(kalip);
    if (t.hata || !t.degerler?.length) {
      atlananListesi.push({ rota: kalip, sebep: `tohum-degeri-yok: ${t.hata ?? 'boş'}` });
      continue;
    }
    liste.push(kalip.replace(/\[[^\]]+\]/, t.degerler[0]));
  }
  return [...new Set(liste)].sort();
}

const atlanan = [];
const ROTALAR = rotalar(atlanan);
const politikaAdaylari = new Map();   // metin → [rota]
const bosDurumlar = new Map();        // metin → { rotalar, sinif, eylem } · EN KÖTÜ hâl

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
        /* ── İLK GELEN DEĞİL, EN KÖTÜ HÂL KAZANIR (P3-11) ────────────
           Eski yazım `if (!bosDurumlar.has(k))` diyordu: aynı metin iki
           ekranda görünüyorsa yalnız İLKİNİN öznitelikleri saklanıyordu.
           Birinci ekranda eylem varsa, ikincideki EYLEMSİZ hâl kütüğe
           hiç girmiyordu — ve cırcırın tuttuğu sayı tam olarak
           "eylemsiz 0"dı. İlk gelenin kazandığı bir ölçüm, ölçtüğü
           kusuru saklar. */
        const k = duz(b.metin);
        const varolan = bosDurumlar.get(k);
        if (!varolan) {
          bosDurumlar.set(k, {
            rotalar: [rota], tur: b.tur, sinif: b.sinif, iyiHaber: b.iyiHaber, eylem: b.eylem });
          continue;
        }
        if (!varolan.rotalar.includes(rota)) varolan.rotalar.push(rota);
        varolan.eylem = varolan.eylem && b.eylem;          // eylemsiz hâl kazanır
        varolan.iyiHaber = varolan.iyiHaber && b.iyiHaber; // muafiyet DARALIR
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

/* ── ÖLÇÜM TABANI · `olcum-tabani.json` (düzeltme turu · tur 2 · P2-3) ──
   Sıfır rota gezen bir tanık sıfır ayrışma bulur; ama sabit `30`
   ARACIN İÇİNE yazılıydı ve tanık 65 rota geziyordu — otuz beş rota
   kaybedilse araç yine "yeterli" diyordu. Kendi kütüğünü yazan araç
   tabanını da yazar: taban ancak `--taban-yaz --sebep="..."` ile ve
   gerekçesi DOSYAYA işlenerek iner. */
const TANIK_TABANLARI = [
  ['tanik.rota', ROTALAR.length],
  ['tanik.cumle', kutuk.politikaAdaylari.length],
  ['tanik.bosDurum', kutuk.bosDurumlar.length],
];
if (process.argv.includes('--taban-yaz')) {
  for (const [anahtar, olculen] of TANIK_TABANLARI) {
    const { onceki, yeni } = tabanYaz(anahtar, olculen, { sebep: sebepBayragi(process.argv) });
    console.log(`taban yazıldı: ${anahtar} ${onceki ?? '—'} → ${yeni}`);
  }
} else {
  for (const [anahtar, olculen] of TANIK_TABANLARI) tabanDogrula(anahtar, olculen);
}

if (process.argv.includes('--yaz')) {
  writeFileSync(CIKTI, `${JSON.stringify(kutuk, null, 2)}\n`);
  console.log(`güncellendi: ${path.relative(WEB, CIKTI)}`);
}
