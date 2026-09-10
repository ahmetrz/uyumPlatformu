/* ═══════════════════════════════════════════════════════════════════════
   R10 · OLAY → MEVZUAT BİLDİRİMİ — SAF KARAR

   UY-63 bir olaya UYAN TEK yükümlülüğü buluyor ve süresi daralınca görev
   açıyordu. Eksik olan şey KAYITTI: "hangi mercie, ne zaman, hangi
   referans numarasıyla bildirdik" sorusunun cevabı hiçbir yerde
   durmuyordu. Bir olay birden çok mercie bildirilir (7545 ayrı, KVKK
   ayrı) ve her birinin kendi süresi, kendi durumu, kendi referansı olur;
   tek bir "bildirimTarihi" alanı bunların hepsini tek hücreye sıkıştırıp
   hangi bildirimin yapıldığını belirsiz bırakıyordu.

   ── MOTOR GÖNDERMEZ ───────────────────────────────────────────────────
   Motorun yazabileceği İKİ durum vardır: `taslak` (kaydı açar) ve
   `suresi_gecti` (süre geçtiğinde). `gonderildi`, `teyit_alindi` ve
   `uygulanmaz` YALNIZ İNSAN kararıdır. Bu yasak burada bir liste olarak
   durur (`MOTORUN_YAZABILECEGI`) ki motor tarafı onu tek yerden okusun
   ve bekçi onu tek yerden ölçsün — iki ayrı kopya, bir gün iki ayrı
   sıkılık demektir.

   ── SÜRE YOKSA GERİ SAYIM YOKTUR ──────────────────────────────────────
   `sureSaat === null` bir eksiklik değil, mevzuatın kendi hâlidir: 7545
   md. 7 "gecikmeksizin" der ve saati ikincil düzenleme belirleyecektir.
   Ürün oraya bir saat UYDURMAZ. Süresiz yükümlülükte:
     · geri sayım GÖSTERİLMEZ,
     · `suresi_gecti` ASLA yazılmaz (geçecek bir süre yok),
     · ekran "süre mevzuatta belirlenmedi" der.
   Sıfır saat ile süresiz aynı şey değildir ve bir gün karışırsa ürün
   "bildirim gecikti" diye bağırır; yükümlülük ise hiç gecikmemiştir.

   Bu dosya veritabanı, React ve tarayıcı bilmez. */

import { SIDDET_SIRASI, siddetYeterli, type Siddet } from './bildirimSuresi';

/* ── Durum kümesi ────────────────────────────────────────────────────── */

export const BILDIRIM_KAYDI_DURUMLARI = [
  'taslak', 'gonderildi', 'teyit_alindi', 'suresi_gecti', 'uygulanmaz',
] as const;
export type BildirimKaydiDurumu = (typeof BILDIRIM_KAYDI_DURUMLARI)[number];

export const KAYIT_DURUM_SOZU: Record<BildirimKaydiDurumu, string> = {
  taslak: 'Taslak hazır — gönderilmedi',
  gonderildi: 'Gönderildi',
  teyit_alindi: 'Merci teyit etti',
  suresi_gecti: 'SÜRE GEÇTİ — hâlâ gönderilmedi',
  /* "Uygulanmaz" bir karardır ve gerekçe ister; kaydın silinmesi değildir.
     Silinseydi denetçi "bu yükümlülük neden değerlendirilmedi" sorusunun
     cevabını hiçbir yerde bulamazdı. */
  uygulanmaz: 'Uygulanmaz (gerekçeli)',
};

export const KAYIT_DURUM_SINIFI: Record<BildirimKaydiDurumu, 'ok' | 'md' | 'bd' | 'unk' | 'pl'> = {
  taslak: 'md',
  gonderildi: 'ok',
  teyit_alindi: 'ok',
  suresi_gecti: 'bd',
  uygulanmaz: 'pl',
};

/**
 * MOTORUN yazabileceği durumlar — tek kaynak.
 *
 * `gonderildi` burada YOKTUR ve olmaması bu dilimin sebebidir: resmî bir
 * bildirimin yapıldığını söyleyebilecek tek şey insandır. Motorun
 * "gönderildi" yazması, yapılmamış bir bildirimi yapılmış göstermek olur.
 */
export const MOTORUN_YAZABILECEGI: readonly BildirimKaydiDurumu[] = ['taslak', 'suresi_gecti'];

export function motorYazabilirMi(durum: string): boolean {
  return (MOTORUN_YAZABILECEGI as readonly string[]).includes(durum);
}

/** Kayıt kapandı mı — kapalı kayda motor DOKUNMAZ. */
export function kayitKapali(durum: string): boolean {
  return durum === 'gonderildi' || durum === 'teyit_alindi' || durum === 'uygulanmaz';
}

/* ── Yükümlülük ──────────────────────────────────────────────────────── */

