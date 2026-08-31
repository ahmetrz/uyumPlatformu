'use server';

import { db } from '../db';
import { aktifKullanici } from '../auth';
import { izinliTesisIdleri } from '../erisim';
import { aramaKosulu, aramaOr } from '../aramaKosulu';

/* Global arama (§27): tek kutudan tesis, madde, bulgu, risk, varlık, proje,
   denetim. Sonuçlar kullanıcının tesis kapsamıyla DARALTILIR (veri seviyesi). */

export type AramaSonucu = {
  tip: string; id: string; baslik: string; altBilgi: string; yol: string;
};

export async function ara(sorgu: string): Promise<AramaSonucu[]> {
  const k = await aktifKullanici();
  if (!k || sorgu.trim().length < 2) return [];
  const q = sorgu.trim();
  const tesisKapsami = izinliTesisIdleri(k, 'uyum');
  const tesisFiltre = tesisKapsami === null ? {} : { tesisId: { in: tesisKapsami } };

  const [tesisler, maddeler, bulgular, riskler, varliklar, projeler, denetimler] =
    await Promise.all([
      db.tesis.findMany({ where: {
        OR: aramaOr(['kod', 'ad'], q),
        ...(tesisKapsami === null ? {} : { id: { in: tesisKapsami } }) }, take: 5 }),
      db.madde.findMany({ where: {
        silindi: null,
        AND: [
          { OR: aramaOr(['kod', 'baslik'], q) },
          { OR: [{ surum: { durum: 'aktif' } }, { surumId: null }] },
        ] },
        take: 6, include: { regulasyon: true } }),
      db.bulgu.findMany({ where: {
        baslik: aramaKosulu(q), silindi: null,
        maddeDurumu: tesisKapsami === null ? {} : { tesisId: { in: tesisKapsami } } },
        take: 5, include: { maddeDurumu: { include: { tesis: true } } } }),
      db.risk.findMany({ where: {
        OR: aramaOr(['kod', 'baslik'], q),
        silindi: null, ...tesisFiltre }, take: 5 }),
      db.varlik.findMany({ where: {
        OR: aramaOr(['etiket', 'ad'], q),
        silindi: null, ...tesisFiltre }, take: 5 }),
      db.proje.findMany({ where: {
        OR: aramaOr(['kod', 'ad'], q), silindi: null }, take: 4 }),
      db.denetim.findMany({ where: {
        OR: aramaOr(['kod', 'ad'], q), silindi: null }, take: 4 }),
    ]);

  return [
    ...tesisler.map((t) => ({ tip: 'Tesis', id: t.id, baslik: t.ad,
      altBilgi: t.kod, yol: `/tesisler/${t.id}` })),
    ...maddeler.map((m) => ({ tip: 'Madde', id: m.id, baslik: m.baslik,
      altBilgi: `${m.kod} · ${m.regulasyon.kod}`, yol: '/regulasyonlar' })),
    ...bulgular.map((b) => ({ tip: 'Bulgu', id: b.id, baslik: b.baslik,
      altBilgi: b.maddeDurumu.tesis.kod, yol: `/bulgular/${b.id}` })),
    ...riskler.map((r) => ({ tip: 'Risk', id: r.id, baslik: r.baslik,
      altBilgi: r.kod, yol: '/riskler' })),
    ...varliklar.map((v) => ({ tip: 'Varlık', id: v.id, baslik: v.ad,
      altBilgi: v.etiket, yol: '/envanter' })),
    ...projeler.map((p) => ({ tip: 'Proje', id: p.id, baslik: p.ad,
      altBilgi: p.kod, yol: '/projeler' })),
    ...denetimler.map((d) => ({ tip: 'Denetim', id: d.id, baslik: d.ad,
      altBilgi: d.kod, yol: `/denetimler/${d.id}` })),
  ];
}
