import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB importlardan ÖNCE: gerçek dev.db'ye dokunulmaz (tests/sahte/db.ts kuralı).
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-p1-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');

/* ═══════════════════════════════════════════════════════════════════════
   P1 · kurulu güç kolondan özniteliğe (URN-ALN-001)

   Göçün ölçüsü "çalıştı mı" değil, "DEĞER KAYBOLDU MU". İki ayrı iddia
   var ve ikincisi ilkinden daha kolay kaybedilir:

   1. Değeri olan her tesis/birim, aynı sayıyı öznitelik satırında taşır.
   2. Değeri OLMAYAN tesis öznitelik satırı ALMAZ. Boş bir satır
      ("ölçüldü, değeri yok") ile ölçülmemiş nitelik aynı şey değildir.
      Göç betiği `WHERE ... IS NOT NULL` yazmasaydı 17. tesis sessizce
      "kurulu gücü var ama boş" hâline gelirdi ve bu, ekranda sıfır gibi
      okunurdu.

   Kolonlar bu aşamada hâlâ duruyor (okuyucular henüz özniteliğe
   çevrilmedi); test ikisinin AYNI olduğunu sabitliyor. Kolonlar
   düştüğünde bu test öznitelik tarafını ölçmeye devam eder. */

describe('P1 · öznitelik göçü', () => {
  it('kurulu güç değeri kayıpsız taşındı; ölçülmemiş olan satır almadı [URN-ALN-001]', async () => {
    const tesisler = await db.tesis.findMany({
      select: { kod: true, kuruluGucMw: true, ozellikler: true },
    });
    expect(tesisler.length).toBeGreaterThan(0);

    const sapan = tesisler.filter((t) => {
      const o = t.ozellikler.find((z) => z.anahtar === 'kuruluGucMw');
      return t.kuruluGucMw === null ? o !== undefined : o?.sayisalDeger !== t.kuruluGucMw;
    });
    expect(sapan.map((t) => t.kod), 'kolon ile öznitelik ayrıştı').toEqual([]);

    /* Ölçülmemiş olan gerçekten satırsız mı — yukarıdaki döngü bunu
       kapsıyor ama ayrıca sayıyla sabitleniyor ki "hiç null yok" diye
       vakum geçmesin. */
    const olculmemis = tesisler.filter((t) => t.kuruluGucMw === null);
    expect(olculmemis.length, 'ölçülmemiş tesis kalmamış — test artık bir şey ölçmüyor')
      .toBeGreaterThan(0);
    for (const t of olculmemis) {
      expect(t.ozellikler.filter((o) => o.anahtar === 'kuruluGucMw'), `${t.kod}`).toEqual([]);
    }
  });

  it('birim kurulu gücü de kayıpsız taşındı [URN-ALN-001]', async () => {
    const birimler = await db.uretimUnitesi.findMany({
      select: { kod: true, kuruluGucMw: true, ozellikler: true },
    });
    expect(birimler.length).toBeGreaterThan(0);

    const sapan = birimler.filter((b) => {
      const o = b.ozellikler.find((z) => z.anahtar === 'kuruluGucMw');
      return b.kuruluGucMw === null ? o !== undefined : o?.sayisalDeger !== b.kuruluGucMw;
    });
    expect(sapan.map((b) => b.kod)).toEqual([]);
  });

  it('göç ölçüm zamanı uydurmaz [URN-ALN-001]', async () => {
    /* Göç anını "ölçüm anı" diye yazmak, ölçülmemiş bir şeyi ölçülmüş
       göstermek olurdu. Kaynak künyesi ise yazılır: değerin nereden
       geldiği kaybolmasın. */
    const gocle = await db.tesisOzellik.findMany({ where: { kaynak: 'goc:P1' } });
    expect(gocle.length).toBeGreaterThan(0);
    expect(gocle.every((o) => o.olcumZamani === null), 'göç ölçüm zamanı yazmış').toBe(true);
    expect(gocle.every((o) => o.birim === 'MW')).toBe(true);
  });
});
