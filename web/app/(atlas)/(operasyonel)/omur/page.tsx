import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import OmurIstemci from './OmurIstemci';
import { omruCoz, type Proje, type VarlikKaydi } from './mantik';

export const metadata: Metadata = { title: 'Ömür yönetimi — Atlas' };

/* O13 · EOL / EOS & Ömür yönetimi — "önce neyi değiştiriyoruz?"
   Yerleşim kabuğu (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir;
   bu sayfa yalnız <main> ve seçim varsa <aside class="cekmece"> üretir.

   Ömür kuyruğu tek sorguda kurulur: varlığın kendi tarihleri + üstündeki
   yazılım ürünlerinin EOS'u + risk→kontrol (telafi edici kontrol) +
   risk→proje / varlık→proje (bağlı proje). Hiçbir eşik sabit yazılmaz;
   kuyruk seed değiştiğinde kendiliğinden değişir. */

export default async function Sayfa() {
  await girisZorunlu();

  // `new Date()` sunucuda istek başına bir kez okunur; tüm eşikler bu ana göre.
  const simdi = new Date().getTime();

  const [varliklar, toplamVarlik] = await Promise.all([
    db.varlik.findMany({
      where: { silindi: null },
      select: {
        id: true, etiket: true, ad: true, kritiklik: true, yasamDongusu: true,
        destekBitis: true, eolTarihi: true, eosTarihi: true,
        tur: { select: { ad: true } },
        tesis: { select: { id: true, ad: true } },
        tedarikci: { select: { ad: true } },
        yazilimlar: {
          select: {
            yazilim: {
              select: { ad: true, surum: true, uretici: true, eolTarihi: true, eosTarihi: true },
            },
          },
        },
        riskler: {
          select: {
            risk: {
              select: {
                id: true, kod: true, baslik: true, durum: true, silindi: true,
                kontroller: { select: { madde: { select: { kod: true, baslik: true } } } },
                projeler: {
                  select: {
                    proje: { select: { id: true, kod: true, ad: true, durum: true, silindi: true } },
                  },
                },
              },
            },
          },
        },
        projeBaglantilari: {
          select: {
            proje: { select: { id: true, kod: true, ad: true, durum: true, silindi: true } },
          },
        },
      },
      orderBy: { etiket: 'asc' },
    }),
    db.varlik.count({ where: { silindi: null } }),
  ]);

  const kayitlar: VarlikKaydi[] = varliklar.map((v) => {
    // Desteği bitmiş yazılım kurulumları — en erken EOS önce (satırda ürün adı yazılır).
    const bitenYazilimlar = v.yazilimlar
      .map((k) => k.yazilim)
      .filter((y) => y.eosTarihi !== null && y.eosTarihi.getTime() < simdi)
      .sort((a, b) => (a.eosTarihi as Date).getTime() - (b.eosTarihi as Date).getTime())
      .map((y) => ({
        ad: y.ad, surum: y.surum, uretici: y.uretici,
        eos: (y.eosTarihi as Date).toISOString(),
      }));

    const riskler = v.riskler.map((r) => r.risk).filter((r) => r.silindi === null);

    // Telafi edici kontrol = varlığa bağlı risklerin RiskKontrol maddeleri.
    const kontroller = riskler.flatMap((r) =>
      r.kontroller.map((k) => ({ kod: k.madde.kod, baslik: k.madde.baslik, riskKod: r.kod })));

    /* Bağlı proje: doğrudan varlık bağlantısı ya da varlığın riski üzerinden.
       Seed'de varlık→proje doğrudan bağı henüz yok; zincir risk üzerinden
       kuruluyor, ikisi de aynı ProjeBaglantisi kaydından okunur. */
    const projeHavuzu = [
      ...v.projeBaglantilari.map((p) => p.proje),
      ...riskler.flatMap((r) => r.projeler.map((p) => p.proje)),
    ].filter((p) => p.silindi === null && p.durum !== 'tamamlandi');
    const projeler: Proje[] = [];
    for (const p of projeHavuzu) {
      if (!projeler.some((x) => x.id === p.id)) {
        projeler.push({ id: p.id, kod: p.kod, ad: p.ad, durum: p.durum });
      }
    }

    return {
      id: v.id,
      etiket: v.etiket,
      ad: v.ad,
      turAd: v.tur.ad,
      tesisId: v.tesis?.id ?? null,
      tesisAd: v.tesis?.ad ?? null,
      tedarikciAd: v.tedarikci?.ad ?? null,
      kritiklik: v.kritiklik,
      yasamDongusu: v.yasamDongusu,
      destekBitis: v.destekBitis?.toISOString() ?? null,
      eolTarihi: v.eolTarihi?.toISOString() ?? null,
      eosTarihi: v.eosTarihi?.toISOString() ?? null,
      bitenYazilimlar,
      kontroller,
      riskler: riskler.map((r) => ({ id: r.id, kod: r.kod, baslik: r.baslik })),
      projeler,
    };
  });

  /* Ömür kuyruğu: bir ömür sinyali taşıyan varlıklar. Sağlıklı varlıklar
     istemciye hiç gitmez — ekranın konusu değiller. */
  const kuyruk = kayitlar.filter((v) => {
    const o = omruCoz(v, simdi);
    return o.durum === 'bd' || o.tarihYok || o.yaklasan
      || (v.eolTarihi !== null && new Date(v.eolTarihi).getTime() < simdi);
  });

  return (
    <OmurIstemci kayitlar={kuyruk} toplamVarlik={toplamVarlik} simdi={simdi} />
  );
}
