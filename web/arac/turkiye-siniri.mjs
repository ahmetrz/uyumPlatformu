#!/usr/bin/env node
/* Türkiye sınırı — Natural Earth'ten TEK ÜLKE poligonu çıkarır.

   ── NİÇİN BÖYLE BİR ARAÇ ──────────────────────────────────────────────
   Üretilen dosya elle düzenlenmez; kaynağı, ölçeği, kırpma çerçevesi ve
   sadeleştirme toleransı ÜRETİM ANINDA kayda geçer. Sınır verisi elle
   dokunulabilir olsaydı "bu kıyı nereden geldi" sorusunun cevabı
   kalmazdı — `mantik.ts` zaten "hafızadan çizilmiş bir sınır, ekrandaki
   her şeyi şüpheli hâle getirir" diyor.

   ── KAYNAK VE LİSANS ──────────────────────────────────────────────────
   Natural Earth 1:50m Admin 0 Countries. **Kamu malı**: izin gerekmez,
   atıf zorunlu değil, ticari kullanım serbest
   (naturalearthdata.com/about/terms-of-use). Alternatifler bilerek
   elendi: GADM ticari kullanımı izne bağlar, OSM türevleri ODbL ile
   türev veritabanında paylaş-benzer yükümlülüğü doğurur.

   ── YALNIZ TÜRKİYE ────────────────────────────────────────────────────
   Dünya altlığı DEĞİL, tek ülke poligonu çizilir. Natural Earth sınırları
   *de facto* çizer; komşu ya da ihtilaflı sınır çizmediğimiz için o konu
   ekranda hiç doğmaz. Haritanın işi Zorlu'nun santrallerini göstermektir.

   ── SADELEŞTİRME ÖLÇÜLÜ SEÇİLİR ───────────────────────────────────────
   Tuval 960×420, çerçeve 19,5° × 6,8°; iç alan 904×364px. Yani
   1px ≈ 0,0216° boylam · 0,0187° enlem. Tolerans bunun ALTINDA tutulur
   ki sadeleştirme ekranda görünmesin: kıyıyı "yaklaştırmak" ile
   "değiştirmek" arasındaki fark budur.

   Kullanım:
     node arac/turkiye-siniri.mjs --kaynak /yol/ne_50m_admin_0_countries.geojson
     node arac/turkiye-siniri.mjs --kaynak <yol> --tolerans 0.01
*/

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { WEB, bayrakDegeri } from './kosu-ortak.mjs';

/* Çerçeve `app/(tam)/harita/mantik.ts` içindeki `CERCEVE` ile AYNI
   olmalıdır. Burada tekrar yazılıyor çünkü bu araç .mjs'tir ve TS
   modülünü içe aktaramaz; ayrışma `tests/turkiye-siniri.test.ts`
   tarafından yakalanır ve "yeniden üret" der. */
const CERCEVE = { batı: 25.5, doğu: 45.0, güney: 35.6, kuzey: 42.4 };

/** Varsayılan tolerans (derece) — 1px'in yarısından küçük. */
const VARSAYILAN_TOLERANS = 0.008;

const kaynakYolu = bayrakDegeri('--kaynak');
if (!kaynakYolu) {
  console.error('Kaynak gerekli: --kaynak <ne_50m_admin_0_countries.geojson>');
  console.error('İndirme: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson');
  process.exit(2);
}
const TOLERANS = Number(bayrakDegeri('--tolerans') ?? VARSAYILAN_TOLERANS);

/* ── Kırpma · Sutherland–Hodgman ───────────────────────────────────────
   Dikdörtgen dışbükeydir, algoritma burada geçerlidir. Kırpma bir güvenlik
   ağıdır: Türkiye zaten çerçeveye sığar, ama sığmayan bir nokta tuvalin
   dışına boyanırdı ve SVG onu kırpmazdı. */
function kenardaIcerde(p, kenar) {
  if (kenar === 'batı') return p[0] >= CERCEVE.batı;
  if (kenar === 'doğu') return p[0] <= CERCEVE.doğu;
  if (kenar === 'güney') return p[1] >= CERCEVE.güney;
  return p[1] <= CERCEVE.kuzey;
}

