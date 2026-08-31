import type { Durum } from '@/components/atlas/temel';
import { DURUM_ETIKET, SUREC_DURUM_ETIKET, uyumYuzdesi, type SurecDurum } from '@/lib/sabitler';

/* Uyum süreci kütüğü — sunucu ve istemcinin PAYLAŞTIĞI tipler ve saf hesaplar.

   Süreç, /uyum'un çerçeve matrisi DEĞİLDİR: orada "Regülasyon × Madde"
   kalıcı çerçevesi durur, burada bir KAMPANYA yaşar — tarih penceresi,
   tesis kapsamı ve o kapsamda açılmış madde değerlendirmeleri. Bu yüzden
   ekranın sorusu "nerede uyumsuzuz?" değil, "hangi kampanya denetim
   tarihine yetişmiyor?"dur.

   Zaman hesabı `simdi`yi PARAMETRE alır: sunucu isteğin başında bir kez
   okur ve istemciye verir. Aksi hâlde metrik, zaman çizelgesi ve tablo
   aynı ekranda üç farklı "bugün" ile çizilir (denetimler/ortak.ts ile
   aynı sözleşme). */

export const GUN = 86_400_000;

export type Kodlu = { id: string; kod: string; ad: string };
export type Kisi = { id: string; ad: string };

/* ── Durum sayımı ───────────────────────────────────────────────────────
   Bilinmeyen SIFIR DEĞİLDİR: değerlendirilmemiş madde "uyumsuz" sayılmaz,
   kendi payını taşır. Kapsam dışı ise her iki paydanın da dışındadır. */

export type Sayim = {
  uyumlu: number;
  kismi: number;
  uyumsuz: number;
  /** incelemede + degerlendirilmedi — ölçülmemiş, sıfır değil */
  bilinmeyen: number;
  kapsamDisi: number;
  degerlendirilen: number;
  /** degerlendirilen + bilinmeyen (kapsam dışı hariç) */
  toplam: number;
  /** yalnız DEĞERLENDİRİLENLER üzerinden; hiç değerlendirme yoksa null */
  yuzde: number | null;
};

export const BOS_SAYIM: Sayim = {
  uyumlu: 0, kismi: 0, uyumsuz: 0, bilinmeyen: 0, kapsamDisi: 0,
  degerlendirilen: 0, toplam: 0, yuzde: null,
};

/** Ham `MaddeDurumu.durum` sayaçlarını tek biçime indirger. Yüzde kuralı
    lib/sabitler.uyumYuzdesi'nden gelir — iki yerde iki farklı uyum tanımı
    olmasın. */
export function sayimla(ham: Partial<Record<string, number>>): Sayim {
  const uyumlu = ham.uyumlu ?? 0;
  const kismi = ham.kismi ?? 0;
  const uyumsuz = ham.uyumsuz ?? 0;
  const bilinmeyen = (ham.incelemede ?? 0) + (ham.degerlendirilmedi ?? 0);
  const kapsamDisi = ham.kapsamdisi ?? 0;
  const degerlendirilen = uyumlu + kismi + uyumsuz;
  return {
    uyumlu, kismi, uyumsuz, bilinmeyen, kapsamDisi,
    degerlendirilen,
    toplam: degerlendirilen + bilinmeyen,
    yuzde: uyumYuzdesi(ham),
  };
}

export function sayimTopla(liste: Sayim[]): Sayim {
  return sayimla({
    uyumlu: liste.reduce((a, s) => a + s.uyumlu, 0),
    kismi: liste.reduce((a, s) => a + s.kismi, 0),
    uyumsuz: liste.reduce((a, s) => a + s.uyumsuz, 0),
    degerlendirilmedi: liste.reduce((a, s) => a + s.bilinmeyen, 0),
    kapsamdisi: liste.reduce((a, s) => a + s.kapsamDisi, 0),
  });
}