/** Süresi NULLABLE yükümlülük — R10 ile `sureSaat` boş olabilir. */
export type SureliYukumluluk = {
  id: string;
  kod: string;
  ad: string;
  regulasyonId: string | null;
  asgariSiddet: string;
  /** Saat; `null` = mevzuat süreyi belirlememiş. Sıfır DEĞİLDİR. */
  sureSaat: number | null;
  merci: string;
  aktif: boolean;
};

/**
 * Bu olaya uyan BÜTÜN yükümlülükler.
 *
 * UY-63'ün `uyanYukumluluk`u en kısa süreliyi seçiyordu; R10'da seçim
 * YOK: bir olay birden çok mercie bildirilir ve her merci için ayrı bir
 * kayıt açılır. En kısayı seçmek, ikinci merciyi görünmez yapardı.
 *
 * Sıra deterministiktir (kod'a göre) ki iki koşu aynı listeyi versin.
 */
export function uyanYukumlulukler(o: {
  siddet: string;
  regulasyonIdleri: readonly string[];
  kurallar: readonly SureliYukumluluk[];
}): SureliYukumluluk[] {
  return o.kurallar
    .filter((k) => {
      if (!k.aktif) return false;
      if (!siddetYeterli(o.siddet, k.asgariSiddet)) return false;
      if (k.regulasyonId === null) return true;
      return o.regulasyonIdleri.includes(k.regulasyonId);
    })
    .slice()
    .sort((a, b) => a.kod.localeCompare(b.kod, 'tr'));
}

/* ── Geri sayım ──────────────────────────────────────────────────────── */

export const SURESIZ_SOZU = 'Süre mevzuatta belirlenmedi';

export type GeriSayim =
  | {
    /** Mevzuat süre belirlememiş: geri sayım YOK, `suresi_gecti` YOK. */
    sureVar: false;
    sonTarih: null;
    kalanDakika: null;
    gecti: false;
    soz: string;
  }
  | {
    sureVar: true;
    sonTarih: number;
    /** Negatifse süre geçmiştir. */
    kalanDakika: number;
    gecti: boolean;
    soz: string;
  };

/** Kalan süreyi insan diline çevirir; gün ve saat, dakikaya inmez. */
function kalanSozu(dakika: number): string {
  const mutlak = Math.abs(dakika);
  const gun = Math.floor(mutlak / 1440);
  const saat = Math.floor((mutlak % 1440) / 60);
  const dk = mutlak % 60;
  const parcalar = gun > 0 ? [`${gun} gün`, `${saat} saat`]
    : saat > 0 ? [`${saat} saat`, `${dk} dakika`]
      : [`${dk} dakika`];
  return dakika < 0 ? `${parcalar.join(' ')} GECİKME` : `${parcalar.join(' ')} kaldı`;
}

/**
 * Geri sayım — süre YOKSA hesaplanmaz.
 *
 * Saat olayın BAŞLANGICINDAN işler, kaydın açıldığı andan değil: bir olay
 * üç gün sonra fark edilmiş olabilir ve yükümlülük o üç günü beklemez.
 */
export function geriSayim(o: {
  baslangic: number;
  simdi: number;
  sureSaat: number | null;
}): GeriSayim {
  if (o.sureSaat === null) {
    return { sureVar: false, sonTarih: null, kalanDakika: null, gecti: false, soz: SURESIZ_SOZU };
  }
  const sonTarih = o.baslangic + o.sureSaat * 3_600_000;
  const kalanDakika = Math.round((sonTarih - o.simdi) / 60_000);
  return {
    sureVar: true,
    sonTarih,
    kalanDakika,
    gecti: kalanDakika < 0,
    soz: kalanSozu(kalanDakika),
  };
}

/* ── Motorun kararı ──────────────────────────────────────────────────── */

/**
 * Motor bu kayda ne yazabilir?
 *
 * `null` = dokunma. Motor YALNIZ açık bir taslağı `suresi_gecti` yapar;
 * başka hiçbir geçişi yapamaz — kapalı kaydı geri açamaz, süresi geçmiş
 * bir kaydı taslağa döndüremez, hiçbir koşulda `gonderildi` yazamaz.
 */
export function motorunKarari(o: {
  mevcutDurum: string;
  geriSayim: GeriSayim;
}): 'suresi_gecti' | null {
  if (o.mevcutDurum !== 'taslak') return null;
  if (!o.geriSayim.sureVar) return null;
  return o.geriSayim.gecti ? 'suresi_gecti' : null;
}

/* ── İnsan kararı kapıları ───────────────────────────────────────────── */

export type Karar = { ok: true } | { ok: false; sebep: string };

export const REFERANS_ASGARI = 3;

/**
 * "Gönderildi" işaretlemenin kapısı.
 *
 * REFERANS NUMARASI ZORUNLUDUR ve bu bir biçim titizliği değil: referansı
 * olmayan bir gönderim, denetimde "gönderdik" demekten ibarettir ve
 * karşı tarafta karşılığı aranamaz. Kayıt ancak referansla bir KANIT olur.
 */
