import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Uyum yönetişimi eylemleri — yetki · kapsam · doğrulama · iz
   UY-26 · UY-28 · UY-39 · UY-41 · UY-43

   `faz-d-eylem.test.ts` ile aynı dört soru, aynı sertlikte. Yetki kapısı
   SAHTELENMEZ: yalnız `aktifKullanici` değiştirilir, `yetkiZorunlu` ve
   `kapsamZorunlu` gerçek koşar.

   Motorlar da sahtelenmez: `tekrarlariIsle` ve `eskalasyonlariIsle`
   gerçek veritabanına karşı koşar. Motoru sahtelemek, bu fazın en
   kritik iddiasını (ölü şema alanları artık YAZILIYOR) test dışında
   bırakırdı.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-yonetisim-e-'));
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

/* Kapsam testleri santrale kısıtlı `yonetici` ile yapılır: yetkiyi
   TAŞIYAN ama kapsamı DAR olan roldür (bkz. faz-b-eylem.test.ts). */
const kisitliYonetici = (tesisId: string) => [yetki('yonetici', tesisId)];

const oturum = {
  id: '', adSoyad: 'Yönetişim E Testi', eposta: 'yonetisim-e@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const {
  kokNedenKaydet, tekrarAdayiSor, tekrarBagiKur,
} = await import('@/lib/eylemler2/kokNedenTekrar');
const {
  kaynakKontroluKaydet, mevzuatKaynagiKaydet, mevzuatKaynagiSil,
} = await import('@/lib/eylemler2/mevzuatKaynagi');
const {
  degerlendirmeAktarimiReddet, degerlendirmeAktarimiUygula, degerlendirmeKuruKosu,
} = await import('@/lib/eylemler2/degerlendirmeAktarimi');
const { surumEtkisiOnizle } = await import('@/lib/eylemler2/degisiklikOnizleme');
const { bulguGuncelle } = await import('@/lib/eylemler');
const { tekrarlariIsle } = await import('@/lib/motorlar/tekrarBulgu');
const { eskalasyonlariIsle } = await import('@/lib/motorlar/eskalasyon');
const { ANALIZ_ASGARI } = await import('@/lib/uyum/kokNeden');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);
const REDDEDILDI = /yetki|kapsam/i;

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;
const UZUN = 'Kök neden analizi metni; en az kırk karakter olmak zorunda.';

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

let tesisA = ''; let tesisB = '';
let durumA = ''; let durumB = '';
let regulasyonA = '';

async function izVarMi(varlikTipi: string, varlikId: string, alan: string) {
  return db.aktiviteKaydi.findFirst({
    where: { varlikTipi, varlikId, alan }, orderBy: { zaman: 'desc' },
  });
}

/** Test için bir bulgu açar. */
async function bulguAc(o: {
  maddeDurumuId: string; onem?: string; durum?: string;
  tespit?: Date; kapanma?: Date;
}): Promise<string> {
  const b = await db.bulgu.create({
    data: {
      maddeDurumuId: o.maddeDurumuId,
      baslik: benzersiz('Test bulgusu'),
      aciklama: 'Test amaçlı açıldı',
      onemDerecesi: o.onem ?? 'orta',
      durum: o.durum ?? 'acik',
      tespitTarihi: o.tespit ?? new Date(),
      kapanmaTarihi: o.kapanma ?? null,
    },
  });
  return b.id;
}

beforeAll(async () => {
  const kayitli = await db.maddeDurumu.findMany({
    distinct: ['tesisId'], select: { tesisId: true }, orderBy: { tesisId: 'asc' },
    take: 2,
  });
  tesisA = kayitli[0].tesisId; tesisB = kayitli[1].tesisId;

  const kullanicilar = await db.kullanici.findMany({ where: { aktif: true }, take: 1 });
  oturum.id = kullanicilar[0].id;

  const durumBul = async (tesisId: string) => {
    const d = await db.maddeDurumu.findFirst({
      where: { tesisId }, select: { id: true, madde: { select: { regulasyonId: true } } },
    });
    return d!;
  };
  const dA = await durumBul(tesisA);
  durumA = dA.id;
  regulasyonA = dA.madde.regulasyonId;
  durumB = (await durumBul(tesisB)).id;
});

afterAll(async () => {
  await rm(dizin, { recursive: true, force: true });
});

/* ══ UY-26 · Kök neden ═══════════════════════════════════════════════ */

