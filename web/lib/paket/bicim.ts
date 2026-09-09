/* ═══ P4 · İÇERİK PAKETİ BİÇİMİ ═══════════════════════════════════════
   `docs/SEKTOR_PAKETI_SOZLESMESI.md` §1–§4'ün koddaki karşılığı. Paket bir
   DİZİNDİR: `manifest.json` + içerik dosyaları. Kod bilmeyen biri
   yazabilsin diye biçim üçtür — JSON (manifest, sözlük, türler,
   öznitelikler, yükümlülükler, roller, form ve rapor şablonu), CSV (madde
   ağacı; Excel'de açılır, UTF-8, `;` ayraç, başlık satırı zorunlu), XLSX
   (form şablonu, 2.2).

   Bu modül SAFTIR: dosya sistemi ve veritabanı bilmez; şemalar ve
   ayrıştırıcılar `dogrula.ts` (okur/doğrular) ile `kur.ts` (yazar)
   tarafından paylaşılır. Şemalar `.strict()`: paket yazarının yazım
   hatası (`tesiseBagli` yerine `tesisebagli`) sessizce yutulmaz. */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Islem, Modul } from '../erisim';
import { DENKLIKLER } from '../sabitler';

export const PAKET_TURLERI = ['sektor', 'yatay', 'demo', 'uluslararasi'] as const;
export const LISANS_TURLERI = ['kamuya_acik', 'telifli'] as const;
export const OZNITELIK_TIPLERI = ['sayi', 'metin', 'mantik', 'tarih'] as const;
export const OZNITELIK_ROLLERI = ['kapasite', 'kritiklik'] as const;
/** Sözlüğün altı hâli — paket hepsini vermek zorundadır (§3 SÖZLÜK). */
export const SOZLUK_HALLERI = ['tekil', 'cogul', 'iyelik', 'belirtme', 'bulunma', 'yonelme'] as const;
export const ZORUNLULUK_TIPLERI = [
  'LAW', 'REGULATION', 'REGULATOR_NOTIFICATION', 'CONTRACT', 'CORPORATE_POLICY',
  'CERTIFICATION', 'BEST_PRACTICE', 'OPTIONAL',
] as const;
export const SIDDETLER = ['dusuk', 'orta', 'yuksek', 'kritik'] as const;
/** `oznitelikler.json` içindeki ölçü alanının ADI — doğrulayıcı mesajları
    alan yolunu bu sabitten yazar (çekirdek sözcük taraması sabit metinde
    çekirdek terim istemez; buradaki JSON anahtarıdır, ekran sözcüğü değil). */
export const OLCU_ALANI = 'birim' as const;

/** Telifli çerçevede `Madde.metin` bu sabittir — metin girilmez (§2). */
export const TELIFLI_METIN = 'lisans nedeniyle girilmedi';
/** Kamuya açık ama metni aktarılmamış maddede `Madde.metin` — "metin girilmedi":
    uydurulmaz, boş bırakılmaz, sıfır sayılmaz; ekran bu hâli TANIR (`maddeMetniDurumu`). */
export const METIN_GELMEDI = 'metin girilmedi';
/** Önceki sabit — kurulu veride kalmış olabilir; okuyucu ikisini de tanır. */
const ESKI_METIN_GELMEDI = 'metin paketle gelmedi';
/** Telifli çerçevede başlık en fazla bu kadar karakter (§2). */
export const BASLIK_SINIRI = 120;
/** Telifli çerçevede `dis_kontrol_id` en fazla bu kadar karakter — kimliktir, metin değil. */
export const DIS_KIMLIK_SINIRI = 60;
/** `kaynak_yeri` (belge içi konum: "Ek-3 · 01-Endüstriyel Ağ Güvenliği · EAG-1") en fazla bu kadar karakter. */
export const KAYNAK_YERI_SINIRI = 200;

/** Ekranın "metin var mı" sorusunun TEK cevabı. `Madde.metin` şemada boş olamaz; yokluk iki
    sabitle taşınır ve sabiti tanımayan ekran onu madde metni gibi basıyordu (ölçüldü:
    süreç çekmecesi "lisans nedeniyle girilmedi"yi metin diye gösteriyor, uyum gerekçesi
    onu tek cümle gerekçe sayıyordu). */
