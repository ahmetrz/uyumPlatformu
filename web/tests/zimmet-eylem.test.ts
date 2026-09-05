import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   OT-09b · Zimmet eylemleri — sunucu tarafı

   Yetki kapısı SAHTELENMEZ: yalnız `aktifKullanici` değiştirilir. Motor da
   sahtelenmez; `zimmetSurelerini` gerçek veritabanına karşı koşar.

   Çivilenen kurallar:
     · talep açmak sahipliği DEĞİŞTİRMEZ,
     · bir zimmeti yalnız zimmetlenen kişi cevaplayabilir — atayan da,
       yönetici de EDEMEZ,
     · red gerekçe ister ve sahiplik önceki sahibine döner,
     · dönecek aktif kimse yoksa veri kalitesi bulgusu açılır,
     · aynı varlık için ikinci bekleyen talep VERİTABANINDA reddedilir,
     · kapsam dışı santralde talep açılamaz,
     · motor kimse adına KABUL ETMEZ,
     · her adım ayrı denetim izi bırakır.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-zimmet-'));
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
  id: '', adSoyad: 'Zimmet Testi', eposta: 'zimmet@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { zimmetAc, zimmetCevapla, zimmetIptal, topluZimmetAc } =
  await import('@/lib/eylemler2/zimmet');
const { zimmetSurelerini } = await import('@/lib/motorlar/zimmetSuresi');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

async function kimlikle<T>(
  id: string, yetkiler: Yetki[], is: () => Promise<T>,
): Promise<T> {
  const oncekiId = oturum.id;
  const oncekiYetki = oturum.yetkiler;
  oturum.id = id;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally {
    oturum.id = oncekiId;
    oturum.yetkiler = oncekiYetki;
  }
}

let atayan = '';
let atanan = '';
let ucuncu = '';
let tesisId = '';
let varlikId = '';

beforeAll(async () => {
  const kisiler = await db.kullanici.findMany({
    where: { aktif: true }, select: { id: true, eposta: true }, take: 3,
  });
  atayan = kisiler[0].id;
  atanan = kisiler[1].id;
  ucuncu = kisiler[2].id;
  oturum.id = atayan;
  oturum.eposta = kisiler[0].eposta;

  const v = await db.varlik.findFirst({
    where: { silindi: null, tesisId: { not: null } },
    select: { id: true, tesisId: true },
  });
  varlikId = v!.id;
  tesisId = v!.tesisId!;
});

afterAll(async () => { await rm(dizin, { recursive: true, force: true }); });

/** Her testten önce temiz zemin: bekleyen talep bırakmadan başla. */
beforeEach(async () => {
  await db.varlikAtamaTalebi.deleteMany({ where: { varlikId } });
  await db.varlik.update({ where: { id: varlikId }, data: { sahipId: atayan } });
  await db.kullanici.update({ where: { id: atanan }, data: { aktif: true } });
});

describe('Talep açmak sahipliği DEĞİŞTİRMEZ', () => {
  it('talep açılır ama varlığın sahibi aynı kalır [ZIM-ACT-001]', async () => {
    const r = await zimmetAc({ varlikId, atananId: atanan, not: 'saha devri' });
    expect(r.ok, hataMetni(r)).toBe(true);

    const v = await db.varlik.findUniqueOrThrow({
      where: { id: varlikId }, select: { sahipId: true },
    });
    expect(v.sahipId).toBe(atayan);

    const t = await db.varlikAtamaTalebi.findFirstOrThrow({ where: { varlikId } });
    expect(t.durum).toBe('bekliyor');
    expect(t.oncekiSahipId).toBe(atayan);
  });

  it('talep açılışı denetim izine düşer', async () => {
    const r = await zimmetAc({ varlikId, atananId: atanan });
    expect(r.ok).toBe(true);
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'VarlikAtamaTalebi', varlikId: r.id },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.eylem).toBe('olusturma');
  });

  it('kendine zimmet açılamaz', async () => {
    const r = await zimmetAc({ varlikId, atananId: atayan });
    expect(r.ok).toBe(false);
    expect(hataMetni(r)).toContain('Kendinize');
  });

  it('pasif kullanıcıya zimmet açılamaz', async () => {
    await db.kullanici.update({ where: { id: atanan }, data: { aktif: false } });
    const r = await zimmetAc({ varlikId, atananId: atanan });
    expect(r.ok).toBe(false);
    expect(hataMetni(r)).toContain('Pasif');
  });

  it('ikinci bekleyen talep açılamaz', async () => {
    expect((await zimmetAc({ varlikId, atananId: atanan })).ok).toBe(true);
    const r = await zimmetAc({ varlikId, atananId: ucuncu });
    expect(r.ok).toBe(false);
    expect(await db.varlikAtamaTalebi.count({ where: { varlikId, durum: 'bekliyor' } }))
      .toBe(1);
  });

  it('kısıt VERİTABANINDA durur — eşzamanlı iki yazma tek talep bırakır [ZIM-ACT-002]', async () => {
    /* Eylem kapısı atlanarak doğrudan yazılır: kural yalnız uygulamada
       olsaydı iki eşzamanlı istek iki talep açardı. */
    await db.varlikAtamaTalebi.create({
      data: {
        varlikId, atananId: atanan, atayanId: atayan,
        sonTarih: new Date(Date.now() + 86_400_000),
      },
    });
    await expect(db.varlikAtamaTalebi.create({
      data: {
        varlikId, atananId: ucuncu, atayanId: atayan,
        sonTarih: new Date(Date.now() + 86_400_000),
      },
    })).rejects.toThrow();
  });

  it('kapsam dışı santralde talep açılamaz', async () => {
    const baskaTesis = await db.tesis.findFirst({
      where: { id: { not: tesisId } }, select: { id: true },
    });
    const r = await kimlikle(atayan, [yetki('tesis_yoneticisi', baskaTesis!.id)],
      () => zimmetAc({ varlikId, atananId: atanan }));
    expect(r.ok).toBe(false);
  });
});

