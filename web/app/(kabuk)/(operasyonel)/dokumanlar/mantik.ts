/* ═══════════════════════════════════════════════════════════════════════
   YÖNETİŞİM BELGESİ KÜTÜĞÜ — saf kurallar (C22 politika · C23 doküman)

   Bu dosya veri okumaz; sunucu ve istemci AYNI kuralı paylaşsın diye ayrı
   durur (proje kalıbı: `mantik.ts` saf, `veri.ts` sunucu).

   ÜÇ DEĞİŞMEZ
   1. Bilinmeyen ≠ geçmiş. Gözden geçirme periyodu tanımsız bir belge
      "gecikmiş" DEĞİLDİR; takvimi hiç kurulmamıştır ve ayrı sayılır.
      Periyodu olup tarihi geçen belge gecikmiştir; ikisi aynı kovaya
      düşerse yönetici hangi işi yapacağını bilemez.
   2. Yürürlükte olmayan belge kontrol KARŞILAMAZ. Taslak bir politikayı
      "var" saymak denetimde en pahalı yalandır — karşılıksız kontrol
      sayımı yalnız `yururlukte` belgelere bakar.
   3. Kapsam bağı yoksa belge KURUMSALDIR. Boş liste "hiçbir santral"
      değil "santral ayrımı yok" demektir.
   ═══════════════════════════════════════════════════════════════════════ */

import type { Durum } from '@/components/kabuk/temel';

/** Belge türleri — kütüğün tamamı bu altı türden biridir. */
export const TURLER = ['politika', 'prosedur', 'talimat', 'plan', 'standart', 'form'] as const;
export type Tur = (typeof TURLER)[number];

export const TUR_SOZU: Record<Tur, string> = {
  politika: 'Politika',
  prosedur: 'Prosedür',
  talimat: 'Talimat',
  plan: 'Plan',
  standart: 'Standart',
  form: 'Form',
};

/** Yaşam döngüsü durumları. */
export const DURUMLAR = [
  'taslak', 'incelemede', 'yururlukte', 'askida', 'yururlukten_kalkti',
] as const;
export type BelgeDurumu = (typeof DURUMLAR)[number];

export const DURUM_SOZU: Record<BelgeDurumu, string> = {
  taslak: 'Taslak',
  incelemede: 'İncelemede',
  yururlukte: 'Yürürlükte',
  askida: 'Askıda',
  yururlukten_kalkti: 'Yürürlükten kalktı',
};

/* Durum → glif. `askida` ve `taslak` AYNI değildir: askıya alınmış belge bir
   zamanlar yürürlükteydi ve şimdi boşluk bırakıyor (uyumsuz); taslak henüz
   hiç yürürlüğe girmemiştir (planlı). */
export const DURUM_IM: Record<BelgeDurumu, Durum> = {
  taslak: 'pl',
  incelemede: 'pl',
  yururlukte: 'ok',
  askida: 'bd',
  yururlukten_kalkti: 'unk',
};

/** Yalnız bu durumlar bir kontrolü karşılamış sayılır (değişmez 2). */
export const KARSILAYAN: readonly BelgeDurumu[] = ['yururlukte'];

/* ── İzinli geçişler ──────────────────────────────────────────────────
   Yaşam döngüsü tek yönlü bir hat değil; ama her geçiş de serbest
   değildir. Taslaktan doğrudan yürürlüğe atlanamaz: inceleme adımı
   onaylayanın kim olduğunu kayda geçiren yerdir. */
export const GECISLER: Record<BelgeDurumu, readonly BelgeDurumu[]> = {
  taslak: ['incelemede'],
  incelemede: ['yururlukte', 'taslak'],
  yururlukte: ['askida', 'yururlukten_kalkti', 'incelemede'],
  askida: ['yururlukte', 'yururlukten_kalkti'],
  yururlukten_kalkti: [],
};

export function gecisGecerli(eski: string, yeni: string): boolean {
  const izinli = GECISLER[eski as BelgeDurumu];
  return Array.isArray(izinli) && izinli.includes(yeni as BelgeDurumu);
}

/** Yürürlüğe alma ONAY yetkisi ister; geri kalan geçişler yazma yetkisiyle. */
export const ONAY_ISTEYEN: readonly BelgeDurumu[] = ['yururlukte'];

/* ── Gözden geçirme takvimi ───────────────────────────────────────────
   Bir sonraki tarih son gözden geçirmeden, o yoksa yürürlük tarihinden
   sayılır. İkisi de yoksa takvim KURULAMAZ ve null döner — uydurulmuş bir
   tarih, "gecikmedi" diye rapor edilen bir belge demektir. */
