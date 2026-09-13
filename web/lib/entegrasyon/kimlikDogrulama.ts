import 'server-only';

/* ═══════════════════════════════════════════════════════════════════════
   OT-40 · Connector kimlik doğrulama soyutlaması

   `Connector.kimlikTipi` şemada beş değer taşıyordu ama HİÇBİR KOD onu
   okuyup bir isteğe çeviremiyordu: sır çözülüyor, adaptöre veriliyor ve
   "ne yapacağını sen bil" deniyordu. Bu, her adaptörün kendi kimlik
   kodunu yazması demekti — ve beşinci adaptörde biri `Basic` üretimini
   yanlış yapıp kimlik bilgisini URL'e koyardı.

   Bu dosya HİÇBİR UÇ NOKTA İÇERMEZ. Token adresi de dâhil her adres
   connector yapılandırmasından gelir.

   ── Üç değil DÖRT durum ───────────────────────────────────────────────
   Bir kimlik tipi ya HAZIRDIR, ya SIRRI EKSİKTİR, ya YAPILANDIRMASI
   eksiktir, ya da BU ÜRÜNDE UYGULANAMAZ. Dördü ayrı ayrı söylenir:
   "hazır değil" tek kelimesi, kurulumu yapan kişiye ne yapacağını
   söylemez. `certificate` bugün dördüncü kümededir ve öyle yazar —
   istemci sertifikası Node'un TLS yığınına özel bir agent ister ve o
   agent gerçek bir sertifika/anahtar çifti olmadan kurulamaz.

   ── Sır ASLA geri dönmez ──────────────────────────────────────────────
   Bu modül `Authorization` başlığını ÜRETİR; ürettiği değeri loglamaz,
   döndürdüğü nesneyi serileştirmek yasaktır. `ozet()` yalnız hangi
   şemanın kullanıldığını söyler, değeri değil. */

import { z } from 'zod';
import { jsonIstek } from './http';

export const KIMLIK_TIPLERI = [
  'none', 'api_key', 'basic', 'oauth2_client_credentials', 'certificate',
] as const;
export type KimlikTipi = (typeof KIMLIK_TIPLERI)[number];

export const KIMLIK_ETIKETI: Record<KimlikTipi, string> = {
  none: 'kimlik gerekmiyor',
  api_key: 'API anahtarı',
  basic: 'temel kimlik (kullanıcı:parola)',
  oauth2_client_credentials: 'OAuth2 istemci kimlik bilgisi',
  certificate: 'istemci sertifikası',
};

/** Bu üründe uygulanmış kimlik tipleri. `certificate` HENÜZ DEĞİL. */
export const UYGULANAN_TIPLER: readonly KimlikTipi[] = [
  'none', 'api_key', 'basic', 'oauth2_client_credentials',
];

export type KimlikDurumu =
  | { durum: 'hazir' }
  | { durum: 'sir_eksik'; gerekce: string }
  | { durum: 'yapilandirma_eksik'; gerekce: string }
  | { durum: 'uygulanmadi'; gerekce: string };

/* ── Yapılandırma şemaları ───────────────────────────────────────────── */

/** API anahtarı hangi başlıkta taşınacak — kurumdan kuruma değişir. */
export const API_ANAHTARI_YAPILANDIRMASI = {
  apiAnahtarBasligi: z.string().min(1).optional(),
  /** `Bearer ` gibi bir ön ek gerekiyorsa. Boş bırakılırsa ön ek yok. */
  apiAnahtarOnEki: z.string().optional(),
} as const;

export const OAUTH2_YAPILANDIRMASI = {
  /** Token uç noktası — ürünle GELMEZ, kurulumda girilir. */
  tokenUrl: z.string().url('Token adresi geçerli bir URL olmalı').optional(),
  istemciId: z.string().min(1).optional(),
  /** Boşluklu kapsam listesi; kaynak sistem istemiyorsa boş bırakılır. */
  kapsam: z.string().optional(),
} as const;

export const VARSAYILAN_API_BASLIGI = 'Authorization';

/* ── Durum kararı ────────────────────────────────────────────────────── */

/**
 * Bu connector isteği imzalayabilir mi?
 *
 * Sır DEĞERİ istenmez — yalnız "var mı" bilgisi. Sağlık ekranı ve
 * sertifikasyon koşusu bunu sırrı belleğe almadan sorabilsin diye.
 */
