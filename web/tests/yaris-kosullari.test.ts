import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   YARIŞ KOŞULLARI — "kontrol-sonra-yaz" (docs/POSTGRES_READINESS.md §c)

   Buradaki her test AYNI ANDA iki çağrı yapar (`Promise.all`) ve TAM
   BİRİNİN kazandığını kanıtlar. Ölçtüğü şey mesaj değil SONUÇTUR:
   veritabanında kaç satır var, denetim izine kaç satır düştü.

   Neden tek süreçte yeniden üretilebiliyor: `await` her noktada olay
   döngüsüne dönüş verir, bu yüzden iki çağrı YAZMADAN ÖNCE ikisi de aynı
   durumu OKUR. `better-sqlite3` sürücüsünün senkron olması bunu engellemez;
   engellediği tek şey iki YAZMANIN gerçekten aynı anda olmasıdır.

   Kapsam DIŞI (bilerek): SQLite tek yazıcıdır ve Prisma'nın interaktif
   transaction'ları bu süreçte TAM SERİLEŞİR — birinin gövdesi bitmeden
   diğeri başlamaz. Bu yüzden "iki transaction gövdesinin iç içe geçmesi"
   ile üretilen yarışlar burada YENİDEN ÜRETİLEMEZ (bkz. dosya sonundaki
   `it.skip` notu). Üretilemeyeni yeşil bir testle geçmiş göstermek yerine
   açıkça yazıyoruz.

   BURADA BULUNAN KUSUR (ölçüldü): `lib/db.ts` TEK better-sqlite3 bağlantısı
   kullanır. Bir çağrı transaction içindeyken BAŞKA bir çağrının transaction
   DIŞINDA yaptığı yazma aynı bağlantıya düşer; o transaction geri alınırsa
   dışarıdaki yazma da SESSİZCE geri alınır. "Durumu transaction'da değiştir,
   izi dışarıda yaz" kalıbı bu yüzden eşzamanlı başarısız bir çağrı varken
   İZİ KAYBETTİRİYORDU — aşağıdaki ilk iki test bu hâlde KIRMIZIYDI. Çözüm:
   iz, durum değişimiyle AYNI transaction'da yazılıyor (bkz. eylemler2/ortak.ts).

   TEST_DB, db'ye dokunan HER importtan ÖNCE ayarlanır (proje kalıbı).
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-yaris-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

/* Yetki kapısı: eylem katmanı `yetkiZorunlu`/`izinVar` üzerinden geçer.
   Testte HTTP oturumu yok; kapı seed'deki GERÇEK bir kullanıcıyla açılır
   (denetim izi yabancı anahtarı gerçek kullanıcı ister). Kapının
   ARKASINDAKİ eşzamanlılık kuralları sahte değildir, gerçek kodda koşar. */
const sahteKullanici = {
  id: '', adSoyad: 'Test Denetçisi', eposta: 'yaris@test', unvan: null,
  yetkiler: [{ rol: 'yonetici', surecId: null, tesisId: null, tuzelKisiId: null,
    regulasyonId: null, modul: null }],
};

vi.mock('@/lib/erisim', async (asil) => {
  const gercek = await asil<typeof import('@/lib/erisim')>();
  return { ...gercek, yetkiZorunlu: async () => sahteKullanici, izinVar: () => true };
});

const { db } = await import('@/lib/db');
const { asamaIlerlet, asamaGeriAl } = await import('@/lib/eylemler2/denetim');
const { surumAktiflestir } = await import('@/lib/eylemler2/surum');
const T = await import('@/lib/entegrasyon/topoloji');

type Sonuc = { ok: true } | { ok: false; hata: string };

const basarili = (s: Sonuc[]) => s.filter((x) => x.ok).length;
const basarisiz = (s: Sonuc[]) => s.filter((x): x is { ok: false; hata: string } => !x.ok);

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