export function maddeMetniDurumu(metin: string | null | undefined): 'var' | 'girilmedi' | 'lisans' {
  const m = (metin ?? '').trim();
  if (m === '' || m === METIN_GELMEDI || m === ESKI_METIN_GELMEDI) return 'girilmedi';
  if (m === TELIFLI_METIN) return 'lisans';
  return 'var';
}

/** Çekirdek kapsam öğesi türleri (şema yorumu `KapsamOgesiTuru.kod`); paket bunlara ek tür
    beyan eder, uygulanabilirlik beyanı ikisine de atıf yapabilir. */
export const CEKIRDEK_KAPSAM_TURLERI = ['tesis', 'kurum', 'sistem', 'is_fonksiyonu', 'dis_hizmet', 'birim', 'veri_kapsami'] as const;
/** Uygulanabilirlik kuralı işleçleri — motorun (`lib/motorlar/uygulanabilirlik.ts`) tanıdığı küme. */
export const KURAL_ISLECLERI = ['=', '!=', '>=', '<=', '>', '<', 'icinde'] as const;
/** Motorun bağlama koyduğu kapsam öğesi TÜRÜ alanı — paket beyanı bu alana `icinde` yazar. */
export const KAPSAM_TURU_ALANI = 'kapsamTuru';

export const SEMVER = /^\d+\.\d+\.\d+$/;
export const PAKET_KODU = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/;
export const CERCEVE_KODU = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/;
export const ULKE_KODU = /^[A-Z]{2}$/;
export const DIL_KODU = /^[a-z]{2}(?:-[A-Z]{2})?$/;
export const ANAHTAR = /^[a-z][A-Za-z0-9]*$/;
export const TUR_KODU = /^[a-z][a-z0-9_]*$/;
export const SHA256_HEX = /^[0-9a-f]{64}$/;

export const LisansSemasi = z.object({
  tur: z.enum(LISANS_TURLERI),
  metinDahil: z.boolean(),
  kaynak: z.string().url().optional(),
  not: z.string().max(300).optional(),
}).strict();
export type Lisans = z.infer<typeof LisansSemasi>;

export const ManifestSemasi = z.object({
  kod: z.string().regex(PAKET_KODU, 'paket kodu BÜYÜK harf, rakam ve tire: TR-ENERJI'),
  ad: z.string().min(3).max(120),
  tur: z.enum(PAKET_TURLERI),
  /** ISO 3166-1 alpha-2; ülke boyutu formatta KALIR (v1 yalnız TR yazar) */
  ulke: z.string().regex(ULKE_KODU, 'ülke ISO 3166-1 alpha-2 (TR)').nullable(),
  sektor: z.object({
    kod: z.string().regex(/^[A-Z][A-Z0-9-]*$/, 'sektör kodu BÜYÜK harf: ELEKTRIK-URETIM'),
    ad: z.string().min(2).max(80),
  }).strict().nullable(),
  dil: z.string().regex(DIL_KODU, 'dil BCP 47: tr, en, tr-TR'),
  surum: z.string().regex(SEMVER, 'sürüm SemVer: 0.1.0'),
  yayinci: z.string().min(2).max(120),
  lisans: LisansSemasi,
  bagimliliklar: z.array(z.string().regex(PAKET_KODU)),
  icerikOzetleri: z.record(z.string(), z.string().regex(SHA256_HEX, 'sha256 onaltılık, 64 karakter')),
  imza: z.string().nullable().optional(),
  aciklama: z.string().max(1000).optional(),
}).strict();
export type Manifest = z.infer<typeof ManifestSemasi>;

const hal = (ad: string) => z.string().trim().min(1, `${ad} hâli boş — altı hâl de zorunlu`);
export const SozlukSatiriSemasi = z.object({
  anahtar: z.string().regex(ANAHTAR, 'anahtar camelCase: kapsamOgesi'),
  dil: z.string().regex(DIL_KODU).default('tr'),
  tekil: hal('tekil'), cogul: hal('çoğul'), iyelik: hal('iyelik'),
  belirtme: hal('belirtme'), bulunma: hal('bulunma'), yonelme: hal('yönelme'),
}).strict();
export type SozlukSatiri = z.infer<typeof SozlukSatiriSemasi>;

