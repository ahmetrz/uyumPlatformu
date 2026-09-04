import { z } from 'zod';
import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB importlardan ÖNCE ayarlanır (db modülü ilk erişimde okur).
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-gneg-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { apiTokenUret } = await import('@/lib/api/kimlik');
const { UC_KIMLIKLERI } = await import('@/lib/api/kapsam');
const { oranAyariAyarla, oranSayaclariniSifirla } = await import('@/lib/api/oranSinir');
const { izinVar, izinliTesisIdleri } = await import('@/lib/erisim');
const { senkronizasyonKos } = await import('@/lib/entegrasyon/cekirdek');
const { adaptorKaydet, adaptorSil } = await import('@/lib/entegrasyon/kayit');
const { temelDogrula } = await import('@/lib/entegrasyon/sozlesme');
const { kesifKapsamKosulu } = await import('@/app/(kabuk)/(operasyonel)/kesif/mantik');
const { uyumsuzOturumlar } = await import('@/lib/entegrasyon/tedarikciOturum');
const {
  kapsamKur, satirlariCoz, referanslariYukle, mevcutVarliklariYukle, aktarimiUygula,
} = await import('@/lib/entegrasyon/varlikAktarim');

const { GET: varlikGetir } = await import('@/app/api/v1/assets/route.api');
const { POST: varlikYaz } = await import('@/app/api/v1/assets/upsert/route.api');
const { GET: santralleriGetir } = await import('@/app/api/v1/plants/route.api');

import type { AktifKullanici } from '@/lib/auth';
import type { Adaptor, AdaptorBaglami, CekmeSonucu, Gozlem } from '@/lib/entegrasyon/sozlesme';

/* ═══════════════════════════════════════════════════════════════════════
   §15 · RBAC / KAPSAM İSTİSMARI — NEGATİF TESTLER

   Bu dosyanın tek işi ENGELLENDİĞİNİ KANITLAMAKTIR. Her testin iki ayağı
   vardır ve İKİSİ DE zorunludur:

     (a) istek reddedildi mi          — durum kodu / hata / boş sonuç
     (b) VERİ GERÇEKTEN DÖNMEDİ Mİ    — sayım, içerik araması, öncesi/sonrası

   Yalnız (a) yazmak bir güvenlik testi değildir: 403 dönen ama gövdesinde
   kaydı taşıyan bir uç da (a)'yı geçer. Bu yüzden her testte yasak verinin
   veritabanında VAR OLDUĞU da doğrulanır — "dönmedi" ile "zaten yoktu"
   birbirine karıştırılmasın.
   ═══════════════════════════════════════════════════════════════════════ */

const ONEK = 'GNEG';
const zaman = new Date('2026-08-01T09:00:00.000Z').toISOString();

const kimlik = {
  tesisA: '', tesisB: '', turId: '',
  kullaniciA: '', kullaniciB: '', kullaniciGlobal: '', kullaniciKarma: '',
};
const jeton = {} as Record<'a' | 'b' | 'karma' | 'iptalEdilecek' | 'suresiDolacak', string>;

const bearer = (token: string, ek: Record<string, string> = {}) => ({
  Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...ek,
});
const al = (yol: string, token: string) =>
  new Request(`http://test${yol}`, { headers: bearer(token) });
const yolla = (yol: string, token: string, govde: unknown, idem: string) =>
  new Request(`http://test${yol}`, {
    method: 'POST', headers: bearer(token, { 'Idempotency-Key': idem }),
    body: JSON.stringify(govde),
  });

const varlikKaydi = (ek: Record<string, unknown>) => ({
  source: 'gneg_itam', sourceRecordId: `kayit-${ek.assetTag}`,
  collectedAt: zaman, confidence: null, ...ek,
});

/* UY-52 · Anahtar KAPSAMLI üretilir.

   `saltOkunur` şema varsayılanı `true`dur ve bu bilinçlidir: alanı
   doldurmayı unutan her kod yolu, fazla yetkili değil ZARARSIZ bir
   anahtar üretsin. Bu fikstür ürünün kendi eylemi (`apiAnahtariUret`)
   gibi davranır ve kapsamı AÇIKÇA yazar; kapsam kapısının kendisi
   `tests/faz-f-api-kapsam.test.ts` içinde ayrıca sınanır. */
async function anahtarUret(kullaniciId: string, ek: Record<string, unknown> = {}) {
  const { token, onEk, tokenHash } = apiTokenUret();
  const satir = await db.apiAnahtari.create({
    data: {
      ad: `${ONEK} anahtar`, kullaniciId, onEk, tokenHash,
      kapsamJson: JSON.stringify(UC_KIMLIKLERI), saltOkunur: false,
      ...ek,
    },
  });
  return { token, id: satir.id };
}

/** AktifKullanici veri şeklini DB'deki gerçek yetkilerden kurar — testin
    izin modeli üretimdekiyle aynı satırlardan beslensin. */
async function aktifKullaniciYukle(id: string): Promise<AktifKullanici> {
  const k = await db.kullanici.findUniqueOrThrow({
    where: { id }, include: { yetkiler: true } });
  return {
    id: k.id, adSoyad: k.adSoyad, eposta: k.eposta, unvan: k.unvan,
    yetkiler: k.yetkiler.map((y) => ({
      rol: y.rol, surecId: y.surecId, tesisId: y.tesisId,
      tuzelKisiId: y.tuzelKisiId, regulasyonId: y.regulasyonId, modul: y.modul })),
  };
}

/* ═══ kurulum ════════════════════════════════════════════════════════ */

