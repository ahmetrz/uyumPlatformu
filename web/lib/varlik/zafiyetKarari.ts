/* ═══ OT-25 · CVE ↔ advisory ↔ sürüm korelasyonu — SAF MANTIK ══════════

   Denetim (2026-09-03) şunu ölçtü: `Zafiyet ↔ Varlik` bağı YALNIZ
   tarayıcının verdiği `assetKey` ile kuruluyordu. Yani zafiyet, ancak bir
   tarayıcı "bu cihazda var" dediğinde görünüyordu; üretici duyurusundan
   ve sürümden TÜRETİLEN bir bağ hiç yoktu. Bu dosya o bağı kurar.

   ── ÜÇ SONUÇ, VE ORTADAKİ NEDEN VAZGEÇİLMEZ ───────────────────────────
   `etkilenen` · `etkilenmeyen` · `karar_verilemedi`

   İkili bir sonuç (etkilenen / etkilenmeyen) bu alanda YANLIŞTIR. Sürümü
   okunamayan bir cihaz için "etkilenmeyen" demek, zafiyeti ekrandan
   tümüyle silmek demektir — kimse onu aramaz, kimse bakmaz. Üçüncü sonuç
   o cihazı görünür tutar ve sorumluluğu insana verir.

   ── EŞLEŞME İKİ AŞAMALIDIR: ÖNCE ÜRÜN, SONRA SÜRÜM ────────────────────
   Bir advisory "Siemens SIMATIC S7-1200, 4.0 ile 4.4 arası" der. Cihaz
   önce ÜRÜN olarak eşleşmeli (üretici + model ya da CPE), sonra sürümü
   aralıkta olmalı. Yalnız sürüme bakmak, ilgisiz üreticinin aynı sürüm
   numarasını taşıyan cihazını yakalardı.

   ── GÜVEN UYDURULMAZ ──────────────────────────────────────────────────
   `guven` yalnız eşleşmenin HANGİ alanlardan kurulduğuna bakar; olasılık
   hesabı değildir ve öyleymiş gibi sunulmaz. CPE eşleşmesi en güçlü,
   üretici+model orta, yalnız ürün adı en zayıftır. */

import { ayniKimlikMi, kimlikKatla } from '@/lib/alan/metin';
import { araliktaMi, karsilastir, surumCozumle, type SurumAraligi } from '@/lib/alan/surum';

export type AdvisoryUrunGirdi = {
  uretici: string | null;
  urunAdi: string | null;
  cpe: string | null;
  etkilenenAlt: string | null;
  etkilenenAltDahil: boolean;
  etkilenenUst: string | null;
  etkilenenUstDahil: boolean;
  duzeltilenSurum: string | null;
};

export type VarlikGirdi = {
  uretici: string | null;
  model: string | null;
  cpe: string | null;
  /** Değerlendirilecek sürüm — firmware ya da yazılım sürümü. */
  surum: string | null;
};

export type KorelasyonSonucu = {
  sonuc: 'etkilenen' | 'etkilenmeyen' | 'karar_verilemedi';
  /** 0–1; null = ölçülmedi. */
  guven: number | null;
  gerekce: string;
  /** Denetimde "neye bakıldı" sorusunun cevabı. */
  kanit: { alan: string; advisory: string | null; varlik: string | null }[];
};

/* Üretici ve model KİMLİKTİR, Türkçe metin değildir: karşılaştırma
   `lib/alan/metin.ts` ile yapılır. Türkçe katlama burada kusur üretiyordu
   — `'SIEMENS'.toLocaleLowerCase('tr')` `sıemens` verir ve `Siemens` ile
   eşleşmez; zafiyet ekranda hiç görünmezdi (ölçüldü). */
const ayniMi = ayniKimlikMi;

/* CPE 2.3 alanları `:` ile ayrılır; ilk beş alan (part, vendor, product,
   version, update) kimliği taşır. Sürüm alanı `*` olabilir — o zaman
   sürüm CPE'den değil, aralıktan sorulur. */
function cpeKimligi(cpe: string | null): string | null {
  if (!cpe) return null;
  const p = cpe.split(':');
  if (p.length < 5) return null;
  return kimlikKatla(p.slice(0, 5).join(':'));
}

/** Ürün eşleşmesi — sürüm SORULMADAN önce. */
export function urunEslesiyorMu(
  urun: AdvisoryUrunGirdi, varlik: VarlikGirdi,
): { eslesti: boolean; yontem: 'cpe' | 'uretici_model' | 'urun_adi' | null; guven: number } {
  const aCpe = cpeKimligi(urun.cpe);
  const vCpe = cpeKimligi(varlik.cpe);
  if (aCpe && vCpe && aCpe === vCpe) return { eslesti: true, yontem: 'cpe', guven: 0.95 };

  if (urun.uretici && ayniMi(urun.uretici, varlik.uretici)) {
    if (urun.urunAdi && ayniMi(urun.urunAdi, varlik.model)) {
      return { eslesti: true, yontem: 'uretici_model', guven: 0.8 };
    }
    /* Üretici tuttu ama model tutmadı: advisory model belirtmiyorsa
       üreticinin TÜM ürünlerini kapsıyor olabilir — zayıf eşleşme. */
    if (!urun.urunAdi) return { eslesti: true, yontem: 'urun_adi', guven: 0.35 };
    return { eslesti: false, yontem: null, guven: 0 };
  }

  if (!urun.uretici && urun.urunAdi && ayniMi(urun.urunAdi, varlik.model)) {
    return { eslesti: true, yontem: 'urun_adi', guven: 0.4 };
  }
  return { eslesti: false, yontem: null, guven: 0 };
}

