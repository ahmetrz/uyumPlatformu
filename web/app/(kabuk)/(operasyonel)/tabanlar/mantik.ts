import type { Durum } from '@/components/kabuk/temel';

/* OT-22 · Firmware tabanları — sunucu ve istemcinin paylaştığı tipler ve
   saf hesaplar. Burada veritabanı ve React bağımlılığı YOKTUR. */

export type TabanSatiri = {
  id: string;
  /** null = taban bir türe bağlı değil (yalnız üretici/model kapsıyor) */
  turId: string | null;
  turAdi: string | null;
  uretici: string | null;
  model: string | null;
  onayliSurum: string;
  /** null = YALNIZ onaylı sürüm kabul edilir (aralık yok) */
  asgariSurum: string | null;
  hedefSurum: string | null;
  /** virgüllü liste; null = bilinen kötü sürüm bildirilmedi */
  bilenenKotu: string | null;
  advisoryReferansi: string | null;
  aciklama: string | null;
  aktif: boolean;
  guncellendi: string;
  /* Motorun bu tabana göre verdiği kararların dağılımı. */
  uyumlu: number;
  eski: number;
  bilinenKotu: number;
  kararVerilemedi: number;
};

/* OT-25 · Duyuru kütüğünün özeti. Ekranda TABANLARIN yanında durur çünkü
   ikisi de aynı soruyu besler: hangi sürüm sorunlu? */
export type DuyuruOzeti = {
  toplam: number;
  /** duyurulara bağlı ürün/sürüm aralığı satırı sayısı */
  urun: number;
  sonReferans: string | null;
  sonBaslik: string | null;
  sonZaman: string | null;
  /** motorun "etkilenen" dediği varlık×zafiyet sayısı */
  etkilenen: number;
  /** sürümü çözülemediği için karar verilemeyenler — ölçüm borcu */
  kararVerilemedi: number;
};

/** Tabanın kapsadığı boyutlar — insan okunur tek satır. */
export function kapsamSozu(t: TabanSatiri): string {
  const p = [t.turAdi, t.uretici, t.model].filter(Boolean);
  /* Boyutsuz taban sunucuda reddedilir; yine de savunmacı yazılır çünkü
     eski bir kayıt bu kuraldan önce girilmiş olabilir. */
  return p.length === 0 ? 'boyut bağlanmamış' : p.join(' · ');
}

/** Tabana bağlı, motorun karar verdiği cihaz sayısı. */
export function bagliCihaz(t: TabanSatiri): number {
  return t.uyumlu + t.eski + t.bilinenKotu + t.kararVerilemedi;
}

/**
 * Tabanın ekran durumu.
 *
 * Sıra bilinçli: BİLİNEN KÖTÜ sürümde çalışan cihaz en ağırdır; eski
 * sürüm ikinci; hiçbir cihaza bağlanmamış ya da kararı verilememiş taban
 * BİLİNMEYENDİR — "sorunsuz" değil. Pasif taban nötr çizilir.
 */
export function tabanImi(t: TabanSatiri): Durum {
  if (!t.aktif) return 'unk';
  if (t.bilinenKotu > 0) return 'bd';
  if (t.eski > 0) return 'md';
  if (bagliCihaz(t) === 0 || t.kararVerilemedi > 0) return 'unk';
  return 'ok';
}

/** Tek cümlelik durum sözü — rozet metni. */
export function tabanSozu(t: TabanSatiri): string {
  if (!t.aktif) return 'Pasif taban';
  if (t.bilinenKotu > 0) return `${t.bilinenKotu} cihaz bilinen kötü sürümde`;
  if (t.eski > 0) return `${t.eski} cihaz eski sürümde`;
  if (bagliCihaz(t) === 0) return 'Hiçbir cihaza uygulanmadı';
  if (t.kararVerilemedi > 0) return `${t.kararVerilemedi} cihazda karar verilemedi`;
  return 'Bağlı cihazların tamamı uyumlu';
}

/** Virgüllü bilinen kötü sürüm listesini temizler. */
export function kotuListesi(ham: string | null): string[] {
  if (!ham) return [];
  return ham.split(',').map((s) => s.trim()).filter(Boolean);
}
