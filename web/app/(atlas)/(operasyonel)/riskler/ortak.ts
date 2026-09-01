import type { Durum } from '@/components/atlas/temel';
import { ETKI_BOYUTLARI } from '@/lib/sabitler';

/* O3/O4 · Risk kütüğü — sunucu ve istemcinin PAYLAŞTIĞI tipler ve saf
   hesaplar. Skor kuralı lib/eylemler2/risk.ts ile birebir aynıdır:
   bilinmeyen (null) boyut hesaba KATILMAZ, sıfır sayılmaz. */

export type EtkiAnahtari = (typeof ETKI_BOYUTLARI)[number][0];

export type Kisi = { id: string; ad: string };
export type Kodlu = { id: string; kod: string; ad: string };
export type BulguSecenegi = { id: string; baslik: string };

export type R = {
  id: string;
  kod: string;
  baslik: string;
  aciklama: string;
  kaynak: string | null;
  tehdit: string | null;
  zayiflik: string | null;
  /** telafi edici kontroller — O4 yan panelindeki popover'ın kaynağı */
  mevcutKontroller: string | null;
  olasilik: number | null;
  etkiler: Record<EtkiAnahtari, number | null>;
  dogalRisk: number | null;
  artikRisk: number | null;
  islemTipi: string | null;
  islemTarihi: string | null;
  kabulBitis: string | null;
  durum: string;
  olusturuldu: string;
  guncellendi: string;
  tesis: { id: string; kod: string; ad: string } | null;
  sistem: { id: string; kod: string; ad: string } | null;
  sahip: Kisi | null;
  onaylayan: Kisi | null;
  bulgu: { id: string; baslik: string; durum: string; hedef: string | null } | null;
  varliklar: { id: string; etiket: string; ad: string; sinif: string }[];
  kontroller: { id: string; kod: string; baslik: string }[];
  projeler: { id: string; kod: string; ad: string; durum: string; ilerleme: number | null }[];
  /** bağlı varlıkların sınıfı OT / BT-OT köprüsü içeriyor mu (O3 "OT" filtresi) */
  ot: boolean;
  /** tesis alanı boşsa varlıkların yayıldığı santral sayısı — "4 santral" */
  santralSayisi: number;
};

/* ── Skor ───────────────────────────────────────────────────────────── */

/** Etki = boyutların EN BÜYÜĞÜ; hepsi bilinmiyorsa null (0 değil). */
export function maxEtki(etkiler: Record<EtkiAnahtari, number | null>): number | null {
  const bilinen = Object.values(etkiler).filter((v): v is number => v !== null);
  return bilinen.length ? Math.max(...bilinen) : null;
}

export function skorHesapla(
  olasilik: number | null,
  etkiler: Record<EtkiAnahtari, number | null>,
): number | null {
  const e = maxEtki(etkiler);
  return olasilik !== null && e !== null ? olasilik * e : null;
}

/** ≥15 kritik · 8–14 kısmi · 1–7 düşük · null bilinmeyen (elmas). */
export function skorDurumu(skor: number | null | undefined): Durum {
  if (skor === null || skor === undefined) return 'unk';
  if (skor >= 15) return 'bd';
  if (skor >= 8) return 'md';
  return 'ok';
}

export const SKOR_TAVANI = 25;

/** Tik şeridindeki tik sayısı — 5×5 matrisin bir kenarı. */
export const SKOR_TIK = 5;

/**
 * Skorun tik şeridindeki AĞIRLIĞI (0..SKOR_TIK).
 *
 * Neden var: kütükte şiddet bugüne kadar YALNIZ skor rakamının rengiyle
 * taşınıyordu. "Durum yalnız renkle anlatılmaz" sözleşmesi bu satırda
 * çiğneniyordu: renk göremeyen ya da düşük kontrastlı bir ekranda 22 ile 4
 * aynı görünüyordu — ikisi de iki haneli olmayan bir rakam. Şerit aynı
 * bilgiyi UZUNLUKLA da kodlar, "kritik satır bir saniyede ayrışır" hedefi
 * renge bağlı kalmaz.
 *
 * Skorsuz risk `null` döner: ölçülmemiş bir risk SIFIR ağırlıklı değildir,
 * şerit onu kesikli çizer.
 */
