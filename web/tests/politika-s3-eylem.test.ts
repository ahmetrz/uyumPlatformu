import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   R-F · S3 · SUNUCU EYLEMİNİN RET CÜMLELERİ [SIS-DGM-002]

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   S3, ihlali veri sızdırmayan ve güveni doğrudan bozmayan ama
   KULLANICIYI YANILTAN cümlelerdir. Buradaki dokuz cümlenin hepsi bir
   RET GEREKÇESİDİR: "şu durumdaki kayıt düzenlenemez", "pasif eğitime
   kayıt eklenemez", "engelli kaynağın taraması açılamaz".

   Yanıltma şöyle olur: cümle ekranda durur, eylem ise kabul eder. O
   zaman kullanıcı yaptığı işin reddedildiğini sanırken kayıt değişmiş
   olur — ya da tersine, reddedildiğini sanır ama YAN ETKİ yazılmıştır.

   ── HER VAKA İKİ ŞEY ÖLÇER ────────────────────────────────────────────
   (a) Eylem gerçekten REDDEDER ve gerekçe EKRANDAKİ cümledir — "bir
       şekilde düştü" yetmez; yanlış sebeple düşen bir eylem, cümlenin
       ölçüldüğü anlamına gelmez (S60 dersi).
   (b) Kayıt DEĞİŞMEZ ve denetim izine satır DÜŞMEZ — reddeden ama yan
       etkisini çoktan yazmış bir eylem de "reddetti" görünürdü.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-s3-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db } = await import('@/lib/db');

const damga = Date.now();
type Yetki = {
  rol: string; modul: string | null; kapsamOgesiId: string | null;
  surecId: string | null; regulasyonId: string | null;
};
const oturum = {
  id: '', adSoyad: 'Kurgusal S3', eposta: `s3-${damga}@kurgusal.local`,
  unvan: null, yetkiler: [] as Yetki[],
};
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

beforeAll(async () => {
  const k = await db.kullanici.create({
    data: { eposta: oturum.eposta, adSoyad: oturum.adSoyad, aktif: true },
  });
  oturum.id = k.id;
  oturum.yetkiler = [{
    rol: 'yonetici', modul: null, kapsamOgesiId: null, surecId: null, regulasyonId: null,
  }];
});
afterAll(async () => { await db.$disconnect(); await rm(dizin, { recursive: true, force: true }); });

/** Denetim izi satır sayısı — "yan etki yok" DELTA ile ölçülür. */
const izSayisi = () => db.aktiviteKaydi.count();

/** Bir eylemin ret gerekçesini biçimden bağımsız okur. */
function gerekce(s: unknown): string {
  const o = s as { ok?: unknown; hata?: unknown };
  expect(o?.ok, 'eylem REDDETMEDİ — ekrandaki cümle yalan olurdu').toBe(false);
  expect(typeof o?.hata, 'ret gerekçesi taşımıyor').toBe('string');
  return o.hata as string;
}

describe('POL-128 · "Pasif eğitime kayıt eklenemez" [SIS-DGM-002]', () => {
  it('PASİF eğitime kayıt REDDEDİLİR ve hiçbir kayıt satırı doğmaz [SIS-DGM-002]', async () => {
    const { egitimKaydiEkle } = await import('@/lib/eylemler2/egitim');
    const egitim = await db.egitim.create({
      data: { kod: `KURGU-PSF-${damga}`, ad: `Kurgusal pasif eğitim ${damga}`, aktif: false },
    });
    const oncekiKayit = await db.egitimKaydi.count({ where: { egitimId: egitim.id } });
    const oncekiIz = await izSayisi();

    const s = await egitimKaydiEkle({
      egitimId: egitim.id, kullaniciId: oturum.id, tamamlanma: '2026-01-01',
    });

    expect(gerekce(s)).toContain('Pasif eğitime kayıt eklenemez');
    expect(await db.egitimKaydi.count({ where: { egitimId: egitim.id } }),
      'reddetti ama KAYIT yazdı').toBe(oncekiKayit);
    expect(await izSayisi(), 'reddetti ama denetim izine satır düştü').toBe(oncekiIz);
  });

  it('AYNI eylem AKTİF eğitimde GEÇER — kapı her şeyi reddetmiyor [SIS-DGM-002]', async () => {
    /* Karşı tanık: yalnız reddi ölçmek, "her zaman reddeden" bir eylemi
       de doğru gösterirdi. Politika, PASİF olana kapalı olmaktır. */
    const { egitimKaydiEkle } = await import('@/lib/eylemler2/egitim');
    const egitim = await db.egitim.create({
      data: { kod: `KURGU-AKT-${damga}`, ad: `Kurgusal aktif eğitim ${damga}`, aktif: true },
    });
    const s = await egitimKaydiEkle({
      egitimId: egitim.id, kullaniciId: oturum.id, tamamlanma: '2026-01-01',
    });
    expect((s as { ok: boolean }).ok, 'aktif eğitimde de reddetti — kapı politikayı değil her şeyi kesiyor')
      .toBe(true);
  });
});