export function kimlikDurumu(
  kimlikTipi: string,
  o: { sirVar: boolean; yapilandirma: Record<string, unknown> },
): KimlikDurumu {
  if (!(KIMLIK_TIPLERI as readonly string[]).includes(kimlikTipi)) {
    return { durum: 'yapilandirma_eksik', gerekce: `Bilinmeyen kimlik tipi: ${kimlikTipi}` };
  }
  const tip = kimlikTipi as KimlikTipi;
  if (tip === 'none') return { durum: 'hazir' };

  if (!UYGULANAN_TIPLER.includes(tip)) {
    return {
      durum: 'uygulanmadi',
      gerekce: `"${KIMLIK_ETIKETI[tip]}" bu üründe henüz uygulanmadı: istemci sertifikası `
        + 'Node TLS yığınına özel bir agent ister ve gerçek bir sertifika/anahtar '
        + 'çifti olmadan kurulamaz. Bağlantı günü bu adım ayrı yürür.',
    };
  }
  if (!o.sirVar) {
    return {
      durum: 'sir_eksik',
      gerekce: `"${KIMLIK_ETIKETI[tip]}" bir sır referansı ve çözülebilir bir değer ister.`,
    };
  }
  if (tip === 'oauth2_client_credentials') {
    const eksik = ['tokenUrl', 'istemciId'].filter((a) => !o.yapilandirma[a]);
    if (eksik.length > 0) {
      return {
        durum: 'yapilandirma_eksik',
        gerekce: `OAuth2 için eksik ayar: ${eksik.join(', ')}. Bu adresler ürünle GELMEZ; `
          + 'kurumun kendi kimlik sağlayıcısından alınır.',
      };
    }
  }
  return { durum: 'hazir' };
}

/** Ekranda ve izde görünen tek satır — SIR İÇERMEZ. */
export function ozet(kimlikTipi: string, d: KimlikDurumu): string {
  const ad = KIMLIK_ETIKETI[kimlikTipi as KimlikTipi] ?? kimlikTipi;
  if (d.durum === 'hazir') return `${ad} · hazır`;
  return `${ad} · ${d.gerekce}`;
}

/* ── Başlık üretimi ──────────────────────────────────────────────────── */

export type KimlikBaglami = {
  kimlikTipi: string;
  /** Çözülmüş sır. `api_key` için anahtarın kendisi, `basic` için
      `kullanici:parola`, OAuth2 için istemci sırrı. */
  sir: string | null;
  yapilandirma: Record<string, unknown>;
  /** Testler ağa çıkmasın diye enjekte edilebilir. */
  getir?: typeof fetch;
  /** Token önbelleği; verilmezse her çağrıda yeni token istenir. */
  tokenDeposu?: TokenDeposu;
  simdi?: number;
};

export type KimlikSonucu =
  | { ok: true; basliklar: Record<string, string> }
  | { ok: false; hata: string; durum: KimlikDurumu };

/**
 * İstek başlıklarını üretir.
 *
 * `basic` sırrı `kullanici:parola` biçimindedir ve iki nokta ZORUNLUDUR:
 * ayıraçsız bir sır, parolayı kullanıcı adı sanıp boş parolayla kimlik
 * denemesi yapardı — çoğu dizinde bu bir başarısız oturum denemesidir ve
 * kilitleme sayacını çalıştırır.
 */
export async function basliklariUret(b: KimlikBaglami): Promise<KimlikSonucu> {
  const durum = kimlikDurumu(b.kimlikTipi, {
    sirVar: b.sir !== null && b.sir.length > 0,
    yapilandirma: b.yapilandirma,
  });
  if (durum.durum !== 'hazir') {
    return { ok: false, durum, hata: ozet(b.kimlikTipi, durum) };
  }

  const tip = b.kimlikTipi as KimlikTipi;
  if (tip === 'none') return { ok: true, basliklar: {} };

  const sir = b.sir as string;

  if (tip === 'api_key') {
    const baslik = metin(b.yapilandirma.apiAnahtarBasligi) ?? VARSAYILAN_API_BASLIGI;
    /* Ön ek AYNEN alınır — kırpılmaz. `"Bearer "` yazan bir kurulumda
       sondaki boşluk anlamlıdır ve kırpılırsa başlık `Bearerabc` olur;
       sunucu bunu geçersiz sayar ve hata "kimlik yanlış" diye görünür.
       Başlık değerinin sözdizimi kurulumun işidir, bizim değil. */
    const onEk = typeof b.yapilandirma.apiAnahtarOnEki === 'string'
      ? b.yapilandirma.apiAnahtarOnEki : '';
    return { ok: true, basliklar: { [baslik]: `${onEk}${sir}` } };
  }

  if (tip === 'basic') {
    if (!sir.includes(':')) {
      return {
        ok: false,
        durum: { durum: 'sir_eksik', gerekce: 'Temel kimlik sırrı `kullanıcı:parola` biçiminde olmalı' },
        hata: 'Temel kimlik sırrı `kullanıcı:parola` biçiminde olmalı; ayıraçsız değer '
          + 'boş parolayla kimlik denemesi yapar ve hesap kilitleme sayacını çalıştırır.',
      };
    }
    return {
      ok: true,
      basliklar: { Authorization: `Basic ${Buffer.from(sir, 'utf8').toString('base64')}` },
    };
  }

  /* OAuth2 client_credentials */
  const token = await tokenAl({
    tokenUrl: String(b.yapilandirma.tokenUrl),
    istemciId: String(b.yapilandirma.istemciId),
    istemciSirri: sir,
    kapsam: metin(b.yapilandirma.kapsam),
    getir: b.getir,
    depo: b.tokenDeposu,
    simdi: b.simdi ?? Date.now(),
  });
  if (!token.ok) {
    return {
      ok: false,
      durum: { durum: 'yapilandirma_eksik', gerekce: token.hata },
      hata: token.hata,
    };
  }
  return { ok: true, basliklar: { Authorization: `Bearer ${token.erisimTokeni}` } };
}

