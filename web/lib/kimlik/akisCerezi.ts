import 'server-only';

/* P6 · OIDC AKIŞ ÇEREZİ

   Yetkilendirme isteği ile geri dönüş arasında taşınan üç şey: PKCE
   doğrulayıcısı, nonce ve state. Üçü de KISA ÖMÜRLÜ ve üçü de tarayıcı
   dışına çıkmaz.

   ── NEDEN ÇEREZ, NEDEN VERİTABANI DEĞİL ───────────────────────────────
   Doğrulayıcı bir sırdır. Veritabanına yazmak, ürünün "sır değeri
   saklanmaz" kuralına on dakikalık bir istisna açmak ve temizlenmeyen
   satırlar biriktirmek olurdu. Çerez isteğin kendisiyle gelir,
   kullanılınca SİLİNİR.

   ── SameSite=lax ŞART ─────────────────────────────────────────────────
   IdP'den dönüş bir GET gezinmesidir; `strict` olsaydı çerez o istekte
   gönderilmez ve akış hiç tamamlanmazdı. `none` ise gereksiz geniştir. */

export const AKIS_CEREZI = 'kimlik_akisi';

/** On dakika: kullanıcı IdP'de kimlik doğrulamayı bu sürede bitirmeli. */
export const OMUR_SN = 600;

export type AkisDurumu = {
  /** sağlayıcı id */ s: string;
  /** PKCE doğrulayıcısı */ d: string;
  /** nonce */ n: string;
  /** state */ t: string;
  /** dönüş hedefi (site içi göreli yol) */ h: string;
};

export function akisCerezSecenekleri() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: OMUR_SN,
    path: '/',
  };
}

/** Bozuk ya da eksik çerez SESSİZCE boş sayılmaz — `null` döner ve
    çağıran akışı reddeder. */
export function akisCoz(ham: string | undefined): AkisDurumu | null {
  if (!ham) return null;
  try {
    const n = JSON.parse(ham) as Partial<AkisDurumu>;
    if (typeof n.s !== 'string' || typeof n.d !== 'string'
      || typeof n.n !== 'string' || typeof n.t !== 'string') return null;
    return { s: n.s, d: n.d, n: n.n, t: n.t, h: typeof n.h === 'string' ? n.h : '/' };
  } catch { return null; }
}
