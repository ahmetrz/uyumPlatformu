#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   BİLİŞSEL YÜK ÖLÇÜMÜ — "bu ekran kullanıcıdan ne kadar iş istiyor?"

   ── NİÇİN BU ARAÇ ─────────────────────────────────────────────────────
   Mevcut kapılar ekranın DOĞRU olduğunu söyler: taşma yok, kontrast
   yeterli, axe temiz, testler yeşil. Hiçbiri şunu söylemez:

     "kullanıcı burada ne yapacağını üç saniyede anlıyor mu?"

   O soru tam olarak ölçülemez. Ama ona giden yolun üzerindeki engeller
   ölçülebilir ve bu araç onları sayar. Ölçtüğü her şey SAYIDIR; yorum
   `docs/UX_SIMPLIFICATION_AUDIT.md` içinde, ekranın kendi işine bakarak
   yapılır.

   ── ÖLÇÜLENLER ────────────────────────────────────────────────────────
   etiket        Görünür küçük etiket (`.etiket`) sayısı. Her etiket bir
                 okuma yükü; ölçüt bandında yerinde, satır aralarında
                 gürültü.
   rozet         Durum imi (`.ab-glif`). Anlam taşır ama sayısı arttıkça
                 tek tek anlamı düşer.
   kpi           Ölçüt kutusu (`.ab-olcutler > *`). Beşten fazlası
                 "önemli olan hangisi" sorusunu cevapsız bırakır.
   aksiyon       İş yüzeyindeki görünür etkileşimli öğe — gezinme rayı,
                 kabuk üstü ve ayağı HARİÇ. Sekiz eşit ağırlıklı düğme
                 bir hiyerarşi değil, bir liste.
   metaSatir     Etiket→değer çifti sayısı (`dl > div`, çekmece alanları).
   tekrarCift    AYNI etiket→değer çiftinin ana yüzeyde birden çok kez
                 yazılması. Bu, en temiz tekrar kanıtıdır: aynı gerçek
                 aynı sözcüklerle iki yerde duruyorsa gerekçesi olmalı.
   ilkAksiyonY   Sayfanın tepesinden ilk BİRİNCİL eylemin üstüne kadar
                 olan piksel. 900px'lik bir pencerede 900'ü aşarsa,
                 kullanıcı ne yapacağını görmek için kaydırmak zorunda.
   isYuzeyiY     İlk tablo/ızgara/matrisin üstten uzaklığı.
   l3Yuksekligi  Ana yüzeyde geçmiş/denetim izi/zaman çizelgesi bloklarının
                 kapladığı toplam yükseklik. L3 kanıttır; ana yüzeyi
                 işgal ederse L1 kararı aşağı iter.
   govdeMetin    Görünür metnin karakter sayısı — yoğunluk göstergesi.
                 TEK BAŞINA kusur değildir: yüksek yoğunluk bu ürünün
                 amacıdır, düşük yoğunluk boş minimalizmdir. Yorum
                 belgeye aittir.

   ── ARACIN GÖREMEDİĞİ ─────────────────────────────────────────────────
   Sayımlar ürünün ORTAK primitif sözlüğüne bakar (`.ab-olcutler`,
   `.ab-kpi`, `.ab-glif`, `.etiket`). Kendi ölçüt bandını kuran bir ekran
   burada `kpi: 0` görünür ve bu, o ekranda durum bilgisi OLMADIĞI
   anlamına gelmez.

   Ölçüldü ve doğrulandı: `/envanter` üst bandında "52 / 347 varlık · 39
   ölçülmemiş · 13 sahipsiz" yazıyor; `/portfoy` kendi uyum endeksini
   `.ab-portfoy-endeks` ile çiziyor. İkisi de araçta 0 KPI verir.

   Bu bilinçli bir sınırdır: seçiciyi ekran ekran genişletmek, aracı
   ölçtüğü şeyin peşinden sürüklerdi ve iki ekran sonra hiçbir şey
   karşılaştırılabilir olmazdı. `kpi: 0` çıkan bir ekranda cevap
   EKRANA BAKARAK verilir — ve verildi (bkz. UX_SIMPLIFICATION_AUDIT.md,
   "Ölçüldü, kusur sayılmadı").

   ── NEDEN TEK BANT ────────────────────────────────────────────────────
   1440×900. Duyarlılık ayrı bir kapının işidir (`ux-denetim.mjs`, dokuz
   bant); burada ölçülen şey banda değil BİLGİ MİMARİSİNE bağlıdır ve
   dokuz bantta dokuz kez ölçmek aynı sayıyı dokuz kez üretirdi.

   GÜVENLİK: kurum sistemine giden hiçbir şey yoktur; oturum yerel
   geliştirme sunucusundaki TOHUM kullanıcısıyla açılır.

   Kullanım: PORT=3210 node arac/bilissel-yuk.mjs
             PORT=3210 node arac/bilissel-yuk.mjs --rota=/envanter,/uyum
             PORT=3210 node arac/bilissel-yuk.mjs --json cikti.json
   ═══════════════════════════════════════════════════════════════════ */

