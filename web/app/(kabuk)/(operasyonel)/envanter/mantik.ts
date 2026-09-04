import type { Durum } from '@/components/kabuk/temel';
import { etiketle, tarihTR } from '@/lib/sabitler';

/* O10/O11 · Varlık zekâsı — sunucu ve istemcinin PAYLAŞTIĞI tipler ve saf
   hesaplar. Burada veritabanı, React ve server-only bağımlılığı YOKTUR.

   Bilinmeyen birinci sınıftır (§5.1). Şiddet sırası bd → md → unk → ok:
   bilinen kötü bilinmeyeni bastırır, ama bilinmeyen ASLA sağlıklıya
   düşmez. EOS tarihi girilmemiş varlık "ömrü bitmedi" değildir; kritikliği
   girilmemiş varlık "kritik değil" değildir. */

export const GUN = 86_400_000;

/** 06 §A3: tabloda 5–9 satır görünür. Sabitlenen satırlar bunun dışındadır. */
export const GORUNUR_TAVAN = 9;

/* Grafik kipinde aynı anda çizilen düğüm bütçesi (02-components §15).
   Tuval 388px yüksekliktedir ve düğümler mutlak konumlanır: dört varlıktan
   fazlası çekmece açıkken üst üste biner. Tavan estetik değil, ölçüdür. */
export const GRAFIK_VARLIK_TAVANI = 4;
export const GRAFIK_BOLGE_TAVANI = 4;
export const GRAFIK_SISTEM_TAVANI = 3;

/* ── Tipler ─────────────────────────────────────────────────────────── */

export type Kisi = { id: string; ad: string };
export type Kodlu = { id: string; kod: string; ad: string };
export type Tur = Kodlu & { sinif: string };
export type Unite = Kodlu & { tesisId: string };
export type Bolge = Kodlu & { tip: string; seviye: number | null; tesisId: string | null };
export type Sistem = Kodlu & { tesisId: string | null };
/** OT-11 · adresleme segmenti — bölgeden AYRIDIR (bir bölge N segment). */
export type Segment = Kodlu & { cidr: string; vlanId: number | null };

export type Iliski = {
  id: string;
  tip: string;
  /** ilişkinin öteki ucu — yön `giden` alanında taşınır */
  diger: { id: string; etiket: string; ad: string };
  giden: boolean;
};

/* ── Güvenlik duruşu (OT-03 · OT-11 · OT-21 · OT-22 · OT-25 · OT-26 ·
   OT-27) ─────────────────────────────────────────────────────────────

   Duruş, `Varlik` satırının DIŞINDA yaşayan yedi ayrı kaydın çekmecede
   birleşmiş hâlidir. Hepsi aynı doktrini taşır: ölçülmemiş olan sıfır
   değildir, uygulanamaz olan kusur değildir ve motorun kararı insanın
   kararını ezmez. */

export type DurusFirmware = {
  durum: string;
  kuruluSurum: string | null;
  /** null = motor gerekçe yazmadı (eski kayıt); ekran boş bırakır. */
  gerekce: string | null;
  /** Onaylı istisna — `durum`u DEĞİŞTİRMEZ, yanına yazılır. */
  istisnaGerekcesi: string | null;
  sonDogrulama: string | null;
};

export type DurusYama = {
  durum: string;
  mevcutSeviye: string | null;
  temelSeviye: string | null;
  eksikYama: string | null;
  siddet: string;
  yenidenBaslatmaGerekli: boolean | null;
  yamalanamaz: boolean;
  istisnaGerekcesi: string | null;
  kaynakSistem: string;
  sonDogrulama: string | null;
};

export type DurusKapsam = {
  tip: string; durum: string; sonDogrulama: string | null; gerekce: string | null;
};

export type DurusKorelasyon = {
  id: string;
  ref: string | null; baslik: string; cvss: number | null;
  /** Motorun hesabı. */
  sonuc: string;
  /** 0–1 arası güven; null = ölçülmedi (sıfır DEĞİL). */
  guven: number | null;
  gerekce: string;
  /** İnsanın kararı — doluysa ekranda motorun hesabını BASTIRIR. */
  elleSonuc: string | null; elleGerekce: string | null;
};

export type Durus = {
  firmware: DurusFirmware | null;
  /** Bir varlığın birden çok kaynak sistemden yama kaydı olabilir. */
  yamalar: DurusYama[];
  kapsamlar: DurusKapsam[];
  korelasyonlar: DurusKorelasyon[];
  /** OT-03 · alan adı → uygulanamazlık gerekçesi. */
  uygulanamaz: Record<string, string>;
  sbom: { bicim: string; bilesenSayisi: number; yuklendi: string } | null;
  segment: { id: string; kod: string; ad: string; cidr: string; vlanId: number | null } | null;
};

/* ── Yönetişim (OT-05 · OT-08 · OT-09 · OT-20 · OT-28) ────────────────
   Duruş "bu cihaz güvenli mi" sorusunu, yönetişim "bu cihazın sahibi kim,
   durursa ne kaybederiz, konfigürasyonu onaylı mı" sorusunu cevaplar.
   İkisi ayrı sekmelerdir çünkü ayrı kişiler bakar. */

export type YonetisimAdim = {
  bagId: string;
  adimId: string; adimAd: string; sira: number;
  surecKod: string; surecAd: string;
  rol: string;
  /** null = DEĞERLENDİRİLMEDİ ("tek nokta değil" DEĞİL) */
  tekNokta: boolean | null;
  yedekli: boolean | null;
  adimEtkisi: string;
  rtoSaat: number | null;
  rpoSaat: number | null;
};

export type YonetisimEtki = {
  /** null = HESAPLANMADI (sıfır bir ölçümdür, ondan farklıdır) */
  uretimKaybiMw: number | null;
  kayipTipi: string;
  rtoSaat: number | null;
  rpoSaat: number | null;
  emniyetEtkisi: string;
  cevreEtkisi: string;
  gerekce: string | null;
  degerlendiren: string | null;
  zaman: string;
};

