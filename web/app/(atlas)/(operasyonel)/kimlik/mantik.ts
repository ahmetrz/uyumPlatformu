import type { Durum } from '@/components/atlas/temel';

/* O15 · Kimlik & Erişim İncelemesi — saf türetme katmanı.
   Sunucu (metrikler) ve istemci (tablo/çekmece) aynı tanımı kullansın diye
   burada yaşar; React'e ve Prisma'ya bağımlı değildir.

   Sinyal tanımları (03-screens O15 + §9 veri modeli):
   · rotasyonsuz servis = tip 'servis' ve parolaRotasyon null.
     BİLİNMEYEN DEĞİL — "hiç rotasyon yapılmamış" sabit bir olgudur, `bd`.
   · atıl yönetici     = ayrıcalıklı ve sonKullanim 90 günden eski.
   · sahipsiz          = tip 'kisi' ama platform kullanıcısı bağlı değil.
   · inceleme gecikmesi = hiç incelenmemiş ayrıcalıklı atamaların en
     eskisinin üzerinden geçen gün. */

export const ATIL_ESIK = 90;          // gün
export const GRUP_ESIGI = 3;          // bu kadar ve üzeri aynı önek tek satıra toplanır

export type IncelemeKaydi = {
  sonuc: string;
  zaman: string;
  inceleyen: string | null;
  not: string | null;
};

export type Yetki = {
  id: string;
  kapsam: string | null;
  yetkiSeviyesi: string | null;
  verilis: string;
  bitis: string | null;
  varlikEtiketi: string | null;
  varlikAd: string | null;
  sonInceleme: IncelemeKaydi | null;
};

export type Bag = { id: string; kod: string; alt: string; yol: string; suren?: boolean };

export type Hesap = {
  id: string;
  hesapAdi: string;
  tip: string;
  kaynakSistem: string | null;
  /** null = ÖLÇÜLMEDİ: kaynak sistem ayrıcalık bilgisi vermedi.
      'ayrıcalıklı değil' DEĞİLDİR ve öyle sayılmaz. */
  ayricalikli: boolean | null;
  parolaRotasyon: string | null;
  sonKullanim: string | null;
  durum: string;
  sahip: string | null;
  tesisId: string | null;
  tesisKod: string | null;
  tesisAd: string | null;
  yetkiler: Yetki[];
  bagli: Bag[];
};

export const TIP_ETIKET: Record<string, string> = {
  kisi: 'Kişi', servis: 'Servis', paylasimli: 'Paylaşımlı', acil_durum: 'Acil durum',
};

export const YETKI_ETIKET: Record<string, string> = {
  okuma: 'okuma', yazma: 'yazma', yonetici: 'yönetici',
};

export const SONUC_ETIKET: Record<string, string> = {
  onaylandi: 'onaylandı', kaldirilsin: 'kaldırılsın', degistirilsin: 'değiştirilsin',
};

/* ── zaman ─────────────────────────────────────────────────────────────── */

export function gunFarki(t: string | null): number | null {
  if (!t) return null;
  return Math.floor((Date.now() - new Date(t).getTime()) / 86_400_000);
}

/** Gün sayısını insan diline çevirir; bilinmeyen için `—` döner (sıfır DEĞİL). */
export function gunMetni(g: number | null): string {
  if (g === null) return '—';
  if (g <= 0) return 'bugün';
  if (g === 1) return 'dün';
  return `${g} gün`;
}

/** Geçmişe bakan ifade — "bugün" / "dün" / "12 gün önce". */
export function oncekiMetin(g: number | null): string {
  if (g === null) return '—';
  return g <= 1 ? gunMetni(g) : `${g} gün önce`;
}

/* ── hesap sinyalleri ──────────────────────────────────────────────────── */

/** Kapatılmış hesap inceleme kapsamı dışındadır. */
export const kapsamda = (h: Hesap) => h.durum !== 'kapatildi';

export const acikYetkiler = (h: Hesap) => h.yetkiler.filter((y) => !y.bitis);

export const incelenmemisYetkiler = (h: Hesap) =>
  acikYetkiler(h).filter((y) => y.sonInceleme === null);

export const rotasyonsuzServis = (h: Hesap) =>
  h.tip === 'servis' && h.parolaRotasyon === null;

/** Ayrıcalık ölçülmemiş hesap: ne ayrıcalıklı ne değil — bilinmiyor. */
export const ayricalikBilinmiyor = (h: Hesap) => h.ayricalikli === null;

export function atilYonetici(h: Hesap): boolean {
  /* `=== true`: ölçülmemiş (null) hesap için "atıl yönetici" İDDİA
     EDİLMEZ. Bulgu uydurmak, bilinmeyeni sıfır saymak kadar yanlıştır;
     ölçülmemişlik ayrı bir sinyal olarak (unk) yüzeye çıkar. */
  if (h.ayricalikli !== true) return false;
  const g = gunFarki(h.sonKullanim);
  return g !== null && g > ATIL_ESIK;
}

