import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   FAZ F eylemleri — UY-52 · UY-56 · UY-57

   Yetki kapısı SAHTELENMEZ: yalnız `aktifKullanici` değiştirilir.
   API kapısı da sahtelenmez — gerçek uç noktalar gerçek Request'lerle
   çağrılır; kapının ekranda değil HATTA çalıştığı ölçülür.

   Bu dosyanın çivilediği kurallar:
     · kapsamsız anahtar ÜRETİLEMEZ, eski anahtar çalışır,
     · salt okunur anahtar yazma ucundan 403 alır,
     · kapsam dışı uç 403 döner — rol yetse bile,
     · imha DÖRT GÖZ ister ve hold onu durdurur,
     · dış denetçi daveti GERÇEK yetki satırı yazar, iptal onu siler.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-faz-f-'));
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
  id: '', adSoyad: 'FAZ F Testi', eposta: 'faz-f@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { apiAnahtariUret, apiAnahtariKapsamGuncelle } =
  await import('@/lib/eylemler2/apiAnahtari');
const {
  imhaKarariniOnayla, imhaKarariniReddet, imhaKarariniUygula, imhaOnerisiAc,
  legalHoldKaldir, legalHoldKoy, saklamaPolitikasiKaydet,
} = await import('@/lib/eylemler2/saklama');
const {
  denetciDavetEt, denetciErisimiIptal, denetciSureleriniIsle,
} = await import('@/lib/eylemler2/denetciErisimi');
const { GET: santralleriGetir } = await import('@/app/api/v1/plants/route.api');
const { POST: zafiyetYaz } = await import('@/app/api/v1/vulnerabilities/route.api');
const { oranSayaclariniSifirla } = await import('@/lib/api/oranSinir');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

/** Başka bir kişi adına koşar — dört göz testlerinin tek yolu. */
async function baskaKisiyle<T>(id: string, is: () => Promise<T>): Promise<T> {
  const onceki = oturum.id;
  oturum.id = id;
  try { return await is(); } finally { oturum.id = onceki; }
}

let ikinciKisi = '';
let tesisler: { id: string; kod: string }[] = [];

beforeAll(async () => {
  const kisiler = await db.kullanici.findMany({
    where: { aktif: true }, select: { id: true, eposta: true }, take: 2,
  });
  oturum.id = kisiler[0].id;
  oturum.eposta = kisiler[0].eposta;
  ikinciKisi = kisiler[1].id;
  tesisler = await db.tesis.findMany({ select: { id: true, kod: true }, take: 3 });
  oranSayaclariniSifirla();
});

afterAll(async () => { await rm(dizin, { recursive: true, force: true }); });

/* ═══ UY-52 · API anahtarı kapsamı ═════════════════════════════════════ */

