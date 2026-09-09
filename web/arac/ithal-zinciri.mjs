/* ═══════════════════════════════════════════════════════════════════════
   İTHAL ZİNCİRİ KAPISI — araçların içe aktarımları ÇÖZÜLÜYOR MU

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   9 Eyl 2026: `arac/derleme-ortami.mjs` tamamen değiştirildi ve üç aracın
   ondan aldığı ihraçlar yok oldu:

     kolon-hizasi.mjs   import { ciktiyiDogrula } from './derleme-ortami.mjs'
     statik-kontrol.mjs import { ciktiyiDogrula } from './derleme-ortami.mjs'
     marka-kapisi.mjs   import { yerVarMi }       from './derleme-ortami.mjs'

   HIZLI KÜME GÖRMEDİ. `tsc --noEmit` proje TypeScript'ini denetler,
   `arac/*.mjs` içe aktarım grafiği onun kapsamında değildir; lint de
   çözümleme yapmaz. Kusur ancak `demo:build` (yavaş küme) koşunca
   görünürdü — yani bir PR turu sonra.

   ── NEDEN "HEPSİNİ İMPORT ET" DEĞİL ───────────────────────────────────
   En kısa çözüm her `.mjs`i içe aktarmak olurdu; olmaz. Bu araçların
   çoğu CLI'dır ve içe aktarılınca KOŞAR: `parti-kapanisi.mjs` bütün kapı
   kümesini başlatır, `compose-duman.mjs` docker yığını kaldırır. Kapı,
   ölçtüğü şeyi çalıştırmamalı.

   Bu yüzden kontrol YAPISALDIR: içe aktarım deyimleri okunur, hedef
   çözülür ve ADLI BAĞLARIN hedefte ihraç edildiği doğrulanır. Hiçbir
   modül yürütülmez.

   ── SEZGİSEL DEĞİL ────────────────────────────────────────────────────
   "Bir dosya tamamen değişti mi" gibi bir sezgi yazılmadı: o, kusurun
   BELİRTİSİNİ arar ve bir sonraki sefer başka bir belirtiyle gelir.
   Ölçülen şey kusurun KENDİSİDİR — çözülemeyen içe aktarım.

   Kullanım: node arac/ithal-zinciri.mjs */
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ARAC = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(ARAC, '..');
const gerekli = createRequire(import.meta.url);

/* ── kaynak toplama ──────────────────────────────────────────────────── */

function mjsDosyalari(dizin = ARAC) {
  const cikti = [];
  for (const g of readdirSync(dizin, { withFileTypes: true })) {
    const tam = path.join(dizin, g.name);
    if (g.isDirectory()) { cikti.push(...mjsDosyalari(tam)); continue; }
    if (g.name.endsWith('.mjs')) cikti.push(tam);
  }
  return cikti.sort();
}

/* Yorumlar düşürülür: yoruma alınmış bir içe aktarım çözülmek zorunda
   değildir ve onu kırmızı yakmak kapının kendi yanlış pozitifi olurdu.

   KARAKTER KARAKTER TARAYAN SÜRÜM YAZILDI VE KUSURLU ÇIKTI (ölçüldü): bu
   dosyanın kendi regex literal'i tırnak taşıyor
   (`/from\s*['"]([^'"]+)['"]/`) ve tarayıcı onu DİZE sanıp izini
   kaybediyordu; sonrasındaki blok yorumlar ayıklanmıyor ve kapı kendi
   doküman örneklerini kusur diye sayıyordu — üç yanlış pozitif.

   Bugün iki dar kural var, ikisi de yanlış pozitif üretmeyecek kadar
   sıkı:
     · yalnız TAM SATIR `//` yorumları,
     · yalnız SATIR BAŞINDA (girintili olabilir) açılan `/* … *\/` blokları.
   Bir dizenin içindeki `/*` (örneğin `'tests/**\/*.test.ts'` glob'u)
   böylece yorum sanılmaz — naif bir blok ayıklama tam orada kodu yerdi. */
