import type { TakipDurumu } from '@/lib/uyum/mevzuatKaynagi';
import type { Durum } from '@/components/kabuk/temel';

/* Regülasyon kütüphanesi — saf türetmeler. Bu modül veritabanına, React'e
   ve `server-only`ye dokunmaz; testi de dokunmaz.

   Kütüphane bir UYUM ekranı DEĞİLDİR: burada bir maddenin uyumlu olup
   olmadığı sorulmaz (o /uyum ile /surecler'in işi), kataloğun kendisi
   sorulur — madde ağacı tam mı, kapsam alanı eşleşmiş mi, hangi sürüm
   yürürlükte. Bu yüzden işaretçi "uyum" değil KATALOG BÜTÜNLÜĞÜ kodlar. */

export type Alan = { id: string; kod: string; ad: string };

export type Madde = {
  id: string;
  kod: string;
  /** çerçeve önekinden arındırılmış kod — `EPDK-SYM-4.2.1` → `4.2.1` */
  kisaKod: string;
  baslik: string;
  metin: string;
  ustMaddeId: string | null;
  kanitTipi: string | null;
  /** sürüme bağlanmamış geçiş dönemi kaydı */
  surumsuz: boolean;
  alanlar: { id: string; kod: string }[];
  altSayisi: number;
  /** kaç değerlendirmede kullanılıyor — silme kararını bu belirler */
  kullanimSayisi: number;
};

export type Fark = { kod: string; tip: string; ozet: string | null; etki: string | null };

export type Surum = {
  id: string;
  etiket: string;
  durum: string;
  maddeSayisi: number;
  yururluk: string | null;
  farklar: Fark[];
};

export type Reg = {
  id: string;
  kod: string;
  ad: string;
  surum: string | null;
  aktif: boolean;
  surecSayisi: number;
  maddeler: Madde[];
  surumler: Surum[];
  /** UY-41 · Bu regülasyonun izlendiği resmî kaynaklar. */
  kaynaklar: Kaynak[];
};

/** UY-41 · Resmî mevzuat kaynağı. `adres` ÜRÜNLE GELMEZ; kurum girer. */
export type Kaynak = {
  id: string;
  ad: string;
  adres: string | null;
  izlemeTuru: string;
  araliksGun: number;
  /** `null` = HİÇ BAKILMADI. Sıfır değil, bilinmiyor. */
  sonKontrol: string | null;
  sonKontrolEden: string | null;
  sonNot: string | null;
  /** Takip durumu SUNUCUDA hesaplanır — istemci "şimdi"yi okuyamaz. */
  takip: TakipDurumu;
};

/** `EPDK-SYM-4.2.1` → `4.2.1` (çerçeve kodu öndeyse düşer). */
export function kisaKod(kod: string, cerceveKodu: string): string {
  return kod.startsWith(`${cerceveKodu}-`) ? kod.slice(cerceveKodu.length + 1) : kod;
}

/* ── Ağaç ───────────────────────────────────────────────────────────── */

export type Agac = Map<string | null, Madde[]>;

export function agaciKur(maddeler: Madde[]): Agac {
  const m: Agac = new Map();
  for (const md of maddeler) {
    const l = m.get(md.ustMaddeId) ?? [];
    l.push(md);
    m.set(md.ustMaddeId, l);
  }
  return m;
}

/** Bir dalın altındaki YAPRAK maddeler. Yaprak = alt maddesi olmayan. */
export function yapraklar(madde: Madde, agac: Agac): Madde[] {
  const altlar = agac.get(madde.id) ?? [];
  if (altlar.length === 0) return [madde];
  return altlar.flatMap((a) => yapraklar(a, agac));
}

/** Dalın altındaki tüm maddeler (kendisi hariç), ağaç sırasında düzleştirilmiş.
    Derinlik girinti için taşınır — ağaç kutusuz çizilir. */
export function dallar(madde: Madde, agac: Agac, derinlik = 0): { madde: Madde; derinlik: number }[] {
  return (agac.get(madde.id) ?? []).flatMap((a) => [
    { madde: a, derinlik },
    ...dallar(a, agac, derinlik + 1),
  ]);
}

/* ── Katalog bütünlüğü ──────────────────────────────────────────────────
   Kapsam alanı eşleşmemiş bir YAPRAK madde, hangi ekipten sorulacağı
   bilinmeyen bir maddedir; bölüm başlıklarında alan aranmaz. */

export function alansizMi(madde: Madde, agac: Agac): boolean {
  return (agac.get(madde.id) ?? []).length === 0 && madde.alanlar.length === 0;
}

export function alansizSayisi(reg: Reg, agac: Agac): number {
  return reg.maddeler.filter((m) => alansizMi(m, agac)).length;
}

export function surumsuzSayisi(reg: Reg): number {
  return reg.maddeler.filter((m) => m.surumsuz).length;
}