/** Bu denetime ait durum_degisimi iz satırları. */
async function izSatirlari(denetimId: string) {
  return db.aktiviteKaydi.findMany({
    where: { varlikTipi: 'Denetim', varlikId: denetimId, eylem: 'durum_degisimi' },
    orderBy: { zaman: 'asc' },
  });
}

async function denetimAc(durum: string) {
  return db.denetim.create({ data: {
    kod: benzersiz('YARIS'), ad: 'Yarış testi denetimi', tip: 'ic_denetim', durum } });
}

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  sahteKullanici.id = kisi.id;
});

/* ═══ P5 · aşama makinesi ═════════════════════════════════════════════ */

describe('P5 — denetim aşama geçişi', () => {
  it('aynı geçişi aynı anda deneyen iki onaylayandan yalnız biri yazar; izde TEK satır olur', async () => {
    const d = await denetimAc('kapsam');

    const sonuclar = await Promise.all([
      asamaIlerlet({ id: d.id }),
      asamaIlerlet({ id: d.id }),
    ]) as Sonuc[];

    // Aşama tam BİR adım ilerledi (iki adım değil).
    const son = await db.denetim.findUniqueOrThrow({ where: { id: d.id } });
    expect(son.durum).toBe('kanit_talebi');

    // Tam biri kazandı.
    expect(basarili(sonuclar)).toBe(1);
    expect(basarisiz(sonuclar)[0].hata).toMatch(/başka bir kullanıcı tarafından değiştirildi/);

    // Ve denetim izinde TEK satır var: gerçekleşen geçiş kadar iz.
    const iz = await izSatirlari(d.id);
    expect(iz).toHaveLength(1);
    expect(iz[0].oncekiDeger).toBe('kapsam');
    expect(iz[0].yeniDeger).toBe('kanit_talebi');
  });

  it('eşzamanlı "ilerlet" + "geri al": kaybeden AÇIK hata alır ve iz YAZILMAZ', async () => {
    const d = await denetimAc('saha');

    const sonuclar = await Promise.all([
      asamaIlerlet({ id: d.id }),
      asamaGeriAl({ id: d.id, gerekce: 'Saha çalışması eksik kaldı, kapsama dönülüyor' }),
    ]) as Sonuc[];

    expect(basarili(sonuclar)).toBe(1);
    const kayip = basarisiz(sonuclar);
    expect(kayip).toHaveLength(1);
    expect(kayip[0].hata).toMatch(/başka bir kullanıcı tarafından değiştirildi/);

    // Bu kusurun tam kalbi: iz, GERÇEKLEŞEN geçişi anlatmalı. Kaybedenin
    // "saha → kanit_talebi" ya da "saha → bulgu" satırı DÜŞMEMELİ.
    const son = await db.denetim.findUniqueOrThrow({ where: { id: d.id } });
    const iz = await izSatirlari(d.id);
    expect(iz).toHaveLength(1);
    expect(iz[0].oncekiDeger).toBe('saha');
    expect(iz[0].yeniDeger).toBe(son.durum);
    expect(['bulgu', 'kanit_talebi']).toContain(son.durum);
  });

  it('kapanış: yazma ile doğrulama tek transaction — açık bulgu varsa aşama HİÇ değişmez', async () => {
    const d = await denetimAc('dogrulama');
    // Denetime bağlı açık bir bulgu: kapanış reddedilmeli.
    const md = await db.maddeDurumu.findFirstOrThrow({});
    await db.bulgu.create({ data: {
      maddeDurumuId: md.id, denetimId: d.id, baslik: 'Açık bulgu',
      aciklama: 'Kapanışı engellemeli', onemDerecesi: 'yuksek', durum: 'acik' } });

    const sonuc = await asamaIlerlet({ id: d.id }) as Sonuc;
    expect(sonuc.ok).toBe(false);
    expect(!sonuc.ok && sonuc.hata).toMatch(/Kapanış reddedildi/);

    // Transaction geri alındı: aşama yerinde, iz boş. Yarım durum yok.
    const son = await db.denetim.findUniqueOrThrow({ where: { id: d.id } });
    expect(son.durum).toBe('dogrulama');
    expect(await izSatirlari(d.id)).toHaveLength(0);
  });
});

