import type { Durum } from '@/components/kabuk/temel';
import { ROL_ETIKET } from '@/lib/sabitler';

/* O · Kullanıcı & yetki — sunucu ile istemcinin PAYLAŞTIĞI tipler ve saf
   hesaplar. Yetki modeli üç eksenlidir: kullanıcı × uyum süreci × santral.
   Boş eksen "tümü" demektir; bu yüzden kapsamsız bir yönetici yetkisi
   portföyün tamamına açılır ve gözden geçirilmesi gerekir. */

export type Yetki = {
  id: string;
  rol: string;
  surec: { id: string; kod: string; regKod: string } | null;
  tesis: { id: string; kod: string; ad: string } | null;
};

export type Hesap = {
  id: string;
  ad: string;
  eposta: string;
  /** null = unvan girilmemiş; "bilinmiyor" yazılır, boş sayılmaz */
  unvan: string | null;
  aktif: boolean;
  /** Parola özeti var mı — YALNIZ boolean; özetin kendisi istemciye inmez.
      false = hesap giriş yapamaz (kaydı var, parolası tanımlanmamış). */
  parolaVar: boolean;
  yetkiler: Yetki[];
  /** OT-09 · bu kişinin taşıdığı varlık sahipliği. */
  sahiplik: SahiplikYuku;
};

export type Secenek = { id: string; ad: string };

/* ── OT-09 · Ekip ve sahiplik yükü ──────────────────────────────────────

   Yetki ekranı "kim neye ERİŞİYOR" der; bu iki tip "kim neyin SAHİBİ"
   sorusunu aynı ekrana getirir. İkisi ayrı sorulardır ve birleştirilemez:
   bir kişinin erişimi kaldırıldığında sahibi olduğu 200 cihaz kendiliğinden
   devredilmez — kayıt görünürde sahipli kalır, gerçekte öksüzdür. Hesabı
   kapatan kişi devri de burada, aynı çekmecede yapar. */

export type EkipUyesi = {
  kullaniciId: string; ad: string; rol: string;
  /** Pasif üye ekibi "aktif üyesi var" göstermez; ayrı yazılır. */
  aktif: boolean;
};

export type Ekip = {
  id: string; kod: string; ad: string; tip: string;
  tesisId: string | null; tesisAd: string | null;
  eposta: string | null; aktif: boolean;
  uyeler: EkipUyesi[];
  /** Ekibe atanmış varlık sayısı — ekip silinemezliğinin gerekçesi. */
  varlikSayisi: number;
};

export type SahiplikYuku = {
  /** Kişinin sahibi göründüğü varlık sayısı — KAPSAMDAN BAĞIMSIZ. */
  toplam: number;
  /** Emanetçisi olduğu varlık sayısı; devir kapsamına GİRMEZ. */
  emanet: number;
  /**
   * Devredilebilir varlık kimlikleri — yalnız kullanıcının envanter ONAY
   * kapsamındakiler. `toplam`dan küçük olabilir ve ekran farkı yazar:
   * eylem tek bir kapsam dışı kayıtta devrin TAMAMINI reddeder, o yüzden
   * listeyi peşin daraltmak bir gizleme değil, mümkün olanı doğru
   * göstermektir.
   */
  devredilebilir: string[];
};

export const devirDisi = (s: SahiplikYuku) => s.toplam - s.devredilebilir.length;

/* ── Rol ────────────────────────────────────────────────────────────── */

/** Rol genişliği — satırda hesabın EN GENİŞ rolü gösterilir. */
const ROL_AGIRLIGI: Record<string, number> = {
  yonetici: 4, denetim_sorumlusu: 3, katkici: 2, okuyucu: 1,
};

export function enGenisRol(h: Hesap): string | null {
  let en: string | null = null;
  for (const y of h.yetkiler) {
    if (en === null || (ROL_AGIRLIGI[y.rol] ?? 0) > (ROL_AGIRLIGI[en] ?? 0)) en = y.rol;
  }
  return en;
}

export function rolEtiketi(rol: string | null): string {
  if (!rol) return 'yetki yok';
  return ROL_ETIKET[rol as keyof typeof ROL_ETIKET] ?? rol;
}

/* ── Kapsam ─────────────────────────────────────────────────────────── */

/** Süreç ve santral boşsa yetki tüm portföye uygulanır. */
export const kapsamsiz = (y: Yetki) => !y.surec && !y.tesis;

/** Kapsamsız yönetici: portföyün tamamında tam yetki — ayrıcalıklı erişim. */
export const kapsamsizYonetici = (h: Hesap) =>
  h.yetkiler.some((y) => y.rol === 'yonetici' && kapsamsiz(y));

/** Aktif hesap ama hiç yetkisi yok: giriş yapar, hiçbir ekranı açamaz. */
export const erisimsiz = (h: Hesap) => h.aktif && h.yetkiler.length === 0;

/** Pasifleştirilmiş hesabın yetkileri kütükte duruyor — artık yetki. */
export const artikYetki = (h: Hesap) => !h.aktif && h.yetkiler.length > 0;

/** Açık hesap ama parolası hiç tanımlanmadı: kaydı var, giriş yapamaz.
    Erişim KUSURU değil (fazla değil eksik erişim), ama yöneticinin
    görmesi gereken bir olgu — satırda ve çekmecede sözcükle yazılır. */
export const girisYapamaz = (h: Hesap) => h.aktif && !h.parolaVar;

