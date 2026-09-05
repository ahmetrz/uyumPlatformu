/* ═══════════════════════════════════════════════════════════════════════
   UY-39 · Değişiklik etki analizi — SAF KARAR

   ── ÖLÇÜLMÜŞ KUSUR ────────────────────────────────────────────────────
   Sürüm farkı (`SurumFarki`) yalnız AKTİFLEŞTİRMEDEN SONRA yazılıyordu
   (`lib/eylemler2/surum.ts → surumAktiflestir`). Yani kullanıcı "bu
   sürümü aktifleştirirsem ne olur" sorusunu SORAMIYORDU: cevabı ancak
   aktifleştirdikten sonra görüyordu ve aktifleştirme geri alınamaz.

   Bir framework sürümünü aktifleştirmek yüzlerce değerlendirmeyi yeniden
   açabilir. Önizlemesiz aktifleştirme, sonucu görülmeden verilen bir
   karardır.

   Bu dosya veritabanı ve React bilmez: aynı hesap hem ÖNİZLEMEDE hem
   aktifleştirmede kullanılır ki ikisi ayrışamasın. Önizlemenin
   gerçekten olacak şeyi göstermesinin tek garantisi, ikisinin AYNI
   fonksiyonu çağırmasıdır.

   ── ZİNCİRİN HALKALARI ────────────────────────────────────────────────
   Bir madde değiştiğinde etkilenenler tek katman değildir. Zincir
   sayılır ve her halka AYRI raporlanır; toplanıp tek sayıya
   indirilmez — "42 kayıt etkilenir" cümlesi, 40'ı kanıt bağı 2'si açık
   bulgu olduğunda yanıltıcıdır. */

export const DEGISIM_TIPLERI = ['yeni', 'degisti', 'kaldirildi', 'ayni'] as const;
export type DegisimTipi = (typeof DEGISIM_TIPLERI)[number];

export const DEGISIM_SOZU: Record<DegisimTipi, string> = {
  yeni: 'yeni madde', degisti: 'metin değişti',
  kaldirildi: 'madde kaldırıldı', ayni: 'değişmedi',
};

export const DEGISIM_SINIFI: Record<DegisimTipi, 'ok' | 'md' | 'bd' | 'unk'> = {
  yeni: 'md', degisti: 'md', kaldirildi: 'bd', ayni: 'ok',
};

export type MaddeGirdisi = {
  id: string;
  kod: string;
  baslik: string;
  metin: string;
};

export type FarkSatiri = {
  maddeKodu: string;
  degisimTipi: DegisimTipi;
  ozet: string | null;
  /** Değişen tarafın madde kimliği; `kaldirildi` hâlinde ESKİ maddedir. */
  maddeId: string;
};

/**
 * İki sürüm arasındaki fark.
 *
 * `ayni` satırları döndürülmez ve bu bilinçlidir: değişmeyen 300
 * maddeyi listelemek, değişen 4 maddeyi görünmez kılar. Değişmeyenlerin
 * sayısı ayrıca `ozet` içinde durur.
 */
export function surumFarki(o: {
  eski: readonly MaddeGirdisi[];
  yeni: readonly MaddeGirdisi[];
}): FarkSatiri[] {
  const eskiIdx = new Map(o.eski.map((m) => [m.kod, m]));
  const yeniIdx = new Map(o.yeni.map((m) => [m.kod, m]));
  const satirlar: FarkSatiri[] = [];

  for (const m of o.yeni) {
    const e = eskiIdx.get(m.kod);
    if (!e) {
      satirlar.push({
        maddeKodu: m.kod, degisimTipi: 'yeni', ozet: m.baslik, maddeId: m.id,
      });
    } else if (e.metin !== m.metin || e.baslik !== m.baslik) {
      satirlar.push({
        maddeKodu: m.kod,
        degisimTipi: 'degisti',
        ozet: e.baslik !== m.baslik ? `${e.baslik} → ${m.baslik}` : 'Metin güncellendi',
        maddeId: m.id,
      });
    }
  }
  for (const e of o.eski) {
    if (!yeniIdx.has(e.kod)) {
      satirlar.push({
        maddeKodu: e.kod, degisimTipi: 'kaldirildi', ozet: e.baslik, maddeId: e.id,
      });
    }
  }
  return satirlar.sort((a, b) => a.maddeKodu.localeCompare(b.maddeKodu, 'tr'));
}

/* ── Etki zinciri ────────────────────────────────────────────────────── */

