import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Santral 360 eylemleri — profil · kapsam · override

   `lib/eylemler2/tesis360.ts` %0 kapsamdaydı. Burada çivilenen üç kural:

   1. BİLİNMEYEN ≠ SIFIR / ≠ YANLIŞ. Profil alanları ÜÇ DURUMLUDUR:
      true · false · null. Boş bırakılan bir alan "hayır" değil
      "ölçülmedi"dir; uygulanabilirlik motorunun girdisi budur, yani
      buradaki bir kısayol doğrudan yanlış kapsam kararına dönüşür.

   2. OVERRIDE GEREKÇE İSTER ve ONAY yetkisi ister. Motorun kararını el
      ile ezmek, "bu regülasyon bizi bağlamıyor" demektir; gerekçesiz
      yazılırsa altı ay sonra kimse neden kapsam dışı olduğunu bilemez.

   3. OVERRIDE MOTORU KİLİTLER. `elIleDegistirildi` işaretlenmezse motor
      bir sonraki koşuda insanın kararını sessizce ezer.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-tesis360-'));
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
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 't360@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { profilKaydet, kapsamYenidenHesapla, uygulanabilirlikOverride } =
  await import('@/lib/eylemler2/tesis360');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

let tesisA = '';
let tesisB = '';
let regulasyonId = '';

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  oturum.id = kisi.id;
  oturum.eposta = kisi.eposta;
  const tesisler = await db.tesis.findMany({
    select: { id: true }, take: 2, orderBy: { kod: 'asc' },
  });
  [tesisA, tesisB] = tesisler.map((t) => t.id);
  regulasyonId = (await db.regulasyon.findFirstOrThrow({ select: { id: true } })).id;
});

describe('profilKaydet — üç durumlu alanlar', () => {
  it('boş metin NULL olur — "" ile "bilinmiyor" aynı şey değildir', async () => {
    expect(hataMetni(await profilKaydet({
      tesisId: tesisA, lisansTipi: '   ', lisansNo: 'LIS-1',
    }))).toBe('');
    const p = await db.tesisProfili.findUniqueOrThrow({ where: { tesisId: tesisA } });
    expect(p.lisansTipi).toBeNull();
    expect(p.lisansNo).toBe('LIS-1');
  });

  it('boolean ÜÇ DURUMLUDUR: false ile null ayrı saklanır', async () => {
    /* Kritik ayrım: `blackStart: false` "black start yeteneği YOK" der,
       `null` "ölçülmedi" der. Motor ikisine ayrı davranır. */
    expect(hataMetni(await profilKaydet({
      tesisId: tesisA, blackStart: false, teiasScadaEms: null, iotVar: true,
    }))).toBe('');
    const p = await db.tesisProfili.findUniqueOrThrow({ where: { tesisId: tesisA } });
    expect(p.blackStart).toBe(false);
    expect(p.teiasScadaEms).toBeNull();
    expect(p.iotVar).toBe(true);
  });

  it('upsert: ikinci kayıt günceller, kopya açmaz ve iz tipi değişir', async () => {
    await profilKaydet({ tesisId: tesisB, kritiklikSinifi: 'orta' });
    await profilKaydet({ tesisId: tesisB, kritiklikSinifi: 'kritik' });
    expect(await db.tesisProfili.count({ where: { tesisId: tesisB } })).toBe(1);
    const p = await db.tesisProfili.findUniqueOrThrow({ where: { tesisId: tesisB } });
    expect(p.kritiklikSinifi).toBe('kritik');

    const izler = await db.aktiviteKaydi.findMany({
      where: { varlikTipi: 'TesisProfili', varlikId: tesisB, alan: 'profil' },
      orderBy: { zaman: 'asc' },
    });
    expect(izler.length).toBeGreaterThanOrEqual(2);
    expect(izler.at(-1)?.eylem).toBe('guncelleme');
  });

  it('sözlük dışı değer reddedilir', async () => {
    expect(hataMetni(await profilKaydet({
      tesisId: tesisA, otMimariTipi: 'kuantum' as never,
    }))).not.toBe('');
  });

  it('tesise kısıtlı rol BAŞKA santralin profilini yazamaz', async () => {
    const kisitli = [yetki('yonetici', tesisA)];
    expect(hataMetni(await kimlikle(kisitli,
      () => profilKaydet({ tesisId: tesisA, lisansNo: 'KENDI' })))).toBe('');
    expect(hataMetni(await kimlikle(kisitli,
      () => profilKaydet({ tesisId: tesisB, lisansNo: 'YABANCI' })))).toMatch(/yetki/i);
    const b = await db.tesisProfili.findUniqueOrThrow({ where: { tesisId: tesisB } });
    expect(b.lisansNo).not.toBe('YABANCI');
  });
});