function kesisim(a, b, kenar) {
  const [ax, ay] = a; const [bx, by] = b;
  if (kenar === 'batı' || kenar === 'doğu') {
    const x = kenar === 'batı' ? CERCEVE.batı : CERCEVE.doğu;
    return [x, ay + ((by - ay) * (x - ax)) / (bx - ax)];
  }
  const y = kenar === 'güney' ? CERCEVE.güney : CERCEVE.kuzey;
  return [ax + ((bx - ax) * (y - ay)) / (by - ay), y];
}

function kirp(halka) {
  let cikti = halka;
  for (const kenar of ['batı', 'doğu', 'güney', 'kuzey']) {
    const girdi = cikti;
    cikti = [];
    if (girdi.length === 0) break;
    for (let i = 0; i < girdi.length; i += 1) {
      const su = girdi[i];
      const onceki = girdi[(i + girdi.length - 1) % girdi.length];
      const suIcerde = kenardaIcerde(su, kenar);
      const oncekiIcerde = kenardaIcerde(onceki, kenar);
      if (suIcerde) {
        if (!oncekiIcerde) cikti.push(kesisim(onceki, su, kenar));
        cikti.push(su);
      } else if (oncekiIcerde) {
        cikti.push(kesisim(onceki, su, kenar));
      }
    }
  }
  return cikti;
}

