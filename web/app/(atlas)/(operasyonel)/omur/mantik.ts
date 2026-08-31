import type { Durum } from '@/components/atlas/temel';

/* O13 · EOL / EOS — saf türetme katmanı.
   Sunucu ham kaydı taşır, karar burada verilir; böylece aynı kurallar
   hem metrikte hem zaman çizelgesinde hem tabloda tek yerden okunur.

   Tanımlar (03-screens O13 + veri sözleşmesi):
   - destek bitti  = varlığın kendi `destekBitis`i geçmiş VEYA üstündeki bir
                     yazılım ürününün `eosTarihi`si geçmiş
   - 12 ay içinde  = `eosTarihi` bugün ile +365 gün arasında
   - projeye bağlı = ProjeBaglantisi ile (doğrudan varlık ya da varlığın
                     riski üzerinden) tamamlanmamış bir projeye bağlı
   - telafi edici kontrol = varlığa bağlı risklerin RiskKontrol maddeleri
   Sayılar hiçbir yerde sabit değildir; hepsi bu dosyadaki yüklemlerden çıkar. */

export const GUN = 86_400_000;
/** Ufuk penceresi: bugün → +36 ay (tasarımdaki BUGÜN · +1 · +2 · +3 yıl ekseni). */
export const UFUK_AY = 36;

export type Proje = { id: string; kod: string; ad: string; durum: string };
export type Kontrol = { kod: string; baslik: string; riskKod: string };
export type Risk = { id: string; kod: string; baslik: string };
export type Yazilim = { ad: string; surum: string | null; uretici: string | null; eos: string };

/** Kararı süren tarihin kaynağı — satırdaki olgu da bundan yazılır. */
export type Kaynak = 'eos' | 'destek' | 'yazilim' | 'eol' | 'yakin' | 'yok';

/** Sunucudan gelen serileştirilmiş varlık kaydı (tarihler ISO). */
export type VarlikKaydi = {
  id: string;
  etiket: string;
  ad: string;
  turAd: string;
  tesisId: string | null;
  tesisAd: string | null;
  tedarikciAd: string | null;
  kritiklik: string;
  yasamDongusu: string;
  destekBitis: string | null;
  eolTarihi: string | null;
  eosTarihi: string | null;
  /** üstündeki desteği bitmiş yazılımlar — en erken EOS önce */
  bitenYazilimlar: Yazilim[];
  kontroller: Kontrol[];
  riskler: Risk[];
  projeler: Proje[];
};

/** Türetilmiş satır — ekranın tek gerçek kaynağı. */
export type Omur = {
  v: VarlikKaydi;
  durum: Durum;
  /** varlığın KENDİ tarihli ömrü doldu (destek ya da EOS geçti) */
  kendiTarihiGecti: boolean;
  /** yalnız üstündeki yazılım yüzünden desteksiz */
  yazilimKaynakli: boolean;
  /** eosTarihi bugün ile +365 gün arasında */
  yaklasan: boolean;
  /** destek/EOL/EOS üçünün de kaydı yok — değerlendirilemez */
  tarihYok: boolean;
  /** eolTarihi kaydı yok (veri kalitesi kuyruğu) */
  eolEksik: boolean;
  /** kararı süren tarih; yoksa null */
  karar: number | null;
  /** kararın geçmişte kalması */
  gecmis: boolean;
  /** aciliyet sırası — küçük olan önce */
  puan: number;
  /** telafi edici kontrol yok — sert sinyal */
  telafiYok: boolean;
  /** kararı süren tarihin kaynağı */
  kaynak: Kaynak;
  /** tamamlanmamış bağlı proje */
  proje: Proje | null;
  /** satır alt satırı: durumu değil, OLGUYU yazar */
  olgu: string;
};

const KRITIKLIK_SIRA: Record<string, number> = {
  kritik: 0, yuksek: 1, orta: 2, dusuk: 3, bilinmiyor: 4,
};

export const buyuk = (s: string) => s.toLocaleUpperCase('tr-TR');

const zaman = (s: string | null): number | null => (s ? new Date(s).getTime() : null);
const gecmisMi = (s: string | null, simdi: number) => {
  const t = zaman(s);
  return t !== null && t < simdi;
};

/* ── tarih biçimleri ──────────────────────────────────────────────────── */

const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

