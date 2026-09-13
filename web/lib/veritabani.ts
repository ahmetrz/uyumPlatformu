/* ═══════════════════════════════════════════════════════════════════════
   VERİTABANI SAĞLAYICISI — TEK KAYNAK (R5)

   Ürün iki sağlayıcıda çalışır ve ikisi AYNI ŞEY DEĞİLDİR:

   · SQLite — geliştirme ve demo. Kurulumsuz, tek dosya, tek yazar.
   · PostgreSQL — müşteri kurulumu. Eşzamanlı yazma, yedek/geri yükleme,
     satır düzeyi güvenlik (P2).

   Sağlayıcı KOD İÇİNDE İKİ YERDE sorulmaz. Sorulacak tek yer burasıdır;
   `lib/db.ts` sürücüyü, `lib/aramaKosulu.ts` arama kipini buradan seçer.
   Sebebi ölçüldü (docs/POSTGRES_READINESS.md §a.7): sağlayıcıya bağlı
   davranış on bir ayrı yerde tekrarlanıyordu ve göç günü hepsinin
   bulunması gerekiyordu.

   Kaynak: `DATABASE_URL`. `postgres://` ya da `postgresql://` ile
   başlıyorsa PostgreSQL, aksi hâlde SQLite. Ortam değişkeni YOKSA
   SQLite'tır — geliştirme kurulumu bugünkü hâliyle çalışmaya devam eder.

   BİLİNMEYEN SAĞLAYICI DİYE BİR ŞEY YOKTUR: tanınmayan bir şema (`mysql:`)
   sessizce SQLite'a düşmez, HATA verir. Sessiz düşüş, yanlış sağlayıcıyla
   çalışan bir kurulum demektir ve bunu ancak müşteri fark eder.
   ═══════════════════════════════════════════════════════════════════════ */

export const SAGLAYICILAR = ['sqlite', 'postgresql'] as const;
export type Saglayici = (typeof SAGLAYICILAR)[number];

/** Bağlantı dizesinden sağlayıcı. Tanınmayan şema HATADIR, varsayılan değil. */
export function saglayiciCoz(url: string | undefined | null): Saglayici {
  const u = (url ?? '').trim();
  if (u === '') return 'sqlite';
  if (/^postgres(ql)?:\/\//i.test(u)) return 'postgresql';
  if (/^file:/i.test(u) || u.startsWith('.') || u.startsWith('/')) return 'sqlite';
  throw new Error(
    `DATABASE_URL tanınmayan bir sağlayıcı gösteriyor: ${u.slice(0, 40)}… — `
    + `desteklenen: file: (SQLite) · postgres:// · postgresql://. Sessizce SQLite'a düşmek, `
    + 'yanlış sağlayıcıyla çalışan bir kurulum demektir.',
  );
}

/** Test koşumu mu — `TEST_PG_URL` YALNIZ burada okunur. */
export const TEST_KOSUMU = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';

/** Bu süreçteki sağlayıcı.

    Testler `TEST_PG_URL` ile PostgreSQL'e bağlanır ve `DATABASE_URL`
    ayarlamaz; sağlayıcı orada da DOĞRU okunmalıdır — yoksa arama kipi
    SQLite'a göre seçilir ve PostgreSQL'de arama sessizce boş döner
    (ölçüldü: R5 ilk PostgreSQL koşusunda `arama-kosulu` iki vaka kırmızı).

    AMA `TEST_PG_URL` bir TEST değişkenidir ve ÜRÜNÜ YÖNETEMEZ: kabukta
    kalmış bir değer üretim derlemesine sızarsa uygulama PostgreSQL sürücüsünü
    seçer, şema SQLite'tır ve derleme "adaptör uyumsuz" diye düşer. Ölçüldü
    (R5, parti kapanışı): marka kapısının derlemesi tam olarak bu yüzden
    kırmızı yandı. Bu yüzden test değişkeni YALNIZ test koşumunda okunur;
    üretimde tek söz sahibi `DATABASE_URL`dir. */
export const BAGLANTI: string | undefined =
  (TEST_KOSUMU ? process.env.TEST_PG_URL : undefined) ?? process.env.DATABASE_URL;

/** Sağlayıcı, BAĞLANTININ KENDİSİNDEN çözülür — iki ayrı kaynaktan değil. */
export const SAGLAYICI: Saglayici = saglayiciCoz(BAGLANTI);

/** PostgreSQL'de `contains` DUYARLIDIR ve `mode: 'insensitive'` gerekir;
    SQLite'ta `LIKE` zaten ASCII için duyarsızdır ve o kip KABUL EDİLMEZ
    (sorgu çalışma zamanında patlar). */
export const DUYARSIZ_KIP_DESTEKLI = SAGLAYICI === 'postgresql';
