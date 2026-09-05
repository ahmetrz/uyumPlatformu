import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   C22/C23 ters bağı — "bu kontrolü hangi belge karşılıyor?" (VERİ katmanı)

   Kütük ile matris arasındaki bağ SANTRAL DUYARLIDIR ve iki kural burada
   sınanır, çünkü ikisi de sessizce yanlış olabilir:

   1. Kurumsal belge (santral bağı YOK) her santralin hücresine düşer.
      "Bağ yok" hiçbir santral demek değildir, tüm portföy demektir; ters
      okunursa politikası olan bir kontrol belgesiz görünür.
   2. Santrale bağlı belge YALNIZ kendi santralinin hücresine düşer.
      Ters okunursa bir santralin belgesi ötekinin uyumunu kanıtlıyor
      sanılır — denetimde en pahalı yanlış budur.

   Üçüncüsü örtü kuralının kendisi: yalnız `yururlukte` belge karşılar ve
   eksik hâl hücre ipucuna yazılır.

   Kurulum: dev.db kopyası, TEST_DB importlardan ÖNCE (proje kalıbı).
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-belge-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { cerceveleriYukle } = await import('@/app/(kabuk)/(operasyonel)/uyum/veri');
const { belgeOrtusu } = await import('@/app/(kabuk)/(operasyonel)/dokumanlar/mantik');

/** Test için üretilen belgelerin ön eki — temizlik bunu siler. */
const ONEK = 'TEST-BELGE-';

let maddeId = '';
let tesisA = '';
let tesisB = '';

/** İki santralli, aranan maddeyi taşıyan bir hücre çifti bulur. */
async function hedefiSec() {
  const cerceveler = await cerceveleriYukle(null);
  for (const c of cerceveler) {
    if (c.satirlar.length < 2) continue;
    for (const k of c.satirlar[0].kontroller) {
      /* Seed'de zaten belgesi olan madde seçilmez: ölçtüğümüz şey bizim
         eklediğimiz belgeler olmalı, seed'in kalıntısı değil. */
      const bagli = await db.dokumanMadde.count({ where: { maddeId: k.maddeId } });
      if (bagli > 0) continue;
      if (!c.satirlar[1].kontroller.some((x) => x.maddeId === k.maddeId)) continue;
      return { maddeId: k.maddeId, tesisA: c.satirlar[0].id, tesisB: c.satirlar[1].id };
    }
  }
  return null;
}

/** (tesis × madde) hücresini yeniden okur. */
async function hucre(tesisId: string) {
  const cerceveler = await cerceveleriYukle(null);
  for (const c of cerceveler) {
    const satir = c.satirlar.find((s) => s.id === tesisId);
    const k = satir?.kontroller.find((x) => x.maddeId === maddeId);
    if (k) return k;
  }
  throw new Error('hücre bulunamadı');
}

async function belgeEkle(
  kod: string, durum: string, tesisler: string[],
): Promise<string> {
  const d = await db.dokuman.create({
    data: {
      kod: ONEK + kod, baslik: `${kod} başlığı`, tur: 'politika', durum,
      maddeBaglantilari: { create: [{ maddeId }] },
      tesisBaglantilari: { create: tesisler.map((tesisId) => ({ tesisId })) },
    },
  });
  return d.id;
}

beforeAll(async () => {
  const hedef = await hedefiSec();
  expect(hedef, 'iki santralde ortak, belgesiz bir yaprak kontrol bulunmalı').not.toBeNull();
  ({ maddeId, tesisA, tesisB } = hedef!);
});

afterAll(async () => {
  await db.dokuman.deleteMany({ where: { kod: { startsWith: ONEK } } });
});

