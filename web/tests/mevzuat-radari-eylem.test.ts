import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   R1 · MEVZUAT RADARI · İNSAN KARARLARI [MEV-RAD-002]

   Motorun yapamadıkları burada ölçülür: adayı karara bağlamak ve
   taramayı açıp kapatmak. Üç iddia sınanır ve üçü de ekranda yazılıdır
   (R-F): gerekçe zorunlu · engelli kaynakta tarama AÇILAMAZ · kapsam
   KURUMSALDIR (tesise kısıtlı rol geçmez).
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-radar-eylem-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db } = await import('@/lib/db');
const { adayIlgisiz, adayIncelendi, taramayiAyarla } = await import('@/lib/eylemler2/mevzuatRadari');

const damga = Date.now();
let kaynakId = '';
let engelliKaynakId = '';
let adayId = '';
let ikinciAdayId = '';
let kullaniciId = '';

/* Tam yetkili kurgusal oturum — kapsam iddiasını ayrıca ölçeceğiz. */
const oturum = {
  id: '', adSoyad: 'Kurgusal Uyum', eposta: `radar-${damga}@kurgusal.local`,
  unvan: null,
  yetkiler: [{ rol: 'yonetici', modul: null as string | null, tesisId: null as string | null,
    surecId: null as string | null, regulasyonId: null as string | null }],
};
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

beforeAll(async () => {
  kullaniciId = (await db.kullanici.create({
    data: { eposta: oturum.eposta, adSoyad: 'Kurgusal Uyum', aktif: true },
  })).id;
  oturum.id = kullaniciId;

  kaynakId = (await db.mevzuatKaynagi.create({
    data: {
      kod: `MEV-EYL-${damga}`, ad: 'Kurgusal kaynak',
      yayinKanali: 'https://kurgusal-merci.ornek/duyuru', tur: 'liste',
    },
  })).id;
  engelliKaynakId = (await db.mevzuatKaynagi.create({
    data: {
      kod: `MEV-EYL-ENG-${damga}`, ad: 'Kurgusal engelli kaynak',
      yayinKanali: 'https://kapali-merci.ornek/duyuru', tur: 'liste',
      durum: 'engelli', durumNotu: 'Kaynak otomatik erişime kapalı.',
    },
  })).id;
  adayId = (await db.mevzuatDegisiklikAdayi.create({
    data: { kaynakId, url: `https://kurgusal-merci.ornek/d/${damga}`, baslik: 'Kurgusal değişiklik' },
  })).id;
  ikinciAdayId = (await db.mevzuatDegisiklikAdayi.create({
    data: { kaynakId, url: `https://kurgusal-merci.ornek/d/${damga}-2`, baslik: 'Kurgusal ikinci' },
  })).id;
});

afterAll(async () => {
  await rm(dizin, { recursive: true, force: true });
  expect(existsSync(dizin), 'geçici veritabanı dizini silinmedi').toBe(false);
});

describe('aday kararı [MEV-RAD-002]', () => {
  it('GEREKÇESİZ karar REDDEDİLİR ve aday DEĞİŞMEZ [MEV-RAD-002]', async () => {
    const s = await adayIlgisiz({ adayId, gerekce: '' });
    expect(s.ok).toBe(false);
    const a = await db.mevzuatDegisiklikAdayi.findUniqueOrThrow({ where: { id: adayId } });
    expect(a.durum).toBe('yeni');
    expect(a.kararVerenId).toBeNull();
  });

  it('BOŞLUKLA doldurulan gerekçe de geçmez [MEV-RAD-002]', async () => {
    const s = await adayIlgisiz({ adayId, gerekce: '            ' });
    expect(s.ok).toBe(false);
    expect((await db.mevzuatDegisiklikAdayi.findUniqueOrThrow({ where: { id: adayId } })).durum)
      .toBe('yeni');
  });

  it('GEREKÇELİ karar geçer ve İZ bırakır [MEV-RAD-002]', async () => {
    const s = await adayIncelendi({ adayId, gerekce: 'Kurgusal inceleme notu — kapsamı etkiliyor.' });
    expect(s.ok).toBe(true);
    const a = await db.mevzuatDegisiklikAdayi.findUniqueOrThrow({ where: { id: adayId } });
    expect(a.durum).toBe('incelendi');
    expect(a.kararVerenId).toBe(kullaniciId);
    const iz = await db.aktiviteKaydi.findFirstOrThrow({
      where: { varlikTipi: 'MevzuatDegisiklikAdayi', varlikId: adayId },
      orderBy: { zaman: 'desc' },
    });
    expect(iz.gerekce).toContain('Kurgusal inceleme');
  });

  it('KARARA BAĞLANMIŞ aday ikinci kez karara bağlanmaz [MEV-RAD-002]', async () => {
    const s = await adayIlgisiz({ adayId, gerekce: 'Kurgusal ikinci karar denemesi.' });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toContain('zaten');
  });

  it('"İLGİSİZ" de bir karardır ve gerekçesiyle yazılır [MEV-RAD-002]', async () => {
    const s = await adayIlgisiz({ adayId: ikinciAdayId, gerekce: 'Kurgusal: kapsamımız dışında.' });
    expect(s.ok).toBe(true);
    const a = await db.mevzuatDegisiklikAdayi.findUniqueOrThrow({ where: { id: ikinciAdayId } });
    expect(a.durum).toBe('ilgisiz');
    expect(a.gerekce).toContain('kapsamımız dışında');
  });
});

