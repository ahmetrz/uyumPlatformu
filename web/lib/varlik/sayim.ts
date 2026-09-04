/* ═══════════════════════════════════════════════════════════════════════
   OT-55 · Fiziksel envanter sayımı — SAF KARAR

   ── NEDEN KEŞİF YETMİYOR ──────────────────────────────────────────────
   Keşif yalnız AĞDA GÖRÜNEN cihazı bulur. Kapalı bir pano içindeki yedek
   PLC, hiç ağa bağlanmayan bir mühendislik dizüstü, sökülüp depoya
   konmuş bir kart — hiçbiri taramada çıkmaz. "Envanterimiz saha ile
   tutuyor mu" sorusunun cevabı ancak birinin gidip bakmasıyla verilir.

   ── SAYILMADI ≠ BULUNAMADI ────────────────────────────────────────────
   Bu modülün var olma sebebi bu ayrımdır. Henüz gidilmemiş bir raf,
   kayıp varlık değildir. İkisini aynı kovaya koymak sayımı ilk gün
   "%90 kayıp" gösterir ve kimse bir daha o ekrana bakmaz.

   ── SAYIM HİÇBİR ŞEYİ SİLMEZ ──────────────────────────────────────────
   Sonuç bir KAYITTIR. "Bulunamadı" işaretlenen varlık envanterden
   düşmez; düşürme ayrı ve bilinçli bir insan kararıdır.

   Bu dosya veritabanı ve React bilmez. */

export const SAYIM_DURUMLARI = ['hazirlik', 'sahada', 'karsilastirma', 'kapali'] as const;
export type SayimDurumu = (typeof SAYIM_DURUMLARI)[number];

export const SAYIM_DURUM_SOZU: Record<SayimDurumu, string> = {
  hazirlik: 'hazırlık — liste çıkarıldı, sahaya çıkılmadı',
  sahada: 'sahada — sayım sürüyor',
  karsilastirma: 'karşılaştırma — sonuçlar değerlendiriliyor',
  kapali: 'kapandı',
};

export const SONUCLAR = [
  'sayilmadi', 'dogrulandi', 'bulunamadi', 'yeri_farkli', 'fazladan',
] as const;
export type SayimSonucu = (typeof SONUCLAR)[number];

export const SONUC_SOZU: Record<SayimSonucu, string> = {
  /* Ölçülmemiş bir satır. Kusur DEĞİLDİR; henüz veri yoktur. */
  sayilmadi: 'sayılmadı — henüz bakılmadı',
  dogrulandi: 'kayıtla aynı yerde bulundu',
  bulunamadi: 'kayıtta var, sahada YOK',
  yeri_farkli: 'bulundu ama kayıtlı yerinde değil',
  fazladan: 'sahada var, kayıtta YOK',
};

export const SONUC_SINIFI: Record<SayimSonucu, 'ok' | 'md' | 'bd' | 'unk'> = {
  sayilmadi: 'unk',
  dogrulandi: 'ok',
  bulunamadi: 'bd',
  /* Yeri farklı bir kayıt hatasıdır, kayıp değil: cihaz duruyor. */
  yeri_farkli: 'md',
  /* Kayıtsız cihaz OT'de en tehlikeli bulgudur — kimse ondan sorumlu
     değil, kimse yamalamıyor, kimse yedeklemiyor. */
  fazladan: 'bd',
};

/** Sahada bulunan bir cihazı anlatan sonuçlar. */
export const BULUNAN: readonly SayimSonucu[] = ['dogrulandi', 'yeri_farkli'];

/* ── Kapılar ─────────────────────────────────────────────────────────── */

export type Karar = { ok: true } | { ok: false; sebep: string };

/**
 * Sayım açılabilir mi?
 *
 * Kapsamda hiç varlık yoksa sayım açılmaz: sıfır paydalı bir kampanya
 * ilerleme oranı üretemez ve ekranda "%100 tamamlandı" diye görünürdü.
 */
export function sayimAcmaKapisi(o: { kapsamSayisi: number }): Karar {
  if (o.kapsamSayisi <= 0) {
    return {
      ok: false,
      sebep: 'Seçilen kapsamda hiç varlık yok; sayım açılamaz. Kapsamı '
        + 'genişletin ya da önce envantere kayıt girin.',
    };
  }
  return { ok: true };
}

/**
 * Satır sonucu yazılabilir mi?
 *
 * `fazladan` satırın varlık bağı OLAMAZ (kayıtta yok demektir) ve saha
 * kimliği ZORUNLUDUR — kimliksiz bir "fazladan cihaz" kaydı, kimsenin
 * bir daha bulamayacağı bir uyarıdır.
 */
