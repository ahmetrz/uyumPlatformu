/* ═══ OT-22 · Firmware uyum kararı — SAF MANTIK ════════════════════════

   Bu dosyada `db` YOKTUR. Karar saf bir fonksiyondur; motor onu DB'den
   okuduğu satırlarla çağırır. Ayrım işe yarar: kararın kendisi testte
   veritabanı olmadan, bütün kenar durumlarıyla sınanabilir.

   ── DENETİMDE ÖLÇÜLEN BAŞLANGIÇ NOKTASI ───────────────────────────────
   Firmware bugüne kadar `Varlik.firmware` adlı TEK bir serbest metin
   alanıydı. Uyum hiç hesaplanmıyordu — yani "unknown compliant sayılıyor
   mu?" sorusunun cevabı "hayır, çünkü hiçbir şey sayılmıyor"du. Firmware'i
   boş olan varlık `bilinmeyenAlanlar()` listesine bile girmiyordu.

   ── KARARIN DÖRT SONUCU VE BİRİ NEDEN "KARAR VERİLEMEDİ" ──────────────
   `uyumlu` · `eski` · `bilinen_kotu` · `taban_yok` · `karar_verilemedi`

   Sonuncusu birinci sınıf bir sonuçtur ve `uyumlu`nun eş anlamlısı
   DEĞİLDİR. Sürüm çözümlenemediğinde (`V-BILINMIYOR`, boş, `latest`)
   cihazın taban sürümü karşılayıp karşılamadığı BİLİNMEZ. Bunu `uyumlu`
   saymak, ölçülmemiş bir cihazı yeşil göstermek olurdu — ürünün
   "bilinmeyen ≠ sıfır" kuralının firmware'deki tam karşılığı.

   ── BİLİNEN KÖTÜ SÜRÜM, "ESKİ"DEN ÖNCE GELİR ──────────────────────────
   Bir sürüm hem tabandan yeni hem de bilinen kötü olabilir (üretici bir
   sürümü geri çektiğinde tam da bu olur). Sıralama bilinçlidir: önce
   bilinen kötü listesi sorulur. Tersi olsaydı geri çekilmiş bir firmware
   "uyumlu" görünürdü. */

import { asgariyiKarsilarMi, karsilastir, surumCozumle } from '@/lib/alan/surum';

export type FirmwareTemeliGirdi = {
  onayliSurum: string;
  /** null = yalnız onaylı sürüm kabul edilir. */
  asgariSurum: string | null;
  /** Virgülle ayrılmış geri çekilmiş/kusurlu sürümler. */
  bilinenKotuSurumler: string | null;
};

export type FirmwareKarari = {
  durum: 'uyumlu' | 'eski' | 'bilinen_kotu' | 'taban_yok' | 'karar_verilemedi';
  /** Kullanıcıya gösterilecek tek cümlelik gerekçe. */
  gerekce: string;
};

