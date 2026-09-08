#!/usr/bin/env node
import { sebepBayragi, tabanDogrula, tabanYaz } from './olcum-tabani.mjs';
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
import {
  KOK, dinamikRotalar, girisYap, kalipCozucu, oturumsuzAcikYuzeyler, oturumsuzRotalar,
  rotaBayragi, rotaBayragiVar, rotalarOku, tarayiciYolu,
} from './kosu-ortak.mjs';
import {
  KAYDIRAN_KAPLAR, borcAnahtari, enDistakiKirpilmalar, kirpilmaKarari, ortusmeHedefi,
  ortusmeKarari, tasmaHedefi,
} from './kalite-kurallari.mjs';
import { borcuUygula } from './kalite-borcu.mjs';
import { yonlendirmeKarari } from './rota-kurallari.mjs';

/* İki bant yeter: 375 telefon (en sıkı), 768 dikey tablet (kırılma
   noktasının hemen üstü — 700px kuralları burada HENÜZ geçerli
   değildir, o yüzden ayrı bir gerçekliktir). */
const BANTLAR = [
  { ad: '375 · telefon', en: 375, boy: 780 },
  { ad: '768 · dikey tablet', en: 768, boy: 1024 },
];

/** Taşma toleransı: alt piksel yuvarlaması gürültü üretmesin. */
const TOLERANS = 1;

/** Kırpılma ölçüsüyle AYNI taşıyıcı tanımı: metin şart değildir. */
const TASIYICI_ETIKETLER = ['img', 'svg', 'canvas', 'video', 'iframe', 'object'];

/* Statik liste + tohumdan somutlaşan dinamik rotalar. Dinamikler uzun
   süre dışarıdaydı ve bu, kapıyı KÖR bırakıyordu: altı kayıt detayı
   ekranının hiçbiri taranmıyordu (Tesis 360 dahil). */
const DINAMIK = dinamikRotalar();
const ROTALAR = rotaBayragi([
  ...rotalarOku().map((r) => (typeof r === 'string' ? r : r.yol)).map((r) => r || '/'),
  ...DINAMIK.url,
]);

/* Oturum İSTEMEYEN yüzeyler ayrı bir bağlamda ölçülür: oturum açmış bir
   tarayıcı `/giris`'i hiç görmez (sunucu panoya yönlendirir), o yüzden
   bu yüzey iki kapının da dışında kalmıştı. Gerekçe ve nöbetçi kuralı
   `kosu-ortak.mjs → OTURUMSUZ_ROTALAR` içinde. */
