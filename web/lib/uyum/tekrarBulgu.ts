/* ═══════════════════════════════════════════════════════════════════════
   UY-28 · Tekrarlayan bulgu — SAF KARAR

   `Bulgu.tekrarBulguId` şemada vardı, ilişkileri (`tekrarBulgu` /
   `tekrarlar`) tanımlıydı ve ürün kodunda o alana YAZAN HİÇBİR YER
   YOKTU. Ölü bir alandı: denetçinin "bu bulgu daha önce de açılmış
   mıydı" sorusuna ürün cevap veremiyordu.

   Tekrar, uyum yönetiminde tek başına bir bulgudan daha ağır bir
   sinyaldir: bir sorunun ikinci kez açılması, ilk kapanışın YANLIŞ
   olduğunu söyler. Bu yüzden tekrar eden bulgu kök neden analizi ister
   (UY-26) ve eskalasyon kademesini hızlandırır (UY-36).

   Bu dosya veritabanı ve React bilmez. */

/** Aynı kontrolde bu kadar gün içinde yeniden açılan bulgu TEKRARdır. */
export const TEKRAR_PENCERESI_GUN = 365;

/** Zincirde bu kadar halka varsa sorun KRONİKtir. */
export const KRONIK_ESIK = 3;

export type TekrarKaynagi = 'motor' | 'elle';

export const TEKRAR_KAYNAK_SOZU: Record<TekrarKaynagi, string> = {
  motor: 'motor kurdu — aynı kontrolde kapanmış bulgu bulundu',
  elle: 'elle bağlandı',
};

export type AdayBulgu = {
  id: string;
  /** Kontrol × santral kimliği — tekrar TANIMI budur. */
  maddeDurumuId: string;
  durum: string;
  onemDerecesi: string;
  tespit: number;
  kapanma: number | null;
  /** Zaten bir tekrar bağı varsa yeniden kurulmaz. */
  tekrarBulguId: string | null;
};

export type TekrarKarari =
  | { tekrar: true; oncekiId: string; gecenGun: number; sebep: string }
  | { tekrar: false; sebep: string };

/**
 * Bu bulgu bir öncekinin tekrarı mı?
 *
 * Tekrar tanımı DAR tutuldu ve bilerek: **aynı kontrol, aynı santral**
 * (yani aynı `maddeDurumuId`) üzerinde daha önce KAPANMIŞ bir bulgu
 * varsa ve yeni bulgu o kapanıştan sonra açıldıysa, bu bir tekrardır.
 *
 * Başlık benzerliğine BAKILMAZ. Metin benzerliğiyle tekrar aramak,
 * birbirine benzeyen ama farklı iki sorunu birleştirir ve denetçiye
 * "bu zaten biliniyordu" diye yanlış bir tarihçe sunar. Aynı kontrolün
 * yeniden düşmesi ise tartışmasız bir olgudur.
 *
 * PENCERE gereklidir: beş yıl önce kapanmış bir bulgunun bugün yeniden
 * açılması bir "tekrar" değil, yeni bir olaydır. Pencere kayda yazılır
 * (`tekrarPenceresiGun`) ki eşik sonradan değişince eski bağın hangi
 * eşikle kurulduğu kaybolmasın.
 */
export function tekrarKarari(o: {
  yeni: AdayBulgu;
  /** Aynı `maddeDurumuId` üzerindeki ÖTEKİ bulgular. */
  gecmis: readonly AdayBulgu[];
  pencereGun?: number;
}): TekrarKarari {
  if (o.yeni.tekrarBulguId !== null) {
    return { tekrar: false, sebep: 'Bu bulgunun tekrar bağı zaten kurulmuş.' };
  }
  const pencere = (o.pencereGun ?? TEKRAR_PENCERESI_GUN) * 86_400_000;

  const adaylar = o.gecmis
    .filter((g) => g.id !== o.yeni.id)
    .filter((g) => g.maddeDurumuId === o.yeni.maddeDurumuId)
    /* Yalnız KAPANMIŞ bulgu tekrar üretir: hâlâ açık bir bulgunun
       yanında ikinci bir bulgu açmak bir tekrar değil, aynı sorunun
       ikinci kaydıdır (ve o ayrı bir veri kalitesi sorunudur). */
    .filter((g) => g.durum === 'kapali' && g.kapanma !== null)
    .filter((g) => g.kapanma! <= o.yeni.tespit)
    .filter((g) => o.yeni.tespit - g.kapanma! <= pencere)
    /* En YAKIN kapanış seçilir: zincir halka halka kurulsun, hepsi ilk
       halkaya bağlanıp tarihçe düzleşmesin. */
    .sort((a, b) => b.kapanma! - a.kapanma!);

  const onceki = adaylar[0];
  if (!onceki) {
    return {
      tekrar: false,
      sebep: 'Bu kontrolde pencere içinde kapanmış önceki bulgu yok.',
    };
  }
  const gecenGun = Math.floor((o.yeni.tespit - onceki.kapanma!) / 86_400_000);
  return {
    tekrar: true,
    oncekiId: onceki.id,
    gecenGun,
    sebep: `Aynı kontrolde ${gecenGun} gün önce kapanmış bir bulgu var; `
      + 'bu bulgu onun tekrarıdır.',
  };
}

