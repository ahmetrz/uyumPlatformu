/* ═══ P6 · OIDC · SAF KATMAN (Authorization Code + PKCE) ═══════════════

   Bu dosya AĞA ÇIKMAZ. Ağa çıkan tek yer `oidcAkis.ts`tir ve orada bile
   çıkış noktası dışarıdan verilir (`getir`), böylece testler SAHTE bir
   IdP ile koşar — bu depoda hiçbir gerçek kimlik sağlayıcıya
   bağlanılmaz.

   ── NEDEN IMPLICIT DEĞİL, NEDEN PKCE ──────────────────────────────────
   Implicit akışta jeton tarayıcı geçmişine ve Referer başlığına düşer.
   Authorization Code akışı jetonu sunucudan alır; PKCE ise çalınmış bir
   `code`u işe yaramaz kılar — kodun karşılığında jetonu ancak
   `code_verifier`ı bilen alabilir. İkisi birlikte bugünün asgarisidir.

   ── ÜÇ DOĞRULAMA, ÜÇÜ DE AYRI KUSURU YAKALAR ──────────────────────────
   · `iss` — jetonu BEKLEDİĞİMİZ sağlayıcı mı verdi? Yanlış issuer, başka
     bir kiracının IdP'sinden gelen geçerli bir jetondur.
   · `aud` — jeton BİZE mi verildi? Aynı IdP'nin başka bir istemcisine
     verilmiş jeton, imzası geçerli olduğu hâlde bizim için bir kimlik
     kanıtı DEĞİLDİR (jeton yeniden kullanımı).
   · `nonce` — jeton BU İSTEĞE mi ait? Nonce olmadan, daha önce yakalanmış
     bir jeton yeniden oynatılabilir.
   Üçünden biri eksikse jeton REDDEDİLİR; "kontrol edilemedi" geçerli
   sayılmaz — bilinmeyen ≠ geçerli.

   ── İMZA DOĞRULANMADAN HİÇBİR İDDİA OKUNMAZ ───────────────────────────
   `sub`, `email`, gruplar… imzadan ÖNCE okunursa saldırganın yazdığı
   metni okumuş oluruz. Bu dosyada gövde yalnız imza geçtikten sonra
   döner. */

import { createHash, createPublicKey, createVerify, randomBytes } from 'node:crypto';

/* ── PKCE ─────────────────────────────────────────────────────────────── */

export type Pkce = { dogrulayici: string; meydanOkuma: string; yontem: 'S256' };

const b64url = (b: Buffer) => b.toString('base64url');

/** RFC 7636: 43–128 karakter. 32 bayt → 43 karakter base64url. */
export function pkceUret(): Pkce {
  const dogrulayici = b64url(randomBytes(32));
  return {
    dogrulayici,
    meydanOkuma: b64url(createHash('sha256').update(dogrulayici).digest()),
    /* `plain` YOKTUR ve olmayacak: plain PKCE, araya giren için hiçbir
       engel değildir — meydan okuma doğrulayıcının kendisidir. */
    yontem: 'S256',
  };
}

export const durumUret = () => b64url(randomBytes(24));
export const nonceUret = () => b64url(randomBytes(24));

/* ── Yetkilendirme adresi ─────────────────────────────────────────────── */

export type SaglayiciAyari = {
  issuer: string;
  clientId: string;
  yetkilendirmeUcu: string;
  jetonUcu: string;
  jwksUcu: string;
  yonlendirmeUri: string;
  /** IdP'nin hangi iddiası rol taşıyor — yoksa rol eşlemesi yapılmaz. */
  rolIddiasi?: string | null;
};

export const KAPSAM = 'openid profile email';

export function yetkilendirmeAdresi(o: {
  ayar: SaglayiciAyari; durum: string; nonce: string; meydanOkuma: string;
}): string {
  const u = new URL(o.ayar.yetkilendirmeUcu);
  const p = u.searchParams;
  p.set('response_type', 'code');
  p.set('client_id', o.ayar.clientId);
  p.set('redirect_uri', o.ayar.yonlendirmeUri);
  p.set('scope', KAPSAM);
  p.set('state', o.durum);
  p.set('nonce', o.nonce);
  p.set('code_challenge', o.meydanOkuma);
  p.set('code_challenge_method', 'S256');
  return u.toString();
}

/* ── JWT çözümü ───────────────────────────────────────────────────────── */

export type JwtBaslik = { alg?: string; kid?: string; typ?: string };
export type JwtGovde = {
  iss?: string; aud?: string | string[]; sub?: string; nonce?: string;
  exp?: number; iat?: number; email?: string; name?: string;
  [k: string]: unknown;
};

/** İmza DOĞRULANMADAN önce okunabilecek TEK şey başlıktır (`kid`). */
export function baslikOku(jwt: string): JwtBaslik | null {
  const parca = jwt.split('.');
  if (parca.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parca[0], 'base64url').toString('utf8')) as JwtBaslik;
  } catch { return null; }
}