const OTURUMSUZ = oturumsuzRotalar();
const OTURUMSUZ_YOLLAR = new Set(OTURUMSUZ.map((r) => r.yol));

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
      etiket: `${e.tagName.toLowerCase()}${[...e.classList].map((c) => `.${c}`).join('')}`,
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
  /* Metni olmayan ama BİLGİ taşıyan öğeler. */
  const TASIYICI_ETIKET = ['img', 'svg', 'canvas', 'video', 'iframe', 'object'];

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
    /* Metin ŞART DEĞİLDİR. Yalnız metin arasaydık, kırpılan bir görsel,
       bir SVG şema ya da yalnız simge taşıyan bir düğme hiç aday olmaz
       ve kapı "kusursuz" derdi — oysa kaybolan şey bir bilgi ya da bir
       EYLEMDİR. Dekoratif gürültü yine dışarıda kalır: `aria-hidden`,
       görünmez ve `clip-path` taşıyan öğeler yukarıda elendi. */
    const tasiyici = metin !== ''
      || TASIYICI_ETIKET.includes(e.tagName.toLowerCase())
      || e.matches('a[href], button, input, select, textarea, [role], [tabindex]');

    if (tasiyici && r.height > 0 && (kap.erisilir || kap.kutu)) {
      const disari = kap.erisilir || !kap.kutu ? 0
        : Math.max(0, kap.kutu.sol - r.left) + Math.max(0, r.right - kap.kutu.sag);
      const uc = icerikUclari(e);
      const tasma = uc.sag === -Infinity ? 0
        : Math.max(0, uc.sag - r.right) + Math.max(0, r.left - uc.sol);
      if (disari > 0 || tasma > 0) {
        adaylar.push({
          yol,
          /* `classList` SVG'de de çalışır; `className` orada bir
             `SVGAnimatedString`tir ve etikete `[object ...]` diye düşer. */
          etiket: `${e.tagName.toLowerCase()}${[...e.classList].map((c) => `.${c}`).join('')}`,
          genislik: Math.round(r.width),
          disari: Math.round(disari),
          tasma: Math.round(tasma),
          kendiOverflow: st.overflowX,
          metinTasmasi: st.textOverflow,
          satirKirpma: Number(st.webkitLineClamp) || 0,
          kapTuru: kap.tur,
          kapMetinTasmasi: kap.metinTasmasi,
          kapSatirKirpma: kap.satirKirpma,
          /* Ata üç noktası YALNIZ satır içi metni yönetir; blok çocuk ya
             da yer değiştiren öğe (img/svg/canvas/video/iframe/object,
             form denetimi) onun kapsamında değildir. */
          kendiGorunum: st.display,
          yerGecen: TASIYICI_ETIKET.includes(e.tagName.toLowerCase())
            || e.matches('input, select, textarea, button'),
          erisilir: kap.erisilir,
          metin: metin === ''
            ? `‹metinsiz ${e.tagName.toLowerCase()}${e.getAttribute('aria-label') ? ` · ${e.getAttribute('aria-label')}` : ''}›`
            : metin.slice(0, 40).replace(/\s+/g, ' '),
        });
      }
    }

    /* Kırpma durumu çocuklara taşınır ve her zaman EN YAKIN kaba göre
       kurulur. Erişilebilirlik YAPIŞKAN DEĞİLDİR: bir kaydırma kabının
       içindeki `overflow: hidden` kap, kendi içeriğini yine kırpar ve
       dıştaki kabı kaydırmak onu geri getirmez. Eskiden `erisilir`
       aşağıya taşınıyordu ve bu, iç içe kaplarda kapıyı kör bırakıyordu.

       Ters yön de doğrudur ve ayrı ölçülür: iç kaydırma kabının KENDİSİ
       dıştaki `hidden` tarafından kesiliyorsa, o kabın kendi satırında
       `disari` ile yakalanır. */
    let altKap = kap;
    if (st.overflowX !== 'visible') {
      altKap = kaydiranKaplar.includes(st.overflowX)
        ? { erisilir: true, tur: null, kutu: null }
        : {
          erisilir: false,
          tur: st.overflowX,
          kutu: { sol: r.left, sag: r.right },
          /* Kırpan kabın KENDİ kesme işareti aşağı taşınır: üç nokta,
             kestiği çocuğu da duyurur. */
          metinTasmasi: st.textOverflow,
          satirKirpma: Number(st.webkitLineClamp) || 0,
        };
    }
    for (let i = 0; i < e.children.length; i += 1) gez(e.children[i], [...yol, i], altKap);
  };

  const kok = { erisilir: false, tur: null, kutu: null };
  for (let i = 0; i < document.body.children.length; i += 1) gez(document.body.children[i], [i], kok);
  return adaylar;
}

/* Sayfa bağlamında koşar: KARAR VERMEZ, akış içi taşıyıcı ÇİFTLERİNİN
   ham kesişme geometrisini döner. Karar `ortusmeKarari` içindedir.

   Aday TANIMI bilerek dardır: doğrudan metin düğümü taşıyan öğeler ve
   görsel taşıyıcılar. `textContent` kullanılsaydı her sarmalayıcı da
   aday olur ve her ata-torun çifti "örtüşüyor" görünürdü.

   AKIŞ BAĞLAMI: her adaya en yakın akış-dışı atasının kimliği yazılır.
   İki aday aynı bağlamdaysa ikisini de AYNI yerleşim koymuştur; kesişme
   o yerleşimin kusurudur. Farklıysa biri kasıtlı bir katmandır. */
