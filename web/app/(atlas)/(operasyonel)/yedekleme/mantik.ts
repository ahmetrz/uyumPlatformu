import type { Durum } from '@/components/atlas/temel';

/* O14 · "kurtarabilir miyiz?" sorusunun TEK türetme yeri.
   Sunucu (page.tsx) ve istemci (YedeklemeIstemci.tsx) aynı kuralları
   buradan okur; böylece bir satırın işaretçisi ile çekmecedeki kimlik
   bloğu birbirinden ayrışamaz.

   ─ İKİ KATMAN, TEK DOĞRULUK KAYNAĞI ────────────────────────────────────
   Ekran ARTIK KENDİ YEDEK YARGISINI KURMUYOR. Santral katmanı (politika →
   koşu → geri yükleme testi) ile varlık katmanı (kritik varlıkların
   konfigürasyon yedeği) `lib/entegrasyon/konfigYedek.ts →
   tesisYedekGorunumu()` tarafından üretilir; buradaki tipler onun
   serileştirilmiş ikizidir. Önceden sayfa aynı soruyu ham `db` sorgusuyla
   ikinci kez cevaplıyordu: iki cevap sessizce ayrışabiliyordu ve hangisinin
   doğru olduğu ekrandan okunamıyordu. Artık türetme burada, ÖLÇÜM orada.

   Envanter BEYANI (`Varlik.yedekDurumu`) üçüncü bir cevap değildir; ayrı
   bir SORUdur ("insan ne diyor") ve kapsama barında öyle etiketlenir.

   Durum eşlemesi (06 §A2 — işaretçi dışında durum sözcüğü yazılmaz):
     politika yok ........................ unk  (ölçülmedi, SIFIR DEĞİL)
     kritik varlıkta kanıtlı yedek açığı . bd
     restore testi hiç yok ............... bd
     son restore testi 180 günden eski ... bd
     son restore testi başarısız ......... md   (kanıt var ama olumsuz)
     son yedekleme koşusu başarısız/kısmi  md
     kapsama < %80 ....................... md
     bilinmeyen payı ≥ %15 ............... unk
     kritik varlıkların yedeği ölçülmemiş  unk
     hepsi iyi ........................... ok                              */

export const GUN = 86_400_000;

export const TEST_ESIGI = 180;      // gün · restore kanıtının tazelik sınırı
export const KAPSAMA_ESIGI = 80;    // % · altı kısmi hazırlık
export const BILINMEYEN_ESIGI = 15; // % · üstü "ölçülmemiş" sayılır
export const BAR_OK_ESIGI = 90;     // % · barın kendi rengi (satır durumundan bağımsız)

export type TurKirilimi = { ad: string; yedekli: number; bilinmeyen: number; toplam: number };
export type KosuOzeti = { basarili: number; kismi: number; basarisiz: number };
export type SonKosu = { zaman: string; durum: string; hata: string | null };
export type SonTest = { zaman: string; sonuc: string; sureDk: number | null };

export type Politika = {
  id: string; ad: string; kapsam: string | null; siklik: string | null;
  saklamaGun: number | null; hedef: string | null;
  rpoSaat: number | null; rtoSaat: number | null; haricTutulan: string | null;
};

/** `SantralKatmani` ikizi — politika/koşu/geri yükleme testi zinciri. */
export type SantralKatmani = {
  /** Politika bağı verilmediyse false: ölçülmedi, "boş" ya da "başarısız" DEĞİL. */
  bagli: boolean;
  gerekce: string;
  politikaAdi: string | null;
  sonKosu: SonKosu | null;
  sonRestoreTesti: SonTest | null;
};

/** `EksikYedekVarligi` ikizi. `beyan` envanterin cevabı, `gerekce` ölçümün. */
export type EksikVarlik = {
  varlikId: string; etiket: string; ad: string; kritiklik: string;
  beyan: string; kayitSayisi: number; gerekce: string;
};