export const sahipsiz = (h: Hesap) => h.tip === 'kisi' && h.sahip === null;

/** Paylaşımlı ve acil durum hesabında rotasyon kaydı yoksa: bilinen bir boşluk. */
export const paylasimliRotasyonsuz = (h: Hesap) =>
  (h.tip === 'paylasimli' || h.tip === 'acil_durum') && h.parolaRotasyon === null;

export const incelenmemisAyricalikli = (h: Hesap) =>
  h.ayricalikli === true && incelenmemisYetkiler(h).length > 0;

export function hesapDurumu(h: Hesap): Durum {
  if (h.durum === 'kapatildi') return 'tamam';
  if (rotasyonsuzServis(h) || atilYonetici(h) || incelenmemisAyricalikli(h)) return 'bd';
  if (sahipsiz(h) || paylasimliRotasyonsuz(h)) return 'md';
  // ayrıcalık ölçülmemiş: hesap temiz DEĞİL, bilinmiyor
  if (ayricalikBilinmiyor(h)) return 'unk';
  if (h.sonKullanim === null) return 'unk';   // kullanım verisi yok — sıfır değil
  return 'ok';
}

/** Satır alt satırı: durumu tekrar etmez, NE olduğunu yazar (06 §A2). */
export function olgular(h: Hesap): string[] {
  const o: string[] = [];
  if (rotasyonsuzServis(h)) o.push('parola rotasyonu yok');
  if (atilYonetici(h)) o.push(`${gunMetni(gunFarki(h.sonKullanim))} kullanılmadı`);
  if (sahipsiz(h)) o.push('platform karşılığı yok');
  if (paylasimliRotasyonsuz(h) && !rotasyonsuzServis(h)) o.push('parola rotasyonu yok');
  const inc = incelenmemisYetkiler(h).length;
  if (inc > 0) o.push(`${inc} yetki incelenmedi`);
  if (h.durum === 'askida') o.push('erişim askıda');
  if (o.length === 0) {
    const son = acikYetkiler(h)
      .map((y) => y.sonInceleme?.zaman)
      .filter((z): z is string => !!z)
      .sort()
      .at(-1);
    o.push(son ? `${oncekiMetin(gunFarki(son))} incelendi` : `${acikYetkiler(h).length} yetki`);
  }
  return o;
}

export function altSatir(h: Hesap): string {
  return [h.kaynakSistem ?? 'kaynak yok', ...olgular(h).slice(0, 2)].join(' · ');
}

/** Grup satırının alt satırı: üyelerde kaç kez hangi olgu görüldü. */
export function grupAltSatiri(uyeler: Hesap[]): string {
  const kaynaklar = [...new Set(uyeler.map((h) => h.kaynakSistem ?? 'kaynak yok'))];
  const sayilar: [number, string][] = [
    [uyeler.filter(rotasyonsuzServis).length, 'rotasyonsuz'],
    [uyeler.filter(atilYonetici).length, 'atıl'],
    [uyeler.filter(sahipsiz).length, 'sahipsiz'],
    [uyeler.reduce((a, h) => a + incelenmemisYetkiler(h).length, 0), 'yetki incelenmedi'],
  ];
  const parcalar = sayilar.filter(([n]) => n > 0).map(([n, ad]) => `${n} ${ad}`);
  const kaynak = kaynaklar.length === 1 ? kaynaklar[0] : `${kaynaklar.length} kaynak`;
  return [kaynak, ...(parcalar.length ? parcalar.slice(0, 2) : ['açık yetkiler incelendi'])].join(' · ');
}

/* ── satırlar: tek hesap ya da önek grubu ──────────────────────────────── */

export type TabloSatiri =
  | { tur: 'hesap'; id: string; hesaplar: [Hesap] }
  | { tur: 'grup'; id: string; onek: string; hesaplar: Hesap[] };

const SIRA: Record<Durum, number> = { bd: 0, md: 1, unk: 2, pl: 3, ok: 4, tamam: 5 };

export function satirDurumu(s: TabloSatiri): Durum {
  return s.hesaplar.map(hesapDurumu).reduce((a, b) => (SIRA[b] < SIRA[a] ? b : a), 'tamam');
}

/** `svc-scada-01` → `svc-scada-*`; sayısal son ek yoksa grup yok. */
export function onekAl(hesapAdi: string): string | null {
  const m = /^(.+?)-(\d+)$/.exec(hesapAdi);
  return m ? `${m[1]}-*` : null;
}

