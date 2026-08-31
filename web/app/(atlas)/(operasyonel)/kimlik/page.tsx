import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import KimlikIstemci from './KimlikIstemci';
import type { Bag, Hesap } from './mantik';

export const metadata: Metadata = { title: 'Erişim incelemesi — Atlas' };

/* O15 · Identity & Access Review — "kimin fazla yetkisi var?"
   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   Metrikler sabit yazılmaz: hepsi KimlikHesabi / ErisimAtamasi /
   ErisimIncelemesi üçlüsünden hesaplanır (bkz. mantik.ts). */

const BAG_BUTCESI = 4;

export default async function Sayfa() {
  await girisZorunlu();

  const [hesaplar, riskler, bulgular] = await Promise.all([
    db.kimlikHesabi.findMany({
      include: {
        kullanici: true,
        tesis: true,
        atamalar: {
          include: {
            varlik: true,
            incelemeler: { include: { inceleyen: true }, orderBy: { zaman: 'desc' }, take: 1 },
          },
          orderBy: { verilis: 'asc' },
        },
      },
      orderBy: { hesapAdi: 'asc' },
    }),
    db.risk.findMany({
      where: { silindi: null, durum: { in: ['acik', 'islemde'] } },
      include: { varliklar: { select: { varlikId: true } }, tesis: true },
      orderBy: { artikRisk: 'desc' },
    }),
    db.bulgu.findMany({
      where: { silindi: null, durum: { in: ['acik', 'aksiyonda'] } },
      include: { maddeDurumu: { include: { madde: true, tesis: true } } },
      orderBy: { onemDerecesi: 'asc' },
    }),
  ]);

  /* Bağlı kayıt iki yoldan kurulur ve hangisi olduğu satırda YAZILIR:
     (a) atamanın varlığı üzerinden — kesin bağ,
     (b) hesabın santralindeki açık risk/bulgu — bağlam bağı.
     Uydurma ilişki kurulmaz; ikisi de yoksa çekmece bunu söyler. */
  const varlikRiski = new Map<string, typeof riskler>();
  for (const r of riskler) {
    for (const v of r.varliklar) {
      varlikRiski.set(v.varlikId, [...(varlikRiski.get(v.varlikId) ?? []), r]);
    }
  }

  const veri: Hesap[] = hesaplar.map((h) => {
    const varlikIdleri = h.atamalar.map((a) => a.varlikId).filter((v): v is string => !!v);

    const kesin: Bag[] = [...new Set(varlikIdleri.flatMap((v) => varlikRiski.get(v) ?? []))]
      .map((r) => ({
        id: `r-${r.id}`, kod: r.kod, alt: 'risk · varlık üzerinden',
        yol: `/riskler/${r.id}`, suren: r.durum === 'islemde',
      }));

    const santralRiski: Bag[] = h.tesisId
      ? riskler
        .filter((r) => r.tesisId === h.tesisId && !kesin.some((k) => k.id === `r-${r.id}`))
        .slice(0, 2)
        .map((r) => ({
          id: `r-${r.id}`, kod: r.kod, alt: `risk · ${r.tesis?.kod ?? 'portföy'}`,
          yol: `/riskler/${r.id}`, suren: r.durum === 'islemde',
        }))
      : [];

    const santralBulgusu: Bag[] = h.tesisId
      ? bulgular
        .filter((b) => b.maddeDurumu.tesisId === h.tesisId)
        .slice(0, 2)
        .map((b) => ({
          id: `b-${b.id}`, kod: b.baslik,
          alt: `bulgu · ${b.maddeDurumu.madde.kod}`,
          yol: `/bulgular/${b.id}`,
        }))
      : [];

    return {
      id: h.id,
      hesapAdi: h.hesapAdi,
      tip: h.tip,
      kaynakSistem: h.kaynakSistem,
      ayricalikli: h.ayricalikli,
      parolaRotasyon: h.parolaRotasyon?.toISOString() ?? null,
      sonKullanim: h.sonKullanim?.toISOString() ?? null,
      durum: h.durum,
      sahip: h.kullanici?.adSoyad ?? null,
      tesisId: h.tesisId,
      tesisKod: h.tesis?.kod ?? null,
      tesisAd: h.tesis?.ad ?? null,
      yetkiler: h.atamalar.map((a) => ({
        id: a.id,
        kapsam: a.kapsam,
        yetkiSeviyesi: a.yetkiSeviyesi,
        verilis: a.verilis.toISOString(),
        bitis: a.bitis?.toISOString() ?? null,
        varlikEtiketi: a.varlik?.etiket ?? null,
        varlikAd: a.varlik?.ad ?? null,
        sonInceleme: a.incelemeler[0]
          ? {
            sonuc: a.incelemeler[0].sonuc,
            zaman: a.incelemeler[0].zaman.toISOString(),
            inceleyen: a.incelemeler[0].inceleyen?.adSoyad ?? null,
            not: a.incelemeler[0].not,
          }
          : null,
      })),
      bagli: [...kesin, ...santralRiski, ...santralBulgusu].slice(0, BAG_BUTCESI),
    };
  });

  const tesisler = [...new Map(
    hesaplar
      .filter((h) => h.tesis)
      .map((h) => [h.tesis!.id, { id: h.tesis!.id, ad: h.tesis!.ad }]),
  ).values()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

  const kaynaklar = [...new Set(veri.map((h) => h.kaynakSistem).filter((k): k is string => !!k))]
    .sort((a, b) => a.localeCompare(b, 'tr'));

  return <KimlikIstemci hesaplar={veri} tesisler={tesisler} kaynaklar={kaynaklar} />;
}
