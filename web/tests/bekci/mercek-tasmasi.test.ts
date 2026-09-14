import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* Taşma mercekleri BİRİNCİL görünmez — SIS-MRC-001.

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   `MERCEK_TASMA` adı ve gerekçesi (`envanter/mantik.ts`) üç merceğin
   İKİNCİL olduğunu söylüyordu: ömür soruları asıl sahibi `/omur`
   ekranındadır, envanterde yalnız daraltmaya yarar. Ekran ise sekiz
   merceği tek dizide ve AYNI ağırlıkta basıyordu:

     {[...MERCEKLER, ...MERCEK_TASMA].map(...)}

   Ürünün kendi grameri bunu zaten ayırıyor — paylaşılan `Filtreler`
   bileşeni (28 ekran) taşma öğesine `className="tasma"` verir ve CSS
   onu kesikli kenarlıkla ikincilleştirir; `/kesif` elle çizdiği bantta
   aynısını yapar. `/envanter` TEK istisnaydı.

   ── BU BEKÇİ NE TUTAR ─────────────────────────────────────────────────
   Kaynağı okur: taşma listesi birincil listeyle AYNI döngüde basılamaz
   ve taşma düğmesi `tasma` sınıfını taşımak zorundadır. Ayrıca stil
   kuralının iki bandı da kapsadığını doğrular — kural yalnız bir bandı
   kapsarsa öbür bant sessizce birincil görünür. */

const EKRAN = 'app/(kabuk)/(operasyonel)/envanter/EnvanterIstemci.tsx';
const CSS = 'app/kabuk.css';
const oku = (y: string) => readFileSync(y, 'utf8');

describe('Mercek taşması · ikincil mercek birincil görünmez [SIS-MRC-001]', () => {
  it('[SIS-MRC-001] envanter taşma merceklerini birincillerle AYNI döngüde '
    + 'basmaz — tek dizi, tek ağırlık demektir', () => {
    const s = oku(EKRAN);
    expect(s, 'taşma yine birincil dizinin içinde')
      .not.toMatch(/\[\s*\.\.\.MERCEKLER\s*,\s*\.\.\.MERCEK_TASMA\s*\]/);
  });

  it('[SIS-MRC-001] envanterde taşma düğmesi `tasma` sınıfını taşır', () => {
    const s = oku(EKRAN);
    const blok = s.slice(s.indexOf('MERCEK_TASMA.map'));
    expect(blok.length, 'taşma listesi hiç basılmıyor').toBeGreaterThan(0);
    expect(blok.slice(0, 400), 'taşma düğmesinde `tasma` sınıfı yok')
      .toContain('className="tasma"');
  });

  it('[SIS-MRC-001] kesikli kenarlık kuralı İKİ bandı da kapsar — tek bandı '
    + 'kapsayan bir kural öbüründe sessizce birincil bırakır', () => {
    const c = oku(CSS);
    const kural = c.slice(c.indexOf('.tasma { border-style: dashed'));
    const bas = c.lastIndexOf('.ab-suzgec .mercekler button.tasma');
    expect(kural.length, 'kesikli kenarlık kuralı kayboldu').toBeGreaterThan(0);
    const secici = c.slice(bas, c.indexOf('}', bas));
    expect(secici, 'paylaşılan bant kuralın dışında').toContain('.ab-suzgec');
    expect(secici, 'envanter/keşif bandı kuralın dışında').toContain('.ab-a-suzgec');
  });

  it('[SIS-MRC-001] taşma listesi BOŞ DEĞİL — boş bir liste bu kuralı '
    + 'bedavaya geçirirdi', async () => {
    const { MERCEKLER, MERCEK_TASMA } = await import(
      '@/app/(kabuk)/(operasyonel)/envanter/mantik');
    expect(MERCEK_TASMA.length, 'taşma listesi boşalmış').toBeGreaterThan(0);
    expect(MERCEKLER.length, 'birincil liste boşalmış').toBeGreaterThan(0);
    /* Bir mercek iki listede birden duramaz: hangi ağırlıkta olduğu
       belirsiz kalırdı. */
    const ikisinde = MERCEKLER.filter((m) => MERCEK_TASMA.some((t) => t.id === m.id));
    expect(ikisinde.map((m) => m.id), 'mercek iki listede birden').toEqual([]);
  });
});
