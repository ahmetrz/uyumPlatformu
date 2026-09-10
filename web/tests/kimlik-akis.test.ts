import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSign, generateKeyPairSync } from 'node:crypto';

/* ═══════════════════════════════════════════════════════════════════════
   P6 · OIDC AKIŞI · ZİNCİRİN KENDİSİ [SIS-KML-003]

   AĞ YOK. `getir` dışarıdan verilir ve SAHTE bir IdP'yi temsil eder:
   jeton ucu da JWKS ucu da bu dosyada canlanır. Ölçülen şey saf katman
   DEĞİL, akışın kendisi — özellikle en pahalı iddia:

     TANINMAYAN `sub` REDDEDİLİR VE KULLANICI AÇILMAZ.

   Bu iddia bir birim testine sığmaz: "kullanıcı açılmadı" ancak gerçek
   veritabanına bakılarak söylenebilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kimlik-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;
/* İstemci sırrı REFERANSTAN çözülür; test bir ortam değişkeni kurar —
   sırrın DEĞERİ hiçbir yere yazılmaz, akış onu yalnız jeton takasında
   kullanır. */
process.env.TEST_OIDC_SIR = 'kurgusal-istemci-sirri';

const { db } = await import('@/lib/db');
const { kodukimligeCevir, konuOzeti } = await import('@/lib/kimlik/oidcAkis');

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = 'sahte-1';
const JWKS = {
  keys: [{
    ...(publicKey.export({ format: 'jwk' }) as Record<string, unknown>),
    kid: KID, alg: 'RS256', use: 'sig',
  }],
};

const ISSUER = 'https://sahte-idp.ornek/';
const damga = Date.now();
const CLIENT = `kurgusal-istemci-${damga}`;
const NONCE = 'nonce-zincir';
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

function jeton(govde: Record<string, unknown>): string {
  const g = {
    iss: ISSUER, aud: CLIENT, nonce: NONCE,
    exp: Math.floor(Date.now() / 1000) + 600, iat: Math.floor(Date.now() / 1000),
    ...govde,
  };
  const p = `${b64({ alg: 'RS256', typ: 'JWT', kid: KID })}.${b64(g)}`;
  return `${p}.${createSign('RSA-SHA256').update(p).sign(privateKey).toString('base64url')}`;
}

/** SAHTE IdP — ağ yerine bu fonksiyon. */
function sahteIdp(idToken: string | null) {
  const cagrilar: string[] = [];
  const getir = async (adres: string): Promise<Response> => {
    cagrilar.push(adres);
    if (adres.endsWith('/jwks')) {
      return new Response(JSON.stringify(JWKS), { status: 200 });
    }
    if (adres.endsWith('/jeton')) {
      return idToken === null
        ? new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })
        : new Response(JSON.stringify({ id_token: idToken }), { status: 200 });
    }
    return new Response('yok', { status: 404 });
  };
  return { getir, cagrilar };
}

let saglayiciId = '';
let bagliKullaniciId = '';
const BAGLI_KONU = `idp-bagli-${damga}`;
const TANINMAYAN_KONU = `idp-taninmayan-${damga}`;
const JIT_KONU = `idp-jit-${damga}`;
const JIT_EPOSTA = `jit-${damga}@kurgusal.local`;

const saglayiciOku = () => db.kimlikSaglayici.findUniqueOrThrow({ where: { id: saglayiciId } });

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({
    where: { aktif: true }, select: { id: true },
  });
  bagliKullaniciId = kisi.id;

  saglayiciId = (await db.kimlikSaglayici.create({
    data: {
      ad: `Kurgusal IdP ${damga}`, tur: 'oidc',
      issuer: ISSUER, clientId: CLIENT,
      istemciSirriReferansi: 'env:TEST_OIDC_SIR',
      yetkilendirmeUcu: 'https://sahte-idp.ornek/yetki',
      jetonUcu: 'https://sahte-idp.ornek/jeton',
      jwksUcu: 'https://sahte-idp.ornek/jwks',
      yonlendirmeUri: 'https://urun.ornek/kimlik/geri',
      rolIddiasi: 'groups',
      rolEslemesiJson: JSON.stringify({ 'UYUM-YONETICI': 'yonetici' }),
      jitAcik: false, bagli: true, aktif: true,
    },
  })).id;

  await db.kimlikBagi.create({
    data: { saglayiciId, kullaniciId: bagliKullaniciId, konu: BAGLI_KONU },
  });
});

