import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB'yi importlardan ÖNCE ayarla (db modülü ilk erişimde okur).
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-api-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { apiTokenUret } = await import('@/lib/api/kimlik');
const { oranAyari, oranAyariAyarla, oranSayaclariniSifirla } = await import('@/lib/api/oranSinir');

// Route dosyalarının KENDİSİ import edilir: `route.api.ts` sarmalayıcısının
// gerçekten doğru işleyiciyi dışa aktardığı da test edilmiş olur.
const { GET: santralleriGetir } = await import('@/app/api/v1/plants/route.api');
const { GET: varlikGetir } = await import('@/app/api/v1/assets/route.api');
const { POST: varlikYaz } = await import('@/app/api/v1/assets/upsert/route.api');
const { POST: gozlemYaz } = await import('@/app/api/v1/assets/observations/route.api');
const { POST: zafiyetYaz } = await import('@/app/api/v1/vulnerabilities/route.api');
const { GET: kosuGetir } = await import('@/app/api/v1/integration-runs/route.api');
const { GET: kanitGetir } = await import('@/app/api/v1/evidence/route.api');
const { POST: yedekYaz } = await import('@/app/api/v1/backup-results/route.api');
const { POST: erisimYaz } = await import('@/app/api/v1/access-observations/route.api');

/* ═══ sabitler ═══════════════════════════════════════════════════════ */

const ONEK = 'APITEST';
const zaman = new Date('2026-08-01T09:00:00.000Z').toISOString();

type Anahtarlar = Record<'a' | 'genel' | 'denetci' | 'suresiDolmus' | 'iptal', string>;
const jeton = {} as Anahtarlar;
const kimlikler = { tesisA: '', tesisB: '', turId: '', kullaniciA: '', kullaniciGenel: '' };

const bearer = (token: string, ek: Record<string, string> = {}) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  ...ek,
});

const al = (yol: string, token: string) =>
  new Request(`http://test${yol}`, { headers: bearer(token) });

const yolla = (yol: string, token: string, govde: unknown, idem: string) =>
  new Request(`http://test${yol}`, {
    method: 'POST',
    headers: bearer(token, { 'Idempotency-Key': idem }),
    body: JSON.stringify(govde),
  });

const varlikKaydi = (ek: Record<string, unknown>) => ({
  source: 'test_itam',
  sourceRecordId: `kayit-${ek.assetTag}`,
  collectedAt: zaman,
  confidence: null, // ÖLÇÜLMEDİ — sıfır güven değil
  ...ek,
});

async function anahtarUret(kullaniciId: string, ek: Record<string, unknown> = {}) {
  const { token, onEk, tokenHash } = apiTokenUret();
  await db.apiAnahtari.create({
    data: { ad: `${ONEK} anahtar`, kullaniciId, onEk, tokenHash, ...ek },
  });
  return token;
}

/* ═══ kurulum ════════════════════════════════════════════════════════ */

beforeAll(async () => {
  const tesisA = await db.tesis.create({ data: { kod: `${ONEK}-A`, ad: 'Test Santrali A' } });
  const tesisB = await db.tesis.create({ data: { kod: `${ONEK}-B`, ad: 'Test Santrali B' } });
  const tur = await db.varlikTuru.create({ data: { kod: `${ONEK}-TUR`, ad: 'Test sunucu', sinif: 'BT' } });
  kimlikler.tesisA = tesisA.id;
  kimlikler.tesisB = tesisB.id;
  kimlikler.turId = tur.id;

  for (const n of [1, 2, 3]) {
    await db.varlik.create({ data: {
      etiket: `${ONEK}-A-${n}`, ad: `A varlığı ${n}`, turId: tur.id, tesisId: tesisA.id } });
  }
  await db.varlik.create({ data: {
    etiket: `${ONEK}-B-1`, ad: 'B varlığı 1', turId: tur.id, tesisId: tesisB.id } });

  const kullaniciA = await db.kullanici.create({ data: {
    eposta: `${ONEK}-a@test.local`, adSoyad: 'A Tesis BT Yöneticisi',
    yetkiler: { create: [{ rol: 'bt_yoneticisi', tesisId: tesisA.id }] } } });
  const kullaniciGenel = await db.kullanici.create({ data: {
    eposta: `${ONEK}-genel@test.local`, adSoyad: 'Kurum Yöneticisi',
    yetkiler: { create: [{ rol: 'yonetici' }] } } });
  const kullaniciDenetci = await db.kullanici.create({ data: {
    eposta: `${ONEK}-denetci@test.local`, adSoyad: 'Dış Denetçi',
    yetkiler: { create: [{ rol: 'dis_denetci' }] } } });
  kimlikler.kullaniciA = kullaniciA.id;
  kimlikler.kullaniciGenel = kullaniciGenel.id;

  jeton.a = await anahtarUret(kullaniciA.id);
  jeton.genel = await anahtarUret(kullaniciGenel.id);
  jeton.denetci = await anahtarUret(kullaniciDenetci.id);
  jeton.suresiDolmus = await anahtarUret(kullaniciGenel.id, { bitis: new Date(Date.now() - 60_000) });
  jeton.iptal = await anahtarUret(kullaniciGenel.id, { iptalZamani: new Date() });

  // Testler oran sınırına takılmasın; sınır testi kendi ayarını kurar.
  oranAyariAyarla({ sinir: 10_000, pencereMs: 60_000 });
});

