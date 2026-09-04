import type { BildirimDurumu } from '@/lib/uyum/bildirimSuresi';
import type { Durum } from '@/components/kabuk/temel';

/* O · Olay → etki zinciri — saf türetme katmanı.

   Sunucu ham kaydı serileştirir, karar burada verilir; aynı kurallar hem
   metrikte hem tabloda hem çekmecede tek yerden okunur.

   Bu dosya `lib/motorlar/olayEtki.ts` içindeki tiplerin İSTEMCİ İKİZİdir:
   motor `server-only` taşır, istemci paketine giremez. Alan adları birebir
   aynıdır; sunucu sayfası motor çıktısını buradaki tiplere serileştirir.

   ─ EKRANIN SERT KURALI ──────────────────────────────────────────────────
   ÖNERİ ile DOĞRULANMIŞ ETKİ asla aynı yerde, aynı biçimde gösterilmez.
   Doğrulanmış etki gerçek değerdir (koyu, kendi renginde); öneri gri ve
   elmas işaretlidir, yanında hep "öneri" sözcüğü ve dayanağı durur.
   Doğrulanmamış öneri hiçbir sayımda "etki" sayılmaz. */

export const ETKI_ALANLARI = [
  'uretimEtkisi', 'emniyetEtkisi', 'regulasyonEtkisi', 'siberEtki',
] as const;
export type EtkiAlani = (typeof ETKI_ALANLARI)[number];

export const ETKI_ALAN_ETIKET: Record<EtkiAlani, string> = {
  uretimEtkisi: 'Üretim', emniyetEtkisi: 'Emniyet',
  regulasyonEtkisi: 'Regülasyon', siberEtki: 'Siber',
};

export const SEVIYE_ETIKET: Record<string, string> = {
  bilinmiyor: 'Bilinmiyor', yok: 'Yok', dusuk: 'Düşük', orta: 'Orta',
  yuksek: 'Yüksek', kritik: 'Kritik', uretim_durdu: 'Üretim durdu',
  uretim_durur: 'Üretim durur',
};

/** Doğrulamada seçilebilecek değerler — motorun `SEVIYE_KUMESI` ikizi. */
export const SEVIYE_KUMESI: Record<EtkiAlani, string[]> = {
  uretimEtkisi: ['yok', 'dusuk', 'orta', 'yuksek', 'uretim_durdu'],
  emniyetEtkisi: ['yok', 'dusuk', 'orta', 'yuksek', 'kritik'],
  regulasyonEtkisi: ['yok', 'dusuk', 'orta', 'yuksek', 'kritik'],
  siberEtki: ['yok', 'dusuk', 'orta', 'yuksek', 'kritik'],
};

const SIRA: Record<string, number> = {
  bilinmiyor: -1, yok: 0, dusuk: 1, orta: 2, yuksek: 3, kritik: 4, uretim_durdu: 5,
};

export const KOPUKLUK_SOZU: Record<string, string> = {
  sistem_yok: 'varlık bir sisteme bağlı değil',
  surec_yok: 'sistem hiçbir iş sürecine bağlı değil',
  tesis_yok: 'iş sürecinin tesisi kayıtlı değil',
};

/** Şiddet kademesi — canvas'ta sözcük yerine harf durur (06 §A2). */
export const KADEME: Record<string, string> = {
  kritik: 'A', yuksek: 'B', orta: 'C', dusuk: 'D',
};
const SIDDET_SIRA: Record<string, number> = { kritik: 0, yuksek: 1, orta: 2, dusuk: 3 };

/** Olay durumunun sözcüğü — YALNIZ çekmece kimlik bloğunda kullanılır. */
export const OLAY_DURUM_SOZU: Record<string, string> = {
  acik: 'Açık', mudahale: 'Müdahalede', cozuldu: 'Çözüldü', kapali: 'Kapalı',
};

export const TESPIT_SOZU: Record<string, string> = {
  siem: 'SIEM', operator: 'Operatör', tedarikci: 'Tedarikçi',
  denetim: 'Denetim', musteri: 'Müşteri', otomatik_kural: 'Otomatik kural',
};

