/* ═══════════════════════════════════════════════════════════════════════
   UY-65 · Yönetim gözden geçirmesi — SAF KARAR

   ISO 27001 dâhil çoğu çerçevede zorunlu bir KAYITTIR ve denetimde
   istenir. Ürün bunu tutmuyordu: toplantı yapılıyor, kararlar
   e-postada kalıyordu. Denetçi "yönetim gözden geçirmesi kaydınız"
   dediğinde gösterilecek bir şey yoktu.

   ── KARARI OLMAYAN GÖZDEN GEÇİRME "YAPILDI" SAYILMAZ ──────────────────
   Bir toplantı kaydının denetimdeki değeri, ürettiği KARARLARDIR; özet
   metni değil. Kararsız bir toplantıyı "yapıldı" işaretlemek, denetimde
   boş bir sayfa göstermektir.

   ── KARAR BİR CÜMLE DEĞİL, BİR İŞTİR ──────────────────────────────────
   Sorumlusu ve son tarihi olmayan bir karar, bir sonraki toplantıya
   kadar kimsenin bakmadığı bir satırdır.

   Bu dosya veritabanı ve React bilmez. */

export const DURUMLAR = ['planli', 'yapildi', 'iptal'] as const;
export type GgDurumu = (typeof DURUMLAR)[number];

export const DURUM_SOZU: Record<GgDurumu, string> = {
  planli: 'planlandı',
  yapildi: 'yapıldı',
  iptal: 'iptal edildi',
};

export const KARAR_DURUMLARI = ['acik', 'tamamlandi', 'iptal'] as const;
export type KararDurumu = (typeof KARAR_DURUMLARI)[number];

export const KARAR_SOZU: Record<KararDurumu, string> = {
  acik: 'açık',
  tamamlandi: 'tamamlandı',
  iptal: 'iptal edildi',
};

/** Bu süreden uzun süredir gözden geçirme yapılmadıysa gecikmiş sayılır. */
export const PERIYOT_GUN = 365;

/* ── Yaşayan durum ───────────────────────────────────────────────────── */

export type YasayanDurum =
  | 'planli' | 'gecikmis_plan' | 'kararsiz' | 'yapildi' | 'iptal';

export const YASAYAN_SOZU: Record<YasayanDurum, string> = {
  planli: 'planlandı',
  gecikmis_plan: 'PLANLANAN TARİH GEÇTİ — hâlâ yapılmadı',
  /* En sinsi hâl: toplantı yapıldı işaretli ama tek bir karar yok. */
  kararsiz: 'yapıldı işaretli ama HİÇ KARAR yok',
  yapildi: 'yapıldı',
  iptal: 'iptal edildi',
};

export const YASAYAN_SINIFI: Record<YasayanDurum, 'ok' | 'md' | 'bd' | 'pl'> = {
  planli: 'pl',
  gecikmis_plan: 'md',
  kararsiz: 'bd',
  yapildi: 'ok',
  iptal: 'pl',
};

export function yasayanDurum(o: {
  durum: string; tarih: number; simdi: number; kararSayisi: number;
}): YasayanDurum {
  if (o.durum === 'iptal') return 'iptal';
  if (o.durum === 'yapildi') {
    return o.kararSayisi === 0 ? 'kararsiz' : 'yapildi';
  }
  return o.tarih < o.simdi ? 'gecikmis_plan' : 'planli';
}

/* ── Kapılar ─────────────────────────────────────────────────────────── */

export type Karar = { ok: true } | { ok: false; sebep: string };

/**
 * Gözden geçirme "yapıldı" işaretlenebilir mi?
 *
 * En az bir karar ve bir özet zorunludur. Bu kapı bilinçli olarak
 * serttir: kararsız bir "yapıldı" kaydı, denetimde kurumu ürünün
 * kendisinden daha kötü duruma sokar.
 */