describe('UY-52 · Anahtar üretimi kapsam ister', () => {
  it('KAPSAMSIZ anahtar üretilemez', async () => {
    const s = await apiAnahtariUret({ ad: 'Kapsamsız', uclar: [] });
    expect(s.ok).toBe(false);
    if (s.ok) return;
    expect(s.hata).toMatch(/en az bir uç/i);
  });

  it('salt okunur + yazma ucu çelişkisi ÜRETİM anında kesilir', async () => {
    const s = await apiAnahtariUret({
      ad: 'Çelişki', uclar: ['assets.upsert'], saltOkunur: true,
    });
    expect(s.ok).toBe(false);
    if (s.ok) return;
    expect(s.hata).toMatch(/SALT OKUNUR/);
  });

  it('kapsam ve salt okunurluk kayda YAZILIR, denetim izine geçer', async () => {
    const s = await apiAnahtariUret({ ad: 'Kapsamlı', uclar: ['plants', 'assets'] });
    expect(s.ok).toBe(true);
    if (!s.ok) return;

    const kayit = await db.apiAnahtari.findUniqueOrThrow({ where: { id: s.id } });
    expect(JSON.parse(kayit.kapsamJson!)).toEqual(['plants', 'assets']);
    expect(kayit.saltOkunur).toBe(true);

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'ApiAnahtari', varlikId: s.id },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.gerekce).toContain('plants');
    expect(iz?.gerekce).toContain('salt okunur');
    // Token izin hiçbir yerinde geçmez.
    expect(JSON.stringify(iz)).not.toContain(s.token);
  });

  it('kapsam güncelleme TOKEN\'a dokunmaz ve iz bırakır', async () => {
    const s = await apiAnahtariUret({ ad: 'Daraltılacak', uclar: ['plants', 'assets'] });
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    const once = await db.apiAnahtari.findUniqueOrThrow({ where: { id: s.id } });

    expect(hataMetni(await apiAnahtariKapsamGuncelle({
      id: s.id, uclar: ['plants'], saltOkunur: true, gerekce: 'daraltma',
    }))).toBe('');

    const sonra = await db.apiAnahtari.findUniqueOrThrow({ where: { id: s.id } });
    expect(sonra.tokenHash).toBe(once.tokenHash);
    expect(JSON.parse(sonra.kapsamJson!)).toEqual(['plants']);

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'ApiAnahtari', varlikId: s.id, alan: 'kapsam' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.oncekiDeger).toContain('assets');
  });

  it('yetkisiz kullanıcı anahtar üretemez', async () => {
    const s = await kimlikle([yetki('okuyucu')], () =>
      apiAnahtariUret({ ad: 'Olmaz', uclar: ['plants'] }));
    expect(s.ok).toBe(false);
  });
});

describe('UY-52 · Kapsam kapısı HATTA çalışır', () => {
  const bearer = (token: string, ek: Record<string, string> = {}) => ({
    Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...ek,
  });

  async function anahtar(uclar: string[], saltOkunur: boolean): Promise<string> {
    const s = await apiAnahtariUret({
      ad: `Kapı ${uclar.join('+')} ${saltOkunur}`, uclar, saltOkunur,
    });
    if (!s.ok) throw new Error(s.hata);
    return s.token;
  }

  it('kapsamındaki okuma ucu 200 döner', async () => {
    const token = await anahtar(['plants'], true);
    const y = await santralleriGetir(
      new Request('http://test/api/v1/plants', { headers: bearer(token) }));
    expect(y.status).toBe(200);
    // Kapsamı tanımlı anahtar "miras" başlığı TAŞIMAZ.
    expect(y.headers.get('X-Anahtar-Kapsami')).toBeNull();
  });

  /* Kapsam dışı uç: sahibi YÖNETİCİ ve rol kapısı geçer; reddi yapan
     yalnız anahtarın kendi kapsamıdır. */
  it('kapsam DIŞI uç 403 döner — sahibi yönetici olsa bile', async () => {
    const token = await anahtar(['assets'], true);
    const y = await santralleriGetir(
      new Request('http://test/api/v1/plants', { headers: bearer(token) }));
    expect(y.status).toBe(403);
    const govde = await y.json() as { error: { code: string; message: string } };
    expect(govde.error.code).toBe('kapsam_disi');
    expect(govde.error.message).toContain('plants');
  });

  it('SALT OKUNUR anahtar yazma ucundan 403 alır ve hiçbir şey yazılmaz', async () => {
    const token = await anahtar(['plants'], true);
    const once = await db.zafiyet.count();
    const y = await zafiyetYaz(new Request('http://test/api/v1/vulnerabilities', {
      method: 'POST',
      headers: bearer(token, { 'Idempotency-Key': 'fazf-salt-okunur-1' }),
      body: JSON.stringify({ records: [] }),
    }));
    expect(y.status).toBe(403);
    expect((await y.json() as { error: { message: string } }).error.message)
      .toMatch(/SALT OKUNUR/);
    expect(await db.zafiyet.count()).toBe(once);
  });

  it('reddedilen istek de DENETİM İZİ bırakır — sessiz düşmez', async () => {
    const token = await anahtar(['assets'], true);
    await santralleriGetir(
      new Request('http://test/api/v1/plants', { headers: bearer(token) }));
    const kayit = await db.apiIstegi.findFirst({
      where: { yol: '/api/v1/plants', durumKodu: 403 },
      orderBy: { zaman: 'desc' },
    });
    expect(kayit).not.toBeNull();
    expect(kayit!.hataKodu).toBe('kapsam_disi');
  });

  /* Eski anahtarları kesmek çalışan entegrasyonları sessizce kırardı;
     bunun yerine çalışır ve yanıt bunu SÖYLER. */
  it('kapsamı TANIMSIZ eski anahtar çalışır ve yanıt bunu işaretler', async () => {
    const s = await apiAnahtariUret({ ad: 'Eski', uclar: ['plants'], saltOkunur: false });
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    // Göç öncesi kaydı taklit et: kapsam alanı hiç doldurulmamış.
    await db.apiAnahtari.update({
      where: { id: s.id }, data: { kapsamJson: null },
    });

    const y = await santralleriGetir(
      new Request('http://test/api/v1/plants', { headers: bearer(s.token) }));
    expect(y.status).toBe(200);
    expect(y.headers.get('X-Anahtar-Kapsami')).toBe('tanimsiz');
  });
});

