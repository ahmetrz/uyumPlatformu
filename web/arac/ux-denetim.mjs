#!/usr/bin/env node
/* SON KULLANICI UX DENETİMİ — gözün kaçırdığı, kapıların görmediği.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Mevcut kapılar bir kusur ailesini bilerek dışarıda bırakır:

     · `yatay-tasma.mjs` KAYDIRMA KABI içindeki taşmayı kusur saymaz —
       ve haklıdır, çünkü dar bantta çubuklar bilerek kaydırılır. Ama
       masaüstünde, kaydırma çubuğu GİZLENMİŞ bir kapta kalan içerik
       ulaşılamazdır: ölçüldü, /uyum'un ikincil sırası 1440px'te üç
       ekranı gizliyordu ve taşma kapısı bunu göremiyordu.
     · `erisim-axe.mjs` bir tablonun EKRANIN 1300px altında başlamasını
       kusur saymaz; erişilebilirlik kuralı ihlal edilmemiştir. Ama
       kullanıcı o ekrana tablo için gelmiştir.
     · Hiçbir kapı "aynı sayı ekranda üç kez yazıyor" demez.

   Bu araç o aileyi ölçer. Ölçtüğü her şey SAYIDIR; yorum
   `docs/END_USER_UX_AUDIT.md` içinde yapılır.

   ── ÖLÇÜLENLER ────────────────────────────────────────────────────────
   gizliKirpma   Kaydırma çubuğu gizli bir kapta ekran dışında kalan
                 etkileşimli öğeler. Masaüstü bantlarında KUSURDUR;
                 dokunmatik bantta (≤700px) beklenen davranıştır ve
                 ayrıca işaretlenir, kusur sayılmaz.
   isYuzeyiY     Ekranın ASIL iş yüzeyinin (tablo, ızgara, matris) üstten
                 uzaklığı. Kullanıcı oraya gelmiştir; önündeki her piksel
                 bir maliyettir.
   yerTutucu     İlk ekranda duran boş-durum metinleri ("SEÇİN", "YOK").
                 Veri varken ilk ekranı yer tutucunun doldurması,
                 ekranın kendi verisini saklaması demektir.
   tekrarSayi    Ekranda üç veya daha çok kez yazılan sayılar. Aynı
                 gerçeğin dört kutuda tekrarı bilgi değil gürültüdür.
   kucukHedef    24px'ten küçük etkileşimli öğeler.
   kartIzgarasi  İki ve daha çok sütuna dizilmiş, kendi kenarını çizen,
                 çok satırlı kutular — "generic SaaS card grid" yasağının
                 ölçüsü. Etiket değil ŞEKİL aranır.
   baslikAtlama  h1→h3 gibi atlanan başlık kademeleri.

   GÜVENLİK: kurum sistemine giden hiçbir şey yoktur; oturum yerel
   geliştirme sunucusundaki TOHUM kullanıcısıyla açılır.

   Kullanım: PORT=3210 node arac/ux-denetim.mjs
             PORT=3210 node arac/ux-denetim.mjs --rota=/kesif,/envanter
             PORT=3210 node arac/ux-denetim.mjs --bant 1440 --json cikti.json
*/

import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import {
  KOK, bayrakDegeri, girisYap, rotaBayragi, rotalarOku, tarayiciYolu,
} from './kosu-ortak.mjs';

/* Görev listesindeki dokuz bant. 1199 ve 1100 kırılma noktalarının
   ALTINDA/ÜSTÜNDE kalmayı sınar; 700 dokunmatik eşiğidir. */
const BANTLAR = [
  { ad: '1440×1080', en: 1440, boy: 1080 },
  { ad: '1440×900', en: 1440, boy: 900 },
  { ad: '1366×768', en: 1366, boy: 768 },
  { ad: '1280×800', en: 1280, boy: 800 },
  { ad: '1199', en: 1199, boy: 900 },
  { ad: '1100', en: 1100, boy: 900 },
  { ad: '1024', en: 1024, boy: 768 },
  { ad: '768', en: 768, boy: 1024 },
  { ad: '375', en: 375, boy: 780 },
];

