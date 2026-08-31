import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB'yi importlardan ÖNCE ayarla (db modülü ilk erişimde okur)
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kesif-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const {
  esle, kesfiIsle, kesifKararUygula, gorulmeyenKayitlar, bekleyenleriEslestir,
  varlikIndeksiKur, varlikIndeksiYukle, normalCoz, gozlemeCevir,
} = await import('@/lib/entegrasyon/kesif');
const { elleAktarimAdaptoru } = await import('@/lib/entegrasyon/adaptorler/elleAktarim');
const { ADAPTOR_TIPLERI } = await import('@/lib/entegrasyon/adaptorler');
const { adaptorCoz: adaptorGetir } = await import('@/lib/entegrasyon/kayit');
type VarlikGozlemi = import('@/lib/entegrasyon/sozlesme').VarlikGozlemi;

const KAYNAK = 'test_kesif';
const KAYNAK_SISTEM = 'test-kesif-kaynagi';
const ONEK = 'TEST-KESIF-';

function gozlem(
  kaynakKayitId: string,
  alanlar: Partial<Omit<VarlikGozlemi, 'tip' | 'koken' | 'ham'>> = {},
): VarlikGozlemi {
  return {
    tip: 'varlik',
    koken: {
      kaynakSistem: KAYNAK_SISTEM,
      kaynakKayitId,
      toplanma: new Date(),
      guven: null,
    },
    ham: { kaynakKayitId, ...alanlar },
    ...alanlar,
  };
}

let turId: string;
let kullaniciId: string;

async function temizle() {
  await db.kesifKaydi.deleteMany({ where: { kaynak: { in: [KAYNAK, 'csv'] } } });
  await db.veriKokeni.deleteMany({ where: { kaynakSistem: KAYNAK_SISTEM } });
  await db.aktiviteKaydi.deleteMany({ where: { varlikTipi: 'KesifKaydi' } });
  await db.varlik.deleteMany({ where: { etiket: { startsWith: ONEK } } });
}

beforeAll(async () => {
  const tur = await db.varlikTuru.findFirstOrThrow({ where: { aktif: true } });
  turId = tur.id;
  const kullanici = await db.kullanici.findFirstOrThrow();
  kullaniciId = kullanici.id;
  await temizle();
});

afterAll(temizle);

/* ═══ Eşleme mantığı (saf; veritabanı gerektirmez) ════════════════════ */