describe('cerceveleriYukle — kontrolün belge örtüsü', () => {
  it('belge yokken hücre BELGESİZDİR ve bunu ipucunda söyler', async () => {
    const k = await hucre(tesisA);
    expect(k.belgeler).toHaveLength(0);
    expect(belgeOrtusu(k.belgeler.map((b) => b.durum))).toBe('belgesiz');
    expect(k.ipucu).toContain('belgesiz');
  });

  it('kurumsal belge (santral bağı yok) HER santralin hücresine düşer', async () => {
    await belgeEkle('KURUMSAL', 'yururlukte', []);
    for (const t of [tesisA, tesisB]) {
      const k = await hucre(t);
      expect(k.belgeler.map((b) => b.kod)).toEqual([`${ONEK}KURUMSAL`]);
      expect(k.belgeler[0].kurumsal).toBe(true);
      expect(belgeOrtusu(k.belgeler.map((b) => b.durum))).toBe('karsilandi');
      // Karşılanan hâl ipucuna yazılmaz — iyi haber yer kaplamaz.
      expect(k.ipucu).not.toContain('belgesiz');
    }
    await db.dokuman.deleteMany({ where: { kod: { startsWith: ONEK } } });
  });

  it('santrale bağlı belge ÖTEKİ santralin hücresine sızmaz [UYU-BLG-001]', async () => {
    await belgeEkle('SANTRAL-A', 'yururlukte', [tesisA]);

    const a = await hucre(tesisA);
    expect(a.belgeler.map((b) => b.kod)).toEqual([`${ONEK}SANTRAL-A`]);
    expect(a.belgeler[0].kurumsal).toBe(false);
    expect(belgeOrtusu(a.belgeler.map((b) => b.durum))).toBe('karsilandi');

    const b = await hucre(tesisB);
    expect(b.belgeler).toHaveLength(0);
    expect(b.ipucu).toContain('belgesiz');

    await db.dokuman.deleteMany({ where: { kod: { startsWith: ONEK } } });
  });

  it('yalnız taslak belge KARŞILAMAZ; hücre bunu ipucunda ayrı yazar', async () => {
    await belgeEkle('TASLAK', 'taslak', []);
    const k = await hucre(tesisA);
    expect(k.belgeler.map((b) => b.durum)).toEqual(['taslak']);
    expect(belgeOrtusu(k.belgeler.map((b) => b.durum))).toBe('yalniz_taslak');
    expect(k.ipucu).toContain('belge yürürlükte değil');
    // "Belgesiz" ile aynı sözcüğe düşmez: ikisi ayrı iş demektir.
    expect(k.ipucu).not.toContain('· belgesiz');

    // Aynı maddeye yürürlükte bir belge eklenince örtü kapanır.
    await belgeEkle('YURURLUKTE', 'yururlukte', []);
    const sonra = await hucre(tesisA);
    expect(sonra.belgeler).toHaveLength(2);
    expect(belgeOrtusu(sonra.belgeler.map((b) => b.durum))).toBe('karsilandi');
    expect(sonra.ipucu).not.toContain('belge yürürlükte değil');

    await db.dokuman.deleteMany({ where: { kod: { startsWith: ONEK } } });
  });

  it('hiçbir maddeye bağlanmamış belge matrise hiç girmez', async () => {
    const d = await db.dokuman.create({
      data: { kod: `${ONEK}BAGSIZ`, baslik: 'Bağsız', tur: 'politika', durum: 'yururlukte' },
    });
    const k = await hucre(tesisA);
    expect(k.belgeler.map((b) => b.id)).not.toContain(d.id);
    await db.dokuman.deleteMany({ where: { kod: { startsWith: ONEK } } });
  });

  it('silinmiş belge kontrolü karşılamaya devam etmez', async () => {
    const id = await belgeEkle('SILINEN', 'yururlukte', []);
    expect((await hucre(tesisA)).belgeler).toHaveLength(1);
    await db.dokuman.update({ where: { id }, data: { silindi: new Date() } });
    const k = await hucre(tesisA);
    expect(k.belgeler).toHaveLength(0);
    expect(k.ipucu).toContain('belgesiz');
  });
});
