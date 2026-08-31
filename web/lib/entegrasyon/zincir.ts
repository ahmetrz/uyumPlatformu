import 'server-only';
import { db } from '../db';
import { isKos } from '../motorlar/isKosucu';
import { veriKalitesiniIsle } from '../motorlar/veriKalitesi';
import { tesisKapsaminiHesapla } from '../motorlar/uygulanabilirlik';
import { kanitTazeligiIsle } from '../motorlar/kanitTazelik';
import { anlikGoruntuAl } from '../motorlar/anlik';
import { sonTarihleriIsle } from '../motorlar/sonTarih';
import { gapAksiyonIsle } from '../motorlar/gapAksiyon';
import { yedekDogrulamayiIsle } from '../motorlar/yedekDogrulama';
import { topolojiSapmasiniIsle } from '../motorlar/topolojiSapma';
import { olayEtkileriniIsle } from '../motorlar/olayEtki';

/* ════════════════════════════════════════════════════════════════════════
   Motor zinciri (§68 + entegrasyon): entegrasyondan YENİ VERİ geldikten
   sonra MEVCUT motorları doğru sırayla, doğru koşulla tetikleyen ince bir
   orkestrasyon katmanı.

   Burada iş mantığı YOKTUR. Hiçbir motorun içeriği tekrar yazılmaz —
   bu dosya yalnız SIRA + KOŞUL + GÖRÜNÜRLÜK kurar.

   Zincir sırası (istenen akış → mevcut motor karşılığı):

     entegrasyon → normalizasyon     ← zincirin DIŞINDA, adaptör katmanında;
                                       zincir bunlar bittikten sonra çağrılır
     → veri kalitesi                 ← veriKalitesiniIsle   (veri_kalitesi)
     → (ilgiliyse) uygulanabilirlik  ← tesisKapsaminiHesapla (uygulanabilirlik)
     → uyum / kanıt                  ← kanitTazeligiIsle    (kanit_tazelik)
                                       anlikGoruntuAl       (uyum_anlik)
     → risk tespiti                  ← sonTarihleriIsle     (deadline_motoru)
     → yedek / DR                    ← yedekDogrulamayiIsle (yedek_dogrulama)
     → topoloji sapması              ← topolojiSapmasiniIsle (topoloji_sapma)
     → olay etkisi                   ← olayEtkileriniIsle   (olay_etki)
     → gap-to-action → proje adayı   ← gapAksiyonIsle       (gap_to_action)

   NOT (mevcut kabiliyet sınırı): ayrı bir "risk tespit motoru" yok. Zamana
   bağlı risk yüzeye çıkarma (kabul süresi dolan risk, geçmiş hedef tarih,
   biten sertifika/istisna) `sonTarihleriIsle` içinde. Yeni bir risk motoru
   eklenirse ZİNCİR dizisinde tam bu aşamaya girer.
   NOT: "proje adayı" ayrı bir adım değil — `gapAksiyonIsle` adayı zaten
   `durum: 'oneri'` olarak üretir; projeye dönüşüm insan kararıdır.

   ── OTOMASYON GÜVENLİĞİ ───────────────────────────────────────────────
   Zincir ÖNERİR, karar vermez. Hiçbir motor şunları OTOMATİK yapamaz:
     · risk kabulü              · bulgu kapatma
     · uygulanabilirlik override'ı ezme (elIleDegistirildi korunur)
     · güvenlik duvarı / ağ değişikliği
     · PLC/DCS değişikliği      · yama / firmware güncellemesi
     · varlık silme             · topoloji temeli (baseline) kabulü
   Ayrıca detect → correlate → propose → HUMAN APPROVE kuralı: keşif kaydı
   insan onayı olmadan CMDB'ye geçemez, proje adayı 'oneri' durumunda kalır.

   Yazma yapan tek şey motorların kendisidir. Zincir koşu öncesi/sonrası
   bir GÜVENLİK ANLIK GÖRÜNTÜSÜ alır ve YUKARIDAKİLERİN HEPSİNİ ölçer
   (bkz. `OLCULER`); biri ihlal edilirse sonuçta bildirir ve
   `zincir_guvenlik_ihlali` adıyla bir `IsKosusu` satırı bırakır
   (/saglik ekranında görünür). Sessiz geçilmez.
   ══════════════════════════════════════════════════════════════════════ */

// ── Sözleşme ────────────────────────────────────────────────────────────

