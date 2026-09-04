import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   C22/C23 · Belge kütüğü eylemleri — GERÇEK veritabanı üzerinde

   Ölçülen şey mesaj değil SONUÇTUR: satırda hangi durum kaldı, takvim
   nereye taşındı, denetim izine hangi satır düştü.

   Kurulum proje kalıbıyla aynı (tests/capa-dogrulama.test.ts): dev.db
   kopyası, TEST_DB db'ye dokunan HER importtan ÖNCE. Yetki kapısı sahte
   bir yöneticiyle açılır; kapının ARKASINDAKİ kurallar (geçiş tablosu,
   gerekçe zorunluluğu, takvim aritmetiği) gerçek kodda koşar.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-dokuman-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const sahteKullanici = {
  id: '', adSoyad: 'Test Yöneticisi', eposta: 'dokuman@test', unvan: null,
  yetkiler: [{ rol: 'yonetici', surecId: null, tesisId: null, tuzelKisiId: null,
    regulasyonId: null, modul: null }],
};

vi.mock('@/lib/erisim', async (asil) => {
  const gercek = await asil<typeof import('@/lib/erisim')>();
  return { ...gercek, yetkiZorunlu: async () => sahteKullanici, izinVar: () => true };
});

const { db } = await import('@/lib/db');
const {
  dokumanKaydet, dokumanDurumDegistir, dokumanGozdenGecirildi,
} = await import('@/lib/eylemler2/dokuman');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

let maddeIdleri: string[] = [];
let tesisId = '';

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  sahteKullanici.id = kisi.id;
  maddeIdleri = (await db.madde.findMany({ select: { id: true }, take: 3 })).map((m) => m.id);
  tesisId = (await db.tesis.findFirstOrThrow({ select: { id: true } })).id;
});

async function belgeAc(ek: Partial<Parameters<typeof dokumanKaydet>[0]> = {}) {
  const kod = benzersiz('TST');
  const sonuc = await dokumanKaydet({
    kod, baslik: 'Test belgesi', tur: 'politika', gozdenGecirmeAy: 12, ...ek,
  });
  expect(hataMetni(sonuc)).toBe('');
  return db.dokuman.findFirstOrThrow({ where: { kod: ek.kod ?? kod } });
}

const izler = (varlikId: string) => db.aktiviteKaydi.findMany({
  where: { varlikTipi: 'Dokuman', varlikId }, orderBy: { zaman: 'asc' },
});

describe('Künye kaydı', () => {
  it('yeni belge TASLAK doğar; yürürlük tarihi ve onaylayanı yoktur', async () => {
    const b = await belgeAc();
    expect(b.durum).toBe('taslak');
    expect(b.yururlukTarihi).toBeNull();
    expect(b.onaylayanId).toBeNull();
    // Takvim kurulamaz: periyot var ama taban tarih yok.
    expect(b.sonrakiGozdenGecirme).toBeNull();
    const iz = await izler(b.id);
    expect(iz.map((i) => i.eylem)).toContain('olusturma');
  });

  it('aynı kod iki kez açılamaz ve hata okunabilir cümledir', async () => {
    const kod = benzersiz('TEK');
    await belgeAc({ kod });
    const ikinci = await dokumanKaydet({ kod, baslik: 'Kopya', tur: 'politika' });
    expect(ikinci.ok).toBe(false);
    expect(hataMetni(ikinci)).toMatch(/kod/i);
  });

  it('kontrol ve santral bağları TAM LİSTE olarak yazılır; çıkarılan bağ silinir', async () => {
    const b = await belgeAc({ maddeIdleri: maddeIdleri.slice(0, 3), tesisIdleri: [tesisId] });
    expect(await db.dokumanMadde.count({ where: { dokumanId: b.id } })).toBe(3);
    expect(await db.dokumanTesis.count({ where: { dokumanId: b.id } })).toBe(1);

    await dokumanKaydet({
      id: b.id, kod: b.kod, baslik: b.baslik, tur: b.tur,
      maddeIdleri: maddeIdleri.slice(0, 1), tesisIdleri: [],
    });
    expect(await db.dokumanMadde.count({ where: { dokumanId: b.id } })).toBe(1);
    // Boş liste kapsamı KALDIRIR: belge kurumsallaşır.
    expect(await db.dokumanTesis.count({ where: { dokumanId: b.id } })).toBe(0);
  });

  it('periyot verilince takvim yürürlük tarihinden kurulur', async () => {
    const b = await belgeAc({
      gozdenGecirmeAy: 6,
      yururlukTarihi: new Date(Date.UTC(2026, 0, 15)).toISOString(),
    });
    expect(b.sonrakiGozdenGecirme?.toISOString().slice(0, 10)).toBe('2026-07-15');
  });
});

