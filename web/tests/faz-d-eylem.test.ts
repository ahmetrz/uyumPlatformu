import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Uyum kanıt eylemleri — yetki · kapsam · doğrulama · iz
   UY-07 · UY-12 · UY-13

   `faz-b-eylem.test.ts` ile aynı dört soru, aynı sertlikte. Yetki kapısı
   SAHTELENMEZ: yalnız `aktifKullanici` değiştirilir, `yetkiZorunlu` ve
   `kapsamZorunlu` gerçek koşar.

   Kanıt deposu da sahtelenmez — geçici bir kök verilir ve dosya gerçekten
   yazılır. Depoyu sahtelemek, bu fazın en kritik iddiasını (aynı içerik
   yeni sürüm AÇMAZ, farklı içerik AÇAR) test dışında bırakırdı.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kanit-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const depoKoku = mkdtempSync(path.join(tmpdir(), 'uyum-kanit-depo-'));
process.env.KANIT_DEPO_KOKU = depoKoku;

type Yetki = {
  rol: string; surecId: string | null; tesisId: string | null;
  tuzelKisiId: string | null; regulasyonId: string | null; modul: string | null;
};
const yetki = (rol: string, tesisId: string | null = null): Yetki => ({
  rol, surecId: null, tesisId, tuzelKisiId: null, regulasyonId: null, modul: null,
});

/* Kapsam testleri santrale kısıtlı `yonetici` ile yapılır: yetkiyi
   TAŞIYAN ama kapsamı DAR olan roldür (bkz. faz-b-eylem.test.ts). */
const kisitliYonetici = (tesisId: string) => [yetki('yonetici', tesisId)];

const oturum = {
  id: '', adSoyad: 'Kanıt Testi', eposta: 'kanit@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const {
  kanitBaglantisiEkle, kanitDosyasiYukle, kanitKaydet,
} = await import('@/lib/eylemler2/kanit');
const {
  degerlendirmeDogrula, kontrolEkibiAta,
} = await import('@/lib/eylemler2/uyumSahiplik');
const { maddeDurumGuncelle } = await import('@/lib/eylemler');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);
const REDDEDILDI = /yetki|kapsam/i;

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;
const b64 = (metin: string) => Buffer.from(metin, 'utf8').toString('base64');

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

async function kimlikDegis<T>(kullaniciId: string, is: () => Promise<T>): Promise<T> {
  const onceki = oturum.id;
  oturum.id = kullaniciId;
  try { return await is(); } finally { oturum.id = onceki; }
}

let tesisA = ''; let tesisB = '';
let durumA = ''; let durumB = '';
let ikinciKullanici = '';
let ekipA = '';

async function izVarMi(varlikTipi: string, varlikId: string, alan: string) {
  return db.aktiviteKaydi.findFirst({
    where: { varlikTipi, varlikId, alan }, orderBy: { zaman: 'desc' },
  });
}

/** Test için bir kanıt açar ve id'sini döner. */
async function kanitAc(maddeDurumuId: string): Promise<string> {
  const s = await kanitKaydet({
    maddeDurumuId, ad: benzersiz('Kanıt'), tip: 'politika',
  });
  expect(s.ok).toBe(true);
  const kayit = await db.kanitBaglantisi.findFirst({
    where: { maddeDurumuId }, orderBy: { id: 'desc' }, select: { kanitId: true },
  });
  return kayit!.kanitId;
}

beforeAll(async () => {
  /* Santraller MaddeDurumu TAŞIYANLAR arasından seçilir: alfabetik ilk
     iki santralin uyum kaydı olmayabilir ve o zaman test kapsam kuralını
     hiç sınamaz — kural kaldırılsa bile yeşil kalırdı. */
    const kayitli = await db.maddeDurumu.findMany({
      distinct: ['tesisId'], select: { tesisId: true }, orderBy: { tesisId: 'asc' },
      take: 2,
    });
  tesisA = kayitli[0].tesisId; tesisB = kayitli[1].tesisId;

  const kullanicilar = await db.kullanici.findMany({ where: { aktif: true }, take: 2 });
  oturum.id = kullanicilar[0].id;
  ikinciKullanici = kullanicilar[1].id;

  const durumBul = async (tesisId: string) => {
    const d = await db.maddeDurumu.findFirst({ where: { tesisId }, select: { id: true } });
    return d!.id;
  };
  durumA = await durumBul(tesisA);
  durumB = await durumBul(tesisB);

  ekipA = (await db.ekip.create({
    data: { kod: benzersiz('EKP'), ad: 'Kanıt test ekibi', tesisId: tesisA },
  })).id;
});