export type ZincirDegisenleri = {
  varlik?: boolean;   // CMDB'ye varlık yazıldı
  tesis?: boolean;    // yeni tesis / profil değişti → uygulanabilirlik
  kanit?: boolean;    // kanıt eklendi/değişti
  zafiyet?: boolean;
  yedek?: boolean;
  erisim?: boolean;
  topoloji?: boolean;
};

export type ZincirTetigi = {
  /** hangi entegrasyon koşusundan geliyor */
  kosuId?: string | null;
  /** ne değişti — gereksiz motor koşturmamak için */
  degisenler: ZincirDegisenleri;
};

export type AdimDurumu = 'basarili' | 'basarisiz' | 'atlandi';

export type AdimSonucu = {
  /** isKos iş adı — IsKosusu.isAdi ile aynı, /saglik'te bu isimle görünür */
  ad: string;
  /** zincirdeki mantıksal aşama */
  asama: string;
  durum: AdimDurumu;
  /** neden koştu / neden atlandı / hangi hatayla düştü */
  gerekce: string;
  /** isKos'un KosuSonucu dönüşünden — koşmadıysa null */
  islenen: number | null;
  uretilen: number | null;
  sureMs: number | null;
  /** motora özgü ek bilgi (ör. override yüzünden atlanan karar sayısı) */
  not?: string;
};

export type ZincirSonucu = {
  /** zincirin kendi IsKosusu satırı */
  zincirKosuId: string | null;
  /** tetikleyen entegrasyon koşuları (birleşen tetiklerle birden fazla olabilir) */
  entegrasyonKosuIdleri: string[];
  /** bu koşuda birleştirilen tetik sayısı (yeniden giriş birleştirmesi) */
  birlestirilenTetik: number;
  baslangic: string;
  bitis: string;
  sureMs: number;
  degisenler: ZincirDegisenleri;
  adimlar: AdimSonucu[];
  /** başarıyla koşan motorlar */
  kosan: string[];
  /** hata alan motorlar — zincir kesilmedi, IsKosusu'na yazıldı */
  basarisiz: string[];
  /** koşulu tutmadığı ya da isKos çakışma koruması yüzünden koşmayanlar */
  atlanan: string[];
  /** karşılığı olan motoru bulunmayan değişiklik bayrakları (sessiz yutulmaz) */
  kapsanmayanDegisiklikler: string[];
  /** otomasyon sınırı ihlali tespit edildiyse — normalde boş */
  otomasyonIhlalleri: string[];
  /** zincirin kendi defter tutma hataları (IsKosusu yazamama vb.) — yutulmaz */
  zincirHatalari: string[];
};

// ── Zincir tanımı: sıra + koşul + gerekçe ───────────────────────────────

const DEGISIKLIK_ANAHTARLARI = [
  'varlik', 'tesis', 'kanit', 'zafiyet', 'yedek', 'erisim', 'topoloji',
] as const;

/** Motor karşılığı olmayan değişiklik bayrakları — zincir bunları sessizce
    yutmaz, sonuçta `kapsanmayanDegisiklikler` olarak bildirir.

    `yedek` ve `topoloji` bu listeden ÇIKTI: karşılıkları artık
    `yedek_dogrulama` ve `topoloji_sapma` motorları. `erisim` kaldı —
    tedarikçi erişim oturumu bugün yalnız kayıt olarak durur, ondan kural
    işleten bir motor yoktur ve olmadığını söylemek onu sessizce yutmaktan
    iyidir. */
const MOTORSUZ_DEGISIKLIKLER: Partial<Record<keyof ZincirDegisenleri, string>> = {
  erisim: 'tedarikçi erişim oturumu: kayıtlı motor yok — oturum kaydı '
    + 'saklanır ve /tedarikciler ekranında görünür, ama ondan kural işleten '
    + 'bir motor bulunmuyor',
};

type AdimTanimi = {
  ad: string;
  asama: string;
  /** bu adımı hangi değişiklik tetikler — koşul ve GEREKÇESİ birlikte */
  tetikleyenler: (keyof ZincirDegisenleri)[];
  neden: string;
  is: (bag: AdimBaglami) => Promise<{ islenen: number; uretilen: number }>;
};

type AdimBaglami = { not: (metin: string) => void };

/** SIRA BOZULMAZ. Dizinin sırası zincirin sırasıdır; özellikle
    `veri_kalitesi` her koşulda `gap_to_action`tan ÖNCE gelir. */
