import 'server-only';
import { db } from '@/lib/db';
import { izinVar } from '@/lib/erisim';
import { referansGecerli, sirMaskesi } from '@/lib/entegrasyon/sir';
import type { AktifKullanici } from '@/lib/auth';

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

export const SAGLIK_DURUMLARI: SaglikDurumu[] = [
  'basarili', 'basarisiz', 'kimlik_bekleniyor',
  'calisiyor', 'bayat_kosu', 'hic_kosmadi', 'bilinmiyor',
];

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
  hata: string | null;
  /** reddedilen > 0 ise sebebi; kaydedilmemişse null */
  reddSebebi: string | null;
  /** reddedilen > 0 ama sebep kaydı yok — sessizce yutulmuş kayıtlar */
  reddSebebiEksik: boolean;
  /** alinan ≠ kabulEdilen + reddedilen + yinelenen → sayaçlar tutmuyor */
  sayacTutarsiz: boolean;
};

export type ConnectorSagligi = {
  id: string;
  kod: string;
  ad: string;
  tip: string;
  kaynakSistem: string;
  /** connector kaydının kendi durumu (taslak/etkin/…) — sağlıkla karıştırılmaz */
  kayitDurumu: string;
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
  sonKosu: KosuSatiri | null;
  sonBasariliKosu: string | null;
  tazelik: Tazelik;
  /** Connector.sonHata — son koşunun hatasından ayrı tutulur */
  sonHata: string | null;
  imlec: string | null;
  gecmis: KosuSatiri[];
};

export type BagimsizKosuOzeti = {
  tetikleyen: string;
  toplam: number;
  basarisiz: number;
  bayat: number;
  sonBaslangic: string;
};

export type EntegrasyonOzeti = {
  /** false = kullanıcı yonetim/okuma taşımıyor; hiçbir alan doldurulmaz */
  yetkili: boolean;
  connectorlar: ConnectorSagligi[];
  sayilar: Record<SaglikDurumu, number>;
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
      gerekce: c.sonHata
        ?? 'Connector kaydı "kimlik bekleniyor" olarak işaretli — dış sistem kimlik bilgisi henüz kurulmadı',
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

function kosuSatiri(k: KosuGirdi, simdi: Date, esikDk: number): KosuSatiri {
  const reddSebebi = k.reddedilen > 0 ? k.hata : null;
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
    reddSebebi,
    // Reddedilen kayıt var ama sebebi yazılmamışsa bu bir boşluktur, sessizce geçilmez.
    reddSebebiEksik: k.reddedilen > 0 && !k.hata,
    sayacTutarsiz: k.durum !== 'calisiyor'
      && k.alinan !== k.kabulEdilen + k.reddedilen + k.yinelenen,
  };
}

/** Koşu geçmişinden türetilen son BAŞARILI zaman — `Connector.sonBasariliKosu`
    yazılmamışsa yedek kaynak (yoksa "hiç başarılı koşu yok" yalanı olurdu). */
function gecmistenSonBasari(kosular: KosuGirdi[]): Date | null {
  const b = kosular.find((k) => k.durum === 'basarili');
  if (!b) return null;
  return b.bitis ?? b.baslangic;
}

export type OzetSecenegi = {
  simdi?: Date;
  bayatEsigiDk?: number;
  gecikmeToleransi?: number;
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

  const gecmis = kosular.map((k) => kosuSatiri(k, simdi, esikDk));
  const sonHam = kosular[0] ?? null;
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

  const sonBasari = c.sonBasariliKosu ?? gecmistenSonBasari(kosular);

  return {
    id: c.id,
    kod: c.kod,
    ad: c.ad,
    tip: c.tip,
    kaynakSistem: c.kaynakSistem,
    kayitDurumu: c.durum,
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
    sonBasariliKosu: sonBasari ? sonBasari.toISOString() : null,
    tazelik: tazelikHesapla(sonBasari, c.pollAralikDk, simdi, tolerans),
    sonHata: c.sonHata,
    imlec: c.imlec,
    gecmis,
  };
}

export function bosSayilar(): Record<SaglikDurumu, number> {
  return {
    basarili: 0, basarisiz: 0, kimlik_bekleniyor: 0,
    calisiyor: 0, bayat_kosu: 0, hic_kosmadi: 0, bilinmiyor: 0,
  };
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
  yinelenen: true, denemeNo: true, imlecOnce: true, imlecSonra: true, hata: true,
} as const;

function bosOzet(yetkili: boolean, simdi: Date): EntegrasyonOzeti {
  return {
    yetkili,
    connectorlar: [],
    sayilar: bosSayilar(),
    bagimsizKosular: [],
    arsivKosuSayisi: 0,
    uretildi: simdi.toISOString(),
  };
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
    },
  });

  const idler = connectorlar.map((c) => c.id);
  const [kosuListeleri, bagimsizHam, arsivKosuSayisi] = await Promise.all([
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
  ]);

  const satirlar = connectorlar.map((c, i) =>
    connectorSagligi(c, kosuListeleri[i], { ...secenek, simdi }));

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
    bagimsizKosular: [...kova.values()].sort((a, b) => b.toplam - a.toplam),
    arsivKosuSayisi,
    uretildi: simdi.toISOString(),
  };
}
