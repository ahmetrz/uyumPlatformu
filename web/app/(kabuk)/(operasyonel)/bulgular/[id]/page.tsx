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
  const bulgular = await db.bulgu.findMany({ select: { id: true } });
  return bulgular.map((b) => ({ id: b.id }));
}
export const generateStaticParams = STATIK_DEMO ? parametreler : undefined;

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
