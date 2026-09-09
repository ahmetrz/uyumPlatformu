import { z } from 'zod';

/* ═══════════════════════════════════════════════════════════════════════
   ORTAM YAPILANDIRMASI — TEK ŞEMA (P7 · 2.1)

   ── Kapatılan tuzak ────────────────────────────────────────────────────
   Ortam değişkenleri on bir ayrı dosyada, on bir ayrı kalıpla okunuyordu:
   `process.env.X ?? varsayilan`, `Number(process.env.Y) || 8`,
   `process.env.Z === '1'`. Üç kusur birden taşıyorlar:

   1. YANLIŞ DEĞER SESSİZCE VARSAYILANA DÜŞER. `API_ORAN_SINIRI=onikibin`
      yazan bir kurulum `Number(...) || 120` yüzünden 120 ile açılır ve
      operatör istediği sınırın uygulandığını sanır. Bir uyum ürününde
      "sessizce başka bir değerle çalışmak" en pahalı kusur sınıfıdır.
   2. HANGİ DEĞİŞKENLER VAR sorusunun cevabı hiçbir yerde yoktur; kurulum
      belgesi ancak kodu tarayarak yazılabilir ve ertesi gün bayatlar.
   3. ZORUNLU ile İSTEĞE BAĞLI ayrımı yoktur: eksik `DATABASE_URL` ile açılan
      bir kurulum ilk isteğe kadar sağlıklı görünür.

   ── Kural ──────────────────────────────────────────────────────────────
   Değer BURADA tanımlanır ve AÇILIŞTA doğrulanır. Hatalı ya da eksik değer
   ADIYLA hata verir; sessiz varsayılan YOKTUR. Varsayılanı OLAN alanlar
   varsayılanını burada yazılı taşır — "belirtilmedi" ile "yanlış yazıldı"
   ayrı şeylerdir ve ikincisi hatadır.

   Sır DEĞERİ burada durmaz: sırlar `sirReferansi` ile taşınır
   (`env:` · `dosya:` · `vault:` — `lib/entegrasyon/sir.ts`). Bu şema
   yalnız ürünün KENDİ çalışma ayarlarını tanır.
   ═══════════════════════════════════════════════════════════════════════ */

/** `1`/`0`, `true`/`false`, `evet`/`hayir` — üçü de yazılır, dördüncüsü hatadır. */
const mantik = (varsayilan: boolean) => z.preprocess((v) => {
  if (v === undefined || v === '') return varsayilan;
  const s = String(v).trim().toLocaleLowerCase('tr');
  if (['1', 'true', 'evet', 'acik', 'açık'].includes(s)) return true;
  if (['0', 'false', 'hayir', 'hayır', 'kapali', 'kapalı'].includes(s)) return false;
  return s;                                     // tanınmayan değer: zod reddeder
}, z.boolean({ message: 'mantık değeri bekleniyor: 1/0 · true/false · evet/hayır' }));

/** Pozitif tam sayı; boş bırakılırsa varsayılan, yanlış yazılırsa HATA. */
const sayi = (varsayilan: number, en = 1, azami = 1_000_000) => z.preprocess((v) => {
  if (v === undefined || String(v).trim() === '') return varsayilan;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : String(v);    // sayı değilse zod reddeder
}, z.number({ message: 'tam sayı bekleniyor' }).int().min(en).max(azami));

const metin = (varsayilan?: string) => z.preprocess(
  (v) => (v === undefined || String(v).trim() === '' ? varsayilan : String(v).trim()),
  varsayilan === undefined ? z.string().min(1).optional() : z.string().min(1),
);

