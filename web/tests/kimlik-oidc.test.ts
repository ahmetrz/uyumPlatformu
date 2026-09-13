import { describe, expect, it } from 'vitest';
import { createHash, createSign, generateKeyPairSync, createPublicKey } from 'node:crypto';
import {
  KAPSAM, ayarKapisi, baslikOku, kimlikJetonuDogrula, pkceUret, rolleriCoz,
  yetkilendirmeAdresi, type Jwk,
} from '@/lib/kimlik/oidc';

/* ═══════════════════════════════════════════════════════════════════════
   P6 · OIDC · SAHTE SAĞLAYICIYLA ÖLÇÜM [SIS-KML-002]

   AĞ YOK. Sağlayıcı burada üretilir: RSA anahtar çifti testin içinde
   doğar, jetonu test imzalar, JWKS belgesini test yazar. Bu depoda
   hiçbir gerçek kimlik sağlayıcıya bağlanılmaz ve bir kimlik
   doğrulayıcısı "herhalde çalışıyordur" diye bırakılamaz.

   Ölçülen şey mutlu yol DEĞİL, RET DALLARIDIR: doğrulayıcının değeri
   geçerli jetonu geçirmesinde değil, geçersizi GEÇİRMEMESİNDE.
   ═══════════════════════════════════════════════════════════════════════ */

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const { privateKey: digerOzel, publicKey: digerAcik } = generateKeyPairSync('rsa', { modulusLength: 2048 });

const KID = 'sahte-anahtar-1';
const jwk = (a: ReturnType<typeof createPublicKey>, kid: string): Jwk => ({
  ...(a.export({ format: 'jwk' }) as Record<string, unknown>), kid, alg: 'RS256', use: 'sig',
} as Jwk);

const JWKS = { keys: [jwk(publicKey, KID)] };

const ISSUER = 'https://sahte-idp.ornek/';
const AUD = 'uyum-platformu-istemci';
const NONCE = 'nonce-abc';
const SIMDI = Date.UTC(2026, 8, 10, 12, 0, 0);

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

/** Sahte IdP'nin jeton imzalayıcısı. */
function jetonUret(o: {
  govde?: Record<string, unknown>;
  baslik?: Record<string, unknown>;
  ozel?: typeof privateKey;
  imzasiz?: boolean;
} = {}): string {
  const baslik = { alg: 'RS256', typ: 'JWT', kid: KID, ...o.baslik };
  const govde = {
    iss: ISSUER, aud: AUD, sub: 'idp-kullanici-42', nonce: NONCE,
    exp: Math.floor(SIMDI / 1000) + 600, iat: Math.floor(SIMDI / 1000),
    email: 'kisi@ornek.local', name: 'Kurgusal Kişi',
    ...o.govde,
  };
  const govdeParcasi = `${b64(baslik)}.${b64(govde)}`;
  if (o.imzasiz) return `${govdeParcasi}.`;
  const imza = createSign('RSA-SHA256').update(govdeParcasi).sign(o.ozel ?? privateKey);
  return `${govdeParcasi}.${imza.toString('base64url')}`;
}

const dogrula = (jwt: string, ek: Partial<Parameters<typeof kimlikJetonuDogrula>[0]> = {}) =>
  kimlikJetonuDogrula({
    jwt, jwks: JWKS, beklenenIssuer: ISSUER, beklenenAud: AUD,
    beklenenNonce: NONCE, simdiMs: SIMDI, ...ek,
  });

describe('PKCE ve yetkilendirme adresi [SIS-KML-002]', () => {
  it('meydan okuma doğrulayıcının SHA-256 özetidir [SIS-KML-002]', () => {
    const p = pkceUret();
    expect(p.yontem).toBe('S256');
    expect(p.dogrulayici.length).toBeGreaterThanOrEqual(43);
    expect(p.meydanOkuma)
      .toBe(createHash('sha256').update(p.dogrulayici).digest('base64url'));
  });

  it('iki üretim AYNI doğrulayıcıyı vermez [SIS-KML-002]', () => {
    expect(pkceUret().dogrulayici).not.toBe(pkceUret().dogrulayici);
  });

  it('yetkilendirme adresi state · nonce · S256 taşır [SIS-KML-002]', () => {
    const u = new URL(yetkilendirmeAdresi({
      ayar: {
        issuer: ISSUER, clientId: AUD,
        yetkilendirmeUcu: 'https://sahte-idp.ornek/yetki',
        jetonUcu: 'https://sahte-idp.ornek/jeton',
        jwksUcu: 'https://sahte-idp.ornek/jwks',
        yonlendirmeUri: 'https://urun.ornek/kimlik/geri',
      },
      durum: 'st-1', nonce: NONCE, meydanOkuma: 'mo-1',
    }));
    expect(u.searchParams.get('response_type')).toBe('code');
    expect(u.searchParams.get('state')).toBe('st-1');
    expect(u.searchParams.get('nonce')).toBe(NONCE);
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('scope')).toBe(KAPSAM);
  });
});

