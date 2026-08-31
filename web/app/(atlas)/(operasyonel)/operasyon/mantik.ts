import type { Durum } from '@/components/atlas/temel';

/* O · Değişiklik yönetimi — saf mantık.

   NEDEN BU EKRAN YALNIZ DEĞİŞİKLİK TAŞIYOR
   Ozalit'teki /operasyon tek ekranda BEŞ sekme tutuyordu (değişiklik, olay,
   yedekleme, tedarikçi, kimlik). DESIGN_HANDOFF_GAP §3 bu borcu kapatıyor:
   O14 yedekleme → /yedekleme, O15 kimlik → /kimlik, O16 tedarikçi →
   /tedarikciler kendi rotalarına ayrıldı ve üçü de Atlas'ta hazır; olay
   yönetimi ise /olaylar ekranında (etki zinciriyle birlikte) yaşıyor.
   Geriye DEĞİŞİKLİK YÖNETİMİ kalıyor ve /operasyon rotası onun için
   korunuyor. Taşınmış sekmeler burada TEKRAR EDİLMEZ — aynı kaydı iki
   ekranda iki farklı yoğunlukla göstermek yoğunluk borcunu geri getirirdi.

   Bu modül veritabanına, React'e ve server-only'ye dokunmaz; testi de
   dokunmaz (tests/operasyon-mantik.test.ts, izole DB kopyası gerekmez).

   Zaman hesabı `simdi`yi PARAMETRE alır: sunucu isteğin başında bir kez
   okur ve istemciye verir. Aksi hâlde metrik, tablo ve çekmece aynı ekranda
   üç farklı "bugün" ile çizilir. */

export const GUN = 86_400_000;

/** Yaşam döngüsü — lib/eylemler2/operasyon.ts içindeki DEGISIKLIK_SIRASI ile
    AYNI dizi. Ekran kendi sırasını kurarsa iki yerde iki farklı döngü olur;
    `geri_alindi` bu dizinin dışındadır (döngünün adımı değil, terk edişi). */
export const ASAMALAR = ['talep', 'onay', 'planlandi', 'uygulandi', 'dogrulandi'] as const;
export type Asama = (typeof ASAMALAR)[number];

export const ASAMA_ETIKET: Record<string, string> = {
  talep: 'Talep',
  onay: 'Onay',
  planlandi: 'Planlandı',
  uygulandi: 'Uygulandı',
  dogrulandi: 'Doğrulandı',
  geri_alindi: 'Geri alındı',
};

export function asamaEtiketi(durum: string): string {
  return ASAMA_ETIKET[durum] ?? durum;
}

export function asamaIndeksi(durum: string): number {
  return ASAMALAR.indexOf(durum as Asama);
}

/* ── Biçimler ───────────────────────────────────────────────────────── */

export type Kodlu = { id: string; kod: string; ad: string };

/** Çekmece zincirinde gösterilen bağlı kayıt. */
export type Bagli = { id: string; kod: string; alt: string; yol: string };

export type D = {
  id: string;
  kod: string;
  baslik: string;
  aciklama: string | null;
  tesis: Kodlu | null;
  varlikEtiketi: string | null;
  otMu: boolean;
  durum: string;
  /** OT emniyet kapıları — null "hayır" değil "kaydedilmedi"dir */
  saglayiciOnayi: boolean | null;
  bakimPenceresi: string | null;
  geriAlmaPlani: string | null;
  onDegisiklikYedegi: boolean | null;
  uretimEtkisi: string | null;
  sonDogrulama: string | null;
  talepEden: string | null;
  onaylayan: string | null;
  planTarihi: string | null;
  olusturuldu: string;
  olaylar: Bagli[];
  /** kaydı düzenleyebilir mi (tesis kapsamı dâhil) — sunucu ayrıca denetler */
  yazilabilir: boolean;
  /** aşama ilerletme ve geri alma yetkisi — sunucu ayrıca denetler */
  onaylanabilir: boolean;
};

/* ── OT emniyet kapıları ────────────────────────────────────────────────
   lib/eylemler2/operasyon.ts `degisiklikIlerlet` içindeki BEŞ kapıyla aynı
   liste ve aynı ölçüt: kapı yalnız açıkça doldurulduğunda tamamdır.
   `null` (hiç kaydedilmedi) ile `false` (alınmadı) ikisi de planlamayı
   engeller ama çekmecede farklı yazılır — biri boşluk, öteki karardır. */

