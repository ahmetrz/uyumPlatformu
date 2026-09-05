#!/usr/bin/env node
/* Dizüstü bandı kapısı — 1366×768'de BİLGİ KIRPILMIYOR.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   "Sahada bu ekranlar hangi çözünürlükte açılıyor?" sorusunun cevabı
   **dizüstü**. Bu cevap bir GENİŞLİK sorusu değil, bir YÜKSEKLİK
   sorusudur ve fark önemlidir:

     · 1366px genişlik kabuktaki her kırılma noktasının ÜSTÜNDEDİR.
       Yani yatay tarafta dizüstü, masaüstünden farklı bir gerçeklik
       değildir; `yatay-tasma.mjs` (375 · 768) ve `kolon-hizasi.mjs`
       (1440 · 1366 · 1280) bu tarafı zaten ölçüyor.
     · 768px YÜKSEKLİK ise yeni bir gerçekliktir. `kabuk.css` içindeki
       yükseklik sözleşmesi `@media (min-width: 1025px) and
       (min-height: 680px)` ile açılır — yani 768'de AÇIKTIR. Saha
       ekranı orada `height: calc(100dvh - 56px - ...)` alır ve
       `.ab-b-alan` `overflow: hidden` taşır.

   Sözleşme + `overflow: hidden` birleşince ortaya ürünün en sinsi kusur
   sınıfı çıkar: **kap, içeriğinden kısa kalır ve fazlası KAYDIRILAMAZ.**
   Kullanıcı eksik olduğunu bilmez; ekran dolu görünür. Depoda bunun bir
   örneği zaten yaşandı ve yorumu `kabuk.css`'te duruyor (Santral 360
   hero plakası `minmax(0,1fr)` satırında 0'a eziliyordu).

   ── Ne ölçer ──────────────────────────────────────────────────────────
   KIRPILMA: `scrollHeight` `clientHeight`'ı aşan, ama `overflow-y`
   `hidden` olduğu için kaydırılamayan öğeler. Kaydırılabilen taşma
   (`auto`/`scroll`) kusur DEĞİLDİR — kap kaydırmayı üstlenmiştir.
   Bilerek kısaltma (`text-overflow: ellipsis`, `-webkit-line-clamp`)
   da kusur değildir: orada kırpma kararı verilmiştir, kaza değildir.

   Ayrıca rapor eder (kusur değil, BÜTÇE bilgisi): ilk veri pikseline
   kadar harcanan kabuk yüksekliği ve sayfanın kaç ekran boyu olduğu.

   Kullanım: PORT=3210 node arac/dizustu.mjs
             PORT=3210 node arac/dizustu.mjs --rota=/portfoy,/uyum
*/

import { chromium } from 'playwright-core';
import { KOK, girisYap, rotaBayragi, rotalarOku, tarayiciYolu } from './kosu-ortak.mjs';

/* Tek bant yeter ve tek bant OLMALIDIR: soru "dizüstü" diye cevaplandı.
   1366×768, kurumsal dizüstünde en sık görülen ve en KISA olan bant;
   burada sığan, daha uzun ekranda da sığar. Daha uzun bir bant eklemek
   kapıyı gevşetirdi — kırpılma yalnız kısa ekranda görünür. */
const BANT = { ad: '1366×768 · dizüstü', en: 1366, boy: 768 };

/** Alt piksel yuvarlaması gürültü üretmesin. */
const TOLERANS = 4;

const ROTALAR = rotaBayragi(
  rotalarOku().map((r) => (typeof r === 'string' ? r : r.yol)).map((r) => r || '/'),
);

