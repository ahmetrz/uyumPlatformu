import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB importlardan ÖNCE (db modülü ilk erişimde okur)
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-erisimdeg-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { oturumYaz } = await import('@/lib/entegrasyon/tedarikciOturum');
const {
  erisimleriDegerlendir, oturumuDegerlendir, kritikligiCoz, yukseltmeBasamagi,
  erisimAdayi, sonErisimKosusu, bekleyenErisimAdaylari,
  ERISIM_KURALLARI, GOREV_TIPI, SUREN_BAYAT_SAAT, ANORMAL_UZUN_SAAT,
} = await import('@/lib/motorlar/erisimDegerlendirme');

type OturumGirdisi = Parameters<typeof oturumuDegerlendir>[0];

const SAAT = 3_600_000;
const SIMDI = new Date('2026-06-15T12:00:00.000Z');

/** Temiz bir oturum girdisi — her testte yalnız ölçülen alan değiştirilir.
    Varsayılan TEMİZDİR: üç kontrol de `true`, referans var, kısa oturum,
    kritiklik 'orta' (yükseltme yok). Böylece bir testte gözlenen her şiddet
    yalnızca o testin değiştirdiği alandan gelir. */
const temiz = (uz: Partial<OturumGirdisi> = {}): OturumGirdisi => ({
  id: 'OTR-1',
  tedarikciAdi: 'Test Tedarikçi',
  tesisKodu: 'TEST-1',
  tesisId: 'tesis-1',
  varlikId: 'varlik-1',
  sistemId: null,
  baslangic: new Date(SIMDI.getTime() - 2 * SAAT),
  bitis: new Date(SIMDI.getTime() - 1 * SAAT),
  durum: 'tamamlandi',
  onayli: true, mfaVar: true, izlendi: true,
  talepReferansi: 'TLP-1', kayitReferansi: null,
  kritiklik: 'orta',
  kritiklikKaynagi: 'varlik',
  sozlesmeKapsami: 'kapsamda',
  ...uz,
});

/* ═══════════════════════════════════════════════════════════════════════
   BÖLÜM 1 · ÜÇ DEĞERLİ MANTIK — saf kural testleri (veritabanı yok)
   ═══════════════════════════════════════════════════════════════════ */

