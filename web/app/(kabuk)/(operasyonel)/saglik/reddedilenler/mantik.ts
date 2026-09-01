import type { Durum } from '@/components/kabuk/temel';

/* Reddedilen kayıt (dead-letter) kuyruğunun saf mantığı. Veritabanına,
   React'e ve server-only'ye dokunmaz.

   Bu kuyruk /saglik'ın içine SIĞMADIĞI için ayrı bir rotada yaşıyor:
   /saglik zaten dört metrik ve dört kayıt ailesi taşıyor; beşincisini
   eklemek Atlas'ın yoğunluk sözleşmesini (en fazla 4 metrik, 5–9 görünür
   satır) kırardı. Kuyruğun VARLIĞI /saglik'ta bir satırla görünür,
   kendisi burada incelenir. */

export type RedSatiri = {
  id: string;
  kaynakSistem: string;
  kaynakKayitId: string | null;
  /** sema | normalize | esleme | dogrulama | eslesme | kapsam | yazma */
  asama: string;
  sebep: string;
  durum: string;
  connectorAdi: string | null;
  inceleyen: string | null;
  incelemeNotu: string | null;
  incelemeZamani: string | null;
  olusturuldu: string;
  /** ham kayıt — SIR İÇERMEZ (çekirdek maskeleyerek yazar) */
  hamJson: string | null;
};

/* AŞAMA SÖZLÜĞÜ — `esleme` ile `eslesme` AYRI şeylerdir ve karıştırılmaları
   kaydın hangi adımda düştüğünü yanlış gösterir:
     esleme  = eşleme profili kaynağın alanlarını hedef alanlara çevirir
               (ör. tanınmayan enum değeri) → kural düzeltilir.
     eslesme = normalleşmiş kayıt CMDB'deki bir varlıkla eşleştirilir
               (ör. hiçbir anahtar tutmadı) → veri ya da varlık düzeltilir.
   İkisi aynı yazılırsa kullanıcı yanlış yerde arar. */
export const ASAMA_SOZU: Record<string, string> = {
  sema: 'Şema',
  normalize: 'Normalizasyon',
  esleme: 'Eşleme profili (alan çevirisi)',
  dogrulama: 'Doğrulama',
  eslesme: 'CMDB eşleştirmesi',
  kapsam: 'Kapsam',
  yazma: 'Yazma',
};

export const ASAMA_ACIKLAMA: Record<string, string> = {
  sema: 'Kaynağın gönderdiği yük beklenen şemaya uymadı.',
  normalize: 'Ham kayıt normalize edilemedi — alan biçimi tanınmadı.',
  esleme: 'Eşleme profili kaynağın alanını hedef alana çeviremedi; '
    + 'düzeltme profil kuralındadır.',
  dogrulama: 'Kayıt iş kuralı doğrulamasından geçemedi (eksik köken, '
    + 'eşleme anahtarı yok…).',
  eslesme: 'Kayıt normalleşti ama CMDB\'de eşleşecek bir varlık bulunamadı; '
    + 'düzeltme veride ya da envanterdedir.',
  kapsam: 'Kayıt connector\'ın yazma kapsamı dışındaki bir santrale aitti.',
  yazma: 'Kayıt yazılırken hata alındı.',
};

export function asamaYazisi(asama: string): string {
  return ASAMA_SOZU[asama] ?? asama;
}

export const RED_DURUM_SOZU: Record<string, string> = {
  acik: 'Açık — inceleme bekliyor',
  incelendi: 'İncelendi',
  duzeltildi: 'Düzeltildi',
  yok_sayildi: 'Yok sayıldı',
};

/**
 * Satır işaretçisi.
 *   bd  → açık: kayıp kayıt, kimse bakmamış
 *   md  → incelendi: bakılmış ama düzeltilmemiş
 *   unk → yok sayıldı: kayıt bilerek dışarıda bırakıldı; "çözüldü" DEĞİL
 *   ok  → düzeltildi
 *
 * `yok_sayildi` bilinçli olarak `ok` DEĞİLDİR: yok sayılan kayıt hâlâ
 * kaynakta yanlış duruyor olabilir; onu yeşil göstermek, veri kaybını
 * çözülmüş gibi göstermek olurdu.
 */
export function redImi(r: { durum: string }): Durum {
  if (r.durum === 'duzeltildi') return 'ok';
  if (r.durum === 'incelendi') return 'md';
  if (r.durum === 'yok_sayildi') return 'unk';
  return 'bd';
}

export function redToplanabilir(r: { durum: string }): boolean {
  return r.durum === 'duzeltildi';
}

const RED_AGIRLIGI: Record<Durum, number> = {
  bd: 0, md: 1, unk: 2, pl: 3, ok: 4, tamam: 5,
};

export function redSirala(satirlar: RedSatiri[]): RedSatiri[] {
  return [...satirlar].sort((a, b) =>
    RED_AGIRLIGI[redImi(a)] - RED_AGIRLIGI[redImi(b)]
    || b.olusturuldu.localeCompare(a.olusturuldu));
}

export type RedMetrikleri = {
  acik: number;
  incelendi: number;
  yokSayildi: number;
  duzeltildi: number;
  /** en çok kayıt düşüren aşama; null = hiç kayıt yok */
  baskinAsama: { asama: string; adet: number } | null;
};

export function redMetrikleri(satirlar: RedSatiri[]): RedMetrikleri {
  const kova = new Map<string, number>();
  for (const r of satirlar) {
    if (r.durum === 'acik') kova.set(r.asama, (kova.get(r.asama) ?? 0) + 1);
  }
  const sirali = [...kova.entries()].sort((a, b) => b[1] - a[1]);
  return {
    acik: satirlar.filter((r) => r.durum === 'acik').length,
    incelendi: satirlar.filter((r) => r.durum === 'incelendi').length,
    yokSayildi: satirlar.filter((r) => r.durum === 'yok_sayildi').length,
    duzeltildi: satirlar.filter((r) => r.durum === 'duzeltildi').length,
    baskinAsama: sirali[0] ? { asama: sirali[0][0], adet: sirali[0][1] } : null,
  };
}

/** Karar düğmesinin açılma koşulu: 'acik'e geri almak dışında NOT zorunlu. */
export function redKararPasif(
  secim: string[], durum: string, not: string, yazabilir: boolean, bekliyor: boolean,
): boolean {
  if (!yazabilir || bekliyor || secim.length === 0) return true;
  return durum !== 'acik' && not.trim().length === 0;
}
