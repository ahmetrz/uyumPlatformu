import type { Durum } from '@/components/atlas/temel';

/* O8/O9 · Dönüşüm portföyü — sunucu ve istemcinin PAYLAŞTIĞI tipler ve saf
   hesaplar. Ekranın tek gerçek kaynağı burasıdır: aynı yüklem hem metrikte
   hem zaman çizelgesinde hem tabloda hem çekmecede okunur.

   İki sözleşme maddesi bu dosyanın biçimini belirliyor:
   · 06 §A2 — durum sözcüğü canvasta geçemez. Satır bu yüzden OLGU yazar
     (`+42 g`, `Q2'27`, `7 kontrol · 3 risk`); sözcük yalnız çekmecenin
     kimlik bloğunda.
   · 06 §A3 — unknown ≠ zero. Kilometre taşı olmayan projenin ilerlemesi
     %0 DEĞİL null; bütçe satırı olmayan proje "0 TL" DEĞİL bilinmiyor.

   `simdi` sunucudan taşınır (istemcide `Date.now()` çağrılmaz) — böylece
   gecikme günleri sunucu ve istemcide aynı çıkar, hidrasyon sapmaz. */

export const GUN = 86_400_000;

/** 06 §A3: tabloda 5–9 satır görünür; riskteki satırlar bu bütçenin dışında
    kalır ve hiçbir sıralamada kuyruğa toplanmaz. */
export const GORUNUR_BUTCE = 5;

/* Zaman çizelgesi kartı 208px SABİT; şeritte TEK lane var (02-components
   §14), bu yüzden kaç kart sığdığı tuvalin genişliğine bağlıdır. Geniş
   tuval 1102px (250 ray + 2×44 oluk), çekmece açıkken 682px'e iner —
   tablo ikincil kolonunu düşürürken şerit de kart düşürür. */
export const KART_BUTCESI = 3;
export const KART_BUTCESI_DAR = 2;

/** Kart genişliğinin tuvale oranı + nefes payı: ardışık iki kart bu kadar
    ayrılmazsa üst üste biner. */

/** Kartın soldan başlayabileceği en son oran — `left` zaten
    `calc(100% - 208px)` ile kırpılıyor, konumlar da orada durmalı. */

export type Kisi = { id: string; ad: string };
export type Secenek = { id: string; ad: string };

/** Kilometre taşı = tasarımın "faz"ı. Şemada `KilometreTasi` adıyla durur. */
export type Faz = {
  id: string;
  ad: string;
  hedef: string;
  gerceklesen: string | null;
  durum: string;
};

export type ButceSatiri = {
  yil: number;
  tip: string;
  planlanan: number;
  harcanan: number;
  paraBirimi: string;
};

/** Bağlantı kaydı — çekmecede tek tek kaldırılabildiği için bağın kendi
    `id`si taşınır; `hedefId` ise bağlanan kaydınki, seçim listesinden
    zaten bağlı olanı elemeye yarar. */
export type Baglanti = {
  id: string;
  hedefId: string;
  tur: 'madde' | 'bulgu' | 'risk' | 'varlik' | 'tesis';
  kod: string;
  alt: string;
  yol: string;
};

export type P = {
  id: string;
  kod: string;
  ad: string;
  aciklama: string | null;
  /** "bu projeyi neden yapıyoruz" — çekmecenin kimlik cümlesi */
  gerekce: string | null;
  tip: string;
  durum: string;
  baslangic: string | null;
  hedef: string | null;
  sahip: Kisi | null;
  fazlar: Faz[];
  butceler: ButceSatiri[];
  baglantilar: Baglanti[];
  /** kapsamdaki santraller — doğrudan tesis bağı + bulguların tesisi */
  tesisler: { id: string; kod: string; ad: string }[];
  /** Bu projenin ÖNKOŞULLARI — tamamlanmadan bu proje bitemez. */
  onkosullar: Bagimlilik[];
  /** Bu projeye BAĞLI projeler — bu proje gecikirse onlar da gecikir. */
  bagimlilar: Bagimlilik[];
};

export type Bagimlilik = {
  id: string; kod: string; ad: string; durum: string; hedef: string | null;
};