export function sonrakiGozdenGecirme(
  gozdenGecirmeAy: number | null | undefined,
  sonGozdenGecirme: Date | null | undefined,
  yururlukTarihi: Date | null | undefined,
): Date | null {
  if (!gozdenGecirmeAy || gozdenGecirmeAy <= 0) return null;
  const taban = sonGozdenGecirme ?? yururlukTarihi;
  if (!taban) return null;
  const d = new Date(taban.getTime());
  d.setMonth(d.getMonth() + gozdenGecirmeAy);
  return d;
}

export type GozdenGecirmeHali =
  | { kod: 'gecti'; gun: number; durum: Durum }
  | { kod: 'yaklasti'; gun: number; durum: Durum }
  | { kod: 'guncel'; gun: number; durum: Durum }
  | { kod: 'takvimsiz'; gun: null; durum: Durum };

/** Gözden geçirmeye kalan gün penceresi — 30 gün içi "yaklaştı". */
export const YAKLASMA_GUNU = 30;

export function gozdenGecirmeHali(
  sonraki: Date | null | undefined, simdi: number,
): GozdenGecirmeHali {
  if (!sonraki) return { kod: 'takvimsiz', gun: null, durum: 'unk' };
  const gun = Math.floor((sonraki.getTime() - simdi) / 86_400_000);
  if (gun < 0) return { kod: 'gecti', gun, durum: 'bd' };
  if (gun <= YAKLASMA_GUNU) return { kod: 'yaklasti', gun, durum: 'md' };
  return { kod: 'guncel', gun, durum: 'ok' };
}

export function gozdenGecirmeYazisi(h: GozdenGecirmeHali): string {
  if (h.kod === 'takvimsiz') return 'periyot tanımlı değil';
  if (h.kod === 'gecti') return `${Math.abs(h.gun)} gün geçti`;
  if (h.kod === 'yaklasti') return `${h.gun} gün kaldı`;
  return `${h.gun} gün var`;
}

/* ── Satır tipi ─────────────────────────────────────────────────────── */

export type BelgeSatiri = {
  id: string;
  kod: string;
  baslik: string;
  tur: string;
  durum: string;
  surum: string;
  sahip: string | null;
  onaylayan: string | null;
  yururlukTarihi: string | null;      // ISO
  gozdenGecirmeAy: number | null;
  sonrakiGozdenGecirme: string | null; // ISO
  disKaynak: string | null;
  kaynakSistem: string | null;
  gizlilik: string;
  aciklama: string | null;
  /** Bağlı kontrol maddeleri (kod + başlık + regülasyon kodu). */
  maddeler: { id: string; kod: string; baslik: string; regulasyon: string }[];
  /** Kapsamdaki santraller; boş = kurumsal (tüm portföy). */
  tesisler: { id: string; kod: string; ad: string }[];
  /** Bu belgeden üretilmiş kanıt sayısı. */
  kanitSayisi: number;
};

/** Kapsam cümlesi — boş liste "hiçbiri" değil "ayrım yok" demektir. */
export function kapsamYazisi(tesisler: BelgeSatiri['tesisler']): string {
  if (tesisler.length === 0) return 'kurumsal · tüm portföy';
  if (tesisler.length <= 3) return tesisler.map((t) => t.kod).join(' · ');
  return `${tesisler.slice(0, 3).map((t) => t.kod).join(' · ')} +${tesisler.length - 3}`;
}

/* ── Mercekler ────────────────────────────────────────────────────────
   "Karşılıksız kontrol" bir belge merceği DEĞİL, ayrı bir panelin
   konusudur (belge listesi orada boş olurdu); mercekler yalnız kütüğü
   daraltır. */
export const MERCEKLER = [
  { kod: 'tumu', ad: 'Tümü' },
  { kod: 'yururlukte', ad: 'Yürürlükte' },
  { kod: 'gecikmis', ad: 'Gözden geçirmesi geçti' },
  { kod: 'takvimsiz', ad: 'Takvimsiz' },
  { kod: 'taslak', ad: 'Taslak · incelemede' },
  { kod: 'bagsiz', ad: 'Kontrole bağlanmamış' },
] as const;
export type Mercek = (typeof MERCEKLER)[number]['kod'];

