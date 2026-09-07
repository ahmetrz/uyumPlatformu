#!/usr/bin/env node
/* axe-core kapısı — WCAG 2.x A/AA ihlal listesi, tüm rotalarda.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   `erisim.mjs` prototiplerin dört bilinen kusurunu ölçer (odak halkası,
   klavye, azaltılmış hareket, renk kanalı). Bu araç geri kalanı için
   axe-core'un kural kümesini çalıştırır: etiketleri olmayan form
   alanları, boş bağlantılar, kontrast, işaret rolü, dil niteliği,
   yinelenen id… Kurallar `wcag2a` + `wcag2aa` etiketleriyle sınırlıdır;
   "en iyi uygulama" kuralları burada raporlanmaz — kapı, uyum
   sözleşmesidir, üslup listesi değil.

   Ciddi (`serious`) ya da kritik (`critical`) etkili bir ihlal varsa
   çıkış kodu 1. `minor`/`moderate` ihlaller yine listelenir — sonraki
   turun işi, bu turun engeli değil.

   Giriş ekranı OTURUMSUZ ölçülür (oturumluyken kendini `/`'a atar).

   ── NİÇİN ÜÇ BANT ─────────────────────────────────────────────────────
   Kapı uzun süre YALNIZ 1440×900'de koştu ve bu onu dar bantta KÖR
   bırakıyordu: erişilebilirlik ihlallerinin bir kısmı yalnız yerleşim
   değişince doğar — dar bantta beliren kaydırma kapları, sarılan
   başlıklar, birbirinin üstüne binen odak halkaları, dokunmatikte
   küçülen hedefler. Bir kapı görmediği kusuru "yok" diye raporlar; o
   yüzden bantlar `yatay-tasma.mjs` ile aynı iki dar bandı da içerir.

   Bant seçimi çok-bantlı öbür kapılarla AYNIDIR (375×780 telefon,
   768×1024 dikey tablet) — iki araç aynı kusuru aynı koşulda görsün.

   Kullanım:
     PORT=3210 node arac/erisim-axe.mjs
     PORT=3210 node arac/erisim-axe.mjs --bant=375
     PORT=3210 node arac/erisim-axe.mjs --rota=/uyum,/riskler --json /yol/axe.json
     npm run tasarim:axe
*/
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  KOK, WEB, bayrakDegeri, dinamikRotalar, girisYap, kalipCozucu, rotaBayragi, rotaBayragiVar,
  rotalarOku, tarayiciYolu,
} from './kosu-ortak.mjs';
import { axeOzeti } from './kalite-kurallari.mjs';
import { yonlendirmeKarari } from './rota-kurallari.mjs';
import { borcuUygula } from './kalite-borcu.mjs';

const GIRIS_ROTASI = '/giris';
/* rotalar.json'daki '' ana ekrandır; giriş listede yoktur, ayrıca eklenir. */
/* Statik liste + tohumdan somutlaşan dinamik rotalar. Dinamikler uzun
   süre dışarıdaydı ve bu, kapıyı KÖR bırakıyordu: altı kayıt detayı
   ekranının hiçbiri taranmıyordu (Tesis 360 dahil). */
const DINAMIK = dinamikRotalar();
const ROTALAR = rotaBayragi([
  GIRIS_ROTASI,
  ...rotalarOku().map((r) => (r === '' ? '/' : r)),
  ...DINAMIK.url,
]);
const JSON_YOLU = bayrakDegeri('--json');

/* `yatay-tasma.mjs` ile aynı iki dar bant + masaüstü tabanı. */
const TUM_BANTLAR = [
  { ad: '1440 · masaüstü', en: 1440, boy: 900 },
  { ad: '768 · dikey tablet', en: 768, boy: 1024 },
  { ad: '375 · telefon', en: 375, boy: 780 },
];
const bantArg = process.argv.find((a) => a.startsWith('--bant='));
const BANTLAR = bantArg
  ? TUM_BANTLAR.filter((b) => bantArg.slice('--bant='.length).split(',').includes(String(b.en)))
  : TUM_BANTLAR;
if (BANTLAR.length === 0) {
  console.error(`--bant= hiçbir banda uymadı. Bantlar: ${TUM_BANTLAR.map((b) => b.en).join(', ')}`);
  process.exit(2);
}
const AXE_YOLU = path.join(WEB, 'node_modules', 'axe-core', 'axe.min.js');
const ETIKETLER = ['wcag2a', 'wcag2aa'];

const b = await chromium.launch({ executablePath: tarayiciYolu() });