const ZINCIR: AdimTanimi[] = [
  {
    ad: 'veri_kalitesi',
    asama: 'veri kalitesi',
    tetikleyenler: ['varlik', 'tesis', 'kanit'],
    neden: 'Kuralları yalnız Varlık (sahipsiz kritik varlık, kritikliği bilinmeyen), '
      + 'Tesis (eksik profil, boş envanter) ve Kanıt (sahipsiz kanıt) üzerinde çalışır. '
      + 'Zafiyet/yedek/erişim/topoloji bu kuralların hiçbirini beslemez. '
      + 'gap_to_action bu motorun çıktısını görebilsin diye zincirde ÖNCE koşar.',
    is: () => veriKalitesiniIsle(),
  },
  {
    ad: 'uygulanabilirlik',
    asama: 'uygulanabilirlik',
    tetikleyenler: ['tesis'],
    neden: 'Kapsam kararı YALNIZ tesis profiline ve kuruluGucMw alanına bağlı. '
      + 'CMDB\'ye varlık yazılması profili değiştirmez — bu yüzden sadece varlık '
      + 'değiştiyse bu motor KOŞMAZ (gereksiz yeniden hesaplama + gereksiz '
      + 'AktiviteKaydi üretmez).',
    is: async (bag) => {
      const tesisler = await db.tesis.findMany({
        where: { durum: 'aktif' }, select: { id: true } });
      let islenen = 0, uretilen = 0, override = 0;
      for (const t of tesisler) {
        // aktorId = null: otomatik koşu, insan aktörü yok (denetim izi 'is_kosusu')
        const s = await tesisKapsaminiHesapla(t.id, null);
        islenen++;
        uretilen += s.hesaplanan;
        override += s.atlanianOverride;
      }
      if (override > 0)
        bag.not(`${override} karar el ile değiştirildiği için DOKUNULMADI (elIleDegistirildi)`);
      return { islenen, uretilen };
    },
  },
  {
    ad: 'kanit_tazelik',
    asama: 'uyum / kanıt',
    tetikleyenler: ['kanit'],
    neden: 'Süresi geçmiş kanıtları tarar; yalnız kanıt eklenmesi/değişmesi '
      + 'girdisini değiştirir. Durum alanına DOKUNMAZ, sadece bayat işaretler.',
    is: () => kanitTazeligiIsle(),
  },
  {
    ad: 'uyum_anlik',
    asama: 'uyum / kanıt',
    tetikleyenler: ['kanit', 'tesis'],
    neden: 'Anlık görüntü MaddeDurumu durum+guven dağılımını dondurur. Bu dağılımı '
      + 'yalnız kanıt tazeliği (guven=bayat_kanit) ve kapsam kararı (tesis) '
      + 'değiştirir; bu yüzden kanit_tazelik ve uygulanabilirlik ADIMLARINDAN SONRA '
      + 'koşar. Motor zaten günde bir kez yazar, tekrar çağrı zararsızdır.',
    is: () => anlikGoruntuAl(),
  },
  {
    ad: 'deadline_motoru',
    asama: 'risk tespiti',
    tetikleyenler: ['varlik', 'zafiyet'],
    neden: 'Motor zaman tabanlı ve zamanlanmış koşuda zaten günlük çalışıyor. '
      + 'Zincir onu YENİ VERİNİN yarattığı son-tarih kaynakları için çağırır: '
      + 'varlıkla gelen sertifikalar, zafiyet akışından açılan bulgu/aksiyonlar. '
      + 'Kanıt/tesis değişimi yeni son tarih üretmez → tetiklemez.',
    is: () => sonTarihleriIsle(),
  },
  {
    ad: 'yedek_dogrulama',
    asama: 'yedek / DR',
    tetikleyenler: ['yedek', 'varlik'],
    neden: 'Yedek metadata\'sı geldiğinde kritik varlıkta eksik/bayat yedek, '
      + 'doğrulanmamış yedek ve "son bilinen iyi" boşluğu yeniden ölçülür. '
      + 'Varlık değişimi de tetikler: yeni kritik varlık, yedeği olmayan bir '
      + 'varlıktır. Motor yedek ALMAZ, yalnız metadata üzerinden kural işletir.',
    is: () => yedekDogrulamayiIsle(),
  },
  {
    ad: 'topoloji_sapma',
    asama: 'topoloji',
    tetikleyenler: ['topoloji'],
    neden: 'Yeni topoloji gözlemi onaylı temel (baseline) ile karşılaştırılır. '
      + 'Sapma yalnız RAPORLANIR — ağ/güvenlik duvarı yapılandırması '
      + 'platformdan DEĞİŞTİRİLMEZ, düzeltme değişiklik sürecinden geçer.',
    is: () => topolojiSapmasiniIsle(),
  },
  {
    ad: 'olay_etki',
    asama: 'olay etkisi',
    tetikleyenler: ['varlik', 'tesis'],
    neden: 'Etki önerisi VARLIK → SİSTEM → SÜREÇ → TESİS zincirini yürür; '
      + 'zincirin girdileri varlık kayıtları ve santral profilidir. Yeni CMDB '
      + 'verisi geldiğinde "bilinmiyor" kalan etki alanları çözülebilir hâle '
      + 'gelir. Motor yalnız ÖNERİ yazar; olayın etki alanlarını doldurmak '
      + 'insanın kararıdır (etkiDogrulayanId).',
    is: () => olayEtkileriniIsle(),
  },
  {
    ad: 'gap_to_action',
    asama: 'gap-to-action → proje adayı',
    tetikleyenler: ['varlik', 'tesis', 'kanit', 'zafiyet'],
    neden: 'Üç kaynağı da yeni veriden beslenir: (a) uyumsuz madde + kritik bulgu '
      + '(kanıt/tesis/zafiyet zinciri), (b) EOS geçmiş kritik varlık (varlık), '
      + '(c) tekrar eden açık bulgu (zafiyet). Zincirin SONUNDA koşar ki veri '
      + 'kalitesi, kapsam ve kanıt tazeliği güncelken karar versin. '
      + 'Ürettiği ProjeAdayi yalnız "oneri" durumundadır — projeye dönüşüm insan kararı.',
    is: () => gapAksiyonIsle(),
  },
];

