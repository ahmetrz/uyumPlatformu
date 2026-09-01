import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   PROJE → PROJE BAĞIMLILIĞI

   BULUNAN KUSUR: `ProjeBagimliligi` şemada vardı, tohum beş gerçekçi
   zincir yazıyordu (SIEM-OT → OT-SEG, UZAK-BAKIM → PAM ve üç proje →
   ENVANTER) ve KOD HİÇBİR YERDE OKUMUYORDU — `db.projeBagimliligi`
   ifadesi `app/` ve `lib/` altında tek bir kez bile geçmiyordu. Veri
   duruyor, kararı veren insan görmüyordu. Bir projenin "yolunda"
   sayılması, önkoşulunun durumunu bilmeden yapılamaz.

   Burada iki şey ayrı ayrı sabitlenir:
   1. SORGU gerçekten ilişkiyi getiriyor — saf yüklem testi bunu yakalamaz,
      bozuk bir `include` sessizce boş dizi döndürür ve "bağımlılık yok"
      diye okunur.
   2. YÜKLEMLER doğru: "tamamlandı" dışındaki her önkoşul engeldir; iptal
      edilmiş önkoşul da engeldir (dayanılan iş artık hiç yapılmayacak);
      kapanmış projeler "bana bağlı" listesinden düşer.

   TEST_DB, db'ye dokunan HER importtan ÖNCE ayarlanır (proje kalıbı).
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-proje-bag-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const O = await import('@/app/(atlas)/(operasyonel)/projeler/ortak');

type P = import('@/app/(atlas)/(operasyonel)/projeler/ortak').P;
type Bagimlilik = import('@/app/(atlas)/(operasyonel)/projeler/ortak').Bagimlilik;

const SIMDI = new Date('2026-09-01T00:00:00.000Z').getTime();

const bag = (o: Partial<Bagimlilik> = {}): Bagimlilik =>
  ({ id: 'b1', kod: 'PRJ-X', ad: 'Önkoşul', durum: 'devam', hedef: null, ...o });

/** Yüklemlerin okuduğu iki alanı taşıyan asgari proje. */
const proje = (o: Partial<Pick<P, 'onkosullar' | 'bagimlilar'>> = {}) =>
  ({ onkosullar: [], bagimlilar: [], ...o });

describe('Bağımlılık yüklemleri', () => {
  it('tamamlanmamış her önkoşul ENGELDİR', () => {
    const p = proje({ onkosullar: [
      bag({ id: '1', durum: 'tamamlandi' }),
      bag({ id: '2', durum: 'devam' }),
      bag({ id: '3', durum: 'planlandi' }),
      bag({ id: '4', durum: 'beklemede' }),
    ] });
    expect(O.engelleyenler(p).map((x) => x.id)).toEqual(['2', '3', '4']);
  });

  it('İPTAL edilmiş önkoşul da engeldir — dayanılan iş artık yapılmayacak', () => {
    // Sessizce "engel yok" demek en kötü cevap olurdu: plan değişmeli.
    const p = proje({ onkosullar: [bag({ id: '1', durum: 'iptal' })] });
    expect(O.engelleyenler(p)).toHaveLength(1);
  });

  it('gecikmiş engel AYRI sayılır ve engellerin alt kümesidir', () => {
    const p = proje({ onkosullar: [
      bag({ id: 'gec', durum: 'devam', hedef: '2026-01-01T00:00:00.000Z' }),
      bag({ id: 'ileri', durum: 'devam', hedef: '2027-01-01T00:00:00.000Z' }),
      // Tarihi olmayan engel gecikmiş SAYILMAZ: bilinmiyor ≠ geç.
      bag({ id: 'tarihsiz', durum: 'devam', hedef: null }),
      // Tamamlanmış ve tarihi geçmiş olan engel DEĞİLDİR.
      bag({ id: 'bitmis', durum: 'tamamlandi', hedef: '2026-01-01T00:00:00.000Z' }),
    ] });
    expect(O.gecikmisEngeller(p, SIMDI).map((x) => x.id)).toEqual(['gec']);
    expect(O.engelleyenler(p)).toHaveLength(3);
  });

  it('"bana bağlı" listesinden kapanmış projeler düşer', () => {
    const p = proje({ bagimlilar: [
      bag({ id: '1', durum: 'devam' }),
      bag({ id: '2', durum: 'tamamlandi' }),
      bag({ id: '3', durum: 'iptal' }),
      bag({ id: '4', durum: 'planlandi' }),
    ] });
    // Tamamlanan artık beklemiyor; iptal edilen zaten hiç beklemeyecek.
    expect(O.etkilenenler(p).map((x) => x.id)).toEqual(['1', '4']);
  });

  it('alt satır açık önkoşul sayısını taşır, sıfırsa hiç yazmaz', () => {
    const temel = { kod: 'PRJ-1', tesisler: [], onkosullar: [], bagimlilar: [] } as unknown as P;
    expect(O.altSatir(temel)).toBe('PRJ-1 · portföy');
    const engelli = { ...temel, onkosullar: [bag({ durum: 'devam' })] } as P;
    expect(O.altSatir(engelli)).toBe('PRJ-1 · portföy · 1 önkoşul açık');
    // Kapanmış önkoşul satıra çıkmaz — açık iş yoksa haber de yok.
    const bitmis = { ...temel, onkosullar: [bag({ durum: 'tamamlandi' })] } as P;
    expect(O.altSatir(bitmis)).toBe('PRJ-1 · portföy');
  });
});

