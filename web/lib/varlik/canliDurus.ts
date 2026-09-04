/* ═══════════════════════════════════════════════════════════════════════
   OT-21b · Canlı duruş — SAF KARAR

   ── "GERÇEK ZAMANLI" BİR İDDİADIR ─────────────────────────────────────
   Bir ekran "canlı" yazdığında, arkasında gerçekten çalışan bir kaynak
   olduğunu iddia eder. Kaynak bağlı değilken "canlı" yazmak, ürünün
   söyleyebileceği en pahalı yalandır: kimse o alana bir daha güvenmez.

   Bu modül altı durumu ayırır ve üçü BAŞARISIZLIK DEĞİLDİR:
     canlı          — kaynak bağlı, veri poll aralığı içinde geldi
     güncel         — kaynak bağlı, veri biraz eski ama kabul edilebilir
     bayat          — kaynak bağlı ama veri beklenenden çok eski
     kaynak bağlı değil — hiçbir sistem bu alanı beslemiyor (KUSUR DEĞİL)
     hata           — kaynak bağlı ama son koşu başarısız
     bilinmiyor     — kaynak zaman bildirmedi; tazelik ÖLÇÜLEMEDİ

   ── EŞİK POLL ARALIĞINDAN TÜRETİLİR ───────────────────────────────────
   "Son 5 dakika" gibi sabit bir eşik yanlıştır: 5 dakikada bir sorgulanan
   bir EDR ile günde bir çalışan bir zafiyet tarayıcısı aynı ölçüye
   vurulamaz. Eşik kaynağın KENDİ periyodunun katıdır.

   Poll aralığı olmayan (yalnız elle beslenen) bir kaynak ASLA "canlı"
   olamaz — ne kadar yeni olursa olsun, bir dosya yüklemesi bir akış
   değildir.

   ── ESKİ VERİ YENİYİ EZMEZ ────────────────────────────────────────────
   İki kaynak aynı alan hakkında farklı şey söylerse önce KAYNAĞIN
   ZAMANINA bakılır. Kaynak önceliği yalnız berabere bozar; öncelikle
   çözmek, üç saat önce ölçülmüş "güvenilir" bir değerin az önce ölçülmüş
   doğru değeri ezmesine izin verirdi.

   Bu dosya veritabanı ve React bilmez. */

export const TAZELIK_DURUMLARI = [
  'canli', 'guncel', 'bayat', 'kaynak_yok', 'hata', 'bilinmiyor',
] as const;
export type TazelikDurumu = (typeof TAZELIK_DURUMLARI)[number];

export const TAZELIK_SOZU: Record<TazelikDurumu, string> = {
  canli: 'CANLI',
  guncel: 'güncel',
  bayat: 'BAYAT',
  kaynak_yok: 'kaynak bağlı değil',
  hata: 'kaynak HATALI',
  bilinmiyor: 'tazelik ölçülmedi',
};

export const TAZELIK_SINIFI: Record<TazelikDurumu, 'ok' | 'md' | 'bd' | 'unk' | 'pl'> = {
  canli: 'ok',
  guncel: 'ok',
  bayat: 'md',
  /* Kaynağın bağlı olmaması bir KUSUR DEĞİLDİR — bir kurulum adımıdır ve
     kırmızı gösterilirse ekran her gün yanlış alarm verir. */
  kaynak_yok: 'pl',
  hata: 'bd',
  bilinmiyor: 'unk',
};

/* Çakışmada berabere bozan varsayılan sıra. Sıralamanın gerekçesi:
   uç nokta ajanı cihazın ÜZERİNDE çalışır ve işletim sistemi/yama için en
   yakın tanıktır; OT keşif ürünü firmware için genelde tek kaynaktır;
   tarayıcı ve dizin daha uzaktan bakar; dosya aktarımı en son sıradadır
   çünkü bir dışa aktarım anlık bir ölçüm değildir. */
export const KAYNAK_ONCELIGI_VARSAYILAN: readonly string[] = [
  'edr', 'ot_discovery', 'vuln_scanner', 'ad_entra', 'siem', 'manual_import',
];

/** Poll aralığının kaç katına kadar "canlı" sayılır. */
export const CANLI_KAT = 2;
/** Poll aralığının kaç katına kadar "güncel" sayılır; sonrası bayat. */
export const GUNCEL_KAT = 6;

const DK = 60_000;

export type TazelikGirdisi = {
  /** Kaynağın ölçtüğü an; null = kaynak zaman bildirmedi. */
  kaynakZamani: number | null;
  /** Connector bağlı mı — bağlı değilse tazelik sorusu anlamsızdır. */
  bagli: boolean;
  /** Son koşu hatalı mı. */
  hatali: boolean;
  /** Kaynağın poll aralığı (dakika); null = yalnız elle beslenir. */
  pollAralikDk: number | null;
  simdi: number;
  canliKat?: number;
  guncelKat?: number;
};