export type Kapi = { ad: string; tamam: boolean; deger: string | null };

export function kapilar(d: D): Kapi[] {
  // BT değişikliğinin kapısı YOKTUR: "0/5" göstermek eksik kapı uydururdu.
  if (!d.otMu) return [];
  const evetHayir = (v: boolean | null) => (v === null ? null : v ? 'alındı' : 'alınmadı');
  return [
    { ad: 'Sağlayıcı onayı', tamam: d.saglayiciOnayi === true, deger: evetHayir(d.saglayiciOnayi) },
    { ad: 'Bakım penceresi', tamam: !!d.bakimPenceresi, deger: d.bakimPenceresi },
    { ad: 'Geri alma planı', tamam: !!d.geriAlmaPlani, deger: d.geriAlmaPlani },
    { ad: 'Ön değişiklik yedeği', tamam: d.onDegisiklikYedegi === true,
      deger: evetHayir(d.onDegisiklikYedegi) },
    { ad: 'Üretim etkisi', tamam: !!d.uretimEtkisi, deger: d.uretimEtkisi },
  ];
}

export function eksikKapilar(d: D): string[] {
  return kapilar(d).filter((k) => !k.tamam).map((k) => k.ad);
}

export function tamamKapiSayisi(d: D): number {
  return kapilar(d).filter((k) => k.tamam).length;
}

/* ── Yaşam döngüsü durumu ───────────────────────────────────────────── */

export function kapandiMi(d: Pick<D, 'durum'>): boolean {
  return d.durum === 'dogrulandi' || d.durum === 'geri_alindi';
}

export function acikMi(d: Pick<D, 'durum'>): boolean {
  return !kapandiMi(d);
}

/** Plan tarihi aşıldıysa kaç gün — kapanmış kayıt gecikmez, tarihsiz kayıt
    da gecikmez (ölçülemeyen gecikme "0 gecikme" DEĞİLDİR). */
export function gecikmeGunu(d: D, simdi: number): number | null {
  if (kapandiMi(d) || !d.planTarihi) return null;
  const t = Date.parse(d.planTarihi);
  if (Number.isNaN(t)) return null;
  const fark = simdi - t;
  return fark > 0 ? Math.max(1, Math.floor(fark / GUN)) : null;
}

/* İşaretçi "bu değişiklik emniyetli ilerliyor mu?" sorusunu yanıtlar.
   Aşama ayrı bir kolonda kelimeyle yazılır; işaretçi onu TEKRAR ETMEZ. */
export function degisiklikImi(d: D, simdi: number): Durum {
  // Geri alma bir yaşam döngüsü adımı değil, başarısızlıktır.
  if (d.durum === 'geri_alindi') return 'bd';
  if (d.durum === 'dogrulandi') return 'tamam';
  if (gecikmeGunu(d, simdi) !== null) return 'bd';
  // Uygulanmış ama doğrulanmamış değişiklik açık bir kapanış borcudur.
  if (d.durum === 'uygulandi') return 'md';
  if (d.otMu && eksikKapilar(d).length > 0) return 'md';
  // Plan tarihi girilmemiş kaydın takvimi BİLİNMİYOR — "zamanında" değildir.
  if (!d.planTarihi) return 'unk';
  return 'pl';
}

/** Çekmece kimlik bloğunun sözcüğü — durumun kelimeyle yazıldığı TEK yer. */
export function kimlikSozu(d: D, simdi: number): string {
  if (d.durum === 'geri_alindi') return 'Geri alındı';
  if (d.durum === 'dogrulandi') return 'Doğrulandı';
  const gec = gecikmeGunu(d, simdi);
  if (gec !== null) return `Plan tarihi ${gec} gün aşıldı`;
  if (d.durum === 'uygulandi') return 'Doğrulama bekliyor';
  if (d.otMu && eksikKapilar(d).length > 0) return 'Emniyet kapısı eksik';
  if (!d.planTarihi) return 'Plan tarihi girilmedi';
  return asamaEtiketi(d.durum);
}