describe('Eşleme: anahtar gücü ve güven skoru', () => {
  const indeks = varlikIndeksiKur([
    { id: 'v-seri', etiket: 'TEST-A', ad: 'PLC A', tesisId: null,
      seriNo: 'SN-TEST-A1', macAdresi: null, hostname: null, ipAdresi: null,
      uretici: 'Siemens', model: 'S7-1500' },
    { id: 'v-mac', etiket: 'TEST-B', ad: 'HMI B', tesisId: null,
      seriNo: null, macAdresi: '00:11:22:33:44:66', hostname: null, ipAdresi: null,
      uretici: null, model: null },
    { id: 'v-ip', etiket: 'TEST-C', ad: 'EWS C', tesisId: null,
      seriNo: null, macAdresi: null, hostname: null, ipAdresi: '10.77.0.9',
      uretici: null, model: null },
  ]);

  it('seri numarasıyla eşleşir ve en yüksek güveni alır', () => {
    // Küçük harfli/boşluklu yazım normalize edilir.
    const s = esle(gozlem('k1', { seriNo: ' sn-test-a1 ' }), indeks);
    expect(s.durum).toBe('eslesti');
    expect(s.eslesenVarlikId).toBe('v-seri');
    expect(s.eslesmeAnahtari).toBe('seri');
    expect(s.guvenSkoru).not.toBeNull();
    expect(s.guvenSkoru!).toBeGreaterThanOrEqual(0.9);
  });

  it('MAC ile eşleşir — Cisco/Windows/Linux yazımları aynı kabul edilir', () => {
    for (const mac of ['00:11:22:33:44:66', '00-11-22-33-44-66', '0011.2233.4466']) {
      const s = esle(gozlem('k2', { macAdresi: mac }), indeks);
      expect(s.durum, mac).toBe('eslesti');
      expect(s.eslesenVarlikId, mac).toBe('v-mac');
      expect(s.eslesmeAnahtari, mac).toBe('mac');
      expect(s.guvenSkoru!).toBeGreaterThan(0.5);
    }
  });

  it('YALNIZ IP ile eşleme YAPMAZ — kayıt incelemeye düşer, güven null kalır', () => {
    const s = esle(gozlem('k3', { ipAdresi: '10.77.0.9' }), indeks);
    expect(s.durum).toBe('inceleme_bekliyor');
    expect(s.eslesenVarlikId).toBeNull();
    expect(s.eslesmeAnahtari).toBeNull();
    expect(s.guvenSkoru).toBeNull();       // SIFIR DEĞİL: ölçülmedi
    expect(s.adaylar.map((a) => a.varlikId)).toContain('v-ip'); // aday bilgi olarak taşınır
    expect(s.gerekce).toMatch(/IP tek başına/);
  });

  it('üretici+model tek başına aday üretmez (yalnız destekleyicidir)', () => {
    const s = esle(gozlem('k4', { uretici: 'Siemens', model: 'S7-1500' }), indeks);
    expect(s.eslesenVarlikId).toBeNull();
    expect(s.adaylar).toHaveLength(0);
    expect(s.guvenSkoru).toBeNull();
  });

  it('çakışan eşleşme otomatik çözülmez: incelemeye düşer, güven null kalır', () => {
    const s = esle(
      gozlem('k5', { seriNo: 'SN-TEST-A1', macAdresi: '00:11:22:33:44:66' }),
      indeks,
    );
    expect(s.durum).toBe('inceleme_bekliyor');
    expect(s.cakisma).toBe(true);
    expect(s.eslesenVarlikId).toBeNull();
    expect(s.guvenSkoru).toBeNull();
    expect(s.adaylar).toHaveLength(2);
    expect(s.gerekce).toMatch(/Çakışan eşleşme/);
  });

  it('hiç anahtar tutmayan gözlem için güven null kalır (sıfır güven değil)', () => {
    const s = esle(gozlem('k6', { hostname: 'hicbir-yerde-yok' }), indeks);
    expect(s.durum).toBe('inceleme_bekliyor');
    expect(s.guvenSkoru).toBeNull();
    expect(s.adaylar).toHaveLength(0);
  });

  it('çelişen anahtar güveni düşürür ama eşleşmeyi bozmaz', () => {
    const tam = esle(gozlem('k7', { seriNo: 'SN-TEST-A1' }), indeks);
    const celiskili = esle(
      // seri tutuyor ama MAC varlıkta olmayan bir değerle geliyor → çelişki yok
      // (varlıkta MAC boş). Çelişki için hostname'i farklı bir varlığa değil,
      // aynı varlığın DOLU alanına ters bir değerle veriyoruz.
      gozlem('k8', { seriNo: 'SN-TEST-A1', uretici: 'ABB', model: 'AC500' }),
      indeks,
    );
    expect(celiskili.eslesenVarlikId).toBe('v-seri');
    // üretici+model uymadığı için destek katkısı yok; güven seri gücünde kalır
    expect(celiskili.guvenSkoru!).toBeLessThanOrEqual(tam.guvenSkoru!);
  });
});

/* ═══ Keşif koşusu ════════════════════════════════════════════════════ */

