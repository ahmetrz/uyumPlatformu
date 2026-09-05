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
   anlık görüntüsüne yazılır.

   ── İNCELEME KUSURU (P2): imza tek başına yetmez ──────────────────────
   İlk sürümde tazelik YALNIZ bir imzaya bakıyordu ve imza yalnız
   `tests/**\/*.test.ts` içerikleri ile `vitest.config.ts`ten
   türetiliyordu. Keşfi etkileyen başka girdiler bu imzanın DIŞINDA
   kalıyordu:
     · vitest'in kendi sürümü — keşif davranışını değiştirebilir;
     · `tests/` altındaki ama `.test.ts` OLMAYAN yardımcılar (fixture,
       sahte, kurulum) — parametrik test kaydeden bir yardımcı değişince
       vaka sayısı değişir, imza değişmez.
   Yani anlık görüntü BAYAT olduğu hâlde "taze" sayılabiliyor ve belgeye
   yanlış toplam basılmaya devam edebiliyordu.

   İki katmanlı çözüldü ve ikisi de FAIL-LOUD:

   1. İMZA GENİŞLETİLDİ — artık `tests/` altındaki HER dosya (uzantı
      farketmez), `vitest.config.ts` ve KURULU vitest sürümü
      (`node_modules/vitest/package.json`) özete girer. Ucuz, hızlı ve
      test süreci içinden çalışır: `tests/belge-sayimlari.test.ts` bunu
      her koşuda doğrular.

   2. `--denetle` ARTIK İMZAYA GÜVENMEZ — gerçek keşfi KOŞAR ve çıkan
      sayıları anlık görüntüyle karşılaştırır. Hangi girdinin imzada
      olduğu artık doğruluk için önemli değildir: sayı yeniden türetilir,
      fark varsa çıkış kodu 1 ve fark yazdırılır. Bir imzanın "eksik
      kalması" bu kapıyı geçemez. Tahmini/sahte sayaç yoktur.

   Kullanım:
     node arac/test-envanteri.mjs          → keşfi koş, JSON yaz
     node arac/test-envanteri.mjs --yaz    → anlık görüntüyü tazele
     node arac/test-envanteri.mjs --denetle→ GERÇEK keşifle karşılaştır (çıkış kodu)
*/

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const ANLIK_YOL = path.join(WEB, 'arac', 'test-envanteri.json');

/** vitest.config.ts'teki glob ile AYNI küme: `tests/**\/*.test.ts`. */
export function testDosyalari() {
  return tumTestKaynaklari().filter((f) => f.endsWith('.test.ts'));
}

/** `tests/` altındaki HER dosya — yardımcılar, fixture'lar, sahteler dâhil.
    Bunlar `.test.ts` değildir ama parametrik test KAYDEDEBİLİRLER; imzanın
    dışında bırakılmaları anlık görüntüyü sessizce bayatlatıyordu. */