/** Bir maddenin bugünkü ayak izi — halkaların HER BİRİ ayrı sayılır. */
export type MaddeAyakIzi = {
  maddeId: string;
  /** Bu maddenin santral × süreç değerlendirmeleri. */
  degerlendirme: number;
  /** Bunlardan kaçı gerçekten DEĞERLENDİRİLMİŞ (bir karar taşıyor). */
  kararliDegerlendirme: number;
  /** Kanıt bağı. */
  kanitBagi: number;
  /** Açık bulgu. */
  acikBulgu: number;
  /** Açık aksiyon. */
  acikAksiyon: number;
  /** Bu maddeye bağlı risk. */
  risk: number;
  /** Bu maddeye bağlı belge. */
  belge: number;
  /** Çapraz eşleme (başka regülasyonun maddesiyle eşdeğerlik). */
  esdegerlik: number;
  /** Aktif istisna. */
  istisna: number;
};

export const HALKA_ADLARI: Record<keyof Omit<MaddeAyakIzi, 'maddeId'>, string> = {
  degerlendirme: 'Değerlendirme',
  kararliDegerlendirme: 'Karar verilmiş değerlendirme',
  kanitBagi: 'Kanıt bağı',
  acikBulgu: 'Açık bulgu',
  acikAksiyon: 'Açık aksiyon',
  risk: 'Bağlı risk',
  belge: 'Bağlı belge',
  esdegerlik: 'Çapraz eşleme',
  istisna: 'Aktif istisna',
};

export type EtkiSatiri = FarkSatiri & {
  ayakIzi: MaddeAyakIzi;
  agirlik: EtkiAgirligi;
  /** Bu satır için ne olacağını anlatan tek cümle. */
  sonuc: string;
};

export type EtkiAgirligi = 'yok' | 'dusuk' | 'orta' | 'yuksek';

export const AGIRLIK_SOZU: Record<EtkiAgirligi, string> = {
  yok: 'kayıt etkilenmiyor',
  dusuk: 'yalnız bağlar etkilenir',
  orta: 'karar verilmiş değerlendirmeler etkilenir',
  yuksek: 'açık bulgu ya da aksiyon taşıyan maddeler etkilenir',
};

export const AGIRLIK_SINIFI: Record<EtkiAgirligi, 'ok' | 'md' | 'bd' | 'unk'> = {
  yok: 'ok', dusuk: 'unk', orta: 'md', yuksek: 'bd',
};

/**
 * Bir değişikliğin ağırlığı.
 *
 * Ağırlık bir PUAN DEĞİLDİR ve halkalar toplanmaz. Sıra sabittir:
 * açık bulgu/aksiyon > karar verilmiş değerlendirme > yalnız bağ. Bir
 * maddeyi kaldırmak, o maddede açık bir bulgu varken, o bulgunun
 * dayanağını ortadan kaldırır — en ağır hâl budur.
 */
export function etkiAgirligi(o: {
  degisimTipi: DegisimTipi;
  ayakIzi: MaddeAyakIzi;
}): EtkiAgirligi {
  const iz = o.ayakIzi;
  /* Yeni madde hiçbir mevcut kaydı etkilemez: ekleyecek, bozmayacak. */
  if (o.degisimTipi === 'yeni') return 'yok';
  if (iz.acikBulgu > 0 || iz.acikAksiyon > 0) return 'yuksek';
  if (iz.kararliDegerlendirme > 0) return 'orta';
  if (iz.degerlendirme > 0 || iz.kanitBagi > 0 || iz.risk > 0
    || iz.belge > 0 || iz.esdegerlik > 0 || iz.istisna > 0) return 'dusuk';
  return 'yok';
}

/**
 * Bu satırda ne olacak — kullanıcıya söylenen cümle.
 *
 * Cümle "ne olacağını" söyler, "ne olabileceğini" değil: belirsiz bir
 * uyarı ("etkilenebilir") kullanıcıyı karar veremez hâlde bırakır.
 */