export const KapsamTuruSatiriSemasi = z.object({
  kod: z.string().regex(TUR_KODU, 'tür kodu küçük harf ve alt çizgi: kontrol_sistemi'),
  ad: z.string().min(2).max(80),
  etiketAnahtari: z.string().regex(ANAHTAR).nullable().optional(),
  tesiseBagli: z.boolean(),
  sira: z.number().int().min(0),
}).strict();
export type KapsamTuruSatiri = z.infer<typeof KapsamTuruSatiriSemasi>;

export const OznitelikSatiriSemasi = z.object({
  anahtar: z.string().regex(ANAHTAR, 'anahtar camelCase: kabulDurumu'),
  tip: z.enum(OZNITELIK_TIPLERI),
  birim: z.string().max(20).nullable().optional(),
  etiketAnahtari: z.string().regex(ANAHTAR),
  rol: z.enum(OZNITELIK_ROLLERI).nullable().optional(),
  grup: z.string().max(60).nullable().optional(),
  secenekler: z.array(z.object({ deger: z.string().min(1), ad: z.string().min(1) }).strict()).nullable().optional(),
  kuraldaKullanilir: z.boolean().default(false),
  sira: z.number().int().min(0),
}).strict();
export type OznitelikSatiri = z.infer<typeof OznitelikSatiriSemasi>;

/** Takvimde VAR OLAN tarih: biçim yetmez — `2025-02-30` biçime uyar,
    `new Date` onu 2 Mart'a yuvarlar ve yanlış yayım/yürürlük tarihi
    kalıcılaşırdı; `2025-13-01` ise kurulumda Prisma'da patlardı (inceleme
    bulgusu, PR #41). Gidiş-dönüş eşitliği ikisini de yakalar. */
export function takvimTarihi(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
const tarihAlani = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'tarih YYYY-AA-GG')
  .refine(takvimTarihi, 'takvimde olmayan tarih (ör. 2025-02-30, 2025-13-01)').nullable().optional();
/* ── uygulanabilirlik beyanı (§1/9) ────────────────────────────────────
   Çerçeve hangi kapsam öğesi TÜRLERİNE asılır, hangi öznitelik koşuluyla.
   Paket beyan eder, kurucu `UygulanabilirlikKurali` (köken paket) yazar,
   motor karar ÖNERİR; hiçbiri koda gömülmez. Koşul dili motorunkiyle
   aynıdır (herhangi/hepsi · alan · işleç · değer, iç içe). */
export type AlanKosulu = { alan: string; islec: (typeof KURAL_ISLECLERI)[number]; deger: string | number | boolean | string[] };
export type KuralBeyani = { herhangi?: KosulBeyani[]; hepsi?: KosulBeyani[] };
export type KosulBeyani = AlanKosulu | KuralBeyani;
const AlanKosuluSemasi = z.object({
  alan: z.string().regex(ANAHTAR, 'alan camelCase: paketin öznitelik anahtarı ya da kapsamTuru'),
  islec: z.enum(KURAL_ISLECLERI),
  deger: z.union([z.string(), z.number(), z.boolean(), z.array(z.string().min(1)).min(1)]),
}).strict();
export const KuralSemasi: z.ZodType<KuralBeyani> = z.lazy(() => z.object({
  herhangi: z.array(z.union([AlanKosuluSemasi, KuralSemasi])).min(1).optional(),
  hepsi: z.array(z.union([AlanKosuluSemasi, KuralSemasi])).min(1).optional(),
}).strict().refine((k) => (k.herhangi ? 1 : 0) + (k.hepsi ? 1 : 0) === 1, 'kural ya `herhangi` ya `hepsi` taşır, ikisini değil'));
export const UygulanabilirlikBeyaniSemasi = z.object({
  /** çekirdek tür kodu ya da paketin kapsam-turleri.json kodu — doğrulayıcı ikisine de bakar */
  kapsamTurleri: z.array(z.string().regex(TUR_KODU, 'tür kodu küçük harf ve alt çizgi')).min(1, 'en az bir kapsam öğesi türü'),
  /** öznitelik koşulu (ör. `kuruluGuc >= 100`); yoksa yalnız tür bağı */
  kosul: KuralSemasi.nullable().optional(),
  /** dayanak — beyanı hangi madde söylüyor (paketin kendi dilinde bir alıntı) */
  aciklama: z.string().max(500).optional(),
}).strict();
export type UygulanabilirlikBeyani = z.infer<typeof UygulanabilirlikBeyaniSemasi>;
/** Beyandan motor kuralı: kapsam türü `icinde` koşulu VE (varsa) paketin öznitelik koşulu. */
export function beyandanKural(b: UygulanabilirlikBeyani): KuralBeyani {
  return { hepsi: [{ alan: KAPSAM_TURU_ALANI, islec: 'icinde', deger: [...b.kapsamTurleri] }, ...(b.kosul ? [b.kosul] : [])] };
}

