import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Santral koordinatı + API anahtarı — iki sıfır kapsamlı eylem dosyası

   İkisi de ölçülmemişti (`lib/eylemler2/konum.ts` ve `apiAnahtari.ts`
   %0). Ölçülmemiş bir yetki kapısı, kaldırıldığında hiçbir testi
   düşürmeyen kapıdır.

   Bu dosyanın çivilediği kurallar:
     · koordinat İKİLİDİR — yarım kayıt yazılamaz,
     · SİLME meşrudur — yanlış koordinat, hiç koordinattan kötüdür,
     · kapsam santralin kendisinden okunur (konum sicil alanıdır),
     · API anahtarı SÜRESİZ OLAMAZ ve tavanı vardır,
     · token bir kez döner, veritabanına ÖZETİ yazılır — tokenın kendisi
       hiçbir yerde durmaz, denetim izine de yazılmaz,
     · iptal geri alınamaz ama İDEMPOTENTTİR.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-konum-anahtar-'));
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
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 'konum@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { tesisKonumKaydet } = await import('@/lib/eylemler2/konum');
const { apiAnahtariUret, apiAnahtariIptal } = await import('@/lib/eylemler2/apiAnahtari');
const { AZAMI_ANAHTAR_GUN, VARSAYILAN_ANAHTAR_GUN } =
  await import('@/lib/apiAnahtariKurallari');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

let tesisA = '';
let tesisB = '';

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  oturum.id = kisi.id;
  oturum.eposta = kisi.eposta;
  const tesisler = await db.tesis.findMany({
    select: { id: true }, take: 2, orderBy: { kod: 'asc' },
  });
  [tesisA, tesisB] = tesisler.map((t) => t.id);
});

describe('tesisKonumKaydet — koordinat', () => {
  it('geçerli koordinat yazılır ve iz düşer', async () => {
    expect(hataMetni(await tesisKonumKaydet({
      tesisId: tesisA, enlem: 39.9208, boylam: 32.8541,
    }))).toBe('');
    const t = await db.tesis.findUniqueOrThrow({ where: { id: tesisA } });
    expect(t.enlem).toBeCloseTo(39.9208, 4);
    expect(t.boylam).toBeCloseTo(32.8541, 4);

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Tesis', varlikId: tesisA, alan: 'koordinat' },
      orderBy: { zaman: 'desc' },
    });
    /* İz artık noktayı TEK BAŞINA yazmıyor: kaynağı ve doğrulanmışlığı
       da taşıyor (P3-8). Denetim izinde "şu koordinat yazıldı" yetmez,
       "nereden geldi ve biri baktı mı" da durmalı. */
    expect(iz?.yeniDeger).toContain('39.9208,32.8541');
    expect(iz?.yeniDeger).toMatch(/kaynak: belirtilmedi/);
    expect(iz?.yeniDeger).toMatch(/doğrulanmadı/);
  });

  it('YARIM koordinat reddedilir — tek başına enlem haritada bir yer değildir', async () => {
    expect(hataMetni(await tesisKonumKaydet({
      tesisId: tesisA, enlem: 39.9, boylam: null,
    }))).toMatch(/birlikte/i);
    expect(hataMetni(await tesisKonumKaydet({
      tesisId: tesisA, enlem: null, boylam: 32.8,
    }))).toMatch(/birlikte/i);
  });

  it('aralık dışı koordinat reddedilir', async () => {
    expect(hataMetni(await tesisKonumKaydet({
      tesisId: tesisA, enlem: 91, boylam: 0,
    }))).toMatch(/aralık dışında/i);
    expect(hataMetni(await tesisKonumKaydet({
      tesisId: tesisA, enlem: 0, boylam: 181,
    }))).toMatch(/aralık dışında/i);
  });

  it('SİLME meşrudur: null/null koordinatı kaldırır', async () => {
    /* "Yanlış girdim" demenin yolu olmalı. Yanlış bir koordinat hiç
       koordinat olmamasından pahalıdır — saha ekibi oraya gider. */
    expect(hataMetni(await tesisKonumKaydet({
      tesisId: tesisA, enlem: null, boylam: null,
    }))).toBe('');
    const t = await db.tesis.findUniqueOrThrow({ where: { id: tesisA } });
    expect(t.enlem).toBeNull();
    expect(t.boylam).toBeNull();
  });

  it('tesise kısıtlı rol KENDİ santralini düzeltir, başkasını düzeltemez', async () => {
    const kisitli = [yetki('yonetici', tesisA)];
    expect(hataMetni(await kimlikle(kisitli, () => tesisKonumKaydet({
      tesisId: tesisA, enlem: 40.1, boylam: 33.1,
    })))).toBe('');
    expect(hataMetni(await kimlikle(kisitli, () => tesisKonumKaydet({
      tesisId: tesisB, enlem: 40.2, boylam: 33.2,
    })))).toMatch(/yetki/i);
    const b = await db.tesis.findUniqueOrThrow({ where: { id: tesisB } });
    expect(b.enlem).not.toBeCloseTo(40.2, 4);
  });

  it('okuyucu rolü koordinat yazamaz', async () => {
    expect(hataMetni(await kimlikle([yetki('okuyucu')], () => tesisKonumKaydet({
      tesisId: tesisA, enlem: 41, boylam: 34,
    })))).toMatch(/yetki/i);
  });
});

