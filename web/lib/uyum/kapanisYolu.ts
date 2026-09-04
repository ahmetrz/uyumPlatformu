import { analizDurumu, analizZorunluMu, kapanisKapisi, type AnalizGirdisi } from './kokNeden';

/* ═══════════════════════════════════════════════════════════════════════
   KAPANIŞ YOLU — "bu bulgunun kapanması için ne eksik?"

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   `/bulgular/[id]` ekranının birincil kullanıcı işi tek bir sorudur ve
   ekran o cevabı bugüne kadar hiçbir yerde TEK PARÇA vermiyordu.
   Kullanıcı cevabı dört ayrı yerden kendisi topluyordu: aşama
   şeridinden hangi aşamada olduğunu, aksiyon tablosundan kaç aksiyonun
   açık olduğunu, çekmecedeki kök neden bloğundan analizin durumunu,
   "Doğrulama" alanından doğrulamanın yapılıp yapılmadığını.

   Dört parçayı ekranda yan yana dizmek çözüm değildi: dört kutu daha
   koymak, aynı bilişsel işi kullanıcıya yeniden yaptırırdı. Cevabın
   KENDİSİ hesaplanmalı ve tek cümleyle söylenmeli.

   ── TEK GERÇEK ────────────────────────────────────────────────────────
   Kapanış kararı `kapanisKapisi` içindedir ve sunucu kapısı da onu
   çağırır. Bu modül İKİNCİ BİR KURAL YAZMAZ; aynı fonksiyonu çağırır ve
   sonucunu ADIMLARA çevirir. Ayrı bir kural yazılsaydı ekran "kapanışa
   hazır" derken sunucu reddederdi — kullanıcının güvenini bir kez
   kaybettiren kusur tam olarak budur.

   ── DİL ───────────────────────────────────────────────────────────────
   Her adımın cümlesi GÖREV dilindedir, sistem dili değil:

     kötü  "Kök neden analizi yok"
     iyi   "Kapanış için kök nedeni tamamlayın."

   Fark önemsiz görünür ama biri durum bildirir, öteki ne yapılacağını
   söyler. Kullanıcı ikincisini okuduğunda ekranda kalmak zorunda
   değildir.
   ═══════════════════════════════════════════════════════════════════ */

export const ADIM_ANAHTARLARI = [
  'tespit', 'analiz', 'aksiyon', 'dogrulama', 'kapanis',
] as const;
export type AdimAnahtari = (typeof ADIM_ANAHTARLARI)[number];

/** `tamam` yapıldı · `eksik` sıradaki iş burada · `bekliyor` sırası gelmedi. */
export type AdimDurumu = 'tamam' | 'eksik' | 'bekliyor';

export type KapanisAdimi = {
  anahtar: AdimAnahtari;
  /** Şeritte görünen kısa ad. */
  ad: string;
  durum: AdimDurumu;
  /** Görev dilinde tek cümle — ne yapılacağını söyler. */
  cumle: string;
  /** Şeritte adın altında duran olgu: tarih, sayı. Yoksa boş. */
  olgu: string;
};

export type KapanisYolu = {
  adimlar: KapanisAdimi[];
  /** Sıradaki iş. `null` = yapacak bir şey yok (kapandı ya da kabul edildi). */
  sonraki: { anahtar: AdimAnahtari; etiket: string; cumle: string } | null;
  /** Kayıt karara bağlanmış mı (kapalı ya da riski kabul edilmiş). */
  bitti: boolean;
  /** Kaç adım tamamlandı / toplam kaç adım. */
  ilerleme: { tamam: number; toplam: number };
};

export type KapanisGirdisi = {
  durum: string;
  onemDerecesi: string;
  tekrarMi: boolean;
  analiz: AnalizGirdisi;
  /** Toplam aksiyon sayısı. */
  aksiyonToplam: number;
  /** Hâlâ açık olan aksiyon sayısı. */
  aksiyonAcik: number;
  /** Retest gerekiyor mu ve sonucu girildi mi. */
  retestGerekli: boolean;
  retestSonucu: string | null;
  /** Doğrulama bekleyen aksiyon var mı (`dogrulamaBekleyenAksiyon`). */
  dogrulamaBekleyen: boolean;
  /** Kapanış doğrulaması kaydı. */
  kapanisDogrulama: string | null;
  /** Tespit tarihi — ilk adımın olgusu. */
  tespit: string;
  /** Kısa tarih biçimleyici; ekran kendi biçimini verir. */
  tarih: (iso: string | null) => string;
};

