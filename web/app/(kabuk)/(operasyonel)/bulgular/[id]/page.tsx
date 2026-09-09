import type { Metadata } from 'next';
import { STATIK_DEMO } from '@/lib/statikDerleme';
import { notFound } from 'next/navigation';
import { girisZorunlu } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import BulguDetayIstemci from './BulguDetayIstemci';
import { bulguDetayVerisi } from './veri';
import { kanitEsikleri } from '@/lib/yapilandirma/kanitEsik';

export const metadata: Metadata = { title: 'Bulgu kaydı' };

/* ROTA İSTEK ANINDA RENDER EDİLİR (P7 · ölçüldü).

   `generateStaticParams` bir rotayı SSG yapar. Sunucu derlemesinde liste
   BOŞTUR (`lib/statikDerleme.ts`) ve Next o rotayı hiç render etmeden
   "statik" sayar; istek geldiğinde ON-DEMAND statik üretim dener, orada
   `cookies()` yasaktır ve sayfa 500 döner. Ölçüldü (compose duman kapısı):
   oturumsuz `/tesisler/x` 307 yerine 500 veriyordu — yani KİMLİK KAPISI
   bir sunucu hatasına dönüşmüştü.

   `force-dynamic` bunu kapatır ve statik demoyu BOZMAZ: `output: 'export'`
   altında Next `generateStaticParams` listesini kullanmaya devam eder
   (ölçüldü: demo dışa aktarımı 27 tesis detay sayfası üretti, çıkış 0).
   Bu yüzden kip koşullu yazılmak zorunda değil — literal kalabilir. */
export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  /* Sunucu derlemesinde liste BOŞTUR: parametreleri üretmek derleyen
     makinede veritabanı sorgulamak olurdu (`lib/statikDerleme.ts`).
     Sayfa istek anında render edilir. */
  if (!STATIK_DEMO) return [];
  const bulgular = await db.bulgu.findMany({ select: { id: true } });
  return bulgular.map((b) => ({ id: b.id }));
}

/* O7 · kayıt ekranı. Liste çekmecesi özeti taşır; bütün mutasyonlar
   (bulguGuncelle · aksiyonEkle · aksiyonDurumDegistir · kanitEkle) ve tam
   denetim izi burada yaşar. Yerleşim: BaglamCubugu + içerik + 420px panel.

   Tesis kapsamı `veri.ts`te uygulanır (modül: `uyum`); kapsam dışı kayıt
   `notFound()` ile kapanır ve hangi tesisin dışarıda kaldığı söylenmez. */

export default async function Sayfa({ params }: { params: Promise<{ id: string }> }) {
  const k = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her kullanıcıyı ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(k, 'uyum')) return <Yetkisiz rol="uyum okuma" />;

  const { id } = await params;
  const veri = await bulguDetayVerisi(k, id);
  if (!veri) notFound();

  const esik = await kanitEsikleri();
  return <BulguDetayIstemci veri={veri} esik={esik.esik} />;
}