/** Kimlik cümlesi — işaretçinin neden o renkte olduğunu bir cümlede söyler. */
export function kimlikCumlesi(d: D, simdi: number): string {
  if (d.durum === 'geri_alindi') {
    return 'Değişiklik geri alındı; gerekçesi denetim izinde duruyor.';
  }
  if (d.durum === 'dogrulandi') {
    return d.sonDogrulama
      ? `Kapanış doğrulaması: ${d.sonDogrulama}`
      : 'Kapandı; değişiklik-sonrası doğrulama notu kayıtta yok.';
  }
  const gec = gecikmeGunu(d, simdi);
  if (gec !== null) {
    return `Plan tarihi ${gec} gün önce geçti; kayıt hâlâ `
      + `${asamaEtiketi(d.durum).toLocaleLowerCase('tr-TR')} aşamasında.`;
  }
  if (d.durum === 'uygulandi') {
    return 'Uygulandı ama doğrulanmadı; kapanış değişiklik-sonrası doğrulama notu ister.';
  }
  const eksik = eksikKapilar(d);
  if (d.otMu && eksik.length > 0) {
    return `OT değişikliği ${eksik.length} emniyet kapısı eksik olduğu için planlanamaz: `
      + `${eksik.join(', ').toLocaleLowerCase('tr-TR')}.`;
  }
  if (!d.planTarihi) return 'Plan tarihi girilmedi — gecikme ölçülemiyor.';
  return d.aciklama ?? 'Değişiklik planlı akışında ilerliyor.';
}

/* ── Satır metinleri ────────────────────────────────────────────────────
   Alt satır kayıt kimliği + EN FAZLA iki olgu taşır; durum sözcüğü canvasta
   tekrar edilmez (06 §A2). */

export function altSatir(d: D): string {
  const olgular = [
    d.otMu ? 'OT' : null,
    d.varlikEtiketi ?? d.talepEden,
  ].filter((x): x is string => !!x).slice(0, 2);
  return [d.kod, ...olgular].join(' · ');
}

/** Santral hücresi: tek tesis · yoksa portföy (grup çapında değişiklik). */
export function santralMetni(d: Pick<D, 'tesis'>): string {
  return d.tesis?.ad ?? 'portföy';
}

/** Kapı hücresi: OT'de tamamlanan kapı kesri, BT'de kapı YOKTUR. */
export function kapiHucresi(d: D): { pay: number; payda: number } | null {
  if (!d.otMu) return null;
  const hepsi = kapilar(d);
  return { pay: hepsi.filter((k) => k.tamam).length, payda: hepsi.length };
}

/* ── Mercekler ──────────────────────────────────────────────────────── */

export type Mercek = 'acik' | 'kapi' | 'dogrulama' | 'kapanan' | 'hepsi';

export const MERCEKLER: { id: Mercek; ad: string }[] = [
  { id: 'acik', ad: 'Açık' },
  { id: 'kapi', ad: 'Kapısı eksik' },
  { id: 'dogrulama', ad: 'Doğrulama bekleyen' },
  { id: 'kapanan', ad: 'Kapanan' },
  { id: 'hepsi', ad: 'Tümü' },
];

export function mercekten(d: D, m: Mercek): boolean {
  switch (m) {
    case 'acik': return acikMi(d);
    case 'kapi': return acikMi(d) && d.otMu && eksikKapilar(d).length > 0;
    case 'dogrulama': return d.durum === 'uygulandi';
    case 'kapanan': return kapandiMi(d);
    default: return true;
  }
}

/* ── Sıralama ve kuyruk ─────────────────────────────────────────────────
   Yoğunluk sözleşmesi: 5–9 görünür satır + toplanan kuyruk. Kritik satır
   (geri alınmış ya da gecikmiş) sayıdan bağımsız görünür kalır. */

export const GORUNUR_BUTCE = 7;

function agirlik(d: D, simdi: number): number {
  if (d.durum === 'geri_alindi') return 0;
  if (gecikmeGunu(d, simdi) !== null) return 1;
  if (d.durum === 'uygulandi') return 2;
  if (d.otMu && eksikKapilar(d).length > 0) return 3;
  if (!kapandiMi(d)) return 4;
  return 5;
}

/** Plan tarihi olmayan kayıt EN SONA iner ama "uzak tarih" sayılmaz —
    sıralama içinde ayrı bir kova olarak durur. */