/* ══ UY-12 · Kanıt kaydı ═════════════════════════════════════════════ */

describe('UY-12 · kanıt kaydı yetki ve kapsam ister', () => {
  it('okuyucu kanıt açamaz', async () => {
    const s = await kimlikle([yetki('okuyucu')], () => kanitKaydet({
      maddeDurumuId: durumA, ad: 'Yasak kanıt', tip: 'politika',
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('BAŞKA santralin kontrolüne kanıt bağlanamaz', async () => {
    const s = await kimlikle(kisitliYonetici(tesisB), () => kanitKaydet({
      maddeDurumuId: durumA, ad: 'Yabancı kanıt', tip: 'politika',
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('tanımsız tip REDDEDİLİR — serbest metin kabul edilmez', async () => {
    const s = await kanitKaydet({
      maddeDurumuId: durumA, ad: benzersiz('K'), tip: 'her_ne_ise',
    });
    expect(s.ok).toBe(false);
  });

  it('ters geçerlilik aralığı reddedilir', async () => {
    const s = await kanitKaydet({
      maddeDurumuId: durumA, ad: benzersiz('K'), tip: 'politika',
      gecerlilikBaslangic: '2026-06-01', gecerliBitis: '2026-01-01',
    });
    expect(s.ok).toBe(false);
  });

  it('geçerli kanıt açılır ve ize düşer [KNT-YUK-001]', async () => {
    const s = await kanitKaydet({
      maddeDurumuId: durumA, ad: benzersiz('Politika'), tip: 'politika',
      gizlilik: 'kurumsal',
    });
    expect(s.ok).toBe(true);
    const kanitId = await db.kanitBaglantisi.findFirst({
      where: { maddeDurumuId: durumA }, orderBy: { id: 'desc' },
    });
    expect(await izVarMi('Kanit', kanitId!.kanitId, 'ad')).not.toBeNull();
  });
});

/* ══ UY-13 · Dosya yükleme ═══════════════════════════════════════════ */

describe('UY-13 · kanıt dosyası yükleme', () => {
  it('okuyucu dosya yükleyemez', async () => {
    const kanitId = await kanitAc(durumA);
    const s = await kimlikle([yetki('okuyucu')], () => kanitDosyasiYukle({
      kanitId, dosyaAdi: 'a.txt', mimeTipi: 'text/plain',
      icerik: b64('gizli'), gerekce: 'Test gerekçesi yazıldı',
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('BAŞKA santralin kanıtına dosya yüklenemez', async () => {
    const kanitId = await kanitAc(durumA);
    const s = await kimlikle(kisitliYonetici(tesisB), () => kanitDosyasiYukle({
      kanitId, dosyaAdi: 'a.txt', mimeTipi: 'text/plain',
      icerik: b64('gizli'), gerekce: 'Test gerekçesi yazıldı',
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('izin listesi dışındaki tip sunucuda reddedilir', async () => {
    const kanitId = await kanitAc(durumA);
    const s = await kanitDosyasiYukle({
      kanitId, dosyaAdi: 'a.zip', mimeTipi: 'application/zip',
      icerik: b64('PK'), gerekce: 'Arşiv yüklenmeye çalışıldı',
    });
    expect(s.ok).toBe(false);
  });

  it('ilk dosya sürüm 1 açar ve özet kayda yazılır', async () => {
    const kanitId = await kanitAc(durumA);
    const s = await kanitDosyasiYukle({
      kanitId, dosyaAdi: 'politika.txt', mimeTipi: 'text/plain',
      icerik: b64(`ilk içerik ${kanitId}`), gerekce: 'İlk dosya eklendi',
    });
    expect(s.ok).toBe(true);

    const kanit = await db.kanit.findUnique({
      where: { id: kanitId },
      select: { dosyaHash: true, depoAnahtari: true, depoSaglayici: true, surum: true },
    });
    expect(kanit!.dosyaHash).toMatch(/^[0-9a-f]{64}$/);
    expect(kanit!.depoAnahtari).not.toBeNull();
    expect(kanit!.depoSaglayici).toBe('yerel_dosya');

    const surumler = await db.kanitSurumu.findMany({ where: { kanitId } });
    expect(surumler.length).toBe(1);
  });

  it('AYNI içerik yeni sürüm AÇMAZ', async () => {
    const kanitId = await kanitAc(durumA);
    const icerik = b64(`sabit içerik ${kanitId}`);
    await kanitDosyasiYukle({
      kanitId, dosyaAdi: 'a.txt', mimeTipi: 'text/plain', icerik,
      gerekce: 'İlk yükleme yapıldı',
    });
    const s = await kanitDosyasiYukle({
      kanitId, dosyaAdi: 'a.txt', mimeTipi: 'text/plain', icerik,
      gerekce: 'Aynı dosya yeniden yüklendi',
    });
    expect(s.ok).toBe(true);
    expect(await db.kanitSurumu.count({ where: { kanitId } })).toBe(1);
  });

  it('FARKLI içerik yeni sürüm AÇAR ve eski sürüm durur', async () => {
    const kanitId = await kanitAc(durumA);
    await kanitDosyasiYukle({
      kanitId, dosyaAdi: 'a.txt', mimeTipi: 'text/plain',
      icerik: b64(`birinci ${kanitId}`), gerekce: 'İlk sürüm yüklendi',
    });
    await kanitDosyasiYukle({
      kanitId, dosyaAdi: 'a.txt', mimeTipi: 'text/plain',
      icerik: b64(`ikinci ${kanitId}`), gerekce: 'İçerik güncellendi',
    });
    const surumler = await db.kanitSurumu.findMany({
      where: { kanitId }, orderBy: { surum: 'asc' },
    });
    expect(surumler.length).toBe(2);
    expect(surumler[0].dosyaHash).not.toBe(surumler[1].dosyaHash);
  });

  it('sürüm geçmişi DEĞİŞTİRİLEMEZ ve SİLİNEMEZ (veritabanı tetikleyicisi)', async () => {
    const kanitId = await kanitAc(durumA);
    await kanitDosyasiYukle({
      kanitId, dosyaAdi: 'a.txt', mimeTipi: 'text/plain',
      icerik: b64(`değişmez ${kanitId}`), gerekce: 'Sürüm açıldı',
    });
    const s = (await db.kanitSurumu.findFirst({ where: { kanitId } }))!;

    await expect(db.kanitSurumu.update({
      where: { id: s.id }, data: { dosyaHash: '0'.repeat(64) },
    })).rejects.toThrow();
    await expect(db.kanitSurumu.delete({ where: { id: s.id } })).rejects.toThrow();
  });
});

/* ══ UY-12 · Kanıt bağlantısı ════════════════════════════════════════ */

describe('UY-12 · kanıt bağlantısı iki yönlü kapsam ister', () => {
  it('kanıtın BUGÜNKÜ kapsamı dışındaki kullanıcı bağlantı ekleyemez', async () => {
    /* A santralinin kanıtına, yalnız B'de yetkili biri dokunamaz. */
    const kanitId = await kanitAc(durumA);
    const s = await kimlikle(kisitliYonetici(tesisB), () => kanitBaglantisiEkle({
      kanitId, maddeDurumuId: durumB,
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('yetkili kullanıcı bağlantı ekleyebilir', async () => {
    const kanitId = await kanitAc(durumA);
    const hedef = await db.maddeDurumu.findFirst({
      where: { tesisId: tesisA, id: { not: durumA } }, select: { id: true },
    });
    if (!hedef) return;
    const s = await kanitBaglantisiEkle({ kanitId, maddeDurumuId: hedef.id });
    expect(s.ok).toBe(true);
  });
});

/* ══ UY-07 · Dört göz ════════════════════════════════════════════════ */

describe('UY-07 · değerlendirme doğrulama', () => {
  it('okuyucu doğrulayamaz', async () => {
    const s = await kimlikle([yetki('okuyucu')], () => degerlendirmeDogrula({
      maddeDurumuId: durumA, onay: true, gerekce: 'Dayanağı okudum, yeterli',
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('BAŞKA santralin kontrolü doğrulanamaz', async () => {
    const s = await kimlikle(kisitliYonetici(tesisB), () => degerlendirmeDogrula({
      maddeDurumuId: durumA, onay: true, gerekce: 'Dayanağı okudum, yeterli',
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('kendi değerlendirmesini doğrulayan REDDEDİLİR (dört göz)', async () => {
    /* Değerlendiren kişi DEĞİŞMEZ TARİHÇENİN son satırından okunur ve o
       satır yalnız durum GERÇEKTEN değişince yazılır; bu yüzden test
       kaydın bugünkü durumundan farklı bir durum yazar. Aynı durumu
       yeniden yazsaydı tarihçenin son satırı tohumdan kalır ve test
       dört göz kuralını hiç sınamazdı. */
    const md = (await db.maddeDurumu.findFirst({
      where: { tesisId: tesisA, durum: { not: 'uyumlu' } },
      select: { id: true }, orderBy: { id: 'asc' },
    }))!;
    await maddeDurumGuncelle({
      id: md.id, durum: 'uyumlu', gerekce: 'Test değerlendirmesi yapıldı',
    });

    const s = await degerlendirmeDogrula({
      maddeDurumuId: md.id, onay: true, gerekce: 'Kendi kararımı doğruluyorum',
    });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('dört göz');
  });

  it('BAŞKASI doğrulayabilir ve damga ize düşer', async () => {
    const md = (await db.maddeDurumu.findFirst({
      where: { tesisId: tesisA, durum: { not: 'uyumlu' } },
      select: { id: true }, orderBy: { id: 'desc' },
    }))!;
    await maddeDurumGuncelle({
      id: md.id, durum: 'uyumlu', gerekce: 'Değerlendirme kaydedildi',
    });

    const s = await kimlikDegis(ikinciKullanici, () => degerlendirmeDogrula({
      maddeDurumuId: md.id, onay: true, gerekce: 'Dayanağı okudum, yeterli',
    }));
    expect(s.ok).toBe(true);

    const kayit = await db.maddeDurumu.findUnique({
      where: { id: md.id }, select: { dogrulayanId: true, dogrulamaZamani: true },
    });
    expect(kayit!.dogrulayanId).toBe(ikinciKullanici);
    expect(kayit!.dogrulamaZamani).not.toBeNull();
    expect(await izVarMi('MaddeDurumu', md.id, 'dogrulayanId')).not.toBeNull();
  });

  it('doğrulanmamış kaydın damgası geri alınamaz — sessiz silme yok', async () => {
    const md = (await db.maddeDurumu.findFirst({
      where: { tesisId: tesisA, dogrulayanId: null }, select: { id: true },
    }))!;
    const s = await degerlendirmeDogrula({
      maddeDurumuId: md.id, onay: false, gerekce: 'Doğrulamayı geri alıyorum',
    });
    expect(s.ok).toBe(false);
  });
});

/* ══ UY-07 · Ekip ataması ve ÖLÇÜLMÜŞ KUSUR ══════════════════════════ */

describe('UY-07 · sorumluluk zinciri ize düşer', () => {
  it('okuyucu ekip atayamaz', async () => {
    const s = await kimlikle([yetki('okuyucu')], () => kontrolEkibiAta({
      maddeDurumuId: durumA, ekipId: ekipA,
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('BAŞKA santralin kontrolüne ekip atanamaz', async () => {
    const s = await kimlikle(kisitliYonetici(tesisB), () => kontrolEkibiAta({
      maddeDurumuId: durumA, ekipId: ekipA,
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('ekip ataması ize düşer', async () => {
    const md = (await db.maddeDurumu.findFirst({
      where: { tesisId: tesisA }, select: { id: true }, orderBy: { id: 'asc' },
    }))!;
    const s = await kontrolEkibiAta({ maddeDurumuId: md.id, ekipId: ekipA });
    expect(s.ok).toBe(true);
    expect(await izVarMi('MaddeDurumu', md.id, 'ekipId')).not.toBeNull();
  });

  it('SORUMLU DEĞİŞİKLİĞİ kendi iz satırını yazar (ölçülmüş kusur)', async () => {
    /* Eski davranış: `maddeDurumGuncelle` iz satırını yalnız `durum`
       değişince yazıyordu; sorumlu sessizce el değiştirebiliyordu ve
       "bu kontrolün sorumlusu ne zaman değişti" sorusu cevapsızdı. */
    const md = (await db.maddeDurumu.findFirst({
      where: { tesisId: tesisA, sorumluId: { not: ikinciKullanici } },
      select: { id: true, durum: true },
    }))!;
    /* Durum BİLEREK değiştirilmez: iz satırının sorumlu değişikliğinden
       geldiğini kanıtlayan şey budur. Durum da değişseydi, `durum` iz
       satırı yazılır ve kusurun düzeltilip düzeltilmediği ölçülemezdi. */
    const s = await maddeDurumGuncelle({
      id: md.id, durum: md.durum, sorumluId: ikinciKullanici,
      gerekce: 'Sorumlu devredildi',
    });
    expect(s.ok).toBe(true);

    const iz = await izVarMi('MaddeDurumu', md.id, 'sorumluId');
    expect(iz).not.toBeNull();
    expect(iz!.yeniDeger).toBe(ikinciKullanici);
  });
});

/* Geçici depo kökü ve veritabanı kopyası ürünün dışındadır; test
   bitince silinir. Üründen bir şey okunmaz, ürüne bir şey yazılmaz. */
afterAll(async () => {
  await rm(depoKoku, { recursive: true, force: true });
  await rm(dizin, { recursive: true, force: true });
});