/* ═══ UY-56 · Saklama · hold · imha ════════════════════════════════════ */

describe('UY-56 · Saklama politikası', () => {
  it('dayanaksız politika yazılamaz', async () => {
    expect(hataMetni(await saklamaPolitikasiKaydet({
      varlikTipi: 'IsKosusu', saklamaGun: 90, sureSonu: 'oner', dayanak: '   ',
    }))).toMatch(/dayanak/i);
  });

  it('DEĞİŞMEZ aileye imha_oner yazılamaz', async () => {
    expect(hataMetni(await saklamaPolitikasiKaydet({
      varlikTipi: 'AktiviteKaydi', saklamaGun: 3650,
      sureSonu: 'imha_oner', dayanak: 'deneme',
    }))).toMatch(/DEĞİŞMEZ/);
  });

  it('değişmez aileye SÜRE yazılabilir — "ne kadar tutuyoruz" denetimin sorusu', async () => {
    expect(hataMetni(await saklamaPolitikasiKaydet({
      varlikTipi: 'AktiviteKaydi', saklamaGun: 3650,
      sureSonu: 'oner', dayanak: 'Kurum arşiv politikası',
    }))).toBe('');
    const p = await db.saklamaPolitikasi.findUniqueOrThrow({
      where: { varlikTipi: 'AktiviteKaydi' },
    });
    expect(p.saklamaGun).toBe(3650);
  });

  it('SÜRESİZ politika geçerlidir ama dayanağı yine zorunludur', async () => {
    expect(hataMetni(await saklamaPolitikasiKaydet({
      varlikTipi: 'DegerlendirmeTarihcesi', saklamaGun: null,
      sureSonu: 'oner', dayanak: 'Değerlendirme geçmişi kalıcı tutulur',
    }))).toBe('');
    const p = await db.saklamaPolitikasi.findUniqueOrThrow({
      where: { varlikTipi: 'DegerlendirmeTarihcesi' },
    });
    expect(p.saklamaGun).toBeNull();
  });

  it('yetkisiz kullanıcı politika yazamaz — yazma yetkisi YETMEZ', async () => {
    expect(hataMetni(await kimlikle([yetki('katkici')], () =>
      saklamaPolitikasiKaydet({
        varlikTipi: 'IsKosusu', saklamaGun: 30, sureSonu: 'oner', dayanak: 'x',
      })))).toMatch(/yetki/i);
  });
});