/** `Kas 26` — zaman çizelgesi kartı ve satır olgusu için. */
export function ayYil(iso: string): string {
  const d = new Date(iso);
  return `${AYLAR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

/** Geçmiş için `+14 ay`, gelecek için `7 ay` — süre, durum sözcüğü değil. */
export function sureMetni(fark: number): string {
  const gun = Math.round(Math.abs(fark) / GUN);
  if (gun < 60) return `${gun} g`;
  return `${Math.round(gun / 30.44)} ay`;
}

/* ── türetme ──────────────────────────────────────────────────────────── */

export function omruCoz(v: VarlikKaydi, simdi: number): Omur {
  const destekGecti = gecmisMi(v.destekBitis, simdi);
  const eosGecti = gecmisMi(v.eosTarihi, simdi);
  const eolGecti = gecmisMi(v.eolTarihi, simdi);
  const yazilimGecti = v.bitenYazilimlar.length > 0;
  const eos = zaman(v.eosTarihi);
  const yaklasan = eos !== null && eos >= simdi && eos <= simdi + 365 * GUN;
  const tarihYok = !v.destekBitis && !v.eolTarihi && !v.eosTarihi;

  const kendiTarihiGecti = destekGecti || eosGecti;
  const desteksiz = kendiTarihiGecti || yazilimGecti;
  const telafiYok = v.kontroller.length === 0;
  const proje = v.projeler.find((p) => p.durum === 'devam')
    ?? v.projeler.find((p) => p.durum !== 'tamamlandi')
    ?? null;

  /* Kararı süren tek tarih. Öncelik zinciri: varlığın KENDİ geçmiş tarihi →
     üstündeki yazılımın EOS'u → yaklaşan EOS → geçmiş EOL → en yakın gelecek.
     Sıralama anahtarı ile satırda yazan olgu aynı kaynaktan çıkar; satır
     "EOS Kas 24" derken arkada başka bir tarihe göre sıralanmaz. */
  const kendiGecmis = [
    eosGecti ? { t: zaman(v.eosTarihi) as number, kaynak: 'eos' as const } : null,
    destekGecti ? { t: zaman(v.destekBitis) as number, kaynak: 'destek' as const } : null,
  ].filter((x): x is { t: number; kaynak: 'eos' | 'destek' } => x !== null)
    .sort((a, b) => a.t - b.t)[0];

  const gelecekAdaylar = [zaman(v.destekBitis), zaman(v.eosTarihi), zaman(v.eolTarihi)]
    .filter((t): t is number => t !== null && t >= simdi);

  const sec: { t: number | null; kaynak: Kaynak } = kendiGecmis
    ? { t: kendiGecmis.t, kaynak: kendiGecmis.kaynak }
    : yazilimGecti
      ? { t: zaman(v.bitenYazilimlar[0].eos), kaynak: 'yazilim' }
      : yaklasan
        ? { t: eos, kaynak: 'eos' }
        : eolGecti
          ? { t: zaman(v.eolTarihi), kaynak: 'eol' }
          : gelecekAdaylar.length > 0
            ? enYakin(v, Math.min(...gelecekAdaylar))
            : { t: null, kaynak: 'yok' };

  const karar = sec.t;
  const gecmis = karar !== null && karar < simdi;

  const durum: Durum = desteksiz ? 'bd' : tarihYok ? 'unk' : 'md';

  /* Aciliyet sırası. 0–2 sabitlenir (asla kuyruğa toplanmaz):
     kendi tarihi geçmiş varlık sert bir olgudur, `telafi yok` onu bir kademe
     öne alır; tarihi hiç olmayan varlık da gizlenemez (unknown ≠ zero). */
  const puan = kendiTarihiGecti ? (telafiYok ? 0 : 1)
    : tarihYok ? 2
      : eolGecti ? 3
        : yazilimGecti ? 4 + (KRITIKLIK_SIRA[v.kritiklik] ?? 4) / 10
          : 5;

  return {
    v, durum, kendiTarihiGecti,
    yazilimKaynakli: yazilimGecti && !kendiTarihiGecti,
    yaklasan, tarihYok,
    eolEksik: !v.eolTarihi,
    karar, gecmis, puan, telafiYok, proje,
    kaynak: sec.kaynak,
    olgu: olguMetni(v, simdi, sec.kaynak, karar),
  };
}

/** Ufuktaki en yakın tarih hangi alandan geldiyse olgu da onu söyler. */
function enYakin(v: VarlikKaydi, t: number): { t: number; kaynak: Kaynak } {
  const esit = (iso: string | null) => iso !== null && new Date(iso).getTime() === t;
  return { t, kaynak: esit(v.eosTarihi) ? 'eos' : esit(v.destekBitis) ? 'destek' : 'eol' };
}

/** Satır alt satırı: durumu değil, kararı süren OLGUYU yazar (06 §A2). */
function olguMetni(v: VarlikKaydi, simdi: number, kaynak: Kaynak, karar: number | null): string {
  if (kaynak === 'yok' || karar === null) return 'tarih eksik';
  const sure = sureMetni(karar - simdi);
  const kuyruk = karar < simdi ? ` · +${sure}` : ` · ${sure}`;
  const iso = new Date(karar).toISOString();

  if (kaynak === 'yazilim') {
    const y = v.bitenYazilimlar[0];
    return `${[y.ad, y.surum].filter(Boolean).join(' ')} · EOS ${ayYil(iso)}${kuyruk}`;
  }
  const bas = kaynak === 'destek' ? 'destek' : kaynak === 'eol' ? 'EOL' : 'EOS';
  return `${bas} ${ayYil(iso)}${kuyruk}`;
}

/** Aciliyet + tarih + etiket: aynı veri her zaman aynı sırayı üretir. */
export function aciliyetSirasi(a: Omur, b: Omur): number {
  if (a.puan !== b.puan) return a.puan - b.puan;
  const at = a.karar ?? Number.POSITIVE_INFINITY;
  const bt = b.karar ?? Number.POSITIVE_INFINITY;
  if (at !== bt) return at - bt;
  return a.v.etiket.localeCompare(b.v.etiket, 'tr');
}

/* ── gruplama ─────────────────────────────────────────────────────────── */

export type GrupAnahtari = 'aciliyet' | 'santral' | 'tedarikci' | 'tur';

export const GRUPLAR: { id: GrupAnahtari; ad: string }[] = [
  { id: 'aciliyet', ad: 'Aciliyet' },
  { id: 'santral', ad: 'Santral' },
  { id: 'tedarikci', ad: 'Tedarikçi' },
  { id: 'tur', ad: 'Tür' },
];

export type Grup = {
  id: string;
  ad: string;
  uyeler: Omur[];
  /** grubun ufuktaki sıradaki kararı; hepsi geçmişse en eskisi */
  karar: number | null;
  /** grubun geçmişte kalan üyesi var */
  gecmis: boolean;
  desteksiz: number;
};

export function grupla(satirlar: Omur[], anahtar: GrupAnahtari, simdi: number): Grup[] {
  if (anahtar === 'aciliyet') return [];
  const ad = (o: Omur) => (anahtar === 'santral' ? o.v.tesisAd
    : anahtar === 'tedarikci' ? o.v.tedarikciAd : o.v.turAd) ?? '—';
  const kova = new Map<string, Omur[]>();
  for (const o of satirlar) {
    const k = ad(o);
    const liste = kova.get(k);
    if (liste) liste.push(o); else kova.set(k, [o]);
  }
  const gruplar: Grup[] = [...kova].map(([k, uyeler]) => {
    const sirali = [...uyeler].sort(aciliyetSirasi);
    const kararlar = sirali.map((o) => o.karar).filter((t): t is number => t !== null);
    /* Grup kartı ufukta SIRADAKİ kararında durur; hepsi geçmişse en eskisinde.
       Geçmişte kalan üyeler kartın 3px kenarını kritik yapar (gecmis). */
    const gelecek = kararlar.filter((t) => t >= simdi);
    const gecmisler = kararlar.filter((t) => t < simdi);
    return {
      id: k,
      ad: k,
      uyeler: sirali,
      karar: gelecek.length > 0 ? Math.min(...gelecek)
        : gecmisler.length > 0 ? Math.min(...gecmisler) : null,
      gecmis: gecmisler.length > 0,
      desteksiz: sirali.filter((o) => o.durum === 'bd').length,
    };
  });
  // Grup sırası: en kötü üyesi en acil olan grup önce.
  gruplar.sort((a, b) => aciliyetSirasi(a.uyeler[0], b.uyeler[0]));
  return gruplar;
}

/* ── zaman çizelgesi ufku ─────────────────────────────────────────────── */

const AY = 30.44 * GUN;

/** Şeridin kapsadığı süre: verinin kendi ufku (en az 12, en çok 36 ay).
    Kartlar ve eksen tırnakları AYNI ölçeği kullanır — kart bir tarihte
    duruyorsa eksen de orada o tarihi gösterir. */
export function ufukUzunlugu(kararlar: (number | null)[], simdi: number): number {
  const gelecek = kararlar.filter((t): t is number => t !== null && t > simdi);
  const enUzak = gelecek.length > 0 ? Math.max(...gelecek) : simdi;
  const ay = (enUzak - simdi) / AY;
  return Math.min(UFUK_AY, Math.max(12, Math.ceil(ay) + 1)) * AY;
}

/** 0–1 arası ufuk konumu; geçmiş 0'a oturur, ufkun ötesi 1'e. */
export function ufukKonumu(karar: number | null, simdi: number, uzunluk: number): number {
  if (karar === null) return 0;
  return Math.max(0, Math.min(1, (karar - simdi) / uzunluk));
}

/** Kart başlığı: santral öneki kapsam satırında zaten var (`MERKEZ-SRV-14` → `SRV-14`). */
export function kisaEtiket(etiket: string): string {
  const parcalar = etiket.split('-');
  return parcalar.length > 2 ? parcalar.slice(-2).join('-') : etiket;
}

/* Kart seçimi ufka yayılır: bir geçmiş kart + ufkun üç diliminden birer kart.
   Dilim boşsa yer kalan adaylarla (önce gelecek, sonra geçmiş) doldurulur;
   böylece kartlar birbirini itmeden gerçek tarihlerinde durur. */
export function ufkaYay<T extends { karar: number | null }>(
  adaylar: T[], simdi: number, uzunluk: number, adet = 4,
): T[] {
  const gecmisMi2 = (a: T) => a.karar === null || a.karar < simdi;
  const gecmisler = adaylar.filter(gecmisMi2);
  const gelecekler = adaylar.filter((a) => !gecmisMi2(a));
  const secilen: T[] = [];
  const ekle = (a: T | undefined) => {
    if (a && !secilen.includes(a) && secilen.length < adet) secilen.push(a);
  };

  ekle(gecmisler[0]);
  for (let dilim = 0; dilim < 3; dilim += 1) {
    const alt = (dilim / 3) * uzunluk;
    const ust = ((dilim + 1) / 3) * uzunluk;
    ekle(gelecekler.find((a) => {
      const fark = (a.karar as number) - simdi;
      return fark >= alt && (dilim === 2 ? fark <= ust : fark < ust);
    }));
  }
  ekle(gecmisler[1]);
  for (const a of gelecekler) ekle(a);
  for (const a of gecmisler) ekle(a);

  return secilen.sort((a, b) =>
    (a.karar ?? Number.POSITIVE_INFINITY) - (b.karar ?? Number.POSITIVE_INFINITY));
}

/** Aynı şeritteki (i, i+2) kartlar 196px'lik gövdeleriyle çakışmasın. */
export function konumlariAyir(konumlar: number[], enAzAralik = 0.3): number[] {
  const sonuc = [...konumlar];
  for (let i = 2; i < sonuc.length; i += 1) {
    const onceki = sonuc[i - 2];
    if (sonuc[i] < onceki + enAzAralik) sonuc[i] = Math.min(1, onceki + enAzAralik);
  }
  return sonuc;
}

/** Eksen tırnakları: BUGÜN + ufka sığan takvim sınırları (yıl ya da çeyrek).
    Tasarımdaki gibi en fazla dört tırnak; birbirine yapışanlar elenir. */
export function donemler(simdi: number, uzunluk: number): { ad: string; konum: number }[] {
  const bas = new Date(simdi);
  const son = simdi + uzunluk;
  // Kısa ufukta yıl sınırı tek tırnak bırakır; çeyrek sınırları ölçeği okutur.
  const yillik = uzunluk > 18 * AY;
  const adim = yillik ? 12 : 3;
  const ilk = new Date(bas.getFullYear(), yillik ? 0 : Math.ceil((bas.getMonth() + 1) / 3) * 3, 1);
  if (yillik) ilk.setFullYear(bas.getFullYear() + 1);

  const adaylar: { ad: string; konum: number }[] = [];
  for (const t = ilk; t.getTime() <= son; t.setMonth(t.getMonth() + adim)) {
    if (t.getTime() <= simdi) continue;
    adaylar.push({
      ad: yillik ? String(t.getFullYear()) : buyuk(ayYil(t.toISOString())),
      konum: ufukKonumu(t.getTime(), simdi, uzunluk),
    });
  }
  // Önce BUGÜN'e ya da birbirine yapışanları ele, sonra üç tırnağa indir.
  const ayrik: { ad: string; konum: number }[] = [];
  for (const a of adaylar) {
    const oncekiKonum = ayrik.length > 0 ? ayrik[ayrik.length - 1].konum : 0;
    if (a.konum - oncekiKonum >= 0.12) ayrik.push(a);
  }
  const n = ayrik.length;
  const secilen = n <= 3 ? ayrik
    : [ayrik[0], ayrik[Math.round((n - 1) / 2)], ayrik[n - 1]];
  return [{ ad: 'BUGÜN', konum: 0 }, ...secilen];
}

/** Kart geri sayımı: geçmiş `geçti`, ufkun ötesi `2029+`, gerisi `Kas 26`. */
export function geriMetni(karar: number | null, simdi: number, uzunluk: number): string {
  if (karar === null) return 'tarih yok';
  if (karar < simdi) return 'geçti';
  if (karar > simdi + uzunluk) return `${new Date(simdi + uzunluk).getFullYear()}+`;
  return ayYil(new Date(karar).toISOString());
}
