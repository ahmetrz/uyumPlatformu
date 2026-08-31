import 'server-only';
import { db } from '../db';
import { izinVar, izinliTesisIdleri } from '../erisim';
import type { AktifKullanici } from '../auth';
import { kokenYaz } from './koken';
import type { Prisma } from '../prisma-client/client';

/* CMDB toplu aktarımı — ayrıştırma, kolon eşleme, doğrulama, commit.

   Akış: yükle → ayrıştır → KOLON EŞLEME (kullanıcı onaylar) → doğrula →
   önizleme + hata/yinelenen listesi → onay → TRANSACTION commit → köken + iz.

   Sözleşmenin sert maddeleri (hiçbiri esnetilmez):

   1. Yarım import YOK. Commit tek `db.$transaction` içinde yapılır; bir satır
      patlarsa hiçbir satır yazılmaz ve aktarım `hata` durumuna düşer.
   2. Eşleme OTOMATİK DEĞİL. Yaygın başlıklar için öneri üretilir, ama yazılan
      eşlemeyi kullanıcı onaylar (`eslemeJson`).
   3. Bilinmeyen ≠ boş ≠ sıfır. Boş hücre `null` ya da `'bilinmiyor'` olur;
      `0`/`false` ASLA üretilmez. Mevcut bir varlığın bilinen değeri boş
      hücreyle silinmez — boş hücre "bilgi yok" demektir, "sil" demek değil.
   4. Çakışan eşleşme sessizce birine yazılmaz. etiket/seriNo/mac farklı
      varlıkları gösteriyorsa satır hata listesine düşer.
   5. Kapsam veri seviyesinde uygulanır. Kullanıcının yazma yetkisi olmayan
      tesise ait satır — ister dosyadaki tesis kodundan, ister eşleşen mevcut
      varlığın tesisinden gelsin — hata listesine düşer.
   6. Köken `guven: null` alır: elle yüklenen dosyada güven ÖLÇÜLMEMİŞTİR.
      `kokenTipi` 'otomatik'tir (kaydı bir süreç getirdi) ama doğrulama
      durumu `dogrulanmadi` kalır — doğrulama insanın işi. */

/* ═══ Hedef alanlar ═══════════════════════════════════════════════════ */

export type HedefAlan =
  | 'etiket' | 'ad' | 'hostname' | 'seriNo' | 'uretici' | 'model'
  | 'turKodu' | 'tesisKodu' | 'sistemKodu' | 'sahipEposta' | 'bolgeKodu'
  | 'kritiklik' | 'ipAdresi' | 'macAdresi' | 'isletimSistemi' | 'firmware'
  | 'eolTarihi' | 'eosTarihi' | 'destekBitis'
  | 'yamaDurumu' | 'edrDurumu' | 'yedekDurumu' | 'izlemeDurumu'
  | 'uzaktanErisim' | 'yasamDongusu';

const KRITIKLIKLER = ['dusuk', 'orta', 'yuksek', 'kritik', 'bilinmiyor'] as const;
const YAMA_DURUMLARI = ['guncel', 'eksik', 'yamasiz', 'bilinmiyor'] as const;
const VAR_YOK = ['var', 'yok', 'bilinmiyor'] as const;
const YASAM_DONGULERI = ['planlandi', 'aktif', 'bakim', 'emekli', 'imha'] as const;

export type AlanTanimi = {
  anahtar: HedefAlan;
  etiket: string;
  /** metin · referans (kod→id) · tarih · sozluk (kapalı liste) · ucDurum (üç durumlu boolean) */
  tip: 'metin' | 'referans' | 'tarih' | 'sozluk' | 'ucDurum';
  zorunlu?: boolean;
  sozluk?: readonly string[];
  /** Boş hücre yeni kayıtta ne yazar. 'atla' = hiç yazma (şema varsayılanı kalır).
      `0`/`false` hiçbir alanda boş karşılığı DEĞİLDİR. */
  bos: 'bilinmiyor' | 'null' | 'atla';
  /** kolon eşleme önerisinin dayandığı yaygın başlıklar */
  esAdlar: readonly string[];
};

/* Öneri sözlüğü: dosya başlıkları tr/en karışık gelir. Buradaki eşleşme
   yalnız ÖNERİdir — eşlemeyi kullanıcı onaylar (sözleşme maddesi 2). */
