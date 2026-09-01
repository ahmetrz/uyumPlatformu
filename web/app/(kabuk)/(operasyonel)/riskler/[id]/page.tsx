import { notFound } from 'next/navigation';
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

   Santral kapsamı `veri.ts`te uygulanır (modül: `risk`). Kapsam dışı kayıt
   `notFound()` ile kapanır — ayrı bir yetki mesajı VERİLMEZ, çünkü "bu
   santral senin dışında" demek o santralde kaydın var olduğunu doğrulamak
   olurdu. */

export async function generateStaticParams() {
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
