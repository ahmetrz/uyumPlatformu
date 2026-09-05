/* ═══════════════════════════════════════════════════════════════════════
   OT-57 · Taşınabilir medya — SAF KARAR

   OT ortamında bulaşmanın en bilinen yolu ağ değil, elden ele dolaşan
   bir USB bellektir: hava boşluklu (air-gapped) bir sistemi ağ üzerinden
   değil, mühendislik istasyonuna takılan bir bellekle vurursunuz.
   Kayıtsız medya, envanterin göremediği tek taşıyıcıdır.

   ── ÜRÜN MEDYAYI ENGELLEMEZ ───────────────────────────────────────────
   Bu bir KÜTÜK ve KAYIT katmanıdır. Engelleme uç nokta koruma ürününün
   işidir ve ürün onun yaptığını yapıyormuş gibi göstermez.

   ── ONAY ZORUNLU DEĞİLDİR, AMA ONAYSIZLIK KUSURDUR ────────────────────
   Onayı zorunlu tutmak, kaydı hiç girilmeyen bir kullanım üretirdi.
   Kayıtsız kullanım, onaysız kullanımdan kötüdür: birinciyi hiç
   göremezsiniz.

   Bu dosya veritabanı ve React bilmez. */

export const MEDYA_TIPLERI = [
  'usb_bellek', 'harici_disk', 'optik', 'sd_kart', 'diger',
] as const;
export type MedyaTipi = (typeof MEDYA_TIPLERI)[number];

export const MEDYA_TIP_ETIKETI: Record<MedyaTipi, string> = {
  usb_bellek: 'USB bellek',
  harici_disk: 'Harici disk',
  optik: 'Optik ortam (CD/DVD)',
  sd_kart: 'SD kart',
  diger: 'Diğer',
};

export const MEDYA_DURUMLARI = ['kayitli', 'karantina', 'kayip', 'imha'] as const;
export type MedyaDurumu = (typeof MEDYA_DURUMLARI)[number];

export const MEDYA_DURUM_SOZU: Record<MedyaDurumu, string> = {
  kayitli: 'kayıtlı ve kullanımda',
  karantina: 'karantinada — kullanılamaz',
  /* Kayıp medya en ağır durumdur: nerede olduğu, neye takıldığı ve ne
     taşıdığı bilinmiyor. */
  kayip: 'KAYIP — nerede olduğu bilinmiyor',
  imha: 'imha edildi',
};

export const MEDYA_DURUM_SINIFI: Record<MedyaDurumu, 'ok' | 'md' | 'bd' | 'pl'> = {
  kayitli: 'ok', karantina: 'md', kayip: 'bd', imha: 'pl',
};

/** Bu süreden uzun süredir taranmamış medya "bayat" sayılır. */
export const TARAMA_TAZELIK_GUN = 90;

/* ── Medyanın bugünkü hâli ───────────────────────────────────────────── */

export type MedyaHali =
  | 'kullanilabilir' | 'karantina' | 'kayip' | 'imha'
  | 'taranmadi' | 'tarama_bayat' | 'sifreleme_olculmedi';

export const HAL_SOZU: Record<MedyaHali, string> = {
  kullanilabilir: 'kullanılabilir',
  karantina: 'karantinada',
  kayip: 'KAYIP',
  imha: 'imha edildi',
  taranmadi: 'HİÇ taranmadı',
  tarama_bayat: `taraması ${TARAMA_TAZELIK_GUN} günden eski`,
  sifreleme_olculmedi: 'şifreli olup olmadığı ölçülmedi',
};

export const HAL_SINIFI: Record<MedyaHali, 'ok' | 'md' | 'bd' | 'unk' | 'pl'> = {
  kullanilabilir: 'ok',
  karantina: 'md',
  kayip: 'bd',
  imha: 'pl',
  /* Hiç taranmamış medya bir KUSURDUR: OT ağına takılacak. */
  taranmadi: 'bd',
  tarama_bayat: 'md',
  /* Ölçülmemiş şifreleme "şifresiz" DEĞİLDİR; gri kalır. */
  sifreleme_olculmedi: 'unk',
};

/**
 * Medyanın bugünkü hâli.
 *
 * Sıra bilinçli: kayıp ve karantina her şeyden önce gelir (medya zaten
 * kullanılmamalı), sonra tarama, en son şifreleme ölçümü.
 */
