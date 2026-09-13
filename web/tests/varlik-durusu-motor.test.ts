import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Zafiyet korelasyon motoru — OT-25 · OT-26

   Motorun iki kaynağı var ve ikisi de ayrı ayrı sınanıyor:

     CİHAZIN KENDİSİ  — üretici / model / firmware üçlüsü.
     SBOM BİLEŞENLERİ — cihazın içindeki kütüphaneler.

   İkincisi olmasaydı SBOM yüklenip hiçbir soruya cevap vermeyen bir
   belge olurdu: zafiyet çoğu zaman cihazda değil içindeki OpenSSL'de.

   Değişmez kural burada da çiviliyor: **motor insanın kararını EZMEZ.**
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-motor-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { zafiyetKorelasyonunuIsle } = await import('@/lib/motorlar/varlikDurusu');

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

let cihazVarlik = '';   // zafiyeti KENDİ firmware'inde olan cihaz
let sbomVarlik = '';    // zafiyeti bir SBOM bileşeninde olan cihaz
let cihazZafiyet = '';
let sbomZafiyet = '';

beforeAll(async () => {
  const tur = (await db.varlikTuru.findFirst())!;
  const tesis = (await db.tesis.findFirst())!;

  /* Var olan advisory'ler bu testin kurduğu cihazlarla eşleşmesin diye
     üretici/model adları benzersiz seçiliyor. */
  const uretici = benzersiz('MOTORTEST');
  const bilesenAdi = benzersiz('libtest');

  cihazVarlik = (await db.varlik.create({
    data: {
      etiket: benzersiz('MOTOR-CIHAZ'), ad: 'Firmware zafiyetli cihaz',
      turId: tur.id, tesisId: tesis.id,
      uretici, model: 'PLC-9000', firmware: '2.1.0',
    },
  })).id;

  sbomVarlik = (await db.varlik.create({
    data: {
      etiket: benzersiz('MOTOR-SBOM'), ad: 'Bileşen zafiyetli cihaz',
      turId: tur.id, tesisId: tesis.id,
      /* Cihazın KENDİSİ hiçbir advisory ile eşleşmiyor: eşleşme yalnız
         SBOM bileşeninden gelebilir. */
      uretici: benzersiz('BASKAURETICI'), model: 'SRV-1', firmware: '9.9.9',
    },
  })).id;

  cihazZafiyet = (await db.zafiyet.create({
    data: { kaynakRef: benzersiz('CVE-CIHAZ'), baslik: 'Cihaz firmware zafiyeti', cvss: 8.1 },
  })).id;
  sbomZafiyet = (await db.zafiyet.create({
    data: { kaynakRef: benzersiz('CVE-BILESEN'), baslik: 'Kütüphane zafiyeti', cvss: 9.1 },
  })).id;

  const advCihaz = await db.advisory.create({
    data: { kaynak: 'uretici', referans: benzersiz('ADV-CIHAZ'), baslik: 'Cihaz duyurusu' },
  });
  await db.advisoryUrunu.create({
    data: {
      advisoryId: advCihaz.id, uretici, urunAdi: 'PLC-9000',
      etkilenenAlt: '2.0.0', etkilenenAltDahil: true,
      etkilenenUst: '2.4.0', etkilenenUstDahil: false,
    },
  });
  await db.advisoryZafiyeti.create({
    data: { advisoryId: advCihaz.id, zafiyetId: cihazZafiyet },
  });

  const advBilesen = await db.advisory.create({
    data: { kaynak: 'nvd', referans: benzersiz('ADV-BILESEN'), baslik: 'Kütüphane duyurusu' },
  });
  await db.advisoryUrunu.create({
    data: {
      advisoryId: advBilesen.id, urunAdi: bilesenAdi,
      etkilenenAlt: '1.0.0', etkilenenAltDahil: true,
      etkilenenUst: '3.0.8', etkilenenUstDahil: true,
    },
  });
  await db.advisoryZafiyeti.create({
    data: { advisoryId: advBilesen.id, zafiyetId: sbomZafiyet },
  });

  /* SBOM: yalnız `sbomVarlik` için ve içinde zafiyetli sürümde bir
     kütüphane var. */
  const bilesen = await db.yazilimBileseni.create({
    data: { kimlik: `pkg:generic/${bilesenAdi}@3.0.8`, ad: bilesenAdi, surum: '3.0.8' },
  });
  const belge = await db.sbomBelgesi.create({
    data: {
      varlikId: sbomVarlik, bicim: 'cyclonedx',
      kaynakSistem: 'test', kaynakKayitId: benzersiz('SBOM'), bilesenSayisi: 1,
    },
  });
  await db.sbomGirdisi.create({ data: { sbomId: belge.id, bilesenId: bilesen.id } });

  await zafiyetKorelasyonunuIsle();
});

