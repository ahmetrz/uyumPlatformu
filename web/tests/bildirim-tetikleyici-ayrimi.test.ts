import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
/* TİP-ONLY içe aktarım derlemede silinir: modül `TEST_DB` kurulmadan
   YÜKLENMEZ. */
import type { SureliYukumluluk } from '@/lib/uyum/bildirimKaydi';
import type { Yukumluluk } from '@/lib/uyum/bildirimSuresi';

/* ═══════════════════════════════════════════════════════════════════════
   TAKVİM TETİKLİ YÜKÜMLÜLÜK OLAYA BAĞLANMAZ — KARIŞIMIN KENDİSİ
   [OLY-BIL-009]

   ── ÖLÇÜLEN KUSUR (bağımsız inceleme, #49 tur 2) ──────────────────────
   R10+ takvim tarafı için AYRI bir motor yazıldı (`acikDonemleriKur`) ve
   o motor `tetikleyici: 'takvim'` ile doğru daraltıyordu. Eski OLAY
   motoru ise simetrik daralmayı ALMADI: `bildirimYukumlulugu`yu yalnız
   `aktif: true` ile okuyordu.

   Sonuç ölçüldü — tohumlanmış veritabanında ALTI sahte `BildirimKaydi`:
   üç takvim satırı (`asgariSiddet: 'dusuk'` ve `regulasyonId: null`
   olduğu için HER açık olaya uyuyor) iki açık olaya bağlanmıştı. Bir
   siber olayın altına "Yıllık uyum raporu" yükümlülüğü düşüyordu; kayıt
   `/olaylar` ekranında görünüyor ve KANIT PAKETİNE giriyordu.

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   Bu, turun birinci bulgusuyla (MFA'nın girişe hiç bağlanmaması) AYNI
   SINIF: iki parça da tek tek doğru, tek tek testli; BİRLEŞTİKLERİ yeri
   kimse ölçmemiş. Mevcut zincir testi (`bildirim-donemi-zincir.test.ts`)
   karışımı göremezdi çünkü başlarken bütün öbür yükümlülükleri
   söndürüyor. Burada tam tersi yapılır: İKİ TÜR DE aynı anda vardır ve
   ölçülen şey ayrımın kendisidir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-tetikleyici-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { acikOlaylarinKayitlarini } = await import('@/lib/uyum/bildirimKaydiAcma');
const { uyanYukumlulukler } = await import('@/lib/uyum/bildirimKaydi');
const { olaylaUyanir, uyanYukumluluk } = await import('@/lib/uyum/bildirimSuresi');

const damga = Date.now();
let takvimId = '';
let olayKuraliId = '';
let olayId = '';

beforeAll(async () => {
  /* Fikstürdeki kurallar bu turu etkilemesin — ama YENİ kuralların İKİ
     TÜRÜ DE açık kalır: ölçülen şey karışım. */
  await db.bildirimYukumlulugu.updateMany({ data: { aktif: false } });

  takvimId = (await db.bildirimYukumlulugu.create({
    data: {
      kod: `T-TAKVIM-${damga}`, ad: 'Kurgusal yıllık rapor',
      merci: 'Kurgusal Düzenleyici', dayanak: 'Kurgusal dayanak — ölçüm için',
      /* TAM DA KUSURU ÜRETEN KOMBİNASYON: en alt şiddet eşiği + regülasyon
         bağı yok → olay motoru için "her olaya uyar". */
      tetikleyici: 'takvim', asgariSiddet: 'dusuk', regulasyonId: null,
      sureSaat: null, donem: 'yillik', donemBaslangici: '01-01', teslimGun: 30,
      aktif: true,
    },
  })).id;

  olayKuraliId = (await db.bildirimYukumlulugu.create({
    data: {
      kod: `T-OLAY-${damga}`, ad: 'Kurgusal olay bildirimi',
      merci: 'Kurgusal Düzenleyici', dayanak: 'Kurgusal dayanak — ölçüm için',
      tetikleyici: 'olay', asgariSiddet: 'dusuk', regulasyonId: null,
      sureSaat: 72, aktif: true,
    },
  })).id;

  olayId = (await db.olay.create({
    data: {
      kod: `OLY-TETIK-${damga}`, baslik: 'Kurgusal olay — tetikleyici ayrımı',
      siddet: 'orta', durum: 'acik', bildirimGerekli: true,
      baslangic: new Date(Date.now() - 3_600_000),
    },
  })).id;
});

