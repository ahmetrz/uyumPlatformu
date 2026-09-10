import 'server-only';

/* ═══ P6 · OIDC AKIŞI · SUNUCU ════════════════════════════════════════

   Saf kararlar `oidc.ts`te. Burada olan şey AĞ ve VERİTABANI — ve ikisi
   de sınırlanmıştır:

   · AĞ TEK NOKTADAN GEÇER (`getir`). Varsayılan `fetch`tir ama çağıran
     başka bir şey verebilir; testler SAHTE bir IdP ile koşar ve bu depo
     hiçbir gerçek kimlik sağlayıcıya bağlanmaz.
   · YAZILAN TEK ŞEY BAĞIN SON GİRİŞİDİR. Bu akış kullanıcı AÇMAZ (JIT
     varsayılan kapalı), yetki YAZMAZ, rol ATAMAZ. Rol eşlemesi bir
     ÖNERİDİR ve ekranda görünür; yetkiyi insan verir.

   ── TANINMAYAN `sub` REDDEDİLİR ───────────────────────────────────────
   Bir uyum ürününde kimin hesabı olduğu bir YÖNETİM KARARIDIR. IdP'nin
   "bu kişi bizde var" demesi, bu kurulumda hesabı olması demek değildir;
   otomatik açılan bir hesap denetim izinde sahipsiz bir aktör bırakır.
   Ret SESSİZ DEĞİLDİR: denetim izine `sub` özetiyle yazılır ve yönetici
   "kim girmeye çalıştı" sorusunu yanıtlayabilir.

   ── `sub` İZE HAM YAZILMAZ ────────────────────────────────────────────
   `sub` bir kişisel veridir (çoğu IdP'de kalıcı kullanıcı kimliği). İze
   SHA-256 özetinin ilk 16 karakteri yazılır: aynı kişinin tekrar tekrar
   denediği görülebilir, kimliği ise dışarı sızmaz. */

import { createHash } from 'node:crypto';
import { db } from '../db';
import { siriCoz } from '../entegrasyon/sir';
import {
  ayarKapisi, kimlikJetonuDogrula, rolleriCoz,
  type Jwk, type JwtGovde, type RolEslemesi, type SaglayiciAyari,
  type JetonReddi,
} from './oidc';

/** Ağ çıkışı — testler SAHTE IdP verir; bu depo gerçek IdP'ye çıkmaz. */
export type Getir = (adres: string, secenek?: RequestInit) => Promise<Response>;

export const konuOzeti = (konu: string) =>
  createHash('sha256').update(konu).digest('hex').slice(0, 16);

export type AkisReddi =
  | { tur: 'yapilandirma'; mesaj: string }
  | { tur: 'jeton'; sebep: JetonReddi; mesaj: string }
  | { tur: 'ag'; mesaj: string }
  | { tur: 'taninmayan_kullanici'; konuOzeti: string; mesaj: string }
  | { tur: 'pasif_kullanici'; mesaj: string };

export type AkisSonucu =
  | { ok: true; kullaniciId: string; konu: string; rolOnerileri: string[]; eslenmeyen: string[] }
  | { ok: false; ret: AkisReddi };

export type SaglayiciKaydi = {
  id: string;
  ad: string;
  issuer: string | null;
  clientId: string | null;
  istemciSirriReferansi: string | null;
  yetkilendirmeUcu: string | null;
  jetonUcu: string | null;
  jwksUcu: string | null;
  yonlendirmeUri: string | null;
  rolIddiasi: string | null;
  rolEslemesiJson: string | null;
  jitAcik: boolean;
  bagli: boolean;
  aktif: boolean;
};