export type YonetisimKonfig = {
  temelHash: string | null;
  temelOnayZamani: string | null;
  temelOnaylayan: string | null;
  /** en yeni başarılı yedeğin özeti; null = özet yok/yedek yok */
  sonYedekId: string | null;
  sonYedekHash: string | null;
  sonYedekZamani: string | null;
  acikSapma: number;
};

export type Yonetisim = {
  adimlar: YonetisimAdim[];
  etki: YonetisimEtki | null;
  ekip: { id: string; kod: string; ad: string; aktif: boolean; aktifUye: number } | null;
  konfig: YonetisimKonfig;
};

export const BOS_YONETISIM: Yonetisim = {
  adimlar: [], etki: null, ekip: null,
  konfig: {
    temelHash: null, temelOnayZamani: null, temelOnaylayan: null,
    sonYedekId: null, sonYedekHash: null, sonYedekZamani: null, acikSapma: 0,
  },
};

export const BOS_DURUS: Durus = {
  firmware: null, yamalar: [], kapsamlar: [], korelasyonlar: [],
  uygulanamaz: {}, sbom: null, segment: null,
};

export type V = {
  id: string; etiket: string; ad: string;
  tur: Tur;
  tesis: Kodlu | null; unite: Kodlu | null; sistem: Kodlu | null; bolge: Bolge | null;
  sahip: Kisi | null; emanetci: Kisi | null;
  tedarikci: { id: string; ad: string } | null; sozlesme: Kodlu | null;
  hostname: string | null; seriNo: string | null; uretici: string | null;
  model: string | null; ipAdresi: string | null; macAdresi: string | null;
  isletimSistemi: string | null; firmware: string | null; surum: string | null;
  rafOda: string | null; kimlikDogrulama: string | null;
  /* OT-03 · kimlik envanterinin ayrı ölçülen dört alanı. */
  ipv6Adresi: string | null; isletimSistemiSurumu: string | null;
  firmwareYapisi: string | null; donanimRevizyonu: string | null;
  /** Kurulu yazılım — ad + sürüm (OT-03 "software/version"). */
  yazilimlar: { id: string; ad: string; surum: string | null }[];
  kritiklik: string;
  /** OT-08 · Varlığın KENDİ üretim etkisi etiketi; `bilinmiyor` ise
      geçerli etki proses adımından miras alınır. */
  uretimEtkisi: string;
  yamaDurumu: string; edrDurumu: string; yedekDurumu: string;
  izlemeDurumu: string; logKaynagi: string; internetMaruziyeti: string;
  uzaktanErisim: boolean | null; yasamDongusu: string;
  kurulumTarihi: string | null; garantiBitis: string | null; destekBitis: string | null;
  eolTarihi: string | null; eosTarihi: string | null; guncellendi: string;
  /* OT-20 · Garanti sağlayıcı ve bakım takvimi — `destekBitis` üreticinin
     ürün desteği, `bakimBitis` kurumun bakım anlaşmasıdır. */
  garantiSaglayici: string | null; bakimBitis: string | null;
  sonBakim: string | null; sonrakiBakim: string | null;
  iliskiler: Iliski[];
  /* Zincir: risk → kontrol/bulgu bağı prototipin (a-assets) omurgası. */
  riskler: {
    id: string; kod: string; baslik: string; artikRisk: number | null;
    kontrol: { kod: string; baslik: string; durum: string } | null;
    bulgu: { id: string; baslik: string } | null;
  }[];
  /** AÇIK zafiyetler, CVSS'e göre azalan. Kapalı olan listede yoktur. */
  zafiyetler: {
    id: string; ref: string | null; baslik: string;
    cvss: number | null; sonTarih: string | null;
  }[];
  projeler: { id: string; kod: string; ad: string; durum: string }[];
  kanitlar: { id: string; ad: string; tip: string }[];
  acikZafiyet: number;
  /** varlığın son konfigürasyon yedeği — kayıt yoksa null (yedek YOK demek değil) */
  sonYedek: { zaman: string; basarili: boolean } | null;
  /** varlığa eşleşmiş son keşif kaydı */
  sonKesif: { id: string; kaynak: string; sonGorulme: string } | null;
  /** OT-09b · cevap bekleyen zimmet talebi; yoksa null (sahiplik kesin) */
  zimmet: {
    id: string; atananAd: string; atayanAd: string;
    olusturuldu: string; sonTarih: string; not: string | null;
  } | null;
  /** bu kullanıcı bu varlığı yazabilir mi (tesis kapsamı dâhil) */
  yazilabilir: boolean;
  /** emekli/imha geçişi denetimlidir: envanter/onay ister */
  onaylanabilir: boolean;
  /** OT-03/11/21/22/25/26/27 · varlığın dışındaki duruş kayıtları */
  durus: Durus;
  /** OT-05/08/09/20/28 · sahiplik, etki, proses ve konfigürasyon yönetişimi */
  yonetisim: Yonetisim;
};

/* ── Sözlükler ──────────────────────────────────────────────────────── */

export const KRITIKLIKLER = ['kritik', 'yuksek', 'orta', 'dusuk', 'bilinmiyor'] as const;
export const YASAM_DONGULERI = ['planlandi', 'aktif', 'bakim', 'emekli', 'imha'] as const;
export const YASAM_ETIKET: Record<string, string> = {
  planlandi: 'Planlandı', aktif: 'Aktif', bakim: 'Bakım', emekli: 'Emekli', imha: 'İmha',
};

export const ILISKI_TIPLERI = ['depends_on', 'runs_on', 'connects_to', 'hosts', 'backs_up'] as const;
/** Kaynak özne olacak şekilde okunur cümle bağlacı: "X şuna bağımlıdır: Y". */
export const ILISKI_CUMLE: Record<string, string> = {
  depends_on: 'şuna bağımlıdır:', runs_on: 'şunun üzerinde çalışır:',
  connects_to: 'şuna bağlanır:', hosts: 'şunu barındırır:', backs_up: 'şunu yedekler:',
};

