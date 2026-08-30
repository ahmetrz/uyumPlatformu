'use client';

/* Dışa aktarım yardımcıları: her veri ekranı Excel (.xlsx) ve PDF verebilir.
   xlsx yalnızca tıklanınca dinamik yüklenir; PDF, baskı düzeniyle üretilir
   (raporlar için özel @media print stilleri globals.css'te). */

type Hucre = string | number | null | undefined;
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

export function pdfYazdir() {
  window.print();
}
