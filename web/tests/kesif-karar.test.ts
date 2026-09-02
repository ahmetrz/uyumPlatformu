import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Keşif inceleme kararları — GERÇEK veritabanı, GERÇEK yetki kapısı

   `kesifKarariVer` ve `kesifTopluKarar` **CMDB'ye yazan tek yoldur**.
   Keşif, dış bir kaynağın "şu cihazı gördüm" demesidir; kararı veren insan,
   o iddiayı kurumun envanterine geçirir. Yanlış karar burada verilirse
   envanter kaynağın söylediğine göre yeniden yazılır ve kimse fark etmez.

   Bu yüzden dört kural ölçülür:
     1. ONAY YETKİSİ — yazma yetmez. Envantere yazan bir karar imza ister.
     2. KAPSAM — karar kapsamı eşleşen varlığın tesisinden gelir; tesise
        kısıtlı rol kendi tesisinin kaydına karar verebilmeli, başkasının
        kaydına verememeli, TESİSSİZ kayda da verememeli.
     3. GEREKÇE ZORUNLU — kararın niçin verildiği izde durur.
     4. TOPLU KARARDA `yeni_varlik` YOK — tür/etiket kayıt bazında insan
        kararıdır; toplu onayla/reddet yalnız var olan eşleşmeyi kapatır.

   Toplu kararda ayrıca: bir kayıt düşerse ötekiler geri ALINMAZ, sonuç
   kayıt bazında raporlanır. Kısmi başarıyı "başarısız" sayıp hepsini geri
   almak, 25 kaydın 24'ünü boşuna yeniden inceletirdi.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kesif-'));
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
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 'kesif@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { kesifKarariVer, kesifTopluKarar } = await import('@/lib/eylemler2/kesif');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

let turId = '';
let tesisA = '';
let tesisB = '';

/** Belirli tesise ait bir varlık açar (keşif kaydının eşleşeceği hedef). */
async function varlikAc(tesisId: string | null) {
  return db.varlik.create({ data: {
    etiket: benzersiz('KSF-VRL'), ad: 'Keşif hedefi', turId, tesisId,
  } });
}

/** İnceleme bekleyen bir keşif kaydı açar; `varlikId` verilirse eşleşmiş olur. */
async function kesifAc(varlikId: string | null) {
  return db.kesifKaydi.create({ data: {
    kaynak: 'TEST-DISCOVERY', kaynakKayitId: benzersiz('kyt'),
    hamJson: JSON.stringify({ hostname: 'test-host' }),
    normalJson: JSON.stringify({ hostname: 'test-host' }),
    durum: 'inceleme_bekliyor', eslesenVarlikId: varlikId,
  } });
}

const izler = (kesifId: string) => db.aktiviteKaydi.findMany({
  where: { varlikTipi: 'KesifKaydi', varlikId: kesifId }, orderBy: { zaman: 'asc' },
});

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  oturum.id = kisi.id;
  turId = (await db.varlikTuru.findFirstOrThrow({ select: { id: true } })).id;
  const tesisler = await db.tesis.findMany({ select: { id: true }, take: 2, orderBy: { kod: 'asc' } });
  [tesisA, tesisB] = tesisler.map((t) => t.id);
});

describe('Tekil karar', () => {
  it('gerekçeli onay kaydı kapatır ve izi ONAY diye yazar', async () => {
    const kesif = await kesifAc((await varlikAc(tesisA)).id);
    expect(hataMetni(await kesifKarariVer({
      kesifId: kesif.id, karar: 'onayla', not: 'saha doğruladı',
    }))).toBe('');

    const kayit = await izler(kesif.id);
    expect(kayit.at(-1)?.eylem).toBe('onay');
    expect(kayit.at(-1)?.yeniDeger).toBe('onaylandi');
    expect(kayit.at(-1)?.gerekce).toBe('saha doğruladı');
  });

  it('ret izi RED diye yazılır', async () => {
    const kesif = await kesifAc((await varlikAc(tesisA)).id);
    expect(hataMetni(await kesifKarariVer({
      kesifId: kesif.id, karar: 'reddet', not: 'yinelenen kayıt',
    }))).toBe('');
    const kayit = await izler(kesif.id);
    expect(kayit.at(-1)?.eylem).toBe('red');
    expect(kayit.at(-1)?.yeniDeger).toBe('reddedildi');
  });

  it('GEREKÇESİZ karar verilemez', async () => {
    // Envantere yazan bir kararın niçin verildiği izde durmalı.
    const kesif = await kesifAc((await varlikAc(tesisA)).id);
    expect(hataMetni(await kesifKarariVer({
      kesifId: kesif.id, karar: 'onayla', not: '   ',
    }))).not.toBe('');
  });

  it('geçersiz karar reddedilir', async () => {
    const kesif = await kesifAc((await varlikAc(tesisA)).id);
    expect(hataMetni(await kesifKarariVer({
      kesifId: kesif.id, karar: 'belki' as 'onayla', not: 'a',
    }))).toMatch(/geçersiz karar/i);
  });

  it('olmayan keşif kaydına karar verilemez', async () => {
    expect(hataMetni(await kesifKarariVer({
      kesifId: 'yok-boyle-bir-id', karar: 'onayla', not: 'a',
    }))).toMatch(/bulunamadı/i);
  });
});