/** Aynı önekten GRUP_ESIGI ve üzeri hesap tek satırda toplanır. */
export function gruplandir(hesaplar: Hesap[]): TabloSatiri[] {
  const kova = new Map<string, Hesap[]>();
  for (const h of hesaplar) {
    const onek = onekAl(h.hesapAdi);
    if (onek) kova.set(onek, [...(kova.get(onek) ?? []), h]);
  }
  const gruplu = new Set<string>();
  const satirlar: TabloSatiri[] = [];
  for (const [onek, uyeler] of kova) {
    if (uyeler.length < GRUP_ESIGI) continue;
    for (const u of uyeler) gruplu.add(u.id);
    satirlar.push({ tur: 'grup', id: `grp:${onek}`, onek, hesaplar: uyeler });
  }
  for (const h of hesaplar) {
    if (gruplu.has(h.id)) continue;
    satirlar.push({ tur: 'hesap', id: h.id, hesaplar: [h] });
  }
  return satirlar;
}

/** Ayrıcalıklı → sahipsiz → kalan; içinde şiddet sırası. */
export function sirala(satirlar: TabloSatiri[]): TabloSatiri[] {
  /* Ayrıcalıklı → sahipsiz → ayrıcalığı ÖLÇÜLMEMİŞ → kalan. Ölçülmemiş
     olan en alta değil ortaya girer: bilinmeyen, bilinen temizden daha
     çok ilgi ister. */
  const oncelik = (s: TabloSatiri) =>
    s.hesaplar.some((h) => h.ayricalikli === true) ? 0
      : s.hesaplar.some(sahipsiz) ? 1
        : s.hesaplar.some(ayricalikBilinmiyor) ? 2 : 3;
  return [...satirlar].sort((a, b) => {
    const d = SIRA[satirDurumu(a)] - SIRA[satirDurumu(b)];
    if (d !== 0) return d;
    const o = oncelik(a) - oncelik(b);
    if (o !== 0) return o;
    const n = b.hesaplar.length - a.hesaplar.length;
    if (n !== 0) return n;
    return baslikMetni(a).localeCompare(baslikMetni(b), 'tr');
  });
}

export function baslikMetni(s: TabloSatiri): string {
  return s.tur === 'grup' ? s.onek : s.hesaplar[0].hesapAdi;
}

/** Sağlıklı satır kuyruğa toplanabilir; kritik/kısmi satır asla toplanmaz. */
export const toplanabilir = (s: TabloSatiri) => {
  const d = satirDurumu(s);
  return d === 'ok' || d === 'tamam';
};

/* ── hücreler ──────────────────────────────────────────────────────────── */

function benzersiz<T>(liste: (T | null)[]): T[] {
  return [...new Set(liste.filter((x): x is T => x !== null && x !== undefined))];
}

export function kapsamMetni(hesaplar: Hesap[]): string {
  const tesisler = benzersiz(hesaplar.map((h) => h.tesisAd));
  const kapsamlar = benzersiz(hesaplar.flatMap((h) => acikYetkiler(h).map((y) => y.kapsam)));
  const yer = tesisler.length === 0 ? 'portföy'
    : tesisler.length === 1 ? tesisler[0]
      : `${tesisler.length} santral`;
  const ne = kapsamlar.length === 0 ? 'atama yok'
    : kapsamlar.length === 1 ? kapsamlar[0]
      : `${kapsamlar.length} sistem`;
  return `${yer} · ${ne}`;
}

export type Hucre = { metin: string; durum?: Durum };

/** Grupta en kötü (en eski) kullanım gösterilir — risk sinyali odur. */
export function kullanimHucresi(hesaplar: Hesap[]): Hucre {
  const gunler = hesaplar.map((h) => gunFarki(h.sonKullanim));
  if (gunler.every((g) => g === null)) return { metin: '—', durum: 'unk' };
  const enEski = Math.max(...gunler.filter((g): g is number => g !== null));
  const onek = hesaplar.length > 1 ? 'en eski ' : '';
  return {
    metin: hesaplar.length > 1 ? `${onek}${gunMetni(enEski)}` : gunMetni(enEski),
    durum: enEski > ATIL_ESIK ? 'bd' : undefined,
  };
}

/** Sahipsiz pay her zaman görünür kalır — `atanmadı` var(--md) taşır. */
export function sahipHucresi(hesaplar: Hesap[]): Hucre {
  const sahipler = benzersiz(hesaplar.map((h) => h.sahip));
  const bos = hesaplar.filter((h) => h.sahip === null).length;
  if (sahipler.length === 0) return { metin: 'atanmadı', durum: 'md' };
  const ad = sahipler.length === 1 ? sahipler[0] : `${sahipler.length} kişi`;
  return bos > 0
    ? { metin: `${ad} +${bos} atanmadı`, durum: 'md' }
    : { metin: ad };
}