/**
 * Kapanışa giden adımları ve sıradaki işi hesaplar.
 *
 * Adım sırası iş sırasıdır, kayıt alanlarının sırası değil: analiz
 * aksiyondan ÖNCE gelir çünkü yanlış teşhisle planlanan aksiyon
 * bulguyu kapatmaz, yalnız erteler.
 */
export function kapanisYolu(g: KapanisGirdisi): KapanisYolu {
  const bitti = g.durum === 'kapali' || g.durum === 'kabul_edildi';
  const kabul = g.durum === 'kabul_edildi';

  /* ── 1 · Tespit ─────────────────────────────────────────────────────
     Kayıt varsa tespit yapılmıştır; bu adım hiç eksik olmaz. Şeritte
     durmasının sebebi zamandır: kullanıcı "bu ne zamandır açık"
     sorusunu ilk adımda görür. */
  const tespit: KapanisAdimi = {
    anahtar: 'tespit', ad: 'Tespit', durum: 'tamam',
    cumle: 'Bulgu kayda geçti.',
    olgu: g.tarih(g.tespit),
  };

  /* ── 2 · Kök neden ──────────────────────────────────────────────────
     Zorunluluk önem derecesinden ve tekrardan gelir; kural
     `analizZorunluMu` içindedir ve burada YENİDEN YAZILMAZ. */
  const analizGerekli = analizZorunluMu({
    onemDerecesi: g.onemDerecesi, tekrarMi: g.tekrarMi,
  });
  const analizHali = analizDurumu(g.analiz);
  const analiz: KapanisAdimi = !analizGerekli
    ? {
      anahtar: 'analiz', ad: 'Kök neden', durum: 'tamam',
      cumle: 'Bu önem derecesinde kök neden analizi zorunlu değil.',
      olgu: 'gerekmiyor',
    }
    : analizHali === 'tam'
      ? {
        anahtar: 'analiz', ad: 'Kök neden', durum: 'tamam',
        cumle: 'Kök neden analizi tamamlandı.',
        olgu: g.analiz.kategori ?? '',
      }
      : {
        anahtar: 'analiz', ad: 'Kök neden', durum: 'eksik',
        cumle: analizEksikCumlesi(analizHali),
        olgu: '',
      };

  /* ── 3 · Aksiyon ────────────────────────────────────────────────────
     Sıfır aksiyon ile açık aksiyon AYRI durumlardır: birinde planlama,
     ötekinde yürütme eksiktir ve kullanıcıdan istenen iş farklıdır. */
  const aksiyon: KapanisAdimi = g.aksiyonToplam === 0
    ? {
      anahtar: 'aksiyon', ad: 'Aksiyon', durum: 'eksik',
      cumle: 'Bulguyu kapatacak aksiyonu planlayın.',
      olgu: 'planlanmadı',
    }
    : g.aksiyonAcik > 0
      ? {
        anahtar: 'aksiyon', ad: 'Aksiyon', durum: 'eksik',
        cumle: g.aksiyonAcik === 1
          ? 'Açık aksiyonu tamamlayın.'
          : `${g.aksiyonAcik} açık aksiyonu tamamlayın.`,
        olgu: `${g.aksiyonToplam - g.aksiyonAcik}/${g.aksiyonToplam}`,
      }
      : {
        anahtar: 'aksiyon', ad: 'Aksiyon', durum: 'tamam',
        cumle: 'Bütün aksiyonlar tamamlandı.',
        olgu: `${g.aksiyonToplam}/${g.aksiyonToplam}`,
      };

  /* ── 4 · Doğrulama ──────────────────────────────────────────────────
     "Yapılmadı" ile "sırası gelmedi" ayrılır: aksiyon bitmeden
     doğrulama istemek, kullanıcıya yapamayacağı bir iş göstermektir. */
  const dogrulamaYapildi = g.kapanisDogrulama !== null
    || (g.retestGerekli && !!g.retestSonucu);
  const dogrulama: KapanisAdimi = dogrulamaYapildi && !g.dogrulamaBekleyen
    ? {
      anahtar: 'dogrulama', ad: 'Doğrulama', durum: 'tamam',
      cumle: 'Doğrulama kaydı var.',
      olgu: g.kapanisDogrulama ? g.tarih(g.kapanisDogrulama) : 'retest sonucu girildi',
    }
    : aksiyon.durum === 'tamam'
      ? {
        anahtar: 'dogrulama', ad: 'Doğrulama', durum: 'eksik',
        cumle: g.dogrulamaBekleyen
          ? 'Tamamlanan aksiyonu doğrulayın.'
          : 'Aksiyon tamamlandı; doğrulama kaydı ekleyin.',
        olgu: '',
      }
      : {
        anahtar: 'dogrulama', ad: 'Doğrulama', durum: 'bekliyor',
        cumle: 'Aksiyon tamamlandıktan sonra doğrulama ekleyin.',
        olgu: '',
      };

  /* ── 5 · Kapanış ────────────────────────────────────────────────────
     Kapı `kapanisKapisi`nin kendisidir; ikinci bir kural yazılmaz. */
  const kapi = kapanisKapisi({
    onemDerecesi: g.onemDerecesi,
    tekrarMi: g.tekrarMi,
    analiz: g.analiz,
    acikAksiyon: g.aksiyonAcik,
  });
  const kapanis: KapanisAdimi = bitti
    ? {
      anahtar: 'kapanis', ad: kabul ? 'Risk kabulü' : 'Kapanış', durum: 'tamam',
      cumle: kabul
        ? 'Riski kabul edildi; bu kayıt kapanış istemiyor.'
        : 'Bulgu kapandı.',
      olgu: '',
    }
    : kapi.ok && dogrulama.durum === 'tamam'
      ? {
        anahtar: 'kapanis', ad: 'Kapanış', durum: 'eksik',
        cumle: 'Bulgu kapanışa hazır; kaydı kapatın.',
        olgu: 'hazır',
      }
      : {
        anahtar: 'kapanis', ad: 'Kapanış', durum: 'bekliyor',
        cumle: 'Önceki adımlar tamamlanınca kapanışa gönderilebilir.',
        olgu: '',
      };

  const adimlar = [tespit, analiz, aksiyon, dogrulama, kapanis];
  const eksik = adimlar.find((a) => a.durum === 'eksik') ?? null;

  return {
    adimlar,
    sonraki: bitti || !eksik ? null : {
      anahtar: eksik.anahtar,
      etiket: SONRAKI_ETIKET[eksik.anahtar],
      cumle: eksik.cumle,
    },
    bitti,
    ilerleme: {
      tamam: adimlar.filter((a) => a.durum === 'tamam').length,
      toplam: adimlar.length,
    },
  };
}

/** Birincil eylem düğmesinin metni — emir kipi, tek eylem. */
const SONRAKI_ETIKET: Record<AdimAnahtari, string> = {
  tespit: 'Kaydı aç',
  analiz: 'Kök nedeni tamamla',
  aksiyon: 'Aksiyonu tamamla',
  dogrulama: 'Doğrulama ekle',
  kapanis: 'Kapanışa gönder',
};

/** Analiz neden eksik — kullanıcıya YAPILACAK işi söyler. */
function analizEksikCumlesi(hal: ReturnType<typeof analizDurumu>): string {
  switch (hal) {
    case 'kategorisiz':
      return 'Kök neden kategorisini seçin — aynı nedenin kaç bulguda '
        + 'tekrarladığı ancak böyle sayılabilir.';
    case 'metinsiz':
      return 'Kök neden analizini yazın; kategori seçmek analiz değildir.';
    case 'imzasiz':
      return 'Analizi kimin ne zaman yaptığını kaydedin.';
    default:
      return 'Kapanış için kök neden analizini tamamlayın.';
  }
}