describe('kimlik jetonu · GEÇERLİ olan geçer [SIS-KML-002]', () => {
  it('imzası ve iddiaları doğru jeton kabul edilir [SIS-KML-002]', () => {
    const s = dogrula(jetonUret());
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.govde.sub).toBe('idp-kullanici-42');
  });

  it('`aud` dizi olabilir ve içinde bizim istemci varsa geçer [SIS-KML-002]', () => {
    expect(dogrula(jetonUret({ govde: { aud: ['baskasi', AUD] } })).ok).toBe(true);
  });

  it('süre payı içindeki jeton geçer (saat kayması) [SIS-KML-002]', () => {
    /* 30 sn önce dolmuş jeton, 60 sn payla hâlâ kabul edilir. */
    expect(dogrula(jetonUret({ govde: { exp: Math.floor(SIMDI / 1000) - 30 } })).ok).toBe(true);
  });
});

describe('kimlik jetonu · GEÇERSİZ olan GEÇMEZ [SIS-KML-002]', () => {
  const ret = (jwt: string, ek = {}) => {
    const s = dogrula(jwt, ek);
    return s.ok ? 'GEÇTİ' : s.sebep;
  };

  it('BAŞKA anahtarla imzalanmış jeton reddedilir [SIS-KML-002]', () => {
    expect(ret(jetonUret({ ozel: digerOzel }))).toBe('imza_gecersiz');
  });

  it('gövdesi kurcalanmış jeton reddedilir [SIS-KML-002]', () => {
    const jwt = jetonUret();
    const [b, g, i] = jwt.split('.');
    const kurcalanan = JSON.parse(Buffer.from(g, 'base64url').toString());
    kurcalanan.sub = 'baska-kisi';
    expect(ret(`${b}.${b64(kurcalanan)}.${i}`)).toBe('imza_gecersiz');
  });

  it('`alg: none` REDDEDİLİR — imzasız jeton kimlik kanıtı değildir [SIS-KML-002]', () => {
    expect(ret(jetonUret({ baslik: { alg: 'none' }, imzasiz: true })))
      .toBe('alg_desteklenmiyor');
  });

  it('HMAC (`HS256`) REDDEDİLİR — açık anahtarı sır sanma tuzağı [SIS-KML-002]', () => {
    /* Klasik `alg` karıştırma saldırısı: doğrulayıcı HS256 kabul ederse,
       saldırgan JWKS'teki AÇIK anahtarı HMAC sırrı gibi kullanıp geçerli
       bir imza üretir. Kabul listesi yalnız RSA'dır. */
    expect(ret(jetonUret({ baslik: { alg: 'HS256' } }))).toBe('alg_desteklenmiyor');
  });

  it('BAŞKA issuer\'ın verdiği jeton reddedilir [SIS-KML-002]', () => {
    expect(ret(jetonUret({ govde: { iss: 'https://baska-idp.ornek/' } })))
      .toBe('iss_uyusmuyor');
  });

  it('BAŞKA istemciye verilmiş jeton reddedilir [SIS-KML-002]', () => {
    expect(ret(jetonUret({ govde: { aud: 'baska-istemci' } }))).toBe('aud_uyusmuyor');
  });

  it('nonce UYUŞMAZSA reddedilir — yeniden oynatma [SIS-KML-002]', () => {
    expect(ret(jetonUret({ govde: { nonce: 'eski-nonce' } }))).toBe('nonce_uyusmuyor');
  });

  it('nonce HİÇ YOKSA da reddedilir — eksik ≠ geçerli [SIS-KML-002]', () => {
    expect(ret(jetonUret({ govde: { nonce: undefined } }))).toBe('nonce_uyusmuyor');
  });

  it('süresi dolmuş jeton reddedilir [SIS-KML-002]', () => {
    expect(ret(jetonUret({ govde: { exp: Math.floor(SIMDI / 1000) - 3600 } })))
      .toBe('suresi_doldu');
  });

  it('`exp` HİÇ YOKSA da reddedilir [SIS-KML-002]', () => {
    expect(ret(jetonUret({ govde: { exp: undefined } }))).toBe('suresi_doldu');
  });

  it('gelecekte düzenlenmiş jeton reddedilir [SIS-KML-002]', () => {
    expect(ret(jetonUret({ govde: { iat: Math.floor(SIMDI / 1000) + 3600 } })))
      .toBe('gelecekte');
  });

  it('`sub` yoksa reddedilir — kimliksiz jeton [SIS-KML-002]', () => {
    expect(ret(jetonUret({ govde: { sub: '' } }))).toBe('sub_yok');
  });

  it('JWKS\'te olmayan `kid` reddedilir [SIS-KML-002]', () => {
    expect(ret(jetonUret({ baslik: { kid: 'yok-boyle-anahtar' } }))).toBe('anahtar_yok');
  });

  it('`kid` yokken BİRDEN ÇOK anahtar varsa tahmin EDİLMEZ [SIS-KML-002]', () => {
    const s = kimlikJetonuDogrula({
      jwt: jetonUret({ baslik: { kid: undefined } }),
      jwks: { keys: [jwk(publicKey, 'a'), jwk(digerAcik, 'b')] },
      beklenenIssuer: ISSUER, beklenenAud: AUD, beklenenNonce: NONCE, simdiMs: SIMDI,
    });
    expect(s.ok ? 'GEÇTİ' : s.sebep).toBe('anahtar_yok');
  });

  it('bozuk bir JWK girdisi doğrulamayı ÇÖKERTMEZ, atlanır [SIS-KML-002]', () => {
    const s = kimlikJetonuDogrula({
      jwt: jetonUret({ baslik: { kid: undefined } }),
      jwks: { keys: [{ kty: 'RSA', n: 'bozuk' } as Jwk] },
      beklenenIssuer: ISSUER, beklenenAud: AUD, beklenenNonce: NONCE, simdiMs: SIMDI,
    });
    expect(s.ok ? 'GEÇTİ' : s.sebep).toBe('imza_gecersiz');
  });

  it('üç parçalı olmayan metin reddedilir [SIS-KML-002]', () => {
    expect(ret('sadece.iki')).toBe('bicim');
  });
});

