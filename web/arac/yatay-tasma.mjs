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

   ── Ne ölçer · İKİ KUSUR TÜRÜ ─────────────────────────────────────────
   1 · SAYFA YANA KAYIYOR. Her rota, her bant için
       `documentElement.scrollWidth` görüntü genişliğini aşıyor mu.
       Aşıyorsa taşmayı ÜRETEN öğeyi de yazar: taşan ama atası taşmayan,
       ve yol üstünde kaydırma/kırpma kabı BULUNMAYAN öğe. Kaydırma kabı
       içindeki taşma kusur değildir — üst çubuklar dar bantta bilerek
       yatay kaydırılır (`.ab-a-ust`, `.ab-b-ust`), kap zaten kaydırmayı
       üstlenmiştir.

   2 · KIRPILAN İÇERİK. Birinci ölçüm tek başına KÖRDÜ: `overflow:
       hidden` bir kap taşmayı yutunca sayfa kaymaz ve kapı "0 kusur"
       der — oysa içerik ekranda yoktur ve hiçbir jestle geri gelmez.
       Ölçüldü (/tesisler/[id] · 375px): hero künyesi ve beş ölçü şeridi
       0px genişlikteydi; tesis adı, kurulu güç, kritiklik sınıfı
       görünmüyordu ve bu kapı bunu göremiyordu.

       Muafiyet KORUNUR ama gerekçesiyle: ayrım "kaydırılabiliyor mu"
       değil, "ERİŞİLEBİLİYOR MU". `auto`/`scroll` kabında içerik
       erişilebilir — kusur değil. `hidden`/`clip` kabında değil — kusur.
       Karar `kalite-kurallari.mjs → kirpilmaKarari` içindedir ve
       tarayıcısız test edilir.

   Kullanım: PORT=3210 node arac/yatay-tasma.mjs
             PORT=3210 node arac/yatay-tasma.mjs --rota=/uyum,/kanitlar
*/

import { chromium } from 'playwright-core';
import { KOK, girisYap, rotaBayragi, rotalarOku, tarayiciYolu } from './kosu-ortak.mjs';
import { KAYDIRAN_KAPLAR, enDistakiKirpilmalar, kirpilmaKarari } from './kalite-kurallari.mjs';

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

/* Sayfa bağlamında koşar: KARAR VERMEZ, ham ölçüm döner. Karar
   `kirpilmaKarari` içindedir ve tarayıcısız test edilir; bu ayrım
   `kalite-kurallari.mjs` başındaki gerekçenin aynısıdır.

   Ağaç YUKARIDAN AŞAĞI gezilir ve kırpma durumu aşağı taşınır: her öğe
   için ataları yeniden yürümek 50 rota × 2 bant × birkaç bin öğede
   ölçülebilir bir maliyettir; ayrıca görünmeyen alt ağaçlar budanır. */