beforeEach(async () => { await oranSayaclariniSifirla(); });

/* ═══ kimlik ═════════════════════════════════════════════════════════ */

describe('Kimlik: geçersiz anahtar veri göstermez', () => {
  it('token yoksa 401 yetkisiz', async () => {
    const y = await santralleriGetir(new Request('http://test/api/v1/plants'));
    expect(y.status).toBe(401);
    expect((await y.json()).error.code).toBe('yetkisiz');
  });

  it('geçersiz token 401 döner ve gövdede kayıt yoktur', async () => {
    const y = await santralleriGetir(al('/api/v1/plants', 'kesinlikle-gecersiz-token'));
    expect(y.status).toBe(401);
    const g = await y.json();
    expect(g.error.code).toBe('yetkisiz');
    expect(g.data).toBeUndefined();
  });

  it('süresi dolmuş anahtar 401', async () => {
    const y = await santralleriGetir(al('/api/v1/plants', jeton.suresiDolmus));
    expect(y.status).toBe(401);
    expect((await y.json()).error.message).toMatch(/süresi dolmuş/i);
  });

  it('iptal edilmiş anahtar 401', async () => {
    const y = await santralleriGetir(al('/api/v1/plants', jeton.iptal));
    expect(y.status).toBe(401);
    expect((await y.json()).error.message).toMatch(/iptal/i);
  });

  it('geçerli anahtar sonKullanim damgasını tazeler', async () => {
    await santralleriGetir(al('/api/v1/plants', jeton.genel));
    const anahtar = await db.apiAnahtari.findFirst({
      where: { kullaniciId: kimlikler.kullaniciGenel, iptalZamani: null, bitis: null } });
    expect(anahtar?.sonKullanim).not.toBeNull();
  });

  it('veritabanında token AÇIK HÂLDE durmaz (yalnız SHA-256 özeti)', async () => {
    const satirlar = await db.apiAnahtari.findMany({ where: { ad: `${ONEK} anahtar` } });
    expect(satirlar.length).toBeGreaterThan(0);
    for (const s of satirlar) {
      expect(s.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(Object.values(jeton)).not.toContain(s.tokenHash);
      expect(s.onEk.length).toBeLessThanOrEqual(8);
    }
  });
});

/* ═══ yetki ══════════════════════════════════════════════════════════ */

describe('Yetki: modül izni olmayan anahtar 403', () => {
  it('dış denetçi envanter okuyamaz (403 kapsam_disi)', async () => {
    const y = await varlikGetir(al('/api/v1/assets', jeton.denetci));
    expect(y.status).toBe(403);
    const g = await y.json();
    expect(g.error.code).toBe('kapsam_disi');
    expect(g.data).toBeUndefined();
  });

  it('dış denetçi varlık yazamaz (403)', async () => {
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.denetci,
      { records: [varlikKaydi({ assetTag: `${ONEK}-YASAK`, plantCode: `${ONEK}-A`, typeCode: `${ONEK}-TUR` })] },
      'denetci-yazma-1'));
    expect(y.status).toBe(403);
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-YASAK` } })).toBe(0);
  });

  it('santrale kısıtlı anahtar entegrasyon koşularını göremez (kurum geneli uç)', async () => {
    const y = await kosuGetir(al('/api/v1/integration-runs', jeton.a));
    expect(y.status).toBe(403);
    expect((await y.json()).error.code).toBe('kapsam_disi');
  });
});

/* ═══ santral kapsamı izolasyonu ═════════════════════════════════════ */

describe('Santral kapsamı: A anahtarı B tesisini NE GÖRÜR NE YAZAR', () => {
  it('okuma: yalnız kendi santralinin varlıkları döner', async () => {
    const y = await varlikGetir(al('/api/v1/assets?limit=200', jeton.a));
    expect(y.status).toBe(200);
    const g = await y.json();
    const etiketler = g.data.map((v: { assetTag: string }) => v.assetTag);
    expect(etiketler).toContain(`${ONEK}-A-1`);
    expect(etiketler).not.toContain(`${ONEK}-B-1`);
    expect(g.data.every((v: { plantId: string }) => v.plantId === kimlikler.tesisA)).toBe(true);
  });

  it('okuma: başka santral filtresi 403 döner (404 değil) ve kayıt sızdırmaz', async () => {
    const y = await varlikGetir(al(`/api/v1/assets?plantId=${kimlikler.tesisB}`, jeton.a));
    expect(y.status).toBe(403);
    const g = await y.json();
    expect(g.error.code).toBe('kapsam_disi');
    expect(g.data).toBeUndefined();
    expect(JSON.stringify(g)).not.toContain(`${ONEK}-B-1`);
  });

  it('yazma: kapsam dışı santrale yeni varlık yazılamaz, hiçbir şey kaydedilmez', async () => {
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.a,
      { records: [varlikKaydi({ assetTag: `${ONEK}-B-YENI`, plantCode: `${ONEK}-B`, typeCode: `${ONEK}-TUR` })] },
      'kapsam-disi-1'));
    expect(y.status).toBe(403);
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-B-YENI` } })).toBe(0);
  });

  it('yazma: başka santralin MEVCUT varlığı güncellenemez', async () => {
    const once = await db.varlik.findUniqueOrThrow({ where: { etiket: `${ONEK}-B-1` } });
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.a,
      { records: [varlikKaydi({ assetTag: `${ONEK}-B-1`, hostname: 'ele-gecirildi' })] },
      'kapsam-disi-2'));
    expect(y.status).toBe(403);
    const sonra = await db.varlik.findUniqueOrThrow({ where: { etiket: `${ONEK}-B-1` } });
    expect(sonra.hostname).toBe(once.hostname);
    expect(sonra.hostname).not.toBe('ele-gecirildi');
  });

  it('toplu istekte tek kayıt kapsam dışıysa TAMAMI reddedilir (yarım import yok)', async () => {
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.a, { records: [
      varlikKaydi({ assetTag: `${ONEK}-A-YENI`, plantCode: `${ONEK}-A`, typeCode: `${ONEK}-TUR` }),
      varlikKaydi({ assetTag: `${ONEK}-B-YENI2`, plantCode: `${ONEK}-B`, typeCode: `${ONEK}-TUR` }),
    ] }, 'karisik-1'));
    expect(y.status).toBe(403);
    expect(await db.varlik.count({ where: { etiket: { in: [`${ONEK}-A-YENI`, `${ONEK}-B-YENI2`] } } })).toBe(0);
  });
});

