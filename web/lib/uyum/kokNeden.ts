/* ═══════════════════════════════════════════════════════════════════════
   UY-26 · Kök neden standardı — SAF KARAR

   `Bulgu.kokNeden` bir serbest metin alanıydı ve ürün kodunda onu YAZAN
   hiçbir yer yoktu: alan şemada duruyor, hiçbir ekran doldurmuyor,
   hiçbir kapı sormuyordu.

   ── ÖLÇÜLMÜŞ KUSUR: KAPANIŞ KAPISI KÖK NEDEN SORMUYORDU ───────────────
   Bir bulgu, kök nedeni hiç yazılmadan "kapalı" yapılabiliyordu. Kök
   nedeni bilinmeyen bir bulgunun kapatılması, aynı bulgunun geri
   gelmesini garanti eder — ve geri geldiğinde ürün onu TEKRAR olarak da
   göremiyordu (UY-28, aynı kusurun öteki yarısı).

   ── KATEGORİ SAYILIR, METİN ANLATIR ───────────────────────────────────
   İkisi birden tutulur ve biri ötekinin yerine geçmez. Yalnız serbest
   metin olsaydı "aynı kök neden kaç bulguda tekrarlıyor" sorusu
   cevaplanamazdı; yalnız kategori olsaydı analiz bir açılır listeye
   indirgenirdi ve hiçbir denetçi bunu analiz saymaz.

   Bu dosya veritabanı ve React bilmez. */

export const KOK_NEDEN_KATEGORILERI = [
  'surec_yok', 'surec_uygulanmiyor', 'egitim_farkindalik', 'kaynak_yetersiz',
  'teknik_kisit', 'yapilandirma_hatasi', 'tedarikci_kaynakli',
  'degisiklik_yonetimi', 'izleme_eksik', 'sorumluluk_belirsiz',
] as const;
export type KokNedenKategorisi = (typeof KOK_NEDEN_KATEGORILERI)[number];

export const KOK_NEDEN_ETIKETI: Record<KokNedenKategorisi, string> = {
  surec_yok: 'Süreç tanımlı değil',
  surec_uygulanmiyor: 'Süreç var ama uygulanmıyor',
  egitim_farkindalik: 'Eğitim / farkındalık eksiği',
  kaynak_yetersiz: 'Kaynak (bütçe · insan · zaman) yetersiz',
  teknik_kisit: 'Teknik kısıt — mevcut sistem karşılamıyor',
  yapilandirma_hatasi: 'Yapılandırma hatası',
  tedarikci_kaynakli: 'Tedarikçi / üçüncü taraf kaynaklı',
  degisiklik_yonetimi: 'Değişiklik yönetimi boşluğu',
  izleme_eksik: 'İzleme / ölçüm eksikliği',
  sorumluluk_belirsiz: 'Sorumluluk belirsiz',
};

/** Analiz metninin en az uzunluğu — bir kategori seçmek analiz değildir. */
export const ANALIZ_ASGARI = 40;

/* ── Politika: hangi bulgu kök neden analizi ister ───────────────────── */

/**
 * Kök neden analizi ZORUNLU mu?
 *
 * Kritik ve yüksek bulgular için zorunludur. Düşük önemli her bulguya
 * tam analiz dayatmak, analizi bir form doldurma törenine çevirir ve
 * kritik bulgudaki analizin değerini de düşürür — herkes aynı iki
 * cümleyi kopyalamaya başlar.
 *
 * TEKRARLAYAN bulgu, önemi ne olursa olsun analiz ister (UY-28): bir
 * şeyin ikinci kez olması, ilk seferki teşhisin yanlış olduğunun
 * kanıtıdır.
 */
export function analizZorunluMu(o: {
  onemDerecesi: string;
  tekrarMi: boolean;
}): boolean {
  if (o.tekrarMi) return true;
  return o.onemDerecesi === 'kritik' || o.onemDerecesi === 'yuksek';
}

/* ── Analizin bugünkü hâli ───────────────────────────────────────────── */

export type AnalizDurumu = 'tam' | 'kategorisiz' | 'metinsiz' | 'imzasiz' | 'yok';

export const ANALIZ_SOZU: Record<AnalizDurumu, string> = {
  tam: 'kök neden analizi tam',
  kategorisiz: 'analiz yazıldı ama kategori seçilmedi',
  metinsiz: 'kategori seçildi ama analiz yazılmadı',
  imzasiz: 'analiz var ama kimin, ne zaman yaptığı kayıtlı değil',
  yok: 'kök neden analizi yok',
};

export const ANALIZ_SINIFI: Record<AnalizDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  tam: 'ok', kategorisiz: 'md', metinsiz: 'md', imzasiz: 'md', yok: 'unk',
};

export type AnalizGirdisi = {
  kategori: string | null;
  metin: string | null;
  analizEdenId: string | null;
  analizZamani: number | null;
};

/**
 * Analizin bugünkü hâli.
 *
 * `imzasiz` bir kusurdur ve gizlenmez: kim yaptığı bilinmeyen bir kök
 * neden analizi denetimde savunulamaz — "bunu kim yazdı" sorusuna
 * cevap veremeyen bir analiz, bir görüştür.
 */
export function analizDurumu(g: AnalizGirdisi): AnalizDurumu {
  const metinVar = (g.metin ?? '').trim().length >= ANALIZ_ASGARI;
  const kategoriVar = g.kategori !== null && g.kategori.length > 0;
  if (!metinVar && !kategoriVar) return 'yok';
  if (!kategoriVar) return 'kategorisiz';
  if (!metinVar) return 'metinsiz';
  if (g.analizEdenId === null || g.analizZamani === null) return 'imzasiz';
  return 'tam';
}