/* ═══ P6 · topoloji sapmasından türetilmiş kayıt ══════════════════════ */

async function sapmaAc(siddet = 'kritik') {
  const tesis = await db.tesis.findFirstOrThrow({});
  const anlik = await db.topolojiAnlik.create({ data: {
    tesisId: tesis.id, kaynak: 'test', ozetHash: benzersiz('hash') } });
  return db.topolojiSapmasi.create({ data: {
    tesisId: tesis.id, anlikId: anlik.id, tip: 'yeni_bt_ot_koprusu',
    siddet, aciklama: 'Yarış testi sapması', durum: 'gozlendi' } });
}

describe('P6 — sapmadan risk/bulgu kaydı açma', () => {
  it('aynı sapmadan eşzamanlı iki risk açma denemesi TEK risk üretir', async () => {
    const sapma = await sapmaAc();
    const aktor = sahteKullanici.id;
    // Kodlar BİLEREK farklı: `Risk.kod @unique` kısıtı kopyayı kendiliğinden
    // engellemesin — kopyayı durduran şey koşullu `updateMany` olmalı.
    const kodA = benzersiz('R-YARIS-A');
    const kodB = benzersiz('R-YARIS-B');

    const sonuclar = await Promise.allSettled([
      T.riskKaydiAc(sapma.id, aktor, { kod: kodA, gerekce: 'A gerekçesi' }),
      T.riskKaydiAc(sapma.id, aktor, { kod: kodB, gerekce: 'B gerekçesi' }),
    ]);

    const kazanan = sonuclar.filter((s) => s.status === 'fulfilled');
    const kaybeden = sonuclar.filter((s) => s.status === 'rejected');
    expect(kazanan).toHaveLength(1);
    expect(kaybeden).toHaveLength(1);
    expect((kaybeden[0] as PromiseRejectedResult).reason.message)
      .toMatch(/zaten bir risk kaydı açılmış/);

    // Risk kütüğünde bu yarıştan TEK kayıt kaldı — kaybedenin transaction'ı
    // geri alındığı için "yarım" (sapmaya bağlanmamış) risk YOK.
    const riskler = await db.risk.findMany({ where: { kod: { in: [kodA, kodB] } } });
    expect(riskler).toHaveLength(1);

    // Ve sapma o tek kayda bağlı.
    const son = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapma.id } });
    expect(son.uretilenRiskId).toBe(riskler[0].id);
  });

  it('aynı sapmadan eşzamanlı iki bulgu açma denemesi TEK bulgu üretir', async () => {
    const sapma = await sapmaAc();
    const md = await db.maddeDurumu.findFirstOrThrow({});
    const aktor = sahteKullanici.id;

    const sonuclar = await Promise.allSettled([
      T.bulguKaydiAc(sapma.id, aktor, { maddeDurumuId: md.id, baslik: 'A', gerekce: 'A gerekçesi' }),
      T.bulguKaydiAc(sapma.id, aktor, { maddeDurumuId: md.id, baslik: 'B', gerekce: 'B gerekçesi' }),
    ]);

    expect(sonuclar.filter((s) => s.status === 'fulfilled')).toHaveLength(1);
    const bulgular = await db.bulgu.findMany({
      where: { maddeDurumuId: md.id, aciklama: { contains: 'Yarış testi sapması' } } });
    expect(bulgular).toHaveLength(1);
    const son = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapma.id } });
    expect(son.uretilenBulguId).toBe(bulgular[0].id);
  });

  it('aynı sapmaya eşzamanlı "kabul" + "ret" kararı: yalnız biri yazılır', async () => {
    const sapma = await sapmaAc('yuksek');
    const aktor = sahteKullanici.id;

    const sonuclar = await Promise.allSettled([
      T.sapmaKarari({ sapmaId: sapma.id, karar: 'kabul', kararVerenId: aktor,
        gerekce: 'Değişiklik planlıydı, kabul ediliyor' }),
      T.sapmaKarari({ sapmaId: sapma.id, karar: 'ret', kararVerenId: aktor,
        gerekce: 'Değişiklik onaysız, reddediliyor' }),
    ]);

    expect(sonuclar.filter((s) => s.status === 'fulfilled')).toHaveLength(1);
    const kazanan = sonuclar.find((s) => s.status === 'fulfilled') as PromiseFulfilledResult<
      import('@/lib/entegrasyon/topoloji').KararSonucu>;
    const son = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapma.id } });
    // Kaydedilen karar KAZANANIN kararıdır; kaybeden gerekçesini üstüne yazmadı.
    expect(son.durum).toBe(kazanan.value.durum);
    expect(son.kararGerekcesi).toMatch(
      kazanan.value.durum === 'kabul' ? /kabul ediliyor/ : /reddediliyor/);
  });
});

