import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { tabanKarari, tabanOku } from '../arac/olcum-tabani.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   ÖLÇÜM TABANI — cırcırın simetriği

   Kalite borcu cırcırı BORÇ için TAVAN tutar: sayı yukarı çıkamaz.
   Bu ölçü KAPSAM için TABAN tutar: sayı aşağı düşemez.

   ── Neden gerekti ─────────────────────────────────────────────────────
   ÖLÇÜLDÜ: disk dolunca test keşfi "158 dosya · 0 vaka" döndü ve sayım
   kapısı "taze · 0 vaka · gerçek keşifle DOĞRULANDI" diyerek YEŞİL
   yandı. O kapı yerinde düzeltildi; ama sınıf daha geniştir — sayı
   raporlayan her kapı sıfır ölçümle de `exit 0` verebiliyordu:

     yatay-tasma  0 ölçüm  → "0 kusur"
     erisim-axe   0 tarama → "ihlal 0"
     rota-duman   0 rota   → "kusurlu 0"

   Kusur sayısı sıfır OLABİLİR; ölçüm sayısı olamaz.
   ═══════════════════════════════════════════════════════════════════════ */

const TABANLAR = { 'a.olcum': 10 };

describe('ölçüm tabanı · karar', () => {
  it('taban karşılanınca GEÇER', () => {
    expect(tabanKarari('a.olcum', 10, TABANLAR)).toBeNull();
  });

  it('taban AŞILINCA da geçer — kapsamın büyümesi engellenmez', () => {
    /* Büyümeyi engellemek, kapsamı korumakla ilgisiz bir sürtünme
       olurdu: yeni rota, yeni bant, yeni betik hep kapsamı büyütür. */
    expect(tabanKarari('a.olcum', 500, TABANLAR)).toBeNull();
  });

  it('taban ALTINA düşünce KIRMIZI — bir eksik bile', () => {
    const m = tabanKarari('a.olcum', 9, TABANLAR);
    expect(m).toMatch(/ÖLÇÜM KAPSAMI DÜŞTÜ/);
    expect(m).toMatch(/9 < taban 10/);
    expect(m, 'çıkış yolu ADIYLA yazılmalı').toMatch(/--taban-yaz/);
  });

  it('SIFIR ölçüm — kapatılan kusurun ta kendisi', () => {
    expect(tabanKarari('a.olcum', 0, TABANLAR)).toMatch(/ÖLÇÜM KAPSAMI DÜŞTÜ/);
  });

  it('BEYANSIZ ölçü kırmızı — beyansız ölçü sıfıra düştüğünü söyleyemez', () => {
    /* Yeni bir sayı raporlayan kapı eklenip tabanı beyan edilmezse,
       o kapı ilk günden itibaren sıfır ölçümle geçebilirdi. */
    expect(tabanKarari('yeni.olcu', 5, TABANLAR)).toMatch(/TABANI BEYAN EDİLMEMİŞ/);
  });

  it('SAYI OLMAYAN ölçüm reddedilir — NaN bir ölçüm değildir', () => {
    expect(tabanKarari('a.olcum', Number.NaN, TABANLAR)).toMatch(/ÖLÇÜM GEÇERSİZ/);
    expect(tabanKarari('a.olcum', -1, TABANLAR)).toMatch(/ÖLÇÜM GEÇERSİZ/);
  });
});

const YOL = fileURLToPath(new URL('../arac/olcum-tabani.json', import.meta.url));

describe('ölçüm tabanı · dosya', () => {
  it('taban dosyası VAR ve okunur', () => {
    expect(existsSync(YOL)).toBe(true);
    expect(() => tabanOku(YOL)).not.toThrow();
  });

  it('OKUNAMAYAN taban SESSİZCE boşa düşmez, ADIYLA atar', () => {
    /* `?? {}` deseydik dosya silindiğinde bütün tabanlar yok olur ve her
       kapı "taban yok, geç" derdi — kapıyı susturmanın tek adımlık
       yolu. Aynı gerekçe `kalite-borcu.mjs`te de yazılı. */
    expect(() => tabanOku('/olmayan/olcum-tabani.json'))
      .toThrow(/ÖLÇÜM TABANI OKUNAMADI[\s\S]*olmayan\/olcum-tabani\.json/);
  });

  it('BEYAN EDİLEN her taban pozitif bir tam sayıdır', () => {
    /* Sıfır bir taban değildir: sıfır tabanlı bir ölçü, hiçbir şey
       ölçmediğinde de geçer — kapatılan kusurun kendisi. */
    const { tabanlar } = tabanOku(YOL);
    for (const [ad, deger] of Object.entries(tabanlar)) {
      expect(Number.isInteger(deger), `${ad} tam sayı değil`).toBe(true);
      expect(deger as number, `${ad} sıfır ya da negatif`).toBeGreaterThan(0);
    }
  });

  it('SAYI RAPORLAYAN her kapı tabanını BEYAN etmiş', () => {
    /* Kapsam elle yazılmıyor: `arac/*.mjs` içinde `tabanDogrula(` çağıran
       her dosya, çağırdığı anahtarı beyan etmiş olmalı. Yeni bir kapı
       eklenip tabanı unutulursa burası kırmızı yanar. */
    const ARAC = fileURLToPath(new URL('../arac', import.meta.url));
    const { tabanlar } = tabanOku(YOL);
    const eksik: string[] = [];
    for (const d of readdirSync(ARAC).filter((x) => x.endsWith('.mjs'))) {
      /* Yorumlar ayıklanır: `olcum-tabani.mjs`in KENDİ kullanım örneği
         bir kapı çağrısı değildir. Aynı ayıklama `kapi-farki` ve
         `tek-nusha` ölçülerinde de var — yorumdaki örnek kod, kod
         değildir. */
      const kaynak = readFileSync(path.join(ARAC, d), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      for (const m of kaynak.matchAll(/tabanDogrula\(\s*'([^']+)'/g)) {
        if (!(m[1] in tabanlar)) eksik.push(`${d} → ${m[1]}`);
      }
    }
    expect(eksik, `taban beyanı eksik: ${eksik.join(', ')}`).toEqual([]);
  });
});