/* ── İlerleme ───────────────────────────────────────────────────────────
   Kilometre taşı yoksa ilerleme BİLİNMİYOR: %0 uydurulmaz (§19). */

export function bitenFaz(p: Pick<P, 'fazlar'>): number {
  return p.fazlar.filter((f) => f.durum === 'tamamlandi').length;
}

export function ilerleme(p: Pick<P, 'fazlar'>): number | null {
  if (p.fazlar.length === 0) return null;
  return Math.round((bitenFaz(p) / p.fazlar.length) * 100);
}

/* ── Zaman ──────────────────────────────────────────────────────────── */

export function gunFarki(iso: string | null, simdi: number): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.floor((simdi - t) / GUN);
}

/** Fazın hedefi aşıldı ve kapanmadı — aşım günü; değilse null. */
export function fazGecikmesi(f: Faz, simdi: number): number | null {
  if (f.durum === 'tamamlandi' || f.gerceklesen) return null;
  const gun = gunFarki(f.hedef, simdi);
  return gun !== null && gun > 0 ? gun : null;
}

export function gecikenFazlar(p: Pick<P, 'fazlar'>, simdi: number): Faz[] {
  return p.fazlar.filter((f) => f.durum === 'gecikti' || fazGecikmesi(f, simdi) !== null);
}

/** Projenin kendi hedefi geçti ve kapanmadı. */
export function hedefGecti(p: Pick<P, 'durum' | 'hedef'>, simdi: number): boolean {
  if (p.durum === 'tamamlandi') return false;
  const gun = gunFarki(p.hedef, simdi);
  return gun !== null && gun > 0;
}

export function aktifMi(p: Pick<P, 'durum'>): boolean {
  return p.durum !== 'tamamlandi';
}

/* ── Bütçe ──────────────────────────────────────────────────────────────
   Bütçe satırı olmayan proje "0 TL" değildir: özet null döner ve ekran
   "bilinmiyor" der. Sapma = (harcanan − planlanan) / planlanan. */

export type ButceOzeti = { planlanan: number; harcanan: number; sapma: number | null };

export function butceOzeti(p: Pick<P, 'butceler'>): ButceOzeti | null {
  if (p.butceler.length === 0) return null;
  const planlanan = p.butceler.reduce((a, b) => a + b.planlanan, 0);
  const harcanan = p.butceler.reduce((a, b) => a + b.harcanan, 0);
  return {
    planlanan,
    harcanan,
    sapma: planlanan > 0 ? Math.round(((harcanan - planlanan) / planlanan) * 100) : null,
  };
}

export function butceAsimi(p: Pick<P, 'butceler'>): boolean {
  const o = butceOzeti(p);
  return o !== null && o.sapma !== null && o.sapma > 0;
}

/* ── Risk yüklemleri ────────────────────────────────────────────────────
   "Riskte" TAAHHÜDÜ aşan projedir: gecikmiş faz ya da geçmiş proje hedefi.
   Bu satırlar sıralamadan bağımsız üste sabitlenir ve ASLA toplanmaz. */

export function riskteMi(p: P, simdi: number): boolean {
  if (!aktifMi(p)) return false;
  return gecikenFazlar(p, simdi).length > 0 || hedefGecti(p, simdi);
}

/** Satırın ilerleme çubuğunun taşıdığı durum — renk tek sinyal değildir,
    yanında yüzde ve gecikme günü de yazılıdır. */
export function barDurumu(p: P, simdi: number): Durum {
  if (p.durum === 'tamamlandi') return 'ok';
  if (riskteMi(p, simdi)) return 'bd';
  return 'md';
}

/** Çekmece kenarı ve zaman çizelgesi kartının üst kenarı: sakin proje
    NÖTR kalır (`pl` için kart kenarı tanımlı değil, gri kalır). */
export function kartDurumu(p: P, simdi: number): Durum {
  if (p.durum === 'tamamlandi') return 'ok';
  if (riskteMi(p, simdi)) return 'bd';
  if (butceAsimi(p)) return 'md';
  return 'pl';
}

/* ── Görüntü metinleri ──────────────────────────────────────────────── */