export const HEDEF_ALANLAR: readonly AlanTanimi[] = [
  { anahtar: 'etiket', etiket: 'Etiket (asset tag)', tip: 'metin', zorunlu: true, bos: 'null',
    esAdlar: ['etiket', 'assettag', 'asset', 'assetid', 'varlikkodu', 'varlicetiketi', 'tag', 'envanterno', 'demirbasno'] },
  { anahtar: 'ad', etiket: 'Ad', tip: 'metin', bos: 'null',
    esAdlar: ['ad', 'adi', 'varlikadi', 'name', 'assetname', 'aciklama', 'description'] },
  { anahtar: 'hostname', etiket: 'Hostname', tip: 'metin', bos: 'null',
    esAdlar: ['hostname', 'host', 'makineadi', 'computername', 'nodename', 'cihazadi'] },
  { anahtar: 'seriNo', etiket: 'Seri no', tip: 'metin', bos: 'null',
    esAdlar: ['serino', 'seri', 'serial', 'serialnumber', 'serialno', 'sn', 'serinumarasi'] },
  { anahtar: 'uretici', etiket: 'Üretici', tip: 'metin', bos: 'null',
    esAdlar: ['uretici', 'marka', 'vendor', 'manufacturer', 'make', 'brand'] },
  { anahtar: 'model', etiket: 'Model', tip: 'metin', bos: 'null',
    esAdlar: ['model', 'modelno', 'modelname', 'urunmodeli', 'producttype'] },
  { anahtar: 'turKodu', etiket: 'Tür kodu → tür', tip: 'referans', bos: 'atla',
    esAdlar: ['turkodu', 'tur', 'tip', 'type', 'assettype', 'category', 'kategori', 'varliktipi', 'varlikturu'] },
  { anahtar: 'tesisKodu', etiket: 'Tesis kodu → santral', tip: 'referans', bos: 'atla',
    esAdlar: ['tesiskodu', 'tesis', 'santral', 'site', 'sitecode', 'plant', 'location', 'lokasyon', 'facility'] },
  { anahtar: 'sistemKodu', etiket: 'Sistem kodu → sistem', tip: 'referans', bos: 'atla',
    esAdlar: ['sistemkodu', 'sistem', 'system', 'systemcode', 'servis', 'service', 'application', 'uygulama'] },
  { anahtar: 'sahipEposta', etiket: 'Sahip e-postası → sahip', tip: 'referans', bos: 'atla',
    esAdlar: ['sahipeposta', 'sahip', 'owner', 'owneremail', 'sahibi', 'sorumlu', 'email', 'eposta'] },
  { anahtar: 'bolgeKodu', etiket: 'Bölge kodu → ağ bölgesi', tip: 'referans', bos: 'atla',
    esAdlar: ['bolgekodu', 'bolge', 'agbolgesi', 'zone', 'networkzone', 'segment', 'vlan', 'zonecode'] },
  { anahtar: 'kritiklik', etiket: 'Kritiklik', tip: 'sozluk', sozluk: KRITIKLIKLER, bos: 'bilinmiyor',
    esAdlar: ['kritiklik', 'criticality', 'kritikseviye', 'onem', 'severity', 'businesscriticality'] },
  { anahtar: 'ipAdresi', etiket: 'IP adresi', tip: 'metin', bos: 'null',
    esAdlar: ['ipadresi', 'ip', 'ipaddress', 'ipv4', 'adres', 'address'] },
  { anahtar: 'macAdresi', etiket: 'MAC adresi', tip: 'metin', bos: 'null',
    esAdlar: ['macadresi', 'mac', 'macaddress', 'hwaddr', 'physicaladdress', 'donanimadresi'] },
  { anahtar: 'isletimSistemi', etiket: 'İşletim sistemi', tip: 'metin', bos: 'null',
    esAdlar: ['isletimsistemi', 'os', 'operatingsystem', 'isletimsistem', 'osname', 'platform'] },
  { anahtar: 'firmware', etiket: 'Firmware', tip: 'metin', bos: 'null',
    esAdlar: ['firmware', 'firmwaresurumu', 'fw', 'firmwareversion', 'yazilimsurumu'] },
  { anahtar: 'eolTarihi', etiket: 'EOL tarihi', tip: 'tarih', bos: 'null',
    esAdlar: ['eoltarihi', 'eol', 'endoflife', 'omursonu', 'eoldate'] },
  { anahtar: 'eosTarihi', etiket: 'EOS tarihi', tip: 'tarih', bos: 'null',
    esAdlar: ['eostarihi', 'eos', 'endofservice', 'endofsupport', 'eosdate', 'servissonu'] },
  { anahtar: 'destekBitis', etiket: 'Destek bitişi', tip: 'tarih', bos: 'null',
    esAdlar: ['destekbitis', 'destek', 'supportend', 'supportenddate', 'bakimbitis', 'sozlesmebitis'] },
  { anahtar: 'yamaDurumu', etiket: 'Yama durumu', tip: 'sozluk', sozluk: YAMA_DURUMLARI, bos: 'bilinmiyor',
    esAdlar: ['yamadurumu', 'yama', 'patch', 'patchstatus', 'patchlevel', 'guncellemedurumu'] },
  { anahtar: 'edrDurumu', etiket: 'EDR durumu', tip: 'sozluk', sozluk: VAR_YOK, bos: 'bilinmiyor',
    esAdlar: ['edrdurumu', 'edr', 'antivirus', 'av', 'endpointprotection', 'avdurumu'] },
  { anahtar: 'yedekDurumu', etiket: 'Yedek durumu', tip: 'sozluk', sozluk: VAR_YOK, bos: 'bilinmiyor',
    esAdlar: ['yedekdurumu', 'yedek', 'backup', 'backupstatus', 'yedekleme'] },
  { anahtar: 'izlemeDurumu', etiket: 'İzleme durumu', tip: 'sozluk', sozluk: VAR_YOK, bos: 'bilinmiyor',
    esAdlar: ['izlemedurumu', 'izleme', 'monitoring', 'monitored', 'monitoringstatus'] },
  { anahtar: 'uzaktanErisim', etiket: 'Uzaktan erişim', tip: 'ucDurum', bos: 'null',
    esAdlar: ['uzaktanerisim', 'remoteaccess', 'remote', 'uzakerisim', 'vpn'] },
  { anahtar: 'yasamDongusu', etiket: 'Yaşam döngüsü', tip: 'sozluk', sozluk: YASAM_DONGULERI, bos: 'atla',
    esAdlar: ['yasamdongusu', 'durum', 'status', 'lifecycle', 'lifecyclestate', 'state', 'asamasi'] },
];

const ALAN_INDEKSI = new Map<HedefAlan, AlanTanimi>(HEDEF_ALANLAR.map((a) => [a.anahtar, a]));

/** Aktarım kaydında saklanabilecek en fazla satır — dosya bunu aşarsa
    sessizce kırpılmaz, açık hatayla reddedilir. */
export const AZAMI_SATIR = 5000;
/** Önizleme bütçesi (ekran ilk N satırı gösterir). */
export const ONIZLEME = 20;