function ortusmeOlcumleri(tasiyiciEtiket) {
  /* Kimlik SAYFANIN YAPISINDAN üretilir, kutu ENİNDEN değil. Öteki iki
     ölçüde hedef `etiket@kutuEni`dir ve orada en yerleşimden gelir
     (sabit sütun, sabit panel). Örtüşmede İKİ tarafın da eni METİNDEN
     gelebilir ve ölçüldü: aynı kalıbın üç kaydında ikinci düğme
     `button@102px` ve `button@101px` çıkıyor — kayıt sayacı etikete
     yazıldığı için. Kimliği ene bağlamak satırı her tohumda "yeni"
     gösterirdi. Kural `erisim-axe.mjs`'teki ile AYNIDIR ve aynı
     sebepten: en fazla dört kademe, `etiket` + sıralı sınıflar. */
  /* `classList` SVG'de de çalışır; `className` ÇALIŞMAZ — orada bir
     `SVGAnimatedString` nesnesidir ve etikete `[object SVGAnimatedString]`
     diye düşer (ölçüldü, /harita). */
  const parca = (e) => e.tagName.toLowerCase()
    + [...e.classList].sort().map((c) => `.${c}`).join('');
  const etiketle = (e) => e.tagName.toLowerCase()
    + [...e.classList].map((c) => `.${c}`).join('');
  const yapisalYol = (e) => {
    const p = [];
    for (let n = e, i = 0; n && n !== document.body && i < 4; n = n.parentElement, i += 1) {
      p.unshift(parca(n));
    }
    return p.join(' > ');
  };
  /* AKIŞTAN ÇIKAN yalnız KONUMLANDIRILMIŞ ve KAYAN kutulardır.
     `transform` ve offsetli `position: relative` BU LİSTEDE DEĞİLDİR ve
     olmamalı: ikisi de öğeyi akıştan çıkarmaz — yerini korur, yalnız
     BOYANDIĞI yeri kaydırır. Tam da bu yüzden komşusunun üstüne binerler
     ve bu, kapının görmesi gereken kusurun ta kendisidir. İlk hâl ikisini
     de muaf sayıyordu; `transform` yaygın olduğu için (ortalamada
     `translate(-50%)`, animasyon) koca bir aile kör kalıyordu — örneğin
     topoloji düğümlerinin hepsi ayrı bağlama düşüp hiç karşılaştırılmıyordu
     (PR #29 incelemesi). */
  const AKIS_DISI = ['absolute', 'fixed', 'sticky'];
  const akistanCikar = (st) => AKIS_DISI.includes(st.position) || st.float !== 'none';

  const adaylar = [];
  let baglamSayaci = 0;
  const gez = (e, baglam) => {
    const st = getComputedStyle(e);
    if (st.display === 'none' || st.visibility !== 'visible' || Number(st.opacity) === 0) return;
    if (e.getAttribute('aria-hidden') === 'true') return;
    if (st.clipPath !== 'none') return;
    const kendiBaglam = akistanCikar(st) ? (baglamSayaci += 1) : baglam;

    const r = e.getBoundingClientRect();
    const etiketAdi = e.tagName.toLowerCase();
    /* DOĞRUDAN metin düğümü: sarmalayıcılar aday olmaz. */
    let dogrudanMetin = '';
    for (const d of e.childNodes) {
      if (d.nodeType === 3) dogrudanMetin += d.nodeValue;
    }
    dogrudanMetin = dogrudanMetin.trim();
    /* Taşıyıcı tanımı KIRPILMA ölçüsüyle aynıdır. Yalnız "doğrudan metin
       ya da görsel" deseydik girdi, seçim kutusu, metin alanı ve yalnız
       simge taşıyan düğme aday olmazdı — oysa bir girdinin komşusunun
       altına girmesi tam olarak kusurdur (PR #29 incelemesi). */
    /* SVG'NİN İÇİ CSS AKIŞI DEĞİLDİR. `<svg>` öğesinin kendisi akıştadır
       ve komşusuyla örtüşmesi ölçülür; İÇİNDEKİLER ise SVG koordinat
       sistemiyle (cx/cy, viewBox) yerleşir — onları "aynı yerleşim
       algoritması koydu" diye karşılaştırmak kategori hatasıdır.
       ÖLÇÜLDÜ: bu eleme olmadan /harita'da 9 "bulgu" çıkıyor ve hepsi
       birbirine yakın şehirlerin harita işaretleri; kusur değil, haritanın
       kendisi. Grafik etiketlerinin çakışması ayrı bir ölçünün konusudur
       ve bu kapı onu iddia etmez. */
    const svgIcinde = etiketAdi !== 'svg' && !!e.closest?.('svg');
    const tasiyici = !svgIcinde && (dogrudanMetin !== ''
      || tasiyiciEtiket.includes(etiketAdi)
      || e.matches('a[href], button, input, select, textarea, [role], [tabindex]'));
    if (tasiyici && r.width > 0 && r.height > 0) {
      adaylar.push({
        el: e,
        baglam: kendiBaglam,
        etiket: etiketle(e),
        genislik: Math.round(r.width),
        kutu: { s: r.left, sg: r.right, u: r.top, a: r.bottom },
        /* SATIR PARÇALARI. Satır içi bir öğenin `getBoundingClientRect`i
           bütün satır kutularının BİRLEŞİMİDİR: iki satıra sarılan bir
           `<span>`in kutusu, ilk satırın sağındaki boşluğu da kapsar ve
           oraya düşen komşusuyla "kesişiyor" görünür. Ölçüldü: /aktivite
           ve /sistem/bilesenler'deki bütün bulgular bu yanlış alarmdı.
           Öğe gerçekte satır kutularını kaplar; karşılaştırma da onlar
           üzerinden yapılır. */
        parcalar: [...e.getClientRects()].map((p) => ({
          s: p.left, sg: p.right, u: p.top, a: p.bottom,
        })),
        yapisal: yapisalYol(e),
        metin: dogrudanMetin === ''
          ? `‹metinsiz ${etiketAdi}›`
          : dogrudanMetin.slice(0, 32).replace(/\s+/g, ' '),
      });
    }
    for (let i = 0; i < e.children.length; i += 1) gez(e.children[i], kendiBaglam);
  };
  for (let i = 0; i < document.body.children.length; i += 1) gez(document.body.children[i], 0);

  /* Çiftler yalnız AYNI akış bağlamı içinde aranır; her bağlam üst
     kenara göre sıralanır ve süpürme ile karşılaştırma sayısı düşer. */
  const gruplar = new Map();
  for (const a of adaylar) {
    if (!gruplar.has(a.baglam)) gruplar.set(a.baglam, []);
    gruplar.get(a.baglam).push(a);
  }
  /* Çiftler TOPLANIRKEN yapısal hedefe göre tekilleştirilir. Ham liste
     tutulup sonra tekilleştirilseydi tekrarlayan satırlar tavanı tek
     başına doldurur ve sayfanın aşağısındaki GERÇEKTEN YENİ bir örtüşme
     hiç ölçülmezdi (PR #29 incelemesi). Tavan artık AYRI hedef çifti
     sayar; ona ulaşmak olağan değildir ve KIRIK TARAMA sayılır — kısmi
     bir sonucu "başarılı" diye döndürmek, ölçmediğini ölçtüm demektir. */
  const kova = new Map();
  let dolu = false;
  for (const grup of gruplar.values()) {
    if (dolu) break;
    grup.sort((x, y) => x.kutu.u - y.kutu.u);
    for (let i = 0; i < grup.length; i += 1) {
      for (let j = i + 1; j < grup.length; j += 1) {
        const a = grup[i];
        const b = grup[j];
        if (b.kutu.u >= a.kutu.a) break;
        /* ATA-TORUN çifti örtüşme değildir: atanın kutusu akış içi
           çocuğunu ZATEN kapsar. Doğrudan metni VE eleman çocuğu olan
           öğeler (`<a>DEMO<span>alt</span></a>`) ikisi de aday olur ve
           bu eleme olmadan her biri kendi çocuğuyla "örtüşür" — ilk
           koşuda 69 rotanın 69'unda çıkan yanlış alarm buydu. */
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        /* Kesişme SATIR PARÇALARI arasında aranır, birleşim kutularında
           değil; en kötü parça çifti raporlanır. */
        let en = 0;
        let boy = 0;
        for (const pa of a.parcalar) {
          for (const pb of b.parcalar) {
            const e2 = Math.min(pa.sg, pb.sg) - Math.max(pa.s, pb.s);
            const b2 = Math.min(pa.a, pb.a) - Math.max(pa.u, pb.u);
            if (e2 > 0 && b2 > 0 && e2 * b2 > en * boy) { en = e2; boy = b2; }
          }
        }
        if (en <= 0 || boy <= 0) continue;
        const anahtar = [a.yapisal, b.yapisal].sort().join(' ↔ ');
        const onceki = kova.get(anahtar);
        if (onceki) {
          onceki.adet += 1;
          /* En kötü kesişme raporlanır; tavan VARLIK olduğu için bu sayı
             yalnız insana bakar. */
          if (en * boy > onceki.en * onceki.boy) { onceki.en = Math.round(en); onceki.boy = Math.round(boy); }
          continue;
        }
        kova.set(anahtar, {
          akisDisi: false,
          adet: 1,
          en: Math.round(en),
          boy: Math.round(boy),
          a: { etiket: a.etiket, genislik: a.genislik, yapisal: a.yapisal, metin: a.metin },
          b: { etiket: b.etiket, genislik: b.genislik, yapisal: b.yapisal, metin: b.metin },
        });
        if (kova.size >= 400) { dolu = true; break; }
      }
      if (dolu) break;
    }
  }
  return { ciftler: [...kova.values()], dolu };
}

