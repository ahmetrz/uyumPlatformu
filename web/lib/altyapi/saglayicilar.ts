/* ═══════════════════════════════════════════════════════════════════════
   OT-48 · Üretim ölçeği altyapı sağlayıcıları

   Bu dosya `lib/entegrasyon/sir.ts`teki kalıbı üç yeni aileye taşır:
   VERİTABANI · NESNE DEPOSU · KOORDİNASYON. Kalıbın tek kuralı vardır ve
   ürünün bütün altyapı katmanında geçerlidir:

     BAĞLI OLMAYAN SAĞLAYICI "ÇALIŞIYOR" NUMARASI YAPMAZ.

   Bir sağlayıcı ya gerçekten bağlıdır, ya da `bagli: false` der ve neyin
   eksik olduğunu YAZAR. Üçüncü bir hâl (sessizce boş dönen, hiçbir şey
   yapmayan sahte sağlayıcı) yoktur — çünkü o hâl, üretimde "yedekleme
   çalışıyor" yazan ama hiçbir şey yazmayan bir nesne deposu demektir.

   ── Bu dosya HİÇBİR DIŞ SİSTEME BAĞLANMAZ ─────────────────────────────
   PostgreSQL, Redis, S3/MinIO ve dağıtık kilit sağlayıcıları burada
   TANIMLI ama KAYITLI DEĞİLDİR. Kayıt olabilmeleri için gerçek bir uç
   nokta ve kimlik bilgisi gerekir; ikisi de ürünle gelmez ve
   uydurulmaz. Bugün kayıtlı olan üç sağlayıcı da ürünün kendi içinde
   çalışan, gerçekten bağlı sağlayıcılardır.

   ── Neden bugünden yazılıyor ──────────────────────────────────────────
   Bağlantı günü bu kararların acele verilmemesi için. Bugün SQLite'a
   doğrudan bağlı bir kod tabanı, PostgreSQL'e geçerken her çağrı yerinde
   ayrı ayrı düşünmeyi gerektirir; sağlayıcı arayüzü o düşünmeyi tek yere
   toplar. */

export type SaglayiciAilesi = 'veritabani' | 'nesne_deposu' | 'koordinasyon';

export const AILE_ETIKETI: Record<SaglayiciAilesi, string> = {
  veritabani: 'Veritabanı',
  nesne_deposu: 'Nesne deposu',
  koordinasyon: 'Koordinasyon (kilit / önderlik)',
};

/**
 * Sağlayıcının üretim ölçeğinde NE VAAT ETTİĞİ.
 *
 * `tekOrnek` en önemli alandır: SQLite ve süreç-içi kuyruk tek örnekte
 * doğru çalışır, iki örnekli bir dağıtımda ise sessizce bozulur. Bunu
 * bir ekran alanı yapmak, "yatay ölçekleyelim" kararının önüne bir
 * uyarı koyar.
 */
export type Yetenek = {
  /** Birden fazla uygulama örneğiyle güvenli mi? */
  cokOrnek: boolean;
  /** Süreç yeniden başlarsa veri/durum korunur mu? */
  kalici: boolean;
  /** Yedeklenebilir/geri yüklenebilir mi (operasyon sorumluluğu)? */
  yedeklenebilir: boolean;
};

export interface AltyapiSaglayici {
  readonly ad: string;
  readonly aile: SaglayiciAilesi;
  /** Gerçekten bir kaynağa bağlı mı? false ise hiçbir çağrı denenmez. */
  readonly bagli: boolean;
  /** Bağlı değilse ne gerekiyor — ekranda ve hata metninde AYNEN görünür. */
  readonly gereken: string | null;
  readonly yetenek: Yetenek;
  /** İnsan için tek satır; ekranda sağlayıcının altında durur. */
  readonly ozet: string;
}

/* ═══ Kayıtlı sağlayıcılar ════════════════════════════════════════════ */

/** SQLite — ürünün bugünkü veritabanı. GERÇEKTEN BAĞLI. */
export const sqliteSaglayici: AltyapiSaglayici = {
  ad: 'sqlite',
  aile: 'veritabani',
  bagli: true,
  gereken: null,
  yetenek: { cokOrnek: false, kalici: true, yedeklenebilir: true },
  ozet: 'Tek dosya · tek örnek. Yazma işlemleri tek süreçte serileşir; '
    + 'iki uygulama örneği aynı dosyaya yazarsa kilitlenme ve "database is '
    + 'locked" hataları başlar.',
};

/** PostgreSQL — KAYITLI DEĞİL. */
export const postgresSaglayici: AltyapiSaglayici = {
  ad: 'postgresql',
  aile: 'veritabani',
  bagli: false,
  gereken: 'Kurumun PostgreSQL sunucusu: host/port, veritabanı adı, uygulama '
    + 'rolü ve parolası (sır referansıyla), TLS kök sertifikası ve bağlantı '
    + 'havuzu sınırı. Şema göçleri Prisma ile taşınır; SQLite\'a özel '
    + 'sorgu yoktur.',
  yetenek: { cokOrnek: true, kalici: true, yedeklenebilir: true },
  ozet: 'Çok örnekli dağıtımın ön koşulu. Bağlanana kadar ürün tek örnekte koşar.',
};

