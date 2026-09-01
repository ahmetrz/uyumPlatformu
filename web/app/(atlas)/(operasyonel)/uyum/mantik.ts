import type { Durum } from '@/components/abacus/temel';

/* O1 · O2 ortak türetmeleri.
   Matristeki hücre işaretçisi (O1) ile çerçeve detayındaki aile işaretçisi (O2)
   aynı kuraldan çıkar; ikisi ayrışırsa ekranlar birbirini yalanlar. Bu yüzden
   eşleme ve "en kötü" sıralaması TEK yerde, burada tanımlıdır.

   Sunucu yükleyicisi (veri.ts) ve iki istemci de bu dosyayı kullanır — bu
   nedenle burada 'server-only' YOKTUR ve Prisma'ya dokunulmaz. */

/** MaddeDurumu.durum → Atlas işaretçisi.
    `kapsamdisi` işaretçi ÜRETMEZ (null): kapsam dışı, bilinmeyen değildir. */
export const DURUM_IM: Record<string, Durum | null> = {
  uyumlu: 'ok',
  kismi: 'md',
  uyumsuz: 'bd',
  incelemede: 'unk',
  degerlendirilmedi: 'unk',
  kapsamdisi: null,
};

/** "En kötü" sıralaması: uyumsuz > kismi > incelemede/degerlendirilmedi > uyumlu. */
const AGIRLIK: Record<string, number> = {
  uyumsuz: 4, kismi: 3, incelemede: 2, degerlendirilmedi: 2, uyumlu: 1,
};

export function agirlik(ham: string): number {
  return AGIRLIK[ham] ?? 0;
}

/** Verilen durumlar içinden en kötüsünün HAM değeri. kapsamdisi sayılmaz.
    Hepsi kapsam dışıysa null döner — çağıran hücreyi boş bırakır. */
export function enKotuHam(hamlar: string[]): string | null {
  let secili: string | null = null;
  for (const h of hamlar) {
    if (h === 'kapsamdisi') continue;
    if (secili === null || agirlik(h) > agirlik(secili)) secili = h;
  }
  return secili;
}

/** Aile durumu = o ailenin yaprak maddelerinin en kötüsü.
    Yaprağı hiç olmayan aile bilinmeyendir; hepsi kapsam dışıysa hücre açılmaz. */
export function aileDurumu(yaprakHamlari: string[]): Durum | null {
  if (yaprakHamlari.length === 0) return 'unk';
  const ham = enKotuHam(yaprakHamlari);
  if (ham === null) return null;
  return DURUM_IM[ham] ?? 'unk';
}

/** Bir hücre "takip gerektiriyor" mu — aile sayacında (2 / 4) pay budur. */
export function acikMi(ham: string): boolean {
  return ham === 'uyumsuz' || ham === 'kismi' || ham === 'incelemede'
    || ham === 'degerlendirilmedi';
}

/** Sakin satır: kritik yok, bilinmeyen yok. %58 opaklıkta arkaya çekilir. */
export function sakinMi(durumlar: (Durum | null)[]): boolean {
  return !durumlar.some((d) => d === 'bd' || d === 'unk');
}

/** Satır ağırlığı — matris en kötüden iyiye sıralanır. */
export function satirAgirligi(durumlar: (Durum | null)[]): number {
  const say = (d: Durum) => durumlar.filter((x) => x === d).length;
  return say('bd') * 10_000 + say('md') * 100 + say('unk');
}

/* ── Kod ve başlık kısaltma ─────────────────────────────────────────── */

/** `EPDK-SYM-4.2.1` → `4.2.1` · `ISO-27001-A.5.9` → `A.5.9` */
export function kisaKod(kod: string, cerceveKodu: string): string {
  return kod.startsWith(`${cerceveKodu}-`) ? kod.slice(cerceveKodu.length + 1) : kod;
}

/** Sütun başlığı: aile başlığının ilk kelimesi. 8.5px mono, 1fr sütuna sığmalı. */
export function kisaAile(baslik: string): string {
  const ilk = baslik.trim().split(/\s+/)[0] || baslik;
  const buyuk = ilk.toLocaleUpperCase('tr-TR');
  return buyuk.length > 13 ? `${buyuk.slice(0, 12)}…` : buyuk;
}

/** Filtre satırındaki görünen ad — regülasyon KODU veridir, sunumu değil. */
const GORUNEN_AD: Record<string, string> = {
  CBDDO: 'CBDDÖ',
  'ISO-27001': 'ISO 27001',
  'SPK-BS': 'SPK BS',
};
export function cerceveAdi(kod: string): string {
  return GORUNEN_AD[kod] ?? kod;
}

/* ── Biçimleme ──────────────────────────────────────────────────────── */

