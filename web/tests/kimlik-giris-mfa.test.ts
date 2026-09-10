import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   P6 · İKİNCİ FAKTÖR GERÇEK GİRİŞ AKIŞINA BAĞLI MI [SIS-KML-005]

   Bu dosya bir BULGUNUN üzerine yazıldı (bağımsız inceleme, #49) ve
   bulgunun sınıfı şudur: MFA katmanının HER PARÇASI tek tek doğruydu ve
   tek tek test ediliyordu — kayıt, doğrulama, kurtarma kodu, kiracı
   politikası, ekran cümlesi. Hiçbiri GİRİŞE BAĞLI DEĞİLDİ. Yeşil testler
   üründe hiç çalışmayan bir özelliği doğruluyordu.

   Bu yüzden buradaki testler parçaları DEĞİL BAĞI ölçer: `girisYap`ın
   kendisi çağrılır ve parola doğruyken ne olduğuna bakılır.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-giris-mfa-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;
process.env.TEST_MFA_ANAHTARI = 'kurgusal-mfa-anahtari-yalnizca-test';
process.env.MFA_ANAHTAR_REFERANSI = 'env:TEST_MFA_ANAHTARI';

/* `redirect()` bir istisna fırlatır (Next iç mekanizması). Başarılı giriş
   bu istisnayla biter; testte onu YAKALAYIP başarı sayarız — yoksa
   "başarıyla girdi" hâli hiç ölçülemezdi. */
const YONLENDIRME = 'YONLENDIRILDI';
vi.mock('next/navigation', async (asil) => {
  const gercek = await asil<typeof import('next/navigation')>();
  return { ...gercek, redirect: (yol: string) => { throw new Error(`${YONLENDIRME}:${yol}`); } };
});
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: async () => new Headers(),
}));

const { db } = await import('@/lib/db');
const { girisYap } = await import('@/lib/girisEylemleri');
const { parolaOzetle } = await import('@/lib/auth');
const { mfaKur, mfaDogrula } = await import('@/lib/eylemler2/mfa');
const { totp, ADIM_SANIYE } = await import('@/lib/kimlik/totp');
const { girisKotasiniAkla } = await import('@/lib/girisKorumasi');

const damga = Date.now();
const EPOSTA = `giris-mfa-${damga}@kurgusal.local`;
const PAROLA = 'Kurgusal!Parola2026';
let kullaniciId = '';
let sir = '';

/** Oturum sahibi olmayan `mfaKur`/`mfaDogrula` için kimliği sabitler. */
const oturum = { id: '', adSoyad: 'Giriş MFA', eposta: EPOSTA, unvan: null, yetkiler: [] as unknown[] };
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const giris = async (ek: Record<string, unknown> = {}) => {
  try {
    return await girisYap({ eposta: EPOSTA, parola: PAROLA, ...ek });
  } catch (e) {
    const m = (e as Error).message;
    if (m.startsWith(YONLENDIRME)) return { ok: true as const, yonlendirme: m };
    throw e;
  }
};

const politikaYaz = (mfaZorunlu: boolean) => db.oturumPolitikasi.upsert({
  where: { kiraci: 'varsayilan' },
  create: { kiraci: 'varsayilan', mfaZorunlu },
  update: { mfaZorunlu },
});

beforeAll(async () => {
  kullaniciId = (await db.kullanici.create({
    data: { eposta: EPOSTA, adSoyad: 'Kurgusal Giriş', aktif: true,
      parolaHash: parolaOzetle(PAROLA) },
  })).id;
  oturum.id = kullaniciId;
});

afterAll(async () => {
  await rm(dizin, { recursive: true, force: true });
  expect(existsSync(dizin), 'geçici veritabanı dizini silinmedi').toBe(false);
});

