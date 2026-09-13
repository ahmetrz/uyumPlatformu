/* ═══ R10+ · TAKVİM TETİKLİ YÜKÜMLÜLÜK · SAF KARARLAR ══════════════════

   Olay tetikli yükümlülük bir OLAYDAN doğar; takvim tetikli bir
   DÖNEMDEN. Ölçüldü (#48): EPDK Yönetmeliği md. 10/2, 10/3 ve 10/4 üç
   raporlama süresi veriyor ve üçü de takvimden doğuyor — enerji
   müşterisinin yükümlülüklerinin çoğu böyle. Bunları olay yükümlülüğü
   alanına yazmak biçimi doğru bir ANLAM EŞLEME HATASI olurdu (R-D):
   `asgariSiddet` bir takvim yükümlülüğü için anlamsızdır, hiçbir kapı
   görmez ve ürün "bu olay şu raporu gerektirdi" gibi olmayan bir cümle
   kurardı.

   ── MOTOR DÖNEM AÇAR, GÖNDERMEZ ───────────────────────────────────────
   Olay tarafındaki kuralın birebir aynısı: motorun yazabildiği iki durum
   vardır (`acik` · `suresi_gecti`). `verildi` · `teyit_alindi` ·
   `uygulanmaz` insan kararıdır ve motor onlara DOKUNMAZ. Bir raporun
   verildiğini söyleyebilecek tek şey insandır.

   ── DÖNEM BİLİNMİYORSA SAYAÇ YOK ──────────────────────────────────────
   `donem` ya da `teslimGun` boşsa geri sayım GÖSTERİLMEZ ve satır
   "dönem mevzuatta belirlenmedi" der. `sureSaat` ile aynı gerekçe:
   mevzuatın vermediği bir periyodu ürünün uydurması, kimsenin
   değiştirmediği yanlış bir takvim bırakır. Bilinmeyen ≠ sıfır. */

import { SURESIZ_SOZU } from './bildirimKaydi';

/* ── Dönem türü ──────────────────────────────────────────────────────── */

export const DONEMLER = ['yillik', 'ceyreklik', 'aylik'] as const;
export type Donem = (typeof DONEMLER)[number];

export const DONEM_SOZU: Record<Donem, string> = {
  yillik: 'Yıllık', ceyreklik: 'Çeyreklik', aylik: 'Aylık',
};

/** Dönem mevzuatta belirlenmemişse ekran BUNU der; sayı uydurulmaz. */
export const DONEMSIZ_SOZU = 'Dönem mevzuatta belirlenmedi';
/** Teslim süresi belirlenmemişse. */
export const TESLIMSIZ_SOZU = 'Teslim süresi mevzuatta belirlenmedi';

export const TETIKLEYICILER = ['olay', 'takvim'] as const;
export type Tetikleyici = (typeof TETIKLEYICILER)[number];

/* ── Durum kümesi ────────────────────────────────────────────────────── */

export const DONEM_DURUMLARI = [
  'acik', 'verildi', 'teyit_alindi', 'suresi_gecti', 'uygulanmaz',
] as const;
export type DonemDurumu = (typeof DONEM_DURUMLARI)[number];

export const DONEM_DURUM_SOZU: Record<DonemDurumu, string> = {
  acik: 'Dönem açık — rapor verilmedi',
  verildi: 'Verildi',
  teyit_alindi: 'Merci teyit etti',
  suresi_gecti: 'SÜRE GEÇTİ — rapor hâlâ verilmedi',
  uygulanmaz: 'Uygulanmaz',
};

export const DONEM_DURUM_SINIFI: Record<DonemDurumu, string> = {
  acik: 'md', verildi: 'iy', teyit_alindi: 'iy', suresi_gecti: 'bd', uygulanmaz: 'unk',
};

/** Motorun yazabildiği İKİ durum. Kalanı insan kararıdır. */
export const MOTORUN_YAZABILECEGI_DONEM: readonly DonemDurumu[] = ['acik', 'suresi_gecti'];

export function motorYazabilirMiDonem(d: string): d is DonemDurumu {
  return (MOTORUN_YAZABILECEGI_DONEM as readonly string[]).includes(d);
}

/** Kapanmış dönem: insan karar vermiş, motor DOKUNMAZ. */
export function donemKapali(d: string): boolean {
  return d === 'verildi' || d === 'teyit_alindi' || d === 'uygulanmaz';
}

/* ── Dönem penceresi ─────────────────────────────────────────────────── */

export type DonemPenceresi = {
  etiket: string;
  baslangic: number;
  bitis: number;
  /** Teslim son tarihi; `null` = mevzuat teslim süresi vermedi. */
  sonTarih: number | null;
};

