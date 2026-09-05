import type { Durum } from '@/components/kabuk/temel';
import { KANIT_ESIK_VARSAYILAN, kanitKovasi, uyumOzeti, type KanitEsik } from '@/lib/sabitler';

/* Portföy raporu — sunucu ile istemcinin paylaştığı tipler ve saf hesaplar.

   Uyum semantiği lib/sabitler.uyumOzeti ile birebir aynıdır: BİLİNMEYEN
   (değerlendirilmedi + incelemede) yüzdenin paydasına girmez ve sıfır
   sayılmaz; kapsam dışı madde iki paydanın da dışındadır. Bu yüzden bir
   hücrenin yarısından fazlası değerlendirilmemişse yüzde artık o hücreyi
   temsil etmez ve hücre BİLİNMEYEN işaretini alır. */

/** Durum makine adı → sayı (uyumlu, kismi, uyumsuz, incelemede, …). */
export type Sayilar = Partial<Record<string, number>>;

export type Surec = { id: string; kod: string; regKod: string; ad: string };

export type Hucre = {
  surecId: string;
  /** kapsam dışı hücre: bu santral bu süreçte hiç yok */
  kapsamda: boolean;
  sayilar: Sayilar;
  yuzde: number | null;
  bilinmeyenOran: number | null;
  bilinmeyen: number;
  degerlendirilen: number;
  kapsam: number;
};

export type Santral = {
  id: string;
  kod: string;
  ad: string;
  hucreler: Hucre[];
};

export type Bulgu = {
  id: string; baslik: string; durum: string; onem: string;
  tesisKod: string; regKod: string; yasGun: number; acik: boolean;
};

export type Kanit = { id: string; ad: string; tip: string; gun: number; baglanti: number };

/* ── Hücre ──────────────────────────────────────────────────────────── */

/** Boş `Sayilar`dan hücre özeti — sıfır uydurmadan. */
export function hucreOzeti(surecId: string, sayilar: Sayilar | undefined): Hucre {
  const s = sayilar ?? {};
  const o = uyumOzeti(s);
  return {
    surecId,
    kapsamda: true,
    sayilar: s,
    yuzde: o.yuzde,
    bilinmeyenOran: o.bilinmeyenOran,
    bilinmeyen: o.bilinmeyen,
    degerlendirilen: o.degerlendirilen,
    kapsam: o.kapsam,
  };
}

export function kapsamDisiHucre(surecId: string): Hucre {
  return {
    surecId, kapsamda: false, sayilar: {},
    yuzde: null, bilinmeyenOran: null, bilinmeyen: 0, degerlendirilen: 0, kapsam: 0,
  };
}

/** Hücre eşikleri — tek yerde durur, çekmecedeki dip not da buradan okur. */
export const HEDEF_ESIK = 90;
export const ALT_ESIK = 60;

/** null → hücre BOŞ kalır: kapsam dışı, "bilinmeyen" DEĞİLDİR. */
export function hucreDurumu(h: Hucre): Durum | null {
  if (!h.kapsamda) return null;
  if (h.kapsam === 0) return 'unk';
  // Yarıdan fazlası değerlendirilmemişse yüzde hücreyi temsil etmez.
  if (h.yuzde === null || (h.bilinmeyenOran ?? 0) > 50) return 'unk';
  if (h.yuzde >= HEDEF_ESIK) return 'ok';
  if (h.yuzde >= ALT_ESIK) return 'md';
  return 'bd';
}

/* Çekmecedeki durum sözcüğü hücrenin NOTUNU söyler, maddelerin durumunu
   değil: %50'lik bir hücrede tek bir "uyumsuz" madde bile olmayabilir.
   "Uyumsuz" yazmak okuru yanıltırdı; eşiğe göre konuşuyoruz. */
export function hucreSozu(h: Hucre): string {
  if (!h.kapsamda) return 'Kapsam dışı';
  if (h.kapsam === 0) return 'Madde yok';
  if (h.yuzde === null) return 'Değerlendirilmedi';
  if ((h.bilinmeyenOran ?? 0) > 50) return 'Çoğunluğu bilinmiyor';
  if (h.yuzde >= HEDEF_ESIK) return 'Hedefte';
  if (h.yuzde >= ALT_ESIK) return 'Hedefin altında';
  return 'Eşiğin altında';
}