/* ── Zincir ──────────────────────────────────────────────────────────── */

export type ZincirHalkasi = {
  id: string;
  tespit: number;
  kapanma: number | null;
  durum: string;
  onemDerecesi: string;
};

export type TekrarZinciri = {
  halkalar: ZincirHalkasi[];
  /** Zincir uzunluğu — 1 ise tekrar yok. */
  uzunluk: number;
  kronik: boolean;
  /** Kapanışlar arası ortalama gün; ölçülemiyorsa `null`. */
  ortalamaAralikGun: number | null;
};

/**
 * Bir bulgunun tekrar zinciri.
 *
 * `halkalar` en ESKİDEN yeniye sıralanır: denetçi zinciri okurken
 * "önce şu oldu, sonra şu" diye takip eder.
 *
 * Ortalama aralık ölçülemediğinde `null` döner ve SIFIR yazılmaz: tek
 * halkalı bir zincirde "ortalama 0 gün" cümlesi, sorunun sürekli
 * tekrarladığı izlenimini verirdi.
 */
export function tekrarZinciri(halkalar: readonly ZincirHalkasi[]): TekrarZinciri {
  const sirali = [...halkalar].sort((a, b) => a.tespit - b.tespit);
  const araliklar: number[] = [];
  for (let i = 1; i < sirali.length; i++) {
    const onceki = sirali[i - 1].kapanma;
    if (onceki === null) continue;
    araliklar.push(Math.floor((sirali[i].tespit - onceki) / 86_400_000));
  }
  return {
    halkalar: sirali,
    uzunluk: sirali.length,
    kronik: sirali.length >= KRONIK_ESIK,
    ortalamaAralikGun: araliklar.length === 0
      ? null
      : Math.round(araliklar.reduce((a, b) => a + b, 0) / araliklar.length),
  };
}

/* ── Özet ────────────────────────────────────────────────────────────── */

export type TekrarOzeti = {
  toplam: number;
  tekrarEden: number;
  kronik: number;
  /** Motorun kurduğu bağ — insanın kurduğundan AYRI sayılır. */
  motorBagi: number;
  elleBag: number;
  tekrarOrani: number | null;
};

export function tekrarOzeti(
  bulgular: readonly {
    tekrarBulguId: string | null; tekrarKaynagi: string | null; zincirUzunlugu: number;
  }[],
): TekrarOzeti {
  const tekrarEden = bulgular.filter((b) => b.tekrarBulguId !== null).length;
  return {
    toplam: bulgular.length,
    tekrarEden,
    kronik: bulgular.filter((b) => b.zincirUzunlugu >= KRONIK_ESIK).length,
    motorBagi: bulgular.filter((b) => b.tekrarKaynagi === 'motor').length,
    elleBag: bulgular.filter((b) => b.tekrarKaynagi === 'elle').length,
    tekrarOrani: bulgular.length === 0
      ? null
      : Math.round((tekrarEden / bulgular.length) * 100),
  };
}

export function tekrarCumlesi(o: TekrarOzeti): string {
  if (o.toplam === 0) return 'Bulgu yok — tekrar oranı hesaplanamaz.';
  if (o.kronik > 0) {
    return `${o.kronik} kontrol KRONİK: aynı bulgu ${KRONIK_ESIK} veya daha `
      + 'çok kez açıldı. Kapanışlar sorunu gidermiyor.';
  }
  if (o.tekrarEden > 0) {
    return `${o.tekrarEden}/${o.toplam} bulgu daha önce açılıp kapanmış bir `
      + 'bulgunun tekrarı.';
  }
  return 'Hiçbir bulgu tekrar değil.';
}
