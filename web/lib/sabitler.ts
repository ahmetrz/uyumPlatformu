import { z } from 'zod';

// Sözlük değerleri: veri panelden tanımlanır (Sektor, TesisTipi, Regulasyon,
// KapsamAlani, UyumSureci); burada yalnızca DURUM makine adları ve Türkçe
// etiketleri yaşar. Yeni tanım eklemek kod değişikliği gerektirmez.

export const DURUMLAR = ['uyumlu', 'kismi', 'uyumsuz', 'incelemede', 'kapsamdisi'] as const;
export const DurumSemasi = z.enum(DURUMLAR);
export type Durum = z.infer<typeof DurumSemasi>;
export const DURUM_ETIKET: Record<Durum, string> = {
  uyumlu: 'Uyumlu', kismi: 'Kısmi', uyumsuz: 'Uyumsuz',
  incelemede: 'İncelemede', kapsamdisi: 'Kapsam dışı',
};

export const ONEM_DERECELERI = ['kritik', 'yuksek', 'orta', 'dusuk'] as const;
export const OnemSemasi = z.enum(ONEM_DERECELERI);
export type Onem = z.infer<typeof OnemSemasi>;
export const ONEM_ETIKET: Record<Onem, string> = {
  kritik: 'Kritik', yuksek: 'Yüksek', orta: 'Orta', dusuk: 'Düşük',
};
// Önem, durum paletinden türetilir — yeni renk açılmaz (tasarım kararı).
export const ONEM_DURUM_RENGI: Record<Onem, Durum> = {
  kritik: 'uyumsuz', yuksek: 'uyumsuz', orta: 'kismi', dusuk: 'kapsamdisi',
};

export const BULGU_DURUMLARI = ['acik', 'aksiyonda', 'kapali', 'kabul_edildi'] as const;
export const BulguDurumSemasi = z.enum(BULGU_DURUMLARI);
export type BulguDurum = z.infer<typeof BulguDurumSemasi>;
export const BULGU_DURUM_ETIKET: Record<BulguDurum, string> = {
  acik: 'Açık', aksiyonda: 'Aksiyonda', kapali: 'Kapalı', kabul_edildi: 'Riski kabul edildi',
};
export const BULGU_DURUM_RENGI: Record<BulguDurum, Durum> = {
  acik: 'uyumsuz', aksiyonda: 'kismi', kapali: 'uyumlu', kabul_edildi: 'kapsamdisi',
};

export const AKSIYON_DURUMLARI = ['planlandi', 'devam', 'tamamlandi', 'iptal'] as const;
export const AKSIYON_ETIKET: Record<(typeof AKSIYON_DURUMLARI)[number], string> = {
  planlandi: 'Planlandı', devam: 'Devam ediyor', tamamlandi: 'Tamamlandı', iptal: 'İptal',
};
export const AKSIYON_DURUM_RENGI: Record<(typeof AKSIYON_DURUMLARI)[number], Durum> = {
  planlandi: 'incelemede', devam: 'kismi', tamamlandi: 'uyumlu', iptal: 'kapsamdisi',
};

export const SUREC_DURUMLARI = ['planlandi', 'aktif', 'pasif', 'tamamlandi'] as const;
export const SurecDurumSemasi = z.enum(SUREC_DURUMLARI);
export type SurecDurum = z.infer<typeof SurecDurumSemasi>;
export const SUREC_DURUM_ETIKET: Record<SurecDurum, string> = {
  planlandi: 'Planlandı', aktif: 'Aktif', pasif: 'Pasif', tamamlandi: 'Tamamlandı',
};
export const SUREC_DURUM_RENGI: Record<SurecDurum, Durum> = {
  planlandi: 'incelemede', aktif: 'uyumlu', pasif: 'kapsamdisi', tamamlandi: 'incelemede',
};

export const TESIS_DURUMLARI = ['aktif', 'kapali'] as const;
export const TESIS_DURUM_ETIKET: Record<(typeof TESIS_DURUMLARI)[number], string> = {
  aktif: 'Aktif', kapali: 'Kapalı',
};