// ── isKos sarmalayıcısı üzerinden motor koşturma ────────────────────────

/** Motor DOĞRUDAN çağrılmaz: her koşu `isKos` üzerinden geçer, böylece
    IsKosusu satırı, ölü koşu kirası ve çakışma koruması garanti olur.
    `isKos` fırlatmaz — sonucu `KosuSonucu` olarak döndürür; zincir onu
    doğrudan okur (IsKosusu tablosuna ikinci bir sorgu atmaz).

    Üç sonucun zincirdeki anlamı ayrıdır:
      ok:true                → motor koştu, sayaçları rapora geçer
      sebep:'zaten_calisiyor'→ HATA DEĞİL; aynı motor başka bir koşuda
                               (başka süreç/istek) çalışıyor → 'atlandi'
      sebep:'hata'           → motor patladı; IsKosusu'na yazıldı, zincir
                               KESİLMEZ ama sonuçta 'basarisiz' bildirilir */
async function motorKos(tanim: AdimTanimi, tetikNedeni: string): Promise<AdimSonucu> {
  const notlar: string[] = [];
  const sonuc = await isKos(tanim.ad, () => tanim.is({ not: (m) => { notlar.push(m); } }));
  const temel = { ad: tanim.ad, asama: tanim.asama, not: notlar.join('; ') || undefined };

  if (sonuc.ok)
    return { ...temel, durum: 'basarili', gerekce: tetikNedeni,
      islenen: sonuc.islenen, uretilen: sonuc.uretilen, sureMs: sonuc.sureMs };

  if (sonuc.sebep === 'zaten_calisiyor')
    return { ...temel, durum: 'atlandi', islenen: null, uretilen: null, sureMs: null,
      gerekce: 'aynı motor başka bir koşuda çalışıyor (isKos çakışma koruması) — '
        + 'hata değil, bu koşuda atlandı' };

  return { ...temel, durum: 'basarisiz', islenen: null, uretilen: null, sureMs: null,
    gerekce: `hata: ${sonuc.hata} (IsKosusu satırına yazıldı, /saglik'te görünür)` };
}

// ── Otomasyon güvenlik ağı ──────────────────────────────────────────────

/* ── Otomasyon sınırının ÖLÇÜLEBİLİR tanımı ─────────────────────────────
   Bir kural ancak ölçülüyorsa kuraldır. Bu anlık görüntü, motorların
   OTOMATİK OLARAK YAPAMAYACAĞI sekiz şeyin her biri için bir ölçü taşır.

   Önceki sürüm yalnız ÜÇÜNÜ ölçüyordu (risk kabulü, bulgu kapatma,
   uygulanabilirlik override'ı). Kalan beşi — güvenlik duvarı/ağ değişikliği,
   PLC/DCS değişikliği, yama/firmware güncellemesi, varlık silme, topoloji
   temeli (baseline) kabulü — yorumda "yapılmaz" diye yazılıydı ama HİÇBİR
   YERDE ölçülmüyordu: bir motor yarın bunlardan birini yapmaya başlasa
   zincir bunu fark etmeden 'basarili' kapanırdı.

   Ölçüler iki türlüdür:
     · SAYIM  — yalnız ARTIŞ ihlaldir (azalma meşru olabilir: kabul süresi
                dolan risk `sonTarih` motorunca 'acik'a çevrilir).
     · İMZA   — HER DEĞİŞİKLİK ihlaldir (içerik ezilmesini yakalar).      */

