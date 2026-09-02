import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { girisZorunlu } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import BulguDetayIstemci from './BulguDetayIstemci';
import { bulguDetayVerisi } from './veri';

export const metadata: Metadata = { title: 'Bulgu kaydı' };

export async function generateStaticParams() {
  const bulgular = await db.bulgu.findMany({ select: { id: true } });
  return bulgular.map((b) => ({ id: b.id }));
}

/* O7 · kayıt ekranı. Liste çekmecesi özeti taşır; bütün mutasyonlar
   (bulguGuncelle · aksiyonEkle · aksiyonDurumDegistir · kanitEkle) ve tam
   denetim izi burada yaşar. Yerleşim: BaglamCubugu + içerik + 420px panel.

   Santral kapsamı `veri.ts`te uygulanır (modül: `uyum`); kapsam dışı kayıt
   `notFound()` ile kapanır ve hangi santralin dışarıda kaldığı söylenmez. */

export default async function Sayfa({ params }: { params: Promise<{ id: string }> }) {
  const k = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her kullanıcıyı ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(k, 'uyum')) return <Yetkisiz rol="uyum okuma" />;

  const { id } = await params;
  const veri = await bulguDetayVerisi(k, id);
  if (!veri) notFound();

  return <BulguDetayIstemci veri={veri} />;
}