describe('Koordinat KAYNAĞI ve DOĞRULANMIŞLIĞI (P3-8)', () => {
  /* Koordinat İKİ değil ÜÇ durumludur: yok · var ama doğrulanmadı ·
     doğrulandı. Ortadaki durum olmadan, kamuya açık bir kaynaktan
     bulunmuş yaklaşık bir nokta ile saha ekibinin ölçtüğü nokta
     veritabanında ayırt edilemezdi ve ekran ikisini de kesin gösterirdi. */

  it('kaynak yazılır ve doğrulanmamış olarak durur', async () => {
    expect(hataMetni(await tesisKonumKaydet({
      tesisId: tesisA, enlem: 38.5, boylam: 27.9, kaynak: 'OpenStreetMap',
    }))).toBe('');
    const t = await db.tesis.findUniqueOrThrow({ where: { id: tesisA } });
    expect(t.konumKaynagi).toBe('OpenStreetMap');
    // Varsayılan DOĞRULANMAMIŞ: aksi hâli varsaymak, kapatmak istediğimiz
    // yalanı yazmak olurdu.
    expect(t.konumDogrulandi).toBe(false);
    expect(t.konumDogrulayanId).toBeNull();
  });

  it('DOĞRULAMA kimi ve ne zamanı birlikte yazar', async () => {
    expect(hataMetni(await tesisKonumKaydet({
      tesisId: tesisA, enlem: 38.51, boylam: 27.91,
      kaynak: 'saha GPS', dogrulandi: true,
    }))).toBe('');
    const t = await db.tesis.findUniqueOrThrow({ where: { id: tesisA } });
    expect(t.konumDogrulandi).toBe(true);
    expect(t.konumDogrulayanId).toBe(oturum.id);
    expect(t.konumDogrulandiZaman).not.toBeNull();
  });

  it('KOORDİNAT DEĞİŞİNCE doğrulama DÜŞER — eski onay yeni noktayı kapsamaz', async () => {
    /* En pahalı kural: doğrulanmış bir koordinat değiştirilirse onay
       otomatik düşmeli. Düşmezse, kimsenin bakmadığı yeni bir nokta
       "doğrulanmış" damgasıyla haritada durur. */
    await tesisKonumKaydet({
      tesisId: tesisA, enlem: 38.52, boylam: 27.92,
      kaynak: 'saha GPS', dogrulandi: true,
    });
    expect((await db.tesis.findUniqueOrThrow({ where: { id: tesisA } })).konumDogrulandi)
      .toBe(true);

    expect(hataMetni(await tesisKonumKaydet({
      tesisId: tesisA, enlem: 39.99, boylam: 28.88, kaynak: 'EPDK lisans sicili',
    }))).toBe('');
    const t = await db.tesis.findUniqueOrThrow({ where: { id: tesisA } });
    expect(t.konumDogrulandi).toBe(false);
    expect(t.konumDogrulayanId).toBeNull();
    expect(t.konumDogrulandiZaman).toBeNull();
  });

  it('koordinat SİLİNİNCE kaynak ve doğrulama da silinir', async () => {
    await tesisKonumKaydet({
      tesisId: tesisA, enlem: 38.5, boylam: 27.9, kaynak: 'saha GPS', dogrulandi: true,
    });
    expect(hataMetni(await tesisKonumKaydet({
      tesisId: tesisA, enlem: null, boylam: null,
    }))).toBe('');
    const t = await db.tesis.findUniqueOrThrow({ where: { id: tesisA } });
    expect(t.konumKaynagi).toBeNull();
    expect(t.konumDogrulandi).toBe(false);
    expect(t.konumDogrulandiZaman).toBeNull();
  });

  it('KOORDİNATSIZ doğrulama olmaz', async () => {
    expect(hataMetni(await tesisKonumKaydet({
      tesisId: tesisA, enlem: null, boylam: null, dogrulandi: true,
    }))).toMatch(/koordinat/i);
  });

  it('doğrulama ONAY yetkisi ister — yazma yetmez', async () => {
    /* Doğrulama bir ONAYDIR: "bu noktaya birisi baktı" demek, kaydı
       girmekten farklı bir sorumluluktur. */
    expect(hataMetni(await kimlikle([yetki('tesis_yoneticisi', tesisA)],
      () => tesisKonumKaydet({
        tesisId: tesisA, enlem: 38.5, boylam: 27.9,
        kaynak: 'saha GPS', dogrulandi: true,
      })))).toMatch(/yetki|onay/i);
  });

  it('iz kaydı kaynağı ve doğrulamayı taşır', async () => {
    await tesisKonumKaydet({
      tesisId: tesisA, enlem: 40.11, boylam: 29.22,
      kaynak: 'kurum GIS', dogrulandi: true,
    });
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Tesis', varlikId: tesisA, alan: 'koordinat' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.yeniDeger).toContain('kurum GIS');
    expect(iz?.yeniDeger).toMatch(/doğruland/i);
  });
});

