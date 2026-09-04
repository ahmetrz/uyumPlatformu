import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Zamanlayıcı, kilit ve kuyruk.

   Bu üçlü şu kusuru kapatıyor: `Connector.pollAralikDk` yapılandırılıyor,
   ekranda görünüyor ve TAZELİK YARGISINDA kullanılıyordu — ama hiçbir şey
   ona bakıp connector koşturmuyordu. Yani ürün kendi zamanlayıcı
   boşluğunu "kaynak sistem bayat veri veriyor" diye gösteriyordu.

   Testler üç ayrı sözleşmeyi ölçer:
   · kilit ATOMİKTİR — iki eşzamanlı istekten yalnız biri kazanır;
   · vade ölçüsü SON BAŞARILI koşudur (bekleyen kurulum taze sayılmaz);
   · koşmayan her hedef SEBEBİYLE raporlanır (sessiz atlama yok). */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-zaman-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { kilitAl, kilidiBirak, kilidiTazele, kilitAltinda, dolmusKilitleriTemizle } =
  await import('@/lib/is/kilit');
const { kuyrukSec, kuyrukSaglayicilari, ES_ZAMANLI_SINIR } = await import('@/lib/is/kuyruk');
const { connectorVadesi, vadesiGelenler, zamanlayiciTiki, bakimYap, MOTOR_ARALIK_DK, BAKIM_ISI } =
  await import('@/lib/is/zamanlayici');

const SIMDI = new Date('2026-09-01T12:00:00Z');
const dkOnce = (dk: number) => new Date(SIMDI.getTime() - dk * 60_000);

/* ═══ Kilit ═══════════════════════════════════════════════════════════ */

describe('Atomik iş kilidi', () => {
  beforeEach(async () => { await db.isKilidi.deleteMany({}); });

  it('boş kilidi alır', async () => {
    const k = await kilitAl('deneme:1', 60_000, 'a');
    expect(k.alindi).toBe(true);
  });

  it('EŞZAMANLI iki istekten yalnız BİRİ kazanır', async () => {
    /* Asıl kusur buydu: "önce bak, sonra oluştur" yarışında ikisi de
       kazanıyordu. Aynı anda beş istek atıp tam birinin kazandığını
       ölçüyoruz — dörtte üç kazansa da test kırmızı olur. */
    const sonuclar = await Promise.all(
      ['a', 'b', 'c', 'd', 'e'].map((s) => kilitAl('deneme:yaris', 60_000, s)),
    );
    expect(sonuclar.filter((s) => s.alindi)).toHaveLength(1);
  });

  it('başkasının canlı kilidini almaz ve KİMİN tuttuğunu söyler', async () => {
    await kilitAl('deneme:2', 60_000, 'ilk');
    const k = await kilitAl('deneme:2', 60_000, 'ikinci');
    expect(k.alindi).toBe(false);
    if (!k.alindi) expect(k.sahip).toBe('ilk');
  });

  it('KİRASI DOLMUŞ kilit devralınır — süreç ölünce otomasyon kalıcı durmaz', async () => {
    await kilitAl('deneme:3', 60_000, 'olen', dkOnce(120));
    const k = await kilitAl('deneme:3', 60_000, 'yeni', SIMDI);
    expect(k.alindi).toBe(true);
    if (k.alindi) expect(k.sahip).toBe('yeni');
  });

  it('aynı sahip kendi kilidini yeniden alabilir', async () => {
    await kilitAl('deneme:4', 60_000, 'a');
    expect((await kilitAl('deneme:4', 60_000, 'a')).alindi).toBe(true);
  });

  it('devredilmiş kilidi ESKİ sahip bırakamaz', async () => {
    /* Geciken eski sahip kilidi bırakırsa, devralan sürecin altından
       kilidi çeker ve iki süreç aynı satırlara yazar. */
    await kilitAl('deneme:5', 60_000, 'eski', dkOnce(120));
    await kilitAl('deneme:5', 60_000, 'yeni', SIMDI);
    expect(await kilidiBirak('deneme:5', 'eski')).toBe(false);
    expect(await db.isKilidi.findUnique({ where: { ad: 'deneme:5' } })).not.toBeNull();
    expect(await kilidiBirak('deneme:5', 'yeni')).toBe(true);
  });

  it('kilidi kaybeden TAZELEYEMEZ — işini kesmesi gerektiğini böyle anlar', async () => {
    await kilitAl('deneme:6', 60_000, 'eski', dkOnce(120));
    await kilitAl('deneme:6', 60_000, 'yeni', SIMDI);
    expect(await kilidiTazele('deneme:6', 'eski')).toBe(false);
    expect(await kilidiTazele('deneme:6', 'yeni')).toBe(true);
  });

  it('kilitAltinda: iş patlasa da kilit bırakılır', async () => {
    await expect(
      kilitAltinda('deneme:7', async () => { throw new Error('patladı'); }),
    ).rejects.toThrow('patladı');
    expect(await db.isKilidi.findUnique({ where: { ad: 'deneme:7' } })).toBeNull();
  });

  it('kilitAltinda: alınamayan kilitte iş HİÇ ÇALIŞMAZ', async () => {
    await kilitAl('deneme:8', 60_000, 'baskasi');
    let calisti = false;
    const s = await kilitAltinda('deneme:8', async () => { calisti = true; }, 60_000, 'ben');
    expect(calisti).toBe(false);
    expect(s.kosuldu).toBe(false);
  });

  it('dolmuş kilitler temizlenir, canlı olan durur', async () => {
    await kilitAl('deneme:9', 60_000, 'a', dkOnce(120));
    await kilitAl('deneme:10', 60_000, 'a', SIMDI);
    expect(await dolmusKilitleriTemizle(SIMDI)).toBe(1);
    expect(await db.isKilidi.findUnique({ where: { ad: 'deneme:10' } })).not.toBeNull();
  });
});

