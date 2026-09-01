import type { Durum } from '@/components/abacus/temel';

/* Çapraz eşleme (crosswalk) — saf türetmeler. Veritabanına, React'e ve
   `server-only`ye dokunmaz.

   Ekranın sorusu: "bu iki çerçevede hangi madde hangi maddeyi karşılıyor,
   nerede karşılıksız kalıyoruz?" Eşleme bir UYUM DURUMU DEĞİLDİR —
   işaretçi denkliğin GÜCÜNÜ kodlar, uyumu değil. Bir kanıt eşleşen
   maddelerin ikisini birden karşılayabildiği için bu kütük /uyum'un
   matrisini tekrar etmez, onu besler. */

export type Kodlu = { id: string; kod: string; ad: string };

export type M = {
  id: string;
  kod: string;
  /** çerçeve önekinden arındırılmış kod — `ISO-27001-A.5.9` → `A.5.9` */
  kisaKod: string;
  baslik: string;
  regId: string;
  regKod: string;
};

export type E = {
  id: string;
  denklik: string;
  aciklama: string | null;
  kaynak: M;
  hedef: M;
};

/** Denklik gücü → Atlas işaretçisi.
    `ilgili` bir BİLİNMEYEN DEĞİLDİR: zayıf ama kayıtlı bir karardır, bu
    yüzden elmas değil planlı işaretçisini alır. Eşleşmenin hiç olmaması
    ise hücreyi BOŞ bırakır (kapsam dışı gibi okunur, satır sayacında
    ayrıca söylenir). */
export const DENKLIK_IM: Record<string, Durum> = {
  tam: 'ok', kismi: 'md', ilgili: 'pl',
};

export function kisaKod(kod: string, cerceveKodu: string): string {
  return kod.startsWith(`${cerceveKodu}-`) ? kod.slice(cerceveKodu.length + 1) : kod;
}

/* ── Hücre indeksi ────────────────────────────────────────────────────
   Eşleme YÖNSÜZDÜR: (a,b) ile (b,a) aynı kaydı gösterir. İndeks bu yüzden
   iki yönü de taşır — matris hangi çerçeve satırda olursa olsun çalışsın. */

export function anahtar(solId: string, sagId: string): string {
  return `${solId}|${sagId}`;
}

/**
 * Ekranda ÇİZİLEBİLİR eşlemeler: iki ucu da yaprak madde olanlar. Bölüm
 * başlığına bağlanmış bir denklik matriste hücre açamaz; sayaçta görünüp
 * hücrede görünmemesi "3 denklik var ama 2 tane çizili" yalanını üretir.
 * Elenen kayıt yok sayılmaz — sayısı dip notta veri sorunu olarak söylenir.
 */
export function cizilebilirEsler(esler: E[], maddeler: M[]): E[] {
  const evren = new Set(maddeler.map((m) => m.id));
  return esler.filter((e) => evren.has(e.kaynak.id) && evren.has(e.hedef.id));
}

export function hucreleriKur(esler: E[]): Map<string, E> {
  const h = new Map<string, E>();
  for (const e of esler) {
    h.set(anahtar(e.kaynak.id, e.hedef.id), e);
    h.set(anahtar(e.hedef.id, e.kaynak.id), e);
  }
  return h;
}

/** Seçili çift arasındaki eşlemeler — yön fark etmez. */
export function ciftinEsleri(esler: E[], solReg: string, sagReg: string): E[] {
  return esler.filter((e) =>
    (e.kaynak.regId === solReg && e.hedef.regId === sagReg)
    || (e.kaynak.regId === sagReg && e.hedef.regId === solReg));
}

/** Bir maddenin seçili hedef çerçeve DIŞINDAKİ denklik sayısı. "Burada
    karşılıksız ama başka çerçevede eşi var" ayrımını bu sayı taşır. */
export function digerCerceveEsleri(m: M, esler: E[], sagReg: string): number {
  return esler.filter((e) => {
    const karsi = e.kaynak.id === m.id ? e.hedef : e.hedef.id === m.id ? e.kaynak : null;
    return karsi !== null && karsi.regId !== sagReg;
  }).length;
}

/* ── Matris kurulumu ────────────────────────────────────────────────────
   Yoğunluk sözleşmesi matrisi de bağlar: 5–9 satır görünür, kalanı
   toplanır. Sütunlar da bütçelidir — 1fr sütunlar sayı arttıkça
   okunamayacak kadar incelir. */

export const SATIR_BUTCESI = 9;
export const KOLON_BUTCESI = 10;

export type MatrisKurulumu = {
  satirlar: M[];
  kolonlar: M[];
  /** matrise sığmayan, eşlemesi OLAN satırlar */
  toplananSatir: number;
  /** matrise sığmayan, eşlemesi OLAN sütunlar */
  toplananKolon: number;
};

