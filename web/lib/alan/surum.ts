/* ═══ Sürüm karşılaştırma ve sürüm aralığı — SAF MANTIK ═══════════════

   Firmware uyumu (OT-22), CVE/advisory korelasyonu (OT-25) ve SBOM
   bileşen eşlemesi (OT-26) aynı soruyu sorar: **bu sürüm şu aralığın
   içinde mi?** Bu dosya o sorunun tek cevabıdır.

   ── NİÇİN DİZE KARŞILAŞTIRMASI YASAK ──────────────────────────────────
   `'1.10.0' < '1.9.0'` dizede DOĞRUdur ve sürümde YANLIŞTIR. Bir zafiyet
   korelasyonunda bu, yamalı bir cihazı "etkilenmiş", etkilenmiş bir
   cihazı "temiz" gösterir. İkisi de sahada pahalıdır; ikincisi tehlikeli.

   ── KARŞILAŞTIRILAMAZ ≠ EŞİT ──────────────────────────────────────────
   Ürünün "bilinmeyen ≠ sıfır" kuralının sürümdeki hâli: iki sürüm
   çözümlenemiyorsa `karsilastir` **null** döner, `0` DEĞİL. `0` "eşit"
   demektir ve eşit saymak, bilinmeyeni bir cevaba çevirmektir. Çağıran
   null'ı görmezden gelemez: TypeScript tipi buna zorlar.

   ── SAHADAKİ SÜRÜMLER SEMVER DEĞİLDİR ─────────────────────────────────
   OT dünyasında sürümler serbesttir: `V2.5`, `R1.2 SP3`, `4.0.0.15`,
   `01.02.0003`, `1.2.3-rc1`, `2.9.0b`. Bu yüzden çözümleyici hoşgörülü
   ama SESSİZ DEĞİL: çözemediğini null'la söyler. */

/** Çözümlenmiş sürüm: sayısal parçalar + önsürüm etiketi. */
export type Surum = {
  /** Sayısal parçalar, soldan sağa. Uzunluk serbesttir (2, 3, 4 ya da daha çok). */
  parcalar: number[];
  /** `-rc1`, `b`, `SP3` gibi ek. Yoksa null (= yayın sürümü). */
  onsurum: string | null;
  /** Girdinin kendisi — denetimde "ne yazıyordu" sorusunun cevabı. */
  ham: string;
};

/* Öntakılar (`v`, `V`, `R`, `Rev`, `FW`) ve çevre boşlukları atılır;
   ayırıcı olarak nokta, tire, alt çizgi, boşluk ve iki nokta kabul edilir.
   `SP3` gibi son ek sayısal parça DEĞİL, önsürüm etiketidir. */
/* Alternatif sırası ÖNEMLİ: uzun olan önce denenmeli. `r|rev` sırasıyla
   yazılsaydı "rev 1.2.3" girdisinde `r` eşleşir, geriye "ev 1.2.3" kalır
   ve sürüm çözümlenemezdi (ölçüldü). */
const ONTAKI = /^\s*(?:firmware|version|rev|ver|fw|v|r)[\s.:_-]*/i;

/**
 * Sürüm dizesini çözümler. Çözemezse **null** döner — boş dize, yalnız
 * harf, ya da hiç sayısal parça içermeyen girdi çözümlenemez.
 */
export function surumCozumle(ham: string | null | undefined): Surum | null {
  if (typeof ham !== 'string') return null;
  const temiz = ham.trim();
  if (!temiz) return null;
  const govde = temiz.replace(ONTAKI, '');
  if (!govde) return null;

  /* Sayısal parçalar baştan itibaren okunur; ilk sayısal olmayan parçadan
     sonrası önsürüm sayılır. `1.2.3-rc1` → [1,2,3] + "rc1". */
  const parcalar: number[] = [];
  let kalan = govde;
  for (;;) {
    const m = /^(\d+)(?:[._\-\s:]+)?/.exec(kalan);
    if (!m) break;
    parcalar.push(Number(m[1]));
    kalan = kalan.slice(m[0].length);
    /* Ayırıcı yoksa ve kalan harfle başlıyorsa (ör. "2.9.0b") döngü biter. */
    if (m[0].length === m[1].length && kalan && !/^\d/.test(kalan)) break;
  }
  if (parcalar.length === 0) return null;

  const onsurum = kalan.trim() ? kalan.trim().replace(/^[.\-_\s:]+/, '') : null;
  return { parcalar, onsurum: onsurum || null, ham: temiz };
}

