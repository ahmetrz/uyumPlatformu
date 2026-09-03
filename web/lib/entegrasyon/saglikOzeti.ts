import 'server-only';
import { db } from '@/lib/db';
import { izinVar } from '@/lib/erisim';
import {
  referansGecerli, sirMaskesi, sirSaglayicilari, sirVarMi,
} from '@/lib/entegrasyon/sir';
import type { AktifKullanici } from '@/lib/auth';
// YALNIZ TİP: kuru koşu raporunun biçimi. `import type` derlemede silinir,
// bu okuma katmanı kuru koşu çekirdeğine RUNTIME bağımlılık taşımaz.
import type { KuruOzet } from '@/lib/entegrasyon/kuru';

/* Entegrasyon gözlemlenebilirliği — SALT OKUMA özet katmanı.

   Bu dosya hiçbir connector koşturmaz, hiçbir dış sisteme bağlanmaz ve
   HİÇBİR SIR ÇÖZMEZ. Görevi tek: `Connector` + `EntegrasyonKosusu`
   satırlarını /saglik ekranının gösterebileceği, istemciye gönderilmesi
   güvenli bir özete çevirmek.

   Uyduğu değişmezler:

   1. SESSİZ HATA YOK. Hiç koşmamış connector "başarılı" görünmez
      (`hic_kosmadi` ayrı bir durumdur). `durum='calisiyor'` ama başlangıcı
      çok eski olan koşu `bayat_kosu` olarak işaretlenir — ölmüş bir süreç
      sonsuza dek "çalışıyor" görünemez. Yorumlayamadığımız koşu durumu
      `bilinmiyor` döner, başarısız ya da başarılı sayılmaz.

   2. `kimlik_bekleniyor` HATA DEĞİLDİR. Dış sistem henüz bağlanmamışsa bu
      bekleyen bir kurulum adımıdır; `basarisiz` ile aynı kovaya konmaz.

   3. BİLİNMEYEN ≠ SIFIR ≠ YANLIŞ. Poll aralığı tanımsızsa veri tazeliği
      `bilinmiyor` döner — "gecikmiş" DEĞİL. Ölçemediğimiz şeyi ölçtük gibi
      göstermeyiz.

   4. SIR DEĞERİ BURADAN GEÇMEZ. Yalnız `sirMaskesi()` çıktısı (sırra giden
      adres) döner; `siriCoz()` bu dosyada çağrılmaz. Yetkisiz kullanıcı
      maskeli referansı bile görmez — özet boş döner. */

/* ═══ Eşikler ═════════════════════════════════════════════════════════ */

/** `calisiyor` koşusu bu kadar dakikadır bitmediyse süreç ölmüş sayılır. */
export const BAYAT_KOSU_ESIGI_DK = 60;

/** Beklenen poll aralığının kaç katı geçince veri "gecikmiş" sayılır.
    1.0 seçilseydi normal ritimde koşan her connector sürekli gecikmiş
    görünürdü; 2 = "bir tam aralık kaçırıldı". */
export const GECIKME_TOLERANSI = 2;

/* ═══ Girdi biçimleri (Prisma satırlarıyla yapısal uyumlu) ════════════ */

export type ConnectorGirdi = {
  id: string;
  kod: string;
  ad: string;
  tip: string;
  /** taslak | etkin | duraklatildi | hatali */
  durum: string;
  kaynakSistem: string;
  /** none | api_key | basic | oauth2_client_credentials | certificate */
  kimlikTipi: string;
  sirReferansi: string | null;
  /** dakika; null = yalnız elle tetiklenir */
  pollAralikDk: number | null;
  sonBasariliKosu: Date | null;
  sonHata: string | null;
  etkin: boolean;
  imlec: string | null;

  /* Aşağıdaki dördü OPSİYONELDİR ve bilinçlidir: saf `connectorSagligi()`
     çağrıları (testler, eski çağıranlar) bu alanları vermeyebilir. Verilmediğinde
     çıktı `null` olur ve ekran "bilinmiyor" yazar — varsayılan UYDURULMAZ.
     Özellikle `ortam`: bir connector'ın hangi ortama baktığı güvenlik
     bilgisidir; okunamadığında "gelistirme" varsaymak, üretim OT ağına bakan
     bir kaydı zararsız göstermek olurdu. */
  /** gelistirme | test | uretim */
  ortam?: string | null;
  /** tam | delta */
  senkronKipi?: string | null;
  /** şu ana kadarki ardışık başarısızlık */
  ardisikHata?: number | null;
  /** kaç ardışık hatadan sonra otomatik duraklatılır; null = duraklatma yok */
  ardisikHataSiniri?: number | null;
  maksDeneme?: number | null;
  geriCekilmeMs?: number | null;
  /** bağlı eşleme profili; null = tipin etkin profili kullanılır */
  eslemeProfilId?: string | null;
  /** son hatanın parmak izi (sınıf + deneme no + kısa sebep) */
  sonHataOzeti?: string | null;
};