/* ═══ Sorgu gerçekten ilişkiyi getiriyor mu ═══════════════════════════ */

describe('Sunucu sorgusu bağımlılığı gerçekten okur', () => {
  let projeler: P[] = [];

  beforeAll(async () => {
    const ham = await db.proje.findMany({
      where: { silindi: null }, include: O.PROJE_ICERIK, orderBy: { kod: 'asc' } });
    projeler = ham.map(O.projeyeCevir);
  });

  it('tohumdaki zincirler iki yönde de okunur', () => {
    const bul = (kod: string) => projeler.find((p) => p.kod === kod);
    const siem = bul('PRJ-SIEM-OT');
    const seg = bul('PRJ-OT-SEG');
    // Tohum bu iki projeyi yazıyor; yoksa test bir şey kanıtlamaz.
    expect(siem, 'tohumda PRJ-SIEM-OT yok').toBeDefined();
    expect(seg, 'tohumda PRJ-OT-SEG yok').toBeDefined();

    // SIEM-OT, OT-SEG'e bağlıdır: ilkinin ÖNKOŞULU ikincisidir…
    expect(siem!.onkosullar.map((o) => o.kod)).toContain('PRJ-OT-SEG');
    // …ve ikincisi ilkini BEKLETİR. Yön karışırsa ekran tam tersini söyler.
    expect(seg!.bagimlilar.map((b) => b.kod)).toContain('PRJ-SIEM-OT');
    expect(seg!.onkosullar.map((o) => o.kod)).not.toContain('PRJ-SIEM-OT');
  });

  it('bir önkoşul birden çok projeyi bekletebilir', () => {
    const env = projeler.find((p) => p.kod === 'PRJ-ENVANTER');
    expect(env).toBeDefined();
    // Tohumda üç proje envantere bağlı (YAMA, EOS-YENILEME, YEDEK-DR).
    expect(env!.bagimlilar.length).toBeGreaterThanOrEqual(3);
  });

  it('bağımlılığı olmayan proje BOŞ dizi taşır — undefined değil', () => {
    // Boş dizi ile eksik alan ekranda aynı görünür ama biri "bağımlılık
    // yok", diğeri "okumayı unuttuk" demektir.
    for (const p of projeler) {
      expect(Array.isArray(p.onkosullar)).toBe(true);
      expect(Array.isArray(p.bagimlilar)).toBe(true);
    }
    expect(projeler.some((p) => p.onkosullar.length === 0)).toBe(true);
  });

  it('gerçek veride en az bir proje açık önkoşul taşıyor', () => {
    // Aksi hâlde yukarıdaki yüklemler üretimde hiç tetiklenmez ve
    // "bağımlılık gösteriliyor" iddiası kanıtsız kalır.
    expect(projeler.some((p) => O.engelleyenler(p).length > 0)).toBe(true);
  });
});