export function etkiSonucu(o: {
  degisimTipi: DegisimTipi;
  ayakIzi: MaddeAyakIzi;
}): string {
  const iz = o.ayakIzi;
  if (o.degisimTipi === 'yeni') {
    return 'Yeni madde: kapsamdaki her santralde değerlendirilmemiş olarak açılır.';
  }
  if (o.degisimTipi === 'kaldirildi') {
    const parca: string[] = [];
    if (iz.kararliDegerlendirme > 0) {
      parca.push(`${iz.kararliDegerlendirme} karar verilmiş değerlendirme tarihçede kalır `
        + 'ama madde artık kapsamda görünmez');
    }
    if (iz.acikBulgu > 0) parca.push(`${iz.acikBulgu} açık bulgu dayanaksız kalır`);
    if (iz.acikAksiyon > 0) parca.push(`${iz.acikAksiyon} açık aksiyon dayanaksız kalır`);
    if (iz.esdegerlik > 0) parca.push(`${iz.esdegerlik} çapraz eşleme kırılır`);
    if (iz.istisna > 0) parca.push(`${iz.istisna} aktif istisna konusuz kalır`);
    return parca.length === 0
      ? 'Madde kaldırılır; bağlı hiçbir kayıt yok.'
      : `Madde kaldırılır — ${parca.join('; ')}.`;
  }
  /* degisti */
  const parca: string[] = [];
  if (iz.kararliDegerlendirme > 0) {
    parca.push(`${iz.kararliDegerlendirme} değerlendirme yeni metne göre `
      + 'yeniden gözden geçirilmeli');
  }
  if (iz.kanitBagi > 0) parca.push(`${iz.kanitBagi} kanıt bağı hâlâ geçerli mi denetlenmeli`);
  if (iz.acikBulgu > 0) parca.push(`${iz.acikBulgu} açık bulgunun dayanağı değişir`);
  return parca.length === 0
    ? 'Madde metni değişir; bağlı hiçbir kayıt yok.'
    : `Madde metni değişir — ${parca.join('; ')}.`;
}

/* ── Önizleme özeti ──────────────────────────────────────────────────── */

export type EtkiOzeti = {
  yeni: number;
  degisti: number;
  kaldirildi: number;
  degismeyen: number;
  yuksekEtki: number;
  ortaEtki: number;
  /** Halka halka toplam — TEK SAYIYA indirilmez. */
  halkalar: Record<keyof Omit<MaddeAyakIzi, 'maddeId'>, number>;
};

export function etkiOzeti(o: {
  satirlar: readonly EtkiSatiri[];
  degismeyen: number;
}): EtkiOzeti {
  const halkalar: EtkiOzeti['halkalar'] = {
    degerlendirme: 0, kararliDegerlendirme: 0, kanitBagi: 0, acikBulgu: 0,
    acikAksiyon: 0, risk: 0, belge: 0, esdegerlik: 0, istisna: 0,
  };
  for (const s of o.satirlar) {
    /* Yeni madde mevcut kayıtları etkilemez; halkalara SAYILMAZ, yoksa
       "42 kayıt etkilenir" sayısı olduğundan büyük çıkardı. */
    if (s.degisimTipi === 'yeni') continue;
    for (const anahtar of Object.keys(halkalar) as (keyof typeof halkalar)[]) {
      halkalar[anahtar] += s.ayakIzi[anahtar];
    }
  }
  return {
    yeni: o.satirlar.filter((s) => s.degisimTipi === 'yeni').length,
    degisti: o.satirlar.filter((s) => s.degisimTipi === 'degisti').length,
    kaldirildi: o.satirlar.filter((s) => s.degisimTipi === 'kaldirildi').length,
    degismeyen: o.degismeyen,
    yuksekEtki: o.satirlar.filter((s) => s.agirlik === 'yuksek').length,
    ortaEtki: o.satirlar.filter((s) => s.agirlik === 'orta').length,
    halkalar,
  };
}

/**
 * Önizlemenin tepesindeki tek cümle.
 *
 * Yüksek etki ÖNCE söylenir: "12 yeni madde eklenecek" cümlesi
 * doğrudur ama kullanıcının bilmesi gereken ilk şey, açık bir bulgunun
 * dayanağının kalkacağıdır.
 */
export function etkiCumlesi(o: EtkiOzeti): string {
  const toplamDegisim = o.yeni + o.degisti + o.kaldirildi;
  if (toplamDegisim === 0) {
    return 'Bu sürüm ile aktif sürüm arasında madde farkı yok.';
  }
  if (o.yuksekEtki > 0) {
    return `${o.yuksekEtki} maddede açık bulgu ya da aksiyon var; `
      + 'aktifleştirme bu kayıtların dayanağını değiştirir.';
  }
  if (o.kaldirildi > 0) {
    return `${o.kaldirildi} madde kaldırılıyor; kaldırılan maddenin `
      + 'değerlendirmeleri tarihçede kalır ama kapsamda görünmez.';
  }
  if (o.ortaEtki > 0) {
    return `${o.ortaEtki} maddede karar verilmiş değerlendirme var; `
      + 'yeni metne göre gözden geçirilmeleri gerekir.';
  }
  return `${o.yeni} yeni · ${o.degisti} değişen · ${o.kaldirildi} kaldırılan madde; `
    + 'bağlı kayıt yok.';
}