export type KosuGirdi = {
  id: string;
  durum: string;
  tetikleyen: string;
  baslangic: Date;
  bitis: Date | null;
  sureMs: number | null;
  alinan: number;
  kabulEdilen: number;
  reddedilen: number;
  yinelenen: number;
  denemeNo: number;
  imlecOnce: string | null;
  imlecSonra: string | null;
  hata: string | null;
  /** hata OLMAYAN açıklama (hangi kimlik eksik, kaç kayıt neden reddedildi) */
  ayrinti: string | null;
  /** KURU KOŞU muydu? Kuru koşu hiçbir kayıt yazmaz — gerçek koşu sayılmaz.
      Eski satırlarda alan yok; okunamayan satır GERÇEK koşu sayılır (kuru
      koşu yeni bir yetenektir, geçmişte yoktu). */
  kuruKosu?: boolean | null;
  /** kuru koşunun "olsaydı ne olurdu" raporu (JSON metni); yalnız kuru
      koşularda dolu. Ayrıştırılamazsa SESSİZCE yutulmaz — çıktıda `null`
      olur ve ekran "rapor okunamadı" der. */
  kuruOzetJson?: string | null;
  /** gecici | yetki | yapilandirma | sir | sozlesme | yazma | bilinmeyen.
      Başarılı ve `kimlik_bekleniyor` koşuda null'dur: "hata sınıfı YOK" ile
      "hata sınıfı BİLİNMİYOR" ayrı şeylerdir ve ekranda da ayrılır. */
  hataSinifi?: string | null;
  /** koşuyu, ürettiği dead-letter satırlarını ve denetim izini bağlayan
      tek anahtar */
  korelasyonId?: string | null;
};

/* ═══ Çıktı biçimleri (istemciye gönderilir — serileştirilebilir) ═════ */

export type SaglikDurumu =
  /** son koşu başarıyla bitti */
  | 'basarili'
  /** son koşu hata ile bitti — kimlik bilgisi yerinde */
  | 'basarisiz'
  /** dış sistem bağlı değil: bekleyen kurulum adımı, HATA DEĞİL */
  | 'kimlik_bekleniyor'
  /** koşu şu an sürüyor */
  | 'calisiyor'
  /** `calisiyor` ama başlangıcı çok eski — süreç ölmüş */
  | 'bayat_kosu'
  /** hiç koşu kaydı yok — "sağlıklı" DEĞİL */
  | 'hic_kosmadi'
  /** koşu kaydı yorumlanamayan bir durum taşıyor */
  | 'bilinmiyor';

export type TazelikDurumu = 'taze' | 'gecikmis' | 'bilinmiyor';

export type Tazelik = {
  durum: TazelikDurumu;
  /** son başarılı koşudan bu yana geçen dakika; null = hiç başarılı koşu yok */
  gecenDk: number | null;
  /** beklenen poll aralığı (dk); null = tanımsız → gecikme ölçülemez */
  beklenenDk: number | null;
  /** gecenDk / beklenenDk; null = ölçülemedi (SIFIR DEĞİL) */
  gecikmeOrani: number | null;
  aciklama: string;
};

export type KosuSatiri = {
  id: string;
  durum: string;
  /** `calisiyor` görünüp aslında ölmüş koşu */
  bayat: boolean;
  tetikleyen: string;
  baslangic: string;
  bitis: string | null;
  sureMs: number | null;
  alinan: number;
  kabulEdilen: number;
  reddedilen: number;
  yinelenen: number;
  denemeNo: number;
  imlecOnce: string | null;
  imlecSonra: string | null;
  /** YALNIZ gerçek başarısızlık. Doluluğu ekranın rengini belirlemez —
      renk `durum`dan gelir. */
  hata: string | null;
  /** hata OLMAYAN açıklama; bilgi notu olarak gösterilir */
  ayrinti: string | null;
  /** reddedilen > 0 ise sebebi (önce `ayrinti`, sonra `hata`); yoksa null */
  reddSebebi: string | null;
  /** reddedilen > 0 ama sebep kaydı yok — sessizce yutulmuş kayıtlar */
  reddSebebiEksik: boolean;
  /** alinan ≠ kabulEdilen + reddedilen → sayaçlar tutmuyor */
  sayacTutarsiz: boolean;
  /** yinelenen > kabulEdilen → yinelenen kabul edilenlerin ALT KÜMESİ
      olmalıydı; büyükse sayaçlar gerçekten tutmuyor */
  yinelenenTutarsiz: boolean;
  /** hata sınıfı; null = sınıf yazılmamış (başarılı koşuda beklenen) */
  hataSinifi: string | null;
  /** koşu ↔ dead-letter ↔ denetim izi bağlantısı */
  korelasyonId: string | null;
  /** KURU koşu: sayaçları "olsaydı" değerleridir, hiçbir kayıt yazılmadı */
  kuru: boolean;
  /** kuru koşunun raporu (sayaçlar, örnekler, ret sebepleri, uyarılar).
      null = gerçek koşu ya da rapor okunamadı; `kuruOzetBozuk` ikisini ayırır. */
  kuruOzet: KuruOzet | null;
  /** kuru koşu raporu VARDI ama ayrıştırılamadı — sessizce "rapor yok"
      demek, hesaplanmış bir etkiyi kaybetmek olurdu */
  kuruOzetBozuk: boolean;
};

/** Adaptörün BEYAN ETTİĞİ bir sır referansının varlığı.
    Sır DEĞERİ okunmaz: `sirVarMi()` yalnız var/yok/bilinmiyor der ve
    `bilinmiyor` (sağlayıcı bağlı değil) `yok` ile KARIŞTIRILMAZ. */
export type SirDurumu = {
  referans: string;
  /** maskeli gösterim — ham referans ekrana bu biçimde iner */
  maske: string;
  durum: 'var' | 'yok' | 'bilinmiyor';
  sebep: string | null;
};