describe('Yaşam döngüsü', () => {
  it('taslak doğrudan yürürlüğe alınamaz; hata hangi adımın eksik olduğunu söyler', async () => {
    const b = await belgeAc();
    const s = await dokumanDurumDegistir({ id: b.id, durum: 'yururlukte' });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/incelemeye alınır/);
    expect((await db.dokuman.findUniqueOrThrow({ where: { id: b.id } })).durum).toBe('taslak');
  });

  it('yürürlüğe alma tarihi, onaylayanı ve gözden geçirme takvimini kurar [DOK-SUR-001]', async () => {
    const b = await belgeAc({ gozdenGecirmeAy: 12 });
    expect((await dokumanDurumDegistir({ id: b.id, durum: 'incelemede' })).ok).toBe(true);
    expect((await dokumanDurumDegistir({ id: b.id, durum: 'yururlukte' })).ok).toBe(true);

    const son = await db.dokuman.findUniqueOrThrow({ where: { id: b.id } });
    expect(son.durum).toBe('yururlukte');
    expect(son.yururlukTarihi).not.toBeNull();
    expect(son.onaylayanId).toBe(sahteKullanici.id);
    expect(son.sonGozdenGecirme).not.toBeNull();
    expect(son.sonrakiGozdenGecirme).not.toBeNull();
    // Takvim son gözden geçirmeden 12 ay ileri.
    const fark = son.sonrakiGozdenGecirme!.getTime() - son.sonGozdenGecirme!.getTime();
    expect(fark).toBeGreaterThan(360 * 86_400_000);

    const iz = await izler(b.id);
    expect(iz.some((i) => i.eylem === 'onay' && i.yeniDeger === 'yururlukte')).toBe(true);
  });

  it('askıya alma GEREKÇE ister: belge bir boşluk bırakır', async () => {
    const b = await belgeAc();
    await dokumanDurumDegistir({ id: b.id, durum: 'incelemede' });
    await dokumanDurumDegistir({ id: b.id, durum: 'yururlukte' });

    const gerekcesiz = await dokumanDurumDegistir({ id: b.id, durum: 'askida' });
    expect(gerekcesiz.ok).toBe(false);
    expect(hataMetni(gerekcesiz)).toMatch(/gerekçe/i);
    expect((await db.dokuman.findUniqueOrThrow({ where: { id: b.id } })).durum).toBe('yururlukte');

    const gerekceli = await dokumanDurumDegistir({
      id: b.id, durum: 'askida', gerekce: 'Yeni donanım ailesi kapsam dışı',
    });
    expect(gerekceli.ok).toBe(true);
    const iz = await izler(b.id);
    expect(iz.at(-1)?.gerekce).toBe('Yeni donanım ailesi kapsam dışı');
  });

  it('yürürlükten kalkmış belge geri döndürülemez', async () => {
    const b = await belgeAc();
    await dokumanDurumDegistir({ id: b.id, durum: 'incelemede' });
    await dokumanDurumDegistir({ id: b.id, durum: 'yururlukte' });
    expect((await dokumanDurumDegistir({ id: b.id, durum: 'yururlukten_kalkti' })).ok).toBe(true);

    const geri = await dokumanDurumDegistir({ id: b.id, durum: 'yururlukte' });
    expect(geri.ok).toBe(false);
    expect(hataMetni(geri)).toMatch(/geri döndürülmez/);
  });

  it('aynı duruma geçiş reddedilir; iz kirlenmez', async () => {
    const b = await belgeAc();
    const once = (await izler(b.id)).length;
    const s = await dokumanDurumDegistir({ id: b.id, durum: 'taslak' });
    expect(s.ok).toBe(false);
    expect((await izler(b.id)).length).toBe(once);
  });
});

