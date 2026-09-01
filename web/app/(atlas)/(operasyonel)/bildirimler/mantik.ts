import type { Durum } from '@/components/atlas/temel';

/* O25 · Bildirim kutusu — saf türetme katmanı.

   Veritabanı, React ve `server-only` bağımlılığı YOKTUR: testten doğrudan
   çağrılabilir. Sunucu sayfası ham kaydı serileştirir, karar burada verilir.

   ─ EKRANIN SERT KURALLARI ───────────────────────────────────────────────
   1. KUTU KİŞİSELDİR. `Bildirim.kullaniciId` bir sahiplik alanıdır, bir
      etiket değil: kullanıcı yalnız kendi bildirimini görür ve yalnız
      kendininkini okundu işaretler. Sunucu (`lib/eylemler2/bildirim.ts`)
      aynı kuralı yeniden uygular; buradaki hiçbir hesap güvenlik sınırı
      değildir.
   2. KAYNAK KAPSAMI AYRI BİR SORUDUR. Bildirimin kendisi kullanıcıya
      yazılmıştır, ama işaret ettiği KAYIT bir santrale ait olabilir ve
      kullanıcının o santral için okuma yetkisi bugün olmayabilir (yetki
      bildirimden sonra daraltılmış olabilir). O durumda satır listede
      KALIR — kullanıcıya gerçekten gönderilmiş bir uyarıyı silmek kaydı
      yok saymak olurdu — ama kayda GİDEN BAĞ verilmez.
   3. BİLİNMEYEN ≠ SIFIR. Kaynağı çözülemeyen bildirimin santrali
      "kapsam dışı" DEĞİL, "bilinmiyor"dur; okunmamış bildirim yokken
      "en eski okunmamış" sıfır gün değil, ölçülecek bir şey yok demektir. */

/* ═══ Sözlükler ═══════════════════════════════════════════════════════ */

/** `Bildirim.tip` — şemadaki üç değer (bilgi | uyari | eskalasyon). */
export const TIP_SOZU: Record<string, string> = {
  bilgi: 'Bilgi',
  uyari: 'Uyarı',
  eskalasyon: 'Eskalasyon',
};

/** Kaynak kaydın türü → insan sözü. Tanınmayan tür OLDUĞU GİBİ gösterilir. */
export const KAYNAK_SOZU: Record<string, string> = {
  Bulgu: 'Bulgu',
  Aksiyon: 'Aksiyon',
  Risk: 'Risk',
  Sertifika: 'Sertifika',
  Denetim: 'Denetim',
  MaddeDurumu: 'Madde durumu',
};

/**
 * Kaynak kaydın santral kapsamı karşısındaki hâli — ÜÇ değer, ikisi değil.
 * `kapsamda`  = kayıt çözüldü ve kullanıcının kapsamında,
 * `kapsamDisi`= kayıt çözüldü ve kapsamın dışında (bağ verilmez),
 * `bilinmiyor`= kaynak hiç çözülemedi (tür yok, kayıt silinmiş, santral
 *               taşımayan tür). Bu SIFIR ya da "kapsam dışı" DEĞİLDİR.
 */
export type KaynakHali = 'kapsamda' | 'kapsamDisi' | 'bilinmiyor';

export const KAYNAK_HAL_SOZU: Record<KaynakHali, string> = {
  kapsamda: 'kayda gidilebilir',
  kapsamDisi: 'kaynak kayıt santral kapsamınız dışında',
  bilinmiyor: 'kaynak kayıt çözülemedi — santrali bilinmiyor',
};

/* ═══ Serileştirilmiş kayıt ═══════════════════════════════════════════ */

export type BildirimSatiri = {
  id: string;
  baslik: string;
  govde: string | null;
  tip: string;
  kaynakTipi: string | null;
  kaynakId: string | null;
  /** okundu damgası (ISO) — null = okunmadı */
  okundu: string | null;
  olusturuldu: string;
  kaynakHali: KaynakHali;
  /** yalnız `kaynakHali === 'kapsamda'` iken dolar */
  kaynakYolu: string | null;
  /** kaynağın santral kodu — bilinmiyorsa null (sıfır değil) */
  tesisKodu: string | null;
};

/* ═══ Türetmeler ══════════════════════════════════════════════════════ */

export const okunmamisMi = (b: BildirimSatiri): boolean => b.okundu === null;

/**
 * Satır işaretçisi OKUNMA HÂLİNİ kodlar, tipi değil: tip kendi kolonunda
 * kelimeyle durur ve işaretçinin yanında tekrar edilmez (Atlas §A2).
 * Okunmamış bir bildirim "değerlendirilmedi"dir — tam olarak `unk`.
 */
export function bildirimImi(b: BildirimSatiri): Durum {
  if (!okunmamisMi(b)) return 'tamam';
  return b.tip === 'eskalasyon' ? 'bd' : b.tip === 'uyari' ? 'md' : 'unk';
}

/** Seçili satırın sol kenarı — okunmamış eskalasyon listede kaybolmasın. */
export function bildirimKenari(b: BildirimSatiri): Durum {
  return bildirimImi(b);
}

/** Bir bildirimin kaç gündür okunmadığı; okunmuşsa null (sıfır DEĞİL). */
export function bekleyenGun(b: BildirimSatiri, simdi: number): number | null {
  if (!okunmamisMi(b)) return null;
  const fark = simdi - Date.parse(b.olusturuldu);
  return Number.isFinite(fark) ? Math.max(0, Math.floor(fark / 86_400_000)) : null;
}

/* ═══ Filtre · sıralama · katlama ═════════════════════════════════════ */