function kirpilmaOlcumleri(kaydiranKaplar) {
  const adaylar = [];

  /* Akış içi ve GÖRÜNÜR içeriğin yatay uçları. `scrollWidth` bilerek
     kullanılmaz: konumlandırılmış (absolute/fixed) ve gizli soyları da
     sayar, ipucu balonları yanlış alarm üretir. */
  const icerikUclari = (e) => {
    let sol = Infinity;
    let sag = -Infinity;
    for (const n of e.childNodes) {
      if (n.nodeType === 3) {
        if ((n.textContent || '').trim() === '') continue;
        const rg = document.createRange();
        rg.selectNode(n);
        for (const r of rg.getClientRects()) {
          if (r.width === 0 && r.height === 0) continue;
          sol = Math.min(sol, r.left);
          sag = Math.max(sag, r.right);
        }
        rg.detach?.();
      } else if (n.nodeType === 1) {
        const cs = getComputedStyle(n);
        if (cs.position === 'absolute' || cs.position === 'fixed') continue;
        if (cs.display === 'none' || cs.visibility !== 'visible' || Number(cs.opacity) === 0) continue;
        const r = n.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        sol = Math.min(sol, r.left);
        sag = Math.max(sag, r.right);
      }
    }
    return { sol, sag };
  };

  const gez = (e, yol, kap) => {
    const st = getComputedStyle(e);
    /* Görünmeyen alt ağaç budanır: ekrana çizilmeyen içerik kırpılmış
       sayılmaz (ekran okuyucuya bırakılmış metin, kapalı çekmece…). */
    if (st.display === 'none' || st.visibility !== 'visible' || Number(st.opacity) === 0) return;
    if (e.getAttribute('aria-hidden') === 'true') return;
    /* Ekran okuyucuya bırakılmış görünmez metnin standart kalıbı
       (`width/height: 1px; clip-path: inset(50%)`) kırpma DEĞİLDİR:
       okuyucu metni tam okur. `dizustu.mjs` ilk koşusunda 40 yanlış
       alarmın kırkı buydu; aynı eleme burada da yapılır. */
    if (st.clipPath !== 'none') return;

    const r = e.getBoundingClientRect();
    const metin = (e.textContent || '').trim();

    if (metin !== '' && r.height > 0 && (kap.erisilir || kap.kutu)) {
      const disari = kap.erisilir || !kap.kutu ? 0
        : Math.max(0, kap.kutu.sol - r.left) + Math.max(0, r.right - kap.kutu.sag);
      const uc = icerikUclari(e);
      const tasma = uc.sag === -Infinity ? 0
        : Math.max(0, uc.sag - r.right) + Math.max(0, r.left - uc.sol);
      if (disari > 0 || tasma > 0) {
        adaylar.push({
          yol,
          etiket: `${e.tagName.toLowerCase()}${e.className ? `.${String(e.className).trim().split(/\s+/).join('.')}` : ''}`,
          genislik: Math.round(r.width),
          disari: Math.round(disari),
          tasma: Math.round(tasma),
          kendiOverflow: st.overflowX,
          kapTuru: kap.tur,
          erisilir: kap.erisilir,
          metin: metin.slice(0, 40).replace(/\s+/g, ' '),
        });
      }
    }

    /* Kırpma durumu çocuklara taşınır. Yol üstünde bir kez kaydırma kabı
       görüldüyse aşağısı ERİŞİLEBİLİRDİR ve öyle kalır. */
    let altKap = kap;
    if (st.overflowX !== 'visible') {
      altKap = kaydiranKaplar.includes(st.overflowX)
        ? { erisilir: true, tur: null, kutu: null }
        : {
          erisilir: kap.erisilir,
          tur: st.overflowX,
          kutu: kap.kutu
            ? { sol: Math.max(kap.kutu.sol, r.left), sag: Math.min(kap.kutu.sag, r.right) }
            : { sol: r.left, sag: r.right },
        };
    }
    for (let i = 0; i < e.children.length; i += 1) gez(e.children[i], [...yol, i], altKap);
  };

  const kok = { erisilir: false, tur: null, kutu: null };
  for (let i = 0; i < document.body.children.length; i += 1) gez(document.body.children[i], [i], kok);
  return adaylar;
}

const tarayici = await chromium.launch({ executablePath: tarayiciYolu() });
const kusurlar = [];
const kirpilmalar = [];
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

      /* İkinci kusur türü: taşma sayfayı kaydırmasa da içerik kayıp mı. */
      await sayfa.addScriptTag({ content: `window.__kirpilmaOlcumleri = ${kirpilmaOlcumleri.toString()};` });
      const adaylar = await sayfa.evaluate((k) => window.__kirpilmaOlcumleri(k), [...KAYDIRAN_KAPLAR]);
      const kirpilan = enDistakiKirpilmalar(
        adaylar.map((a) => ({ ...a, karar: kirpilmaKarari(a) })).filter((a) => a.karar.kusur),
      );
      if (kirpilan.length > 0) kirpilmalar.push({ bant: bant.ad, yol, ogeler: kirpilan });
    }
    await baglam.close();
  }
} finally {
  await tarayici.close();
}

const bas = `yatay-tasma: ${olculen} ölçüm · ${BANTLAR.length} bant × ${ROTALAR.length} rota`;

if (kusurlar.length === 0 && kirpilmalar.length === 0) {
  console.log(`${bas} · taşan rota 0 · kırpılan içerik 0`);
  process.exit(0);
}

console.error(`${bas} · taşan rota ${kusurlar.length} · kırpılan içerik ${kirpilmalar.length}\n`);

for (const k of kusurlar) {
  console.error(`  [SAYFA KAYIYOR] ${k.bant} · ${k.yol} → ${k.tasma}px`);
  for (const s of k.suclular) {
    console.error(`      ${s.etiket} · ${s.genislik}px · sağ kenar ${s.sag}px · "${s.metin}"`);
  }
  if (k.suclular.length === 0) {
    console.error('      suçlu öğe bulunamadı — taşma bir sözde öğeden ya da');
    console.error('      kırpılmış bir alt ağaçtan geliyor olabilir.');
  }
}

for (const k of kirpilmalar) {
  console.error(`  [KIRPILAN İÇERİK] ${k.bant} · ${k.yol} → ${k.ogeler.length} öğe erişilemiyor`);
  for (const o of k.ogeler) {
    console.error(`      [${o.karar.tur}] ${o.etiket} · kutu ${o.genislik}px · ${o.karar.sebep}`);
    console.error(`          "${o.metin}"`);
  }
}
process.exit(1);