/* ── yazma yüzeyinin sözlükleri ────────────────────────────────────────
   `lib/eylemler2/olay.ts` ve `operasyon.ts` içindeki enum'ların İSTEMCİ
   İKİZİ. Sunucu son sözü söyler; buradaki listeler yalnız kullanıcıya
   geçersiz seçenek sunmamak için var. Bir değeri buradan silmek sunucuda
   silmez — ikisi birlikte değişir. */

export const SIDDETLER = ['dusuk', 'orta', 'yuksek', 'kritik'] as const;
export const DURUMLAR = ['acik', 'mudahale', 'cozuldu', 'kapali'] as const;
export const TESPIT_KAYNAKLARI = [
  'siem', 'operator', 'tedarikci', 'denetim', 'musteri', 'otomatik_kural',
] as const;
export const TIPLER = ['olay', 'problem'] as const;
export const TIP_SOZU: Record<string, string> = { olay: 'Olay', problem: 'Problem' };
export const SIDDET_SOZU: Record<string, string> = {
  dusuk: 'Düşük', orta: 'Orta', yuksek: 'Yüksek', kritik: 'Kritik',
};

/** Zincir bağ tipleri — `lib/eylemler2/olay.ts` BAG_TIPLERI ikizi. */
export const BAG_TIPLERI = [
  'varlik', 'sistem', 'risk', 'bulgu', 'proje', 'degisiklik',
] as const;
export type BagTipi = (typeof BAG_TIPLERI)[number];

export const BAG_ETIKET: Record<BagTipi, string> = {
  varlik: 'Varlık', sistem: 'Sistem', risk: 'Risk',
  bulgu: 'Bulgu', proje: 'Proje', degisiklik: 'Değişiklik',
};

/** Bağlanabilecek kayıt — sunucu kapsamla daralttıktan sonra taşınır. */
export type BagAdayi = { id: string; kod: string; alt: string };

/** Santral seçimi (yeni olay formu). */
export type Santral = { id: string; kod: string; ad: string };

/* ── serileştirilmiş kayıtlar ─────────────────────────────────────────── */

export type HalkaGorunumu = {
  giris: 'varlik' | 'sistem';
  varlik: { id: string; etiket: string; ad: string; kritiklik: string; rol: string } | null;
  sistem: { id: string; kod: string; ad: string; kritiklik: string } | null;
  surecler: { id: string; kod: string; ad: string; uretimEtkisi: string }[];
  tesisler: {
    id: string; kod: string; ad: string;
    kritiklikSinifi: string | null; kritikAltyapi: boolean | null;
  }[];
  kopukluk: string | null;
};

export type OneriGorunumu = {
  uretilme: string;
  degerler: Record<EtkiAlani, string>;
  dayanaklar: Record<EtkiAlani, string>;
  zincir: HalkaGorunumu[];
};

export type Bag = { id: string; kod: string; alt: string; yol: string };

export type OlayKaydi = {
  id: string;
  kod: string;
  baslik: string;
  tip: string;
  siddet: string;
  durum: string;
  baslangic: string;
  cozum: string | null;
  ozet: string | null;
  tesisId: string | null;
  tesisKod: string | null;
  tesisAd: string | null;
  tespitKaynagi: string | null;
  /** DOĞRULANMIŞ etki — null = değerlendirilmedi (sıfır değil) */
  etki: Record<EtkiAlani, string | null>;
  dogrulayan: string | null;
  dogrulamaZamani: string | null;
  /** Motor önerisi — okunamadıysa null ve `oneriBozuk` true */
  oneri: OneriGorunumu | null;
  oneriBozuk: boolean;
  kokNeden: string | null;
  sinirlama: string | null;
  kurtarma: string | null;
  ogrenilenler: string | null;
  bildirimGerekli: boolean | null;
  bildirimTarihi: string | null;
  /* UY-63 · Bildirim SÜRESİ. Karar sunucuda verilir (kural kütüğü +
     santralin regülasyon kapsamı); istemci kendi saatine göre
     "geciktiniz" demez. Kural tanımlı değilse `durum` daima
     `yukumluluk_yok`tur ve ürün bir süre UYDURMAZ. */
  bildirim: {
    durum: BildirimDurumu;
    sonTarih: string | null;
    kalanDakika: number | null;
    kural: { ad: string; merci: string; sureSaat: number } | null;
  };
  /* Zincir bağları. `varliklar`/`sistemler` etki önerisini BESLER; öneri
     zincirinden AYRI taşınır çünkü öneri üretilmemişken de bağ vardır —
     "öneri yok" ile "bağ yok" karıştırılmamalı. */
  varliklar: Bag[];
  sistemler: Bag[];
  riskler: Bag[];
  bulgular: Bag[];
  projeler: Bag[];
  degisiklikler: Bag[];
  /** Kullanıcı bu olayın santral kapsamında yazabiliyor mu (satır bazlı). */
  yazilabilir: boolean;
};