describe('Cevap — kimse başkası adına imza atamaz', () => {
  async function acilmisTalep() {
    const r = await zimmetAc({ varlikId, atananId: atanan });
    expect(r.ok, hataMetni(r)).toBe(true);
    return r.id!;
  }

  it('zimmetlenen kişi kabul edince sahiplik geçer [ZIM-CVP-001]', async () => {
    const id = await acilmisTalep();
    const r = await kimlikle(atanan, [yetki('yonetici')],
      () => zimmetCevapla({ talepId: id, kabul: true }));
    expect(r.ok, hataMetni(r)).toBe(true);

    const v = await db.varlik.findUniqueOrThrow({
      where: { id: varlikId }, select: { sahipId: true },
    });
    expect(v.sahipId).toBe(atanan);
  });

  it('ATAYAN kişi kabul EDEMEZ', async () => {
    const id = await acilmisTalep();
    const r = await zimmetCevapla({ talepId: id, kabul: true });
    expect(r.ok).toBe(false);
    expect(hataMetni(r)).toContain('yalnız zimmetlenen kişi');

    const v = await db.varlik.findUniqueOrThrow({
      where: { id: varlikId }, select: { sahipId: true },
    });
    expect(v.sahipId).toBe(atayan);
  });

  it('yönetici bile başkası adına kabul edemez [ZIM-CVP-004]', async () => {
    const id = await acilmisTalep();
    const r = await kimlikle(ucuncu, [yetki('yonetici')],
      () => zimmetCevapla({ talepId: id, kabul: true }));
    expect(r.ok).toBe(false);
  });

  it('kabul İKİ ayrı iz bırakır: talep durumu ve sahiplik', async () => {
    const id = await acilmisTalep();
    await kimlikle(atanan, [yetki('yonetici')],
      () => zimmetCevapla({ talepId: id, kabul: true }));

    const talepIzi = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'VarlikAtamaTalebi', varlikId: id, alan: 'durum' },
      orderBy: { zaman: 'desc' },
    });
    expect(talepIzi?.yeniDeger).toBe('kabul_edildi');

    const sahiplikIzi = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Varlik', varlikId, alan: 'sahipId' },
      orderBy: { zaman: 'desc' },
    });
    expect(sahiplikIzi?.yeniDeger).toBe(atanan);
  });

  it('gerekçesiz red reddedilir', async () => {
    const id = await acilmisTalep();
    const r = await kimlikle(atanan, [yetki('yonetici')],
      () => zimmetCevapla({ talepId: id, kabul: false }));
    expect(r.ok).toBe(false);
    expect(hataMetni(r)).toContain('gerekçe');
  });

  it('gerekçeli redde sahiplik önceki sahibine DÖNER [ZIM-CVP-002]', async () => {
    const id = await acilmisTalep();
    const r = await kimlikle(atanan, [yetki('yonetici')],
      () => zimmetCevapla({ talepId: id, kabul: false, not: 'Bu saha bende değil' }));
    expect(r.ok, hataMetni(r)).toBe(true);

    const v = await db.varlik.findUniqueOrThrow({
      where: { id: varlikId }, select: { sahipId: true },
    });
    expect(v.sahipId).toBe(atayan);
  });

  it('önceki sahip yoksa red SAHİPSİZ bırakır ve bulgu açar [ZIM-CVP-003]', async () => {
    await db.varlik.update({ where: { id: varlikId }, data: { sahipId: null } });
    const acilan = await zimmetAc({ varlikId, atananId: atanan });
    expect(acilan.ok, hataMetni(acilan)).toBe(true);

    const oncekiBulgu = await db.veriKalitesiBulgusu.count({
      where: { kural: 'sahipsiz_varlik', kaynakId: varlikId },
    });
    await kimlikle(atanan, [yetki('yonetici')],
      () => zimmetCevapla({ talepId: acilan.id!, kabul: false, not: 'kabul etmiyorum' }));

    expect(await db.veriKalitesiBulgusu.count({
      where: { kural: 'sahipsiz_varlik', kaynakId: varlikId },
    })).toBe(oncekiBulgu + 1);
  });

  it('kapanmış talep yeniden cevaplanamaz', async () => {
    const id = await acilmisTalep();
    await kimlikle(atanan, [yetki('yonetici')],
      () => zimmetCevapla({ talepId: id, kabul: true }));
    const r = await kimlikle(atanan, [yetki('yonetici')],
      () => zimmetCevapla({ talepId: id, kabul: false, not: 'fikrim değişti' }));
    expect(r.ok).toBe(false);
  });
});