describe('Erişim değerlendirme — üç değerli mantık', () => {
  it('temiz oturum hiç ihlal üretmez', () => {
    const s = oturumuDegerlendir(temiz(), SIMDI);
    expect(s.ihlaller).toHaveLength(0);
    expect(s.siddet).toBeNull();
    expect(s.puan).toBe(0);
  });

  /* Üç alan AYRI AYRI sınanır: birini doğru yazıp diğerini `!alan` diye
     yazmak (null'ı da yakalayan hata) tek bir toplu testte görünmezdi. */
  for (const alan of ['onayli', 'mfaVar', 'izlendi'] as const) {
    it(`${alan}: false KANITLI İHLAL sayılır`, () => {
      const s = oturumuDegerlendir(temiz({ [alan]: false }), SIMDI);
      expect(s.ihlaller.length).toBeGreaterThan(0);
      expect(s.puan).toBeGreaterThan(0);
      expect(s.siddet).not.toBeNull();
      // Bilinmeyen sayacına GİRMEZ: ölçülmüş bir olumsuzluktur.
      expect(s.bilinmeyenler).toHaveLength(0);
    });

    it(`${alan}: null İHLAL SAYILMAZ — ayrı "ölçülmedi" sayacına girer`, () => {
      const s = oturumuDegerlendir(temiz({ [alan]: null }), SIMDI);
      // Değişmez: bilinmeyen sıfır ya da düşük DEĞİLDİR — ihlal de değildir.
      expect(s.ihlaller).toHaveLength(0);
      expect(s.puan).toBe(0);
      expect(s.siddet).toBeNull();
      // Ama SESSİZ de değil: ölçüm boşluğu ayrı sayılır ve bulgu üretir.
      expect(s.bilinmeyenler).toHaveLength(1);
      expect(s.veriKalitesi.map((v) => v.kural)).toContain('erisim_kontrolu_olculmedi');
    });
  }

  it('üç alanın üçü de false ise puan toplanır ve şiddet yükselir', () => {
    const s = oturumuDegerlendir(
      temiz({ onayli: false, mfaVar: false, izlendi: false }), SIMDI);
    expect(s.ihlaller.map((i) => i.kural).sort())
      .toEqual(['izlenmiyor', 'mfa_yok', 'onay_yok']);
    expect(s.puan).toBe(3 + 2 + 3);
    expect(s.temelSiddet).toBe('kritik');
  });

  it('null ile false KARIŞTIRILMAZ: biri ihlal, diğeri ölçüm boşluğu [KIM-ERS-001]', () => {
    const s = oturumuDegerlendir(
      temiz({ onayli: false, mfaVar: null, izlendi: true }), SIMDI);
    expect(s.ihlaller.map((i) => i.kural)).toEqual(['onay_yok']);
    expect(s.bilinmeyenler).toHaveLength(1);
    expect(s.bilinmeyenler[0]).toMatch(/MFA/);
    // Ölçülmemiş MFA puana HİÇ katkı yapmaz.
    expect(s.puan).toBe(3);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   BÖLÜM 2 · KRİTİKLİK — "bilinmiyor" düşük SAYILMAZ
   ═══════════════════════════════════════════════════════════════════ */

describe('Erişim değerlendirme — kritiklik yükseltmesi', () => {
  it('kritiklik VARLIK → SİSTEM → SANTRAL sırasıyla çözülür', () => {
    expect(kritikligiCoz({ varlikKritikligi: 'kritik', sistemKritikligi: 'dusuk' }))
      .toEqual({ seviye: 'kritik', kaynak: 'varlik' });
    // Varlık ölçülmemişse bir üst basamağa inilir — "bilinmiyor" bir cevap değil.
    expect(kritikligiCoz({ varlikKritikligi: 'bilinmiyor', sistemKritikligi: 'yuksek' }))
      .toEqual({ seviye: 'yuksek', kaynak: 'sistem' });
    expect(kritikligiCoz({ varlikKritikligi: null, sistemKritikligi: null,
      tesisKritikAltyapi: true })).toEqual({ seviye: 'kritik', kaynak: 'tesis' });
    expect(kritikligiCoz({})).toEqual({ seviye: 'bilinmiyor', kaynak: 'yok' });
  });

  it('kritik altyapı OLMAMAK "kritikliği düşük" demek değildir', () => {
    // kritikAltyapiStatusu=false + sınıf yok → hâlâ BİLİNMİYOR, 'dusuk' değil.
    expect(kritikligiCoz({ tesisKritikAltyapi: false }).seviye).toBe('bilinmiyor');
    expect(kritikligiCoz({ tesisKritikAltyapi: false, tesisKritiklikSinifi: 'orta' }).seviye)
      .toBe('orta');
  });

  it('kritik varlığa erişim DAHA YÜKSEK önem alır', () => {
    const ihlal = { onayli: false as const }; // tek başına puan 3 → taban 'orta'
    const dusuk = oturumuDegerlendir(temiz({ ...ihlal, kritiklik: 'dusuk' }), SIMDI);
    const kritik = oturumuDegerlendir(temiz({ ...ihlal, kritiklik: 'kritik' }), SIMDI);

    // Aynı ihlal, aynı taban puan — fark YALNIZCA kritiklikten geliyor.
    expect(dusuk.puan).toBe(kritik.puan);
    expect(dusuk.temelSiddet).toBe('orta');
    expect(kritik.temelSiddet).toBe('orta');

    expect(dusuk.siddet).toBe('orta');   // yükseltme yok
    expect(kritik.siddet).toBe('kritik'); // iki basamak yükseldi
  });

  it('kritikliği BİLİNMEYEN varlık "düşük" SAYILMAZ', () => {
    const ihlal = { onayli: false as const };
    const dusuk = oturumuDegerlendir(temiz({ ...ihlal, kritiklik: 'dusuk' }), SIMDI);
    const bilinmiyor = oturumuDegerlendir(
      temiz({ ...ihlal, kritiklik: 'bilinmiyor' }), SIMDI);
    const yuksek = oturumuDegerlendir(temiz({ ...ihlal, kritiklik: 'yuksek' }), SIMDI);
    const kritik = oturumuDegerlendir(temiz({ ...ihlal, kritiklik: 'kritik' }), SIMDI);

    // Bilinmeyen, ölçülene kadar EN AZ 'yuksek' gibi ele alınır.
    expect(yukseltmeBasamagi('bilinmiyor')).toBe(1);
    expect(yukseltmeBasamagi('bilinmiyor')).toBeGreaterThan(yukseltmeBasamagi('dusuk'));
    expect(bilinmiyor.siddet).toBe('yuksek');
    expect(bilinmiyor.siddet).not.toBe(dusuk.siddet);
    expect(bilinmiyor.yukseltme).toBe(yuksek.yukseltme);
    // Ama 'kritik' hâlâ daha ağır: bilinmeyen kritiği taklit etmez.
    expect(kritik.yukseltme).toBeGreaterThan(bilinmiyor.yukseltme);

    // Ölçülmemiş kritiklik AYRICA ölçülmesini isteyen bir bulgu üretir.
    expect(bilinmiyor.veriKalitesi.map((v) => v.kural))
      .toContain('erisim_kritikligi_bilinmiyor');
  });

  it('kritiklik şiddeti ASLA DÜŞÜRMEZ', () => {
    for (const k of ['dusuk', 'orta', 'yuksek', 'kritik', 'bilinmiyor'] as const)
      expect(yukseltmeBasamagi(k)).toBeGreaterThanOrEqual(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   BÖLÜM 3 · KALAN KURALLAR
   ═══════════════════════════════════════════════════════════════════ */

describe('Erişim değerlendirme — sözleşme, izlenebilirlik, bayat oturum', () => {
  it('sözleşmesi geçmiş tedarikçinin erişimi ihlaldir; sözleşmesi OLMAYAN değil', () => {
    const gecmis = oturumuDegerlendir(temiz({ sozlesmeKapsami: 'suresi_gecmis' }), SIMDI);
    expect(gecmis.ihlaller.map((i) => i.kural)).toContain('sozlesme_disi');

    // Sözleşme kaydı hiç yoksa kapsam ÖLÇÜLEMEMİŞTİR — "kapsam dışı" değildir.
    const yok = oturumuDegerlendir(temiz({ sozlesmeKapsami: 'bilinmiyor' }), SIMDI);
    expect(yok.ihlaller).toHaveLength(0);
    expect(yok.veriKalitesi.map((v) => v.kural)).toContain('erisim_sozlesme_kaydi_yok');
  });

  it('talep VE kayıt referansı yoksa izlenebilirlik boşluğu doğar', () => {
    const bos = oturumuDegerlendir(
      temiz({ talepReferansi: null, kayitReferansi: null }), SIMDI);
    expect(bos.ihlaller.map((i) => i.kural)).toEqual(['referans_yok']);
    // Tek başına en hafif ihlal: erişim meşru olup yalnız referansı eksik olabilir.
    expect(bos.temelSiddet).toBe('dusuk');

    // İkisinden BİRİ yeterlidir.
    expect(oturumuDegerlendir(
      temiz({ talepReferansi: null, kayitReferansi: 'DEG-9' }), SIMDI).ihlaller)
      .toHaveLength(0);
    // Boşluklu metin referans sayılmaz.
    expect(oturumuDegerlendir(
      temiz({ talepReferansi: '   ', kayitReferansi: null }), SIMDI)
      .ihlaller.map((i) => i.kural)).toEqual(['referans_yok']);
  });

  it('eşiği aşan "suruyor" oturum bayattır; eşik altındaki değildir', () => {
    const bayat = oturumuDegerlendir(temiz({
      durum: 'suruyor', bitis: null,
      baslangic: new Date(SIMDI.getTime() - (SUREN_BAYAT_SAAT + 5) * SAAT),
    }), SIMDI);
    expect(bayat.ihlaller.map((i) => i.kural)).toContain('bayat_suruyor');

    const taze = oturumuDegerlendir(temiz({
      durum: 'suruyor', bitis: null,
      baslangic: new Date(SIMDI.getTime() - 1 * SAAT),
    }), SIMDI);
    expect(taze.ihlaller.map((i) => i.kural)).not.toContain('bayat_suruyor');
  });

  it('anormal uzun tamamlanmış oturum işaretlenir', () => {
    const uzun = oturumuDegerlendir(temiz({
      baslangic: new Date(SIMDI.getTime() - (ANORMAL_UZUN_SAAT + 4) * SAAT),
      bitis: SIMDI,
    }), SIMDI);
    expect(uzun.ihlaller.map((i) => i.kural)).toContain('anormal_uzun');
  });

  it('ilişkisi çözülemeyen oturum VERİ KALİTESİ bulgusu üretir, erişim ihlali DEĞİL', () => {
    const kapsamsiz = oturumuDegerlendir(
      temiz({ varlikId: null, sistemId: null, tesisId: null, tesisKodu: null }), SIMDI);
    // Envanter boşluğu tedarikçinin ihlali değildir; ikisi KARIŞTIRILMAZ.
    expect(kapsamsiz.ihlaller).toHaveLength(0);
    expect(kapsamsiz.siddet).toBeNull();
    expect(kapsamsiz.veriKalitesi.map((v) => v.kural))
      .toContain('erisim_kapsami_cozulemedi');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   BÖLÜM 4 · MOTOR — veritabanına karşı
   ═══════════════════════════════════════════════════════════════════ */

const koken = (id: string) => ({
  kaynakSistem: 'pam-degerlendirme-test', kaynakKayitId: id,
  toplanma: new Date(), guven: null,
});

let tedarikciId: string;
let kritikVarlikId: string;
let kritikVarlikTesisId: string;

/** Motorun ASLA yapmaması gerekenlerin ölçüsü — koşu öncesi/sonrası
    birebir karşılaştırılır. */
async function otomasyonAnligi() {
  return {
    oturumlar: await db.tedarikciErisimOturumu.findMany({ orderBy: { id: 'asc' } }),
    riskDurumlari: await db.risk.findMany({
      select: { id: true, durum: true, islemTipi: true, kabulBitis: true },
      orderBy: { id: 'asc' } }),
    bulguDurumlari: await db.bulgu.findMany({
      select: { id: true, durum: true, kapanmaTarihi: true },
      orderBy: { id: 'asc' } }),
    riskSayisi: await db.risk.count(),
    bulguSayisi: await db.bulgu.count(),
  };
}

describe('Erişim değerlendirme motoru — veritabanı davranışı', () => {
  beforeAll(async () => {
    await db.tedarikciErisimOturumu.deleteMany();
    await db.gorev.deleteMany({ where: { tip: GOREV_TIPI } });
    await db.veriKalitesiBulgusu.deleteMany({ where: { kural: { in: [...ERISIM_KURALLARI] } } });

    const t = await db.tedarikci.findFirstOrThrow({
      where: { ad: 'Siemens Energy' }, select: { id: true } });
    tedarikciId = t.id;

    const v = await db.varlik.findFirstOrThrow({
      where: { silindi: null, kritiklik: 'kritik', tesisId: { not: null } },
      select: { id: true, tesisId: true } });
    kritikVarlikId = v.id;
    kritikVarlikTesisId = v.tesisId!;
  });

  /* ── Kaynak bağlı değilken ────────────────────────────────────────── */

  it('kaynak bağlı değilken "ihlal yok" DENMEZ — koşu kaynak_yok kapanır', async () => {
    expect(await db.tedarikciErisimOturumu.count()).toBe(0);

    const sonuc = await erisimleriDegerlendir();
    expect(sonuc).toEqual({ islenen: 0, uretilen: 0 });

    const kosu = await sonErisimKosusu();
    // Sessizce 'basarili' kapanmak, sağlık ekranında "erişim tarafı temiz"
    // diye okunurdu. Kayıt yokluğu AYRI bir durumdur.
    expect(kosu?.durum).toBe('kaynak_yok');
    expect(kosu?.hata).toBeNull();          // başarısızlık DEĞİL
    expect(kosu?.ayrinti).toMatch(/DEĞİLDİR/);
    expect(kosu?.ayrinti).toMatch(/göremiyoruz/);
  });

  /* ── Aday üretimi + otomasyon sınırı ──────────────────────────────── */

  it('kanıtlı ihlal GÖREV üretir; oturum/Risk/Bulgu DEĞİŞMEZ', async () => {
    await oturumYaz({
      koken: koken('OTR-KRITIK'),
      tedarikciId,
      varlikId: kritikVarlikId,
      tesisId: kritikVarlikTesisId,
      baslangic: new Date(Date.now() - 3 * SAAT),
      bitis: new Date(Date.now() - 2 * SAAT),
      onayli: false, mfaVar: false, izlendi: false,
      talepReferansi: 'TLP-77',
      durum: 'tamamlandi',
    });

    const once = await otomasyonAnligi();
    const sonuc = await erisimleriDegerlendir();
    const sonra = await otomasyonAnligi();

    expect(sonuc.islenen).toBe(1);
    expect(sonuc.uretilen).toBeGreaterThan(0);

    const gorev = await db.gorev.findFirstOrThrow({
      where: { tip: GOREV_TIPI, kaynakTipi: 'TedarikciErisimOturumu', otomatikUretildi: true },
    });
    expect(gorev.baslik).toMatch(/kritik/);          // kritik varlık → şiddet yükseldi
    expect(gorev.baslik).toMatch(/onay_yok/);
    expect(gorev.durum).toBe('acik');

    /* ── OTOMASYON SINIRI ───────────────────────────────────────────────
       Motor: oturum sonlandırmaz, risk kabul etmez, bulgu kapatmaz. */
    expect(sonra.oturumlar).toEqual(once.oturumlar);          // BİREBİR aynı satırlar
    expect(sonra.riskDurumlari).toEqual(once.riskDurumlari);
    expect(sonra.bulguDurumlari).toEqual(once.bulguDurumlari);
    // Kayıt AÇMAZ da: aday kayda dönüşmez.
    expect(sonra.riskSayisi).toBe(once.riskSayisi);
    expect(sonra.bulguSayisi).toBe(once.bulguSayisi);
  });

  it('ürettiği şey ADAYDIR: insan onayı olmadan Risk/Bulgu KESİNLEŞMEZ', async () => {
    const adaylar = await bekleyenErisimAdaylari();
    expect(adaylar.length).toBeGreaterThan(0);

    const aday = adaylar[0];
    expect(aday.onemDerecesi).toBe('kritik');
    expect(aday.kaynak).toBe('erisim_degerlendirme');
    expect(aday.gerekce).toMatch(/insana aittir/);

    /* `lib/entegrasyon/topoloji.ts → sapmaAdayi` ile aynı kalıp: aday bir
       ÖNERİ nesnesidir, kayıt kimliği taşımaz. Kütükte bu adaya karşılık
       gelen bir Risk/Bulgu satırı YOKTUR. */
    expect(Object.keys(aday)).not.toContain('riskId');
    expect(await db.risk.count({ where: { kaynak: 'erisim_degerlendirme' } })).toBe(0);
    expect(await db.bulgu.count({ where: { baslik: { contains: aday.baslik } } })).toBe(0);
  });

  it('ikinci koşu görevleri/bulguları ÇOĞALTMAZ', async () => {
    const say = async () => ({
      gorev: await db.gorev.count({ where: { tip: GOREV_TIPI, otomatikUretildi: true } }),
      kalite: await db.veriKalitesiBulgusu.count({
        where: { kural: { in: [...ERISIM_KURALLARI] }, durum: 'acik' } }),
    });
    const once = await say();
    await erisimleriDegerlendir();
    await erisimleriDegerlendir();
    expect(await say()).toEqual(once);
  });

  it('koşul düzelince açık görev ve veri kalitesi bulgusu çözülür', async () => {
    // Ölçülmemiş alanlı ikinci bir oturum: 'erisim_kontrolu_olculmedi' açar.
    const { id } = await oturumYaz({
      koken: koken('OTR-OLCULMEDI'),
      tedarikciId,
      varlikId: kritikVarlikId,
      tesisId: kritikVarlikTesisId,
      baslangic: new Date(Date.now() - 3 * SAAT),
      bitis: new Date(Date.now() - 2 * SAAT),
      onayli: true, mfaVar: null, izlendi: true,   // mfaVar ÖLÇÜLMEMİŞ
      talepReferansi: 'TLP-88',
      durum: 'tamamlandi',
    });
    await erisimleriDegerlendir();
    expect(await db.veriKalitesiBulgusu.count({ where: {
      kural: 'erisim_kontrolu_olculmedi', kaynakId: id, durum: 'acik' } })).toBe(1);

    // Kaynak sistem eksik alanı sonradan raporluyor → koşul düzeldi.
    await oturumYaz({
      koken: koken('OTR-OLCULMEDI'),
      tedarikciId,
      varlikId: kritikVarlikId,
      tesisId: kritikVarlikTesisId,
      baslangic: new Date(Date.now() - 3 * SAAT),
      bitis: new Date(Date.now() - 2 * SAAT),
      onayli: true, mfaVar: true, izlendi: true,
      talepReferansi: 'TLP-88',
      durum: 'tamamlandi',
    });
    await erisimleriDegerlendir();
    const bulgu = await db.veriKalitesiBulgusu.findFirstOrThrow({
      where: { kural: 'erisim_kontrolu_olculmedi', kaynakId: id } });
    expect(bulgu.durum).toBe('cozuldu');
    expect(bulgu.kapanis).not.toBeNull();

    // Aynı şey ihlal görevinde de geçerli: kaynak düzeltince görev iptal olur.
    const kritikOturum = await db.tedarikciErisimOturumu.findFirstOrThrow({
      where: { kaynakKayitId: 'OTR-KRITIK' } });
    await oturumYaz({
      koken: koken('OTR-KRITIK'),
      tedarikciId,
      varlikId: kritikVarlikId,
      tesisId: kritikVarlikTesisId,
      baslangic: kritikOturum.baslangic,
      bitis: kritikOturum.bitis,
      onayli: true, mfaVar: true, izlendi: true,
      talepReferansi: 'TLP-77',
      durum: 'tamamlandi',
    });
    await erisimleriDegerlendir();
    const gorev = await db.gorev.findFirstOrThrow({
      where: { tip: GOREV_TIPI, kaynakId: kritikOturum.id, otomatikUretildi: true } });
    expect(gorev.durum).toBe('iptal');
  });

  it('İNSANIN açtığı göreve ve insanın eline aldığı göreve DOKUNMAZ', async () => {
    /* İki koruma birden ölçülüyor:
       (a) `otomatikUretildi: false` — insanın `oturumKarariKaydet` ile açtığı
           'erisim_incelemesi' görevi motorun kapsamı DIŞINDADIR.
       (b) `durum: 'yapiliyor'` — motor açmış olsa bile insan eline almışsa
           iptal edilmez; birinin üzerinde çalıştığı işi silmek olurdu. */
    const insanGorevi = await db.gorev.create({ data: {
      baslik: 'Tedarikçi erişimini kes · elle açıldı',
      tip: GOREV_TIPI, otomatikUretildi: false,
    } });

    const { id: sessizOturumId } = await oturumYaz({
      koken: koken('OTR-YAPILIYOR'),
      tedarikciId,
      varlikId: kritikVarlikId,
      tesisId: kritikVarlikTesisId,
      baslangic: new Date(Date.now() - 3 * SAAT),
      bitis: new Date(Date.now() - 2 * SAAT),
      // Temiz oturum: motor bunun için görev AÇMAZ, yani aşağıdaki görev
      // "koşul düzelmiş" sayılır ve iptal adayı olur — ama 'yapiliyor'.
      onayli: true, mfaVar: true, izlendi: true, talepReferansi: 'TLP-99',
      durum: 'tamamlandi',
    });
    const elesAlinan = await db.gorev.create({ data: {
      baslik: 'Erişim incelemesi (orta): elde',
      tip: GOREV_TIPI, kaynakTipi: 'TedarikciErisimOturumu', kaynakId: sessizOturumId,
      otomatikUretildi: true, durum: 'yapiliyor',
    } });

    await erisimleriDegerlendir();

    expect((await db.gorev.findUniqueOrThrow({ where: { id: insanGorevi.id } })).durum)
      .toBe('acik');
    expect((await db.gorev.findUniqueOrThrow({ where: { id: elesAlinan.id } })).durum)
      .toBe('yapiliyor');
  });

  it('kaynak sonradan susarsa açık kayıtlar ÇÖZÜLMEZ', async () => {
    /* Kaynağın kesilmesi ihlalin düzelmesi değildir. Kuyruk kaynak
       kesilince kendiliğinden boşalırsa sorun görünmez olur. */
    await db.tedarikciErisimOturumu.deleteMany();
    const acikOnce = await db.gorev.count({
      where: { tip: GOREV_TIPI, otomatikUretildi: true, durum: 'acik' } });
    const kaliteOnce = await db.veriKalitesiBulgusu.count({
      where: { kural: { in: [...ERISIM_KURALLARI] }, durum: 'acik' } });

    await erisimleriDegerlendir();
    expect((await sonErisimKosusu())?.durum).toBe('kaynak_yok');

    expect(await db.gorev.count({
      where: { tip: GOREV_TIPI, otomatikUretildi: true, durum: 'acik' } })).toBe(acikOnce);
    expect(await db.veriKalitesiBulgusu.count({
      where: { kural: { in: [...ERISIM_KURALLARI] }, durum: 'acik' } })).toBe(kaliteOnce);
  });

  it('erisimAdayi yalnız KRİTİK sonuçta aday üretir', () => {
    const orta = temiz({ onayli: false, kritiklik: 'dusuk' });
    expect(erisimAdayi(orta, oturumuDegerlendir(orta, SIMDI))).toBeNull();

    const kritik = temiz({ onayli: false, izlendi: false, kritiklik: 'kritik' });
    expect(erisimAdayi(kritik, oturumuDegerlendir(kritik, SIMDI))).not.toBeNull();
  });
});
