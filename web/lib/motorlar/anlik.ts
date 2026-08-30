import 'server-only';
import { db } from '../db';

/* Uyum anlık görüntüsü motoru (§44): aktif süreçler için günde bir kez
   süreç ve süreç×tesis kırılımında durum sayıları + güven dağılımı saklar.
   Tarihsel karşılaştırma ve trend bu tablodan okunur; kayıtlar silinmez. */

export async function anlikGoruntuAl(): Promise<{ islenen: number; uretilen: number }> {
  const gunBasi = new Date(); gunBasi.setHours(0, 0, 0, 0);
  const surecler = await db.uyumSureci.findMany({
    where: { durum: 'aktif' }, include: { kapsam: true } });
  let islenen = 0, uretilen = 0;

  for (const surec of surecler) {
    islenen++;
    const bugunku = await db.uyumAnlik.findFirst({
      where: { surecId: surec.id, tesisId: null, tarih: { gte: gunBasi } } });
    if (bugunku) continue; // günde bir

    const gruplar = await db.maddeDurumu.groupBy({
      by: ['tesisId', 'durum', 'guven'], where: { surecId: surec.id },
      _count: { _all: true } });

    const ozet = (tesisId: string | null) => {
      const ilgili = gruplar.filter((g) => tesisId === null || g.tesisId === tesisId);
      const durumlar: Record<string, number> = {};
      const guvenler: Record<string, number> = {};
      for (const g of ilgili) {
        durumlar[g.durum] = (durumlar[g.durum] ?? 0) + g._count._all;
        guvenler[g.guven] = (guvenler[g.guven] ?? 0) + g._count._all;
      }
      return { durumlar, guvenler };
    };

    await db.uyumAnlik.create({ data: {
      surecId: surec.id, tesisId: null, ozetJson: JSON.stringify(ozet(null)) } });
    uretilen++;
    for (const kapsamKaydi of surec.kapsam) {
      await db.uyumAnlik.create({ data: {
        surecId: surec.id, tesisId: kapsamKaydi.tesisId,
        ozetJson: JSON.stringify(ozet(kapsamKaydi.tesisId)) } });
      uretilen++;
    }
  }
  return { islenen, uretilen };
}