export type GuvenlikAnligi = {
  /* insan kararı gerektiren durum geçişleri */
  kabulEdilenRisk: number;
  kapaliBulgu: number;
  kabulEdilenSapma: number;
  onayliTopolojiTemeli: number;
  onaylanmisKesif: number;
  oneriDisiProjeAdayi: number;
  /* CMDB / saha gerçeğine dokunan değişiklikler */
  varlikSayisi: number;
  silinmisVarlik: number;
  /* içerik imzaları */
  elIleKararImzasi: string;
  agGecidiImzasi: string;
  otVarlikImzasi: string;
};

type OlcuTanimi = {
  alan: keyof GuvenlikAnligi;
  /** 'artis' = yalnız büyümesi ihlal · 'imza' = her değişiklik ihlal */
  tur: 'artis' | 'imza';
  ihlal: string;
};

/** Ölçü → ihlal cümlesi. Yeni bir yasak eklenince BURAYA satır eklenir;
    karşılaştırma jenerik olduğu için başka hiçbir yer değişmez. */
const OLCULER: OlcuTanimi[] = [
  { alan: 'kabulEdilenRisk', tur: 'artis', ihlal: 'Otomatik RİSK KABULÜ' },
  { alan: 'kapaliBulgu', tur: 'artis', ihlal: 'Otomatik BULGU KAPATMA' },
  { alan: 'kabulEdilenSapma', tur: 'artis',
    ihlal: 'Otomatik TOPOLOJİ SAPMASI KABULÜ (sapma yalnız raporlanır)' },
  { alan: 'onayliTopolojiTemeli', tur: 'artis',
    ihlal: 'Otomatik TOPOLOJİ TEMELİ (baseline) KABULÜ' },
  { alan: 'onaylanmisKesif', tur: 'artis',
    ihlal: "Otomatik KEŞİF ONAYI — keşif kaydı insan onayı olmadan CMDB'ye geçemez" },
  { alan: 'oneriDisiProjeAdayi', tur: 'artis',
    ihlal: "Otomatik ÖNERİ TERFİSİ — proje adayı 'oneri' durumunda kalmalı" },
  { alan: 'varlikSayisi', tur: 'artis',
    ihlal: 'Otomatik VARLIK YARATMA — CMDB yazımı insan kararıdır' },
  { alan: 'silinmisVarlik', tur: 'artis', ihlal: 'Otomatik VARLIK SİLME' },
  { alan: 'elIleKararImzasi', tur: 'imza',
    ihlal: 'UYGULANABİLİRLİK OVERRIDE EZİLDİ (elIleDegistirildi=true kayıtlar değişti)' },
  { alan: 'agGecidiImzasi', tur: 'imza',
    ihlal: 'AĞ / GÜVENLİK DUVARI YAPILANDIRMASI DEĞİŞTİ (zone-to-zone geçit kaydı) '
      + '— platform ağ değiştirmez, yalnız sapmayı raporlar' },
  { alan: 'otVarlikImzasi', tur: 'imza',
    ihlal: 'VARLIK KONFİGÜRASYONU DEĞİŞTİ (firmware / sürüm / yama durumu / '
      + 'ağ bölgesi / IP / yaşam döngüsü) — PLC/DCS ve yama değişikliği '
      + 'platformdan YAPILMAZ, değişiklik sürecinden geçer' },
];

/** Sayıya sığmayan ölçüler için kararlı içerik imzası. */
const imza = (satirlar: unknown[]): string => JSON.stringify(satirlar);

/** Zincirin ASLA yapmaması gereken şeylerin ölçüsü. Koşu öncesi ve sonrası
    karşılaştırılır; fark varsa bu bir OTOMASYON SINIRI İHLALİDİR. */
