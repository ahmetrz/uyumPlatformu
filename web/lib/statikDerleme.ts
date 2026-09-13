/* ═══════════════════════════════════════════════════════════════════════
   STATİK DEMO DERLEMESİ Mİ — tek soru, tek yer (P7)

   Ürün iki biçimde derlenir:

   · SUNUCU derlemesi (`npm run build`) — müşteri kurulumu. Sayfalar istek
     anında render edilir; veritabanı KURULUM ORTAMINDADIR.
   · STATİK DEMO (`npm run demo:build`, `NEXT_PUBLIC_DEMO=1`) — `output:
     'export'`. Sunucu yoktur; her dinamik rotanın parametre listesi
     DERLEME ANINDA bilinmek zorundadır (`generateStaticParams`).

   Ölçüldü (P7, imaj derlemesi): `generateStaticParams` sunucu
   derlemesinde de koşuyordu ve DERLEYEN MAKİNEDE veritabanı sorguluyordu.
   Depoda `prisma/dev.db` bulunduğu için bu yıllarca sessiz kaldı; imaj
   derlemesinde — veritabanı OLMAYAN ve olmaması gereken bir yerde —
   `Failed to collect page data` diye düştü.

   Derleyen makine kurulum ortamı DEĞİLDİR. Sunucu derlemesinde parametre
   listesi BOŞTUR: sayfa istek anında render edilir (`dynamicParams`
   varsayılanı), yani ürün davranışı değişmez — yalnız derleme, olmayan
   bir veritabanına sormayı bırakır.
   ═══════════════════════════════════════════════════════════════════════ */

/** `next.config.ts` ile AYNI soru, aynı değişken: `output: 'export'` bu
    bayrakla açılır ve iki yerde iki farklı cevap olamaz. */
export const STATIK_DEMO = process.env.NEXT_PUBLIC_DEMO === '1';
