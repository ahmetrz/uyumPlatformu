'use client';

/* Dışa aktarım yardımcıları: her veri ekranı Excel (.xlsx), CSV ve PDF
   verebilir.

   Üçünün de girdisi AYNI `Sayfa` yapısıdır. Sebep: bir ekranın Excel'i ile
   CSV'si farklı sütun kümesi taşırsa, iki dosyayı karşılaştıran kişi
   ürünün yalan söylediğini düşünür. Sütunlar tek yerde tanımlanır ve üç
   biçim de aynı diziyi okur.

   xlsx kitaplığı yalnız tıklanınca yüklenir; CSV üretimi için kitaplık
   YOKTUR — biçim `lib/disaAktarim/csv.ts` içinde saf kodla üretilir ve
   test edilir. PDF baskı düzeniyle üretilir. */

import { csvMetni, damgaliAd, guvenliDosyaAdi, type CsvAyraci, type Hucre }
  from '@/lib/disaAktarim/csv';

export type Sayfa = { ad: string; satirlar: Hucre[][] };

export async function exceleAktar(dosyaAdi: string, sayfalar: Sayfa[]) {
  const XLSX = await import('xlsx');
  const kitap = XLSX.utils.book_new();
  for (const s of sayfalar) {
    const sayfa = XLSX.utils.aoa_to_sheet(s.satirlar.map((r) => r.map((h) => h ?? '')));
    // kolon genişliklerini içerikten kestir
    const genislikler = (s.satirlar[0] ?? []).map((_, i) =>
      ({ wch: Math.min(60, Math.max(10, ...s.satirlar.map((r) => String(r[i] ?? '').length + 2))) }));
    sayfa['!cols'] = genislikler;
    XLSX.utils.book_append_sheet(kitap, sayfa, s.ad.slice(0, 31));
  }
  XLSX.writeFile(kitap, dosyaAdi.endsWith('.xlsx') ? dosyaAdi : `${dosyaAdi}.xlsx`);
}

/**
 * Tek sayfayı CSV olarak indirir.
 *
 * CSV bir kitap değil bir TABLODUR: çok sayfalı dışa aktarımda hangi
 * sayfanın indirileceği çağıran tarafından seçilir. Sessizce ilkini almak
 * ya da hepsini alt alta yapıştırmak, dosyayı okuyan aracı yanıltırdı.
 *
 * `URL.revokeObjectURL` çağrısı şart: indirme başladıktan sonra bırakılan
 * her nesne URL'i sekme kapanana kadar bellekte kalır.
 */
export function csvAktar(dosyaAdi: string, sayfa: Sayfa, ayrac: CsvAyraci = ';') {
  const metin = csvMetni(sayfa.satirlar, { ayrac });
  /* `text/csv` yerine `application/octet-stream` DEĞİL: tarayıcı doğru
     tipi bilirse kullanıcıya doğru uygulamayı önerir. Karakter kümesi
     başlıkta da yazılır; BOM'un yanında ikinci bir güvence. */
  const yigin = new Blob([metin], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(yigin);
  const bag = document.createElement('a');
  bag.href = url;
  bag.download = guvenliDosyaAdi(dosyaAdi, 'csv');
  document.body.appendChild(bag);
  bag.click();
  bag.remove();
  URL.revokeObjectURL(url);
}

export function pdfYazdir() {
  window.print();
}

export { damgaliAd };