export function mercekUygula(
  satirlar: BelgeSatiri[], mercek: Mercek, simdi: number,
): BelgeSatiri[] {
  switch (mercek) {
    case 'yururlukte':
      return satirlar.filter((s) => s.durum === 'yururlukte');
    case 'gecikmis':
      return satirlar.filter((s) => gozdenGecirmeHali(
        s.sonrakiGozdenGecirme ? new Date(s.sonrakiGozdenGecirme) : null, simdi).kod === 'gecti');
    case 'takvimsiz':
      return satirlar.filter((s) => !s.sonrakiGozdenGecirme);
    case 'taslak':
      return satirlar.filter((s) => s.durum === 'taslak' || s.durum === 'incelemede');
    case 'bagsiz':
      return satirlar.filter((s) => s.maddeler.length === 0);
    default:
      return satirlar;
  }
}

/* Arama havuzu: kod, başlık, tür sözcüğü, sahip, bağlı madde kodu, santral
   kodu. Katlama `tr-TR` yereliyle yapılır — ev kuralı (`lib/aramaKosulu.ts`
   § Türkçe uyarısı): UYDURMA ASCII katlaması YOK. Yani "KIZILDERE" içindeki
   I küçüldüğünde 'ı' olur ve ASCII 'i' ile yazılan sorgu eşleşmez. Bu bilinen
   sınır burada da aynen geçerlidir; yanlış katlama, hiç katlamamaktan zor
   teşhis edilir. */
export function aramaUygula(satirlar: BelgeSatiri[], arama: string): BelgeSatiri[] {
  const q = arama.trim().toLocaleLowerCase('tr-TR');
  if (q.length < 2) return satirlar;
  return satirlar.filter((s) => [
    s.kod, s.baslik, TUR_SOZU[s.tur as Tur] ?? s.tur, s.sahip ?? '',
    ...s.maddeler.map((m) => `${m.kod} ${m.baslik} ${m.regulasyon}`),
    ...s.tesisler.map((t) => `${t.kod} ${t.ad}`),
  ].join(' ').toLocaleLowerCase('tr-TR').includes(q));
}

/* ── Sıralama ─────────────────────────────────────────────────────────
   Varsayılan "acil önce": gözden geçirmesi geçmiş belge en üstte, takvimi
   olmayan en altta — bilinmeyen listenin başını işgal etmez. */
export const SIRALAMALAR = [
  { kod: 'acil', ad: 'Acil önce' },
  { kod: 'kod', ad: 'Kod' },
  { kod: 'baslik', ad: 'Başlık' },
  { kod: 'durum', ad: 'Durum' },
  { kod: 'kontrol', ad: 'Bağlı kontrol' },
] as const;
export type Siralama = (typeof SIRALAMALAR)[number]['kod'];

const DURUM_SIRASI: Record<string, number> = {
  askida: 0, yururlukte: 1, incelemede: 2, taslak: 3, yururlukten_kalkti: 4,
};

export function sirala(satirlar: BelgeSatiri[], siralama: Siralama, simdi: number): BelgeSatiri[] {
  const kopya = [...satirlar];
  const tr = (a: string, b: string) => a.localeCompare(b, 'tr');
  switch (siralama) {
    case 'kod':
      return kopya.sort((a, b) => tr(a.kod, b.kod));
    case 'baslik':
      return kopya.sort((a, b) => tr(a.baslik, b.baslik));
    case 'durum':
      return kopya.sort((a, b) =>
        (DURUM_SIRASI[a.durum] ?? 9) - (DURUM_SIRASI[b.durum] ?? 9) || tr(a.kod, b.kod));
    case 'kontrol':
      return kopya.sort((a, b) => b.maddeler.length - a.maddeler.length || tr(a.kod, b.kod));
    default: {
      /* Acil: gecikmiş (en çok gecikmiş önce) → yaklaşan → güncel →
         takvimsiz. Takvimsiz sona düşer ama KAYBOLMAZ. */
      const agirlik = (s: BelgeSatiri) => {
        const h = gozdenGecirmeHali(
          s.sonrakiGozdenGecirme ? new Date(s.sonrakiGozdenGecirme) : null, simdi);
        return h.kod === 'gecti' ? 0 : h.kod === 'yaklasti' ? 1 : h.kod === 'guncel' ? 2 : 3;
      };
      return kopya.sort((a, b) => {
        const fa = agirlik(a), fb = agirlik(b);
        if (fa !== fb) return fa - fb;
        const ga = a.sonrakiGozdenGecirme ? new Date(a.sonrakiGozdenGecirme).getTime() : Infinity;
        const gb = b.sonrakiGozdenGecirme ? new Date(b.sonrakiGozdenGecirme).getTime() : Infinity;
        return ga - gb || tr(a.kod, b.kod);
      });
    }
  }
}

/* ── Kütük ölçüsü ────────────────────────────────────────────────────── */

