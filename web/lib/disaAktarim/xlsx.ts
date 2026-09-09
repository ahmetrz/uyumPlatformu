/* ═══════════════════════════════════════════════════════════════════════
   XLSX üretimi — SAF

   ── NEDEN CSV'NİN YANINDA AYRI BİR MODÜL ──────────────────────────────
   Denetçi CSV istemez, ÇALIŞMA KİTABI ister: bölümler ayrı sayfalarda,
   başlıklar donuk, sütun genişlikleri okunur. Ama biçim değişince kusur
   sınıfı da değişir; bu dosya CSV'nin kurallarını körlemesine kopyalamaz,
   XLSX'te ÖLÇÜLENİ uygular.

   ── FORMÜL ENJEKSİYONU · XLSX'te ÖLÇÜLDÜ ──────────────────────────────
   SheetJS `aoa_to_sheet` ile `=cmd|'/C calc'!A0` dizesi yazıldığında
   üretilen XML şudur (ölçüldü, 9 Eyl 2026):

       <c r="B2" t="str"><v>=cmd|&apos;/C calc&apos;!A0</v></c>

   `<f>` YOKTUR — yani yazıcı kendiliğinden formül hücresi üretmiyor.
   Buna rağmen iki şey yapılır:

   1 · `t="str"` OOXML'de "FORMÜL SONUCU dizesi" demektir; düz metnin
       tipi `s` (paylaşılan dize) ya da `inlineStr`dir. Bir okuyucunun
       `str` hücresini formülün önbelleği sayması, yazanın kontrolünde
       olmayan bir şeydir. Bu yüzden kitap PAYLAŞILAN DİZE TABLOSUYLA
       yazılır (`bookSST`) ve üretilen XML'de `<f>` olmadığı testle
       sabittir.

   2 · CSV'nin kalkanı (`formulKalkani`) AYNEN uygulanır. Tek kural iki
       biçimde de geçerlidir: aynı veriyi iki dosyada iki farklı şekilde
       temizlemek, birinde unutulan bir kuralı öbüründen görünmez yapar.
       Kalkan yalnız TEHLİKELİ karakterle başlayan ve sayı GİBİ OLMAYAN
       metin hücrelerinde çalışır — `-5` ve `3,14` dokunulmadan geçer,
       yani denetim formundaki meşru sayılar bozulmaz.

   ── SAYI SAYI KALIR ───────────────────────────────────────────────────
   `number` tipindeki hücre XLSX'e SAYI olarak yazılır (`t: 'n'`).
   Denetçinin toplam alması, süzmesi, sıralaması buna bağlıdır; hepsini
   metne çevirmek çalışma kitabını ölü bir tabloya indirirdi.

   Bu dosya veritabanı, React ve tarayıcı bilmez; test edilebilir. */
import * as XLSX from 'xlsx';
import { formulKalkani, type Hucre } from './csv';

export type XlsxSayfasi = {
  /** Sayfa adı. XLSX 31 karakter ve `[]:*?/\` yasağı uygular. */
  ad: string;
  satirlar: readonly (readonly Hucre[])[];
  /** Sütun genişlikleri (karakter). Verilmezse başlıktan türetilir. */
  genislikler?: readonly number[];
};

/** XLSX'in kendi sayfa adı kısıtı: 31 karakter, altı karakter yasak. */
export function guvenliSayfaAdi(ad: string): string {
  const temiz = ad.replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim();
  return (temiz || 'Sayfa').slice(0, 31);
}

/** Bir satırı kalkandan geçirir: sayı sayı kalır, metin korunur. */
export function kalkanliSatir(satir: readonly Hucre[]): (string | number)[] {
  return satir.map((h) => (typeof h === 'number' ? h : formulKalkani(h)));
}

/** Sütun genişliği: başlık ve ilk satırların en uzun hücresi (üst sınırla). */
function genislikTuret(satirlar: readonly (readonly Hucre[])[]): { wch: number }[] {
  const sutunSayisi = satirlar.reduce((e, s) => Math.max(e, s.length), 0);
  const en: number[] = new Array(sutunSayisi).fill(10);
  for (const satir of satirlar.slice(0, 200)) {
    satir.forEach((h, i) => {
      const uzunluk = String(h ?? '').length;
      if (uzunluk > en[i]!) en[i] = Math.min(uzunluk, 60);
    });
  }
  return en.map((wch) => ({ wch }));
}

/**
 * Çalışma kitabı üretir. Sayfa YOKSA atar: sıfır sayfalı bir XLSX
 * Excel'de açılmaz ve "dosya bozuk" der — boş bir dışa aktarımı
 * kullanıcıya bozuk dosya olarak vermek, hiç vermemekten kötüdür.
 */
export function xlsxKitabi(sayfalar: readonly XlsxSayfasi[]): Buffer {
  if (sayfalar.length === 0) {
    throw new Error('xlsxKitabi: en az bir sayfa gerekir — sıfır sayfalı XLSX açılmaz');
  }
  const kitap = XLSX.utils.book_new();
  const kullanilan = new Set<string>();
  for (const s of sayfalar) {
    const satirlar = s.satirlar.map(kalkanliSatir);
    const sayfa = XLSX.utils.aoa_to_sheet(satirlar);
    sayfa['!cols'] = s.genislikler
      ? s.genislikler.map((wch) => ({ wch }))
      : genislikTuret(s.satirlar);
    /* İlk satır başlıktır ve donar; 3 000 satırlık bir formda başlığı
       kaybetmek, sütunun ne olduğunu kaybetmektir. */
    if (satirlar.length > 1) sayfa['!freeze'] = { xSplit: '0', ySplit: '1' };
    /* Ad çakışması XLSX'te dosyayı bozar; ikinci aynı ad numaralanır. */
    let ad = guvenliSayfaAdi(s.ad);
    let n = 2;
    while (kullanilan.has(ad)) ad = `${guvenliSayfaAdi(s.ad).slice(0, 28)} ${n++}`;
    kullanilan.add(ad);
    XLSX.utils.book_append_sheet(kitap, sayfa, ad);
  }
  return XLSX.write(kitap, { type: 'buffer', bookType: 'xlsx', bookSST: true }) as Buffer;
}
