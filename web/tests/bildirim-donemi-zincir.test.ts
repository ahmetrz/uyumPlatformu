import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   R10+ · TAKVİM TETİKLİ YÜKÜMLÜLÜK — ZİNCİRİN KENDİSİ [OLY-BIL-006]

   Saf kurallar `bildirim-donemi.test.ts`te. Burada ölçülen şey ZİNCİR:
   gerçek bir yükümlülükten gerçek bir dönem doğuyor mu, ikinci koşuda
   ikinci dönem açılıyor mu, periyodu belirsiz yükümlülük dönem açıyor
   mu ve motor bir dönemi "verildi" yazabiliyor mu.

   Motor SAHTELENMEZ: gerçek veritabanına karşı koşar.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-donem-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { acikDonemleriKur } = await import('@/lib/uyum/bildirimDonemiAcma');

const damga = Date.now();
const GUN = 24 * 3_600_000;
let yilId = '';
let teslimsizId = '';
let belirsizId = '';

beforeAll(async () => {
  /* Fikstürdeki kurallar bu turu etkilemesin. */
  await db.bildirimYukumlulugu.updateMany({ data: { aktif: false } });

  const ortak = {
    tetikleyici: 'takvim', asgariSiddet: 'dusuk', sureSaat: null,
    dayanak: 'Kurgusal dayanak — ölçüm için', aktif: true,
  };
  yilId = (await db.bildirimYukumlulugu.create({
    data: {
      ...ortak, kod: `D-YIL-${damga}`, ad: 'Yıllık rapor',
      merci: 'Kurgusal Kurum A', donem: 'yillik', donemBaslangici: '01-01', teslimGun: 30,
    },
  })).id;
  teslimsizId = (await db.bildirimYukumlulugu.create({
    data: {
      ...ortak, kod: `D-TESLIMSIZ-${damga}`, ad: 'Teslim süresi olmayan',
      merci: 'Kurgusal Kurum B', donem: 'ceyreklik', donemBaslangici: null, teslimGun: null,
    },
  })).id;
  belirsizId = (await db.bildirimYukumlulugu.create({
    data: {
      ...ortak, kod: `D-BELIRSIZ-${damga}`, ad: 'Periyodu belirsiz',
      merci: 'Kurgusal Kurum C', donem: null, donemBaslangici: null, teslimGun: null,
    },
  })).id;
});

afterAll(async () => { await rm(dizin, { recursive: true, force: true }); });

describe('motor DÖNEM AÇAR [OLY-BIL-006]', () => {
  let ilkKosu: Awaited<ReturnType<typeof acikDonemleriKur>>;
  beforeAll(async () => { ilkKosu = await acikDonemleriKur(db); });

  it('takvim tetikli her yükümlülük için içinde bulunulan dönem açılır [OLY-BIL-006]', async () => {
    expect(ilkKosu.acilanDonem).toBeGreaterThanOrEqual(2);
    const d = await db.bildirimDonemi.findFirstOrThrow({ where: { yukumlulukId: yilId } });
    expect(d.durum).toBe('acik');
    /* Dönem penceresi ŞİMDİYİ kapsar: geçmiş bir dönem açmak, kurumdan
       yapamayacağı bir raporu istemek olurdu. */
    expect(d.baslangic.getTime()).toBeLessThanOrEqual(Date.now());
    expect(d.bitis.getTime()).toBeGreaterThan(Date.now());
    /* SON TARİH DÖNEM KAPANDIKTAN SONRA: teslim, dönem içinde değil
       bittikten sonra yapılır. */
    expect(d.sonTarih!.getTime()).toBe(d.bitis.getTime() + 30 * GUN);
  });

  it('PERİYODU BELİRSİZ yükümlülükte dönem AÇILMAZ ve bu sayılır [OLY-BIL-006]', async () => {
    /* Mevzuat periyot vermediyse ürün bir takvim uydurmaz. Açılmayan
       dönem gizlenmez: sayılır ve rapora yazılır. */
    expect(await db.bildirimDonemi.count({ where: { yukumlulukId: belirsizId } })).toBe(0);
    expect(ilkKosu.donemsiz).toBeGreaterThanOrEqual(1);
  });

  it('TESLİM SÜRESİ olmayan dönem açılır ama SON TARİHİ yoktur', async () => {
    const d = await db.bildirimDonemi.findFirstOrThrow({ where: { yukumlulukId: teslimsizId } });
    expect(d.sonTarih).toBeNull();
    expect(d.durum).toBe('acik');
    expect(ilkKosu.teslimsiz).toBeGreaterThanOrEqual(1);
  });

  it('İKİNCİ koşuda ikinci dönem AÇILMAZ — idempotent', async () => {
    const once = await db.bildirimDonemi.count();
    const k = await acikDonemleriKur(db);
    expect(k.acilanDonem).toBe(0);
    expect(await db.bildirimDonemi.count()).toBe(once);
  });

  it('motor HİÇBİR döneme verildi/teyit/uygulanmaz yazmadı [OLY-BIL-006]', async () => {
    const kapali = await db.bildirimDonemi.count({
      where: { durum: { in: ['verildi', 'teyit_alindi', 'uygulanmaz'] } },
    });
    expect(kapali).toBe(0);
  });

  it('dönem açılışı AKTÖRSÜZ bir ize düşer — kararı insan vermedi', async () => {
    const d = await db.bildirimDonemi.findFirstOrThrow({ where: { yukumlulukId: yilId } });
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'BildirimDonemi', varlikId: d.id, eylem: 'olusturma' },
    });
    expect(iz, 'motorun açtığı dönemin izi yok').not.toBeNull();
    expect(iz!.aktorId, 'motor kararı bir insana yazılamaz').toBeNull();
    expect(iz!.gerekce).toContain('motor');
  });

  it('KAPALI döneme motor DOKUNMAZ', async () => {
    const d = await db.bildirimDonemi.findFirstOrThrow({ where: { yukumlulukId: yilId } });
    await db.bildirimDonemi.update({
      where: { id: d.id },
      data: { durum: 'verildi', referansNo: 'DEMO-1', sonTarih: new Date(Date.now() - GUN) },
    });
    await acikDonemleriKur(db);
    const sonra = await db.bildirimDonemi.findUniqueOrThrow({ where: { id: d.id } });
    expect(sonra.durum).toBe('verildi');
  });
});

describe('bekçi: motor dosyası insan kararı YAZAMAZ [OLY-BIL-006]', () => {
  it('dönem döngüsünde `verildi` · `teyit_alindi` · `uygulanmaz` GEÇMEZ', () => {
    /* Kural yetmez, kapı gerekir — olay tarafındaki bekçinin aynısı.
       Motor dosyası METİN olarak taranır: bir gün biri "kolaylık olsun"
       diye `verildi` yazarsa kural sessizce ölmez. */
    const ham = readFileSync('lib/uyum/bildirimDonemiAcma.ts', 'utf8');
    const kaynak = ham.replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').map((s) => s.replace(/\/\/.*$/, '')).join('\n');
    for (const yasak of ['verildi', 'teyit_alindi', 'uygulanmaz']) {
      expect(new RegExp(`['"\`]${yasak}['"\`]`).test(kaynak), yasak).toBe(false);
    }
    /* Boşluk kontrolü: dosya gerçekten dönem açıyor mu — hiçbir şey
       yazmayan bir motorda yukarıdaki tarama da yeşil yanardı. */
    expect(/['"`]acik['"`]/.test(kaynak)).toBe(true);
    expect(/donemKarari|motorYazabilirMiDonem/.test(kaynak)).toBe(true);
  });
});