describe('POL-092 · "Bu kaynak otomatik erişime KAPALI (engelli)" [SIS-DGM-002]', () => {
  it('ENGELLİ kaynağın taraması AÇILAMAZ — ürün engeli AŞMAZ [SIS-DGM-002]', async () => {
    /* "Pasif önce, aktif tarama yok" ailesinin mevzuat tarafı: kaynak
       otomatik erişime kapalıysa ürün o engeli aşmaya çalışmaz. */
    const { taramayiAyarla } = await import('@/lib/eylemler2/mevzuatRadari');
    const kaynak = await db.mevzuatKaynagi.create({
      data: {
        kod: `KURGU-KYNK-${damga}`,
        ad: `Kurgusal engelli kaynak ${damga}`,
        yayinKanali: 'https://ornek.gecersiz/kurgusal',
        etkin: false, durum: 'engelli',
      },
    });
    const oncekiIz = await izSayisi();

    const s = await taramayiAyarla({
      kaynakId: kaynak.id, etkin: true,
      gerekce: 'Kurgusal gerekçe metni — engel kalktı sanılıyor',
    });

    expect(gerekce(s)).toContain('otomatik erişime KAPALI');
    const sonra = await db.mevzuatKaynagi.findUnique({ where: { id: kaynak.id } });
    expect(sonra?.etkin, 'reddetti ama TARAMAYI AÇTI').toBe(false);
    expect(await izSayisi(), 'reddetti ama denetim izine satır düştü').toBe(oncekiIz);
  });
});

describe('POL-078 · "DEĞİŞMEZ bir kayıt ailesidir" [SIS-DGM-002]', () => {
  it('DEĞİŞMEZ aileye "imha öner" YAZILAMAZ — politika satırı doğmaz [SIS-DGM-002]', async () => {
    const { saklamaPolitikasiKaydet } = await import('@/lib/eylemler2/saklama');
    const { DEGISMEZ_TIPLER } = await import('@/lib/uyum/saklama');
    const tip = DEGISMEZ_TIPLER[0];
    expect(tip, 'değişmez tip kataloğu BOŞ — vaka hiçbir şey ölçmezdi').toBeTruthy();
    const oncekiIz = await izSayisi();

    const s = await saklamaPolitikasiKaydet({
      varlikTipi: tip, saklamaGun: 30, sureSonu: 'imha_oner',
      dayanak: 'Kurgusal dayanak metni',
    });

    expect(gerekce(s)).toContain('DEĞİŞMEZ bir kayıt ailesidir');
    const politika = await db.saklamaPolitikasi.findUnique({ where: { varlikTipi: tip } });
    expect(politika?.sureSonu, 'reddetti ama "imha_oner" YAZILDI').not.toBe('imha_oner');
    expect(await izSayisi(), 'reddetti ama denetim izine satır düştü').toBe(oncekiIz);
  });
});