const AY_GUN = 24 * 3_600_000;
const iki = (n: number) => String(n).padStart(2, '0');

/**
 * Bir tarihin İÇİNDE bulunduğu dönemi hesaplar.
 *
 * `donem` yoksa pencere de yoktur: ürün bir periyot UYDURMAZ ve dönem
 * açılmaz. `teslimGun` yoksa pencere açılır ama SON TARİH yoktur —
 * "rapor bekleniyor" denir, "geciktiniz" denmez.
 *
 * `donemBaslangici` ("MM-DD") kiracının kendi takvimini taşır; yoksa
 * takvim yılı varsayılır ve bu bir UYDURMA DEĞİL, açıkça yazılmış bir
 * varsayılandır (`donemBaslangiciVarsayildi`).
 */
export function donemPenceresi(o: {
  donem: string | null;
  donemBaslangici: string | null;
  teslimGun: number | null;
  simdi: number;
}): { pencere: DonemPenceresi | null; donemBaslangiciVarsayildi: boolean; soz: string } {
  if (o.donem === null || !(DONEMLER as readonly string[]).includes(o.donem)) {
    return { pencere: null, donemBaslangiciVarsayildi: false, soz: DONEMSIZ_SOZU };
  }
  const varsayildi = o.donemBaslangici === null;
  const [ayStr, gunStr] = (o.donemBaslangici ?? '01-01').split('-');
  const kayAy = Math.max(0, Math.min(11, Number(ayStr) - 1));
  const kayGun = Math.max(1, Math.min(28, Number(gunStr)));

  const d = new Date(o.simdi);
  const yil = d.getUTCFullYear();

  /* ── PENCERE ARİTMETİKLE DEĞİL NORMALLEŞTİRMEYLE BULUNUR ─────────────
     Burada üç ayrı dal ve üç ayrı indeks hesabı vardı; ikisi kusurluydu
     ve ikisini de bağımsız inceleme ile onun açtığı test buldu (#49):

       · çeyreklik dal geri sararken bir ÇEYREK değil bir YIL geri
         gidiyordu — ölçüldü: `simdi=2026-01-05` + çapa `01-15` →
         2025-01-15…2025-04-15, şimdiyi HİÇ kapsamayan bir pencere;
       · çeyrek indeksi yalnız AYDAN hesaplanıyordu, ÇAPA GÜNÜNÜ yok
         sayıyordu — çapa ayının içindeyken ama çapa gününden önceyken
         indeks bir kayıyor ve tek adım geri sarma yetmiyordu (ölçüldü:
         çapa `04-02`, şimdi `2026-01-01`).

     İndeks aritmetiği bu sınıfa açık: her periyot için ayrı bir formül,
     her formülde ayrı bir sınır hâli. Bugün TEK bir değişmez var ve kod
     onu doğrudan kuruyor:

         PENCERE ŞİMDİYİ KAPSAR — baslangic ≤ simdi < bitis.

     Çapadan başlanır, periyot adımıyla geriye/ileriye kaydırılır. Döngü
     sınırlıdır: `bas` içinde bulunulan yıldan başlar, en fazla bir yıllık
     adım sayısı kadar döner. `Date.UTC` taşan ve negatif ayı kendisi
     normalleştirir, bu yüzden yıl ayrıca hesaplanmaz. */
  const adimAy = o.donem === 'yillik' ? 12 : (o.donem === 'ceyreklik' ? 3 : 1);
  let basAy = kayAy;
  const capa = (ay: number) => new Date(Date.UTC(yil, ay, kayGun));

  /* Geri: çapa şimdiden ileridedeyse bir periyot geri. */
  while (capa(basAy).getTime() > o.simdi) basAy -= adimAy;
  /* İleri: BİR SONRAKİ pencere de şimdiyi kapsıyorsa oraya geç. */
  while (capa(basAy + adimAy).getTime() <= o.simdi) basAy += adimAy;

  const bas = capa(basAy);
  const bit = capa(basAy + adimAy);

  const etiket = o.donem === 'yillik'
    ? String(bas.getUTCFullYear())
    : o.donem === 'ceyreklik'
      ? `${bas.getUTCFullYear()}-Ç${Math.floor(bas.getUTCMonth() / 3) + 1}`
      : `${bas.getUTCFullYear()}-${iki(bas.getUTCMonth() + 1)}`;

  return {
    pencere: {
      etiket,
      baslangic: bas.getTime(),
      bitis: bit.getTime(),
      /* SON TARİH DÖNEM KAPANDIKTAN SONRA başlar: rapor dönemin
         içindeyken değil, bittikten sonra teslim edilir. */
      sonTarih: o.teslimGun === null ? null : bit.getTime() + o.teslimGun * AY_GUN,
    },
    donemBaslangiciVarsayildi: varsayildi,
    soz: o.teslimGun === null ? TESLIMSIZ_SOZU : DONEM_SOZU[o.donem as Donem],
  };
}