/** Olayın belirli bir tipteki mevcut bağları — çekmece bunu tek yerden okur. */
export function baglar(o: OlayKaydi, tip: BagTipi): Bag[] {
  switch (tip) {
    case 'varlik': return o.varliklar;
    case 'sistem': return o.sistemler;
    case 'risk': return o.riskler;
    case 'bulgu': return o.bulgular;
    case 'proje': return o.projeler;
    case 'degisiklik': return o.degisiklikler;
  }
}

export const bagSayisi = (o: OlayKaydi) =>
  BAG_TIPLERI.reduce((a, t) => a + baglar(o, t).length, 0);

/* ── türetme ──────────────────────────────────────────────────────────── */

export const varlikSayisi = (o: OlayKaydi) =>
  o.oneri?.zincir.filter((h) => h.varlik).length ?? 0;
export const sistemSayisi = (o: OlayKaydi) =>
  new Set((o.oneri?.zincir ?? []).map((h) => h.sistem?.id).filter(Boolean)).size;
export const surecSayisi = (o: OlayKaydi) =>
  new Set((o.oneri?.zincir ?? []).flatMap((h) => h.surecler.map((s) => s.id))).size;
export const tesisSayisi = (o: OlayKaydi) =>
  new Set((o.oneri?.zincir ?? []).flatMap((h) => h.tesisler.map((t) => t.id))).size;

/** Zincir kopuk mu: hiç halka yok ya da bir halka tesise ulaşamıyor. */
export function zincirKopuk(o: OlayKaydi): boolean {
  if (!o.oneri) return true;
  if (o.oneri.zincir.length === 0) return true;
  return o.oneri.zincir.some((h) => h.kopukluk !== null);
}

/** İnsan kararı bekleyen alanlar: motor bir şey söylemiş ama alan hâlâ boş. */
export function bekleyenAlanlar(o: OlayKaydi): EtkiAlani[] {
  if (!o.oneri) return [];
  return ETKI_ALANLARI.filter((a) =>
    o.oneri!.degerler[a] !== 'bilinmiyor' && o.etki[a] === null);
}

/** Doğrulanmış alanlar — raporun "etki" saydığı tek küme. */
export function dogrulanmisAlanlar(o: OlayKaydi): EtkiAlani[] {
  return ETKI_ALANLARI.filter((a) => o.etki[a] !== null);
}

export const acikMi = (o: OlayKaydi) => o.durum === 'acik' || o.durum === 'mudahale';

/** Bildirimi gereken ama tarihi girilmemiş olay — regülasyon saati işliyor. */
export const bildirimBekliyor = (o: OlayKaydi) =>
  o.bildirimGerekli === true && o.bildirimTarihi === null;

/** UY-63 · Süresi geçmiş ya da geç yapılmış bildirim — kusur. */
export const bildirimKusurlu = (o: OlayKaydi) =>
  o.bildirim.durum === 'GECIKTI' || o.bildirim.durum === 'gec_bildirildi';

/** Satır işaretçisi. Sıra: sert olgu → bekleyen karar → değerlendirilemez → sakin. */
export function olayImi(o: OlayKaydi): Durum {
  const dogrulanmisUretim = o.etki.uretimEtkisi;
  const sert = acikMi(o) && (
    o.siddet === 'kritik'
    || bildirimBekliyor(o)
    || (dogrulanmisUretim !== null && SIRA[dogrulanmisUretim] >= SIRA.yuksek));
  if (sert) return 'bd';
  if (bekleyenAlanlar(o).length > 0) return 'md';
  if (zincirKopuk(o)) return 'unk';
  if (acikMi(o)) return 'pl';
  return 'ok';
}

