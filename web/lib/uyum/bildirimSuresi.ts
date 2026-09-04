/* ═══════════════════════════════════════════════════════════════════════
   UY-63 · Resmî bildirim süresi — SAF KARAR

   ── ÖLÇÜLMÜŞ KUSUR ────────────────────────────────────────────────────
   `Olay.bildirimGerekli` ve `bildirimTarihi` alanları VARDI: bir insan
   işaretliyor, bir tarih yazılıyordu. Eksik olan tek şey SÜREYDİ.
   "Ne zamana kadar bildirmeliydik" sorusunun cevabı hiçbir yerde yoktu;
   dolayısıyla süre aşımı da kendiliğinden görünmüyordu. Bir olay
   gecikmeli bildirildiğinde bunu ancak birisi elle fark ediyordu.

   ── SÜRELER ÜRÜNLE GELMEZ ─────────────────────────────────────────────
   Kaç saat içinde bildirileceği mevzuattan gelir ve kurumun tabi olduğu
   düzenlemeye göre değişir. Örnek bir süre yazmak, yanlış bir saatle
   çalışan bir sayaç bırakırdı: kimse değiştirmez ve ürün yanlış anda
   "geciktiniz" ya da daha kötüsü "vaktiniz var" der.

   ── SAAT OLAYIN BAŞLANGICINDAN İŞLER ──────────────────────────────────
   Kaydın açıldığı andan değil. Bir olay üç gün sonra fark edilip
   kaydedilmiş olabilir; yükümlülük o üç günü beklemez.

   Bu dosya veritabanı ve React bilmez. */

/** Şiddet merdiveni — yükümlülük eşiği bu sırayla karşılaştırılır. */
export const SIDDET_SIRASI = ['dusuk', 'orta', 'yuksek', 'kritik'] as const;
export type Siddet = (typeof SIDDET_SIRASI)[number];

export const SIDDET_ETIKETI: Record<Siddet, string> = {
  dusuk: 'Düşük', orta: 'Orta', yuksek: 'Yüksek', kritik: 'Kritik',
};

/** Bitişe bu kadar kalınca "süre daralıyor" denir. */
export const UYARI_ORANI = 0.5;

export type Yukumluluk = {
  id: string;
  kod: string;
  ad: string;
  regulasyonId: string | null;
  asgariSiddet: string;
  sureSaat: number;
  merci: string;
  aktif: boolean;
};

/** Şiddet eşiği karşılanıyor mu? Tanınmayan şiddet eşiği KARŞILAMAZ. */
export function siddetYeterli(olay: string, asgari: string): boolean {
  const a = SIDDET_SIRASI.indexOf(olay as Siddet);
  const b = SIDDET_SIRASI.indexOf(asgari as Siddet);
  if (a < 0 || b < 0) return false;
  return a >= b;
}

/**
 * Bu olaya hangi yükümlülük uyar?
 *
 * Birden fazla kural uyuyorsa EN KISA süre kazanır: en dar yükümlülük
 * bağlayıcıdır. En uzunu seçmek, kurumu kendi kurallarından birine
 * göre geciktirirdi.
 *
 * Regülasyona bağlı kural yalnız o regülasyon olayın kapsamındaysa
 * uyar; regülasyonsuz kural her olaya uyar (kurum geneli kural).
 */
export function uyanYukumluluk(o: {
  siddet: string;
  regulasyonIdleri: readonly string[];
  kurallar: readonly Yukumluluk[];
}): Yukumluluk | null {
  const uyanlar = o.kurallar.filter((k) => {
    if (!k.aktif) return false;
    if (!siddetYeterli(o.siddet, k.asgariSiddet)) return false;
    if (k.regulasyonId === null) return true;
    return o.regulasyonIdleri.includes(k.regulasyonId);
  });
  if (uyanlar.length === 0) return null;
  return uyanlar.reduce((a, b) => (b.sureSaat < a.sureSaat ? b : a));
}

/** Son bildirim anı — olayın BAŞLANGICINDAN sayılır. */
export function sonTarih(baslangic: number, sureSaat: number): number {
  return baslangic + sureSaat * 3_600_000;
}

/* ── Durum ───────────────────────────────────────────────────────────── */

export type BildirimDurumu =
  | 'yukumluluk_yok' | 'sure_isliyor' | 'sure_daraliyor'
  | 'GECIKTI' | 'bildirildi' | 'gec_bildirildi';

export const BILDIRIM_SOZU: Record<BildirimDurumu, string> = {
  yukumluluk_yok: 'bildirim yükümlülüğü doğmadı',
  sure_isliyor: 'süre işliyor',
  sure_daraliyor: 'süre daralıyor',
  GECIKTI: 'SÜRE GEÇTİ — hâlâ bildirilmedi',
  bildirildi: 'süresinde bildirildi',
  /* Geç bildirim, bildirilmemiş sayılmaz ama "tamam" da değildir:
     yükümlülük ihlal edilmiştir ve kayıt bunu saklamaz. */
  gec_bildirildi: 'GEÇ bildirildi',
};

export const BILDIRIM_SINIFI: Record<BildirimDurumu, 'ok' | 'md' | 'bd' | 'unk' | 'pl'> = {
  yukumluluk_yok: 'pl',
  sure_isliyor: 'ok',
  sure_daraliyor: 'md',
  GECIKTI: 'bd',
  bildirildi: 'ok',
  gec_bildirildi: 'bd',
};