afterAll(async () => {
  await db.kimlikBagi.deleteMany({ where: { saglayiciId } });
  await db.kimlikSaglayici.deleteMany({ where: { id: saglayiciId } });
  await db.kullanici.deleteMany({ where: { eposta: JIT_EPOSTA } });
  await rm(dizin, { recursive: true, force: true });
});

const cevir = async (idToken: string | null, ek: Record<string, unknown> = {}) => {
  const idp = sahteIdp(idToken);
  const saglayici = { ...(await saglayiciOku()), ...ek };
  return {
    sonuc: await kodukimligeCevir({
      saglayici, kod: 'kurgusal-kod', dogrulayici: 'kurgusal-dogrulayici',
      nonce: NONCE, simdiMs: Date.now(), getir: idp.getir,
    }),
    cagrilar: idp.cagrilar,
  };
};

describe('tanınan kimlik girer [SIS-KML-003]', () => {
  it('bağlı `sub` mevcut kullanıcıya çözülür [SIS-KML-003]', async () => {
    const { sonuc, cagrilar } = await cevir(jeton({ sub: BAGLI_KONU }));
    expect(sonuc.ok).toBe(true);
    if (sonuc.ok) expect(sonuc.kullaniciId).toBe(bagliKullaniciId);
    /* AKIŞ İKİ UCA GİTTİ: jeton takası ve JWKS. Biri atlanmışsa
       doğrulama eksik yapılmış demektir. */
    expect(cagrilar.some((a) => a.endsWith('/jeton'))).toBe(true);
    expect(cagrilar.some((a) => a.endsWith('/jwks'))).toBe(true);
  });

  it('IdP grubu ürün rolüne ÖNERİ olarak çevrilir — yetki YAZILMAZ [SIS-KML-003]', async () => {
    const oncekiYetki = await db.yetki.count({ where: { kullaniciId: bagliKullaniciId } });
    const { sonuc } = await cevir(jeton({ sub: BAGLI_KONU, groups: ['UYUM-YONETICI', 'BILINMEYEN'] }));
    expect(sonuc.ok).toBe(true);
    if (sonuc.ok) {
      expect(sonuc.rolOnerileri).toEqual(['yonetici']);
      expect(sonuc.eslenmeyen).toEqual(['BILINMEYEN']);
    }
    /* ÖNERİ YETKİ DEĞİLDİR: akış hiçbir `Yetki` satırı yazmaz. */
    expect(await db.yetki.count({ where: { kullaniciId: bagliKullaniciId } }))
      .toBe(oncekiYetki);
  });
});

