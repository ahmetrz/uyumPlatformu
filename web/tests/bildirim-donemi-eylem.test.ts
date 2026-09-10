import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ogeKimligi } from './yardim/kapsam';

/* ═══════════════════════════════════════════════════════════════════════
   R10+ · TAKVİM TETİKLİ YÜKÜMLÜLÜK — İNSAN KARARI [OLY-BIL-008]

   Motorun açtığı dönemi kapatan üç karar burada ölçülür. Saf kapılar
   `bildirim-donemi.test.ts`te; buradaki iddia EYLEM KATMANININ kendisi:
   yetki kapısı gerçekten kapsamsız mı soruyor, yazma ile denetim izi TEK
   işlemde mi, eşzamanlı iki karar sessizce ezişiyor mu.

   Motor ve eylem SAHTELENMEZ: gerçek veritabanına karşı koşar.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-donem-eylem-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

type Yetki = {
  rol: string; surecId: string | null; kapsamOgesiId: string | null; tesisId: string | null;
  tuzelKisiId: string | null; regulasyonId: string | null; modul: string | null;
};
const yetki = (rol: string, tesisId: string | null = null): Yetki => ({
  rol, surecId: null, kapsamOgesiId: ogeKimligi(tesisId), tesisId,
  tuzelKisiId: null, regulasyonId: null, modul: null,
});

const oturum = {
  id: '', adSoyad: 'Dönem Testi', eposta: 'donem@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const {
  donemVerildiIsaretle, donemTeyitIsaretle, donemUygulanmazIsaretle,
} = await import('@/lib/eylemler2/bildirimDonemi');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

const GUN = 24 * 3_600_000;
const damga = Date.now();
let yukumlulukId = '';
let tesisId = '';

/** Her vaka KENDİ dönemini açar: bir vakanın kapattığı dönem ötekini bozmasın. */
async function donemAc(etiket: string, ek: Record<string, unknown> = {}) {
  return db.bildirimDonemi.create({
    data: {
      yukumlulukId,
      donemEtiketi: `${etiket}-${damga}`,
      baslangic: new Date(Date.now() - 400 * GUN),
      bitis: new Date(Date.now() - 30 * GUN),
      sonTarih: new Date(Date.now() + 10 * GUN),
      durum: 'acik',
      ...ek,
    },
    select: { id: true, durum: true },
  });
}

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({
    where: { aktif: true }, select: { id: true, eposta: true },
  });
  oturum.id = kisi.id;
  oturum.eposta = kisi.eposta;
  tesisId = (await db.tesis.findFirstOrThrow({ select: { id: true } })).id;

  yukumlulukId = (await db.bildirimYukumlulugu.create({
    data: {
      kod: `D-EYLEM-${damga}`, ad: 'Kurgusal yıllık rapor', merci: 'Kurgusal Kurum',
      dayanak: 'Kurgusal dayanak — ölçüm için', tetikleyici: 'takvim',
      asgariSiddet: 'dusuk', sureSaat: null,
      donem: 'yillik', donemBaslangici: '01-01', teslimGun: 30, aktif: true,
    },
  })).id;
});

afterAll(async () => {
  await db.bildirimDonemi.deleteMany({ where: { yukumlulukId } });
  await db.bildirimYukumlulugu.deleteMany({ where: { id: yukumlulukId } });
  await rm(dizin, { recursive: true, force: true });
});

