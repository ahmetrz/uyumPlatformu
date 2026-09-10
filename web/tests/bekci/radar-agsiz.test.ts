import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   R1 · RADAR KATMANI AĞA KENDİ ÇIKMAZ · BEKÇİ [URN-MEV-001]

   ── ÖLÇÜLEN KURAL ─────────────────────────────────────────────────────
   Radarın karar katmanı (`lib/mevzuat/`) ve koşumu
   (`lib/uyum/mevzuatRadariKosumu.ts`) ağa KENDİ çıkmaz: getirme
   dışarıdan enjekte edilir. Gerekçe iki tanedir ve ikisi de ürünün
   kendi kurallarından gelir:

   1. "Ağa çıkan test KIRMIZIDIR." Getirme gömülü olsaydı, "engelli
      kaynağa istek gönderilmiyor" iddiası ancak gerçek bir kamu
      sunucusuna istek atan bir testle ölçülebilirdi.
   2. Kaynağa istek göndermek KURULUMUN kararıdır (`etkin` varsayılan
      false). Karar katmanının içine gömülü bir `fetch`, o kararı
      kütüphane seviyesine indirir ve görünmez yapar.

   Ağ YALNIZ `lib/motorlar/mevzuatRadari.ts` içindedir: orası zaten
   zamanlanmış işin ta kendisidir ve tek satırlık bir sarmalayıcıdır.

   ── TESTLER DE AĞA ÇIKMAZ ─────────────────────────────────────────────
   Radar testleri sahte kaynak kullanır. Gerçek bir alan adı geçmesi bile
   kabul edilmez: fikstür adresleri RFC 2606'nın ayırdığı `.ornek`
   kurgusal alanındadır.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const yorumsuz = (m: string) => m
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map((s) => s.replace(/\/\/.*$/, '')).join('\n');

const oku = (rel: string) => yorumsuz(readFileSync(path.join(KOK, rel), 'utf8'));

/** Ağa çıkma işaretleri. */
const AG = /\bfetch\s*\(|\bnode:https?\b|require\(['"]https?['"]\)|\baxios\b|new\s+XMLHttpRequest/;

const KARAR_DOSYALARI = [
  ...readdirSync(path.join(KOK, 'lib', 'mevzuat')).map((f) => `lib/mevzuat/${f}`),
  'lib/uyum/mevzuatRadariKosumu.ts',
];

describe('radar karar katmanı AĞSIZ [URN-MEV-001]', () => {
  it('dosya listesi TÜRETİLİYOR ve boş değil [URN-MEV-001]', () => {
    expect(KARAR_DOSYALARI.length).toBeGreaterThanOrEqual(3);
  });

  it('hiçbir karar dosyasında ağ çağrısı YOK [URN-MEV-001]', () => {
    const kusur = KARAR_DOSYALARI
      .filter((f) => AG.test(oku(f)))
      .map((f) => `${f}: ağ çağrısı içeriyor`);
    expect(kusur, kusur.join('\n')).toEqual([]);
  });

  it('koşum getirmeyi DIŞARIDAN alır [URN-MEV-001]', () => {
    /* Kural metinsel değil yapısal: imzada `getir` yoksa enjeksiyon
       yoktur ve bekçi kendi kendini kandırmış olur. */
    const k = oku('lib/uyum/mevzuatRadariKosumu.ts');
    expect(k).toMatch(/getir:\s*\(url: string\)\s*=>\s*Promise<Getirme>/);
  });

  it('SABOTAJ: kalıp gerçekten `fetch(` arıyor [URN-MEV-001]', () => {
    expect(AG.test('const y = await fetch(url);')).toBe(true);
    expect(AG.test('const y = getir(url);')).toBe(false);
    /* Yorumdaki geçiş yakalanmamalı, yoksa açıklama yazmak yasaklanır. */
    expect(AG.test(yorumsuz('/* burada fetch( kullanılmaz */\nconst x = 1;'))).toBe(false);
  });
});

describe('radar TESTLERİ ağa çıkmaz [URN-MEV-001]', () => {
  const testler = readdirSync(path.join(KOK, 'tests'))
    .filter((f) => /mevzuat|radar/i.test(f) && f.endsWith('.test.ts'))
    .map((f) => `tests/${f}`);

  it('radar testi VAR — liste boş değil [URN-MEV-001]', () => {
    expect(testler.length).toBeGreaterThanOrEqual(1);
  });

  it('hiçbir radar testinde ağ çağrısı YOK [URN-MEV-001]', () => {
    const kusur = testler.filter((f) => AG.test(oku(f)));
    expect(kusur, kusur.join('\n')).toEqual([]);
  });

  it('fikstür adresleri KURGUSAL alanda [URN-MEV-001]', () => {
    /* Gerçek bir kamu alan adı fikstürde durursa, bir gün biri o adresi
       "denemek" için ağa çıkarır. */
    const kusur: string[] = [];
    for (const f of testler) {
      for (const m of oku(f).matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
        const alan = m[1].toLowerCase();
        if (alan.endsWith('.ornek') || alan === 'localhost' || alan.startsWith('127.')) continue;
        kusur.push(`${f}: ${alan}`);
      }
    }
    expect(kusur, `kurgusal olmayan alan adı:\n${kusur.join('\n')}`).toEqual([]);
  });
});