/* ── Geri sayım ──────────────────────────────────────────────────────── */

export type DonemGeriSayimi =
  | { sureVar: false; kalanDakika: null; gecti: false; soz: string }
  | { sureVar: true; kalanDakika: number; gecti: boolean; soz: string };

const kalanSozu = (dakika: number): string => {
  const mutlak = Math.abs(dakika);
  const gun = Math.floor(mutlak / 1440);
  const saat = Math.floor((mutlak % 1440) / 60);
  const parca = gun > 0 ? `${gun} gün ${saat} saat` : `${saat} saat`;
  return dakika < 0 ? `${parca} GECİKME` : `${parca} kaldı`;
};

/** Teslim son tarihi yoksa geri sayım YOKTUR — sıfır değil, yok. */
export function donemGeriSayimi(o: {
  sonTarih: number | null; simdi: number;
}): DonemGeriSayimi {
  if (o.sonTarih === null) {
    return { sureVar: false, kalanDakika: null, gecti: false, soz: TESLIMSIZ_SOZU };
  }
  const dakika = Math.floor((o.sonTarih - o.simdi) / 60_000);
  return { sureVar: true, kalanDakika: dakika, gecti: dakika < 0, soz: kalanSozu(dakika) };
}

/**
 * Motorun bir dönem için vereceği karar — ya da hiç.
 *
 * `null` = dokunma. Kapalı döneme (insan kararı) ASLA dokunulmaz ve
 * teslim süresi olmayan dönem ASLA "süresi geçti" olmaz.
 */
export function donemKarari(o: {
  mevcutDurum: string; geriSayim: DonemGeriSayimi;
}): DonemDurumu | null {
  if (donemKapali(o.mevcutDurum)) return null;
  if (!o.geriSayim.sureVar) return null;
  if (o.geriSayim.gecti && o.mevcutDurum !== 'suresi_gecti') return 'suresi_gecti';
  return null;
}

/** Ekranın gösterdiği durum — yazma yok, `bildirimKaydi.gorunenDurum` ile aynı desen. */
export function gorunenDonemDurumu(o: {
  donemDurumu: string; geriSayim: DonemGeriSayimi;
}): string {
  return donemKarari({ mevcutDurum: o.donemDurumu, geriSayim: o.geriSayim })
    ?? o.donemDurumu;
}

/* ── İnsan kararı kapıları ───────────────────────────────────────────── */

export const REFERANS_ASGARI_DONEM = 3;
export const GEREKCE_ASGARI_DONEM = 15;

export type Kapi = { ok: true } | { ok: false; sebep: string };

/** Rapor VERİLDİ işaretlemesi REFERANS NUMARASI ister. */
export function verildiKapisi(o: { mevcutDurum: string; referansNo: string }): Kapi {
  if (donemKapali(o.mevcutDurum)) {
    return { ok: false, sebep: `Bu dönem zaten kapandı (${o.mevcutDurum}).` };
  }
  const ref = o.referansNo.trim();
  if (ref.length < REFERANS_ASGARI_DONEM) {
    return {
      ok: false,
      sebep: 'Merciden alınan referans numarası zorunlu: referansı olmayan bir teslim '
        + 'denetimde doğrulanamaz.',
    };
  }
  return { ok: true };
}

export function donemTeyitKapisi(o: { mevcutDurum: string }): Kapi {
  if (o.mevcutDurum !== 'verildi') {
    return { ok: false, sebep: 'Teyit için önce teslimin işaretlenmesi gerekir.' };
  }
  return { ok: true };
}

export function donemUygulanmazKapisi(o: { mevcutDurum: string; gerekce: string }): Kapi {
  if (donemKapali(o.mevcutDurum)) {
    return { ok: false, sebep: `Bu dönem zaten kapandı (${o.mevcutDurum}).` };
  }
  if (o.gerekce.trim().length < GEREKCE_ASGARI_DONEM) {
    return {
      ok: false,
      sebep: 'Gerekçe zorunlu: bir raporlama yükümlülüğünün neden uygulanmadığı '
        + 'denetimde sorulacak ilk sorudur.',
    };
  }
  return { ok: true };
}

export { SURESIZ_SOZU };