/* Desteklenen imza algoritmaları. `none` YOKTUR ve `HS*` de yoktur:
   simetrik algoritma kabul eden bir doğrulayıcı, açık anahtarı sır
   sanarak imzalanmış bir jetonu geçirir (klasik `alg` karıştırma). */
const ALG: Record<string, { hash: string }> = {
  RS256: { hash: 'RSA-SHA256' },
  RS384: { hash: 'RSA-SHA384' },
  RS512: { hash: 'RSA-SHA512' },
};

export type Jwk = { kty: string; kid?: string; alg?: string; use?: string; [k: string]: unknown };

export type JetonSonucu =
  | { ok: true; govde: JwtGovde }
  | { ok: false; sebep: JetonReddi };

export type JetonReddi =
  | 'bicim' | 'alg_desteklenmiyor' | 'anahtar_yok' | 'imza_gecersiz'
  | 'iss_uyusmuyor' | 'aud_uyusmuyor' | 'nonce_uyusmuyor'
  | 'suresi_doldu' | 'gelecekte' | 'sub_yok';

export const JETON_RET_SOZU: Record<JetonReddi, string> = {
  bicim: 'Kimlik jetonu okunamadı (JWT biçimi bozuk)',
  alg_desteklenmiyor: 'İmza algoritması kabul edilmiyor — yalnız RS256/384/512',
  anahtar_yok: 'Jetonun `kid` değeri sağlayıcının JWKS belgesinde yok',
  imza_gecersiz: 'Kimlik jetonunun imzası doğrulanmadı',
  iss_uyusmuyor: 'Jetonu bekleneni değil BAŞKA bir sağlayıcı vermiş (`iss`)',
  aud_uyusmuyor: 'Jeton bu kuruluma değil BAŞKA bir istemciye verilmiş (`aud`)',
  nonce_uyusmuyor: 'Jeton bu giriş isteğine ait değil (`nonce`)',
  suresi_doldu: 'Kimlik jetonunun süresi dolmuş',
  gelecekte: 'Kimlik jetonu gelecekte düzenlenmiş — saatler ayrışmış olabilir',
  sub_yok: 'Jetonda kullanıcı kimliği (`sub`) yok',
};

/** Saat kayması payı. Dar tutulur: geniş pay, süresi dolmuş jetonun
    ömrünü uzatır. */
export const SAAT_PAYI_SN = 60;

/**
 * Kimlik jetonunu DOĞRULAR ve gövdesini döndürür.
 *
 * Sıra bilinçlidir: biçim → algoritma → anahtar → İMZA → iddialar.
 * İmzadan önce hiçbir iddia okunmaz; okunsaydı `iss` kontrolü bile
 * saldırganın yazdığı metne bakıyor olurdu.
 */
export function kimlikJetonuDogrula(o: {
  jwt: string;
  jwks: { keys: Jwk[] };
  beklenenIssuer: string;
  beklenenAud: string;
  beklenenNonce: string;
  simdiMs: number;
}): JetonSonucu {
  const parca = o.jwt.split('.');
  if (parca.length !== 3) return { ok: false, sebep: 'bicim' };
  const baslik = baslikOku(o.jwt);
  if (!baslik?.alg) return { ok: false, sebep: 'bicim' };
  const alg = ALG[baslik.alg];
  if (!alg) return { ok: false, sebep: 'alg_desteklenmiyor' };

  /* `kid` yoksa TEK anahtar varsa o denenir; birden çok anahtar varsa
     hangisi olduğunu bilemeyiz ve tahmin etmeyiz. */
  const adaylar = baslik.kid
    ? o.jwks.keys.filter((k) => k.kid === baslik.kid)
    : (o.jwks.keys.length === 1 ? o.jwks.keys : []);
  if (adaylar.length === 0) return { ok: false, sebep: 'anahtar_yok' };

  const imza = Buffer.from(parca[2], 'base64url');
  const imzalanan = `${parca[0]}.${parca[1]}`;
  const gecti = adaylar.some((jwk) => {
    try {
      const anahtar = createPublicKey({ key: jwk as never, format: 'jwk' });
      return createVerify(alg.hash).update(imzalanan).verify(anahtar, imza);
    } catch {
      /* Bozuk bir JWK girdisi bütün doğrulamayı çökertmemeli; o anahtar
         atlanır ve kalanlar denenir. Hiçbiri geçmezse imza geçersizdir. */
      return false;
    }
  });
  if (!gecti) return { ok: false, sebep: 'imza_gecersiz' };

  let govde: JwtGovde;
  try {
    govde = JSON.parse(Buffer.from(parca[1], 'base64url').toString('utf8')) as JwtGovde;
  } catch { return { ok: false, sebep: 'bicim' }; }

  if (govde.iss !== o.beklenenIssuer) return { ok: false, sebep: 'iss_uyusmuyor' };

  const aud = Array.isArray(govde.aud) ? govde.aud : (govde.aud ? [govde.aud] : []);
  if (!aud.includes(o.beklenenAud)) return { ok: false, sebep: 'aud_uyusmuyor' };

  /* Nonce EKSİKSE de reddedilir: "gelmemiş" ile "uyuşmuyor" arasındaki
     fark saldırganın lehine olamaz. */
  if (typeof govde.nonce !== 'string' || govde.nonce !== o.beklenenNonce) {
    return { ok: false, sebep: 'nonce_uyusmuyor' };
  }

  const simdi = Math.floor(o.simdiMs / 1000);
  if (typeof govde.exp !== 'number' || govde.exp + SAAT_PAYI_SN < simdi) {
    return { ok: false, sebep: 'suresi_doldu' };
  }
  if (typeof govde.iat === 'number' && govde.iat - SAAT_PAYI_SN > simdi) {
    return { ok: false, sebep: 'gelecekte' };
  }
  if (typeof govde.sub !== 'string' || govde.sub.trim() === '') {
    return { ok: false, sebep: 'sub_yok' };
  }
  return { ok: true, govde };
}