export function skorAgirligi(skor: number | null | undefined): number | null {
  if (skor === null || skor === undefined) return null;
  const k = Math.max(0, Math.min(SKOR_TAVANI, skor));
  // Tavana oranla yukarı yuvarlanır: 1 puanlık bir risk bile bir tik alır,
  // "hiç" ile "az" karışmasın.
  return Math.max(1, Math.ceil((k / SKOR_TAVANI) * SKOR_TIK));
}

/* ── Zaman ──────────────────────────────────────────────────────────── */

export function gunFarki(t: string | null | undefined): number | null {
  if (!t) return null;
  const z = new Date(t).getTime();
  return Number.isNaN(z) ? null : Math.floor((Date.now() - z) / 86_400_000);
}

/** Süreli kabulün süresi doldu mu (§13.2). */
export function kabulDoldu(r: Pick<R, 'durum' | 'kabulBitis'>): boolean {
  return r.durum === 'kabul_edildi' && !!r.kabulBitis
    && new Date(r.kabulBitis).getTime() < Date.now();
}

/** Taahhüdü aşan risk: süresi dolan kabul VEYA hedefi geçmiş açık bulgu.
    Bu satırlar sıralamadan bağımsız üste sabitlenir ve ASLA toplanmaz. */
export function gecikmis(r: Pick<R, 'durum' | 'kabulBitis' | 'bulgu'>): boolean {
  if (kabulDoldu(r)) return true;
  if (r.durum === 'kapali') return false;
  const b = r.bulgu;
  if (!b || !b.hedef) return false;
  if (b.durum === 'kapali' || b.durum === 'kabul_edildi') return false;
  return new Date(b.hedef).getTime() < Date.now();
}

export function aktifMi(r: Pick<R, 'durum'>): boolean {
  return r.durum !== 'kapali';
}

/* ── Sunucu → istemci eşlemesi ──────────────────────────────────────── */

/** Prisma satırının R'ye indirgenmiş biçimi — iki rota da bunu kullanır,
    böylece liste ile detay aynı alan adlarını konuşur. */
export type HamRisk = {
  id: string; kod: string; baslik: string; aciklama: string; kaynak: string | null;
  tehdit: string | null; zayiflik: string | null; mevcutKontroller: string | null;
  olasilik: number | null;
  etkiUretim: number | null; etkiEmniyet: number | null; etkiRegulasyon: number | null;
  etkiFinans: number | null; etkiSiber: number | null; etkiItibar: number | null;
  etkiCevre: number | null; etkiVeri: number | null;
  dogalRisk: number | null; artikRisk: number | null;
  islemTipi: string | null; islemTarihi: Date | null; kabulBitis: Date | null;
  durum: string; olusturuldu: Date; guncellendi: Date;
  tesis: { id: string; kod: string; ad: string } | null;
  sistem: { id: string; kod: string; ad: string } | null;
  sahip: { id: string; adSoyad: string } | null;
  onaylayan: { id: string; adSoyad: string } | null;
  bulgu: { id: string; baslik: string; durum: string; hedefTarih: Date | null } | null;
  varliklar: { varlik: { id: string; etiket: string; ad: string; tesisId: string | null;
    tur: { sinif: string } } }[];
  kontroller: { madde: { id: string; kod: string; baslik: string } }[];
  projeler: { proje: { id: string; kod: string; ad: string; durum: string;
    kilometreTaslari: { durum: string }[] } }[];
};

const OT_SINIFLARI = new Set(['OT', 'BT_OT_KOPRU']);

/**
 * Prisma satırını R'ye indirger.
 *
 * `gorulebilir` bir SANTRAL KAPSAMI süzgecidir ve riske bağlı varlıklara
 * uygulanır: kapsam dışı bir varlığın etiketi/adı ekrana çıkmaz. Süzgeç
 * burada — türetmelerden ÖNCE — çalışır ki `ot` ve `santralSayisi` de
 * daraltılmış kümeden hesaplansın; satırı gizleyip sayacı bırakmak, sayıyı
 * sızıntıya çevirirdi.
 *
 * Varsayılan "hepsi görünür"dür: kapsam kararı sunucudaki çağıranın
 * (riskler/veri.ts) işidir, bu saf fonksiyonun değil — ortak.ts istemciyle
 * paylaşıldığı için `app/kapsam.ts` (server-only) buraya import EDİLEMEZ.
 */