/**
 * Matris YALNIZ eşlemesi olan maddelerden kurulur: baştan sona boş bir
 * satır "her yerde kapsam dışı" gibi okunur ve yanlış olur. Karşılıksız
 * maddeler kendi tablosunda, kendi işaretçisiyle (bilinmeyen) yaşar.
 */
export function matrisKur(
  sol: M[], sag: M[], hucre: Map<string, E>,
  satirButcesi = SATIR_BUTCESI, kolonButcesi = KOLON_BUTCESI,
): MatrisKurulumu {
  const eslesenSayisi = (m: M, karsilar: M[]) =>
    karsilar.filter((k) => hucre.has(anahtar(m.id, k.id))).length;

  const doluSatir = sol
    .map((m) => ({ m, n: eslesenSayisi(m, sag) }))
    .filter((x) => x.n > 0)
    // Çok eşleşenli madde önce: matris en yoğun kesişimi göstersin.
    .sort((a, b) => b.n - a.n || a.m.kod.localeCompare(b.m.kod, 'tr'));

  const satirlar = doluSatir.slice(0, satirButcesi).map((x) => x.m);

  const doluKolon = sag
    .map((m) => ({ m, n: eslesenSayisi(m, satirlar) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.m.kod.localeCompare(b.m.kod, 'tr'));

  const kolonlar = doluKolon.slice(0, kolonButcesi).map((x) => x.m);

  return {
    satirlar: [...satirlar].sort((a, b) => a.kod.localeCompare(b.kod, 'tr')),
    kolonlar: [...kolonlar].sort((a, b) => a.kod.localeCompare(b.kod, 'tr')),
    toplananSatir: Math.max(0, doluSatir.length - satirlar.length),
    toplananKolon: Math.max(0, doluKolon.length - kolonlar.length),
  };
}

/** Seçili hedef çerçevede karşılığı olmayan kaynak maddeler. */
export function karsiliksizlar(sol: M[], sag: M[], hucre: Map<string, E>): M[] {
  return sol.filter((m) => !sag.some((k) => hucre.has(anahtar(m.id, k.id))));
}

export function kapsanan(sol: M[], sag: M[], hucre: Map<string, E>): number {
  return sol.length - karsiliksizlar(sol, sag, hucre).length;
}

/** Açılış çifti: eşlemesi EN ÇOK olan iki çerçeve. Alfabetik ilk çifte
    düşmek ekranı çoğu kez boş bir matrisle açıyor ve "eşleme yok mu?"
    yanılgısı üretiyordu. Beraberliği kod sırası bozar — açılış
    yinelenebilir kalsın. */
export function acilisCifti(cerceveler: Kodlu[], esler: E[]): { sol: string; sag: string } {
  if (cerceveler.length === 0) return { sol: '', sag: '' };
  if (cerceveler.length === 1) {
    return { sol: cerceveler[0].id, sag: cerceveler[0].id };
  }
  let en = { sol: cerceveler[0].id, sag: cerceveler[1].id, adet: -1 };
  for (const a of cerceveler) {
    for (const b of cerceveler) {
      if (a.id === b.id) continue;
      const adet = ciftinEsleri(esler, a.id, b.id).length;
      if (adet > en.adet) en = { sol: a.id, sag: b.id, adet };
    }
  }
  return { sol: en.sol, sag: en.sag };
}

/* ── Metinler ───────────────────────────────────────────────────────── */

/** Matris hücresinin tek satırlık ipucu. Kritik bilgi burada YAŞAMAZ —
    aynı içerik tıklamayla açılan çekmecede tam hâliyle durur. */
export function hucreIpucu(
  sol: M, sag: M, es: E | undefined, etiket: (d: string) => string,
): string {
  if (!es) return `${sol.kisaKod} ⇄ ${sag.kisaKod} · denklik kaydı yok`;
  return `${sol.kisaKod} ⇄ ${sag.kisaKod} · ${etiket(es.denklik)}`
    + (es.aciklama ? ` · ${es.aciklama}` : '');
}

/** Satır etiketinin altı: başlık, matris sütununa sığacak kadar. */
export function kisaBaslik(baslik: string, sinir = 42): string {
  const temiz = baslik.replace(/\s+/g, ' ').trim();
  if (temiz.length <= sinir) return temiz;
  const kes = temiz.slice(0, sinir);
  const bosluk = kes.lastIndexOf(' ');
  return `${(bosluk > 12 ? kes.slice(0, bosluk) : kes)}…`;
}

/** Karşılıksız satırın alt satırı: kayıt kimliği + EN FAZLA bir olgu. */
export function karsiliksizAlti(m: M, digerSayisi: number): string {
  return digerSayisi > 0 ? `${m.kod} · ${digerSayisi} denklik başka çerçevede` : m.kod;
}