describe('UY-56 · Legal hold imhayı DURDURUR', () => {
  it('hold varken imha önerisi açılamaz; kalkınca açılır', async () => {
    /* Süresi kesin dolmuş kayıt bırakan bir aile seç: ApiIstegi
       testlerin kendi trafiğinden dolar. */
    expect(hataMetni(await saklamaPolitikasiKaydet({
      varlikTipi: 'ApiIstegi', saklamaGun: 1, sureSonu: 'imha_oner',
      dayanak: 'API istek kaydı 1 gün',
    }))).toBe('');
    await db.apiIstegi.create({
      data: {
        yontem: 'GET', yol: '/api/v1/eski', durumKodu: 200,
        zaman: new Date(Date.now() - 30 * 86_400_000),
      },
    });

    const hold = await legalHoldKoy({
      ad: 'FAZ F soruşturması', varlikTipi: 'ApiIstegi',
      gerekce: 'Devam eden inceleme',
    });
    expect(hataMetni(hold)).toBe('');

    const engellenen = await imhaOnerisiAc({
      varlikTipi: 'ApiIstegi', gerekce: 'süre doldu',
    });
    expect(hataMetni(engellenen)).toMatch(/MUHAFAZA/);

    const kayit = await db.legalHold.findFirstOrThrow({
      where: { ad: 'FAZ F soruşturması' },
    });
    expect(hataMetni(await legalHoldKaldir({
      id: kayit.id, gerekce: 'İnceleme kapandı',
    }))).toBe('');

    /* Hold kaydı SİLİNMEZ: ne zaman konduğu ve kalktığı denetimin
       sorusudur. */
    const sonra = await db.legalHold.findUniqueOrThrow({ where: { id: kayit.id } });
    expect(sonra.durum).toBe('kaldirildi');
    expect(sonra.kaldirmaGerekcesi).toBe('İnceleme kapandı');

    expect(hataMetni(await imhaOnerisiAc({
      varlikTipi: 'ApiIstegi', gerekce: 'süre doldu',
    }))).toBe('');
  });
});

