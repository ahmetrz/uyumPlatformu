/* HARİTA · TARAYICI KANITI (SIS-HRT-010 · SIS-HRT-011)

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   Haritanın dokunulabilirliği İKİ ayrı yerden bozuluyordu ve ikisini de
   yalnız gerçek tarayıcı görebilir:

   1. VURUŞ ALANI KULLANICI BİRİMİNDEYDİ. İşaretin vuruş dairesi
      `r = max(isaret.r, 11)` ile SVG kullanıcı biriminde veriliyordu.
      Tuval 960 birim geniş ve `width: 100%` çiziliyor; 375px'te ölçek
      düşünce daire ekranda 11px ÇAP oluyordu — ürünün beyan ettiği
      WCAG 2.2 AA 24×24 eşiğinin yarısından az. Kaynağa bakan hiçbir
      test bunu göremez: kodda yazan sayı 11 ve doğru görünüyor. Ölçek
      ancak tarayıcıda belli olur.

   2. KÜÇÜK HEDEF TEK YOLDU. İşaret küçük KALMAK ZORUNDA — konum ölçülen
      veridir ve büyütmek onu yanlış yere taşır (WCAG 2.5.8 "temel"
      istisnası). Ama bir istisna, o hedefin TEK yol olmasını meşru
      kılmaz. Panel boştu ve "bir işarete tıklayın" diyordu; sistem
      listeyi zaten elinde tutuyordu.

   ── NE ÖLÇER ──────────────────────────────────────────────────────────
   1. Her işaretin vuruş dairesi iki bantta da ≥ 24 CSS piksel.
   2. Listede haritadaki her işaret için BİR satır var — sayı tutuyor,
      yani hiçbir tesis iki yüzeyin arasından düşmüyor.
   3. Her satır ≥ 24px yüksekliğinde bir dokunma hedefi.
   4. Satıra dokunmak haritadaki işareti SEÇİYOR ve künyeyi açıyor —
      liste bir süs değil, gerçek yol.
   5. Seçim İKİ yüzeyde birden işaretli (liste satırı + harita işareti):
      kullanıcı hangi yüzeyden bakarsa baksın aynı cevabı görür.

   ── NE ÖLÇMEZ (beyanlı sınır) ─────────────────────────────────────────
   İşaretlerin BİRBİRİNE değmesini ölçmez. 24px'lik hedefler yoğun bir
   bölgede zorunlu olarak örtüşür ve bunu çözmenin tek yolu işaretleri
   gerçek konumlarından kaydırmaktır — yani veriyi bozmak. Örtüşen
   hedefin doğru karşılığı liste yoludur ve ölçülen o. WCAG 2.5.8
   aralık istisnası burada "temel" istisnasıyla birlikte okunur.

   Kullanım: PORT=3210 node arac/harita-kanit.mjs   (canlı sunucu ister) */
import { chromium } from 'playwright-core';
import { KOK, girisYap, tarayiciYolu } from './kosu-ortak.mjs';

const BANTLAR = [
  { ad: '1440×900', width: 1440, height: 900 },
  { ad: '375×812', width: 375, height: 812 },
];
/* Ürünün KENDİ beyan ettiği eşik (`app/kabuk.css`: "WCAG 2.2 24px").
   Burada uydurulmuş bir sayı yok; ölçüt ürünün yazdığı ölçüttür. */
const ESIK = 24;

const iddialar = [];
const olc = (bant, ad, ok, not = '') => iddialar.push({ bant, ad, ok, not });

const tarayici = await chromium.launch({ executablePath: tarayiciYolu() });

