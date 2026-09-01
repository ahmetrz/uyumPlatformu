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

/* ═══ KAYBEDEN YAZICI TEZGÂHI ═════════════════════════════════════════

   Eşzamanlılığın KENDİSİ bu süreçte üretilemiyor (bkz. dosya sonundaki tek
   `it.skip`) ama yarışın KAYBEDEN TARAFI deterministik olarak KURULABİLİR.

   Koruyucu kalıbın tamamı şudur: eylem durumu OKUR → transaction açar →
   `updateMany({ where: { id, <okunan durum> } })` ile durumu SAHİPLENİR →
   `count === 0` ise başkası önce davranmıştır. Kaybeden dalı çalıştırmak
   için ihtiyacımız olan tek şey, OKUMA ile SAHİPLENME ARASINDA durumu
   değiştirmektir — iki iş parçacığı değil.

   `db.$transaction` tam olarak o aralıkta çağrılır. Bu sarmalayıcı, teste
   oraya tek seferlik bir kanca koyma imkânı verir; kanca yoksa çağrı hiç
   dokunulmadan geçer, dosyadaki diğer testler bundan etkilenmez.

   Bu bir yarış SİMÜLASYONU DEĞİLDİR ve öyle sunulmuyor: ölçtüğü şey
   "`count === 0` yolu gerçekten koşuyor mu, koşunca yan etki ve iz
   kalıyor mu" sorusudur — yani korumanın kendisi. */
let araGirisim: (() => Promise<void>) | null = null;

