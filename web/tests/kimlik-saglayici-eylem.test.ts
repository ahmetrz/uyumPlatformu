import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   P6 · KİMLİK SAĞLAYICI YÖNETİMİ [SIS-KML-001 · SIS-KML-005 · SIS-KML-006]

   Üç aşama ayrı ayrı ölçülür: KAYDET → BAĞLA → AKTİF ET. Tek düğmeye
   inseydi üç ayrı karar tek tıkla verilir ve üçünün de ayrı denetim izi
   satırı kaybolurdu.

   En pahalı iddia: SIR DEĞERİ EYLEM KATMANINDAN GEÇMEZ. Şema yalnız
   `...Referansi` tanır ve biçimi bozuk bir referans REDDEDİLİR — bozuk
   referansı kaydetmek, kurulumu ilk giriş denemesine kadar sessizce
   ertelemek olurdu.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-idp-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const oturum = {
  id: '', adSoyad: 'IdP Testi', eposta: 'idp@test', unvan: null,
  yetkiler: [{ rol: 'yonetici', surecId: null, kapsamOgesiId: null, tesisId: null,
    tuzelKisiId: null, regulasyonId: null, modul: null }],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const {
  kimlikSaglayiciKaydet, kimlikSaglayiciBagla, kimlikSaglayiciAktiflik,
  oturumPolitikasiKaydet,
} = await import('@/lib/eylemler2/kimlikSaglayici');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

const damga = Date.now();
const AD = `Kurgusal IdP ${damga}`;
const TAM = {
  ad: AD,
  issuer: 'https://kurgusal-idp.ornek/',
  clientId: 'kurgusal-istemci',
  istemciSirriReferansi: 'env:KURGUSAL_OIDC_SIR',
  yetkilendirmeUcu: 'https://kurgusal-idp.ornek/yetki',
  jetonUcu: 'https://kurgusal-idp.ornek/jeton',
  jwksUcu: 'https://kurgusal-idp.ornek/jwks',
  yonlendirmeUri: 'https://urun.ornek/kimlik/geri',
  rolIddiasi: 'groups',
  rolEslemesiJson: JSON.stringify({ 'UYUM-YONETICI': 'yonetici' }),
  jitAcik: false,
};

const oku = () => db.kimlikSaglayici.findFirstOrThrow({ where: { ad: AD } });

beforeAll(async () => {
  oturum.id = (await db.kullanici.findFirstOrThrow({
    where: { aktif: true }, select: { id: true },
  })).id;
});

afterAll(async () => {
  /* Veritabanı geçici bir KOPYADIR; satır temizliği gereksizdir. Dizin
     silinir ve silindiği ÖLÇÜLÜR. */
  await rm(dizin, { recursive: true, force: true });
  expect(existsSync(dizin), 'geçici veritabanı dizini silinmedi').toBe(false);
});

describe('kaydetme: sır DEĞERİ kabul edilmez [SIS-KML-001]', () => {
  it('BOZUK sır referansı reddedilir ve kayıt AÇILMAZ [SIS-KML-001]', async () => {
    /* Bir yönetici sırrın DEĞERİNİ yapıştırırsa biçim tutmaz: sır
       değerleri `saglayici:yol` biçiminde değildir. */
    const s = await kimlikSaglayiciKaydet({
      ...TAM, istemciSirriReferansi: 'bu-bir-sir-degeri-referans-degil',
    });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('Sır DEĞERİ buraya yazılmaz');
    expect(await db.kimlikSaglayici.count({ where: { ad: AD } })).toBe(0);
  });

  it('BOZUK rol eşlemesi reddedilir — sessizce boş sayılmaz [SIS-KML-001]', async () => {
    const s = await kimlikSaglayiciKaydet({ ...TAM, rolEslemesiJson: '[1,2,3]' });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('JSON nesnesi olmalı');
  });

  it('geçerli kayıt BAĞLI DEĞİL ve AKTİF DEĞİL doğar [SIS-KML-001]', async () => {
    expect((await kimlikSaglayiciKaydet(TAM)).ok).toBe(true);
    const kayit = await oku();
    /* Üç aşamanın ilki: kaydetmek bağlamak DEĞİLDİR. */
    expect(kayit.bagli).toBe(false);
    expect(kayit.aktif).toBe(false);
    expect(kayit.istemciSirriReferansi).toBe('env:KURGUSAL_OIDC_SIR');
  });

  it('denetim izi MASKELİ adres taşır, sır DEĞERİ taşımaz [SIS-KML-001]', async () => {
    const kayit = await oku();
    const iz = await db.aktiviteKaydi.findFirstOrThrow({
      where: { varlikTipi: 'KimlikSaglayici', varlikId: kayit.id },
      orderBy: { zaman: 'desc' },
    });
    expect(iz.yeniDeger).toContain('env: KURGUSAL_OIDC_SIR');
    expect(iz.yeniDeger).toContain('JIT kapalı');
  });
});

describe('bağlama ve aktiflik ayrı kararlardır [SIS-KML-006]', () => {
  it('EKSİK yapılandırma bağlanamaz, eksik ADIYLA söylenir [SIS-KML-006]', async () => {
    const kayit = await oku();
    await db.kimlikSaglayici.update({ where: { id: kayit.id }, data: { jwksUcu: null } });
    const s = await kimlikSaglayiciBagla({ id: kayit.id, bagli: true });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('JWKS ucu');
    expect((await oku()).bagli).toBe(false);
    await db.kimlikSaglayici.update({
      where: { id: kayit.id }, data: { jwksUcu: TAM.jwksUcu },
    });
  });

  it('BAĞLI OLMAYAN sağlayıcı aktif EDİLEMEZ [SIS-KML-006]', async () => {
    const kayit = await oku();
    const s = await kimlikSaglayiciAktiflik({ id: kayit.id, aktif: true });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('çalışmayan bir düğme');
    expect((await oku()).aktif).toBe(false);
  });

  it('tam yapılandırma bağlanır, sonra aktif edilir [SIS-KML-006]', async () => {
    const kayit = await oku();
    expect((await kimlikSaglayiciBagla({ id: kayit.id, bagli: true })).ok).toBe(true);
    expect((await oku()).bagli).toBe(true);
    expect((await kimlikSaglayiciAktiflik({ id: kayit.id, aktif: true })).ok).toBe(true);
    expect((await oku()).aktif).toBe(true);
  });

  it('YAPILANDIRMA DEĞİŞİRSE bağ ve aktiflik DÜŞER [SIS-KML-006]', async () => {
    /* Bağlı bir sağlayıcının issuer'ını değiştirip bağı ayakta bırakmak,
       bir insanın onaylamadığı yapılandırmayla giriş kabul etmek olurdu. */
    const kayit = await oku();
    expect((await kimlikSaglayiciKaydet({
      ...TAM, id: kayit.id, issuer: 'https://baska-idp.ornek/',
    })).ok).toBe(true);
    const sonra = await oku();
    expect(sonra.bagli).toBe(false);
    expect(sonra.aktif).toBe(false);
  });

  it('bağ düşerse aktiflik de düşer [SIS-KML-006]', async () => {
    const kayit = await oku();
    await kimlikSaglayiciBagla({ id: kayit.id, bagli: true });
    await kimlikSaglayiciAktiflik({ id: kayit.id, aktif: true });
    expect((await kimlikSaglayiciBagla({ id: kayit.id, bagli: false })).ok).toBe(true);
    const sonra = await oku();
    expect(sonra.bagli).toBe(false);
    expect(sonra.aktif).toBe(false);
  });
});

describe('oturum politikası kapısı [SIS-KML-005]', () => {
  const oku2 = () => db.oturumPolitikasi.findUnique({ where: { kiraci: 'varsayilan' } });

  it('ATIL süre mutlaktan büyük olamaz [SIS-KML-005]', async () => {
    const s = await oturumPolitikasiKaydet({
      mutlakSaat: 2, atilDakika: 600, mfaZorunlu: false,
    });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toContain('Atıl süre mutlak süreden büyük olamaz');
  });

  it('tavanı aşan mutlak süre reddedilir [SIS-KML-005]', async () => {
    expect((await oturumPolitikasiKaydet({
      mutlakSaat: 72, atilDakika: 60, mfaZorunlu: false,
    })).ok).toBe(false);
  });

  it('geçerli politika yazılır ve iz VARSAYILANI adıyla anar [SIS-KML-005]', async () => {
    const oncekiKayit = await oku2();
    expect((await oturumPolitikasiKaydet({
      mutlakSaat: 8, atilDakika: 45, mfaZorunlu: true,
    })).ok).toBe(true);
    const p = await oku2();
    expect(p?.mutlakSaat).toBe(8);
    expect(p?.atilDakika).toBe(45);
    expect(p?.mfaZorunlu).toBe(true);

    const iz = await db.aktiviteKaydi.findFirstOrThrow({
      where: { varlikTipi: 'OturumPolitikasi' }, orderBy: { zaman: 'desc' },
    });
    /* KAYIT YOKKEN "boş" değil "varsayılan" yazılır — bilinmeyen ≠ sıfır. */
    if (oncekiKayit === null) expect(iz.oncekiDeger).toContain('varsayılan');
    expect(iz.yeniDeger).toContain('8 saat / 45 dk / MFA zorunlu');
  });
});