export type ConnectorSagligi = {
  id: string;
  kod: string;
  ad: string;
  tip: string;
  kaynakSistem: string;
  /** connector kaydının kendi durumu (taslak/etkin/…) — sağlıkla karıştırılmaz */
  kayitDurumu: string;
  /** Hangi ortamın sistemine bakıyor. null = KAYITTA OKUNAMADI (bilinmiyor);
      "gelistirme" varsayılmaz — yanlış varsayım üretim kaydını saklardı. */
  ortam: string | null;
  /** tam | delta; null = bilinmiyor */
  senkronKipi: string | null;
  /** ardışık başarısızlık sayacı; null = okunmadı (SIFIR DEĞİL) */
  ardisikHata: number | null;
  /** otomatik duraklatma eşiği; null = duraklatma yok ya da okunmadı */
  ardisikHataSiniri: number | null;
  /** sayaç eşiğe dayandı — bir sonraki hata connector'ı duraklatır */
  devreKesiciEsikte: boolean;
  /** geçici hatada en çok kaç deneme; null = ÜRÜN VARSAYILANI (3) */
  maksDeneme: number | null;
  /** üstel geri çekilme tabanı (ms); null = ÜRÜN VARSAYILANI (1s·4s·16s) */
  geriCekilmeMs: number | null;
  /** bağlı eşleme profili kimliği; null = tipin etkin profili */
  eslemeProfilId: string | null;
  /** beklenen poll aralığı (dk); null = yalnız elle tetiklenir.
      Tazelik hesabının girdisidir ve yapılandırma formunda düzenlenir. */
  pollAralikDk: number | null;
  etkin: boolean;
  kimlikTipi: string;
  /** YALNIZ maskeli adres. Sır DEĞERİ hiçbir koşulda bu nesneye girmez. */
  sirMaskeli: string;
  kimlikEksik: boolean;
  kimlikGerekce: string | null;
  durum: SaglikDurumu;
  /** hiç koşu kaydı yok — durum başka bir sebeple gölgelense de görünür kalır */
  hicKosmadi: boolean;
  bayatKosu: boolean;
  /** son GERÇEK koşu (kuru koşular buraya girmez) */
  sonKosu: KosuSatiri | null;
  /** son KURU koşu — ayrı alan: "son koşu başarılı" cümlesini kuru koşu
      kuramaz; kuru koşudan sonra entegrasyon hâlâ hiç veri getirmemiştir */
  sonKuruKosu: KosuSatiri | null;
  sonBasariliKosu: string | null;
  tazelik: Tazelik;
  /** Connector.sonHata — son koşunun hatasından ayrı tutulur */
  sonHata: string | null;
  /** son hatanın parmak izi: "aynı hata mı tekrar ediyor" sorusunun cevabı */
  sonHataOzeti: string | null;
  /** Adaptörün beyan ettiği sırlar ve varlıkları.
      null = ÖLÇÜLMEDİ (adaptör kayıtlı değil ya da beyan okunamadı) —
      boş dizi "hiç sır gerekmiyor" demektir, ikisi aynı şey DEĞİL. */
  gerekenSirlar: SirDurumu[] | null;
  imlec: string | null;
  /** yalnız GERÇEK koşuların geçmişi */
  gecmis: KosuSatiri[];
  /** kuru koşu geçmişi — ayrı liste, gerçek koşularla karıştırılmaz */
  kuruGecmis: KosuSatiri[];
};

export type BagimsizKosuOzeti = {
  tetikleyen: string;
  toplam: number;
  basarisiz: number;
  bayat: number;
  sonBaslangic: string;
};

/** Sır sağlayıcısının bağlılık durumu — `lib/entegrasyon/sir.ts` defterinden.
    Bağlı OLMAYAN sağlayıcı gizlenmez: `vault` bugün bağlı değildir ve bunu
    ekranda söylemek, "sır neden çözülmüyor" sorusunun tek dürüst cevabıdır. */
export type SaglayiciDurumu = { ad: string; bagli: boolean; gereken: string | null };

/** Zamanlayıcı görünürlüğü — "bu connector neden senkronize olmuyor?".
    Kaynak `lib/is/zamanlayici.ts` → `vadesiGelenler()`; o modül DEĞİŞTİRİLMEDİ,
    yalnız çağrıldı. Okunamazsa `okundu:false` döner ve ekran bunu boş liste
    gibi göstermez — "vadesi gelen yok" ile "zamanlayıcıya bakılamadı" ayrı
    şeylerdir. */
export type ZamanlayiciGorunumu = {
  okundu: boolean;
  hata: string | null;
  /** vadesi gelmiş connector kimlikleri */
  connectorVadeli: string[];
  /** connector kimliği → neden koşmuyor (zamanlayıcının kendi gerekçesi) */
  connectorSebep: Record<string, string>;
  /** vadesi gelmiş motor adları */
  motorVadeli: string[];
  /** motor adı → neden koşmuyor */
  motorSebep: Record<string, string>;
};

/** Eşleme profili sürümü. Sürüm asla güncellenmez; yeni yayın yeni satır
    açar, eskisi arşive geçer — bu yüzden `surum` ekranda daima yazılır. */
export type EslemeProfilOzeti = {
  id: string; kod: string; ad: string; connectorTipi: string;
  surum: number; durum: string;
};