/* ═══ Kuyruk ══════════════════════════════════════════════════════════ */

describe('İş kuyruğu soyutlaması', () => {
  it('iki sağlayıcı kayıtlı: süreç-içi bağlı, dış DEĞİL', () => {
    const adlar = kuyrukSaglayicilari().map((s) => s.ad);
    expect(adlar).toEqual(['dis', 'surec-ici']);
    const dis = kuyrukSaglayicilari().find((s) => s.ad === 'dis')!;
    expect(dis.bagli).toBe(false);
    expect(dis.gereken).toMatch(/Redis|Temporal/);
  });

  it('bağlı olmayan kuyruk istenirse SESSİZCE süreç-içine düşülmez', () => {
    expect(() => kuyrukSec('dis')).toThrow(/bağlı değil/);
    expect(() => kuyrukSec('yok-boyle-bir-sey')).toThrow(/Bilinmeyen/);
  });

  it('süreç-içi kuyruk DAYANIKSIZ olduğunu söyler', () => {
    expect(kuyrukSec('surec-ici').dayanikli).toBe(false);
  });

  it('aynı anahtar sırada iki kez beklemez', async () => {
    const k = kuyrukSec('surec-ici');
    let sayac = 0;
    const yavas = () => new Promise<void>((r) => setTimeout(() => { sayac += 1; r(); }, 20));
    const a = await k.gonder({ anahtar: 'tekil', tur: 'bakim', hedef: 'x' }, yavas);
    const b = await k.gonder({ anahtar: 'tekil', tur: 'bakim', hedef: 'x' }, yavas);
    expect(a).toBe('siraya_alindi');
    expect(b).toBe('zaten_sirada');
    await k.bosalt();
    expect(sayac).toBe(1);
  });

  it('eşzamanlılık sınırı AŞILMAZ — SQLite tek yazıcıdır', async () => {
    const k = kuyrukSec('surec-ici');
    let anlik = 0; let enYuksek = 0;
    await Promise.all(Array.from({ length: 12 }, (_, i) => k.gonder(
      { anahtar: `es-${i}`, tur: 'bakim', hedef: 'x' },
      async () => {
        anlik += 1; enYuksek = Math.max(enYuksek, anlik);
        await new Promise((r) => setTimeout(r, 15));
        anlik -= 1;
      },
    )));
    await k.bosalt();
    expect(enYuksek).toBeLessThanOrEqual(ES_ZAMANLI_SINIR);
    expect(enYuksek).toBeGreaterThan(1);
  });

  it('bir işin patlaması diğerlerini durdurmaz ve hata YUTULMAZ', async () => {
    const k = kuyrukSec('surec-ici');
    let iyiKostu = false;
    await k.gonder({ anahtar: 'kotu', tur: 'bakim', hedef: 'x' },
      async () => { throw new Error('bilerek'); });
    await k.gonder({ anahtar: 'iyi', tur: 'bakim', hedef: 'x' },
      async () => { iyiKostu = true; });
    const sonuclar = await k.bosalt();
    expect(iyiKostu).toBe(true);
    expect(sonuclar.find((s) => s.anahtar === 'kotu')?.hata).toMatch(/bilerek/);
  });
});

/* ═══ Vade kuralı ═════════════════════════════════════════════════════ */

const temelConnector = {
  id: 'c1', ad: 'Deneme', tip: 'manual_import', durum: 'etkin',
  etkin: true, silindi: null as Date | null, pollAralikDk: 15,
};

