import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import { uyumOzeti, gecikmisMi, gecenGun } from '@/lib/sabitler';
import Genel from './Genel';

export const metadata: Metadata = { title: 'Bugün — Atlas' };

/* F1 · Executive Overview — "bugün neyin yönetim dikkatine ihtiyacı var?"
   Hiyerarşi: bir kart baskındır; şerit bağlamdır; kuyruk kuyruktur.
   Grup özeti şeritte yaşar, ayrı bir modül olarak DEĞİL (§F1). */

export default async function Sayfa() {
  const kullanici = await girisZorunlu();

  const simdi = new Date();
  const [durumSayimlari, bulgular, riskler, aksiyonlar, denetimler, tesisSayisi, gucToplami] =
    await Promise.all([
      db.maddeDurumu.groupBy({ by: ['durum'], _count: { _all: true } }),
      db.bulgu.findMany({
        where: { durum: { in: ['acik', 'aksiyonda'] }, silindi: null },
        include: {
          sorumlu: { select: { adSoyad: true } },
          maddeDurumu: {
            include: {
              madde: { select: { kod: true, baslik: true } },
              tesis: { select: { id: true, ad: true, kod: true } },
              surec: { include: { regulasyon: { select: { kod: true } } } },
            },
          },
          aksiyonlar: { select: { durum: true } },
        },
        orderBy: [{ onemDerecesi: 'asc' }, { hedefTarih: 'asc' }],
        take: 12,
      }),
      db.risk.count({ where: { silindi: null, durum: { in: ['acik', 'islemde'] },
        artikRisk: { gte: 15 } } }),
      db.aksiyon.count({ where: { durum: { in: ['planlandi', 'devam'] }, hedef: { lt: simdi } } }),
      db.denetim.findMany({
        where: { silindi: null, planBitis: { gt: simdi } },
        select: { kod: true, ad: true, planBitis: true },
        orderBy: { planBitis: 'asc' }, take: 1,
      }),
      db.tesis.count({ where: { durum: 'aktif' } }),
      db.tesis.aggregate({ _sum: { kuruluGucMw: true }, where: { durum: 'aktif' } }),
    ]);

  const sayim = Object.fromEntries(durumSayimlari.map((d) => [d.durum, d._count._all]));
  const ozet = uyumOzeti(sayim);
  const yaklasan = denetimler[0] ?? null;

  // Öncelik sırası: kritik/gecikmiş önce; ilk kayıt odak kartı, sonrakiler kuyruk.
  const sirali = [...bulgular].sort((a, b) => {
    const ag = gecikmisMi(a.hedefTarih) ? 0 : 1;
    const bg = gecikmisMi(b.hedefTarih) ? 0 : 1;
    if (ag !== bg) return ag - bg;
    return (a.onemDerecesi === 'kritik' ? 0 : 1) - (b.onemDerecesi === 'kritik' ? 0 : 1);
  });

  const kayit = (b: (typeof sirali)[number]) => ({
    id: b.id,
    baslik: b.baslik,
    aciklama: (b.aciklama ?? '').split(/(?<=\.)\s/)[0] || null,
    tesisAd: b.maddeDurumu.tesis.ad,
    tesisId: b.maddeDurumu.tesis.id,
    kontrolKodu: b.maddeDurumu.madde.kod,
    cerceve: b.maddeDurumu.surec.regulasyon.kod,
    onem: b.onemDerecesi,
    durum: b.durum,
    sorumlu: b.sorumlu?.adSoyad ?? null,
    hedefTarih: b.hedefTarih?.toISOString() ?? null,
    gecikmisGun: gecikmisMi(b.hedefTarih) ? gecenGun(b.hedefTarih!) : null,
    aksiyonTamam: b.aksiyonlar.filter((a) => a.durum === 'tamamlandi').length,
    aksiyonToplam: b.aksiyonlar.length,
  });

  return (
    <Genel
      kullanici={kullanici.adSoyad}
      ozet={{
        uyumYuzde: ozet.yuzde,
        bilinmeyenOran: ozet.bilinmeyenOran,
        kritikRisk: riskler,
        gecikmisAksiyon: aksiyonlar,
        yaklasanDenetim: yaklasan
          ? { kod: yaklasan.kod, kalanGun: -gecenGun(yaklasan.planBitis!) }
          : null,
        tesisSayisi,
        toplamGucMw: Math.round((gucToplami._sum.kuruluGucMw ?? 0) * 10) / 10,
      }}
      odak={sirali[0] ? kayit(sirali[0]) : null}
      kuyruk={sirali.slice(1, 4).map(kayit)}
      toplamKayit={sirali.length}
    />
  );
}