export const CerceveKimligiSemasi = z.object({
  kod: z.string().regex(CERCEVE_KODU, 'çerçeve kodu BÜYÜK harf: EPDK-SGYM'),
  ad: z.string().min(3).max(200),
  surumEtiketi: z.string().min(1).max(40),
  yayimTarihi: tarihAlani,
  yururlukTarih: tarihAlani,
  kaynakUrl: z.string().url().nullable().optional(),
  lisans: LisansSemasi,
  /** madde ağacı — bu JSON'la aynı dizinde: CSV (yazar biçimi) ya da OSCAL 1.1 katalog JSON'u (`.oscal.json`, 2.7) */
  maddeDosyasi: z.string().regex(/^[A-Za-z0-9._-]+\.(?:csv|oscal\.json)$/, 'madde dosyası .csv ya da .oscal.json'),
  zorunlulukTipi: z.enum(ZORUNLULUK_TIPLERI).default('REGULATION'),
  /** uygulanabilirlik beyanı (§1/9); yoksa çerçeve tür bağı beyan etmez — kiracı kuralı yazar */
  uygulanabilirlik: UygulanabilirlikBeyaniSemasi.nullable().optional(),
  /** TEMSİLÎ metin: madde metni bir belgeye BENZETİLEREK yazılmıştır, o belgeden alınmamıştır
      (demo içeriği). Beyan alanda durur, yorumda değil: kaynağı olmadığını SÖYLEYEN çerçeve
      köken zorunluluğundan muaftır; söylemeyen çerçeve `kaynakUrl` beyan etmek zorundadır. */
  temsili: z.boolean().optional(),
  not: z.string().max(500).optional(),
}).strict();
export type CerceveKimligi = z.infer<typeof CerceveKimligiSemasi>;

/** Madde CSV sütunları — ilk üçü zorunlu, kalanı isteğe bağlı. */
export const MADDE_ZORUNLU_SUTUNLAR = ['kod', 'ust_kod', 'baslik'] as const;
export const MADDE_SUTUNLARI = [
  ...MADDE_ZORUNLU_SUTUNLAR, 'metin', 'sira', 'seviye', 'zorunluluk_tipi', 'kanit_beklentisi', 'dis_kontrol_id', 'kanit_tipi',
  'kaynak_url', 'kaynak_yeri', 'erisim_tarihi', 'yururluk_tarihi', 'gereksinim_tipi',
] as const;
/** `seviye` = ürünün HEDEF OLGUNLUĞU (0–5 merdiveni, `lib/uyum/olgunluk.ts`) — ekran
    "hedef: Başlangıç" diye okur ve ölçülenle karşılaştırır. Çerçevenin KENDİ kademesi
    (EPDK "Seviye 1/2/3", ISO ek sınıfı) bu değil: `gereksinim_tipi` sütunundadır.
    Ölçüldü (bağımsız inceleme, PR #43 tur 2): EPDK kademesi `seviye`ye yazılınca 508
    zorunlu kontrolün hedefi ürünün en alt üç kademesine çekiliyor ve kişiye bağlı
    ad-hoc uygulama "hedefte" (yeşil) görünüyordu. */