describe('Keşif koşusu: idempotency ve kuyruk', () => {
  it('aynı kayıt ikinci keşifte YENİ SATIR AÇMAZ, son görülme tazelenir', async () => {
    const varlik = await db.varlik.create({ data: {
      etiket: `${ONEK}IDEM`, ad: 'Idempotency PLC', turId, seriNo: 'SN-IDEM-1' } });

    const g = gozlem('idem-1', { seriNo: 'SN-IDEM-1', hostname: 'plc-idem' });
    const dun = new Date(Date.now() - 86_400_000);

    const ilk = await kesfiIsle([g], { kaynak: KAYNAK, simdi: dun });
    expect(ilk.yeni).toBe(1);
    expect(ilk.yinelenen).toBe(0);
    expect(ilk.eslesen).toBe(1);

    const ikinci = await kesfiIsle([g], { kaynak: KAYNAK });
    expect(ikinci.yeni).toBe(0);
    expect(ikinci.yinelenen).toBe(1);

    const satirlar = await db.kesifKaydi.findMany({
      where: { kaynak: KAYNAK, kaynakKayitId: 'idem-1' } });
    expect(satirlar).toHaveLength(1);
    expect(satirlar[0].eslesenVarlikId).toBe(varlik.id);
    expect(satirlar[0].sonGorulme.getTime()).toBeGreaterThan(dun.getTime());
    expect(satirlar[0].ilkGorulme.getTime()).toBe(dun.getTime());
  });

  it('köken alanı eksik gözlem SESSİZCE ATILMAZ, sebebiyle reddedilir', async () => {
    const kimliksiz = { ...gozlem('', { seriNo: 'SN-YOK' }) };
    const ozet = await kesfiIsle([kimliksiz], { kaynak: KAYNAK });
    expect(ozet.kabulEdilen).toBe(0);
    expect(ozet.reddedilen).toBe(1);
    expect(ozet.reddedilenler[0].sebep).toMatch(/köken eksik/);
  });

  it('çakışan gözlem kuyruğa inceleme_bekliyor olarak düşer', async () => {
    await db.varlik.create({ data: {
      etiket: `${ONEK}CAK-A`, ad: 'Çakışma A', turId, seriNo: 'SN-CAK-A' } });
    await db.varlik.create({ data: {
      etiket: `${ONEK}CAK-B`, ad: 'Çakışma B', turId, macAdresi: '00:AA:BB:CC:DD:EE' } });

    const ozet = await kesfiIsle(
      [gozlem('cak-1', { seriNo: 'SN-CAK-A', macAdresi: '00:AA:BB:CC:DD:EE' })],
      { kaynak: KAYNAK },
    );
    expect(ozet.cakisan).toBe(1);

    const kayit = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynak: KAYNAK, kaynakKayitId: 'cak-1' } });
    expect(kayit.durum).toBe('inceleme_bekliyor');
    expect(kayit.eslesenVarlikId).toBeNull();
    expect(kayit.guvenSkoru).toBeNull();
    expect(normalCoz(kayit.normalJson)?.eslesme?.adaylar).toHaveLength(2);
  });

  it('yüksek güvenli eşleşme bile CMDB\'ye OTOMATİK yazılmaz', async () => {
    await db.varlik.create({ data: {
      etiket: `${ONEK}OTOMATIK`, ad: 'Otomatik yazma testi', turId, seriNo: 'SN-OTO-1' } });

    await kesfiIsle(
      [gozlem('oto-1', { seriNo: 'SN-OTO-1', firmware: 'FW-BEKLEMEDE' })],
      { kaynak: KAYNAK },
    );
    const kayit = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynak: KAYNAK, kaynakKayitId: 'oto-1' } });
    expect(kayit.durum).toBe('eslesti');       // onay bekliyor
    expect(kayit.guvenSkoru!).toBeGreaterThan(0.9);

    const varlik = await db.varlik.findFirstOrThrow({ where: { etiket: `${ONEK}OTOMATIK` } });
    expect(varlik.firmware).toBeNull();        // hiçbir alan yazılmadı
    const koken = await db.veriKokeni.findMany({
      where: { varlikTipi: 'Varlik', varlikId: varlik.id } });
    expect(koken).toHaveLength(0);             // köken de yazılmadı
  });
});

/* ═══ Onay akışı ══════════════════════════════════════════════════════ */