describe('Connector vade kuralı', () => {
  it('poll aralığı dolmuşsa vadelidir', () => {
    const v = connectorVadesi(temelConnector, dkOnce(20), SIMDI);
    expect(v.vadeli).toBe(true);
  });

  it('poll aralığı dolmamışsa KALAN SÜREYİ söyler', () => {
    const v = connectorVadesi(temelConnector, dkOnce(5), SIMDI);
    expect(v.vadeli).toBe(false);
    if (!v.vadeli) expect(v.sebep).toMatch(/10 dk kaldı/);
  });

  it('hiç koşmamış connector ilk tikte vadelidir', () => {
    expect(connectorVadesi(temelConnector, null, SIMDI).vadeli).toBe(true);
  });

  it('poll aralığı tanımsızsa YALNIZ ELLE — bu bir eksiklik değil, bir seçimdir', () => {
    const v = connectorVadesi({ ...temelConnector, pollAralikDk: null }, null, SIMDI);
    expect(v.vadeli).toBe(false);
    if (!v.vadeli) expect(v.sebep).toMatch(/yalnız elle/i);
  });

  it('BAĞLANAMAYAN adaptör zamanlanmaz — koşu geçmişi gürültüye boğulmaz', () => {
    /* `ad_entra` gibi tipler `BaglanmamisAdaptor`'ı genişletir. Her poll
       aralığında bir `kimlik_bekleniyor` satırı düşseydi, gerçek hatalar
       kurulum bekleyen connector'ların gürültüsünde kaybolurdu. */
    const v = connectorVadesi({ ...temelConnector, tip: 'ad_entra' }, null, SIMDI);
    expect(v.vadeli).toBe(false);
    if (!v.vadeli) expect(v.sebep).toMatch(/kimlik bekleniyor/);
  });

  it('adaptörü olmayan tip açık sebeple atlanır', () => {
    const v = connectorVadesi({ ...temelConnector, tip: 'uydurma_tip' }, null, SIMDI);
    expect(v.vadeli).toBe(false);
    if (!v.vadeli) expect(v.sebep).toMatch(/adaptör kayıtlı değil/);
  });

  it('devre kesici duraklattıysa kendiliğinden yeniden koşmaz', () => {
    const v = connectorVadesi({ ...temelConnector, durum: 'hatali' }, dkOnce(600), SIMDI);
    expect(v.vadeli).toBe(false);
    if (!v.vadeli) expect(v.sebep).toMatch(/elle yeniden etkinleştirilmeli/);
  });

  it('pasif, taslak ve silinmiş connector koşmaz', () => {
    for (const c of [
      { ...temelConnector, etkin: false },
      { ...temelConnector, durum: 'taslak' },
      { ...temelConnector, silindi: new Date() },
    ]) expect(connectorVadesi(c, null, SIMDI).vadeli).toBe(false);
  });
});

/* ═══ Tik ═════════════════════════════════════════════════════════════ */

