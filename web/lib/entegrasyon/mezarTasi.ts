/* ═══════════════════════════════════════════════════════════════════════
   OT-40 · Mezar taşı — kaynakta ARTIK OLMAYAN kayıt

   Otomatik veri toplamanın en kolay atlanan yarısı: bir kaydın kaynak
   sistemde SİLİNDİĞİNİ anlamak. Yalnız "yeni ve değişen" çeken bir
   entegrasyon, hurdaya çıkmış bir cihazı sonsuza kadar envanterde canlı
   gösterir ve o cihazın yama/EDR açığı denetimde gerçek bir kusur olarak
   sayılır.

   Bu modül veritabanına DOKUNMAZ ve React bilmez; saf karar kodudur.

   ── YOKLUK TEK BAŞINA KANIT DEĞİLDİR ──────────────────────────────────
   Üç koşul birden sağlanmadan hiçbir kayıt "silinmiş" sayılmaz:

   1. KOŞU TAM OLMALI. Delta koşusunda kaydın gelmemesi "değişmedi"
      demektir, "yok" demek değil. Delta koşusundan mezar taşı çıkarmak,
      değişmeyen her cihazı silinmiş saymaktır.
   2. KOŞU EKSİKSİZ BİTMİŞ OLMALI. Sayfa sınırına takılıp yarıda kalan
      bir tam koşu, okunmamış sayfadaki her kaydı yok gösterir.
   3. KAYIP ORANI EŞİĞİ AŞMAMALI. Kaynak sistemin filtresi bozulduğunda
      ya da yetki daraldığında sorgu birdenbire çok az kayıt döndürür.
      "Filonun %90'ı silinmiş" bir gözlem değil, bir arıza belirtisidir;
      bu durumda hiçbir mezar taşı üretilmez ve durum ARIZA olarak
      raporlanır.

   ── MEZAR TAŞI BİR ÖNERİDİR, BİR SİLME DEĞİL ─────────────────────────
   Ürün hiçbir varlığı otomatik silmez, `yasamDongusu` alanını kendiliğinden
   değiştirmez. Mezar taşı bir veri kalitesi bulgusu açar; kaydı emekliye
   ayırmak ya da kaynağı düzeltmek insanın kararıdır. */

/** Kayıp oranı bunu aşarsa mezar taşı ÜRETİLMEZ — arıza sayılır. */
export const KAYIP_ORANI_ESIGI = 0.4;
/** Bu sayıdan az önceki kayıtla oran anlamlı değildir; mutlak sayı sorulur. */
export const ORAN_ICIN_ASGARI_KAYIT = 20;
/** Küçük kümede en çok bu kadar kayıp mezar taşına dönebilir. */
export const KUCUK_KUME_MUTLAK_SINIR = 5;

export type KosuBilgisi = {
  /** 'tam' | 'delta' — yalnız 'tam' mezar taşı üretebilir. */
  senkronKipi: string;
  /** Adaptör "daha sayfa var" diyerek mi bitti? true ise koşu EKSİKTİR. */
  devamVar: boolean;
  /** Koşu başarıyla bitti mi. Başarısız koşu hiçbir şey kanıtlamaz. */
  basarili: boolean;
};

export type MezarTasiSonucu =
  | {
    durum: 'uretildi';
    /** Kaynakta artık görünmeyen kayıt kimlikleri. */
    kayipKayitIdleri: string[];
    gerekce: string;
  }
  | {
    /** Koşu mezar taşı üretmeye uygun değil — kusur DEĞİL, ölçüm yok. */
    durum: 'uygulanamaz';
    gerekce: string;
  }
  | {
    /** Kayıp oranı eşiği aştı: kaynak arızası varsayılır, silme YOK. */
    durum: 'ariza';
    kayip: number;
    onceki: number;
    oran: number;
    gerekce: string;
  };

/**
 * Önceki tam koşuda görülen kimliklerle bu koşudakileri karşılaştırır.
 *
 * `onceki` boşsa `uygulanamaz` döner: ilk tam koşuda karşılaştıracak
 * taban yoktur ve "hepsi yeni" ile "hiçbiri kaybolmadı" aynı şey değildir.
 */
export function mezarTaslariniCikar(
  onceki: readonly string[],
  simdiki: readonly string[],
  kosu: KosuBilgisi,
): MezarTasiSonucu {
  if (kosu.senkronKipi !== 'tam') {
    return {
      durum: 'uygulanamaz',
      gerekce: 'Delta koşusunda kaydın gelmemesi "değişmedi" demektir, "silindi" değil.',
    };
  }
  if (!kosu.basarili) {
    return {
      durum: 'uygulanamaz',
      gerekce: 'Başarısız koşu kaynakta neyin olmadığını kanıtlamaz.',
    };
  }
  if (kosu.devamVar) {
    return {
      durum: 'uygulanamaz',
      gerekce: 'Tam koşu sayfa sınırına takıldı; okunmamış sayfadaki kayıtlar '
        + 'yok sayılamaz.',
    };
  }
  if (onceki.length === 0) {
    return {
      durum: 'uygulanamaz',
      gerekce: 'Karşılaştırılacak önceki tam koşu yok — ilk koşuda kayıp ölçülemez.',
    };
  }

  const bugun = new Set(simdiki);
  const kayip = [...new Set(onceki)].filter((id) => !bugun.has(id));
  if (kayip.length === 0) {
    return {
      durum: 'uretildi', kayipKayitIdleri: [],
      gerekce: 'Önceki koşudaki her kayıt bu koşuda da görüldü.',
    };
  }

  const oran = kayip.length / onceki.length;
  const buyukKume = onceki.length >= ORAN_ICIN_ASGARI_KAYIT;
  /* Küçük kümede oran yanıltıcıdır: 3 kayıtlık bir kaynakta 2 kaydın
     düşmesi %67'dir ama gerçekten iki cihaz sökülmüş olabilir. Orada
     mutlak sayı sorulur. */
  const asti = buyukKume ? oran > KAYIP_ORANI_ESIGI : kayip.length > KUCUK_KUME_MUTLAK_SINIR;

  if (asti) {
    return {
      durum: 'ariza',
      kayip: kayip.length,
      onceki: onceki.length,
      oran,
      gerekce: `${onceki.length} kayıttan ${kayip.length}'i bu koşuda görünmedi `
        + `(%${Math.round(oran * 100)}). Bu bir silme dalgası değil, kaynak `
        + 'sorgusunun daraldığının belirtisidir; mezar taşı üretilmedi.',
    };
  }

  return {
    durum: 'uretildi',
    kayipKayitIdleri: kayip,
    gerekce: `${onceki.length} kayıttan ${kayip.length}'i kaynakta artık görünmüyor.`,
  };
}

/** Mezar taşının açtığı veri kalitesi kuralı. */
export const MEZAR_TASI_KURALI = 'kaynakta_kayboldu';

/**
 * Bulgu metni. Kaydı SİLMEYİ önermez — iki olasılığı da yazar, çünkü
 * ikisi de gerçekten olur ve karar insanındır.
 */
export function mezarTasiAciklamasi(o: {
  etiket: string; kaynakSistem: string; kaynakKayitId: string;
}): string {
  return `${o.etiket} kaydı ${o.kaynakSistem} kaynağının son TAM koşusunda görünmedi `
    + `(kaynak kimliği ${o.kaynakKayitId}). Cihaz sökülmüş ve envanterden `
    + 'düşülmemiş olabilir; kaynak sistemin kapsamı daralmış da olabilir. '
    + 'Ürün kaydı kendiliğinden emekliye ayırmaz.';
}