/** Kayıttan saf katmanın istediği ayar — eksikse `null` ve SEBEBİ. */
export function ayariCoz(k: SaglayiciKaydi):
  { ok: true; ayar: SaglayiciAyari } | { ok: false; eksikler: string[] } {
  const kapi = ayarKapisi(k);
  if (!kapi.ok) return { ok: false, eksikler: kapi.eksikler };
  return {
    ok: true,
    ayar: {
      issuer: k.issuer!, clientId: k.clientId!, yetkilendirmeUcu: k.yetkilendirmeUcu!,
      jetonUcu: k.jetonUcu!, jwksUcu: k.jwksUcu!, yonlendirmeUri: k.yonlendirmeUri!,
      rolIddiasi: k.rolIddiasi,
    },
  };
}

export function rolEslemesiOku(ham: string | null): RolEslemesi {
  if (!ham) return {};
  try {
    const n = JSON.parse(ham) as Record<string, unknown>;
    const c: RolEslemesi = {};
    for (const [g, r] of Object.entries(n)) if (typeof r === 'string') c[g] = r;
    return c;
  } catch {
    /* Okunamayan eşleme SESSİZCE boş sayılmaz — çağıran bunu ayırt
       edebilsin diye ayrı bir kapı var (`rolEslemesiGecerli`). Burada
       boş dönmesi, bozuk bir eşlemenin yetki DAĞITMAMASINI sağlar:
       güvenli taraf yetkisizliktir. */
    return {};
  }
}

export const rolEslemesiGecerli = (ham: string | null): boolean => {
  if (!ham) return true;
  try { const n: unknown = JSON.parse(ham); return !!n && typeof n === 'object' && !Array.isArray(n); }
  catch { return false; }
};

/* ── Jeton takası ─────────────────────────────────────────────────────── */

type JetonYaniti = { id_token?: string; token_type?: string; error?: string };

async function jetonAl(o: {
  ayar: SaglayiciAyari; istemciSirri: string; kod: string; dogrulayici: string; getir: Getir;
}): Promise<{ ok: true; idToken: string } | { ok: false; mesaj: string }> {
  const govde = new URLSearchParams({
    grant_type: 'authorization_code',
    code: o.kod,
    redirect_uri: o.ayar.yonlendirmeUri,
    client_id: o.ayar.clientId,
    client_secret: o.istemciSirri,
    code_verifier: o.dogrulayici,
  });
  let yanit: Response;
  try {
    yanit = await o.getir(o.ayar.jetonUcu, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: govde.toString(),
    });
  } catch (e) {
    return { ok: false, mesaj: `Jeton ucuna ulaşılamadı: ${(e as Error).message}` };
  }
  if (!yanit.ok) return { ok: false, mesaj: `Jeton ucu ${yanit.status} döndü` };
  let n: JetonYaniti;
  try { n = await yanit.json() as JetonYaniti; }
  catch { return { ok: false, mesaj: 'Jeton yanıtı JSON değil' }; }
  if (n.error) return { ok: false, mesaj: `Jeton ucu hata döndü: ${n.error}` };
  if (!n.id_token) return { ok: false, mesaj: 'Jeton yanıtında `id_token` yok' };
  return { ok: true, idToken: n.id_token };
}

async function jwksAl(uc: string, getir: Getir):
  Promise<{ ok: true; jwks: { keys: Jwk[] } } | { ok: false; mesaj: string }> {
  let yanit: Response;
  try { yanit = await getir(uc, { headers: { accept: 'application/json' } }); }
  catch (e) { return { ok: false, mesaj: `JWKS ucuna ulaşılamadı: ${(e as Error).message}` }; }
  if (!yanit.ok) return { ok: false, mesaj: `JWKS ucu ${yanit.status} döndü` };
  try {
    const n = await yanit.json() as { keys?: Jwk[] };
    if (!Array.isArray(n.keys) || n.keys.length === 0) {
      return { ok: false, mesaj: 'JWKS belgesinde anahtar yok' };
    }
    return { ok: true, jwks: { keys: n.keys } };
  } catch { return { ok: false, mesaj: 'JWKS yanıtı JSON değil' }; }
}

/* ── Akışın kendisi ───────────────────────────────────────────────────── */