/** `Q2'27` — hedef tarihin çeyreği; portföy ekranı gün değil çeyrek konuşur. */
export function ceyrek(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Q${Math.floor(d.getMonth() / 3) + 1}'${String(d.getFullYear()).slice(2)}`;
}

/** Hedef hücresi: geçmiş hedef GÜN cinsinden aşımı yazar (durum sözcüğü değil). */
export function hedefMetni(p: P, simdi: number): { metin: string; gecikmis: boolean } {
  if (!p.hedef) return { metin: 'tarih yok', gecikmis: false };
  const gun = gunFarki(p.hedef, simdi);
  if (p.durum !== 'tamamlandi' && gun !== null && gun > 0) {
    return { metin: `+${gun} g`, gecikmis: true };
  }
  return { metin: ceyrek(p.hedef) ?? 'tarih yok', gecikmis: false };
}

/** Satırın santral kapsamı: iki santrale kadar ad, fazlası sayı, hiçbiri portföy. */
export function santralMetni(p: Pick<P, 'tesisler'>): string {
  if (p.tesisler.length === 0) return 'portföy';
  if (p.tesisler.length <= 2) return p.tesisler.map((t) => t.ad).join(' + ');
  return `${p.tesisler.length} santral`;
}

/** Satır alt satırı: kayıt kimliği + kapsam. Durum tekrar edilmez.

    Kapanmamış önkoşul VARSA sayısı eklenir. Bu, durum imini tekrar etmez:
    im projenin kendi hâlini söyler, bu sayı ise "kendi hâli ne olursa
    olsun başkası bitmeden bitemez" der. Sıfırsa hiç yazılmaz — her satıra
    "0 önkoşul" koymak listeyi okunmaz yapar. */
export function altSatir(p: P): string {
  const engel = engelleyenler(p).length;
  return `${p.kod} · ${santralMetni(p)}${engel > 0 ? ` · ${engel} önkoşul açık` : ''}`;
}

/* Sayının ardından Türkçe çokluk eki gelmez: "7 kontrol", "7 kontroller" değil. */
const BAG_ADI: Record<Baglanti['tur'], string> = {
  madde: 'kontrol', bulgu: 'bulgu', risk: 'risk', varlik: 'varlık', tesis: 'santral',
};

/** `7 kontrol · 3 risk · 4 bulgu` — projenin kapattığı boşluğun tek satırı.
    Sıfır olan tür hiç yazılmaz; hiç bağ yoksa gerekçe eksik demektir. */