/* ── Rol eşlemesi ─────────────────────────────────────────────────────── */

/** IdP grubu → ürün rolü. Eşlemesi olmayan grup SESSİZCE atılmaz, sayılır. */
export type RolEslemesi = Record<string, string>;

export type RolCozumu = {
  roller: string[];
  /** Eşlemesi olmayan IdP grupları — ekran bunları ADIYLA gösterir. */
  eslenmeyen: string[];
};

/**
 * Jetondaki rol iddiasını ürün rollerine çevirir.
 *
 * EŞLEŞMEYEN GRUP GİZLENMEZ. Bir IdP grubunun karşılığı yoksa kullanıcı
 * o yetkiyi ALMAZ ama yönetici bunu görmelidir: sessizce düşen bir grup,
 * "neden yetkim yok" sorusunun cevabını hiçbir ekranda bırakmaz.
 */
export function rolleriCoz(o: {
  govde: JwtGovde; rolIddiasi: string | null | undefined; esleme: RolEslemesi;
}): RolCozumu {
  if (!o.rolIddiasi) return { roller: [], eslenmeyen: [] };
  const ham = o.govde[o.rolIddiasi];
  const liste = Array.isArray(ham)
    ? ham.filter((x): x is string => typeof x === 'string')
    : (typeof ham === 'string' ? ham.split(/[,\s]+/).filter(Boolean) : []);
  const roller: string[] = [];
  const eslenmeyen: string[] = [];
  for (const g of liste) {
    const rol = o.esleme[g];
    if (rol) { if (!roller.includes(rol)) roller.push(rol); } else eslenmeyen.push(g);
  }
  return { roller, eslenmeyen };
}

/* ── Yapılandırma bütünlüğü ───────────────────────────────────────────── */

export type AyarKapisi = { ok: true } | { ok: false; eksikler: string[] };

/**
 * Sağlayıcı BAĞLANABİLİR mi — eksikse ne eksik.
 *
 * "Bağlı değil" diyen bir sağlayıcı sessiz düşmez: eksiği adıyla söyler.
 * Sır DEĞERİ burada aranmaz, yalnız REFERANSIN varlığı — değerin kendisi
 * bu ürünün veritabanına hiç girmez.
 */
export function ayarKapisi(o: {
  issuer?: string | null; clientId?: string | null;
  istemciSirriReferansi?: string | null;
  yetkilendirmeUcu?: string | null; jetonUcu?: string | null; jwksUcu?: string | null;
  yonlendirmeUri?: string | null;
}): AyarKapisi {
  const eksikler: string[] = [];
  const bak = (deger: string | null | undefined, ad: string) => {
    if (!deger || deger.trim() === '') eksikler.push(ad);
  };
  bak(o.issuer, 'issuer');
  bak(o.clientId, 'clientId');
  bak(o.istemciSirriReferansi, 'istemci sırrı referansı');
  bak(o.yetkilendirmeUcu, 'yetkilendirme ucu');
  bak(o.jetonUcu, 'jeton ucu');
  bak(o.jwksUcu, 'JWKS ucu');
  bak(o.yonlendirmeUri, 'yönlendirme adresi');
  /* HTTPS ZORUNLU (localhost hariç): kimlik jetonu taşıyan bir akışın
     düz metin gitmesi, PKCE'nin de nonce'ın da anlamını kaldırır. */
  for (const [uc, ad] of [
    [o.yetkilendirmeUcu, 'yetkilendirme ucu'], [o.jetonUcu, 'jeton ucu'],
    [o.jwksUcu, 'JWKS ucu'], [o.yonlendirmeUri, 'yönlendirme adresi'],
  ] as const) {
    if (!uc) continue;
    try {
      const u = new URL(uc);
      const yerel = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
      if (u.protocol !== 'https:' && !yerel) eksikler.push(`${ad} HTTPS değil`);
    } catch { eksikler.push(`${ad} geçerli bir adres değil`); }
  }
  return eksikler.length === 0 ? { ok: true } : { ok: false, eksikler };
}