/* ── Sadeleştirme · Douglas–Peucker ────────────────────────────────── */
function dikUzaklik(p, a, b) {
  const [px, py] = p; const [ax, ay] = a; const [bx, by] = b;
  const dx = bx - ax; const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function sadelestir(noktalar, tolerans) {
  if (noktalar.length < 3) return noktalar;
  let enUzak = 0; let indeks = 0;
  for (let i = 1; i < noktalar.length - 1; i += 1) {
    const d = dikUzaklik(noktalar[i], noktalar[0], noktalar[noktalar.length - 1]);
    if (d > enUzak) { enUzak = d; indeks = i; }
  }
  if (enUzak <= tolerans) return [noktalar[0], noktalar[noktalar.length - 1]];
  return [
    ...sadelestir(noktalar.slice(0, indeks + 1), tolerans).slice(0, -1),
    ...sadelestir(noktalar.slice(indeks), tolerans),
  ];
}

/** Kapalı halkayı sadeleştirir; kapanış noktası korunur. */
function halkaSadelestir(halka, tolerans) {
  const acik = halka.length > 1
    && halka[0][0] === halka[halka.length - 1][0]
    && halka[0][1] === halka[halka.length - 1][1]
    ? halka.slice(0, -1) : halka;
  if (acik.length < 4) return halka;
  const s = sadelestir([...acik, acik[0]], tolerans);
  return s;
}

/** Kabaca alan (derece²) — ayak izi olmayan halkayı elemek için. */
function alan(halka) {
  let a = 0;
  for (let i = 0; i < halka.length - 1; i += 1) {
    a += halka[i][0] * halka[i + 1][1] - halka[i + 1][0] * halka[i][1];
  }
  return Math.abs(a) / 2;
}

/* ── Çıkarma ───────────────────────────────────────────────────────── */
const ham = JSON.parse(readFileSync(kaynakYolu, 'utf8'));
const oznitelik = ham.features.find((f) => f.properties?.ADM0_A3 === 'TUR');
if (!oznitelik) {
  console.error('Kaynakta ADM0_A3 = "TUR" özniteliği bulunamadı. Yanlış dosya olabilir.');
  process.exit(1);
}

const geom = oznitelik.geometry;
const poligonlar = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;

/* Yalnız DIŞ halkalar çizilir. Türkiye'nin iç halkası (delik) yoktur;
   olsaydı sessizce yutmak yerine burada rapor edilirdi. */
let delikSayisi = 0;
const hamHalkalar = [];
for (const pg of poligonlar) {
  pg.forEach((halka, i) => {
    if (i === 0) hamHalkalar.push(halka);
    else delikSayisi += 1;
  });
}

const hamNokta = hamHalkalar.reduce((a, h) => a + h.length, 0);

/* Elenen halka SESSİZCE düşmez: kaç tanesi, niye. */
const elenen = [];
const halkalar = [];
for (const halka of hamHalkalar) {
  const kirpilmis = kirp(halka);
  if (kirpilmis.length < 4) { elenen.push({ neden: 'çerçeve dışında', nokta: halka.length }); continue; }
  const sade = halkaSadelestir(kirpilmis, TOLERANS);
  if (sade.length < 4) { elenen.push({ neden: 'sadeleştirmeden sonra çizilemez', nokta: halka.length }); continue; }
  halkalar.push(sade.map(([x, y]) => [Number(x.toFixed(4)), Number(y.toFixed(4))]));
}
halkalar.sort((a, b) => alan(b) - alan(a));

const nokta = halkalar.reduce((a, h) => a + h.length, 0);

/* ── Yazım ─────────────────────────────────────────────────────────── */
const hedef = path.join(WEB, 'lib', 'cografya', 'turkiyeSiniri.ts');
const govde = `/* ÜRETİLMİŞ DOSYA — elle düzenlemeyin.
   Üreten: arac/turkiye-siniri.mjs

   ── Kaynak ve lisans ──────────────────────────────────────────────────
   Natural Earth 1:50m Admin 0 Countries · ADM0_A3 = "TUR".
   Natural Earth KAMU MALIDIR: izin gerekmez, atıf zorunlu değil, ticari
   kullanım serbest (naturalearthdata.com/about/terms-of-use). Atıf
   zorunlu olmasa da kaynağı yazmak bu ürünün kendi kuralıdır: ekrandaki
   her çizginin nereden geldiği sorulabilir olmalıdır.

   Elenen alternatifler: GADM (ticari kullanım izne tabi), OSM türevleri
   (ODbL · türev veritabanında paylaş-benzer).

   ── Bu poligon NEYİ göstermez ─────────────────────────────────────────
   Dünya altlığı değildir; YALNIZ Türkiye çizilir. Komşu ülke ya da
   ihtilaflı sınır çizilmez.

   ── Doğruluk ──────────────────────────────────────────────────────────
   Sadeleştirme toleransı ${TOLERANS}° seçildi. Tuvalde 1px ≈ 0,0216°
   boylam · 0,0187° enlem olduğu için sapma ekranda bir pikselin altında
   kalır. Bu bir KIYI ÇİZGİSİ DEĞİL, o ölçekte okunabilir bir ülke
   silüetidir; seyrüsefer ya da sınır tespiti için kullanılmaz.

   Ölçüldü: ham ${hamNokta} nokta → ${nokta} nokta · ${halkalar.length} halka
   ${elenen.length ? `· elenen halka: ${elenen.map((e) => `${e.nokta} nokta (${e.neden})`).join(', ')}` : '· elenen halka yok'}
   ${delikSayisi ? `· iç halka (delik): ${delikSayisi} — ÇİZİLMEDİ` : '· iç halka (delik) yok'} */

/** Kırpma çerçevesi — \`app/(tam)/harita/mantik.ts\` içindeki \`CERCEVE\` ile
    aynı olmak ZORUNDADIR; ayrışırsa sınır tuvalden taşar ya da erken
    kesilir. \`tests/turkiye-siniri.test.ts\` bunu doğrular. */
export const SINIR_CERCEVESI = ${JSON.stringify(CERCEVE)} as const;

/** Sadeleştirme toleransı (derece) — üretim anında kaydedildi. */
export const SINIR_TOLERANSI = ${TOLERANS};

/** Dış halkalar, alana göre büyükten küçüğe: [boylam, enlem] çiftleri. */
export const TURKIYE_SINIRI: readonly (readonly (readonly [number, number])[])[] = ${
  `[\n${halkalar.map((h) => `  [${h.map(([x, y]) => `[${x},${y}]`).join(',')}],`).join('\n')}\n]`
};
`;
writeFileSync(hedef, govde);

console.log(`kaynak     : ${kaynakYolu}`);
console.log(`öznitelik  : ${oznitelik.properties.NAME} (${oznitelik.properties.NAME_TR ?? '—'})`);
console.log(`tolerans   : ${TOLERANS}°`);
console.log(`halka      : ${hamHalkalar.length} → ${halkalar.length}`);
console.log(`nokta      : ${hamNokta} → ${nokta}`);
if (delikSayisi) console.log(`iç halka   : ${delikSayisi} (çizilmedi)`);
for (const e of elenen) console.log(`elenen     : ${e.nokta} nokta — ${e.neden}`);
console.log(`yazıldı    : ${path.relative(WEB, hedef)}`);