/** İki sayı dizisini soldan sağa kıyaslar; eksik hane 0 sayılır. */
function parcalariKarsilastir(a: number[], b: number[]): -1 | 0 | 1 {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

/**
 * İki sürümü kıyaslar.
 *
 * `-1` a < b · `0` a = b · `1` a > b · **`null` karşılaştırılamaz**.
 *
 * Önsürüm kuralı semver ile aynı yöndedir: sayısal parçalar eşitse
 * ÖNSÜRÜMLÜ olan küçüktür (`1.2.0-rc1 < 1.2.0`). İki farklı önsürüm
 * etiketi arasında sıralama UYDURULMAZ — `rc1` ile `beta` arasında
 * evrensel bir sıra yoktur ve varmış gibi davranmak yanlış cevaptan
 * daha kötüdür: null döner.
 */
export function karsilastir(
  a: string | null | undefined, b: string | null | undefined,
): -1 | 0 | 1 | null {
  const sa = surumCozumle(a);
  const sb = surumCozumle(b);
  if (!sa || !sb) return null;

  const p = parcalariKarsilastir(sa.parcalar, sb.parcalar);
  if (p !== 0) return p;

  if (sa.onsurum === null && sb.onsurum === null) return 0;
  if (sa.onsurum === null) return 1;   // yayın > önsürüm
  if (sb.onsurum === null) return -1;
  /* İki önsürüm: birebir aynıysa eşit, değilse SIRALANAMAZ. */
  return sa.onsurum.toLocaleLowerCase('tr') === sb.onsurum.toLocaleLowerCase('tr') ? 0 : null;
}

/* ── Sürüm aralığı ─────────────────────────────────────────────────────
   Advisory'ler aralığı çoğu zaman "şundan büyük eşit, bundan küçük"
   diye yazar. Aralık modeli bu yüzden UÇ NOKTALI: her uç ayrı ayrı
   dahil/hariç olabilir. Açık uç `null`dır ("bu yönde sınır yok"). */
export type SurumAraligi = {
  /** Alt sınır; null = alt sınır yok. */
  alt: string | null;
  /** Alt sınır dahil mi (`>=` vs `>`). */
  altDahil: boolean;
  /** Üst sınır; null = üst sınır yok. */
  ust: string | null;
  /** Üst sınır dahil mi (`<=` vs `<`). */
  ustDahil: boolean;
};

/** Tek bir sürümü aralık olarak ifade eder (advisory "yalnız 1.2.3"). */
export function tekSurumAraligi(surum: string): SurumAraligi {
  return { alt: surum, altDahil: true, ust: surum, ustDahil: true };
}

/**
 * Sürüm aralığın içinde mi?
 *
 * `true` içinde · `false` dışında · **`null` KARAR VERİLEMEDİ**.
 *
 * null, korelasyonda "etkilenmiyor" diye okunmamalıdır: sürüm
 * çözümlenemediyse cihazın etkilenip etkilenmediği BİLİNMİYOR demektir
 * ve ekranda öyle görünmelidir.
 */
export function araliktaMi(surum: string | null | undefined, aralik: SurumAraligi): boolean | null {
  if (!surumCozumle(surum)) return null;

  if (aralik.alt !== null) {
    const c = karsilastir(surum, aralik.alt);
    if (c === null) return null;
    if (aralik.altDahil ? c < 0 : c <= 0) return false;
  }
  if (aralik.ust !== null) {
    const c = karsilastir(surum, aralik.ust);
    if (c === null) return null;
    if (aralik.ustDahil ? c > 0 : c >= 0) return false;
  }
  return true;
}

/**
 * Kurulu sürüm, gereken asgari sürümü karşılıyor mu?
 *
 * Firmware/patch uyumunun tek sorusu budur. `null` = karar verilemedi;
 * çağıran bunu UYUMLU saymamalıdır (OT-22: "unknown sürümü compliant
 * sayma").
 */
export function asgariyiKarsilarMi(
  kurulu: string | null | undefined, asgari: string | null | undefined,
): boolean | null {
  const c = karsilastir(kurulu, asgari);
  return c === null ? null : c >= 0;
}

/** Metinsel aralık gösterimi — ekranda ve denetim izinde okunur. */
export function aralikMetni(a: SurumAraligi): string {
  if (a.alt === null && a.ust === null) return 'tüm sürümler';
  if (a.alt !== null && a.ust !== null && a.alt === a.ust && a.altDahil && a.ustDahil) {
    return `yalnız ${a.alt}`;
  }
  const parcalar: string[] = [];
  if (a.alt !== null) parcalar.push(`${a.altDahil ? '≥' : '>'} ${a.alt}`);
  if (a.ust !== null) parcalar.push(`${a.ustDahil ? '≤' : '<'} ${a.ust}`);
  return parcalar.join(' ve ');
}
