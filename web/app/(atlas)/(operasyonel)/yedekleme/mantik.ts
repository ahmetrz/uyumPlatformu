import type { Durum } from '@/components/atlas/temel';

/* O14 · "kurtarabilir miyiz?" sorusunun TEK türetme yeri.
   Sunucu (page.tsx) ve istemci (YedeklemeIstemci.tsx) aynı kuralları
   buradan okur; böylece bir satırın işaretçisi ile çekmecedeki kimlik
   bloğu birbirinden ayrışamaz.

   Durum eşlemesi (06 §A2 — işaretçi dışında durum sözcüğü yazılmaz):
     politika yok ....................... unk  (ölçülmedi, SIFIR DEĞİL)
     restore testi hiç yok .............. bd
     son restore testi 180 günden eski .. bd
     son restore testi başarısız ........ md   (kanıt var ama olumsuz)
     son yedekleme koşusu başarısız/kısmi md
     kapsama < %80 ...................... md
     bilinmeyen payı ≥ %15 .............. unk
     hepsi iyi .......................... ok                              */

export const GUN = 86_400_000;

export const TEST_ESIGI = 180;      // gün · restore kanıtının tazelik sınırı
export const KAPSAMA_ESIGI = 80;    // % · altı kısmi hazırlık
export const BILINMEYEN_ESIGI = 15; // % · üstü "ölçülmemiş" sayılır
export const BAR_OK_ESIGI = 90;     // % · barın kendi rengi (satır durumundan bağımsız)

export type TurKirilimi = { ad: string; yedekli: number; bilinmeyen: number; toplam: number };
export type KosuOzeti = { basarili: number; kismi: number; basarisiz: number };
export type SonKosu = { zaman: string; durum: string; boyutMb: number | null; hata: string | null };
export type SonTest = { zaman: string; sonuc: string; sureDk: number | null; not: string | null };

export type Politika = {
  id: string; ad: string; kapsam: string | null; siklik: string | null;
  saklamaGun: number | null; hedef: string | null;
  rpoSaat: number | null; rtoSaat: number | null; haricTutulan: string | null;
};

/** Yedeği olmayan ya da durumu bilinmeyen yüksek/kritik varlık. */
export type AcikVarlik = { etiket: string; ad: string; kritiklik: string; yedekDurumu: string };

export type Santral = {
  id: string; kod: string; ad: string; tip: string | null;
  toplam: number; yedekli: number; yedeksiz: number; bilinmeyen: number;
  kirilim: TurKirilimi[];
  politika: Politika | null;
  kosuOzeti: KosuOzeti;
  sonKosu: SonKosu | null;
  sonTest: SonTest | null;
  acikVarliklar: AcikVarlik[];
  /** Kullanıcının bu santralde görev açma (uyum/yazma) yetkisi var mı. */
  planlanabilir: boolean;
};

export function gunOnce(iso: string | null | undefined, simdi = Date.now()): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((simdi - new Date(iso).getTime()) / GUN));
}

/** Son restore testinin üzerinden geçen gün. null = HİÇ test edilmemiş. */
export function testGunu(s: Santral): number | null {
  return gunOnce(s.sonTest?.zaman);
}

/** Kapsama = yedekDurumu 'var' olan varlık / toplam varlık.
    'bilinmiyor' olanlar PAYDADA kalır ama kapsamaya sayılmaz — bu yüzden
    yüzdeyi gösteren her yerde bilinmeyen payı da gösterilir (06 §A3). */
export function kapsama(s: Santral): number | null {
  return s.toplam > 0 ? (s.yedekli / s.toplam) * 100 : null;
}

export function bilinmeyenPayi(s: Santral): number | null {
  return s.toplam > 0 ? (s.bilinmeyen / s.toplam) * 100 : null;
}

/** Politika metninde noktalı virgülle tutulan kapsam dışı sistem listesi. */
export function haricListesi(p: Politika | null): string[] {
  if (!p?.haricTutulan) return [];
  return p.haricTutulan.split(';').map((x) => x.trim()).filter(Boolean);
}

export function hazirlik(s: Santral): Durum {
  if (!s.politika) return 'unk';                       // ölçüm yok ≠ sıfır
  const gun = testGunu(s);
  if (gun === null || gun > TEST_ESIGI) return 'bd';   // kanıt yok ya da bayat
  if (s.sonTest?.sonuc === 'basarisiz') return 'md';
  if (s.sonKosu && s.sonKosu.durum !== 'basarili') return 'md';
  const k = kapsama(s);
  if (k === null) return 'unk';
  if (k < KAPSAMA_ESIGI) return 'md';
  const b = bilinmeyenPayi(s);
  if (b !== null && b >= BILINMEYEN_ESIGI) return 'unk';
  return 'ok';
}

/** Barın rengi kapsamanın kendi kalitesini anlatır; satırın hazırlık
    işaretçisinden bağımsızdır (tasarım artboard'u da böyle davranır). */
