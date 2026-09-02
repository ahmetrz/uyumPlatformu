import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   §50 · İstisna (waiver) talebi — GERÇEK veritabanı, GERÇEK yetki kapısı

   `lib/eylemler2/istisna.ts` hiç test görmemişti (kapsam %0). Bir istisna,
   uyumsuz bir maddeyi "kabul edilebilir" ilan eder; yani denetim
   karşısında en pahalı kayıt tiplerinden biridir. Üç kural taşır:

     1. SÜRELİ — bitiş tarihi gelecekte olmak zorunda. Süresiz istisna,
        kapanmamış bir bulguyu sonsuza kadar gizlemek demektir.
     2. GEREKÇELİ — en az 10 karakter. "ok" yazıp geçilemez.
     3. ONAYLI — talep madde durumunu DEĞİŞTİRMEZ; onay merkezine düşer.
        Onaylanana kadar madde uyumsuz görünmeye devam eder.

   Ayrıca aynı madde/tesis için ikinci bir açık istisna açılamaz: açılırsa
   onay merkezinde iki talep birikir ve biri onaylanınca öteki hayalet
   kalır.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-istisna-'));
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
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 'istisna@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { istisnaTalep } = await import('@/lib/eylemler2/istisna');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

const YARIN = () => new Date(Date.now() + 30 * 86_400_000).toISOString();
const GEREKCE = 'Telafi kontrolü devrede, yatırım 2027 bütçesinde';

/** Henüz istisnası olmayan bir madde durumu verir; her test kendi satırını alır. */
let havuz: { id: string; tesisId: string; maddeId: string }[] = [];
const sirada = () => {
  const kayit = havuz.shift();
  if (!kayit) throw new Error('Test havuzu tükendi — seed yeterli madde durumu taşımıyor');
  return kayit;
};

let tesisA = '';
let tesisB = '';

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  oturum.id = kisi.id;

  const durumlar = await db.maddeDurumu.findMany({
    select: { id: true, tesisId: true, maddeId: true }, orderBy: { id: 'asc' },
  });
  const acikIstisnalar = new Set((await db.istisna.findMany({
    where: { durum: { in: ['onay_bekliyor', 'aktif'] } },
    select: { maddeId: true, tesisId: true },
  })).map((i) => `${i.maddeId}|${i.tesisId}`));

  havuz = durumlar.filter((d) => !acikIstisnalar.has(`${d.maddeId}|${d.tesisId}`));
  expect(havuz.length).toBeGreaterThan(8);

  const tesisler = [...new Set(durumlar.map((d) => d.tesisId))];
  [tesisA, tesisB] = tesisler;
});

describe('Süre — süresiz istisna yoktur', () => {
  it('gelecekteki bitişle talep açılır', async () => {
    const d = sirada();
    expect(hataMetni(await istisnaTalep({
      maddeDurumuId: d.id, bitis: YARIN(), gerekce: GEREKCE,
    }))).toBe('');
  });

  it('geçmiş tarih reddedilir', async () => {
    const d = sirada();
    const dun = new Date(Date.now() - 86_400_000).toISOString();
    expect(hataMetni(await istisnaTalep({ maddeDurumuId: d.id, bitis: dun, gerekce: GEREKCE })))
      .toMatch(/gelecekte/i);
    expect(await db.istisna.count({ where: { maddeId: d.maddeId, tesisId: d.tesisId } })).toBe(0);
  });

  it('boş bitiş tarihi reddedilir', async () => {
    const d = sirada();
    expect(hataMetni(await istisnaTalep({ maddeDurumuId: d.id, bitis: '', gerekce: GEREKCE })))
      .not.toBe('');
  });
});

describe('Gerekçe', () => {
  it('on karakterden kısa gerekçe reddedilir', async () => {
    const d = sirada();
    expect(hataMetni(await istisnaTalep({ maddeDurumuId: d.id, bitis: YARIN(), gerekce: 'olur' })))
      .toMatch(/10 karakter/);
  });

  it('yalnız boşluktan oluşan gerekçe reddedilir', async () => {
    const d = sirada();
    expect(hataMetni(await istisnaTalep({
      maddeDurumuId: d.id, bitis: YARIN(), gerekce: '              ',
    }))).not.toBe('');
  });
});

