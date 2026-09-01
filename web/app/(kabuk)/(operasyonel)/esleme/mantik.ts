import type { Durum } from '@/components/kabuk/temel';

/* O26 · Eşleme profili tezgâhı — saf türetme katmanı.

   Veritabanı, React ve `server-only` bağımlılığı YOKTUR: testten doğrudan
   çağrılabilir. Sunucu sayfası ham kaydı serileştirir, karar burada verilir.

   ─ EKRANIN SERT KURALLARI ───────────────────────────────────────────────
   1. YAYIMLANMIŞ SÜRÜM DEĞİŞMEZ. Bu ekranda "kaydet" diye bir eylem
      YOKTUR; yalnız YAYINLA vardır ve her yayın yeni bir sürüm açar.
      Ekran bunu gizlemez: sürüm geçmişi arşiv dahil gösterilir, çünkü
      geçen ay içe aktarılmış bir kaydın hangi kuralla yorumlandığı
      denetimde sorulacak sorudur.
   2. ÖNİZLEME BİR ÖLÇÜM DEĞİL, BİR PROVADIR. Hiçbir şey yazmaz, hiçbir dış
      sisteme bağlanmaz; girdisi kullanıcının yapıştırdığı örnek kayıttır.
      Ekran "bağlandı", "çekildi", "senkronize edildi" gibi bir söz KURMAZ.
   3. PROFİLSİZ CONNECTOR EŞLEMESİZ DEĞİLDİR. Profili olmayan connector
      adaptörün GÖMÜLÜ eşlemesiyle koşar; bu "kural yok" (sıfır) değil,
      "kurallar üründe tanımlı değil" (bilinmiyor) demektir. */

/* ═══ Sözlükler ═══════════════════════════════════════════════════════ */

/** `EslemeProfili.durum` — motorun (`lib/entegrasyon/esleme.ts`) yazdığı üç değer. */
export const DURUM_SOZU: Record<string, string> = {
  etkin: 'Etkin · koşuda kullanılır',
  taslak: 'Taslak · koşuda kullanılmaz',
  arsiv: 'Arşiv · eski içe aktarımların kuralı',
};

/** Bir connector'ın koşuda hangi kuralla çalışacağı — üç ayrı hâl. */
export type EslemeKaynagi =
  | 'bagli'   // connector'a AÇIKÇA bir profil bağlanmış
  | 'tip'     // connector'ın tipinin etkin profili geçerli
  | 'gomulu'; // profil yok → adaptörün gömülü eşlemesi (kurallar üründe YOK)

export const KAYNAK_SOZU: Record<EslemeKaynagi, string> = {
  bagli: 'connector\'a bağlı profil',
  tip: 'tipin etkin profili',
  gomulu: 'gömülü eşleme — kurallar üründe tanımlı değil',
};

/* ═══ Serileştirilmiş kayıtlar ════════════════════════════════════════ */

export type SurumSatiri = {
  id: string;
  kod: string;
  ad: string;
  connectorTipi: string;
  surum: number;
  durum: string;
  kuralSayisi: number;
  aciklama: string | null;
};

/** Bir profil KODUNUN tüm sürümleri. Kod kimliktir, sürüm onun tarihçesi. */
export type ProfilAilesi = {
  kod: string;
  /** en yüksek sürümün adı — ad sürümle değişebilir, kod değişmez */
  ad: string;
  connectorTipi: string;
  /** yeniden eskiye */
  surumler: SurumSatiri[];
  /** durumu `etkin` olan sürüm; yoksa null (hepsi taslak ya da arşiv) */
  etkin: SurumSatiri | null;
  sonSurum: number;
};

export type ConnectorSatiri = {
  id: string;
  kod: string;
  ad: string;
  tip: string;
  kaynak: EslemeKaynagi;
  /** koşuda geçerli olacak profil — `gomulu` iken null */
  profilKodu: string | null;
  profilSurumu: number | null;
  profilDurumu: string | null;
  /** okuma sırasında hata döndüyse sebebi (demo yayını, yetki) — sessiz boş yok */
  hata: string | null;
};

/* ═══ Türetmeler ══════════════════════════════════════════════════════ */

/** Sürüm listesinden (yeniden eskiye) profil ailesi kurar. */
export function aileKur(surumler: SurumSatiri[]): ProfilAilesi | null {
  if (surumler.length === 0) return null;
  const sirali = [...surumler].sort((a, b) => b.surum - a.surum);
  const bas = sirali[0];
  return {
    kod: bas.kod,
    ad: bas.ad,
    connectorTipi: bas.connectorTipi,
    surumler: sirali,
    etkin: sirali.find((s) => s.durum === 'etkin') ?? null,
    sonSurum: bas.surum,
  };
}

