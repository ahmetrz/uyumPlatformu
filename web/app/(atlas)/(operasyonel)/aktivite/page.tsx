import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import AktiviteIstemci from './AktiviteIstemci';
import type { Kayit } from './mantik';

export const metadata: Metadata = { title: 'Denetim izi — Atlas' };

/* Denetim izi — "kim neyi ne zaman değiştirdi?"
   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   Ekran SALT OKUNURDUR ve öyle kalmalıdır: AktiviteKaydi üzerinde veritabanı
   tetikleyicisi UPDATE ve DELETE'i reddeder (migration
   20260830190000_denetim_izi_degismezligi). Bu yüzden burada hiçbir yazma
   eylemi çağrılmaz.

   Erişim kapısı bilinçli olarak yalnız oturumdur: denetim izi denetçinin,
   uyum sorumlusunun ve yöneticinin ortak kütüğüdür; bir modül yetkisine
   bağlanması ekranı bugün görebilen rollerden alırdı. */

/** Kütük penceresi — ekrana taşınan en yeni kayıt sayısı. */
const PENCERE = 400;

export default async function Sayfa() {
  await girisZorunlu();

  // "Şimdi" istek başına bir kez okunur; metrikler ve tablo aynı anı paylaşsın.
  const simdi = new Date().getTime();

  const kayitlar = await db.aktiviteKaydi.findMany({
    include: { aktor: { select: { adSoyad: true } } },
    orderBy: { zaman: 'desc' },
    take: PENCERE,
  });

  const veri: Kayit[] = kayitlar.map((a) => ({
    id: a.id,
    aktor: a.aktor?.adSoyad ?? null,
    varlikTipi: a.varlikTipi,
    varlikId: a.varlikId,
    eylem: a.eylem,
    alan: a.alan,
    once: a.oncekiDeger,
    sonra: a.yeniDeger,
    dosya: a.dosyaAdi,
    kaynak: a.kaynak,
    zaman: a.zaman.toISOString(),
  }));

  return <AktiviteIstemci kayitlar={veri} simdi={simdi} pencere={PENCERE} />;
}