beforeAll(async () => {
  const tesisA = await db.tesis.create({ data: { kod: `${ONEK}-A`, ad: 'Negatif Santral A' } });
  const tesisB = await db.tesis.create({ data: { kod: `${ONEK}-B`, ad: 'Negatif Santral B' } });
  const tur = await db.varlikTuru.create({
    data: { kod: `${ONEK}-TUR`, ad: 'Negatif tür', sinif: 'OT' } });
  kimlik.tesisA = tesisA.id;
  kimlik.tesisB = tesisB.id;
  kimlik.turId = tur.id;

  await db.varlik.create({ data: {
    etiket: `${ONEK}-A-1`, ad: 'A varlığı', turId: tur.id, tesisId: tesisA.id } });
  await db.varlik.create({ data: {
    etiket: `${ONEK}-B-1`, ad: 'B varlığı', turId: tur.id, tesisId: tesisB.id,
    hostname: 'b-gizli-host' } });

  const kA = await db.kullanici.create({ data: {
    eposta: `${ONEK}-a@test.local`, adSoyad: 'A Santral Yöneticisi',
    yetkiler: { create: [{ rol: 'bt_yoneticisi', tesisId: tesisA.id }] } } });
  const kB = await db.kullanici.create({ data: {
    eposta: `${ONEK}-b@test.local`, adSoyad: 'B Santral Yöneticisi',
    yetkiler: { create: [{ rol: 'bt_yoneticisi', tesisId: tesisB.id }] } } });
  const kGlobal = await db.kullanici.create({ data: {
    eposta: `${ONEK}-global@test.local`, adSoyad: 'Kurum Yöneticisi',
    yetkiler: { create: [{ rol: 'yonetici' }] } } });
  /* Karma: AYNI kişide hem santrale kısıtlı bir rol hem KAPSAMSIZ bir rol.
     Testi yazılan davranış budur (3 numaralı test). */
  const kKarma = await db.kullanici.create({ data: {
    eposta: `${ONEK}-karma@test.local`, adSoyad: 'Karma Yetkili',
    yetkiler: { create: [
      { rol: 'bt_yoneticisi', tesisId: tesisA.id },
      { rol: 'yonetici' },
    ] } } });
  kimlik.kullaniciA = kA.id;
  kimlik.kullaniciB = kB.id;
  kimlik.kullaniciGlobal = kGlobal.id;
  kimlik.kullaniciKarma = kKarma.id;

  jeton.a = (await anahtarUret(kA.id)).token;
  jeton.b = (await anahtarUret(kB.id)).token;
  jeton.karma = (await anahtarUret(kKarma.id)).token;

  // Oran sınırı bu dosyanın konusu değil; testler ona takılmasın.
  oranAyariAyarla({ sinir: 10_000, pencereMs: 60_000 });
  await oranSayaclariniSifirla();
});

/* ═══ 1 · okuma izolasyonu ═══════════════════════════════════════════ */

describe('1 · Santral A yetkili kullanıcı santral B verisini OKUYAMAZ', () => {
  it('B varlığı veritabanında VARDIR — testin dayanağı', async () => {
    // Bu olmadan aşağıdaki "dönmedi" iddiaları boş kümede doğrulanmış olurdu.
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-B-1` } })).toBe(1);
  });

  it('izin katmanı: A kullanıcısının envanter kapsamı yalnız A santralidir', async () => {
    const k = await aktifKullaniciYukle(kimlik.kullaniciA);
    expect(izinliTesisIdleri(k, 'envanter')).toEqual([kimlik.tesisA]);
    expect(izinVar(k, 'envanter', 'yazma', { tesisId: kimlik.tesisB })).toBe(false);
  });

  it('liste ucu B kaydını NE DÖNER NE İMA EDER', async () => {
    const y = await varlikGetir(al('/api/v1/assets?limit=200', jeton.a));
    expect(y.status).toBe(200);
    const metin = await y.text();
    const g = JSON.parse(metin) as { data: { assetTag: string; plantId: string }[] };
    // (a) reddedildi/daraltıldı
    expect(g.data.every((v) => v.plantId === kimlik.tesisA)).toBe(true);
    // (b) veri GERÇEKTEN dönmedi — etiket de, gizli hostname de gövdede yok
    expect(metin).not.toContain(`${ONEK}-B-1`);
    expect(metin).not.toContain('b-gizli-host');
    expect(metin).not.toContain(kimlik.tesisB);
  });

  it('B santralini açıkça isteyen sorgu 403 döner ve gövde kayıt taşımaz', async () => {
    const y = await varlikGetir(al(`/api/v1/assets?plantId=${kimlik.tesisB}`, jeton.a));
    expect(y.status).toBe(403);
    const metin = await y.text();
    expect(JSON.parse(metin).error.code).toBe('kapsam_disi');
    expect(JSON.parse(metin).data).toBeUndefined();
    expect(metin).not.toContain(`${ONEK}-B-1`);
    expect(metin).not.toContain('b-gizli-host');
  });

  it('santral listesi de daraltılır — B santrali A anahtarına görünmez', async () => {
    const y = await santralleriGetir(al('/api/v1/plants?limit=200', jeton.a));
    expect(y.status).toBe(200);
    const metin = await y.text();
    expect(metin).toContain(kimlik.tesisA);
    expect(metin).not.toContain(kimlik.tesisB);
    expect(metin).not.toContain(`${ONEK}-B`);
  });
});

/* ═══ 2 · yazma izolasyonu ═══════════════════════════════════════════ */

describe('2 · Santral A kapsamlı API anahtarı santral B\'ye YAZAMAZ', () => {
  it('yeni kayıt: 403 ve satır AÇILMAZ', async () => {
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.a, { records: [
      varlikKaydi({ assetTag: `${ONEK}-B-YENI`, plantCode: `${ONEK}-B`, typeCode: `${ONEK}-TUR` }),
    ] }, 'gneg-yaz-1'));
    expect(y.status).toBe(403);
    expect((await y.json()).error.code).toBe('kapsam_disi');
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-B-YENI` } })).toBe(0);
  });

  it('mevcut B kaydı: 403 ve hiçbir alan DEĞİŞMEZ', async () => {
    const once = await db.varlik.findUniqueOrThrow({ where: { etiket: `${ONEK}-B-1` } });
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.a, { records: [
      varlikKaydi({ assetTag: `${ONEK}-B-1`, hostname: 'ele-gecirildi', model: 'ele-gecirildi' }),
    ] }, 'gneg-yaz-2'));
    expect(y.status).toBe(403);
    const sonra = await db.varlik.findUniqueOrThrow({ where: { etiket: `${ONEK}-B-1` } });
    expect(sonra.hostname).toBe(once.hostname);
    expect(sonra.model).toBe(once.model);
    expect(sonra.guncellendi.getTime()).toBe(once.guncellendi.getTime());
  });

  it('B anahtarı A\'ya yazamaz — kapsam SİMETRİKTİR (tek yönlü kural değil)', async () => {
    const once = await db.varlik.findUniqueOrThrow({ where: { etiket: `${ONEK}-A-1` } });
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.b, { records: [
      varlikKaydi({ assetTag: `${ONEK}-A-1`, hostname: 'b-den-ele-gecirildi' }),
    ] }, 'gneg-yaz-3'));
    expect(y.status).toBe(403);
    const sonra = await db.varlik.findUniqueOrThrow({ where: { etiket: `${ONEK}-A-1` } });
    expect(sonra.hostname).toBe(once.hostname);
  });

  it('karma toplu istekte tek kayıt kapsam dışıysa TAMAMI reddedilir', async () => {
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.a, { records: [
      varlikKaydi({ assetTag: `${ONEK}-A-IYI`, plantCode: `${ONEK}-A`, typeCode: `${ONEK}-TUR` }),
      varlikKaydi({ assetTag: `${ONEK}-B-KOTU`, plantCode: `${ONEK}-B`, typeCode: `${ONEK}-TUR` }),
    ] }, 'gneg-yaz-4'));
    expect(y.status).toBe(403);
    // Yarım import yok: kapsam İÇİ satır bile yazılmaz.
    expect(await db.varlik.count({
      where: { etiket: { in: [`${ONEK}-A-IYI`, `${ONEK}-B-KOTU`] } } })).toBe(0);
  });
});