export const GEREKSINIM_TIPI_SINIRI = 60;
/** Köken sütunları (içerik): `kaynak_url` resmî belge adresi · `kaynak_yeri` belge içi konum ·
    `erisim_tarihi` kaynağa erişim günü · `yururluk_tarihi` maddenin kendi yürürlüğü (değişiklik
    tarihi; boşsa çerçevenin yürürlüğü). Metin girilmiş kamuya açık maddede `kaynak_url` ve
    `erisim_tarihi` ZORUNLUDUR (demo paketi kurgusaldır, muaf). */
export const KAYNAK_SUTUNLARI = ['kaynak_url', 'kaynak_yeri', 'erisim_tarihi', 'yururluk_tarihi'] as const;
/** `kanit_tipi` (2.5): maddenin beklediği kanıt TÜRÜNÜN kodu (`kayit`, `konfigurasyon`,
    `test_kaydi`…) — `/ice-aktarim` ile aynı serbest kod; metin değil, ≤ 40 karakter.
    Tohumun `Madde.kanitTipi` değeri paket biçimine kayıpsız taşınsın diye eklendi. */
export const KANIT_TIPI_KODU = /^[a-z][a-z0-9_]{0,39}$/;
export type MaddeSatiri = {
  kod: string; ustKod: string | null; baslik: string; metin: string | null; sira: number;
  seviye: number | null; zorunlulukTipi: string | null; kanitBeklentisi: string | null; disKontrolId: string | null;
  kanitTipi: string | null;
  kaynakUrl: string | null; kaynakYeri: string | null; erisimTarihi: string | null; yururlukTarihi: string | null;
  /** çerçevenin kendi gereksinim sınıfı/kademesi ("Seviye 2", "Ek Kontrol") — hedef olgunluk DEĞİL */
  gereksinimTipi: string | null;
};

export const YukumlulukSatiriSemasi = z.object({
  kod: z.string().min(2).max(60),
  ad: z.string().min(3).max(200),
  /** paket içi ya da kurulu bir çerçevenin kodu; kurulumda doğrulanır */
  regulasyonKod: z.string().regex(CERCEVE_KODU).nullable().optional(),
  asgariSiddet: z.enum(SIDDETLER).default('yuksek'),
  /** saat; belirtilmemiş süre paketle GELMEZ — satır açılmaz (`sureSaat` NOT NULL) */
  sureSaat: z.number().int().positive(),
  dayanak: z.string().min(1).max(300),
  merci: z.string().min(1).max(120),
}).strict();
export type YukumlulukSatiri = z.infer<typeof YukumlulukSatiriSemasi>;

/* ── 2.2 · Form ve rapor şablonu türleri (§1/6–7) ─────────────────────
   Form: `form/<KOD>.json` — bölümler · alanlar (anahtar, etiket, tip,
   seçenekler, madde referansı, XLSX hücresi) ve isteğe bağlı `dosya`
   (aynı dizinde XLSX; doğrulayıcı sayfayı ve hücreleri dosyaya karşı
   okur). Telifli pakette XLSX YASAK: hücre metni denetlenemez, tam metin
   kaçağı olurdu; JSON yapıda etiket ≤ ETIKET_SINIRI.
   Rapor: `rapor/<KOD>.json` — alanlar (anahtar, etiket, kaynak nokta yolu),
   sıralama, künye, sayfa. */
export const FORM_TURLERI = ['denetim', 'oz_degerlendirme', 'saha'] as const;
export const ALAN_TIPLERI = ['metin', 'sayi', 'mantik', 'tarih', 'secim'] as const;
export const SAYFA_BOYUTLARI = ['A4', 'Letter'] as const;
export const SAYFA_YONLERI = ['dikey', 'yatay'] as const;
export const ETIKET_SINIRI = 120;
export const HUCRE_ADRESI = /^[A-Z]{1,3}[1-9][0-9]{0,6}$/;
/** Madde referansı `Madde.kod` biçimindedir: `<ÇERÇEVE>-<madde kodu>` (EPDK-SGYM-3, BDDK-BS-12). */
export const MADDE_REFERANSI = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-[^\s;]+$/;
/** Rapor alanı kaynağı — nokta yolu (`madde.durum`, `kapsamOgesi.ad`). */
export const KAYNAK_YOLU = /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)*$/;

