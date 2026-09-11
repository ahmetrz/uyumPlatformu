/* İKİ TANIĞIN KARŞILAŞTIRILMASI — SAF KARAR

   Toplayan (`dom-tanik.mjs`) ile YARGILAYAN ayrıdır: yargı burada saf
   bir fonksiyondadır ve sentetik girdilerle sınanabilir. Sabotaj kuralı
   sabote eder, ölçüm ortamını değil.

   ── NİYE BASİT BİR KÜME FARKI YETMEZ ──────────────────────────────────
   Kütük JSX KAYNAĞINDAKİ metni tutar ve içindeki `{...}` ifadeleri
   BOŞLUĞA çevrilmiştir; DOM ise o boşlukların DOLMUŞ hâlini görür:

     kütük : "Eksikler ayrı sayılır …  değerlendirilmedi ·  kanıtsız …"
     DOM   : "Eksikler ayrı sayılır … 2 değerlendirilmedi · 1 kanıtsız …"

   Düz bir eşitlik bu ikisini AYRI sayar ve ayrışma dişi, gerçek körlüğü
   gürültüde boğar. Bu yüzden ölçüt ŞUDUR: kütük satırının sözcükleri,
   DOM metninde SIRAYLA geçiyor mu? (sıralı alt dizi). Ara değerler
   sözcük eklediği için bu doğru yön; tersi değil.                     */

/** Karşılaştırma için sözcük dizisi: sayılar ve noktalama düşer. */
export function sozcukler(metin) {
  return String(metin ?? '')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/[\d]+/g, ' ')
    .toLocaleLowerCase('tr')
    .split(/[^\p{L}]+/u)
    .filter((s) => s.length > 1);
}

/** `kucuk` dizisi `buyuk` içinde SIRAYLA geçiyor mu? */
export function sirayla(kucuk, buyuk) {
  if (kucuk.length === 0) return false;
  let i = 0;
  for (const s of buyuk) { if (s === kucuk[i]) i += 1; if (i === kucuk.length) return true; }
  return i === kucuk.length;
}

/** Kütükteki bir satır, DOM'da görülen metni AÇIKLIYOR mu?

    ASGARİ SÖZCÜK: iki sözcüklük bir kütük satırı her DOM metninde
    "bulunur" ve ayrışmayı sessizce sıfırlardı. Eşik, ölçütün kendisinin
    kaçamak olmasını engeller. */
export const ASGARI_SOZCUK = 4;

export function aciklar(kutukMetni, domMetni) {
  const k = sozcukler(kutukMetni);
  if (k.length < ASGARI_SOZCUK) return false;
  return sirayla(k, sozcukler(domMetni));
}

/**
 * Ayrışma kararı — İKİ YÖNLÜ.
 *
 * `domda`   : tanığın GERÇEKTEN gördüğü metinler
 * `kutukte` : türeticinin ürettiği satırlar
 *
 * 1. GÖRÜLDÜ AMA KÜTÜKTE YOK → türetici KÖR. Bu yön mutlaktır: bir
 *    kullanıcı onu ekranda okuyor, kütük onu hiç saymıyor.
 * 2. KÜTÜKTE VAR AMA HİÇ GÖRÜLMEDİ → tek başına kusur DEĞİLDİR: tanık
 *    yalnız sayfanın AÇILIŞ hâlini gezer, çekmece ve form içindeki
 *    cümlelere hiç bakmaz. Bu yön bir SAYI olarak raporlanır ve
 *    tanığın ERİŞİMİNİ ölçer — kütüğü değil.
 */
export function ayrisma(domda, kutukte) {
  const gorulmeyen = new Set(kutukte);
  const kutukteYok = [];
  for (const d of domda) {
    let bulundu = false;
    for (const k of kutukte) {
      if (aciklar(k, d)) { bulundu = true; gorulmeyen.delete(k); }
    }
    if (!bulundu) kutukteYok.push(d);
  }
  return { kutukteYok, domdaGorulmeyen: [...gorulmeyen] };
}

/* ── TANIK KÜTÜĞÜNÜN ÇEKİRDEĞİ ────────────────────────────────────────
   Ana kütük METNE göre anahtarlanır; DOM tanığının açtığı satırlar ise
   çalışma anında birleşen cümlelerdir ve kaynakta bütün hâlde durmaz.
   Onlar `arac/dom-tanik-kutugu.json` içinde ÇEKİRDEK bir parçayla
   anahtarlanır: parçanın DOM metninde sırayla geçmesi satırı açıklar. */
export function tanikSatiriAciklar(satir, domMetni) {
  return aciklar(satir.cekirdek, domMetni);
}

/**
 * TAM AYRIŞMA — iki kütük birlikte.
 *
 * DOM'da görülen HER cümle ya ana kütükten ya tanık kütüğünden
 * açıklanmalıdır. Açıklanmayan satır, TÜRETİCİNİN KÖRLÜĞÜDÜR ve kapı
 * kırmızı yanar: kullanıcı onu ekranda okuyor, hiçbir kütük onu
 * saymıyor.
 */
export function tamAyrisma(domda, kutukte, tanikSatirlari) {
  const acikta = [];
  for (const d of domda) {
    if (kutukte.some((k) => aciklar(k, d))) continue;
    if (tanikSatirlari.some((t) => tanikSatiriAciklar(t, d))) continue;
    acikta.push(d);
  }
  /* ÖLÜ TANIK SATIRI: kütükte duran ama artık hiçbir ekranda görünmeyen
     satır. Ana kütükteki "ölü satır" dişinin tanık tarafındaki eşi —
     kütüğü bir dilek listesine çevirmesin diye. */
  const olu = tanikSatirlari
    .filter((t) => !domda.some((d) => tanikSatiriAciklar(t, d)))
    .map((t) => t.kod);
  return { acikta, olu };
}