afterAll(async () => {
  await rm(dizin, { recursive: true, force: true });
  expect(existsSync(dizin), 'geçici veritabanı dizini silinmedi').toBe(false);
});

describe('SAF KARAR · olayla uyanan yükümlülük [OLY-BIL-009]', () => {
  const yuk = (ek: Partial<SureliYukumluluk> = {}): SureliYukumluluk => ({
    id: 'y1', kod: 'K1', ad: 'Kural', regulasyonId: null, asgariSiddet: 'dusuk',
    sureSaat: 72, merci: 'Merci', aktif: true, tetikleyici: 'olay', ...ek,
  });

  it('TAKVİM tetikli kural olaya UYMAZ [OLY-BIL-009]', () => {
    const cikan = uyanYukumlulukler({
      siddet: 'kritik', regulasyonIdleri: [],
      kurallar: [yuk({ kod: 'OLAY' }), yuk({ id: 'y2', kod: 'TAKVIM', tetikleyici: 'takvim' })],
    });
    expect(cikan.map((k) => k.kod)).toEqual(['OLAY']);
  });

  it('TEKİL seçici de takvim kuralını almaz [OLY-BIL-009]', () => {
    const kural = (ek: Partial<Yukumluluk> = {}): Yukumluluk => ({
      id: 'k1', kod: 'K1', ad: 'Kural', regulasyonId: null, asgariSiddet: 'dusuk',
      sureSaat: 24, merci: 'Merci', aktif: true, tetikleyici: 'olay', ...ek,
    });
    /* Takvim kuralı DAHA KISA süreli olsa bile seçilmemeli: eskiden
       yarışa giriyordu ve kazanabiliyordu. */
    const secilen = uyanYukumluluk({
      siddet: 'kritik', regulasyonIdleri: [],
      kurallar: [kural({ sureSaat: 72 }), kural({ id: 'k2', kod: 'TAKVIM', sureSaat: 1, tetikleyici: 'takvim' })],
    });
    expect(secilen?.kod).toBe('K1');
  });

  it('TANIMADIĞI tetikleyici de UYMAZ — yüklem olumlu [OLY-BIL-009]', () => {
    /* `!== 'takvim'` yazılsaydı bu vaka YEŞİL kalırdı ve yarın eklenen
       üçüncü tür olay motoruna sessizce girerdi. */
    expect(olaylaUyanir('olay')).toBe(true);
    expect(olaylaUyanir('takvim')).toBe(false);
    expect(olaylaUyanir('denetim')).toBe(false);
    expect(olaylaUyanir('')).toBe(false);
    const cikan = uyanYukumlulukler({
      siddet: 'kritik', regulasyonIdleri: [],
      kurallar: [yuk({ kod: 'YENI-TUR', tetikleyici: 'denetim' })],
    });
    expect(cikan).toEqual([]);
  });
});

describe('ZİNCİR · motor karışımı ayırıyor [OLY-BIL-009]', () => {
  it('açık olaya YALNIZ olay tetikli kural için kayıt açılır [OLY-BIL-009]', async () => {
    const kosu = await acikOlaylarinKayitlarini(db);
    expect(kosu.acilanTaslak, 'motor hiçbir kayıt açmadı — fikstür mü bozuldu').toBeGreaterThan(0);

    const kayitlar = await db.bildirimKaydi.findMany({
      where: { olayId },
      select: { yukumlulukId: true, yukumluluk: { select: { kod: true, tetikleyici: true } } },
    });
    const turler = kayitlar.map((k) => k.yukumluluk.tetikleyici);
    expect(turler, `takvim tetikli kayıt açıldı: ${JSON.stringify(kayitlar)}`)
      .not.toContain('takvim');
    expect(kayitlar.map((k) => k.yukumlulukId)).toContain(olayKuraliId);
  });

  it('TAKVİM yükümlülüğünün HİÇBİR olay kaydı yok [OLY-BIL-009]', async () => {
    const sayi = await db.bildirimKaydi.count({ where: { yukumlulukId: takvimId } });
    expect(sayi, 'takvim tetikli yükümlülük bir olaya bağlandı').toBe(0);
  });

  it('ikinci koşu da açmıyor — tekrar da sızdırmaz [OLY-BIL-009]', async () => {
    await acikOlaylarinKayitlarini(db);
    expect(await db.bildirimKaydi.count({ where: { yukumlulukId: takvimId } })).toBe(0);
  });
});
