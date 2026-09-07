/* ═══════════════════════════════════════════════════════════════════════
   TERİM SÖZLÜĞÜ — çekirdek anahtar, sektör karşılığı (P1 · URN-ALN-004)

   Çekirdek "tesis" der; enerji kiracısı ekranda "tesis" görür, su
   kiracısı "tesis", otel kiracısı "otel". Aynı bileşen, farklı sözcük.

   ── EK BİRLEŞTİRME YOK ────────────────────────────────────────────────
   Türkçede ek, sözcüğün son ünlüsüne ve son sesine göre değişir:
   "tesisin" ama "üretim biriminin"; "tesisi" ama "hattı". `{tesis}+in`
   gibi bir birleştirme İLK sektörde çalışır, ikincisinde sessizce bozulur
   ve kimse fark etmez. Bu yüzden biçimler ALANDIR: her sözcük kendi
   iyelik ve belirtme hâlini yazılı taşır (`SektorSozlugu` şeması da
   böyle kuruldu).

   ── `t()` NEDEN SÖZLÜĞÜ PARAMETRE ALIYOR ──────────────────────────────
   Sunucu ile istemcinin AYNI sonucu vermesi gerekiyor; farklı verirse
   React hidrasyonu uyuşmazlık basar ve ekran bir an yanlış sözcük
   gösterir. Bunu garanti etmenin en ucuz yolu `t()`yi SAF tutmaktır:
   aynı sözlük, aynı anahtar → aynı dize. Sözlük sunucuda çözülür, ekran
   verisiyle birlikte iner. Ortam değişkeni, modül seviyesinde durum ya da
   `useContext` yok — bugün tek ekran kullanıyor; ikinci tüketici
   çıktığında sağlayıcı eklenir (Aşama E), o zamana kadar kurulmayan bir
   altyapı bakım borcu olurdu.

   ── ANAHTAR LİSTESİ NEDEN SABİT ───────────────────────────────────────
   `TerimAnahtari` bir birlik tipi: sözlükte olmayan bir anahtarı çağırmak
   DERLEME hatasıdır. Serbest dize olsaydı, yazım hatası ekranda anahtarın
   kendisini yazdırırdı ("tesis360" diye bir başlık).
   ═══════════════════════════════════════════════════════════════════════ */

/** Türkçe hâller. Yeni bir hâl gerekirse buraya eklenir; birleştirilmez. */
export type Bicim = 'tekil' | 'cogul' | 'iyelik' | 'belirtme' | 'bulunma' | 'yonelme';

export type TerimAnahtari =
  | 'tesis'
  | 'birim'
  | 'sistem'
  | 'varlik'
  | 'portfoy'
  | 'tesis360';

export type Terim = Record<Bicim, string>;

/** Sektör paketinin verdiği karşılık; eksik biçim çekirdeğe düşer. */
export type Sozluk = Partial<Record<TerimAnahtari, Partial<Terim>>>;

/* Çekirdek karşılıklar SEKTÖRSÜZDÜR: hiçbiri enerji sözcüğü değildir.
   Sektör paketi kurulu değilken ekranda görünen metin budur. */
export const CEKIRDEK_TERIMLER: Record<TerimAnahtari, Terim> = {
  tesis: { tekil: 'tesis', cogul: 'tesisler', iyelik: 'tesisin', belirtme: 'tesisi',
    bulunma: 'tesiste', yonelme: 'tesise' },
  birim: { tekil: 'birim', cogul: 'birimler', iyelik: 'birimin', belirtme: 'birimi',
    bulunma: 'birimde', yonelme: 'birime' },
  sistem: { tekil: 'sistem', cogul: 'sistemler', iyelik: 'sistemin', belirtme: 'sistemi',
    bulunma: 'sistemde', yonelme: 'sisteme' },
  varlik: { tekil: 'varlık', cogul: 'varlıklar', iyelik: 'varlığın', belirtme: 'varlığı',
    bulunma: 'varlıkta', yonelme: 'varlığa' },
  portfoy: { tekil: 'portföy', cogul: 'portföyler', iyelik: 'portföyün', belirtme: 'portföyü',
    bulunma: 'portföyde', yonelme: 'portföye' },
  /* Ekran adı; "tesis" + " 360" diye BİRLEŞTİRİLMEZ. Sözcük sırası her
     dilde aynı değildir ve sektör paketi bu adı bir bütün olarak verir. */
  /* Ekran adı çekimlenmez: altı biçim de aynıdır ve bu bilinçlidir —
     `Bicim` tipini bozmadan "çekimi olmayan terim" böyle ifade edilir. */
  tesis360: {
    tekil: 'Tesis 360', cogul: 'Tesis 360', iyelik: 'Tesis 360',
    belirtme: 'Tesis 360', bulunma: 'Tesis 360', yonelme: 'Tesis 360',
  },
};

/** Terimi çözer: sektör karşılığı varsa o, yoksa çekirdek.

    Sektör satırı yalnız `tekil` doldurmuşsa öteki biçimler ÇEKİRDEKTEN
    gelir — yarım bir sektör sözlüğü ekranı boş bırakmaz. Bu bilinçli bir
    ödünç değil, eksik veriye karşı bir düşüştür: yarım bir sektör
    sözlüğü ekranı boş bırakmaktansa çekirdek sözcüğü gösterir. Çeviri
    borcunu SAYAN bir ekran henüz yok; olmayan bir tüketici için ölçüm
    yardımcısı yazmak, bugün ölü kod eklemek olurdu (Aşama G). */
export function t(sozluk: Sozluk | null | undefined, anahtar: TerimAnahtari,
  bicim: Bicim = 'tekil'): string {
  return sozluk?.[anahtar]?.[bicim] ?? CEKIRDEK_TERIMLER[anahtar][bicim];
}

/** Aynı terimin cümle başındaki hâli. Türkçe yerel ayarla büyütür:
    `i` → `İ` (varsayılan `toUpperCase` `I` üretir ve "Işletme" yazar). */
export function tBas(sozluk: Sozluk | null | undefined, anahtar: TerimAnahtari,
  bicim: Bicim = 'tekil'): string {
  const s = t(sozluk, anahtar, bicim);
  return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
}

/** Veritabanı satırlarını sözlüğe çevirir. Boş dize DEĞER SAYILMAZ:
    `''` bir çeviri değildir, eksik biçimdir. */
export function sozlukKur(satirlar: readonly {
  anahtar: string; tekil: string; cogul: string | null;
  iyelik: string | null; belirtme: string | null;
  bulunma: string | null; yonelme: string | null;
}[]): Sozluk {
  const gecerli = new Set<string>(Object.keys(CEKIRDEK_TERIMLER));
  const sozluk: Sozluk = {};
  for (const s of satirlar) {
    /* Çekirdeğin tanımadığı anahtar ATLANIR: sektör paketi ileride
       çekirdekten fazlasını taşıyabilir, ekran onu çözemez ve uydurmaz. */
    if (!gecerli.has(s.anahtar)) continue;
    const terim: Partial<Terim> = {};
    if (s.tekil) terim.tekil = s.tekil;
    if (s.cogul) terim.cogul = s.cogul;
    if (s.iyelik) terim.iyelik = s.iyelik;
    if (s.belirtme) terim.belirtme = s.belirtme;
    if (s.bulunma) terim.bulunma = s.bulunma;
    if (s.yonelme) terim.yonelme = s.yonelme;
    sozluk[s.anahtar as TerimAnahtari] = terim;
  }
  return sozluk;
}
