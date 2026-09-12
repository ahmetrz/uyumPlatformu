import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   P6 · MFA · ZİNCİRİN KENDİSİ [SIS-KML-004]

   Saf kurallar `kimlik-totp.test.ts`te. Burada ölçülen şey ZİNCİR ve en
   pahalı iddia:

     TOTP SIRRI VERİTABANINDA AÇIK DURMAZ.

   Bu iddia bir birim testiyle kanıtlanamaz: zarfın gerçekten yazıldığını
   ancak veritabanındaki satıra bakarak söyleyebiliriz.

   İkinci iddia: kurtarma kodu BİR KEZ kullanılır ve veritabanında
   kodun kendisi DEĞİL özeti durur.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-mfa-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;
/* ŞİFRELEME ANAHTARI REFERANSTAN gelir; test bir ortam değişkeni kurar.
   Anahtarın kendisi veritabanına hiç girmez — zaten testin iddiası bu. */
process.env.TEST_MFA_ANAHTARI = 'kurgusal-mfa-anahtari-yalnizca-test';
process.env.MFA_ANAHTAR_REFERANSI = 'env:TEST_MFA_ANAHTARI';

const oturum = {
  id: '', adSoyad: 'MFA Testi', eposta: 'mfa@test', unvan: null,
  yetkiler: [] as unknown[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { mfaKur, mfaDogrula, mfaKaldir } = await import('@/lib/eylemler2/mfa');
/* Giriş doğrulaması `'use server'` dosyasında DEĞİL: oturumsuz çağrılabilen
   bir uç nokta olurdu (bağımsız inceleme bulgusu, #49). */
const { mfaGirisDogrula } = await import('@/lib/kimlik/mfaGiris');
const { totp, adimNo, ADIM_SANIYE } = await import('@/lib/kimlik/totp');

const damga = Date.now();
const EPOSTA = `mfa-zincir-${damga}@kurgusal.local`;
let kullaniciId = '';

beforeAll(async () => {
  kullaniciId = (await db.kullanici.create({
    data: { eposta: EPOSTA, adSoyad: 'Kurgusal MFA Kullanıcısı', aktif: true },
  })).id;
  oturum.id = kullaniciId;
  oturum.eposta = EPOSTA;
});

afterAll(async () => {
  /* SATIR TEMİZLİĞİ YOK ve olamaz: bu test denetim izi YAZAR, iz
     DEĞİŞMEZDİR (silmeyi engelleyen tetikleyici) ve izi silinemeyen bir
     kullanıcı da silinemez — yabancı anahtar kısıtı buna izin vermez.
     Gerek de yok: veritabanı `prisma/dev.db`nin GEÇİCİ BİR KOPYASIDIR
     ve dizinle birlikte gider. Temizlenen şey dizindir ve silindiği
     ÖLÇÜLÜR — başarısız olamayan bir temizlik adım değildir. */
  await rm(dizin, { recursive: true, force: true });
  expect(existsSync(dizin), 'geçici veritabanı dizini silinmedi').toBe(false);
});

describe('MFA kaydı: kur → doğrula → kullan [SIS-KML-004]', () => {
  let sir = '';
  let kurtarma: string[] = [];
  /* ── ZAMAN PİNLENİR, YOKSA VAKA ADIM SINIRINDA YARIŞIR ─────────────
     Ölçüldü (yayın koşumu, 12 Eyl 2026): vaka kodu `Date.now()` ile
     üretiyor, sonucu BAŞKA bir `Date.now()` ile karşılaştırıyordu.
     Otuz saniyelik TOTP penceresi ikisinin ARASINDA dönerse
     `sonAdim` bir eksik çıkar (59640889 ≠ 59640890) ve hemen ardından
     "aynı kod ikinci kez geçmez" vakası da düşer — çünkü o da yeni bir
     `Date.now()` ile BAŞKA bir adımın kodunu üretir, o kod gerçekten
     geçerlidir ve ürün doğru davranır. Kusur ÜRÜNDE değil VAKADAYDI:
     ölçüm kendi zamanını sabitlemiyordu. Bugün kod ve beklenti TEK bir
     damgadan türer; zincirin sonraki halkası aynı kodu ve aynı damgayı
     kullanır. Bu bir gevşetme değildir — ürünün vaadi "kabul edilen
     KODUN adımı kaydedilir"dir ve ölçülen tam olarak odur. */
  let ilkKod = '';
  let ilkDamga = 0;

  it('kayıt AÇILIR ama DOĞRULANMAMIŞ doğar [SIS-KML-004]', async () => {
    const s = await mfaKur();
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    sir = s.sirBase32;
    expect(s.uri.startsWith('otpauth://totp/')).toBe(true);

    const kayit = await db.mfaKaydi.findUniqueOrThrow({ where: { kullaniciId } });
    /* Doğrulanmamış kayıt "kurulu" DEĞİLDİR: kullanıcı henüz korunmuyor
       ve kendi hesabından kilitlenmiyor. */
    expect(kayit.dogrulandi).toBe(false);
  });

  it('SIR VERİTABANINDA AÇIK DURMAZ — zarf yazılır [SIS-KML-004]', async () => {
    const kayit = await db.mfaKaydi.findUniqueOrThrow({ where: { kullaniciId } });
    /* En pahalı iddia: satırda sırrın kendisi YOK. */
    expect(kayit.sirZarfi).not.toContain(sir);
    const zarf = JSON.parse(kayit.sirZarfi) as Record<string, unknown>;
    expect(zarf.s).toBe(1);
    /* Zarf HANGİ anahtarla şifrelendiğini taşır — rotasyon izlenebilsin. */
    expect(zarf.ref).toBe('env:TEST_MFA_ANAHTARI');
    expect(typeof zarf.iv).toBe('string');
    expect(typeof zarf.etiket).toBe('string');
    /* Anahtarın kendisi de satırda yok. */
    expect(kayit.sirZarfi).not.toContain(process.env.TEST_MFA_ANAHTARI!);
  });

  it('YANLIŞ kod doğrulamaz, kayıt kurulu OLMAZ [SIS-KML-004]', async () => {
    const s = await mfaDogrula({ kod: '000000' });
    expect(s.ok).toBe(false);
    expect((await db.mfaKaydi.findUniqueOrThrow({ where: { kullaniciId } })).dogrulandi)
      .toBe(false);
  });

  it('DOĞRU kod kaydı kurar ve kurtarma kodları BİR KEZ döner [SIS-KML-004]', async () => {
    ilkDamga = Date.now();
    ilkKod = totp(sir, ilkDamga)!;
    const s = await mfaDogrula({ kod: ilkKod });
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    kurtarma = s.kurtarmaKodlari;
    expect(kurtarma).toHaveLength(10);

    const kayit = await db.mfaKaydi.findUniqueOrThrow({
      where: { kullaniciId }, include: { kurtarmaKodlari: true },
    });
    expect(kayit.dogrulandi).toBe(true);
    expect(kayit.sonAdim).toBe(adimNo(ilkDamga));
    expect(kayit.kurtarmaKodlari).toHaveLength(10);
    /* KOD DEĞİL ÖZET: hiçbir satır düz kodu taşımaz. */
    for (const k of kayit.kurtarmaKodlari) {
      expect(k.kodHash.startsWith('s1$')).toBe(true);
      for (const kod of kurtarma) expect(k.kodHash).not.toContain(kod);
    }
  });

  it('AYNI kod ikinci kez giriş DOĞRULAMAZ [SIS-KML-004]', async () => {
    /* İlk kullanım kaydın `sonAdim`ını ilerletti; AYNI adımın AYNI kodu
       artık geçmemeli. Kod da damga da bir önceki vakadan gelir —
       yeniden üretmek, adım dönmüşse BAŞKA bir adımın kodunu sınamak
       olurdu ve vaka ölçtüğünü sandığı şeyi ölçmezdi. */
    const s = await mfaGirisDogrula({ kullaniciId, kod: ilkKod, simdiMs: ilkDamga });
    expect(s.ok).toBe(false);
  });

  it('SONRAKİ adımın kodu giriş doğrular [SIS-KML-004]', async () => {
    const ileri = Date.now() + ADIM_SANIYE * 1000;
    const s = await mfaGirisDogrula({ kullaniciId, kod: totp(sir, ileri)!, simdiMs: ileri });
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.kurtarmaIle).toBe(false);
  });

  it('kurtarma kodu çalışır ve BİR KEZ kullanılır [SIS-KML-004]', async () => {
    const ilk = await mfaGirisDogrula({ kullaniciId, kod: kurtarma[0] });
    expect(ilk.ok).toBe(true);
    if (ilk.ok) expect(ilk.kurtarmaIle).toBe(true);

    /* İKİNCİ KEZ GEÇMEZ. Geçseydi kurtarma kodu bir parola olurdu. */
    const ikinci = await mfaGirisDogrula({ kullaniciId, kod: kurtarma[0] });
    expect(ikinci.ok).toBe(false);

    const kalan = await db.mfaKurtarmaKodu.count({
      where: { kayit: { kullaniciId }, kullanildi: null },
    });
    expect(kalan).toBe(9);
  });

  it('boşluklu/küçük harfli kurtarma kodu da kabul edilir [SIS-KML-004]', async () => {
    const s = await mfaGirisDogrula({
      kullaniciId, kod: kurtarma[1].toLowerCase().replace(/(.{4})/g, '$1 '),
    });
    expect(s.ok).toBe(true);
  });
});

describe('MFA zorunluyken kayıt kaldırılamaz [SIS-KML-005]', () => {
  it('politika zorunlu ise kaldırma REDDEDİLİR [SIS-KML-005]', async () => {
    await db.oturumPolitikasi.upsert({
      where: { kiraci: 'varsayilan' },
      create: { kiraci: 'varsayilan', mfaZorunlu: true },
      update: { mfaZorunlu: true },
    });
    const s = await mfaKaldir();
    expect(s.ok).toBe(false);
    /* Kayıt DURUYOR: kullanıcı politikayı kendi eliyle delemez. */
    expect(await db.mfaKaydi.count({ where: { kullaniciId } })).toBe(1);
  });

  it('politika kapalıyken kaldırılır ve kurtarma kodları da düşer [SIS-KML-005]', async () => {
    await db.oturumPolitikasi.update({
      where: { kiraci: 'varsayilan' }, data: { mfaZorunlu: false },
    });
    expect((await mfaKaldir()).ok).toBe(true);
    expect(await db.mfaKaydi.count({ where: { kullaniciId } })).toBe(0);
    expect(await db.mfaKurtarmaKodu.count({ where: { kayit: { kullaniciId } } })).toBe(0);
  });
});

describe('anahtar yoksa MFA BAĞLI DEĞİL der [SIS-KML-004]', () => {
  it('anahtar referansı tanımsızken kayıt açılmaz [SIS-KML-004]', async () => {
    const eski = process.env.MFA_ANAHTAR_REFERANSI;
    delete process.env.MFA_ANAHTAR_REFERANSI;
    try {
      const s = await mfaKur();
      expect(s.ok).toBe(false);
      /* SESSİZ DÜŞÜŞ YOK: eksiğini adıyla söyler. */
      if (!s.ok) expect(s.hata).toContain('MFA_ANAHTAR_REFERANSI');
      expect(await db.mfaKaydi.count({ where: { kullaniciId } })).toBe(0);
    } finally {
      process.env.MFA_ANAHTAR_REFERANSI = eski;
    }
  });

  it('anahtar DEĞİŞİRSE eski kayıt "kod yanlış" demez, anahtar der [SIS-KML-004]', async () => {
    const s = await mfaKur();
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    expect((await mfaDogrula({ kod: totp(s.sirBase32, Date.now())! })).ok).toBe(true);

    process.env.MFA_ANAHTAR_REFERANSI = 'env:TEST_MFA_ANAHTARI_2';
    process.env.TEST_MFA_ANAHTARI_2 = 'baska-kurgusal-anahtar';
    try {
      const g = await mfaGirisDogrula({
        kullaniciId, kod: totp(s.sirBase32, Date.now() + ADIM_SANIYE * 1000)!,
        simdiMs: Date.now() + ADIM_SANIYE * 1000,
      });
      expect(g.ok).toBe(false);
      /* Kullanıcının kodu doğru, kurulumun anahtarı değişmiş — ikisi ayrı
         kusurdur ve mesaj bunu söyler. */
      if (!g.ok) expect(g.hata).toContain('anahtar değişmiş');
    } finally {
      process.env.MFA_ANAHTAR_REFERANSI = 'env:TEST_MFA_ANAHTARI';
    }
  });
});