import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import {
  KOK, bayrakDegeri, girisYap, rotaBayragi, rotalarOku, tarayiciYolu,
} from './kosu-ortak.mjs';

const BANT = { en: 1440, boy: 900 };

/** Sayfada ölçüm — tarayıcı içinde koşar. */
function olc() {
  const gorunur = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
  };

  /* Kabuk (ray · üst · alt · kapsam çubuğu) ekranın kendi işi DEĞİLDİR;
     her ekranda aynıdır ve sayılırsa bütün ekranlar aynı çıkar. */
  const KABUK = '.ab-ray, .ab-ust, .ab-alt, .ab-ikincil, .ab-durum, .ab-marka';
  const kabuktaMi = (el) => !!el.closest(KABUK);

  const is = document.querySelector('.ab-icerik') || document.body;
  const hepsi = [...is.querySelectorAll('*')].filter((el) => gorunur(el) && !kabuktaMi(el));

  const say = (sec) => hepsi.filter((el) => el.matches(sec)).length;

  /* ── Eylem hiyerarşisi ──────────────────────────────────────────────
     Bağlantı ile düğme ayrılır: bağlantı gezinme, düğme iştir. İkisini
     tek sayıda toplamak, "bu ekranda sekiz düğme var" gibi yanlış bir
     alarm üretirdi. */
  const etkilesimli = hepsi.filter((el) => el.matches(
    'button, [role="button"], a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
  ));
  const dugmeler = etkilesimli.filter((el) => el.matches('button, [role="button"]'));
  const baglar = etkilesimli.filter((el) => el.matches('a[href]'));

  /* ── Birincil eylem ────────────────────────────────────────────────
     İlk sürüm yalnız `.birincil` düğmesini arıyordu ve KUYRUK
     ekranlarında yanılıyordu: `/saglik/reddedilenler` gibi bir dead-
     letter kuyruğunda kullanıcının birincil eylemi bir düğmeye basmak
     değil, BİR SATIR SEÇMEKTİR — karar çekmecesi öyle açılır. O ekranda
     tek düğme sayfanın en altındaki "+4 kayıt" açıcısıydı ve araç onu
     "birincil eylem 1190px'te" diye raporladı. Ölçüm doğruydu, hedef
     yanlıştı.

     Sıra: gerçek birincil düğme → seçilebilir ızgaranın ilk satırı →
     gönderim düğmesi → ilk düğme. `role="grid"` ürünün kendi işaretidir
     ve yalnız satır seçimi olan tabloya konur (`components/kabuk/
     tablo.tsx`). */
  const izgaraSatiri = is.querySelector('[role="grid"] tbody tr');
  const birincil = dugmeler.find((el) => el.classList.contains('birincil'))
    ?? izgaraSatiri
    ?? dugmeler.find((el) => el.matches('[type="submit"]'))
    ?? dugmeler[0];
  const ustu = (el) => (el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null);

  /* ── İş yüzeyi ─────────────────────────────────────────────────────
     Kullanıcı buraya tablo/matris için gelmiştir. Üstündeki her piksel
     bir maliyettir — ama sıfır da doğru hedef değil: bağlam da gerekir. */
  const isYuzeyi = is.querySelector(
    'table, [role="grid"], .ab-vt, .ab-vt-sar, .ab-matris, .ab-mtx,'
    + ' .ab-tuval, .ab-a-tuval, .ab-isi, .ab-harita-tuval, .ab-graf-sar',
  );

  /* ── Etiket → değer çiftleri ve tekrar ─────────────────────────────
     Ölçüt bandı (`.ab-olcutler`) ve çekmece alanları etiketi ve değeri
     yan yana yazar. Aynı çift iki kez yazılıyorsa ya iki ayrı karar
     içindir ya da gürültüdür; sayıyı belge yorumlar. */
  const ciftler = [];
  for (const kap of is.querySelectorAll(
    '.ab-olcutler > *, .ab-kpi > *, dl > div, .ab-panel-ciftler > *,'
    + ' .ab-panel-alan, .ab-durus-satir, .ab-alan, .ab-yardim-satir',
  )) {
    if (!gorunur(kap) || kabuktaMi(kap)) continue;
    const e = kap.querySelector('.etiket, dt')?.textContent?.trim();
    const d = kap.querySelector('.deger, dd')?.textContent?.trim();
    if (e && d) ciftler.push(`${e} ${d}`);
  }
  const sayaclar = new Map();
  for (const c of ciftler) sayaclar.set(c, (sayaclar.get(c) ?? 0) + 1);
  const tekrarlar = [...sayaclar.entries()]
    .filter(([, n]) => n > 1)
    .map(([c, n]) => ({ cift: c.split(' ').join(' = '), kez: n }));

  /* ── L3 · kanıt ve geçmiş ──────────────────────────────────────────
     Zaman çizelgesi, denetim izi, aktivite listesi. Ekranın ana yüzeyinde
     ne kadar yer kapladığı ölçülür; ana iş bunun altına inmişse karar
     yüzeyi kanıt yüzeyine yenilmiş demektir. */
  /* L3 · KANIT ve GEÇMİŞ.

     İlk sürüm buraya `.ab-zaman` (zaman çizelgesi) de koyuyordu ve
     yanılıyordu: `/projeler`, `/surecler` ve `/denetimler` ekranlarında
     o çizelge GELECEĞE bakar — "hangi proje taahhüdünü tutmuyor",
     "hangi denetim takvimine yetişmiyor". Yani o ekranların BİRİNCİL
     karar yüzeyi. Araç onu "geçmiş" sayıp indirilecek bir yük gibi
     raporladı; ölçüm doğruydu, sınıflandırma yanlıştı.

     Aynı bileşen bir ekranda karar, ötekinde kanıt olabiliyor ve
     bileşenin kendisi hangisi olduğunu söylemiyor. Bu yüzden burada
     yalnız TARTIŞMASIZ kanıt katmanı sayılır: köken kaydı, denetim izi,
     teknik ayrıntı. Zaman çizelgesinin yeri ekran ekran karara bağlanır
     ve gerekçesi `docs/UX_SIMPLIFICATION_AUDIT.md` içinde yazılır. */
  const L3 = '.ab-koken, .ab-konsol-iz, .ab-teknik, [data-katman="l3"]';
  let l3Yuksekligi = 0;
  for (const el of is.querySelectorAll(L3)) {
    if (gorunur(el) && !kabuktaMi(el)) l3Yuksekligi += Math.round(el.getBoundingClientRect().height);
  }

  const metin = (is.innerText || '').replace(/\s+/g, ' ').trim();

  return {
    etiket: say('.etiket'),
    rozet: say('.ab-glif'),
    kpi: is.querySelectorAll('.ab-olcutler > *, .ab-kpi > *').length,
    dugme: dugmeler.length,
    bag: baglar.length,
    metaSatir: ciftler.length,
    tekrarCift: tekrarlar.length,
    tekrarlar: tekrarlar.slice(0, 6),
    ilkAksiyonY: ustu(birincil),
    ilkAksiyonAdi: birincil?.textContent?.trim().slice(0, 40) ?? null,
    ilkAksiyonTuru: birincil == null ? null
      : (birincil.tagName === 'TR' ? 'satır seçimi' : 'düğme'),
    isYuzeyiY: ustu(isYuzeyi),
    l3Yuksekligi,
    govdeMetin: metin.length,
    sayfaBoyu: Math.round(document.documentElement.scrollHeight),
  };
}

