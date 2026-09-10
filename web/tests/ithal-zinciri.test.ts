import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  dosyaCoz, ihraclar, ithalatlar, yorumsuz, zinciriOlc,
} from '../arac/ithal-zinciri.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   İTHAL ZİNCİRİ — hızlı kümenin kör noktası [URN-KUR-011]

   ÖLÇÜLDÜ (9 Eyl 2026): `arac/derleme-ortami.mjs` tamamen değiştirildi ve
   üç aracın ondan aldığı ihraçlar yok oldu. `tsc --noEmit` temiz, `eslint`
   temiz, bütün hızlı küme yeşil — çünkü `tsc` proje TypeScript'ini
   denetler, `arac/*.mjs` içe aktarım grafiği onun kapsamında DEĞİLDİR.
   Kusur ancak yavaş kümedeki `demo:build` koşunca görünürdü.

   Kapı YÜRÜTMEZ: bu araçların çoğu CLI'dır ve içe aktarılınca koşar.
   Ölçülen şey kusurun KENDİSİDİR (çözülemeyen içe aktarım), belirtisi
   değil ("dosya tamamen değişti mi" gibi bir sezgi yazılmadı — o, bir
   sonraki sefer başka bir belirtiyle gelirdi).
   ═══════════════════════════════════════════════════════════════════════ */

const ARAC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../arac');

describe('yorum ayıklama', () => {
  it('TAM SATIR `//` yorumu düşer', () => {
    expect(yorumsuz("// import { x } from './y';\nconst a = 1;\n"))
      .not.toContain('import');
  });

  it('SATIR BAŞINDA açılan blok yorumu düşer', () => {
    expect(yorumsuz("  /* import { x } from './y'; */\nconst a = 1;\n"))
      .not.toContain('import');
  });

  it('DİZE içindeki `/*` yorum sanılmaz — glob kodu yemez', () => {
    /* Naif bir blok ayıklama `'tests/**\/*.test.ts'` glob'unun `/*`
       parçasını yorum başlangıcı sanar ve sonrasındaki kodu yer. */
    const kaynak = "const g = 'tests/**/*.test.ts';\nconst b = 2;\n";
    expect(yorumsuz(kaynak)).toContain('const b = 2');
  });

  it('SATIR SONU yorumu koddan sonra gelirse kod korunur', () => {
    expect(yorumsuz('const a = 1; // not\n')).toContain('const a = 1');
  });
});

describe('içe aktarım okuma', () => {
  it('adlı · varsayılan · ad alanı · yan etki · dinamik biçimleri okur', () => {
    const kaynak = [
      "import { a, b as c } from './x.mjs';",
      "import v from './y.mjs';",
      "import * as ns from './z.mjs';",
      "import './yan.mjs';",
      "const m = await import('./dyn.mjs');",
    ].join('\n');
    const i = ithalatlar(kaynak);
    expect(i.map((x: { belirtec: string }) => x.belirtec))
      .toEqual(['./x.mjs', './y.mjs', './z.mjs', './yan.mjs', './dyn.mjs']);
    expect(i[0].adlar).toEqual(['a', 'b']);
    expect(i[1].adlar).toEqual(['default']);
    /* Ad alanı içe aktarımında doğrulanacak ad yoktur. */
    expect(i[2].adlar).toEqual([]);
  });

  it('GİRİNTİLİ örnek metin içe aktarım sayılmaz', () => {
    /* Doküman yorumundaki `import … from '<spec>'` örneği kapıyı kırmızı
       yakmamalı; ölçüldü — ilk sürüm kendi örneklerini kusur saydı. */
    expect(ithalatlar("  import { x } from '<spec>';\n")).toEqual([]);
  });

  it('DEĞİŞKENLİ dinamik içe aktarım çözülmeye çalışılmaz', () => {
    expect(ithalatlar('const m = await import(yol);\n')).toEqual([]);
  });
});

describe('ihraç okuma', () => {
  const gecici = mkdtempSync(path.join(tmpdir(), 'uyum-ithal-'));
  const yaz = (ad: string, icerik: string) => {
    const y = path.join(gecici, ad);
    writeFileSync(y, icerik);
    return y;
  };

  it('function · const · class · tür · `export {}` · default okunur', () => {
    const y = yaz('a.mjs', [
      'export function f() {}',
      'export const K = 1;',
      'export class C {}',
      'const g = 2;',
      'export { g };',
      'export default f;',
    ].join('\n'));
    const a = ihraclar(y);
    for (const ad of ['f', 'K', 'C', 'g', 'default']) expect([...a]).toContain(ad);
  });

  it('`export * from` zinciri İZLENİR', () => {
    yaz('taban.mjs', 'export const TABAN = 1;\n');
    const y = yaz('ust.mjs', "export * from './taban.mjs';\n");
    expect([...ihraclar(y)]).toContain('TABAN');
  });

  it('göreli · `@/` · uzantısız yol çözülür', () => {
    expect(dosyaCoz('./kosu-ortak.mjs', ARAC)).toBeTruthy();
    expect(dosyaCoz('@/lib/marka', ARAC)).toBeTruthy();
    expect(dosyaCoz('./hicyok.mjs', ARAC)).toBeNull();
  });
});