describe('imzadan ÖNCE iddia okunmaz [SIS-KML-002]', () => {
  it('başlık okunabilir ama gövde imzasız DÖNMEZ [SIS-KML-002]', () => {
    const jwt = jetonUret({ ozel: digerOzel });
    /* Başlık (yalnız `kid`) imzasız okunur — anahtarı bulmak için şart. */
    expect(baslikOku(jwt)?.kid).toBe(KID);
    /* Gövde ise imza geçmeden HİÇ dönmez: dönen nesnede `govde` yok. */
    const s = dogrula(jwt);
    expect(s.ok).toBe(false);
    expect((s as { govde?: unknown }).govde).toBeUndefined();
  });
});

describe('rol eşlemesi [SIS-KML-001]', () => {
  const govde = { sub: 'x', groups: ['UYUM-YONETICI', 'BILINMEYEN-GRUP'] };

  it('eşlenen grup ürün rolüne çevrilir [SIS-KML-001]', () => {
    const c = rolleriCoz({
      govde, rolIddiasi: 'groups', esleme: { 'UYUM-YONETICI': 'yonetici' },
    });
    expect(c.roller).toEqual(['yonetici']);
  });

  it('EŞLENMEYEN grup sessizce ATILMAZ, adıyla sayılır [SIS-KML-001]', () => {
    const c = rolleriCoz({
      govde, rolIddiasi: 'groups', esleme: { 'UYUM-YONETICI': 'yonetici' },
    });
    expect(c.eslenmeyen).toEqual(['BILINMEYEN-GRUP']);
  });

  it('rol iddiası tanımlı DEĞİLSE hiçbir rol çıkarılmaz [SIS-KML-001]', () => {
    const c = rolleriCoz({ govde, rolIddiasi: null, esleme: { 'UYUM-YONETICI': 'yonetici' } });
    expect(c.roller).toEqual([]);
    expect(c.eslenmeyen).toEqual([]);
  });

  it('boşlukla ayrılmış tek dizeli iddia da okunur [SIS-KML-001]', () => {
    const c = rolleriCoz({
      govde: { sub: 'x', roles: 'A B' }, rolIddiasi: 'roles', esleme: { A: 'okuyucu' },
    });
    expect(c.roller).toEqual(['okuyucu']);
    expect(c.eslenmeyen).toEqual(['B']);
  });
});

describe('yapılandırma kapısı [SIS-KML-006]', () => {
  const tam = {
    issuer: ISSUER, clientId: AUD, istemciSirriReferansi: 'env:OIDC_SIR',
    yetkilendirmeUcu: 'https://idp.ornek/yetki', jetonUcu: 'https://idp.ornek/jeton',
    jwksUcu: 'https://idp.ornek/jwks', yonlendirmeUri: 'https://urun.ornek/kimlik/geri',
  };

  it('tam yapılandırma geçer [SIS-KML-006]', () => {
    expect(ayarKapisi(tam).ok).toBe(true);
  });

  it('eksik alan ADIYLA sayılır — "bağlı değil" sessiz değildir [SIS-KML-006]', () => {
    const s = ayarKapisi({ ...tam, jwksUcu: null, clientId: '' });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.eksikler).toEqual(expect.arrayContaining(['clientId', 'JWKS ucu']));
  });

  it('SIR REFERANSI eksikse yapılandırma tamamlanmaz [SIS-KML-006]', () => {
    const s = ayarKapisi({ ...tam, istemciSirriReferansi: null });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.eksikler).toContain('istemci sırrı referansı');
  });

  it('HTTP uç REDDEDİLİR (localhost hariç) [SIS-KML-006]', () => {
    const s = ayarKapisi({ ...tam, jetonUcu: 'http://idp.ornek/jeton' });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.eksikler.join(' ')).toContain('HTTPS değil');
    /* Yerel geliştirme kurulumu dışarıda kalmasın diye localhost hoş görülür. */
    expect(ayarKapisi({ ...tam, yonlendirmeUri: 'http://localhost:3000/kimlik/geri' }).ok)
      .toBe(true);
  });
});