export async function guvenlikAnligiAl(): Promise<GuvenlikAnligi> {
  const [
    kabulEdilenRisk, kapaliBulgu, kabulEdilenSapma, onayliTopolojiTemeli,
    onaylanmisKesif, oneriDisiProjeAdayi, varlikSayisi, silinmisVarlik,
    kararlar, gecitler, varliklar,
  ] = await Promise.all([
    db.risk.count({ where: { durum: 'kabul_edildi' } }),
    db.bulgu.count({ where: { durum: { in: ['kapali', 'kabul_edildi'] } } }),
    db.topolojiSapmasi.count({ where: { durum: 'kabul' } }),
    db.topolojiAnlik.count({ where: { temelMi: true } }),
    db.kesifKaydi.count({ where: { durum: 'onaylandi' } }),
    db.projeAdayi.count({ where: { durum: { not: 'oneri' } } }),
    db.varlik.count(),
    db.varlik.count({ where: { silindi: { not: null } } }),
    db.uygulanabilirlikKarari.findMany({
      where: { elIleDegistirildi: true },
      select: { id: true, uygulanabilir: true, gerekce: true, elIleDegistirildi: true },
      orderBy: { id: 'asc' } }),
    /* Güvenlik duvarı / ağ geçidi: kontrol varlığı, protokoller ve ONAY
       bayrağı birlikte imzalanır — bir kuralın "onaylandı" olması insan
       kararıdır, motorun değil. */
    db.agGeciti.findMany({
      select: {
        id: true, kaynakBolgeId: true, hedefBolgeId: true,
        kontrolVarligi: true, protokoller: true, onaylandi: true,
      },
      orderBy: { id: 'asc' } }),
    /* PLC/DCS + yama/firmware: sahadaki cihazın kimliğini ve bakım
       durumunu belirleyen alanlar. Bunlardan biri motor koşusunda
       değiştiyse platform sahaya dokunmuş demektir. */
    db.varlik.findMany({
      select: {
        id: true, firmware: true, surum: true, isletimSistemi: true,
        yamaDurumu: true, yasamDongusu: true, bolgeId: true,
        ipAdresi: true, macAdresi: true, silindi: true,
      },
      orderBy: { id: 'asc' } }),
  ]);
  return {
    kabulEdilenRisk, kapaliBulgu, kabulEdilenSapma, onayliTopolojiTemeli,
    onaylanmisKesif, oneriDisiProjeAdayi, varlikSayisi, silinmisVarlik,
    elIleKararImzasi: imza(kararlar),
    agGecidiImzasi: imza(gecitler),
    otVarlikImzasi: imza(varliklar),
  };
}

export function guvenlikKarsilastir(once: GuvenlikAnligi, sonra: GuvenlikAnligi): string[] {
  const ihlaller: string[] = [];
  for (const o of OLCULER) {
    const a = once[o.alan];
    const b = sonra[o.alan];
    if (o.tur === 'artis') {
      if ((b as number) > (a as number)) ihlaller.push(`${o.ihlal}: ${a} → ${b}`);
    } else if (a !== b) {
      ihlaller.push(o.ihlal);
    }
  }
  return ihlaller;
}

/** Testler ve teşhis için: hangi otomasyon sınırının ölçüldüğü, salt okunur. */
export const GUVENLIK_OLCULERI = OLCULER.map((o) => ({ ...o }));

// ── Yeniden giriş: seri kuyruk + tek slot birleştirme ───────────────────
/* KARAR: "atlamak" DEĞİL, "beklemek" seçildi — ama kuyruk derinliği 1'de
   sabitlenip birleştirilerek.

   Neden atlamak değil: motorlar tam tarama yapıyor. Zincir A koşarken gelen
   yeni veri için zincir B atlanırsa, A o veriyi ilgilendiren adımı ÇOKTAN
   geçmiş olabilir → veri sessizce işlenmeden kalır. Bu, "sessiz hata yasak"
   ilkesinin ihlali olur.

   Neden sınırsız kuyruk değil: n tetik n tam tarama demek. Bunun yerine
   koşu sürerken gelen TÜM tetikler tek bir bekleyen koşuda birleştirilir
   (degisenler bayrakları OR'lanır, kosuId'ler biriktirilir). Böylece kuyruk
   derinliği en fazla 1'dir ve bekleyen koşu, o ana kadar gelen tüm verinin
   üstünde çalışır — hiçbir tetik kaybolmaz, tarama sayısı patlamaz.

   Kapsam: bu kilit SÜREÇ İÇİDİR. Süreçler arası koruma `isKos`un veritabanı
   düzeyindeki 'calisiyor' kontrolüyle sağlanır (aynı motor iki süreçte aynı
   anda koşmaz); orada zincir adımı 'atlandi' olarak raporlanır. */

type IcTetik = { kosuIdleri: string[]; degisenler: ZincirDegisenleri; birlesen: number };

let zincirCalisiyor = false;
let bekleyen: IcTetik | null = null;
let bekleyenCozucular: ((s: ZincirSonucu) => void)[] = [];

