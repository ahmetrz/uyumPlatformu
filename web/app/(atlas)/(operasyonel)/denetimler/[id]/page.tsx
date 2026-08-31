import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/atlas/temel';
import { db } from '@/lib/db';
import DenetimDetayIstemci, { type DetayVerisi } from './DenetimDetayIstemci';
import { DENETIM_ICERIK, denetimeCevir } from '../ortak';

/* O6 · Audit Detail & Evidence — "bu denetim neden kapanamıyor?"
   Yaşam döngüsü rayı gerçek aşamadan, kapanış engeli GERÇEK açık kayıt
   sayısından türer; sunucu eylemi (asamaIlerlet) aynı koşulu bir kez daha
   uygular — ekran yalnızca reddi önceden söyler, kuralı kendisi kurmaz. */

export async function generateStaticParams() {
  const denetimler = await db.denetim.findMany({
    where: { silindi: null }, select: { id: true },
  });
  return denetimler.map((d) => ({ id: d.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const d = await db.denetim.findUnique({ where: { id }, select: { kod: true, ad: true } });
  return { title: d ? `${d.kod} — ${d.ad} — Atlas` : 'Denetim — Atlas' };
}

export default async function Sayfa({ params }: { params: Promise<{ id: string }> }) {
  const kullanici = await girisZorunlu();
  if (!izinVar(kullanici, 'denetim', 'okuma')) return <Yetkisiz rol="denetim okuma" />;

  const { id } = await params;
  const simdi = new Date().getTime();

  const ham = await db.denetim.findUnique({
    where: { id },
    include: {
      ...DENETIM_ICERIK,
      // Kapsam formu çerçeveyle daraltılacak — regülasyon kimliği de gerekli.
      surec: {
        select: {
          id: true, kod: true, regulasyonId: true,
          regulasyon: { select: { kod: true } },
        },
      },
      kapsamlar: {
        select: {
          id: true,
          maddeId: true,
          tesis: { select: { id: true, kod: true, ad: true } },
          madde: { select: { id: true, kod: true, baslik: true } },
        },
      },
      talepler: {
        select: {
          id: true, baslik: true, aciklama: true, durum: true, sonTarih: true,
          sorumlu: { select: { id: true, adSoyad: true } },
          kanit: { select: { id: true, ad: true } },
        },
        orderBy: [{ durum: 'asc' }, { sonTarih: 'asc' }],
      },
      bulgular: {
        where: { silindi: null },
        select: {
          id: true, baslik: true, onemDerecesi: true, durum: true, hedefTarih: true,
          sorumlu: { select: { adSoyad: true } },
          maddeDurumu: {
            select: { madde: { select: { kod: true } }, tesis: { select: { kod: true } } },
          },
        },
        orderBy: [{ durum: 'asc' }, { onemDerecesi: 'asc' }],
      },
    },
  });
  if (!ham || ham.silindi) notFound();

  /* Madde havuzu denetimin çerçevesiyle daraltılır: EPDK denetiminin
     kapsamına ISO maddesi eklenmesi anlamsız olur. */
  const [kullanicilar, tesisler, maddeler, kanitlar] = await Promise.all([
    db.kullanici.findMany({ where: { aktif: true }, orderBy: { adSoyad: 'asc' } }),
    db.tesis.findMany({ where: { durum: 'aktif' }, orderBy: { kod: 'asc' } }),
    db.madde.findMany({
      where: {
        silindi: null,
        ...(ham.surec ? { regulasyonId: ham.surec.regulasyonId } : {}),
      },
      select: { id: true, kod: true, baslik: true },
      orderBy: [{ sira: 'asc' }, { kod: 'asc' }],
    }),
    db.kanit.findMany({
      where: { silindi: null },
      select: { id: true, ad: true, tip: true },
      orderBy: { ad: 'asc' },
    }),
  ]);

  const denetim = denetimeCevir(
    { ...ham, kapsamlar: ham.kapsamlar.map((k) => ({ tesis: k.tesis, maddeId: k.maddeId })) },
    simdi,
  );

  const veri: DetayVerisi = {
    denetim,
    simdi,
    kapsamlar: ham.kapsamlar.map((k) => ({ id: k.id, tesis: k.tesis, madde: k.madde })),
    talepler: ham.talepler.map((t) => ({
      id: t.id, baslik: t.baslik, aciklama: t.aciklama, durum: t.durum,
      sonTarih: t.sonTarih?.toISOString() ?? null,
      sorumlu: t.sorumlu ? { id: t.sorumlu.id, ad: t.sorumlu.adSoyad } : null,
      kanit: t.kanit,
    })),
    bulgular: ham.bulgular.map((b) => ({
      id: b.id, baslik: b.baslik, onem: b.onemDerecesi, durum: b.durum,
      maddeKod: b.maddeDurumu.madde.kod,
      tesisKod: b.maddeDurumu.tesis.kod,
      sorumlu: b.sorumlu?.adSoyad ?? null,
      hedef: b.hedefTarih?.toISOString() ?? null,
    })),
    kullanicilar: kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad })),
    /* Kapsama yalnız kullanıcının o santralde yazma yetkisi olan tesisler
       önerilir; sunucu eylemi aynı kontrolü tekrar uygular. */
    tesisler: tesisler
      .filter((t) => izinVar(kullanici, 'denetim', 'yazma', { tesisId: t.id }))
      .map((t) => ({ id: t.id, kod: t.kod, ad: t.ad })),
    maddeler,
    kanitlar,
    yazabilir: izinVar(kullanici, 'denetim', 'yazma'),
    onaylayabilir: izinVar(kullanici, 'denetim', 'onay'),
  };

  return <DenetimDetayIstemci veri={veri} />;
}