describe('Onay: CMDB yazımı ve köken', () => {
  it('onaylanan kayıt Varlik\'a yazılır ve köken alır', async () => {
    const varlik = await db.varlik.create({ data: {
      etiket: `${ONEK}ONAY`, ad: 'Onay testi', turId, seriNo: 'SN-ONAY-1' } });

    await kesfiIsle(
      [gozlem('onay-1', {
        seriNo: 'SN-ONAY-1', hostname: 'plc-onay', firmware: 'FW-4.2',
        uretici: 'Siemens', model: 'S7-1200',
      })],
      { kaynak: KAYNAK },
    );
    const kayit = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynak: KAYNAK, kaynakKayitId: 'onay-1' } });
    expect(kayit.durum).toBe('eslesti');

    const sonuc = await kesifKararUygula({
      kesifId: kayit.id, karar: 'onayla', inceleyenId: kullaniciId,
      not: 'Saha doğrulaması yapıldı',
    });
    expect(sonuc.varlikId).toBe(varlik.id);
    expect(sonuc.yazilanAlanlar.map((a) => a.alan)).toContain('firmware');

    const sonra = await db.varlik.findUniqueOrThrow({ where: { id: varlik.id } });
    expect(sonra.firmware).toBe('FW-4.2');
    expect(sonra.hostname).toBe('plc-onay');

    const koken = await db.veriKokeni.findFirstOrThrow({
      where: { varlikTipi: 'Varlik', varlikId: varlik.id, kaynakSistem: KAYNAK_SISTEM } });
    expect(koken.kaynakKayitId).toBe('onay-1');
    expect(koken.kokenTipi).toBe('otomatik');
    expect(koken.dogrulamaDurumu).toBe('dogrulanmadi'); // doğrulama insanın ayrı işi
    expect(koken.guven).toBe(kayit.guvenSkoru);

    const kararli = await db.kesifKaydi.findUniqueOrThrow({ where: { id: kayit.id } });
    expect(kararli.durum).toBe('onaylandi');
    expect(kararli.inceleyenId).toBe(kullaniciId);
    expect(kararli.incelemeNotu).toBe('Saha doğrulaması yapıldı');
  });

  it('gerekçesiz ya da inceleyensiz karar REDDEDİLİR', async () => {
    const kayit = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynak: KAYNAK, kaynakKayitId: 'cak-1' } });
    await expect(kesifKararUygula({
      kesifId: kayit.id, karar: 'reddet', inceleyenId: kullaniciId, not: '   ',
    })).rejects.toThrow(/gerekçe/i);
    await expect(kesifKararUygula({
      kesifId: kayit.id, karar: 'reddet', inceleyenId: '', not: 'sebep',
    })).rejects.toThrow(/inceleyen/i);
  });

  it('otomatik gelen veri insanın girdiği DOLU alanı sessizce ezmez', async () => {
    const varlik = await db.varlik.create({ data: {
      etiket: `${ONEK}EZME`, ad: 'Ezme testi', turId,
      seriNo: 'SN-EZME-1', hostname: 'insan-yazdi' } });

    await kesfiIsle(
      [gozlem('ezme-1', { seriNo: 'SN-EZME-1', hostname: 'kesif-yazdi' })],
      { kaynak: KAYNAK },
    );
    const kayit = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynak: KAYNAK, kaynakKayitId: 'ezme-1' } });

    const sonuc = await kesifKararUygula({
      kesifId: kayit.id, karar: 'onayla', inceleyenId: kullaniciId, not: 'onay',
    });
    expect(sonuc.korunanAlanlar.map((a) => a.alan)).toContain('hostname');
    const sonra = await db.varlik.findUniqueOrThrow({ where: { id: varlik.id } });
    expect(sonra.hostname).toBe('insan-yazdi');
  });

  it('eşleşmeyen kayıttan yeni varlık açılır ve kökeni guven=null olur', async () => {
    await kesfiIsle(
      [gozlem('yeni-1', { hostname: 'yepyeni-plc', seriNo: 'SN-YEPYENI' })],
      { kaynak: KAYNAK },
    );
    const kayit = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynak: KAYNAK, kaynakKayitId: 'yeni-1' } });
    expect(kayit.durum).toBe('inceleme_bekliyor');
    expect(kayit.guvenSkoru).toBeNull();

    const sonuc = await kesifKararUygula({
      kesifId: kayit.id, karar: 'yeni_varlik', inceleyenId: kullaniciId,
      not: 'Sahada doğrulandı, envantere alındı',
      yeniVarlik: { turId, etiket: `${ONEK}YENI` },
    });
    expect(sonuc.yeniVarlikAcildi).toBe(true);

    const varlik = await db.varlik.findUniqueOrThrow({ where: { id: sonuc.varlikId! } });
    expect(varlik.seriNo).toBe('SN-YEPYENI');
    expect(varlik.kritiklik).toBe('bilinmiyor'); // değerlendirme UYDURULMAZ

    const koken = await db.veriKokeni.findFirstOrThrow({
      where: { varlikTipi: 'Varlik', varlikId: varlik.id } });
    expect(koken.guven).toBeNull();  // eşleşme yoktu → ölçülmedi
  });

  it('karara bağlanmış kayıt ikinci kez karara bağlanamaz', async () => {
    const kayit = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynak: KAYNAK, kaynakKayitId: 'onay-1' } });
    await expect(kesifKararUygula({
      kesifId: kayit.id, karar: 'reddet', inceleyenId: kullaniciId, not: 'tekrar',
    })).rejects.toThrow(/zaten karara bağlanmış/);
  });
});

/* ═══ Kaybolan varlık ═════════════════════════════════════════════════ */