function birlestir(a: IcTetik, b: IcTetik): IcTetik {
  const degisenler: ZincirDegisenleri = {};
  for (const k of DEGISIKLIK_ANAHTARLARI)
    if (a.degisenler[k] || b.degisenler[k]) degisenler[k] = true;
  return {
    kosuIdleri: [...new Set([...a.kosuIdleri, ...b.kosuIdleri])],
    degisenler,
    birlesen: a.birlesen + b.birlesen,
  };
}

function icTetigeCevir(t: ZincirTetigi): IcTetik {
  const degisenler: ZincirDegisenleri = {};
  for (const k of DEGISIKLIK_ANAHTARLARI) if (t.degisenler?.[k]) degisenler[k] = true;
  return { kosuIdleri: t.kosuId ? [t.kosuId] : [], degisenler, birlesen: 1 };
}

/** Entegrasyondan yeni veri geldikten sonra mevcut motor zincirini tetikler.
    Yeniden girişe kapalıdır: koşu sürerken gelen çağrılar tek bir bekleyen
    koşuda birleşir ve o koşunun sonucunu alır. */
export async function zinciriCalistir(t: ZincirTetigi): Promise<ZincirSonucu> {
  const ic = icTetigeCevir(t);
  if (!zincirCalisiyor) {
    zincirCalisiyor = true;
    return kuyrukluYurut(ic);
  }
  bekleyen = bekleyen ? birlestir(bekleyen, ic) : ic;
  return new Promise<ZincirSonucu>((coz) => { bekleyenCozucular.push(coz); });
}

async function kuyrukluYurut(ic: IcTetik): Promise<ZincirSonucu> {
  let sonuc: ZincirSonucu;
  try {
    sonuc = await yurut(ic);
  } catch (e) {
    // yurut() tasarım gereği fırlatmaz; yine de kilit burada kalmasın diye yakalanır
    sonuc = beklenmedikSonuc(ic, e);
  }
  const siradaki = bekleyen;
  const cozucular = bekleyenCozucular;
  bekleyen = null;
  bekleyenCozucular = [];
  if (siradaki) {
    void kuyrukluYurut(siradaki).then(
      (s) => { for (const c of cozucular) c(s); },
      (e) => { // ulaşılamaz olmalı; kilidi bırak ve bekleyenleri hatayla çöz
        zincirCalisiyor = false;
        const acil = beklenmedikSonuc(siradaki, e);
        for (const c of cozucular) c(acil);
      },
    );
  } else {
    zincirCalisiyor = false;
  }
  return sonuc;
}

// ── Zincirin kendisi ────────────────────────────────────────────────────