describe('Gözden geçirme damgası', () => {
  it('yalnız yürürlükteki belge gözden geçirilmiş sayılır', async () => {
    const b = await belgeAc();
    const s = await dokumanGozdenGecirildi({ id: b.id });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/yürürlükteki/i);
  });

  it('periyodu olmayan belgeye damga vurulamaz — takvim kurulamaz', async () => {
    const b = await belgeAc({ gozdenGecirmeAy: null });
    await dokumanDurumDegistir({ id: b.id, durum: 'incelemede' });
    await dokumanDurumDegistir({ id: b.id, durum: 'yururlukte' });
    const s = await dokumanGozdenGecirildi({ id: b.id });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/periyodu/i);
    expect((await db.dokuman.findUniqueOrThrow({ where: { id: b.id } })).sonrakiGozdenGecirme)
      .toBeNull();
  });

  it('damga takvimi ileri atar ve izde kimin baktığı kalır', async () => {
    const b = await belgeAc({ gozdenGecirmeAy: 12 });
    await dokumanDurumDegistir({ id: b.id, durum: 'incelemede' });
    await dokumanDurumDegistir({ id: b.id, durum: 'yururlukte' });
    const once = await db.dokuman.findUniqueOrThrow({ where: { id: b.id } });

    // Takvimi geriye çekip damganın onu ileri attığını ölçüyoruz.
    await db.dokuman.update({
      where: { id: b.id },
      data: {
        sonGozdenGecirme: new Date(Date.now() - 400 * 86_400_000),
        sonrakiGozdenGecirme: new Date(Date.now() - 35 * 86_400_000),
      },
    });
    expect((await dokumanGozdenGecirildi({ id: b.id, not: 'Yıllık okuma' })).ok).toBe(true);

    const sonra = await db.dokuman.findUniqueOrThrow({ where: { id: b.id } });
    expect(sonra.sonrakiGozdenGecirme!.getTime()).toBeGreaterThan(Date.now());
    expect(sonra.sonrakiGozdenGecirme!.getTime()).toBeGreaterThan(once.sonrakiGozdenGecirme!.getTime() - 1);
    const iz = await izler(b.id);
    expect(iz.at(-1)).toMatchObject({ alan: 'gozden_gecirme', gerekce: 'Yıllık okuma' });
  });
});

describe('Kütük ile kanıt kütüphanesinin bağı', () => {
  it('seed politika kanıtlarını kütükteki karşılıklarına bağlar', async () => {
    const bagli = await db.kanit.count({ where: { tip: 'politika', dokumanId: { not: null } } });
    expect(bagli).toBeGreaterThan(0);
  });

  it('kütükte her kontrol karşılanmış DEĞİLDİR — ekranın varlık sebebi budur', async () => {
    const toplam = await db.madde.count({ where: { silindi: null } });
    const karsilanan = await db.madde.count({
      where: {
        silindi: null,
        belgeBaglantilari: { some: { dokuman: { durum: 'yururlukte', silindi: null } } },
      },
    });
    expect(karsilanan).toBeGreaterThan(0);
    expect(karsilanan).toBeLessThan(toplam);
  });
});
