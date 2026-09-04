/* ═══════════════════════════════════════════════════════════════════════
   UY-53 · SSO / MFA  ·  UY-55 · Gerçek veri performansı

   `lib/uyum/disSaglayicilar.ts` ve `lib/altyapi/saglayicilar.ts` ile aynı
   kalıp: bir ARAYÜZ, bir KAYIT DEFTERİ ve bağlanmamış sağlayıcının açık
   beyanı.

   ── BU DOSYADA HİÇBİR IdP UÇ NOKTASI YOKTUR ───────────────────────────
   Tenant kimliği, metadata adresi, claim eşlemesi — hiçbiri ürünle
   gelmez. Bir "örnek" tenant yazmak, kurulumda kimsenin değiştirmediği
   ve sessizce yanlış yere bakan bir yapılandırma bırakırdı.

   ── YEREL PAROLA BİR SSO DEĞİLDİR ─────────────────────────────────────
   Ürünün bugünkü girişi kendi kullanıcı kütüğüne bakar. Bu çalışan bir
   kurulumdur ama SSO DEĞİLDİR ve MFA da taşımaz: kurumun parola
   politikası, oturum ömrü, ikinci faktör ve ayrılan personelin
   kapatılması ürünün DIŞINDA yönetilir. Ekran bunu "kurumsal kimlikle
   giriş" diye göstermez.

   Bu dosya hiçbir dış sisteme bağlanmaz. */

export type KimlikAilesi = 'sso' | 'mfa' | 'yuk_olcumu';

export const KIMLIK_AILE_ETIKETI: Record<KimlikAilesi, string> = {
  sso: 'Kurumsal kimlik (SSO)',
  mfa: 'İkinci faktör (MFA)',
  yuk_olcumu: 'Gerçek veri hacmiyle yük ölçümü',
};

export interface PlatformSaglayici {
  readonly ad: string;
  readonly aile: KimlikAilesi;
  readonly bagli: boolean;
  /** Bağlanmak için kurumdan ne gerekiyor — ekranda AYNEN görünür. */
  readonly gereken: string;
  /** Bağlı olmadığında ürün ne YAPAR (ne yapmadığı değil). */
  readonly bagliDegilkenDavranis: string;
}

/* ═══ UY-53 · SSO ═════════════════════════════════════════════════════ */

export const ssoSaglayici: PlatformSaglayici = {
  ad: 'kurumsal_idp',
  aile: 'sso',
  bagli: false,
  gereken: 'Kurumun kimlik sağlayıcısı (Entra ID / ADFS / başka bir OIDC ya '
    + 'da SAML IdP): tenant kimliği, keşif (discovery) ya da metadata '
    + 'adresi, istemci kimliği ve sırrı, dönüş adresi (redirect URI) ve '
    + 'claim eşlemesi — hangi claim kullanıcıyı, hangisi rolü taşıyor. '
    + 'Ayrıca ayrılan personelin nasıl kapatılacağı: IdP tarafında pasife '
    + 'alınan bir hesap ürüne ne zaman yansıyacak.',
  bagliDegilkenDavranis: 'Giriş ürünün KENDİ kullanıcı kütüğünden yapılır. '
    + 'Bu çalışan bir kurulumdur ama kurumsal kimlik DEĞİLDİR: parola '
    + 'politikası, oturum ömrü ve ayrılan personelin kapatılması ürün '
    + 'içinde elle yönetilir. Ekran "SSO ile giriş" DEMEZ.',
};

/* ═══ UY-53 · MFA ═════════════════════════════════════════════════════ */

