/* ═══════════════════════════════════════════════════════════════════════
   UY-56 · Saklama · legal hold · kontrollü imha — SAF KARAR

   Bir uyum platformunda saklama İKİ YÖNLÜ bir yükümlülüktür:

     · Kayıt süresinden ÖNCE silinemez — denetim kanıtı yok olur.
     · Süresi dolan kayıt SONSUZA KADAR da tutulamaz — kişisel veri,
       sözleşme yükümlülüğü, kurumun kendi politikası.

   Ürün bugüne kadar yalnız birincisini yapıyordu: hiçbir şey
   silinmiyordu ve bu bir politika değil, POLİTİKASIZLIKTI.

   ── ÜRÜN KENDİ KENDİNE SİLMEZ ─────────────────────────────────────────
   Politika bir ÖNERİ üretir. İmha kararı insanındır, dört göz ister ve
   kendi kaydını bırakır. Bir motorun denetim kaydını kendiliğinden
   silmesi, bu ürünün baştan beri reddettiği şeydir (`otomasyon
   güvenliği` nöbetçisi bunu ölçer).

   Bu dosya veritabanı ve React bilmez. */

/** Saklama politikası tanımlanabilen kayıt aileleri. */
export const SAKLANABILIR_TIPLER = [
  'Bulgu', 'Kanit', 'AktiviteKaydi', 'IsKosusu', 'ApiIstegi',
  'Bildirim', 'DegerlendirmeTarihcesi', 'EskalasyonKaydi',
] as const;
export type SaklanabilirTip = (typeof SAKLANABILIR_TIPLER)[number];

export const TIP_ETIKETI: Record<SaklanabilirTip, string> = {
  Bulgu: 'Bulgular',
  Kanit: 'Kanıtlar',
  AktiviteKaydi: 'Denetim izi',
  IsKosusu: 'Motor koşuları',
  ApiIstegi: 'API istekleri',
  Bildirim: 'Bildirimler',
  DegerlendirmeTarihcesi: 'Değerlendirme tarihçesi',
  EskalasyonKaydi: 'Eskalasyon kayıtları',
};

/**
 * DEĞİŞMEZ kayıt aileleri — imha önerisi bile açılamaz.
 *
 * `AktiviteKaydi` ve `DegerlendirmeTarihcesi` veritabanı
 * tetikleyicileriyle güncellenmeye ve silinmeye kapalıdır
 * (`aktivite_silme_yasak`, `degerlendirme_tarihcesi_silme_yasak`).
 * Bunlara saklama politikası tanımlanabilir — "ne kadar tutuyoruz"
 * denetimin sorusudur — ama imha kararı ASLA uygulanamaz ve kapı bunu
 * baştan söyler.
 */
export const DEGISMEZ_TIPLER: readonly SaklanabilirTip[] = [
  'AktiviteKaydi', 'DegerlendirmeTarihcesi',
];

export function degismezMi(tip: string): boolean {
  return DEGISMEZ_TIPLER.includes(tip as SaklanabilirTip);
}

export const SURE_SONU_SECENEKLERI = ['oner', 'arsivle', 'imha_oner'] as const;
export type SureSonu = (typeof SURE_SONU_SECENEKLERI)[number];

export const SURE_SONU_SOZU: Record<SureSonu, string> = {
  oner: 'Yalnız raporla — hiçbir şey yapma',
  arsivle: 'Arşive taşımayı öner',
  imha_oner: 'İmha kararı önerisi aç',
};

/* ── Politika durumu ─────────────────────────────────────────────────── */

export type PolitikaDurumu = 'tanimli' | 'suresiz' | 'tanimsiz' | 'pasif';

export const POLITIKA_SOZU: Record<PolitikaDurumu, string> = {
  tanimli: 'saklama süresi tanımlı',
  /* Süresiz saklama bir KUSUR DEĞİLDİR ama ölçülmüş bir süre de
     değildir: bilinçli bir karardır ve ayrı yazılır. */
  suresiz: 'süresiz — bilinçli karar, dayanağı yazılı',
  tanimsiz: 'saklama politikası YOK',
  pasif: 'politika pasif',
};