export type EntegrasyonOzeti = {
  /** false = kullanıcı yonetim/okuma taşımıyor; hiçbir alan doldurulmaz */
  yetkili: boolean;
  connectorlar: ConnectorSagligi[];
  sayilar: Record<SaglikDurumu, number>;
  /** kayıtlı sır sağlayıcıları ve bağlı olup olmadıkları */
  saglayicilar: SaglayiciDurumu[];
  zamanlayici: ZamanlayiciGorunumu;
  /** koşuda kullanılabilecek eşleme profilleri (etkin olanlar + bağlı
      olanlar; arşiv sürüm bağlıysa gizlenmez) */
  eslemeProfilleri: EslemeProfilOzeti[];
  /** açık dead-letter (reddedilen kayıt) sayısı — kuyruğun kendisi ayrı
      rotada yaşar, ama sayısı burada görünür kalır ki kimse fark etmemezlik
      edemesin */
  reddedilenAcik: number;
  /** connector'a bağlı OLMAYAN koşular — görünmez kalmamalı */
  bagimsizKosular: BagimsizKosuOzeti[];
  /** silinmiş/kapsam dışı connector'a ait koşu sayısı */
  arsivKosuSayisi: number;
  uretildi: string;
};

/* ═══ Saf yardımcılar ═════════════════════════════════════════════════ */

function dkFarki(sonra: Date, once: Date): number {
  return Math.max(0, Math.floor((sonra.getTime() - once.getTime()) / 60_000));
}

/** Kimlik bilgisi kurulumu tamamlanmış mı? Sır DEĞERİ burada ÇÖZÜLMEZ —
    yalnız (a) çekirdeğin connector kaydına yazdığı durum ve (b) referansın
    varlığı/biçimi denetlenir.

    (a) şart: referans biçimsel olarak geçerli olup işaret ettiği ortam
    değişkeni tanımsız olabilir. Bunu okuma katmanı sırrı çözmeden bilemez;
    çekirdek `durum='kimlik_bekleniyor'` yazarak bildirir ve o kayıt burada
    yetkili kabul edilir — aksi hâlde bağlanmamış connector "hiç koşmadı"
    diye görünür, sebebi kaybolurdu. */
export function kimlikDurumu(c: ConnectorGirdi): { eksik: boolean; gerekce: string | null } {
  if (c.durum === 'kimlik_bekleniyor') {
    return {
      eksik: true,
      // Eyleme dönük tek satır: hangi adrese sır konması gerekiyor.
      gerekce: c.sonHata ?? (c.sirReferansi
        ? `Kimlik bilgisi kurulmadı — beklenen adres: ${sirMaskesi(c.sirReferansi)}`
        : 'Kimlik bilgisi kurulmadı — sır referansı da tanımlı değil'),
    };
  }
  if (c.kimlikTipi === 'none') return { eksik: false, gerekce: null };
  if (!c.sirReferansi) {
    return { eksik: true, gerekce: `Kimlik tipi "${c.kimlikTipi}" ama sır referansı tanımlı değil` };
  }
  if (!referansGecerli(c.sirReferansi)) {
    return { eksik: true, gerekce: `Sır referansı biçimi geçersiz: ${sirMaskesi(c.sirReferansi)}` };
  }
  return { eksik: false, gerekce: null };
}

/** `calisiyor` görünen ama başlangıcı eşikten eski koşu = ölmüş süreç. */
export function kosuBayatMi(k: KosuGirdi, simdi: Date, esikDk = BAYAT_KOSU_ESIGI_DK): boolean {
  if (k.durum !== 'calisiyor') return false;
  return dkFarki(simdi, k.baslangic) > esikDk;
}

/**
 * Veri tazeliği. Poll aralığı tanımsızsa gecikme HESAPLANAMAZ: `bilinmiyor`
 * döner, `gecikmis` değil. Hiç başarılı koşu yoksa geçen süre de bilinmez.
 */
export function tazelikHesapla(
  sonBasariliKosu: Date | null,
  pollAralikDk: number | null,
  simdi: Date,
  tolerans = GECIKME_TOLERANSI,
): Tazelik {
  const beklenenDk = pollAralikDk !== null && pollAralikDk > 0 ? pollAralikDk : null;
  if (!sonBasariliKosu) {
    return {
      durum: 'bilinmiyor', gecenDk: null, beklenenDk, gecikmeOrani: null,
      aciklama: 'Hiç başarılı koşu yok — verinin tazeliği ölçülemez',
    };
  }
  const gecenDk = dkFarki(simdi, sonBasariliKosu);
  if (beklenenDk === null) {
    return {
      durum: 'bilinmiyor', gecenDk, beklenenDk: null, gecikmeOrani: null,
      aciklama: 'Poll aralığı tanımsız (yalnız elle tetikleniyor) — gecikme ölçülemez, gecikmiş sayılmaz',
    };
  }
  const gecikmeOrani = gecenDk / beklenenDk;
  const gecikmis = gecikmeOrani > tolerans;
  return {
    durum: gecikmis ? 'gecikmis' : 'taze',
    gecenDk, beklenenDk, gecikmeOrani,
    aciklama: gecikmis
      ? `Beklenen aralığın ${gecikmeOrani.toFixed(1)} katı geçti (${gecenDk} dk / ${beklenenDk} dk)`
      : `Beklenen aralık içinde (${gecenDk} dk / ${beklenenDk} dk)`,
  };
}

/** Kuru koşu raporunu ayrıştırır. Bozuk JSON SESSİZCE yutulmaz: rapor
    yokmuş gibi davranmak, hesaplanmış bir "olsaydı ne olurdu" tablosunu
    kaybetmek olurdu. */
