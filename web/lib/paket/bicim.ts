/* ═══ P4 · İÇERİK PAKETİ BİÇİMİ ═══════════════════════════════════════
   `docs/SEKTOR_PAKETI_SOZLESMESI.md` §1–§4'ün koddaki karşılığı. Paket bir
   DİZİNDİR: `manifest.json` + içerik dosyaları. Kod bilmeyen biri
   yazabilsin diye biçim üçtür — JSON (manifest, sözlük, türler,
   öznitelikler, yükümlülükler), CSV (madde ağacı; Excel'de açılır, UTF-8,
   `;` ayraç, başlık satırı zorunlu), XLSX (form şablonu — P4'ün sonraki
   dilimi).

   Bu modül SAFTIR: dosya sistemi ve veritabanı bilmez; şemalar ve
   ayrıştırıcılar `dogrula.ts` (okur/doğrular) ile `kur.ts` (yazar)
   tarafından paylaşılır. Şemalar `.strict()`: paket yazarının yazım
   hatası (`tesiseBagli` yerine `tesisebagli`) sessizce yutulmaz. */
import { createHash } from 'node:crypto';
import { z } from 'zod';

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
/** Kamuya açık ama iskelet (metin henüz aktarılmamış) çerçevede `Madde.metin`. */
export const METIN_GELMEDI = 'metin paketle gelmedi';
/** Telifli çerçevede başlık en fazla bu kadar karakter (§2). */
export const BASLIK_SINIRI = 120;
/** Telifli çerçevede `dis_kontrol_id` en fazla bu kadar karakter — kimliktir, metin değil. */
export const DIS_KIMLIK_SINIRI = 60;

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
export const CerceveKimligiSemasi = z.object({
  kod: z.string().regex(CERCEVE_KODU, 'çerçeve kodu BÜYÜK harf: EPDK-SGYM'),
  ad: z.string().min(3).max(200),
  surumEtiketi: z.string().min(1).max(40),
  yayimTarihi: tarihAlani,
  yururlukTarih: tarihAlani,
  kaynakUrl: z.string().url().nullable().optional(),
  lisans: LisansSemasi,
  /** madde ağacı CSV'si — bu JSON'la aynı dizinde */
  maddeDosyasi: z.string().regex(/^[A-Za-z0-9._-]+\.csv$/),
  zorunlulukTipi: z.enum(ZORUNLULUK_TIPLERI).default('REGULATION'),
  not: z.string().max(500).optional(),
}).strict();
export type CerceveKimligi = z.infer<typeof CerceveKimligiSemasi>;

/** Madde CSV sütunları — ilk üçü zorunlu, kalanı isteğe bağlı. */
export const MADDE_ZORUNLU_SUTUNLAR = ['kod', 'ust_kod', 'baslik'] as const;
export const MADDE_SUTUNLARI = [
  ...MADDE_ZORUNLU_SUTUNLAR, 'metin', 'sira', 'seviye', 'zorunluluk_tipi', 'kanit_beklentisi', 'dis_kontrol_id',
] as const;
export type MaddeSatiri = {
  kod: string; ustKod: string | null; baslik: string; metin: string | null; sira: number;
  seviye: number | null; zorunlulukTipi: string | null; kanitBeklentisi: string | null; disKontrolId: string | null;
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

export const DOSYALAR = {
  manifest: 'manifest.json',
  sozluk: 'sozluk.json',
  kapsamTurleri: 'kapsam-turleri.json',
  oznitelikler: 'oznitelikler.json',
  yukumlulukler: 'yukumlulukler.json',
  cerceveDizini: 'cerceve',
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
