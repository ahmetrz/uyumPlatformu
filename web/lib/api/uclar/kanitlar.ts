import 'server-only';
import { db } from '../../db';
import { imlecKosulu, sayfaSorgusu, sayfaYaniti } from '../sayfalama';
import { metinParam, nerede, secenekParam, tarihParam } from '../sorgu';
import { apiUcu } from '../ucnokta';
import { tesisKapsamZorunlu } from '../yetki';

/* GET /api/v1/evidence - kanit metadatasi (dis denetci/GRC entegrasyonu icin).

   Iki sinir:
   - `dosyaYolu` DONMEZ. Depolama duzeni ic ayrintidir; kanit dosyasi bu
     API'den servis edilmez, yalnizca metadata + hash gorunur.
   - Santrale kisitli anahtar YALNIZ o santrale bagli kaniti gorur. Hicbir
     santrale bagli olmayan (kurum geneli) kanit, kapsami sinirli anahtara
     gosterilmez - guvenli varsayilan. */

const TIPLER = [
  'politika', 'kayit', 'konfigurasyon', 'ekran_goruntusu', 'rapor', 'log',
  'bilet', 'onay', 'test_sonucu', 'egitim_kaydi', 'sozlesme', 'ag_semasi',
] as const;

export const GET = apiUcu({ modul: 'uyum', islem: 'okuma' }, async ({ url, kapsam }) => {
  const { limit, imlec } = sayfaSorgusu(url);
  const tip = secenekParam(url, 'type', TIPLER);
  const tesisId = metinParam(url, 'plantId', 64);
  const toplananSonra = tarihParam(url, 'collectedSince');
  const yalnizGecerli = url.searchParams.get('validOnly') === 'true';

  if (tesisId) tesisKapsamZorunlu(kapsam, tesisId);

  const satirlar = await db.kanit.findMany({
    where: nerede(
      { silindi: null },
      kapsam ? { tesisBaglantilari: { some: { tesisId: { in: kapsam } } } } : {},
      tesisId ? { tesisBaglantilari: { some: { tesisId } } } : {},
      tip ? { tip } : {},
      toplananSonra ? { toplanmaTarihi: { gte: toplananSonra } } : {},
      yalnizGecerli ? { OR: [{ gecerliBitis: null }, { gecerliBitis: { gt: new Date() } }] } : {},
      imlecKosulu(imlec),
    ),
    orderBy: { id: 'asc' },
    take: limit + 1,
    include: { tesisBaglantilari: { select: { tesisId: true } } },
  });

  return {
    govde: sayfaYaniti(satirlar, limit, (k) => ({
      id: k.id,
      name: k.ad,
      type: k.tip,
      source: k.kaynakSistem,
      sourceUrl: k.kaynakUrl,
      contentHash: k.dosyaHash,
      version: k.surum,
      automatic: k.otomatik,
      confidentiality: k.gizlilik,
      collectedAt: k.toplanmaTarihi?.toISOString() ?? null,
      validFrom: k.gecerlilikBaslangic.toISOString(),
      // null = sonsuz gecerli DEGIL, BILINMIYOR: tazelik motoru bunu ayirir
      validUntil: k.gecerliBitis?.toISOString() ?? null,
      plantIds: k.tesisBaglantilari.map((b) => b.tesisId),
    })),
  };
});