function planAni(d: D): number {
  if (!d.planTarihi) return Number.POSITIVE_INFINITY;
  const t = Date.parse(d.planTarihi);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

export function sirala(kayitlar: D[], simdi: number): D[] {
  return [...kayitlar].sort((a, b) =>
    agirlik(a, simdi) - agirlik(b, simdi)
    || planAni(a) - planAni(b)
    || a.kod.localeCompare(b.kod, 'tr'));
}

/** Kuyruğa yalnız doğrulanarak kapanmış kayıt iner. Geri alınmış kayıt
    kritiktir ve ASLA toplanmaz. */
export function toplanabilir(d: D): boolean {
  return d.durum === 'dogrulandi';
}

export function bolumle(sirali: D[], kuyrukAcik: boolean, butce = GORUNUR_BUTCE):
{ gorunur: D[]; toplanan: D[] } {
  if (kuyrukAcik) return { gorunur: sirali, toplanan: [] };
  const sabit = sirali.filter((d) => !toplanabilir(d));
  const kalan = sirali.filter(toplanabilir);
  const slot = Math.max(0, butce - sabit.length);
  return { gorunur: [...sabit, ...kalan.slice(0, slot)], toplanan: kalan.slice(slot) };
}

/* ── Metrikler ──────────────────────────────────────────────────────────
   Metrikler filtreden BAĞIMSIZ: kütüğün tamamını anlatır. En fazla dört. */

export type Metrikler = {
  toplam: number;
  acik: number;
  gecikmis: number;
  kapiEksik: number;
  dogrulamaBekleyen: number;
  /** plan tarihi hiç girilmemiş açık kayıt — bilinmeyen, "zamanında" değil */
  planTarihsiz: number;
  geriAlinan: number;
  kapanan: number;
  otAcik: number;
};

export function metrikleriHesapla(kayitlar: D[], simdi: number): Metrikler {
  const acik = kayitlar.filter(acikMi);
  return {
    toplam: kayitlar.length,
    acik: acik.length,
    gecikmis: acik.filter((d) => gecikmeGunu(d, simdi) !== null).length,
    kapiEksik: acik.filter((d) => d.otMu && eksikKapilar(d).length > 0).length,
    dogrulamaBekleyen: kayitlar.filter((d) => d.durum === 'uygulandi').length,
    planTarihsiz: acik.filter((d) => !d.planTarihi).length,
    geriAlinan: kayitlar.filter((d) => d.durum === 'geri_alindi').length,
    kapanan: kayitlar.filter((d) => d.durum === 'dogrulandi').length,
    otAcik: acik.filter((d) => d.otMu).length,
  };
}

/** Ekran başlığı: en çok müdahale isteyen olgu vurguyu alır. */
export function baslikMetni(m: Metrikler): { vurgu?: string; ad: string; durum?: Durum } {
  if (m.gecikmis > 0) {
    return { vurgu: `${m.gecikmis} değişiklik`, ad: 'plan tarihini aştı', durum: 'bd' };
  }
  if (m.kapiEksik > 0) {
    return { vurgu: `${m.kapiEksik} OT değişikliği`, ad: 'emniyet kapısı bekliyor', durum: 'md' };
  }
  if (m.dogrulamaBekleyen > 0) {
    return { vurgu: `${m.dogrulamaBekleyen} değişiklik`, ad: 'doğrulama bekliyor', durum: 'md' };
  }
  if (m.acik > 0) return { vurgu: `${m.acik} değişiklik`, ad: 'açık' };
  return { ad: 'Açık değişiklik yok' };
}

/** Tablo dip notu — bilinmeyen ve gizlenen kayıtlar sessizce yutulmaz. */
export function dipNot(gorunurSayisi: number, m: Metrikler, mercek: Mercek): string {
  const parcalar = [`${gorunurSayisi} satır görünüyor`];
  if (m.planTarihsiz > 0) parcalar.push(`${m.planTarihsiz} kaydın plan tarihi girilmedi`);
  if (m.geriAlinan > 0) parcalar.push(`${m.geriAlinan} kayıt geri alınmış`);
  if (mercek === 'acik' && m.kapanan > 0) {
    parcalar.push(`${m.kapanan} doğrulanmış kayıt bu mercekte gizli`);
  }
  return parcalar.join(' · ');
}