export type BildirimKarari = {
  durum: BildirimDurumu;
  /** Son bildirim anı; yükümlülük yoksa null. */
  sonTarih: number | null;
  /** Kalan süre (dakika). Geçmişse negatif; yükümlülük yoksa null. */
  kalanDakika: number | null;
  yukumluluk: Yukumluluk | null;
};

/**
 * Bir olayın bildirim durumu.
 *
 * ── ELLE İŞARETLENMİŞ YÜKÜMLÜLÜK KURALI EZER ──────────────────────────
 * `bildirimGerekli === false` yazan bir olayda kural uysa bile
 * yükümlülük doğmaz: insan bakmış ve "bu kapsamda değil" demiştir.
 * Ama `bildirimGerekli === true` yazıp kural bulunamazsa süre
 * hesaplanamaz ve durum "süre işliyor" DEĞİL, yükümlülük yok görünür —
 * ürün olmayan bir saati işletmez.
 */
export function bildirimKarari(o: {
  siddet: string;
  baslangic: number;
  simdi: number;
  bildirimGerekli: boolean | null;
  bildirimTarihi: number | null;
  regulasyonIdleri: readonly string[];
  kurallar: readonly Yukumluluk[];
  uyariOrani?: number;
}): BildirimKarari {
  const bos: BildirimKarari = {
    durum: 'yukumluluk_yok', sonTarih: null, kalanDakika: null, yukumluluk: null,
  };
  if (o.bildirimGerekli === false) return bos;

  const k = uyanYukumluluk({
    siddet: o.siddet, regulasyonIdleri: o.regulasyonIdleri, kurallar: o.kurallar,
  });
  if (!k) return bos;

  const son = sonTarih(o.baslangic, k.sureSaat);
  const kalan = Math.round((son - o.simdi) / 60_000);

  if (o.bildirimTarihi !== null) {
    return {
      durum: o.bildirimTarihi <= son ? 'bildirildi' : 'gec_bildirildi',
      sonTarih: son,
      kalanDakika: Math.round((son - o.bildirimTarihi) / 60_000),
      yukumluluk: k,
    };
  }
  if (o.simdi > son) {
    return { durum: 'GECIKTI', sonTarih: son, kalanDakika: kalan, yukumluluk: k };
  }
  const esik = k.sureSaat * 60 * (o.uyariOrani ?? UYARI_ORANI);
  return {
    durum: kalan <= esik ? 'sure_daraliyor' : 'sure_isliyor',
    sonTarih: son,
    kalanDakika: kalan,
    yukumluluk: k,
  };
}

/* ── Kural kapısı ────────────────────────────────────────────────────── */

export type Karar = { ok: true } | { ok: false; sebep: string };

export function kuralKapisi(o: {
  sureSaat: number; asgariSiddet: string; dayanak: string; merci: string;
}): Karar {
  if (!Number.isInteger(o.sureSaat) || o.sureSaat <= 0) {
    return { ok: false, sebep: 'Bildirim süresi en az 1 saat olmalı.' };
  }
  if (o.sureSaat > 24 * 90) {
    return { ok: false, sebep: 'Bildirim süresi 90 günü aşamaz; kural yanlış girilmiş olmalı.' };
  }
  if (!SIDDET_SIRASI.includes(o.asgariSiddet as Siddet)) {
    return { ok: false, sebep: `Tanınmayan şiddet eşiği: "${o.asgariSiddet}".` };
  }
  /* Dayanaksız bir süre, kimsenin savunamayacağı bir sayaçtır: denetimde
     "bu 24 saat nereden geliyor" sorusunun cevabı olmalı. */
  if (!o.dayanak.trim()) {
    return {
      ok: false,
      sebep: 'Dayanak zorunlu: bu sürenin hangi mevzuat maddesinden geldiği '
        + 'yazılmadan kural savunulamaz.',
    };
  }
  if (!o.merci.trim()) {
    return { ok: false, sebep: 'Bildirimin yapılacağı merci yazılmalı.' };
  }
  return { ok: true };
}

/* ── Özet ────────────────────────────────────────────────────────────── */

export type BildirimOzeti = {
  toplam: number;
  yukumlulukVar: number;
  sureIsliyor: number;
  daraliyor: number;
  gecikti: number;
  bildirildi: number;
  gecBildirildi: number;
};

export function bildirimOzeti(kararlar: readonly BildirimKarari[]): BildirimOzeti {
  const say = (d: BildirimDurumu) => kararlar.filter((k) => k.durum === d).length;
  return {
    toplam: kararlar.length,
    yukumlulukVar: kararlar.filter((k) => k.yukumluluk !== null).length,
    sureIsliyor: say('sure_isliyor'),
    daraliyor: say('sure_daraliyor'),
    gecikti: say('GECIKTI'),
    bildirildi: say('bildirildi'),
    gecBildirildi: say('gec_bildirildi'),
  };
}

export function bildirimCumlesi(o: BildirimOzeti): string {
  if (o.gecikti > 0) {
    return `${o.gecikti} olayın bildirim süresi GEÇTİ ve hâlâ bildirilmedi.`;
  }
  if (o.daraliyor > 0) {
    return `${o.daraliyor} olayda bildirim süresi daralıyor.`;
  }
  if (o.gecBildirildi > 0) {
    return `${o.gecBildirildi} olay süresinden SONRA bildirilmiş; kayıt bunu saklamıyor.`;
  }
  if (o.yukumlulukVar === 0) {
    return 'Açık olayların hiçbirinde bildirim yükümlülüğü doğmadı.';
  }
  return `${o.yukumlulukVar} olayda bildirim yükümlülüğü var; süresi geçen yok.`;
}
