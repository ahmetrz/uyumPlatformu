import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Olay → etki zinciri kabul testleri (P1-4).

   Sözleşmenin dört sert maddesi burada ölçülür:
   1. zincir yayılımı: varlık → sistem → süreç → tesis
   2. kopuk zincir `bilinmiyor` der, `yok` DEMEZ
   3. motor etki alanlarına ASLA yazmaz (öneri yalnız etkiOnerisiJson'da)
   4. `etkiDogrula` insan kapısıdır: gerekçesiz doğrulama reddedilir,
      doğrulanan alan dolar ve denetim izi düşer. */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-olay-'));
const testDb = path.join(dizin, 'olay.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

/* Yetki kapısı: eylem katmanı `yetkiZorunlu`/`izinVar` üzerinden geçer.
   Testte HTTP oturumu yok; kapı seed'deki GERÇEK bir yönetici kullanıcıyla
   açılır (denetim izi yabancı anahtarı gerçek kullanıcı ister). Kapının
   arkasındaki kurallar — gerekçe zorunluluğu, geçerli değer kümesi, alan
   seçimi, iz kaydı — sahte değildir, gerçek kodda koşar. */
const sahteKullanici = {
  id: '', adSoyad: 'Test Onaylayan', eposta: 't@test', unvan: null,
  yetkiler: [{ rol: 'yonetici', surecId: null, tesisId: null, tuzelKisiId: null,
    regulasyonId: null, modul: null }],
};
vi.mock('@/lib/erisim', async (asil) => {
  const gercek = await asil<typeof import('@/lib/erisim')>();
  return {
    ...gercek,
    yetkiZorunlu: async () => sahteKullanici,
    izinVar: () => true,
  };
});

const { db } = await import('@/lib/db');
const { etkiOnerisiUret, olayEtkileriniIsle, oneriOku } =
  await import('@/lib/motorlar/olayEtki');
const { etkiDogrula, etkiDogrulamaGeriAl, olayBagla } =
  await import('@/lib/eylemler2/olay');

/** Seed'de kurulu zincir: KIZILDERE3-DCS-01 → KIZILDERE3-DCS →
    KIZILDERE3-URETIM (uretim_durur) → Kızıldere III tesisi. */
let tamZincirVarligi: { id: string; etiket: string };
/** Sistemi hiçbir iş sürecine bağlı olmayan varlık (MERKEZ-SANALLASTIRMA). */
let kopukVarlik: { id: string; etiket: string };
/** Hiçbir sisteme bağlı olmayan, kendi kaydında "üretim etkisi YOK" yazan
    varlık — sözleşmenin en sert testi: kopuk zincir `yok` demeyecek. */
let sistemsizVarlik: { id: string; etiket: string };

let sayac = 0;
async function olayAc(veri: {
  baslik: string; siddet?: string; tesisId?: string | null; tespitKaynagi?: string | null;
}) {
  sayac += 1;
  return db.olay.create({
    data: {
      kod: `OLY-TEST-${sayac}`,
      baslik: veri.baslik,
      siddet: veri.siddet ?? 'yuksek',
      tesisId: veri.tesisId ?? null,
      tespitKaynagi: veri.tespitKaynagi ?? null,
    },
  });
}

beforeAll(async () => {
  const yonetici = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  sahteKullanici.id = yonetici.id;

  const surecSistemi = await db.isSureciSistemi.findFirstOrThrow({
    include: { surec: true, sistem: true },
  });
  tamZincirVarligi = await db.varlik.findFirstOrThrow({
    where: { sistemId: surecSistemi.sistemId, silindi: null },
    select: { id: true, etiket: true },
  });

  // Süreci olmayan sistem: hiçbir IsSureciSistemi satırında geçmeyen sistem.
  const bagliSistemler = (await db.isSureciSistemi.findMany({ select: { sistemId: true } }))
    .map((s) => s.sistemId);
  const suresizSistem = await db.sistemServis.findFirstOrThrow({
    where: { id: { notIn: bagliSistemler } },
  });
  kopukVarlik = await db.varlik.findFirstOrThrow({
    where: { sistemId: suresizSistem.id, silindi: null },
    select: { id: true, etiket: true },
  });

  sistemsizVarlik = await db.varlik.findFirstOrThrow({
    where: { sistemId: null, silindi: null, uretimEtkisi: 'yok' },
    select: { id: true, etiket: true },
  });
});

describe('Olay → etki zinciri motoru (izole DB kopyası)', () => {
  it('zincir yayılımı: varlık → sistem → süreç → tesis yürünür, öneri süreç kaydından gelir', async () => {
    const olay = await olayAc({ baslik: 'DCS haberleşme kaybı', tespitKaynagi: 'siem' });
    await db.olayVarlik.create({ data: { olayId: olay.id, varlikId: tamZincirVarligi.id } });

    const { oneri } = await etkiOnerisiUret(olay.id);

    expect(oneri.zincir).toHaveLength(1);
    const halka = oneri.zincir[0];
    expect(halka.varlik?.id).toBe(tamZincirVarligi.id);
    expect(halka.sistem).not.toBeNull();          // varlık → sistem
    expect(halka.surecler.length).toBeGreaterThan(0); // sistem → süreç
    expect(halka.tesisler.length).toBeGreaterThan(0); // süreç → tesis
    expect(halka.kopukluk).toBeNull();            // zincir TAM

    // Üretim önerisi sürecin kendi kaydından çıkar ve dayanağı zinciri yazar.
    expect(oneri.uretimEtkisi).toBe('uretim_durdu');
    const dayanak = oneri.gerekce.find((g) => g.alan === 'uretimEtkisi')?.dayanak ?? '';
    expect(dayanak).toContain(tamZincirVarligi.etiket);
    expect(dayanak).toContain(halka.sistem?.kod as string);
    expect(dayanak).toContain(halka.surecler[0].kod);
    expect(dayanak).toContain(halka.tesisler[0].kod);
    expect(dayanak).toContain('iş süreci üretim etkisi');

    // Dört alanın DÖRDÜNÜN de gerekçesi var — dayanaksız öneri yok.
    expect(oneri.gerekce).toHaveLength(4);
    expect(oneri.gerekce.every((g) => g.dayanak.trim().length > 0)).toBe(true);
  });

  it('kopuk zincir (sistemin süreci yok) BİLİNMİYOR der, YOK demez', async () => {
    const olay = await olayAc({ baslik: 'Sanallaştırma platformu kesintisi' });
    await db.olayVarlik.create({ data: { olayId: olay.id, varlikId: kopukVarlik.id } });

    const { oneri } = await etkiOnerisiUret(olay.id);
    const halka = oneri.zincir[0];
    expect(halka.sistem).not.toBeNull();
    expect(halka.kopukluk).toBe('surec_yok');

    // Kopuk zincirden "etki yok" sonucu ÇIKARILMAZ.
    expect(oneri.uretimEtkisi).not.toBe('yok');
    expect(oneri.emniyetEtkisi).not.toBe('yok');
    expect(oneri.regulasyonEtkisi).not.toBe('yok');
    expect(oneri.siberEtki).not.toBe('yok');

    // Gerekçe zincirin NEREDE koptuğunu söyler.
    const gerekceler = Object.fromEntries(oneri.gerekce.map((g) => [g.alan, g.dayanak]));
    if (oneri.uretimEtkisi === 'bilinmiyor') {
      expect(gerekceler.uretimEtkisi).toContain('iş sürecine bağlı değil');
    } else {
      // varlık kaydından gelen POZİTİF etki: dayanak zincirin kopuğunu yazar
      expect(gerekceler.uretimEtkisi).toContain('varlık kaydı');
      expect(gerekceler.uretimEtkisi).toContain('süreç doğrulaması yok');
    }
    // emniyet kaydı olmayan varlık: bilinmiyor, gerekçesi kayıt yokluğunu söyler
    expect(oneri.emniyetEtkisi).toBe('bilinmiyor');
    expect(gerekceler.emniyetEtkisi).toContain('emniyet etkisi kaydı yok');
  });

  it('sistemi olmayan varlıkta zincir ilk adımda kopar; tespit kaynağı yoksa siber etki bilinmiyor', async () => {
    const olay = await olayAc({ baslik: 'Saha cihazı arızası' });
    await db.olayVarlik.create({ data: { olayId: olay.id, varlikId: sistemsizVarlik.id } });

    const { oneri } = await etkiOnerisiUret(olay.id);
    expect(oneri.zincir[0].kopukluk).toBe('sistem_yok');
    expect(oneri.zincir[0].sistem).toBeNull();

    /* SÖZLEŞMENİN SERT MADDESİ: varlığın KENDİ kaydında "üretim etkisi yok"
       yazsa bile, zincir kopuk olduğu için motor `yok` DEMEZ — `bilinmiyor`
       der. Kopuk zincirden "etki yok" sonucu çıkarılamaz. */
    const varlik = await db.varlik.findUniqueOrThrow({ where: { id: sistemsizVarlik.id } });
    expect(varlik.uretimEtkisi).toBe('yok');
    expect(oneri.uretimEtkisi).toBe('bilinmiyor');
    const uretim = oneri.gerekce.find((g) => g.alan === 'uretimEtkisi')?.dayanak ?? '';
    expect(uretim).toContain('zincir kopuk');
    expect(uretim).toContain('sisteme bağlı değil');

    expect(oneri.siberEtki).toBe('bilinmiyor');
    const siber = oneri.gerekce.find((g) => g.alan === 'siberEtki')?.dayanak ?? '';
    expect(siber).toContain('tespit kaynağı kaydedilmemiş');
  });

  it('bağsız olayda öneri bilinmiyor kalır — "etki yok" demez', async () => {
    const olay = await olayAc({ baslik: 'Bağ kurulmamış olay' });
    const { oneri } = await etkiOnerisiUret(olay.id);
    expect(oneri.zincir).toHaveLength(0);
    for (const alan of ['uretimEtkisi', 'emniyetEtkisi', 'siberEtki'] as const) {
      expect(oneri[alan]).toBe('bilinmiyor');
    }
    const uretim = oneri.gerekce.find((g) => g.alan === 'uretimEtkisi')?.dayanak ?? '';
    expect(uretim).toContain('bağlanmamış');
  });

  it('motor etki ALANLARINA yazmaz: yalnız etkiOnerisiJson dolar', async () => {
    const olay = await olayAc({ baslik: 'Alanlara yazmama testi', tespitKaynagi: 'siem' });
    await db.olayVarlik.create({ data: { olayId: olay.id, varlikId: tamZincirVarligi.id } });

    await etkiOnerisiUret(olay.id);
    const sonra = await db.olay.findUniqueOrThrow({ where: { id: olay.id } });

    expect(sonra.uretimEtkisi).toBeNull();
    expect(sonra.emniyetEtkisi).toBeNull();
    expect(sonra.regulasyonEtkisi).toBeNull();
    expect(sonra.siberEtki).toBeNull();
    expect(sonra.etkiDogrulayanId).toBeNull();
    expect(sonra.etkiDogrulamaZamani).toBeNull();
    // Öneri JSON'u dolu ve okunabilir
    const oneri = oneriOku(sonra.etkiOnerisiJson);
    expect(oneri).not.toBeNull();
    expect(oneri?.uretimEtkisi).toBe('uretim_durdu');
  });

  it('koşu idempotenttir: zincir değişmediyse öneri yeniden yazılmaz', async () => {
    const olay = await olayAc({ baslik: 'İdempotans testi' });
    await db.olayVarlik.create({ data: { olayId: olay.id, varlikId: tamZincirVarligi.id } });

    const ilk = await etkiOnerisiUret(olay.id);
    expect(ilk.degisti).toBe(true);
    const ikinci = await etkiOnerisiUret(olay.id);
    expect(ikinci.degisti).toBe(false);
    expect(ikinci.oneri.uretilme).toBe(ilk.oneri.uretilme);
  });

  it('toplu koşu kapalı olayları atlar ve işlenen/üretilen sayar', async () => {
    const kapali = await olayAc({ baslik: 'Kapanmış olay' });
    await db.olay.update({ where: { id: kapali.id }, data: { durum: 'kapali' } });

    const sonuc = await olayEtkileriniIsle();
    expect(sonuc.islenen).toBeGreaterThan(0);
    const sonrasi = await db.olay.findUniqueOrThrow({ where: { id: kapali.id } });
    expect(sonrasi.etkiOnerisiJson).toBeNull(); // kapalı olay dondurulmuş
  });
});

describe('etkiDogrula — insan kapısı', () => {
  it('gerekçesiz doğrulama REDDEDİLİR ve alan boş kalır', async () => {
    const olay = await olayAc({ baslik: 'Gerekçesiz doğrulama denemesi', tespitKaynagi: 'siem' });
    await db.olayVarlik.create({ data: { olayId: olay.id, varlikId: tamZincirVarligi.id } });
    await etkiOnerisiUret(olay.id);

    const sonuc = await etkiDogrula({
      olayId: olay.id, alan: 'uretimEtkisi', deger: 'uretim_durdu', gerekce: '  ',
    });
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.hata).toContain('gerekçe');

    const sonra = await db.olay.findUniqueOrThrow({ where: { id: olay.id } });
    expect(sonra.uretimEtkisi).toBeNull();
    expect(sonra.etkiDogrulayanId).toBeNull();
  });

  it('"bilinmiyor" doğrulanamaz — değerlendirilmeyen alan BOŞ kalır', async () => {
    const olay = await olayAc({ baslik: 'Bilinmiyor doğrulama denemesi' });
    const sonuc = await etkiDogrula({
      olayId: olay.id, alan: 'uretimEtkisi', deger: 'bilinmiyor',
      gerekce: 'Değerlendiremedik',
    });
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.hata).toContain('Bilinmiyor doğrulanamaz');
    const sonra = await db.olay.findUniqueOrThrow({ where: { id: olay.id } });
    expect(sonra.uretimEtkisi).toBeNull();
  });

  it('alan dışı değer reddedilir (üretim ölçeğinde "kritik" yok)', async () => {
    const olay = await olayAc({ baslik: 'Geçersiz değer denemesi' });
    const sonuc = await etkiDogrula({
      olayId: olay.id, alan: 'uretimEtkisi', deger: 'kritik', gerekce: 'Deneme gerekçesi',
    });
    expect(sonuc.ok).toBe(false);
  });

  it('doğrulama sonrası alan dolar, doğrulayan damgalanır ve denetim izi düşer', async () => {
    const olay = await olayAc({ baslik: 'Doğrulanan olay', tespitKaynagi: 'siem' });
    await db.olayVarlik.create({ data: { olayId: olay.id, varlikId: tamZincirVarligi.id } });
    await etkiOnerisiUret(olay.id);

    const oncekiIz = await db.aktiviteKaydi.count({
      where: { varlikTipi: 'Olay', varlikId: olay.id, eylem: 'etki_dogrulama' } });

    const sonuc = await etkiDogrula({
      olayId: olay.id, alan: 'uretimEtkisi', deger: 'uretim_durdu',
      gerekce: 'Türbin 12 saat durdu; SCADA kaydı ve vardiya defteri doğruluyor.',
    });
    expect(sonuc.ok).toBe(true);

    const sonra = await db.olay.findUniqueOrThrow({ where: { id: olay.id } });
    expect(sonra.uretimEtkisi).toBe('uretim_durdu');
    expect(sonra.etkiDogrulayanId).toBe(sahteKullanici.id);
    expect(sonra.etkiDogrulamaZamani).not.toBeNull();
    // Doğrulanmayan alanlar HÂLÂ boş — biri diğerini doldurmaz.
    expect(sonra.emniyetEtkisi).toBeNull();
    expect(sonra.regulasyonEtkisi).toBeNull();
    expect(sonra.siberEtki).toBeNull();

    const izler = await db.aktiviteKaydi.findMany({
      where: { varlikTipi: 'Olay', varlikId: olay.id, eylem: 'etki_dogrulama' },
      orderBy: { zaman: 'desc' } });
    expect(izler.length).toBe(oncekiIz + 1);
    expect(izler[0].alan).toBe('uretimEtkisi');
    expect(izler[0].yeniDeger).toBe('uretim_durdu');
    expect(izler[0].aktorId).toBe(sahteKullanici.id);
    // Gerekçede önerinin kaderi de yazılı: kabul mü, değiştirme mi?
    expect(izler[0].gerekce).toContain('Türbin 12 saat durdu');
    expect(izler[0].gerekce).toContain('motor önerisi kabul edildi');
  });

  it('insan öneriyi DEĞİŞTİREBİLİR; iz bunu ayırt eder', async () => {
    const olay = await olayAc({ baslik: 'Öneri değiştirilen olay', tespitKaynagi: 'siem' });
    await db.olayVarlik.create({ data: { olayId: olay.id, varlikId: tamZincirVarligi.id } });
    await etkiOnerisiUret(olay.id);

    const sonuc = await etkiDogrula({
      olayId: olay.id, alan: 'uretimEtkisi', deger: 'orta',
      gerekce: 'Yedek hat devreye girdi; üretim durmadı.',
    });
    expect(sonuc.ok).toBe(true);
    const iz = await db.aktiviteKaydi.findFirstOrThrow({
      where: { varlikTipi: 'Olay', varlikId: olay.id, eylem: 'etki_dogrulama' },
      orderBy: { zaman: 'desc' } });
    expect(iz.gerekce).toContain('insan');
    expect((await db.olay.findUniqueOrThrow({ where: { id: olay.id } })).uretimEtkisi).toBe('orta');
  });

  it('doğrulama geri alınınca alan BOŞA döner (yok olmaz) ve iz kalır', async () => {
    const olay = await olayAc({ baslik: 'Geri alınan doğrulama', tespitKaynagi: 'siem' });
    await db.olayVarlik.create({ data: { olayId: olay.id, varlikId: tamZincirVarligi.id } });
    await etkiOnerisiUret(olay.id);
    await etkiDogrula({
      olayId: olay.id, alan: 'uretimEtkisi', deger: 'yuksek', gerekce: 'İlk değerlendirme.' });

    const geri = await etkiDogrulamaGeriAl({
      olayId: olay.id, alan: 'uretimEtkisi', gerekce: 'Kanıt yetersiz, yeniden bakılacak.' });
    expect(geri.ok).toBe(true);

    const sonra = await db.olay.findUniqueOrThrow({ where: { id: olay.id } });
    expect(sonra.uretimEtkisi).toBeNull();          // BOŞ — "yok" değil
    expect(sonra.etkiDogrulayanId).toBeNull();      // başka doğrulanmış alan kalmadı
    expect(sonra.etkiOnerisiJson).not.toBeNull();   // öneri duruyor
    expect(await db.aktiviteKaydi.count({ where: {
      varlikTipi: 'Olay', varlikId: olay.id, eylem: 'etki_dogrulama_geri_alma' } })).toBe(1);
  });

  it('varlık bağlandığında öneri tazelenir ama etki alanları yine boş kalır', async () => {
    const olay = await olayAc({ baslik: 'Bağlama sonrası öneri' });
    const once = await db.olay.findUniqueOrThrow({ where: { id: olay.id } });
    expect(once.etkiOnerisiJson).toBeNull();

    const sonuc = await olayBagla({
      olayId: olay.id, tip: 'varlik', hedefId: tamZincirVarligi.id });
    expect(sonuc.ok).toBe(true);

    const sonra = await db.olay.findUniqueOrThrow({ where: { id: olay.id } });
    expect(oneriOku(sonra.etkiOnerisiJson)?.uretimEtkisi).toBe('uretim_durdu');
    expect(sonra.uretimEtkisi).toBeNull(); // öneri ≠ etki
    expect(await db.aktiviteKaydi.count({ where: {
      varlikTipi: 'Olay', varlikId: olay.id, eylem: 'baglama' } })).toBe(1);
  });
});