export function riskeCevir(
  r: HamRisk,
  gorulebilir: (tesisId: string | null) => boolean = () => true,
): R {
  const varliklar = r.varliklar.map((v) => v.varlik).filter((v) => gorulebilir(v.tesisId));
  const santraller = new Set(varliklar.map((v) => v.tesisId).filter((x): x is string => !!x));
  return {
    id: r.id, kod: r.kod, baslik: r.baslik, aciklama: r.aciklama, kaynak: r.kaynak,
    tehdit: r.tehdit, zayiflik: r.zayiflik, mevcutKontroller: r.mevcutKontroller,
    olasilik: r.olasilik,
    etkiler: {
      etkiUretim: r.etkiUretim, etkiEmniyet: r.etkiEmniyet,
      etkiRegulasyon: r.etkiRegulasyon, etkiFinans: r.etkiFinans,
      etkiSiber: r.etkiSiber, etkiItibar: r.etkiItibar,
      etkiCevre: r.etkiCevre, etkiVeri: r.etkiVeri,
    },
    dogalRisk: r.dogalRisk, artikRisk: r.artikRisk,
    islemTipi: r.islemTipi,
    islemTarihi: r.islemTarihi?.toISOString() ?? null,
    kabulBitis: r.kabulBitis?.toISOString() ?? null,
    durum: r.durum,
    olusturuldu: r.olusturuldu.toISOString(),
    guncellendi: r.guncellendi.toISOString(),
    tesis: r.tesis, sistem: r.sistem,
    sahip: r.sahip ? { id: r.sahip.id, ad: r.sahip.adSoyad } : null,
    onaylayan: r.onaylayan ? { id: r.onaylayan.id, ad: r.onaylayan.adSoyad } : null,
    bulgu: r.bulgu
      ? { id: r.bulgu.id, baslik: r.bulgu.baslik, durum: r.bulgu.durum,
          hedef: r.bulgu.hedefTarih?.toISOString() ?? null }
      : null,
    varliklar: varliklar.map((v) => ({
      id: v.id, etiket: v.etiket, ad: v.ad, sinif: v.tur.sinif,
    })),
    kontroller: r.kontroller.map((c) => c.madde),
    projeler: r.projeler.map((p) => {
      const kt = p.proje.kilometreTaslari;
      const biten = kt.filter((m) => m.durum === 'tamamlandi').length;
      return {
        id: p.proje.id, kod: p.proje.kod, ad: p.proje.ad, durum: p.proje.durum,
        // Kilometre taşı yoksa ilerleme BİLİNMİYOR — %0 uydurulmaz (§19).
        ilerleme: kt.length ? Math.round((biten / kt.length) * 100) : null,
      };
    }),
    ot: varliklar.some((v) => OT_SINIFLARI.has(v.tur.sinif)),
    santralSayisi: santraller.size,
  };
}

/** Prisma include ağacı — liste ve detay aynı ağacı kullanır. */
export const RISK_ICERIK = {
  tesis: { select: { id: true, kod: true, ad: true } },
  sistem: { select: { id: true, kod: true, ad: true } },
  sahip: { select: { id: true, adSoyad: true } },
  onaylayan: { select: { id: true, adSoyad: true } },
  bulgu: { select: { id: true, baslik: true, durum: true, hedefTarih: true } },
  varliklar: {
    select: {
      varlik: {
        select: {
          id: true, etiket: true, ad: true, tesisId: true,
          tur: { select: { sinif: true } },
        },
      },
    },
  },
  kontroller: { select: { madde: { select: { id: true, kod: true, baslik: true } } } },
  projeler: {
    select: {
      proje: {
        select: {
          id: true, kod: true, ad: true, durum: true,
          kilometreTaslari: { select: { durum: true } },
        },
      },
    },
  },
} as const;

/* ── Görüntü metinleri ──────────────────────────────────────────────── */

/** Satırın santral hücresi: tesis · yoksa varlıkların yayılımı · yoksa portföy. */
export function santralMetni(r: Pick<R, 'tesis' | 'santralSayisi'>): string {
  if (r.tesis) return r.tesis.ad;
  if (r.santralSayisi > 1) return `${r.santralSayisi} santral`;
  return 'portföy';
}

/** Satır alt satırı: kayıt kimliği + EN FAZLA bir olgu. Durum tekrar edilmez. */
export function altSatir(r: R): string {
  if (r.sistem) return `${r.kod} · ${r.sistem.kod}`;
  if (r.varliklar.length) return `${r.kod} · ${r.varliklar.length} varlık`;
  if (r.kontroller.length) return `${r.kod} · ${r.kontroller[0].kod}`;
  return r.kod;
}