/* ── metrikler ─────────────────────────────────────────────────────────── */

export type Metrikler = {
  rotasyonsuz: number;
  atil: number;
  sahipsiz: number;
  /** hiç incelenmemiş en eski ayrıcalıklı atamanın yaşı; null = böyle atama yok */
  gecikmeGun: number | null;
  /** hiç incelenmemiş ayrıcalıklı atama sayısı */
  bekleyenAtama: number;
  /** ayrıcalıklı atama hiç yoksa gecikme ölçülemez — bilinmeyen */
  ayricalikliAtamaVar: boolean;
  /** ayrıcalık durumu kaynak sistemden gelmemiş hesap sayısı */
  ayricalikOlculmedi: number;
  mudahale: number;
  toplam: number;
};

export function metrikleriHesapla(hesaplar: Hesap[]): Metrikler {
  const kapsam = hesaplar.filter(kapsamda);
  const ayricalikliAtamalar = kapsam.filter((h) => h.ayricalikli === true).flatMap(acikYetkiler);
  const bekleyen = ayricalikliAtamalar.filter((y) => y.sonInceleme === null);
  const enEski = bekleyen
    .map((y) => new Date(y.verilis).getTime())
    .reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);
  return {
    rotasyonsuz: kapsam.filter(rotasyonsuzServis).length,
    atil: kapsam.filter(atilYonetici).length,
    sahipsiz: kapsam.filter(sahipsiz).length,
    gecikmeGun: bekleyen.length === 0 ? null
      : Math.floor((Date.now() - enEski) / 86_400_000),
    bekleyenAtama: bekleyen.length,
    ayricalikliAtamaVar: ayricalikliAtamalar.length > 0,
    ayricalikOlculmedi: kapsam.filter(ayricalikBilinmiyor).length,
    mudahale: kapsam.filter((h) => hesapDurumu(h) === 'bd').length,
    toplam: kapsam.length,
  };
}

/* ── çekmece cümleleri ─────────────────────────────────────────────────── */

export const DURUM_SOZU_HESAP: Record<Durum, string> = {
  bd: 'Müdahale bekliyor',
  md: 'Eksik kayıt',
  unk: 'Değerlendirilmedi',
  ok: 'İncelendi',
  pl: 'Planlı',
  tamam: 'Kapatıldı',
};

export function nedenCumlesi(h: Hesap): string {
  const g = gunFarki(h.sonKullanim);
  if (rotasyonsuzServis(h)) {
    return `Servis hesabında hiç parola rotasyonu yapılmamış; ${acikYetkiler(h).length} açık yetki bu kimlikle taşınıyor.`;
  }
  if (atilYonetici(h)) {
    return `Ayrıcalıklı hesap ${g} gündür kullanılmıyor ama yetkileri duruyor.`;
  }
  if (incelenmemisAyricalikli(h)) {
    return `Ayrıcalıklı ${incelenmemisYetkiler(h).length} atama hiç incelemeden geçmemiş.`;
  }
  if (sahipsiz(h)) {
    return 'Kişi hesabının platformda karşılığı yok — kimin adına açıldığı kayıtlı değil.';
  }
  if (paylasimliRotasyonsuz(h)) {
    return 'Paylaşımlı kimlikte parola rotasyonu kaydı yok.';
  }
  if (h.sonKullanim === null) {
    return 'Kullanım verisi gelmiyor; hesabın hâlâ gerekli olup olmadığı ölçülemiyor.';
  }
  return `Açık yetkilerin tamamı incelemeden geçti; son kullanım ${oncekiMetin(g)}.`;
}

export function grupCumlesi(onek: string, uyeler: Hesap[]): string {
  const rot = uyeler.filter(rotasyonsuzServis).length;
  const atl = uyeler.filter(atilYonetici).length;
  const shz = uyeler.filter(sahipsiz).length;
  const parca = [
    rot > 0 ? `${rot} hesapta parola rotasyonu yok` : null,
    atl > 0 ? `${atl} hesap ${ATIL_ESIK} günden uzun süredir kullanılmıyor` : null,
    shz > 0 ? `${shz} hesabın platform karşılığı yok` : null,
  ].filter((p): p is string => p !== null);
  const kuyruk = parca.length ? parca.join(', ') : 'açık yetkilerin tamamı incelemeden geçti';
  return `${onek} önekinde ${uyeler.length} hesap var; ${kuyruk}.`;
}

/** Veriliş yolu: yetki nereden geldi? */
export function verilisYolu(h: Hesap, y: Yetki): string {
  return [
    h.kaynakSistem ?? 'kaynak yok',
    h.hesapAdi,
    y.kapsam ?? 'kapsam yok',
    y.varlikEtiketi ?? h.tesisKod ?? 'portföy',
  ].join(' ▸ ');
}