export const mfaSaglayici: PlatformSaglayici = {
  ad: 'ikinci_faktor',
  aile: 'mfa',
  bagli: false,
  gereken: 'İkinci faktör kurumun IdP\'sinde uygulanır ve ürüne AYRICA '
    + 'kurulmaz: SSO bağlandığında MFA zorunluluğu IdP politikasından '
    + 'gelir. Ürün tarafında gereken tek şey, IdP\'nin MFA yaptığını '
    + 'bildiren claim\'in adıdır (örn. `amr` ya da kurumun eşdeğeri).',
  bagliDegilkenDavranis: 'Ürün ikinci faktör İSTEMEZ ve "MFA korumalı" '
    + 'numarası YAPMAZ. Kendi başına bir TOTP katmanı da kurulmadı: '
    + 'kurumun IdP\'si zaten MFA uyguluyorken ürüne ikinci bir faktör '
    + 'koymak, kullanıcıyı iki kez doğrulatır ve kurumun politikasından '
    + 'AYRIŞAN ikinci bir kimlik yüzeyi üretirdi.',
};

/* ═══ UY-55 · Gerçek veri hacmi ═══════════════════════════════════════ */

export const yukOlcumSaglayici: PlatformSaglayici = {
  ad: 'gercek_hacim',
  aile: 'yuk_olcumu',
  bagli: false,
  gereken: 'Gerçek veri hacmi ve gerçek eşzamanlılık: kaç santral, kaç '
    + 'varlık, kaç kontrol, kaç kanıt, kaç denetim izi satırı; eşzamanlı '
    + 'kullanıcı sayısı ve kabul edilebilir gecikme hedefi. Bir de '
    + 'ölçümün koşacağı ortam — üretim yapısına yakın bir kurulum.',
  bagliDegilkenDavranis: 'Yük ölçümü (`npm run olcum:yuk`) TOHUM VERİSİYLE '
    + 'koşar ve taban (`arac/performans-tabani.json`) böyle kaydedilir. '
    + 'Araç bunu her koşuda EKRANA YAZAR: ölçülen sayılar gerçek veri '
    + 'hacmini temsil etmez ve "üretimde de böyle olacak" DEMEZ. Gerileme '
    + 'kapısı yine çalışır — tohum verisiyle bile bir gerileme gerilemedir.',
};

export const PLATFORM_SAGLAYICILARI: readonly PlatformSaglayici[] = [
  ssoSaglayici, mfaSaglayici, yukOlcumSaglayici,
];

export function platformSaglayicisi(aile: KimlikAilesi): PlatformSaglayici | null {
  return PLATFORM_SAGLAYICILARI.find((s) => s.aile === aile && s.bagli) ?? null;
}

/* ═══ Giriş yüzeyinin bugünkü hâli ════════════════════════════════════ */

export type GirisYontemi = 'yerel_parola' | 'sso';

export const GIRIS_SOZU: Record<GirisYontemi, string> = {
  yerel_parola: 'ürünün kendi kullanıcı kütüğü',
  sso: 'kurumsal kimlik sağlayıcı (SSO)',
};

/**
 * Bugün hangi giriş yöntemi çalışıyor?
 *
 * Sağlayıcı bağlı DEĞİLSE cevap daima `yerel_parola`dır ve bu bir hata
 * değildir: kurulum böyledir. Eksik olan, ekranın bunu "kurumsal
 * kimlik" diye göstermemesidir — ve göstermez.
 */
export function girisYontemi(): GirisYontemi {
  return platformSaglayicisi('sso') === null ? 'yerel_parola' : 'sso';
}

/** Kimlik yüzeyinin tek satırlık dürüst beyanı. */
export function kimlikBeyani(): string {
  if (girisYontemi() === 'sso') {
    return 'Giriş kurumsal kimlik sağlayıcı üzerinden yapılır; ikinci faktör '
      + 'kurumun politikasından gelir.';
  }
  return 'Giriş ürünün KENDİ kullanıcı kütüğünden yapılır. Kurumsal kimlik '
    + '(SSO) bağlı DEĞİLDİR ve ürün ikinci faktör istemez; parola '
    + 'politikası, oturum ömrü ve ayrılan personelin kapatılması ürün '
    + 'içinde elle yönetilir.';
}