async function tara(s, rota) {
  const y = await s.goto(KOK + rota, { waitUntil: 'load' });
  await s.waitForTimeout(450);
  const varilan = new URL(s.url()).pathname;
  await s.addScriptTag({ path: AXE_YOLU });
  const sonuc = await s.evaluate(async (etiketler) => {
    /* `axe` az önce `addScriptTag` ile sayfaya enjekte edildi; burada
       tarayıcı bağlamında küresel olarak vardır. */
    const r = await globalThis.axe.run(document, { runOnly: { type: 'tag', values: etiketler } });
    /* Yalnız gereken alanlar: tam sonuç HTML parçalarıyla şişer. */
    return {
      ihlaller: r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        dugum: v.nodes.length,
        ornek: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
      })),
      gecen: r.passes.length,
      belirsiz: r.incomplete.length,
    };
  }, ETIKETLER);
  const ozet = axeOzeti(sonuc.ihlaller);
  /* Yanlış YÜZEYİ taramak, taramamaktan beterdir: 404/500 gövdesi ya da
     giriş ekranı "yeni ciddi ihlal yok" der ve kapı yeşil kalır. Bu,
     tohumdan somutlaşan detay rotalarında özellikle kritiktir — geçerli
     bir kimlik + bozuk bir işleyici tam olarak bu tuzağı kurar.
     `rota-duman.mjs`'in kuralı burada da geçerlidir: yalnız yazılı
     yönlendirme kabul edilir. */
  const kod = y?.status() ?? 0;
  const karar = yonlendirmeKarari(rota, varilan);
  const yuzeyHatasi = kod !== 200
    ? `HTTP ${kod} — yanlış yüzey tarandı`
    : (karar.kusur ?? null);
  return {
    rota,
    kod,
    varilan: varilan === rota ? null : varilan,
    ...sonuc,
    ciddi: ozet.ciddi.length,
    diger: ozet.diger.length,
    yuzeyHatasi,
  };
}

