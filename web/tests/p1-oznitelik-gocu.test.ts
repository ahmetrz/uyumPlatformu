import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { KURULU_GUC } from '../lib/alan/oznitelik';

// TEST_DB importlardan ÖNCE: gerçek dev.db'ye dokunulmaz (tests/sahte/db.ts kuralı).
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-p1-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
/* Sentetik SQLite dosyası HAM sürücüyle açılır, Prisma istemcisiyle değil:
   üretilen istemci SAĞLAYICIYA BAĞLIDIR (R5) ve PostgreSQL istemcisiyle
   koşulduğunda bu test "adaptör uyumsuz" diye düşüyordu — yani SQLite göç
   zincirini ölçen bir test, ölçtüğü şeyle ilgisiz bir sebeple kırmızıydı.
   Ham sürücü iki sağlayıcıda da aynı ölçümü yapar. */
const { default: Sqlite } = await import('better-sqlite3');
const { tesisKapsaminiHesapla } = await import('@/lib/motorlar/uygulanabilirlik');

/* ═══════════════════════════════════════════════════════════════════════
   P1 · kurulu güç kolondan özniteliğe (URN-ALN-001)

   Göçün ölçüsü "çalıştı mı" değil, "DEĞER KAYBOLDU MU". İki iddia var ve
   ikincisi ilkinden daha kolay kaybedilir:

   1. Değeri olan her tesis/birim, aynı sayıyı öznitelik satırında taşır.
   2. Değeri OLMAYAN tesis öznitelik satırı ALMAZ. Boş bir satır
      ("ölçüldü, değeri yok") ile ölçülmemiş nitelik aynı şey değildir.
      Göç betiği `WHERE ... IS NOT NULL` yazmasaydı 17. tesis sessizce
      "kurulu gücü var ama boş" hâline gelir, ekranda sıfır gibi okunurdu.

   ── NEDEN SENTETİK VERİTABANI ─────────────────────────────────────────
   Kolon aynı pakette DÜŞTÜ (`20260907001500`). Kolon yokken "kolon ile
   öznitelik aynı mı" diye sorulamaz. Bu yüzden test artık uygulama
   veritabanına değil, GÖÇ BETİĞİNİN KENDİSİNE bakıyor: göç öncesi şema
   boş bir SQLite dosyasında kurulur, migration dosyalarındaki taşıma
   cümleleri DİSKTEN OKUNUP çalıştırılır, sonuç ölçülür. Sınanan şey
   değişmeyen bir eserdir; kolon düştüğü için körelmez ve göç betiği elle
   düzenlenirse kırmızı olur.

   `0` değeri fikstürde BİLEREK var: "ölçülmedi" ile "ölçtük, sıfır çıktı"
   ayrımını sadece `IS NOT NULL` koruyor. `WHERE kuruluGucMw > 0` yazan
   bir göç bu testte düşer.
   ═══════════════════════════════════════════════════════════════════════ */

/** Migration dosyalarından öznitelik taşıyan INSERT cümleleri, sırayla. */
function tasimaCumleleri(tablo: 'TesisOzellik' | 'BirimOzellik'): string[] {
  const kok = 'prisma/migrations';
  const cumleler: string[] = [];
  for (const goc of readdirSync(kok).sort()) {
    const dosya = path.join(kok, goc, 'migration.sql');
    let icerik: string;
    try { icerik = readFileSync(dosya, 'utf8'); } catch { continue; }
    // Satır yorumları atılır; kalan metin `;` ile cümlelere bölünür.
    const sade = icerik.split('\n').filter((s) => !s.trimStart().startsWith('--')).join('\n');
    for (const ham of sade.split(';')) {
      const c = ham.trim();
      /* Yalnız KURULU GÜÇ taşıması: B2 göçü de `TesisOzellik`e yazar ama
         kaynağı `TesisProfili`dir ve bu sentetik şemada o tablo yoktur. */
      if (/^INSERT(\s+OR\s+IGNORE)?\s+INTO\s+"/i.test(c) && c.includes(`"${tablo}"`)
        && c.includes('kuruluGucMw')) {
        cumleler.push(`${c};`);
      }
    }
  }
  return cumleler;
}