export function gonderimKapisi(o: {
  mevcutDurum: string;
  referansNo: string;
}): Karar {
  if (o.mevcutDurum === 'uygulanmaz') {
    return {
      ok: false,
      sebep: 'Bu yükümlülük "uygulanmaz" olarak kapatılmış; gönderim işaretlenemez. '
        + 'Önce uygulanmaz kararını geri alın.',
    };
  }
  if (o.mevcutDurum === 'gonderildi' || o.mevcutDurum === 'teyit_alindi') {
    return { ok: false, sebep: 'Bu bildirim zaten gönderilmiş olarak işaretli.' };
  }
  if (o.referansNo.trim().length < REFERANS_ASGARI) {
    return {
      ok: false,
      sebep: 'Merciden alınan referans numarası zorunlu: referansı olmayan bir '
        + 'gönderim denetimde doğrulanamaz.',
    };
  }
  return { ok: true };
}

/** Teyit işaretlemenin kapısı — teyit ancak GÖNDERİLMİŞ bir bildirime gelir. */
export function teyitKapisi(o: { mevcutDurum: string }): Karar {
  if (o.mevcutDurum !== 'gonderildi') {
    return {
      ok: false,
      sebep: 'Teyit yalnız gönderilmiş bir bildirime işlenir; önce gönderimi '
        + 'referans numarasıyla kaydedin.',
    };
  }
  return { ok: true };
}

export const GEREKCE_ASGARI = 15;

/**
 * "Uygulanmaz" kararının kapısı — GEREKÇE ZORUNLU.
 *
 * Gerekçe kusurun neden kusur OLMADIĞINI söylemelidir (deponun genel
 * kuralı): "bu olay kişisel veri içermiyor" bir gerekçedir, "vaktimiz
 * yoktu" değildir. Kapı gerekçenin VARLIĞINI ölçer, doğruluğunu değil.
 */
export function uygulanmazKapisi(o: { mevcutDurum: string; gerekce: string }): Karar {
  if (o.mevcutDurum === 'gonderildi' || o.mevcutDurum === 'teyit_alindi') {
    return {
      ok: false,
      sebep: 'Gönderilmiş bir bildirim "uygulanmaz" yapılamaz — gönderim olmuş bir olaydır.',
    };
  }
  if (o.gerekce.trim().length < GEREKCE_ASGARI) {
    return {
      ok: false,
      sebep: 'Gerekçe zorunlu: bu yükümlülüğün neden uygulanmadığı yazılmadan '
        + 'karar savunulamaz.',
    };
  }
  return { ok: true };
}

/* ── Özet ────────────────────────────────────────────────────────────── */

export type BildirimKaydiOzeti = {
  toplam: number;
  taslak: number;
  gonderildi: number;
  teyitAlindi: number;
  suresiGecti: number;
  uygulanmaz: number;
  /** Süresi mevzuatta belirlenmemiş kayıt sayısı — geri sayımı olmayanlar. */
  suresiz: number;
};

export function kayitOzeti(
  kayitlar: readonly { durum: string; sureSaat: number | null }[],
): BildirimKaydiOzeti {
  const say = (d: BildirimKaydiDurumu) => kayitlar.filter((k) => k.durum === d).length;
  return {
    toplam: kayitlar.length,
    taslak: say('taslak'),
    gonderildi: say('gonderildi'),
    teyitAlindi: say('teyit_alindi'),
    suresiGecti: say('suresi_gecti'),
    uygulanmaz: say('uygulanmaz'),
    suresiz: kayitlar.filter((k) => k.sureSaat === null).length,
  };
}

export function kayitCumlesi(o: BildirimKaydiOzeti): string {
  if (o.toplam === 0) return 'Bu olayda bildirim yükümlülüğü doğmadı.';
  if (o.suresiGecti > 0) {
    return `${o.suresiGecti} bildirimin süresi GEÇTİ ve hâlâ gönderilmedi.`;
  }
  if (o.taslak > 0) {
    /* Süresiz olanları ayrı söylemek gerekir: "bekliyor" demek, geri
       sayımı olan bir bekleyişi ima eder; süresiz yükümlülükte bekleyiş
       vardır ama sayaç yoktur. */
    const ek = o.suresiz > 0 ? ` (${o.suresiz} tanesinde süre mevzuatta belirlenmedi)` : '';
    return `${o.taslak} bildirim taslağı gönderilmeyi bekliyor${ek}.`;
  }
  if (o.gonderildi + o.teyitAlindi === o.toplam) {
    return `${o.toplam} bildirimin tamamı gönderildi.`;
  }
  return `${o.toplam} bildirim yükümlülüğü kayıtlı.`;
}

export { SIDDET_SIRASI, siddetYeterli, type Siddet };