/* ── Süreç kaydı ────────────────────────────────────────────────────── */

export type S = {
  id: string;
  kod: string;
  ad: string;
  durum: string;
  baslangic: string | null;
  /** denetim tarihi — kampanyanın taahhüt ettiği an */
  bitis: string | null;
  aciklama: string | null;
  regulasyon: Kodlu;
  tesisler: Kodlu[];
  sayim: Sayim;
  acikBulgu: number;
  denetimler: { id: string; kod: string; durum: string }[];
};

export function surecEtiketi(durum: string): string {
  return SUREC_DURUM_ETIKET[durum as SurecDurum] ?? durum;
}

export function kapandiMi(s: Pick<S, 'durum'>): boolean {
  return s.durum === 'tamamlandi';
}

/* ── Zaman ──────────────────────────────────────────────────────────── */

function an(t: string | null): number | null {
  if (!t) return null;
  const z = new Date(t).getTime();
  return Number.isNaN(z) ? null : z;
}

/** Çizelgede süreci yerleştiren tarih: denetim tarihi, yoksa başlangıç. */
export function capa(s: Pick<S, 'baslangic' | 'bitis'>): number | null {
  return an(s.bitis) ?? an(s.baslangic);
}

/** Gün farkı — negatif geçmiş, pozitif gelecek. */
export function gunFarki(t: number, simdi: number): number {
  return Math.round((t - simdi) / GUN);
}

/** Denetim tarihi geçti mi? Tamamlanan ve askıya alınan süreç GECİKMEZ:
    biri taahhüdü kapattı, diğeri takvimi durdurdu. */
export function gecikti(s: Pick<S, 'durum' | 'bitis'>, simdi: number): boolean {
  if (s.durum === 'tamamlandi' || s.durum === 'pasif') return false;
  const b = an(s.bitis);
  return b !== null && b < simdi;
}

export function kalanGun(s: Pick<S, 'bitis'>, simdi: number): number | null {
  const b = an(s.bitis);
  return b === null ? null : gunFarki(b, simdi);
}

const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export const buyuk = (s: string) => s.toLocaleUpperCase('tr-TR');