export type Tazelik = {
  durum: TazelikDurumu;
  /** Verinin yaşı (dakika); ölçülemiyorsa null. */
  yasDk: number | null;
  /** "Canlı" eşiği (dakika); poll aralığı yoksa null. */
  canliEsikDk: number | null;
};

export function tazelik(o: TazelikGirdisi): Tazelik {
  if (!o.bagli) return { durum: 'kaynak_yok', yasDk: null, canliEsikDk: null };
  if (o.hatali) return { durum: 'hata', yasDk: null, canliEsikDk: null };
  if (o.kaynakZamani === null) {
    return { durum: 'bilinmiyor', yasDk: null, canliEsikDk: null };
  }

  const yasDk = Math.max(0, Math.round((o.simdi - o.kaynakZamani) / DK));

  /* Poll aralığı yoksa kaynak bir AKIŞ değildir: ne kadar yeni olursa
     olsun "canlı" denemez. Elle beslenen kaynakta tazelik ölçüsü de
     yoktur — "güncel" demek bir varsayım olurdu. */
  if (o.pollAralikDk === null || o.pollAralikDk <= 0) {
    return { durum: 'bilinmiyor', yasDk, canliEsikDk: null };
  }

  const canliEsikDk = o.pollAralikDk * (o.canliKat ?? CANLI_KAT);
  const guncelEsikDk = o.pollAralikDk * (o.guncelKat ?? GUNCEL_KAT);
  const durum: TazelikDurumu = yasDk <= canliEsikDk ? 'canli'
    : yasDk <= guncelEsikDk ? 'guncel'
      : 'bayat';
  return { durum, yasDk, canliEsikDk };
}

/** Ekranda "canlı" sözcüğü YALNIZ bu doğruyken yazılabilir. */
export function canliDenebilirMi(t: Tazelik): boolean {
  return t.durum === 'canli';
}

/* ── Çakışma çözümü ──────────────────────────────────────────────────── */

export type AlanGozlemi = {
  kaynakSistem: string;
  deger: string | null;
  kaynakZamani: number | null;
  guven: number | null;
  tazelik: Tazelik;
};

export type AlanSonucu = {
  /** Kazanan değer; hiçbir kaynak vermediyse null. */
  deger: string | null;
  kaynakSistem: string | null;
  tazelik: Tazelik | null;
  /** Aynı alan için FARKLI değer bildiren diğer kaynaklar. */
  cakisanlar: AlanGozlemi[];
};

/**
 * Bir alanın kazanan değeri.
 *
 * Sıra: (1) kaynak zamanı YENİ olan kazanır, (2) eşitse GÜVENİ yüksek
 * olan, (3) o da eşitse kaynak önceliği listesindeki sıra.
 *
 * Zamanı olmayan gözlem, zamanı olan bir gözleme karşı ASLA kazanmaz:
 * ne zaman ölçüldüğü bilinmeyen bir değer, bilinen bir değerin üstüne
 * yazılamaz.
 *
 * Çakışma GİZLENMEZ: kazanan dışındaki farklı değerler ayrıca döner ve
 * ekran onları gösterir — iki kaynağın çeliştiğini bilmek, birinin
 * sessizce kazanmasından iyidir.
 */
export function alaniCoz(
  gozlemler: readonly AlanGozlemi[],
  kaynakOnceligi: readonly string[] = [],
): AlanSonucu {
  const dolu = gozlemler.filter((g) => g.deger !== null && g.deger !== '');
  if (dolu.length === 0) {
    return { deger: null, kaynakSistem: null, tazelik: null, cakisanlar: [] };
  }

  const sira = (g: AlanGozlemi) => {
    const i = kaynakOnceligi.indexOf(g.kaynakSistem);
    return i < 0 ? kaynakOnceligi.length : i;
  };

  const kazanan = dolu.reduce((a, b) => {
    /* Zamanı olan, olmayanı yener. */
    if (a.kaynakZamani === null && b.kaynakZamani !== null) return b;
    if (b.kaynakZamani === null && a.kaynakZamani !== null) return a;
    if (a.kaynakZamani !== null && b.kaynakZamani !== null
      && a.kaynakZamani !== b.kaynakZamani) {
      return b.kaynakZamani > a.kaynakZamani ? b : a;
    }
    const ag = a.guven ?? -1;
    const bg = b.guven ?? -1;
    if (ag !== bg) return bg > ag ? b : a;
    return sira(b) < sira(a) ? b : a;
  });

  return {
    deger: kazanan.deger,
    kaynakSistem: kazanan.kaynakSistem,
    tazelik: kazanan.tazelik,
    cakisanlar: dolu.filter((g) => g !== kazanan && g.deger !== kazanan.deger),
  };
}

/* ── Ekran özeti ─────────────────────────────────────────────────────── */