export function yapildiKapisi(o: {
  kararSayisi: number; ozet: string | null; tarih: number; simdi: number;
}): Karar {
  if (o.tarih > o.simdi) {
    return { ok: false, sebep: 'Gelecekte olan bir toplantı "yapıldı" işaretlenemez.' };
  }
  if (o.kararSayisi === 0) {
    return {
      ok: false,
      sebep: 'En az bir karar girilmeden "yapıldı" işaretlenemez. Bir gözden '
        + 'geçirmenin denetimdeki değeri ürettiği kararlardır.',
    };
  }
  if (!o.ozet?.trim()) {
    return {
      ok: false,
      sebep: 'Özet zorunlu: neyin görüşüldüğü yazılmadan kararlar bağlamsız kalır.',
    };
  }
  return { ok: true };
}

/**
 * Karar yazılabilir mi?
 *
 * Sorumlu ve son tarih birlikte zorunludur: sahipsiz bir karar, bir
 * sonraki toplantıya kadar kimsenin bakmadığı bir satırdır.
 */
export function kararKapisi(o: {
  karar: string; sorumluVar: boolean; sonTarih: number | null;
}): Karar {
  if (o.karar.trim().length < 10) {
    return {
      ok: false,
      sebep: 'Karar metni en az 10 karakter olmalı; "tamam" bir karar değildir.',
    };
  }
  if (!o.sorumluVar) {
    return { ok: false, sebep: 'Kararın sorumlusu zorunlu.' };
  }
  if (o.sonTarih === null) {
    return {
      ok: false,
      sebep: 'Kararın son tarihi zorunlu. Tarihi olmayan karar takip edilemez.',
    };
  }
  return { ok: true };
}

/* ── Özet ────────────────────────────────────────────────────────────── */

export type GgOzeti = {
  toplam: number;
  planli: number;
  gecikmisPlan: number;
  kararsiz: number;
  yapildi: number;
  acikKarar: number;
  gecikmisKarar: number;
  /** En son yapılan gözden geçirmeden bu yana geçen gün; hiç yoksa null. */
  sonYapilanGun: number | null;
};

export function ggOzeti(o: {
  duruslar: readonly YasayanDurum[];
  acikKarar: number;
  gecikmisKarar: number;
  sonYapilan: number | null;
  simdi: number;
}): GgOzeti {
  const say = (d: YasayanDurum) => o.duruslar.filter((x) => x === d).length;
  return {
    toplam: o.duruslar.length,
    planli: say('planli'),
    gecikmisPlan: say('gecikmis_plan'),
    kararsiz: say('kararsiz'),
    yapildi: say('yapildi'),
    acikKarar: o.acikKarar,
    gecikmisKarar: o.gecikmisKarar,
    sonYapilanGun: o.sonYapilan === null
      ? null
      : Math.floor((o.simdi - o.sonYapilan) / 86_400_000),
  };
}

export function ggCumlesi(o: GgOzeti): string {
  if (o.toplam === 0) {
    return 'Hiç yönetim gözden geçirmesi kaydı yok. Çoğu çerçevede bu '
      + 'zorunlu bir kayıttır ve denetimde istenir.';
  }
  if (o.kararsiz > 0) {
    return `${o.kararsiz} gözden geçirme "yapıldı" işaretli ama hiç kararı yok.`;
  }
  if (o.gecikmisKarar > 0) {
    return `${o.gecikmisKarar} gözden geçirme kararı son tarihini aştı.`;
  }
  if (o.gecikmisPlan > 0) {
    return `${o.gecikmisPlan} gözden geçirmenin planlanan tarihi geçti.`;
  }
  if (o.sonYapilanGun !== null && o.sonYapilanGun > PERIYOT_GUN) {
    return `Son gözden geçirmenin üzerinden ${o.sonYapilanGun} gün geçti `
      + `(beklenen aralık ${PERIYOT_GUN} gün).`;
  }
  if (o.sonYapilanGun === null) {
    return `${o.toplam} gözden geçirme planlandı; henüz hiçbiri yapılmadı.`;
  }
  return `Son gözden geçirme ${o.sonYapilanGun} gün önce · ${o.acikKarar} karar açık.`;
}
