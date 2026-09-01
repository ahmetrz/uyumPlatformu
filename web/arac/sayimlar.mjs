#!/usr/bin/env node
/* Belge sayımları — TEK doğruluk kaynağı.

   ── Neden var ─────────────────────────────────────────────────────────
   Durum belgeleri elle yazılmış sayılar taşıyordu ve birbirleriyle
   çelişiyorlardı: bir belge "428 test", başkası "689", gerçek başka.
   Bir okuyucu hangisinin doğru olduğunu bilemez; daha kötüsü, bilmediğini
   de bilemez. Sayı belgede DONDUĞU anda belge yalan söylemeye başlar.

   Bu araç sayıları KAYNAKTAN türetir. Belgeler artık sayıyı yazmaz, bu
   aracın ürettiği bloğu taşır; `tests/belge-sayimlari.test.ts` blokla
   gerçeği karşılaştırır ve saparsa KIRMIZI olur.

   ── Neden statik sayım ────────────────────────────────────────────────
   Test vakası sayısı için vitest'i koşturmak gerekirdi; testin içinden
   test koşturmak kırılgan ve yavaştır. Bunun yerine vitest'in KENDİ
   glob'u (tests altındaki her `.test.ts`) ile aynı dosyalar taranır ve satır
   başındaki `it(` / `it.skip(` sayılır. Bu sayım gerçek koşuyla birebir
   tutuyor; tutmadığı gün testin kendisi bunu yakalar (aracın çıktısı ile
   `vitest run` çıktısı elle karşılaştırılır ve fark bir kusurdur).

   Kullanım:
     node arac/sayimlar.mjs            → JSON yaz
     node arac/sayimlar.mjs --yaz      → belgelerdeki blokları güncelle
     node arac/sayimlar.mjs --tablo    → markdown tablo yaz
*/

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const KOK = path.resolve(WEB, '..');

/** Bir dizin ağacında koşula uyan dosyaları toplar. */
function dosyalar(kok, uyar, atla = new Set(['node_modules', '.next', 'prisma-client'])) {
  const cikti = [];
  const gez = (d) => {
    let girisler;
    try { girisler = readdirSync(d); } catch { return; }
    for (const ad of girisler) {
      if (atla.has(ad)) continue;
      const tam = path.join(d, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (uyar(tam)) cikti.push(tam);
    }
  };
  gez(kok);
  return cikti;
}

/** `X = { a: ..., b: ... } as const` biçimli bir nesnenin anahtar sayısı. */
function nesneAnahtarlari(dosya, degisken) {
  const s = readFileSync(dosya, 'utf8');
  const basla = s.indexOf(`${degisken} = {`);
  if (basla < 0) throw new Error(`${degisken} bulunamadı: ${dosya}`);
  let i = s.indexOf('{', basla), derinlik = 0, son = i;
  for (; i < s.length; i += 1) {
    if (s[i] === '{') derinlik += 1;
    else if (s[i] === '}') { derinlik -= 1; if (derinlik === 0) { son = i; break; } }
  }
  const govde = s.slice(s.indexOf('{', basla) + 1, son);
  // Yalnız ÜST seviye anahtarlar: iç içe nesne yok, satır başı `ad:` kalıbı.
  return govde.split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[a-zA-Z_][a-zA-Z0-9_]*\s*:/.test(l) && !l.startsWith('//'))
    .length;
}

export function sayimlar() {
  const testDosyalari = dosyalar(path.join(WEB, 'tests'), (f) => f.endsWith('.test.ts'));
  let vaka = 0, atlanan = 0;
  for (const f of testDosyalari) {
    for (const satir of readFileSync(f, 'utf8').split('\n')) {
      if (/^\s*(it|test)\.skip\s*\(/.test(satir)) { vaka += 1; atlanan += 1; }
      else if (/^\s*(it|test)(\.only)?\s*\(/.test(satir)) vaka += 1;
    }
  }

  const sema = readFileSync(path.join(WEB, 'prisma', 'schema.prisma'), 'utf8');
  const eylemModulleri = dosyalar(path.join(WEB, 'lib'), (f) => f.endsWith('.ts'))
    .filter((f) => !f.endsWith('.demo.ts'))
    .filter((f) => /^\s*['"]use server['"]/m.test(readFileSync(f, 'utf8')));

  return {
    'test dosyası': testDosyalari.length,
    'test vakası': vaka,
    'atlanan test': atlanan,
    'ekran (rota)': dosyalar(path.join(WEB, 'app'), (f) => path.basename(f) === 'page.tsx').length,
    'API ucu': dosyalar(path.join(WEB, 'app', 'api'), (f) => path.basename(f) === 'route.api.ts').length,
    'otomasyon motoru': nesneAnahtarlari(path.join(WEB, 'lib', 'motorlar', 'kayit.ts'), 'MOTORLAR'),
    'connector adaptörü': nesneAnahtarlari(
      path.join(WEB, 'lib', 'entegrasyon', 'adaptorler', 'index.ts'), 'ADAPTORLER'),
    'sunucu eylemi modülü': eylemModulleri.length,
    'Prisma modeli': (sema.match(/^model /gm) ?? []).length,
    'uygulanmış göç': readdirSync(path.join(WEB, 'prisma', 'migrations'))
      .filter((d) => /^\d{14}_/.test(d)).length,
  };
}

export const BASLA = '<!-- SAYIMLAR:BASLA -->';
export const BITIS = '<!-- SAYIMLAR:BITIS -->';

export function blok(s = sayimlar()) {
  const satirlar = [
    BASLA,
    '<!-- Bu blok `node arac/sayimlar.mjs --yaz` ile üretilir. ELLE DÜZENLEME. -->',
    '',
    '| Ölçü | Değer |',
    '|---|---|',
    ...Object.entries(s).map(([k, v]) => `| ${k} | ${v} |`),
    '',
    BITIS,
  ];
  return satirlar.join('\n');
}

/** Blok taşıyan belgeler. Yeni bir durum belgesi eklenirse buraya girer. */
export const BELGELER = [
  path.join(KOK, 'PRE_INTERNAL_INTEGRATION_READINESS.md'),
];

function yaz() {
  const yeni = blok();
  for (const yol of BELGELER) {
    const s = readFileSync(yol, 'utf8');
    const b = s.indexOf(BASLA);
    const e = s.indexOf(BITIS);
    if (b < 0 || e < 0) { console.error(`blok yok, atlandı: ${yol}`); continue; }
    writeFileSync(yol, s.slice(0, b) + yeni + s.slice(e + BITIS.length));
    console.log(`güncellendi: ${path.relative(KOK, yol)}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('sayimlar.mjs')) {
  if (process.argv.includes('--yaz')) yaz();
  else if (process.argv.includes('--tablo')) console.log(blok());
  else console.log(JSON.stringify(sayimlar(), null, 2));
}
