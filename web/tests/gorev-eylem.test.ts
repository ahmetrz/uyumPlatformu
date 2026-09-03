import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Görev ve onay merkezi — GERÇEK veritabanı, GERÇEK yetki kapısı

   `lib/eylemler2/gorev.ts` üç eylem taşır ve kapsam %56,66'ydı. Onay
   merkezi, ürünün "karar" katmanıdır: bulgu kapanışı, risk kabulü,
   istisna, proje adaylığı — hepsi buradan geçer.

   Ölçülen kurallar:
     1. KAPSAM — tesise kısıtlı rol kendi tesisine görev açabilmeli,
        başkasına açamamalı; TESİSSİZ (kurumsal) görev de açamamalı.
     2. SAHİPLİK — sorumlusu atanmış bir görevi yalnız sorumlusu ya da
        uyum onay yetkisi olan kapatır. Aksi hâlde herkes başkasının
        görevini "tamamlandı" yapabilirdi.
     3. DÖRT GÖZ — talebi açan kendi talebini karara bağlayamaz.
     4. RED GEREKÇESİZ OLMAZ — onay gerekçesiz verilebilir, red veremez:
        reddin niçini kayıtta durmalıdır.
     5. BİR TALEP İKİ KEZ KARARA BAĞLANMAZ.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-gorev-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

type Yetki = {
  rol: string; surecId: string | null; tesisId: string | null;
  tuzelKisiId: string | null; regulasyonId: string | null; modul: string | null;
};
const yetki = (rol: string, tesisId: string | null = null): Yetki => ({
  rol, surecId: null, tesisId, tuzelKisiId: null, regulasyonId: null, modul: null,
});