describe('kapsamYenidenHesapla', () => {
  it('motoru koşturur ve karar satırı bırakır', async () => {
    expect(hataMetni(await kapsamYenidenHesapla({ tesisId: tesisA }))).toBe('');
    expect(await db.uygulanabilirlikKarari.count({ where: { tesisId: tesisA } }))
      .toBeGreaterThan(0);
  });

  it('tesise kısıtlı rol başka santral için koşturamaz', async () => {
    expect(hataMetni(await kimlikle([yetki('yonetici', tesisA)],
      () => kapsamYenidenHesapla({ tesisId: tesisB })))).toMatch(/yetki/i);
  });
});

describe('uygulanabilirlikOverride', () => {
  it('GEREKÇESİZ override yazılmaz', async () => {
    expect(hataMetni(await uygulanabilirlikOverride({
      tesisId: tesisA, regulasyonId, uygulanabilir: false, gerekce: 'kısa',
    }))).toMatch(/gerekçe/i);
  });

  it('override MOTORU KİLİTLER: elIleDegistirildi işaretlenir', async () => {
    const gerekce = 'Santralde TEİAŞ SCADA bağlantısı yok, kapsam dışı sayıldı';
    expect(hataMetni(await uygulanabilirlikOverride({
      tesisId: tesisA, regulasyonId, uygulanabilir: false, gerekce,
    }))).toBe('');
    const karar = await db.uygulanabilirlikKarari.findUniqueOrThrow({
      where: { tesisId_regulasyonId: { tesisId: tesisA, regulasyonId } },
    });
    expect(karar.uygulanabilir).toBe(false);
    expect(karar.elIleDegistirildi).toBe(true);
    expect(karar.degistirmeGerekcesi).toBe(gerekce);
    expect(karar.onaylayanId).toBe(oturum.id);
  });

  it('MOTOR insanın kararını ezmez — override sonrası yeniden hesap kararı korur', async () => {
    /* Bu, dosyanın en pahalı kuralı: motor her koşuda kapsamı yeniden
       hesaplar. El ile verilmiş kararı ezerse, insan aynı kararı her
       koşudan sonra yeniden vermek zorunda kalır ve bir gün fark etmez. */
    expect(hataMetni(await kapsamYenidenHesapla({ tesisId: tesisA }))).toBe('');
    const karar = await db.uygulanabilirlikKarari.findUniqueOrThrow({
      where: { tesisId_regulasyonId: { tesisId: tesisA, regulasyonId } },
    });
    expect(karar.elIleDegistirildi).toBe(true);
    expect(karar.uygulanabilir).toBe(false);
  });

  it('ONAY yetkisi ister — yazma yetkisi yetmez', async () => {
    const gerekce = 'Yazma yetkisiyle denenen override, reddedilmeli';
    expect(hataMetni(await kimlikle([yetki('tesis_yoneticisi', tesisA)],
      () => uygulanabilirlikOverride({
        tesisId: tesisA, regulasyonId, uygulanabilir: true, gerekce,
      })))).toMatch(/yetki/i);
  });

  it('tesise kısıtlı rol başka santral için override veremez', async () => {
    const gerekce = 'Başka santral için verilmeye çalışılan override kararı';
    expect(hataMetni(await kimlikle([yetki('yonetici', tesisA)],
      () => uygulanabilirlikOverride({
        tesisId: tesisB, regulasyonId, uygulanabilir: false, gerekce,
      })))).toMatch(/yetki/i);
  });
});
