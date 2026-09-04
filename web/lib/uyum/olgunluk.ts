/* ═══════════════════════════════════════════════════════════════════════
   UY-59 · Kontrol olgunluk seviyesi — SAF KARAR

   ── ÖLÇÜLMÜŞ KUSUR ────────────────────────────────────────────────────
   `Madde.olgunlukSeviyesi` alanı şemada VARDI ve hiçbir ekran, hiçbir
   motor, hiçbir tohum veri onu okumuyor ya da yazmıyordu: ölü alandı.
   EPDK Yetkinlik Modeli bir OLGUNLUK modelidir; onu yalnız
   "uyumlu/uyumsuz" ikilisiyle takip etmek, modelin kendisini
   kullanmamaktır.

   ── ÖLÇEK GENERİKTİR VE BU BİLİNÇLİDİR ────────────────────────────────
   Aşağıdaki altı kademe, olgunluk modellerinin ortak merdivenidir. Bu
   ürün HİÇBİR düzenleyicinin resmî kademe metnini yeniden yazmaz:
   elimizde o metin yok ve uydurulmuş bir kademe tanımı, kurumu yanlış
   bir öz değerlendirmeye götürürdü. Kurumun kendi çerçevesi başka
   kademeler tanımlıyorsa eşleme kurumun kararıdır.

   ── HEDEF İLE ÖLÇÜLEN AYRI ALANLARDIR ─────────────────────────────────
   Hedef seviye MADDENİN kendisinde (bütün santraller için ortak),
   ölçülen seviye MADDE DURUMUNDA (santral başına) durur. İkisini tek
   alana sıkıştırmak, "hedefimiz neydi" sorusunu cevapsız bırakırdı.

   ── ORTALAMA ALINMAZ ──────────────────────────────────────────────────
   Olgunluk seviyelerinin ortalaması anlamsız bir sayıdır: 5 ile 1'in
   ortalaması olan 3, hiçbir kontrolün gerçek durumu değildir. Ekran
   DAĞILIM ve "hedefin altında kaç kontrol var" sayısını gösterir.

   Bu dosya veritabanı ve React bilmez. */

export const OLGUNLUK_ASGARI = 0;
export const OLGUNLUK_AZAMI = 5;

export const OLGUNLUK_ADI: Record<number, string> = {
  0: 'Yok — uygulama başlamadı',
  1: 'Başlangıç — yapılıyor ama kişiye bağlı',
  2: 'Tekrarlanabilir — benzer durumlarda aynı şekilde yapılıyor',
  3: 'Tanımlı — yazılı ve kurum genelinde aynı',
  4: 'Yönetilen — ölçülüyor ve ölçüme göre yönetiliyor',
  5: 'Optimize — düzenli olarak iyileştiriliyor',
};

export const OLGUNLUK_KISA: Record<number, string> = {
  0: 'Yok', 1: 'Başlangıç', 2: 'Tekrarlanabilir',
  3: 'Tanımlı', 4: 'Yönetilen', 5: 'Optimize',
};

export function gecerliSeviye(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n)
    && n >= OLGUNLUK_ASGARI && n <= OLGUNLUK_AZAMI;
}

/* ── Karşılaştırma ───────────────────────────────────────────────────── */

export type OlgunlukDurumu =
  | 'olculmedi' | 'hedefsiz' | 'hedefin_altinda' | 'hedefte' | 'hedefin_ustunde';

export const OLGUNLUK_SOZU: Record<OlgunlukDurumu, string> = {
  /* Ölçülmemiş olgunluk SIFIR DEĞİLDİR. Sıfır "uygulama başlamadı"
     demektir ve bu ölçülmüş bir sonuçtur. */
  olculmedi: 'olgunluk ölçülmedi',
  hedefsiz: 'hedef seviye tanımlanmamış',
  hedefin_altinda: 'hedefin ALTINDA',
  hedefte: 'hedefte',
  hedefin_ustunde: 'hedefin üstünde',
};

export const OLGUNLUK_SINIFI: Record<OlgunlukDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  olculmedi: 'unk',
  hedefsiz: 'unk',
  hedefin_altinda: 'md',
  hedefte: 'ok',
  hedefin_ustunde: 'ok',
};

export function olgunlukDurumu(o: {
  olculen: number | null; hedef: number | null;
}): OlgunlukDurumu {
  if (o.olculen === null) return 'olculmedi';
  if (o.hedef === null) return 'hedefsiz';
  if (o.olculen < o.hedef) return 'hedefin_altinda';
  return o.olculen === o.hedef ? 'hedefte' : 'hedefin_ustunde';
}