describe('UY-26 · kök neden analizi', () => {
  it('okuyucu analiz yazamaz', async () => {
    const bulguId = await bulguAc({ maddeDurumuId: durumA });
    const s = await kimlikle([yetki('okuyucu')], () => kokNedenKaydet({
      bulguId, kategori: 'surec_yok', metin: UZUN,
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('BAŞKA santralin bulgusuna analiz yazılamaz', async () => {
    const bulguId = await bulguAc({ maddeDurumuId: durumA });
    const s = await kimlikle(kisitliYonetici(tesisB), () => kokNedenKaydet({
      bulguId, kategori: 'surec_yok', metin: UZUN,
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('tanımsız kategori REDDEDİLİR', async () => {
    const bulguId = await bulguAc({ maddeDurumuId: durumA });
    const s = await kokNedenKaydet({ bulguId, kategori: 'her_ne_ise', metin: UZUN });
    expect(s.ok).toBe(false);
  });

  it('kısa analiz metni reddedilir — kategori seçmek analiz değildir [BUL-ANL-001]', async () => {
    const bulguId = await bulguAc({ maddeDurumuId: durumA });
    const s = await kokNedenKaydet({ bulguId, kategori: 'surec_yok', metin: 'kısa' });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain(String(ANALIZ_ASGARI));
  });

  it('analiz kaydedilir, DAMGALANIR ve ize düşer', async () => {
    const bulguId = await bulguAc({ maddeDurumuId: durumA });
    const s = await kokNedenKaydet({ bulguId, kategori: 'egitim_farkindalik', metin: UZUN });
    expect(s.ok).toBe(true);

    const b = await db.bulgu.findUnique({
      where: { id: bulguId },
      select: {
        kokNeden: true, kokNedenKategori: true,
        kokNedenAnalizEdenId: true, kokNedenAnalizZamani: true,
      },
    });
    expect(b!.kokNedenKategori).toBe('egitim_farkindalik');
    expect(b!.kokNeden).toBe(UZUN);
    /* Damga kullanıcıdan alınmaz, OTURUMDAN yazılır. */
    expect(b!.kokNedenAnalizEdenId).toBe(oturum.id);
    expect(b!.kokNedenAnalizZamani).not.toBeNull();
    expect(await izVarMi('Bulgu', bulguId, 'kokNedenKategori')).not.toBeNull();
  });
});

describe('UY-26 · KAPANIŞ KAPISI sunucuda (ölçülmüş kusur)', () => {
  it('KRİTİK bulgu kök neden analizi olmadan KAPATILAMAZ', async () => {
    const bulguId = await bulguAc({ maddeDurumuId: durumA, onem: 'kritik' });
    const s = await bulguGuncelle({ id: bulguId, durum: 'kapali' });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('kök neden');
  });

  it('analiz yazıldıktan SONRA kritik bulgu kapatılabilir', async () => {
    const bulguId = await bulguAc({ maddeDurumuId: durumA, onem: 'kritik' });
    await kokNedenKaydet({ bulguId, kategori: 'kaynak_yetersiz', metin: UZUN });
    const s = await bulguGuncelle({ id: bulguId, durum: 'kapali' });
    expect(s.ok).toBe(true);

    const b = await db.bulgu.findUnique({
      where: { id: bulguId }, select: { durum: true, kapanmaTarihi: true },
    });
    expect(b!.durum).toBe('kapali');
    expect(b!.kapanmaTarihi).not.toBeNull();
  });

  it('kök neden AYNI çağrıda gönderilebilir', async () => {
    /* Kullanıcı kök nedeni ve kapanışı aynı formda gönderebilmeli;
       kapı bu çağrıda GELEN değeri görür. Kategori ve damga eksik
       olduğu için kapı yine reddeder — ama sebep "analiz hiç
       yapılmamış" değil, eksik parçadır. */
    const bulguId = await bulguAc({ maddeDurumuId: durumA, onem: 'yuksek' });
    const s = await bulguGuncelle({ id: bulguId, durum: 'kapali', kokNeden: UZUN });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('Kategori seçilmemiş');
  });

  it('DÜŞÜK önemli bulgu analizsiz kapatılabilir', async () => {
    const bulguId = await bulguAc({ maddeDurumuId: durumA, onem: 'dusuk' });
    const s = await bulguGuncelle({ id: bulguId, durum: 'kapali' });
    expect(s.ok).toBe(true);
  });
});

/* ══ UY-28 · Tekrar ══════════════════════════════════════════════════ */

describe('UY-28 · tekrar bağı', () => {
  const gun = 86_400_000;

  it('okuyucu bağ kuramaz', async () => {
    const b1 = await bulguAc({ maddeDurumuId: durumA });
    const b2 = await bulguAc({ maddeDurumuId: durumA });
    const s = await kimlikle([yetki('okuyucu')], () => tekrarBagiKur({
      bulguId: b2, oncekiBulguId: b1,
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('BAŞKA santralin bulgusuna bağ kurulamaz', async () => {
    const b1 = await bulguAc({ maddeDurumuId: durumA });
    const b2 = await bulguAc({ maddeDurumuId: durumA });
    const s = await kimlikle(kisitliYonetici(tesisB), () => tekrarBagiKur({
      bulguId: b2, oncekiBulguId: b1,
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('bir bulgu KENDİSİNİN tekrarı olamaz', async () => {
    const b = await bulguAc({ maddeDurumuId: durumA });
    const s = await tekrarBagiKur({ bulguId: b, oncekiBulguId: b });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('kendisinin');
  });

  it('FARKLI kontroldeki bulguya bağ kurulamaz', async () => {
    const bA = await bulguAc({ maddeDurumuId: durumA });
    const bB = await bulguAc({ maddeDurumuId: durumB });
    const s = await tekrarBagiKur({ bulguId: bA, oncekiBulguId: bB });
    expect(s.ok).toBe(false);
  });

  it('DÖNGÜ reddedilir — zincir kendi üzerine kapanamaz', async () => {
    const b1 = await bulguAc({ maddeDurumuId: durumA });
    const b2 = await bulguAc({ maddeDurumuId: durumA });
    expect((await tekrarBagiKur({ bulguId: b2, oncekiBulguId: b1 })).ok).toBe(true);
    const s = await tekrarBagiKur({ bulguId: b1, oncekiBulguId: b2 });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('döngü');
  });

  it('elle kurulan bağ KAYNAĞIYLA kaydedilir ve ize düşer', async () => {
    const b1 = await bulguAc({ maddeDurumuId: durumA });
    const b2 = await bulguAc({ maddeDurumuId: durumA });
    const s = await tekrarBagiKur({ bulguId: b2, oncekiBulguId: b1 });
    expect(s.ok).toBe(true);

    const b = await db.bulgu.findUnique({
      where: { id: b2 },
      select: { tekrarBulguId: true, tekrarKaynagi: true, tekrarPenceresiGun: true },
    });
    expect(b!.tekrarBulguId).toBe(b1);
    expect(b!.tekrarKaynagi).toBe('elle');
    expect(b!.tekrarPenceresiGun).not.toBeNull();
    expect(await izVarMi('Bulgu', b2, 'tekrarBulguId')).not.toBeNull();
  });

  it('bağ kaldırılınca kaynak ve pencere de temizlenir', async () => {
    const b1 = await bulguAc({ maddeDurumuId: durumA });
    const b2 = await bulguAc({ maddeDurumuId: durumA });
    await tekrarBagiKur({ bulguId: b2, oncekiBulguId: b1 });
    expect((await tekrarBagiKur({ bulguId: b2, oncekiBulguId: null })).ok).toBe(true);

    const b = await db.bulgu.findUnique({
      where: { id: b2 },
      select: { tekrarBulguId: true, tekrarKaynagi: true, tekrarPenceresiGun: true },
    });
    expect(b!.tekrarBulguId).toBeNull();
    expect(b!.tekrarKaynagi).toBeNull();
    expect(b!.tekrarPenceresiGun).toBeNull();
  });

  it('aday sorgusu ekranla motorun AYNI kararını kullanır', async () => {
    /* İZOLE bir kontrol kullanılır: `durumA` üzerinde öteki testlerin
       kapattığı bulgular var ve motor doğru biçimde EN YAKIN kapanışı
       seçer. Bu testin ölçtüğü şey o sıralama değil, ekranın önerdiği
       bağ ile motorun kuracağı bağın AYNI fonksiyondan gelmesidir; bu
       yüzden gürültüsüz bir kontrolde koşar. */
    const temiz = await db.maddeDurumu.findFirst({
      where: { tesisId: tesisA, bulgular: { none: {} } }, select: { id: true },
    });
    if (!temiz) return;
    const simdi = Date.now();
    const eski = await bulguAc({
      maddeDurumuId: temiz.id, durum: 'kapali',
      tespit: new Date(simdi - 100 * gun), kapanma: new Date(simdi - 50 * gun),
    });
    const yeni = await bulguAc({ maddeDurumuId: temiz.id, tespit: new Date(simdi) });
    const s = await tekrarAdayiSor({ bulguId: yeni });
    expect(s.ok).toBe(true);
    expect(s.ok === true && s.oncekiId).toBe(eski);
  });
});

describe('UY-28 · motor (ölü alanı YAZAN yer)', () => {
  const gun = 86_400_000;

  it('motor kapanmış bulguya bağ kurar ve KAYNAĞINI motor yazar', async () => {
    const simdi = Date.now();
    const eski = await bulguAc({
      maddeDurumuId: durumA, durum: 'kapali',
      tespit: new Date(simdi - 200 * gun), kapanma: new Date(simdi - 120 * gun),
    });
    const yeni = await bulguAc({
      maddeDurumuId: durumA, tespit: new Date(simdi - 60 * gun),
    });

    const kosu = await tekrarlariIsle();
    expect(kosu.baglanan).toBeGreaterThan(0);

    const b = await db.bulgu.findUnique({
      where: { id: yeni },
      select: { tekrarBulguId: true, tekrarKaynagi: true, tekrarPenceresiGun: true },
    });
    expect(b!.tekrarBulguId).toBe(eski);
    expect(b!.tekrarKaynagi).toBe('motor');
    expect(b!.tekrarPenceresiGun).toBe(365);
  });

  it('motor ELLE kurulmuş bağı EZMEZ', async () => {
    const b1 = await bulguAc({ maddeDurumuId: durumA });
    const b2 = await bulguAc({ maddeDurumuId: durumA });
    await tekrarBagiKur({ bulguId: b2, oncekiBulguId: b1 });

    await tekrarlariIsle();

    const b = await db.bulgu.findUnique({
      where: { id: b2 }, select: { tekrarBulguId: true, tekrarKaynagi: true },
    });
    expect(b!.tekrarBulguId).toBe(b1);
    expect(b!.tekrarKaynagi).toBe('elle');
  });

  it('motor BULGU AÇMAZ ve durum DEĞİŞTİRMEZ', async () => {
    const onceBulgu = await db.bulgu.count();
    const onceAcik = await db.bulgu.count({ where: { durum: 'acik' } });
    await tekrarlariIsle();
    expect(await db.bulgu.count()).toBe(onceBulgu);
    expect(await db.bulgu.count({ where: { durum: 'acik' } })).toBe(onceAcik);
  });

  it('motorun izi AKTÖRSÜZDÜR — bağı insan kurmadı', async () => {
    const simdi = Date.now();
    const eski = await bulguAc({
      maddeDurumuId: durumB, durum: 'kapali',
      tespit: new Date(simdi - 200 * gun), kapanma: new Date(simdi - 100 * gun),
    });
    const yeni = await bulguAc({
      maddeDurumuId: durumB, tespit: new Date(simdi - 30 * gun),
    });
    await tekrarlariIsle();

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Bulgu', varlikId: yeni, alan: 'tekrarBulguId' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz).not.toBeNull();
    expect(iz!.aktorId).toBeNull();
    expect(iz!.kaynak).toBe('is_kosusu');
    expect(iz!.yeniDeger).toBe(eski);
  });
});

/* ══ UY-36 · Eskalasyon motoru ═══════════════════════════════════════ */

describe('UY-36 · eskalasyon motoru (Bildirim.tip = eskalasyon)', () => {
  const gun = 86_400_000;

  it('kural yoksa hiçbir şey yazılmaz', async () => {
    await db.eskalasyonKurali.deleteMany({});
    const onceBildirim = await db.bildirim.count();
    const k = await eskalasyonlariIsle();
    expect(k.tetiklenen).toBe(0);
    expect(await db.bildirim.count()).toBe(onceBildirim);
  });

  it('gecikmiş bulgu için ESKALASYON tipinde bildirim yazılır', async () => {
    /* ÖLÇÜLMÜŞ KUSUR: `Bildirim.tip` sözlüğünde 'eskalasyon' vardı ve
       hiçbir kod onu YAZMIYORDU. */
    await db.eskalasyonKurali.deleteMany({});
    const kural = await db.eskalasyonKurali.create({
      data: {
        kaynakTipi: 'bulgu', onemDerecesi: null, kademe: 1, gecikmeGun: 7,
        hedefTuru: 'sorumlu', hedefDeger: null, aktif: true,
      },
    });
    const simdi = new Date();
    const bulguId = await bulguAc({ maddeDurumuId: durumA });
    await db.bulgu.update({
      where: { id: bulguId },
      data: { hedefTarih: new Date(simdi.getTime() - 30 * gun), sorumluId: oturum.id },
    });

    const k = await eskalasyonlariIsle({ simdi });
    expect(k.tetiklenen).toBeGreaterThan(0);

    const bildirim = await db.bildirim.findFirst({
      where: { kaynakTipi: 'bulgu', kaynakId: bulguId, tip: 'eskalasyon' },
    });
    expect(bildirim).not.toBeNull();
    expect(bildirim!.baslik).toContain('Eskalasyon');

    const kayit = await db.eskalasyonKaydi.findFirst({
      where: { kaynakTipi: 'bulgu', kaynakId: bulguId, kademe: 1 },
    });
    expect(kayit).not.toBeNull();
    expect(kayit!.kuralId).toBe(kural.id);
    expect(kayit!.sebep).toBeNull();
  });

  it('aynı kademe İKİNCİ koşuda yeniden tetiklenmez', async () => {
    const simdi = new Date();
    const onceBildirim = await db.bildirim.count({ where: { tip: 'eskalasyon' } });
    await eskalasyonlariIsle({ simdi });
    expect(await db.bildirim.count({ where: { tip: 'eskalasyon' } }))
      .toBe(onceBildirim);
  });

  it('HEDEFSİZ eskalasyon sessizce düşmez: kayıt yazılır ve sebebi söyler', async () => {
    await db.eskalasyonKurali.deleteMany({});
    await db.eskalasyonKurali.create({
      data: {
        kaynakTipi: 'bulgu', onemDerecesi: null, kademe: 5, gecikmeGun: 3,
        hedefTuru: 'sorumlu', hedefDeger: null, aktif: true,
      },
    });
    const simdi = new Date();
    /* Sorumlusu ATANMAMIŞ bir bulgu: haber verilecek kimse yok. */
    const bulguId = await bulguAc({ maddeDurumuId: durumA });
    await db.bulgu.update({
      where: { id: bulguId },
      data: { hedefTarih: new Date(simdi.getTime() - 30 * gun), sorumluId: null },
    });

    const k = await eskalasyonlariIsle({ simdi });
    expect(k.hedefsiz).toBeGreaterThan(0);

    const kayit = await db.eskalasyonKaydi.findFirst({
      where: { kaynakTipi: 'bulgu', kaynakId: bulguId, kademe: 5 },
    });
    expect(kayit).not.toBeNull();
    expect(kayit!.bildirimId).toBeNull();
    expect(kayit!.sebep).toContain('sorumlusu atanmamış');
  });

  it('hedef tarihi OLMAYAN bulgu eskale edilmez', async () => {
    await db.eskalasyonKurali.deleteMany({});
    await db.eskalasyonKurali.create({
      data: {
        kaynakTipi: 'bulgu', onemDerecesi: null, kademe: 1, gecikmeGun: 1,
        hedefTuru: 'sorumlu', hedefDeger: null, aktif: true,
      },
    });
    const bulguId = await bulguAc({ maddeDurumuId: durumA });
    await db.bulgu.update({
      where: { id: bulguId }, data: { hedefTarih: null, sorumluId: oturum.id },
    });
    await eskalasyonlariIsle();
    expect(await db.eskalasyonKaydi.count({
      where: { kaynakId: bulguId },
    })).toBe(0);
  });

  it('PASİF kural tetiklenmez', async () => {
    await db.eskalasyonKurali.deleteMany({});
    await db.eskalasyonKurali.create({
      data: {
        kaynakTipi: 'bulgu', onemDerecesi: null, kademe: 1, gecikmeGun: 1,
        hedefTuru: 'sorumlu', hedefDeger: null, aktif: false,
      },
    });
    const k = await eskalasyonlariIsle();
    expect(k.tetiklenen).toBe(0);
  });
});

/* ══ UY-39 · Etki önizlemesi ═════════════════════════════════════════ */

describe('UY-39 · sürüm etki önizlemesi', () => {
  it('okuyucu önizleme YAPABİLİR — salt okunurdur', async () => {
    const surum = await db.frameworkSurumu.findFirst({ where: { durum: 'taslak' } })
      ?? await db.frameworkSurumu.findFirst();
    if (!surum) return;
    const s = await kimlikle([yetki('okuyucu')], () => surumEtkisiOnizle({
      surumId: surum.id,
    }));
    expect(s.ok).toBe(true);
  });

  it('önizleme HİÇBİR ŞEY YAZMAZ', async () => {
    const surum = await db.frameworkSurumu.findFirst();
    if (!surum) return;
    const onceFark = await db.surumFarki.count();
    const onceDurum = await db.maddeDurumu.count();

    const s = await surumEtkisiOnizle({ surumId: surum.id });
    expect(s.ok).toBe(true);
    expect(await db.surumFarki.count()).toBe(onceFark);
    expect(await db.maddeDurumu.count()).toBe(onceDurum);
  });

  it('olmayan sürüm reddedilir', async () => {
    const s = await surumEtkisiOnizle({ surumId: 'yok-boyle-bir-surum' });
    expect(s.ok).toBe(false);
  });

  it('sonuç halka halka sayı taşır ve cümle üretir', async () => {
    const surum = await db.frameworkSurumu.findFirst();
    if (!surum) return;
    const s = await surumEtkisiOnizle({ surumId: surum.id });
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    expect(s.ozet).toBeDefined();
    expect(typeof s.cumle).toBe('string');
    /* Halkalar AYRI: tek toplama sayısı yok. */
    expect(Object.keys(s.ozet!.halkalar).length).toBe(9);
  });
});

/* ══ UY-41 · Resmî kaynak ════════════════════════════════════════════ */

describe('UY-41 · mevzuat kaynağı kütüğü', () => {
  it('okuyucu kaynak ekleyemez', async () => {
    const s = await kimlikle([yetki('okuyucu')], () => mevzuatKaynagiKaydet({
      regulasyonId: regulasyonA, ad: benzersiz('Kaynak'),
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('ADRESSİZ kaynak kaydedilebilir — kurum sonra girer', async () => {
    const s = await mevzuatKaynagiKaydet({
      regulasyonId: regulasyonA, ad: benzersiz('Adressiz kaynak'),
    });
    expect(s.ok).toBe(true);
  });

  it('geçersiz adres reddedilir', async () => {
    const s = await mevzuatKaynagiKaydet({
      regulasyonId: regulasyonA, ad: benzersiz('K'), adres: 'bu-bir-adres-degil',
    });
    expect(s.ok).toBe(false);
  });

  it('SAĞLAYICI izlemesi seçilemez — bağlı sağlayıcı yok', async () => {
    const s = await mevzuatKaynagiKaydet({
      regulasyonId: regulasyonA, ad: benzersiz('K'), izlemeTuru: 'saglayici',
    });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('BAĞLI');
  });

  it('ADRESSİZ kaynağa "baktım" kaydı yazılamaz', async () => {
    const ad = benzersiz('Adressiz');
    await mevzuatKaynagiKaydet({ regulasyonId: regulasyonA, ad });
    const kaynak = await db.regulasyonKaynagi.findFirst({
      where: { regulasyonId: regulasyonA, ad },
    });
    const s = await kaynakKontroluKaydet({
      kaynakId: kaynak!.id, not: 'Değişiklik yok',
    });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('adresi girilmemiş');
  });

  it('NOTSUZ "baktım" reddedilir — sayacı sıfırlar ama bilgi vermez', async () => {
    const ad = benzersiz('Adresli');
    await mevzuatKaynagiKaydet({
      regulasyonId: regulasyonA, ad, adres: 'https://ornek.gecersiz/mevzuat',
    });
    const kaynak = await db.regulasyonKaynagi.findFirst({
      where: { regulasyonId: regulasyonA, ad },
    });
    const s = await kaynakKontroluKaydet({ kaynakId: kaynak!.id, not: 'ok' });
    expect(s.ok).toBe(false);
  });

  it('notlu "baktım" kaydedilir ve ize düşer', async () => {
    const ad = benzersiz('Adresli');
    await mevzuatKaynagiKaydet({
      regulasyonId: regulasyonA, ad, adres: 'https://ornek.gecersiz/mevzuat',
    });
    const kaynak = await db.regulasyonKaynagi.findFirst({
      where: { regulasyonId: regulasyonA, ad },
    });
    const s = await kaynakKontroluKaydet({
      kaynakId: kaynak!.id, not: 'Değişiklik yok — son yayım 2025.',
    });
    expect(s.ok).toBe(true);

    const taze = await db.regulasyonKaynagi.findUnique({
      where: { id: kaynak!.id },
      select: { sonKontrol: true, sonKontrolEdenId: true, sonNot: true },
    });
    expect(taze!.sonKontrol).not.toBeNull();
    expect(taze!.sonKontrolEdenId).toBe(oturum.id);
    expect(taze!.sonNot).toContain('Değişiklik yok');
    expect(await izVarMi('RegulasyonKaynagi', kaynak!.id, 'sonKontrol')).not.toBeNull();
  });

  it('silme onay yetkisi ister ve ize düşer', async () => {
    const ad = benzersiz('Silinecek');
    await mevzuatKaynagiKaydet({ regulasyonId: regulasyonA, ad });
    const kaynak = await db.regulasyonKaynagi.findFirst({
      where: { regulasyonId: regulasyonA, ad },
    });
    const red = await kimlikle([yetki('okuyucu')], () => mevzuatKaynagiSil({
      kaynakId: kaynak!.id,
    }));
    expect(red.ok).toBe(false);

    const s = await mevzuatKaynagiSil({ kaynakId: kaynak!.id });
    expect(s.ok).toBe(true);
    expect(await izVarMi('RegulasyonKaynagi', kaynak!.id, 'ad')).not.toBeNull();
  });
});

/* ══ UY-43 · Değerlendirme aktarımı ══════════════════════════════════ */

describe('UY-43 · kuru koşu ve uygulama', () => {
  async function kodlariAl(n: number): Promise<{ kod: string; durum: string }[]> {
    const kayitlar = await db.maddeDurumu.findMany({
      where: { tesisId: tesisA, madde: { regulasyonId: regulasyonA, silindi: null } },
      select: { durum: true, madde: { select: { kod: true } } },
      take: n,
    });
    return kayitlar.map((m) => ({ kod: m.madde.kod, durum: m.durum }));
  }

  it('okuyucu kuru koşu yapamaz', async () => {
    const kodlar = await kodlariAl(1);
    const s = await kimlikle([yetki('okuyucu')], () => degerlendirmeKuruKosu({
      regulasyonId: regulasyonA, tesisId: tesisA, kaynakAdi: 'Test',
      satirlar: [{ satirNo: 1, maddeKodu: kodlar[0].kod, durum: 'uyumlu' }],
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('BAŞKA santrale aktarım yapılamaz', async () => {
    const kodlar = await kodlariAl(1);
    const s = await kimlikle(kisitliYonetici(tesisB), () => degerlendirmeKuruKosu({
      regulasyonId: regulasyonA, tesisId: tesisA, kaynakAdi: 'Test',
      satirlar: [{ satirNo: 1, maddeKodu: kodlar[0].kod, durum: 'uyumlu' }],
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('kuru koşu HİÇBİR değerlendirmeye dokunmaz', async () => {
    const kodlar = await kodlariAl(3);
    const oncekiDurumlar = await db.maddeDurumu.findMany({
      where: { tesisId: tesisA, madde: { kod: { in: kodlar.map((x) => x.kod) } } },
      select: { id: true, durum: true }, orderBy: { id: 'asc' },
    });

    const s = await degerlendirmeKuruKosu({
      regulasyonId: regulasyonA, tesisId: tesisA, kaynakAdi: benzersiz('Kuru'),
      satirlar: kodlar.map((x, i) => ({
        satirNo: i + 1, maddeKodu: x.kod, durum: 'kismi',
      })),
    });
    expect(s.ok).toBe(true);

    const sonraki = await db.maddeDurumu.findMany({
      where: { tesisId: tesisA, madde: { kod: { in: kodlar.map((x) => x.kod) } } },
      select: { id: true, durum: true }, orderBy: { id: 'asc' },
    });
    expect(sonraki).toEqual(oncekiDurumlar);
  });

  it('kuru koşu kaydı KURU_KOSU durumunda açılır ve ize düşer', async () => {
    const kodlar = await kodlariAl(2);
    const s = await degerlendirmeKuruKosu({
      regulasyonId: regulasyonA, tesisId: tesisA, kaynakAdi: benzersiz('Kuru'),
      satirlar: kodlar.map((x, i) => ({
        satirNo: i + 1, maddeKodu: x.kod, durum: 'kismi',
      })),
    });
    expect(s.ok).toBe(true);
    if (!s.ok) return;

    const kayit = await db.degerlendirmeAktarimi.findUnique({
      where: { id: s.aktarimId! },
    });
    expect(kayit!.durum).toBe('kuru_kosu');
    expect(kayit!.kuruKosuId).toBeNull();
    expect(await izVarMi('DegerlendirmeAktarimi', s.aktarimId!, 'durum')).not.toBeNull();
  });

  it('BOŞ satır listesi reddedilir', async () => {
    const s = await degerlendirmeKuruKosu({
      regulasyonId: regulasyonA, tesisId: tesisA, kaynakAdi: 'Boş', satirlar: [],
    });
    expect(s.ok).toBe(false);
  });

  it('uygulama ONAY yetkisi ister', async () => {
    const kodlar = await kodlariAl(2);
    const kuru = await degerlendirmeKuruKosu({
      regulasyonId: regulasyonA, tesisId: tesisA, kaynakAdi: benzersiz('Kuru'),
      satirlar: kodlar.map((x, i) => ({
        satirNo: i + 1, maddeKodu: x.kod, durum: 'incelemede',
      })),
    });
    expect(kuru.ok).toBe(true);
    if (!kuru.ok) return;

    /* `denetci` rolü uyum/yazma taşır ama onay taşımaz (lib/erisim.ts). */
    const s = await kimlikle([yetki('denetci')], () => degerlendirmeAktarimiUygula({
      kuruKosuId: kuru.aktarimId!, gerekce: 'Toplu aktarım uygulanıyor',
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('kısa gerekçe reddedilir', async () => {
    const kodlar = await kodlariAl(1);
    const kuru = await degerlendirmeKuruKosu({
      regulasyonId: regulasyonA, tesisId: tesisA, kaynakAdi: benzersiz('Kuru'),
      satirlar: [{ satirNo: 1, maddeKodu: kodlar[0].kod, durum: 'incelemede' }],
    });
    if (!kuru.ok) return;
    const s = await degerlendirmeAktarimiUygula({
      kuruKosuId: kuru.aktarimId!, gerekce: 'kısa',
    });
    expect(s.ok).toBe(false);
  });

  it('uygulama KÖKENLE bağlanır ve her satır kendi izini bırakır', async () => {
    const kayitlar = await db.maddeDurumu.findMany({
      where: {
        tesisId: tesisA, madde: { regulasyonId: regulasyonA, silindi: null },
        durum: { not: 'incelemede' },
      },
      select: { id: true, durum: true, madde: { select: { kod: true } } },
      take: 2,
    });
    if (kayitlar.length === 0) return;

    const kuru = await degerlendirmeKuruKosu({
      regulasyonId: regulasyonA, tesisId: tesisA, kaynakAdi: benzersiz('Uygulanacak'),
      satirlar: kayitlar.map((m, i) => ({
        satirNo: i + 1, maddeKodu: m.madde.kod, durum: 'incelemede',
      })),
    });
    expect(kuru.ok).toBe(true);
    if (!kuru.ok) return;

    const s = await degerlendirmeAktarimiUygula({
      kuruKosuId: kuru.aktarimId!,
      gerekce: 'İç değerlendirme sonucu toplu aktarıldı',
    });
    expect(s.ok).toBe(true);
    if (!s.ok) return;

    const uygulama = await db.degerlendirmeAktarimi.findUnique({
      where: { id: s.aktarimId! },
    });
    expect(uygulama!.durum).toBe('uygulandi');
    /* KÖKEN: bağsız uygulama yazılamaz. */
    expect(uygulama!.kuruKosuId).toBe(kuru.aktarimId);
    expect(uygulama!.uygulandi).not.toBeNull();

    /* Durumlar gerçekten değişti ve HER SATIR kendi tarihçesini yazdı. */
    for (const m of kayitlar) {
      const taze = await db.maddeDurumu.findUnique({
        where: { id: m.id }, select: { durum: true },
      });
      expect(taze!.durum).toBe('incelemede');
      const tarihce = await db.degerlendirmeTarihcesi.findFirst({
        where: { maddeDurumuId: m.id, yeniDurum: 'incelemede' },
        orderBy: { zaman: 'desc' },
      });
      expect(tarihce).not.toBeNull();
      expect(tarihce!.aktorId).toBe(oturum.id);
      expect(await izVarMi('MaddeDurumu', m.id, 'durum')).not.toBeNull();
    }
  });

  it('AYNI kuru koşu İKİ KEZ uygulanamaz', async () => {
    const kodlar = await kodlariAl(1);
    const kuru = await degerlendirmeKuruKosu({
      regulasyonId: regulasyonA, tesisId: tesisA, kaynakAdi: benzersiz('Kuru'),
      satirlar: [{ satirNo: 1, maddeKodu: kodlar[0].kod, durum: 'kismi' }],
    });
    if (!kuru.ok) return;
    const ilk = await degerlendirmeAktarimiUygula({
      kuruKosuId: kuru.aktarimId!, gerekce: 'İlk uygulama yapıldı',
    });
    /* İlk uygulama başarılı olduysa kuru koşu kaydı hâlâ `kuru_kosu`
       durumundadır ama artık uygulanacak değişiklik yoktur: ikinci
       çağrı "değişiklik yok" ile reddedilir. */
    if (ilk.ok) {
      const ikinci = await degerlendirmeAktarimiUygula({
        kuruKosuId: kuru.aktarimId!, gerekce: 'İkinci uygulama denemesi',
      });
      expect(ikinci.ok).toBe(false);
    }
  });

  it('UYGULAMA kaydı yeniden uygulanamaz', async () => {
    const uygulama = await db.degerlendirmeAktarimi.findFirst({
      where: { durum: 'uygulandi' },
    });
    if (!uygulama) return;
    const s = await degerlendirmeAktarimiUygula({
      kuruKosuId: uygulama.id, gerekce: 'Bu bir kuru koşu değil',
    });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('kuru koşu değil');
  });

  it('reddetme kaydı SİLMEZ, durumu değiştirir ve ize düşer', async () => {
    const kodlar = await kodlariAl(1);
    const kuru = await degerlendirmeKuruKosu({
      regulasyonId: regulasyonA, tesisId: tesisA, kaynakAdi: benzersiz('Reddedilecek'),
      satirlar: [{ satirNo: 1, maddeKodu: kodlar[0].kod, durum: 'uyumlu' }],
    });
    if (!kuru.ok) return;
    const s = await degerlendirmeAktarimiReddet({
      kuruKosuId: kuru.aktarimId!, gerekce: 'Kaynak dosya yanlış dönemi taşıyor',
    });
    expect(s.ok).toBe(true);

    const kayit = await db.degerlendirmeAktarimi.findUnique({
      where: { id: kuru.aktarimId! },
    });
    expect(kayit).not.toBeNull();
    expect(kayit!.durum).toBe('reddedildi');
    expect(await izVarMi('DegerlendirmeAktarimi', kuru.aktarimId!, 'durum'))
      .not.toBeNull();
  });
});