async function yurut(ic: IcTetik): Promise<ZincirSonucu> {
  const basladi = Date.now();
  const baslangic = new Date();

  const zincirHatalari: string[] = [];
  const mesaj = (e: unknown) => (e instanceof Error ? e.message : String(e));

  const guvenlikOnce = await guvenlikAnligiAl();

  const adimlar: AdimSonucu[] = [];
  for (const tanim of ZINCIR) {
    const tetikleyen = tanim.tetikleyenler.filter((k) => ic.degisenler[k]);
    if (tetikleyen.length === 0) {
      adimlar.push({
        ad: tanim.ad, asama: tanim.asama, durum: 'atlandi',
        islenen: null, uretilen: null, sureMs: null,
        gerekce: `koşul tutmadı — bu adımı ${tanim.tetikleyenler.join('/')} `
          + `değişikliği tetikler. ${tanim.neden}`,
      });
      continue;
    }
    // BİR MOTORUN HATASI ZİNCİRİ KESMEZ: isKos hatayı IsKosusu'na yazar,
    // biz sonucu okuyup rapora geçer ve SIRADAKİ adıma devam ederiz.
    adimlar.push(await motorKos(tanim, `tetikleyen değişiklik: ${tetikleyen.join(', ')}`));
  }

  const guvenlikSonra = await guvenlikAnligiAl();
  const otomasyonIhlalleri = guvenlikKarsilastir(guvenlikOnce, guvenlikSonra);
  if (otomasyonIhlalleri.length > 0) {
    // Sessizce geçilmez: /saglik ekranında başarısız koşu olarak görünür.
    try {
      await db.isKosusu.create({ data: {
        isAdi: 'zincir_guvenlik_ihlali', durum: 'basarisiz',
        bitis: new Date(), sureMs: Date.now() - basladi,
        hata: `OTOMASYON SINIRI İHLALİ — ${otomasyonIhlalleri.join(' | ')}`,
      } });
    } catch (e) {
      zincirHatalari.push(`güvenlik ihlali kaydı yazılamadı: ${mesaj(e)}`);
    }
  }

  const kapsanmayanDegisiklikler: string[] = [];
  for (const k of DEGISIKLIK_ANAHTARLARI) {
    if (!ic.degisenler[k]) continue;
    const aciklama = MOTORSUZ_DEGISIKLIKLER[k];
    if (aciklama && !ZINCIR.some((a) => a.tetikleyenler.includes(k)))
      kapsanmayanDegisiklikler.push(`${k}: ${aciklama}`);
  }

  const kosan = adimlar.filter((a) => a.durum === 'basarili').map((a) => a.ad);
  const basarisiz = adimlar.filter((a) => a.durum === 'basarisiz').map((a) => a.ad);
  const atlanan = adimlar.filter((a) => a.durum === 'atlandi').map((a) => a.ad);
  const bitis = new Date();
  const sureMs = Date.now() - basladi;

  // Zincirin kendi koşu satırı: /saglik'te orkestrasyon da görünür.
  // BİTMİŞ olarak yazılır ('calisiyor' satırı hiç açılmaz): bu satır KİLİT
  // DEĞİL, yalnız görünürlük. Kilit = yukarıdaki süreç içi kuyruk + motor
  // başına isKos'un kendi çakışma koruması/kirası. Açık satır bırakmadığımız
  // için süreç ortasında ölse bile asılı 'calisiyor' zincir satırı kalmaz.
  let zincirKosuId: string | null = null;
  {
    const notlar = [
      basarisiz.length > 0 ? `başarısız motor: ${basarisiz.join(', ')}` : '',
      otomasyonIhlalleri.length > 0 ? `OTOMASYON İHLALİ: ${otomasyonIhlalleri.join(' | ')}` : '',
      kapsanmayanDegisiklikler.length > 0
        ? `karşılıksız değişiklik: ${kapsanmayanDegisiklikler.join(' | ')}` : '',
    ].filter(Boolean).join(' — ');
    try {
      const satir = await db.isKosusu.create({ data: {
        isAdi: 'entegrasyon_zinciri',
        durum: basarisiz.length > 0 || otomasyonIhlalleri.length > 0 ? 'basarisiz' : 'basarili',
        baslangic, bitis, sureMs, islenen: adimlar.length, uretilen: kosan.length,
        hata: notlar || null,
      } });
      zincirKosuId = satir.id;
    } catch (e) {
      // Defter tutulamadıysa sessizce geçilmez: sonuçta bildirilir.
      zincirHatalari.push(`zincir koşu satırı yazılamadı: ${mesaj(e)}`);
    }
  }

  return {
    zincirKosuId,
    entegrasyonKosuIdleri: ic.kosuIdleri,
    birlestirilenTetik: ic.birlesen,
    baslangic: baslangic.toISOString(),
    bitis: bitis.toISOString(),
    sureMs,
    degisenler: ic.degisenler,
    adimlar, kosan, basarisiz, atlanan,
    kapsanmayanDegisiklikler,
    otomasyonIhlalleri,
    zincirHatalari,
  };
}

function beklenmedikSonuc(ic: IcTetik, e: unknown): ZincirSonucu {
  const an = new Date().toISOString();
  const metin = `zincir beklenmedik hata: ${e instanceof Error ? e.message : String(e)}`;
  return {
    zincirKosuId: null,
    entegrasyonKosuIdleri: ic.kosuIdleri,
    birlestirilenTetik: ic.birlesen,
    baslangic: an, bitis: an, sureMs: 0,
    degisenler: ic.degisenler,
    adimlar: [{
      ad: 'entegrasyon_zinciri', asama: 'zincir', durum: 'basarisiz',
      gerekce: metin, islenen: null, uretilen: null, sureMs: null,
    }],
    kosan: [], basarisiz: ['entegrasyon_zinciri'], atlanan: [],
    kapsanmayanDegisiklikler: [],
    otomasyonIhlalleri: [],
    zincirHatalari: [metin],
  };
}

/** Test/teşhis için: zincirin şu an koşup koşmadığı ve kuyruk durumu. */
export function zincirDurumu(): { calisiyor: boolean; bekleyenVar: boolean } {
  return { calisiyor: zincirCalisiyor, bekleyenVar: bekleyen !== null };
}

/** Zincirin sıra + koşul tablosu (dokümantasyon/teşhis amaçlı, salt okunur). */
export const ZINCIR_SIRASI = ZINCIR.map((a) => ({
  ad: a.ad, asama: a.asama, tetikleyenler: [...a.tetikleyenler], neden: a.neden,
}));