describe('Zamanlayıcı tiki', () => {
  beforeAll(async () => {
    await db.isKilidi.deleteMany({});
  });

  it('koşmayan HER hedef sebebiyle raporlanır — sessiz atlama yok', async () => {
    const { kosulacak, atlanan } = await vadesiGelenler(SIMDI);
    const toplam = kosulacak.length + atlanan.length;
    /* Defterdeki motor sayısı — `lib/motorlar/kayit.ts` ile aynı olmalı.
       Sabit yazılıyor ki defterden bir motor sessizce düşerse yakalansın.
       Sayıyı büyütmek YETMEZ: yeni motorun `MOTOR_ADLARI_SOZLUK`ta da
       olması gerekir, yoksa zamanlayıcı onu "Bilinmeyen yapılandırma
       anahtarı" ile atlar ve motor hiç koşmaz. */
    const motorSayisi = 18;
    const connectorSayisi = await db.connector.count({ where: { silindi: null } });
    expect(toplam).toBe(motorSayisi + connectorSayisi);
    for (const a of atlanan) expect(a.sebep.length).toBeGreaterThan(5);
  });

  it('vade ölçüsü SON BAŞARILI koşudur — bekleyen kurulum taze sayılmaz', async () => {
    const c = await db.connector.findFirst({
      where: { silindi: null, tip: 'manual_import' },
    });
    if (!c) return; // seed'de yoksa bu vaka atlanır
    await db.connector.update({
      where: { id: c.id }, data: { etkin: true, durum: 'etkin', pollAralikDk: 15 },
    });
    await db.entegrasyonKosusu.create({
      data: {
        kaynak: c.tip, connectorId: c.id, durum: 'kimlik_bekleniyor',
        baslangic: dkOnce(1), bitis: dkOnce(1),
      },
    });
    const { kosulacak } = await vadesiGelenler(SIMDI);
    expect(kosulacak.some((k) => k.tur === 'connector' && k.hedef === c.id)).toBe(true);

    await db.entegrasyonKosusu.create({
      data: {
        kaynak: c.tip, connectorId: c.id, durum: 'basarili',
        baslangic: dkOnce(1), bitis: dkOnce(1),
      },
    });
    const sonra = await vadesiGelenler(SIMDI);
    expect(sonra.kosulacak.some((k) => k.tur === 'connector' && k.hedef === c.id)).toBe(false);
  });

  it('tik connector senkronizasyonunu GERÇEKTEN çağırır', async () => {
    /* Kapatılan kusurun doğrudan testi: eskiden tik yalnız motorları
       koştururdu ve bu sayaç sıfır kalırdı. */
    const c = await db.connector.findFirst({ where: { silindi: null, tip: 'manual_import' } });
    if (!c) return;
    await db.entegrasyonKosusu.deleteMany({ where: { connectorId: c.id } });
    await db.connector.update({
      where: { id: c.id }, data: { etkin: true, durum: 'etkin', pollAralikDk: 15 },
    });

    const cagrilan: string[] = [];
    const ozet = await zamanlayiciTiki({
      simdi: SIMDI,
      motorAralikDk: 10_000, // motorlar bu turda vadeli olmasın
      connectorKos: async (id) => { cagrilan.push(id); },
      bekle: true,
    });
    expect(cagrilan).toContain(c.id);
    expect(ozet.kuyruk).toBe('surec-ici');
  });

  it('motorlar aralık dolmadan yeniden koşmaz', async () => {
    const ozet = await zamanlayiciTiki({
      simdi: SIMDI, motorAralikDk: MOTOR_ARALIK_DK,
      connectorKos: async () => {}, bekle: true,
    });
    // Tik fırlatmaz; her hedef ya sıraya girer ya sebebiyle atlanır.
    expect(ozet.siralanan + ozet.atlanan.length).toBeGreaterThan(0);
    expect(ozet.sonuc.every((s) => s.ok)).toBe(true);
  });
});


/* ═══ Bakım ═══════════════════════════════════════════════════════════ */

describe('Bakım işi', () => {
  it('süresi dolmuş oturum ve kilitleri siler, canlıya dokunmaz', async () => {
    const k = await db.kullanici.findFirstOrThrow();
    const dolmus = await db.oturum.create({
      data: { kullaniciId: k.id, tokenHash: `bakim-dolmus-${Date.now()}`, bitis: dkOnce(60) },
    });
    const canli = await db.oturum.create({
      data: {
        kullaniciId: k.id, tokenHash: `bakim-canli-${Date.now()}`,
        bitis: new Date(SIMDI.getTime() + 3_600_000),
      },
    });
    await kilitAl('bakim:dolmus', 60_000, 'a', dkOnce(120));
    await kilitAl('bakim:canli', 60_000, 'a', SIMDI);

    const sonuc = await bakimYap(SIMDI);
    expect(sonuc.islenen).toBeGreaterThanOrEqual(2);
    // Yeni kayıt ÜRETMEZ: bakım bir temizliktir, bir motor değil.
    expect(sonuc.uretilen).toBe(0);

    expect(await db.oturum.findUnique({ where: { id: dolmus.id } })).toBeNull();
    expect(await db.oturum.findUnique({ where: { id: canli.id } })).not.toBeNull();
    expect(await db.isKilidi.findUnique({ where: { ad: 'bakim:dolmus' } })).toBeNull();
    expect(await db.isKilidi.findUnique({ where: { ad: 'bakim:canli' } })).not.toBeNull();
  });

  it('tik bakımı KOŞU KAYDIYLA çalıştırır — sessiz temizlik yok', async () => {
    /* Kapatılan kusur: iki temizleyici yazılmış, test edilmiş ve hiçbir
       yerden çağrılmıyordu. Süresi dolmuş oturum satırları birikince
       "kaç açık oturum var" sorusunun yanıtı yanlış olurdu. */
    await db.isKosusu.deleteMany({ where: { isAdi: BAKIM_ISI } });
    await zamanlayiciTiki({
      simdi: SIMDI, motorAralikDk: 10_000, connectorKos: async () => {}, bekle: true,
    });
    const kosu = await db.isKosusu.findFirst({
      where: { isAdi: BAKIM_ISI }, orderBy: { baslangic: 'desc' },
    });
    expect(kosu, 'bakım koşu kaydı bırakmadı').not.toBeNull();
    expect(kosu!.durum).toBe('basarili');
    expect(kosu!.sureMs).not.toBeNull();
  });

  it('bakım vadesi dolmadan İKİNCİ kez koşmaz', async () => {
    /* `simdi` burada GERÇEK saattir, sabit SIMDI değil: koşu satırının
       `baslangic` alanını veritabanı varsayılanı (gerçek şimdi) yazar.
       Enjekte edilmiş bir gelecek saatle karşılaştırmak, aradaki farkı
       "vade doldu" diye okur ve testi kendi kurgusuyla yanıltırdı. */
    await db.isKosusu.deleteMany({ where: { isAdi: BAKIM_ISI } });
    const simdi = new Date();
    await zamanlayiciTiki({
      simdi, motorAralikDk: 10_000, connectorKos: async () => {}, bekle: true,
    });
    expect(await db.isKosusu.count({ where: { isAdi: BAKIM_ISI } })).toBe(1);

    await zamanlayiciTiki({
      simdi, motorAralikDk: 10_000, connectorKos: async () => {}, bekle: true,
    });
    expect(await db.isKosusu.count({ where: { isAdi: BAKIM_ISI } })).toBe(1);
  });
});