describe('UY-56 · İmha DÖRT GÖZ ister', () => {
  async function yeniOneri(): Promise<string> {
    await db.apiIstegi.create({
      data: {
        yontem: 'GET', yol: '/api/v1/eski-2', durumKodu: 200,
        zaman: new Date(Date.now() - 60 * 86_400_000),
      },
    });
    const s = await imhaOnerisiAc({ varlikTipi: 'ApiIstegi', gerekce: 'süre doldu' });
    expect(hataMetni(s)).toBe('');
    const karar = await db.imhaKarari.findFirstOrThrow({
      where: { durum: 'oneri' }, orderBy: { olusturuldu: 'desc' },
    });
    return karar.id;
  }

  it('öneren KENDİ önerisini onaylayamaz', async () => {
    const id = await yeniOneri();
    expect(hataMetni(await imhaKarariniOnayla({ id }))).toMatch(/dört göz/i);
    const karar = await db.imhaKarari.findUniqueOrThrow({ where: { id } });
    expect(karar.durum).toBe('oneri');
  });

  it('BAŞKA biri onaylar; onay tek başına SİLMEZ', async () => {
    const id = await yeniOneri();
    const once = await db.apiIstegi.count();
    expect(hataMetni(await baskaKisiyle(ikinciKisi, () =>
      imhaKarariniOnayla({ id, gerekce: 'uygun' })))).toBe('');
    const karar = await db.imhaKarari.findUniqueOrThrow({ where: { id } });
    expect(karar.durum).toBe('onaylandi');
    expect(karar.silinenSayi).toBeNull();
    expect(await db.apiIstegi.count()).toBe(once);
  });

  it('ONAYDAN SONRA konan hold imhayı durdurur', async () => {
    const id = await yeniOneri();
    expect(hataMetni(await baskaKisiyle(ikinciKisi, () =>
      imhaKarariniOnayla({ id })))).toBe('');

    const hold = await legalHoldKoy({
      ad: 'Sonradan gelen hold', varlikTipi: 'ApiIstegi', gerekce: 'yeni dava',
    });
    expect(hataMetni(hold)).toBe('');

    const once = await db.apiIstegi.count();
    expect(hataMetni(await imhaKarariniUygula({ id }))).toMatch(/SONRA/);
    expect(await db.apiIstegi.count()).toBe(once);

    const kayit = await db.legalHold.findFirstOrThrow({
      where: { ad: 'Sonradan gelen hold' },
    });
    await legalHoldKaldir({ id: kayit.id, gerekce: 'temizlik' });
  });

  it('onaylanmış karar UYGULANIR ve silinen sayı yeniden ÖLÇÜLÜR', async () => {
    const id = await yeniOneri();
    expect(hataMetni(await baskaKisiyle(ikinciKisi, () =>
      imhaKarariniOnayla({ id })))).toBe('');

    const eskiler = await db.apiIstegi.count({
      where: { zaman: { lt: new Date(Date.now() - 86_400_000) } },
    });
    expect(eskiler).toBeGreaterThan(0);

    expect(hataMetni(await imhaKarariniUygula({ id }))).toBe('');
    const karar = await db.imhaKarari.findUniqueOrThrow({ where: { id } });
    expect(karar.durum).toBe('uygulandi');
    expect(karar.silinenSayi).toBe(eskiler);
    expect(await db.apiIstegi.count({
      where: { zaman: { lt: new Date(Date.now() - 86_400_000) } },
    })).toBe(0);

    /* İmha edilen kayıtların ardında kalan tek şey denetim izidir ve o
       iz değişmez ailededir — silinemez. */
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'ImhaKarari', varlikId: id, alan: 'durum' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.yeniDeger).toBe('uygulandi');
    expect(iz?.gerekce).toContain('kayıt imha edildi');
  });

  it('reddedilen karar SİLİNMEZ, durumu değişir', async () => {
    const id = await yeniOneri();
    expect(hataMetni(await imhaKarariniReddet({
      id, gerekce: 'Dönem kapanmadı',
    }))).toBe('');
    const karar = await db.imhaKarari.findUniqueOrThrow({ where: { id } });
    expect(karar.durum).toBe('reddedildi');
  });

  it('süresi dolmuş kayıt yoksa öneri AÇILMAZ — sıfır kayıtlı karar yazılmaz', async () => {
    /* Önceki testler yeni "eski" satırlar bıraktı; burada ölçülen şey
       imha değil KAPI, o yüzden zemini açıkça temizliyoruz. */
    await db.apiIstegi.deleteMany({
      where: { zaman: { lt: new Date(Date.now() - 86_400_000) } },
    });
    const once = await db.imhaKarari.count();
    expect(hataMetni(await imhaOnerisiAc({
      varlikTipi: 'ApiIstegi', gerekce: 'tekrar',
    }))).toMatch(/kayıt yok/i);
    // Boş bir karar kaydı da AÇILMAZ.
    expect(await db.imhaKarari.count()).toBe(once);
  });
});

/* ═══ UY-57 · Dış denetçi erişimi ══════════════════════════════════════ */