const metin = (x: unknown): string | null => {
  const s = typeof x === 'string' ? x.trim() : '';
  return s.length > 0 ? s : null;
};

/* ── OAuth2 token ────────────────────────────────────────────────────── */

/**
 * Token önbelleği.
 *
 * Süreç belleğindedir ve BİLEREK kalıcı değildir: bir erişim tokeni
 * diskte ya da veritabanında saklanırsa sırla aynı hassasiyete girer ve
 * sır katmanının bütün kuralları (rotasyon, maskeleme, referansla
 * taşıma) onun için de yazılmak zorunda kalırdı. Süreç yeniden
 * başladığında token yeniden alınır — maliyeti bir istektir.
 */
export interface TokenDeposu {
  oku(anahtar: string): { token: string; bitis: number } | null;
  yaz(anahtar: string, token: string, bitis: number): void;
}

export function bellekTokenDeposu(): TokenDeposu {
  const harita = new Map<string, { token: string; bitis: number }>();
  return {
    oku: (a) => harita.get(a) ?? null,
    yaz: (a, token, bitis) => { harita.set(a, { token, bitis }); },
  };
}

/** Token bitişine bu kadar kala yenilenir — saat kayması payı. */
export const TOKEN_PAYI_MS = 60_000;

type TokenSonucu =
  | { ok: true; erisimTokeni: string; bitis: number }
  | { ok: false; hata: string };

/**
 * Token uç noktası HER ZAMAN https ister — özel ağda bile.
 *
 * `guvensizHttpKabul` bayrağı VERİ uçları içindir: kurum içi TLS'siz eski
 * bir yönetim arayüzünden envanter okumak gerçek bir durumdur. Token
 * uç noktası farklıdır: gövdesinde İSTEMCİ SIRRI taşır ve onu düz metin
 * göndermek özel ağda da kabul edilemez. Bu yüzden `tokenAl` bayrağı
 * hiç geçirmez.
 */
async function tokenAl(o: {
  tokenUrl: string; istemciId: string; istemciSirri: string; kapsam: string | null;
  getir?: typeof fetch; depo?: TokenDeposu; simdi: number;
}): Promise<TokenSonucu> {
  /* Önbellek anahtarı sırrı İÇERMEZ; aynı istemci farklı kapsamla iki
     token alabilir, o yüzden kapsam anahtarın parçasıdır. */
  const anahtar = `${o.tokenUrl}|${o.istemciId}|${o.kapsam ?? ''}`;
  const onbellek = o.depo?.oku(anahtar);
  if (onbellek && onbellek.bitis - TOKEN_PAYI_MS > o.simdi) {
    return { ok: true, erisimTokeni: onbellek.token, bitis: onbellek.bitis };
  }

  const govde = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: o.istemciId,
    client_secret: o.istemciSirri,
    ...(o.kapsam ? { scope: o.kapsam } : {}),
  });

  let veri: { access_token?: unknown; expires_in?: unknown };
  try {
    const cevap = await jsonIstek<typeof veri>({
      tabanUrl: o.tokenUrl, yol: '', yontem: 'POST',
      basliklar: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      govde: govde.toString(),
      getir: o.getir,
    });
    veri = cevap.veri;
  } catch (e) {
    /* Hata metni sırrı TAŞIMAZ: `jsonIstek` yanıt gövdesini kısaltarak
       koyar ve token uçları isteğin gövdesini yankılamaz. Yine de metin
       çekirdekteki `sirsizlastir` süzgecinden geçer. */
    return { ok: false, hata: `Token alınamadı: ${(e as Error).message}` };
  }

  const token = typeof veri.access_token === 'string' ? veri.access_token : '';
  if (!token) {
    return { ok: false, hata: 'Token yanıtında `access_token` yok; uç nokta beklenen biçimde değil.' };
  }
  /* `expires_in` yoksa TAHMİN EDİLMEZ: kısa ömürlü bir tokeni uzun
     sanmak, yenilenmeyen bir kimlikle 401 almaya ve devre kesiciyi
     tetiklemeye götürürdü. Bildirilmemişse önbelleğe hiç girmez. */
  const saniye = typeof veri.expires_in === 'number' && Number.isFinite(veri.expires_in)
    ? veri.expires_in : null;
  const bitis = saniye === null ? 0 : o.simdi + saniye * 1_000;
  if (saniye !== null) o.depo?.yaz(anahtar, token, bitis);
  return { ok: true, erisimTokeni: token, bitis };
}