const korelasyon = (varlikId: string, zafiyetId: string) =>
  db.zafiyetKorelasyonu.findFirst({ where: { varlikId, zafiyetId } });

describe('Cihazın kendi sürümü korelasyona girer', () => {
  it('aralıktaki firmware ETKİLENEN olarak yazılır', async () => {
    const k = await korelasyon(cihazVarlik, cihazZafiyet);
    expect(k?.sonuc).toBe('etkilenen');
    expect(k?.yontem).toBe('surum_araligi');
  });

  it('eşleşmeyen cihaz için satır AÇILMAZ (tablo şişmez)', async () => {
    expect(await korelasyon(sbomVarlik, cihazZafiyet)).toBeNull();
  });
});

describe('OT-26 · SBOM bileşeni korelasyona girer', () => {
  it('bileşen sürümü aralıktaysa cihaz ETKİLENEN sayılır', async () => {
    const k = await korelasyon(sbomVarlik, sbomZafiyet);
    expect(k?.sonuc).toBe('etkilenen');
    expect(k?.yontem).toBe('sbom_bileseni');
  });

  it('gerekçe HANGİ bileşen yüzünden olduğunu söyler', async () => {
    const k = await korelasyon(sbomVarlik, sbomZafiyet);
    /* "Bu cihaz etkilenen" demek yetmez: yamalanacak şey kütüphanedir. */
    expect(k?.gerekce).toMatch(/SBOM bileşeni/);
  });

  it('SBOM’u olmayan cihaz bileşen zafiyetinden etkilenmiş SAYILMAZ [ENV-ZAF-001]', async () => {
    expect(await korelasyon(cihazVarlik, sbomZafiyet)).toBeNull();
  });

  it('üst uç DAHİL olduğunda tam sınırdaki sürüm etkilenendir', async () => {
    /* Bileşen sürümü 3.0.8, aralık üst ucu 3.0.8 ve DAHİL. Uç noktayı
       varsayılan "hariç"e düşürmek bu zafiyeti gizlerdi. */
    const k = await korelasyon(sbomVarlik, sbomZafiyet);
    expect(k?.sonuc).toBe('etkilenen');
  });
});

describe('Motor insanın kararını EZMEZ', () => {
  it('elle verilmiş karar ikinci koşudan sonra da durur', async () => {
    const once = await korelasyon(sbomVarlik, sbomZafiyet);
    await db.zafiyetKorelasyonu.update({
      where: { id: once!.id },
      data: {
        elleSonuc: 'etkilenmeyen',
        elleGerekce: 'Kütüphane bu cihazda yüklü ama çağıran kod yok.',
      },
    });
    await zafiyetKorelasyonunuIsle();
    const sonra = await db.zafiyetKorelasyonu.findUnique({ where: { id: once!.id } });
    expect(sonra?.elleSonuc).toBe('etkilenmeyen');
    /* Motorun kendi hesabı da DURUYOR: "motor ne demişti" cevaplanabilir. */
    expect(sonra?.sonuc).toBe('etkilenen');
  });
});

describe('Motor idempotenttir', () => {
  it('ikinci koşu aynı sonuç için yeni satır üretmez', async () => {
    const oncekiSayi = await db.zafiyetKorelasyonu.count();
    await zafiyetKorelasyonunuIsle();
    expect(await db.zafiyetKorelasyonu.count()).toBe(oncekiSayi);
  });
});