function kuruOzetiCoz(ham: string | null | undefined): {
  ozet: KuruOzet | null; bozuk: boolean;
} {
  if (!ham) return { ozet: null, bozuk: false };
  try {
    const o = JSON.parse(ham) as KuruOzet;
    if (!o || typeof o !== 'object' || !o.sayaclar) return { ozet: null, bozuk: true };
    return { ozet: o, bozuk: false };
  } catch {
    return { ozet: null, bozuk: true };
  }
}

function kosuSatiri(k: KosuGirdi, simdi: Date, esikDk: number): KosuSatiri {
  /* Ret sebebi öncelikle `ayrinti`dedir: reddedilen kayıt koşuyu başarısız
     yapmaz, dolayısıyla `hata` alanına yazılmamalıdır. Eski kayıtlar için
     `hata`ya düşülür. */
  const reddSebebi = k.reddedilen > 0 ? (k.ayrinti ?? k.hata) : null;
  const kuru = kuruOzetiCoz(k.kuruOzetJson);
  return {
    id: k.id,
    durum: k.durum,
    bayat: kosuBayatMi(k, simdi, esikDk),
    tetikleyen: k.tetikleyen,
    baslangic: k.baslangic.toISOString(),
    bitis: k.bitis ? k.bitis.toISOString() : null,
    sureMs: k.sureMs,
    alinan: k.alinan,
    kabulEdilen: k.kabulEdilen,
    reddedilen: k.reddedilen,
    yinelenen: k.yinelenen,
    denemeNo: k.denemeNo,
    imlecOnce: k.imlecOnce,
    imlecSonra: k.imlecSonra,
    hata: k.hata,
    ayrinti: k.ayrinti,
    hataSinifi: k.hataSinifi ?? null,
    korelasyonId: k.korelasyonId ?? null,
    reddSebebi,
    kuru: k.kuruKosu === true,
    kuruOzet: kuru.ozet,
    kuruOzetBozuk: kuru.bozuk,
    // Reddedilen kayıt var ama sebebi yazılmamışsa bu bir boşluktur, sessizce geçilmez.
    reddSebebiEksik: k.reddedilen > 0 && !k.ayrinti && !k.hata,
    /* ÇEKİRDEĞİN SAYAÇ SÖZLEŞMESİ (lib/entegrasyon/cekirdek.ts başlığı):
         alinan = kabulEdilen + reddedilen
         yinelenen ⊆ kabulEdilen   (aynı kaynak kaydı yeniden geldi)

       `yinelenen` AYRI BİR KOVA DEĞİL, kabul edilenlerin alt kümesidir.
       Buradaki formül eskiden onu ikinci kez topluyordu; sonuç olarak
       yinelenen içeren HER BAŞARILI DELTA KOŞUSU "sayaçlar tutmuyor" diye
       işaretleniyordu (alınan 3 / kabul 3 / red 0 / yinelenen 3 → tutarsız).
       Delta senkronizasyonda yinelenen normaldir; uyarı böylece gerçek
       tutarsızlıkta kimsenin bakmayacağı bir gürültüye dönüşmüştü. */
    sayacTutarsiz: k.durum !== 'calisiyor'
      && k.alinan !== k.kabulEdilen + k.reddedilen,
    // Alt küme kuralının kendi ölçüsü: yinelenen kabul edileni AŞAMAZ.
    yinelenenTutarsiz: k.durum !== 'calisiyor' && k.yinelenen > k.kabulEdilen,
  };
}

/** Koşu geçmişinden türetilen son BAŞARILI zaman — `Connector.sonBasariliKosu`
    yazılmamışsa yedek kaynak (yoksa "hiç başarılı koşu yok" yalanı olurdu).
    KURU koşu buraya giremez: başarıyla biten bir kuru koşu hiçbir veri
    getirmemiştir, "veri şu kadar taze" demek yalan olurdu. */
function gecmistenSonBasari(kosular: KosuGirdi[]): Date | null {
  const b = kosular.find((k) => k.durum === 'basarili' && k.kuruKosu !== true);
  if (!b) return null;
  return b.bitis ?? b.baslangic;
}

export type OzetSecenegi = {
  simdi?: Date;
  bayatEsigiDk?: number;
  gecikmeToleransi?: number;
  /** Adaptörün beyan ettiği sırların varlığı — sorgu katmanı çözer ve
      buradan enjekte eder. `connectorSagligi` SAF kalsın diye parametredir:
      sır varlığı sorgusu dosya sistemine/ortama bakar, saf fonksiyon bakmaz.
      Verilmezse `null` yazılır (ölçülmedi), boş dizi UYDURULMAZ. */
  gerekenSirlar?: SirDurumu[] | null;
};

/**
 * Tek connector'ın sağlık satırı. `kosular` YENİDEN ESKİYE sıralı olmalı.
 * Saf fonksiyon: veritabanına ve sır sağlayıcısına dokunmaz.
 */