const oturum = {
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 'gorev@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { gorevOlustur, gorevDurum, onayKarar } = await import('@/lib/eylemler2/gorev');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

/** Belirli bir kimlik (id + yetkiler) ile koşar, sonra eskisine döner. */
async function kimlikle<T>(
  yetkiler: Yetki[], is: () => Promise<T>, id?: string,
): Promise<T> {
  const onceki = { id: oturum.id, yetkiler: oturum.yetkiler };
  oturum.yetkiler = yetkiler;
  if (id) oturum.id = id;
  try { return await is(); } finally {
    oturum.id = onceki.id; oturum.yetkiler = onceki.yetkiler;
  }
}

let benId = '';
let otekiId = '';
let tesisA = '';
let tesisB = '';

async function gorevAc(ek: Partial<Parameters<typeof gorevOlustur>[0]> = {}) {
  const baslik = benzersiz('Test görevi');
  expect(hataMetni(await gorevOlustur({
    baslik, tip: 'manuel', tesisId: tesisA, ...ek,
  }))).toBe('');
  return db.gorev.findFirstOrThrow({ where: { baslik } });
}

/** Bekleyen onay talebi açar; `talepEdenId` verilmezse oturum sahibi açar. */
async function talepAc(talepEdenId = benId, tip = 'istisna') {
  return db.onayTalebi.create({ data: {
    tip, kaynakTipi: 'Test', kaynakId: benzersiz('kyn'),
    ozet: 'Test talebi', talepEdenId, durum: 'bekliyor',
  } });
}

beforeAll(async () => {
  const kisiler = await db.kullanici.findMany({
    where: { aktif: true }, select: { id: true }, take: 2, orderBy: { id: 'asc' },
  });
  [benId, otekiId] = kisiler.map((x) => x.id);
  oturum.id = benId;
  const tesisler = await db.tesis.findMany({ select: { id: true }, take: 2, orderBy: { kod: 'asc' } });
  [tesisA, tesisB] = tesisler.map((t) => t.id);
});

describe('Görev açma', () => {
  it('elle açılan görev otomatik üretilmiş SAYILMAZ', async () => {
    /* `otomatikUretildi` bayrağı motorların ürettiği görevleri elle
       açılanlardan ayırır; karışırsa motor kendi üretmediği bir görevi
       kapatmaya çalışır. */
    const g = await gorevAc();
    expect(g.otomatikUretildi).toBe(false);
    expect(g.durum).toBe('acik');
  });

  it('geçersiz görev tipi reddedilir', async () => {
    expect(hataMetni(await gorevOlustur({
      baslik: benzersiz('x'), tip: 'uydurma_tip', tesisId: tesisA,
    }))).toMatch(/geçersiz görev tipi/i);
  });

  it('boş başlık reddedilir', async () => {
    expect(hataMetni(await gorevOlustur({ baslik: '   ', tip: 'manuel', tesisId: tesisA })))
      .not.toBe('');
  });

  it('PASİF kullanıcı sorumlu atanamaz', async () => {
    // Pasif sorumlu, kimsenin bakmadığı bir görev demektir.
    const pasif = await db.kullanici.create({ data: {
      adSoyad: 'Pasif Kişi', eposta: benzersiz('pasif') + '@test', aktif: false,
    } });
    expect(hataMetni(await gorevOlustur({
      baslik: benzersiz('x'), tip: 'manuel', tesisId: tesisA, sorumluId: pasif.id,
    }))).toMatch(/pasif/i);
  });

  it('olmayan tesise görev açılamaz', async () => {
    expect(hataMetni(await gorevOlustur({
      baslik: benzersiz('x'), tip: 'manuel', tesisId: 'yok-boyle-bir-id',
    }))).toMatch(/bulunamadı/i);
  });
});

describe('Kapsam kapısı', () => {
  it('tesise kısıtlı rol KENDİ tesisine görev açabilir', async () => {
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => gorevOlustur({
      baslik: benzersiz('Kendi tesisi'), tip: 'manuel', tesisId: tesisA,
    }));
    expect(hataMetni(sonuc)).toBe('');
  });

  it('tesise kısıtlı rol BAŞKA tesise görev açamaz', async () => {
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => gorevOlustur({
      baslik: benzersiz('Başka tesis'), tip: 'manuel', tesisId: tesisB,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });

  it('tesise kısıtlı rol TESİSSİZ görev açamaz', async () => {
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => gorevOlustur({
      baslik: benzersiz('Kurumsal'), tip: 'manuel',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });

  it('tesise kısıtlı rol BAŞKA tesisin görevinin durumunu değiştiremez', async () => {
    const g = await gorevAc({ tesisId: tesisB });
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => gorevDurum({
      id: g.id, durum: 'tamamlandi',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
    expect((await db.gorev.findUniqueOrThrow({ where: { id: g.id } })).durum).toBe('acik');
  });
});

describe('Görev durumu — sahiplik', () => {
  it('kapsam dışı görev için DURUM KEHANETİ vermez', async () => {
    /* "Zaten bu durumda" kısa yolu kapsam denetiminden önce koşsaydı,
       kapsam dışı bir çağrı durumu doğru tahmin edince `tamam()`, yanlış
       tahmin edince yetki hatası alırdı; ikisinin farkı başka santralin
       görev durumunu ele verirdi. İKİ tahmin de aynı yanıtı vermeli. */
    const g = await gorevAc({ tesisId: tesisB });   // durumu 'acik'
    const dogruTahmin = await kimlikle([yetki('tesis_yoneticisi', tesisA)],
      () => gorevDurum({ id: g.id, durum: 'acik' }));
    const yanlisTahmin = await kimlikle([yetki('tesis_yoneticisi', tesisA)],
      () => gorevDurum({ id: g.id, durum: 'tamamlandi' }));
    expect(hataMetni(dogruTahmin)).toMatch(/yetki/i);
    expect(hataMetni(yanlisTahmin)).toMatch(/yetki/i);
  });

  it('sorumlusuz görevi uyum yazma yetkisi olan kapatabilir', async () => {
    const g = await gorevAc();
    expect(hataMetni(await gorevDurum({ id: g.id, durum: 'tamamlandi' }))).toBe('');
    const sonra = await db.gorev.findUniqueOrThrow({ where: { id: g.id } });
    expect(sonra.durum).toBe('tamamlandi');
    expect(sonra.kapanis).not.toBeNull();
  });

  it('BAŞKASININ görevini yazma yetkisi tek başına kapatamaz', async () => {
    /* Sorumlusu atanmış bir görevi herkes kapatabilseydi, "tamamlandı"
       kaydı kimin işi olduğunu söylemezdi. */
    const g = await gorevAc({ sorumluId: otekiId });
    const sonuc = await kimlikle([yetki('bt_yoneticisi')], () => gorevDurum({
      id: g.id, durum: 'tamamlandi',
    }), benId);
    expect(hataMetni(sonuc)).toMatch(/yalnız sorumlusu/i);
    expect((await db.gorev.findUniqueOrThrow({ where: { id: g.id } })).durum).toBe('acik');
  });

  it('SORUMLUSU kendi görevini kapatabilir', async () => {
    const g = await gorevAc({ sorumluId: otekiId });
    const sonuc = await kimlikle([yetki('bt_yoneticisi')], () => gorevDurum({
      id: g.id, durum: 'tamamlandi',
    }), otekiId);
    expect(hataMetni(sonuc)).toBe('');
  });

  it('uyum ONAY yetkisi olan başkasının görevini kapatabilir', async () => {
    const g = await gorevAc({ sorumluId: otekiId });
    expect(hataMetni(await gorevDurum({ id: g.id, durum: 'iptal' }))).toBe('');
  });

  it('yeniden açılış KAPANIŞ DAMGASINI siler', async () => {
    // Damga kalsaydı görev hem açık hem kapanmış görünürdü.
    const g = await gorevAc();
    await gorevDurum({ id: g.id, durum: 'tamamlandi' });
    expect(hataMetni(await gorevDurum({ id: g.id, durum: 'acik' }))).toBe('');
    expect((await db.gorev.findUniqueOrThrow({ where: { id: g.id } })).kapanis).toBeNull();
  });

  it('aynı duruma geçiş iz bırakmaz', async () => {
    const g = await gorevAc();
    const once = await db.aktiviteKaydi.count({ where: { varlikTipi: 'Gorev', varlikId: g.id } });
    expect(hataMetni(await gorevDurum({ id: g.id, durum: 'acik' }))).toBe('');
    expect(await db.aktiviteKaydi.count({ where: { varlikTipi: 'Gorev', varlikId: g.id } }))
      .toBe(once);
  });

  it('geçersiz durum reddedilir', async () => {
    const g = await gorevAc();
    expect(hataMetni(await gorevDurum({ id: g.id, durum: 'belki' })))
      .toMatch(/geçersiz görev durumu/i);
  });
});

describe('Onay kararı', () => {
  it('DÖRT GÖZ: kendi açtığı talebi karara bağlayamaz', async () => {
    /* Onay merkezinin var olma sebebi bu: talebi açan onaylayamaz. Kural
       düşerse istisna, risk kabulü ve bulgu kapanışı tek imzayla geçer. */
    const talep = await talepAc(benId);
    expect(hataMetni(await onayKarar({ id: talep.id, karar: 'onaylandi' })))
      .toMatch(/dört göz/i);
    expect((await db.onayTalebi.findUniqueOrThrow({ where: { id: talep.id } })).durum)
      .toBe('bekliyor');
  });

  it('BAŞKASININ talebi karara bağlanır ve onaylayan yazılır', async () => {
    const talep = await talepAc(otekiId);
    expect(hataMetni(await onayKarar({ id: talep.id, karar: 'onaylandi' }))).toBe('');
    const sonra = await db.onayTalebi.findUniqueOrThrow({ where: { id: talep.id } });
    expect(sonra.durum).toBe('onaylandi');
    expect(sonra.onaylayanId).toBe(benId);
    expect(sonra.kapanis).not.toBeNull();
  });

  it('RED GEREKÇESİZ verilemez', async () => {
    const talep = await talepAc(otekiId);
    expect(hataMetni(await onayKarar({ id: talep.id, karar: 'reddedildi' })))
      .toMatch(/gerekçesiz/i);
    expect(hataMetni(await onayKarar({ id: talep.id, karar: 'reddedildi', gerekce: '  ' })))
      .toMatch(/gerekçesiz/i);
    expect((await db.onayTalebi.findUniqueOrThrow({ where: { id: talep.id } })).durum)
      .toBe('bekliyor');
  });

  it('gerekçeli red kabul edilir ve gerekçe kayıtta kalır', async () => {
    const talep = await talepAc(otekiId);
    expect(hataMetni(await onayKarar({
      id: talep.id, karar: 'reddedildi', gerekce: 'telafi kontrolü yetersiz',
    }))).toBe('');
    const sonra = await db.onayTalebi.findUniqueOrThrow({ where: { id: talep.id } });
    expect(sonra.durum).toBe('reddedildi');
    expect(sonra.gerekce).toBe('telafi kontrolü yetersiz');
  });

  it('bir talep İKİ KEZ karara bağlanamaz', async () => {
    const talep = await talepAc(otekiId);
    expect(hataMetni(await onayKarar({ id: talep.id, karar: 'onaylandi' }))).toBe('');
    expect(hataMetni(await onayKarar({ id: talep.id, karar: 'reddedildi', gerekce: 'olmaz' })))
      .toMatch(/zaten karara bağlanmış/i);
  });

  it('geçersiz karar reddedilir', async () => {
    const talep = await talepAc(otekiId);
    expect(hataMetni(await onayKarar({ id: talep.id, karar: 'belki' })))
      .toMatch(/geçersiz karar/i);
  });

  it('olmayan talep karara bağlanamaz', async () => {
    expect(hataMetni(await onayKarar({ id: 'yok-boyle-bir-id', karar: 'onaylandi' })))
      .toMatch(/bulunamadı/i);
  });

  it('yonetim/onay yoksa TALEBİN MODÜLÜNDEKİ onay yetkisi kabul edilir', async () => {
    /* `risk_kabul` tipindeki talebi risk/onay yetkisi olan karara
       bağlayabilir; yönetim onayı şart değildir. */
    const talep = await talepAc(otekiId, 'risk_kabul');
    const sonuc = await kimlikle([yetki('denetim_sorumlusu')], () => onayKarar({
      id: talep.id, karar: 'reddedildi', gerekce: 'risk kabul edilemez',
    }), benId);
    // denetim_sorumlusu risk modülünde onay TAŞIMAZ → reddedilmeli.
    expect(hataMetni(sonuc)).toMatch(/yetki/i);

    const sonuc2 = await kimlikle([yetki('yonetici')], () => onayKarar({
      id: talep.id, karar: 'reddedildi', gerekce: 'risk kabul edilemez',
    }), benId);
    expect(hataMetni(sonuc2)).toBe('');
  });

  it('okuyucu rolü karar veremez', async () => {
    const talep = await talepAc(otekiId);
    const sonuc = await kimlikle([yetki('okuyucu')], () => onayKarar({
      id: talep.id, karar: 'onaylandi',
    }), benId);
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });
});