describe('P1 · öznitelik göçü', () => {
  it('göç betiği kurulu gücü kayıpsız taşır; ölçülmemiş satır almaz [URN-ALN-001]', async () => {
    /* Göç öncesi şema sentetik bir dosyada kurulur. Prisma istemcisi
       yalnız ham SQL taşıyıcısı olarak kullanılıyor — sorgular tabloları
       şemadan değil, buradaki DDL'den tanıyor. */
    const gocDb = path.join(dizin, 'goc.db');
    const sqlite = new Sqlite(gocDb);
    const ham = {
      $executeRawUnsafe: async (c: string) => { sqlite.exec(c); },
      $queryRawUnsafe: async <T>(c: string): Promise<T> => sqlite.prepare(c).all() as T,
      $disconnect: async () => { sqlite.close(); },
    };
    const kur = [
      'CREATE TABLE "Tesis" ("id" TEXT PRIMARY KEY, "kod" TEXT NOT NULL, "kuruluGucMw" REAL)',
      'CREATE TABLE "UretimUnitesi" ("id" TEXT PRIMARY KEY, "kod" TEXT NOT NULL, "kuruluGucMw" REAL)',
      'CREATE TABLE "TesisOzellik" ("id" TEXT PRIMARY KEY, "tesisId" TEXT NOT NULL,'
        + ' "anahtar" TEXT NOT NULL, "sayisalDeger" REAL, "metinDeger" TEXT, "birim" TEXT,'
        + ' "kaynak" TEXT, "olcumZamani" DATETIME, "guncellendi" DATETIME NOT NULL)',
      'CREATE UNIQUE INDEX "TesisOzellik_tesisId_anahtar_key" ON "TesisOzellik"("tesisId","anahtar")',
      'CREATE TABLE "BirimOzellik" ("id" TEXT PRIMARY KEY, "birimId" TEXT NOT NULL,'
        + ' "anahtar" TEXT NOT NULL, "sayisalDeger" REAL, "metinDeger" TEXT, "birim" TEXT,'
        + ' "kaynak" TEXT, "olcumZamani" DATETIME, "guncellendi" DATETIME NOT NULL)',
      'CREATE UNIQUE INDEX "BirimOzellik_birimId_anahtar_key" ON "BirimOzellik"("birimId","anahtar")',
      `INSERT INTO "Tesis" VALUES ('t1','OLCULDU-165', 165), ('t2','OLCULDU-KESIRLI', 24.94),
         ('t3','OLCULDU-SIFIR', 0), ('t4','OLCULMEDI', NULL)`,
      `INSERT INTO "UretimUnitesi" VALUES ('b1','BIRIM-82.5', 82.5), ('b2','BIRIM-OLCULMEDI', NULL)`,
    ];
    for (const c of kur) await ham.$executeRawUnsafe(c);

    const tesisCumleleri = tasimaCumleleri('TesisOzellik');
    const birimCumleleri = tasimaCumleleri('BirimOzellik');
    expect(tesisCumleleri.length, 'göç dosyalarında taşıma cümlesi bulunamadı')
      .toBeGreaterThan(0);
    expect(birimCumleleri.length).toBeGreaterThan(0);
    for (const c of [...tesisCumleleri, ...birimCumleleri]) await ham.$executeRawUnsafe(c);

    type OzellikSatir = { tesisId: string; anahtar: string; sayisalDeger: number;
      birim: string | null; kaynak: string | null; olcumZamani: string | null };
    const oku = () => ham.$queryRawUnsafe<OzellikSatir[]>(
      'SELECT "tesisId","anahtar","sayisalDeger","birim","kaynak","olcumZamani"'
      + ' FROM "TesisOzellik" ORDER BY "tesisId"');
    const satirlar = await oku();

    expect(satirlar.map((s) => [s.tesisId, s.sayisalDeger]),
      'ölçülen değer taşınmadı ya da ölçülmemiş tesise satır açıldı')
      .toEqual([['t1', 165], ['t2', 24.94], ['t3', 0]]);
    expect(satirlar.every((s) => s.anahtar === 'kuruluGucMw' && s.birim === 'MW')).toBe(true);
    /* Göç anını "ölçüm anı" diye yazmak, ölçülmemiş bir şeyi ölçülmüş
       göstermek olurdu. Kaynak künyesi ise yazılır. */
    expect(satirlar.every((s) => s.olcumZamani === null), 'göç ölçüm zamanı uydurdu').toBe(true);
    expect(satirlar.every((s) => s.kaynak === 'goc:P1')).toBe(true);

    const birimSatirlari = await ham.$queryRawUnsafe<{ birimId: string; sayisalDeger: number }[]>(
      'SELECT "birimId","sayisalDeger" FROM "BirimOzellik" ORDER BY "birimId"');
    expect(birimSatirlari.map((s) => [s.birimId, s.sayisalDeger])).toEqual([['b1', 82.5]]);

    /* Kolon düşüren göç, kolonu yok etmeden ÖNCE taşımayı bir kez daha
       koşuyor (`INSERT OR IGNORE`) — "önceki göç koştu" varsayımına
       güvenmemek için. O cümleler zaten dolu bir tabloda ikinci kez
       çalışacak: ne satır çoğaltmalı ne değer değiştirmeli. */
    const yeniden = [...tesisCumleleri, ...birimCumleleri]
      .filter((c) => /^INSERT\s+OR\s+IGNORE/i.test(c));
    expect(yeniden.length, 'kolonu düşüren göç taşımayı yinelemiyor').toBeGreaterThan(0);
    for (const c of yeniden) await ham.$executeRawUnsafe(c);
    const tekrar = await oku();
    expect(tekrar.map((s) => [s.tesisId, s.sayisalDeger]), 'göç ikinci koşuda satır çoğalttı')
      .toEqual([['t1', 165], ['t2', 24.94], ['t3', 0]]);
    await ham.$disconnect();
  });

  it('uygulama veritabanında ölçülmemiş nitelik SATIRSIZ durur [URN-ALN-001]', async () => {
    /* Sentetik test göç betiğini ölçüyor; bu test yürürlükteki veriyi
       ölçüyor: kurulu güç satırlarının hiçbiri boş değer taşımamalı.
       Satır varsa ölçüm var demektir — "ölçtük ama değeri yok" diye bir
       satır, ekranda sıfırdan ayırt edilemez. */
    const satirlar = await db.tesisOzellik.findMany({ where: { anahtar: KURULU_GUC } });
    expect(satirlar.length, 'kurulu güç özniteliği kalmamış — test bir şey ölçmüyor')
      .toBeGreaterThan(0);
    expect(satirlar.filter((o) => o.sayisalDeger === null).map((o) => o.tesisId),
      'değeri olmayan öznitelik satırı var — ölçülmemiş nitelik satır ALMAZ').toEqual([]);

    const tesisSayisi = await db.tesis.count();
    expect(tesisSayisi, 'ölçülmemiş tesis kalmamış — ayrım artık sınanmıyor')
      .toBeGreaterThan(satirlar.length);
  });

  it('kural öznitelik üzerinden AYNI kararları üretir [URN-ALN-002]', async () => {
    /* Regresyon: kurulu güç kolondan özniteliğe taşındı. Kural artık
       öznitelik anahtarını okuyor. Kapsama giren tesis kümesi DEĞİŞMEMELİ
       — değişirse göç bir iş kuralını sessizce kaydırmış demektir.

       Elle değiştirilmiş karara motor DOKUNMAZ; o yüzden yeniden hesaplama
       sonrası da kümede kalmalı. */
    const oncekiler = await db.uygulanabilirlikKarari.findMany({
      include: { kapsamOgesi: { select: { kod: true } } },
    });
    const oncekiEvet = oncekiler.filter((k) => k.uygulanabilir === true)
      .map((k) => k.kapsamOgesi.kod).sort();

    const tesisler = await db.tesis.findMany({ select: { id: true } });
    for (const t of tesisler) await tesisKapsaminiHesapla(t.id, null);

    const sonrakiler = await db.uygulanabilirlikKarari.findMany({
      include: { kapsamOgesi: { select: { kod: true } } },
    });
    const sonrakiEvet = sonrakiler.filter((k) => k.uygulanabilir === true)
      .map((k) => k.kapsamOgesi.kod).sort();

    expect(sonrakiEvet, 'öznitelik göçü kapsam kümesini değiştirdi').toEqual(oncekiEvet);
    expect(sonrakiEvet.length, 'kapsamda tesis kalmamış — test bir şey ölçmüyor')
      .toBeGreaterThan(0);

    /* Elle değiştirilmiş karar korunmuş mu: motorun dokunmadığı tek yer. */
    const elle = sonrakiler.filter((k) => k.elIleDegistirildi);
    expect(elle.length, 'elle değiştirilmiş karar kalmamış').toBeGreaterThan(0);
    for (const k of elle) {
      const onceki = oncekiler.find((o) => o.id === k.id);
      expect(k.uygulanabilir, `${k.kapsamOgesi.kod} override'ı ezildi`).toBe(onceki?.uygulanabilir);
    }
  });
});