export function tumTestKaynaklari() {
  const kok = path.join(WEB, 'tests');
  const cikti = [];
  const gez = (d) => {
    for (const ad of readdirSync(d).sort()) {
      const tam = path.join(d, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else cikti.push(tam);
    }
  };
  gez(kok);
  return cikti;
}

/** Keşfi yapan aracın KURULU sürümü. `package.json`daki aralık (`^4.1.11`)
    değil, gerçekten çözülmüş sürüm okunur: `npm install` aralık içinde
    sürümü değiştirdiğinde de imza değişsin. Bulunamazsa açıkça 'yok'
    yazılır — sessizce atlanmaz. */
export function kesifAraciSurumu() {
  try {
    const j = JSON.parse(
      readFileSync(path.join(WEB, 'node_modules', 'vitest', 'package.json'), 'utf8'),
    );
    return `vitest@${j.version}`;
  } catch {
    return 'vitest@yok';
  }
}

/** Keşfi etkileyen girdilerin özeti: `tests/` altındaki her dosya (yol +
    içerik), `vitest.config.ts` ve kurulu vitest sürümü. Bu imza HIZLI
    yoldur; doğruluğun tek dayanağı DEĞİLDİR — `--denetle` gerçek keşfi
    koşar (bkz. dosya başlığı). */
export function imza() {
  const h = createHash('sha256');
  for (const f of tumTestKaynaklari()) {
    h.update(path.relative(WEB, f));
    h.update('\0');
    h.update(readFileSync(f));
    h.update('\0');
  }
  h.update(readFileSync(path.join(WEB, 'vitest.config.ts')));
  h.update('\0');
  h.update(kesifAraciSurumu());
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

/**
 * GERÇEK keşfi koşar ve anlık görüntüyle karşılaştırır. İmzaya BAKMAZ:
 * doğruluk, sayının yeniden türetilmesinden gelir. Bu yüzden imzanın bir
 * girdiyi kaçırması bu kapıyı geçemez.
 *
 * Dönen liste boşsa taze; doluysa her satır bir farktır.
 */
export async function farklar() {
  if (!existsSync(ANLIK_YOL)) {
    return ['arac/test-envanteri.json yok'];
  }
  let kayitli;
  try {
    kayitli = JSON.parse(readFileSync(ANLIK_YOL, 'utf8'));
  } catch (e) {
    return [`arac/test-envanteri.json okunamadı: ${e.message}`];
  }
  const taze = await kesfet();
  const f = [];
  for (const alan of ['dosya', 'vaka', 'atlanan']) {
    if (kayitli[alan] !== taze[alan]) {
      f.push(`${alan}: kayıtlı ${kayitli[alan]} ≠ gerçek ${taze[alan]}`);
    }
  }
  /* Toplamlar tutup dağılım kaymış olabilir (bir dosyada +2, başkasında
     −2). Dosya kırılımı da karşılaştırılır; belge yalnız toplamı bassa
     bile anlık görüntü yanlış kalmamalı. */
  const adlar = new Set([...Object.keys(kayitli.dosyalar ?? {}), ...Object.keys(taze.dosyalar)]);
  for (const ad of [...adlar].sort()) {
    const a = kayitli.dosyalar?.[ad];
    const b = taze.dosyalar[ad];
    if (!a) { f.push(`${ad}: anlık görüntüde yok (gerçekte ${b.vaka} vaka)`); continue; }
    if (!b) { f.push(`${ad}: artık yok (anlık görüntüde ${a.vaka} vaka)`); continue; }
    if (a.vaka !== b.vaka || a.atlanan !== b.atlanan) {
      f.push(`${ad}: kayıtlı ${a.vaka}/${a.atlanan} ≠ gerçek ${b.vaka}/${b.atlanan}`);
    }
  }
  /* İmza farkı tek başına KUSUR değildir (yorum değişikliği de imzayı
     bozar) ama anlık görüntü tazelenmemiş demektir: sayılar tutsa bile
     bildirilir ki `--yaz` unutulmasın. */
  if (kayitli.imza !== taze.imza) {
    f.push(`imza: kayıtlı ${kayitli.imza} ≠ ${taze.imza} (sayılar tutuyor olabilir)`);
  }
  return f;
}

if (process.argv[1] && process.argv[1].endsWith('test-envanteri.mjs')) {
  if (process.argv.includes('--denetle')) {
    const f = await farklar();
    if (f.length === 0) {
      const g = JSON.parse(readFileSync(ANLIK_YOL, 'utf8'));
      console.log(`taze · ${g.vaka} vaka (${g.atlanan} atlanan) · ${g.dosya} dosya · gerçek keşifle doğrulandı`);
    } else {
      console.error(`BAYAT · ${f.length} fark:`);
      for (const x of f) console.error(`  · ${x}`);
      console.error('Tazeleyin: npm run sayimlar:yenile');
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