describe('Yetki — envantere yazan karar imza ister', () => {
  it('YAZMA yetkisi karar vermeye yetmez', async () => {
    /* `bt_yoneticisi` envanteri yazabilir ama keşif kararı veremez: karar,
       dış kaynağın iddiasını kurumun envanterine geçirmektir. */
    const kesif = await kesifAc((await varlikAc(tesisA)).id);
    const sonuc = await kimlikle([yetki('bt_yoneticisi')], () => kesifKarariVer({
      kesifId: kesif.id, karar: 'onayla', not: 'olur',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
    expect((await db.kesifKaydi.findUniqueOrThrow({ where: { id: kesif.id } })).durum)
      .toBe('inceleme_bekliyor');
  });

  it('okuyucu rolü karar veremez', async () => {
    const kesif = await kesifAc((await varlikAc(tesisA)).id);
    const sonuc = await kimlikle([yetki('okuyucu')], () => kesifKarariVer({
      kesifId: kesif.id, karar: 'reddet', not: 'olmaz',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });
});

describe('Kapsam kapısı', () => {
  it('tesise kısıtlı rol KENDİ tesisinin kaydına karar verebilir', async () => {
    const kesif = await kesifAc((await varlikAc(tesisA)).id);
    const sonuc = await kimlikle([yetki('yonetici', tesisA)], () => kesifKarariVer({
      kesifId: kesif.id, karar: 'onayla', not: 'kendi sahamız',
    }));
    expect(hataMetni(sonuc)).toBe('');
  });

  it('tesise kısıtlı rol BAŞKA tesisin kaydına karar veremez', async () => {
    const kesif = await kesifAc((await varlikAc(tesisB)).id);
    const sonuc = await kimlikle([yetki('yonetici', tesisA)], () => kesifKarariVer({
      kesifId: kesif.id, karar: 'onayla', not: 'başka saha',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
    expect((await db.kesifKaydi.findUniqueOrThrow({ where: { id: kesif.id } })).durum)
      .toBe('inceleme_bekliyor');
  });

  it('tesise kısıtlı rol TESİSSİZ kayda karar veremez', async () => {
    /* Eşleşmemiş keşif kaydının tesisi yoktur. Kapsam denetimi
       "tesis yoksa atla" diye yazılsaydı, tesise kısıtlı rol kurumun
       eşleşmemiş bütün keşif kuyruğuna karar verirdi. */
    const kesif = await kesifAc(null);
    const sonuc = await kimlikle([yetki('yonetici', tesisA)], () => kesifKarariVer({
      kesifId: kesif.id, karar: 'reddet', not: 'bilinmeyen cihaz',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });
});

describe('Toplu karar', () => {
  it('birden çok kaydı tek gerekçeyle kapatır ve izi TOPLU diye işaretler', async () => {
    const kesifler = await Promise.all([
      kesifAc((await varlikAc(tesisA)).id),
      kesifAc((await varlikAc(tesisA)).id),
    ]);
    expect(hataMetni(await kesifTopluKarar({
      kesifIdleri: kesifler.map((x) => x.id), karar: 'reddet', not: 'kapsam dışı ağ',
    }))).toBe('');

    for (const kesif of kesifler) {
      const kayit = await izler(kesif.id);
      expect(kayit.at(-1)?.eylem).toBe('red');
      expect(kayit.at(-1)?.gerekce).toContain('toplu karar');
    }
  });

  it('TEKRARLANAN kimlik iki kez işlenmez', async () => {
    // Aynı kayıt iki kez gelirse iki iz satırı düşerdi; kütük yalan söyler.
    const kesif = await kesifAc((await varlikAc(tesisA)).id);
    expect(hataMetni(await kesifTopluKarar({
      kesifIdleri: [kesif.id, kesif.id, kesif.id], karar: 'reddet', not: 'yinelenen',
    }))).toBe('');
    expect((await izler(kesif.id)).length).toBe(1);
  });

  it('`yeni_varlik` toplu yapılamaz', async () => {
    /* Tür ve etiket kayıt bazında insan kararıdır; toplu yeni varlık
       açmak, envantere isimsiz satırlar yığmanın en hızlı yoludur. */
    const kesif = await kesifAc(null);
    expect(hataMetni(await kesifTopluKarar({
      kesifIdleri: [kesif.id], karar: 'yeni_varlik' as 'onayla', not: 'a',
    }))).toMatch(/yalnız onayla\/reddet/i);
  });

  it('boş liste reddedilir', async () => {
    expect(hataMetni(await kesifTopluKarar({ kesifIdleri: [], karar: 'reddet', not: 'a' })))
      .toMatch(/en az bir kayıt/i);
  });

  it('bir kayıt düşerse ÖTEKİLER GERİ ALINMAZ — sonuç kayıt bazında raporlanır', async () => {
    const saglam = await kesifAc((await varlikAc(tesisA)).id);
    const sonuc = await kesifTopluKarar({
      kesifIdleri: [saglam.id, 'yok-boyle-bir-id'], karar: 'reddet', not: 'karışık parti',
    });
    expect(hataMetni(sonuc)).toMatch(/1 kayıt işlendi, 1 kayıt işlenemedi/);
    expect(hataMetni(sonuc)).toContain('yok-boyle-bir-id');
    // Sağlam kayıt gerçekten kapandı: kısmi başarı geri alınmadı.
    expect((await izler(saglam.id)).length).toBe(1);
  });

  it('toplu kararda da kapsam kayıt kayıt denetlenir', async () => {
    const kendi = await kesifAc((await varlikAc(tesisA)).id);
    const yabanci = await kesifAc((await varlikAc(tesisB)).id);
    const sonuc = await kimlikle([yetki('yonetici', tesisA)], () => kesifTopluKarar({
      kesifIdleri: [kendi.id, yabanci.id], karar: 'reddet', not: 'karışık kapsam',
    }));
    expect(hataMetni(sonuc)).toMatch(/tesis kapsamı dışında/);
    expect((await izler(kendi.id)).length).toBe(1);
    expect((await izler(yabanci.id)).length).toBe(0);
  });
});