export const YAMA_SECENEK = ['guncel', 'eksik', 'yamasiz', 'bilinmiyor'] as const;
export const VAR_YOK_SECENEK = ['var', 'yok', 'bilinmiyor'] as const;
export const MARUZIYET_SECENEK = ['yok', 'sinirli', 'var', 'bilinmiyor'] as const;

export const BOLGE_TIP_ETIKET: Record<string, string> = {
  bt: 'BT ağı', ot: 'OT ağı', dmz: 'DMZ', ot_dmz: 'OT DMZ',
  kurumsal: 'Kurumsal ağ', internet: 'İnternet',
};

const OT_SINIFLARI = new Set(['OT', 'BT_OT_KOPRU']);

/* ── Zaman ──────────────────────────────────────────────────────────── */

const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

/** "Tem 25" — ay + iki haneli yıl. Tabloda ve düğümde aynı biçim. */
export function ayYil(iso: string): string {
  const d = new Date(iso);
  return `${AYLAR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

/**
 * EOS'a kalan gün. Tarih girilmemişse `null` döner — bu "süre dolmadı"
 * DEĞİL, "bilinmiyor"dur; çağıranlar ikisini ayırmak zorundadır.
 */
export function omurGunu(v: Pick<V, 'eosTarihi'>, simdi: number): number | null {
  if (!v.eosTarihi) return null;
  const t = new Date(v.eosTarihi).getTime();
  return Number.isNaN(t) ? null : Math.ceil((t - simdi) / GUN);
}

/* ── Şiddet ─────────────────────────────────────────────────────────── */

/** Kullanımdaki varlık: emekli ve imha edilmiş kayıtlar kuyruğun dışındadır. */
export function kullanimda(v: Pick<V, 'yasamDongusu'>): boolean {
  return v.yasamDongusu !== 'emekli' && v.yasamDongusu !== 'imha';
}

export function otMu(v: Pick<V, 'tur'>): boolean {
  return OT_SINIFLARI.has(v.tur.sinif);
}

/**
 * BİLİNEN koruma açıkları. `bilinmiyor` buraya girmez: ölçülmemiş kontrol
 * "yok" sayılamaz; o eksiklik `bilinmeyenAlanlar` üzerinden raporlanır.
 */
export function korumaAcigi(v: V): string[] {
  const acik: string[] = [];
  if (v.yamaDurumu === 'yamasiz') acik.push('yamasız');
  else if (v.yamaDurumu === 'eksik') acik.push('yama eksik');
  if (v.edrDurumu === 'yok') acik.push('EDR yok');
  if (v.yedekDurumu === 'yok') acik.push('yedek yok');
  if (v.izlemeDurumu === 'yok') acik.push('izleme yok');
  if (v.logKaynagi === 'yok') acik.push('log yok');
  if (v.internetMaruziyeti === 'var') acik.push('internete açık');
  return acik;
}

/** Kararı bloklayan bilinmeyen: kritiklik ya da ömür sonu girilmemiş. */
export function karariBloklayanBilinmeyen(v: V): boolean {
  return v.kritiklik === 'bilinmiyor' || !v.eosTarihi;
}

/** Kayıttaki tüm bilinmeyen alanlar — çekmecede tek tek adlandırılır. */
export function bilinmeyenAlanlar(v: V): string[] {
  const b: string[] = [];
  if (v.kritiklik === 'bilinmiyor') b.push('kritiklik');
  if (!v.eosTarihi) b.push('EOS tarihi');
  if (v.yamaDurumu === 'bilinmiyor') b.push('yama');
  if (v.edrDurumu === 'bilinmiyor') b.push('EDR');
  if (v.yedekDurumu === 'bilinmiyor') b.push('yedek');
  if (v.izlemeDurumu === 'bilinmiyor') b.push('izleme');
  if (v.logKaynagi === 'bilinmiyor') b.push('log');
  if (v.internetMaruziyeti === 'bilinmiyor') b.push('internet maruziyeti');
  if (v.uzaktanErisim === null) b.push('uzaktan erişim');
  return b;
}

/* ── OT-03 · Kimlik alanı envanteri ───────────────────────────────────

   Envanterin "eksik alan" sayacı bugüne kadar tek bir soru soruyordu:
   dolu mu, boş mu. Bu iki gerçeği bir araya sıkıştırıyordu:

     ÖLÇÜLMEDİ      — alan var, değeri toplanmadı. Bu bir borçtur.
     UYGULANAMAZ    — alanın bu cihazda karşılığı yoktur. Bir seri hat
                      dönüştürücüsünün hostname'i olmaz; bir PLC'de
                      işletim sistemi sürümü yoktur.

   İkisini aynı sayaçta toplamak, kapatılması imkânsız bir borç üretir ve
   sayaç hiçbir zaman sıfırlanamayacağı için kimse ona bakmaz. Bu yüzden
   `uygulanamaz` PAYDADAN DÜŞER (aynı doktrin lib/varlik/kapsam.ts'te
   kapsama oranı için de geçerlidir) ve gerekçesiyle saklanır. */

export const KIMLIK_ALANLARI = [
  { anahtar: 'uretici', ad: 'Üretici' },
  { anahtar: 'model', ad: 'Model' },
  { anahtar: 'donanimRevizyonu', ad: 'Donanım revizyonu' },
  { anahtar: 'seriNo', ad: 'Seri no' },
  { anahtar: 'etiket', ad: 'Varlık etiketi' },
  { anahtar: 'hostname', ad: 'Hostname' },
  { anahtar: 'ipAdresi', ad: 'IPv4' },
  { anahtar: 'ipv6Adresi', ad: 'IPv6' },
  { anahtar: 'macAdresi', ad: 'MAC' },
  { anahtar: 'isletimSistemi', ad: 'İşletim sistemi' },
  { anahtar: 'isletimSistemiSurumu', ad: 'İS sürümü / derlemesi' },
  { anahtar: 'firmware', ad: 'Firmware' },
  { anahtar: 'firmwareYapisi', ad: 'Firmware yapısı' },
  { anahtar: 'yazilim', ad: 'Kurulu yazılım / sürüm' },
] as const;

export type KimlikAlanAnahtari = (typeof KIMLIK_ALANLARI)[number]['anahtar'];

export type KimlikAlanDurumu = {
  anahtar: string; ad: string;
  /** null = ölçülmedi. Boş metin de ölçülmemiş sayılır. */
  deger: string | null;
  /** Uygulanamazlık gerekçesi; null = alan bu cihaz için geçerli. */
  uygulanamaz: string | null;
};

/** Alanın ham değeri. `yazilim` tek sütun değildir; listeden türetilir. */
function kimlikDegeri(v: V, anahtar: string): string | null {
  if (anahtar === 'yazilim') {
    if (v.yazilimlar.length === 0) return null;
    return v.yazilimlar
      .map((y) => (y.surum ? `${y.ad} ${y.surum}` : y.ad))
      .join(' · ');
  }
  const ham = (v as unknown as Record<string, unknown>)[anahtar];
  if (typeof ham !== 'string') return null;
  const kirpik = ham.trim();
  return kirpik === '' ? null : kirpik;
}

/** On dört kimlik alanının tamamı — dolu olmayanlar da listede kalır. */
export function kimlikEnvanteri(v: V): KimlikAlanDurumu[] {
  return KIMLIK_ALANLARI.map((a) => ({
    anahtar: a.anahtar,
    ad: a.ad,
    deger: kimlikDegeri(v, a.anahtar),
    uygulanamaz: v.durus.uygulanamaz[a.anahtar] ?? null,
  }));
}

export type KimlikTamligi = {
  dolu: number;
  /** Ölçüm borcu — uygulanamaz olanlar BURAYA GİRMEZ. */
  olculmedi: number;
  uygulanamaz: number;
  /**
   * Doluluk oranı; payda `uygulanamaz` alanları DIŞLAR. Payda sıfırsa
   * (her alan uygulanamaz işaretlenmişse) oran `null`'dır — `%0` yazmak
   * yalan, `%100` yazmak daha büyük yalan olurdu.
   */
  oran: number | null;
};

export function kimlikTamligi(v: V): KimlikTamligi {
  const alanlar = kimlikEnvanteri(v);
  const uygulanamaz = alanlar.filter((a) => a.uygulanamaz !== null).length;
  const gecerli = alanlar.filter((a) => a.uygulanamaz === null);
  const dolu = gecerli.filter((a) => a.deger !== null).length;
  return {
    dolu,
    olculmedi: gecerli.length - dolu,
    uygulanamaz,
    oran: gecerli.length === 0 ? null : Math.round((dolu / gecerli.length) * 100),
  };
}

/**
 * Satır işaretçisi. Sıra bilinçlidir: önce BİLİNEN kötü (destek geçti,
 * yamasız), sonra bilinen kısmi, sonra BİLİNMEYEN, en sonda sağlıklı.
 * Bilinmeyen hiçbir koşulda `ok` olamaz.
 */
export function varlikDurumu(v: V, simdi: number): Durum {
  const gun = omurGunu(v, simdi);
  if (gun !== null && gun < 0) return 'bd';
  if (v.yamaDurumu === 'yamasiz') return 'bd';
  if (gun !== null && gun < 365) return 'md';
  if (korumaAcigi(v).length > 0) return 'md';
  if (karariBloklayanBilinmeyen(v)) return 'unk';
  return 'ok';
}

/** Sürükleyici satır kuyruğa ASLA inmez (06 §A3). */
export function surukleyici(v: V, simdi: number): boolean {
  return varlikDurumu(v, simdi) === 'bd';
}

/**
 * Satırın alt satırındaki TEK olgu. Durum sözcüğü değil, olgudur:
 * "yamasız", "yedek yok", "EOS girilmedi". Ömür hücresi tarihi ayrıca
 * taşıdığı için burada tarih tekrar edilmez.
 */
export function olgu(v: V, simdi: number): string {
  const acik = korumaAcigi(v);
  // Alt satır kayıt kimliği + EN FAZLA iki olgu taşır (02-components §5):
  // ilk açık yazılır, kalanı sayıya iner — hepsi çekmecede görünür.
  if (acik.length > 0) return acik.length > 1 ? `${acik[0]} +${acik.length - 1}` : acik[0];
  if (!v.eosTarihi) return 'EOS girilmedi';
  if (v.kritiklik === 'bilinmiyor') return 'kritiklik girilmedi';
  if (v.acikZafiyet > 0) return `${v.acikZafiyet} açık zafiyet`;
  const gun = omurGunu(v, simdi);
  if (gun !== null && gun < 365) return `ömür sonuna ${Math.max(gun, 0)} gün`;
  return '';
}

/* ── Mercek ve kapsam ───────────────────────────────────────────────── */

export type Mercek = 'sinyal' | 'ot' | 'maruz' | 'bilinmeyen' | 'hepsi'
  | 'desteksiz' | 'omurYakin' | 'emekli';

export const MERCEKLER: { id: Mercek; ad: string }[] = [
  { id: 'sinyal', ad: 'Sinyal' },
  { id: 'ot', ad: 'OT' },
  { id: 'maruz', ad: 'Maruz' },
  { id: 'bilinmeyen', ad: 'Bilinmeyen' },
  { id: 'hepsi', ad: 'Tümü' },
];

/* Ömür mercekleri taşmada durur: /omur ekranı bu soruyu asıl sahibi olarak
   yanıtlar, burada yalnız envanteri daraltmaya yarar. Emekli/imha da kendi
   merceğinde yaşar — kullanımdaki envanteri emekli donanımla şişirmek
   "kaç varlığım var" sorusunu bozar. */
export const MERCEK_TASMA: { id: Mercek; ad: string }[] = [
  { id: 'desteksiz', ad: 'Desteksiz' },
  { id: 'omurYakin', ad: 'Ömür yakın' },
  { id: 'emekli', ad: 'Emekli' },
];

export function mercekten(v: V, m: Mercek, simdi: number): boolean {
  if (m === 'emekli') return !kullanimda(v);
  if (!kullanimda(v)) return false;
  const gun = omurGunu(v, simdi);
  switch (m) {
    case 'sinyal': {
      const d = varlikDurumu(v, simdi);
      return d === 'bd' || d === 'md';
    }
    case 'ot': return otMu(v);
    case 'bilinmeyen': return karariBloklayanBilinmeyen(v);
    case 'maruz':
      return v.internetMaruziyeti === 'var' || v.internetMaruziyeti === 'sinirli'
        || v.uzaktanErisim === true;
    // Tarihi olmayan kayıt ikisine de girmez: bilinmeyen ne bitmiştir ne yakındır.
    case 'desteksiz': return gun !== null && gun < 0;
    case 'omurYakin': return gun !== null && gun >= 0 && gun < 365;
    default: return true;
  }
}

/** Tür kapsamı tek kontrolde iki boyutu taşır: `s:<sinif>` ve `t:<turId>`. */
export function turKapsamindan(v: V, kapsam: string | null): boolean {
  if (!kapsam) return true;
  if (kapsam.startsWith('s:')) return v.tur.sinif === kapsam.slice(2);
  if (kapsam.startsWith('t:')) return v.tur.id === kapsam.slice(2);
  return true;
}

export function aramadan(v: V, arama: string): boolean {
  const q = arama.trim().toLocaleLowerCase('tr-TR');
  if (!q) return true;
  const havuz = [v.etiket, v.ad, v.hostname, v.ipAdresi, v.isletimSistemi,
    v.seriNo, v.uretici, v.model, v.tesis?.kod, v.tesis?.ad, v.bolge?.kod, v.tur.ad]
    .filter(Boolean).join(' ').toLocaleLowerCase('tr-TR');
  return havuz.includes(q);
}

export function suz(varliklar: V[], f: {
  mercek: Mercek;
  tesisId: string | null;
  turKapsami: string | null;
  /** kritiklik kademesi — 'bilinmiyor' da geçerli bir seçimdir */
  kritiklik: string | null;
  arama: string;
}, simdi: number): V[] {
  return varliklar.filter((v) =>
    mercekten(v, f.mercek, simdi)
    && (!f.tesisId || v.tesis?.id === f.tesisId)
    && turKapsamindan(v, f.turKapsami)
    && (!f.kritiklik || v.kritiklik === f.kritiklik)
    && aramadan(v, f.arama));
}

/* ── Sıralama ───────────────────────────────────────────────────────── */

const DURUM_AGIRLIGI: Record<string, number> = { bd: 0, md: 1, unk: 2, pl: 3, tamam: 4, ok: 4 };

/* Bilinmeyen kritiklik "düşük" DEĞİLDİR: sırada `yuksek` ile `orta`nın
   arasına oturur, en alta atılmaz. Aksi hâlde kritikliği girilmemiş bir
   varlık, düşük kritiklikli bir varlıkla aynı muameleyi görürdü. */
const KRITIKLIK_AGIRLIGI: Record<string, number> = {
  kritik: 0, yuksek: 1, bilinmiyor: 2, orta: 3, dusuk: 4,
};

export function sirala(varliklar: V[], simdi: number): V[] {
  return [...varliklar].sort((a, b) => {
    const da = DURUM_AGIRLIGI[varlikDurumu(a, simdi)] ?? 5;
    const dbb = DURUM_AGIRLIGI[varlikDurumu(b, simdi)] ?? 5;
    if (da !== dbb) return da - dbb;
    const ka = KRITIKLIK_AGIRLIGI[a.kritiklik] ?? 5;
    const kb = KRITIKLIK_AGIRLIGI[b.kritiklik] ?? 5;
    if (ka !== kb) return ka - kb;
    const ga = omurGunu(a, simdi);
    const gb = omurGunu(b, simdi);
    // Ömrü bilinmeyen kayıt sona atılmaz ama bilinen tarihle de yarışamaz:
    // aynı şiddet ve kritiklikteki bilinenlerden sonra, etiket sırasında gelir.
    if (ga !== gb) {
      if (ga === null) return 1;
      if (gb === null) return -1;
      return ga - gb;
    }
    return a.etiket.localeCompare(b.etiket, 'tr');
  });
}

/**
 * Görünür satırlar + toplanan kuyruk. Sürükleyici (bd) satırlar bütçeden
 * bağımsız görünür kalır: 347 satırı dökmek de, kritik satırı gizlemek de
 * kusurdur — bütçe yalnız SAKİN satırları keser.
 */
export function bolumle(sirali: V[], simdi: number, kuyrukAcik: boolean): {
  gorunur: V[]; toplanan: V[];
} {
  if (kuyrukAcik) return { gorunur: sirali, toplanan: [] };
  const sabit = sirali.filter((v) => surukleyici(v, simdi));
  const sakin = sirali.filter((v) => !surukleyici(v, simdi));
  const slot = Math.max(0, GORUNUR_TAVAN - sabit.length);
  return { gorunur: [...sabit, ...sakin.slice(0, slot)], toplanan: sakin.slice(slot) };
}

/**
 * Kuyruk satırı neyi topladığını yazar — "diğerleri" demez.
 *
 * İki sayı kuyruğu BÖLMEZ, iki olguyu bildirir: bir varlığın hem bilinen
 * koruma açığı hem girilmemiş ömrü olabilir. Bilinmeyen sayısı ekranın
 * metriğiyle AYNI ölçütten okunur, yoksa dip nottaki sayıyla çelişirdi.
 */
export function kuyrukMetni(toplanan: V[], simdi: number): string {
  const n = toplanan.length;
  const kismi = toplanan.filter((v) => varlikDurumu(v, simdi) === 'md').length;
  const bilinmeyen = toplanan.filter(karariBloklayanBilinmeyen).length;
  // Kuyruğun tamamı tek olguysa sayıyı iki kez yazmak yerine olguyu adlandır.
  if (kismi === n && bilinmeyen === 0) return `+${n} varlık · koruma açığı`;
  if (bilinmeyen === n && kismi === 0) return `+${n} varlık · ömür/kritiklik girilmemiş`;
  const parcalar = [`+${n} varlık`];
  if (kismi > 0) parcalar.push(`${kismi} koruma açığı`);
  if (bilinmeyen > 0) parcalar.push(`${bilinmeyen} ömür/kritiklik girilmemiş`);
  return parcalar.join(' · ');
}

/* ── Metrikler ──────────────────────────────────────────────────────── */

export type EnvanterMetrikleri = {
  kullanimdaki: number;
  desteksiz: number;
  korumaAcikli: number;
  bilinmeyen: number;
  ot: number;
  emekli: number;
  sahipsiz: number;
};

/** Metrikler MERCEKTEN bağımsızdır: kapsamın tamamını anlatır (06 §A2). */
export function metrikleriHesapla(varliklar: V[], simdi: number): EnvanterMetrikleri {
  const acik = varliklar.filter(kullanimda);
  return {
    kullanimdaki: acik.length,
    desteksiz: acik.filter((v) => {
      const g = omurGunu(v, simdi);
      return g !== null && g < 0;
    }).length,
    korumaAcikli: acik.filter((v) => korumaAcigi(v).length > 0).length,
    // Ölçülmemiş alan sıfır sayılmaz; kendi metriğinde ve `unk` renginde durur.
    bilinmeyen: acik.filter(karariBloklayanBilinmeyen).length,
    ot: acik.filter(otMu).length,
    emekli: varliklar.length - acik.length,
    sahipsiz: acik.filter((v) => !v.sahip).length,
  };
}

/* ── Grafik (02-components §15) ─────────────────────────────────────── */

/* `Tuval` sözleşmesiyle yapısal olarak aynı; grafik bileşeni 'use client'
   olduğu için saf mantık ondan tip almaz (test tarafı React yüklemesin). */
export type GrafikDugumu = {
  id: string; ad: string; alt: string; x: number; y: number;
  kritik?: boolean; durum?: Durum; ustEtiket?: string;
};
export type GrafikKenari = {
  kaynak: string; hedef: string; etiket?: string; aktif?: boolean;
};

export type Grafik = {
  dugumler: GrafikDugumu[];
  kenarlar: GrafikKenari[];
  /** santral kapsamındaki toplam varlık — bölge sayaçlarının paydası */
  kapsamdaki: number;
  /** kapsamdaki varlıklardan mercekten geçenler */
  aday: number;
  /** düğüm olarak çizilen varlık sayısı */
  cizilen: number;
};

/**
 * Santral öneki tekrar etmesin: grafik zaten tek santrale daraltılmıştır,
 * her düğümde santral kodunu yeniden yazmak düğümü genişletir ve okumayı
 * zorlaştırır. `KIZILDERE-3-SCADA-01` → `SCADA-01`.
 */
export function kisaEtiket(etiket: string, tesisKod: string | null | undefined): string {
  if (!tesisKod) return etiket;
  const sade = (s: string) => s.replace(/[^A-Za-z0-9]/g, '').toLocaleUpperCase('en-US');
  const hedef = sade(tesisKod);
  const parcalar = etiket.split('-');
  let birikim = '';
  let i = 0;
  while (i < parcalar.length - 1 && birikim.length < hedef.length) {
    const sonraki = birikim + sade(parcalar[i]);
    if (!hedef.startsWith(sonraki)) break;
    birikim = sonraki;
    i += 1;
  }
  return birikim === hedef && i > 0 ? parcalar.slice(i).join('-') : etiket;
}

/** Kolon içi dikey dağılım: n düğüm eşit aralıkla, kenarlara yapışmadan. */
function dagit(n: number): number[] {
  if (n === 1) return [50];
  // 18–82 aralığı: düğüm kutusu ortalandığı için uçlarda taşma payı bırakır.
  return Array.from({ length: n }, (_, i) => Math.round(18 + (i * 64) / (n - 1)));
}

/** Kolon x konumu: kenarlarda düğüm kutusuna pay bırakır. */
function kolonKonumu(sira: number, adet: number): number {
  if (adet <= 1) return 50;
  return Math.round(22 + (sira * 56) / (adet - 1));
}

/**
 * Düğümün üst etiketi: durumu KELİMEYLE değil, olguyla söyler. İşaretçi
 * yalnız bu etiketle birlikte çıkar; sinyali olan her düğüm etiket alır,
 * aksi hâlde işaretsiz bir düğüm "sağlıklı" sanılırdı.
 */
function ustEtiketi(v: V, simdi: number): string | undefined {
  const gun = omurGunu(v, simdi);
  if (gun !== null && gun < 0 && v.eosTarihi) return `EOS ${ayYil(v.eosTarihi)}`;
  const acik = korumaAcigi(v);
  if (acik.length > 0) return acik[0].toLocaleUpperCase('tr-TR');
  if (!v.eosTarihi) return 'EOS YOK';
  if (gun !== null && gun < 365) return `EOS ${ayYil(v.eosTarihi)}`;
  if (v.kritiklik === 'bilinmiyor') return 'KRİTİKLİK YOK';
  return undefined;
}

/**
 * Varlık ↔ ağ bölgesi ↔ sistem üçlü grafiği.
 *
 * Kapsam ZORUNLUDUR: 347 düğüm aynı anda çizilmez, yalnız seçili santral
 * çizilir ve o santralin varlıkları da şiddet sırasına göre tavana kadar
 * alınır. Kapsam dışındaki hiçbir düğüm ya da kenar üretilmez — grafikte
 * görünen her şey seçili kapsamın içindedir.
 *
 * `varliklar` santralin TAMAMIDIR, `adaylar` mercekten geçenlerdir. Bölge
 * sayaçları tamam üzerinden okunur: mercek daraldığında "0 varlık" yazan
 * bir bölge düğümü, o bölgenin boş olduğu yalanını söylerdi.
 */
export function grafigiKur(girdi: {
  varliklar: V[];
  adaylar?: V[];
  bolgeler: Bolge[];
  tesis: Kodlu;
  simdi: number;
  varlikTavani?: number;
}): Grafik {
  const { varliklar, bolgeler, tesis, simdi } = girdi;
  const tavan = girdi.varlikTavani ?? GRAFIK_VARLIK_TAVANI;

  const kapsam = varliklar.filter((v) => v.tesis?.id === tesis.id);
  const aday = (girdi.adaylar ?? varliklar).filter((v) => v.tesis?.id === tesis.id);
  const secilen = sirala(aday, simdi).slice(0, tavan);
  const secilenIdler = new Set(secilen.map((v) => v.id));

  /* Bölgeler santralin tanımından gelir; kapsamdaki varlıkların bağlı
     olduğu ama santrale ait GÖRÜNMEYEN bölge varsa o da alınır — düğümü
     olmayan bir kenar çizilemez. */
  const bolgeHavuzu = new Map<string, Bolge>();
  for (const b of bolgeler) if (b.tesisId === tesis.id) bolgeHavuzu.set(b.id, b);
  for (const v of kapsam) if (v.bolge) bolgeHavuzu.set(v.bolge.id, v.bolge);

  const bolgeSayaci = new Map<string, number>();
  for (const v of kapsam) {
    if (v.bolge) bolgeSayaci.set(v.bolge.id, (bolgeSayaci.get(v.bolge.id) ?? 0) + 1);
  }

  // Purdue sırası: en yüksek güvenlik seviyesi (kurumsal) üstte, OT altta.
  const secilenBolgeler = [...bolgeHavuzu.values()]
    .sort((a, b) => (b.seviye ?? 0) - (a.seviye ?? 0) || a.kod.localeCompare(b.kod, 'tr'))
    .slice(0, GRAFIK_BOLGE_TAVANI);

  /* Sistem düğümü yalnız ÇİZİLEN bir varlık ona bağlıysa görünür: kenarsız
     düğüm ilişki grafiğinde kopuk bir kutudur. Sayaç yine santralin
     tamamından okunur — düğüm "26 varlık" derken 26 varlığı kastediyordur. */
  const sistemSayaci = new Map<string, { s: Kodlu; sayi: number }>();
  for (const v of kapsam) {
    if (!v.sistem) continue;
    const kayit = sistemSayaci.get(v.sistem.id) ?? { s: v.sistem, sayi: 0 };
    kayit.sayi += 1;
    sistemSayaci.set(v.sistem.id, kayit);
  }
  const bagliSistemler = new Set(
    secilen.map((v) => v.sistem?.id).filter((x): x is string => !!x),
  );
  const secilenSistemler = [...sistemSayaci.values()]
    .filter((k) => bagliSistemler.has(k.s.id))
    .sort((a, b) => b.sayi - a.sayi || a.s.kod.localeCompare(b.s.kod, 'tr'))
    .slice(0, GRAFIK_SISTEM_TAVANI);

  // Boş kolon yer kaplamaz: kolon sayısı doluluğa göre belirlenir.
  const kolonlar = [secilenBolgeler.length, secilen.length, secilenSistemler.length];
  const dolu = kolonlar.filter((n) => n > 0).length;
  const kolonX: number[] = [];
  let sira = 0;
  for (const n of kolonlar) {
    kolonX.push(n > 0 ? kolonKonumu(sira, dolu) : 0);
    if (n > 0) sira += 1;
  }

  const tipTekrari = new Map<string, number>();
  for (const b of secilenBolgeler) tipTekrari.set(b.tip, (tipTekrari.get(b.tip) ?? 0) + 1);

  const dugumler: GrafikDugumu[] = [];
  const bolgeY = dagit(secilenBolgeler.length);
  secilenBolgeler.forEach((b, i) => {
    const tekrar = (tipTekrari.get(b.tip) ?? 0) > 1;
    const sayi = bolgeSayaci.get(b.id) ?? 0;
    dugumler.push({
      id: `b-${b.id}`,
      ad: tekrar ? b.kod : (BOLGE_TIP_ETIKET[b.tip] ?? b.ad),
      alt: [b.seviye !== null ? `SL${b.seviye}` : 'SL yok', `${sayi} varlık`].join(' · '),
      x: kolonX[0], y: bolgeY[i],
    });
  });

  const varlikY = dagit(secilen.length);
  secilen.forEach((v, i) => {
    dugumler.push({
      id: `v-${v.id}`,
      ad: kisaEtiket(v.etiket, tesis.kod),
      alt: v.tur.ad,
      x: kolonX[1], y: varlikY[i],
      kritik: v.kritiklik === 'kritik',
      durum: varlikDurumu(v, simdi),
      ustEtiket: ustEtiketi(v, simdi),
    });
  });

  const sistemY = dagit(secilenSistemler.length);
  secilenSistemler.forEach((k, i) => {
    dugumler.push({
      id: `s-${k.s.id}`,
      ad: k.s.kod,
      alt: `sistem · ${k.sayi} varlık`,
      x: kolonX[2], y: sistemY[i],
    });
  });

  const cizilenBolgeler = new Set(secilenBolgeler.map((b) => b.id));
  const cizilenSistemler = new Set(secilenSistemler.map((k) => k.s.id));

  const kenarlar: GrafikKenari[] = [];
  for (const v of secilen) {
    if (v.bolge && cizilenBolgeler.has(v.bolge.id)) {
      kenarlar.push({ kaynak: `b-${v.bolge.id}`, hedef: `v-${v.id}` });
    }
    if (v.sistem && cizilenSistemler.has(v.sistem.id)) {
      // OT zinciri akan kesik çizgiyle gösterilir: yön bilgi taşır, animasyon taşımaz.
      kenarlar.push({ kaynak: `v-${v.id}`, hedef: `s-${v.sistem.id}`, aktif: otMu(v) });
    }
  }
  // Varlık–varlık bağı yalnız İKİ UCU da çizilmişse görünür.
  const gorulen = new Set<string>();
  for (const v of secilen) {
    for (const i of v.iliskiler) {
      if (!i.giden || !secilenIdler.has(i.diger.id)) continue;
      const anahtar = `${v.id}>${i.diger.id}>${i.tip}`;
      if (gorulen.has(anahtar)) continue;
      gorulen.add(anahtar);
      kenarlar.push({ kaynak: `v-${v.id}`, hedef: `v-${i.diger.id}`, etiket: i.tip });
    }
  }

  return {
    dugumler, kenarlar,
    kapsamdaki: kapsam.length, aday: aday.length, cizilen: secilen.length,
  };
}

/**
 * Grafiğin varsayılan kapsamı: süzülmüş kümede en çok varlığı olan santral.
 * Kapsam seçilmeden grafik çizilmez; kullanıcı Santral kapsamıyla değiştirir.
 */
export function varsayilanTesis(varliklar: V[], tesisler: Kodlu[]): Kodlu | null {
  if (tesisler.length === 0) return null;
  const sayac = new Map<string, number>();
  for (const v of varliklar) {
    if (v.tesis) sayac.set(v.tesis.id, (sayac.get(v.tesis.id) ?? 0) + 1);
  }
  const sirali = [...tesisler].sort((a, b) =>
    (sayac.get(b.id) ?? 0) - (sayac.get(a.id) ?? 0) || a.kod.localeCompare(b.kod, 'tr'));
  return sirali[0];
}

/* ── Dışa aktarım (OT-38) ─────────────────────────────────────────────
   Sütun kümesi TEK YERDE tanımlıdır ve Excel ile CSV aynı diziyi okur.
   İki biçim ayrı ayrı yazılsaydı zamanla ayrışır, iki dosyayı yan yana
   koyan kişi ürünün yalan söylediğini düşünürdü.

   Dışa aktarım ekrandaki SÜZÜLMÜŞ ve SIRALANMIŞ diziyi alır: kullanıcı
   ne görüyorsa onu indirir. Kapsam kısıtı zaten sunucuda uygulanmıştır —
   ekranda görünmeyen bir santral diziye hiç girmez.

   Boş hücre BOŞ kalır. Ekranda "—" gösteren bir alan dosyada da tire
   yazsaydı, o tireyi bir başka sistem "değer" sanırdı. */

/** Dışa aktarımda tarih: ölçülmemiş alan boş kalır, "—" DEĞİL. */
function disaTarih(d: string | null | undefined): string {
  return d ? tarihTR(d) : '';
}

/** Dışa aktarımda etiket: bilinmeyen değer boş DEĞİL, kendi adıyla yazılır. */
function disaEtiket(d: string | null | undefined): string {
  return d ? etiketle(d) : '';
}

export const ENVANTER_DISA_BASLIKLARI = [
  'Etiket', 'Ad', 'Tür', 'Sınıf',
  'Santral', 'Ünite', 'Sistem/Servis', 'Ağ bölgesi',
  'Segment', 'VLAN', 'Subnet',
  'Üretici', 'Model', 'Seri no', 'IP', 'IPv6', 'MAC',
  'İşletim sistemi', 'OS sürümü', 'Firmware',
  'Kritiklik', 'Sahip', 'Ekip', 'Yaşam döngüsü',
  'EOL', 'EOS', 'Garanti bitiş', 'Bakım bitiş', 'Destek bitiş',
  'Yama durumu', 'Firmware durumu',
  'EDR kapsaması', 'Log kaynağı', 'İzleme', 'Yedekleme',
  'İnternet maruziyeti', 'Son görülme', 'Veri kaynağı',
  'Koruma açığı', 'Bilinmeyen alanlar', 'İşaret',
] as const;

/**
 * Bir varlığın dışa aktarım satırı.
 *
 * `Veri kaynağı` alanı bilinçli olarak "elle" ile bir kaynak sistemin adı
 * arasında ayrım yapar: bir denetçinin ilk sorusu "bu sayı nereden geldi"
 * olur ve dosyanın kendisi bunu söyleyebilmelidir.
 */
export function envanterDisaSatiri(v: V, simdi: number): (string | number)[] {
  const seg = v.durus.segment;
  return [
    v.etiket, v.ad, v.tur.ad, disaEtiket(v.tur.sinif),
    v.tesis?.kod ?? '', v.unite?.kod ?? '', v.sistem?.kod ?? '', v.bolge?.kod ?? '',
    seg?.kod ?? '', seg?.vlanId ?? '', seg?.cidr ?? '',
    v.uretici ?? '', v.model ?? '', v.seriNo ?? '',
    v.ipAdresi ?? '', v.ipv6Adresi ?? '', v.macAdresi ?? '',
    v.isletimSistemi ?? '', v.isletimSistemiSurumu ?? '', v.firmware ?? '',
    disaEtiket(v.kritiklik), v.sahip?.ad ?? '', v.yonetisim.ekip?.ad ?? '',
    YASAM_ETIKET[v.yasamDongusu] ?? disaEtiket(v.yasamDongusu),
    disaTarih(v.eolTarihi), disaTarih(v.eosTarihi),
    disaTarih(v.garantiBitis), disaTarih(v.bakimBitis), disaTarih(v.destekBitis),
    disaEtiket(v.yamaDurumu), disaEtiket(v.durus.firmware?.durum ?? null),
    disaEtiket(v.edrDurumu), disaEtiket(v.logKaynagi),
    disaEtiket(v.izlemeDurumu), disaEtiket(v.yedekDurumu),
    disaEtiket(v.internetMaruziyeti),
    v.sonKesif ? tarihTR(v.sonKesif.sonGorulme) : '',
    v.sonKesif?.kaynak ?? 'elle',
    korumaAcigi(v).join(', '), bilinmeyenAlanlar(v).join(', '),
    varlikDurumu(v, simdi),
  ];
}

/** Başlık satırı + veri satırları — Excel ve CSV bunu paylaşır. */
export function envanterDisaAktarimi(
  varliklar: readonly V[], simdi: number,
): (string | number)[][] {
  return [[...ENVANTER_DISA_BASLIKLARI], ...varliklar.map((v) => envanterDisaSatiri(v, simdi))];
}