describe('teslim REFERANSSIZ kapanmaz [OLY-BIL-008]', () => {
  it('referans boşken istek reddedilir ve dönem DEĞİŞMEZ [OLY-BIL-008]', async () => {
    const d = await donemAc('bos-referans');
    const s = await donemVerildiIsaretle({ donemId: d.id, referansNo: '   ' });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('referans numarası zorunlu');
    const sonra = await db.bildirimDonemi.findUniqueOrThrow({ where: { id: d.id } });
    expect(sonra.durum).toBe('acik');
    expect(sonra.referansNo).toBeNull();
    expect(sonra.verenId).toBeNull();
  });

  it('referans verilince geçer ve iz REFERANSI taşır [OLY-BIL-008]', async () => {
    const d = await donemAc('referansli');
    expect((await donemVerildiIsaretle({ donemId: d.id, referansNo: 'REF-2026-1' })).ok)
      .toBe(true);
    const sonra = await db.bildirimDonemi.findUniqueOrThrow({ where: { id: d.id } });
    expect(sonra.durum).toBe('verildi');
    expect(sonra.referansNo).toBe('REF-2026-1');
    expect(sonra.verenId).toBe(oturum.id);
    expect(sonra.verilmeZamani).not.toBeNull();

    const iz = await db.aktiviteKaydi.findFirstOrThrow({
      where: { varlikTipi: 'BildirimDonemi', varlikId: d.id },
      orderBy: { zaman: 'desc' },
    });
    expect(iz.aktorId).toBe(oturum.id);
    expect(iz.gerekce).toContain('REF-2026-1');
    expect(iz.yeniDeger).toBe('Verildi');
  });

  it('SÜRESİ GEÇMİŞ dönem verilebilir; gecikme ize ADIYLA yazılır [OLY-BIL-008]', async () => {
    /* Gecikmiş bir rapor verilmiş sayılmalıdır — kapatan şey teslimin
       kendisidir, zamanında olması değil. Ama "verildi" tek başına
       zamanında verildiğini söylememeli. */
    const d = await donemAc('gecikmis', {
      durum: 'suresi_gecti', sonTarih: new Date(Date.now() - 5 * GUN),
    });
    expect((await donemVerildiIsaretle({ donemId: d.id, referansNo: 'REF-GEC' })).ok).toBe(true);
    const iz = await db.aktiviteKaydi.findFirstOrThrow({
      where: { varlikTipi: 'BildirimDonemi', varlikId: d.id },
      orderBy: { zaman: 'desc' },
    });
    expect(iz.gerekce).toContain('SÜRESİ GEÇTİKTEN SONRA');
    expect(iz.oncekiDeger).toBe('SÜRE GEÇTİ — rapor hâlâ verilmedi');
  });

  it('olmayan kanıt bağlanamaz — dönem AÇIK kalır [OLY-BIL-008]', async () => {
    const d = await donemAc('kanitsiz');
    const s = await donemVerildiIsaretle({
      donemId: d.id, referansNo: 'REF-X', kanitId: 'yok-boyle-bir-kanit',
    });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('kanıt');
    expect((await db.bildirimDonemi.findUniqueOrThrow({ where: { id: d.id } })).durum)
      .toBe('acik');
  });
});