/* Sayfa bağlamında koşar. Kırpılan öğeleri ve yükseklik bütçesini döner. */
function olc(tolerans) {
  const gorunur = window.innerHeight;

  /* Bilerek kısaltma mı? Orada kırpma bir KARARDIR, kaza değil. */
  function bilerekKisaltilmis(s) {
    return s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none';
  }

  /* Kendi içeriğini kendi ölçmeyen öğeler: görsel/tuval `object-fit` ile
     zaten ölçeklenir, `scrollHeight` farkı orada bilgi kaybı anlatmaz. */
  const OLCULMEZ = new Set(['IMG', 'SVG', 'CANVAS', 'VIDEO', 'IFRAME', 'SELECT', 'TEXTAREA']);

  /* ── Ölçülen ve elenen ilk yanlış alarm ──────────────────────────────
     Bu kapının ilk koşusunda 38 rotanın hepsinde `a.ab-atla`, ikisinde
     de `.ab-gizli-okuma` "kırpıldı" diye düştü: 1px gösteriyor, 17px
     gerekiyor. Kırkından kırkı YANLIŞTI.

     İkisi de ekran okuyucuya konuşan, gözle görünmeyen metnin standart
     kalıbıdır (`width/height: 1px; clip-path: inset(50%)`; atlama bağı
     odaklanınca tam boyuna açılır). Orada kırpma kaza değil, öğenin
     KENDİSİDİR — ve kırpılan şey kimseden saklanmıyor: okuyucu metni
     tam okur.

     Ders, `gezinme:cekmece`nin `/varlık/i` kusuruyla aynı: ölçüm yanlış
     olduğunda verdiği hüküm de yanlıştır. Görünür kutusu bir pikselden
     ince olan öğe, gözle bilgi TAŞIMAYAN öğedir; bu kapının konusu
     değildir. */
  function gozdenGizli(e, s) {
    return e.clientHeight <= 1 || e.clientWidth <= 1
      || s.clipPath !== 'none' || (s.clip && s.clip !== 'auto');
  }

  const kirpilan = [];
  for (const e of document.querySelectorAll('body *')) {
    if (OLCULMEZ.has(e.tagName)) continue;
    if (e.closest('[aria-hidden="true"]')) continue;      /* dekoratif katman */
    const fazla = e.scrollHeight - e.clientHeight;
    if (fazla <= tolerans) continue;
    const s = getComputedStyle(e);
    if (s.overflowY !== 'hidden') continue;               /* kaydırılabiliyor */
    if (bilerekKisaltilmis(s)) continue;
    if (gozdenGizli(e, s)) continue;                      /* okuyucuya ait metin */

    /* Metin taşıyor mu? Boş bir kap kırpsa da bilgi kaybı yoktur. */
    const metin = (e.innerText || '').trim();
    if (!metin) continue;

    kirpilan.push({
      oge: e,
      etiket: e.tagName.toLowerCase()
        + (e.className && typeof e.className === 'string'
          ? `.${e.className.trim().split(/\s+/).slice(0, 3).join('.')}` : ''),
      gorunen: e.clientHeight,
      gereken: e.scrollHeight,
      kayip: fazla,
    });
  }

  /* ── İkinci kayıp biçimi: ATASININ ALTINA TAŞAN ÇOCUK ────────────────
     Yukarıdaki ölçü, kabın kendi `scrollHeight`'ını sorar. Ama bir
     ızgara çocuğu `minmax(0, 1fr)` satırında EZİLDİĞİNDE kap taşmaz —
     çocuk kendi içeriğine sığar, yalnız kırpan atanın alt kenarının
     ALTINDA kalır. Ekranda görünmez, kaydırılamaz, `scrollHeight` da
     bunu söylemez.

     Depoda yaşanan kusur tam buydu ve `kabuk.css` içinde yazılı: Santral
     360'ın hero plakası 0'a ezilince zincir ve şerit üst üste bindi.
     Bu yüzden ikinci ölçü şart: kırpan en yakın atanın alt kenarını
     aşan, metin taşıyan öğe. */
  function kirpanAta(e) {
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
      if (getComputedStyle(a).overflowY === 'hidden') return a;
    }
    return null;
  }

  for (const e of document.querySelectorAll('body *')) {
    if (OLCULMEZ.has(e.tagName)) continue;
    if (e.closest('[aria-hidden="true"]')) continue;
    const s = getComputedStyle(e);
    if (gozdenGizli(e, s)) continue;
    if (s.position === 'sticky' || s.position === 'fixed') continue;  /* kendi akışında değil */
    const metin = (e.innerText || '').trim();
    if (!metin) continue;
    const ata = kirpanAta(e);
    if (!ata) continue;
    const r = e.getBoundingClientRect();
    const ra = ata.getBoundingClientRect();
    const tasan = r.bottom - ra.bottom;
    if (tasan <= tolerans) continue;
    kirpilan.push({
      oge: e,
      etiket: `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string'
        ? `.${e.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`
        + ` ⊄ ${ata.tagName.toLowerCase()}${ata.className && typeof ata.className === 'string'
          ? `.${ata.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`,
      gorunen: Math.max(0, Math.round(ra.bottom - r.top)),
      gereken: Math.round(r.height),
      kayip: Math.round(tasan),
    });
  }

  /* İç içe kırpılan kapların en DIŞTAKİNİ bildir: kök sebep odur,
     çocuğunkini düzeltmek kaybı geri getirmez. Bir öğe, kırpılan başka
     bir öğenin torunuysa elenir. */
  const kumesi = new Set(kirpilan.map((k) => k.oge));
  const disKirpilan = kirpilan
    .filter((k) => {
      for (let a = k.oge.parentElement; a; a = a.parentElement) {
        if (kumesi.has(a)) return false;
      }
      return true;
    })
    /* `oge` DOM düğümüdür; sayfa bağlamından dışarı serileşemez — rapora
       yalnız ölçülen sayılar geçer. */
    .map((k) => ({ etiket: k.etiket, gorunen: k.gorunen, gereken: k.gereken, kayip: k.kayip }));

  /* Yükseklik bütçesi — kusur değil, bilgi. Üst çubuk + sayfa başlığı
     ilk veri pikselinden önce ne kadar yer yiyor? */
  const ana = document.querySelector('main') || document.body;
  const anaUst = Math.round(ana.getBoundingClientRect().top + window.scrollY);

  return {
    kirpilan: disKirpilan,
    kabukYuksekligi: anaUst,
    sayfaBoyu: document.documentElement.scrollHeight,
    ekranSayisi: +(document.documentElement.scrollHeight / gorunur).toFixed(2),
    yatayTasma: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  };
}

const tarayici = await chromium.launch({ executablePath: tarayiciYolu() });
const baglam = await tarayici.newContext({ viewport: { width: BANT.en, height: BANT.boy } });
const sayfa = await baglam.newPage();
await girisYap(sayfa);

const satirlar = [];
let kusur = 0;

for (const rota of ROTALAR) {
  await sayfa.goto(`${KOK}${rota}`, { waitUntil: 'load' });
  await sayfa.waitForTimeout(350);            /* hidrasyon + yerleşim otursun */
  const o = await sayfa.evaluate(olc, TOLERANS);
  if (o.kirpilan.length) kusur += o.kirpilan.length;
  satirlar.push({ rota, ...o });
}

await tarayici.close();

/* ── Rapor ─────────────────────────────────────────────────────────── */
console.log(`\n═══ ${BANT.ad} ═══\n`);

for (const s of satirlar) {
  if (!s.kirpilan.length && !s.yatayTasma) continue;
  console.log(`${s.rota || '/'}`);
  if (s.yatayTasma) console.log(`  YATAY TAŞMA: ${s.yatayTasma}px`);
  for (const k of s.kirpilan) {
    console.log(`  KIRPILDI: ${k.etiket} — ${k.gorunen}px gösteriyor, ${k.gereken}px gerekiyor (${k.kayip}px kaydırılamıyor)`);
  }
}

const enUzun = [...satirlar].sort((a, b) => b.ekranSayisi - a.ekranSayisi).slice(0, 5);
console.log('\nEn uzun beş rota (768px ekran boyu cinsinden):');
for (const s of enUzun) {
  console.log(`  ${(s.rota || '/').padEnd(28)} ${String(s.ekranSayisi).padStart(5)} ekran · kabuk ${s.kabukYuksekligi}px`);
}

console.log(`\nrota: ${satirlar.length} · kırpılan öğe: ${kusur} · yatay taşan rota: ${satirlar.filter((s) => s.yatayTasma).length}`);

if (kusur || satirlar.some((s) => s.yatayTasma)) {
  console.error('\nDİZÜSTÜ KAPISI KIRMIZI — kaydırılamayan içerik var.');
  process.exit(1);
}
console.log('\ndizüstü kapısı: temiz.');