/* ── Kapanış kapısı — ÖLÇÜLMÜŞ KUSURUN KAPATILDIĞI YER ───────────────── */

export type KapanisKarari =
  | { ok: true }
  | { ok: false; sebep: string };

/**
 * Bu bulgu kapatılabilir mi?
 *
 * Kapanış bir DURUM DEĞİŞİKLİĞİ değil bir İDDİADIR: "bu sorun giderildi
 * ve tekrarlamayacak". İkinci yarısı kök neden analizi olmadan
 * söylenemez, bu yüzden kapı analizi sorar.
 *
 * Kapı yalnız ZORUNLU olduğu yerde kapatır (bkz. `analizZorunluMu`):
 * düşük önemli, ilk kez görülen bir bulgu analizsiz kapatılabilir ve bu
 * bilinçlidir — kapıyı her yere koymak, kapının kendisini anlamsız
 * kılar.
 */
export function kapanisKapisi(o: {
  onemDerecesi: string;
  tekrarMi: boolean;
  analiz: AnalizGirdisi;
  /** Açık aksiyonu olan bulgu kapanmaz — ayrı ve daha eski bir kural. */
  acikAksiyon: number;
}): KapanisKarari {
  if (o.acikAksiyon > 0) {
    return {
      ok: false,
      sebep: `${o.acikAksiyon} aksiyon hâlâ açık; bulgu kapatılamaz.`,
    };
  }
  if (!analizZorunluMu({ onemDerecesi: o.onemDerecesi, tekrarMi: o.tekrarMi })) {
    return { ok: true };
  }
  const d = analizDurumu(o.analiz);
  if (d === 'tam') return { ok: true };

  const nicin = o.tekrarMi
    ? 'Bu bulgu TEKRAR ediyor: ilk seferki teşhis tutmadı, bu yüzden '
      + 'önem derecesinden bağımsız olarak kök neden analizi zorunludur.'
    : `"${o.onemDerecesi}" önem derecesindeki bulgular kök neden analizi ister.`;

  const eksik = d === 'yok'
    ? 'Analiz hiç yapılmamış.'
    : d === 'kategorisiz'
      ? 'Kategori seçilmemiş — aynı kök nedenin kaç bulguda tekrarladığı sayılamaz.'
      : d === 'metinsiz'
        ? `Analiz metni yok ya da ${ANALIZ_ASGARI} karakterden kısa; kategori seçmek analiz değildir.`
        : 'Analizi kimin, ne zaman yaptığı kayıtlı değil.';

  return { ok: false, sebep: `${nicin} ${eksik}` };
}

/* ── Kök neden dağılımı ──────────────────────────────────────────────── */

export type KokNedenSatiri = {
  kategori: KokNedenKategorisi;
  sayi: number;
  /** Bu kategorideki bulgulardan kaçı TEKRAR — sistemik sinyal. */
  tekrar: number;
};

export type KokNedenDagilimi = {
  satirlar: KokNedenSatiri[];
  /** Kategorisi olmayan bulgu — ÖLÇÜLMEMİŞTİR, sıfır değildir. */
  kategorisiz: number;
  toplam: number;
};

/**
 * Kök neden dağılımı.
 *
 * Kategorisiz bulgular bir kovaya toplanmaz ve "diğer" diye
 * gösterilmez: ölçülmemiş bir şeyi bir kategoriye koymak, dağılımı
 * olduğundan tam gösterir. Ayrı sayılır ve ekran onu ayrı yazar.
 */
export function kokNedenDagilimi(
  bulgular: readonly { kategori: string | null; tekrarMi: boolean }[],
): KokNedenDagilimi {
  const kova = new Map<KokNedenKategorisi, KokNedenSatiri>();
  let kategorisiz = 0;
  for (const b of bulgular) {
    const k = b.kategori as KokNedenKategorisi | null;
    if (k === null || !KOK_NEDEN_KATEGORILERI.includes(k)) { kategorisiz++; continue; }
    const satir = kova.get(k) ?? { kategori: k, sayi: 0, tekrar: 0 };
    satir.sayi += 1;
    if (b.tekrarMi) satir.tekrar += 1;
    kova.set(k, satir);
  }
  const satirlar = [...kova.values()].sort(
    (a, b) => b.tekrar - a.tekrar || b.sayi - a.sayi
      || a.kategori.localeCompare(b.kategori, 'tr'),
  );
  return { satirlar, kategorisiz, toplam: bulgular.length };
}

/**
 * Dağılımın tek cümlesi.
 *
 * Kategorisiz oranı yüksekse cümle ÖNCE onu söyler: dağılımın kendisi,
 * bulguların yarısı sınıflandırılmamışken yanıltıcıdır.
 */
export function kokNedenCumlesi(d: KokNedenDagilimi): string {
  if (d.toplam === 0) return 'Bulgu yok — kök neden dağılımı hesaplanamaz.';
  if (d.kategorisiz * 2 > d.toplam) {
    return `${d.kategorisiz}/${d.toplam} bulgunun kök nedeni sınıflandırılmamış; `
      + 'dağılım kalan azınlık üzerinden hesaplanıyor.';
  }
  const enUst = d.satirlar[0];
  if (!enUst) return `${d.toplam} bulgunun hiçbiri sınıflandırılmamış.`;
  if (enUst.tekrar > 0) {
    return `En sık kök neden "${KOK_NEDEN_ETIKETI[enUst.kategori]}" `
      + `(${enUst.sayi} bulgu, ${enUst.tekrar}'i TEKRAR).`;
  }
  return `En sık kök neden "${KOK_NEDEN_ETIKETI[enUst.kategori]}" `
    + `(${enUst.sayi} bulgu).`;
}
