/* F2 · Enerji Portföyü — SAF MANTIK.

   Sıralama, süzme ve "en zayıf santral" seçimi burada yaşar; React'e,
   Prisma'ya ve `server-only`ye dokunmaz. Nedeni test edilebilirliktir:
   "uyum oranına göre sıralarken ölçülmemiş santral en sona düşer" gibi
   bir kural JSX'in içinde kanıtlanamaz, burada bir satırlık testtir.

   ── ÖLÇÜLMEMİŞ ≠ SIFIR ────────────────────────────────────────────────
   `uyumYuzde: null` hiç değerlendirilmemiş santraldır. Sıralamada onu
   %0 saymak "en kötü santral" diye işaretlemek olurdu; %100 saymak
   gizlemek. İkisi de yalan: ölçülmemiş satır HER anahtarda listenin
   sonuna gider ve "en zayıf" seçiminde aday bile olmaz. */

export type PortfoySatiri = {
  id: string; kod: string; ad: string;
  tipKod: string | null; tipAdi: string; tuzelKisi: string | null;
  konum: string | null; gucMw: number | null; gorselAnahtari: string | null;
  kritiklik: string | null;
  uyumYuzde: number | null; bilinmeyenOran: number | null;
  acikBulgu: number; acikRisk: number;
};

/** Portföy geneli uyum endeksi — `uyumOzeti` çıktısının ekrana giden yüzü. */
export type PortfoyEndeksi = {
  yuzde: number | null;
  bilinmeyenOran: number | null;
  degerlendirilen: number;
  kapsam: number;
};

export type SiralamaAnahtari = 'guc' | 'bulgu' | 'risk' | 'uyum';

export const SIRALAMALAR: { anahtar: SiralamaAnahtari; ad: string }[] = [
  { anahtar: 'guc', ad: 'Kurulu güç' },
  { anahtar: 'bulgu', ad: 'Açık bulgu' },
  { anahtar: 'risk', ad: 'Açık risk' },
  { anahtar: 'uyum', ad: 'Uyum oranı' },
];

/** Süzgeçlerde "hepsi" değeri — üretim tipi ve tüzel kişi aynı sözcüğü kullanır. */
export const HEPSI = 'hepsi';
/** Tüzel kişisi kayıtlı olmayan santral için süzgeç anahtarı. */
export const TUZEL_YOK = '__yok';

/* Sıralama anahtarının ölçtüğü değer. `null` = ölçülmedi; karşılaştırıcı
   onu daima sona atar, anahtardan bağımsız. */
function olcu(s: PortfoySatiri, anahtar: SiralamaAnahtari): number | null {
  switch (anahtar) {
    case 'guc': return s.gucMw;
    case 'bulgu': return s.acikBulgu;
    case 'risk': return s.acikRisk;
    case 'uyum': return s.uyumYuzde;
  }
}

/* Her anahtar "kötüden iyiye" okunur: güçte büyük, bulgu/riskte çok, uyumda
   AZ olan üsttedir. Yani uyum artan, diğerleri azalan sıralanır. */
function yon(anahtar: SiralamaAnahtari): 1 | -1 {
  return anahtar === 'uyum' ? 1 : -1;
}

/** Kararlı sıralama: eşitlikte ad (tr-TR) — aynı veriyle aynı liste. */
export function sirala(satirlar: PortfoySatiri[], anahtar: SiralamaAnahtari): PortfoySatiri[] {
  const y = yon(anahtar);
  return [...satirlar].sort((a, b) => {
    const oa = olcu(a, anahtar); const ob = olcu(b, anahtar);
    if (oa === null && ob === null) return a.ad.localeCompare(b.ad, 'tr-TR');
    if (oa === null) return 1;
    if (ob === null) return -1;
    if (oa !== ob) return (oa - ob) * y;
    return a.ad.localeCompare(b.ad, 'tr-TR');
  });
}

export function suz(
  satirlar: PortfoySatiri[],
  { tip = HEPSI, tuzelKisi = HEPSI }: { tip?: string; tuzelKisi?: string },
): PortfoySatiri[] {
  return satirlar.filter((s) => {
    if (tip !== HEPSI && (s.tipKod ?? 'DIGER') !== tip) return false;
    if (tuzelKisi !== HEPSI && (s.tuzelKisi ?? TUZEL_YOK) !== tuzelKisi) return false;
    return true;
  });
}

/** Süzgeç listesi: tüzel kişi başına santral sayısı, çoktan aza. */
export function tuzelKisiler(satirlar: PortfoySatiri[]): { anahtar: string; ad: string; adet: number }[] {
  const m = new Map<string, { anahtar: string; ad: string; adet: number }>();
  for (const s of satirlar) {
    const anahtar = s.tuzelKisi ?? TUZEL_YOK;
    const v = m.get(anahtar) ?? { anahtar, ad: s.tuzelKisi ?? 'Tüzel kişi kayıtsız', adet: 0 };
    v.adet += 1; m.set(anahtar, v);
  }
  return [...m.values()].sort((a, b) => b.adet - a.adet || a.ad.localeCompare(b.ad, 'tr-TR'));
}

/* "En zayıf santral" — sıralama anahtarına göre en kötü satır.

   Kurulu güçte zayıflık TANIMSIZDIR: küçük santral kötü santral değildir.
   O anahtarda null döner ve ekran vurgu basmaz. Bulgu ve riskte sayı
   sıfırsa zayıf yoktur (hepsi temiz); uyumda hiçbir satır ölçülmemişse
   yine yoktur. Sıralama zaten kötüden iyiye olduğu için ilk satır adaydır;
   adayın gerçekten "kötü" olup olmadığı burada ayrıca sınanır. */
export function enZayif(
  satirlar: PortfoySatiri[], anahtar: SiralamaAnahtari,
): { id: string; neden: string } | null {
  if (anahtar === 'guc') return null;
  const ilk = sirala(satirlar, anahtar)[0];
  if (!ilk) return null;
  switch (anahtar) {
    case 'bulgu':
      return ilk.acikBulgu > 0 ? { id: ilk.id, neden: `${ilk.acikBulgu} açık bulgu` } : null;
    case 'risk':
      return ilk.acikRisk > 0 ? { id: ilk.id, neden: `${ilk.acikRisk} açık risk` } : null;
    case 'uyum':
      return ilk.uyumYuzde === null ? null : { id: ilk.id, neden: `%${ilk.uyumYuzde} uyum` };
  }
}

/** Sıralama anahtarının satırdaki görünen değeri — ölçülmemişse sözcükle. */
export function olcuYazisi(s: PortfoySatiri, anahtar: SiralamaAnahtari): string {
  const o = olcu(s, anahtar);
  if (o === null) return 'ölçülmedi';
  switch (anahtar) {
    case 'guc': return `${o} MWe`;
    case 'uyum': return `%${o}`;
    default: return String(o);
  }
}