/** Advisory ürün satırını sürüm aralığına çevirir. */
export function urunAraligi(urun: AdvisoryUrunGirdi): SurumAraligi {
  return {
    alt: urun.etkilenenAlt,
    altDahil: urun.etkilenenAltDahil,
    ust: urun.etkilenenUst,
    ustDahil: urun.etkilenenUstDahil,
  };
}

/**
 * Bu varlık bu advisory ürününden etkileniyor mu?
 *
 * Sıra: ürün eşleşmesi → düzeltilmiş sürüm → aralık.
 */
export function korelasyonKarariVer(
  urun: AdvisoryUrunGirdi, varlik: VarlikGirdi,
): KorelasyonSonucu {
  const kanit = [
    { alan: 'uretici', advisory: urun.uretici, varlik: varlik.uretici },
    { alan: 'urun', advisory: urun.urunAdi, varlik: varlik.model },
    { alan: 'cpe', advisory: urun.cpe, varlik: varlik.cpe },
    { alan: 'surum', advisory: `${urun.etkilenenAlt ?? '—'} … ${urun.etkilenenUst ?? '—'}`, varlik: varlik.surum },
  ];

  const es = urunEslesiyorMu(urun, varlik);
  if (!es.eslesti) {
    return {
      sonuc: 'etkilenmeyen',
      guven: 0.9,
      gerekce: 'Ürün eşleşmedi: advisory bu üretici/model için değil.',
      kanit,
    };
  }

  const cozulen = surumCozumle(varlik.surum);
  if (!cozulen) {
    return {
      sonuc: 'karar_verilemedi',
      guven: null,
      gerekce: varlik.surum
        ? `Ürün eşleşti ama sürüm çözümlenemedi ("${varlik.surum}") — etkilenip etkilenmediği BİLİNMİYOR.`
        : 'Ürün eşleşti ama cihazda sürüm kaydı yok — etkilenip etkilenmediği BİLİNMİYOR.',
      kanit,
    };
  }

  /* Düzeltilmiş sürüm ayrı sorulur: advisory aralık vermeyip yalnız
     "şu sürümde düzeltildi" diyebilir. */
  if (urun.duzeltilenSurum) {
    const c = karsilastir(varlik.surum, urun.duzeltilenSurum);
    if (c === null) {
      return {
        sonuc: 'karar_verilemedi',
        guven: null,
        gerekce: `Kurulu sürüm ${cozulen.ham} ile düzeltilen sürüm ${urun.duzeltilenSurum} karşılaştırılamadı.`,
        kanit,
      };
    }
    if (c >= 0) {
      return {
        sonuc: 'etkilenmeyen',
        guven: es.guven,
        gerekce: `Kurulu sürüm ${cozulen.ham}, düzeltilen sürüm ${urun.duzeltilenSurum} ile aynı ya da yeni.`,
        kanit,
      };
    }
    /* Düzeltilenden eski ve aralık yoksa etkilenmiş sayılır. */
    if (urun.etkilenenAlt === null && urun.etkilenenUst === null) {
      return {
        sonuc: 'etkilenen',
        guven: es.guven,
        gerekce: `Kurulu sürüm ${cozulen.ham}, düzeltilen sürüm ${urun.duzeltilenSurum} sürümünden eski.`,
        kanit,
      };
    }
  }

  const icinde = araliktaMi(varlik.surum, urunAraligi(urun));
  if (icinde === null) {
    return {
      sonuc: 'karar_verilemedi',
      guven: null,
      gerekce: `Kurulu sürüm ${cozulen.ham}, etkilenen aralıkla karşılaştırılamadı.`,
      kanit,
    };
  }
  return icinde
    ? {
      sonuc: 'etkilenen',
      guven: es.guven,
      gerekce: `Ürün eşleşti (${es.yontem}) ve kurulu sürüm ${cozulen.ham} etkilenen aralıkta.`,
      kanit,
    }
    : {
      sonuc: 'etkilenmeyen',
      guven: es.guven,
      gerekce: `Ürün eşleşti (${es.yontem}) ama kurulu sürüm ${cozulen.ham} etkilenen aralığın dışında.`,
      kanit,
    };
}

/**
 * Bir varlık için birden çok advisory ürün satırını değerlendirir ve
 * EN AĞIR sonucu döner.
 *
 * Ağırlık sırası: `etkilenen` > `karar_verilemedi` > `etkilenmeyen`.
 * `karar_verilemedi`nin `etkilenmeyen`den ağır olması bilinçlidir: bir
 * satırda karar verilemiyorsa, başka bir satırın "etkilenmiyor" demesi
 * o belirsizliği ortadan kaldırmaz.
 */
export function enAgirSonuc(sonuclar: readonly KorelasyonSonucu[]): KorelasyonSonucu | null {
  if (sonuclar.length === 0) return null;
  const sira = { etkilenen: 3, karar_verilemedi: 2, etkilenmeyen: 1 } as const;
  return sonuclar.reduce((a, b) => (sira[b.sonuc] > sira[a.sonuc] ? b : a));
}
