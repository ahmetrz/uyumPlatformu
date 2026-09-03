import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Denetim kapsamı — GERÇEK veritabanı, GERÇEK yetki kapısı

   `kapsamEkle` / `kapsamCikar` bir denetimin NEYİ kapsadığını belirler:
   hangi santraller, hangi maddeler. Kapsam, denetimin bulgularının nereye
   yazılacağını ve hangi tesisin uyum oranının etkileneceğini tayin eder —
   yani denetimin sınırı buradan çizilir.

   Ölçülen üç kural:
     1. KAPANMIŞ DENETİM DEĞİŞMEZ. Kapanış sonrası kapsam genişletmek,
        biten bir denetimin sonucunu geçmişe dönük değiştirmektir.
     2. KAPSAM — tesise kısıtlı rol kendi tesisini ekleyebilmeli, başkasını
        ekleyememeli; MADDE eklemek kapsamsız (kurumsal) bir işlemdir ve
        tesise kısıtlı rol onu da yapamaz.
     3. ÇIKARILAN KAPSAM İZDE KALIR. Kapsam kaydı silinir ama neyin
        çıkarıldığı denetim izinde durur; yoksa denetimin sınırı sessizce
        daraltılabilirdi.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-denetim-'));
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
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 'denetim@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { kapsamEkle, kapsamCikar } = await import('@/lib/eylemler2/denetim');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

let tesisA = '';
let tesisB = '';
let maddeId = '';

/** Verilen durumda yeni bir denetim açar (her test kendi denetimini alır). */
async function denetimAc(durum = 'plan') {
  return db.denetim.create({ data: {
    kod: benzersiz('DEN-T'), ad: 'Test denetimi', tip: 'ic_denetim', durum,
  } });
}

const izler = (denetimId: string) => db.aktiviteKaydi.findMany({
  where: { varlikTipi: 'Denetim', varlikId: denetimId }, orderBy: { zaman: 'asc' },
});

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  oturum.id = kisi.id;
  const tesisler = await db.tesis.findMany({ select: { id: true }, take: 2, orderBy: { kod: 'asc' } });
  [tesisA, tesisB] = tesisler.map((t) => t.id);
  maddeId = (await db.madde.findFirstOrThrow({ select: { id: true } })).id;
});

describe('Kapsam ekleme', () => {
  it('tesis kapsama eklenir ve iz bırakır', async () => {
    const d = await denetimAc();
    expect(hataMetni(await kapsamEkle({ denetimId: d.id, tesisId: tesisA }))).toBe('');
    expect(await db.denetimKapsami.count({ where: { denetimId: d.id, tesisId: tesisA } })).toBe(1);
    expect((await izler(d.id)).at(-1)?.eylem).toBe('kapsam_degisimi');
  });

  it('madde kapsama eklenir', async () => {
    const d = await denetimAc();
    expect(hataMetni(await kapsamEkle({ denetimId: d.id, maddeId }))).toBe('');
    expect(await db.denetimKapsami.count({ where: { denetimId: d.id, maddeId } })).toBe(1);
  });

  it('TESİS DE MADDE DE verilmezse reddedilir', async () => {
    // Boş kapsam kaydı, denetimin sınırını belirsizleştirir.
    const d = await denetimAc();
    expect(hataMetni(await kapsamEkle({ denetimId: d.id }))).toMatch(/tesis veya madde/i);
  });

  it('olmayan denetime kapsam eklenemez', async () => {
    expect(hataMetni(await kapsamEkle({ denetimId: 'yok-boyle-bir-id', tesisId: tesisA })))
      .toMatch(/bulunamadı/i);
  });

  it('olmayan tesis eklenemez', async () => {
    const d = await denetimAc();
    expect(hataMetni(await kapsamEkle({ denetimId: d.id, tesisId: 'yok-boyle-bir-id' })))
      .toMatch(/bulunamadı/i);
  });
});

