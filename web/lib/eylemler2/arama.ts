'use server';

import { db } from '../db';
import { aktifKullanici } from '../auth';
import { izinliTesisIdleri } from '../erisim';
import { aramaKosulu, aramaOr } from '../aramaKosulu';
import { kapsamAnahtari, kapsamSozlugu } from '../dil/sozlukOku';
import { tBas } from '../dil/terimler';

/* Global arama (§27): tek kutudan tesis, madde, bulgu, risk, varlık, proje,
   denetim. Sonuçlar kullanıcının tesis kapsamıyla DARALTILIR (veri seviyesi). */

export type AramaSonucu = {
  tip: string; id: string; baslik: string; altBilgi: string; yol: string;
};

/* SIRALAMA ZORUNLUDUR (R5, ölçüldü): `take` var, `orderBy` yoksa dönen satırlar
   SEÇİLMİŞ değil RASTGELEDİR. SQLite pratikte rowid sırası verdiği için bu
   görünmüyordu; PostgreSQL'de aynı sorgu her çağrıda başka beş satır döndürebilir
   ve kullanıcı "aradığım kayıt bazen çıkıyor bazen çıkmıyor" der. Ölçüldü:
   PostgreSQL koşusunda `ara(tesis.kod)` aranan tesisi bulamadı — arama bozuk
   değildi, ilk beş satır başkalarıydı. */
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
        ...(tesisKapsami === null ? {} : { id: { in: tesisKapsami } }) }, orderBy: { kod: 'asc' }, take: 5 }),
      db.madde.findMany({ where: {
        silindi: null,
        AND: [
          { OR: aramaOr(['kod', 'baslik'], q) },
          { OR: [{ surum: { durum: 'aktif' } }, { surumId: null }] },
        ] },
        orderBy: [{ kod: 'asc' }, { id: 'asc' }], take: 6, include: { regulasyon: true } }),
      db.bulgu.findMany({ where: {
        baslik: aramaKosulu(q), silindi: null,
        maddeDurumu: tesisKapsami === null ? {} : { kapsamOgesi: { tesisId: { in: tesisKapsami } } } },
        orderBy: [{ baslik: 'asc' }, { id: 'asc' }], take: 5,
        include: { maddeDurumu: { include: { kapsamOgesi: { select: { id: true, kod: true, ad: true, tesisId: true } } } } } }),
      db.risk.findMany({ where: {
        OR: aramaOr(['kod', 'baslik'], q),
        silindi: null, ...tesisFiltre }, orderBy: { kod: 'asc' }, take: 5 }),
      db.varlik.findMany({ where: {
        OR: aramaOr(['etiket', 'ad'], q),
        silindi: null, ...tesisFiltre }, orderBy: [{ etiket: 'asc' }, { id: 'asc' }], take: 5 }),
      db.proje.findMany({ where: {
        OR: aramaOr(['kod', 'ad'], q), silindi: null }, orderBy: { kod: 'asc' }, take: 4 }),
      db.denetim.findMany({ where: {
        OR: aramaOr(['kod', 'ad'], q), silindi: null }, orderBy: { kod: 'asc' }, take: 4 }),
    ]);

  /* Sonuç TÜRÜ ekranda rozet olarak görünür (`KomutPaleti` · `.tur`),
     kod anahtarı değil — sözlükten gelir. */
  const sozluk = await kapsamSozlugu(kapsamAnahtari(tesisKapsami));

  return [
    ...tesisler.map((t) => ({ tip: tBas(sozluk, 'tesis'), id: t.id, baslik: t.ad,
      altBilgi: t.kod, yol: `/tesisler/${t.id}` })),
    ...maddeler.map((m) => ({ tip: 'Madde', id: m.id, baslik: m.baslik,
      altBilgi: `${m.kod} · ${m.regulasyon.kod}`, yol: '/regulasyonlar' })),
    ...bulgular.map((b) => ({ tip: 'Bulgu', id: b.id, baslik: b.baslik,
      altBilgi: b.maddeDurumu.kapsamOgesi.kod, yol: `/bulgular/${b.id}` })),
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