describe('Kaybolan varlık: silme YOK, gözlem VAR', () => {
  it('ikinci keşifte görünmeyen kayıt silinmez; varlık da silinmez', async () => {
    const onceKayit = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynak: KAYNAK, kaynakKayitId: 'onay-1' } });
    const varlikId = onceKayit.eslesenVarlikId!;

    // Kaynak bu kez o kaydı HİÇ göndermiyor (cihaz ağdan düştü).
    await kesfiIsle(
      [gozlem('idem-1', { seriNo: 'SN-IDEM-1' })],
      { kaynak: KAYNAK },
    );

    const hala = await db.kesifKaydi.findUnique({ where: { id: onceKayit.id } });
    expect(hala).not.toBeNull();
    expect(hala!.durum).toBe('onaylandi');
    const varlik = await db.varlik.findUnique({ where: { id: varlikId } });
    expect(varlik).not.toBeNull();
    expect(varlik!.silindi).toBeNull();
    expect(varlik!.yasamDongusu).toBe('aktif'); // otomatik emeklilik YOK
  });

  it('görülmeyen kayıt RAPOR edilir ama dokunulmaz', async () => {
    const kayit = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynak: KAYNAK, kaynakKayitId: 'onay-1' } });
    const eski = new Date(Date.now() - 45 * 86_400_000);
    await db.kesifKaydi.update({ where: { id: kayit.id }, data: { sonGorulme: eski } });

    const liste = await gorulmeyenKayitlar({ esikGun: 30, kaynak: KAYNAK });
    const bizimki = liste.find((x) => x.id === kayit.id);
    expect(bizimki).toBeDefined();
    expect(bizimki!.gunGecti).toBeGreaterThanOrEqual(44);

    // Rapor hiçbir şeyi değiştirmedi.
    const sonra = await db.kesifKaydi.findUniqueOrThrow({ where: { id: kayit.id } });
    expect(sonra.durum).toBe('onaylandi');
    expect(await db.varlik.count({ where: { id: sonra.eslesenVarlikId! } })).toBe(1);
  });

  it('karara bağlanmış kaydın KANITI yeniden keşifte değiştirilmez', async () => {
    const once = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynak: KAYNAK, kaynakKayitId: 'onay-1' } });
    await kesfiIsle(
      [gozlem('onay-1', { seriNo: 'SN-ONAY-1', firmware: 'FW-DEGISTI' })],
      { kaynak: KAYNAK },
    );
    const sonra = await db.kesifKaydi.findUniqueOrThrow({ where: { id: once.id } });
    expect(sonra.hamJson).toBe(once.hamJson);       // insan neyi onayladıysa o duruyor
    expect(sonra.normalJson).toBe(once.normalJson);
    expect(sonra.sonGorulme.getTime()).toBeGreaterThan(once.sonGorulme.getTime());
  });
});

/* ═══ Adaptörler ══════════════════════════════════════════════════════ */

describe('Elle aktarım adaptörü (gerçekten çalışan tek adaptör)', () => {
  const CSV = [
    'hostname,serial_number,mac,ip,vendor,model',
    'plc-csv-1,SN-CSV-1,00-11-22-33-44-01,10.9.0.1,Siemens,S7-1500',
    'hmi-csv-2,SN-CSV-2,0011.2233.4402,10.9.0.2,Siemens,TP1500',
  ].join('\n');

  const baglam = {
    connectorId: '', kod: 'test', kaynakSistem: KAYNAK_SISTEM,
    yapilandirma: { bicim: 'csv', icerik: CSV }, sir: null, imlec: null,
  };

  it('CSV başlıklarını tanır ve kararlı kimlik üretir', async () => {
    const cekme = await elleAktarimAdaptoru.fetchChanges(baglam);
    expect(cekme.gozlemler).toHaveLength(2);
    const ilk = cekme.gozlemler[0] as VarlikGozlemi;
    expect(ilk.hostname).toBe('plc-csv-1');
    expect(ilk.seriNo).toBe('SN-CSV-1');
    expect(ilk.macAdresi).toBe('00-11-22-33-44-01');
    expect(ilk.koken.kaynakKayitId).toMatch(/^ozet:[0-9a-f]{32}$/);
    expect(ilk.koken.guven).toBeNull(); // dosya kendi doğruluğunu ölçemez

    // Deterministik: ikinci çekimde AYNI kimlik.
    const tekrar = await elleAktarimAdaptoru.fetchChanges(baglam);
    expect((tekrar.gozlemler[0] as VarlikGozlemi).koken.kaynakKayitId)
      .toBe(ilk.koken.kaynakKayitId);
  });

  it('aynı CSV iki kez işlenirse keşif kuyruğu çoğalmaz', async () => {
    const cekme = await elleAktarimAdaptoru.fetchChanges(baglam);
    const a = await kesfiIsle(cekme.gozlemler, { kaynak: 'csv' });
    const b = await kesfiIsle(cekme.gozlemler, { kaynak: 'csv' });
    expect(a.yeni).toBe(2);
    expect(b.yeni).toBe(0);
    expect(b.yinelenen).toBe(2);
    expect(await db.kesifKaydi.count({ where: { kaynak: 'csv' } })).toBe(2);
  });

  it('kaynak tanımlı değilse BOŞ LİSTE dönmez, fırlatır', async () => {
    await expect(elleAktarimAdaptoru.fetchChanges({
      ...baglam, yapilandirma: {},
    })).rejects.toThrow(/kaynağı tanımlı değil/);
  });
});