describe('İptal', () => {
  it('atayan iptal edebilir ve sahiplik değişmez [ZIM-CVP-005]', async () => {
    const acilan = await zimmetAc({ varlikId, atananId: atanan });
    const r = await zimmetIptal({ talepId: acilan.id!, gerekce: 'yanlış kişi' });
    expect(r.ok, hataMetni(r)).toBe(true);

    const t = await db.varlikAtamaTalebi.findUniqueOrThrow({ where: { id: acilan.id! } });
    expect(t.durum).toBe('iptal_edildi');
    expect(t.iptalEdenId).toBe(atayan);

    const v = await db.varlik.findUniqueOrThrow({
      where: { id: varlikId }, select: { sahipId: true },
    });
    expect(v.sahipId).toBe(atayan);
  });

  it('iptalden sonra yeni talep açılabilir', async () => {
    const ilk = await zimmetAc({ varlikId, atananId: atanan });
    await zimmetIptal({ talepId: ilk.id! });
    const ikinci = await zimmetAc({ varlikId, atananId: ucuncu });
    expect(ikinci.ok, hataMetni(ikinci)).toBe(true);
  });
});

describe('Motor — kimse adına KABUL ETMEZ', () => {
  it('süresi geçen talep düşer ama sahiplik DEĞİŞMEZ [ZIM-SUR-001]', async () => {
    const acilan = await zimmetAc({ varlikId, atananId: atanan });
    await db.varlikAtamaTalebi.update({
      where: { id: acilan.id! },
      data: { sonTarih: new Date(Date.now() - 86_400_000) },
    });

    const kosu = await zimmetSurelerini();
    expect(kosu.suresiDolan).toBeGreaterThanOrEqual(1);

    const t = await db.varlikAtamaTalebi.findUniqueOrThrow({ where: { id: acilan.id! } });
    expect(t.durum).toBe('suresi_doldu');

    const v = await db.varlik.findUniqueOrThrow({
      where: { id: varlikId }, select: { sahipId: true },
    });
    expect(v.sahipId).toBe(atayan);
  });

  it('atanan pasifleşirse bekleyen talep düşer [ZIM-SUR-002]', async () => {
    const acilan = await zimmetAc({ varlikId, atananId: atanan });
    await db.kullanici.update({ where: { id: atanan }, data: { aktif: false } });

    await zimmetSurelerini();
    const t = await db.varlikAtamaTalebi.findUniqueOrThrow({ where: { id: acilan.id! } });
    expect(t.durum).toBe('iptal_edildi');
  });

  it('sahiplik başka yoldan değişirse bekleyen talep düşer', async () => {
    const acilan = await zimmetAc({ varlikId, atananId: atanan });
    await db.varlik.update({ where: { id: varlikId }, data: { sahipId: ucuncu } });

    await zimmetSurelerini();
    const t = await db.varlikAtamaTalebi.findUniqueOrThrow({ where: { id: acilan.id! } });
    expect(t.durum).toBe('iptal_edildi');
  });

  it('süre daralınca BİR KEZ uyarır — ikinci koşuda tekrar etmez [ZIM-SUR-003]', async () => {
    const acilan = await zimmetAc({ varlikId, atananId: atanan });
    await db.varlikAtamaTalebi.update({
      where: { id: acilan.id! },
      data: { sonTarih: new Date(Date.now() + 86_400_000) },
    });

    const ilk = await zimmetSurelerini();
    expect(ilk.uyarilan).toBeGreaterThanOrEqual(1);
    const ikinci = await zimmetSurelerini();
    expect(ikinci.uyarilan).toBe(0);
  });
});

describe('Toplu zimmet', () => {
  it('kapıya takılan kayıt işlemi durdurmaz, sebebiyle döner', async () => {
    const r = await topluZimmetAc({
      varlikIdleri: [varlikId], atananId: atayan, not: 'kendine',
    });
    expect(r.ok, hataMetni(r)).toBe(true);
    expect(r.ozet?.acilan).toBe(0);
    expect(r.ozet?.atlanan).toBe(1);
    expect(r.ozet?.sebepler[0]).toContain('Kendinize');
  });

  it('geçerli kayıt için talep açar', async () => {
    const r = await topluZimmetAc({ varlikIdleri: [varlikId], atananId: atanan });
    expect(r.ok, hataMetni(r)).toBe(true);
    expect(r.ozet?.acilan).toBe(1);
  });
});
