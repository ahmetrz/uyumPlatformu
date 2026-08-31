import 'server-only';
import { db } from '../db';
import { isKos } from '../motorlar/isKosucu';
import { veriKalitesiniIsle } from '../motorlar/veriKalitesi';
import { tesisKapsaminiHesapla } from '../motorlar/uygulanabilirlik';
import { kanitTazeligiIsle } from '../motorlar/kanitTazelik';
import { anlikGoruntuAl } from '../motorlar/anlik';
import { sonTarihleriIsle } from '../motorlar/sonTarih';
import { gapAksiyonIsle } from '../motorlar/gapAksiyon';

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
     → gap-to-action → proje adayı   ← gapAksiyonIsle       (gap_to_action)

   NOT (mevcut kabiliyet sınırı): ayrı bir "risk tespit motoru" yok. Zamana
   bağlı risk yüzeye çıkarma (kabul süresi dolan risk, geçmiş hedef tarih,
   biten sertifika/istisna) `sonTarihleriIsle` içinde. Yeni bir risk motoru
   eklenirse ZİNCİR dizisinde tam bu aşamaya girer.
   NOT: "proje adayı" ayrı bir adım değil — `gapAksiyonIsle` adayı zaten
   `durum: 'oneri'` olarak üretir; projeye dönüşüm insan kararıdır.

   ── OTOMASYON GÜVENLİĞİ ───────────────────────────────────────────────
   Zincir ÖNERİR, karar vermez. Bu dosya hiçbir yerde:
     · risk kabul etmez        · bulgu kapatmaz
     · uygulanabilirlik kararını ezmez (elIleDegistirildi korumasına saygı)
   Yazma yapan tek şey motorların kendisidir. Zincir ek olarak koşu öncesi/
   sonrası bir GÜVENLİK ANLIK GÖRÜNTÜSÜ alır; bu sınırlardan biri ihlal
   edilirse sonuçta bildirir ve `zincir_guvenlik_ihlali` adıyla bir
   `IsKosusu` satırı bırakır (/saglik ekranında görünür). Sessiz geçilmez.
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
    yutmaz, sonuçta `kapsanmayanDegisiklikler` olarak bildirir. */
const MOTORSUZ_DEGISIKLIKLER: Partial<Record<keyof ZincirDegisenleri, string>> = {
  yedek: 'yedek/DR gözlemi: kayıtlı motor yok '
    + '(ProjeAdayi.kaynak "yedek_dr" şemada tanımlı ama üreten motor yok)',
  erisim: 'tedarikçi erişim oturumu: kayıtlı motor yok',
  topoloji: 'topoloji sapması: kayıtlı motor yok',
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

type GuvenlikAnligi = {
  kabulEdilenRisk: number;
  kapaliBulgu: number;
  elIleKararImzasi: string;
};

/** Zincirin ASLA yapmaması gereken üç şeyin ölçüsü. Koşu öncesi ve sonrası
    karşılaştırılır; fark varsa bu bir OTOMASYON SINIRI İHLALİDİR. */
async function guvenlikAnligiAl(): Promise<GuvenlikAnligi> {
  const [kabulEdilenRisk, kapaliBulgu, kararlar] = await Promise.all([
    db.risk.count({ where: { durum: 'kabul_edildi' } }),
    db.bulgu.count({ where: { durum: { in: ['kapali', 'kabul_edildi'] } } }),
    db.uygulanabilirlikKarari.findMany({
      where: { elIleDegistirildi: true },
      select: { id: true, uygulanabilir: true, gerekce: true, elIleDegistirildi: true },
      orderBy: { id: 'asc' } }),
  ]);
  return { kabulEdilenRisk, kapaliBulgu, elIleKararImzasi: JSON.stringify(kararlar) };
}

function guvenlikKarsilastir(once: GuvenlikAnligi, sonra: GuvenlikAnligi): string[] {
  const ihlaller: string[] = [];
  if (sonra.kabulEdilenRisk > once.kabulEdilenRisk)
    ihlaller.push(`Otomatik risk kabulü: kabul_edildi risk sayısı `
      + `${once.kabulEdilenRisk} → ${sonra.kabulEdilenRisk}`);
  if (sonra.kapaliBulgu > once.kapaliBulgu)
    ihlaller.push(`Otomatik bulgu kapatma: kapali/kabul_edildi bulgu sayısı `
      + `${once.kapaliBulgu} → ${sonra.kapaliBulgu}`);
  if (sonra.elIleKararImzasi !== once.elIleKararImzasi)
    ihlaller.push('El ile değiştirilmiş uygulanabilirlik kararı ezildi '
      + '(elIleDegistirildi=true kayıtlarda değişiklik)');
  return ihlaller;
}

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

  // Zincirin kendi koşu satırı: /saglik'te orkestrasyon da görünür.
  // (Bu satır KİLİT DEĞİLDİR — sadece görünürlük. Kilit yukarıdaki kuyruk +
  //  motor başına isKos'un kendi çakışma koruması.)
  const zincirHatalari: string[] = [];
  const mesaj = (e: unknown) => (e instanceof Error ? e.message : String(e));
  let zincirKosusu: { id: string } | null = null;
  try {
    zincirKosusu = await db.isKosusu.create({ data: { isAdi: 'entegrasyon_zinciri' } });
  } catch (e) {
    // Defter tutulamadıysa bu sessizce geçilmez: sonuçta bildirilir.
    zincirHatalari.push(`zincir koşu satırı açılamadı: ${mesaj(e)}`);
  }

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

  if (zincirKosusu) {
    const notlar = [
      basarisiz.length > 0 ? `başarısız motor: ${basarisiz.join(', ')}` : '',
      otomasyonIhlalleri.length > 0 ? `OTOMASYON İHLALİ: ${otomasyonIhlalleri.join(' | ')}` : '',
      kapsanmayanDegisiklikler.length > 0
        ? `karşılıksız değişiklik: ${kapsanmayanDegisiklikler.join(' | ')}` : '',
    ].filter(Boolean).join(' — ');
    try {
      await db.isKosusu.update({ where: { id: zincirKosusu.id }, data: {
        durum: basarisiz.length > 0 || otomasyonIhlalleri.length > 0 ? 'basarisiz' : 'basarili',
        bitis, sureMs, islenen: adimlar.length, uretilen: kosan.length,
        hata: notlar || null,
      } });
    } catch (e) {
      zincirHatalari.push(`zincir koşu satırı kapatılamadı: ${mesaj(e)}`);
    }
  }

  return {
    zincirKosuId: zincirKosusu?.id ?? null,
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