for (const b of BANTLAR) {
  const baglam = await tarayici.newContext({
    viewport: { width: b.width, height: b.height }, hasTouch: true,
  });
  const sayfa = await baglam.newPage();
  const sayfaHatalari = [];
  sayfa.on('pageerror', (e) => sayfaHatalari.push(e.message.slice(0, 120)));
  await girisYap(sayfa, KOK);
  await sayfa.setViewportSize({ width: b.width, height: b.height });
  await sayfa.goto(`${KOK}/harita`, { waitUntil: 'load' });
  /* Ölçek `ResizeObserver` ile ölçülüp state'e yazılıyor; ilk kare
     varsayılan ölçekle çizilir. Ölçüm hidrasyon SONRASI alınmalı. */
  await sayfa.waitForTimeout(600);

  const o = await sayfa.evaluate(() => {
    const vurus = [...document.querySelectorAll('.ab-harita-tuval .isaret .vurus')]
      .map((c) => c.getBoundingClientRect().width);
    const satirlar = [...document.querySelectorAll('.ab-harita-liste .satirdugme')]
      .map((x) => x.getBoundingClientRect().height);
    return {
      isaretSayi: vurus.length,
      enKucukVurus: vurus.length ? Math.round(Math.min(...vurus)) : 0,
      satirSayi: satirlar.length,
      enKucukSatir: satirlar.length ? Math.round(Math.min(...satirlar)) : 0,
    };
  });

  olc(b.ad, 'harita işareti çizilmiş', o.isaretSayi > 0, `${o.isaretSayi} işaret`);
  olc(b.ad, `vuruş alanı eşiğin üstünde (${ESIK}px)`,
    o.enKucukVurus >= ESIK, `en küçük ${o.enKucukVurus}px`);
  olc(b.ad, 'listede her işaret için bir satır',
    o.satirSayi === o.isaretSayi, `${o.satirSayi} satır / ${o.isaretSayi} işaret`);
  olc(b.ad, `liste satırı eşiğin üstünde (${ESIK}px)`,
    o.enKucukSatir >= ESIK, `en küçük ${o.enKucukSatir}px`);

  /* ── Liste GERÇEK yol mu: dokun, seçildi mi ─────────────────────── */
  if (o.satirSayi > 1) {
    /* İlk satır değil İKİNCİ: ilk satır bir varsayılan seçimle
       karışabilir ve iddia kendi kendini geçirirdi. */
    await sayfa.locator('.ab-harita-liste .satirdugme').nth(1).tap();
    await sayfa.waitForTimeout(300);
    const s = await sayfa.evaluate(() => ({
      kunye: !!document.querySelector('.ab-harita-kunye'),
      haritaSecili: document.querySelectorAll('.ab-harita-tuval .isaret.secili').length,
      satirSecili: document.querySelectorAll('.ab-harita-liste .satirdugme.secili').length,
      basili: document.querySelectorAll('.ab-harita-liste .satirdugme[aria-pressed="true"]').length,
    }));
    olc(b.ad, 'satıra dokunmak künyeyi açıyor', s.kunye);
    olc(b.ad, 'seçim haritada TEK işaretle yanıyor',
      s.haritaSecili === 1, `${s.haritaSecili} işaret`);
    olc(b.ad, 'seçim listede TEK satırla yanıyor',
      s.satirSecili === 1 && s.basili === 1, `${s.satirSecili} satır · ${s.basili} aria-pressed`);
  }

  olc(b.ad, 'sayfa hatası yok', sayfaHatalari.length === 0, sayfaHatalari[0] ?? '');
  await baglam.close();
}

await tarayici.close();

/* Ölçüm tabanı: iki bant × (çizim + vuruş + satır sayısı + satır boyu +
   üç seçim iddiası + sayfa hatası) = 16. Tohumda haritaya yerleşen
   tesis var; olmasaydı bu kapı zaten ölçecek bir şey bulamazdı ve
   "geçti" demek yerine bunu söyler. */
const ASGARI_IDDIA = 16;
if (iddialar.length < ASGARI_IDDIA) {
  console.error(`\nÖLÇÜM YETERSİZ: ${iddialar.length} iddia, taban ${ASGARI_IDDIA}.`);
  console.error('  Ölçülmemiş bir kapı "geçti" diye yazılmaz.');
  process.exit(1);
}

const kirmizi = iddialar.filter((i) => !i.ok);
console.log(`\nHarita kanıtı: ${iddialar.length - kirmizi.length}/${iddialar.length}`
  + ` iddia geçti · bant ${BANTLAR.length}`);
for (const i of iddialar) console.log(`  ${i.ok ? '✓' : '✕'} ${i.bant} · ${i.ad}${i.not ? ` — ${i.not}` : ''}`);
if (kirmizi.length > 0) {
  console.error('\nKIRMIZI iddialar:');
  for (const i of kirmizi) console.error(`  · ${i.bant} · ${i.ad}${i.not ? ` — ${i.not}` : ''}`);
  process.exit(1);
}