/* ═══ 3 · global yetki önceliği (KAYITLI İŞLETİM RİSKİ) ══════════════ */

describe('3 · Global yetki tesis kısıtını ANLAMSIZLAŞTIRIR — davranış sabitlenir', () => {
  /* Bu bir KUSUR TESTİ DEĞİL, bir DAVRANIŞ TESTİDİR.

     `izinVar` yetkileri `some()` ile tarar: kullanıcının yetkilerinden
     HERHANGİ BİRİ isteği karşılıyorsa izin verilir. Aynı kişiye hem
     `bt_yoneticisi @ santral A` hem kapsamsız `yonetici` verildiğinde
     ikincisi birincisini yutar — santral kısıtı hiçbir şey ifade etmez.

     Bu tasarım bilinçlidir (roller BİRLEŞİR, kesişmez) ve tek başına
     yanlış değildir; ama İŞLETİM RİSKİDİR: "bu kişinin yetkisi A
     santraliyle sınırlı" diye bakan bir yönetici, listedeki ikinci satırı
     görmezse yanılır. Test bu gerçeği DONDURUR: davranış sessizce
     değişirse (ya da biri kesişim sanıp öyle davranırsa) burası kırılır.

     İstenen davranış KESİŞİM olsaydı yapılacak değişiklik `lib/erisim.ts`
     içindedir ve bu dosyanın dışındadır. */

  it('karma yetkili kullanıcının kapsamı NULL olur (= tüm santraller)', async () => {
    const k = await aktifKullaniciYukle(kimlik.kullaniciKarma);
    expect(k.yetkiler).toHaveLength(2);
    expect(k.yetkiler.some((y) => y.tesisId === kimlik.tesisA)).toBe(true);
    // Tesise kısıtlı satır DURUYOR ama kapsamı daraltmıyor:
    expect(izinliTesisIdleri(k, 'envanter')).toBeNull();
  });

  it('karma yetkili B santraline de YAZABİLİR — tesis kısıtı bağlamaz', async () => {
    const k = await aktifKullaniciYukle(kimlik.kullaniciKarma);
    expect(izinVar(k, 'envanter', 'yazma', { tesisId: kimlik.tesisB })).toBe(true);
    // Kapsamsız (global) yazma da açıktır — tesise kısıtlı rol tek başına bunu veremezdi.
    expect(izinVar(k, 'envanter', 'yazma')).toBe(true);

    const kA = await aktifKullaniciYukle(kimlik.kullaniciA);
    expect(izinVar(kA, 'envanter', 'yazma', { tesisId: kimlik.tesisB })).toBe(false);
    expect(izinVar(kA, 'envanter', 'yazma')).toBe(false);
  });

  it('uçtan uca: karma anahtar B santralinin verisini GÖRÜR ve YAZAR', async () => {
    const y = await varlikGetir(al(`/api/v1/assets?plantId=${kimlik.tesisB}`, jeton.karma));
    expect(y.status).toBe(200);
    const metin = await y.text();
    expect(metin).toContain(`${ONEK}-B-1`);

    const yaz = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.karma, { records: [
      varlikKaydi({ assetTag: `${ONEK}-B-KARMA`, plantCode: `${ONEK}-B`, typeCode: `${ONEK}-TUR` }),
    ] }, 'gneg-karma-1'));
    expect(yaz.status).toBe(200);
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-B-KARMA` } })).toBe(1);
  });
});

/* ═══ 4-5 · anahtar yaşam döngüsü ═══════════════════════════════════ */

describe('4 · İptal edilmiş anahtar ANINDA başarısız olur', () => {
  it('iptalden önce 200, iptalden sonra AYNI token 401 — önbellek yok', async () => {
    const { token, id } = await anahtarUret(kimlik.kullaniciGlobal);
    jeton.iptalEdilecek = token;

    const once = await varlikGetir(al('/api/v1/assets?limit=5', token));
    expect(once.status).toBe(200);
    expect((await once.json()).data.length).toBeGreaterThan(0);

    await db.apiAnahtari.update({ where: { id }, data: { iptalZamani: new Date() } });

    const sonra = await varlikGetir(al('/api/v1/assets?limit=5', token));
    expect(sonra.status).toBe(401);
    const metin = await sonra.text();
    expect(JSON.parse(metin).error.code).toBe('yetkisiz');
    // (b) VERİ DÖNMEDİ: gövdede tek bir varlık etiketi bile yok
    expect(JSON.parse(metin).data).toBeUndefined();
    expect(metin).not.toContain(`${ONEK}-A-1`);
    expect(metin).not.toContain(`${ONEK}-B-1`);
  });

  it('iptal edilmiş anahtarla YAZMA da geçmez, satır açılmaz', async () => {
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.iptalEdilecek, { records: [
      varlikKaydi({ assetTag: `${ONEK}-IPTAL-YAZ`, plantCode: `${ONEK}-A`, typeCode: `${ONEK}-TUR` }),
    ] }, 'gneg-iptal-1'));
    expect(y.status).toBe(401);
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-IPTAL-YAZ` } })).toBe(0);
  });

  it('iptal edilmiş anahtar sonKullanim damgasını TAZELEMEZ', async () => {
    const anahtar = await db.apiAnahtari.findFirstOrThrow({
      where: { kullaniciId: kimlik.kullaniciGlobal, iptalZamani: { not: null } } });
    const once = anahtar.sonKullanim;
    await varlikGetir(al('/api/v1/assets', jeton.iptalEdilecek));
    const sonra = await db.apiAnahtari.findUniqueOrThrow({ where: { id: anahtar.id } });
    // Reddedilen istek anahtara "kullanıldı" demez — atıl anahtar raporu yanılmasın.
    expect(sonra.sonKullanim?.getTime() ?? null).toBe(once?.getTime() ?? null);
  });
});