/** Çekmece kimlik bloğunun sözcüğü — durum sözcüğünün TEK yaşadığı yer. */
export function imSozu(o: OlayKaydi): string {
  const durum = OLAY_DURUM_SOZU[o.durum] ?? o.durum;
  const bekleyen = bekleyenAlanlar(o).length;
  if (bekleyen > 0) return `${durum} · ${bekleyen} etki önerisi doğrulanmadı`;
  if (o.oneriBozuk) return `${durum} · öneri kaydı okunamadı`;
  if (o.oneri === null) return `${durum} · etki önerisi üretilmedi`;
  if (zincirKopuk(o)) return `${durum} · etki zinciri kurulamadı`;
  return durum;
}

/** Satırın alt satırı: durumu TEKRAR ETMEZ, olguyu yazar. */
export function olgu(o: OlayKaydi): string {
  const parcalar = [
    o.kod,
    `şiddet ${KADEME[o.siddet] ?? '—'}`,
    o.tesisKod ?? 'santral kaydı yok',
  ];
  if (bildirimBekliyor(o)) parcalar.push('bildirim tarihi girilmemiş');
  else if (zincirKopuk(o)) {
    const ilk = o.oneri?.zincir.find((h) => h.kopukluk !== null);
    parcalar.push(ilk
      ? `zincir kopuk · ${KOPUKLUK_SOZU[ilk.kopukluk as string] ?? ilk.kopukluk}`
      : o.oneriBozuk ? 'öneri kaydı okunamadı'
        : o.oneri === null ? 'etki önerisi üretilmedi'
          : 'zincir kurulmadı · varlık/sistem bağı yok');
  } else {
    const bekleyen = bekleyenAlanlar(o).length;
    if (bekleyen > 0) parcalar.push(`${bekleyen} öneri doğrulama bekliyor`);
  }
  return parcalar.join(' · ');
}

/** Zincir hücresi: `3 varlık → 2 sistem → 1 süreç → 1 tesis`. */
export function zincirOzeti(o: OlayKaydi): string {
  // Öneri hiç üretilmediyse "bağ yok" DENMEZ — ölçülmemiş ile boş ayrıdır.
  if (o.oneriBozuk) return 'öneri okunamadı';
  if (o.oneri === null) return 'öneri üretilmedi';
  const v = varlikSayisi(o);
  const s = sistemSayisi(o);
  if (v === 0 && s === 0) {
    /* Bağ VAR ama öneride görünmüyorsa "bağ yok" yazmak yalan olur —
       öneri bağdan sonra üretilmemiştir. İki durumu ayırıyoruz. */
    return o.varliklar.length + o.sistemler.length > 0
      ? 'öneri bağlardan eski' : 'bağ yok';
  }
  const p = surecSayisi(o);
  const t = tesisSayisi(o);
  return [
    v > 0 ? `${v} varlık` : null,
    `${s} sistem`,
    `${p} süreç`,
    `${t} tesis`,
  ].filter(Boolean).join(' → ');
}

/** Sıralama: sert olgular üstte, sonra şiddet, sonra en yeni olay. */
export function sirala(a: OlayKaydi, b: OlayKaydi): number {
  const IM_SIRA: Record<Durum, number> = { bd: 0, md: 1, unk: 2, pl: 3, ok: 4, tamam: 5 };
  const fark = IM_SIRA[olayImi(a)] - IM_SIRA[olayImi(b)];
  if (fark !== 0) return fark;
  const s = (SIDDET_SIRA[a.siddet] ?? 9) - (SIDDET_SIRA[b.siddet] ?? 9);
  if (s !== 0) return s;
  return new Date(b.baslangic).getTime() - new Date(a.baslangic).getTime();
}

/** Kuyruğa asla inmeyen satır: kapanmamış sert olgu ya da bekleyen karar. */
export const surukleyici = (o: OlayKaydi) =>
  olayImi(o) === 'bd' || olayImi(o) === 'md';

export const seviyeSozu = (d: string | null | undefined): string =>
  (d ? SEVIYE_ETIKET[d] ?? d : '—');

/** Etki seviyesinin taşıdığı görsel durum — doğrulanmış değer için. */
export function seviyeDurumu(alan: EtkiAlani, deger: string | null): Durum {
  if (deger === null) return 'unk';
  const p = SIRA[deger] ?? -1;
  if (alan === 'uretimEtkisi' && deger === 'uretim_durdu') return 'bd';
  if (p >= SIRA.yuksek) return 'bd';
  if (p >= SIRA.dusuk) return 'md';
  return 'ok';
}