export function connectorSagligi(
  c: ConnectorGirdi,
  kosular: KosuGirdi[],
  secenek: OzetSecenegi = {},
): ConnectorSagligi {
  const simdi = secenek.simdi ?? new Date();
  const esikDk = secenek.bayatEsigiDk ?? BAYAT_KOSU_ESIGI_DK;
  const tolerans = secenek.gecikmeToleransi ?? GECIKME_TOLERANSI;

  /* Kuru koşular AYRI listeye ayrılır. Aynı listede dursalardı sağlık
     durumu son kuru koşudan hesaplanır ve hiç veri getirmemiş bir
     entegrasyon "başarılı" görünürdü — §6'nın açıkça yasakladığı şey. */
  const gercekHam = kosular.filter((k) => k.kuruKosu !== true);
  const kuruHam = kosular.filter((k) => k.kuruKosu === true);
  const gecmis = gercekHam.map((k) => kosuSatiri(k, simdi, esikDk));
  const kuruGecmis = kuruHam.map((k) => kosuSatiri(k, simdi, esikDk));
  const sonHam = gercekHam[0] ?? null;
  const sonKosu = gecmis[0] ?? null;
  const kimlik = kimlikDurumu(c);
  const hicKosmadi = sonHam === null;
  const bayatKosu = sonKosu?.bayat ?? false;

  const durum: SaglikDurumu = (() => {
    // 1) Canlı kanıt önce: koşu sürüyor mu, yoksa ölmüş mü?
    if (sonHam?.durum === 'calisiyor') return bayatKosu ? 'bayat_kosu' : 'calisiyor';
    // 2) Kimlik kurulumu tamamlanmadıysa bu bir HATA değil, bekleyen adımdır.
    //    Başarısız koşuyu "başarısız" diye göstermek sebebi gizlerdi.
    if (kimlik.eksik) return 'kimlik_bekleniyor';
    // 3) Koşu kaydı hiç yoksa "sağlıklı" diyemeyiz. Ama connector kaydı
    //    'hatali' işaretliyse kayıtlı bir başarısızlık var — onu gizlemeyiz.
    if (hicKosmadi) return c.durum === 'hatali' ? 'basarisiz' : 'hic_kosmadi';
    if (sonHam.durum === 'basarili') return 'basarili';
    if (sonHam.durum === 'basarisiz') return 'basarisiz';
    if (sonHam.durum === 'kimlik_bekleniyor') return 'kimlik_bekleniyor';
    // 4) Tanımadığımız durum uydurulmaz.
    return 'bilinmiyor';
  })();

  const sonBasari = c.sonBasariliKosu ?? gecmistenSonBasari(gercekHam);

  return {
    id: c.id,
    kod: c.kod,
    ad: c.ad,
    tip: c.tip,
    kaynakSistem: c.kaynakSistem,
    kayitDurumu: c.durum,
    /* Boş metin de "bilinmiyor"dur: veritabanında '' duran bir ortam alanı
       ekranda "gelistirme" diye okunamaz. */
    ortam: c.ortam?.trim() || null,
    senkronKipi: c.senkronKipi?.trim() || null,
    ardisikHata: c.ardisikHata ?? null,
    ardisikHataSiniri: c.ardisikHataSiniri ?? null,
    maksDeneme: c.maksDeneme ?? null,
    geriCekilmeMs: c.geriCekilmeMs ?? null,
    /* Devre kesici eşiği YALNIZ iki sayı da biliniyorsa hesaplanır; biri
       bilinmiyorsa "eşikte değil" demek uydurma olurdu, `false` kalır ve
       ekran sayaç yerine "bilinmiyor" yazar. */
    devreKesiciEsikte: c.ardisikHataSiniri != null && c.ardisikHataSiniri > 0
      && (c.ardisikHata ?? 0) >= c.ardisikHataSiniri,
    eslemeProfilId: c.eslemeProfilId ?? null,
    pollAralikDk: c.pollAralikDk,
    etkin: c.etkin,
    kimlikTipi: c.kimlikTipi,
    // Sırra giden ADRES; sırrın kendisi değil. siriCoz() burada çağrılmaz.
    sirMaskeli: sirMaskesi(c.sirReferansi),
    kimlikEksik: kimlik.eksik,
    kimlikGerekce: kimlik.gerekce,
    durum,
    hicKosmadi,
    bayatKosu,
    sonKosu,
    sonKuruKosu: kuruGecmis[0] ?? null,
    sonBasariliKosu: sonBasari ? sonBasari.toISOString() : null,
    tazelik: tazelikHesapla(sonBasari, c.pollAralikDk, simdi, tolerans),
    sonHata: c.sonHata,
    sonHataOzeti: c.sonHataOzeti ?? null,
    gerekenSirlar: secenek.gerekenSirlar ?? null,
    imlec: c.imlec,
    gecmis,
    kuruGecmis,
  };
}

export function bosSayilar(): Record<SaglikDurumu, number> {
  return {
    basarili: 0, basarisiz: 0, kimlik_bekleniyor: 0,
    calisiyor: 0, bayat_kosu: 0, hic_kosmadi: 0, bilinmiyor: 0,
  };
}

/** Ekran sırası: en çok müdahale isteyen üstte. Alfabetik sıra gerçek
    başarısızlığı listenin ortasına gömerdi. */
const DURUM_AGIRLIGI: Record<SaglikDurumu, number> = {
  basarisiz: 0, bayat_kosu: 1, bilinmiyor: 2, kimlik_bekleniyor: 3,
  hic_kosmadi: 4, calisiyor: 5, basarili: 6,
};

export function durumaGoreSirala(satirlar: ConnectorSagligi[]): ConnectorSagligi[] {
  return [...satirlar].sort((a, b) =>
    DURUM_AGIRLIGI[a.durum] - DURUM_AGIRLIGI[b.durum] || a.kod.localeCompare(b.kod, 'tr'));
}