/* ═══ idempotency ════════════════════════════════════════════════════ */

describe('Idempotency', () => {
  const kayit = () => ({ records: [varlikKaydi({
    assetTag: `${ONEK}-IDEM`, plantCode: `${ONEK}-A`, typeCode: `${ONEK}-TUR`, hostname: 'idem-host' })] });

  it('Idempotency-Key olmadan yazma 400 + alan adı', async () => {
    const istek = new Request('http://test/api/v1/assets/upsert', {
      method: 'POST', headers: bearer(jeton.a), body: JSON.stringify(kayit()) });
    const y = await varlikYaz(istek);
    expect(y.status).toBe(400);
    const g = await y.json();
    expect(g.error.code).toBe('gecersiz_istek');
    expect(JSON.stringify(g.error.details)).toContain('Idempotency-Key');
  });

  it('aynı anahtarla ikinci istek işi TEKRAR ETMEZ, ilk yanıtı döner', async () => {
    const ilk = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.a, kayit(), 'idem-tek'));
    expect(ilk.status).toBe(200);
    const ilkGovde = await ilk.json();
    expect(ilkGovde.data.created).toBe(1);

    const ikinci = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.a, kayit(), 'idem-tek'));
    expect(ikinci.status).toBe(200);
    expect(ikinci.headers.get('Idempotent-Replay')).toBe('true');
    expect(await ikinci.json()).toEqual(ilkGovde);

    // TEK kayıt, TEK koşu — iş tekrar edilmedi.
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-IDEM` } })).toBe(1);
    expect(await db.entegrasyonKosusu.count({ where: { id: ilkGovde.data.runId } })).toBe(1);
    expect(await db.apiIstegi.count({
      where: { idempotencyAnahtari: 'idem-tek' } })).toBe(1);
  });

  it('farklı Idempotency-Key ile aynı kayıt yeni satır AÇMAZ (upsert), güncellenir', async () => {
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.a, { records: [varlikKaydi({
      assetTag: `${ONEK}-IDEM`, plantCode: `${ONEK}-A`, typeCode: `${ONEK}-TUR`, hostname: 'idem-host-2' })] },
      'idem-tek-2'));
    expect(y.status).toBe(200);
    const g = await y.json();
    expect(g.data.created).toBe(0);
    expect(g.data.updated).toBe(1);
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-IDEM` } })).toBe(1);
  });

  it('gözlem ucu (source, sourceRecordId) ile idempotenttir', async () => {
    const govde = { records: [varlikKaydi({
      assetTag: `${ONEK}-GOZLEM`, plantCode: `${ONEK}-A`, hostname: 'kesif-1' })] };
    const bir = await gozlemYaz(yolla('/api/v1/assets/observations', jeton.a, govde, 'gozlem-1'));
    const iki = await gozlemYaz(yolla('/api/v1/assets/observations', jeton.a, govde, 'gozlem-2'));
    expect(bir.status).toBe(200);
    expect(iki.status).toBe(200);
    expect((await bir.json()).data.created).toBe(1);
    expect((await iki.json()).data.refreshed).toBe(1);
    expect(await db.kesifKaydi.count({
      where: { kaynak: 'test_itam', kaynakKayitId: `kayit-${ONEK}-GOZLEM` } })).toBe(1);
  });

  it('keşif kaydı CMDB\'ye OTOMATİK geçmez — inceleme bekler', async () => {
    const kesif = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynakKayitId: `kayit-${ONEK}-GOZLEM` } });
    /* Uç, kaydı yazdıktan sonra eşleştirme geçişini koşturur: kayıt ham
       'kesfedildi' durumunda ASILI KALMAZ, inceleme kuyruğuna iner.
       Değişmeyen şey şu: eşleştirme CMDB'ye YAZMAZ. */
    expect(['eslesti', 'inceleme_bekliyor']).toContain(kesif.durum);
    expect(kesif.eslesenVarlikId).toBeNull();
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-GOZLEM` } })).toBe(0);
  });

  it('gözlem ucu eşleştirme geçişini koşturur ve sonucunu yanıtta söyler', async () => {
    const govde = { records: [varlikKaydi({
      assetTag: `${ONEK}-ESL`, plantCode: `${ONEK}-A`, hostname: 'kesif-esl' })] };
    const y = await gozlemYaz(yolla('/api/v1/assets/observations', jeton.a, govde, 'esl-1'));
    const veri = (await y.json()).data;
    // Sessiz geçmez: geçişin sonucu çağırana da bildirilir.
    expect(typeof veri.matching).toBe('string');
    expect(veri.matching).toMatch(/eşleştirme|atlandı/);

    const kesif = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynakKayitId: `kayit-${ONEK}-ESL` } });
    expect(kesif.durum).not.toBe('kesfedildi');
  });
});

/* ═══ doğrulama ══════════════════════════════════════════════════════ */

describe('Doğrulama: bozuk payload 400 + hangi alan', () => {
  it('köken alanı eksikse hangi alan olduğunu söyler', async () => {
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.a, { records: [{
      source: 'test_itam', sourceRecordId: 'x-1', collectedAt: zaman,
      assetTag: `${ONEK}-EKSIK`, plantCode: `${ONEK}-A`, typeCode: `${ONEK}-TUR`,
      // confidence YOK — "ölçülmedi" demek için null gönderilmeliydi
    }] }, 'bozuk-1'));
    expect(y.status).toBe(400);
    const g = await y.json();
    expect(g.error.code).toBe('gecersiz_istek');
    expect(JSON.stringify(g.error.details)).toContain('records.0.confidence');
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-EKSIK` } })).toBe(0);
  });

  it('geçersiz tarih ve aralık dışı güven alan adıyla reddedilir', async () => {
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.a, { records: [
      { ...varlikKaydi({ assetTag: 'x' }), collectedAt: 'dun' },
      { ...varlikKaydi({ assetTag: 'y' }), confidence: 5 },
    ] }, 'bozuk-2'));
    expect(y.status).toBe(400);
    const alanlar = JSON.stringify((await y.json()).error.details);
    expect(alanlar).toContain('records.0.collectedAt');
    expect(alanlar).toContain('records.1.confidence');
  });

  it('iş kuralı hatası indeks + alan ile döner, hiçbir kayıt yazılmaz', async () => {
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.a, { records: [
      varlikKaydi({ assetTag: `${ONEK}-IYI`, plantCode: `${ONEK}-A`, typeCode: `${ONEK}-TUR` }),
      varlikKaydi({ assetTag: `${ONEK}-KOTU`, plantCode: `${ONEK}-A`, typeCode: 'OLMAYAN-TUR' }),
    ] }, 'bozuk-3'));
    expect(y.status).toBe(400);
    const g = await y.json();
    expect(g.error.details.records[0]).toMatchObject({ indeks: 1, alan: 'typeCode' });
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-IYI` } })).toBe(0);
  });

  it('bozuk JSON gövdesi 400 döner', async () => {
    const istek = new Request('http://test/api/v1/assets/upsert', {
      method: 'POST', headers: bearer(jeton.a, { 'Idempotency-Key': 'bozuk-json' }), body: '{ bu json degil' });
    const y = await varlikYaz(istek);
    expect(y.status).toBe(400);
    expect((await y.json()).error.code).toBe('gecersiz_istek');
  });

  it('geçersiz sorgu parametresi hangi alan olduğunu söyler', async () => {
    const y = await varlikGetir(al('/api/v1/assets?limit=9999', jeton.a));
    expect(y.status).toBe(400);
    expect(JSON.stringify((await y.json()).error.details)).toContain('limit');
  });

  it('hata gövdesi yığın izi / iç ayrıntı taşımaz', async () => {
    const y = await varlikGetir(al('/api/v1/assets?criticality=uydurma', jeton.a));
    const metin = JSON.stringify(await y.json());
    expect(metin).not.toMatch(/at .*\.ts:/);
    expect(metin.toLowerCase()).not.toContain('stack');
    expect(metin).not.toContain('prisma');
  });
});

/* ═══ sayfalama ══════════════════════════════════════════════════════ */

describe('Sayfalama: imleç tabanlı', () => {
  it('limit + cursor sayfaları tekrarsız gezer, son sayfada nextCursor null', async () => {
    const ilk = await varlikGetir(al('/api/v1/assets?limit=2', jeton.a));
    expect(ilk.status).toBe(200);
    const s1 = await ilk.json();
    expect(s1.data).toHaveLength(2);
    expect(s1.nextCursor).toBeTypeOf('string');

    const gorulen = new Set<string>(s1.data.map((v: { id: string }) => v.id));
    let imlec: string | null = s1.nextCursor;
    let tur = 0;
    while (imlec && tur < 20) {
      const y = await varlikGetir(al(`/api/v1/assets?limit=2&cursor=${imlec}`, jeton.a));
      const s: { data: { id: string }[]; nextCursor: string | null } = await y.json();
      for (const v of s.data) {
        expect(gorulen.has(v.id)).toBe(false); // yineleme yok
        gorulen.add(v.id);
      }
      imlec = s.nextCursor;
      tur += 1;
    }
    expect(imlec).toBeNull();
    // A tesisinin TÜM varlıkları görüldü, B'ninkiler hiç görünmedi
    const beklenen = await db.varlik.count({ where: { tesisId: kimlikler.tesisA, silindi: null } });
    expect(gorulen.size).toBe(beklenen);
  });

  it('santral listesi de imleçle sayfalanır', async () => {
    const y = await santralleriGetir(al('/api/v1/plants?limit=1', jeton.genel));
    const g = await y.json();
    expect(g.data).toHaveLength(1);
    expect(g.nextCursor).toBe(g.data[0].id);
  });
});

/* ═══ oran sınırı ════════════════════════════════════════════════════ */

describe('Oran sınırı', () => {
  it('pencere aşılınca 429 + Retry-After döner', async () => {
    const eski = oranAyari();
    oranAyariAyarla({ sinir: 2, pencereMs: 60_000 });
    await oranSayaclariniSifirla();
    try {
      expect((await santralleriGetir(al('/api/v1/plants', jeton.genel))).status).toBe(200);
      expect((await santralleriGetir(al('/api/v1/plants', jeton.genel))).status).toBe(200);
      const ucuncu = await santralleriGetir(al('/api/v1/plants', jeton.genel));
      expect(ucuncu.status).toBe(429);
      expect(ucuncu.headers.get('Retry-After')).toBeTruthy();
      expect((await ucuncu.json()).error.code).toBe('oran_asildi');

      // Kova kimlik başınadır: başka anahtar etkilenmez.
      expect((await santralleriGetir(al('/api/v1/plants', jeton.a))).status).toBe(200);
    } finally {
      oranAyariAyarla(eski);
      await oranSayaclariniSifirla();
    }
  });
});

/* ═══ köken, denetim izi, koşu defteri ═══════════════════════════════ */

describe('Köken ve denetim izi', () => {
  it('yazılan kayıt köken alır; confidence null ise güven null KALIR (sıfır değil)', async () => {
    const varlik = await db.varlik.findUniqueOrThrow({ where: { etiket: `${ONEK}-IDEM` } });
    const koken = await db.veriKokeni.findFirstOrThrow({
      where: { varlikTipi: 'Varlik', varlikId: varlik.id } });
    expect(koken.kaynakSistem).toBe('test_itam');
    expect(koken.kaynakKayitId).toBe(`kayit-${ONEK}-IDEM`);
    expect(koken.kokenTipi).toBe('otomatik');
    expect(koken.guven).toBeNull();          // ÖLÇÜLMEDİ
    expect(koken.guven).not.toBe(0);
    expect(koken.dogrulamaDurumu).toBe('dogrulanmadi'); // doğrulama insanın işi
  });

  it('her istek ApiIstegi satırı bırakır (kimliksiz istek dahil)', async () => {
    const once = await db.apiIstegi.count();
    await santralleriGetir(al('/api/v1/plants', 'gecersiz-token-denetim'));
    await santralleriGetir(al('/api/v1/plants', jeton.genel));
    const sonra = await db.apiIstegi.findMany({ orderBy: { zaman: 'desc' }, take: 2 });
    expect(await db.apiIstegi.count()).toBe(once + 2);
    expect(sonra.some((s) => s.durumKodu === 401 && s.hataKodu === 'yetkisiz')).toBe(true);
    expect(sonra.every((s) => s.yol === '/api/v1/plants' && s.yontem === 'GET')).toBe(true);
    expect(sonra.every((s) => (s.sureMs ?? -1) >= 0)).toBe(true);
  });

  it('yazma ucu EntegrasyonKosusu satırı bırakır (tetikleyen = api)', async () => {
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.a, { records: [varlikKaydi({
      assetTag: `${ONEK}-KOSU`, plantCode: `${ONEK}-A`, typeCode: `${ONEK}-TUR` })] }, 'kosu-1'));
    const g = await y.json();
    const kosu = await db.entegrasyonKosusu.findUniqueOrThrow({ where: { id: g.data.runId } });
    expect(kosu.tetikleyen).toBe('api');
    expect(kosu.durum).toBe('basarili');
    expect(kosu.alinan).toBe(1);
    expect(kosu.kabulEdilen).toBe(1);
    expect(kosu.kaynak).toBe('test_itam');
  });

  it('başarısız yazma da koşu satırı bırakır (sessiz hata yok)', async () => {
    await varlikYaz(yolla('/api/v1/assets/upsert', jeton.a, { records: [varlikKaydi({
      assetTag: `${ONEK}-HATA`, plantCode: `${ONEK}-A`, typeCode: 'YOK' })] }, 'kosu-hata-1'));
    const kosu = await db.entegrasyonKosusu.findFirst({
      where: { tetikleyen: 'api', durum: 'basarisiz' }, orderBy: { baslangic: 'desc' } });
    expect(kosu).not.toBeNull();
    expect(kosu!.reddedilen).toBeGreaterThan(0);
    // Reddedilen kayit sistem arizasi DEGILDIR: `hata` degil `ayrinti` tasir.
    expect(kosu!.hata).toBeNull();
    expect(kosu!.ayrinti).toBeTruthy();
  });

  it('yazma ucu denetim izi (AktiviteKaydi) bırakır', async () => {
    const varlik = await db.varlik.findUniqueOrThrow({ where: { etiket: `${ONEK}-KOSU` } });
    const kayit = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Varlik', varlikId: varlik.id, eylem: 'olusturma' } });
    expect(kayit).not.toBeNull();
    expect(kayit!.aktorId).toBe(kimlikler.kullaniciA);
  });

  it('zafiyet ucu bulgu AÇAR, kapatmaz', async () => {
    const y = await zafiyetYaz(yolla('/api/v1/vulnerabilities', jeton.a, { records: [{
      source: 'test_scanner', sourceRecordId: 'z-1', collectedAt: zaman, confidence: 0.8,
      sourceRef: 'CVE-2026-0001', title: 'Test zafiyeti', cvss: 7.5,
      assetKey: `${ONEK}-A-1`,
    }] }, 'zafiyet-1'));
    expect(y.status).toBe(200);
    const g = await y.json();
    expect(g.data.created).toBe(1);
    expect(g.data.closed).toBe(0);
    const bag = await db.varlikZafiyeti.findFirstOrThrow({
      where: { zafiyet: { kaynakRef: 'CVE-2026-0001' } } });
    expect(bag.durum).toBe('acik');
    expect(bag.kapanis).toBeNull();
  });

  it('kapsam dışı varlığa zafiyet yazılamaz', async () => {
    const y = await zafiyetYaz(yolla('/api/v1/vulnerabilities', jeton.a, { records: [{
      source: 'test_scanner', sourceRecordId: 'z-2', collectedAt: zaman, confidence: null,
      sourceRef: 'CVE-2026-0002', title: 'B tesisi zafiyeti', assetKey: `${ONEK}-B-1`,
    }] }, 'zafiyet-2'));
    expect(y.status).toBe(403);
    expect(await db.zafiyet.count({ where: { kaynakRef: 'CVE-2026-0002' } })).toBe(0);
  });
});

/* ═══ kalan uçlar ════════════════════════════════════════════════════ */

describe('Yedek, erişim ve kanıt uçları', () => {
  it('yedek sonucu köken defteriyle idempotenttir (tekillik kısıtı olmadan)', async () => {
    const govde = { records: [{
      source: 'test_backup', sourceRecordId: 'yedek-1', collectedAt: zaman, confidence: null,
      assetKey: `${ONEK}-A-2`, backupAt: zaman, success: true, contentHash: 'abc123',
    }] };
    const bir = await yedekYaz(yolla('/api/v1/backup-results', jeton.a, govde, 'yedek-a'));
    const iki = await yedekYaz(yolla('/api/v1/backup-results', jeton.a, govde, 'yedek-b'));
    expect(bir.status).toBe(200);
    expect(iki.status).toBe(200);
    expect((await bir.json()).data.created).toBe(1);
    expect((await iki.json()).data.refreshed).toBe(1);
    const varlik = await db.varlik.findUniqueOrThrow({ where: { etiket: `${ONEK}-A-2` } });
    const yedekler = await db.konfigurasyonYedegi.findMany({ where: { varlikId: varlik.id } });
    expect(yedekler).toHaveLength(1);
    // Yedeğin geri dönebildiği ancak restore testiyle bilinir — otomatik doğrulanmaz.
    expect(yedekler[0].dogrulandi).toBe(false);
  });

  it('erişim gözlemi: privileged null ise ayrıcalıklı alanına DOKUNULMAZ', async () => {
    const y = await erisimYaz(yolla('/api/v1/access-observations', jeton.a, { records: [{
      source: 'test_ad', sourceRecordId: 'hesap-1', collectedAt: zaman, confidence: 0.5,
      accountName: `${ONEK}-svc-1`, accountType: 'servis', privileged: null,
      plantCode: `${ONEK}-A`, assetKey: `${ONEK}-A-3`,
    }] }, 'erisim-1'));
    expect(y.status).toBe(200);
    const g = await y.json();
    expect(g.data.created).toBe(1);
    expect(g.data.assignmentsCreated).toBe(1);
    const hesap = await db.kimlikHesabi.findUniqueOrThrow({ where: { hesapAdi: `${ONEK}-svc-1` } });
    /* null = ÖLÇÜLMEDİ. Eskiden şema varsayılanı devreye girip alanı
       `false` yapıyordu: gözlem "ayrıcalıklı değil" İDDİA ETMEMİŞKEN
       hesap ayrıcalıksız sayılıyor, ayrıcalıklı hesap sayımı olduğundan
       düşük görünüyordu. */
    expect(hesap.ayricalikli).toBeNull();
    expect(hesap.durum).toBe('aktif');     // durum otomatik değiştirilmedi
  });

  it('ölçülmüş ayrıcalık, kaynak bildirmeyi bırakınca SİLİNMEZ', async () => {
    const yolla1 = { records: [{
      source: 'test_ad', sourceRecordId: 'hesap-olc', collectedAt: zaman, confidence: 0.9,
      accountName: `${ONEK}-svc-olc`, accountType: 'servis', privileged: true,
      plantCode: `${ONEK}-A`,
    }] };
    expect((await erisimYaz(yolla('/api/v1/access-observations', jeton.a, yolla1, 'erisim-olc-1'))).status).toBe(200);
    expect((await db.kimlikHesabi.findUniqueOrThrow({
      where: { hesapAdi: `${ONEK}-svc-olc` } })).ayricalikli).toBe(true);

    // aynı hesap, bu kez ayrıcalık bilgisi YOK
    const yolla2 = { records: [{ ...yolla1.records[0], privileged: null }] };
    expect((await erisimYaz(yolla('/api/v1/access-observations', jeton.a, yolla2, 'erisim-olc-2'))).status).toBe(200);
    /* Ölçülmemiş bir gözlem, daha önce ölçülmüş bir gerçeği silmez —
       "bilmiyorum" ile "hayır" aynı şey değildir. */
    expect((await db.kimlikHesabi.findUniqueOrThrow({
      where: { hesapAdi: `${ONEK}-svc-olc` } })).ayricalikli).toBe(true);
  });

  it('erişim gözlemi kapsam dışı santrale yazılamaz', async () => {
    const y = await erisimYaz(yolla('/api/v1/access-observations', jeton.a, { records: [{
      source: 'test_ad', sourceRecordId: 'hesap-2', collectedAt: zaman, confidence: null,
      accountName: `${ONEK}-svc-b`, accountType: 'servis', plantCode: `${ONEK}-B`,
    }] }, 'erisim-2'));
    expect(y.status).toBe(403);
    expect(await db.kimlikHesabi.count({ where: { hesapAdi: `${ONEK}-svc-b` } })).toBe(0);
  });

  it('kanıt ucu dosya yolunu DÖNMEZ, santral kapsamıyla daraltılır', async () => {
    const kanit = await db.kanit.create({ data: {
      ad: `${ONEK} kanıt A`, tip: 'rapor', dosyaYolu: '/gizli/depo/a.pdf',
      tesisBaglantilari: { create: [{ tesisId: kimlikler.tesisA }] } } });
    await db.kanit.create({ data: {
      ad: `${ONEK} kanıt B`, tip: 'rapor', dosyaYolu: '/gizli/depo/b.pdf',
      tesisBaglantilari: { create: [{ tesisId: kimlikler.tesisB }] } } });

    const y = await kanitGetir(al('/api/v1/evidence?limit=200', jeton.a));
    expect(y.status).toBe(200);
    const metin = await y.text();
    expect(metin).toContain(kanit.id);
    expect(metin).not.toContain('/gizli/depo');
    expect(metin).not.toContain(`${ONEK} kanıt B`);
  });

  it('kurum geneli anahtar entegrasyon koşularını görür ve sayaçlar ayrı döner', async () => {
    const y = await kosuGetir(al('/api/v1/integration-runs?trigger=api&limit=5', jeton.genel));
    expect(y.status).toBe(200);
    const g = await y.json();
    expect(g.data.length).toBeGreaterThan(0);
    const kosu = g.data[0];
    expect(kosu.trigger).toBe('api');
    expect(kosu).toHaveProperty('received');
    expect(kosu).toHaveProperty('accepted');
    expect(kosu).toHaveProperty('rejected');
    expect(kosu).toHaveProperty('duplicate');
  });
});

/* ═══ yazma ucu → motor zinciri ═══════════════════════════════════════
   Regresyon: `lib/entegrasyon/zincir.ts` yazıldı ama ÜRETİMDE hiçbir yerden
   çağrılmıyordu — yalnız testlerden. Yani dış sistemden veri gelse bile
   veri kalitesi, yedek doğrulama, olay etkisi ve gap-to-action motorları
   o veriyi görmüyordu; zincir kâğıt üstünde kalıyordu. */
describe('Yazma uçları motor zincirini tetikler', () => {
  const zincirSayisi = () =>
    db.isKosusu.count({ where: { isAdi: 'entegrasyon_zinciri' } });

  it('zafiyet yazımı zinciri koşturur ve koşu satırı bırakır', async () => {
    const once = await zincirSayisi();
    const y = await zafiyetYaz(yolla('/api/v1/vulnerabilities', jeton.a, { records: [{
      source: 'test_scanner', sourceRecordId: 'z-zincir', collectedAt: zaman,
      confidence: 0.9, sourceRef: 'CVE-2026-9001', title: 'Zincir tetik testi',
      assetKey: `${ONEK}-A-1`,
    }] }, 'zafiyet-zincir'));
    expect(y.status).toBe(200);
    expect((await y.json()).data.created).toBe(1);
    expect(await zincirSayisi()).toBe(once + 1);
  });

  it('istek reddedildiyse zincir KOŞMAZ', async () => {
    /* Yazma gerçekleşmediyse motorları koşturmak boşuna tam tarama demek.
       Tanınmayan varlık anahtarı isteği 4xx ile düşürür; zincir bu yolda
       hiç çağrılmaz. */
    const once = await zincirSayisi();
    const y = await zafiyetYaz(yolla('/api/v1/vulnerabilities', jeton.a, { records: [{
      source: 'test_scanner', sourceRecordId: 'z-yok', collectedAt: zaman,
      confidence: null, sourceRef: 'CVE-2026-9002', title: 'Bilinmeyen varlık',
      assetKey: 'BOYLE-BIR-VARLIK-YOK',
    }] }, 'zafiyet-zincir-red'));
    expect(y.status).toBeGreaterThanOrEqual(400);
    expect(await zincirSayisi()).toBe(once);
  });

  it('zincir koşusu hangi motorların koştuğunu kaydeder', async () => {
    const kosu = await db.isKosusu.findFirstOrThrow({
      where: { isAdi: 'entegrasyon_zinciri' }, orderBy: { baslangic: 'desc' } });
    // islenen = zincirdeki adım sayısı, uretilen = gerçekten koşan motor
    expect(kosu.islenen).toBeGreaterThan(0);
    expect(kosu.uretilen).toBeGreaterThan(0);
    // zafiyet bayrağı deadline_motoru ve gap_to_action'ı tetikler
    const gap = await db.isKosusu.findFirst({
      where: { isAdi: 'gap_to_action' }, orderBy: { baslangic: 'desc' } });
    expect(gap).not.toBeNull();
  });
});