/* ═══ Normalizasyon ═══════════════════════════════════════════════════ */

/** Başlık/kod karşılaştırma anahtarı: Türkçe harfler sadeleşir, ayraçlar düşer. */
export function anahtarla(s: string): string {
  return s
    .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const etiketAnahtari = (s: string) => s.trim().toUpperCase();
/** MAC biçimleri (`:`, `-`, `.`, boşluk) arasında gezinir; yalnız onaltılık kalır. */
const macAnahtari = (s: string) => s.replace(/[^0-9a-fA-F]/g, '').toUpperCase();

/* ═══ Kolon eşleme önerisi ════════════════════════════════════════════ */

/** Dosya başlığı → hedef alan anahtarı. JSON'dan geldiği için tipi `string`;
    tanınmayan hedef `eslemeDogrula` ile reddedilir, sessizce yutulmaz. */
export type Esleme = Record<string, string>;

/**
 * Başlık satırına bakıp eşleme ÖNERİR. Öneri kullanıcıya sunulur ve
 * kullanıcı onaylayana kadar hiçbir şey doğrulanmaz/yazılmaz.
 * Aynı hedef alana iki başlık önerilmez — ilk gelen kazanır.
 */
export function eslemeOner(basliklar: string[]): Esleme {
  const oner: Esleme = {};
  const alinan = new Set<HedefAlan>();
  for (const b of basliklar) {
    const a = anahtarla(b);
    if (!a) { oner[b] = ''; continue; }
    const bulunan = HEDEF_ALANLAR.find(
      (t) => !alinan.has(t.anahtar) && (anahtarla(t.anahtar) === a || t.esAdlar.includes(a)),
    );
    if (bulunan) { oner[b] = bulunan.anahtar; alinan.add(bulunan.anahtar); }
    else oner[b] = '';
  }
  return oner;
}

/** Eşlemenin kendisi geçerli mi? (etiket zorunlu, aynı alan iki kez olamaz) */
export function eslemeDogrula(esleme: Esleme): string[] {
  const sorunlar: string[] = [];
  const sayac = new Map<string, number>();
  for (const hedef of Object.values(esleme)) {
    if (!hedef) continue;
    if (!ALAN_INDEKSI.has(hedef)) { sorunlar.push(`Bilinmeyen hedef alan: ${hedef}`); continue; }
    sayac.set(hedef, (sayac.get(hedef) ?? 0) + 1);
  }
  for (const [hedef, n] of sayac) {
    if (n > 1) sorunlar.push(`"${ALAN_INDEKSI.get(hedef as HedefAlan)?.etiket ?? hedef}" alanına ${n} kolon eşlenmiş`);
  }
  if (!sayac.has('etiket')) sorunlar.push('Etiket alanı eşlenmeden aktarım yapılamaz (Varlik.etiket benzersizdir)');
  return sorunlar;
}

/* ═══ Dosya ayrıştırma ════════════════════════════════════════════════ */

export type AyrismaSonucu = {
  kaynakTipi: 'csv' | 'xlsx';
  basliklar: string[];
  /** başlık → hücre metni; boş hücre '' olarak gelir (null'a doğrulamada döner) */
  satirlar: Record<string, string>[];
};

/** Hücreyi denetlenebilir metne çevirir. Tarih hücresi ISO'ya, sayı metne;
    boolean hücresi evet/hayır — hiçbir durumda `0` uydurulmaz. */
function hucreMetni(h: unknown): string {
  if (h == null) return '';
  if (h instanceof Date) return Number.isNaN(h.getTime()) ? '' : h.toISOString().slice(0, 10);
  if (typeof h === 'boolean') return h ? 'evet' : 'hayir';
  return String(h).trim();
}

/**
 * CSV/XLSX ayrıştırır. Başlık satırı ilk satırdır; boş başlıklı kolonlar
 * `kolon N` adıyla korunur (eşleme ekranında görünürler, eşlenmemeleri
 * kullanıcının kararıdır). Tekrarlanan başlık `ad #2` olur — sessizce
 * üzerine yazılmaz.
 */
export async function dosyayiAyristir(icerik: Buffer, dosyaAdi: string): Promise<AyrismaSonucu> {
  const XLSX = await import('xlsx');
  const kitap = XLSX.read(icerik, { type: 'buffer', cellDates: true });
  const sayfaAdi = kitap.SheetNames[0];
  if (!sayfaAdi) throw new Error('Dosyada okunabilir sayfa yok');
  const sayfa = kitap.Sheets[sayfaAdi];
  const matris = XLSX.utils.sheet_to_json<unknown[]>(sayfa, {
    header: 1, blankrows: false, defval: null, raw: true,
  });
  if (matris.length === 0) throw new Error('Dosya boş — başlık satırı bulunamadı');

  const gorulen = new Map<string, number>();
  const basliklar = (matris[0] ?? []).map((h, i) => {
    const ham = hucreMetni(h) || `kolon ${i + 1}`;
    const n = (gorulen.get(ham) ?? 0) + 1;
    gorulen.set(ham, n);
    return n === 1 ? ham : `${ham} #${n}`;
  });

  const veri = matris.slice(1).filter((s) => s.some((h) => hucreMetni(h) !== ''));
  if (veri.length > AZAMI_SATIR) {
    throw new Error(`Dosyada ${veri.length} satır var; tek aktarımda en fazla ${AZAMI_SATIR} satır işlenir. Dosyayı bölün.`);
  }
  const satirlar = veri.map((s) => {
    const kayit: Record<string, string> = {};
    basliklar.forEach((b, i) => { kayit[b] = hucreMetni(s[i]); });
    return kayit;
  });

  const uzanti = dosyaAdi.toLowerCase().split('.').pop();
  return { kaynakTipi: uzanti === 'csv' ? 'csv' : 'xlsx', basliklar, satirlar };
}

/* ═══ Referanslar (kod → id) ══════════════════════════════════════════ */

export type Referanslar = {
  turler: Map<string, string>;
  tesisler: Map<string, string>;
  sistemler: Map<string, string>;
  bolgeler: Map<string, string>;
  kullanicilar: Map<string, string>;
};

export async function referanslariYukle(
  istemci: Prisma.TransactionClient | typeof db = db,
): Promise<Referanslar> {
  const [turler, tesisler, sistemler, bolgeler, kullanicilar] = await Promise.all([
    istemci.varlikTuru.findMany({ select: { id: true, kod: true, ad: true } }),
    istemci.tesis.findMany({ select: { id: true, kod: true, ad: true } }),
    istemci.sistemServis.findMany({ select: { id: true, kod: true, ad: true } }),
    istemci.agBolgesi.findMany({ select: { id: true, kod: true, ad: true } }),
    istemci.kullanici.findMany({ select: { id: true, eposta: true } }),
  ]);
  const harita = (satirlar: { id: string; kod: string; ad: string }[]) => {
    const m = new Map<string, string>();
    // Kod önceliklidir; ad yalnız kod çakışmıyorsa ikinci anahtar olur.
    for (const s of satirlar) m.set(anahtarla(s.kod), s.id);
    for (const s of satirlar) { const a = anahtarla(s.ad); if (a && !m.has(a)) m.set(a, s.id); }
    return m;
  };
  return {
    turler: harita(turler),
    tesisler: harita(tesisler),
    sistemler: harita(sistemler),
    bolgeler: harita(bolgeler),
    kullanicilar: new Map(kullanicilar.map((k) => [k.eposta.trim().toLowerCase(), k.id])),
  };
}

export type MevcutVarlik = {
  id: string; etiket: string; seriNo: string | null;
  macAdresi: string | null; tesisId: string | null;
};

/** Eşleşme adayları: silinmiş varlıklar DA dahildir — `etiket` benzersizdir,
    silinmiş kaydı görmezden gelmek commit anında unique ihlaline yol açar. */
export async function mevcutVarliklariYukle(
  istemci: Prisma.TransactionClient | typeof db = db,
): Promise<MevcutVarlik[]> {
  return istemci.varlik.findMany({
    select: { id: true, etiket: true, seriNo: true, macAdresi: true, tesisId: true },
  });
}

/* ═══ Kapsam ══════════════════════════════════════════════════════════ */

export type Kapsam = {
  /** null = tüm tesisler; [] = hiçbiri */
  izinliTesisler: string[] | null;
  yazabilir: (tesisId: string | null) => boolean;
};

/**
 * Santral kapsamı: kullanıcının yazma yetkisi olmayan tesise satır yazılamaz.
 * Tesissiz (global) satır ancak kapsamsız yazma yetkisi olan kullanıcıda geçer —
 * tesise kısıtlı rol global kayıt açamaz (lib/erisim `kapsamUyar`).
 */
export function kapsamKur(k: AktifKullanici): Kapsam {
  const izinli = izinliTesisIdleri(k, 'envanter');
  return {
    izinliTesisler: izinli,
    yazabilir(tesisId) {
      if (!tesisId) return izinVar(k, 'envanter', 'yazma');
      if (izinli !== null && !izinli.includes(tesisId)) return false;
      return izinVar(k, 'envanter', 'yazma', { tesisId });
    },
  };
}

/* ═══ Doğrulama ═══════════════════════════════════════════════════════ */

/** Varlığa yazılacak alanlar — tarihler ISO metin (raporJson'da saklanır). */
export type VarlikYazimi = {
  etiket: string;
  ad?: string;
  turId?: string | null; tesisId?: string | null; sistemId?: string | null;
  sahipId?: string | null; bolgeId?: string | null;
  hostname?: string | null; seriNo?: string | null; uretici?: string | null;
  model?: string | null; ipAdresi?: string | null; macAdresi?: string | null;
  isletimSistemi?: string | null; firmware?: string | null;
  kritiklik?: string; yamaDurumu?: string; edrDurumu?: string;
  yedekDurumu?: string; izlemeDurumu?: string; yasamDongusu?: string;
  uzaktanErisim?: boolean | null;
  eolTarihi?: string | null; eosTarihi?: string | null; destekBitis?: string | null;
};

export type CozulmusSatir = {
  satirNo: number;
  etiket: string;
  islem: 'yeni' | 'guncelleme';
  hedefId: string | null;
  /** hangi alan üzerinden eşleşti: etiket | seriNo | macAdresi */
  eslesmeAlani: string | null;
  veri: VarlikYazimi;
  /** eşlenmiş ama boş gelen hücreler — "bilinmiyor" olarak yazılanlar */
  bosAlanlar: HedefAlan[];
};

export type HataSatiri = { satirNo: number; etiket: string | null; sebep: string };
export type YinelenenSatiri = {
  satirNo: number; etiket: string; hedefId: string; hedefEtiket: string; eslesmeAlani: string;
};

export type CozumSonucu = {
  satirlar: CozulmusSatir[];
  hatalar: HataSatiri[];
  yinelenenler: YinelenenSatiri[];
  sayac: { okunan: number; gecerli: number; hatali: number; yinelenen: number; yeni: number };
};

const EVET = new Set(['evet', 'e', 'var', 'true', 'yes', 'y', '1', 'acik', 'aktif']);
const HAYIR = new Set(['hayir', 'h', 'yok', 'false', 'no', 'n', '0', 'kapali', 'pasif']);

/** Tarihi ISO'ya çevirir. Anlaşılmayan biçim UYDURULMAZ — hata döner. */
export function tarihCoz(ham: string): { ok: true; deger: string } | { ok: false } {
  const s = ham.trim();
  let y: number, a: number, g: number;
  let e = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (e) { y = +e[1]; a = +e[2]; g = +e[3]; }
  else {
    e = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
    // Gün-ay sırası TR biçimidir (31.12.2026); ay>12 ise açıkça hatalıdır.
    if (e) { g = +e[1]; a = +e[2]; y = +e[3]; }
    else return { ok: false };
  }
  if (a < 1 || a > 12 || g < 1 || g > 31 || y < 1900 || y > 2200) return { ok: false };
  const d = new Date(Date.UTC(y, a - 1, g));
  if (d.getUTCMonth() !== a - 1 || d.getUTCDate() !== g) return { ok: false };
  return { ok: true, deger: d.toISOString() };
}

/**
 * Satırları çözer: eşleme uygulanır, referanslar id'ye döner, duplicate
 * tespiti yapılır, kapsam denetlenir. Saf fonksiyon — hiçbir şey yazmaz.
 */
export function satirlariCoz(girdi: {
  satirlar: Record<string, string>[];
  esleme: Esleme;
  referanslar: Referanslar;
  mevcutlar: MevcutVarlik[];
  kapsam: Kapsam;
  /** dosyadaki ilk veri satırının numarası (başlık 1 ise 2) */
  ilkSatirNo?: number;
}): CozumSonucu {
  const { satirlar, esleme, referanslar, mevcutlar, kapsam } = girdi;
  const ilk = girdi.ilkSatirNo ?? 2;

  // hedef alan → dosya başlığı (eşleme ters çevrilir); tanınmayan hedef atlanır
  const alanBasligi = new Map<HedefAlan, string>();
  for (const [baslik, hedef] of Object.entries(esleme)) {
    if (!hedef || !ALAN_INDEKSI.has(hedef as HedefAlan)) continue;
    const a = hedef as HedefAlan;
    if (!alanBasligi.has(a)) alanBasligi.set(a, baslik);
  }

  // Mevcut varlık indeksleri — üç anahtar, üçü de ayrı ayrı aranır.
  const etiketIdx = new Map<string, MevcutVarlik>();
  const seriIdx = new Map<string, MevcutVarlik>();
  const macIdx = new Map<string, MevcutVarlik>();
  for (const v of mevcutlar) {
    etiketIdx.set(etiketAnahtari(v.etiket), v);
    if (v.seriNo?.trim()) seriIdx.set(etiketAnahtari(v.seriNo), v);
    const m = v.macAdresi ? macAnahtari(v.macAdresi) : '';
    if (m) macIdx.set(m, v);
  }

  const cikti: CozulmusSatir[] = [];
  const hatalar: HataSatiri[] = [];
  const yinelenenler: YinelenenSatiri[] = [];
  // Dosya içi tekrar: aynı etiket/seri/mac iki satırda → ikincisi reddedilir.
  const dosyaEtiket = new Map<string, number>();
  const dosyaSeri = new Map<string, number>();
  const dosyaMac = new Map<string, number>();

  satirlar.forEach((ham, i) => {
    const satirNo = ilk + i;
    const hucre = (alan: HedefAlan): string => {
      const b = alanBasligi.get(alan);
      return b === undefined ? '' : (ham[b] ?? '').trim();
    };

    const etiketHam = hucre('etiket');
    if (!etiketHam) {
      hatalar.push({ satirNo, etiket: null, sebep: 'Etiket boş — Varlik.etiket zorunlu ve benzersiz' });
      return;
    }
    const etiket = etiketHam;
    const eAnahtar = etiketAnahtari(etiket);
    const oncekiSatir = dosyaEtiket.get(eAnahtar);
    if (oncekiSatir) {
      hatalar.push({ satirNo, etiket, sebep: `Dosya içinde etiket tekrarı (satır ${oncekiSatir} ile aynı)` });
      return;
    }

    const veri: VarlikYazimi = { etiket };
    const bosAlanlar: HedefAlan[] = [];
    const sorunlar: string[] = [];

    for (const tanim of HEDEF_ALANLAR) {
      if (tanim.anahtar === 'etiket') continue;
      if (!alanBasligi.has(tanim.anahtar)) continue; // eşlenmemiş alan hiç yazılmaz
      const deger = hucre(tanim.anahtar);
      if (deger === '') { bosAlanlar.push(tanim.anahtar); continue; }

      switch (tanim.tip) {
        case 'metin':
          if (tanim.anahtar === 'ad') veri.ad = deger;
          else (veri as Record<string, unknown>)[tanim.anahtar] = deger;
          break;
        case 'referans': {
          const [kaynak, hedefAlan] =
            tanim.anahtar === 'turKodu' ? [referanslar.turler, 'turId'] as const
            : tanim.anahtar === 'tesisKodu' ? [referanslar.tesisler, 'tesisId'] as const
            : tanim.anahtar === 'sistemKodu' ? [referanslar.sistemler, 'sistemId'] as const
            : tanim.anahtar === 'bolgeKodu' ? [referanslar.bolgeler, 'bolgeId'] as const
            : [referanslar.kullanicilar, 'sahipId'] as const;
          const aranan = tanim.anahtar === 'sahipEposta' ? deger.trim().toLowerCase() : anahtarla(deger);
          const id = kaynak.get(aranan);
          if (!id) { sorunlar.push(`${tanim.etiket}: "${deger}" tanımlı değil`); break; }
          (veri as Record<string, unknown>)[hedefAlan] = id;
          break;
        }
        case 'tarih': {
          const t = tarihCoz(deger);
          if (!t.ok) { sorunlar.push(`${tanim.etiket}: "${deger}" tarih olarak okunamadı (GG.AA.YYYY ya da YYYY-AA-GG)`); break; }
          (veri as Record<string, unknown>)[tanim.anahtar] = t.deger;
          break;
        }
        case 'sozluk': {
          const a = anahtarla(deger);
          const uygun = tanim.sozluk!.find((s) => anahtarla(s) === a);
          if (!uygun) { sorunlar.push(`${tanim.etiket}: "${deger}" geçersiz (${tanim.sozluk!.join(' | ')})`); break; }
          (veri as Record<string, unknown>)[tanim.anahtar] = uygun;
          break;
        }
        case 'ucDurum': {
          const a = anahtarla(deger);
          if (EVET.has(a)) veri.uzaktanErisim = true;
          else if (HAYIR.has(a)) veri.uzaktanErisim = false;
          else sorunlar.push(`${tanim.etiket}: "${deger}" evet/hayır olarak okunamadı`);
          break;
        }
      }
    }

    /* ── duplicate tespiti ───────────────────────────────────────────────
       Üç anahtar ayrı ayrı aranır. Farklı anahtarlar FARKLI varlıkları
       gösteriyorsa satır sessizce birine yazılmaz — hata listesine düşer. */
    const adaylar: { alan: string; v: MevcutVarlik }[] = [];
    const eslesenEtiket = etiketIdx.get(eAnahtar);
    if (eslesenEtiket) adaylar.push({ alan: 'etiket', v: eslesenEtiket });
    const seriDeger = typeof veri.seriNo === 'string' ? etiketAnahtari(veri.seriNo) : '';
    if (seriDeger) {
      const s = seriIdx.get(seriDeger);
      if (s) adaylar.push({ alan: 'seriNo', v: s });
    }
    const macDeger = typeof veri.macAdresi === 'string' ? macAnahtari(veri.macAdresi) : '';
    if (macDeger) {
      const m = macIdx.get(macDeger);
      if (m) adaylar.push({ alan: 'macAdresi', v: m });
    }
    const farkli = [...new Set(adaylar.map((a) => a.v.id))];
    if (farkli.length > 1) {
      const anlat = adaylar.map((a) => `${a.alan}→${a.v.etiket}`).join(', ');
      sorunlar.push(`Çakışan eşleşme: ${anlat} — hangi varlığın güncelleneceği belirsiz`);
    }

    // Dosya içi seri/MAC çakışması: iki farklı etiket aynı donanımı gösteremez.
    if (seriDeger) {
      const o = dosyaSeri.get(seriDeger);
      if (o) sorunlar.push(`Dosya içinde seri no tekrarı (satır ${o} ile aynı)`);
    }
    if (macDeger) {
      const o = dosyaMac.get(macDeger);
      if (o) sorunlar.push(`Dosya içinde MAC tekrarı (satır ${o} ile aynı)`);
    }

    const hedef = farkli.length === 1 ? adaylar[0].v : null;
    const islem: 'yeni' | 'guncelleme' = hedef ? 'guncelleme' : 'yeni';

    /* ── santral kapsamı ─────────────────────────────────────────────────
       İki yön de denetlenir: satırın gittiği tesis VE (güncellemeyse)
       varlığın hâlihazırda bulunduğu tesis. */
    const hedefTesis = (veri.tesisId as string | undefined) ?? hedef?.tesisId ?? null;
    if (!kapsam.yazabilir(hedefTesis)) {
      sorunlar.push(hedefTesis
        ? 'Kapsam dışı: bu tesise envanter yazma yetkiniz yok'
        : 'Kapsam dışı: tesissiz (global) varlık yazma yetkiniz yok — tesis kodu verin');
    } else if (hedef?.tesisId && hedef.tesisId !== hedefTesis && !kapsam.yazabilir(hedef.tesisId)) {
      sorunlar.push('Kapsam dışı: eşleşen varlık yetkiniz olmayan bir tesiste');
    }

    // Yeni kayıt için tür zorunlu (Varlik.turId NOT NULL).
    if (islem === 'yeni' && !veri.turId) {
      sorunlar.push('Yeni varlık için tür kodu zorunlu (Varlik.turId boş bırakılamaz)');
    }

    if (sorunlar.length > 0) {
      hatalar.push({ satirNo, etiket, sebep: sorunlar.join(' · ') });
      return;
    }

    dosyaEtiket.set(eAnahtar, satirNo);
    if (seriDeger) dosyaSeri.set(seriDeger, satirNo);
    if (macDeger) dosyaMac.set(macDeger, satirNo);

    if (islem === 'yeni' && !veri.ad) veri.ad = etiket; // Varlik.ad NOT NULL

    cikti.push({
      satirNo, etiket, islem,
      hedefId: hedef?.id ?? null,
      eslesmeAlani: hedef ? adaylar[0].alan : null,
      veri, bosAlanlar,
    });
    if (hedef) {
      yinelenenler.push({
        satirNo, etiket, hedefId: hedef.id, hedefEtiket: hedef.etiket,
        eslesmeAlani: adaylar[0].alan,
      });
    }
  });

  return {
    satirlar: cikti, hatalar, yinelenenler,
    sayac: {
      okunan: satirlar.length,
      gecerli: cikti.length,
      hatali: hatalar.length,
      yinelenen: yinelenenler.length,
      yeni: cikti.filter((s) => s.islem === 'yeni').length,
    },
  };
}

/* ═══ Rapor biçimi (raporJson) ════════════════════════════════════════ */

export type AktarimRaporu = {
  /** ham satırlar — eşleme değişirse yeniden doğrulanabilsin diye saklanır */
  ham?: Record<string, string>[];
  satirlar?: CozulmusSatir[];
  hatalar?: HataSatiri[];
  yinelenenler?: YinelenenSatiri[];
  /** commit patlarsa nedeni burada durur — sessiz hata yok */
  hataMesaji?: string | null;
};

export function raporCoz(raporJson: string | null): AktarimRaporu {
  if (!raporJson) return {};
  try {
    return JSON.parse(raporJson) as AktarimRaporu;
  } catch {
    throw new Error('Aktarım raporu okunamadı (bozuk JSON) — dosyayı yeniden yükleyin');
  }
}

/* ═══ Commit ══════════════════════════════════════════════════════════ */

const tarihe = (s: string | null | undefined): Date | null =>
  s == null || s === '' ? null : new Date(s);

/** Yeni kayıt gövdesi: eşlenmiş ama boş alanlar AÇIKÇA bilinmiyor/null yazılır. */
function yaratmaVerisi(s: CozulmusSatir) {
  const v = s.veri;
  const veri: Record<string, unknown> = {
    etiket: v.etiket,
    ad: v.ad ?? v.etiket,
    turId: v.turId,
    tesisId: v.tesisId ?? null, sistemId: v.sistemId ?? null,
    sahipId: v.sahipId ?? null, bolgeId: v.bolgeId ?? null,
    hostname: v.hostname ?? null, seriNo: v.seriNo ?? null,
    uretici: v.uretici ?? null, model: v.model ?? null,
    ipAdresi: v.ipAdresi ?? null, macAdresi: v.macAdresi ?? null,
    isletimSistemi: v.isletimSistemi ?? null, firmware: v.firmware ?? null,
    // Boş hücre 'bilinmiyor'a düşer — 0/false'a DEĞİL (§ bilinmeyen ≠ sıfır).
    kritiklik: v.kritiklik ?? 'bilinmiyor',
    yamaDurumu: v.yamaDurumu ?? 'bilinmiyor',
    edrDurumu: v.edrDurumu ?? 'bilinmiyor',
    yedekDurumu: v.yedekDurumu ?? 'bilinmiyor',
    izlemeDurumu: v.izlemeDurumu ?? 'bilinmiyor',
    // Üç durumlu: bilinmiyorsa null kalır, false yazılmaz.
    uzaktanErisim: v.uzaktanErisim ?? null,
    eolTarihi: tarihe(v.eolTarihi), eosTarihi: tarihe(v.eosTarihi),
    destekBitis: tarihe(v.destekBitis),
    silindi: null,
  };
  // yasamDongusu'nun 'bilinmiyor' karşılığı yok; boşsa şema varsayılanı kalır.
  if (v.yasamDongusu) veri.yasamDongusu = v.yasamDongusu;
  return veri;
}

/** Güncelleme gövdesi: yalnız DOLU hücreler yazılır. Boş hücre "bilgi yok"
    demektir; bilinen bir değeri 'bilinmiyor' yapıp veri silmez. */
function guncellemeVerisi(s: CozulmusSatir) {
  const v = s.veri;
  const veri: Record<string, unknown> = {};
  const koy = (alan: string, deger: unknown) => { if (deger !== undefined) veri[alan] = deger; };
  koy('ad', v.ad);
  koy('turId', v.turId); koy('tesisId', v.tesisId); koy('sistemId', v.sistemId);
  koy('sahipId', v.sahipId); koy('bolgeId', v.bolgeId);
  koy('hostname', v.hostname); koy('seriNo', v.seriNo);
  koy('uretici', v.uretici); koy('model', v.model);
  koy('ipAdresi', v.ipAdresi); koy('macAdresi', v.macAdresi);
  koy('isletimSistemi', v.isletimSistemi); koy('firmware', v.firmware);
  koy('kritiklik', v.kritiklik); koy('yamaDurumu', v.yamaDurumu);
  koy('edrDurumu', v.edrDurumu); koy('yedekDurumu', v.yedekDurumu);
  koy('izlemeDurumu', v.izlemeDurumu); koy('yasamDongusu', v.yasamDongusu);
  koy('uzaktanErisim', v.uzaktanErisim);
  if (v.eolTarihi !== undefined) veri.eolTarihi = tarihe(v.eolTarihi);
  if (v.eosTarihi !== undefined) veri.eosTarihi = tarihe(v.eosTarihi);
  if (v.destekBitis !== undefined) veri.destekBitis = tarihe(v.destekBitis);
  return veri;
}

export type CommitSonucu = { eklenen: number; guncellenen: number };

/**
 * ONAY → COMMIT. Tüm satırlar TEK transaction içinde yazılır:
 *   · bir satır patlarsa hiçbiri yazılmaz (yarım import yok),
 *   · aktarım kaydı `hata` durumuna düşer ve neden raporJson'a yazılır,
 *   · aynı aktarım ikinci kez onaylanamaz (`durum` kontrolü).
 *
 * Duplicate eşleşmesi ve kapsam commit anında YENİDEN çözülür: yükleme ile
 * onay arasında envanter değişmiş olabilir. Referans id'leri ise önizlemede
 * onaylanan haliyle kullanılır — onaylayan neyi gördüyse o yazılır.
 */
export async function aktarimiUygula(girdi: {
  aktarimId: string;
  onaylayan: AktifKullanici;
  /**
   * Satır yazılmadan hemen önce çağrılır. Tek amacı ATOMİKLİK SÖZLEŞMESİNİN
   * sınanabilmesidir: "ortada patlayan satır → hiçbir şey yazılmamış" iddiası
   * ancak kontrollü bir arıza enjekte edilerek kanıtlanabilir. Üretim
   * çağıranları (lib/eylemler2/varlikAktarim) bu alanı ASLA vermez.
   */
  satirAdimi?: (satir: CozulmusSatir, indeks: number) => void;
}): Promise<CommitSonucu> {
  const { aktarimId, onaylayan } = girdi;
  const kayit = await db.varlikAktarimi.findUnique({ where: { id: aktarimId } });
  if (!kayit) throw new Error('Aktarım bulunamadı');
  // Idempotency: onaylanmış/reddedilmiş aktarım ikinci kez işlenmez.
  if (kayit.durum !== 'dogrulama_bekliyor') {
    throw new Error(`Aktarım onay beklemiyor (durum: ${kayit.durum}) — aynı dosya ikinci kez aktarılamaz`);
  }
  const rapor = raporCoz(kayit.raporJson);
  if (!rapor.ham || rapor.ham.length === 0) {
    throw new Error('Aktarımın ham satırları yok — dosyayı yeniden yükleyin');
  }
  const esleme = kayit.eslemeJson ? (JSON.parse(kayit.eslemeJson) as Esleme) : {};
  const eslemeSorunlari = eslemeDogrula(esleme);
  if (eslemeSorunlari.length > 0) throw new Error(`Kolon eşlemesi geçersiz: ${eslemeSorunlari.join(' · ')}`);

  const kaynakSistem = `dosya:${kayit.dosyaAdi}`;
  const kapsam = kapsamKur(onaylayan);
  const simdi = new Date();

  try {
    const sonuc = await db.$transaction(async (tx) => {
      // Commit anındaki gerçekle yeniden çöz: envanter yükleme sonrası değişmiş olabilir.
      const [referanslar, mevcutlar] = await Promise.all([
        referanslariYukle(tx), mevcutVarliklariYukle(tx),
      ]);
      const cozum = satirlariCoz({
        satirlar: rapor.ham!, esleme, referanslar, mevcutlar, kapsam,
      });

      let eklenen = 0, guncellenen = 0;
      for (const [i, s] of cozum.satirlar.entries()) {
        girdi.satirAdimi?.(s, i);
        let varlikId: string;
        if (s.hedefId) {
          await tx.varlik.update({ where: { id: s.hedefId }, data: guncellemeVerisi(s) });
          varlikId = s.hedefId;
          guncellenen += 1;
        } else {
          const yeni = await tx.varlik.create({ data: yaratmaVerisi(s) as never });
          varlikId = yeni.id;
          eklenen += 1;
        }

        /* Köken: kaydı bir süreç getirdiği için kokenTipi 'otomatik'
           (kokenYaz sabitler), ama guven ÖLÇÜLMEDİ → null ve doğrulama
           durumu 'dogrulanmadi' kalır. `kaynakKayitId` satırın etiketi:
           aynı dosya yeniden aktarılırsa köken çoğalmaz, tazelenir. */
        await kokenYaz({
          varlikTipi: 'Varlik', varlikId,
          kaynakSistem, kaynakKayitId: s.etiket,
          toplanma: simdi, guven: null,
        }, tx);

        await tx.aktiviteKaydi.create({ data: {
          aktorId: onaylayan.id, varlikTipi: 'Varlik', varlikId,
          eylem: s.hedefId ? 'guncelleme' : 'olusturma',
          alan: 'toplu_aktarim', yeniDeger: s.etiket,
          kaynak: 'entegrasyon', korelasyonId: aktarimId, dosyaAdi: kayit.dosyaAdi,
        } });
      }

      await tx.varlikAktarimi.update({ where: { id: aktarimId }, data: {
        durum: 'onaylandi',
        okunan: cozum.sayac.okunan, gecerli: cozum.sayac.gecerli,
        hatali: cozum.sayac.hatali, yinelenen: cozum.sayac.yinelenen,
        eklenen, guncellenen,
        onaylayanId: onaylayan.id, onayZamani: simdi,
        raporJson: JSON.stringify({
          ham: rapor.ham,
          satirlar: cozum.satirlar, hatalar: cozum.hatalar,
          yinelenenler: cozum.yinelenenler, hataMesaji: null,
        } satisfies AktarimRaporu),
      } });

      await tx.aktiviteKaydi.create({ data: {
        aktorId: onaylayan.id, varlikTipi: 'VarlikAktarimi', varlikId: aktarimId,
        eylem: 'onay', alan: 'durum', oncekiDeger: 'dogrulama_bekliyor',
        yeniDeger: `onaylandi (+${eklenen} yeni / ~${guncellenen} güncelleme / ${cozum.sayac.hatali} hata)`,
        kaynak: 'entegrasyon', dosyaAdi: kayit.dosyaAdi,
      } });

      return { eklenen, guncellenen };
    }, { timeout: 120_000, maxWait: 15_000 });

    return sonuc;
  } catch (e) {
    /* Transaction geri alındı: HİÇBİR satır yazılmadı. Hata yutulmaz —
       aktarım `hata` durumuna düşer, neden raporda ve denetim izinde durur. */
    const mesaj = e instanceof Error ? e.message : 'Beklenmeyen hata';
    await db.varlikAktarimi.update({ where: { id: aktarimId }, data: {
      durum: 'hata', eklenen: 0, guncellenen: 0,
      raporJson: JSON.stringify({ ...rapor, hataMesaji: mesaj } satisfies AktarimRaporu),
    } });
    await db.aktiviteKaydi.create({ data: {
      aktorId: onaylayan.id, varlikTipi: 'VarlikAktarimi', varlikId: aktarimId,
      eylem: 'guncelleme', alan: 'durum', oncekiDeger: 'dogrulama_bekliyor',
      yeniDeger: `hata — geri alındı: ${mesaj}`.slice(0, 500),
      kaynak: 'entegrasyon', dosyaAdi: kayit.dosyaAdi,
    } });
    throw new Error(`Aktarım geri alındı, hiçbir satır yazılmadı: ${mesaj}`);
  }
}