describe('Onay — talep tek başına hiçbir şeyi değiştirmez', () => {
  it('madde durumu talepten SONRA da aynı kalır', async () => {
    /* İstisna onaylanana kadar madde uyumsuz görünmeye devam etmeli.
       Aksi hâlde talep açmak, denetim ekranını temizlemenin kestirme yolu
       olurdu. */
    const d = sirada();
    const once = await db.maddeDurumu.findUniqueOrThrow({ where: { id: d.id } });
    await istisnaTalep({ maddeDurumuId: d.id, bitis: YARIN(), gerekce: GEREKCE });
    const sonra = await db.maddeDurumu.findUniqueOrThrow({ where: { id: d.id } });
    expect(sonra.durum).toBe(once.durum);
  });

  it('istisna ONAY BEKLİYOR doğar ve onay merkezine talep düşer', async () => {
    const d = sirada();
    await istisnaTalep({ maddeDurumuId: d.id, bitis: YARIN(), gerekce: GEREKCE });
    const istisna = await db.istisna.findFirstOrThrow({
      where: { maddeId: d.maddeId, tesisId: d.tesisId } });
    expect(istisna.durum).toBe('onay_bekliyor');

    const talep = await db.onayTalebi.findFirstOrThrow({
      where: { kaynakTipi: 'Istisna', kaynakId: istisna.id } });
    expect(talep.tip).toBe('istisna');
    expect(talep.talepEdenId).toBe(oturum.id);
    // Özet, onaylayanın kararı için gerekeni taşımalı: madde, tesis, süre.
    expect(talep.ozet).toContain('—');
    expect(talep.ozet.length).toBeGreaterThan(20);
  });

  it('aynı madde/tesis için İKİNCİ açık istisna açılamaz', async () => {
    const d = sirada();
    expect(hataMetni(await istisnaTalep({
      maddeDurumuId: d.id, bitis: YARIN(), gerekce: GEREKCE,
    }))).toBe('');
    expect(hataMetni(await istisnaTalep({
      maddeDurumuId: d.id, bitis: YARIN(), gerekce: GEREKCE,
    }))).toMatch(/zaten var/i);
    expect(await db.istisna.count({
      where: { maddeId: d.maddeId, tesisId: d.tesisId } })).toBe(1);
  });

  it('talep denetim izine gerekçesiyle düşer', async () => {
    const d = sirada();
    await istisnaTalep({ maddeDurumuId: d.id, bitis: YARIN(), gerekce: GEREKCE });
    const istisna = await db.istisna.findFirstOrThrow({
      where: { maddeId: d.maddeId, tesisId: d.tesisId } });
    const iz = await db.aktiviteKaydi.findFirstOrThrow({
      where: { varlikTipi: 'Istisna', varlikId: istisna.id } });
    expect(iz.eylem).toBe('olusturma');
    expect(iz.gerekce).toBe(GEREKCE);
  });
});

describe('Kapsam kapısı', () => {
  it('tesise kısıtlı rol KENDİ tesisi için istisna talep edebilir', async () => {
    /* İKİ AŞAMALI KAPI. Ön kapı kapsamsız çağrılırsa tesise kısıtlı rol
       daha ilk adımda reddedilir; ekran "talep et" düğmesini gösterirken
       sunucu "yetkiniz yok" der. */
    const d = havuz.find((x) => x.tesisId === tesisA);
    expect(d, 'seed tesisA için madde durumu taşımıyor').toBeTruthy();
    havuz = havuz.filter((x) => x.id !== d!.id);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => istisnaTalep({
      maddeDurumuId: d!.id, bitis: YARIN(), gerekce: GEREKCE,
    }));
    expect(hataMetni(sonuc)).toBe('');
  });

  it('tesise kısıtlı rol BAŞKA tesis için istisna talep edemez', async () => {
    const d = havuz.find((x) => x.tesisId === tesisB);
    expect(d, 'seed tesisB için madde durumu taşımıyor').toBeTruthy();
    havuz = havuz.filter((x) => x.id !== d!.id);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => istisnaTalep({
      maddeDurumuId: d!.id, bitis: YARIN(), gerekce: GEREKCE,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
    expect(await db.istisna.count({
      where: { maddeId: d!.maddeId, tesisId: d!.tesisId } })).toBe(0);
  });

  it('okuyucu rolü istisna talep edemez', async () => {
    const d = sirada();
    const sonuc = await kimlikle([yetki('okuyucu')], () => istisnaTalep({
      maddeDurumuId: d.id, bitis: YARIN(), gerekce: GEREKCE,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });
});

describe('Olmayan kayıt', () => {
  it('olmayan madde durumu için talep açılamaz', async () => {
    expect(hataMetni(await istisnaTalep({
      maddeDurumuId: 'yok-boyle-bir-id', bitis: YARIN(), gerekce: GEREKCE,
    }))).not.toBe('');
  });
});
