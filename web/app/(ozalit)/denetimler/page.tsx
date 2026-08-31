import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import DenetimlerIstemci from './DenetimlerIstemci';


export default async function Denetimler() {
  await girisZorunlu();
  const [denetimler, tumKodlar, surecler] = await Promise.all([
    db.denetim.findMany({
      where: { silindi: null },
      include: {
        surec: { include: { regulasyon: true } },
        kapsamlar: { include: { tesis: true } },
        talepler: { select: { durum: true } },
        bulgular: { where: { silindi: null }, select: { durum: true } },
      },
      orderBy: [{ durum: 'asc' }, { planBaslangic: 'asc' }],
    }),
    db.denetim.findMany({ select: { kod: true } }), // silinenler dahil — kod önerisi çakışmasın
    db.uyumSureci.findMany({ include: { regulasyon: true }, orderBy: { kod: 'asc' } }),
  ]);

  // Kod önerisi: DEN-<yıl>-XXX — bu yılın en büyük sırası + 1
  const yil = new Date().getFullYear();
  const enBuyuk = tumKodlar.reduce((a, d) => {
    const m = /^DEN-(\d{4})-(\d+)$/.exec(d.kod);
    return m && Number(m[1]) === yil ? Math.max(a, Number(m[2])) : a;
  }, 0);
  const yeniKod = `DEN-${yil}-${String(enBuyuk + 1).padStart(3, '0')}`;

  const veri = denetimler.map((d) => ({
    id: d.id, kod: d.kod, ad: d.ad, tip: d.tip,
    denetleyen: d.denetleyen, durum: d.durum,
    planBaslangic: d.planBaslangic?.toISOString() ?? null,
    planBitis: d.planBitis?.toISOString() ?? null,
    surec: d.surec ? { id: d.surec.id, kod: d.surec.kod, regKod: d.surec.regulasyon.kod } : null,
    tesisler: [...new Set(d.kapsamlar.filter((x) => x.tesis).map((x) => x.tesis!.kod))],
    maddeSayisi: d.kapsamlar.filter((x) => x.maddeId).length,
    acikTalep: d.talepler.filter((t) => t.durum === 'acik').length,
    toplamTalep: d.talepler.length,
    acikBulgu: d.bulgular.filter((b) => b.durum === 'acik' || b.durum === 'aksiyonda').length,
    toplamBulgu: d.bulgular.length,
  }));

  return (
    <>
      <UstCubuk baslik="Denetimler" />
      <main className="icerik">
        <DenetimlerIstemci
          denetimler={veri}
          yeniKod={yeniKod}
          surecler={surecler.map((s) => ({ id: s.id, kod: s.kod, ad: s.ad, regKod: s.regulasyon.kod }))}
        />
      </main>
    </>
  );
}