/**
 * Satır işaretçisi profilin KOŞUDAKİ HÂLİNİ kodlar.
 * Etkin sürümü olmayan bir profil "uyumsuz" değil, DEĞERLENDİRİLMEMİŞTİR:
 * yayımlanmış ama hiç etkinleştirilmemiş olabilir.
 */
export function profilImi(a: ProfilAilesi): Durum {
  if (a.etkin) return 'ok';
  if (a.surumler.some((s) => s.durum === 'taslak')) return 'md';
  return 'unk';
}

export function connectorImi(c: ConnectorSatiri): Durum {
  if (c.hata) return 'unk';
  if (c.kaynak === 'gomulu') return 'unk'; // BİLİNMİYOR — "kural yok" DEĞİL
  return c.profilDurumu === 'etkin' ? 'ok' : 'md';
}

/** Connector satırının eşleme hücresi. Boş bırakılmaz: boşluk "kural yok"
    diye okunurdu, oysa gömülü eşleme çalışıyor olabilir. */
export function eslemeHucresi(c: ConnectorSatiri): string {
  if (c.hata) return 'okunamadı';
  if (c.kaynak === 'gomulu') return 'gömülü eşleme';
  return `${c.profilKodu} v${c.profilSurumu}`;
}

/* ═══ Filtre · sıralama · katlama ═════════════════════════════════════ */

export type Mercek = 'etkin' | 'taslak' | 'etkinsiz' | 'hepsi';

export const MERCEKLER: { id: Mercek; ad: string }[] = [
  { id: 'etkin', ad: 'Etkin' },
  { id: 'taslak', ad: 'Taslağı olan' },
  { id: 'etkinsiz', ad: 'Etkin sürümü yok' },
  { id: 'hepsi', ad: 'Tümü' },
];

export function mercekten(a: ProfilAilesi, m: Mercek): boolean {
  switch (m) {
    case 'etkin': return a.etkin !== null;
    case 'taslak': return a.surumler.some((s) => s.durum === 'taslak');
    case 'etkinsiz': return a.etkin === null;
    default: return true;
  }
}

/** Yoğunluk sözleşmesi: 5–9 görünür satır, gerisi katlanmış kuyruğa iner. */
export const GORUNUR_TAVAN = 9;

/** Etkin sürümü OLMAYAN profil kuyruğa inmez: çözülmemiş iş odur. */
export const toplanabilir = (a: ProfilAilesi): boolean => a.etkin !== null;

export function sirala(aileler: ProfilAilesi[]): ProfilAilesi[] {
  return [...aileler].sort((a, b) =>
    Number(a.etkin !== null) - Number(b.etkin !== null)
    || a.connectorTipi.localeCompare(b.connectorTipi, 'tr')
    || a.kod.localeCompare(b.kod, 'tr'));
}

/* ═══ Yayın kapısı — ekranın insan onayı sözleşmesi ═══════════════════ */

/** Kod biçimi sunucuda `bosluksuz(...).toUpperCase()`; ekran ondan gevşek olamaz. */
export const KOD_DESENI = /^[A-Z0-9][A-Z0-9_-]*$/;

/**
 * Yayın düğmesi neden pasif? Boş string = düğme etkin.
 *
 * Sunucu (`lib/eylemler2/esleme.ts → eslemeProfilYayinla`) aynı kuralları
 * zod + `kurallariDogrula` ile yeniden uygular; buradaki kontrol nezakettir,
 * güvenlik sınırı değildir. Kuralların ANLAM doğrulaması (çift hedef,
 * zorunlu+varsayılan çelişkisi) burada YAPILMAZ — o sunucudadır ve ekrana
 * önizleme üzerinden döner; ikinci bir kopyası burada yaşarsa iki tanım
 * sessizce ayrışır.
 */
export function yayinPasifMi(g: {
  yetkili: boolean;
  kod: string;
  ad: string;
  connectorTipi: string;
  kuralSayisi: number;
  bekliyor: boolean;
}): string {
  if (!g.yetkili) return 'Yayın için yönetim yazma yetkisi gerekiyor.';
  if (!g.kod.trim()) return 'Profil kodu zorunlu.';
  if (!KOD_DESENI.test(g.kod.trim().toUpperCase())) {
    return 'Kod yalnız harf, rakam, tire ve alt çizgi içerebilir.';
  }
  if (!g.ad.trim()) return 'Ad zorunlu.';
  if (!g.connectorTipi.trim()) return 'Connector tipi zorunlu.';
  if (g.kuralSayisi === 0) return 'Profil en az bir kural içermeli.';
  if (g.bekliyor) return 'Önceki yayın gönderiliyor.';
  return '';
}

