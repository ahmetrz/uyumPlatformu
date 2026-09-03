import type { Durum } from '@/components/kabuk/temel';

/* Yönetim konsolu — istemciye giden veri sözleşmesi. `db` yok; sunucu
   tarafı konsolVerisi.ts bu tipleri doldurur. */

export type Kodlu = { id: string; kod: string; ad: string };

/** Katalog kaydı (grup, tüzel kişi, ünite, varlık türü, ağ bölgesi, kural, santral görseli). */
export type KonsolKayit = {
  id: string;
  kod: string;
  ad: string;
  alt: string;
  durum: Durum;
  /** form alanlarının bugünkü değerleri (alan adı → değer) */
  degerler: Record<string, unknown>;
  /** bağlı kayıt sayısı; ölçülmediyse null */
  bagli: number | null;
  pasif?: boolean;
};

export type KonsolAyar = {
  anahtar: string;
  deger: unknown;
  kaynak: 'varsayilan' | 'yapilandirma' | 'gecersiz_kayit';
  guncellendi: string | null;
  guncelleyen: string | null;
};

export type TalepDurumu = 'taslak' | 'incelemede' | 'onaylandi' | 'reddedildi' | 'uygulandi' | 'iptal';

export type Talep = {
  id: string;
  hedefTipi: string;
  hedefId: string | null;
  hedefEtiket: string;
  once: Record<string, unknown> | null;
  sonra: Record<string, unknown>;
  etki: { baslik: string; deger: number | null; not?: string }[] | null;
  gerekce: string;
  durum: TalepDurumu;
  talepEden: { id: string; ad: string };
  onaylayan: string | null;
  uygulayan: string | null;
  inceleyen: string | null;
  redNedeni: string | null;
  olusturuldu: string;
  onaylandi: string | null;
  uygulandi: string | null;
};

export type IzKaydi = {
  id: string;
  zaman: string;
  aktor: string | null;
  varlikTipi: string;
  varlikId: string;
  eylem: string;
  alan: string | null;
  once: string | null;
  sonra: string | null;
  gerekce: string | null;
};

export type KonsolVerisi = {
  aktifId: string;
  simdi: number;
  izin: { okuma: boolean; yazma: boolean; onay: boolean };
  ayarlar: KonsolAyar[];
  talepler: Talep[];
  kayitlar: Record<string, KonsolKayit[]>;
  secenekler: {
    tesis: Kodlu[]; grup: Kodlu[]; tuzelKisi: Kodlu[]; regulasyon: Kodlu[];
    gorsel: { id: string; ad: string }[];
  };
  gecmis: IzKaydi[];
};

export const TALEP_DURUM_ETIKET: Record<TalepDurumu, string> = {
  taslak: 'Taslak', incelemede: 'İncelemede', onaylandi: 'Onaylandı — uygulanmadı',
  reddedildi: 'Reddedildi', uygulandi: 'Uygulandı', iptal: 'İptal',
};

export const TALEP_DURUM_IMI: Record<TalepDurumu, Durum> = {
  taslak: 'pl', incelemede: 'md', onaylandi: 'md', reddedildi: 'bd', uygulandi: 'ok', iptal: 'pl',
};

export const EYLEM_ETIKET: Record<string, string> = {
  olusturma: 'oluşturma', guncelleme: 'güncelleme', silme: 'silme', pasife_alma: 'pasife alma',
  onay: 'onay', red: 'red', iptal: 'iptal', hesaplama: 'hesaplama',
};

/** İz tablosunda konsolun izlediği varlık tipleri. */
export const KONSOL_VARLIK_TIPLERI = [
  'Yapilandirma', 'DegisiklikTalebi', 'Grup', 'TuzelKisi', 'UretimUnitesi',
  'VarlikTuru', 'AgBolgesi', 'UygulanabilirlikKurali', 'Tesis',
] as const;

/** Katalog hedef tipi → iz tablosundaki varlık tipi. */
export const HEDEF_VARLIK_TIPI: Record<string, string> = {
  grup: 'Grup', tuzelKisi: 'TuzelKisi', uretimUnitesi: 'UretimUnitesi',
  varlikTuru: 'VarlikTuru', agBolgesi: 'AgBolgesi',
  uygulanabilirlikKurali: 'UygulanabilirlikKurali', tesisGorsel: 'Tesis', ayar: 'Yapilandirma',
};

/** İki değer sözlüğü arasındaki farkı alan bazında çıkarır. */
export function fark(once: Record<string, unknown> | null, sonra: Record<string, unknown>):
  { alan: string; once: unknown; sonra: unknown }[] {
  const anahtarlar = new Set([...Object.keys(once ?? {}), ...Object.keys(sonra)]);
  const satirlar: { alan: string; once: unknown; sonra: unknown }[] = [];
  for (const a of anahtarlar) {
    const o = once?.[a]; const s = sonra[a];
    if (JSON.stringify(o) !== JSON.stringify(s)) satirlar.push({ alan: a, once: o, sonra: s });
  }
  return satirlar;
}

export function degerYaz(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'açık' : 'kapalı';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