/** Kapsam metni: "Tüm portföy" ya da "2 süreç · 1 santral". */
export function kapsamMetni(h: Hesap): string {
  if (h.yetkiler.length === 0) return 'kapsam yok';
  if (h.yetkiler.some(kapsamsiz)) return 'Tüm portföy';
  const surecler = new Set(h.yetkiler.map((y) => y.surec?.id).filter(Boolean));
  const tesisler = new Set(h.yetkiler.map((y) => y.tesis?.id).filter(Boolean));
  const parcalar: string[] = [];
  if (surecler.size) parcalar.push(`${surecler.size} süreç`);
  if (tesisler.size) parcalar.push(`${tesisler.size} santral`);
  return parcalar.join(' · ');
}

/** Tek yetkinin kapsam metni — çekmecede satır satır okunur. */
export function yetkiKapsami(y: Yetki): string {
  const s = y.surec ? `${y.surec.regKod} · ${y.surec.kod}` : 'tüm süreçler';
  const t = y.tesis ? y.tesis.ad : 'tüm santraller';
  return `${s} · ${t}`;
}

/* ── Durum ──────────────────────────────────────────────────────────── */

/* Erişim kusurları kritiktir ve ASLA kuyruğa inmez:
     bd  → aktif hesap yetkisiz VEYA pasif hesabın yetkisi duruyor
     md  → kapsamsız yönetici (portföyün tamamına açık)
     unk → pasif ve yetkisiz hesap: erişim kapsamı yok, değerlendirilmiyor
     ok  → aktif, kapsamı sınırlı yetkili hesap */
export function hesapDurumu(h: Hesap): Durum {
  if (erisimsiz(h) || artikYetki(h)) return 'bd';
  if (kapsamsizYonetici(h)) return 'md';
  if (!h.aktif) return 'unk';
  return 'ok';
}

export function durumSozu(h: Hesap): string {
  if (erisimsiz(h)) return 'Yetkisiz';
  if (artikYetki(h)) return 'Artık yetki';
  if (kapsamsizYonetici(h)) return 'Ayrıcalıklı';
  if (!h.aktif) return 'Hesap kapalı';
  return 'Kapsamlı';
}

export function durumCumlesi(h: Hesap): string {
  if (erisimsiz(h)) {
    return 'Hesap açık ama hiçbir yetkisi yok: giriş yapar, hiçbir ekranı açamaz.';
  }
  if (artikYetki(h)) {
    return `Hesap pasifleştirildi ama ${h.yetkiler.length} yetki kütükte duruyor; `
      + 'hesap yeniden açılırsa erişim geri gelir.';
  }
  if (kapsamsizYonetici(h)) {
    return 'Yönetici yetkisi kapsamsız verilmiş: tüm süreçlerde ve tüm santrallerde tam yetki.';
  }
  if (!h.aktif) return 'Hesap kapalı ve yetkisi yok; erişim kapsamı değerlendirilmiyor.';
  return `Yetki ${kapsamMetni(h).toLocaleLowerCase('tr-TR')} kapsamıyla sınırlı.`;
}

/** Satır altı ve çekmece için giriş notu; null = söylenecek bir şey yok. */
export function girisNotu(h: Hesap): string | null {
  return girisYapamaz(h) ? 'giriş yapamaz · parola tanımlı değil' : null;
}

/** Sağlıklı ve kapalı hesaplar toplanabilir; erişim kusurları toplanmaz. */
export const toplanabilir = (h: Hesap) => {
  const d = hesapDurumu(h);
  return d === 'ok' || d === 'unk';
};

/* ── Metrikler · filtrelerden BAĞIMSIZ, kütüğün tamamı ──────────────── */

export function metrikleriHesapla(hesaplar: Hesap[]) {
  const yetkiler = hesaplar.flatMap((h) => h.yetkiler);
  return {
    hesap: hesaplar.length,
    aktif: hesaplar.filter((h) => h.aktif).length,
    yetkisiz: hesaplar.filter(erisimsiz).length,
    ayricalikli: hesaplar.filter(kapsamsizYonetici).length,
    artik: hesaplar.reduce((a, h) => a + (artikYetki(h) ? h.yetkiler.length : 0), 0),
    yetkiToplam: yetkiler.length,
    yetkiKapsamli: yetkiler.filter((y) => !kapsamsiz(y)).length,
    unvansiz: hesaplar.filter((h) => !h.unvan).length,
    /* OT-09'un en sinsi hâli: hesap kapalı ama varlıklar hâlâ onun
       üstünde. Ekranda "sahibi var" yazar, gerçekte sahip yoktur. Bu
       sayı yetkisiz/artık yetki sayaçlarına TOPLANMAZ — ayrı bir
       kusurdur ve ayrı bir işle kapanır (devir). */
    pasifSahiplik: hesaplar
      .filter((h) => !h.aktif)
      .reduce((a, h) => a + h.sahiplik.toplam, 0),
    parolasiz: hesaplar.filter(girisYapamaz).length,
  };
}

/* ── Sıralama ───────────────────────────────────────────────────────── */

const DURUM_SIRASI: Record<Durum, number> = {
  bd: 0, md: 1, ok: 2, pl: 3, tamam: 4, unk: 5,
};

export function sirala(hesaplar: Hesap[]): Hesap[] {
  return [...hesaplar].sort((a, b) => {
    const f = DURUM_SIRASI[hesapDurumu(a)] - DURUM_SIRASI[hesapDurumu(b)];
    return f !== 0 ? f : a.ad.localeCompare(b.ad, 'tr');
  });
}