export function barDurumu(oran: number | null): Durum {
  if (oran === null) return 'unk';
  if (oran >= BAR_OK_ESIGI) return 'ok';
  if (oran >= KAPSAMA_ESIGI) return 'md';
  return 'bd';
}

/** Sağlıklı kuyruğa yalnız tam hazır santraller toplanır (06 §A3). */
export function toplanabilir(s: Santral): boolean {
  return hazirlik(s) === 'ok';
}

const RUTBE: Record<Durum, number> = { bd: 0, md: 1, unk: 2, pl: 3, ok: 4, tamam: 5 };

/** Sıralama hazırlığa göre, en kötü üstte: rütbe → hiç test edilmemiş →
    testi en eski → kapsaması en düşük → ad. */
export function karsilastir(a: Santral, b: Santral): number {
  const fark = RUTBE[hazirlik(a)] - RUTBE[hazirlik(b)];
  if (fark !== 0) return fark;
  const ta = testGunu(a);
  const tb = testGunu(b);
  if ((ta === null) !== (tb === null)) return ta === null ? -1 : 1;
  if (ta !== null && tb !== null && ta !== tb) return tb - ta;
  const ka = kapsama(a) ?? -1;
  const kb = kapsama(b) ?? -1;
  if (ka !== kb) return ka - kb;
  return a.ad.localeCompare(b.ad, 'tr');
}

/** "SON RESTORE TESTİ" hücresi — hiç test edilmemişse `0 gün` DEĞİL
    `test yok` yazar; bu bir sıfır değil, kanıt yokluğudur. */
export function testHucresi(s: Santral): { yazi: string; renk: Durum | null } {
  if (!s.politika) return { yazi: 'politika yok', renk: 'unk' };
  const gun = testGunu(s);
  if (gun === null) return { yazi: 'test yok', renk: 'bd' };
  if (s.sonTest?.sonuc === 'basarisiz') return { yazi: `${gun} gün önce · başarısız`, renk: 'md' };
  if (gun > TEST_ESIGI) return { yazi: `${gun} gün önce`, renk: 'bd' };
  return { yazi: `${gun} gün önce`, renk: null };
}

/** Kapsama barının popover metni — tür bazında yedeklenmiş / toplam.
    Yalnız yardımcı metadata: aynı boşluk çekmecede varlık adıyla listelenir. */
export function kirilimMetni(s: Santral): string {
  if (s.kirilim.length === 0) return 'Bu santralde kayıtlı varlık yok.';
  const eksik = s.kirilim.filter((g) => g.yedekli < g.toplam);
  if (eksik.length === 0) return `${s.kirilim.length} varlık türünün tamamı yedekleme kapsamında.`;
  const parcalar = eksik.slice(0, 5).map((g) =>
    `${g.ad} ${g.yedekli}/${g.toplam}${g.bilinmeyen > 0 ? ` (${g.bilinmeyen} bilinmiyor)` : ''}`);
  if (eksik.length > 5) parcalar.push(`+${eksik.length - 5} tür daha`);
  const tam = s.kirilim.length - eksik.length;
  if (tam > 0) parcalar.push(`${tam} tür tam`);
  return parcalar.join(' · ');
}

/** Filo geneli — metrik şeridi. Kapsama tek tek santrallerin ortalaması
    değil, varlık sayısına göre ağırlıklı gerçek orandır. */
export function filoOzeti(santraller: Santral[]) {
  const toplam = santraller.reduce((a, s) => a + s.toplam, 0);
  const yedekli = santraller.reduce((a, s) => a + s.yedekli, 0);
  const bilinmeyen = santraller.reduce((a, s) => a + s.bilinmeyen, 0);
  const testYok = santraller.filter((s) => s.politika && testGunu(s) === null).length;
  const bayatTest = santraller.filter((s) => {
    const g = testGunu(s);
    return g !== null && g > TEST_ESIGI;
  }).length;
  const haricSistem = santraller.reduce((a, s) => a + haricListesi(s.politika).length, 0);
  const haricSantral = santraller.filter((s) => haricListesi(s.politika).length > 0).length;
  const politikasiz = santraller.filter((s) => !s.politika).length;
  return {
    toplam, yedekli, bilinmeyen, testYok, bayatTest, haricSistem, haricSantral, politikasiz,
    kapsama: toplam > 0 ? (yedekli / toplam) * 100 : null,
    bilinmeyenPayi: toplam > 0 ? (bilinmeyen / toplam) * 100 : null,
    hazirDegil: santraller.filter((s) => hazirlik(s) === 'bd').length,
    kismi: santraller.filter((s) => hazirlik(s) === 'md').length,
  };
}

export function yuzde(oran: number | null): string {
  return oran === null ? '—' : `%${Math.round(oran)}`;
}