describe('TANINMAYAN `sub` REDDEDİLİR ve kullanıcı AÇILMAZ [SIS-KML-003]', () => {
  it('JIT kapalıyken giriş reddedilir [SIS-KML-003]', async () => {
    const oncekiSayi = await db.kullanici.count();
    const { sonuc } = await cevir(jeton({ sub: TANINMAYAN_KONU, email: 'yeni@kurgusal.local' }));
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) {
      expect(sonuc.ret.tur).toBe('taninmayan_kullanici');
      /* `sub` HAM DEĞİL, ÖZETİYLE taşınır. */
      if (sonuc.ret.tur === 'taninmayan_kullanici') {
        expect(sonuc.ret.konuOzeti).toBe(konuOzeti(TANINMAYAN_KONU));
        expect(sonuc.ret.konuOzeti).not.toContain(TANINMAYAN_KONU);
      }
    }
    /* EN PAHALI İDDİA: kullanıcı sayısı DEĞİŞMEDİ. */
    expect(await db.kullanici.count()).toBe(oncekiSayi);
    expect(await db.kimlikBagi.count({ where: { konu: TANINMAYAN_KONU } })).toBe(0);
  });

  it('JIT AÇIKKEN hesap açılır ama YETKİSİZ doğar [SIS-KML-003]', async () => {
    const { sonuc } = await cevir(
      jeton({ sub: JIT_KONU, email: JIT_EPOSTA, name: 'Kurgusal JIT' }),
      { jitAcik: true },
    );
    expect(sonuc.ok).toBe(true);
    const yeni = await db.kullanici.findUniqueOrThrow({ where: { eposta: JIT_EPOSTA } });
    expect(yeni.parolaHash).toBeNull();
    /* Açılan hesap hiçbir modülü göremez: yetki insan kararıdır. */
    expect(await db.yetki.count({ where: { kullaniciId: yeni.id } })).toBe(0);
  });

  it('JIT açık ama JETONDA E-POSTA YOKSA hesap açılmaz [SIS-KML-003]', async () => {
    const oncekiSayi = await db.kullanici.count();
    const { sonuc } = await cevir(
      jeton({ sub: `${TANINMAYAN_KONU}-epostasiz` }), { jitAcik: true },
    );
    expect(sonuc.ok).toBe(false);
    /* E-POSTA UYDURULMAZ: kullanıcı kaydının kimliği odur. */
    expect(await db.kullanici.count()).toBe(oncekiSayi);
  });
});

describe('bağlı olmayan sağlayıcı ve bozuk jeton [SIS-KML-003]', () => {
  it('BAĞLI OLMAYAN sağlayıcı akışa hiç girmez [SIS-KML-003]', async () => {
    const { sonuc, cagrilar } = await cevir(jeton({ sub: BAGLI_KONU }), { bagli: false });
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.ret.tur).toBe('yapilandirma');
    /* Hiçbir uca gidilmedi: bağlı olmayan sağlayıcı için ağ çağrısı bile
       yapılmaz. */
    expect(cagrilar).toEqual([]);
  });

  it('SIR REFERANSI çözülemezse akış durur [SIS-KML-003]', async () => {
    const { sonuc, cagrilar } = await cevir(
      jeton({ sub: BAGLI_KONU }), { istemciSirriReferansi: 'env:YOK_BOYLE_BIR_ORTAM' },
    );
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.ret.tur).toBe('yapilandirma');
    expect(cagrilar).toEqual([]);
  });

  it('jeton ucu hata dönerse akış durur [SIS-KML-003]', async () => {
    const { sonuc } = await cevir(null);
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.ret.tur).toBe('ag');
  });

  it('NONCE UYUŞMAYAN jeton reddedilir — zincirde de [SIS-KML-003]', async () => {
    const { sonuc } = await cevir(jeton({ sub: BAGLI_KONU, nonce: 'baska-nonce' }));
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok && sonuc.ret.tur === 'jeton') expect(sonuc.ret.sebep).toBe('nonce_uyusmuyor');
  });

  it('PASİF kullanıcının kurum girişi reddedilir [SIS-KML-003]', async () => {
    await db.kullanici.update({ where: { id: bagliKullaniciId }, data: { aktif: false } });
    try {
      const { sonuc } = await cevir(jeton({ sub: BAGLI_KONU }));
      expect(sonuc.ok).toBe(false);
      if (!sonuc.ok) expect(sonuc.ret.tur).toBe('pasif_kullanici');
    } finally {
      await db.kullanici.update({ where: { id: bagliKullaniciId }, data: { aktif: true } });
    }
  });
});