/** Dokunmatik eşiği: bunun altında yatay kaydırma beklenen jesttir. */
const DOKUNMATIK_ESIK = 700;

const ROTALAR = rotaBayragi(
  rotalarOku().map((r) => (typeof r === 'string' ? r : r.yol)).map((r) => r || '/'),
);

/* ── Sayfa bağlamında koşan ölçüm ─────────────────────────────────────
   Tek `evaluate` içinde toplanır: her ölçüm için ayrı tur atmak, aynı
   düzeni defalarca yeniden okumak olurdu. */
function olc() {
  const en = window.innerWidth;
  const boy = window.innerHeight;
  const kisa = (e) => (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const etiket = (e) => `${e.tagName.toLowerCase()}${
    e.className && typeof e.className === 'string'
      ? `.${e.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`;

  /* 1 · Gizli kırpma — ekran dışında kalan etkileşimli öğe, ULAŞMA YOLU
         gösterilmeden. Üç hâl ayrılır:
           · `overflow-x: hidden`  → içerik hiç ulaşılamaz. KUSUR.
           · `scrollbar-width: none` ve başka bir ipucu yok → kayar ama
             kimse bilmez. KUSUR (ikincil sıradaki P0 buydu).
           · kayar ve İPUCU VAR (görünür çubuk, kenardaki soluklaşma
             perdesi, kaydırma düğmesi) → kusur değil, bilinçli şerit.
         `offsetHeight - clientHeight` ölçüsü KULLANILMAZ: bindirmeli
         kaydırma çubuğu (overlay) her yerde sıfır yer kaplar ve bu
         ölçü bütün şeritleri yanlışlıkla suçlardı. */
  const ipucuVar = (a) => {
    for (const yer of ['::after', '::before']) {
      const p = getComputedStyle(a, yer);
      if (p && p.content !== 'none' && /gradient/.test(p.backgroundImage || '')) return true;
    }
    /* Kabın kendi içinde kaydırma düğmesi de bir ipucudur. */
    return !!a.querySelector('[data-kaydir], .kaydir-sol, .kaydir-sag');
  };
  const gizliKirpma = [];
  for (const e of document.querySelectorAll('a, button, [role="button"], [role="tab"]')) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right <= en + 1 && r.left >= -1) continue;
    let a = e.parentElement;
    while (a && a !== document.documentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX === 'auto' || s.overflowX === 'scroll' || s.overflowX === 'hidden') {
        const kusur = s.overflowX === 'hidden'
          || (s.scrollbarWidth === 'none' && !ipucuVar(a));
        if (kusur) {
          gizliKirpma.push({
            metin: kisa(e), sag: Math.round(r.right), kap: etiket(a),
            sebep: s.overflowX === 'hidden' ? 'kırpılıyor' : 'ipucusuz kayıyor',
          });
        }
        break;
      }
      a = a.parentElement;
    }
  }

  /* 2 · İş yüzeyi — ekranın asıl tezgâhı. Tablo yoksa ölçüm yapılmaz;
         her ekranın tablosu yoktur (harita, portföy, saha). */
  const yuzeyEl = document.querySelector('table, [role="grid"], [role="table"]');
  const isYuzeyiY = yuzeyEl
    ? Math.round(yuzeyEl.getBoundingClientRect().top + window.scrollY) : null;

  /* 3 · İlk ekrandaki yer tutucular. Ürün dili büyük harf kullanır;
         eşleşme büyük/küçük harf duyarsızdır. */
  const YER_TUTUCU = /\b(seçin|seçili .* yok|yok\b|kayıt yok|veri yok|boş|ölçülmedi|bulunamadı)/i;
  const yerTutucu = [];
  for (const e of document.querySelectorAll('p, div, span, td, li')) {
    if (e.children.length > 0) continue;
    const r = e.getBoundingClientRect();
    if (r.top > boy || r.bottom < 0 || r.width === 0) continue;
    const m = kisa(e);
    if (m && YER_TUTUCU.test(m)) yerTutucu.push(m);
  }

  /* 4 · Sayı tekrarı — YALNIZ EKRAN KÜNYESİNDE.
         İki tur denendi ve ikisi de gürültü verdi: bütün gövde
         (/envanter'de "39×1957" — tablo tarihleri), sonra iş yüzeyinin
         üstü (/uyum'da "2×224" — matrisin kendi başlıkları). Ölçüm
         sonunda TEK bir bölgeye indirildi: ekranın künyesi (`.ab-lede`)
         ve hemen altındaki özet cümlesi. KPI tekrarı — "28 kayıt"ın
         başlıkta, metrikte ve özette üç kez yazılması — tam olarak
         orada yaşar; tablo hücresi bir tekrar değil, veridir.

         Ölçemediğini ölçüyormuş gibi yapmaktansa dar ama doğru bir
         bölge ölçülür; gövdenin tekrarları göz denetimine bırakılır ve
         denetim belgesinde öyle yazılır. */
  const kunye = document.querySelector('.ab-lede');
  const ozet = kunye?.parentElement?.querySelector('.ab-blok .ab-dip, .ab-ekran-govde > .ab-dip');
  const sayilar = new Map();
  for (const kok of [kunye, ozet]) {
    if (!kok) continue;
    for (const s of (kok.textContent || '').match(/\b\d{1,6}\b/g) || []) {
      if (s === '0' || s === '1') continue;
      sayilar.set(s, (sayilar.get(s) || 0) + 1);
    }
  }
  const tekrarSayi = [...sayilar.entries()]
    .filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1])
    .slice(0, 6).map(([s, n]) => `${s}×${n}`);

  /* 5 · Küçük dokunma hedefi. */
  const kucukHedef = [];
  for (const e of document.querySelectorAll('a, button, input, select, [role="button"]')) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.width >= 24 && r.height >= 24) continue;
    kucukHedef.push(`${etiket(e)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }

  /* 6 · KART IZGARASI — "generic SaaS card grid" yasağının ölçüsü.
         Aranan şey tek tek kutular değil, ŞEKİL: üç ya da daha çok
         sütuna dizilmiş, her biri kendi kenarını çizen, içinde birden
         çok satır metin taşıyan kutular (en az iki sütun, dört kutu). Etiket önemli değildir —
         /kesif'in yedi grup kutusu `<button>` idi ve ilk ölçüm onları
         hiç görmemişti; ekranda ise tastamam bir kart ızgarasıydı. */
  const kartIzgaralari = [];
  for (const kap of document.querySelectorAll('body *')) {
    const s = getComputedStyle(kap);
    if (s.display !== 'grid') continue;
    /* Eşik ÖLÇÜLEREK indirildi: /kesif'in yedi kutusu 1440px'te iki
       sütuna dört satır hâlinde diziliyor. "Üç sütun" aramak o ızgarayı
       kaçırıyordu; kalıbın kendisi iki sütunda da aynı kalıptır. */
    const sutunlar = s.gridTemplateColumns.split(' ').filter(Boolean).length;
    if (sutunlar < 2) continue;
    const kutular = [...kap.children].filter((c) => {
      const cs = getComputedStyle(c);
      const cr = c.getBoundingClientRect();
      return parseFloat(cs.borderTopWidth) > 0 && parseFloat(cs.paddingTop) >= 8
        && cr.width >= 140 && (c.textContent || '').trim().length >= 30;
    });
    if (kutular.length >= 4) {
      kartIzgaralari.push({
        kap: etiket(kap), sutun: sutunlar, kutu: kutular.length,
        ornek: kisa(kutular[0]),
      });
    }
  }

  /* 7 · Başlık kademesi atlaması. */
  const kademeler = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .map((h) => Number(h.tagName[1]));
  const baslikAtlama = [];
  for (let i = 1; i < kademeler.length; i += 1) {
    if (kademeler[i] - kademeler[i - 1] > 1) {
      baslikAtlama.push(`h${kademeler[i - 1]}→h${kademeler[i]}`);
    }
  }

  return {
    sayfaKaymasi: document.documentElement.scrollWidth > en + 1,
    sayfaBoyu: Math.round(document.documentElement.scrollHeight),
    gizliKirpma: gizliKirpma.slice(0, 8),
    isYuzeyiY,
    yerTutucu: [...new Set(yerTutucu)].slice(0, 8),
    tekrarSayi,
    kucukHedef: [...new Set(kucukHedef)].slice(0, 6),
    kartIzgarasi: kartIzgaralari,
    baslikAtlama: [...new Set(baslikAtlama)],
    h1: document.querySelectorAll('h1').length,
  };
}

/* ── Koşu ─────────────────────────────────────────────────────────── */

const bantBayragi = bayrakDegeri('--bant');
const bantlar = bantBayragi
  ? BANTLAR.filter((b) => String(b.en) === bantBayragi)
  : BANTLAR;
if (!bantlar.length) {
  console.error(`Bilinmeyen bant: ${bantBayragi}. Seçenekler: ${BANTLAR.map((b) => b.en).join(', ')}`);
  process.exit(2);
}

const tarayici = await chromium.launch({
  executablePath: tarayiciYolu(), args: ['--no-sandbox'],
});
const baglam = await tarayici.newContext({ viewport: bantlar[0] ? { width: bantlar[0].en, height: bantlar[0].boy } : undefined });
const sayfa = await baglam.newPage();
await girisYap(sayfa);

const sonuc = [];
for (const bant of bantlar) {
  await sayfa.setViewportSize({ width: bant.en, height: bant.boy });
  for (const rota of ROTALAR) {
    try {
      await sayfa.goto(`${KOK}${rota === '/' ? '' : rota}`, { waitUntil: 'load', timeout: 30000 });
      /* Hidrasyon sonrası ölçülmeli: sunucu çıktısında olmayan
         etkileşimli öğeler (menü, sekme) hidrasyonla gelir. */
      await sayfa.waitForTimeout(450);
      const o = await sayfa.evaluate(olc);
      sonuc.push({ rota, bant: bant.ad, en: bant.en, dokunmatik: bant.en <= DOKUNMATIK_ESIK, ...o });
    } catch (e) {
      sonuc.push({ rota, bant: bant.ad, en: bant.en, hata: String(e).slice(0, 120) });
    }
  }
}
await tarayici.close();

/* ── Rapor ────────────────────────────────────────────────────────── */

const jsonYolu = bayrakDegeri('--json');
if (jsonYolu) {
  writeFileSync(jsonYolu, JSON.stringify(sonuc, null, 2));
  console.log(`yazıldı: ${jsonYolu} · ${sonuc.length} ölçüm`);
}

/* Masaüstü bantlarında gizli kırpma ve sayfa kayması KUSURDUR. */
const kusurlar = sonuc.filter((s) => !s.dokunmatik
  && ((s.gizliKirpma?.length ?? 0) > 0 || s.sayfaKaymasi || s.hata));

for (const s of kusurlar) {
  const parcalar = [];
  if (s.hata) parcalar.push(`HATA ${s.hata}`);
  if (s.sayfaKaymasi) parcalar.push('sayfa yana kayıyor');
  if (s.gizliKirpma?.length) {
    parcalar.push(`gizli kırpma: ${s.gizliKirpma.map((g) => `"${g.metin}"@${g.sag}`).join(', ')}`);
  }
  console.log(`✗ ${s.bant.padEnd(10)} ${s.rota.padEnd(26)} ${parcalar.join(' · ')}`);
}

const olculen = sonuc.filter((s) => !s.hata);
const enDerin = [...olculen].filter((s) => s.isYuzeyiY !== null)
  .sort((a, b) => b.isYuzeyiY - a.isYuzeyiY).slice(0, 8);
console.log('\nİş yüzeyine en uzak ekranlar (üstten px):');
for (const s of enDerin) console.log(`  ${String(s.isYuzeyiY).padStart(5)}  ${s.rota} @ ${s.bant}`);

console.log(`\n${sonuc.length} ölçüm · ${kusurlar.length} kusurlu ölçüm`);
process.exit(kusurlar.length ? 1 : 0);
