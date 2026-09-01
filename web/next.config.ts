import type { NextConfig } from 'next';
import fs from 'node:fs';
import path from 'node:path';

// DEMO=1: GitHub Pages için statik dışa aktarım. Yazma eylemleri
// *.demo.ts ikizlerine alias'lanır (statik dışa aktarım server action taşıyamaz).
const demo = process.env.NEXT_PUBLIC_DEMO === '1';

/* ═══════════════════════════════════════════════════════════════════════
   DEMO İKİZLERİ — ELLE YAZILAN LİSTE YERİNE TÜRETME

   Burada 22 satırlık iki ayrı liste vardı (webpack + turbopack) ve her yeni
   `'use server'` modülü ikisine de ELLE eklenmek zorundaydı. Unutulan bir
   satırın bedeli sessiz değildi ama geçti: demo derlemesi gerçek sunucu
   eylemini paketlemeye çalışır ve `output: 'export'` altında patlar — yani
   hata, kodu yazan kişiden GÜNLER SONRA, yayın anında ortaya çıkardı.

   Artık liste dosya sisteminden türetiliyor ve eksik ikiz DERLEME BAŞINDA
   yakalanıyor. Geç patlayan hata, erken patlayan hataya çevrildi. */

const EYLEM_DIZINI = path.join(__dirname, 'lib', 'eylemler2');

/** Kök seviyedeki iki eylem modülü (`lib/eylemler2` dışında). */
const KOK_EYLEMLER = ['lib/eylemler', 'lib/girisEylemleri'] as const;

function eylemModulleri(): string[] {
  /* Ölçüt dosya adı DEĞİL, içerikte `'use server'` bulunmasıdır.
     `ortak.ts` gibi paylaşılan yardımcılar sunucu eylemi tanımlamaz ve
     ikiz gerektirmez; ada bakan bir kural onları da yanlışlıkla ister. */
  const dosyalar = fs.readdirSync(EYLEM_DIZINI)
    .filter((d) => d.endsWith('.ts') && !d.endsWith('.demo.ts'))
    .filter((d) => /^\s*['"]use server['"]/m.test(
      fs.readFileSync(path.join(EYLEM_DIZINI, d), 'utf8')))
    .map((d) => d.slice(0, -3))
    .sort();

  const eksik = dosyalar.filter(
    (ad) => !fs.existsSync(path.join(EYLEM_DIZINI, `${ad}.demo.ts`)),
  );
  if (eksik.length > 0) {
    throw new Error(
      `lib/eylemler2/ altındaki şu modüllerin demo ikizi yok: ${eksik.join(', ')}. `
      + 'Her sunucu eylemi modülünün bir <ad>.demo.ts ikizi olmalıdır; '
      + 'yoksa statik demo derlemesi yayın anında patlar.',
    );
  }
  return dosyalar.map((ad) => `lib/eylemler2/${ad}`);
}

/** `@/<yol>` → `<yol>.demo.ts` eşlemesi. */
function demoEslemesi(): Record<string, string> {
  const hepsi = [...KOK_EYLEMLER, ...eylemModulleri()];
  return Object.fromEntries(hepsi.map((yol) => [`@/${yol}`, `./${yol}.demo.ts`]));
}

/* ═══════════════════════════════════════════════════════════════════════
   GÜVENLİK BAŞLIKLARI

   Hiç yoktu: ne CSP, ne çerçeveleme koruması, ne MIME sniff engeli. Bir
   uyum platformunun kendi tarayıcı yüzeyini korumaması, denetlediği
   kontrolleri kendi üzerinde uygulamaması demektir.

   `script-src` içindeki `'unsafe-inline'` BİLİNÇLİDİR ve bir borçtur:
   Next'in satır içi önyükleme betiği nonce olmadan çalışmaz, nonce ise
   middleware gerektirir. Karar, sessizce miras alınmak yerine burada
   yazılıdır (bkz. PRE_INTERNAL_INTEGRATION_READINESS.md).

   `output: 'export'` altında `headers()` HİÇBİR ŞEY YAPMAZ — statik
   dışa aktarımda sunucu yoktur. Demo derlemesinde bu yüzden hiç
   tanımlanmaz; başlıklar CDN'de kurulur. Tanımlı bırakmak, korunuyor
   sanılan bir yayın üretirdi. */
/* Geliştirmede React Refresh (HMR) `eval` kullanır; `'unsafe-eval'`
   olmadan tarayıcı konsolu "eval() is not supported in this environment"
   der ve sıcak yenileme çalışmaz. ÜRETİMDE bu izin VERİLMEZ — verilseydi
   CSP'nin en önemli maddesini geliştirme kolaylığı için feda etmiş
   olurduk. Ayrım burada tek satırdır ve görünürdür; sessizce her ortama
   açık bırakmak kolay ama yanlış olurdu. */
const GELISTIRME = process.env.NODE_ENV !== 'production';

const GUVENLIK_BASLIKLARI = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${GELISTIRME ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  /* Next'in geliştirme rozeti VARSAYILAN OLARAK sol altta duruyor ve orada
     rayın oturum bloğu var: rozet ÇIKIŞ düğmesinin tam üstüne biniyordu.
     Yalnız `next dev` altında çizilir — üretim derlemesine girmez, yani bu
     bir ürün kusuru değildi; ama geliştiricinin ve ekran görüntüsü alan QA
     aracının gördüğü tek oturum kapatma denetimini örtüyordu. Sağ alt köşe
     bu düzende boş. */
  devIndicators: { position: 'bottom-right' },
  // API route dosyaları `route.api.ts` adını taşır. Demo (statik dışa aktarım)
  // derlemesinde 'api.ts' uzantısı pageExtensions'ta YOKTUR; böylece Next
  // bu dosyaları route saymaz ve POST/Request'e bağlı uçlar demo yayınına
  // hiç girmez (statik dışa aktarım yalnız GET + force-static kaldırır).
  pageExtensions: demo
    ? ['tsx', 'ts', 'jsx', 'js']
    : ['tsx', 'ts', 'jsx', 'js', 'api.ts'],
  ...(demo
    ? {
        output: 'export' as const,
        basePath: '/uyumPlatformu',
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        async headers() {
          return [{ source: '/:path*', headers: GUVENLIK_BASLIKLARI }];
        },
      }),
  webpack: (config) => {
    if (demo) {
      for (const [istek, hedef] of Object.entries(demoEslemesi())) {
        config.resolve.alias[istek] = path.resolve(__dirname, hedef);
      }
    }
    return config;
  },
  turbopack: {
    resolveAlias: demo ? demoEslemesi() : {},
  },
};

export default nextConfig;