/** `EksikYedekRaporu` ikizi. `yedeksiz` ve `bilinmeyen` ASLA toplanmaz. */
export type VarlikKatmani = {
  /** Hiç `KonfigurasyonYedegi` kaydı yoksa false: tarama yapılmadı. */
  kaynakBagli: boolean;
  /** Kanıtlı yokluk: tüm denemeler başarısız ya da beyan 'yok'. */
  yedeksiz: EksikVarlik[];
  /** Ölçüm yok: ne otomatik kayıt ne beyan. Bir açık değil, bir kör nokta. */
  bilinmeyen: EksikVarlik[];
  yedegiVar: number;
  toplamKritik: number;
};

/** Yedek doğrulama motorunun ürettiği, insan kararı bekleyen bulgu. */
export type YedekBulgusu = {
  id: string; kural: string; aciklama: string; olusturuldu: string;
};

export type Santral = {
  id: string; kod: string; ad: string; tip: string | null;
  /* Envanter BEYANI katmanı — kapsama barı. Ölçüm değil, insan cevabı. */
  toplam: number; yedekli: number; yedeksiz: number; bilinmeyen: number;
  kirilim: TurKirilimi[];
  politika: Politika | null;
  kosuOzeti: KosuOzeti;
  /** Restore testi kaydı bu koşuya asılır; koşu yoksa test de kaydedilemez. */
  sonKosuId: string | null;
  santralKatmani: SantralKatmani;
  varlikKatmani: VarlikKatmani;
  /** İki katmanın birbirini yalanladığı yerler — örtülmez, listelenir. */
  celiskiler: string[];
  bulgular: YedekBulgusu[];
  /** Kullanıcının bu santralde görev açma (uyum/yazma) yetkisi var mı. */
  planlanabilir: boolean;
  /** Yedekleme kaydı yazma (envanter/yazma) yetkisi. */
  yazabilir: boolean;
  /** Veri kalitesi bulgusunu işleme (yonetim/yazma) yetkisi. */
  bulguIsleyebilir: boolean;
};

export function gunOnce(iso: string | null | undefined, simdi = Date.now()): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((simdi - new Date(iso).getTime()) / GUN));
}

/** Son restore testinin üzerinden geçen gün. null = HİÇ test edilmemiş. */
export function testGunu(s: Santral): number | null {
  return gunOnce(s.santralKatmani.sonRestoreTesti?.zaman);
}

export const sonTest = (s: Santral): SonTest | null => s.santralKatmani.sonRestoreTesti;
export const sonKosu = (s: Santral): SonKosu | null => s.santralKatmani.sonKosu;

/** Kapsama = yedekDurumu 'var' olan varlık / toplam varlık (ENVANTER BEYANI).
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
  // Kanıtlı açık her şeyden önce gelir: kritik varlığın kullanılabilir
  // yedeği YOK. Bu bir "ölçülmedi" değil, bir "yok".
  if (s.varlikKatmani.yedeksiz.length > 0) return 'bd';
  const gun = testGunu(s);
  if (gun === null || gun > TEST_ESIGI) return 'bd';   // kanıt yok ya da bayat
  if (sonTest(s)?.sonuc === 'basarisiz') return 'md';
  const kosu = sonKosu(s);
  if (kosu && kosu.durum !== 'basarili') return 'md';
  const k = kapsama(s);
  if (k === null) return 'unk';
  if (k < KAPSAMA_ESIGI) return 'md';
  const b = bilinmeyenPayi(s);
  if (b !== null && b >= BILINMEYEN_ESIGI) return 'unk';
  // Kritik varlıkların yedeği hiç ölçülmemişse "hazır" DENMEZ — ölçülmedi.
  if (s.varlikKatmani.bilinmeyen.length > 0) return 'unk';
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
  if (sonTest(s)?.sonuc === 'basarisiz') return { yazi: `${gun} gün önce · başarısız`, renk: 'md' };
  if (gun > TEST_ESIGI) return { yazi: `${gun} gün önce`, renk: 'bd' };
  return { yazi: `${gun} gün önce`, renk: null };
}

/**
 * "KRİTİK VARLIK" hücresi — kanıtlı açık ile ölçüm boşluğu AYRI YAZILIR.
 *
 * Bu ayrım ekranın tek sebebidir: "3 kritik varlığın yedeği yok" ile
 * "3 kritik varlığın yedeği hiç ölçülmedi" iki farklı iş emridir. Biri
 * kapatılacak bir açık, öteki bağlanacak bir kaynak. Tek sayıya
 * indirgemek ikisini de yanlış gösterir.
 */