/* ═══ P7 · sürüm aktifleştirme ════════════════════════════════════════ */

describe('P7 — regülasyonda tek aktif sürüm', () => {
  it('eşzamanlı iki aktifleştirmeden sonra aktif sürüm sayısı 1 olur', async () => {
    const reg = await db.regulasyon.findFirstOrThrow({ where: {
      surumler: { some: { durum: 'aktif' } } } });
    const a = await db.frameworkSurumu.create({ data: {
      regulasyonId: reg.id, surumEtiketi: benzersiz('T-A'), durum: 'taslak' } });
    const b = await db.frameworkSurumu.create({ data: {
      regulasyonId: reg.id, surumEtiketi: benzersiz('T-B'), durum: 'taslak' } });

    const sonuclar = await Promise.all([
      surumAktiflestir({ surumId: a.id }),
      surumAktiflestir({ surumId: b.id }),
    ]) as Sonuc[];

    const aktifler = await db.frameworkSurumu.findMany({
      where: { regulasyonId: reg.id, durum: 'aktif' } });
    expect(aktifler).toHaveLength(1);
    expect([a.id, b.id]).toContain(aktifler[0].id);

    // Kaybeden sessizce yutulmadı: açık ve ANLAŞILIR bir hata döndü —
    // çıplak Prisma istisnası ("Invalid `db.frameworkSurumu…` invocation")
    // kullanıcıya çıkmamalı.
    expect(basarili(sonuclar)).toBe(1);
    const kayip = basarisiz(sonuclar)[0].hata;
    expect(kayip).not.toMatch(/invocation|prisma|UNIQUE constraint/i);
    expect(kayip).toMatch(/sürüm|aktif/i);

    // Kaybeden taslak da yarım kalmadı: ya taslak ya arşiv, ama aktif değil.
    const kaybedenSurum = await db.frameworkSurumu.findUniqueOrThrow({
      where: { id: aktifler[0].id === a.id ? b.id : a.id } });
    expect(kaybedenSurum.durum).not.toBe('aktif');
  });

  it('AYNI taslağı aynı anda iki kez aktifleştirme: tek başarı, izde TEK satır', async () => {
    /* Bu senaryoyu kısmi tekil indeks YAKALAYAMAZ — iki çağrı da AYNI satırı
       aktif yapmak ister, ortada kopya satır yoktur. Burada koruyan tek şey
       koşullu `updateMany`'dir: kaybeden `count === 0` görür. Mutasyon testi
       bu yüzden bu vakayı ölçer (bkz. rapor: M6). */
    const reg = await db.regulasyon.findFirstOrThrow({ where: {
      surumler: { some: { durum: 'aktif' } } } });
    const t = await db.frameworkSurumu.create({ data: {
      regulasyonId: reg.id, surumEtiketi: benzersiz('T-AYNI'), durum: 'taslak' } });

    const sonuclar = await Promise.all([
      surumAktiflestir({ surumId: t.id }),
      surumAktiflestir({ surumId: t.id }),
    ]) as Sonuc[];

    expect(basarili(sonuclar)).toBe(1);
    expect(basarisiz(sonuclar)[0].hata).toMatch(/değiştirildi|aktif/i);

    const aktifler = await db.frameworkSurumu.findMany({
      where: { regulasyonId: reg.id, durum: 'aktif' } });
    expect(aktifler).toHaveLength(1);
    expect(aktifler[0].id).toBe(t.id);

    // İz: "aktif_surum" değişimi bir kez oldu, bir kez yazıldı.
    // (Bu regülasyona başka testler de iz yazdığı için YALNIZ bu sürüme ait
    // satırlar sayılıyor.)
    const iz = await db.aktiviteKaydi.findMany({ where: {
      varlikTipi: 'Regulasyon', varlikId: reg.id, alan: 'aktif_surum',
      yeniDeger: t.surumEtiketi } });
    expect(iz).toHaveLength(1);
  });

  it('veritabanı kısıtı uygulama katmanı atlansa da ikinci aktif sürümü REDDEDER', async () => {
    // Kısmi tekil indeks (migration 20260901201000) uygulama kodundan
    // bağımsız olarak durur: ham Prisma çağrısı bile ikinci aktifi yazamaz.
    const reg = await db.regulasyon.findFirstOrThrow({ where: {
      surumler: { some: { durum: 'aktif' } } } });
    const t = await db.frameworkSurumu.create({ data: {
      regulasyonId: reg.id, surumEtiketi: benzersiz('T-HAM'), durum: 'taslak' } });
    await expect(db.frameworkSurumu.update({
      where: { id: t.id }, data: { durum: 'aktif' } })).rejects.toMatchObject({ code: 'P2002' });

    // Arşiv sürümler kısıta girmez: aynı regülasyonda istenildiği kadar olabilir.
    await db.frameworkSurumu.update({ where: { id: t.id }, data: { durum: 'arsiv' } });
    const t2 = await db.frameworkSurumu.create({ data: {
      regulasyonId: reg.id, surumEtiketi: benzersiz('T-HAM2'), durum: 'arsiv' } });
    expect(t2.durum).toBe('arsiv');
  });
});