const tarayici = await chromium.launch({ executablePath: tarayiciYolu() });
const kusurlar = [];
const kirpilmalar = [];
const ortusmeler = [];
const yuzeyKirigi = [];
/** Beyan edilmemiş ama oturumsuz açık yüzeyler — `null` = henüz koşmadı. */
let capraz = null;
let olculen = 0;

/** Tek rotayı tek bantta ölçer. `nobetci` verilirse yüzeyin GERÇEKTEN o
    yüzey olduğu ayrıca kanıtlanır (oturumsuz taramada oturum çerezi
    sızarsa `/giris` panoya yönlenir ve kapı sessizce panoyu ölçerdi). */
async function rotayiOlc(sayfa, bant, yol, { nobetci = null, beklenenKod = 200, ctaTakip = false } = {}) {
  const yanit = await sayfa.goto(`${KOK}${yol}`, { waitUntil: 'networkidle' });
  /* Sinematik giriş formdan ÖNCE durur (PR #28); kullanıcının izlediği
     yolu izleriz. Bu adım OLMADAN kapı giriş yüzeyini ölçer ve FORMU hiç
     görmez — oysa ölçülüp düzeltilen yerleşim kusuru formdaydı. */
  if (ctaTakip) {
    const platformaGir = sayfa.getByRole('link', { name: 'Platforma Gir' });
    if (await platformaGir.isVisible()) await platformaGir.click();
    await sayfa.locator('input[type=email]').waitFor({ state: 'visible' }).catch(() => {});
    await sayfa.waitForTimeout(250);
  }
  /* Yanlış yüzeyi ölçmek, ölçmemekten beterdir: 404/500 gövdesi ya da
     giriş ekranı taşmaz ve kapı yeşil kalır (axe kapısıyla aynı kural).
     Beklenen kod BEYAN EDİLİR: 404 yüzeyinin kendisi ölçülürken 404
     doğru cevaptır, 200 ise yanlış yüzeydir. */
  const kod = yanit?.status() ?? 0;
  const karar = yonlendirmeKarari(yol, new URL(sayfa.url()).pathname);
  let yuzeyHatasi = kod !== beklenenKod ? `HTTP ${kod} (beklenen ${beklenenKod})` : (karar.kusur ?? null);
  if (!yuzeyHatasi && nobetci && (await sayfa.locator(nobetci).count()) === 0) {
    yuzeyHatasi = `nöbetçi yok (${nobetci}) — yanlış yüzey`;
  }
  if (yuzeyHatasi) { yuzeyKirigi.push({ bant: bant.ad, yol, sebep: yuzeyHatasi }); return; }
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
  if (olcum) kusurlar.push({ bant: bant.ad, bantEn: bant.en, yol, ...olcum });

  /* İkinci kusur türü: taşma sayfayı kaydırmasa da içerik kayıp mı. */
  await sayfa.addScriptTag({ content: `window.__kirpilmaOlcumleri = ${kirpilmaOlcumleri.toString()};` });
  const adaylar = await sayfa.evaluate((k) => window.__kirpilmaOlcumleri(k), [...KAYDIRAN_KAPLAR]);
  const kirpilan = enDistakiKirpilmalar(
    adaylar.map((a) => ({ ...a, karar: kirpilmaKarari(a) })).filter((a) => a.karar.kusur),
  );
  /* Aynı kusurun her SATIRI ayrı öğe olarak sayılırsa ölçüm veriye
     bağımlı olur: kütükte 8 satır varsa 8, 23 satır varsa 23 çıkar
     ve borç tavanı tohum verisi değişince kayar (ölçüldü: /saglik
     yerelde 8, CI'da 23). Kusur, satır sayısı değil TÜRDÜR — aynı
     etiket + aynı kırpılma türü tek imzadır. */
  const imzalar = new Map();
  for (const o of kirpilan) {
    /* İmzaya kutu ENİ de girer. Yalnız etiket + tür olsaydı, aynı
       etiketle kırpılan YENİ bir sütun mevcut imzanın arkasına
       saklanırdı. Kutu eni yerleşimden gelir (`table-layout: fixed`
       sütun genişliği), satır SAYISINDAN değil: tekrarlayan satırlar
       tek imzada birleşir, yapısal olarak yeni bir kırpma ayrı imza
       olur. Kırpılan px imzaya GİRMEZ — o, metin uzunluğuyla yani
       veriyle değişir. */
    const anahtar = `${o.etiket}|${o.karar.tur}|${o.genislik}`;
    const v = imzalar.get(anahtar) ?? { ...o, adet: 0 };
    v.adet += 1;
    imzalar.set(anahtar, v);
  }
  if (kirpilan.length > 0) {
    kirpilmalar.push({
      bant: bant.ad, bantEn: bant.en, yol, ogeler: [...imzalar.values()], ornek: kirpilan.length,
    });
  }

  /* Üçüncü kusur türü: içerik KAYIP değil, ama okunmuyor. */
  await sayfa.addScriptTag({ content: `window.__ortusmeOlcumleri = ${ortusmeOlcumleri.toString()};` });
  const ortusme = await sayfa.evaluate(
    (t) => window.__ortusmeOlcumleri(t), TASIYICI_ETIKETLER,
  );
  /* Tavana ulaşmak KIRIK TARAMADIR: kısmi bir sonucu "başarılı" diye
     saymak, ölçmediğini ölçtüm demektir. */
  if (ortusme.dolu) {
    yuzeyKirigi.push({ bant: bant.ad, yol, sebep: 'örtüşme tavanı doldu — tarama eksik' });
  }
  /* Ölçü birimi VARLIK: aynı çiftin kaç kez çıktığı tekrarlayan satır
     sayısına, yani tohuma bağlıdır; "bu çift burada örtüşüyor" değildir.
     Tekilleştirme sayfa bağlamında YAPILDI; burada yalnız karar süzülür. */
  const kusurlu = ortusme.ciftler
    .map((c) => ({ ...c, karar: ortusmeKarari(c), hedef: ortusmeHedefi(c.a, c.b) }))
    .filter((c) => c.karar.kusur);
  if (kusurlu.length > 0) {
    ortusmeler.push({
      bant: bant.ad,
      bantEn: bant.en,
      yol,
      ogeler: kusurlu,
      ornek: kusurlu.reduce((t, c) => t + c.adet, 0),
    });
  }
}
try {
  for (const bant of BANTLAR) {
    const baglam = await tarayici.newContext({ viewport: { width: bant.en, height: bant.boy } });
    const sayfa = await baglam.newPage();
    await girisYap(sayfa, KOK);
    /* Oturumsuz yüzeyler bu döngüde ATLANIR: giriş yapmış bağlam onları
       hiç göremez, sunucu panoya yönlendirir ve tarama KIRIK sayılırdı. */
    for (const yol of ROTALAR.filter((y) => !OTURUMSUZ_YOLLAR.has(y))) {
      await rotayiOlc(sayfa, bant, yol);
    }
    await baglam.close();

    /* Oturumsuz yüzeyler TEMİZ bir bağlamda ölçülür — aynı bağlamda
       kalsaydı çerez `/giris`i panoya yönlendirir ve ölçüm yine
       yapılamazdı. */
    /* Bağlam BEYANDAN BAĞIMSIZ açılır. `OTURUMSUZ.length > 0` koşuluna
       bağlanmış hâli bir kaçış yoluydu: listeyi BOŞALTMAK çapraz kontrolü
       de susturuyor, iki kapı da her oturumsuz yüzeyi atlayıp yeşil
       çıkıyordu — listeyi silmenin kapıyı yıkması gerekirken susturması,
       borç listesinde kapatılan kaçışın aynısı. Çapraz kontrol listeye
       DEĞİL, diske bakar; boş liste onun cevabını değiştirmez, yalnız
       "beyan edilmemiş" sayısını büyütür. */
    if (!rotaBayragiVar() || OTURUMSUZ.length > 0) {
      const temiz = await tarayici.newContext({ viewport: { width: bant.en, height: bant.boy } });
      const s2 = await temiz.newPage();
      for (const r of OTURUMSUZ) {
        await rotayiOlc(s2, bant, r.yol, { nobetci: r.nobetci, beklenenKod: r.kod ?? 200 });
        /* İki yüzeyli rota: CTA'dan sonraki hâl AYRI ölçülür. */
        if (r.ctaTakip) {
          await rotayiOlc(s2, bant, r.yol, {
            nobetci: r.formNobetci, beklenenKod: r.kod ?? 200, ctaTakip: true,
          });
        }
      }
      /* ÇAPRAZ KONTROL bir kez koşar (yetki banda bağlı değildir). */
      if (!capraz && !rotaBayragiVar()) {
        capraz = await oturumsuzAcikYuzeyler(s2, DINAMIK.url, KOK);
      }
      await temiz.close();
    }
  }
} finally {
  await tarayici.close();
}

