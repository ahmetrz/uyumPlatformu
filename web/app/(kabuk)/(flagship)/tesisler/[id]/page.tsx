import type { Metadata } from 'next';
import { STATIK_DEMO } from '@/lib/statikDerleme';
import { notFound } from 'next/navigation';
import { girisZorunlu } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import Tesis360 from './Tesis360';
import { tesis360Verisi } from './veri';
import { t } from '@/lib/dil/terimler';
import { tesisSozlugu } from '@/lib/dil/sozlukOku';

/* F3 · Tesis 360 — "bu tesis kontrol altında mı?" (5 saniyede okunur)
   Sunucu tarafı yalnız veriyi toplar ve serileştirir; sunum istemcide.

   Tesis kapsamı `veri.ts`te uygulanır (modül: `uyum`, /portfoy ile aynı).
   Kapsam dışı tesis `notFound()` ile kapanır — hangi tesisin dışarıda
   kaldığı SÖYLENMEZ, çünkü söylemek o tesisin var olduğunu doğrulamaktır. */

/* Ekran adı SÖZLÜKTEN gelir: enerji sözlüğü kuruluyken sekme "Tesis 360",
   sözlük yokken "Tesis 360" yazar (URN-ALN-004). Sekme başlığı bu ekranda
   ekranın adının göründüğü tek yerdir — hero plakası tesisin ADINI taşır,
   ekranın adını değil; oraya bir de ekran adı koymak aynı soruyu
   ("neredeyim") ikinci kez cevaplamak olurdu. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }):
Promise<Metadata> {
  const { id } = await params;
  const sozluk = await tesisSozlugu(id);
  return { title: t(sozluk, 'tesis360') };
}

async function parametreler() {
  const tesisler = await db.tesis.findMany({ select: { id: true } });
  return tesisler.map((t) => ({ id: t.id }));
}
export const generateStaticParams = STATIK_DEMO ? parametreler : undefined;

export default async function Sayfa({ params }: { params: Promise<{ id: string }> }) {
  const k = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her kullanıcıyı ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(k, 'uyum')) return <Yetkisiz rol="uyum okuma" />;

  const { id } = await params;
  const sonuc = await tesis360Verisi(k, id);
  if (!sonuc) notFound();

  return <Tesis360 veri={sonuc.veri} tesisler={sonuc.tesisler} sozluk={sonuc.sozluk} />;
}
