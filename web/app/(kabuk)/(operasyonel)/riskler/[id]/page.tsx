import { notFound } from 'next/navigation';
import { STATIK_DEMO } from '@/lib/statikDerleme';
import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import RiskDetayIstemci from './RiskDetayIstemci';
import { riskDetayVerisi } from './veri';

/* O4 · Risk Detail — "bu risk nasıl kapanacak?"
   Kapanma zinciri (kontrol boşluğu → bulgu → proje → doğrulama) ve skor
   eğilimi GERÇEK veriden türetilir; olmayan halka uydurulmaz, bilinmeyen
   elmasıyla ve "yok" notuyla gösterilir (06 §19).

   Tesis kapsamı `veri.ts`te uygulanır (modül: `risk`). Kapsam dışı kayıt
   `notFound()` ile kapanır — ayrı bir yetki mesajı VERİLMEZ, çünkü "bu
   tesis senin dışında" demek o tesiste kaydın var olduğunu doğrulamak
   olurdu. */

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
  const riskler = await db.risk.findMany({ where: { silindi: null }, select: { id: true } });
  return riskler.map((r) => ({ id: r.id }));
}

export default async function RiskDetay({ params }: { params: Promise<{ id: string }> }) {
  const k = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her kullanıcıyı ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(k, 'risk')) return <Yetkisiz rol="risk okuma" />;

  const { id } = await params;

  const veri = await riskDetayVerisi(k, id);
  if (!veri) notFound();

  return <RiskDetayIstemci veri={veri} />;
}