/**
 * Yetkilendirme kodunu kimliğe çevirir.
 *
 * Sıra: yapılandırma → istemci sırrı (REFERANSTAN çözülür) → jeton takası
 * → JWKS → İMZA ve iddialar → kullanıcı eşlemesi. Hiçbir adım atlanmaz ve
 * hiçbir başarısızlık "geçti" sayılmaz.
 */
export async function kodukimligeCevir(o: {
  saglayici: SaglayiciKaydi;
  kod: string;
  dogrulayici: string;
  nonce: string;
  simdiMs: number;
  getir?: Getir;
}): Promise<AkisSonucu> {
  const getir: Getir = o.getir ?? ((a, s) => fetch(a, s));

  if (!o.saglayici.bagli || !o.saglayici.aktif) {
    return { ok: false, ret: { tur: 'yapilandirma',
      mesaj: `'${o.saglayici.ad}' kimlik sağlayıcısı bağlı değil` } };
  }
  const cozum = ayariCoz(o.saglayici);
  if (!cozum.ok) {
    return { ok: false, ret: { tur: 'yapilandirma',
      mesaj: `Kimlik sağlayıcı yapılandırması eksik: ${cozum.eksikler.join(', ')}` } };
  }
  const sir = await siriCoz(o.saglayici.istemciSirriReferansi);
  if (!sir.ok) {
    return { ok: false, ret: { tur: 'yapilandirma',
      mesaj: `İstemci sırrı çözülemedi: ${sir.hata}` } };
  }

  const jeton = await jetonAl({
    ayar: cozum.ayar, istemciSirri: sir.deger, kod: o.kod,
    dogrulayici: o.dogrulayici, getir,
  });
  if (!jeton.ok) return { ok: false, ret: { tur: 'ag', mesaj: jeton.mesaj } };

  const jwks = await jwksAl(cozum.ayar.jwksUcu, getir);
  if (!jwks.ok) return { ok: false, ret: { tur: 'ag', mesaj: jwks.mesaj } };

  const dogrulama = kimlikJetonuDogrula({
    jwt: jeton.idToken, jwks: jwks.jwks,
    beklenenIssuer: cozum.ayar.issuer, beklenenAud: cozum.ayar.clientId,
    beklenenNonce: o.nonce, simdiMs: o.simdiMs,
  });
  if (!dogrulama.ok) {
    const { JETON_RET_SOZU } = await import('./oidc');
    return { ok: false, ret: { tur: 'jeton', sebep: dogrulama.sebep,
      mesaj: JETON_RET_SOZU[dogrulama.sebep] } };
  }

  return kullaniciyaEsle({
    saglayici: o.saglayici, govde: dogrulama.govde, rolIddiasi: cozum.ayar.rolIddiasi,
  });
}

/**
 * Doğrulanmış jetonu bu kurulumdaki bir kullanıcıya bağlar.
 *
 * JIT KAPALIYKEN TANINMAYAN `sub` REDDEDİLİR VE KULLANICI AÇILMAZ.
 * JIT açıkken bile açılan hesap YETKİSİZ doğar: hiçbir `Yetki` satırı
 * yazılmaz ve kullanıcı hiçbir modülü göremez — yetkiyi insan verir.
 */
