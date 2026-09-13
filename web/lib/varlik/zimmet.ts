/* ═══════════════════════════════════════════════════════════════════════
   OT-09b · Varlık zimmeti — SAF KARAR

   ── ATAMAK İLE KABUL ETMEK AYNI ŞEY DEĞİLDİR ──────────────────────────
   Eski davranışta bir varlığa sahip atamak tek taraflıydı: yönetici alanı
   doldurur, atanan kişinin haberi bile olmayabilirdi. Denetimde "bu
   cihazın sahibi kim" sorusunun cevabı, kimsenin onaylamadığı bir isimdi.
   Sorumluluk devri bir imza ister; bu modül o imzayı modeller.

   ── RED, SAHİPSİZLİK ÜRETMEZ ──────────────────────────────────────────
   Reddedilen bir atama varlığı boşta bırakmamalıdır. Önceki sahip
   duruyorsa sahiplik ona döner. Önceki sahip yoksa alan boş kalır AMA
   sessizce değil: bu bir veri kalitesi bulgusudur ve ekranda görünür.

   ── KİMSE BAŞKASI ADINA CEVAP VEREMEZ ─────────────────────────────────
   Atayan kişi atanan adına kabul edemez; yönetici de edemez. Yönetici
   yalnız İPTAL edebilir. "Kullanıcı adına kabul" düğmesi, akışın var olma
   sebebini ortadan kaldırırdı.

   Bu dosya veritabanı ve React bilmez. */

export const ZIMMET_DURUMLARI = [
  'bekliyor', 'kabul_edildi', 'reddedildi', 'iptal_edildi', 'suresi_doldu',
] as const;
export type ZimmetDurumu = (typeof ZIMMET_DURUMLARI)[number];

export const ZIMMET_SOZU: Record<ZimmetDurumu, string> = {
  bekliyor: 'cevap bekliyor',
  kabul_edildi: 'kabul edildi',
  reddedildi: 'REDDEDİLDİ',
  iptal_edildi: 'iptal edildi',
  suresi_doldu: 'SÜRESİ DOLDU — cevaplanmadı',
};

export const ZIMMET_SINIFI: Record<ZimmetDurumu, 'ok' | 'md' | 'bd' | 'unk' | 'pl'> = {
  bekliyor: 'md',
  kabul_edildi: 'ok',
  /* Red bir kusur değildir — kişi haklı olabilir. Ama sahiplik boşta
     kalmış olabileceği için dikkat ister. */
  reddedildi: 'bd',
  iptal_edildi: 'pl',
  /* Cevapsız kalmış bir zimmet, reddedilmiş bir zimmetten daha kötüdür:
     kimse bakmamıştır. */
  suresi_doldu: 'bd',
};

/** Cevap için varsayılan süre. Konsoldan değiştirilebilir (A sınıfı). */
export const ZIMMET_VARSAYILAN_GUN = 14;
/** Süre tavanı: sonsuza kadar bekleyen bir zimmet, zimmet değildir. */
export const ZIMMET_AZAMI_GUN = 90;
/** Bitişe bu kadar kalınca "süre daralıyor" denir ve BİR KEZ haber verilir. */
export const ZIMMET_UYARI_GUN = 3;

const GUN = 86_400_000;

/** Talep hâlâ cevap bekliyor mu? */
export function acikMi(durum: string): boolean {
  return durum === 'bekliyor';
}

/* ── Kapılar ─────────────────────────────────────────────────────────── */

export type Karar = { ok: true } | { ok: false; sebep: string };

/**
 * Atama talebi açılabilir mi?
 *
 * Beş kural. Hepsi bir gerçek durumun karşılığıdır:
 *  1. Kendi kendine zimmet yoktur — imza karşılıklı olmalıdır.
 *  2. Pasif kullanıcıya zimmet verilemez: kayıt görünürde sahipli, gerçekte
 *     sahipsiz olurdu.
 *  3. Zaten sahibi olan kişiye yeniden zimmet açmak boş bir kayıttır.
 *  4. Aynı varlık için ikinci bir bekleyen talep açılamaz: kişi iki
 *     bildirim alır, birini kabul birini reddederse hangisi geçerli belli
 *     olmaz.
 *  5. Süre 1 gün ile tavan arasında olmalıdır.
 */