const etiket = z.string().trim().min(1, 'etiket boş').max(ETIKET_SINIRI, `etiket en fazla ${ETIKET_SINIRI} karakter`);
export const FormAlaniSemasi = z.object({
  anahtar: z.string().regex(ANAHTAR, 'anahtar camelCase: politikaVar'),
  etiket,
  tip: z.enum(ALAN_TIPLERI),
  secenekler: z.array(z.object({ deger: z.string().min(1), ad: etiket }).strict()).nullable().optional(),
  maddeKod: z.string().regex(MADDE_REFERANSI, 'madde referansı: <ÇERÇEVE>-<kod> (EPDK-SGYM-3)').nullable().optional(),
  zorunlu: z.boolean().default(false),
  /** XLSX'te bu alanın hücresi — `dosya` varsa zorunlu */
  hucre: z.string().regex(HUCRE_ADRESI, 'hücre adresi A1 biçiminde: B4').nullable().optional(),
}).strict();
export const FormSablonuSemasi = z.object({
  kod: z.string().regex(CERCEVE_KODU, 'form kodu BÜYÜK harf: BDDK-BS-OZDEGERLENDIRME'),
  ad: z.string().min(3).max(200),
  tur: z.enum(FORM_TURLERI).default('denetim'),
  aciklama: z.string().max(500).optional(),
  dosya: z.string().regex(/^[A-Za-z0-9._-]+\.xlsx$/, 'XLSX dosya adı').nullable().optional(),
  /** XLSX'te formun sayfası — `dosya` varsa zorunlu */
  sayfa: z.string().min(1).max(60).nullable().optional(),
  bolumler: z.array(z.object({
    kod: z.string().regex(TUR_KODU, 'bölüm kodu küçük harf ve alt çizgi: genel_bilgi'),
    baslik: etiket,
    alanlar: z.array(FormAlaniSemasi).min(1, 'bölümde en az bir alan'),
  }).strict()).min(1, 'en az bir bölüm'),
}).strict();
export type FormSablonu = z.infer<typeof FormSablonuSemasi>;

export const RaporSablonuSemasi = z.object({
  kod: z.string().regex(CERCEVE_KODU, 'rapor kodu BÜYÜK harf: EPDK-SGYM-KARNE'),
  ad: z.string().min(3).max(200),
  aciklama: z.string().max(500).optional(),
  alanlar: z.array(z.object({
    anahtar: z.string().regex(ANAHTAR), etiket,
    kaynak: z.string().regex(KAYNAK_YOLU, 'kaynak nokta yolu: madde.durum'),
  }).strict()).min(1, 'en az bir alan'),
  /** alan anahtarlarının gösterim sırası — her anahtar alanlarda olmalı */
  siralama: z.array(z.string().regex(ANAHTAR)).min(1),
  kunye: z.object({ baslik: etiket, altbilgi: z.string().max(ETIKET_SINIRI).optional() }).strict(),
  sayfa: z.object({ boyut: z.enum(SAYFA_BOYUTLARI).default('A4'), yon: z.enum(SAYFA_YONLERI).default('dikey') }).strict()
    .default({ boyut: 'A4', yon: 'dikey' }),
}).strict();
export type RaporSablonu = z.infer<typeof RaporSablonuSemasi>;

/* ── 2.3 · Rol kataloğu (§1/8) ─────────────────────────────────────────
   `roller.json` — paket rol ÖNERİR: kod, ad, modül × işlem izinleri,
   kapsam ekseni. Çalışma zamanı yetkisi (`lib/erisim.ts` → ROL_IZINLERI)
   bu kataloğu OKUMAZ: katalog öneri ve ekran içindir, kiracı ezer; koda
   bağlanması P2/P6 kararıdır. Çekirdek rol kodu paketle yeniden
   tanımlanamaz (katalog bir şey, kod başka şey derdi). İzin merdiveni:
   onay yazma ister, yazma okuma ister — çekirdek roller de buna uyar.

   Modül ve işlem listeleri çekirdeğin tipine karşı DERLEMEDE doğrulanır
   (`Record<Modul, true>`: eksik ya da fazla üye tsc'de kırmızı) ve
   çalışma zamanında bekçiyle (`tests/bekci/rol-sabitleri.test.ts`,
   ROL_IZINLERI'ne karşı). `erisim.ts` server-only'dir; yazar aracı (tsx)
   onu yükleyemez — `import type` derlemede silinir. */
