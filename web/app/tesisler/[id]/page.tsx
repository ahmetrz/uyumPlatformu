import { girisZorunlu } from '@/lib/erisim';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import Tesis360Istemci from './Tesis360Istemci';

export async function generateStaticParams() {
  const tesisler = await db.tesis.findMany({ select: { id: true } });
  return tesisler.map((t) => ({ id: t.id }));
}

export default async function Tesis360({ params }: { params: Promise<{ id: string }> }) {
  await girisZorunlu();
  const { id } = await params;
  const tesis = await db.tesis.findUnique({
    where: { id },
    include: {
      tip: true, tuzelKisi: true, profil: true,
      uygulanabilirlikKararlari: {
        include: { regulasyon: true, kural: true, onaylayan: true },
        orderBy: { hesaplandi: 'desc' },
      },
    },
  });
  if (!tesis) notFound();

  const simdi = new Date();
  const [eksikMaddeler, bulgular, gecikenAksiyonlar, varliklar, riskler,
    denetimKapsamlari, surecKapsamlari, regulasyonlar] = await Promise.all([
    db.maddeDurumu.findMany({
      where: { tesisId: id, OR: [{ durum: { in: ['uyumsuz', 'kismi'] } }, { kanitBayat: true }] },
      include: { madde: true, surec: { include: { regulasyon: true } } },
    }),
    db.bulgu.findMany({
      where: { maddeDurumu: { tesisId: id }, durum: { in: ['acik', 'aksiyonda'] }, silindi: null },
      include: { sorumlu: true, maddeDurumu: { include: { madde: true } } },
      orderBy: [{ onemDerecesi: 'asc' }, { hedefTarih: 'asc' }],
    }),
    db.aksiyon.findMany({
      where: {
        durum: { in: ['planlandi', 'devam'] }, hedef: { lt: simdi },
        bulgu: { maddeDurumu: { tesisId: id } },
      },
      include: { bulgu: true, sorumlu: true },
      orderBy: { hedef: 'asc' },
    }),
    db.varlik.findMany({
      where: { tesisId: id, silindi: null },
      include: { tur: true },
      orderBy: { etiket: 'asc' },
    }),
    db.risk.findMany({
      where: { tesisId: id, silindi: null, durum: { in: ['acik', 'islemde'] } },
      include: { sahip: true },
      orderBy: [{ artikRisk: 'desc' }, { kod: 'asc' }],
    }),
    db.denetimKapsami.findMany({
      where: { tesisId: id, denetim: { silindi: null } },
      include: { denetim: true },
    }),
    db.surecKapsami.findMany({
      where: { tesisId: id },
      include: { surec: { include: { regulasyon: true } } },
      orderBy: { eklendi: 'desc' },
    }),
    db.regulasyon.findMany({ where: { aktif: true }, orderBy: { kod: 'asc' } }),
  ]);

  // aynı denetim birden çok kapsam satırıyla gelebilir — teke indir
  const denetimler = [...new Map(denetimKapsamlari.map((k) => [k.denetim.id, k.denetim])).values()]
    .sort((a, b) => a.kod.localeCompare(b.kod, 'tr'));

  const veri = {
    id: tesis.id, kod: tesis.kod, ad: tesis.ad, durum: tesis.durum,
    tipKod: tesis.tip?.kod ?? null, tipAd: tesis.tip?.ad ?? null,
    tuzelKisi: tesis.tuzelKisi?.ad ?? null,
    kuruluGucMw: tesis.kuruluGucMw, konum: tesis.konum,
    devreyeGiris: tesis.devreyeGiris?.toISOString() ?? null,
    profil: tesis.profil ? {
      lisansTipi: tesis.profil.lisansTipi, lisansNo: tesis.profil.lisansNo,
      kabulDurumu: tesis.profil.kabulDurumu,
      kabulTarihi: tesis.profil.kabulTarihi?.toISOString() ?? null,
      blackStart: tesis.profil.blackStart, teiasScadaEms: tesis.profil.teiasScadaEms,
      seriHaberlesme: tesis.profil.seriHaberlesme,
      kritiklikSinifi: tesis.profil.kritiklikSinifi,
      kritikAltyapiStatusu: tesis.profil.kritikAltyapiStatusu,
      internetMaruziyeti: tesis.profil.internetMaruziyeti,
      uzaktanErisim: tesis.profil.uzaktanErisim,
      otMimariTipi: tesis.profil.otMimariTipi,
      dcsSaglayici: tesis.profil.dcsSaglayici, scadaSaglayici: tesis.profil.scadaSaglayici,
      plcAileleri: tesis.profil.plcAileleri, iotVar: tesis.profil.iotVar,
      akilliSayacVar: tesis.profil.akilliSayacVar, yerelAdVar: tesis.profil.yerelAdVar,
      yerelVeriMerkeziVar: tesis.profil.yerelVeriMerkeziVar,
      grupOrtakServisler: tesis.profil.grupOrtakServisler,
    } : null,
    kararlar: tesis.uygulanabilirlikKararlari
      .map((k) => ({
        id: k.id, regId: k.regulasyonId, regKod: k.regulasyon.kod, regAd: k.regulasyon.ad,
        uygulanabilir: k.uygulanabilir, gerekce: k.gerekce,
        degistirmeGerekcesi: k.degistirmeGerekcesi,
        kuralAd: k.kural?.ad ?? null, kuralSurumu: k.kuralSurumu,
        hesaplandi: k.hesaplandi.toISOString(),
        elIle: k.elIleDegistirildi, onaylayan: k.onaylayan?.adSoyad ?? null,
      }))
      .sort((a, b) => a.regKod.localeCompare(b.regKod, 'tr')),
    regulasyonlar: regulasyonlar.map((r) => ({ id: r.id, kod: r.kod, ad: r.ad })),
    eksikMaddeler: eksikMaddeler.map((m) => ({
      id: m.id, durum: m.durum, kanitBayat: m.kanitBayat,
      maddeKod: m.madde.kod, maddeBaslik: m.madde.baslik,
      surecId: m.surecId, surecKod: m.surec.kod, regKod: m.surec.regulasyon.kod,
    })),
    bulgular: bulgular.map((b) => ({
      id: b.id, baslik: b.baslik, onem: b.onemDerecesi, durum: b.durum,
      hedef: b.hedefTarih?.toISOString() ?? null,
      sorumlu: b.sorumlu?.adSoyad ?? null, maddeKod: b.maddeDurumu.madde.kod,
    })),
    gecikenAksiyonlar: gecikenAksiyonlar.map((a) => ({
      id: a.id, baslik: a.baslik, bulguId: a.bulguId, bulguBaslik: a.bulgu.baslik,
      hedef: a.hedef?.toISOString() ?? null, sorumlu: a.sorumlu?.adSoyad ?? null,
    })),
    varliklar: varliklar.map((v) => ({
      id: v.id, etiket: v.etiket, ad: v.ad, sinif: v.tur.sinif, turAd: v.tur.ad,
      kritiklik: v.kritiklik, eos: v.eosTarihi?.toISOString() ?? null,
      isletimSistemi: v.isletimSistemi,
    })),
    riskler: riskler.map((r) => ({
      id: r.id, kod: r.kod, baslik: r.baslik, durum: r.durum,
      artikRisk: r.artikRisk, sahip: r.sahip?.adSoyad ?? null,
    })),
    denetimler: denetimler.map((d) => ({
      id: d.id, kod: d.kod, ad: d.ad, tip: d.tip, durum: d.durum,
      planBaslangic: d.planBaslangic?.toISOString() ?? null,
      planBitis: d.planBitis?.toISOString() ?? null,
    })),
    surecler: surecKapsamlari.map((sk) => ({
      id: sk.surec.id, kod: sk.surec.kod, ad: sk.surec.ad, durum: sk.surec.durum,
      regKod: sk.surec.regulasyon.kod, bitis: sk.surec.bitis?.toISOString() ?? null,
    })),
  };

  return (
    <>
      <UstCubuk baslik="Santral 360" cocuklar={<span className="chip mono">{veri.kod}</span>} />
      <main className="icerik">
        <Tesis360Istemci veri={veri} />
      </main>
    </>
  );
}