export const POLITIKA_SINIFI: Record<PolitikaDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  tanimli: 'ok', suresiz: 'unk', tanimsiz: 'bd', pasif: 'unk',
};

export function politikaDurumu(p: {
  saklamaGun: number | null; aktif: boolean;
} | null): PolitikaDurumu {
  if (p === null) return 'tanimsiz';
  if (!p.aktif) return 'pasif';
  return p.saklamaGun === null ? 'suresiz' : 'tanimli';
}

/* ── Legal hold ──────────────────────────────────────────────────────── */

export type Hold = {
  varlikTipi: string;
  varlikId: string | null;
  tesisId: string | null;
  durum: string;
};

/**
 * Bu kayıt hukuki muhafaza altında mı?
 *
 * Hold kapsamı GENİŞTEN DARA doğru eşleşir: aile geneli (varlıkId
 * null), santral geneli, tek kayıt. Bir soruşturma çoğu zaman "şu
 * santralin bütün bulguları" gibi bir kümeyi kapsar ve tek tek kayıt
 * işaretlemek pratikte uygulanmaz.
 */
export function holdAltindaMi(o: {
  holdlar: readonly Hold[];
  varlikTipi: string;
  varlikId?: string | null;
  tesisId?: string | null;
}): boolean {
  return o.holdlar.some((h) => {
    if (h.durum !== 'aktif') return false;
    if (h.varlikTipi !== o.varlikTipi) return false;
    if (h.varlikId !== null && h.varlikId !== o.varlikId) return false;
    if (h.tesisId !== null && h.tesisId !== o.tesisId) return false;
    return true;
  });
}

/* ── İmha kapısı ─────────────────────────────────────────────────────── */

export type ImhaKarariSonucu =
  | { ok: true }
  | { ok: false; sebep: string };

/**
 * İmha önerisi açılabilir mi?
 *
 * Dört kapı, sırayla: (1) kayıt ailesi değişmez mi, (2) politika var
 * ve aktif mi, (3) süre tanımlı mı, (4) legal hold var mı.
 *
 * Legal hold EN SON bakılır ve bu bilinçlidir: hold'un varlığı bir
 * hata değil bir DURUMDUR, ve kullanıcı önce politikanın kendisiyle
 * ilgili sorunları görmelidir.
 */
export function imhaOnerisiKapisi(o: {
  varlikTipi: string;
  politika: { saklamaGun: number | null; aktif: boolean } | null;
  holdVar: boolean;
}): ImhaKarariSonucu {
  if (degismezMi(o.varlikTipi)) {
    return {
      ok: false,
      sebep: `"${o.varlikTipi}" DEĞİŞMEZ bir kayıt ailesidir: veritabanı `
        + 'tetikleyicisi silmeyi reddeder. Saklama süresi tanımlanabilir ama '
        + 'imha kararı uygulanamaz.',
    };
  }
  if (o.politika === null) {
    return {
      ok: false,
      sebep: 'Bu kayıt ailesi için saklama politikası tanımlı değil; '
        + 'dayanağı olmayan bir imha kararı verilemez.',
    };
  }
  if (!o.politika.aktif) {
    return { ok: false, sebep: 'Saklama politikası pasif.' };
  }
  if (o.politika.saklamaGun === null) {
    return {
      ok: false,
      sebep: 'Politika SÜRESİZ saklama diyor; imha edilecek bir kayıt yok.',
    };
  }
  if (o.holdVar) {
    return {
      ok: false,
      sebep: 'Bu kayıtlar HUKUKİ MUHAFAZA (legal hold) altında; saklama '
        + 'süresi dolsa bile imha edilemez.',
    };
  }
  return { ok: true };
}

/**
 * İmha kararı uygulanabilir mi?
 *
 * DÖRT GÖZ: öneren ile onaylayan aynı kişi olamaz. Toplu ve geri
 * alınamaz bir silmeyi tek kişinin kararına bırakmak, bu ürünün hiçbir
 * yerde yapmadığı şeydir.
 *
 * Hold uygulama anında YENİDEN sorulur: öneri ile uygulama arasında
 * bir soruşturma başlamış olabilir.
 */