describe('tarama kararı [MEV-RAD-002]', () => {
  it('ENGELLİ kaynakta tarama AÇILAMAZ [MEV-RAD-002]', async () => {
    /* Kaynak otomatik erişime kapalı diyorsa ürün bu engeli AŞMAZ —
       ekranda yazan cümlenin gerçek yolu budur. */
    const s = await taramayiAyarla({
      kaynakId: engelliKaynakId, etkin: true, gerekce: 'Kurgusal açma denemesi.',
    });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toContain('engelli');
    expect((await db.mevzuatKaynagi.findUniqueOrThrow({ where: { id: engelliKaynakId } })).etkin)
      .toBe(false);
  });

  it('GEREKÇESİZ açma REDDEDİLİR [MEV-RAD-002]', async () => {
    const s = await taramayiAyarla({ kaynakId, etkin: true, gerekce: 'kısa' });
    expect(s.ok).toBe(false);
    expect((await db.mevzuatKaynagi.findUniqueOrThrow({ where: { id: kaynakId } })).etkin)
      .toBe(false);
  });

  it('GEREKÇELİ açma geçer ve İZ bırakır [MEV-RAD-002]', async () => {
    const s = await taramayiAyarla({
      kaynakId, etkin: true, gerekce: 'Kurgusal: kurulum bu kanalı izlemeye karar verdi.',
    });
    expect(s.ok).toBe(true);
    expect((await db.mevzuatKaynagi.findUniqueOrThrow({ where: { id: kaynakId } })).etkin).toBe(true);
    const iz = await db.aktiviteKaydi.findFirstOrThrow({
      where: { varlikTipi: 'MevzuatKaynagi', varlikId: kaynakId },
      orderBy: { zaman: 'desc' },
    });
    expect(iz.oncekiDeger).toBe('false');
    expect(iz.yeniDeger).toBe('true');
  });

  it('ZATEN AÇIK kaynağı yeniden açmak REDDEDİLİR [MEV-RAD-002]', async () => {
    const s = await taramayiAyarla({ kaynakId, etkin: true, gerekce: 'Kurgusal tekrar denemesi.' });
    expect(s.ok).toBe(false);
  });
});

describe('KAPSAM kurumsaldır [MEV-RAD-002]', () => {
  it('tesise KISITLI rol karar veremez [MEV-RAD-002]', async () => {
    /* Bir tebliğ değişikliği KURUMUN meselesidir; kapı kapsamsız
       sorulur ve `kapsamUyar` gereği tesise kısıtlı rol geçmez —
       ekranın kapısıyla birebir aynı kural. */
    const eski = oturum.yetkiler;
    oturum.yetkiler = [{ rol: 'tesis_yoneticisi', modul: null, tesisId: 'kurgusal-tesis', surecId: null, regulasyonId: null }];
    const ucuncu = await db.mevzuatDegisiklikAdayi.create({
      data: { kaynakId, url: `https://kurgusal-merci.ornek/d/${damga}-3`, baslik: 'Kurgusal üçüncü' },
    });
    const s = await adayIncelendi({ adayId: ucuncu.id, gerekce: 'Kurgusal kapsam denemesi.' });
    oturum.yetkiler = eski;
    expect(s.ok).toBe(false);
    expect((await db.mevzuatDegisiklikAdayi.findUniqueOrThrow({ where: { id: ucuncu.id } })).durum)
      .toBe('yeni');
  });
});