/* Çözülemeyen dinamik rota bir UYARI DEĞİL, KIRIK TARAMADIR: taranmayan
   bir ekran "kusursuz" demek değildir ve tam da bu kapının kapatmak için
   var olduğu kör noktadır (tablo/kolon yeniden adlandırılır, tohum tablosu
   boşalır, veritabanı okunamaz — kapı yeşil kalırdı). `--rota=` ile kapsam
   ELLE daraltıldıysa dinamikler zaten istenmemiştir; orada kırık sayılmaz. */
const DINAMIK_KIRIK = !rotaBayragiVar() && DINAMIK.atlanan.length > 0;
for (const a of DINAMIK.atlanan) {
  console.error(`  DİNAMİK ROTA TARANMADI · ${a.rota} · ${a.sebep}`);
}

const ROTA_SAYISI = ROTALAR.filter((y) => !OTURUMSUZ_YOLLAR.has(y)).length + OTURUMSUZ.length;

/* ── ÖLÇÜM KAPSAMI TABANI ─────────────────────────────────────────────
   Cırcır BORÇ için tavan tutar; bu taban KAPSAM için taban tutar. Kusur
   sayısı sıfır olabilir; ÖLÇÜM sayısı olamaz — sıfır ölçümle "kusur yok"
   demek, hiçbir şeye bakmadan temiz raporlamaktır
   (`arac/olcum-tabani.mjs` başlığındaki ölçülmüş olay). Taban ÖNCE
   bakılır: geçersiz bir ölçümün borç kararı da geçersizdir. */