/** Yerel dosya sistemi — kanıt/paket dosyaları için. GERÇEKTEN BAĞLI. */
export const yerelDosyaSaglayici: AltyapiSaglayici = {
  ad: 'yerel_dosya',
  aile: 'nesne_deposu',
  bagli: true,
  gereken: null,
  yetenek: { cokOrnek: false, kalici: true, yedeklenebilir: true },
  ozet: 'Uygulama sunucusunun kendi diski. İki örnek aynı diski görmez; '
    + 'bir örneğe yüklenen dosya ötekinde YOKTUR.',
};

/** S3 uyumlu nesne deposu — KAYITLI DEĞİL. */
export const nesneDeposuSaglayici: AltyapiSaglayici = {
  ad: 's3_uyumlu',
  aile: 'nesne_deposu',
  bagli: false,
  gereken: 'S3 uyumlu bir depo (MinIO, kurumsal obje depolama ya da bulut): '
    + 'uç nokta, bölge, kova adı, erişim anahtarı çifti (sır referansıyla) '
    + 've sunucu tarafı şifreleme politikası. Saklama/silme kuralları '
    + 'UY-56 ile birlikte tanımlanır.',
  yetenek: { cokOrnek: true, kalici: true, yedeklenebilir: true },
  ozet: 'Kanıt dosyalarının çok örnekli ve dayanıklı adresi.',
};

/**
 * Veritabanı tabanlı adlandırılmış kilit — GERÇEKTEN BAĞLI.
 *
 * `lib/is/kilit.ts` kilidi TEK atomik ifadeyle alır ve kira modeliyle
 * çalışır; yani süreç çökse bile kilit düşer. Bu, tek veritabanını
 * paylaşan birden çok süreç için DOĞRU çalışır — sınır veritabanının
 * kendisidir, kilit mekanizması değil.
 */
export const dbKilitSaglayici: AltyapiSaglayici = {
  ad: 'db_kilidi',
  aile: 'koordinasyon',
  bagli: true,
  gereken: null,
  yetenek: { cokOrnek: true, kalici: true, yedeklenebilir: true },
  ozet: 'Kira tabanlı adlandırılmış kilit (IsKilidi). Aynı veritabanını gören '
    + 'süreçler arasında güvenlidir; kapsamı veritabanının kapsamıdır.',
};

/** Redis/etcd tabanlı dağıtık koordinasyon — KAYITLI DEĞİL. */
export const dagitikKilitSaglayici: AltyapiSaglayici = {
  ad: 'dagitik_kilit',
  aile: 'koordinasyon',
  bagli: false,
  gereken: 'Redis ya da etcd kümesi: uç nokta(lar), kimlik bilgisi (sır '
    + 'referansıyla), TLS ayarı ve yüksek erişilebilirlik topolojisi. '
    + 'Veritabanı kilidi yeterli olduğu sürece BU GEREKMEZ; ayrı bir '
    + 'bileşen eklemek ayrı bir arıza yüzeyi eklemektir.',
  yetenek: { cokOrnek: true, kalici: false, yedeklenebilir: false },
  ozet: 'Veritabanından bağımsız koordinasyon. Bugün gerekmiyor.',
};

/* ═══ Kayıt defteri ═══════════════════════════════════════════════════ */

/**
 * Bilinen bütün sağlayıcılar — bağlı olmayanlar DA listede.
 *
 * Bağlı olmayanı listeden çıkarmak, ekranı "her şey yolunda" gösterirdi;
 * oysa asıl bilgi hangi yeteneğin HENÜZ OLMADIĞIDIR.
 */
export const SAGLAYICILAR: readonly AltyapiSaglayici[] = [
  sqliteSaglayici, postgresSaglayici,
  yerelDosyaSaglayici, nesneDeposuSaglayici,
  dbKilitSaglayici, dagitikKilitSaglayici,
];

/** Bu ailede ETKİN olan sağlayıcı; hiçbiri bağlı değilse null. */
export function etkinSaglayici(aile: SaglayiciAilesi): AltyapiSaglayici | null {
  return SAGLAYICILAR.find((s) => s.aile === aile && s.bagli) ?? null;
}

export function aileninSaglayicilari(aile: SaglayiciAilesi): AltyapiSaglayici[] {
  return SAGLAYICILAR.filter((s) => s.aile === aile);
}

/**
 * Bu kurulum kaç uygulama örneğiyle güvenli koşar?
 *
 * `1` demek bir kusur DEĞİLDİR — bir kurulum kararıdır. Ama "yatay
 * ölçekleyelim" denince hangi bileşenin engel olduğu tek bakışta
 * görünmelidir; bu yüzden engelleyen aileler ADIYLA döner.
 */
export function cokOrnekEngelleri(): { aile: SaglayiciAilesi; saglayici: string }[] {
  const engeller: { aile: SaglayiciAilesi; saglayici: string }[] = [];
  for (const aile of ['veritabani', 'nesne_deposu', 'koordinasyon'] as const) {
    const etkin = etkinSaglayici(aile);
    /* Bağlı sağlayıcısı OLMAYAN aile burada engel sayılmaz: o ayrı bir
       eksikliktir ve hazırlık kontrolünde `eksik` olarak görünür.
       İkisini karıştırmak, hiç kurulmamış bir bileşeni "ölçeklenmiyor"
       diye raporlamak olurdu. */
    if (etkin && !etkin.yetenek.cokOrnek) {
      engeller.push({ aile, saglayici: etkin.ad });
    }
  }
  return engeller;
}