export async function kullaniciyaEsle(o: {
  saglayici: SaglayiciKaydi; govde: JwtGovde; rolIddiasi: string | null | undefined;
}): Promise<AkisSonucu> {
  const konu = String(o.govde.sub);
  const esleme = rolEslemesiOku(o.saglayici.rolEslemesiJson);
  const { roller, eslenmeyen } = rolleriCoz({
    govde: o.govde, rolIddiasi: o.rolIddiasi, esleme,
  });

  const bag = await db.kimlikBagi.findUnique({
    where: { saglayiciId_konu: { saglayiciId: o.saglayici.id, konu } },
    select: { kullaniciId: true, kullanici: { select: { aktif: true } } },
  });

  if (bag) {
    if (!bag.kullanici.aktif) {
      return { ok: false, ret: { tur: 'pasif_kullanici',
        mesaj: 'Bu kurum hesabına bağlı kullanıcı pasif' } };
    }
    return { ok: true, kullaniciId: bag.kullaniciId, konu, rolOnerileri: roller, eslenmeyen };
  }

  if (!o.saglayici.jitAcik) {
    return {
      ok: false,
      ret: {
        tur: 'taninmayan_kullanici',
        konuOzeti: konuOzeti(konu),
        mesaj: 'Bu kurum hesabı bu kurulumda tanımlı değil. Otomatik hesap açma kapalı;'
          + ' yöneticinizden hesabınızı açıp kurum hesabınıza bağlamasını isteyin.',
      },
    };
  }

  /* JIT AÇIK — hesap açılır ama YETKİSİZ. E-posta yoksa hesap açılamaz:
     kullanıcı kaydının kimliği e-postadır ve uydurulmaz. */
  const eposta = typeof o.govde.email === 'string' ? o.govde.email.trim().toLowerCase() : '';
  if (!eposta) {
    return { ok: false, ret: { tur: 'taninmayan_kullanici', konuOzeti: konuOzeti(konu),
      mesaj: 'Otomatik hesap açma açık ama jetonda e-posta yok — hesap açılamaz' } };
  }
  const ad = typeof o.govde.name === 'string' && o.govde.name.trim() ? o.govde.name.trim() : eposta;

  /* ── E-POSTA ÇAKIŞMASINDA BAĞLANMAZ, REDDEDİLİR ─────────────────────
     Burada "aynı e-posta varsa mevcut hesaba BAĞLA" yazılıydı ve
     gerekçesi "aynı insanı iki aktör olarak izlemeyelim"di. Bağımsız
     inceleme (#49) bunun bir YETKİ DELME yolu olduğunu gösterdi ve
     şemanın kendi yorumu zaten uyarıyordu: "e-postayla eşleştirmek,
     e-postası devralınan bir hesabın başkasının kimliğine düşmesi
     demektir".

     Somut hâli: JIT açık bir sağlayıcıda, üründe zaten kayıtlı (ve
     muhtemelen YETKİLİ) bir e-postayla ama BAŞKA bir `sub` ile gelen
     geçerli imzalı bir jeton, o hesabın bütün yetkilerini devralırdı.
     `email_verified` bile sorulmuyordu. "JIT'te açılan hesap YETKİSİZ
     doğar" güvencesi yalnız YENİ hesap için geçerliydi.

     Bugün: e-posta zaten varsa hesap AÇILMAZ ve BAĞLANMAZ — ret. Bağı
     kurmak bir YÖNETİM kararıdır ve `/ayarlar/kimlik`ten yapılır.
     "İki aktör" endişesi de böylece kalkıyor: ikinci kayıt açılmıyor. */
  const mevcut = await db.kullanici.findUnique({
    where: { eposta }, select: { id: true },
  });
  if (mevcut) {
    return {
      ok: false,
      ret: {
        tur: 'taninmayan_kullanici',
        konuOzeti: konuOzeti(konu),
        mesaj: 'Bu e-postayla bu kurulumda zaten bir hesap var ama kurum hesabınız'
          + ' ona BAĞLI DEĞİL. Otomatik bağlama yapılmaz: hangi kurum kimliğinin'
          + ' hangi hesaba ait olduğu bir yönetim kararıdır. Yöneticinizden bağı'
          + ' kurmasını isteyin.',
      },
    };
  }

  const kullanici = await db.$transaction(async (tx) => {
    const yeni = await tx.kullanici.create({
      data: { eposta, adSoyad: ad, aktif: true, parolaHash: null },
      select: { id: true },
    });
    await tx.kimlikBagi.create({
      data: { saglayiciId: o.saglayici.id, kullaniciId: yeni.id, konu },
    });
    return yeni;
  });

  return { ok: true, kullaniciId: kullanici.id, konu, rolOnerileri: roller, eslenmeyen };
}