export function bagMetni(p: Pick<P, 'baglantilar'>): string {
  const sira: Baglanti['tur'][] = ['madde', 'risk', 'bulgu', 'varlik'];
  const parcalar = sira
    .map((t) => [t, p.baglantilar.filter((b) => b.tur === t).length] as const)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${n} ${BAG_ADI[t]}`);
  return parcalar.length ? parcalar.join(' · ') : 'bağ yok';
}

/** Metrik: portföyün kapattığı toplam kayıt (santral bağı sayılmaz —
    santral kapsamdır, kapatılan boşluk değil). */
export function kapatilanSayisi(p: Pick<P, 'baglantilar'>): number {
  return p.baglantilar.filter((b) => b.tur !== 'tesis').length;
}

/** Zaman çizelgesi kartı ve raylar büyük harf konuşur. */
export const buyuk = (s: string) => s.toLocaleUpperCase('tr-TR');

/** Kart kapsam satırı 180px'lik mono şeride sığar; uzunu sonundan kırpılır. */
export function kisaAd(ad: string, n = 22): string {
  return ad.length > n ? `${ad.slice(0, n - 1)}…` : ad;
}

/** `+%12` / `−%41` — işaret yüzdenin ÖNÜNDE durur; `%-41` okunmaz. */
export function sapmaMetni(sapma: number): string {
  if (sapma === 0) return '%0';
  return `${sapma > 0 ? '+' : '−'}%${Math.abs(sapma)}`;
}

/* ── Zaman çizelgesi ufku ─────────────────────────────────────────────
   Şeridin ölçeği veriden gelir: en uzak hedef ne kadar ilerideyse ufuk o
   kadar (en az 12, en çok 36 ay). Eksen tırnakları ve kartlar AYNI ölçeği
   paylaşır — kart bir çeyrekte duruyorsa eksen de orada o çeyreği gösterir. */

const AY = 30.44 * GUN;
export const UFUK_AY = 36;

export function ufukUzunlugu(hedefler: (number | null)[], simdi: number): number {
  const gelecek = hedefler.filter((t): t is number => t !== null && t > simdi);
  const enUzak = gelecek.length > 0 ? Math.max(...gelecek) : simdi;
  const ay = (enUzak - simdi) / AY;
  return Math.min(UFUK_AY, Math.max(12, Math.ceil(ay) + 1)) * AY;
}

/** 0–1 arası ufuk konumu; geçmiş 0'a oturur, ufkun ötesi 1'e. */
export function ufukKonumu(hedef: number | null, simdi: number, uzunluk: number): number {
  if (hedef === null) return 0;
  return Math.max(0, Math.min(1, (hedef - simdi) / uzunluk));
}

/* Kart seçimi ufka yayılır: bir geçmiş/gecikmiş kart + ufkun üç diliminden
   birer kart. Dilim boşsa yer kalan adaylarla doldurulur; böylece kartlar
   birbirini itmeden gerçek çeyreklerinde durur. */
export function ufkaYay<T extends { an: number | null }>(
  adaylar: T[], simdi: number, uzunluk: number, adet = KART_BUTCESI,
): T[] {
  const gecmisMi = (a: T) => a.an === null || a.an < simdi;
  const gecmisler = adaylar.filter(gecmisMi);
  const gelecekler = adaylar.filter((a) => !gecmisMi(a));
  const secilen: T[] = [];
  const ekle = (a: T | undefined) => {
    if (a && !secilen.includes(a) && secilen.length < adet) secilen.push(a);
  };

  ekle(gecmisler[0]);
  for (let dilim = 0; dilim < 3; dilim += 1) {
    const alt = (dilim / 3) * uzunluk;
    const ust = ((dilim + 1) / 3) * uzunluk;
    ekle(gelecekler.find((a) => {
      const fark = (a.an as number) - simdi;
      return fark >= alt && (dilim === 2 ? fark <= ust : fark < ust);
    }));
  }
  for (const a of gelecekler) ekle(a);
  for (const a of gecmisler) ekle(a);

  return secilen.sort((a, b) =>
    (a.an ?? Number.POSITIVE_INFINITY) - (b.an ?? Number.POSITIVE_INFINITY));
}


/** Eksen tırnakları: BUGÜN + ufka sığan çeyrek ya da yıl sınırları.
    En fazla dört tırnak; birbirine yapışanlar elenir. */
export function donemler(simdi: number, uzunluk: number): { ad: string; konum: number }[] {
  const bas = new Date(simdi);
  const son = simdi + uzunluk;
  const yillik = uzunluk > 18 * AY;
  const adim = yillik ? 12 : 3;
  const ilk = new Date(bas.getFullYear(), yillik ? 0 : Math.ceil((bas.getMonth() + 1) / 3) * 3, 1);
  if (yillik) ilk.setFullYear(bas.getFullYear() + 1);

  const adaylar: { ad: string; konum: number }[] = [];
  for (const t = ilk; t.getTime() <= son; t.setMonth(t.getMonth() + adim)) {
    if (t.getTime() <= simdi) continue;
    adaylar.push({
      ad: yillik ? String(t.getFullYear()) : (ceyrek(t.toISOString()) as string),
      konum: ufukKonumu(t.getTime(), simdi, uzunluk),
    });
  }
  const ayrik: { ad: string; konum: number }[] = [];
  for (const a of adaylar) {
    const oncekiKonum = ayrik.length > 0 ? ayrik[ayrik.length - 1].konum : 0;
    if (a.konum - oncekiKonum >= 0.12) ayrik.push(a);
  }
  const n = ayrik.length;
  const secilen = n <= 3 ? ayrik : [ayrik[0], ayrik[Math.round((n - 1) / 2)], ayrik[n - 1]];
  return [{ ad: 'BUGÜN', konum: 0 }, ...secilen];
}

/* ── Sunucu → istemci eşlemesi ──────────────────────────────────────── */

type HamProje = {
  id: string; kod: string; ad: string; aciklama: string | null; gerekce: string | null;
  tip: string; durum: string;
  baslangic: Date | null; hedef: Date | null;
  sahip: { id: string; adSoyad: string } | null;
  kilometreTaslari: { id: string; ad: string; hedef: Date; gerceklesen: Date | null;
    durum: string }[];
  butceler: { yil: number; tip: string; planlanan: number; harcanan: number;
    paraBirimi: string }[];
  baglantilar: {
    id: string;
    madde: { id: string; kod: string; baslik: string } | null;
    bulgu: { id: string; baslik: string; durum: string;
      maddeDurumu: { tesis: { id: string; kod: string; ad: string } } } | null;
    risk: { id: string; kod: string; baslik: string; artikRisk: number | null } | null;
    varlik: { id: string; etiket: string; ad: string } | null;
    tesis: { id: string; kod: string; ad: string } | null;
  }[];
  bagimliOldugu: { id: string; bagimliProje: HamBagimlilik }[];
  bagimliOlanlar: { id: string; proje: HamBagimlilik }[];
};

type HamBagimlilik = {
  id: string; kod: string; ad: string; durum: string; hedef: Date | null;
};

/** Prisma satırının P'ye indirgenmiş biçimi. Bağlantılar tek listede
    toplanır: çekmece zinciri de satırın sayacı da aynı listeden okunur,
    böylece iki yer aynı bağı iki farklı şekilde sayamaz. */
export function projeyeCevir(p: HamProje): P {
  const baglantilar: Baglanti[] = [];
  const tesisler = new Map<string, { id: string; kod: string; ad: string }>();

  for (const b of p.baglantilar) {
    if (b.madde) {
      baglantilar.push({
        id: b.id, hedefId: b.madde.id, tur: 'madde', kod: b.madde.kod,
        alt: kisalt(b.madde.baslik), yol: '/uyum',
      });
    } else if (b.bulgu) {
      baglantilar.push({
        id: b.id, hedefId: b.bulgu.id, tur: 'bulgu', kod: kisalt(b.bulgu.baslik),
        alt: `bulgu · ${b.bulgu.maddeDurumu.tesis.kod}`, yol: `/bulgular/${b.bulgu.id}`,
      });
      const t = b.bulgu.maddeDurumu.tesis;
      tesisler.set(t.id, t);
    } else if (b.risk) {
      baglantilar.push({
        id: b.id, hedefId: b.risk.id, tur: 'risk', kod: b.risk.kod,
        alt: b.risk.artikRisk !== null ? `risk · artık ${b.risk.artikRisk}` : 'risk · skorsuz',
        yol: '/riskler',
      });
    } else if (b.varlik) {
      baglantilar.push({
        id: b.id, hedefId: b.varlik.id, tur: 'varlik', kod: b.varlik.etiket,
        alt: kisalt(b.varlik.ad), yol: '/envanter',
      });
    } else if (b.tesis) {
      baglantilar.push({
        id: b.id, hedefId: b.tesis.id, tur: 'tesis', kod: b.tesis.kod,
        alt: b.tesis.ad, yol: '/tesisler',
      });
      tesisler.set(b.tesis.id, b.tesis);
    }
  }

  return {
    id: p.id, kod: p.kod, ad: p.ad, aciklama: p.aciklama, gerekce: p.gerekce,
    tip: p.tip, durum: p.durum,
    baslangic: p.baslangic?.toISOString() ?? null,
    hedef: p.hedef?.toISOString() ?? null,
    sahip: p.sahip ? { id: p.sahip.id, ad: p.sahip.adSoyad } : null,
    fazlar: p.kilometreTaslari.map((f) => ({
      id: f.id, ad: f.ad, hedef: f.hedef.toISOString(),
      gerceklesen: f.gerceklesen?.toISOString() ?? null, durum: f.durum,
    })).sort((a, b) => a.hedef.localeCompare(b.hedef)),
    butceler: p.butceler.map((b) => ({
      yil: b.yil, tip: b.tip, planlanan: b.planlanan, harcanan: b.harcanan,
      paraBirimi: b.paraBirimi,
    })),
    baglantilar,
    tesisler: [...tesisler.values()].sort((a, b) => a.kod.localeCompare(b.kod, 'tr')),
    onkosullar: p.bagimliOldugu.map((b) => bagimlilastir(b.bagimliProje)),
    bagimlilar: p.bagimliOlanlar.map((b) => bagimlilastir(b.proje)),
  };
}

function bagimlilastir(
  x: { id: string; kod: string; ad: string; durum: string; hedef: Date | null },
): Bagimlilik {
  return { id: x.id, kod: x.kod, ad: x.ad, durum: x.durum,
    hedef: x.hedef?.toISOString() ?? null };
}

/* ── Bağımlılık yüklemleri ────────────────────────────────────────────
   "Tamamlandı" DIŞINDAKİ her önkoşul engeldir; iptal edilmiş bir önkoşul
   da engeldir, çünkü bu projenin dayandığı iş artık hiç yapılmayacaktır
   ve bunu bilen insan planı değiştirmek zorundadır. Sessizce "engel yok"
   demek en kötü cevaptır. */
export function engelleyenler(p: Pick<P, 'onkosullar'>): Bagimlilik[] {
  return p.onkosullar.filter((o) => o.durum !== 'tamamlandi');
}

/** Engelin kendisi de gecikmiş mi — "geç kalmış bir önkoşul" ayrı bir haberdir. */
export function gecikmisEngeller(p: Pick<P, 'onkosullar'>, simdi: number): Bagimlilik[] {
  return engelleyenler(p).filter(
    (o) => o.hedef !== null && new Date(o.hedef).getTime() < simdi,
  );
}

/** Bu proje gecikirse zincirleme etkilenecek, henüz kapanmamış projeler. */
export function etkilenenler(p: Pick<P, 'bagimlilar'>): Bagimlilik[] {
  return p.bagimlilar.filter((b) => b.durum !== 'tamamlandi' && b.durum !== 'iptal');
}

function kisalt(s: string, n = 46): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/** Prisma include ağacı — sunucu sorgusu ve tip tek yerden okunur. */
export const PROJE_ICERIK = {
  sahip: { select: { id: true, adSoyad: true } },
  kilometreTaslari: {
    select: { id: true, ad: true, hedef: true, gerceklesen: true, durum: true },
  },
  butceler: {
    select: { yil: true, tip: true, planlanan: true, harcanan: true, paraBirimi: true },
  },
  /* PROJE → PROJE bağımlılığı. `ProjeBagimliligi` şemada vardı, tohum
     beş gerçekçi zincir yazıyordu (SIEM-OT → OT-SEG, UZAK-BAKIM → PAM,
     üç proje → ENVANTER) ve HİÇBİR EKRAN okumuyordu: veri duruyor, karar
     veren insan görmüyordu. Bir projenin "yolunda" sayılması, önkoşulunun
     durumunu bilmeden yapılamaz.

     İki yön de gerekli ve AYRI sorular:
       bagimliOldugu  → beni ne engelliyor  (önkoşullarım)
       bagimliOlanlar → ben kimi engelliyorum (bana bağlı olanlar)
     İkincisi gecikmiş bir projeyi portföy seviyesinde bir sinyale çevirir. */
  bagimliOldugu: {
    select: { id: true,
      bagimliProje: { select: { id: true, kod: true, ad: true, durum: true, hedef: true } } },
  },
  bagimliOlanlar: {
    select: { id: true,
      proje: { select: { id: true, kod: true, ad: true, durum: true, hedef: true } } },
  },
  baglantilar: {
    select: {
      id: true,
      madde: { select: { id: true, kod: true, baslik: true } },
      bulgu: {
        select: {
          id: true, baslik: true, durum: true,
          maddeDurumu: { select: { tesis: { select: { id: true, kod: true, ad: true } } } },
        },
      },
      risk: { select: { id: true, kod: true, baslik: true, artikRisk: true } },
      varlik: { select: { id: true, etiket: true, ad: true } },
      tesis: { select: { id: true, kod: true, ad: true } },
    },
  },
} as const;