describe('5 · Süresi dolmuş anahtar başarısız olur', () => {
  it('süre dolunca AYNI token 401\'e döner ve veri taşımaz', async () => {
    const { token, id } = await anahtarUret(kimlik.kullaniciGlobal, {
      bitis: new Date(Date.now() + 3_600_000) });
    jeton.suresiDolacak = token;

    expect((await varlikGetir(al('/api/v1/assets?limit=5', token))).status).toBe(200);

    // Saati beklemek yerine bitişi geçmişe çekiyoruz: kontrol edilen şey
    // `bitis <= şimdi` karşılaştırmasının GERÇEKTEN uygulanmasıdır.
    await db.apiAnahtari.update({ where: { id }, data: { bitis: new Date(Date.now() - 1_000) } });

    const sonra = await varlikGetir(al('/api/v1/assets?limit=5', token));
    expect(sonra.status).toBe(401);
    const metin = await sonra.text();
    expect(JSON.parse(metin).error.message).toMatch(/süresi dolmuş/i);
    expect(metin).not.toContain(`${ONEK}-A-1`);
  });

  it('süresi dolmuş anahtarla yazma da geçmez', async () => {
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.suresiDolacak, { records: [
      varlikKaydi({ assetTag: `${ONEK}-SURE-YAZ`, plantCode: `${ONEK}-A`, typeCode: `${ONEK}-TUR` }),
    ] }, 'gneg-sure-1'));
    expect(y.status).toBe(401);
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-SURE-YAZ` } })).toBe(0);
  });

  it('tam bitiş anında anahtar KAPALIDIR (sınır dâhil değil)', async () => {
    const { token, id } = await anahtarUret(kimlik.kullaniciGlobal);
    await db.apiAnahtari.update({ where: { id }, data: { bitis: new Date() } });
    const y = await varlikGetir(al('/api/v1/assets', token));
    expect(y.status).toBe(401);
  });
});

/* ═══ 6 · connector kapsamı ═════════════════════════════════════════ */

describe('6 · Connector kapsamı yapılandırılmış santralleri AŞAMAZ', () => {
  const TIP = 'gneg_kapsam';
  const KAYNAK = 'GNEG-KAPSAM-KAYNAK';

  const gozlem = (id: string, ek: Record<string, unknown> = {}): Gozlem => ({
    tip: 'varlik',
    koken: { kaynakSistem: KAYNAK, kaynakKayitId: id, toplanma: new Date(), guven: null },
    hostname: `gneg-${id}`,
    ham: { id },
    ...ek,
  } as Gozlem);

  function adaptorYap(cek: (b: AdaptorBaglami) => Promise<CekmeSonucu>): void {
    adaptorKaydet({
      tip: TIP,
      baglanabilir: true,
      yapilandirmaSemasi: z.looseObject({}),
      gerekenSirlar: [],
      async testConnection() { return { ok: true, ayrinti: 'negatif test fikstürü' }; },
      async discover() { return { ozet: 'negatif test fikstürü', tahminiKayit: null }; },
      fetchChanges: cek,
      normalize: () => [],
      validate: (g) => temelDogrula(g),
      async health() {
        return { durum: 'saglikli', ayrinti: 'negatif test fikstürü', tazelikDk: null }; },
    } as Adaptor, true);
  }

  it('kapsam DIŞI santral beyan eden kayıt REDDEDİLİR, tek satır bile yazılmaz', async () => {
    adaptorYap(async () => ({
      gozlemler: [
        gozlem('kapsam-ici', { tesisKodu: `${ONEK}-A` }),
        gozlem('kapsam-disi', { tesisKodu: `${ONEK}-B` }),   // saldırı: başka sahaya yaz
      ],
      yeniImlec: null, devamVar: false,
    }));
    const c = await db.connector.create({ data: {
      kod: `${ONEK}-CON-1`, ad: 'Kapsamlı OT keşif', tip: TIP,
      kaynakSistem: KAYNAK, etkin: true, durum: 'etkin',
      yapilandirmaJson: JSON.stringify({ kapsamTesisKodlari: [`${ONEK}-A`] }),
    } });

    const sonuc = await senkronizasyonKos(c.id);
    // (a) reddedildi — sayaçta görünür, sessizce yutulmadı
    expect(sonuc.durum).toBe('basarili');
    expect(sonuc.reddedilen).toBe(1);
    expect(sonuc.kabulEdilen).toBe(1);
    expect(sonuc.hata).toMatch(/kapsam dışı/i);

    // (b) VERİ YAZILMADI — kapsam dışı kayıt hiç var olmadı
    const disi = await db.kesifKaydi.findUnique({
      where: { kaynak_kaynakKayitId: { kaynak: KAYNAK, kaynakKayitId: 'kapsam-disi' } } });
    expect(disi).toBeNull();
    // ...ve kapsam içi kayıt yazıldı: red genel bir arıza değil, HEDEFLİ
    const ici = await db.kesifKaydi.findUniqueOrThrow({
      where: { kaynak_kaynakKayitId: { kaynak: KAYNAK, kaynakKayitId: 'kapsam-ici' } } });
    expect(ici.tesisId).toBe(kimlik.tesisA);
    adaptorSil(TIP);
  });

  it('kapsam varken SANTRAL BEYAN ETMEYEN kayıt kapsamın tekine düşer, kaçamaz', async () => {
    /* Kapsam sınırından kaçmanın en kolay yolu santral hiç bildirmemektir:
       santralsiz keşif kaydı kapsamı daraltılmış HERKESE görünür. Tek
       santralli kapsamda kayıt o santrale bağlanır — kapsamsız kalmaz. */
    adaptorYap(async () => ({
      gozlemler: [gozlem('beyansiz')], yeniImlec: null, devamVar: false }));
    const c = await db.connector.create({ data: {
      kod: `${ONEK}-CON-2`, ad: 'Kapsamlı tek santral', tip: TIP,
      kaynakSistem: KAYNAK, etkin: true, durum: 'etkin',
      yapilandirmaJson: JSON.stringify({ kapsamTesisKodlari: [`${ONEK}-A`] }),
    } });
    expect((await senkronizasyonKos(c.id)).durum).toBe('basarili');
    const k = await db.kesifKaydi.findUniqueOrThrow({
      where: { kaynak_kaynakKayitId: { kaynak: KAYNAK, kaynakKayitId: 'beyansiz' } } });
    expect(k.tesisId).toBe(kimlik.tesisA);
    expect(k.tesisId).not.toBeNull();
    adaptorSil(TIP);
  });

  it('çok santralli kapsamda beyansız kayıt REDDEDİLİR (kapsamsız yazılamaz)', async () => {
    adaptorYap(async () => ({
      gozlemler: [gozlem('cok-beyansiz')], yeniImlec: null, devamVar: false }));
    const c = await db.connector.create({ data: {
      kod: `${ONEK}-CON-3`, ad: 'Kapsamlı iki santral', tip: TIP,
      kaynakSistem: KAYNAK, etkin: true, durum: 'etkin',
      yapilandirmaJson: JSON.stringify({ kapsamTesisKodlari: [`${ONEK}-A`, `${ONEK}-B`] }),
    } });
    const sonuc = await senkronizasyonKos(c.id);
    expect(sonuc.reddedilen).toBe(1);
    expect(sonuc.kabulEdilen).toBe(0);
    expect(await db.kesifKaydi.count({
      where: { kaynak: KAYNAK, kaynakKayitId: 'cok-beyansiz' } })).toBe(0);
    adaptorSil(TIP);
  });

  it('kapsam ile varsayılan santral ÇELİŞİRSE koşu hiç başlamaz', async () => {
    adaptorYap(async () => ({
      gozlemler: [gozlem('celiski')], yeniImlec: null, devamVar: false }));
    const c = await db.connector.create({ data: {
      kod: `${ONEK}-CON-4`, ad: 'Çelişkili yapılandırma', tip: TIP,
      kaynakSistem: KAYNAK, etkin: true, durum: 'etkin',
      yapilandirmaJson: JSON.stringify({
        tesisKodu: `${ONEK}-B`, kapsamTesisKodlari: [`${ONEK}-A`] }),
    } });
    const sonuc = await senkronizasyonKos(c.id);
    expect(sonuc.durum).toBe('basarisiz');
    expect(sonuc.hata).toMatch(/kapsam/i);
    expect(await db.kesifKaydi.count({
      where: { kaynak: KAYNAK, kaynakKayitId: 'celiski' } })).toBe(0);
    adaptorSil(TIP);
  });

  it('kapsam YOKSA davranış değişmez — kapsam opsiyoneldir, sessizce kapatmaz', async () => {
    adaptorYap(async () => ({
      gozlemler: [gozlem('kapsamsiz-connector', { tesisKodu: `${ONEK}-B` })],
      yeniImlec: null, devamVar: false }));
    const c = await db.connector.create({ data: {
      kod: `${ONEK}-CON-5`, ad: 'Kapsamsız connector', tip: TIP,
      kaynakSistem: KAYNAK, etkin: true, durum: 'etkin',
    } });
    expect((await senkronizasyonKos(c.id)).kabulEdilen).toBe(1);
    const k = await db.kesifKaydi.findUniqueOrThrow({
      where: { kaynak_kaynakKayitId: {
        kaynak: KAYNAK, kaynakKayitId: 'kapsamsiz-connector' } } });
    expect(k.tesisId).toBe(kimlik.tesisB);
    adaptorSil(TIP);
  });
});

/* ═══ 7 · santrali bilinmeyen keşif kaydı ═══════════════════════════ */

describe('7 · Santrali bilinmeyen keşif kaydı çapraz kapsam veri SIZDIRMAZ', () => {
  beforeAll(async () => {
    await db.kesifKaydi.create({ data: {
      kaynak: `${ONEK}-KESIF`, kaynakKayitId: 'bilinmeyen', tesisId: null,
      hamJson: '{"ip":"10.0.0.9"}', normalJson: '{}', durum: 'inceleme_bekliyor' } });
    await db.kesifKaydi.create({ data: {
      kaynak: `${ONEK}-KESIF`, kaynakKayitId: 'b-santrali', tesisId: kimlik.tesisB,
      hamJson: '{"gizli":"b-sadece"}', normalJson: '{}', durum: 'inceleme_bekliyor' } });
    await db.kesifKaydi.create({ data: {
      kaynak: `${ONEK}-KESIF`, kaynakKayitId: 'a-santrali', tesisId: kimlik.tesisA,
      hamJson: '{}', normalJson: '{}', durum: 'inceleme_bekliyor' } });
  });

  it('A kullanıcısı B santraline ait keşif kaydını GÖREMEZ', async () => {
    const k = await aktifKullaniciYukle(kimlik.kullaniciA);
    const kayitlar = await db.kesifKaydi.findMany({
      where: { kaynak: `${ONEK}-KESIF`, ...kesifKapsamKosulu(izinliTesisIdleri(k, 'envanter')) },
    });
    const idler = kayitlar.map((x) => x.kaynakKayitId);
    expect(idler).not.toContain('b-santrali');
    // (b) gizli içerik hiçbir satırda yok — filtre "gizler" değil, GETİRMEZ
    expect(JSON.stringify(kayitlar)).not.toContain('b-sadece');
    // ...ve B kaydı veritabanında GERÇEKTEN duruyor
    expect(await db.kesifKaydi.count({
      where: { kaynak: `${ONEK}-KESIF`, kaynakKayitId: 'b-santrali' } })).toBe(1);
  });

  it('santrali BİLİNMEYEN kayıt herkese görünür — ve bu bilinçli bir karardır', async () => {
    const k = await aktifKullaniciYukle(kimlik.kullaniciA);
    const idler = (await db.kesifKaydi.findMany({
      where: { kaynak: `${ONEK}-KESIF`, ...kesifKapsamKosulu(izinliTesisIdleri(k, 'envanter')) },
    })).map((x) => x.kaynakKayitId);
    /* "Bilinmiyor" = "henüz atanmadı", "yasak" değil: gizlenirse o kaydı
       kimse incelemez ve keşif kuyruğunun varlık sebebi ortadan kalkar.
       Sızıntı riski ÜRETİM tarafında kapatılır — kapsamı yapılandırılmış
       bir connector santralsiz kayıt YAZAMAZ (6 numaralı test). */
    expect(idler).toContain('bilinmeyen');
    expect(idler).toContain('a-santrali');
  });

  it('bilinmeyen kayıt B santralinin verisini TAŞIMAZ', async () => {
    const kayit = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynak: `${ONEK}-KESIF`, kaynakKayitId: 'bilinmeyen' } });
    expect(kayit.tesisId).toBeNull();
    expect(kayit.eslesenVarlikId).toBeNull();
    expect(`${kayit.hamJson}${kayit.normalJson}`).not.toContain('b-sadece');
    expect(`${kayit.hamJson}${kayit.normalJson}`).not.toContain(kimlik.tesisB);
  });

  it('kapsamsız kullanıcı üçünü de görür — filtre GERÇEKTEN daraltıyor', async () => {
    const k = await aktifKullaniciYukle(kimlik.kullaniciGlobal);
    const idler = (await db.kesifKaydi.findMany({
      where: { kaynak: `${ONEK}-KESIF`, ...kesifKapsamKosulu(izinliTesisIdleri(k, 'envanter')) },
    })).map((x) => x.kaynakKayitId);
    expect(idler.sort()).toEqual(['a-santrali', 'b-santrali', 'bilinmeyen']);
  });
});

/* ═══ 8 · tedarikçi oturumu ═════════════════════════════════════════ */

describe('8 · Tedarikçi oturumu tesis kapsamını AŞAMAZ', () => {
  beforeAll(async () => {
    const ted = await db.tedarikci.create({ data: { ad: `${ONEK} Tedarikçi` } });
    await db.tedarikciErisimOturumu.create({ data: {
      tedarikciId: ted.id, tesisId: kimlik.tesisA, baslangic: new Date('2026-07-01T08:00:00Z'),
      kaynakSistem: `${ONEK}-PAM`, kaynakKayitId: 'oturum-a', mfaVar: false } });
    await db.tedarikciErisimOturumu.create({ data: {
      tedarikciId: ted.id, tesisId: kimlik.tesisB, baslangic: new Date('2026-07-02T08:00:00Z'),
      kaynakSistem: `${ONEK}-PAM`, kaynakKayitId: 'oturum-b', mfaVar: false,
      talepReferansi: 'B-GIZLI-TALEP' } });
    await db.tedarikciErisimOturumu.create({ data: {
      tedarikciId: ted.id, tesisId: null, baslangic: new Date('2026-07-03T08:00:00Z'),
      kaynakSistem: `${ONEK}-PAM`, kaynakKayitId: 'oturum-bilinmeyen', mfaVar: false } });
  });

  it('A kapsamlı okuma B santralinin oturumunu NE SAYAR NE GÖSTERİR', async () => {
    const rapor = await uyumsuzOturumlar({
      kaynakSistem: `${ONEK}-PAM`, tesisIdler: [kimlik.tesisA] });
    const idler = rapor.uyumsuz.map((d) => d.oturum.id);
    expect(rapor.toplam).toBe(1);
    expect(idler).toHaveLength(1);
    // (b) B'ye ait hiçbir alan gövdede yok
    const metin = JSON.stringify(rapor);
    expect(metin).not.toContain('B-GIZLI-TALEP');
    expect(metin).not.toContain(kimlik.tesisB);
    // ...ve B oturumu veritabanında GERÇEKTEN var
    expect(await db.tedarikciErisimOturumu.count({
      where: { kaynakSistem: `${ONEK}-PAM`, tesisId: kimlik.tesisB } })).toBe(1);
  });

  it('santrali BİLİNMEYEN oturum kapsamı daraltılmış kullanıcıya görünmez', async () => {
    /* `lib/api/yetki.ts → tesisKapsamda` ile aynı kural: kapsamsız kayıt
       ancak kapsamsız kullanıcıya açıktır. Keşif kuyruğundan farkı bilinçli:
       orada kaydı birinin incelemesi gerekir, burada erişim kaydının
       hangi sahaya ait olduğu bilinmeden gösterilmesi kapsamı deler. */
    const dar = await uyumsuzOturumlar({
      kaynakSistem: `${ONEK}-PAM`, tesisIdler: [kimlik.tesisA, kimlik.tesisB] });
    expect(dar.uyumsuz.map((d) => d.oturum.tesisId)).not.toContain(null);
    expect(dar.toplam).toBe(2);

    const genis = await uyumsuzOturumlar({ kaynakSistem: `${ONEK}-PAM` });
    expect(genis.toplam).toBe(3);   // kapsamsız okuma üçünü de görür
  });

  it('kapsam DIŞI bir tesisId filtresi kapsamı GENİŞLETMEZ (boş küme döner)', async () => {
    // Klasik tuzak: filtre ile sınır aynı alana yazılırsa biri diğerini ezer.
    const rapor = await uyumsuzOturumlar({
      kaynakSistem: `${ONEK}-PAM`, tesisId: kimlik.tesisB, tesisIdler: [kimlik.tesisA] });
    expect(rapor.toplam).toBe(0);
    expect(rapor.uyumsuz).toHaveLength(0);
    expect(JSON.stringify(rapor)).not.toContain('B-GIZLI-TALEP');
  });

  it('boş kapsam ([]) hiçbir oturum döndürmez — "sınırsız" ile karışmaz', async () => {
    const rapor = await uyumsuzOturumlar({ kaynakSistem: `${ONEK}-PAM`, tesisIdler: [] });
    expect(rapor.toplam).toBe(0);
    expect(rapor.uyumsuz).toHaveLength(0);
  });
});

/* ═══ 9 · içe aktarım eşlemesi ══════════════════════════════════════ */

describe('9 · İçe aktarım eşlemesi yetkisiz santralı HEDEFLEYEMEZ', () => {
  const esleme = { tag: 'etiket', tur: 'turKodu', tesis: 'tesisKodu' } as const;

  it('eşleme B santralini gösterse bile satır hata listesine düşer', async () => {
    const k = await aktifKullaniciYukle(kimlik.kullaniciA);
    const [referanslar, mevcutlar] = await Promise.all([
      referanslariYukle(), mevcutVarliklariYukle(),
    ]);
    const cozum = satirlariCoz({
      satirlar: [
        { tag: `${ONEK}-IMP-A`, tur: `${ONEK}-TUR`, tesis: `${ONEK}-A` },
        { tag: `${ONEK}-IMP-B`, tur: `${ONEK}-TUR`, tesis: `${ONEK}-B` },
      ],
      esleme, referanslar, mevcutlar, kapsam: kapsamKur(k),
    });
    expect(cozum.satirlar.map((s) => s.etiket)).toEqual([`${ONEK}-IMP-A`]);
    expect(cozum.hatalar).toHaveLength(1);
    expect(cozum.hatalar[0].etiket).toBe(`${ONEK}-IMP-B`);
    expect(cozum.hatalar[0].sebep).toMatch(/kapsam|yetki/i);
  });

  it('eşleme MEVCUT B varlığını hedeflese de güncelleme üretmez', async () => {
    const k = await aktifKullaniciYukle(kimlik.kullaniciA);
    const [referanslar, mevcutlar] = await Promise.all([
      referanslariYukle(), mevcutVarliklariYukle(),
    ]);
    const cozum = satirlariCoz({
      // tesis kolonu YOK: hedef, mevcut varlığın kendi santralinden gelir
      satirlar: [{ tag: `${ONEK}-B-1`, tur: `${ONEK}-TUR` }],
      esleme: { tag: 'etiket', tur: 'turKodu' }, referanslar, mevcutlar, kapsam: kapsamKur(k),
    });
    expect(cozum.satirlar).toHaveLength(0);
    expect(cozum.hatalar).toHaveLength(1);
  });

  it('uçtan uca: onaylayanın kapsamı dar olduğunda B satırı YAZILMAZ', async () => {
    /* Eşleme yükleme anında kaydedilir, kapsam ONAY anında yeniden
       uygulanır. Geniş kapsamlı biri eşlemeyi kurup dar kapsamlı biri
       onaylarsa, kapsam onaylayanın kapsamıdır. */
    const aktarim = await db.varlikAktarimi.create({ data: {
      dosyaAdi: `${ONEK}-kapsam.csv`, kaynakTipi: 'csv',
      yukleyenId: kimlik.kullaniciGlobal, durum: 'dogrulama_bekliyor',
      eslemeJson: JSON.stringify(esleme),
      raporJson: JSON.stringify({ ham: [
        { tag: `${ONEK}-IMP-A2`, tur: `${ONEK}-TUR`, tesis: `${ONEK}-A` },
        { tag: `${ONEK}-IMP-B2`, tur: `${ONEK}-TUR`, tesis: `${ONEK}-B` },
      ] }),
    } });

    const onaylayan = await aktifKullaniciYukle(kimlik.kullaniciA);
    const sonuc = await aktarimiUygula({ aktarimId: aktarim.id, onaylayan });

    expect(sonuc.eklenen).toBe(1);
    // (b) B satırı GERÇEKTEN yazılmadı, A satırı yazıldı
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-IMP-B2` } })).toBe(0);
    const a2 = await db.varlik.findUniqueOrThrow({ where: { etiket: `${ONEK}-IMP-A2` } });
    expect(a2.tesisId).toBe(kimlik.tesisA);

    const kapali = await db.varlikAktarimi.findUniqueOrThrow({ where: { id: aktarim.id } });
    expect(kapali.durum).toBe('onaylandi');
    expect(kapali.hatali).toBe(1);
    // Reddedilen satır SESSİZ GEÇMEZ: raporda sebebiyle durur.
    expect(kapali.raporJson).toContain(`${ONEK}-IMP-B2`);
  });
});