const rotalar = rotaBayragi(rotalarOku());
const jsonYolu = bayrakDegeri('--json');

const tarayici = await chromium.launch({ executablePath: tarayiciYolu() });
const baglam = await tarayici.newContext({ viewport: { width: BANT.en, height: BANT.boy } });
const sayfa = await baglam.newPage();
await girisYap(sayfa, KOK);

const satirlar = [];
for (const rota of rotalar) {
  const adres = `${KOK}${rota === '/' ? '' : rota}`;
  try {
    await sayfa.goto(adres, { waitUntil: 'load', timeout: 30000 });
    await sayfa.waitForTimeout(350);
    const o = await sayfa.evaluate(olc);
    satirlar.push({ rota: rota || '/', ...o });
  } catch (e) {
    satirlar.push({ rota: rota || '/', hata: String(e).slice(0, 120) });
  }
}

await tarayici.close();

const bas = (s, n) => String(s ?? '—').padStart(n);
console.log('');
console.log('ROTA'.padEnd(24) + bas('ETİKET', 7) + bas('ROZET', 6) + bas('KPI', 5)
  + bas('DÜĞME', 6) + bas('BAĞ', 5) + bas('META', 5) + bas('TEKRAR', 7)
  + bas('AKSİYON-Y', 10) + bas('İŞYÜZ-Y', 8) + bas('L3-PX', 6) + bas('METİN', 7));