if (process.argv.includes('--taban-yaz')) {
  const { onceki, yeni } = tabanYaz('tasma.olcum', olculen, { sebep: sebepBayragi(process.argv) });
  console.log(`taban güncellendi: tasma.olcum ${onceki ?? '(yok)'} → ${yeni}`);
  process.exit(0);
}
try {
  tabanDogrula('tasma.olcum', olculen);
} catch (e) {
  console.error(`\n${e.message}`);
  process.exit(1);
}

const bas = `yatay-tasma: ${olculen} ölçüm · ${BANTLAR.length} bant × ${ROTA_SAYISI} rota`
  + (OTURUMSUZ.length > 0 ? ` (${OTURUMSUZ.length} oturumsuz)` : '');
console.log(`${bas} · taşan rota ${kusurlar.length} · kırpılan içerik ${kirpilmalar.length}`
  + ` · örtüşen içerik ${ortusmeler.length}`);

/* Ham bulgular her zaman YAZILIR — izin listesi bulguyu gizlemez,
   yalnız kapıyı yakıp yakmayacağını söyler. */

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
  console.error(`  [KIRPILAN İÇERİK] ${k.bant} · ${k.yol} → ${k.ogeler.length} kusur türü`
    + ` · ${k.ornek} öğe erişilemiyor`);
  for (const o of k.ogeler) {
    console.error(`      [${o.karar.tur}] ${o.etiket} ×${o.adet} · kutu ${o.genislik}px · ${o.karar.sebep}`);
    console.error(`          "${o.metin}"`);
  }
}

