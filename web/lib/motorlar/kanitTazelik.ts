import 'server-only';
import { db } from '../db';

/* Kanıt tazelik motoru (§15): gecerliBitis tarihi geçmiş, silinmemiş kanıtlar
   bayat sayılır. Bağlı madde durumlarında YALNIZ kanitBayat=true + guven=
   'bayat_kanit' işaretlenir — durum ALANINA DOKUNULMAZ: değerlendirme tarihi
   korunur, uyum otomatik düşürülmez (insan yeniden değerlendirir).
   Her bayat kanıt için açık bir 'kanit_yenileme' görevi güvence altına alınır. */

export async function kanitTazeligiIsle(): Promise<{ islenen: number; uretilen: number }> {
  const simdi = new Date();
  const bayatKanitlar = await db.kanit.findMany({
    where: { silindi: null, gecerliBitis: { lt: simdi } },
    include: { baglantilar: {
      include: { maddeDurumu: { select: { id: true, tesisId: true } } },
      orderBy: { eklendi: 'asc' },
    } },
  });

  let islenen = 0, uretilen = 0;
  for (const kanit of bayatKanitlar) {
    islenen++;

    const durumIdleri = kanit.baglantilar.map((b) => b.maddeDurumu.id);
    if (durumIdleri.length > 0) {
      await db.maddeDurumu.updateMany({
        where: { id: { in: durumIdleri } },
        data: { kanitBayat: true, guven: 'bayat_kanit' },
      });
    }

    // Açık (acik/yapiliyor) yenileme görevi zaten varsa yenisi üretilmez.
    const acikGorev = await db.gorev.findFirst({ where: {
      tip: 'kanit_yenileme', kaynakTipi: 'Kanit', kaynakId: kanit.id,
      durum: { in: ['acik', 'yapiliyor'] },
    } });
    if (!acikGorev) {
      await db.gorev.create({ data: {
        baslik: `Kanıt yenileme: ${kanit.ad}`,
        tip: 'kanit_yenileme', kaynakTipi: 'Kanit', kaynakId: kanit.id,
        sorumluId: kanit.sahipId ?? kanit.yukleyenId ?? null, // sorumlu: kanıt sahibi
        tesisId: kanit.baglantilar[0]?.maddeDurumu.tesisId ?? null, // bağlı ilk durumun tesisi
        sonTarih: kanit.gecerliBitis,
        otomatikUretildi: true,
      } });
      uretilen++;
    }
  }
  return { islenen, uretilen };
}