export type Olcu = {
  toplam: number;
  yururlukte: number;
  gecikmis: number;
  yaklasan: number;
  takvimsiz: number;
  taslak: number;
  bagsiz: number;
};

export function olcu(satirlar: BelgeSatiri[], simdi: number): Olcu {
  const o: Olcu = {
    toplam: satirlar.length, yururlukte: 0, gecikmis: 0,
    yaklasan: 0, takvimsiz: 0, taslak: 0, bagsiz: 0,
  };
  for (const s of satirlar) {
    if (s.durum === 'yururlukte') o.yururlukte++;
    if (s.durum === 'taslak' || s.durum === 'incelemede') o.taslak++;
    if (s.maddeler.length === 0) o.bagsiz++;
    const h = gozdenGecirmeHali(
      s.sonrakiGozdenGecirme ? new Date(s.sonrakiGozdenGecirme) : null, simdi);
    if (h.kod === 'gecti') o.gecikmis++;
    else if (h.kod === 'yaklasti') o.yaklasan++;
    else if (h.kod === 'takvimsiz') o.takvimsiz++;
  }
  return o;
}

/** Başlık cümlesi — en kötü olgu önce, iyi haber en sonda. */
export function baslikMetni(o: Olcu, karsiliksiz: number): {
  vurgu: string; ad: string; durum: Durum | undefined;
} {
  if (o.toplam === 0) return { vurgu: '', ad: 'Kütük boş', durum: undefined };
  if (o.gecikmis > 0) {
    return { vurgu: `${o.gecikmis} belge`, ad: 'gözden geçirmesi geçti', durum: 'bd' };
  }
  if (karsiliksiz > 0) {
    return { vurgu: `${karsiliksiz} kontrol`, ad: 'belgesiz', durum: 'bd' };
  }
  if (o.takvimsiz > 0) {
    return { vurgu: `${o.takvimsiz} belge`, ad: 'takvimsiz', durum: 'unk' };
  }
  if (o.yaklasan > 0) {
    return { vurgu: `${o.yaklasan} belge`, ad: 'gözden geçirme yaklaştı', durum: 'md' };
  }
  return { vurgu: `${o.yururlukte} belge`, ad: 'yürürlükte', durum: 'ok' };
}

/* ── Karşılıksız kontrol ──────────────────────────────────────────────
   Kütüğün asıl sorusu: "hangi kontrol gereğini karşılayan yürürlükte bir
   belgemiz YOK?" Taslak ya da askıdaki belge karşılamaz (değişmez 2). */

export type KontrolSatiri = {
  maddeId: string;
  kod: string;
  baslik: string;
  regulasyon: string;
  zorunlulukTipi: string;
  /** Bu maddeye bağlı belgeler; durumlarıyla birlikte. */
  belgeler: { id: string; kod: string; durum: string }[];
};

export function karsiliksizKontroller(kontroller: KontrolSatiri[]): KontrolSatiri[] {
  return kontroller.filter((k) =>
    !k.belgeler.some((b) => KARSILAYAN.includes(b.durum as BelgeDurumu)));
}

/** Yalnız taslak/askıda belgeyle "karşılanıyor" görünen kontroller — en sinsi hâl. */
export function yarimKarsilananlar(kontroller: KontrolSatiri[]): KontrolSatiri[] {
  return kontroller.filter((k) =>
    k.belgeler.length > 0
    && !k.belgeler.some((b) => KARSILAYAN.includes(b.durum as BelgeDurumu)));
}

/** Tablo dip notu — kesme ve kapsam sessiz kalmaz. */
export function dipNot(g: {
  gorunur: number; toplam: number; yuklenen: number;
}): string {
  const p = [`${g.gorunur} belge görünüyor`, 'kolon başlığından sıralama'];
  if (g.toplam > g.yuklenen) {
    p.push(`kütükte ${g.toplam} belge var, ${g.yuklenen} tanesi yüklendi`);
  }
  return p.join(' · ');
}

/** Kod önerisi: POL-2026-003 gibi; tür ön ekiyle ve yılla. */
export const TUR_ONEKI: Record<Tur, string> = {
  politika: 'POL', prosedur: 'PRS', talimat: 'TLM',
  plan: 'PLN', standart: 'STD', form: 'FRM',
};

export function kodOner(tur: Tur, mevcutKodlar: string[], yil: number): string {
  const onek = `${TUR_ONEKI[tur]}-${yil}-`;
  const enBuyuk = mevcutKodlar
    .filter((k) => k.startsWith(onek))
    .map((k) => Number.parseInt(k.slice(onek.length), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${onek}${String(enBuyuk + 1).padStart(3, '0')}`;
}