export function imhaUygulamaKapisi(o: {
  durum: string;
  onerenId: string;
  onaylayanId: string | null;
  uygulayanId: string;
  holdVar: boolean;
}): ImhaKarariSonucu {
  if (o.durum !== 'onaylandi') {
    return {
      ok: false,
      sebep: `Karar "${o.durum}" durumunda; yalnız ONAYLANMIŞ karar uygulanır.`,
    };
  }
  if (o.onaylayanId === null) {
    return { ok: false, sebep: 'Kararı kimin onayladığı kayıtlı değil.' };
  }
  if (o.onaylayanId === o.onerenId) {
    return {
      ok: false,
      sebep: 'Öneren ile onaylayan aynı kişi — dört göz ilkesi. Toplu ve geri '
        + 'alınamaz bir imha tek kişinin kararına bırakılamaz.',
    };
  }
  if (o.holdVar) {
    return {
      ok: false,
      sebep: 'Karar onaylandıktan SONRA hukuki muhafaza konmuş; imha durduruldu.',
    };
  }
  return { ok: true };
}

/** Onay kapısı — öneren kendi önerisini onaylayamaz. */
export function imhaOnayKapisi(o: {
  durum: string; onerenId: string; onaylayanId: string;
}): ImhaKarariSonucu {
  if (o.durum !== 'oneri') {
    return { ok: false, sebep: `Karar "${o.durum}" durumunda; onaylanamaz.` };
  }
  if (o.onaylayanId === o.onerenId) {
    return {
      ok: false,
      sebep: 'Kendi imha önerinizi onaylayamazsınız — dört göz ilkesi.',
    };
  }
  return { ok: true };
}

/* ── Özet ────────────────────────────────────────────────────────────── */

export type SaklamaOzeti = {
  /** Politika tanımlanabilir kayıt ailesi sayısı — PAYDA. */
  tanimlanabilir: number;
  tanimli: number;
  suresiz: number;
  tanimsiz: number;
  aktifHold: number;
  bekleyenImha: number;
  /** Politika kapsama oranı. Payda sabittir (`SAKLANABILIR_TIPLER`) ve
      sıfır olamaz; bu yüzden oran hiç `null` dönmez. */
  kapsamaOrani: number;
};

export function saklamaOzeti(o: {
  politikalar: readonly { varlikTipi: string; saklamaGun: number | null; aktif: boolean }[];
  aktifHold: number;
  bekleyenImha: number;
}): SaklamaOzeti {
  const idx = new Map(o.politikalar.map((p) => [p.varlikTipi, p]));
  let tanimli = 0, suresiz = 0, tanimsiz = 0;
  for (const tip of SAKLANABILIR_TIPLER) {
    const d = politikaDurumu(idx.get(tip) ?? null);
    if (d === 'tanimli') tanimli++;
    else if (d === 'suresiz') suresiz++;
    else tanimsiz++;
  }
  const payda = SAKLANABILIR_TIPLER.length;
  return {
    tanimlanabilir: payda,
    tanimli,
    suresiz,
    tanimsiz,
    aktifHold: o.aktifHold,
    bekleyenImha: o.bekleyenImha,
    /* Süresiz de bir POLİTİKADIR ve kapsamaya sayılır: eksik olan
       politikasızlıktır, süresizlik değil. */
    kapsamaOrani: Math.round(((tanimli + suresiz) / payda) * 100),
  };
}

export function saklamaCumlesi(o: SaklamaOzeti): string {
  if (o.tanimsiz > 0) {
    return `${o.tanimsiz}/${o.tanimlanabilir} kayıt ailesinin saklama `
      + 'politikası YOK: ne kadar tutulduğu yazılı değil.';
  }
  if (o.aktifHold > 0) {
    return `${o.aktifHold} aktif hukuki muhafaza var; kapsadığı kayıtlar `
      + 'saklama süresi dolsa bile imha edilemez.';
  }
  if (o.bekleyenImha > 0) {
    return `${o.bekleyenImha} imha kararı karar bekliyor — hiçbiri `
      + 'uygulanmadı.';
  }
  return `${o.tanimlanabilir} kayıt ailesinin tamamında saklama politikası var.`;
}