export function satirKapisi(o: {
  sonuc: string;
  varlikVar: boolean;
  sahaKimligi: string | null;
  bulunanYer: string | null;
}): Karar {
  if (!SONUCLAR.includes(o.sonuc as SayimSonucu)) {
    return { ok: false, sebep: `Tanınmayan sayım sonucu: "${o.sonuc}".` };
  }
  if (o.sonuc === 'fazladan') {
    if (o.varlikVar) {
      return {
        ok: false,
        sebep: '"Fazladan" bulunan cihaz envanterde KAYITLI OLAMAZ; kayıtlıysa '
          + 'sonuç "bulundu" ya da "yeri farklı" olmalı.',
      };
    }
    if (!o.sahaKimligi?.trim()) {
      return {
        ok: false,
        sebep: 'Kayıtta olmayan cihaz için saha kimliği (etiket, seri no ya da '
          + 'MAC) zorunlu. Kimliksiz kayıt bir daha bulunamaz.',
      };
    }
    return { ok: true };
  }
  if (!o.varlikVar) {
    return {
      ok: false,
      sebep: 'Bu sonuç envanterdeki bir varlığa yazılır; kayıtta olmayan cihaz '
        + 'için "fazladan" kullanın.',
    };
  }
  if (o.sonuc === 'yeri_farkli' && !o.bulunanYer?.trim()) {
    return {
      ok: false,
      sebep: 'Yeri farklı diyorsanız BULUNDUĞU yer yazılmalı; yoksa kayıt '
        + 'düzeltilemez.',
    };
  }
  return { ok: true };
}

/**
 * Sayım kapatılabilir mi?
 *
 * Sayılmamış satır varken kapatmak, ölçülmemişi ölçülmüş saymaktır.
 * Kapatma yine de mümkündür — bir sayım yarıda kesilebilir — ama
 * GEREKÇE ister ve kapanış özeti kaç satırın hiç sayılmadığını yazar.
 */
export function kapatmaKapisi(o: {
  durum: string; sayilmayan: number; gerekce: string | null;
}): Karar {
  if (o.durum === 'kapali') {
    return { ok: false, sebep: 'Sayım zaten kapalı.' };
  }
  if (o.sayilmayan > 0 && !o.gerekce?.trim()) {
    return {
      ok: false,
      sebep: `${o.sayilmayan} satır hiç sayılmadı. Sayımı eksik kapatmak için `
        + 'gerekçe zorunlu: kapanış özeti bu satırları "doğrulandı" DİYE '
        + 'GÖSTERMEZ, sayılmamış olarak yazar.',
    };
  }
  return { ok: true };
}

/* ── Özet ────────────────────────────────────────────────────────────── */

export type SayimOzeti = {
  /** Kampanya açıldığında donmuş payda. */
  kapsam: number;
  sayilan: number;
  dogrulanan: number;
  bulunamayan: number;
  yeriFarkli: number;
  fazladan: number;
  sayilmayan: number;
  /** Sayım ilerlemesi (%). Payda kapsam; sıfır olamaz (açılış kapısı). */
  ilerleme: number;
  /**
   * Envanter doğruluğu (%) — YALNIZ SAYILAN satırlar üzerinden.
   *
   * Sayılmamış satırı paydaya koymak, sayımın ilk gününde doğruluğu
   * sıfıra yakın gösterirdi. Hiç sayılmadıysa `null` döner: "ölçülmedi",
   * "%0 doğru" DEĞİL.
   */
  dogrulukOrani: number | null;
};

export function sayimOzeti(o: {
  kapsam: number;
  sonuclar: readonly string[];
}): SayimOzeti {
  const say = (s: SayimSonucu) => o.sonuclar.filter((x) => x === s).length;
  const dogrulanan = say('dogrulandi');
  const bulunamayan = say('bulunamadi');
  const yeriFarkli = say('yeri_farkli');
  const fazladan = say('fazladan');
  const sayilmayan = say('sayilmadi');
  /* `fazladan` satırlar kapsamın DIŞINDA doğar (kayıtta yoklardı), bu
     yüzden ilerleme paydasına girmezler ama doğruluk paydasına girerler:
     kayıtsız bir cihaz envanterin yanlış olduğunun kanıtıdır. */
  const sayilan = dogrulanan + bulunamayan + yeriFarkli;
  const dogrulukPaydasi = sayilan + fazladan;
  return {
    kapsam: o.kapsam,
    sayilan,
    dogrulanan,
    bulunamayan,
    yeriFarkli,
    fazladan,
    sayilmayan,
    ilerleme: o.kapsam === 0 ? 0 : Math.round((sayilan / o.kapsam) * 100),
    dogrulukOrani: dogrulukPaydasi === 0
      ? null
      : Math.round((dogrulanan / dogrulukPaydasi) * 100),
  };
}

export function sayimCumlesi(o: SayimOzeti): string {
  if (o.sayilan === 0 && o.fazladan === 0) {
    return `${o.kapsam} varlık listelendi; henüz hiçbiri sayılmadı — `
      + 'envanter doğruluğu ÖLÇÜLMEDİ.';
  }
  if (o.fazladan > 0) {
    return `${o.fazladan} cihaz sahada bulundu ama envanterde KAYITLI DEĞİL: `
      + 'kimse onlardan sorumlu değil, kimse yamalamıyor.';
  }
  if (o.bulunamayan > 0) {
    return `${o.bulunamayan} varlık kayıtta var ama sahada bulunamadı. `
      + 'Envanterden düşürme kararı ayrıca verilir.';
  }
  if (o.sayilmayan > 0) {
    return `${o.sayilan}/${o.kapsam} sayıldı · sayılanların %${o.dogrulukOrani}'i `
      + 'kayıtla birebir.';
  }
  return `Kapsamın tamamı sayıldı · envanter doğruluğu %${o.dogrulukOrani}.`;
}