describe('kapı · gerçek araçlar ve SABOTAJ', () => {
  const gecici = mkdtempSync(path.join(tmpdir(), 'uyum-ithal-k-'));
  const yaz = (ad: string, icerik: string) => {
    const y = path.join(gecici, ad);
    writeFileSync(y, icerik);
    return y;
  };

  it('SABOTAJ: hedef ihracı kaybederse ADIYLA kırmızı', () => {
    /* Ölçülen kusurun kendisi: `derleme-ortami.mjs` üzerine yazıldı,
       `ciktiyiDogrula` yok oldu, üç araç kırıldı. */
    yaz('hedef.mjs', 'export const BASKA = 1;\n');
    const kaynak = yaz('arac.mjs', "import { ciktiyiDogrula } from './hedef.mjs';\n");
    const o = zinciriOlc([kaynak]);
    expect(o.kusurlar).toHaveLength(1);
    expect(o.kusurlar[0]).toContain('ciktiyiDogrula');
    expect(o.kusurlar[0]).toContain('İHRAÇ ETMİYOR');
  });

  it('SABOTAJ: hedef dosya hiç yoksa kırmızı', () => {
    const kaynak = yaz('arac2.mjs', "import { x } from './yok.mjs';\n");
    expect(zinciriOlc([kaynak]).kusurlar[0]).toContain('ÇÖZÜLEMEDİ');
  });

  it('SABOTAJ: olmayan npm paketi kırmızı', () => {
    const kaynak = yaz('arac3.mjs', "import x from 'hic-olmayan-paket-xyz';\n");
    expect(zinciriOlc([kaynak]).kusurlar[0]).toContain('çözülemedi');
  });

  it('ihraç varsa TEMİZ — kapı her şeyi kırmızı yakmıyor', () => {
    /* Kapının yanlış pozitifi de ölçülür: her içe aktarımı reddeden bir
       kapı, hiçbir şey ölçmeyen bir kapıdır. */
    yaz('hedef2.mjs', 'export function ciktiyiDogrula() {}\n');
    const kaynak = yaz('arac4.mjs', "import { ciktiyiDogrula } from './hedef2.mjs';\n");
    expect(zinciriOlc([kaynak]).kusurlar).toEqual([]);
  });

  it('`node:` yerleşikleri çözülmeye çalışılmaz', () => {
    const kaynak = yaz('arac5.mjs', "import fs from 'node:fs';\n");
    expect(zinciriOlc([kaynak]).kusurlar).toEqual([]);
  });
});

/* ── BAĞIMSIZ İNCELEME BULGULARI (PR #46) ─────────────────────────────
   Üçü de "kapı geçerli kodu kırmızı yakıyor ya da kırık kodu kaçırıyor"
   sınıfındandı ve hiçbiri bugünkü depoda ateşlenmiyordu — ama ilk kullanan
   anlaşılması zor bir yanlış alarm alacaktı. */

describe('yanlış alarm ve yanlış negatif — inceleme bulguları', () => {
  it('çok satırlı içe aktarımda SATIR-İÇİ YORUM ada karışmaz', () => {
    /* `a, // yorum` satırı virgülle bölününce yorum metni bir sonraki
       ADIN içine giriyordu ve kapı, hiçbir modülün ihraç edemeyeceği
       `"// yorum b"` adını arayıp GEÇERLİ kodu kırmızı yakıyordu. */
    const [i] = ithalatlar("import {\n  a, // neden burada\n  b,\n} from './mod.mjs';\n");
    expect(i.adlar).toEqual(['a', 'b']);
  });

  it('blok yorumu da ada karışmaz', () => {
    const [i] = ithalatlar("import { a, /* not */ b } from './mod.mjs';\n");
    expect(i.adlar).toEqual(['a', 'b']);
  });

  it('`import type { X }` varsayılan ihraç ARAMAZ', () => {
    /* `type` sözcüğü çıplak ad sanılıp hedefte `default` aranıyordu. */
    const [i] = ithalatlar("import type { Foo } from './t';\n");
    expect(i.adlar).toEqual(['Foo']);
  });

  it('`import { type Foo, bar }` ada `type` yapıştırmaz', () => {
    const [i] = ithalatlar("import { type Foo, bar } from './t';\n");
    expect(i.adlar).toEqual(['Foo', 'bar']);
  });

  it('SABİT şablon dizesiyle dinamik içe aktarım GÖRÜLÜR', () => {
    const i = ithalatlar('const m = await import(`./mod-x.mjs`);\n');
    expect(i.map((x) => x.belirtec)).toEqual(['./mod-x.mjs']);
  });

  it('DEĞİŞKENLİ şablon dizesi hâlâ atlanır — çözülemeyeni kırmızı yakmak yanlış', () => {
    expect(ithalatlar('const m = await import(`./${ad}.mjs`);\n')).toEqual([]);
  });
});

describe('`export type { X }` bir İHRAÇTIR', () => {
  it('kaynaksız tip ihracı görünür', () => {
    const yol = path.join(mkdtempSync(path.join(tmpdir(), 'ithal-tip-')), 'tipler.ts');
    writeFileSync(yol, 'type Foo = string;\nexport type { Foo };\n');
    expect(ihraclar(yol).has('Foo')).toBe(true);
  });

  it('`export { type Foo }` biçiminde de görünür', () => {
    const yol = path.join(mkdtempSync(path.join(tmpdir(), 'ithal-tip2-')), 'tipler.ts');
    writeFileSync(yol, 'type Foo = string;\nconst bar = 1;\nexport { type Foo, bar };\n');
    const c = ihraclar(yol);
    expect(c.has('Foo')).toBe(true);
    expect(c.has('bar')).toBe(true);
  });
});