/** Virgüllü listeyi temizler; boş girdiler düşer. */
export function kotuSurumListesi(ham: string | null | undefined): string[] {
  if (!ham) return [];
  return ham.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Kurulu firmware, tabana göre uyumlu mu?
 *
 * @param kurulu Cihazdaki sürüm; null/boş = okunamadı.
 * @param temel  Sınıfa (tür + üretici + model) bağlı taban; null = taban yok.
 */
export function firmwareKarariVer(
  kurulu: string | null | undefined,
  temel: FirmwareTemeliGirdi | null,
): FirmwareKarari {
  if (!temel) {
    /* Taban yokluğu bir UYUM DEĞİL, bir eksiktir. `uyumlu` demek,
       hiç kural yazılmamış bir cihazı kurallara uyuyor saymaktır. */
    return {
      durum: 'taban_yok',
      gerekce: 'Bu varlık sınıfı için onaylı firmware tabanı tanımlanmamış — uyum hesaplanamaz.',
    };
  }

  const cozulen = surumCozumle(kurulu);
  if (!cozulen) {
    return {
      durum: 'karar_verilemedi',
      gerekce: kurulu
        ? `Kurulu firmware sürümü çözümlenemedi ("${kurulu}") — uyumlu SAYILMAZ.`
        : 'Kurulu firmware sürümü kayıtlı değil — uyumlu SAYILMAZ.',
    };
  }

  /* Bilinen kötü ÖNCE sorulur (dosya başlığındaki gerekçe). */
  for (const kotu of kotuSurumListesi(temel.bilinenKotuSurumler)) {
    if (karsilastir(kurulu, kotu) === 0) {
      return {
        durum: 'bilinen_kotu',
        gerekce: `Kurulu sürüm ${cozulen.ham}, bilinen kötü sürümler arasında (${kotu}).`,
      };
    }
  }

  const hedef = temel.asgariSurum ?? temel.onayliSurum;
  const karsilar = asgariyiKarsilarMi(kurulu, hedef);
  if (karsilar === null) {
    return {
      durum: 'karar_verilemedi',
      gerekce: `Kurulu sürüm ${cozulen.ham} ile taban ${hedef} karşılaştırılamadı.`,
    };
  }
  if (!karsilar) {
    return {
      durum: 'eski',
      gerekce: temel.asgariSurum
        ? `Kurulu sürüm ${cozulen.ham}, asgari ${temel.asgariSurum} sürümünün altında (onaylı: ${temel.onayliSurum}).`
        : `Kurulu sürüm ${cozulen.ham}, onaylı ${temel.onayliSurum} sürümünün altında.`,
    };
  }
  return {
    durum: 'uyumlu',
    gerekce: temel.asgariSurum
      ? `Kurulu sürüm ${cozulen.ham}, asgari ${temel.asgariSurum} sürümünü karşılıyor.`
      : `Kurulu sürüm ${cozulen.ham}, onaylı ${temel.onayliSurum} sürümünü karşılıyor.`,
  };
}

/**
 * Bir varlık sınıfı için EN ÖZGÜL tabanı seçer.
 *
 * Tabanlar tür + üretici + model üçlüsüne bağlanır ve üçü de opsiyoneldir;
 * "Siemens S7-1500 için taban" ile "bütün PLC'ler için taban" aynı anda
 * var olabilir. Özgüllük sırası ölçülebilir olsun diye puanlanır: model
 * eşleşmesi üreticiden, üretici türden ağır basar. Eşit puanlı iki taban
 * varsa ilki alınır ve bu bir belirsizliktir — çağıran raporlamalıdır.
 */
export function enOzgulTemel<T extends {
  turId: string | null; uretici: string | null; model: string | null; aktif: boolean;
}>(
  temeller: readonly T[],
  varlik: { turId: string | null; uretici: string | null; model: string | null },
): T | null {
  const esler = (temelDeger: string | null, varlikDeger: string | null): boolean | null => {
    if (temelDeger === null) return null;             // bu boyut serbest
    if (varlikDeger === null) return false;           // taban istiyor, varlıkta yok
    return temelDeger.toLocaleLowerCase('tr') === varlikDeger.toLocaleLowerCase('tr');
  };

  let enIyi: T | null = null;
  let enIyiPuan = -1;
  for (const t of temeller) {
    if (!t.aktif) continue;
    let puan = 0;
    for (const [temelDeger, varlikDeger, agirlik] of [
      [t.model, varlik.model, 4],
      [t.uretici, varlik.uretici, 2],
      [t.turId, varlik.turId, 1],
    ] as [string | null, string | null, number][]) {
      const e = esler(temelDeger, varlikDeger);
      if (e === false) { puan = -1; break; }           // bu taban uymuyor
      if (e === true) puan += agirlik;
    }
    if (puan > enIyiPuan) { enIyiPuan = puan; enIyi = t; }
  }
  return enIyiPuan >= 0 ? enIyi : null;
}