describe('Kapanmış denetim', () => {
  it('kapanmış denetimin kapsamı GENİŞLETİLEMEZ', async () => {
    /* Kapanıştan sonra kapsam eklemek, biten bir denetimin sonucunu
       geçmişe dönük değiştirmektir: rapor imzalanmış, bulgular kapanmış,
       kapsam ise büyümüş görünür. */
    const d = await denetimAc('kapanis');
    expect(hataMetni(await kapsamEkle({ denetimId: d.id, tesisId: tesisA })))
      .toMatch(/kapanmış/i);
    expect(await db.denetimKapsami.count({ where: { denetimId: d.id } })).toBe(0);
  });

  it('kapanmış denetimin kapsamı DARALTILAMAZ', async () => {
    const d = await denetimAc();
    await kapsamEkle({ denetimId: d.id, tesisId: tesisA });
    const kapsam = await db.denetimKapsami.findFirstOrThrow({ where: { denetimId: d.id } });
    await db.denetim.update({ where: { id: d.id }, data: { durum: 'kapanis' } });

    expect(hataMetni(await kapsamCikar({ id: kapsam.id }))).toMatch(/kapanmış/i);
    expect(await db.denetimKapsami.count({ where: { id: kapsam.id } })).toBe(1);
  });
});

describe('Kapsam çıkarma', () => {
  it('kapsam kaydı silinir ama NE ÇIKARILDIĞI izde kalır', async () => {
    const d = await denetimAc();
    await kapsamEkle({ denetimId: d.id, tesisId: tesisA });
    const kapsam = await db.denetimKapsami.findFirstOrThrow({ where: { denetimId: d.id } });
    const tesis = await db.tesis.findUniqueOrThrow({ where: { id: tesisA } });

    expect(hataMetni(await kapsamCikar({ id: kapsam.id }))).toBe('');
    expect(await db.denetimKapsami.count({ where: { id: kapsam.id } })).toBe(0);

    const kayit = await izler(d.id);
    expect(kayit.at(-1)?.eylem).toBe('kapsam_degisimi');
    expect(kayit.at(-1)?.oncekiDeger).toContain(tesis.kod);
  });

  it('olmayan kapsam kaydı çıkarılamaz', async () => {
    expect(hataMetni(await kapsamCikar({ id: 'yok-boyle-bir-id' }))).toMatch(/bulunamadı/i);
  });
});

describe('Kapsam kapısı', () => {
  it('tesise kısıtlı rol KENDİ tesisini kapsama ekleyebilir', async () => {
    const d = await denetimAc();
    const sonuc = await kimlikle([yetki('denetim_sorumlusu', tesisA)], () => kapsamEkle({
      denetimId: d.id, tesisId: tesisA,
    }));
    expect(hataMetni(sonuc)).toBe('');
  });

  it('tesise kısıtlı rol BAŞKA tesisi kapsama ekleyemez', async () => {
    const d = await denetimAc();
    const sonuc = await kimlikle([yetki('denetim_sorumlusu', tesisA)], () => kapsamEkle({
      denetimId: d.id, tesisId: tesisB,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
    expect(await db.denetimKapsami.count({ where: { denetimId: d.id } })).toBe(0);
  });

  it('tesise kısıtlı rol MADDE ekleyemez — madde kapsamsız bir işlemdir', async () => {
    /* Bir maddeyi denetim kapsamına almak bütün denetimi etkiler, tek bir
       santrali değil. Tesise kısıtlı rol bunu yapamaz; yapabilseydi
       kapsam denetimi tesis alanı boş bırakılarak atlanırdı. */
    const d = await denetimAc();
    const sonuc = await kimlikle([yetki('denetim_sorumlusu', tesisA)], () => kapsamEkle({
      denetimId: d.id, maddeId,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });

  it('tesise kısıtlı rol BAŞKA tesisin kapsam kaydını çıkaramaz', async () => {
    const d = await denetimAc();
    await kapsamEkle({ denetimId: d.id, tesisId: tesisB });
    const kapsam = await db.denetimKapsami.findFirstOrThrow({ where: { denetimId: d.id } });
    const sonuc = await kimlikle([yetki('denetim_sorumlusu', tesisA)], () => kapsamCikar({
      id: kapsam.id,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
    expect(await db.denetimKapsami.count({ where: { id: kapsam.id } })).toBe(1);
  });

  it('okuyucu rolü kapsam değiştiremez', async () => {
    const d = await denetimAc();
    const sonuc = await kimlikle([yetki('okuyucu')], () => kapsamEkle({
      denetimId: d.id, tesisId: tesisA,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });
});