export function yorumsuz(kaynak) {
  return kaynak
    .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

/** Bir kaynaktaki içe aktarımlar: { belirtec, adlar[], satir }. */
export function ithalatlar(kaynak) {
  const metin = yorumsuz(kaynak);
  const cikti = [];
  const satirNo = (indeks) => metin.slice(0, indeks).split('\n').length;

  /* `import <clause> from '<spec>'` ve `export <clause> from '<spec>'` */
  const kalip = /^(?:import|export)\s+([^'";]*?)\s*from\s*['"]([^'"]+)['"]/gm;
  for (const m of metin.matchAll(kalip)) {
    cikti.push({ belirtec: m[2], adlar: adlariCoz(m[1]), satir: satirNo(m.index) });
  }
  /* Yan etki içe aktarımı: `import '<spec>'` */
  for (const m of metin.matchAll(/^import\s*['"]([^'"]+)['"]/gm)) {
    cikti.push({ belirtec: m[1], adlar: [], satir: satirNo(m.index) });
  }
  /* Dinamik: `import('<spec>')` — yalnız DÜZ dize; değişkenli olan
     statik olarak çözülemez ve çözülemeyeni kırmızı yakmak yanlış olur. */
  for (const m of metin.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    cikti.push({ belirtec: m[1], adlar: [], satir: satirNo(m.index) });
  }
  return cikti;
}

/** `{ a, b as c }` · `X` · `* as ns` · `X, { a }` → doğrulanacak ADLAR. */
function adlariCoz(clause) {
  const c = clause.trim();
  if (c === '' || c.startsWith('*')) return [];
  const adlar = [];
  const suslu = c.match(/\{([^}]*)\}/);
  if (suslu) {
    for (const parca of (suslu[1] ?? '').split(',')) {
      const ad = parca.trim().split(/\s+as\s+/)[0]?.trim();
      if (ad && ad !== 'default') adlar.push(ad);
    }
  }
  /* Varsayılan içe aktarım: süslüden önceki çıplak ad. */
  const varsayilan = (c.split('{')[0] ?? '').split(',')[0]?.trim() ?? '';
  if (varsayilan && !varsayilan.startsWith('*')) adlar.push('default');
  return adlar;
}

/** Bir modülün ihraç ettiği adlar; `export *` zinciri İZLENİR. */
export function ihraclar(dosya, gorulen = new Set()) {
  if (gorulen.has(dosya) || !existsSync(dosya)) return new Set();
  gorulen.add(dosya);
  const metin = yorumsuz(readFileSync(dosya, 'utf8'));
  const adlar = new Set();
  for (const m of metin.matchAll(
    /\bexport\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|class|type|interface|enum)\s+([A-Za-z0-9_$]+)/g,
  )) adlar.add(m[1]);
  for (const m of metin.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const parca of (m[1] ?? '').split(',')) {
      const ad = parca.trim().split(/\s+as\s+/).pop()?.trim();
      if (ad) adlar.add(ad);
    }
  }
  if (/\bexport\s+default\b/.test(metin)) adlar.add('default');
  /* `export * from './x'` — hedefin ihraçları buraya da sayılır. */
  for (const m of metin.matchAll(/\bexport\s*\*\s*from\s*['"]([^'"]+)['"]/g)) {
    const hedef = dosyaCoz(m[1], path.dirname(dosya));
    if (hedef) for (const a of ihraclar(hedef, gorulen)) adlar.add(a);
  }
  return adlar;
}

const UZANTILAR = ['', '.mjs', '.js', '.ts', '.tsx', '/index.ts', '/index.mjs', '/index.js'];

/** Göreli ya da `@/` belirtecini dosyaya çözer; çözülemezse null. */
export function dosyaCoz(belirtec, taban) {
  let ham = belirtec;
  if (ham.startsWith('@/')) ham = path.join(WEB, ham.slice(2));
  else if (ham.startsWith('.')) ham = path.resolve(taban, ham);
  else return null;
  for (const u of UZANTILAR) {
    const aday = `${ham}${u}`;
    if (existsSync(aday) && statSync(aday).isFile()) return aday;
  }
  return null;
}

/* ── kapı ────────────────────────────────────────────────────────────── */

export function zinciriOlc(dosyalar) {
  const kusurlar = [];
  let ithalSayisi = 0;
  for (const dosya of dosyalar) {
    const goreli = path.relative(WEB, dosya);
    for (const it of ithalatlar(readFileSync(dosya, 'utf8'))) {
      ithalSayisi += 1;
      const { belirtec, adlar, satir } = it;
      if (belirtec.startsWith('node:')) continue;
      if (belirtec.startsWith('.') || belirtec.startsWith('@/')) {
        const hedef = dosyaCoz(belirtec, path.dirname(dosya));
        if (!hedef) {
          kusurlar.push(`${goreli}:${satir} → '${belirtec}' ÇÖZÜLEMEDİ (dosya yok)`);
          continue;
        }
        const varOlan = ihraclar(hedef);
        for (const ad of adlar) {
          if (!varOlan.has(ad)) {
            kusurlar.push(`${goreli}:${satir} → '${belirtec}' dosyası '${ad}' İHRAÇ ETMİYOR`);
          }
        }
        continue;
      }
      /* Çıplak belirteç: paket çözümlemesi. Yürütme YOK — `resolve` modülü
         çalıştırmaz, yalnız yolunu bulur. */
      try { gerekli.resolve(belirtec); } catch {
        kusurlar.push(`${goreli}:${satir} → '${belirtec}' paketi çözülemedi`);
      }
    }
  }
  return { dosya: dosyalar.length, ithal: ithalSayisi, kusurlar };
}

const dogrudan = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (dogrudan) {
  const dosyalar = mjsDosyalari();
  const { dosya, ithal, kusurlar } = zinciriOlc(dosyalar);
  /* ÖLÇÜM TABANI: sıfır dosya taranmışsa "kusur yok" demek, hiçbir şeye
     bakmadan temiz raporlamaktır. */
  if (dosya < 40 || ithal < 100) {
    console.error(`İthal zinciri: ÖLÇÜM YETERSİZ — ${dosya} dosya · ${ithal} içe aktarım.`);
    process.exit(1);
  }
  console.log(`İthal zinciri: ${dosya} araç · ${ithal} içe aktarım · kusur ${kusurlar.length}`);
  if (kusurlar.length > 0) {
    console.error('\nÇÖZÜLEMEYEN İÇE AKTARIM:');
    for (const k of kusurlar) console.error(`  · ${k}`);
    process.exit(1);
  }
}
