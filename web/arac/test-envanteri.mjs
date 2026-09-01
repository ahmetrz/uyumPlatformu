#!/usr/bin/env node
/* Test envanteri — vaka sayısının TEK doğruluk kaynağı.

   ── Kapatılan kusur ───────────────────────────────────────────────────
   `arac/sayimlar.mjs` vaka sayısını satır tarayarak buluyordu: her test
   dosyasında satır başındaki `it(` / `test(` kalıbı sayılıyordu. Bu sayım
   iki yerde SESSİZCE eksik kaldı:

     1. `it.each([...])` — kalıba hiç uymuyordu (`it` ile `(` arasında
        `.each` var), bu yüzden parametrik testler SIFIR sayıldı. Oysa
        vitest her dizi elemanı için bir vaka üretir.
     2. `for (const x of [...]) { it(...) }` — döngü içindeki `it(` bir kez
        sayılıyordu, vitest ise iterasyon sayısı kadar vaka üretiyordu.

   Satır tarama bu iki kalıbı PRENSİP OLARAK çözemez: birincisi kalıp
   hatasıydı, ikincisi ise statik olarak çözülemeyecek bir kaçış (döngü
   sınırı çalışma zamanında belli olur). Kalıbı yamamak kusuru gizlerdi;
   bir sonraki `describe.each`, koşullu `it` veya üretilmiş test yine
   sessizce kaçardı. Sessiz eksik sayım, YANLIŞ sayımdan beterdir: belge
   kendinden emin görünür.

   ── Yeni mekanizma ────────────────────────────────────────────────────
   Sayı artık VITEST'İN KENDİ KEŞFİNDEN gelir. Vitest Node API'siyle
   `collect()` çağrılır: test dosyaları içe aktarılır, `describe`/`it`
   kayıtları gerçekten kurulur, ama test GÖVDELERİ koşmaz. Yani "vitest
   run"ın gördüğü vaka kümesinin aynısı, koşu maliyeti olmadan.

   Keşif bir vitest süreci başlattığı için test İÇİNDEN çağrılamaz
   (vitest içinde vitest). Bu yüzden sonuç `arac/test-envanteri.json`
   anlık görüntüsüne yazılır ve yanına bir İMZA konur: test dosyalarının
   yollarının ve içeriklerinin özeti. Test dosyalarında en ufak değişiklik
   imzayı bozar; `tests/belge-sayimlari.test.ts` imzayı yeniden hesaplayıp
   karşılaştırır ve bayat anlık görüntüyü KIRMIZI yapar. Böylece sayı ne
   donar ne de tahmine dayanır.

   Kullanım:
     node arac/test-envanteri.mjs          → keşfi koş, JSON yaz
     node arac/test-envanteri.mjs --yaz    → anlık görüntüyü tazele
     node arac/test-envanteri.mjs --denetle→ anlık görüntü taze mi (çıkış kodu)
*/

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const ANLIK_YOL = path.join(WEB, 'arac', 'test-envanteri.json');

/** vitest.config.ts'teki glob ile AYNI küme: `tests/**\/*.test.ts`. */
export function testDosyalari() {
  const kok = path.join(WEB, 'tests');
  const cikti = [];
  const gez = (d) => {
    for (const ad of readdirSync(d).sort()) {
      const tam = path.join(d, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (tam.endsWith('.test.ts')) cikti.push(tam);
    }
  };
  gez(kok);
  return cikti;
}

/** Keşfi etkileyen her girdinin özeti: dosya yolları + içerikler + config. */
export function imza() {
  const h = createHash('sha256');
  for (const f of testDosyalari()) {
    h.update(path.relative(WEB, f));
    h.update('\0');
    h.update(readFileSync(f));
    h.update('\0');
  }
  h.update(readFileSync(path.join(WEB, 'vitest.config.ts')));
  return h.digest('hex').slice(0, 32);
}

/** Vitest'in kendi keşfi. Test gövdeleri KOŞMAZ, yalnız kayıtlar kurulur. */
export async function kesfet() {
  const { createVitest } = await import('vitest/node');
  const ctx = await createVitest('test', { watch: false, run: true, silent: true });
  try {
    const { testModules, unhandledErrors } = await ctx.collect();
    if (unhandledErrors.length) {
      throw new Error(`keşif sırasında hata: ${unhandledErrors.length} adet\n${unhandledErrors[0]}`);
    }
    const dosyalar = {};
    let vaka = 0;
    let atlanan = 0;
    for (const modul of testModules) {
      const bagil = path.relative(WEB, modul.moduleId);
      let v = 0;
      let a = 0;
      for (const t of modul.children.allTests()) {
        v += 1;
        if (t.result().state === 'skipped') a += 1;
      }
      dosyalar[bagil] = { vaka: v, atlanan: a };
      vaka += v;
      atlanan += a;
    }
    return {
      imza: imza(),
      dosya: testModules.length,
      vaka,
      atlanan,
      dosyalar: Object.fromEntries(Object.entries(dosyalar).sort(([a], [b]) => a.localeCompare(b))),
    };
  } finally {
    await ctx.close();
  }
}

/** Diskteki anlık görüntü. Yoksa ya da bayatsa AÇIKÇA patlar. */
export function anlik() {
  if (!existsSync(ANLIK_YOL)) {
    throw new Error('arac/test-envanteri.json yok. Üretin: npm run sayimlar:yenile');
  }
  const g = JSON.parse(readFileSync(ANLIK_YOL, 'utf8'));
  const simdi = imza();
  if (g.imza !== simdi) {
    throw new Error(
      'arac/test-envanteri.json BAYAT: test dosyaları değişmiş '
      + `(imza ${g.imza} ≠ ${simdi}). Tazeleyin: npm run sayimlar:yenile`,
    );
  }
  return g;
}

/** Anlık görüntü taze mi — patlamadan sorar. */
export function tazeMi() {
  if (!existsSync(ANLIK_YOL)) return false;
  try {
    return JSON.parse(readFileSync(ANLIK_YOL, 'utf8')).imza === imza();
  } catch {
    return false;
  }
}

if (process.argv[1] && process.argv[1].endsWith('test-envanteri.mjs')) {
  if (process.argv.includes('--denetle')) {
    if (tazeMi()) {
      const g = JSON.parse(readFileSync(ANLIK_YOL, 'utf8'));
      console.log(`taze · ${g.vaka} vaka (${g.atlanan} atlanan) · ${g.dosya} dosya`);
    } else {
      console.error('BAYAT · tazeleyin: npm run sayimlar:yenile');
      process.exitCode = 1;
    }
  } else {
    const g = await kesfet();
    if (process.argv.includes('--yaz')) {
      writeFileSync(ANLIK_YOL, `${JSON.stringify(g, null, 2)}\n`);
      console.log(`güncellendi: arac/test-envanteri.json · ${g.vaka} vaka (${g.atlanan} atlanan) · ${g.dosya} dosya`);
    } else {
      console.log(JSON.stringify(g, null, 2));
    }
  }
}
