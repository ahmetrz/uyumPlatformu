import type { Metadata } from 'next';
import { girisZorunlu, izinliTesisIdleri } from '@/lib/erisim';
import { db } from '@/lib/db';
import { Yetkisiz } from '@/components/abacus/temel';
import { tarihTR } from '@/lib/sabitler';
import { hucreOzeti } from '../mantik';
import KanitPaketiIstemci, { type KapsamSatiri } from './KanitPaketiIstemci';

export const metadata: Metadata = { title: 'Kanıt paketi — Atlas' };

/* Denetim kanıt paketi yüzeyi (§19).

   Ekran bir şey ÜRETMEZ; hangi kapsamların paketlenebilir olduğunu gösterir
   ve üretimi sunucu eylemine (lib/eylemler2/disaAktarim.ts) devreder. Kapsam
   VERİ seviyesinde daraltılır: `izinliTesisIdleri` dışındaki santral bu
   listeye hiç girmez — ekranda göstermeyip eylemde reddetmek, kullanıcıya
   var olmayan bir düğme göstermek olurdu.

   Uyum semantiği raporlar/mantik.ts ile AYNI kaynaktan gelir (hucreOzeti):
   bilinmeyen madde yüzdenin paydasına girmez ve sıfır sayılmaz. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  const izinli = izinliTesisIdleri(k, 'denetim');
  if (izinli !== null && izinli.length === 0) return <Yetkisiz rol="denetim okuma" />;

  const tesisSuzgeci = izinli === null ? {} : { tesisId: { in: izinli } };

  const [surecler, gruplar, maddeDurumlari, bulgular] = await Promise.all([
    db.uyumSureci.findMany({
      include: { regulasyon: true },
      orderBy: { kod: 'asc' },
    }),
    db.maddeDurumu.groupBy({
      by: ['surecId', 'tesisId', 'durum'],
      where: tesisSuzgeci,
      _count: { _all: true },
    }),
    db.maddeDurumu.findMany({
      where: tesisSuzgeci,
      select: { id: true, surecId: true, tesisId: true, sonDegerlendirme: true },
    }),
    db.bulgu.findMany({
      where: { silindi: null, maddeDurumu: tesisSuzgeci },
      select: { durum: true, maddeDurumu: { select: { surecId: true, tesisId: true } } },
    }),
  ]);

  const tesisIdleri = [...new Set(maddeDurumlari.map((m) => m.tesisId))];
  const [tesisler, kokenSatirlari] = await Promise.all([
    db.tesis.findMany({
      where: { id: { in: tesisIdleri } },
      select: { id: true, kod: true, ad: true },
    }),
    /* Köken evreni: paketteki her satırın kökeni olup olmadığı BURADA da
       sayılır ki ekran "kökeni yok" sayısını paketle aynı şekilde bildirsin.
       Kökensiz satır elenmez, sayılır. */
    db.veriKokeni.findMany({
      where: { varlikTipi: 'MaddeDurumu', varlikId: { in: maddeDurumlari.map((m) => m.id) } },
      select: { varlikId: true },
    }),
  ]);

  const tesisAdi = new Map(tesisler.map((t) => [t.id, t]));
  const surecAdi = new Map(surecler.map((s) => [s.id, s]));
  const kokenliler = new Set(kokenSatirlari.map((s) => s.varlikId));

  /* (süreç, tesis) → durum sayıları — raporlar ekranıyla aynı kova. */
  const sayilar = new Map<string, Record<string, number>>();
  for (const g of gruplar) {
    const anahtar = `${g.surecId}|${g.tesisId}`;
    const kova = sayilar.get(anahtar) ?? {};
    kova[g.durum] = (kova[g.durum] ?? 0) + g._count._all;
    sayilar.set(anahtar, kova);
  }

  const acikBulgu = new Map<string, number>();
  for (const b of bulgular) {
    if (b.durum === 'kapali' || b.durum === 'kabul_edildi') continue;
    const anahtar = `${b.maddeDurumu.surecId}|${b.maddeDurumu.tesisId}`;
    acikBulgu.set(anahtar, (acikBulgu.get(anahtar) ?? 0) + 1);
  }

  const kokensiz = new Map<string, number>();
  const sonDegerlendirme = new Map<string, Date>();
  for (const m of maddeDurumlari) {
    const anahtar = `${m.surecId}|${m.tesisId}`;
    if (!kokenliler.has(m.id)) kokensiz.set(anahtar, (kokensiz.get(anahtar) ?? 0) + 1);
    if (m.sonDegerlendirme) {
      const mevcut = sonDegerlendirme.get(anahtar);
      if (!mevcut || m.sonDegerlendirme > mevcut) sonDegerlendirme.set(anahtar, m.sonDegerlendirme);
    }
  }

  const satirlar: KapsamSatiri[] = [...sayilar.entries()].flatMap(([anahtar, kova]) => {
    const [surecId, tesisId] = anahtar.split('|');
    const surec = surecAdi.get(surecId);
    const tesis = tesisAdi.get(tesisId);
    if (!surec || !tesis) return [];
    const ozet = hucreOzeti(surecId, kova);
    return [{
      anahtar,
      tesisId,
      tesisKod: tesis.kod,
      tesisAd: tesis.ad,
      regulasyonId: surec.regulasyonId,
      regulasyonKod: surec.regulasyon.kod,
      surecKod: surec.kod,
      hucre: ozet,
      madde: ozet.kapsam,
      acikBulgu: acikBulgu.get(anahtar) ?? 0,
      kokensiz: kokensiz.get(anahtar) ?? 0,
      sonDegerlendirme: sonDegerlendirme.has(anahtar)
        ? tarihTR(sonDegerlendirme.get(anahtar)!)
        : null,
    }];
  });

  return (
    <KanitPaketiIstemci
      satirlar={satirlar}
      kisitliKapsam={izinli !== null}
      bugun={new Date().toISOString().slice(0, 10)}
    />
  );
}
