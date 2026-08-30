import { z } from 'zod';

// Sözlük değerleri: veri panelden tanımlanır (Sektor, TesisTipi, Regulasyon,
// KapsamAlani, UyumSureci); burada yalnızca DURUM makine adları ve Türkçe
// etiketleri yaşar. Yeni tanım eklemek kod değişikliği gerektirmez.

export const DURUMLAR = ['uyumlu', 'kismi', 'uyumsuz', 'incelemede', 'degerlendirilmedi', 'kapsamdisi'] as const;
export const DurumSemasi = z.enum(DURUMLAR);
export type Durum = z.infer<typeof DurumSemasi>;
export const DURUM_ETIKET: Record<Durum, string> = {
  uyumlu: 'Uyumlu', kismi: 'Kısmi', uyumsuz: 'Uyumsuz',
  incelemede: 'İncelemede', degerlendirilmedi: 'Değerlendirilmedi', kapsamdisi: 'Kapsam dışı',
};

export const GUVEN_SEVIYELERI = ['otomatik_kanit', 'denetci_dogrulamis', 'oz_degerlendirme', 'bayat_kanit', 'kanit_yok'] as const;
export type Guven = (typeof GUVEN_SEVIYELERI)[number];
export const GUVEN_ETIKET: Record<Guven, string> = {
  otomatik_kanit: 'Otomatik kanıt', denetci_dogrulamis: 'Denetçi doğrulamış',
  oz_degerlendirme: 'Öz değerlendirme', bayat_kanit: 'Kanıt bayat', kanit_yok: 'Kanıt yok',
};
export const GUVEN_DURUM_RENGI: Record<Guven, Durum> = {
  otomatik_kanit: 'uyumlu', denetci_dogrulamis: 'uyumlu',
  oz_degerlendirme: 'kismi', bayat_kanit: 'kismi', kanit_yok: 'uyumsuz',
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

// Uyum semantiği (§25, §55): Unknown asla 0 sayılmaz.
// - yuzde: yalnız DEĞERLENDİRİLMİŞ kayıtlar üzerinden (uyumlu=1, kısmi=0.5)
// - bilinmeyen: değerlendirilmemiş + incelemede oranı — ayrı raporlanır
// - kapsamdisi: her iki paydanın da dışında
export function uyumOzeti(sayilar: Partial<Record<string, number>>): {
  yuzde: number | null; bilinmeyenOran: number | null;
  degerlendirilen: number; bilinmeyen: number; kapsam: number;
} {
  const u = sayilar.uyumlu ?? 0, k = sayilar.kismi ?? 0, s = sayilar.uyumsuz ?? 0;
  const bilinmeyen = (sayilar.incelemede ?? 0) + (sayilar.degerlendirilmedi ?? 0);
  const degerlendirilen = u + k + s;
  const kapsam = degerlendirilen + bilinmeyen;
  return {
    yuzde: degerlendirilen === 0 ? null : Math.round(((u + k * 0.5) / degerlendirilen) * 100),
    bilinmeyenOran: kapsam === 0 ? null : Math.round((bilinmeyen / kapsam) * 100),
    degerlendirilen, bilinmeyen, kapsam,
  };
}

// Geriye uyumluluk: mevcut ekranlar tek yüzde bekliyor — DEĞERLENDİRİLMİŞ
// kayıtların yüzdesi döner (bilinmeyen paydada DEĞİL; ekranlar bilinmeyeni
// uyumOzeti ile ayrıca gösterir).
export function uyumYuzdesi(sayilar: Partial<Record<string, number>>): number | null {
  return uyumOzeti(sayilar).yuzde;
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

// ---- hedef mimari sözlükleri ----
export const RISK_DURUMLARI = ['acik', 'islemde', 'kabul_edildi', 'kapali'] as const;
export const RISK_DURUM_ETIKET: Record<(typeof RISK_DURUMLARI)[number], string> = {
  acik: 'Açık', islemde: 'İşlemde', kabul_edildi: 'Kabul edildi', kapali: 'Kapalı',
};
export const RISK_DURUM_RENGI: Record<(typeof RISK_DURUMLARI)[number], Durum> = {
  acik: 'uyumsuz', islemde: 'kismi', kabul_edildi: 'kapsamdisi', kapali: 'uyumlu',
};
export const RISK_ISLEMLERI = ['azalt', 'kacin', 'devret', 'kabul'] as const;
export const RISK_ISLEM_ETIKET: Record<(typeof RISK_ISLEMLERI)[number], string> = {
  azalt: 'Azalt', kacin: 'Kaçın', devret: 'Devret', kabul: 'Kabul et',
};
export const ETKI_BOYUTLARI = [
  ['etkiUretim', 'Üretim'], ['etkiEmniyet', 'Emniyet'], ['etkiRegulasyon', 'Regülasyon'],
  ['etkiFinans', 'Finans'], ['etkiSiber', 'Siber'], ['etkiItibar', 'İtibar'],
  ['etkiCevre', 'Çevre'], ['etkiVeri', 'Veri/KVKK'],
] as const;
export function riskSeviyeRengi(skor: number | null | undefined): Durum {
  if (skor === null || skor === undefined) return 'degerlendirilmedi';
  if (skor >= 15) return 'uyumsuz';
  if (skor >= 8) return 'kismi';
  return 'uyumlu';
}

export const DENETIM_ASAMALARI = ['plan', 'kapsam', 'kanit_talebi', 'saha', 'bulgu',
  'yanit', 'aksiyon', 'dogrulama', 'kapanis'] as const;
export const DENETIM_ASAMA_ETIKET: Record<(typeof DENETIM_ASAMALARI)[number], string> = {
  plan: 'Plan', kapsam: 'Kapsam', kanit_talebi: 'Kanıt talebi', saha: 'Saha çalışması',
  bulgu: 'Bulgular', yanit: 'Yanıt', aksiyon: 'Düzeltici aksiyon',
  dogrulama: 'Doğrulama', kapanis: 'Kapanış',
};
export const DENETIM_TIP_ETIKET: Record<string, string> = {
  ic_denetim: 'İç denetim', dis_denetim: 'Dış denetim',
  oz_degerlendirme: 'Öz değerlendirme', regulasyon_denetimi: 'Regülasyon denetimi',
};

export const GOREV_TIP_ETIKET: Record<string, string> = {
  kanit_yenileme: 'Kanıt yenileme', son_tarih: 'Son tarih', erisim_incelemesi: 'Erişim incelemesi',
  dogrulama: 'Doğrulama', veri_kalitesi: 'Veri kalitesi', manuel: 'Manuel',
};

export const VARLIK_SINIF_ETIKET: Record<string, string> = {
  BT: 'BT', OT: 'OT', BT_OT_KOPRU: 'BT/OT Köprü',
  ORTAK_ALTYAPI: 'Ortak Altyapı', FIZIKSEL_EMNIYET: 'Fiziksel/Emniyet',
};
export function eolDurumu(eos: Date | string | null | undefined): { etiket: string; durum: Durum } {
  if (!eos) return { etiket: 'Bilinmiyor', durum: 'degerlendirilmedi' };
  const t = typeof eos === 'string' ? new Date(eos) : eos;
  const gunKaldi = Math.ceil((t.getTime() - Date.now()) / 86_400_000);
  if (gunKaldi < 0) return { etiket: 'Destek bitti', durum: 'uyumsuz' };
  if (gunKaldi < 365) return { etiket: `${gunKaldi} gün kaldı`, durum: 'kismi' };
  return { etiket: 'Destekte', durum: 'uyumlu' };
}
