import type { Durum } from '@/components/kabuk/temel';

/* ═══ P4 · 2.6 · /paketler — SAF MANTIK ═══════════════════════════════
   Ekranın tek sorusu: "hangi paket kurulu, hangisi güncel, hangisine ne
   yapabilirim?" Cevap iki kaynağın BİRLEŞİMİDİR — disk (`paketler/<KOD>`,
   doğrulayıcıdan geçen manifest) ve veritabanı (`IcerikPaketi` +
   kurulu sürüm). İkisi ayrı şeydir ve ayrı yazılır: kurulu ama diskte
   olmayan paket "güncel" DEĞİLDİR, "diskte yok"tur; diskte var ama
   doğrulanamayan paket "kurulabilir" değildir.

   Bu dosya React ve veritabanı bilmez. */

export type PaketHali =
  | 'guncel'          // kurulu sürüm = diskteki sürüm
  | 'guncelleme_var'  // diskteki sürüm kurulu sürümden yeni
  | 'disk_eski'       // diskteki sürüm kurulu sürümden ESKİ — geri alma bu ekranda değil
  | 'disk_yok'        // kurulu ama paket dizini diskte yok (kaynak bilinmiyor)
  | 'dogrulanamadi'   // diskteki kopya doğrulayıcıdan geçmiyor
  | 'kurulu_degil'    // diskte hazır, hiç kurulmamış
  | 'arsiv';          // kaldırılmış (arşiv); diskteyse geri kurulabilir

export type HalGirdisi = {
  diskSurum: string | null;
  diskHatalari: number;
  kuruluSurum: string | null;
  durum: 'kurulu' | 'arsiv' | null;
};

/** SemVer sayısal karşılaştırma: −1 · 0 · 1. Eksik parça 0 sayılır. */
export function semverKarsilastir(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const fark = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (fark !== 0) return fark > 0 ? 1 : -1;
  }
  return 0;
}

export function paketHali(g: HalGirdisi): PaketHali {
  if (g.durum === 'kurulu' && g.kuruluSurum) {
    if (g.diskSurum === null) return 'disk_yok';
    if (g.diskHatalari > 0) return 'dogrulanamadi';
    const fark = semverKarsilastir(g.diskSurum, g.kuruluSurum);
    return fark > 0 ? 'guncelleme_var' : fark < 0 ? 'disk_eski' : 'guncel';
  }
  if (g.durum === 'arsiv') return 'arsiv';
  return g.diskSurum !== null && g.diskHatalari > 0 ? 'dogrulanamadi' : 'kurulu_degil';
}

/* Durum işaretçisi iki kanalla okunur: glif + SÖZCÜK (renk tek başına
   anlatmaz). Bilinmeyen kaynak (diskte yok) başarı gibi görünmez. */
export const HAL_IMI: Record<PaketHali, Durum> = {
  guncel: 'ok', guncelleme_var: 'md', disk_eski: 'md', disk_yok: 'unk',
  dogrulanamadi: 'bd', kurulu_degil: 'pl', arsiv: 'tamam',
};

export const HAL_SOZU: Record<PaketHali, string> = {
  guncel: 'Kurulu · güncel',
  guncelleme_var: 'Güncelleme var',
  disk_eski: 'Diskteki kopya eski',
  disk_yok: 'Diskte yok',
  dogrulanamadi: 'Doğrulanamadı',
  kurulu_degil: 'Kurulu değil',
  arsiv: 'Kaldırıldı (arşiv)',
};

/** Eylem dili: durum değil, kullanıcının şimdi ne yapabileceği. */
export function halCumlesi(hal: PaketHali, g: { diskSurum: string | null; kuruluSurum: string | null; diskHatalari: number }): string {
  switch (hal) {
    case 'guncel': return `Kurulu sürüm ${g.kuruluSurum} diskteki kopyayla aynı. Yapılacak bir şey yok.`;
    case 'guncelleme_var': return `Diskte ${g.diskSurum} var, kurulu ${g.kuruluSurum}. Güncelleme yalnız paket kökenli satırları değiştirir; kiracının satırları korunur, bırakılan satır pasifleşir, çerçeve TASLAK gelir.`;
    case 'disk_eski': return `Diskteki kopya (${g.diskSurum}) kurulu sürümden (${g.kuruluSurum}) eski. Geri alma bu ekranda yapılmaz; paket dizinini güncel sürümle değiştirin.`;
    case 'disk_yok': return `Kurulu (${g.kuruluSurum}) ama paket dizini diskte yok: güncellenemez, yeniden kurulamaz. Kaldırma yine mümkündür.`;
    case 'dogrulanamadi': return `Diskteki kopya doğrulayıcıdan geçmiyor (${g.diskHatalari} hata). Düzeltin ve \`npm run paket:dogrula\` ile doğrulayın; hatalar aşağıda.`;
    case 'kurulu_degil': return `Diskte ${g.diskSurum} hazır, kurulu değil. Kurulum tek işlemde yazılır; çerçeveler TASLAK gelir, aktifleştirme insan kararıdır.`;
    case 'arsiv': return g.diskSurum
      ? `Kaldırılmış; satırları pasif, silinmedi. Aynı içerikle geri kurulunca arşivdeki taslağı taslağa döner.`
      : 'Kaldırılmış; satırları pasif, silinmedi. Diskte kopyası olmadığı için geri kurulamaz.';
  }
}

export type EylemDurumu = { etiket: string; engel: string | null };
export type Eylemler = { kur: EylemDurumu; kaldir: EylemDurumu };

/** Düğme ve nedeni: yetkisiz kullanıcıya düğme GÖSTERİLİR, nedeni yanına
    yazılır (DESIGN.md · Buttons). `kurulu` veritabanı durumudur
    (`IcerikPaketi.durum = kurulu`); hâl diskle birleşik karardır. */
export function eylemler(hal: PaketHali, g: { yazabilir: boolean; kurulu: boolean; bagimlilar: string[]; aktifCerceve: number }): Eylemler {
  const yetki = g.yazabilir ? null : 'tanımlar yazma yetkisi gerekir';
  const kurEtiketi = hal === 'guncelleme_var' ? 'Güncelle' : hal === 'arsiv' ? 'Geri kur' : hal === 'guncel' ? 'Yeniden kur' : 'Kur';
  const kurEngeli = yetki
    ?? (hal === 'disk_yok' ? 'paket dizini diskte yok'
      : hal === 'dogrulanamadi' ? 'diskteki kopya doğrulanamadı'
        : hal === 'disk_eski' ? 'diskteki sürüm kurulu sürümden eski'
          : null);
  const kaldirEngeli = yetki
    ?? (!g.kurulu ? 'kurulu değil'
      : g.bagimlilar.length ? `bağımlı kurulu paket var: ${g.bagimlilar.join(', ')}`
        : g.aktifCerceve > 0 ? `${g.aktifCerceve} aktif çerçeve sürümü taşıyor — önce başka sürüm aktifleştirilmeli`
          : null);
  return { kur: { etiket: kurEtiketi, engel: kurEngeli }, kaldir: { etiket: 'Kaldır (arşiv)', engel: kaldirEngeli } };
}