const MODUL_KUMESI: Record<Modul, true> = { uyum: true, envanter: true, risk: true, denetim: true, proje: true, tanimlar: true, yonetim: true };
const ISLEM_KUMESI: Record<Islem, true> = { okuma: true, yazma: true, onay: true };
export const MODULLER = Object.keys(MODUL_KUMESI) as readonly Modul[];
export const ISLEMLER = Object.keys(ISLEM_KUMESI) as readonly Islem[];
/** İzin merdiveni: işlem → ön koşulu (onay yazma ister, yazma okuma ister). */
export const ISLEM_ONKOSULU: Record<Islem, Islem | null> = { okuma: null, yazma: 'okuma', onay: 'yazma' };
/** Çekirdek rol kodları — `ROL_IZINLERI` anahtarlarıyla birebir (bekçi). Paket bunları yeniden tanımlayamaz. */
export const CEKIRDEK_ROLLER = [
  'yonetici', 'denetim_sorumlusu', 'tesis_yoneticisi', 'bt_yoneticisi', 'ot_yoneticisi', 'risk_sahibi', 'katkici', 'dis_denetci', 'okuyucu',
] as const;
/** global: yetki kapsamsız verilir · kapsamOgesi: yetki bir kapsam öğesine verilir (`Yetki.kapsamOgesiId`). */
export const KAPSAM_EKSENLERI = ['global', 'kapsamOgesi'] as const;

export const RolSatiriSemasi = z.object({
  kod: z.string().regex(TUR_KODU, 'rol kodu küçük harf ve alt çizgi: ic_kontrol_gorevlisi'),
  ad: z.string().min(2).max(80),
  aciklama: z.string().max(300).optional(),
  /** modül → işlem listesi; bilinmeyen modül ya da işlem BIÇIM */
  izinler: z.partialRecord(z.enum(MODULLER), z.array(z.enum(ISLEMLER)).min(1, 'modülde en az bir işlem')),
  kapsamEkseni: z.enum(KAPSAM_EKSENLERI).default('global'),
  sira: z.number().int().min(0).default(0),
}).strict();
export type RolSatiri = z.infer<typeof RolSatiriSemasi>;

/* ── 2.4 · Eşleme CSV türü (§1/4 · §4 "müşterinin eşlemeleri ezilmez") ──
   `esleme/<KOD>.json` kimlik + `esleme/<KOD>.csv` satırlar. Eşleme
   çerçeveler ARASIDIR: kaynak ve hedef çerçeve + sürüm etiketi kimlikte
   durur; satır yalnız madde KODU taşır (`kaynak_kod;hedef_kod;denklik;
   aciklama`). Metin taşıyabilen tek sütun `aciklama`dır: sınırlıdır ve
   yalnız `lisans.metinDahil=true` iken, telifli olmayan pakette ve telifli
   olmayan çerçevelere karşı dolabilir (aksi LİSANS). Yapı kusurları (tekrar
   başlık, başlığı aşan dolu hücre) lisans kontrolünden ÖNCE reddedilir —
   okunmayan hücre içerik taşır (PR #41 birinci turda düzeltilen kalıp).
   R6 (`iliskiTuru · guc · kaynakBelge`) bu biçimi genişletir, değiştirmez. */