export function talepKapisi(o: {
  atananId: string;
  atayanId: string;
  atananAktif: boolean;
  mevcutSahipId: string | null;
  acikTalepVar: boolean;
  sureGun: number;
}): Karar {
  if (o.atananId === o.atayanId) {
    return {
      ok: false,
      sebep: 'Kendinize zimmet açamazsınız. Zimmet karşılıklı bir kayıttır; '
        + 'sahipliği doğrudan üstleniyorsanız atama alanını kullanın.',
    };
  }
  if (!o.atananAktif) {
    return {
      ok: false,
      sebep: 'Pasif kullanıcıya zimmet verilemez: kayıt görünürde sahipli, '
        + 'gerçekte sahipsiz olurdu.',
    };
  }
  if (o.mevcutSahipId === o.atananId) {
    return { ok: false, sebep: 'Bu varlık zaten bu kişinin üzerinde.' };
  }
  if (o.acikTalepVar) {
    return {
      ok: false,
      sebep: 'Bu varlık için cevap bekleyen bir zimmet talebi zaten var. '
        + 'Yeni talep açmak için önce onu iptal edin.',
    };
  }
  if (!Number.isInteger(o.sureGun) || o.sureGun < 1) {
    return { ok: false, sebep: 'Cevap süresi en az 1 gün olmalı.' };
  }
  if (o.sureGun > ZIMMET_AZAMI_GUN) {
    return {
      ok: false,
      sebep: `Cevap süresi ${ZIMMET_AZAMI_GUN} günü aşamaz; sonsuza kadar `
        + 'bekleyen bir zimmet, zimmet değildir.',
    };
  }
  return { ok: true };
}

/**
 * Cevap (kabul/red) verilebilir mi?
 *
 * `cevaplayanId` ile `atananId` AYNI olmak zorundadır. Bu kural sunucuda
 * durur ve ekran gizlese bile geçerlidir: bir düğmeyi gizlemek bir yetki
 * denetimi değildir.
 */
export function cevapKapisi(o: {
  durum: string;
  atananId: string;
  cevaplayanId: string;
  kabul: boolean;
  cevapNotu: string | null;
  sonTarih: number;
  simdi: number;
}): Karar {
  if (o.cevaplayanId !== o.atananId) {
    return {
      ok: false,
      sebep: 'Bir zimmeti yalnız zimmetlenen kişi cevaplayabilir. Yönetici '
        + 'talebi iptal edebilir ama kimse adına kabul edemez.',
    };
  }
  if (o.durum !== 'bekliyor') {
    return {
      ok: false,
      sebep: `Bu talep artık açık değil (${ZIMMET_SOZU[o.durum as ZimmetDurumu] ?? o.durum}).`,
    };
  }
  if (o.simdi > o.sonTarih) {
    return {
      ok: false,
      sebep: 'Cevap süresi geçmiş. Talebi açan kişi yeni bir talep açabilir.',
    };
  }
  /* Red gerekçesi ZORUNLUDUR: gerekçesiz bir red, atayan kişiye ne
     yapacağını söylemez ve aynı talep ertesi gün yeniden açılır. */
  if (!o.kabul && !o.cevapNotu?.trim()) {
    return {
      ok: false,
      sebep: 'Red gerekçesi zorunlu: neden kabul etmediğinizi yazmadan '
        + 'atayan kişi ne yapacağını bilemez.',
    };
  }
  return { ok: true };
}

/**
 * Talep iptal edilebilir mi?
 *
 * İptal ATAMA tarafının işidir: talebi açan kişi ya da envanter onayı olan
 * bir yönetici. Zimmetlenen kişi iptal etmez — onun elindeki karar
 * reddetmektir ve red gerekçe ister; iptal etmek gerekçeden kaçmanın yolu
 * olurdu.
 */