/* ═══ ek · istek gövde boyutu sınırı (§14) ══════════════════════════ */

describe('İstek gövde boyutu sınırı GERÇEKTEN uygulanır', () => {
  const SINIR = 4 * 1024 * 1024;

  it('şişirilmiş content-length başlığı gövde okunmadan reddedilir', async () => {
    /* Ucuz kapı: başlık gövdeden ÖNCE okunur, böylece 4 GB'lık bir yük
       belleğe hiç alınmaz. Başlık yalancı olabilir — bu yüzden ikinci
       kapı (gerçek uzunluk) da var, aşağıdaki test onu ölçer. */
    const istek = new Request('http://test/api/v1/assets/upsert', {
      method: 'POST',
      headers: bearer(jeton.a, {
        'Idempotency-Key': 'gneg-boyut-1', 'Content-Length': String(SINIR + 1) }),
      body: JSON.stringify({ records: [
        varlikKaydi({ assetTag: `${ONEK}-BOYUT-1`, plantCode: `${ONEK}-A`, typeCode: `${ONEK}-TUR` }),
      ] }),
    });
    const y = await varlikYaz(istek);
    expect(y.status).toBe(400);
    expect((await y.json()).error.message).toMatch(/çok büyük/i);
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-BOYUT-1` } })).toBe(0);
  });

  it('başlık yalan söylese bile GERÇEK uzunluk reddedilir', async () => {
    const sisirme = 'x'.repeat(SINIR + 1024);
    const istek = new Request('http://test/api/v1/assets/upsert', {
      method: 'POST',
      headers: bearer(jeton.a, {
        'Idempotency-Key': 'gneg-boyut-2', 'Content-Length': '10' }),
      body: JSON.stringify({ records: [varlikKaydi({
        assetTag: `${ONEK}-BOYUT-2`, plantCode: `${ONEK}-A`,
        typeCode: `${ONEK}-TUR`, hostname: sisirme })] }),
    });
    const y = await varlikYaz(istek);
    expect(y.status).toBe(400);
    expect((await y.json()).error.message).toMatch(/çok büyük/i);
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-BOYUT-2` } })).toBe(0);
  });

  it('sınırın altındaki gövde normal işlenir — sınır her şeyi kesmiyor', async () => {
    const y = await varlikYaz(yolla('/api/v1/assets/upsert', jeton.a, { records: [
      varlikKaydi({ assetTag: `${ONEK}-BOYUT-OK`, plantCode: `${ONEK}-A`,
        typeCode: `${ONEK}-TUR`, hostname: 'x'.repeat(200) }),
    ] }, 'gneg-boyut-3'));
    expect(y.status).toBe(200);
    expect(await db.varlik.count({ where: { etiket: `${ONEK}-BOYUT-OK` } })).toBe(1);
  });

  it('reddedilen büyük istek de denetim izi bırakır (sessiz düşmez)', async () => {
    const kayit = await db.apiIstegi.findFirst({
      where: { idempotencyAnahtari: 'gneg-boyut-2' }, orderBy: { zaman: 'desc' } });
    expect(kayit).not.toBeNull();
    expect(kayit!.durumKodu).toBe(400);
    expect(kayit!.hataKodu).toBe('gecersiz_istek');
  });
});