describe('UY-57 · Davet GERÇEK yetki satırı yazar', () => {
  let denetciId = '';

  beforeAll(async () => {
    const kisi = await db.kullanici.create({
      data: { adSoyad: 'Dış Denetçi', eposta: `denetci-${Date.now()}@test`, aktif: true },
    });
    denetciId = kisi.id;
  });

  it('KAPSAMSIZ davet reddedilir', async () => {
    expect(hataMetni(await denetciDavetEt({
      kullaniciId: denetciId, firma: 'X Denetim',
      bitis: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      tesisIdler: [],
    }))).toMatch(/en az bir santral/i);
  });

  it('SÜRESİZ davet yoktur: geçmiş bitiş reddedilir', async () => {
    expect(hataMetni(await denetciDavetEt({
      kullaniciId: denetciId, firma: 'X Denetim',
      bitis: new Date(Date.now() - 86_400_000).toISOString(),
      tesisIdler: [tesisler[0].id],
    }))).toMatch(/gelecekte/i);
  });

  it('süre TAVANI aşılamaz', async () => {
    expect(hataMetni(await denetciDavetEt({
      kullaniciId: denetciId, firma: 'X Denetim',
      bitis: new Date(Date.now() + 400 * 86_400_000).toISOString(),
      tesisIdler: [tesisler[0].id],
    }))).toMatch(/en çok 365 gün/i);
  });

  it('geçerli davet erişimi AÇAR ve dis_denetci yetkilerini yazar', async () => {
    expect(hataMetni(await denetciDavetEt({
      kullaniciId: denetciId, firma: 'X Denetim',
      bitis: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      tesisIdler: [tesisler[0].id, tesisler[1].id],
    }))).toBe('');

    const erisim = await db.denetciErisimi.findFirstOrThrow({
      where: { kullaniciId: denetciId }, include: { kapsamlar: true },
    });
    expect(erisim.durum).toBe('aktif');
    expect(erisim.kapsamlar.length).toBe(2);

    /* KRİTİK: defter yazıldı diye kapı açılmış olmaz. Erişimi gerçekten
       uygulayan şey yetki satırlarıdır. */
    const yetkiler = await db.yetki.findMany({
      where: { kullaniciId: denetciId, rol: 'dis_denetci' },
    });
    expect(yetkiler.map((y) => y.tesisId).sort())
      .toEqual([tesisler[0].id, tesisler[1].id].sort());
  });

  it('İPTAL yetki satırlarını da KALDIRIR', async () => {
    const erisim = await db.denetciErisimi.findFirstOrThrow({
      where: { kullaniciId: denetciId, durum: 'aktif' },
    });
    expect(hataMetni(await denetciErisimiIptal({
      id: erisim.id, gerekce: 'Denetim erken kapandı',
    }))).toBe('');

    expect(await db.yetki.count({
      where: { kullaniciId: denetciId, rol: 'dis_denetci' },
    })).toBe(0);

    // Kayıt silinmez: kimin ne zaman girip çıktığı kayıttır.
    const sonra = await db.denetciErisimi.findUniqueOrThrow({ where: { id: erisim.id } });
    expect(sonra.durum).toBe('iptal');
    expect(sonra.iptalGerekcesi).toBe('Denetim erken kapandı');

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'DenetciErisimi', varlikId: erisim.id },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.gerekce).toContain('yetki satırı kaldırıldı');
  });

  it('SÜRESİ DOLAN erişimin yetkileri de kapanır', async () => {
    expect(hataMetni(await denetciDavetEt({
      kullaniciId: denetciId, firma: 'X Denetim',
      bitis: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      tesisIdler: [tesisler[0].id],
    }))).toBe('');
    const erisim = await db.denetciErisimi.findFirstOrThrow({
      where: { kullaniciId: denetciId, durum: 'aktif' },
    });
    expect(await db.yetki.count({
      where: { kullaniciId: denetciId, rol: 'dis_denetci' },
    })).toBe(1);

    // Süreyi geçmişe çek: zamanlayıcı beklemeden aynı durumu üret.
    await db.denetciErisimi.update({
      where: { id: erisim.id },
      data: { bitis: new Date(Date.now() - 86_400_000) },
    });

    expect(hataMetni(await denetciSureleriniIsle())).toBe('');
    expect((await db.denetciErisimi.findUniqueOrThrow({ where: { id: erisim.id } })).durum)
      .toBe('suresi_doldu');
    expect(await db.yetki.count({
      where: { kullaniciId: denetciId, rol: 'dis_denetci' },
    })).toBe(0);
  });

  it('yetkisiz kullanıcı denetçi davet edemez', async () => {
    expect(hataMetni(await kimlikle([yetki('denetim_sorumlusu')], () =>
      denetciDavetEt({
        kullaniciId: denetciId, firma: 'X',
        bitis: new Date(Date.now() + 10 * 86_400_000).toISOString(),
        tesisIdler: [tesisler[0].id],
      })))).toMatch(/yetki/i);
  });
});
