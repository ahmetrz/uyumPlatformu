import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import EnvanterIstemci from './EnvanterIstemci';

export default async function Envanter() {
  await girisZorunlu();
  const [varliklar, turler, tesisler, uniteler, sistemler, bolgeler, kullanicilar] = await Promise.all([
    db.varlik.findMany({
      where: { silindi: null },
      include: {
        tur: true, tesis: true, unite: true, sistem: true, bolge: true,
        sahip: true, emanetci: true, tedarikci: true, sozlesme: true,
        kaynakIliskiler: { include: { hedef: { select: { id: true, etiket: true, ad: true } } } },
        hedefIliskiler: { include: { kaynak: { select: { id: true, etiket: true, ad: true } } } },
        riskler: { include: { risk: {
          select: { id: true, kod: true, baslik: true, durum: true, silindi: true } } } },
        kanitlar: { include: { kanit: { select: { id: true, ad: true, tip: true, silindi: true } } } },
        zafiyetler: { select: { id: true, durum: true } },
      },
      orderBy: { etiket: 'asc' },
    }),
    db.varlikTuru.findMany({ where: { aktif: true }, orderBy: { ad: 'asc' } }),
    db.tesis.findMany({ where: { durum: 'aktif' }, orderBy: { kod: 'asc' } }),
    db.uretimUnitesi.findMany({ orderBy: { kod: 'asc' } }),
    db.sistemServis.findMany({ orderBy: { kod: 'asc' } }),
    db.agBolgesi.findMany({ orderBy: { kod: 'asc' } }),
    db.kullanici.findMany({ where: { aktif: true }, orderBy: { adSoyad: 'asc' } }),
  ]);

  const veri = varliklar.map((v) => ({
    id: v.id, etiket: v.etiket, ad: v.ad,
    tur: { id: v.tur.id, kod: v.tur.kod, ad: v.tur.ad, sinif: v.tur.sinif },
    tesis: v.tesis ? { id: v.tesis.id, kod: v.tesis.kod, ad: v.tesis.ad } : null,
    unite: v.unite ? { id: v.unite.id, kod: v.unite.kod, ad: v.unite.ad } : null,
    sistem: v.sistem ? { id: v.sistem.id, kod: v.sistem.kod, ad: v.sistem.ad } : null,
    bolge: v.bolge ? { id: v.bolge.id, kod: v.bolge.kod, ad: v.bolge.ad, tip: v.bolge.tip } : null,
    sahip: v.sahip ? { id: v.sahip.id, ad: v.sahip.adSoyad } : null,
    emanetci: v.emanetci ? { id: v.emanetci.id, ad: v.emanetci.adSoyad } : null,
    tedarikci: v.tedarikci ? { id: v.tedarikci.id, ad: v.tedarikci.ad } : null,
    sozlesme: v.sozlesme ? { id: v.sozlesme.id, kod: v.sozlesme.kod, ad: v.sozlesme.ad } : null,
    hostname: v.hostname, seriNo: v.seriNo, uretici: v.uretici, model: v.model,
    ipAdresi: v.ipAdresi, macAdresi: v.macAdresi, isletimSistemi: v.isletimSistemi,
    firmware: v.firmware, surum: v.surum, rafOda: v.rafOda,
    kimlikDogrulama: v.kimlikDogrulama,
    kritiklik: v.kritiklik, yamaDurumu: v.yamaDurumu, edrDurumu: v.edrDurumu,
    yedekDurumu: v.yedekDurumu, izlemeDurumu: v.izlemeDurumu, logKaynagi: v.logKaynagi,
    internetMaruziyeti: v.internetMaruziyeti, uzaktanErisim: v.uzaktanErisim,
    yasamDongusu: v.yasamDongusu,
    kurulumTarihi: v.kurulumTarihi?.toISOString() ?? null,
    garantiBitis: v.garantiBitis?.toISOString() ?? null,
    destekBitis: v.destekBitis?.toISOString() ?? null,
    eolTarihi: v.eolTarihi?.toISOString() ?? null,
    eosTarihi: v.eosTarihi?.toISOString() ?? null,
    guncellendi: v.guncellendi.toISOString(),
    gidenIliskiler: v.kaynakIliskiler.map((i) => ({
      id: i.id, tip: i.tip, diger: { id: i.hedef.id, etiket: i.hedef.etiket, ad: i.hedef.ad },
    })),
    gelenIliskiler: v.hedefIliskiler.map((i) => ({
      id: i.id, tip: i.tip, diger: { id: i.kaynak.id, etiket: i.kaynak.etiket, ad: i.kaynak.ad },
    })),
    riskler: v.riskler.filter((r) => !r.risk.silindi).map((r) => ({
      id: r.risk.id, kod: r.risk.kod, baslik: r.risk.baslik, durum: r.risk.durum,
    })),
    kanitlar: v.kanitlar.filter((kb) => !kb.kanit.silindi).map((kb) => ({
      id: kb.kanit.id, ad: kb.kanit.ad, tip: kb.kanit.tip,
    })),
    acikZafiyet: v.zafiyetler.filter((z) => z.durum === 'acik').length,
  }));

  return (
    <>
      <UstCubuk baslik="IT/OT Envanteri" />
      <main className="icerik">
        <EnvanterIstemci
          varliklar={veri}
          turler={turler.map((t) => ({ id: t.id, kod: t.kod, ad: t.ad, sinif: t.sinif }))}
          tesisler={tesisler.map((t) => ({ id: t.id, kod: t.kod, ad: t.ad }))}
          uniteler={uniteler.map((u) => ({ id: u.id, kod: u.kod, ad: u.ad, tesisId: u.tesisId }))}
          sistemler={sistemler.map((s) => ({ id: s.id, kod: s.kod, ad: s.ad }))}
          bolgeler={bolgeler.map((b) => ({ id: b.id, kod: b.kod, ad: b.ad, tip: b.tip }))}
          kullanicilar={kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad }))}
        />
      </main>
    </>
  );
}
