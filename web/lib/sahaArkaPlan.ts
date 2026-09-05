import { TEMEL } from './demo';

/* Saha ana ekranı · merkezi fotoğrafik alanın arka plan havuzu.

   İki görsel TEK havuzdur ve YALNIZ `.ab-b-alan` fonunda kullanılır;
   dekoratiftir (alt="", aria-hidden), veri katmanının altındadır.

   Seçim kuralı (hydration güvenli):
   - Sunucu ve ilk istemci çizimi HER ZAMAN 0. görseli verir → SSR/CSR
     birebir aynı, hydration uyuşmazlığı yok, LCP adayı sunucudan gelir.
   - Bağlandıktan sonra `sonrakiIndeks(sessionStorage'daki son)` ile bir
     sonraki görsel seçilir; sırayla döner, arka arkaya aynı görsel çıkmaz.
   - Sekme oturumu içinde yalnız SAYFA YENİDEN YÜKLENİNCE değişir; aynı
     görünümde zamanlayıcıyla dönmez.

   `konum` = `object-position`: görsel özneye göre belirlendi. Alan
   16:9'dan çok daha geniş kesildiği için (≈3:1) dikey odak kritik. */

export type SahaArkaPlani = {
  /** `public/gorseller/saha/` altındaki dosya */
  src: string;
  /** object-position — öznenin durduğu yer */
  konum: string;
  /** künye/hata ayıklama adı; kullanıcıya gösterilmez */
  ad: string;
};

export const SAHA_ARKA_PLANLARI: readonly SahaArkaPlani[] = [
  { src: `${TEMEL}/gorseller/saha/saha-03-res-sirt.webp`, konum: '78% 42%', ad: 'RES · sırtta türbinler' },
  { src: `${TEMEL}/gorseller/saha/saha-04-baraj-gol-plume.webp`, konum: '50% 52%', ad: 'Baraj gölü ve uzak santral' },
];

/** sessionStorage anahtarı — son gösterilen görselin indeksi */
export const SAHA_ARKA_PLAN_ANAHTARI = 'saha:arkaplan:son';

/** Bir sonraki indeks: sırayla döner (iki görselde dönüşümlü); geçersiz/boş girdi → 0'dan sonrası. */
export function sonrakiIndeks(son: unknown, adet = SAHA_ARKA_PLANLARI.length): number {
  const n = typeof son === 'string' ? Number.parseInt(son, 10) : typeof son === 'number' ? son : NaN;
  if (!Number.isInteger(n) || n < 0 || n >= adet) return adet > 1 ? 1 : 0;
  return (n + 1) % adet;
}