export function ayYil(t: number): string {
  const d = new Date(t);
  return `${AYLAR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

export function gunAy(t: number): string {
  const d = new Date(t);
  return `${d.getDate()} ${AYLAR[d.getMonth()]}`;
}

/* ── Durum işaretçisi ───────────────────────────────────────────────────
   İşaretçi "bu kampanya taahhüdünü tutuyor mu?" sorusunu yanıtlar. Süreç
   durumu (Planlandı/Aktif/Pasif/Tamamlandı) ayrı bir olgudur ve yalnız
   çekmecenin kimlik bloğunda KELİMEYLE yazılır. */

export function surecImi(s: S, simdi: number): Durum {
  if (kapandiMi(s)) return 'tamam';
  // Askıya alınmış kampanya ilerlemiyor ama gecikmiş de sayılmaz.
  if (s.durum === 'pasif') return 'pl';
  // Kapsamı ya da değerlendirmesi olmayan süreç ÖLÇÜLEMEZ — "uyumlu" değil.
  if (s.tesisler.length === 0 || s.sayim.toplam === 0) return 'unk';
  if (gecikti(s, simdi) || s.sayim.uyumsuz > 0 || s.acikBulgu > 0) return 'bd';
  if (s.durum === 'planlandi') return 'pl';
  if (s.sayim.kismi > 0 || s.sayim.bilinmeyen > 0) return 'md';
  return 'ok';
}

/** Çekmece kimlik cümlesi — durumun neden o renkte olduğunu bir cümlede söyler. */
export function kimlikCumlesi(s: S, simdi: number): string {
  if (kapandiMi(s)) {
    return s.sayim.toplam === 0
      ? 'Kampanya kapandı; kapsamında hiç değerlendirme açılmamıştı.'
      : `Kampanya kapandı; ${s.sayim.degerlendirilen}/${s.sayim.toplam} madde değerlendirilmişti.`;
  }
  if (s.durum === 'pasif') {
    return 'Kampanya askıya alındı — takvim işlemiyor, değerlendirmeler olduğu yerde duruyor.';
  }
  if (s.tesisler.length === 0) {
    return 'Kapsama tesis eklenmedi — madde değerlendirmesi açılmadı, uyum ölçülemiyor.';
  }
  if (s.sayim.toplam === 0) {
    return 'Kapsamda tesis var ama değerlendirme kaydı yok — regülasyonun yaprak maddesi yok.';
  }
  if (gecikti(s, simdi)) {
    const b = an(s.bitis) as number;
    return `Denetim tarihi ${-gunFarki(b, simdi)} gün aşıldı; kampanya hâlâ ${surecEtiketi(s.durum).toLocaleLowerCase('tr-TR')}.`;
  }
  if (s.sayim.uyumsuz > 0 && s.acikBulgu > 0) {
    return `${s.sayim.uyumsuz} madde uyumsuz ve ${s.acikBulgu} bulgu açık; ikisi de denetim öncesi kapanmalı.`;
  }
  if (s.sayim.uyumsuz > 0) return `${s.sayim.uyumsuz} madde uyumsuz; denetim öncesi kapanması gerekiyor.`;
  if (s.acikBulgu > 0) return `${s.acikBulgu} bulgu açık; kampanya kapanışının önkoşulu.`;
  if (s.sayim.bilinmeyen > 0) {
    return `${s.sayim.bilinmeyen} madde hiç değerlendirilmedi — bu boşluk uyum sayılmaz.`;
  }
  if (s.durum === 'planlandi') return 'Kampanya planlandı; değerlendirme henüz başlamadı.';
  return 'Uyumsuz madde ve açık bulgu yok; kampanya denetime hazır.';
}

/* ── Satır metinleri ────────────────────────────────────────────────────
   Alt satır kayıt kimliği + EN FAZLA bir olgu taşır; durum sözcüğü
   canvasta tekrar edilmez (06 §A2). */

export function altSatir(s: S): string {
  if (s.tesisler.length === 0) return `${s.kod} · kapsam boş`;
  if (s.acikBulgu > 0) return `${s.kod} · ${s.acikBulgu} açık bulgu`;
  return `${s.kod} · ${s.regulasyon.kod}`;
}

/** Satırın santral hücresi: tek tesis · birden çoksa sayı · yoksa kapsam boş. */
export function santralMetni(s: Pick<S, 'tesisler'>): string {
  if (s.tesisler.length === 1) return s.tesisler[0].ad;
  if (s.tesisler.length > 1) return `${s.tesisler.length} santral`;
  return 'kapsam boş';
}

/** Denetim hücresi: aşılmış tarih gün olarak, yaklaşan gün, uzağı ay olarak. */
export function denetimMetni(s: S, simdi: number): { metin: string; durum?: Durum } {
  const b = an(s.bitis);
  if (b === null) return { metin: 'tarih yok', durum: 'unk' };
  if (gecikti(s, simdi)) return { metin: `+${-gunFarki(b, simdi)} gün`, durum: 'bd' };
  const kalan = gunFarki(b, simdi);
  // Geçmişte kalan tarih kapanmış ya da askıdaki kampanyaya aittir: geri
  // sayım anlamsızdır, takvim tarihi yazılır.
  if (kalan < 0) return { metin: gunAy(b) };
  if (kalan <= 60) return { metin: `${kalan} gün`, durum: kalan <= 14 ? 'md' : undefined };
  return { metin: gunAy(b) };
}

/* ── Zaman çizelgesi ────────────────────────────────────────────────────
   Ufuk veriden gelir: en erken çapa ile en geç denetim tarihi arasını,
   bugünü de kapsayacak biçimde gerer. Sabit pencere seçilirse seed
   değişince kartlar eksenin dışına düşer. */

export type Ufuk = { bas: number; son: number };

export function ufuk(kayitlar: S[], simdi: number): Ufuk {
  const anlar = kayitlar.flatMap((s) => [capa(s), an(s.baslangic)])
    .filter((t): t is number => t !== null);
  const bas = Math.min(simdi, ...(anlar.length ? anlar : [simdi]));
  const son = Math.max(simdi, ...(anlar.length ? anlar : [simdi]));
  // Tek noktaya çöken ufuk sıfıra bölünür; en az bir çeyrek gerilir.
  return son - bas < 90 * GUN ? { bas, son: bas + 90 * GUN } : { bas, son };
}

export function konum(t: number | null, u: Ufuk): number {
  if (t === null) return 0;
  return Math.max(0, Math.min(1, (t - u.bas) / (u.son - u.bas)));
}

/** Kart geri sayımı: geçmiş `geçti`, yakın gelecek gün, uzağı ay olarak. */
export function geriMetni(t: number | null, simdi: number): string {
  if (t === null) return 'tarih yok';
  const fark = gunFarki(t, simdi);
  if (fark < 0) return 'geçti';
  if (fark <= 60) return `${fark} g`;
  return ayYil(t);
}

/** Eksen tırnakları: BUGÜN + ufka düşen ay başları. Birbirine yapışanlar
    elenir; tasarımda tırnak sayısı dörttür (02-components §14). */
export function donemler(u: Ufuk, simdi: number): { ad: string; konum: number }[] {
  const bugun = konum(simdi, u);
  const adaylar: { ad: string; konum: number }[] = [];
  const t = new Date(u.bas);
  t.setDate(1);
  t.setHours(0, 0, 0, 0);
  t.setMonth(t.getMonth() + 1);
  for (; t.getTime() <= u.son; t.setMonth(t.getMonth() + 1)) {
    adaylar.push({ ad: buyuk(ayYil(t.getTime())), konum: konum(t.getTime(), u) });
  }
  const ayrik: { ad: string; konum: number }[] = [{ ad: 'BUGÜN', konum: bugun }];
  for (const a of adaylar) {
    if (a.konum - ayrik[ayrik.length - 1].konum >= 0.14) ayrik.push(a);
  }
  return ayrik.slice(0, 4);
}

/* ── Görünür satır bütçesi ──────────────────────────────────────────────
   06 §A3: 5–9 satır görünür, kalanı tek satıra toplanır. Kritik satırlar
   sıralamadan bağımsız ÖNE alınır — ama bütçe onları da bağlar: 46 kritik
   satırın hepsini basmak listeyi bir tarama alanına çevirir ve yoğunluk
   sözleşmesini kırar. Sessizce gömülen hiçbir şey yoktur: kuyruk kaç
   kritik kayıt taşıdığını sayıyla söyler ve tek tıkla açılır. */

export type Butce<T> = {
  gorunur: T[];
  toplanan: T[];
  /** kuyruğa inen KRİTİK satır sayısı — kuyruk etiketi bunu yazar */
  toplananSabit: number;
};

export function butcele<T>(
  sabit: T[], kalan: T[], butce: number, acik: boolean,
): Butce<T> {
  if (acik) return { gorunur: [...sabit, ...kalan], toplanan: [], toplananSabit: 0 };
  const gorunurSabit = sabit.slice(0, butce);
  const slot = Math.max(0, butce - gorunurSabit.length);
  return {
    gorunur: [...gorunurSabit, ...kalan.slice(0, slot)],
    // Kuyruk açıldığında da kritikler önce gelsin.
    toplanan: [...sabit.slice(butce), ...kalan.slice(slot)],
    toplananSabit: Math.max(0, sabit.length - butce),
  };
}

/* ── Değerlendirme (süreç kaydının atomu) ───────────────────────────────
   Bir `MaddeDurumu` = (kampanya × madde × tesis). Süreç detayı bu kayıtları
   yönetir; /uyum matrisi ise aynı veriden tesis × aile ÖZETİ üretir. İki
   ekran aynı satırı iki farklı soruyla okur, biri diğerini tekrar etmez. */

export type MaddeOzeti = {
  id: string;
  kod: string;
  /** çerçeve önekinden arındırılmış kod — `EPDK-SYM-4.2.1` → `4.2.1` */
  kisaKod: string;
  baslik: string;
  metin: string;
  bolum: string;
  kanitTipi: string | null;
  alanlar: string[];
  esler: { kod: string; denklik: string }[];
};

export type KanitOzeti = { id: string; ad: string; tip: string; baslangic: string };

export type BulguOzeti = { id: string; baslik: string; durum: string; onem: string };

export type Degerlendirme = {
  id: string;
  madde: MaddeOzeti;
  tesis: Kodlu;
  /** ham `MaddeDurumu.durum` — canvasta YAZILMAZ, yalnız işaretçiye çevrilir */
  durum: string;
  guven: string;
  kanitBayat: boolean;
  not: string | null;
  sorumlu: Kisi | null;
  sonDegerlendirme: string | null;
  bulgular: BulguOzeti[];
  kanitlar: KanitOzeti[];
  acikBulgu: number;
};

/** `EPDK-SYM-4.2.1` → `4.2.1` (çerçeve kodu öndeyse düşer). */
export function kisaKod(kod: string, cerceveKodu: string): string {
  return kod.startsWith(`${cerceveKodu}-`) ? kod.slice(cerceveKodu.length + 1) : kod;
}

/** Kanıt güveni yeterli mi — "uyumlu" damgasını taşıyabilir mi? */
export function guvenZayif(d: Pick<Degerlendirme, 'guven'>): boolean {
  return d.guven === 'kanit_yok' || d.guven === 'bayat_kanit';
}

/** Satır işaretçisi: "bu değerlendirmede iş var mı?"
    Kanıtsız `uyumlu` tam yeşil OLMAZ — kör güven gösterilmez (kabul testi 2). */
export function degerlendirmeImi(d: Degerlendirme): Durum {
  // Kapsam dışı bir KARARDIR: bilinmeyen değildir, iş de değildir.
  if (d.durum === 'kapsamdisi') return 'pl';
  if (d.durum === 'uyumsuz' || d.acikBulgu > 0) return 'bd';
  if (d.durum === 'kismi') return 'md';
  if (d.durum === 'incelemede' || d.durum === 'degerlendirilmedi') return 'unk';
  return guvenZayif(d) ? 'md' : 'ok';
}

/** Değerlendirme satırının açık iş taşıyıp taşımadığı — mercek ve kuyruk
    ölçütü. Kapsam dışı ve kanıtlı uyumlu satırlar toplanabilir. */
export function takipte(d: Degerlendirme): boolean {
  const im = degerlendirmeImi(d);
  return im === 'bd' || im === 'md' || im === 'unk';
}

export function kanitYok(d: Degerlendirme): boolean {
  return d.durum !== 'kapsamdisi' && (d.kanitlar.length === 0 || d.kanitBayat);
}

/** Değerlendirme satırının alt satırı: madde kodu + tesis kodu. */
export function degerlendirmeAlti(d: Degerlendirme): string {
  return `${d.madde.kisaKod} · ${d.tesis.kod}`;
}

/** Ağırlık: uyumsuz > kısmi > bilinmeyen > kanıtsız uyumlu > uyumlu > kapsam dışı. */
const IM_AGIRLIK: Record<Durum, number> = {
  bd: 5, md: 4, unk: 3, ok: 1, tamam: 1, pl: 0,
};

export function degerlendirmeSirasi(a: Degerlendirme, b: Degerlendirme): number {
  const fark = IM_AGIRLIK[degerlendirmeImi(b)] - IM_AGIRLIK[degerlendirmeImi(a)];
  if (fark !== 0) return fark;
  const kod = a.madde.kod.localeCompare(b.madde.kod, 'tr');
  return kod !== 0 ? kod : a.tesis.kod.localeCompare(b.tesis.kod, 'tr');
}

/** Çekmece kimlik SÖZCÜĞÜ — işaretçiyle aynı şeyi söylemek zorundadır.
    Ham `uyumlu` durumunu kırmızı işaretçinin yanına yazmak ("● UYUMLU")
    ekranı kendi kendisiyle çelişkiye düşürür: işaretçiyi açık bulgu ya da
    kanıt boşluğu düşürdüyse sözcük de onu söyler. */
export function degerlendirmeSozu(d: Degerlendirme): string {
  if (d.durum === 'kapsamdisi') return DURUM_ETIKET.kapsamdisi;
  if (d.acikBulgu > 0 && d.durum !== 'uyumsuz') return 'Bulgu açık';
  if (d.durum === 'uyumlu' && guvenZayif(d)) {
    return d.kanitBayat ? 'Kanıtı bayat' : 'Kanıtsız uyumlu';
  }
  return DURUM_ETIKET[d.durum as keyof typeof DURUM_ETIKET] ?? d.durum;
}

/** Çekmece kimlik cümlesi — işaretçinin neden o renkte olduğunu söyler.
    Ham durum sözcüğü burada TEKRAR EDİLMEZ; kelime kimlik bloğunun kendi
    `soz` alanında bir kez geçer. */
export function degerlendirmeCumlesi(d: Degerlendirme): string {
  const not = d.not?.trim() ? ` Not: ${d.not.trim()}` : '';
  if (d.durum === 'kapsamdisi') {
    return `Bu madde ${d.tesis.ad} için kapsam dışı sayıldı; uyum paydasına girmiyor.${not}`;
  }
  if (d.acikBulgu > 0) {
    return `${d.acikBulgu} bulgu açık; madde kapanmadan bu santralde uyum sayılmaz.${not}`;
  }
  if (d.durum === 'uyumsuz') {
    return `Madde ${d.tesis.ad} tesisinde karşılanmıyor; kapanış için bulgu açılmalı.${not}`;
  }
  if (d.durum === 'kismi') {
    return `Madde kısmen karşılanıyor; kalan boşluk uyum sayılmıyor.${not}`;
  }
  if (d.durum === 'incelemede') {
    return `Değerlendirme sürüyor; karar verilmeden uyum ya da uyumsuzluk yazılmaz.${not}`;
  }
  if (d.durum === 'degerlendirilmedi') {
    return `Bu madde ${d.tesis.ad} tesisinde hiç değerlendirilmedi — boşluk sıfır sayılmaz.${not}`;
  }
  if (d.kanitlar.length === 0) {
    return `Kanıt bağlanmadı; kanıtsız bir karar kör güvenle yeşil gösterilmez.${not}`;
  }
  if (d.kanitBayat) {
    return `Bağlı kanıtların geçerliliği doldu; karar tazelenmeden güvenilir sayılmaz.${not}`;
  }
  return `Madde karşılanıyor ve ${d.kanitlar.length} geçerli kanıtla destekleniyor.${not}`;
}

/** Kanıt tazeliği hücresi — kanıt yoksa sayı uydurulmaz. */
export function kanitMetni(d: Degerlendirme): { metin: string; durum?: Durum } {
  if (d.durum === 'kapsamdisi') return { metin: '—' };
  if (d.kanitlar.length === 0) return { metin: 'kanıt yok', durum: 'md' };
  if (d.kanitBayat) return { metin: `${d.kanitlar.length} bayat`, durum: 'bd' };
  return { metin: `${d.kanitlar.length} kanıt` };
}