/** Madde işaretçisi: katalog kaydı tam mı?
    - yaprak, alanı yok → eksik (md)
    - yaprak, alanı var → tam (ok)
    - bölüm → altındaki yaprakların en kötüsü
    Her dal en az bir yaprağa iner (alt maddesi olmayan madde kendi
    yaprağıdır), bu yüzden burada "bilinmeyen" bir hâl YOKTUR; bilinmeyen
    yalnız kataloğun tamamı boşken (regImi) doğar. */
export function maddeImi(madde: Madde, agac: Agac): Durum {
  const altlar = agac.get(madde.id) ?? [];
  if (altlar.length === 0) return madde.alanlar.length === 0 ? 'md' : 'ok';
  return yapraklar(madde, agac).some((y) => y.alanlar.length === 0) ? 'md' : 'ok';
}

/** Çerçeve işaretçisi — filtre şeridi ve boş durumlar bunu okur. */
export function regImi(reg: Reg, agac: Agac): Durum {
  if (reg.maddeler.length === 0) return 'unk';
  if (alansizSayisi(reg, agac) > 0) return 'md';
  return 'ok';
}

/** Açılış çerçevesi: İŞ NEREDE? Kataloğu eksik olan ilk çerçeve, yoksa
    kataloğu dolu olan ilk çerçeve. Alfabetik ilk kayda düşmek ekranı boş
    bir katalogla açıp sorusunu ilk bakışta yanıtsız bırakabiliyordu. */
export function acilisCercevesi(regler: Reg[]): Reg | null {
  if (regler.length === 0) return null;
  const eksik = regler.find((r) =>
    r.maddeler.length > 0 && alansizSayisi(r, agaciKur(r.maddeler)) > 0);
  return eksik ?? regler.find((r) => r.maddeler.length > 0) ?? regler[0];
}

/* ── Arama ──────────────────────────────────────────────────────────────
   Bir bölüm, kendisi ya da altındaki herhangi bir madde eşleşiyorsa
   görünür kalır — aksi hâlde arama ağacı ortasından koparırdı. */

export function eslesiyor(madde: Madde, arama: string, agac: Agac): boolean {
  if (!arama.trim()) return true;
  const q = arama.toLocaleLowerCase('tr-TR');
  const kendi = `${madde.kod} ${madde.baslik} ${madde.metin}`
    .toLocaleLowerCase('tr-TR').includes(q);
  if (kendi) return true;
  return (agac.get(madde.id) ?? []).some((a) => eslesiyor(a, arama, agac));
}

/* ── Sürüm yaşam döngüsü ────────────────────────────────────────────────
   §42: yeni sürüm eskiyi EZMEZ, diff üretir. Ekran bu sözleşmeyi anlatır. */

export function aktifSurum(reg: Reg): Surum | null {
  return reg.surumler.find((s) => s.durum === 'aktif') ?? null;
}

export function taslakSurumler(reg: Reg): Surum[] {
  return reg.surumler.filter((s) => s.durum === 'taslak');
}

/** Sürüm işaretçisi: yürürlükte olan var mı, taslak bekliyor mu? */
/* ── KATALOG BOŞLUĞUNUN ÜÇ AYRI HÂLİ ──────────────────────────────────
   ÖLÇÜLEN KUSUR (kurulum provası, 10 Eylül 2026): TR-ENERJI paketi
   kurulduktan hemen sonra bu ekran sekiz çerçevenin sekizi için de
   "KATALOG BOŞ · İLK KURULUM · <kod> kataloğu HENÜZ YÜKLENMEDİ" diyor ve
   kullanıcıyı "Katalog içe aktar"a yolluyordu. Veritabanında o anda
   3 803 madde VARDI: sekiz TASLAK sürüme bağlıydılar ve tek bekledikleri
   şey insan kararıydı — üstelik bir önceki ekran (`/paketler`) tam da
   bunu söylüyordu: "Çerçeve sürümleri TASLAK: aktifleştirme
   Regülasyonlar ekranında."

   Yani ürün kendi talimatını kendi yalanlıyordu ve müşteri yolu burada
   çıkmaza giriyordu: içe aktarma ekranına gidilirse zaten yüklü olan
   katalog İKİNCİ KEZ yazılırdı.

   Maddeleri yalnız AKTİF sürümden saymak DOĞRUDUR ve değişmedi (arşiv ve
   taslak maddeler kataloğu kirletmemeli). Kusur sayımda değil, sayı
   sıfır çıkınca söylenen CÜMLEDEYDİ: "yüklenmedi" ile "yüklendi,
   kararınızı bekliyor" aynı şey değildir — birincisi bir eksik, ikincisi
   bir GÖREV.

   "Bilinmeyen ≠ sıfır" kuralının ters yüzü: BİLİNEN de sıfır gibi
   gösterilmez. */