describe('apiAnahtariUret / apiAnahtariIptal', () => {
  it('token BİR KEZ döner; veritabanında yalnız özeti durur', async () => {
    const s = await apiAnahtariUret({ ad: 'Test anahtarı' });
    expect(s.ok).toBe(true);
    if (!s.ok) return;

    expect(s.token.length).toBeGreaterThan(20);
    expect(s.token.startsWith(s.onEk)).toBe(true);

    const kayit = await db.apiAnahtari.findUniqueOrThrow({ where: { id: s.id } });
    // Tokenın KENDİSİ hiçbir kolonda geçmez.
    expect(JSON.stringify(kayit)).not.toContain(s.token);
    expect(kayit.tokenHash).not.toBe(s.token);
    expect(kayit.onEk).toBe(s.onEk);

    // Denetim izi de tokenı taşımaz — yalnız ön ek.
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'ApiAnahtari', varlikId: s.id },
      orderBy: { zaman: 'desc' },
    });
    expect(JSON.stringify(iz)).not.toContain(s.token);
    expect(iz?.yeniDeger).toContain(s.onEk);
  });

  it('SÜRESİZ anahtar yoktur: süre boş bırakılınca varsayılan ömür konur', async () => {
    const s = await apiAnahtariUret({ ad: 'Süresiz denemesi', gecerlilikGun: null });
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    expect(s.bitis).not.toBeNull();
    const gun = Math.round(
      (new Date(s.bitis!).getTime() - Date.now()) / 86_400_000);
    expect(gun).toBe(VARSAYILAN_ANAHTAR_GUN);
  });

  it('TAVAN aşılamaz', async () => {
    const s = await apiAnahtariUret({
      ad: 'Çok uzun', gecerlilikGun: AZAMI_ANAHTAR_GUN + 1,
    });
    expect(s.ok).toBe(false);
    if (s.ok) return;
    expect(s.hata).toMatch(new RegExp(String(AZAMI_ANAHTAR_GUN)));
  });

  it('PASİF kullanıcı adına anahtar üretilemez', async () => {
    const pasif = await db.kullanici.findFirst({ where: { aktif: false } })
      ?? await db.kullanici.create({ data: {
        adSoyad: 'Pasif Kişi', eposta: `pasif-${Date.now()}@test`, aktif: false,
      } });
    const s = await apiAnahtariUret({ ad: 'Pasif adına', kullaniciId: pasif.id });
    expect(s.ok).toBe(false);
    if (s.ok) return;
    expect(s.hata).toMatch(/pasif/i);
  });

  it('iptal geri alınamaz ama İDEMPOTENTTİR', async () => {
    const s = await apiAnahtariUret({ ad: 'İptal edilecek' });
    expect(s.ok).toBe(true);
    if (!s.ok) return;

    expect(hataMetni(await apiAnahtariIptal({ id: s.id, gerekce: 'sızıntı şüphesi' }))).toBe('');
    const ilk = await db.apiAnahtari.findUniqueOrThrow({ where: { id: s.id } });
    expect(ilk.iptalZamani).not.toBeNull();

    // İkinci çağrı hata vermez ve damgayı DEĞİŞTİRMEZ.
    expect(hataMetni(await apiAnahtariIptal({ id: s.id }))).toBe('');
    const ikinci = await db.apiAnahtari.findUniqueOrThrow({ where: { id: s.id } });
    expect(ikinci.iptalZamani?.getTime()).toBe(ilk.iptalZamani?.getTime());
  });

  it('olmayan anahtar iptal edilemez', async () => {
    expect(hataMetni(await apiAnahtariIptal({ id: 'yok-boyle-bir-anahtar' })))
      .toMatch(/bulunamadi/i);
  });

  it('yonetim/yazma yetkisi olmayan anahtar üretemez ve iptal edemez', async () => {
    const s = await kimlikle([yetki('tesis_yoneticisi', tesisA)],
      () => apiAnahtariUret({ ad: 'Olmaz' }));
    expect(s.ok).toBe(false);

    const mevcut = await apiAnahtariUret({ ad: 'Kapı denemesi' });
    expect(mevcut.ok).toBe(true);
    if (!mevcut.ok) return;
    expect(hataMetni(await kimlikle([yetki('okuyucu')],
      () => apiAnahtariIptal({ id: mevcut.id })))).toMatch(/yetki/i);
  });
});