export const ROLLER = ['okuyucu', 'katkici', 'denetim_sorumlusu', 'yonetici'] as const;
export const RolSemasi = z.enum(ROLLER);
export const ROL_ETIKET: Record<(typeof ROLLER)[number], string> = {
  okuyucu: 'Okuyucu', katkici: 'Katkıcı',
  denetim_sorumlusu: 'Denetim sorumlusu', yonetici: 'Yönetici',
};

export const DENKLIKLER = ['tam', 'kismi', 'ilgili'] as const;
export const DenklikSemasi = z.enum(DENKLIKLER);
export const DENKLIK_ETIKET: Record<(typeof DENKLIKLER)[number], string> = {
  tam: 'Tam denklik', kismi: 'Kısmi denklik', ilgili: 'İlgili',
};

export const PROJE_DURUMLARI = ['planlandi', 'devam', 'tamamlandi', 'beklemede'] as const;
export const PROJE_DURUM_ETIKET: Record<(typeof PROJE_DURUMLARI)[number], string> = {
  planlandi: 'Planlandı', devam: 'Devam ediyor', tamamlandi: 'Tamamlandı', beklemede: 'Beklemede',
};
export const PROJE_DURUM_RENGI: Record<(typeof PROJE_DURUMLARI)[number], Durum> = {
  planlandi: 'incelemede', devam: 'kismi', tamamlandi: 'uyumlu', beklemede: 'kapsamdisi',
};

export const AKTARIM_DURUMLARI = ['dogrulama_bekliyor', 'onaylandi', 'reddedildi', 'hata'] as const;
export const AKTARIM_ETIKET: Record<(typeof AKTARIM_DURUMLARI)[number], string> = {
  dogrulama_bekliyor: 'Onay bekliyor', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi', hata: 'Hata',
};
export const AKTARIM_DURUM_RENGI: Record<(typeof AKTARIM_DURUMLARI)[number], Durum> = {
  dogrulama_bekliyor: 'kismi', onaylandi: 'uyumlu', reddedildi: 'kapsamdisi', hata: 'uyumsuz',
};

// Kanıt tazeliği durum paletine bağlanır (tasarım kararı: yeni renk açılmaz)
export function kanitTazelik(baslangic: Date): { etiket: string; durum: Durum; gun: number } {
  const gun = Math.floor((Date.now() - baslangic.getTime()) / 86_400_000);
  if (gun < 90) return { etiket: 'Taze', durum: 'uyumlu', gun };
  if (gun <= 180) return { etiket: 'Yenilenmeli', durum: 'kismi', gun };
  return { etiket: 'Süresi doldu', durum: 'uyumsuz', gun };
}

// Uyum yüzdesi: kapsam dışı payda dışıdır; uyumlu=1, kısmi=0.5
export function uyumYuzdesi(sayilar: Partial<Record<string, number>>): number | null {
  const u = sayilar.uyumlu ?? 0, k = sayilar.kismi ?? 0,
    s = sayilar.uyumsuz ?? 0, i = sayilar.incelemede ?? 0;
  const payda = u + k + s + i;
  if (payda === 0) return null;
  return Math.round(((u + k * 0.5) / payda) * 100);
}

export function tarihTR(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const t = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(t);
}

export function zamanTR(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const t = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(t);
}

/** Hedef tarihi geçmiş mi? (kapalı kayıtlar gecikmiş sayılmaz) */
export function gecikmisMi(hedef: string | Date | null | undefined, durum?: string): boolean {
  if (!hedef || durum === 'kapali' || durum === 'kabul_edildi') return false;
  const t = typeof hedef === 'string' ? new Date(hedef) : hedef;
  return t.getTime() < Date.now();
}

/** Verilen tarihten bugüne geçen gün sayısı. */
export function gecenGun(t: Date | string): number {
  const d = typeof t === 'string' ? new Date(t) : t;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}