export type Mercek = 'okunmamis' | 'eskalasyon' | 'okundu' | 'hepsi';

export const MERCEKLER: { id: Mercek; ad: string }[] = [
  { id: 'okunmamis', ad: 'Okunmamış' },
  { id: 'eskalasyon', ad: 'Eskalasyon & uyarı' },
  { id: 'okundu', ad: 'Okunmuş' },
  { id: 'hepsi', ad: 'Tümü' },
];

export function mercekten(b: BildirimSatiri, m: Mercek): boolean {
  switch (m) {
    case 'okunmamis': return okunmamisMi(b);
    case 'eskalasyon': return b.tip === 'eskalasyon' || b.tip === 'uyari';
    case 'okundu': return !okunmamisMi(b);
    default: return true;
  }
}

/** Yoğunluk sözleşmesi: 5–9 görünür satır, gerisi katlanmış kuyruğa iner. */
export const GORUNUR_TAVAN = 9;

/** Okunmuş bildirim kuyruğa inebilir; OKUNMAMIŞ asla katlanmaz. */
export const toplanabilir = (b: BildirimSatiri): boolean => !okunmamisMi(b);

const TIP_SIRASI: Record<string, number> = { eskalasyon: 0, uyari: 1, bilgi: 2 };

export function sirala(satirlar: BildirimSatiri[]): BildirimSatiri[] {
  return [...satirlar].sort((a, b) =>
    Number(okunmamisMi(b)) - Number(okunmamisMi(a))
    || (TIP_SIRASI[a.tip] ?? 9) - (TIP_SIRASI[b.tip] ?? 9)
    || b.olusturuldu.localeCompare(a.olusturuldu));
}

/* ═══ Metrikler ═══════════════════════════════════════════════════════ */

export type Sayim = {
  okunmamis: number;
  /** okunmamış eskalasyon + uyarı — kararı değiştiren sayı */
  okunmamisUyari: number;
  /** en eski okunmamışın yaşı (gün); okunmamış yoksa null — SIFIR DEĞİL */
  enEskiGun: number | null;
  /** kaynağı çözülemeyen bildirim — "kapsam dışı" ile aynı kova DEĞİL */
  kaynagiBilinmeyen: number;
  /** kaynağı kapsam dışında kalan bildirim */
  kaynagiKapsamDisi: number;
};

export function sayimHesapla(satirlar: BildirimSatiri[], simdi: number): Sayim {
  const okunmamislar = satirlar.filter(okunmamisMi);
  const yaslar = okunmamislar
    .map((b) => bekleyenGun(b, simdi))
    .filter((g): g is number => g !== null);
  return {
    okunmamis: okunmamislar.length,
    okunmamisUyari: okunmamislar.filter(
      (b) => b.tip === 'eskalasyon' || b.tip === 'uyari').length,
    // Okunmamış yoksa "0 gün" yazmak ölçülmemiş bir sıfırdır.
    enEskiGun: yaslar.length > 0 ? Math.max(...yaslar) : null,
    kaynagiBilinmeyen: satirlar.filter((b) => b.kaynakHali === 'bilinmiyor').length,
    kaynagiKapsamDisi: satirlar.filter((b) => b.kaynakHali === 'kapsamDisi').length,
  };
}

/**
 * Ekranın tek cümlelik hâli. Üç sonuç birbirinden AYRI:
 * hiç bildirim yok · hepsi okunmuş (ÖLÇÜLMÜŞ sıfır) · okunmamış var.
 */
export function ekranHali(sayim: Sayim, toplam: number): {
  vurgu?: string; metin: string; durum?: Durum;
} {
  if (sayim.okunmamisUyari > 0) {
    return {
      vurgu: `${sayim.okunmamisUyari} uyarı`,
      metin: 'okunmadı',
      durum: 'bd',
    };
  }
  if (sayim.okunmamis > 0) {
    return { vurgu: `${sayim.okunmamis} bildirim`, metin: 'okunmadı', durum: 'md' };
  }
  if (toplam === 0) return { metin: 'Size hiç bildirim yazılmadı', durum: 'unk' };
  return { metin: 'Okunmamış bildirim yok', durum: 'ok' };
}

/* ═══ Kutu kapısı ═════════════════════════════════════════════════════ */

/**
 * Bildirim kutusuna girebilir mi?
 *
 * Girdi `lib/erisim.ts → izinliTesisIdleri(k, 'uyum')` çıktısıdır:
 *   null = kapsam sınırı yok · [] = hiçbir kapsamda uyum okuma yok ·
 *   dolu dizi = o santrallerde okuma var.
 *
 * NEDEN `izinVar(k, 'uyum', 'okuma')` DEĞİL: o çağrı KAPSAMSIZ (kurum
 * geneli) bir işlem sorar ve `lib/erisim.ts → kapsamUyar` gereği santrale
 * KISITLI bir yetkiyi geçirmez. Bildirimin santrali yoktur — kutu kişiseldir
 * — ve bildirimleri asıl alan kullanıcılar (bir santralin bulgu/aksiyon
 * sorumluları) tam da santrale kısıtlı olanlardır. Kapıyı `izinVar` ile
 * kurmak, uyarıyı gönderdiğimiz insanları kutudan dışarıda bırakırdı.
 *
 * Yetki MODELİ burada değişmez: karar yine `izinliTesisIdleri`in, bu yalnız
 * onun çıktısını okuyan bir yüklem. `lib/api/yetki.ts → okumaKapsami` aynı
 * kuralı API tarafında uyguluyor.
 */
export const kutuKapisiAcik = (kapsam: string[] | null): boolean =>
  kapsam === null || kapsam.length > 0;