describe('MFA KURULU DEĞİLKEN [SIS-KML-005]', () => {
  it('politika kapalıysa parola tek başına yeter [SIS-KML-005]', async () => {
    await politikaYaz(false);
    const s = await giris();
    expect(s.ok).toBe(true);
  });

  it('politika ZORUNLU ise parola doğru olsa da GİREMEZ [SIS-KML-005]', async () => {
    /* Bulgunun ta kendisi: burada eskiden oturum AÇILIYORDU ve
       `/ayarlar/kimlik` ekranı "giriş YAPAMAZ" diye yazıyordu. */
    await politikaYaz(true);
    const s = await giris();
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toContain('çok adımlı doğrulama zorunlu');
  });

  it('reddedilen giriş denetim izine SEBEBİYLE yazılır [SIS-KML-005]', async () => {
    const iz = await db.aktiviteKaydi.findFirstOrThrow({
      where: { aktorId: kullaniciId, alan: 'giris', eylem: 'red' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz.gerekce).toContain('MFA zorunlu');
  });
});

describe('MFA KURULUYKEN [SIS-KML-005]', () => {
  beforeAll(async () => {
    const k = await mfaKur();
    if (!k.ok) throw new Error(k.hata);
    sir = k.sirBase32;
    const d = await mfaDogrula({ kod: totp(sir, Date.now())! });
    if (!d.ok) throw new Error(d.hata);
  });

  it('KOD GELMEDEN oturum açılmaz — ikinci adım istenir [SIS-KML-005]', async () => {
    await politikaYaz(false);
    const s = await giris();
    expect(s.ok).toBe(false);
    if (!s.ok) {
      expect('mfaGerekli' in s && s.mfaGerekli).toBe(true);
      expect(s.hata).toContain('kodu girin');
    }
  });

  it('YANLIŞ kod reddedilir ve oturum açılmaz [SIS-KML-005]', async () => {
    const s = await giris({ kod: '000000' });
    expect(s.ok).toBe(false);
    if (!s.ok) expect('mfaGerekli' in s && s.mfaGerekli).toBe(true);
  });

  it('yanlış kod da oran sınırını tüketir ve ize yazılır [SIS-KML-005]', async () => {
    const iz = await db.aktiviteKaydi.findFirstOrThrow({
      where: { aktorId: kullaniciId, alan: 'giris', eylem: 'red' },
      orderBy: { zaman: 'desc' },
    });
    /* İkinci faktör sınırsız denenebilen bir alan olamaz. */
    expect(iz.gerekce).toContain('ikinci faktör');
  });

  it('DOĞRU kod oturumu açar [SIS-KML-005]', async () => {
    /* İKİ AYRINTI, ikisi de testin kendi kusuruydu ve ikisi de ürünün
       doğru davranışından geliyor:

       1. Kabul penceresi ±1 ADIMDIR. İki adım ilerinin kodu BİLEREK
          reddedilir (çalınmış kodun ömrünü uzatmamak için) — testin
          "ileri" kodu pencerenin dışındaydı.
       2. Yukarıdaki başarısız denemeler ORAN SINIRINI tüketti; ikinci
          faktör kodu da kotayı harcar ve bu bilinçli bir karardır.
          Test kotayı açıkça temizler; ürün başarılı girişte kendisi
          temizler. */
    await girisKotasiniAkla(EPOSTA);
    const ileri = Date.now() + ADIM_SANIYE * 1000;
    const s = await giris({ kod: totp(sir, ileri)! });
    expect(s.ok).toBe(true);
  });

  it('başarılı ikinci faktör İZ bırakır [SIS-KML-005]', async () => {
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'MfaKaydi', varlikId: kullaniciId, alan: 'giris' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz, 'TOTP başarı dalı iz yazmadı').not.toBeNull();
    expect(iz!.yeniDeger).toBe('TOTP doğrulandı');
  });

  it('AYNI kod ikinci girişte GEÇMEZ [SIS-KML-005]', async () => {
    await girisKotasiniAkla(EPOSTA);
    /* Bir önceki test tam bu adımı tüketti; `sonAdim` ilerledi. */
    const kod = totp(sir, Date.now() + ADIM_SANIYE * 1000)!;
    const s = await giris({ kod });
    expect(s.ok).toBe(false);
  });
});