vi.mock('@/lib/db', async (asil) => {
  const gercek = await asil<typeof import('@/lib/db')>();
  const sarmal = new Proxy(gercek.db, {
    get(hedef, ozellik, alici) {
      const deger = Reflect.get(hedef, ozellik, alici);
      if (ozellik !== '$transaction') return deger;
      const asilTx = deger as (...arg: unknown[]) => Promise<unknown>;
      return async (...arg: unknown[]) => {
        const kanca = araGirisim;
        araGirisim = null;          // kanca TEK SEFERLİKTİR
        if (kanca) await kanca();
        return asilTx.call(hedef, ...arg);
      };
    },
  });
  return { ...gercek, db: sarmal };
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

/* ═══ Kaybeden tarafın DETERMİNİSTİK ölçümü ═══════════════════════════

   Bu bölüm, daha önce iki `it.skip` ile "üretilemedi" diye kapatılmış olan
   alanı kapatır. Gerekçe DOĞRUydu — tek süreçte, tek yazıcılı SQLite'ta iki
   transaction gövdesi iç içe geçmiyor — ama o gerekçe yalnız EŞZAMANLILIĞIN
   üretilemediğini söyler; KORUYUCU MANTIĞIN ölçülemediğini değil.

   Korumanın tamamı şu üç adımdır ve üçü de deterministik ölçülebilir:
     1. koşullu sahiplenme, beklenen durum tutmuyorsa `count === 0` döner,
     2. `count === 0` dalı AÇIK hata atar ve transaction'ı geri alır,
     3. geri alma sonrası ne durum değişir ne İZ kalır ne yarım kayıt.
   ═════════════════════════════════════════════════════════════════════ */

describe('kaybeden taraf — deterministik', () => {
  it('1 · koşullu sahiplenme: beklenen durum tutmuyorsa count === 0', async () => {
    /* Korumanın ilkel taşı. Bunu ölçmeden üstündeki hiçbir iddia dayanak
       bulmaz: `updateMany` gerçekten koşulu uyguluyor mu, yoksa satırı id
       üzerinden koşulsuz mu yazıyor? */
    const d = await denetimAc('kapsam');

    const tutan = await db.denetim.updateMany({
      where: { id: d.id, durum: 'kapsam', silindi: null }, data: { durum: 'kanit_talebi' } });
    expect(tutan.count).toBe(1);

    // Aynı çağrı BAYAT beklentiyle: satır var, koşul tutmuyor → hiç yazma.
    const bayat = await db.denetim.updateMany({
      where: { id: d.id, durum: 'kapsam', silindi: null }, data: { durum: 'saha' } });
    expect(bayat.count).toBe(0);
    expect((await db.denetim.findUniqueOrThrow({ where: { id: d.id } })).durum)
      .toBe('kanit_talebi');
  });

  it('2 · kaybeden yazıcı: okuma ile sahiplenme arasında aşama değişirse HİÇBİR ŞEY yazılmaz',
    async () => {
      /* Yarışın kaybeden tarafı DOĞRUDAN kuruluyor: `asamaIlerlet` denetimi
         'kapsam' olarak okur, biz transaction açılmadan hemen önce durumu
         'saha' yaparız (= "başkası önce davrandı"), ve eylem kendi okuduğu
         duruma göre yazmaya çalışır. `count === 0` dalı burada koşar. */
      const d = await denetimAc('kapsam');
      araGirisim = async () => {
        await db.denetim.update({ where: { id: d.id }, data: { durum: 'saha' } });
      };

      const sonuc = await asamaIlerlet({ id: d.id }) as Sonuc;

      // AÇIK hata — sessiz "tamam" değil.
      expect(sonuc.ok).toBe(false);
      expect(!sonuc.ok && sonuc.hata).toMatch(/başka bir kullanıcı tarafından değiştirildi/);

      /* YAN ETKİ YOK: kaybedenin yazacağı değer 'kanit_talebi' idi (bayat
         'kapsam' okumasından türetilmişti). Satır kazananın bıraktığı yerde. */
      expect((await db.denetim.findUniqueOrThrow({ where: { id: d.id } })).durum).toBe('saha');

      // İZ YOK: gerçekleşmemiş bir geçiş denetim izine düşmez.
      expect(await izSatirlari(d.id)).toHaveLength(0);
    });

  it('3 · bayat durum reddi (geri alma): kaybeden geri alma da iz bırakmaz', async () => {
    /* Aynı kalıbın diğer yönü. `asamaGeriAl` gerekçe ALIR ve gerekçeyi ize
       yazar; koruma çalışmazsa geriye "olmamış bir geri alma"nın gerekçeli
       kaydı kalırdı — denetim izinin anlatabileceği en kötü yalan. */
    const d = await denetimAc('saha');
    araGirisim = async () => {
      await db.denetim.update({ where: { id: d.id }, data: { durum: 'bulgu' } });
    };

    const sonuc = await asamaGeriAl({
      id: d.id, gerekce: 'Saha çalışması eksik kaldı, kapsama dönülüyor' }) as Sonuc;

    expect(sonuc.ok).toBe(false);
    expect(!sonuc.ok && sonuc.hata).toMatch(/başka bir kullanıcı tarafından değiştirildi/);
    expect((await db.denetim.findUniqueOrThrow({ where: { id: d.id } })).durum).toBe('bulgu');
    const iz = await izSatirlari(d.id);
    expect(iz).toHaveLength(0);
    expect(JSON.stringify(iz)).not.toContain('Saha çalışması eksik kaldı');
  });

  it('4 · sapma kararı: kaybeden kararı ve GEREKÇEYİ ezemez', async () => {
    const sapma = await sapmaAc('yuksek');
    const aktor = sahteKullanici.id;

    /* Kaybeden dalı kur: `sapmaKarari` sapmayı "gozlendi" okur (hızlı ret
       kapısından geçer), sonra biz kararı bağlarız. Koşullu sahiplenme
       `durum in (gozlendi, inceleme)` istediği için count === 0 olur.
       Hızlı ret kapısı DEĞİL bu kapı konuşuyor: mesajlar farklıdır. */
    araGirisim = async () => {
      await db.topolojiSapmasi.update({ where: { id: sapma.id }, data: {
        durum: 'ret', kararVerenId: aktor, kararZamani: new Date(),
        kararGerekcesi: 'Önce gelen karar: değişiklik onaysız, reddedildi' } });
    };

    await expect(T.sapmaKarari({ sapmaId: sapma.id, karar: 'kabul', kararVerenId: aktor,
      gerekce: 'Sonra gelen karar: değişiklik planlıydı, kabul ediliyor' }))
      .rejects.toThrow(/bu sırada başkası tarafından karara bağlandı/);

    const son = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapma.id } });
    expect(son.durum).toBe('ret');
    expect(son.kararGerekcesi).toMatch(/Önce gelen karar/);
    expect(son.kararGerekcesi).not.toMatch(/Sonra gelen karar/);
  });

  it('5 · kaybeden dal YARIM KAYIT bırakmaz: risk açılıp geri alınır', async () => {
    /* `riskKaydiAc` önce Risk satırını AÇAR, sonra sapmayı koşullu bağlar.
       Kaybeden dalda bağ tutmaz ve transaction geri alınır — açılan risk de
       geri alınmalıdır. Aksi hâlde risk kütüğünde hiçbir sapmaya bağlı
       OLMAYAN, kimsenin sahiplenmediği bir kayıt kalırdı.

       Hızlı ret kapısı bu testte KONUŞAMAZ: sapma okunduğunda
       `uretilenRiskId` hâlâ null'dı; bağ ondan SONRA doldu. */
    const sapma = await sapmaAc();
    const kod = benzersiz('R-KAYBEDEN');
    araGirisim = async () => {
      await db.topolojiSapmasi.update({
        where: { id: sapma.id }, data: { uretilenRiskId: 'onceki-risk-kaydi' } });
    };

    await expect(T.riskKaydiAc(sapma.id, sahteKullanici.id, {
      kod, gerekce: 'Kaybeden dalın gerekçesi' }))
      .rejects.toThrow(/zaten bir risk kaydı açılmış/);

    expect(await db.risk.count({ where: { kod } })).toBe(0);
    const son = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapma.id } });
    expect(son.uretilenRiskId).toBe('onceki-risk-kaydi');
  });

  it('6 · sürüm aktifleştirme: arşivleme sahiplenilemezse regülasyon aktifsiz KALMAZ', async () => {
    /* En pahalı kaybeden dal: `surumAktiflestir` önce eskiyi arşivler, sonra
       yeniyi aktifleştirir. Arşivleme koşullu değilse (ya da geri alınmazsa)
       regülasyon HİÇ AKTİF SÜRÜMSÜZ kalır — "aktif sürüm" filtreleriyle
       çalışan her ekran o anda boş döner. */
    const reg = await db.regulasyon.create({ data: {
      kod: benzersiz('REG-KAYBEDEN'), ad: 'Kaybeden dal regülasyonu' } });
    const eski = await db.frameworkSurumu.create({ data: {
      regulasyonId: reg.id, surumEtiketi: benzersiz('E'), durum: 'aktif' } });
    const taslak = await db.frameworkSurumu.create({ data: {
      regulasyonId: reg.id, surumEtiketi: benzersiz('T'), durum: 'taslak' } });

    // "Başkası önce davrandı": eski sürüm okuma ile yazma arasında arşive indi.
    araGirisim = async () => {
      await db.frameworkSurumu.update({
        where: { id: eski.id }, data: { durum: 'arsiv' } });
    };

    const sonuc = await surumAktiflestir({ surumId: taslak.id }) as Sonuc;
    expect(sonuc.ok).toBe(false);
    expect(!sonuc.ok && sonuc.hata).toMatch(/değiştirildi/);

    // Taslak taslak kaldı; iz yazılmadı.
    expect((await db.frameworkSurumu.findUniqueOrThrow({ where: { id: taslak.id } })).durum)
      .toBe('taslak');
    expect(await db.aktiviteKaydi.count({ where: {
      varlikTipi: 'Regulasyon', varlikId: reg.id, alan: 'aktif_surum' } })).toBe(0);
  });

  it('7 · çift yan etki engeli: aynı işlem ardışık iki kez çağrılınca bir kez uygulanır',
    async () => {
      /* Yarış olmadan da olan bir kusur: kullanıcının düğmeye iki kez
         basması. Koşullu sahiplenme burada da tek savunmadır. */
      const sapma = await sapmaAc();
      const aktor = sahteKullanici.id;
      const kodA = benzersiz('R-CIFT-A');
      const kodB = benzersiz('R-CIFT-B');

      const ilk = await T.riskKaydiAc(sapma.id, aktor, { kod: kodA, gerekce: 'İlk çağrı' });
      await expect(T.riskKaydiAc(sapma.id, aktor, { kod: kodB, gerekce: 'İkinci çağrı' }))
        .rejects.toThrow(/zaten bir risk kaydı açılmış/);

      // Yan etki TEK: bir risk, ve sapma ilk kayda bağlı.
      expect(await db.risk.count({ where: { kod: { in: [kodA, kodB] } } })).toBe(1);
      const son = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapma.id } });
      expect(son.uretilenRiskId).toBe(ilk.riskId);
    });

  it('8 · çift yan etki engeli: aynı sürüm iki kez aktifleştirilemez, iz TEK satır', async () => {
    const reg = await db.regulasyon.create({ data: {
      kod: benzersiz('REG-CIFT'), ad: 'Çift çağrı regülasyonu' } });
    await db.frameworkSurumu.create({ data: {
      regulasyonId: reg.id, surumEtiketi: benzersiz('E'), durum: 'aktif' } });
    const taslak = await db.frameworkSurumu.create({ data: {
      regulasyonId: reg.id, surumEtiketi: benzersiz('T'), durum: 'taslak' } });

    expect((await surumAktiflestir({ surumId: taslak.id }) as Sonuc).ok).toBe(true);
    const ikinci = await surumAktiflestir({ surumId: taslak.id }) as Sonuc;
    expect(ikinci.ok).toBe(false);

    expect(await db.frameworkSurumu.count({ where: { regulasyonId: reg.id, durum: 'aktif' } }))
      .toBe(1);
    expect(await db.aktiviteKaydi.count({ where: {
      varlikTipi: 'Regulasyon', varlikId: reg.id, alan: 'aktif_surum' } })).toBe(1);
  });

  it('9 · taslak artık taslak değilse aktifleştirme sahiplenilemez; arşivleme de geri alınır',
    async () => {
      /* Aktifleştirme adımının KENDİ koşulu. Yukarıdaki 6 numaralı test
         arşivleme kapısını ölçüyor; bu, ondan sonraki kapıyı ölçer — ve
         yalnız o kapı vardır: aynı taslağı iki çağrı da aktifleştirmek
         isterse ortada kopya satır olmadığı için kısmi tekil indeks bunu
         GÖREMEZ, koşullu `updateMany` tek savunmadır.

         Ayrıca ölçülen ikinci şey: kaybeden dalda ARŞİVLEME DE geri alınır.
         Alınmasaydı regülasyon aktif sürümsüz kalırdı — "aktif sürüm"
         filtresiyle çalışan her ekran o anda boş dönerdi. */
      const reg = await db.regulasyon.create({ data: {
        kod: benzersiz('REG-AKTIF'), ad: 'Aktifleştirme kapısı regülasyonu' } });
      const eski = await db.frameworkSurumu.create({ data: {
        regulasyonId: reg.id, surumEtiketi: benzersiz('E'), durum: 'aktif' } });
      const taslak = await db.frameworkSurumu.create({ data: {
        regulasyonId: reg.id, surumEtiketi: benzersiz('T'), durum: 'taslak' } });

      // "Başkası önce davrandı": taslak okuma ile yazma arasında arşive indi.
      araGirisim = async () => {
        await db.frameworkSurumu.update({
          where: { id: taslak.id }, data: { durum: 'arsiv' } });
      };

      const sonuc = await surumAktiflestir({ surumId: taslak.id }) as Sonuc;
      expect(sonuc.ok).toBe(false);
      expect(!sonuc.ok && sonuc.hata).toMatch(/değiştirildi/);

      // Arşiv edilmiş taslak SESSİZCE aktifleştirilmedi…
      expect((await db.frameworkSurumu.findUniqueOrThrow({ where: { id: taslak.id } })).durum)
        .toBe('arsiv');
      // …ve eski sürüm hâlâ aktif: regülasyon aktifsiz kalmadı.
      expect((await db.frameworkSurumu.findUniqueOrThrow({ where: { id: eski.id } })).durum)
        .toBe('aktif');
      expect(await db.aktiviteKaydi.count({ where: {
        varlikTipi: 'Regulasyon', varlikId: reg.id, alan: 'aktif_surum' } })).toBe(0);
    });
});