export function hucreIpucu(h: Hucre, surec: Surec, santral: string): string {
  if (!h.kapsamda) return `${santral} · ${surec.kod} kapsamı dışında`;
  if (h.yuzde === null) {
    return `${santral} · ${surec.kod} · ${h.kapsam} madde, hiçbiri değerlendirilmedi`;
  }
  const ek = h.bilinmeyen > 0 ? ` · ${h.bilinmeyen} madde bilinmiyor` : '';
  return `${santral} · ${surec.kod} · %${h.yuzde}${ek}`;
}

/** Satırın en zayıf hücresi — sıralamayı ve "sakin" kararını sürükler. */
export function enZayif(s: Santral): Durum | null {
  for (const d of ['bd', 'md', 'unk'] as Durum[]) {
    if (s.hucreler.some((h) => hucreDurumu(h) === d)) return d;
  }
  return s.hucreler.some((h) => h.kapsamda) ? 'ok' : null;
}

/** Kapsamındaki her hücresi sağlıklı olan satır sakinleşir (%58 opaklık). */
export const sakin = (s: Santral) => enZayif(s) === 'ok';

const AGIRLIK: Record<string, number> = { bd: 0, md: 1, unk: 2, ok: 3 };

export function siralaSantraller(santraller: Santral[]): Santral[] {
  return [...santraller].sort((a, b) => {
    const f = (AGIRLIK[enZayif(a) ?? 'ok'] ?? 4) - (AGIRLIK[enZayif(b) ?? 'ok'] ?? 4);
    return f !== 0 ? f : a.kod.localeCompare(b.kod, 'tr');
  });
}

/* ── Portföy toplamı ────────────────────────────────────────────────── */

export function portfoyOzeti(santraller: Santral[]) {
  const toplam: Record<string, number> = {};
  for (const s of santraller) {
    for (const h of s.hucreler) {
      for (const [k, v] of Object.entries(h.sayilar)) toplam[k] = (toplam[k] ?? 0) + (v ?? 0);
    }
  }
  return uyumOzeti(toplam);
}

export function zayifHucreSayisi(santraller: Santral[]): number {
  return santraller.reduce(
    (a, s) => a + s.hucreler.filter((h) => hucreDurumu(h) === 'bd').length, 0);
}

/* ── Bulgu yaşı ─────────────────────────────────────────────────────── */

export type YasKovasi = { etiket: string; sayi: number; agir: number; durum: Durum };

const AGIR_ONEMLER = new Set(['kritik', 'yuksek']);

export function yasKovalari(bulgular: Bulgu[]): YasKovasi[] {
  const acik = bulgular.filter((b) => b.acik);
  const kova = (etiket: string, sec: (b: Bulgu) => boolean, durum: Durum): YasKovasi => {
    const liste = acik.filter(sec);
    return {
      etiket,
      sayi: liste.length,
      agir: liste.filter((b) => AGIR_ONEMLER.has(b.onem)).length,
      durum,
    };
  };
  return [
    kova('0–30 gün', (b) => b.yasGun <= 30, 'ok'),
    kova('31–60 gün', (b) => b.yasGun > 30 && b.yasGun <= 60, 'md'),
    kova('61–90 gün', (b) => b.yasGun > 60 && b.yasGun <= 90, 'md'),
    kova('90+ gün', (b) => b.yasGun > 90, 'bd'),
  ];
}

/* ── Kanıt tazeliği ─────────────────────────────────────────────────── */

export type TazelikKovasi = { etiket: string; sayi: number; durum: Durum; aciklama: string };

export function tazelikKovalari(kanitlar: Kanit[], esik: KanitEsik = KANIT_ESIK_VARSAYILAN): TazelikKovasi[] {
  /* Eşik Kanıt kütüphanesiyle aynı kaynaktan (konsol `kanit.tazelik.*`);
     kovalar `kanitKovasi` ile aynı sınırları kullanır. */
  const kova = (k: Kanit) => kanitKovasi(k.gun, esik);
  return [
    { etiket: `0–${esik.taze} gün`, sayi: kanitlar.filter((k) => kova(k) === 'taze').length,
      durum: 'ok', aciklama: 'geçerli' },
    { etiket: `${esik.taze}–${esik.dolmus} gün`, sayi: kanitlar.filter((k) => kova(k) === 'yenilenmeli').length,
      durum: 'md', aciklama: 'yenilenmeli' },
    { etiket: `${esik.dolmus}+ gün`, sayi: kanitlar.filter((k) => kova(k) === 'dolmus').length,
      durum: 'bd', aciklama: 'süresi dolmuş' },
  ];
}

/** Hiçbir kayda bağlanmamış kanıt: raporu taşımaz, ayrıca sayılır. */
export const baglantisizKanit = (kanitlar: Kanit[]) =>
  kanitlar.filter((k) => k.baglanti === 0).length;