describe('POL-091 · "Bu kayıt bir kuru koşu değil; uygulanamaz" [SIS-DGM-002]', () => {
  it('KURU KOŞU OLMAYAN aktarım UYGULANAMAZ — durum değişmez [SIS-DGM-002]', async () => {
    const { degerlendirmeAktarimiUygula } = await import('@/lib/eylemler2/degerlendirmeAktarimi');
    const reg = await db.regulasyon.findFirst({ select: { id: true } });
    const oge = await db.kapsamOgesi.findFirst({ select: { id: true } });
    expect(reg, 'regülasyon yok — vaka kurulamıyor').toBeTruthy();
    expect(oge, 'kapsam öğesi yok — vaka kurulamıyor').toBeTruthy();
    const kayit = await db.degerlendirmeAktarimi.create({
      data: {
        regulasyonId: reg!.id, kapsamOgesiId: oge!.id,
        kaynakAdi: `kurgusal-${damga}.csv`,
        durum: 'uygulandi', raporJson: '{"satirlar":[]}',
      },
    });
    const oncekiIz = await izSayisi();

    const s = await degerlendirmeAktarimiUygula({
      kuruKosuId: kayit.id, gerekce: 'Kurgusal uygulama gerekçesi',
    });

    expect(gerekce(s)).toContain('kuru koşu değil');
    const sonra = await db.degerlendirmeAktarimi.findUnique({ where: { id: kayit.id } });
    expect(sonra?.durum, 'reddetti ama DURUMU değiştirdi').toBe('uygulandi');
    expect(await izSayisi(), 'reddetti ama denetim izine satır düştü').toBe(oncekiIz);
  });
});

describe('POL-086 · "Bu aktarım artık düzenlenemez" [SIS-DGM-002]', () => {
  it('ONAYLANMIŞ aktarımın EŞLEMESİ değiştirilemez [SIS-DGM-002]', async () => {
    const { varlikAktarimEsle } = await import('@/lib/eylemler2/varlikAktarim');
    const kayit = await db.varlikAktarimi.create({
      data: {
        dosyaAdi: `kurgusal-${damga}.csv`, kaynakTipi: 'csv', durum: 'uygulandi',
        raporJson: '{"ham":[]}', eslemeJson: '{}',
      },
    });
    const oncekiIz = await izSayisi();
    const oncekiEsleme = kayit.eslemeJson;

    const s = await varlikAktarimEsle({ id: kayit.id, esleme: {} as never });

    expect(gerekce(s)).toContain('artık düzenlenemez');
    const sonra = await db.varlikAktarimi.findUnique({ where: { id: kayit.id } });
    expect(sonra?.eslemeJson, 'reddetti ama EŞLEMEYİ yazdı').toBe(oncekiEsleme);
    expect(await izSayisi(), 'reddetti ama denetim izine satır düştü').toBe(oncekiIz);
  });
});

describe('POL-122 · "Kayıt … durumunda; tamamlanamaz" [SIS-DGM-002]', () => {
  it('PLANLI OLMAYAN gözden geçirme TAMAMLANAMAZ [SIS-DGM-002]', async () => {
    const { gozdenGecirmeTamamla } = await import('@/lib/eylemler2/gozdenGecirme');
    const gg = await db.yonetimGozdenGecirme.create({
      data: {
        kod: `KURGU-GG-${damga}`, baslik: `Kurgusal GG ${damga}`,
        tarih: new Date(), durum: 'tamamlandi', yurutenId: oturum.id,
      },
    });
    const oncekiIz = await izSayisi();

    const s = await gozdenGecirmeTamamla({ id: gg.id, ozet: 'Kurgusal özet metni' });

    expect(gerekce(s)).toContain('tamamlanamaz');
    const sonra = await db.yonetimGozdenGecirme.findUnique({ where: { id: gg.id } });
    expect(sonra?.durum, 'reddetti ama DURUMU değiştirdi').toBe('tamamlandi');
    expect(await izSayisi(), 'reddetti ama denetim izine satır düştü').toBe(oncekiIz);
  });
});

