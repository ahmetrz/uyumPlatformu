import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Motor zinciri testleri (§68 + entegrasyon).

   YÖNTEM: GERÇEK motorlar, GERÇEK `isKos`, izole DB kopyası
   (tests/motorlar.test.ts kalıbı). Motorlar taklit EDİLMEZ — zincirin
   iddiası "mevcut motorları doğru sırayla tetikliyorum" olduğu için
   sahte motorla test etmek iddiayı doğrulamaz. Gözlem noktası
   `IsKosusu` tablosu: zincirin sırası ve başarısı orada da görünür.

   Hata enjeksiyonu da veri üzerinden yapılır (bozuk kural JSON'u),
   modül mock'lanmaz — böylece `isKos`un gerçek hata yolu test edilir. */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-zincir-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const zincir = await import('@/lib/entegrasyon/zincir');
const { zinciriCalistir, zincirDurumu, ZINCIR_SIRASI } = zincir;
type ZincirSonucu = Awaited<ReturnType<typeof zinciriCalistir>>;

const adim = (s: ZincirSonucu, ad: string) => s.adimlar.find((a) => a.ad === ad);
const sira = (s: ZincirSonucu, ad: string) => s.adimlar.findIndex((a) => a.ad === ad);

/** Zincirin dokunmaması gereken durumların anlık görüntüsü. */
async function guvenlikAnligi() {
  const [riskler, bulgular, elIleKararlar] = await Promise.all([
    db.risk.findMany({ select: { id: true, durum: true }, orderBy: { id: 'asc' } }),
    db.bulgu.findMany({ select: { id: true, durum: true }, orderBy: { id: 'asc' } }),
    db.uygulanabilirlikKarari.findMany({
      where: { elIleDegistirildi: true },
      select: { id: true, uygulanabilir: true, gerekce: true },
      orderBy: { id: 'asc' } }),
  ]);
  return { riskler, bulgular, elIleKararlar };
}

describe('Motor zinciri — sıra, koşul, dayanıklılık, otomasyon sınırı', () => {
  beforeAll(async () => {
    await db.gorev.deleteMany({ where: { otomatikUretildi: true } });
    await db.projeAdayi.deleteMany();
    await db.veriKalitesiBulgusu.deleteMany();
    await db.isKosusu.deleteMany();
  });

  it('sıra: veri kalitesi gap-to-action\'dan ÖNCE koşar (DB zaman damgasıyla kanıtlı)', async () => {
    const sonuc = await zinciriCalistir({
      kosuId: 'ENT-TEST-1',
      degisenler: { varlik: true, tesis: true, kanit: true, zafiyet: true },
    });

    // (1) zincir tanımındaki sıra
    const tanimVK = ZINCIR_SIRASI.findIndex((a) => a.ad === 'veri_kalitesi');
    const tanimGap = ZINCIR_SIRASI.findIndex((a) => a.ad === 'gap_to_action');
    expect(tanimVK).toBeGreaterThanOrEqual(0);
    expect(tanimVK).toBeLessThan(tanimGap);

    // (2) bu koşudaki yürütme sırası
    expect(sira(sonuc, 'veri_kalitesi')).toBeLessThan(sira(sonuc, 'gap_to_action'));
    // uygulanabilirlik, kanıt/anlık ve gap'ten önce; anlık kanıt tazeliğinden sonra
    expect(sira(sonuc, 'uygulanabilirlik')).toBeLessThan(sira(sonuc, 'uyum_anlik'));
    expect(sira(sonuc, 'kanit_tazelik')).toBeLessThan(sira(sonuc, 'uyum_anlik'));
    expect(sira(sonuc, 'uyum_anlik')).toBeLessThan(sira(sonuc, 'gap_to_action'));

    // (3) gerçekten sırayla koştu: veri kalitesi BİTTİKTEN sonra gap BAŞLADI
    const vk = await db.isKosusu.findFirstOrThrow({
      where: { isAdi: 'veri_kalitesi' }, orderBy: { baslangic: 'desc' } });
    const gap = await db.isKosusu.findFirstOrThrow({
      where: { isAdi: 'gap_to_action' }, orderBy: { baslangic: 'desc' } });
    expect(vk.bitis).not.toBeNull();
    expect(vk.bitis!.getTime()).toBeLessThanOrEqual(gap.baslangic.getTime());

    // (4) motorlar DOĞRUDAN değil isKos üzerinden koştu → sayaçlar isKos'un
    //     KosuSonucu dönüşünden geldi ve her biri IsKosusu satırı bıraktı
    for (const a of sonuc.adimlar.filter((x) => x.durum === 'basarili')) {
      expect(a.islenen).not.toBeNull();
      expect(a.sureMs).not.toBeNull();
      const kosu = await db.isKosusu.findFirstOrThrow({
        where: { isAdi: a.ad }, orderBy: { baslangic: 'desc' } });
      expect(kosu.durum).toBe('basarili');
      expect(kosu.islenen).toBe(a.islenen);
      expect(kosu.uretilen).toBe(a.uretilen);
    }

    // (5) zincirin kendi koşu satırı /saglik için yazıldı
    expect(sonuc.zincirKosuId).toBeTruthy();
    const zincirKosusu = await db.isKosusu.findFirstOrThrow({
      where: { isAdi: 'entegrasyon_zinciri' }, orderBy: { baslangic: 'desc' } });
    expect(zincirKosusu.durum).toBe('basarili');
    expect(sonuc.basarisiz).toEqual([]);
    expect(sonuc.zincirHatalari).toEqual([]);
  });

  it('koşullu atlama: yalnız kanıt değiştiğinde uygulanabilirlik KOŞMAZ', async () => {
    const sonuc = await zinciriCalistir({
      kosuId: 'ENT-TEST-2', degisenler: { kanit: true } });

    const uyg = adim(sonuc, 'uygulanabilirlik')!;
    expect(uyg.durum).toBe('atlandi');
    expect(uyg.sureMs).toBeNull();                     // hiç koşmadı
    expect(uyg.gerekce).toContain('tesis');            // gerekçesi kodda yazılı
    expect(sonuc.atlanan).toContain('uygulanabilirlik');

    // kanıt zinciri koştu
    expect(sonuc.kosan).toContain('kanit_tazelik');
    expect(sonuc.kosan).toContain('veri_kalitesi');
    // zamana bağlı motor kanıt değişikliğiyle tetiklenmez
    expect(sonuc.atlanan).toContain('deadline_motoru');
  });

  it('koşullu atlama: YALNIZ varlık değiştiyse de uygulanabilirlik KOŞMAZ (profile bağlı)', async () => {
    const oncekiUygKosuSayisi = await db.isKosusu.count({ where: { isAdi: 'uygulanabilirlik' } });
    const sonuc = await zinciriCalistir({
      kosuId: 'ENT-TEST-3', degisenler: { varlik: true } });

    expect(adim(sonuc, 'uygulanabilirlik')!.durum).toBe('atlandi');
    // hiç koşmadığının kanıtı: yeni IsKosusu satırı açılmadı
    expect(await db.isKosusu.count({ where: { isAdi: 'uygulanabilirlik' } }))
      .toBe(oncekiUygKosuSayisi);
    // varlık değişimi kendi motorlarını tetikledi
    expect(sonuc.kosan).toContain('veri_kalitesi');
    expect(sonuc.kosan).toContain('deadline_motoru');
    expect(sonuc.kosan).toContain('gap_to_action');
    // kanıta bağlı motor tetiklenmedi
    expect(sonuc.atlanan).toContain('kanit_tazelik');
  });

  it('motorsuz değişiklik bayrağı sessizce yutulmaz', async () => {
    /* yedek ve topoloji artık MOTORLU: yedek_dogrulama ve topoloji_sapma
       zincire girdi. Geriye yalnız 'erisim' kaldı — tedarikçi erişim
       oturumundan kural işleten bir motor yok ve zincir bunu sessizce
       yutmak yerine sonuçta söylüyor. */
    const sonuc = await zinciriCalistir({
      kosuId: 'ENT-TEST-4', degisenler: { yedek: true, topoloji: true, erisim: true } });
    expect(sonuc.kosan).toEqual(['yedek_dogrulama', 'topoloji_sapma']);
    expect(sonuc.kapsanmayanDegisiklikler.length).toBe(1);
    expect(sonuc.kapsanmayanDegisiklikler.join(' ')).toContain('erisim');
  });

  it('yedek/topoloji/olay motorları zincirde DOĞRU KOŞULLA yer alır', async () => {
    const ad = (a: string) => ZINCIR_SIRASI.find((z) => z.ad === a);
    expect(ad('yedek_dogrulama')?.tetikleyenler).toEqual(['yedek', 'varlik']);
    expect(ad('topoloji_sapma')?.tetikleyenler).toEqual(['topoloji']);
    expect(ad('olay_etki')?.tetikleyenler).toEqual(['varlik', 'tesis']);
    // gap_to_action zincirin SONUNDA kalmalı: kararını güncel veriyle verir
    expect(ZINCIR_SIRASI[ZINCIR_SIRASI.length - 1].ad).toBe('gap_to_action');
    // veri_kalitesi gap_to_action'dan ÖNCE
    const i = (a: string) => ZINCIR_SIRASI.findIndex((z) => z.ad === a);
    expect(i('veri_kalitesi')).toBeLessThan(i('gap_to_action'));
  });

  it('bir motor patlarsa zincir DEVAM eder ve sonuç bunu bildirir', async () => {
    // Hata enjeksiyonu veri üzerinden: bozuk kural JSON'u → kuralDegerlendir
    // JSON.parse'da fırlatır → tesisKapsaminiHesapla fırlatır → isKos yakalar.
    const reg = await db.regulasyon.findFirstOrThrow();
    const bozuk = await db.uygulanabilirlikKurali.create({ data: {
      regulasyonId: reg.id, ad: 'ZINCIR-TEST bozuk kural',
      kosulJson: 'BU GEÇERLİ JSON DEĞİL', aktif: true } });

    try {
      const sonuc = await zinciriCalistir({
        kosuId: 'ENT-TEST-5', degisenler: { tesis: true, kanit: true, varlik: true } });

      // patlayan motor bildirildi
      expect(sonuc.basarisiz).toContain('uygulanabilirlik');
      const uyg = adim(sonuc, 'uygulanabilirlik')!;
      expect(uyg.durum).toBe('basarisiz');
      expect(uyg.gerekce).toContain('hata');

      // hata IsKosusu'na yazıldı (sessiz hata yok, /saglik'te görünür)
      const kosu = await db.isKosusu.findFirstOrThrow({
        where: { isAdi: 'uygulanabilirlik' }, orderBy: { baslangic: 'desc' } });
      expect(kosu.durum).toBe('basarisiz');
      expect(kosu.hata).toBeTruthy();

      // ZİNCİR KESİLMEDİ: sonraki adımlar koştu
      expect(sonuc.kosan).toContain('kanit_tazelik');
      expect(sonuc.kosan).toContain('uyum_anlik');
      expect(sonuc.kosan).toContain('gap_to_action');
      expect(sira(sonuc, 'uygulanabilirlik')).toBeLessThan(sira(sonuc, 'gap_to_action'));

      // zincirin kendi satırı da başarısız işaretlendi
      const zincirKosusu = await db.isKosusu.findFirstOrThrow({
        where: { isAdi: 'entegrasyon_zinciri' }, orderBy: { baslangic: 'desc' } });
      expect(zincirKosusu.durum).toBe('basarisiz');
      expect(zincirKosusu.hata).toContain('uygulanabilirlik');
    } finally {
      await db.uygulanabilirlikKurali.delete({ where: { id: bozuk.id } });
    }
  });

  it('isKos "zaten_calisiyor" dönerse motor ATLANDI sayılır, BAŞARISIZ değil', async () => {
    // aynı motorun başka bir koşuda çalıştığını taklit et (kira süresi içinde)
    const asili = await db.isKosusu.create({
      data: { isAdi: 'veri_kalitesi', durum: 'calisiyor' } });
    try {
      const sonuc = await zinciriCalistir({
        kosuId: 'ENT-TEST-5b', degisenler: { varlik: true } });
      const vk = adim(sonuc, 'veri_kalitesi')!;
      expect(vk.durum).toBe('atlandi');
      expect(vk.gerekce).toContain('çakışma koruması');
      expect(vk.gerekce).toContain('hata değil');
      expect(sonuc.basarisiz).not.toContain('veri_kalitesi');
      expect(sonuc.atlanan).toContain('veri_kalitesi');
      // zincir kesilmedi: sonraki motorlar koştu
      expect(sonuc.kosan).toContain('gap_to_action');
    } finally {
      await db.isKosusu.delete({ where: { id: asili.id } });
    }
  });

  it('otomasyon sınırı: zincir risk KABUL ETMEZ, bulgu KAPATMAZ, el ile kararı EZMEZ', async () => {
    // el ile değiştirilmiş bir karar kur — zincir buna dokunmamalı
    const tesis = await db.tesis.findFirstOrThrow({ where: { durum: 'aktif' } });
    const reg = await db.regulasyon.findFirstOrThrow();
    const elIle = await db.uygulanabilirlikKarari.upsert({
      where: { tesisId_regulasyonId: { tesisId: tesis.id, regulasyonId: reg.id } },
      update: { uygulanabilir: false, gerekce: 'EL İLE: kapsam dışı bırakıldı',
        elIleDegistirildi: true, degistirmeGerekcesi: 'zincir testi' },
      create: { tesisId: tesis.id, regulasyonId: reg.id, uygulanabilir: false,
        gerekce: 'EL İLE: kapsam dışı bırakıldı', elIleDegistirildi: true,
        degistirmeGerekcesi: 'zincir testi' } });

    // kararı ezmeye ZORLAYAN bir kural: aynı regülasyon için her tesis kapsamda
    const zorlayici = await db.uygulanabilirlikKurali.create({ data: {
      regulasyonId: reg.id, ad: 'ZINCIR-TEST her zaman kapsamda',
      kosulJson: JSON.stringify({ herhangi: [{ alan: 'kuruluGucMw', islec: '>=', deger: 0 }] }),
      aktif: true } });

    const once = await guvenlikAnligi();
    try {
      const sonuc = await zinciriCalistir({
        kosuId: 'ENT-TEST-6',
        degisenler: { varlik: true, tesis: true, kanit: true, zafiyet: true } });

      const sonra = await guvenlikAnligi();

      // hiçbir risk otomatik KABUL EDİLMEDİ
      const kabulOlan = sonra.riskler.filter((r) => r.durum === 'kabul_edildi'
        && once.riskler.find((o) => o.id === r.id)?.durum !== 'kabul_edildi');
      expect(kabulOlan).toEqual([]);

      // hiçbir bulgu otomatik KAPATILMADI
      const kapanan = sonra.bulgular.filter((b) =>
        (b.durum === 'kapali' || b.durum === 'kabul_edildi')
        && !['kapali', 'kabul_edildi'].includes(
          once.bulgular.find((o) => o.id === b.id)?.durum ?? ''));
      expect(kapanan).toEqual([]);

      // el ile değiştirilmiş karar AYNEN duruyor
      const kararSonra = await db.uygulanabilirlikKarari.findUniqueOrThrow({
        where: { id: elIle.id } });
      expect(kararSonra.uygulanabilir).toBe(false);
      expect(kararSonra.gerekce).toBe('EL İLE: kapsam dışı bırakıldı');
      expect(kararSonra.elIleDegistirildi).toBe(true);

      // motor bunu "atlandı" olarak da raporladı
      expect(adim(sonuc, 'uygulanabilirlik')!.not ?? '').toContain('elIleDegistirildi');

      // zincirin kendi güvenlik ağı da temiz
      expect(sonuc.otomasyonIhlalleri).toEqual([]);
      expect(await db.isKosusu.count({ where: { isAdi: 'zincir_guvenlik_ihlali' } })).toBe(0);

      // proje adayları YALNIZ öneri — otomatik projeye dönüşmedi
      const adaylar = await db.projeAdayi.findMany();
      expect(adaylar.every((a) => a.durum === 'oneri' && a.projeId === null)).toBe(true);
    } finally {
      await db.uygulanabilirlikKurali.delete({ where: { id: zorlayici.id } });
    }
  });

  it('yeniden giriş: eşzamanlı çağrılar tek bekleyen koşuda BİRLEŞİR, koşular çakışmaz', async () => {
    await db.isKosusu.deleteMany({ where: { isAdi: 'entegrasyon_zinciri' } });
    expect(zincirDurumu().calisiyor).toBe(false);

    const a = zinciriCalistir({ kosuId: 'ENT-A', degisenler: { kanit: true } });
    // ilk çağrı kilidi aldı
    expect(zincirDurumu().calisiyor).toBe(true);
    const b = zinciriCalistir({ kosuId: 'ENT-B', degisenler: { tesis: true } });
    const c = zinciriCalistir({ kosuId: 'ENT-C', degisenler: { varlik: true } });
    expect(zincirDurumu().bekleyenVar).toBe(true);

    const [sa, sb, sc] = await Promise.all([a, b, c]);

    // B ve C aynı bekleyen koşuda birleşti — aynı sonuç nesnesi
    expect(sb).toBe(sc);
    expect(sb.birlestirilenTetik).toBe(2);
    expect(sb.entegrasyonKosuIdleri.sort()).toEqual(['ENT-B', 'ENT-C']);
    // bayraklar OR'landı: hiçbir tetik kaybolmadı
    expect(sb.degisenler.tesis).toBe(true);
    expect(sb.degisenler.varlik).toBe(true);

    // A ayrı bir koşuydu
    expect(sa).not.toBe(sb);
    expect(sa.entegrasyonKosuIdleri).toEqual(['ENT-A']);
    expect(sa.zincirKosuId).not.toBe(sb.zincirKosuId);

    // ÇAKIŞMA YOK: iki zincir koşusu zamanda örtüşmüyor
    const kosular = await db.isKosusu.findMany({
      where: { isAdi: 'entegrasyon_zinciri' }, orderBy: { baslangic: 'asc' } });
    expect(kosular.length).toBe(2);
    expect(kosular[0].bitis).not.toBeNull();
    expect(kosular[0].bitis!.getTime()).toBeLessThanOrEqual(kosular[1].baslangic.getTime());

    // hiçbir adım isKos çakışma koruması yüzünden düşmedi
    for (const s of [sa, sb])
      for (const ad of s.adimlar)
        expect(ad.gerekce).not.toContain('çakışma koruması');

    // kilit bırakıldı
    expect(zincirDurumu().calisiyor).toBe(false);
    expect(zincirDurumu().bekleyenVar).toBe(false);
  });
});