export type KatalogBoslugu =
  /** Hiç sürüm yok: katalog gerçekten yüklenmemiş. */
  | { hal: 'katalog_yok' }
  /** Taslak sürüm(ler)de madde var; tek eksik İNSAN KARARI. */
  | { hal: 'taslakta_bekliyor'; madde: number; surumId: string; etiket: string }
  /** Sürüm var ama maddesi yok — açılmış boş bir taslak. */
  | { hal: 'surum_bos' };

/**
 * Aktif katalog boşken bunun NEDEN boş olduğunu söyler.
 * Katalog boş DEĞİLSE `null` döner — ayrım çağıranda değil burada.
 */
export function katalogBoslugu(reg: Reg): KatalogBoslugu | null {
  if (reg.maddeler.length > 0) return null;
  const dolu = taslakSurumler(reg).filter((s) => s.maddeSayisi > 0);
  if (dolu.length > 0) {
    /* En çok madde taşıyan taslak hedeflenir: karar ekranı tek sürüm
       açar ve kullanıcıyı boş bir taslağa göndermek yolu uzatırdı. */
    const hedef = [...dolu].sort((a, b) => b.maddeSayisi - a.maddeSayisi)[0];
    return {
      hal: 'taslakta_bekliyor',
      madde: dolu.reduce((a, s) => a + s.maddeSayisi, 0),
      surumId: hedef.id,
      etiket: hedef.etiket,
    };
  }
  return reg.surumler.length > 0 ? { hal: 'surum_bos' } : { hal: 'katalog_yok' };
}

/** Boşluğun ekranda görünen cümlesi. */
export function katalogBoslukCumlesi(reg: Reg, b: KatalogBoslugu): string {
  if (b.hal === 'taslakta_bekliyor') {
    return `${reg.kod} kataloğu YÜKLÜ: ${b.madde} madde ${b.etiket} taslak `
      + 'sürümünde ve aktifleştirme bekliyor. Aktifleştirme insan kararıdır; '
      + 'bu ekran hiçbir sürümü kendiliğinden yürürlüğe almaz.';
  }
  if (b.hal === 'surum_bos') {
    return `${reg.kod} için sürüm açılmış ama içinde madde yok.`;
  }
  return `${reg.kod} kataloğu henüz yüklenmedi.`;
}

export function surumImi(reg: Reg): Durum {
  if (aktifSurum(reg)) return taslakSurumler(reg).length > 0 ? 'pl' : 'ok';
  // Sürümsüz katalog "boş" değil: geçiş dönemi kaydıdır, bilinmeyendir.
  return 'unk';
}

export function surumSozu(reg: Reg): string {
  const a = aktifSurum(reg);
  if (a) return 'Yürürlükte';
  return reg.maddeler.length > 0 ? 'Sürümsüz katalog' : 'Katalog boş';
}

export function surumCumlesi(reg: Reg, agac: Agac): string {
  const a = aktifSurum(reg);
  const taslak = taslakSurumler(reg);
  const alansiz = alansizSayisi(reg, agac);
  const parcalar: string[] = [];
  if (a) {
    parcalar.push(`${a.etiket} sürümü yürürlükte; ${a.maddeSayisi} madde taşıyor.`);
  } else if (reg.maddeler.length > 0) {
    parcalar.push(`${surumsuzSayisi(reg)} madde hiçbir sürüme bağlı değil — geçiş dönemi kaydı.`);
  } else {
    parcalar.push('Bu çerçevenin madde kataloğu boş.');
  }
  if (taslak.length > 0) {
    parcalar.push(`${taslak.length} taslak sürüm aktifleştirilmeyi bekliyor.`);
  }
  if (alansiz > 0) {
    parcalar.push(`${alansiz} yaprak maddenin kapsam alanı eşleşmemiş.`);
  }
  return parcalar.join(' ');
}

/** Sürüm satırının sağ tarafı: madde sayısı + içerik farkı. */
export function surumOzeti(s: Surum): string {
  const gercek = s.farklar.filter((f) => f.tip !== 'ayni').length;
  const parcalar = [`${s.maddeSayisi} madde`];
  if (gercek > 0) parcalar.push(`${gercek} fark`);
  return parcalar.join(' · ');
}

/** Fark tipini durum işaretçisine çevirir. `ayni` fark DEĞİLDİR, elenir. */
export const FARK_IM: Record<string, Durum> = {
  yeni: 'ok', degisti: 'md', kaldirildi: 'bd',
};

export const FARK_ETIKET: Record<string, string> = {
  yeni: 'Yeni', degisti: 'Değişti', kaldirildi: 'Kaldırıldı',
};

export function gercekFarklar(s: Surum): Fark[] {
  return s.farklar.filter((f) => f.tip !== 'ayni');
}

/** Silinebilir mi: alt maddesi ve kullanımı olmayan madde. Kullanımdaki
    madde silinirse değerlendirme tarihçesi öksüz kalır. */
export function silinebilir(madde: Madde): boolean {
  return madde.altSayisi === 0 && madde.kullanimSayisi === 0;
}