describe('teyit ve uygulanmaz kapıları [OLY-BIL-008]', () => {
  it('teyit VERİLMEMİŞ döneme işlenemez [OLY-BIL-008]', async () => {
    const d = await donemAc('teyit-erken');
    const s = await donemTeyitIsaretle({ donemId: d.id });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('önce teslimin işaretlenmesi');
    expect((await db.bildirimDonemi.findUniqueOrThrow({ where: { id: d.id } })).durum)
      .toBe('acik');
  });

  it('verilmiş dönem teyit alır [OLY-BIL-008]', async () => {
    const d = await donemAc('teyit-dogru', {
      durum: 'verildi', referansNo: 'REF-T', verilmeZamani: new Date(),
    });
    expect((await donemTeyitIsaretle({ donemId: d.id })).ok).toBe(true);
    const sonra = await db.bildirimDonemi.findUniqueOrThrow({ where: { id: d.id } });
    expect(sonra.durum).toBe('teyit_alindi');
    expect(sonra.teyitZamani).not.toBeNull();
  });

  it('uygulanmaz GEREKÇESİZ kapatılamaz [OLY-BIL-008]', async () => {
    const d = await donemAc('gerekcesiz');
    const s = await donemUygulanmazIsaretle({ donemId: d.id, gerekce: 'kısa' });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('Gerekçe zorunlu');
    expect((await db.bildirimDonemi.findUniqueOrThrow({ where: { id: d.id } })).durum)
      .toBe('acik');
  });

  it('uygulanmaz dönem SİLİNMEZ, gerekçesiyle durur [OLY-BIL-008]', async () => {
    const d = await donemAc('uygulanmaz');
    const gerekce = 'Tesis bu dönemde lisans kapsamı dışındaydı';
    expect((await donemUygulanmazIsaretle({ donemId: d.id, gerekce })).ok).toBe(true);
    const sonra = await db.bildirimDonemi.findUniqueOrThrow({ where: { id: d.id } });
    expect(sonra.durum).toBe('uygulanmaz');
    expect(sonra.uygulanmazGerekcesi).toBe(gerekce);
  });

  it('KAPANMIŞ dönem yeniden kapatılamaz [OLY-BIL-008]', async () => {
    const d = await donemAc('kapali', {
      durum: 'teyit_alindi', referansNo: 'REF-K', teyitZamani: new Date(),
    });
    const s = await donemVerildiIsaretle({ donemId: d.id, referansNo: 'REF-YENI' });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('zaten kapandı');
  });
});

describe('kapsam ve eşzamanlılık [OLY-BIL-008]', () => {
  it('TESİSE KISITLI rol kurumsal takvim yükümlülüğüne DOKUNAMAZ [OLY-BIL-008]', async () => {
    /* Ekranın kapısıyla birebir aynı kural: takvim yükümlülüğü kurumsal,
       kapı KAPSAMSIZ sorulur. Tek tesise yetkili bir dış denetçinin
       kurumun raporlama durumunu kapatabilmesi, kapsam sınırını takvim
       üzerinden delmek olurdu (#48 dışa aktarım bulgusunun aynısı). */
    const d = await donemAc('kapsam');
    const eski = oturum.yetkiler;
    oturum.yetkiler = [yetki('yonetici', tesisId)];
    try {
      const s = await donemVerildiIsaretle({ donemId: d.id, referansNo: 'REF-KAPSAM' });
      expect(s.ok).toBe(false);
      expect((await db.bildirimDonemi.findUniqueOrThrow({ where: { id: d.id } })).durum)
        .toBe('acik');
    } finally {
      oturum.yetkiler = eski;
    }
  });

  it('EŞZAMANLI iki karar: biri geçer, öbürü SESSİZCE EZİLMEZ [OLY-BIL-008]', async () => {
    /* #47 turu 2'nin dönem tarafındaki karşılığı. Sıralı çağrı bunu
       ölçmez — ilk çağrı bitince kapı zaten reddeder; yarış `Promise.all`
       ile kurulur. */
    const d = await donemAc('yaris');
    const [a, b] = await Promise.all([
      donemVerildiIsaretle({ donemId: d.id, referansNo: 'REF-A' }),
      donemUygulanmazIsaretle({ donemId: d.id, gerekce: 'Bu dönem uygulanmaz sayıldı' }),
    ]);
    const gecen = [a, b].filter((s) => s.ok);
    expect(gecen, 'iki karar da geçti — biri sessizce ezildi').toHaveLength(1);

    const sonra = await db.bildirimDonemi.findUniqueOrThrow({ where: { id: d.id } });
    /* İz TEK olmalı: kaybeden çağrı geri alındıysa izi de gitmiştir. */
    const izler = await db.aktiviteKaydi.findMany({
      where: { varlikTipi: 'BildirimDonemi', varlikId: d.id, alan: 'durum' },
    });
    expect(izler).toHaveLength(1);
    expect(izler[0].yeniDeger).toBe(sonra.durum === 'verildi' ? 'Verildi' : 'Uygulanmaz');
  });
});