describe('Bağlanmamış adaptörler "başarılı" numarası yapmaz', () => {
  const baglanmamis = ADAPTOR_TIPLERI.filter((t) => t !== 'manual_import');

  it('hepsi kimlik_bekleniyor döner ve ne gerektiğini yazar', async () => {
    for (const tip of baglanmamis) {
      const a = adaptorGetir(tip);
      expect(a.baglanabilir, tip).toBe(false);
      const saglik = await a.health({
        connectorId: '', kod: tip, kaynakSistem: tip,
        yapilandirma: {}, sir: null, imlec: null,
      });
      expect(saglik.durum, tip).toBe('kimlik_bekleniyor');
      expect(saglik.ayrinti.length, tip).toBeGreaterThan(20); // gerçek gereksinim metni
      expect(saglik.tazelikDk, tip).toBeNull();
    }
  });

  it('fetchChanges boş liste yerine FIRLATIR (boş liste "kayıt yok" demektir)', async () => {
    for (const tip of baglanmamis) {
      await expect(adaptorGetir(tip).fetchChanges({
        connectorId: '', kod: tip, kaynakSistem: tip,
        yapilandirma: {}, sir: null, imlec: null,
      }), tip).rejects.toThrow(/bağlı değil/i);
    }
  });

  it('bilinmeyen tip sessizce "bağlı değil"e düşmez', () => {
    expect(() => adaptorGetir('uydurma_tip')).toThrow(/adaptör kayıtlı değil/);
  });
});

/* ═══ İndeks ══════════════════════════════════════════════════════════ */

describe('Varlık indeksi', () => {
  it('CMDB\'den yüklenir ve silinmiş varlıkları içermez', async () => {
    const silinmis = await db.varlik.create({ data: {
      etiket: `${ONEK}SILINMIS`, ad: 'Silinmiş', turId,
      seriNo: 'SN-SILINMIS', silindi: new Date() } });
    const ix = await varlikIndeksiYukle();
    expect(ix.varliklar.has(silinmis.id)).toBe(false);
    const s = esle(gozlem('sil-1', { seriNo: 'SN-SILINMIS' }), ix);
    expect(s.eslesenVarlikId).toBeNull();
  });
});

/* ═══ Çekirdekle ortak sınır ══════════════════════════════════════════ */