export const DURUS_ALANLARI = [
  'isletimSistemi', 'osSurumu', 'yamaSeviyesi', 'firmware',
] as const;
export type DurusAlani = (typeof DURUS_ALANLARI)[number];

export const DURUS_ALAN_ETIKETI: Record<DurusAlani, string> = {
  isletimSistemi: 'İşletim sistemi',
  osSurumu: 'OS sürümü / yapı',
  yamaSeviyesi: 'Yama seviyesi',
  firmware: 'Firmware',
};

export type CanliDurusOzeti = {
  /** Kaç alanın canlı bir kaynağı var. */
  canli: number;
  guncel: number;
  bayat: number;
  kaynaksiz: number;
  hatali: number;
  cakisan: number;
  /** Hiçbir alanda bağlı kaynak yoksa true — ekran bunu AÇIKÇA söyler. */
  hicKaynakYok: boolean;
};

export function canliDurusOzeti(
  sonuclar: readonly AlanSonucu[],
): CanliDurusOzeti {
  const say = (d: TazelikDurumu) =>
    sonuclar.filter((s) => s.tazelik?.durum === d).length;
  const kaynaksiz = sonuclar.filter(
    (s) => s.tazelik === null || s.tazelik.durum === 'kaynak_yok').length;
  return {
    canli: say('canli'),
    guncel: say('guncel'),
    bayat: say('bayat'),
    kaynaksiz,
    hatali: say('hata'),
    cakisan: sonuclar.filter((s) => s.cakisanlar.length > 0).length,
    hicKaynakYok: kaynaksiz === sonuclar.length,
  };
}

export function canliDurusCumlesi(o: CanliDurusOzeti): string {
  if (o.hicKaynakYok) {
    return 'Bu alanları besleyen bir kaynak sistem bağlı değil; '
      + 'değerler envantere ELLE girilmiştir.';
  }
  if (o.hatali > 0) return `${o.hatali} alanın kaynağı hata veriyor.`;
  if (o.cakisan > 0) {
    return `${o.cakisan} alanda iki kaynak farklı değer bildiriyor.`;
  }
  if (o.bayat > 0) return `${o.bayat} alanın verisi bayat.`;
  if (o.canli > 0) return `${o.canli} alan canlı kaynaktan besleniyor.`;
  return 'Kaynaklar bağlı ama tazelik ölçülemedi.';
}

/* ── Bir varlığın bütün alanlarının çözümü ───────────────────────────── */

/** Tek bir kaynak sistemin bir varlık hakkında bildirdikleri. */
export type KaynakGozlemi = {
  kaynakSistem: string;
  /** Connector bağlı ve etkin mi. */
  bagli: boolean;
  /** Son koşu hata verdi mi. */
  hatali: boolean;
  /** Kaynağın sorgu aralığı (dakika); null = yalnız elle beslenir. */
  pollAralikDk: number | null;
  /** Kaynağın ölçtüğü an; null = kaynak zaman bildirmedi. */
  kaynakZamani: number | null;
  guven: number | null;
  alanlar: Partial<Record<DurusAlani, string | null>>;
};

export type CozumSecenegi = {
  simdi: number;
  canliKat?: number;
  guncelKat?: number;
  kaynakOnceligi?: readonly string[];
};

/**
 * Her duruş alanı için kazanan değeri ve tazeliğini hesaplar.
 *
 * Tazelik ALAN BAŞINA değil KAYNAK başına ölçülür — bir kaynağın bütün
 * alanları aynı anda gelir. Ama kazanan kaynak alandan alana DEĞİŞİR:
 * bir uç nokta ajanı işletim sistemini bilir, firmware'i bilmez.
 */
export function durusuCoz(
  gozlemler: readonly KaynakGozlemi[],
  o: CozumSecenegi,
): Record<DurusAlani, AlanSonucu> {
  const tazelikler = new Map<string, Tazelik>();
  for (const g of gozlemler) {
    tazelikler.set(g.kaynakSistem, tazelik({
      kaynakZamani: g.kaynakZamani,
      bagli: g.bagli,
      hatali: g.hatali,
      pollAralikDk: g.pollAralikDk,
      simdi: o.simdi,
      canliKat: o.canliKat,
      guncelKat: o.guncelKat,
    }));
  }

  const cikti = {} as Record<DurusAlani, AlanSonucu>;
  for (const alan of DURUS_ALANLARI) {
    const alanGozlemleri: AlanGozlemi[] = gozlemler.map((g) => ({
      kaynakSistem: g.kaynakSistem,
      deger: g.alanlar[alan] ?? null,
      kaynakZamani: g.kaynakZamani,
      guven: g.guven,
      tazelik: tazelikler.get(g.kaynakSistem)!,
    }));
    cikti[alan] = alaniCoz(alanGozlemleri, o.kaynakOnceligi ?? KAYNAK_ONCELIGI_VARSAYILAN);
  }
  return cikti;
}
