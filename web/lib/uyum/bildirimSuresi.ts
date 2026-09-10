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
  /** R10 · NULLABLE: mevzuat süreyi belirlememiş olabilir. Sıfır DEĞİLDİR. */
  sureSaat: number | null;
  merci: string;
  aktif: boolean;
  /** `olay` | `takvim` — R10+. Tip bunu TAŞIMAK ZORUNDA: taşımadığı sürece
      süzgeci yazan kişi alanın varlığından habersiz kalıyordu. */
  tetikleyici: string;
};

/**
 * Bu yükümlülük bir OLAYLA uyanır mı?
 *
 * ── NEDEN OLUMLU YÜKLEM ───────────────────────────────────────────────
 * `!== 'takvim'` yazmak bugün aynı sonucu verirdi ama yarın YENİ bir
 * tetikleyici türü eklendiğinde (örn. `denetim`) o tür olay motoruna
 * SESSİZCE girerdi. Olumlu yüklem, tanımadığı her türü dışarıda tutar —
 * "bilinmeyen ≠ sıfır" kuralının tetikleyici alanındaki karşılığı.
 */
export const olaylaUyanir = (tetikleyici: string): boolean => tetikleyici === 'olay';

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
 * SÜRESİZ KURAL (R10 · `sureSaat === null`) yarışa girmez ama YOK da
 * sayılmaz: süreli bir kural varsa o kazanır, yalnız süresizler uyuyorsa
 * en küçük kodlu süresiz döner ve karar `sure_belirsiz` olur. Süresizi
 * "sonsuz süre" sayıp yarışa sokmak, geri sayımı olan bir kuralı
 * bastırmasına yol açardı; hiç saymamak ise yükümlülüğü görünmez yapardı.
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
    /* TAKVİM tetikli yükümlülüğün OLAYLA İLİŞKİSİ YOKTUR. */
    if (!olaylaUyanir(k.tetikleyici)) return false;
    if (!siddetYeterli(o.siddet, k.asgariSiddet)) return false;
    if (k.regulasyonId === null) return true;
    return o.regulasyonIdleri.includes(k.regulasyonId);
  });
  if (uyanlar.length === 0) return null;
  const sureliler = uyanlar.filter((k): k is Yukumluluk & { sureSaat: number } => k.sureSaat !== null);
  if (sureliler.length > 0) return sureliler.reduce((a, b) => (b.sureSaat < a.sureSaat ? b : a));
  return uyanlar.slice().sort((a, b) => a.kod.localeCompare(b.kod, 'tr'))[0];
}

/** Son bildirim anı — olayın BAŞLANGICINDAN sayılır. */
export function sonTarih(baslangic: number, sureSaat: number): number {
  return baslangic + sureSaat * 3_600_000;
}

/* ── Durum ───────────────────────────────────────────────────────────── */

export type BildirimDurumu =
  | 'yukumluluk_yok' | 'sure_belirsiz' | 'sure_isliyor' | 'sure_daraliyor'
  | 'GECIKTI' | 'bildirildi' | 'gec_bildirildi';

export const BILDIRIM_SOZU: Record<BildirimDurumu, string> = {
  yukumluluk_yok: 'bildirim yükümlülüğü doğmadı',
  /* Yükümlülük VAR, süre YOK. "Süre işliyor" demek olmayan bir sayacı
     ima ederdi; "yükümlülük yok" demek ise yükümlülüğü silerdi. */
  sure_belirsiz: 'yükümlülük var · süre mevzuatta belirlenmedi',
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
  /* BİLİNMEYEN — yeşil DEĞİL: süresi belirsiz bir yükümlülük "yolunda"
     değildir, ölçülemeyendir. */
  sure_belirsiz: 'unk',
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

  /* SÜRE YOKSA SAYAÇ YOK. Buraya bir varsayılan koymak (24 saat, 72
     saat…) mevzuatın söylemediği bir şeyi ürünün söylemesi olurdu. */
  if (k.sureSaat === null) {
    return {
      durum: o.bildirimTarihi !== null ? 'bildirildi' : 'sure_belirsiz',
      sonTarih: null,
      kalanDakika: null,
      yukumluluk: k,
    };
  }

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
  sureSaat: number | null; asgariSiddet: string; dayanak: string; merci: string;
}): Karar {
  /* R10 · SÜRE BOŞ BIRAKILABİLİR ve bu bir eksiklik değil bir BEYANDIR:
     "mevzuat süreyi belirlemedi". Boş bırakan kural yine dayanak ve merci
     ister — hangi maddeye dayandığı ve kime bildirileceği bilinmeden
     yükümlülük savunulamaz. Boş süre 0 ile aynı şey değildir; sıfır hâlâ
     reddedilir çünkü "sıfır saat" bir sayaçtır ve daha doğduğu anda
     geçmiştir. */
  if (o.sureSaat !== null) {
    if (!Number.isInteger(o.sureSaat) || o.sureSaat <= 0) {
      return {
        ok: false,
        sebep: 'Bildirim süresi en az 1 saat olmalı. Mevzuat süre belirlemediyse '
          + 'alanı BOŞ bırakın: sıfır saat, doğduğu anda geçmiş bir sayaçtır.',
      };
    }
    if (o.sureSaat > 24 * 90) {
      return { ok: false, sebep: 'Bildirim süresi 90 günü aşamaz; kural yanlış girilmiş olmalı.' };
    }
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
  /** Yükümlülüğü olan ama süresi mevzuatta belirlenmemiş olaylar. */
  sureBelirsiz: number;
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
    sureBelirsiz: say('sure_belirsiz'),
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
  if (o.sureBelirsiz > 0 && o.sureIsliyor === 0) {
    return `${o.sureBelirsiz} olayda yükümlülük var ama süre mevzuatta belirlenmedi.`;
  }
  return `${o.yukumlulukVar} olayda bildirim yükümlülüğü var; süresi geçen yok.`;
}