/** Hedefe kaç kademe kaldı; ölçülmemişte ya da hedefsizde `null`. */
export function kademeFarki(o: {
  olculen: number | null; hedef: number | null;
}): number | null {
  if (o.olculen === null || o.hedef === null) return null;
  return o.olculen - o.hedef;
}

/* ── Kapı ────────────────────────────────────────────────────────────── */

export type Karar = { ok: true } | { ok: false; sebep: string };

/**
 * Olgunluk seviyesi yazılabilir mi?
 *
 * Seviye 3 ve üstü "yazılı ve kurum genelinde aynı" demektir; bu iddia
 * bir GEREKÇE olmadan kabul edilmez. Alt kademelerde gerekçe isteğe
 * bağlıdır — "henüz başlamadık" demek için belge gerekmez.
 */
export function olgunlukKapisi(o: {
  seviye: number | null; gerekce: string | null;
}): Karar {
  if (o.seviye === null) return { ok: true }; // ölçümü kaldırmak serbest
  if (!gecerliSeviye(o.seviye)) {
    return {
      ok: false,
      sebep: `Olgunluk seviyesi ${OLGUNLUK_ASGARI}–${OLGUNLUK_AZAMI} arasında bir tam sayı olmalı.`,
    };
  }
  if (o.seviye >= 3 && !o.gerekce?.trim()) {
    return {
      ok: false,
      sebep: `"${OLGUNLUK_KISA[o.seviye]}" seviyesi, uygulamanın yazılı ve kurum `
        + 'genelinde aynı olduğunu iddia eder. Bu iddia gerekçe ister; '
        + 'denetçinin ilk soracağı şey odur.',
    };
  }
  return { ok: true };
}

/* ── Özet ────────────────────────────────────────────────────────────── */

export type OlgunlukOzeti = {
  toplam: number;
  olculen: number;
  olculmeyen: number;
  hedefsiz: number;
  hedefinAltinda: number;
  hedefte: number;
  hedefinUstunde: number;
  /** Seviye başına kaç kontrol — ORTALAMA yerine DAĞILIM. */
  dagilim: Record<number, number>;
};

export function olgunlukOzeti(
  satirlar: readonly { olculen: number | null; hedef: number | null }[],
): OlgunlukOzeti {
  const dagilim: Record<number, number> = {};
  for (let i = OLGUNLUK_ASGARI; i <= OLGUNLUK_AZAMI; i++) dagilim[i] = 0;
  let olculen = 0;
  for (const s of satirlar) {
    if (s.olculen !== null && gecerliSeviye(s.olculen)) {
      dagilim[s.olculen]++;
      olculen++;
    }
  }
  const durumlar = satirlar.map(olgunlukDurumu);
  const say = (d: OlgunlukDurumu) => durumlar.filter((x) => x === d).length;
  return {
    toplam: satirlar.length,
    olculen,
    olculmeyen: say('olculmedi'),
    hedefsiz: say('hedefsiz'),
    hedefinAltinda: say('hedefin_altinda'),
    hedefte: say('hedefte'),
    hedefinUstunde: say('hedefin_ustunde'),
    dagilim,
  };
}

export function olgunlukCumlesi(o: OlgunlukOzeti): string {
  if (o.toplam === 0) return 'Kapsamda kontrol yok.';
  if (o.olculen === 0) {
    return `${o.toplam} kontrolün hiçbirinde olgunluk ölçülmedi. `
      + 'Ölçülmemiş olgunluk sıfır DEĞİLDİR.';
  }
  if (o.hedefinAltinda > 0) {
    return `${o.hedefinAltinda} kontrol hedef olgunluk seviyesinin ALTINDA.`;
  }
  if (o.olculmeyen > 0) {
    return `${o.olculen}/${o.toplam} kontrolde olgunluk ölçüldü; `
      + `${o.olculmeyen} kontrol henüz ölçülmedi.`;
  }
  if (o.hedefsiz > 0) {
    return `Ölçülen kontrollerin ${o.hedefsiz} tanesinde hedef seviye `
      + 'tanımlanmamış: neye göre yeterli olduğu yazılı değil.';
  }
  return `${o.toplam} kontrolün tamamı hedef olgunluk seviyesinde ya da üstünde.`;
}