/* ═══ Yeniden ÜRETİLEMEYEN yarışlar ═══════════════════════════════════ */

describe('yeniden üretilemeyen yarışlar (belge)', () => {
  /* `asamaIlerlet` kapanış kontrolü artık "önce yaz, sonra doğrula" olarak
     tek transaction içindedir. Onu KIRAN senaryo — sayım ile yazma arasında
     BAŞKA bir bağlantının yeni bulgu açması — bu süreçte üretilemez:
     Prisma'nın interaktif transaction'ları burada tam serileşiyor (ölçüldü:
     iki eşzamanlı `$transaction` gövdesi hiç iç içe geçmiyor, biri bitmeden
     diğeri başlamıyor) ve SQLite zaten tek yazıcıdır. Yani "kapanış anında
     araya giren bulgu" tek süreçte yapay olarak bile kurulamaz.

     Bunu yeşil bir testle "geçti" göstermek yanıltıcı olurdu; kapanış
     kontrolünün doğruluğu yukarıdaki tek iş parçacıklı testle (transaction
     geri alınıyor mu) sabitlenmiştir. Gerçek çok bağlantılı yarış ancak
     PostgreSQL üzerinde ölçülebilir. */
  it.skip('ÜRETİLEMEDİ: kapanış sayımı ile yazma arasına giren yeni bulgu (çok bağlantı gerekir)', () => {});

  /* Aynı gerekçe: iki `$transaction` gövdesinin İÇ İÇE geçmesiyle oluşan
     yarışlar (örn. sapma kararı ile temel taşımanın çakışması) bu süreçte
     üretilemez. Koşullu `updateMany`'ler yine de yazılmıştır — PostgreSQL'de
     transaction'lar gerçekten paralel koşacaktır. */
  it.skip('ÜRETİLEMEDİ: iç içe geçen iki transaction gövdesi (SQLite tek yazıcı, Prisma serileştiriyor)', () => {});
});
