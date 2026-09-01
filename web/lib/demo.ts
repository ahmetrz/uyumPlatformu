/** Statik demo yayını (GitHub Pages) — yazma işlemleri kapalı. */
export const DEMO = process.env.NEXT_PUBLIC_DEMO === '1';

/**
 * Yayın kökü. GitHub Pages proje sayfası siteyi `/<depo>/` altında
 * sunar; `next.config.ts` bunu `basePath` olarak kurar.
 *
 * TEK KAYNAK: değer burada durur ve dört yerden okunur — `next.config.ts`
 * (basePath), `lib/gorsel.ts` (fotoğraf yolları), giriş ekranı ve
 * `arac/demo-yol.mjs` (derleme sonrası CSS düzeltmesi). Daha önce iki
 * dosyada elle kopyalanmıştı; üçüncü kullanıcı eklenince kopyalardan
 * biri unutulur ve yayın sessizce kırılırdı.
 */
export const YAYIN_KOKU = '/uyumPlatformu';

/** Statik yayında varlık ön eki; geliştirme ve üretimde boş dizedir. */
export const TEMEL = DEMO ? YAYIN_KOKU : '';
