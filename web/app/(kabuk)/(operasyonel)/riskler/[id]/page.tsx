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

/* PARAMETRE LİSTESİ SUNUCU DERLEMESİNDE HİÇ DIŞA AKTARILMAZ (P7 · ölçüldü).

   `generateStaticParams` VARSA Next rotayı SSG sayar. Sunucu derlemesinde
   liste boş döndürmek YETMEZ: Next rotayı hiç render etmeden "statik"
   kabul eder ve istek geldiğinde on-demand statik üretim dener; orada
   `cookies()` yasaktır ve sayfa 500 döner. Ölçüldü (compose duman kapısı):
   oturumsuz `/tesisler/x` 307 yerine 500 veriyordu — KİMLİK KAPISI bir
   sunucu hatasına dönüşmüştü.

   `force-dynamic` bunu çözer ama statik demoyu BOZAR: `output: 'export'`
   sunucusuzdur ve o kipi reddeder (ölçüldü, CI · `demo:build`). Rota
   kesiti ayarları literal olmak zorunda olduğu için koşullu da yazılamaz.

   Çözüm işlevin KENDİSİNİ koşullu dışa aktarmaktır: `generateStaticParams`
   bir yapılandırma literali değil, derlenmiş modülden okunan bir İŞLEVDİR;
   yoksa rota dinamiktir. Sunucu derlemesinde `undefined`, statik demoda
   gerçek işlev. Ölçüldü: sunucu derlemesinde rota `ƒ`, demo dışa
   aktarımında parametreler üretiliyor. */
async function parametreler() {
  const riskler = await db.risk.findMany({ where: { silindi: null }, select: { id: true } });
  return riskler.map((r) => ({ id: r.id }));
}
export const generateStaticParams = STATIK_DEMO ? parametreler : undefined;

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