/** Önizleme düğmesi neden pasif? Boş string = etkin. */
export function onizlemePasifMi(g: {
  kuralSayisi: number; ornek: string; bekliyor: boolean;
}): string {
  if (g.kuralSayisi === 0) return 'Önizleme için en az bir kural gerekli.';
  if (!g.ornek.trim()) return 'Örnek kayıt (JSON) yapıştırın.';
  if (g.bekliyor) return 'Önizleme çalışıyor.';
  return '';
}

/* ═══ Metrikler ═══════════════════════════════════════════════════════ */

export type Sayim = {
  profil: number;
  /** etkin sürümü olmayan profil — yayımlanmış ama koşuda kullanılmıyor */
  etkinsizProfil: number;
  etkinSurum: number;
  arsivSurum: number;
  /** gömülü eşlemeyle koşan connector — "kuralsız" DEĞİL, "kuralı üründe yok" */
  gomuluConnector: number;
  /** eşlemesi okunamayan connector (demo/yetki) — sıfırla karıştırılmaz */
  okunamayanConnector: number;
};

export function sayimHesapla(
  aileler: ProfilAilesi[], connectorlar: ConnectorSatiri[],
): Sayim {
  const surumler = aileler.flatMap((a) => a.surumler);
  return {
    profil: aileler.length,
    etkinsizProfil: aileler.filter((a) => a.etkin === null).length,
    etkinSurum: surumler.filter((s) => s.durum === 'etkin').length,
    arsivSurum: surumler.filter((s) => s.durum === 'arsiv').length,
    gomuluConnector: connectorlar.filter((c) => !c.hata && c.kaynak === 'gomulu').length,
    okunamayanConnector: connectorlar.filter((c) => c.hata !== null).length,
  };
}

/**
 * Ekranın tek cümlelik hâli. Dört sonuç birbirinden AYRI:
 * hiç profil yok · etkin sürümü olmayan profil var · gömülü eşleme ·
 * her connector'ın kuralı üründe tanımlı.
 */
export function ekranHali(sayim: Sayim, connectorSayisi: number): {
  vurgu?: string; metin: string; durum?: Durum;
} {
  if (sayim.profil === 0) {
    return { metin: 'Hiç eşleme profili yayımlanmadı', durum: 'unk' };
  }
  if (sayim.gomuluConnector > 0) {
    return {
      vurgu: `${sayim.gomuluConnector} connector`,
      metin: 'gömülü eşlemeyle koşuyor — kuralları üründe tanımlı değil',
      durum: 'unk',
    };
  }
  if (sayim.etkinsizProfil > 0) {
    return {
      vurgu: `${sayim.etkinsizProfil} profilin`,
      metin: 'etkin sürümü yok — koşuda kullanılmıyor',
      durum: 'md',
    };
  }
  if (connectorSayisi === 0) {
    return { metin: 'Profiller yayımlandı; bağlı connector yok', durum: 'md' };
  }
  return { metin: 'Her connector\'ın eşleme kuralı üründe tanımlı', durum: 'ok' };
}

/* ═══ Önizleme görünümü ═══════════════════════════════════════════════ */

/** Değerin nereden geldiği. `varsayilan` BİR ÖLÇÜM DEĞİLDİR ve `yok`
    sıfır/false demek değildir — alan BİLİNMİYOR demektir. */
export const KAYNAGI_SOZU: Record<string, string> = {
  kaynak: 'kaynaktan geldi',
  varsayilan: 'kural doldurdu (ölçüm değil)',
  yok: 'gelmedi — bilinmiyor',
};

export type OnizlemeSayimi = {
  kaynaktan: number;
  varsayilandan: number;
  bilinmeyen: number;
};

export function onizlemeSayimi(
  alanlar: { kaynagi: string }[],
): OnizlemeSayimi {
  return {
    kaynaktan: alanlar.filter((a) => a.kaynagi === 'kaynak').length,
    varsayilandan: alanlar.filter((a) => a.kaynagi === 'varsayilan').length,
    bilinmeyen: alanlar.filter((a) => a.kaynagi === 'yok').length,
  };
}

/** Güven hücresi. `null` = ÖLÇÜLMEDİ; "0,00" yazmak yalan olurdu. */
export function guvenYazisi(guven: number | null): string {
  return guven === null ? 'ölçülmedi' : guven.toFixed(2);
}

/** Önizleme satırının işaretçisi. Reddedilen kayıt kritik; hiç kaynak
    değeri gelmeyen kayıt "değerlendirilmedi" — sıfır değil. */
export function onizlemeImi(g: {
  reddedildi: boolean; sayim: OnizlemeSayimi; sorunSayisi: number;
}): Durum {
  if (g.reddedildi) return 'bd';
  if (g.sayim.kaynaktan === 0) return 'unk';
  return g.sorunSayisi > 0 ? 'md' : 'ok';
}