export function iptalKapisi(o: {
  durum: string;
  iptalEdenId: string;
  atayanId: string;
  yoneticiMi: boolean;
}): Karar {
  if (o.durum !== 'bekliyor') {
    return { ok: false, sebep: 'Yalnız cevap bekleyen bir talep iptal edilebilir.' };
  }
  if (o.iptalEdenId !== o.atayanId && !o.yoneticiMi) {
    return {
      ok: false,
      sebep: 'Talebi yalnız açan kişi ya da envanter onayı olan bir yönetici '
        + 'iptal edebilir.',
    };
  }
  return { ok: true };
}

/* ── Süre ────────────────────────────────────────────────────────────── */

export type SureDurumu = 'isliyor' | 'daraliyor' | 'gecti';

export function sonTarihAni(olusturuldu: number, sureGun: number): number {
  return olusturuldu + sureGun * GUN;
}

export function sureDurumu(o: { sonTarih: number; simdi: number }): SureDurumu {
  if (o.simdi > o.sonTarih) return 'gecti';
  return o.sonTarih - o.simdi <= ZIMMET_UYARI_GUN * GUN ? 'daraliyor' : 'isliyor';
}

/** Kalan gün — geçmişse negatif. */
export function kalanGun(o: { sonTarih: number; simdi: number }): number {
  return Math.ceil((o.sonTarih - o.simdi) / GUN);
}

/* ── Red sonrası sahiplik ────────────────────────────────────────────── */

export type RedSonucu = {
  /** Sahipliğin döneceği kişi; null ise varlık sahipsiz kalır. */
  yeniSahipId: string | null;
  /** Sahipsiz kalıyorsa bir veri kalitesi bulgusu açılmalıdır. */
  sahipsizKaliyor: boolean;
};

/**
 * Red sonrası ne olur?
 *
 * Önceki sahip HÂLÂ AKTİFSE sahiplik ona döner. Pasif olmuşsa dönmez —
 * ayrılmış birine sahiplik geri vermek, sorunu görünmez kılardı.
 */
export function redSonrasi(o: {
  oncekiSahipId: string | null;
  oncekiSahipAktif: boolean;
}): RedSonucu {
  const doner = o.oncekiSahipId !== null && o.oncekiSahipAktif;
  return {
    yeniSahipId: doner ? o.oncekiSahipId : null,
    sahipsizKaliyor: !doner,
  };
}

/* ── Özet ────────────────────────────────────────────────────────────── */

export type ZimmetOzeti = {
  toplam: number;
  bekleyen: number;
  daralan: number;
  gecikmis: number;
  kabul: number;
  red: number;
  iptal: number;
  suresiDolan: number;
};

export function zimmetOzeti(
  talepler: readonly { durum: string; sonTarih: number }[],
  simdi: number,
): ZimmetOzeti {
  const say = (d: ZimmetDurumu) => talepler.filter((t) => t.durum === d).length;
  const acik = talepler.filter((t) => acikMi(t.durum));
  return {
    toplam: talepler.length,
    bekleyen: acik.length,
    daralan: acik.filter((t) => sureDurumu({ sonTarih: t.sonTarih, simdi }) === 'daraliyor').length,
    gecikmis: acik.filter((t) => sureDurumu({ sonTarih: t.sonTarih, simdi }) === 'gecti').length,
    kabul: say('kabul_edildi'),
    red: say('reddedildi'),
    iptal: say('iptal_edildi'),
    suresiDolan: say('suresi_doldu'),
  };
}

export function zimmetCumlesi(o: ZimmetOzeti): string {
  if (o.toplam === 0) return 'Hiç zimmet talebi açılmamış.';
  if (o.gecikmis > 0) {
    return `${o.gecikmis} zimmet talebinin cevap süresi GEÇTİ ve hâlâ cevaplanmadı.`;
  }
  if (o.daralan > 0) return `${o.daralan} zimmet talebinde cevap süresi daralıyor.`;
  if (o.bekleyen > 0) return `${o.bekleyen} zimmet talebi cevap bekliyor.`;
  if (o.red > 0) return `${o.red} zimmet reddedilmiş; sahiplik kontrol edilmeli.`;
  return `${o.kabul} zimmet kabul edilmiş; bekleyen talep yok.`;
}