for (const k of ortusmeler) {
  console.error(`  [ÖRTÜŞEN İÇERİK] ${k.bant} · ${k.yol} → ${k.ogeler.length} kusur türü`
    + ` · ${k.ornek} çift kesişiyor`);
  for (const o of k.ogeler) {
    console.error(`      ${o.a.etiket} ×${o.adet} · ${o.karar.sebep}`);
    console.error(`          "${o.a.metin}"  ⊗  ${o.b.etiket} · "${o.b.metin}"`);
  }
}

/* ── Kalite borcu cırcırı ─────────────────────────────────────────────
   Kapı BUGÜN bloklayıcıdır; bugünün açık bulguları izin listesinde
   yazılıdır ve liste yalnız küçülebilir (arac/kalite-borcu.json). */
/* Aynı kalıbın birkaç örneği taranır (`/tesisler/[id]` × 3). Borç anahtarı
   kalıptır, yani aynı anahtarda birden çok bulgu oluşur; tavan EN KÖTÜ
   örneğe göre tutulur. Toplasaydık ölçü örnek sayısına, yani tohuma
   bağlanırdı; ilkini alsaydık kusurlu örnek temiz örneğin arkasına
   saklanırdı — ikisi de bu turda düzeltilen hataların aynısı olurdu. */
