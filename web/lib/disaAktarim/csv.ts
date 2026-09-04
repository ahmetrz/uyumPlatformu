/* ═══════════════════════════════════════════════════════════════════════
   CSV üretimi — SAF

   ── NEDEN AYRI BİR MODÜL ──────────────────────────────────────────────
   CSV "virgülle ayrılmış metin" değildir; bir dosya biçimidir ve yanlış
   üretilirse üç şey olur: Türkçe karakterler bozulur, virgül içeren bir
   ad satırı ikiye böler, ve hücrenin içindeki metin Excel'de FORMÜL
   olarak çalışır. Üçü de sessizdir — dosya açılır, doğru görünür, yanlış
   olur.

   Bu dosya veritabanı, React ve tarayıcı bilmez; test edilebilir.

   ── FORMÜL ENJEKSİYONU ────────────────────────────────────────────────
   Excel, `=`, `+`, `-`, `@` ile başlayan bir hücreyi formül sayar.
   Envantere `=cmd|'/C calc'!A0` yazan biri, o CSV'yi açan herkesin
   makinesinde komut çalıştırabilir. Bu bir ÜRÜN kusurudur: veriyi biz
   yazmıyoruz ama dosyayı biz üretiyoruz.

   Koruma: tehlikeli karakterle başlayan METİN hücrelerinin başına tek
   tırnak konur. Sayılar dokunulmadan geçer — `-5` bir saldırı değildir ve
   ona tırnak koymak sayıyı metne çevirirdi.

   ── AYRAÇ ─────────────────────────────────────────────────────────────
   Varsayılan NOKTALI VİRGÜLDÜR. Türkçe Windows'ta Excel'in liste ayracı
   noktalı virgüldür; virgüllü bir dosya çift tıklandığında bütün satır
   tek hücreye düşer ve kullanıcı "CSV bozuk" der. Virgül isteyen araçlar
   için ayraç seçilebilir.

   ── BOM ───────────────────────────────────────────────────────────────
   UTF-8 BOM olmadan Excel dosyayı Windows-1254 sanır ve "Kızıldere"
   "KÄ±zÄ±ldere" olur. BOM üç bayttır ve bu ürün için pazarlık konusu
   değildir. */

export type Hucre = string | number | null | undefined;

/** UTF-8 bayt sırası imi. Excel'in Türkçe karakterleri doğru okuması için. */
export const CSV_BOM = '\uFEFF';

/** Satır sonu. CRLF: RFC 4180 ve Excel'in beklediği. */
export const CSV_SATIR_SONU = '\r\n';

export const CSV_AYRACLARI = [';', ','] as const;
export type CsvAyraci = (typeof CSV_AYRACLARI)[number];

/* Excel'in formül başlangıcı saydığı karakterler. Sekme ve satır başı da
   listede: bazı sürümler onları da tetikleyici sayar. */
const TEHLIKELI_BAS = ['=', '+', '-', '@', '\t', '\r'];

/** Sayı gibi görünen metin: "-5", "3,14", "1.234" — bunlar saldırı değil. */
const SAYI_GIBI = /^[-+]?\d+(?:[.,]\d+)?$/;

/**
 * Bir hücrenin metin karşılığı — kaçırma YAPILMADAN.
 *
 * `null` ve `undefined` BOŞ dizeye düşer, `"null"` metnine değil:
 * ölçülmemiş bir alan dosyada da boş görünmelidir.
 */
export function hucreMetni(h: Hucre): string {
  if (h === null || h === undefined) return '';
  return typeof h === 'number' ? String(h) : h;
}

/**
 * Formül enjeksiyonuna karşı tek hücre koruması.
 *
 * Sayı tipindeki hücreye DOKUNULMAZ. Metin hücresi tehlikeli bir
 * karakterle başlıyorsa ve sayı gibi görünmüyorsa başına tek tırnak
 * konur — Excel bunu "bu bir metindir" işareti olarak okur.
 */
export function formulKalkani(h: Hucre): string {
  if (typeof h === 'number') return String(h);
  const m = hucreMetni(h);
  if (m === '') return '';
  if (!TEHLIKELI_BAS.includes(m[0]!)) return m;
  if (SAYI_GIBI.test(m)) return m;
  return `'${m}`;
}

/**
 * Tek hücreyi CSV alanına çevirir: kalkan + tırnaklama.
 *
 * Tırnak gerektiren durumlar: ayraç, çift tırnak, satır sonu ya da baş/son
 * boşluk içeren alanlar. İçerideki çift tırnak ikilenir (RFC 4180).
 */
export function csvAlani(h: Hucre, ayrac: CsvAyraci = ';'): string {
  const m = formulKalkani(h);
  const tirnakGerek = m.includes(ayrac) || m.includes('"')
    || m.includes('\n') || m.includes('\r')
    || m !== m.trim();
  if (!tirnakGerek) return m;
  return `"${m.replace(/"/g, '""')}"`;
}

export type CsvSecenegi = {
  ayrac?: CsvAyraci;
  /** Excel için varsayılan açık; başka bir araca verilecekse kapatılabilir. */
  bom?: boolean;
};

/**
 * Satır dizisini tam bir CSV metnine çevirir.
 *
 * Son satırdan sonra da satır sonu konur: bazı ayrıştırıcılar dosyanın
 * sonunu böyle bekler ve eksikse son satırı düşürür.
 */
export function csvMetni(
  satirlar: readonly (readonly Hucre[])[],
  secenek: CsvSecenegi = {},
): string {
  const ayrac = secenek.ayrac ?? ';';
  const govde = satirlar
    .map((satir) => satir.map((h) => csvAlani(h, ayrac)).join(ayrac))
    .join(CSV_SATIR_SONU);
  const bom = secenek.bom === false ? '' : CSV_BOM;
  return satirlar.length === 0 ? bom : `${bom}${govde}${CSV_SATIR_SONU}`;
}

/**
 * Dosya adını güvenli hâle getirir.
 *
 * Yol ayracı, kontrol karakteri ve Windows'un yasakladığı işaretler
 * temizlenir: dosya adı da kullanıcı verisinden türeyebilir ve bir
 * indirme adı "../" içeremez.
 */
export function guvenliDosyaAdi(ad: string, uzanti: string): string {
  /* Uzantı önce ayrılır: gövdede nokta bırakmayacağımız için sonradan
     "bu ad zaten .csv ile mi bitiyor" diye bakmak işe yaramaz. */
  const son = `.${uzanti}`;
  const alt = ad.toLowerCase().endsWith(son) ? ad.slice(0, -son.length) : ad;
  /* Kara liste değil BEYAZ liste: harf, rakam, alt tire ve tire dışında ne
     varsa tireye düşer. Kara liste her zaman bir karakter unutur ve nokta
     dizisi geride kalır. Türkçe harfler Unicode harf sınıfındadır. */
  const temiz = alt
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return `${temiz || 'disa-aktarim'}${son}`;
}

/** Dosya adına tarih damgası: iki dışa aktarım birbirinin üstüne inmesin. */
export function damgaliAd(ad: string, simdi: number, uzanti: string): string {
  const d = new Date(simdi);
  const p = (n: number) => String(n).padStart(2, '0');
  const damga = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
    + `-${p(d.getHours())}${p(d.getMinutes())}`;
  return guvenliDosyaAdi(`${ad}-${damga}`, uzanti);
}
