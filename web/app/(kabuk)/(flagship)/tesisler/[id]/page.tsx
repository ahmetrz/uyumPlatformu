import { notFound } from 'next/navigation';
import { girisZorunlu } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import Plant360 from './Plant360';
import { tesis360Verisi } from './veri';

/* F3 · Plant 360 — "bu santral kontrol altında mı?" (5 saniyede okunur)
   Sunucu tarafı yalnız veriyi toplar ve serileştirir; sunum istemcide.

   Santral kapsamı `veri.ts`te uygulanır (modül: `uyum`, /portfoy ile aynı).
   Kapsam dışı santral `notFound()` ile kapanır — hangi santralin dışarıda
   kaldığı SÖYLENMEZ, çünkü söylemek o santralin var olduğunu doğrulamaktır. */

export async function generateStaticParams() {
  const tesisler = await db.tesis.findMany({ select: { id: true } });
  return tesisler.map((t) => ({ id: t.id }));
}

export default async function Sayfa({ params }: { params: Promise<{ id: string }> }) {
  const k = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her kullanıcıyı ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(k, 'uyum')) return <Yetkisiz rol="uyum okuma" />;

  const { id } = await params;
  const sonuc = await tesis360Verisi(k, id);
  if (!sonuc) notFound();

  return <Plant360 veri={sonuc.veri} santraller={sonuc.santraller} />;
}