const rapor = [];
try {
  for (const bant of BANTLAR) {
    /* Her bant KENDİ bağlamında koşar: oturum çerezi bağlama bağlıdır ve
       yerleşim ilk kareden itibaren doğru bantta oturur. */
    const ctx = await b.newContext({ viewport: { width: bant.en, height: bant.boy }, locale: 'tr-TR' });
    const s = await ctx.newPage();
    try {
      if (ROTALAR.includes(GIRIS_ROTASI)) rapor.push({ bant: bant.ad, bantEn: bant.en, ...await tara(s, GIRIS_ROTASI) });
      await girisYap(s, KOK);
      for (const rota of ROTALAR.filter((r) => r !== GIRIS_ROTASI)) {
        try {
          rapor.push({ bant: bant.ad, bantEn: bant.en, ...await tara(s, rota) });
        } catch (e) {
          rapor.push({
            bant: bant.ad, bantEn: bant.en, rota, kod: -1, hata: String(e).slice(0, 160),
            ihlaller: [], ciddi: 0, diger: 0,
          });
        }
      }
    } finally {
      await ctx.close();
    }
  }
} finally {
  await b.close();
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

/* ── Rapor ─────────────────────────────────────────────────────────── */

let ciddiToplam = 0;
let digerToplam = 0;
const kirik = [];
/* Kural kimliğine göre kırılım: aynı ihlalin kaç bantta ve kaç rotada
   çıktığı, tek tek satırlardan okunmayacak kadar dağınıktı. */
const kuralSayaci = new Map();

for (const bant of BANTLAR) {
  const bantRapor = rapor.filter((r) => r.bant === bant.ad);
  if (bantRapor.length === 0) continue;
  console.log(`\n══ ${bant.ad} (${bant.en}×${bant.boy}) ${'═'.repeat(Math.max(0, 46 - bant.ad.length))}`);
  console.log(`${'ROTA'.padEnd(26)} DURUM  CİDDİ  DİĞER  GEÇEN  İHLALLER`);
  for (const r of bantRapor) {
    ciddiToplam += r.ciddi;
    digerToplam += r.diger;
    if (r.hata || r.yuzeyHatasi) kirik.push(r);
    const kusur = [];
    if (r.hata) kusur.push(`tarama kırıldı: ${r.hata}`);
    if (r.yuzeyHatasi) kusur.push(`KIRIK: ${r.yuzeyHatasi}`);
    const ihlalOzet = r.ihlaller.map((i) => `${i.id}[${i.impact}]×${i.dugum}`).join(' ');
    console.log(
      `${r.rota.padEnd(26)} ${String(r.kod).padEnd(6)} ${String(r.ciddi).padStart(5)}  ${String(r.diger).padStart(5)}`
      + `  ${String(r.gecen ?? '-').padStart(5)}  ${[...kusur, ihlalOzet].filter(Boolean).join(' · ')}`,
    );
    for (const i of r.ihlaller) {
      const anahtar = `${i.id}\u0000${i.impact}\u0000${bant.ad}`;
      const kayit = kuralSayaci.get(anahtar)
        ?? { id: i.id, impact: i.impact, bant: bant.ad, rota: 0, dugum: 0, ornek: i.ornek[0] ?? '' };
      kayit.rota += 1;
      kayit.dugum += i.dugum;
      kuralSayaci.set(anahtar, kayit);
      if (i.impact === 'serious' || i.impact === 'critical') {
        console.log(`    ${i.impact.toUpperCase()} ${i.id} — ${i.help}\n      örnek: ${i.ornek.join(' | ')}`);
      }
    }
  }
  const bantCiddi = bantRapor.reduce((t, r) => t + r.ciddi, 0);
  const bantDiger = bantRapor.reduce((t, r) => t + r.diger, 0);
  console.log(`   → ${bant.ad}: rota ${bantRapor.length} · ciddi/kritik ${bantCiddi} · diğer ${bantDiger}`);
}

if (kuralSayaci.size > 0) {
  console.log('\nKURAL KIRILIMI (bant × kural)');
  const sirali = [...kuralSayaci.values()].sort((a, b) => b.dugum - a.dugum || a.id.localeCompare(b.id));
  for (const k of sirali) {
    console.log(`  ${k.bant.padEnd(20)} ${k.id.padEnd(34)} ${k.impact.padEnd(9)}`
      + ` ${String(k.rota).padStart(3)} rota · ${String(k.dugum).padStart(4)} düğüm · örnek: ${k.ornek}`);
  }
}

console.log(`\naxe (${ETIKETLER.join(', ')}): ${BANTLAR.length} bant × ${rapor.length / BANTLAR.length} rota`
  + ` = ${rapor.length} tarama · ciddi/kritik ihlal ${ciddiToplam}`
  + ` · diğer ${digerToplam} · kırık tarama ${kirik.length}`);

if (JSON_YOLU) {
  writeFileSync(JSON_YOLU, JSON.stringify({ kok: KOK, etiketler: ETIKETLER, rotalar: rapor }, null, 2));
  console.log(`JSON → ${JSON_YOLU}`);
}

/* ── Kalite borcu cırcırı ─────────────────────────────────────────────
   Kapı BUGÜN bloklayıcıdır; bugünün açık ihlalleri izin listesinde
   yazılıdır ve liste yalnız küçülebilir (arac/kalite-borcu.json).
   Kırık tarama İZİN LİSTESİNE GİRMEZ: ölçülemeyen bir rota "borç" değil,
   ölçümün kendisinin kırılmasıdır. */
/* Aynı kalıbın birkaç örneği taranır (`/tesisler/[id]` × 3). Borç anahtarı
   kalıptır, yani aynı anahtarda birden çok bulgu oluşur; tavan EN KÖTÜ
   örneğe göre tutulur. Toplasaydık ölçü örnek sayısına, yani tohuma
   bağlanırdı; ilkini alsaydık kusurlu örnek temiz örneğin arkasına
   saklanırdı — ikisi de bu turda düzeltilen hataların aynısı olurdu. */
function enKotuyeIndirge(bulgular) {
  const en = new Map();
  for (const b of bulgular) {
    const anahtar = [b.kapi, b.tur, b.rota, b.bant].join('|');
    const v = en.get(anahtar);
    if (!v || b.olcum > v.olcum) en.set(anahtar, { ...b, ornek: (v?.ornek ?? 0) + 1 });
    else en.set(anahtar, { ...v, ornek: v.ornek + 1 });
  }
  return [...en.values()];
}

/* Borç anahtarı KALIBA yazılır (`/tesisler/[id]`), somut URL'e değil:
   tohum kimlikleri her seed'de değişir. */
const kalip = kalipCozucu(DINAMIK);
const bulgular = rapor.flatMap((r) => r.ihlaller
  .filter((i) => i.impact === 'serious' || i.impact === 'critical')
  .map((i) => ({
    kapi: 'axe', tur: i.id, rota: kalip(r.rota), bant: r.bantEn,
    olcum: i.dugum, birim: 'düğüm', not: i.ornek?.[0],
  })));
const borcKapali = borcuUygula(enKotuyeIndirge(bulgular), { kapi: 'axe' });
if (kirik.length > 0) {
  console.error(`\nKIRIK TARAMA · ${kirik.length} rota ölçülemedi — izin listesine giremez.`);
}
if (DINAMIK_KIRIK) {
  console.error(`\nKIRIK TARAMA · ${DINAMIK.atlanan.length} dinamik rota ölçülemedi`
    + ' — izin listesine giremez, kapı KIRMIZIDIR.');
}
process.exitCode = borcKapali || kirik.length > 0 || DINAMIK_KIRIK ? 1 : 0;
