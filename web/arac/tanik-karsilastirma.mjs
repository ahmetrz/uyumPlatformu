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

/* ═══════════════════════════════════════════════════════════════════════
   TANIĞIN ULAŞAMADIĞI SATIR · KATEGORİ (Brief M · FAZ 2)

   ── NEDEN KATEGORİ ────────────────────────────────────────────────────
   Tanık kütüğün bir bölümünü görüyor ve bu BEYANLI bir sınır. Ama çıplak
   bir "ulaşılamadı" hiçbir şey söylemez: sınırın DARALDIĞINI mı, ürünün
   büyüdüğünü mü, tanığın körleştiğini mi anlatır? Kategorisiz bir sınır,
   bir sonraki turda "zaten görmüyorduk" diye büyütülür.

   Kategoriler KODDAN türetilir — elle işaretlenmez. Üçü de BİRBİRİNİ
   DIŞLAR ve birlikte ulaşılamayan satırların TAMAMINI kaplar; kapı bu
   toplamı ayrıca ölçer, yoksa dördüncü bir hâl sessizce sınıfsız kalır.
   ═══════════════════════════════════════════════════════════════════════ */

/** `app/(kabuk)/(operasyonel)/envanter/X.tsx` → `/envanter` */
export function dosyaRotasi(yer) {
  const y = String(yer ?? '');
  if (!y.startsWith('app/')) return null;
  const parcalar = y.slice(4).split('/').slice(0, -1)      // dosya adını at
    .filter((p) => !/^\(.*\)$/.test(p) && !p.startsWith('@') && !p.startsWith('_'));
  return `/${parcalar.join('/')}`.replace(/\/+$/, '') || '/';
}

/**
 * Tanığın bir kütük satırına neden ulaşamadığı.
 *
 * @param {{yer?: string}} satir kütük satırı
 * @param {Set<string>} gezilen tanığın GEZDİĞİ rotalar
 * @returns {'sunucu-eylemi'|'rota-gezilmedi'|'acilista-yok'}
 */
export function erisimKategorisi(satir, gezilen) {
  const yer = String(satir?.yer ?? '');
  /* 1 · Sunucu eyleminin ret gerekçesi: ilk DOM'da HİÇ bulunmaz, ancak
     kullanıcı bir işlem denediğinde görünür. Tanık işlem denemiyor. */
  if (!yer.startsWith('app/')) return 'sunucu-eylemi';
  const rota = dosyaRotasi(yer);
  /* 2 · Rota hiç gezilmedi (dinamik segment çözülemedi, HTTP hata,
     çok parametreli rota). Tanığın `atlanan` listesi bunu adıyla yazar. */
  if (rota && !gezilen.has(rota)) return 'rota-gezilmedi';
  /* 3 · Rota gezildi ama cümle AÇILIŞ hâlinde yok: çekmece, sekme,
     form, onay kutusu ya da koşullu bir durumun arkasında. */
  return 'acilista-yok';
}

/** Ulaşılamayan satırların kategori dağılımı. */
export function erisimDagilimi(ulasilamayan, gezilen) {
  const sayim = { 'sunucu-eylemi': 0, 'rota-gezilmedi': 0, 'acilista-yok': 0 };
  for (const s of ulasilamayan) sayim[erisimKategorisi(s, gezilen)] += 1;
  return sayim;
}