export function medyaHali(o: {
  durum: string;
  sonTarama: number | null;
  sifreli: boolean | null;
  simdi: number;
  tazelikGun?: number;
}): MedyaHali {
  if (o.durum === 'kayip') return 'kayip';
  if (o.durum === 'imha') return 'imha';
  if (o.durum === 'karantina') return 'karantina';
  if (o.sonTarama === null) return 'taranmadi';
  const esik = (o.tazelikGun ?? TARAMA_TAZELIK_GUN) * 86_400_000;
  if (o.simdi - o.sonTarama > esik) return 'tarama_bayat';
  if (o.sifreli === null) return 'sifreleme_olculmedi';
  return 'kullanilabilir';
}

/* ── Kullanım kapısı ─────────────────────────────────────────────────── */

export type Karar = { ok: true; uyari: string | null } | { ok: false; sebep: string };

/**
 * Bu medya bu varlıkta kullanılabilir mi?
 *
 * REDDEDİLEN iki durum var ve ikisi de medyanın kendi durumundan gelir:
 * karantina ve imha. Kayıp medya için kullanım kaydı GİRİLEBİLİR — bu,
 * "kayıp bellek şu makineye takılmış" bilgisinin kaydedilmesini sağlar
 * ve o bilgi tam olarak olay incelemesinde aranan şeydir.
 *
 * Onaysız kullanım REDDEDİLMEZ, UYARIYLA kaydedilir: kaydı zorlaştırmak
 * kayıtsızlık üretir.
 */
export function kullanimKapisi(o: {
  medyaDurumu: string;
  onaylandi: boolean;
  varlikKritikligi: string | null;
  baslangic: number;
  bitis: number | null;
}): Karar {
  if (o.medyaDurumu === 'karantina') {
    return {
      ok: false,
      sebep: 'Medya KARANTİNADA; kullanım kaydı girilemez. Karantinadan '
        + 'çıkarmak ayrı bir karardır.',
    };
  }
  if (o.medyaDurumu === 'imha') {
    return { ok: false, sebep: 'Medya imha edilmiş; kullanım kaydı girilemez.' };
  }
  if (o.bitis !== null && o.bitis < o.baslangic) {
    return { ok: false, sebep: 'Bitiş zamanı başlangıçtan önce olamaz.' };
  }
  if (!o.onaylandi) {
    const agir = o.varlikKritikligi === 'kritik' || o.varlikKritikligi === 'yuksek';
    return {
      ok: true,
      uyari: agir
        ? 'ONAYSIZ kullanım — hedef varlık yüksek/kritik. Kayıt tutuluyor ve '
          + 'kusur olarak görünecek.'
        : 'Onaysız kullanım kaydedildi; ekranda kusur olarak görünecek.',
    };
  }
  return { ok: true, uyari: null };
}

/* ── Özet ────────────────────────────────────────────────────────────── */

export type MedyaOzeti = {
  toplam: number;
  kullanilabilir: number;
  kayip: number;
  karantina: number;
  taranmayan: number;
  taramaBayat: number;
  sifrelemeOlculmedi: number;
  /** Onayı olmayan kullanım kaydı sayısı. */
  onaysizKullanim: number;
};

export function medyaOzeti(o: {
  haller: readonly MedyaHali[];
  onaysizKullanim: number;
}): MedyaOzeti {
  const say = (h: MedyaHali) => o.haller.filter((x) => x === h).length;
  return {
    toplam: o.haller.length,
    kullanilabilir: say('kullanilabilir'),
    kayip: say('kayip'),
    karantina: say('karantina'),
    taranmayan: say('taranmadi'),
    taramaBayat: say('tarama_bayat'),
    sifrelemeOlculmedi: say('sifreleme_olculmedi'),
    onaysizKullanim: o.onaysizKullanim,
  };
}

export function medyaCumlesi(o: MedyaOzeti): string {
  if (o.toplam === 0) {
    return 'Kayıtlı taşınabilir medya yok. Kayıtsız medya, envanterin '
      + 'göremediği tek taşıyıcıdır.';
  }
  if (o.kayip > 0) {
    return `${o.kayip} medya KAYIP: nerede olduğu, neye takıldığı ve ne `
      + 'taşıdığı bilinmiyor.';
  }
  if (o.taranmayan > 0) {
    return `${o.taranmayan} medya HİÇ taranmadı ve OT ağına takılabilir.`;
  }
  if (o.onaysizKullanim > 0) {
    return `${o.onaysizKullanim} kullanım onaysız kaydedilmiş.`;
  }
  if (o.taramaBayat > 0) {
    return `${o.taramaBayat} medyanın taraması ${TARAMA_TAZELIK_GUN} günden eski.`;
  }
  return `${o.toplam} medya kayıtlı · tarama ve onay kayıtları güncel.`;
}