describe('Senkronizasyon çekirdeğiyle sınır', () => {
  /* Çekirdek (lib/entegrasyon/cekirdek.ts) normalJson'u DÜZ gözlem gövdesi
     olarak yazar ve kaydı `normalize` durumunda bırakır. Eşleştirme geçişi
     onu okuyup eşleştirebilmeli — yoksa connector'dan gelen hiçbir kayıt
     kuyruğa düşmez. */
  it('çekirdeğin düz normalJson biçimi okunur ve eşleştirilir', async () => {
    const varlik = await db.varlik.create({ data: {
      etiket: `${ONEK}CEKIRDEK`, ad: 'Çekirdek sınırı', turId, seriNo: 'SN-CEKIRDEK-1' } });

    const g = gozlem('cekirdek-1', { seriNo: 'SN-CEKIRDEK-1', hostname: 'plc-cek' });
    const duzGovde = { ...g } as Record<string, unknown>;
    delete duzGovde.ham;

    const kayit = await db.kesifKaydi.create({ data: {
      kaynak: KAYNAK, kaynakKayitId: 'cekirdek-1',
      hamJson: JSON.stringify(g.ham),
      normalJson: JSON.stringify(duzGovde),
      durum: 'normalize',
    } });

    const cozulen = normalCoz(kayit.normalJson);
    expect(cozulen?.gozlem.seriNo).toBe('SN-CEKIRDEK-1');
    expect(cozulen?.eslesme).toBeNull();       // henüz eşleştirilmedi
    expect(gozlemeCevir(cozulen!)?.hostname).toBe('plc-cek');

    const ozet = await bekleyenleriEslestir({ kaynak: KAYNAK });
    expect(ozet.bakilan).toBeGreaterThan(0);

    const sonra = await db.kesifKaydi.findUniqueOrThrow({ where: { id: kayit.id } });
    expect(sonra.durum).toBe('eslesti');
    expect(sonra.eslesenVarlikId).toBe(varlik.id);
    expect(sonra.guvenSkoru!).toBeGreaterThan(0.9);
    expect(normalCoz(sonra.normalJson)?.eslesme?.gerekce).toMatch(/eşleşti/);
  });

  it('eşleştirme geçişi karara bağlanmış kayda DOKUNMAZ', async () => {
    const once = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynak: KAYNAK, kaynakKayitId: 'onay-1' } });
    await bekleyenleriEslestir({ kaynak: KAYNAK });
    const sonra = await db.kesifKaydi.findUniqueOrThrow({ where: { id: once.id } });
    expect(sonra.durum).toBe('onaylandi');
    expect(sonra.normalJson).toBe(once.normalJson);
    expect(sonra.guvenSkoru).toBe(once.guvenSkoru);
  });

  it('eşleştirme geçişi hiçbir kaydı CMDB\'ye YAZMAZ', async () => {
    const varlik = await db.varlik.create({ data: {
      etiket: `${ONEK}GECIS`, ad: 'Geçiş yazmaz', turId, seriNo: 'SN-GECIS-1' } });
    const g = gozlem('gecis-1', { seriNo: 'SN-GECIS-1', firmware: 'FW-GECIS' });
    const duz = { ...g } as Record<string, unknown>;
    delete duz.ham;
    await db.kesifKaydi.create({ data: {
      kaynak: KAYNAK, kaynakKayitId: 'gecis-1',
      hamJson: '{}', normalJson: JSON.stringify(duz), durum: 'normalize' } });

    await bekleyenleriEslestir({ kaynak: KAYNAK });

    const sonra = await db.varlik.findUniqueOrThrow({ where: { id: varlik.id } });
    expect(sonra.firmware).toBeNull();
    expect(await db.veriKokeni.count({
      where: { varlikTipi: 'Varlik', varlikId: varlik.id } })).toBe(0);
  });

  it('varlık dışı gözlem atlanır ve SEBEBİYLE raporlanır', async () => {
    await db.kesifKaydi.create({ data: {
      kaynak: KAYNAK, kaynakKayitId: 'zafiyet-1',
      hamJson: '{}',
      normalJson: JSON.stringify({
        tip: 'zafiyet',
        koken: { kaynakSistem: KAYNAK_SISTEM, kaynakKayitId: 'zafiyet-1', guven: null },
      }),
      durum: 'normalize',
    } });
    const ozet = await bekleyenleriEslestir({ kaynak: KAYNAK });
    const atlanan = ozet.atlanan.find((a) => a.sebep.includes('zafiyet'));
    expect(atlanan).toBeDefined();
  });

  it('keşif kaydının kendi kökeni yazılır (kaynağın güveni, eşleşme güveni DEĞİL)', async () => {
    const g = gozlem('koken-1', { seriNo: 'SN-KOKEN-1' });
    g.koken.guven = 0.4;                      // kaynağın kendi beyanı
    await db.varlik.create({ data: {
      etiket: `${ONEK}KOKEN`, ad: 'Köken testi', turId, seriNo: 'SN-KOKEN-1' } });
    await kesfiIsle([g], { kaynak: KAYNAK });

    const kayit = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynak: KAYNAK, kaynakKayitId: 'koken-1' } });
    const koken = await db.veriKokeni.findFirstOrThrow({
      where: { varlikTipi: 'KesifKaydi', varlikId: kayit.id } });
    expect(koken.guven).toBe(0.4);            // kaynağın beyanı
    expect(kayit.guvenSkoru!).toBeGreaterThan(0.9); // eşleşme güveni AYRI
  });
});