export function kritikHucresi(s: Santral): {
  yazi: string; renk: Durum | null; ipucu: string;
} {
  const v = s.varlikKatmani;
  if (v.toplamKritik === 0) {
    return { yazi: 'kritik varlık yok', renk: null,
      ipucu: 'Bu santralde kritik/yüksek kritiklikte kayıtlı varlık yok.' };
  }
  if (v.yedeksiz.length > 0) {
    return {
      yazi: v.bilinmeyen.length > 0
        ? `${v.yedeksiz.length} yedeksiz · ${v.bilinmeyen.length} ölçülmedi`
        : `${v.yedeksiz.length} yedeksiz`,
      renk: 'bd',
      ipucu: v.yedeksiz.slice(0, 3).map((x) => `${x.etiket}: ${x.gerekce}`).join(' · '),
    };
  }
  if (v.bilinmeyen.length > 0) {
    return {
      yazi: `${v.bilinmeyen.length} ölçülmedi`,
      renk: 'unk',
      ipucu: v.kaynakBagli
        ? v.bilinmeyen.slice(0, 3).map((x) => `${x.etiket}: ${x.gerekce}`).join(' · ')
        : 'Konfigürasyon yedeği kaynağı hiç bağlı değil — bu varlıkların yedeği '
          + 'YOK demek değil, ÖLÇÜLMEDİ demektir.',
    };
  }
  return { yazi: `${v.yedegiVar}/${v.toplamKritik} yedekli`, renk: null,
    ipucu: 'Kritik ve yüksek kritiklikteki varlıkların tamamının kullanılabilir yedeği var.' };
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
  /* İki sayaç AYRI: kanıtlı açık (yedeksiz) ile ölçüm boşluğu (bilinmeyen)
     toplanmaz. Toplasaydık "12 kritik varlıkta sorun var" derdik ve
     kaçının kapatılacak, kaçının ölçülecek olduğu kaybolurdu. */
  const kritikYedeksiz = santraller.reduce((a, s) => a + s.varlikKatmani.yedeksiz.length, 0);
  const kritikBilinmeyen = santraller.reduce((a, s) => a + s.varlikKatmani.bilinmeyen.length, 0);
  const kritikToplam = santraller.reduce((a, s) => a + s.varlikKatmani.toplamKritik, 0);
  const acikBulgu = santraller.reduce((a, s) => a + s.bulgular.length, 0);
  const celiski = santraller.reduce((a, s) => a + s.celiskiler.length, 0);
  /** Konfigürasyon yedeği kaynağı hiç bağlı değilse varlık katmanı ÖLÇÜLMEDİ. */
  const varlikKaynagiBagli = santraller.some((s) => s.varlikKatmani.kaynakBagli);
  return {
    toplam, yedekli, bilinmeyen, testYok, bayatTest, haricSistem, haricSantral, politikasiz,
    kritikYedeksiz, kritikBilinmeyen, kritikToplam, acikBulgu, celiski, varlikKaynagiBagli,
    kapsama: toplam > 0 ? (yedekli / toplam) * 100 : null,
    bilinmeyenPayi: toplam > 0 ? (bilinmeyen / toplam) * 100 : null,
    hazirDegil: santraller.filter((s) => hazirlik(s) === 'bd').length,
    kismi: santraller.filter((s) => hazirlik(s) === 'md').length,
  };
}

export function yuzde(oran: number | null): string {
  return oran === null ? '—' : `%${Math.round(oran)}`;
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

/** Yedek bulgusu kuralının insan karşılığı — motorun kural adları teknik. */
export const BULGU_SOZU: Record<string, string> = {
  yedeksiz_kritik_varlik: 'Kritik varlığın kullanılabilir yedeği yok',
  yedegi_bilinmeyen_kritik_varlik: 'Kritik varlığın yedek durumu ölçülmemiş',
};

/** Bulgunun taşıdığı durum: kanıtlı açık kırmızı, ölçüm boşluğu gri. */
export function bulguDurumu(kural: string): Durum {
  return kural === 'yedegi_bilinmeyen_kritik_varlik' ? 'unk' : 'bd';
}