describe('POL-127 · "Okunamayan bir eşleme hiçbir rol dağıtmaz" [SIS-DGM-002]', () => {
  it('BOZUK rol eşlemesi REDDEDİLİR — sağlayıcı satırı yazılmaz [SIS-DGM-002]', async () => {
    /* Cümlenin özü: sessiz kabul YOK. Okunamayan bir eşleme kaydedilip
       çalışma anında hiçbir rol dağıtmasaydı, kullanıcı "neden yetkim
       yok" sorusunu cevapsız bulurdu. */
    const { kimlikSaglayiciKaydet } = await import('@/lib/eylemler2/kimlikSaglayici');
    const ad = `Kurgusal IdP ${damga}`;
    const oncekiIz = await izSayisi();

    const s = await kimlikSaglayiciKaydet({
      ad, issuer: 'https://ornek.gecersiz',
      clientId: 'kurgusal-istemci', istemciSirriReferansi: 'env:KURGUSAL_SIR',
      rolEslemesiJson: '[ "bu bir nesne değil" ]',
    });

    expect(gerekce(s)).toContain('hiçbir rol dağıtmaz');
    expect(await db.kimlikSaglayici.count({ where: { ad } }),
      'reddetti ama SAĞLAYICI satırı yazdı').toBe(0);
    expect(await izSayisi(), 'reddetti ama denetim izine satır düştü').toBe(oncekiIz);
  });
});

describe('POL-124 · "Köken doğrulaması gerçek ve aktif bir kullanıcı gerektirir" [SIS-DGM-002]', () => {
  it('PASİF kullanıcı köken DOĞRULAYAMAZ — kayıt doğrulanmış görünmez [SIS-DGM-002]', async () => {
    /* Değişmez denetim izinin arkasında hesap verebilir bir İNSAN olmak
       zorundadır: sistem kimliğinin doğruladığı bir köken, kimsenin
       sorumlu olmadığı bir kanıttır. */
    const { kokenDogrulaEylem } = await import('@/lib/eylemler2/koken');
    const pasif = await db.kullanici.create({
      data: { eposta: `pasif-${damga}@kurgusal.local`, adSoyad: 'Kurgusal Pasif', aktif: false },
    });
    const eskiId = oturum.id;
    oturum.id = pasif.id;
    try {
      const koken = await db.veriKokeni.findFirst({ select: { id: true } });
      expect(koken, 'köken kaydı yok — vaka kurulamıyor').toBeTruthy();
      const oncekiIz = await izSayisi();

      const s = await kokenDogrulaEylem({
        kokenId: koken!.id, sonuc: 'dogrulandi',
        gerekce: 'Kurgusal doğrulama gerekçesi',
      });

      expect(gerekce(s)).toContain('gerçek ve aktif bir kullanıcı');
      expect(await izSayisi(), 'reddetti ama denetim izine satır düştü').toBe(oncekiIz);
    } finally {
      oturum.id = eskiId;
    }
  });
});

describe('POL-095 · "çok adımlı doğrulama zorunlu — kaydınızı kaldıramazsınız" [SIS-DGM-002]', () => {
  it('MFA ZORUNLUYKEN kayıt KALDIRILAMAZ — sır referansı yerinde kalır [SIS-DGM-002]', async () => {
    const { mfaKaldir } = await import('@/lib/eylemler2/mfa');
    await db.oturumPolitikasi.upsert({
      where: { kiraci: 'varsayilan' },
      update: { mfaZorunlu: true },
      create: { kiraci: 'varsayilan', mfaZorunlu: true },
    });
    const oncekiIz = await izSayisi();

    const s = await mfaKaldir();

    expect(gerekce(s)).toContain('kaydınızı kaldıramazsınız');
    expect(await izSayisi(), 'reddetti ama denetim izine satır düştü').toBe(oncekiIz);
  });

  it('MFA ZORUNLU DEĞİLKEN aynı eylem bu gerekçeyle DÜŞMEZ — politikaya bağlı [SIS-DGM-002]', async () => {
    /* Karşı tanık: ret her koşulda gelseydi cümle "bu kurulumda" demezdi.
       Politikanın gerçekten okunduğu burada ölçülür. */
    const { mfaKaldir } = await import('@/lib/eylemler2/mfa');
    await db.oturumPolitikasi.upsert({
      where: { kiraci: 'varsayilan' },
      update: { mfaZorunlu: false },
      create: { kiraci: 'varsayilan', mfaZorunlu: false },
    });
    const s = await mfaKaldir() as { ok: boolean; hata?: string };
    expect(s.hata ?? '', 'politika kapalıyken de "zorunlu" gerekçesi döndü')
      .not.toContain('kaydınızı kaldıramazsınız');
  });
});