const AY_GUN = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
const AY_GUN_YIL = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

/** "24 Eyl" · farklı yıldaysa "18 Oca 2027". */
export function kisaTarih(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.getFullYear() === new Date().getFullYear() ? AY_GUN.format(d) : AY_GUN_YIL.format(d);
}

/** Ondalık ayracı virgül — 150.6 → "150,6". */
export function guc(mw: number | null | undefined): string | null {
  if (mw == null) return null;
  return `${mw.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} MWe`;
}

/** Tek cümleye indirger; nokta yoksa kelime sınırında keser. */
export function tekCumle(metin: string, sinir = 150): string {
  const temiz = metin.replace(/\s+/g, ' ').trim();
  const nokta = temiz.search(/\.(\s|$)/);
  const cumle = nokta > 0 ? temiz.slice(0, nokta + 1) : temiz;
  if (cumle.length <= sinir) return cumle;
  const kes = cumle.slice(0, sinir);
  return `${kes.slice(0, kes.lastIndexOf(' '))}…`;
}

/* ── O1/O2 veri sözleşmesi ──────────────────────────────────────────
   Tipler burada yaşar ki istemci bileşenleri sunucu yükleyicisini (veri.ts,
   `server-only`) import etmek zorunda kalmasın. */

export type Zincir = {
  id: string; kod: string; alt: string; yol: string; suren?: boolean;
};

/** (Santral × yaprak kontrol) kesişimi — matrisin ve çekmecenin atomu. */
export type Kontrol = {
  anahtar: string;              // tesisId::maddeId
  maddeId: string;
  aileId: string;
  kod: string;
  kisaKod: string;
  baslik: string;
  ham: string;                  // MaddeDurumu.durum (ham, ekranda yazılmaz)
  im: Durum | null;             // kapsamdisi → null (hücre boş)
  maddeDurumuId: string | null;
  gerekce: string;              // tek cümle
  kanitYazi: string;
  kanitIm: Durum;
  sahip: string | null;
  termin: string;
  terminIm: Durum | null;
  guven: string;
  sonDegerlendirme: string | null;
  zincir: Zincir[];
  ipucu: string;                // tek satırlık hücre ipucu
};

export type Aile = {
  id: string;
  kod: string;
  kisaKod: string;
  baslik: string;
  kisa: string;                 // sütun başlığı
  metin: string;
  yapraklar: { id: string; kod: string; kisaKod: string; baslik: string }[];
};

export type TesisSatiri = {
  id: string;
  kod: string;
  ad: string;
  alt: string;                  // 165 MWe · merkez · BT
  kontroller: Kontrol[];        // yaprak sırasına göre, aileId ile gruplanır
};

export type KapsamKaydi = {
  tesisId: string; kod: string; ad: string; alt: string;
  yol: string;
  durum: 'kapsamda' | 'disarida' | 'kararsiz';
  gerekce: string;
  elIle: boolean;
};

export type KuruSatir = {
  tesisId: string; ad: string; kod: string;
  sonuc: 'yeni' | 'degisir' | 'ayni' | 'kararsiz' | 'override';
  yazi: string;
  gerekce: string;
};

export type CerceveVerisi = {
  id: string;
  kod: string;
  gorunenAd: string;
  ad: string;
  surum: string | null;
  surumEtiketi: string | null;
  yururluk: string | null;
  aileler: Aile[];
  satirlar: TesisSatiri[];
  /** Kapsam dışı ve kararsız tesisler — matriste satır AÇILMAZ. */
  kapsam: KapsamKaydi[];
  toplamAktifTesis: number;
  surec: {
    id: string; kod: string; ad: string; durum: string;
    baslangic: string | null; bitis: string | null; kalanGun: number | null;
  } | null;
  denetim: { id: string; kod: string; ad: string; durum: string } | null;
  metrikler: {
    uyumYuzde: number | null;
    bilinmeyenYuzde: number | null;
    kanitYuzde: number | null;
    kanitsiz: number;
    kanitDoldu: number;
    uyumsuz: number;
    kismi: number;
    uyumlu: number;
    /** takip gerektiren değerlendirme: uyumsuz + kısmi + bilinmeyen */
    acik: number;
    bilinmeyen: number;
    degerlendirilen: number;
    maddeSayisi: number;
    yaprakSayisi: number;
    kapsamdakiTesis: number;
  };
  kural: {
    id: string; ad: string; surum: number;
    satir: string; tam: string; aciklama: string | null;
    sonHesap: string | null; elIleSayisi: number;
  } | null;
  eslestirme: { hedef: string; sayi: number; denklik: string }[];
  kuru: { satirlar: KuruSatir[]; ozet: string } | null;
};
