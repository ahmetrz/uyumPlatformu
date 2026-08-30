import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import RisklerIstemci from './RisklerIstemci';

export default async function Riskler() {
  await girisZorunlu();
  const [riskler, tumKodlar, kullanicilar, tesisler, sistemler, bulgular] = await Promise.all([
    db.risk.findMany({
      where: { silindi: null },
      include: {
        tesis: true, sistem: true, sahip: true, onaylayan: true, bulgu: true,
        varliklar: { include: { varlik: true } },
        kontroller: { include: { madde: true } },
        projeler: { include: { proje: true } },
      },
      orderBy: [{ durum: 'asc' }, { artikRisk: 'desc' }],
    }),
    db.risk.findMany({ select: { kod: true } }), // silinenler dahil — kod önerisi çakışmasın
    db.kullanici.findMany({ where: { aktif: true }, orderBy: { adSoyad: 'asc' } }),
    db.tesis.findMany({ where: { durum: 'aktif' }, orderBy: { kod: 'asc' } }),
    db.sistemServis.findMany({ orderBy: { kod: 'asc' } }),
    db.bulgu.findMany({
      where: { silindi: null, durum: { in: ['acik', 'aksiyonda'] } },
      orderBy: { tespitTarihi: 'desc' },
    }),
  ]);

  // Kod önerisi: RSK-<yıl>-XXX — bu yılın en büyük sırası + 1
  const yil = new Date().getFullYear();
  const enBuyuk = tumKodlar.reduce((a, r) => {
    const m = /^RSK-(\d{4})-(\d+)$/.exec(r.kod);
    return m && Number(m[1]) === yil ? Math.max(a, Number(m[2])) : a;
  }, 0);
  const yeniKod = `RSK-${yil}-${String(enBuyuk + 1).padStart(3, '0')}`;

  const veri = riskler.map((r) => ({
    id: r.id, kod: r.kod, baslik: r.baslik, aciklama: r.aciklama, kaynak: r.kaynak,
    tehdit: r.tehdit, zayiflik: r.zayiflik, mevcutKontroller: r.mevcutKontroller,
    olasilik: r.olasilik,
    etkiler: {
      etkiUretim: r.etkiUretim, etkiEmniyet: r.etkiEmniyet,
      etkiRegulasyon: r.etkiRegulasyon, etkiFinans: r.etkiFinans,
      etkiSiber: r.etkiSiber, etkiItibar: r.etkiItibar,
      etkiCevre: r.etkiCevre, etkiVeri: r.etkiVeri,
    },
    dogalRisk: r.dogalRisk, artikRisk: r.artikRisk,
    islemTipi: r.islemTipi,
    islemTarihi: r.islemTarihi?.toISOString() ?? null,
    kabulBitis: r.kabulBitis?.toISOString() ?? null,
    durum: r.durum, olusturuldu: r.olusturuldu.toISOString(),
    tesis: r.tesis ? { id: r.tesis.id, kod: r.tesis.kod, ad: r.tesis.ad } : null,
    sistem: r.sistem ? { id: r.sistem.id, kod: r.sistem.kod, ad: r.sistem.ad } : null,
    sahip: r.sahip ? { id: r.sahip.id, ad: r.sahip.adSoyad } : null,
    onaylayan: r.onaylayan ? { id: r.onaylayan.id, ad: r.onaylayan.adSoyad } : null,
    bulgu: r.bulgu ? { id: r.bulgu.id, baslik: r.bulgu.baslik } : null,
    varliklar: r.varliklar.map((v) => ({ id: v.varlik.id, etiket: v.varlik.etiket, ad: v.varlik.ad })),
    kontroller: r.kontroller.map((c) => ({ id: c.madde.id, kod: c.madde.kod, baslik: c.madde.baslik })),
    projeler: r.projeler.map((p) => ({ id: p.proje.id, kod: p.proje.kod, ad: p.proje.ad })),
  }));

  return (
    <>
      <UstCubuk baslik="Risk kütüğü" />
      <main className="icerik">
        <RisklerIstemci
          riskler={veri}
          yeniKod={yeniKod}
          kullanicilar={kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad }))}
          tesisler={tesisler.map((t) => ({ id: t.id, kod: t.kod, ad: t.ad }))}
          sistemler={sistemler.map((s) => ({ id: s.id, kod: s.kod, ad: s.ad }))}
          bulgular={bulgular.map((b) => ({ id: b.id, baslik: b.baslik }))}
        />
      </main>
    </>
  );
}