export const ESLEME_ZORUNLU_SUTUNLAR = ['kaynak_kod', 'hedef_kod', 'denklik'] as const;
export const ESLEME_SUTUNLARI = [...ESLEME_ZORUNLU_SUTUNLAR, 'aciklama'] as const;
/** Eşleme açıklaması NOT olabilir, metin olamaz. */
export const ACIKLAMA_SINIRI = 200;
export { DENKLIKLER };
const CerceveReferansiSemasi = z.object({
  cerceve: z.string().regex(CERCEVE_KODU, 'çerçeve kodu BÜYÜK harf: EPDK-SGYM'),
  surumEtiketi: z.string().min(1).max(40),
}).strict();
export const EslemeKimligiSemasi = z.object({
  kod: z.string().regex(CERCEVE_KODU, 'eşleme kodu BÜYÜK harf: EPDK-SGYM-ISO27019'),
  ad: z.string().min(3).max(200),
  /** paketin kendi çerçevesi (etiketi onunla aynı) ya da KURULU bir çerçeve sürümü */
  kaynak: CerceveReferansiSemasi,
  hedef: CerceveReferansiSemasi,
  lisans: LisansSemasi,
  /** eşleme satırları CSV'si — bu JSON'la aynı dizinde */
  eslemeDosyasi: z.string().regex(/^[A-Za-z0-9._-]+\.csv$/),
  /** eşlemenin dayandığı belge ya da karar — kısa künye, metin değil */
  kaynakBelge: z.string().max(ACIKLAMA_SINIRI).nullable().optional(),
  not: z.string().max(500).optional(),
}).strict();
export type EslemeKimligi = z.infer<typeof EslemeKimligiSemasi>;
export type EslemeSatiri = { kaynakKod: string; hedefKod: string; denklik: string; aciklama: string | null };

export const DOSYALAR = {
  manifest: 'manifest.json',
  sozluk: 'sozluk.json',
  kapsamTurleri: 'kapsam-turleri.json',
  oznitelikler: 'oznitelikler.json',
  yukumlulukler: 'yukumlulukler.json',
  roller: 'roller.json',
  cerceveDizini: 'cerceve',
  eslemeDizini: 'esleme',
  formDizini: 'form',
  raporDizini: 'rapor',
} as const;

/** Özetlere GİRMEYEN dosyalar: manifestin kendisi ve belge. */
export const OZET_DISI = new Set(['manifest.json', 'BENIOKU.md', 'README.md']);

export function sha256(icerik: Buffer | string): string {
  return createHash('sha256').update(icerik).digest('hex');
}

/* ── CSV (`;` ayraç, `"` tırnak, `""` kaçış, UTF-8 BOM toleranslı) ────
   Kapanmamış tırnak BİÇİM HATASIDIR, satır değil: açılıp kapanmayan bir
   `"` dosyanın kalanını tek hücreye yutuyor ve doğrulayıcı "ilk madde
   geçerli" diyordu (inceleme bulgusu, PR #41). `hata` doluysa satırlar
   BOŞTUR — yarım ayrıştırma dönmez. */
export function csvAyristir(metin: string): { basliklar: string[]; satirlar: string[][]; hata: string | null } {
  const ham = metin.replace(/^﻿/, '');
  const satirlar: string[][] = [];
  let alan = ''; let satir: string[] = []; let tirnakta = false;
  let satirNo = 1; let tirnakSatiri = 0;
  for (let i = 0; i < ham.length; i++) {
    const c = ham[i];
    if (tirnakta) {
      if (c === '"') {
        if (ham[i + 1] === '"') { alan += '"'; i++; } else tirnakta = false;
      } else { if (c === '\n') satirNo++; alan += c; }
      continue;
    }
    if (c === '"') { tirnakta = true; tirnakSatiri = satirNo; continue; }
    if (c === ';') { satir.push(alan); alan = ''; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && ham[i + 1] === '\n') i++;
      satirNo++;
      satir.push(alan); alan = '';
      if (satir.some((x) => x.trim() !== '')) satirlar.push(satir);
      satir = [];
      continue;
    }
    alan += c;
  }
  if (tirnakta) {
    return { basliklar: [], satirlar: [], hata: `kapanmamış tırnak: ${tirnakSatiri}. satırda açılan " dosya sonuna kadar kapanmadı` };
  }
  satir.push(alan);
  if (satir.some((x) => x.trim() !== '')) satirlar.push(satir);
  const [basliklar = [], ...gövde] = satirlar;
  return { basliklar: basliklar.map((b) => b.trim()), satirlar: gövde, hata: null };
}

export function csvYaz(basliklar: readonly string[], satirlar: readonly (readonly (string | number | null)[])[]): string {
  const hucre = (v: string | number | null) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [basliklar.join(';'), ...satirlar.map((s) => s.map(hucre).join(';'))].join('\n') + '\n';
}
