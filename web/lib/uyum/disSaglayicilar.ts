/* ═══════════════════════════════════════════════════════════════════════
   UY-18 · Kanıt paketi imzası  ·  UY-20 · Belge yönetim sistemi

   İkisi de aynı kalıbı izler (`lib/entegrasyon/sir.ts` ve
   `lib/altyapi/saglayicilar.ts` ile aynı): bir ARAYÜZ, bir KAYIT DEFTERİ
   ve bağlanmamış sağlayıcının AÇIK beyanı.

   Bugün ikisinde de kayıtlı sağlayıcı YOKTUR ve bu dosya bunu gizlemez.
   Bir "yerel imza" sağlayıcısı yazmak teknik olarak kolaydı — ve tam
   olarak bu belgenin yasakladığı şey olurdu: uygulamanın kendi ürettiği
   bir anahtarla attığı imza, imzalayanın kimliğini KANITLAMAZ. Denetçi
   için değeri sıfırdır, ekranda ise "imzalandı" yazar. Bu, imzasız
   olmaktan daha kötüdür.

   Bu dosya hiçbir dış sisteme bağlanmaz ve hiçbir anahtar üretmez. */

export type DisSaglayiciAilesi = 'imza' | 'belge_yonetimi';

export const DIS_AILE_ETIKETI: Record<DisSaglayiciAilesi, string> = {
  imza: 'Kanıt paketi imzası',
  belge_yonetimi: 'Belge yönetim sistemi (DYS)',
};

export interface DisSaglayici {
  readonly ad: string;
  readonly aile: DisSaglayiciAilesi;
  readonly bagli: boolean;
  /** Bağlanmak için ne gerekiyor — ekranda AYNEN görünür. */
  readonly gereken: string;
  /** Bağlı olmadığında ürün ne YAPAR (ne yapmadığı değil). */
  readonly bagliDegilkenDavranis: string;
}

/* ═══ UY-18 · İmza ════════════════════════════════════════════════════ */

export const kmsImzaSaglayici: DisSaglayici = {
  ad: 'kms_hsm',
  aile: 'imza',
  bagli: false,
  gereken: 'Kurumun HSM ya da bulut KMS erişimi: imzalama anahtarının '
    + 'tanımlayıcısı, anahtar politikası (kim imzalayabilir), imza '
    + 'algoritması ve doğrulama için yayımlanan sertifika zinciri. '
    + 'Anahtarın kendisi ürüne ASLA verilmez; imza uzakta atılır.',
  bagliDegilkenDavranis: 'Paket yine üretilir ve SHA-256 bütünlük damgası taşır '
    + '(`ozet`). Damga içeriğin değişmediğini kanıtlar; imzanın kanıtladığı '
    + 'KİMLİK kanıtlanmaz. Paket başlığı bunu "imzasız" olarak yazar ve '
    + '"imzalandı" numarası YAPILMAZ.',
};

/* ═══ UY-20 · Belge yönetim sistemi ═══════════════════════════════════ */

export const dysSaglayici: DisSaglayici = {
  ad: 'kurumsal_dys',
  aile: 'belge_yonetimi',
  bagli: false,
  gereken: 'Kurumun DYS ürünü ve salt okunur API erişimi: taban URL, kimlik '
    + 'yöntemi, okunacak kütüphane/klasör kapsamı ve belge sürüm alanının '
    + 'adı. Yazma izni İSTENMEZ — ürün DYS\'ye belge YAZMAZ, yalnız '
    + 'yönetişim belgesinin güncel sürümünü okur.',
  bagliDegilkenDavranis: 'Yönetişim belgeleri ürünün kendi `Dokuman` kütüğünde '
    + 'elle kaydedilir ve sürümü elle girilir. Bu bir kusur değil bir '
    + 'kurulum durumudur; ama "DYS ile senkron" DEĞİLDİR ve ekran öyle '
    + 'göstermez.',
};

export const DIS_SAGLAYICILAR: readonly DisSaglayici[] = [
  kmsImzaSaglayici, dysSaglayici,
];

export function disEtkinSaglayici(aile: DisSaglayiciAilesi): DisSaglayici | null {
  return DIS_SAGLAYICILAR.find((s) => s.aile === aile && s.bagli) ?? null;
}

/* ═══ İmza durumu ═════════════════════════════════════════════════════ */

export type ImzaDurumu = 'imzalandi' | 'imzasiz' | 'dogrulanamadi';

export const IMZA_SOZU: Record<ImzaDurumu, string> = {
  imzalandi: 'imzalandı',
  imzasiz: 'imzasız — bütünlük damgası var, kimlik kanıtı yok',
  dogrulanamadi: 'imza doğrulanamadı',
};

export const IMZA_SINIFI: Record<ImzaDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  imzalandi: 'ok', imzasiz: 'unk', dogrulanamadi: 'bd',
};

/**
 * Bir paketin imza durumu.
 *
 * İmza sağlayıcısı bağlı DEĞİLSE sonuç daima `imzasiz`tır ve bu bir
 * HATA DEĞİLDİR: paket geçerlidir, bütünlük damgası taşır ve
 * denetçiye verilebilir. Eksik olan tek şey imzanın kanıtladığı
 * KİMLİKTİR ve ekran bunu tam olarak böyle yazar.
 *
 * `dogrulanamadi` yalnız gerçekten imzalı ama doğrulaması geçmeyen bir
 * pakette döner — yani sağlayıcı bağlandıktan sonra. Bugün ulaşılamaz
 * bir durumdur ve bu bilinçlidir: kod bağlantı gününe hazır durur.
 */
export function imzaDurumu(o: {
  imzaVar: boolean;
  dogrulandi: boolean | null;
}): ImzaDurumu {
  if (!o.imzaVar) return 'imzasiz';
  return o.dogrulandi === true ? 'imzalandi' : 'dogrulanamadi';
}

/** Paket başlığına yazılan tek satır — "imzalandı" numarası yapmaz. */
export function imzaBeyani(durum: ImzaDurumu): string {
  if (durum === 'imzalandi') return 'Paket imzalıdır; imza zinciriyle doğrulandı.';
  if (durum === 'dogrulanamadi') {
    return 'Paket imza taşıyor ama DOĞRULANAMADI — içerik değişmiş ya da '
      + 'zincir eksik olabilir.';
  }
  return 'Paket İMZASIZDIR. SHA-256 bütünlük damgası içeriğin değişmediğini '
    + 'kanıtlar; imzalayanın kimliğini kanıtlamaz. İmza için kurumsal '
    + 'HSM/KMS erişimi gerekir ve henüz bağlı değildir.';
}