export function durumSayilari(satirlar: ConnectorSagligi[]): Record<SaglikDurumu, number> {
  const s = bosSayilar();
  for (const r of satirlar) s[r.durum] += 1;
  return s;
}

/* ═══ Sorgu katmanı ═══════════════════════════════════════════════════ */

const KOSU_ALANLARI = {
  id: true, durum: true, tetikleyen: true, baslangic: true, bitis: true,
  sureMs: true, alinan: true, kabulEdilen: true, reddedilen: true,
  yinelenen: true, denemeNo: true, imlecOnce: true, imlecSonra: true,
  hata: true, ayrinti: true, kuruKosu: true, kuruOzetJson: true,
  hataSinifi: true, korelasyonId: true,
} as const;

/** Zamanlayıcıya hiç bakılamadığında dönen görünüm. Boş listelerle
    "vadesi gelen yok" demek YASAK — okunmadığı `okundu:false` ile söylenir. */
function bosZamanlayici(hata: string | null): ZamanlayiciGorunumu {
  return {
    okundu: false, hata,
    connectorVadeli: [], connectorSebep: {}, motorVadeli: [], motorSebep: {},
  };
}

function bosOzet(yetkili: boolean, simdi: Date): EntegrasyonOzeti {
  return {
    yetkili,
    connectorlar: [],
    sayilar: bosSayilar(),
    /* Yetkisiz kullanıcıya sağlayıcı defteri de gitmez: hangi sır
       sağlayıcısının bağlı olduğu kurulum bilgisidir. */
    saglayicilar: [],
    zamanlayici: bosZamanlayici(null),
    eslemeProfilleri: [],
    reddedilenAcik: 0,
    bagimsizKosular: [],
    arsivKosuSayisi: 0,
    uretildi: simdi.toISOString(),
  };
}

/**
 * Adaptörün beyan ettiği sırların VARLIĞINI çözer — değerlerini DEĞİL.
 *
 * `sirVarMi()` üç yanıt verir ve üçü de farklıdır: `var`, `yok`,
 * `bilinmiyor`. Sağlayıcı bağlı değilse yanıt `bilinmiyor`dur; onu `yok`a
 * indirgemek, kurulumu eksik olmayan bir connector'ı eksik göstermek olurdu.
 *
 * Adaptör kayıtlı değilse `null` döner: "hiç sır gerekmiyor" (boş dizi) ile
 * "beyan okunamadı" ayrı şeylerdir.
 */
async function gerekenSirlariCoz(tip: string): Promise<SirDurumu[] | null> {
  try {
    const { adaptorVarMi, adaptorCoz } = await import('@/lib/entegrasyon/kayit');
    if (!adaptorVarMi(tip)) return null;
    const beyan = adaptorCoz(tip).gerekenSirlar;
    if (!Array.isArray(beyan)) return null;
    return Promise.all(beyan.map(async (referans) => {
      const v = await sirVarMi(referans);
      return {
        referans,
        maske: sirMaskesi(referans),
        durum: v.durum,
        sebep: v.durum === 'var' ? null : v.sebep,
      };
    }));
  } catch {
    // Beyan okunamadı: uydurma yerine "ölçülmedi".
    return null;
  }
}

/**
 * Zamanlayıcının "şu an ne koşardı" görüşü. `lib/is/zamanlayici.ts`
 * DEĞİŞTİRİLMEDİ; burada yalnız çağrılır ve ekranın anlayacağı biçime
 * çevrilir.
 *
 * Modül GEÇ yüklenir (dynamic import): `saglikOzeti` salt okuma bir özet
 * katmanıdır ve onu içe aktaran her çağıran (testler dâhil) motor
 * kayıt defterini + iş kuyruğunu da yüklemek zorunda kalmamalı.
 *
 * FIRLATMAZ: zamanlayıcıya bakılamazsa sebebi taşınır. Sessizce boş liste
 * dönmek, hiçbir şeyin koşmadığı bir kurulumu "her şey zamanında" gibi
 * gösterirdi.
 */
async function zamanlayiciGorunumu(simdi: Date): Promise<ZamanlayiciGorunumu> {
  try {
    const { vadesiGelenler } = await import('@/lib/is/zamanlayici');
    const { kosulacak, atlanan } = await vadesiGelenler(simdi);
    const gorunum: ZamanlayiciGorunumu = {
      okundu: true, hata: null,
      connectorVadeli: [], connectorSebep: {}, motorVadeli: [], motorSebep: {},
    };
    for (const h of kosulacak) {
      if (h.tur === 'connector') gorunum.connectorVadeli.push(h.hedef);
      else gorunum.motorVadeli.push(h.hedef);
    }
    for (const a of atlanan) {
      if (a.tur === 'connector') gorunum.connectorSebep[a.hedef] = a.sebep;
      else gorunum.motorSebep[a.hedef] = a.sebep;
    }
    return gorunum;
  } catch (e) {
    return bosZamanlayici(
      `Zamanlayıcı durumu okunamadı: ${e instanceof Error ? e.message : 'bilinmeyen hata'}`);
  }
}

/**
 * /saglik ekranının entegrasyon bölümü. `yonetim/okuma` ister — yetkisiz
 * kullanıcıya maskeli sır referansı dahil hiçbir connector alanı dönmez.
 *
 * Connector kaydı hiç yoksa boş özet döner (çökmez): "connector yok" ile
 * "connector sağlıklı" aynı şey değildir, ekran bunu boş durum olarak gösterir.
 */