for (const s of satirlar) {
  if (s.hata) { console.log(s.rota.padEnd(24) + '  ' + s.hata); continue; }
  console.log(s.rota.padEnd(24) + bas(s.etiket, 7) + bas(s.rozet, 6) + bas(s.kpi, 5)
    + bas(s.dugme, 6) + bas(s.bag, 5) + bas(s.metaSatir, 5) + bas(s.tekrarCift, 7)
    + bas(s.ilkAksiyonY, 10) + bas(s.isYuzeyiY, 8) + bas(s.l3Yuksekligi, 6)
    + bas(s.govdeMetin, 7));
}

const gecerli = satirlar.filter((s) => !s.hata);
const ort = (alan) => Math.round(
  gecerli.reduce((a, s) => a + (s[alan] ?? 0), 0) / Math.max(1, gecerli.length),
);
console.log('');
console.log(`${gecerli.length} rota @ ${BANT.en}×${BANT.boy}`
  + ` · ortalama etiket ${ort('etiket')} · rozet ${ort('rozet')} · düğme ${ort('dugme')}`
  + ` · tekrar eden çift ${gecerli.reduce((a, s) => a + (s.tekrarCift ?? 0), 0)}`);
console.log(`ilk aksiyon katlamanın (${BANT.boy}px) ALTINDA kalan rota: `
  + gecerli.filter((s) => (s.ilkAksiyonY ?? 0) > BANT.boy).length);
console.log('birincil eylemi hiç olmayan rota: '
  + gecerli.filter((s) => s.ilkAksiyonY === null).length);

if (jsonYolu) {
  writeFileSync(jsonYolu, JSON.stringify({ bant: BANT, satirlar }, null, 2) + '\n');
  console.log(`json: ${jsonYolu}`);
}
