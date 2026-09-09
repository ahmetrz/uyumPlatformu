import type { Metadata } from 'next';
import { STATIK_DEMO } from '@/lib/statikDerleme';
import { notFound } from 'next/navigation';
import { girisZorunlu, izinliTesisIdleri } from '@/lib/erisim';
import { aktifKullanici } from '@/lib/auth';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import DenetimDetayIstemci from './DenetimDetayIstemci';
import { denetimDetayVerisi, denetimGorunur } from './veri';

/* O6 · Audit Detail & Evidence — "bu denetim neden kapanamıyor?"
   Yaşam döngüsü rayı gerçek aşamadan, kapanış engeli GERÇEK açık kayıt
   sayısından türer; sunucu eylemi (asamaIlerlet) aynı koşulu bir kez daha
   uygular — ekran yalnızca reddi önceden söyler, kuralı kendisi kurmaz.

   Tesis kapsamı `veri.ts`te uygulanır (modül: `denetim`, liste ekranıyla
   aynı kural). Kapsam dışı denetim `notFound()` ile kapanır. */

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
  const denetimler = await db.denetim.findMany({
    where: { silindi: null }, select: { id: true },
  });
  return denetimler.map((d) => ({ id: d.id }));
}

/* Sekme başlığı da bir sızıntı yüzeyidir: kapsam dışı denetimin kodu ve
   adı, sayfa `notFound()` dönse bile <title>'a yazılıyordu. Başlık aynı
   kapsam kuralından geçer; geçemezse GENEL başlık döner — "yok" ile
   "göremezsin" burada da ayırt edilemez. */
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const genel: Metadata = { title: 'Denetim' };
  const k = await aktifKullanici();
  if (!k || !modulOkuyabilir(k, 'denetim')) return genel;

  const { id } = await params;
  const d = await db.denetim.findUnique({
    where: { id },
    select: { kod: true, ad: true, silindi: true, kapsamlar: { select: { tesisId: true } } },
  });
  if (!d || d.silindi) return genel;
  if (!denetimGorunur(izinliTesisIdleri(k, 'denetim'), d.kapsamlar.map((x) => x.tesisId))) {
    return genel;
  }
  return { title: `${d.kod} — ${d.ad}` };
}

export default async function Sayfa({ params }: { params: Promise<{ id: string }> }) {
  const kullanici = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her denetçiyi ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(kullanici, 'denetim')) return <Yetkisiz rol="denetim okuma" />;

  const { id } = await params;
  const veri = await denetimDetayVerisi(kullanici, id);
  if (!veri) notFound();

  return <DenetimDetayIstemci veri={veri} />;
}