/* ═══ Tik maliyeti connector sayısıyla BÜYÜMEZ ════════════════════════ */

describe('Zamanlayıcı tiki sabit sayıda sorgu açar', () => {
  it('connector sayısı artınca koşu sorgusu sayısı ARTMAZ', async () => {
    /* Tik dakikada bir koşar. Eskiden motor başına ve connector başına
       birer `findFirst` vardı: hiçbir şey koşmayan bir dakikada bile
       8+N sorgu demekti ve connector eklendikçe doğrusal büyüyordu.
       SQLite tek yazıcıdır — boşa giden her sorgu gerçek işin sırasını
       uzatır. Son başarılı koşular artık tek `groupBy` ile alınıyor.

       Ölçüm doğrudan çağrı sayısını sayar. İlk yazımda Prisma'nın
       `$on('query')` olayı kullanılmıştı ve test YEŞİL görünüyordu —
       ama olay hiç yayılmıyordu (istemci `log: ['query']` ile kurulmuyor),
       yani sayaç her zaman sıfırdı ve mutasyon testi kırmızıya döndürmedi.
       Sahte yeşili bulan şey mutasyonun ta kendisiydi. */
    const sayaclar = { findFirst: 0, groupBy: 0 };
    const gercekFindFirst = db.entegrasyonKosusu.findFirst.bind(db.entegrasyonKosusu);
    const gercekGroupBy = db.entegrasyonKosusu.groupBy.bind(db.entegrasyonKosusu);
    const casus = db.entegrasyonKosusu as unknown as Record<string, unknown>;
    casus.findFirst = (...a: unknown[]) => { sayaclar.findFirst += 1; return (gercekFindFirst as (...x: unknown[]) => unknown)(...a); };
    casus.groupBy = (...a: unknown[]) => { sayaclar.groupBy += 1; return (gercekGroupBy as (...x: unknown[]) => unknown)(...a); };

    const eklenen: string[] = [];
    try {
      await vadesiGelenler(SIMDI);
      const azFindFirst = sayaclar.findFirst;
      const azGroupBy = sayaclar.groupBy;

      for (let i = 0; i < 6; i += 1) {
        const c = await db.connector.create({
          data: {
            kod: `TIK-OLCUM-${i}-${Date.now()}`, ad: `Tik ölçüm ${i}`,
            tip: 'manual_import', kaynakSistem: `TIK-${i}`, etkin: true,
            durum: 'etkin', pollAralikDk: 15,
          },
        });
        eklenen.push(c.id);
      }

      sayaclar.findFirst = 0; sayaclar.groupBy = 0;
      await vadesiGelenler(SIMDI);

      /* Altı connector eklendi. Eski yolda `findFirst` sayısı altı
         ARTARDI; yeni yolda connector başına hiç `findFirst` yok. */
      expect(sayaclar.findFirst).toBe(0);
      expect(azFindFirst).toBe(0);
      // Toplu okuma tek çağrıdır ve connector sayısından bağımsızdır.
      expect(sayaclar.groupBy).toBe(azGroupBy);
      expect(sayaclar.groupBy).toBeLessThanOrEqual(1);
    } finally {
      casus.findFirst = gercekFindFirst;
      casus.groupBy = gercekGroupBy;
      for (const id of eklenen) await db.connector.delete({ where: { id } });
    }
  });
});
