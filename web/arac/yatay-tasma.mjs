#!/usr/bin/env node
/* Yatay taşma kapısı — DAR EKRANDA SAYFA YANA KAYMAZ.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Dar bantta bir ızgara izi içeriğini sığdıramazsa hiçbir şey hata
   vermez: kutu izinden taşar, taşma belgeye yayılır ve sayfanın tamamı
   yana kayar. Kullanıcı bunu "sağa kaydırınca boş beyaz alan" ya da
   "başlık yarım" diye görür; ekran görüntüsü alan araç ise taşan hâli
   ALTIN olarak kaydeder ve kusuru kalıcılaştırır — üç altında oldu.

   Ölçüldü (375px, bu kapı yazılmadan önce): altı rota yana kayıyordu.
   Kök sebepler tek tek başkaydı ve hiçbiri göz kararıyla bulunamazdı:
     · saha alanı üç kolonluk sabit ızgarada kalıyor, `overflow: hidden`
       taşmayı kaydırmak yerine KIRPIYORDU — bilgi sessizce kayboluyordu;
     · `minmax(0, 170px)` bir iz, ızgara algoritması gereği dar bantta da
       170px'i kapıyor ve `fr` izine 1px bırakıyordu;
     · esneme katsayıları toplamı 1'in altındayken (`0.7fr`) artakalanın
       bir kısmı HİÇBİR ize dağıtılmıyordu;
     · `overflow: hidden` + `text-overflow` satır içi kutuda yok sayılır,
       üç nokta hiç çalışmıyordu.

   ── Ne ölçer ──────────────────────────────────────────────────────────
   Her rota, her bant için `documentElement.scrollWidth` görüntü
   genişliğini aşıyor mu. Aşıyorsa taşmayı ÜRETEN öğeyi de yazar:
   taşan ama atası taşmayan, ve yol üstünde kaydırma/kırpma kabı
   BULUNMAYAN öğe. Kaydırma kabı içindeki taşma kusur değildir — üst
   çubuklar dar bantta bilerek yatay kaydırılır (`.ab-a-ust`,
   `.ab-b-ust`), kap zaten kaydırmayı üstlenmiştir.

   Kullanım: PORT=3210 node arac/yatay-tasma.mjs
             PORT=3210 node arac/yatay-tasma.mjs --rota=/uyum,/kanitlar
*/

import { chromium } from 'playwright-core';
import { KOK, girisYap, rotaBayragi, rotalarOku, tarayiciYolu } from './kosu-ortak.mjs';

/* İki bant yeter: 375 telefon (en sıkı), 768 dikey tablet (kırılma
   noktasının hemen üstü — 700px kuralları burada HENÜZ geçerli
   değildir, o yüzden ayrı bir gerçekliktir). */
const BANTLAR = [
  { ad: '375 · telefon', en: 375, boy: 780 },
  { ad: '768 · dikey tablet', en: 768, boy: 1024 },
];

/** Taşma toleransı: alt piksel yuvarlaması gürültü üretmesin. */
const TOLERANS = 1;

const ROTALAR = rotaBayragi(
  rotalarOku().map((r) => (typeof r === 'string' ? r : r.yol)).map((r) => r || '/'),
);

/* Sayfa bağlamında koşar: taşmayı ÜRETEN öğeleri döner. */
function suclulariBul() {
  const en = window.innerWidth;
  const liste = [];
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right <= en + 1) continue;
    /* Atası da taşıyorsa suçlu ata; en içteki değil en dıştaki sorulur. */
    const ata = e.parentElement?.getBoundingClientRect();
    if (ata && ata.right > en + 1) continue;
    /* Kaydırma / kırpma kabı içindeki taşma belgeyi kaydırmaz. */
    let a = e.parentElement;
    let kapali = false;
    while (a && a !== document.documentElement) {
      if (getComputedStyle(a).overflowX !== 'visible') { kapali = true; break; }
      a = a.parentElement;
    }
    if (kapali) continue;
    liste.push({
      etiket: `${e.tagName.toLowerCase()}${e.className ? `.${String(e.className).trim().split(/\s+/).join('.')}` : ''}`,
      genislik: Math.round(r.width),
      sag: Math.round(r.right),
      metin: (e.textContent || '').trim().slice(0, 32),
    });
  }
  return liste.slice(0, 4);
}

const tarayici = await chromium.launch({ executablePath: tarayiciYolu() });
const kusurlar = [];
let olculen = 0;

try {
  for (const bant of BANTLAR) {
    const baglam = await tarayici.newContext({ viewport: { width: bant.en, height: bant.boy } });
    const sayfa = await baglam.newPage();
    await girisYap(sayfa, KOK);

    for (const yol of ROTALAR) {
      await sayfa.goto(`${KOK}${yol}`, { waitUntil: 'networkidle' });
      /* Yerleşim istemcide oturuyor; ölçmeden önce bir kare beklenir. */
      await sayfa.waitForTimeout(150);
      olculen += 1;
      /* `suclulariBul` metni sayfaya kaynak olarak enjekte edilir; iki
         bağlam arasında paylaşılan tek yol budur. */
      await sayfa.addScriptTag({ content: `window.__suclulariBul = ${suclulariBul.toString()};` });
      const olcum = await sayfa.evaluate((tolerans) => {
        const tasma = document.documentElement.scrollWidth - window.innerWidth;
        if (tasma <= tolerans) return null;
        return { tasma, suclular: window.__suclulariBul() };
      }, TOLERANS);
      if (olcum) kusurlar.push({ bant: bant.ad, yol, ...olcum });
    }
    await baglam.close();
  }
} finally {
  await tarayici.close();
}

if (kusurlar.length === 0) {
  console.log(`yatay-tasma: ${olculen} ölçüm · ${BANTLAR.length} bant × ${ROTALAR.length} rota · 0 kusur`);
  process.exit(0);
}

console.error(`yatay-tasma: ${kusurlar.length} kusur (${olculen} ölçümde)\n`);
for (const k of kusurlar) {
  console.error(`  ${k.bant} · ${k.yol} → sayfa ${k.tasma}px yana kayıyor`);
  for (const s of k.suclular) {
    console.error(`      ${s.etiket} · ${s.genislik}px · sağ kenar ${s.sag}px · "${s.metin}"`);
  }
  if (k.suclular.length === 0) {
    console.error('      suçlu öğe bulunamadı — taşma bir sözde öğeden ya da');
    console.error('      kırpılmış bir alt ağaçtan geliyor olabilir.');
  }
}
process.exit(1);