/* ═══ Yeniden ÜRETİLEMEYEN yarış ══════════════════════════════════════ */

describe('yeniden üretilemeyen yarış (belge)', () => {
  /* GERİYE KALAN TEK BOŞLUK ve neden burada kaldığı:

     Yukarıdaki tezgâh, durumu transaction'dan ÖNCE değiştirerek kaybeden
     dalı çalıştırabiliyor. Çalıştıramadığı tek şey, bir transaction GÖVDESİ
     koşarken BAŞKA bir bağlantının araya girmesidir — örneğin `asamaIlerlet`
     aşamayı yazdıktan SONRA, aynı transaction içindeki açık-bulgu sayımından
     ÖNCE yeni bir bulgu açılması, ya da iki `$transaction` gövdesinin iç içe
     geçmesi. Bu, tek yazıcılı SQLite ve Prisma'nın bu süreçte tam serileşen
     interaktif transaction'ları altında YAPAY OLARAK BİLE kurulamaz; gerçek
     ölçüm ancak PostgreSQL üzerinde, ayrı bağlantılarla mümkündür.

     Bunu yeşil bir testle "geçti" göstermek yanıltıcı olurdu. Sayım ile
     yazmanın tek transaction'da olduğu ve reddin her şeyi geri aldığı
     yukarıda ölçülüdür; ölçülemeyen yalnız eşzamanlılığın kendisidir. */
  it.skip('ÜRETİLEMEDİ: transaction GÖVDESİ koşarken araya giren ikinci bağlantı — '
    + 'gerçekten paralel transaction gerektirir, yani PostgreSQL', () => {});
});