function enKotuyeIndirge(bulgular) {
  const en = new Map();
  for (const b of bulgular) {
    const anahtar = borcAnahtari(b);
    const v = en.get(anahtar);
    if (!v || b.olcum > v.olcum) en.set(anahtar, { ...b, ornek: (v?.ornek ?? 0) + 1 });
    else en.set(anahtar, { ...v, ornek: v.ornek + 1 });
  }
  return [...en.values()];
}

/* Borç anahtarı KALIBA yazılır (`/tesisler/[id]`), somut URL'e değil:
   tohum kimlikleri her seed'de değişir. */
const kalip = kalipCozucu(DINAMIK);
/* Her HEDEF ayrı bulgudur — tek satırda toplanmaz. Toplanınca hedef
   kimliği anahtardan düşüyor ve bir kırpma ötekinin yerine geçebiliyordu
   (bkz. `borcAnahtari` gerekçesi). `kirpilan-icerik` ölçüsü artık
   VARLIKTIR (1): "bu hedef burada kırpılıyor". Örnek sayısı satır
   sayısına, yani tohuma bağlı olurdu; büyümeyi ALT KÜME dişi yakalar —
   yeni bir hedef, yeni bir satır demektir. */
const bulgular = [
  ...kusurlar.map((k) => ({
    kapi: 'tasma', tur: 'sayfa-kayiyor', rota: kalip(k.yol), bant: k.bantEn,
    hedef: tasmaHedefi(k.suclular[0]), olcum: k.tasma, birim: 'px',
    not: k.suclular[0] ? `"${k.suclular[0].metin}"` : undefined,
  })),
  ...kirpilmalar.flatMap((k) => k.ogeler.map((o) => ({
    kapi: 'tasma', tur: 'kirpilan-icerik', rota: kalip(k.yol), bant: k.bantEn,
    hedef: tasmaHedefi(o), olcum: 1, birim: 'kırpma',
    not: o.karar.tur,
  }))),
  /* Örtüşme de VARLIKTIR (1): kesişme pikselleri metin uzunluğuyla,
     yani veriyle değişir — tavana girseydi tohum değişince kayardı. */
  ...ortusmeler.flatMap((k) => k.ogeler.map((o) => ({
    kapi: 'tasma', tur: 'ortusen-icerik', rota: kalip(k.yol), bant: k.bantEn,
    hedef: o.hedef, olcum: 1, birim: 'örtüşme',
    not: `${o.a.etiket} ⊗ ${o.b.etiket}`,
  }))),
];
const borcKapali = borcuUygula(enKotuyeIndirge(bulgular), { kapi: 'tasma' });
if (DINAMIK_KIRIK) {
  console.error(`\nKIRIK TARAMA · ${DINAMIK.atlanan.length} dinamik rota ölçülemedi`
    + ' — izin listesine giremez, kapı KIRMIZIDIR.');
}
if (yuzeyKirigi.length > 0) {
  console.error(`\nKIRIK TARAMA · ${yuzeyKirigi.length} rota YANLIŞ YÜZEY döndürdü`);
  for (const k of yuzeyKirigi) console.error(`  ${k.bant} · ${k.yol} · ${k.sebep}`);
}
/* Beyan edilmemiş açık yüzey, listenin EKSİK olduğunun kanıtıdır ve
   izin listesine giremez: ölçülmeyen bir yüzey "borç" değildir. */
if (capraz && capraz.length > 0) {
  console.error(`\nOTURUMSUZ LİSTE EKSİK · ${capraz.length} yüzey beyan edilmeden açık`);
  for (const a of capraz) console.error(`  ${a.yol} → HTTP ${a.kod} · varılan ${a.varilan}`);
  console.error('  Bu yüzeyler oturum istemiyor ama iki kapı da onları oturumlu');
  console.error('  tarıyor, yani hiç ölçmüyor. `kosu-ortak.mjs → OTURUMSUZ_ROTALAR`.');
}
process.exit(
  borcKapali || DINAMIK_KIRIK || yuzeyKirigi.length > 0 || (capraz?.length ?? 0) > 0 ? 1 : 0,
);