/** Veritabanı bağlantı dizesi — `file:` (SQLite) ya da `postgres(ql)://`. */
const baglanti = z.string().min(1)
  .refine(
    (u) => /^file:/i.test(u) || /^postgres(ql)?:\/\//i.test(u) || u.startsWith('/') || u.startsWith('.'),
    { message: 'desteklenen: file: (SQLite) · postgres:// · postgresql://' },
  )
  /* PostgreSQL dizesi AYRICA AYRIŞTIRILABİLİR olmalıdır. Ölçüldü (bağımsız
     inceleme): `openssl rand -base64 32` ile üretilen parola `/` içerdiğinde
     URI otoritesi bölünür ve sürücü "Invalid URL" der. Kusur opaktır —
     PostgreSQL parolayı KABUL eder, yalnız uygulama bağlanamaz — ve
     operatör "uygulama bozuk" görür. Açılışta ADIYLA yakalanır. */
  .refine(
    (u) => {
      if (!/^postgres(ql)?:\/\//i.test(u)) return true;
      try { return new URL(u).hostname.length > 0; } catch { return false; }
    },
    {
      message: 'PostgreSQL bağlantı dizesi ayrıştırılamıyor — parola URL-güvenli '
        + 'olmayabilir (`+ / =` URI\'yi böler). Parolayı `openssl rand -hex 32` ile '
        + 'üretin ya da URL kodlayın.',
    },
  );

const OrtamAlanlari = z.object({
  /* ── veritabanı ──────────────────────────────────────────────────── */
  /** BOŞ BIRAKILABİLİR ve bu SESSİZ bir varsayılan DEĞİLDİR: yokluğu
      `lib/db.ts`te YAZILI olan geliştirme veritabanını (`prisma/dev.db`)
      seçer. Ölçüldü: kapıların tarayıcılı bandı `next start`i ortam
      değişkensiz koşar; zorunlu tutmak ürünü değil ÖLÇÜM ARACINI kırardı.
      Kural "varsayılan yok" değil, SESSİZ YANLIŞ DEĞER yok: hatalı yazılmış
      bir dize burada adıyla reddedilir. Gerçek kurulumda değer AÇIKÇA
      verilir (`docs/KURULUM.md`) ve sağlık ucu hangi sağlayıcıyla
      çalışıldığını her yanıtta yazar — yanlış veritabanına bağlı bir
      kurulum sessiz kalmaz. */
  DATABASE_URL: baglanti.optional(),

  /* ── kanıt deposu ────────────────────────────────────────────────── */
  /** Kanıt dosyalarının kökü. Kurulumda KALICI bir birim olmalıdır. */
  KANIT_DEPO_KOKU: metin(),

  /* ── kimlik ve marka ─────────────────────────────────────────────── */
  NEXT_PUBLIC_MARKA_AD: metin(),
  NEXT_PUBLIC_KIRACI_AD: metin(),

  /* ── çalışma kipleri ─────────────────────────────────────────────── */
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /** Bakım kipi: ekranlar kapalı, sağlık ucu açık kalır. */
  BAKIM_MODU: mantik(false),
  /** Statik demo derlemesi (veritabanı yok). */
  NEXT_PUBLIC_DEMO: mantik(false),
  /** İş kuyruğu sağlayıcısı; tanınmayan ad `lib/is/kuyruk.ts`te reddedilir. */
  IS_KUYRUGU: metin(),

  /* ── ağ ──────────────────────────────────────────────────────────── */
  /** Vekil politikası (`lib/istemciAdresi.ts`): kaç vekil atlanacak. */
  TRUST_PROXY: metin(),

  /* ── oran sınırları ──────────────────────────────────────────────── */
  GIRIS_ORAN_SINIRI: sayi(8),
  GIRIS_ORAN_PENCERE_MS: sayi(900_000, 1_000, 86_400_000),
  GIRIS_BILINMEYEN_SINIRI: sayi(30),
  GIRIS_ADRES_SINIRI: sayi(40),
  API_ORAN_SINIRI: sayi(120),
  API_ORAN_PENCERE_MS: sayi(60_000, 1_000, 86_400_000),
  API_BILINMEYEN_SINIRI: sayi(60),
});

export const OrtamSemasi = OrtamAlanlari;

export type Ortam = z.infer<typeof OrtamSemasi>;

/** Şemanın tanıdığı anahtarlar — kurulum belgesi ve kapı bunu okur. */
export const ORTAM_ANAHTARLARI = Object.keys(OrtamAlanlari.shape) as (keyof Ortam)[];

/** GERÇEK KURULUMDA açıkça verilmesi gereken anahtarlar. Şema onları zorunlu
    TUTMAZ (geliştirme ve ölçüm araçları değersiz koşar); `docs/KURULUM.md`
    ve `deploy/compose` verir, sağlık ucu da hangi değerle çalışıldığını
    yazar — böylece eksiklik sessiz kalmaz. */
export const KURULUMDA_VERILIR: (keyof Ortam)[] = ['DATABASE_URL', 'KANIT_DEPO_KOKU', 'NEXT_PUBLIC_KIRACI_AD'];

export type OrtamSonucu =
  | { ok: true; ortam: Ortam }
  | { ok: false; hatalar: { anahtar: string; mesaj: string }[] };

/**
 * Ortamı doğrular. HÜKÜM VERMEZ, sonucu döndürür — çağıran açılışta düşer,
 * sağlık ucu 503 yazar, kurulum aracı listeler.
 */
export function ortamiCoz(kaynak: NodeJS.ProcessEnv = process.env): OrtamSonucu {
  const p = OrtamSemasi.safeParse(kaynak);
  if (p.success) return { ok: true, ortam: p.data };
  return {
    ok: false,
    hatalar: p.error.issues.map((i) => ({
      anahtar: String(i.path[0] ?? '(bilinmeyen)'),
      mesaj: i.message,
    })),
  };
}

/** Okunabilir tek satır — açılış hatası ve sağlık ucu aynı cümleyi kullanır. */
export function ortamHataCumlesi(hatalar: { anahtar: string; mesaj: string }[]): string {
  return `Ortam yapılandırması geçersiz (${hatalar.length}): `
    + hatalar.map((h) => `${h.anahtar} — ${h.mesaj}`).join(' · ');
}