export async function entegrasyonSagligiOzeti(
  k: AktifKullanici,
  secenek: OzetSecenegi & { gecmisAdedi?: number } = {},
): Promise<EntegrasyonOzeti> {
  const simdi = secenek.simdi ?? new Date();
  if (!izinVar(k, 'yonetim', 'okuma')) return bosOzet(false, simdi);

  const gecmisAdedi = secenek.gecmisAdedi ?? 5;
  const connectorlar = await db.connector.findMany({
    where: { silindi: null },
    orderBy: [{ etkin: 'desc' }, { kod: 'asc' }],
    select: {
      id: true, kod: true, ad: true, tip: true, durum: true, kaynakSistem: true,
      kimlikTipi: true, sirReferansi: true, pollAralikDk: true,
      sonBasariliKosu: true, sonHata: true, etkin: true, imlec: true,
      // Yapılandırma tezgâhının gösterdiği alanlar. `sirReferansi` yalnız
      // maskelenmek için okunur; ham hâli çıktıya GİRMEZ.
      ortam: true, senkronKipi: true, ardisikHata: true, ardisikHataSiniri: true,
      maksDeneme: true, geriCekilmeMs: true,
      eslemeProfilId: true, sonHataOzeti: true,
    },
  });

  const idler = connectorlar.map((c) => c.id);
  /* Eşleme profilleri: ETKİN olanlar + bir connector'a BAĞLI olanlar.
     Bağlı bir arşiv sürümü listeden düşerse ekran "profil yok" derdi;
     oysa koşu hâlâ o sürümle yorumluyor olurdu. */
  const bagliProfilIdler = connectorlar
    .map((c) => c.eslemeProfilId).filter((x): x is string => !!x);

  const [kosuListeleri, bagimsizHam, arsivKosuSayisi, zamanlayici,
    eslemeProfilHam, reddedilenAcik] = await Promise.all([
    Promise.all(idler.map((id) => db.entegrasyonKosusu.findMany({
      where: { connectorId: id },
      orderBy: { baslangic: 'desc' },
      take: gecmisAdedi,
      select: KOSU_ALANLARI,
    }))),
    db.entegrasyonKosusu.findMany({
      where: { connectorId: null },
      orderBy: { baslangic: 'desc' },
      take: 200,
      select: KOSU_ALANLARI,
    }),
    idler.length > 0
      ? db.entegrasyonKosusu.count({ where: { NOT: { connectorId: null }, connectorId: { notIn: idler } } })
      : db.entegrasyonKosusu.count({ where: { NOT: { connectorId: null } } }),
    zamanlayiciGorunumu(simdi),
    db.eslemeProfili.findMany({
      where: { OR: [{ durum: 'etkin' }, { id: { in: bagliProfilIdler } }] },
      orderBy: [{ kod: 'asc' }, { surum: 'desc' }],
      select: { id: true, kod: true, ad: true, connectorTipi: true,
        surum: true, durum: true },
    }),
    db.reddedilenKayit.count({ where: { durum: 'acik' } }),
  ]);

  // Sır BEYANI adaptörden, VARLIĞI sağlayıcıdan gelir; ikisi de sırrın
  // değerini okumaz. Tip başına bir kez çözülür.
  const tipler = [...new Set(connectorlar.map((c) => c.tip))];
  const tipSirlari = new Map<string, SirDurumu[] | null>(
    await Promise.all(tipler.map(async (t) =>
      [t, await gerekenSirlariCoz(t)] as [string, SirDurumu[] | null])));

  const satirlar = durumaGoreSirala(connectorlar.map((c, i) =>
    connectorSagligi(c, kosuListeleri[i], {
      ...secenek, simdi, gerekenSirlar: tipSirlari.get(c.tip) ?? null,
    })));

  // Connector'a bağlı olmayan koşular (eski/elle içe aktarım) gizlenmez.
  const esikDk = secenek.bayatEsigiDk ?? BAYAT_KOSU_ESIGI_DK;
  const kova = new Map<string, BagimsizKosuOzeti>();
  for (const k2 of bagimsizHam) {
    const anahtar = k2.tetikleyen || 'bilinmiyor';
    const v = kova.get(anahtar) ?? {
      tetikleyen: anahtar, toplam: 0, basarisiz: 0, bayat: 0,
      sonBaslangic: k2.baslangic.toISOString(),
    };
    v.toplam += 1;
    if (k2.durum === 'basarisiz') v.basarisiz += 1;
    if (kosuBayatMi(k2, simdi, esikDk)) v.bayat += 1;
    if (k2.baslangic.toISOString() > v.sonBaslangic) v.sonBaslangic = k2.baslangic.toISOString();
    kova.set(anahtar, v);
  }

  return {
    yetkili: true,
    connectorlar: satirlar,
    sayilar: durumSayilari(satirlar),
    /* Sağlayıcı defteri sırrın DEĞERİNİ değil, sağlayıcının bağlı olup
       olmadığını taşır. `vault` bağlı değildir ve bu gizlenmez — sır
       çözülemediğinde sebebin görünmesi gereken tek yer burasıdır. */
    saglayicilar: sirSaglayicilari(),
    zamanlayici,
    eslemeProfilleri: eslemeProfilHam,
    reddedilenAcik,
    bagimsizKosular: [...kova.values()].sort((a, b) => b.toplam - a.toplam),
    arsivKosuSayisi,
    uretildi: simdi.toISOString(),
  };
}
