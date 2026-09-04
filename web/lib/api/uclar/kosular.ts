import 'server-only';
import { db } from '../../db';
import { ApiHata } from '../hatalar';
import { imlecKosulu, sayfaSorgusu, sayfaYaniti } from '../sayfalama';
import { metinParam, nerede, secenekParam, tarihParam } from '../sorgu';
import { apiUcu } from '../ucnokta';

/* GET /api/v1/integration-runs - entegrasyon kosu defteri.

   Kosular santral boyutunda BOLUNMEZ; bu yuzden santrale kisitli bir anahtar
   bu ucu goremez (aksi halde baska santrallerin kosu sayaclari sizardi).
   Kapsamsiz (kurum geneli) yonetim okuma izni sarttir.

   Sayaclar AYRI tutulur: 'alinan' ile 'kabul edilen' ayni sey degildir ve
   reddedilen kayit sessizce yok sayilmaz. */

const DURUMLAR = ['calisiyor', 'basarili', 'basarisiz'] as const;
const TETIKLEYENLER = ['manuel', 'zamanlanmis', 'api'] as const;

export const GET = apiUcu(
  { uc: 'integration-runs', modul: 'yonetim', islem: 'okuma' },
  async ({ url, kapsam }) => {
  if (kapsam !== null) {
    throw new ApiHata('kapsam_disi',
      'Entegrasyon kosulari santral bazinda bolunmez; kurum geneli yonetim okuma izni gerekir');
  }

  const { limit, imlec } = sayfaSorgusu(url);
  const durum = secenekParam(url, 'status', DURUMLAR);
  const tetikleyen = secenekParam(url, 'trigger', TETIKLEYENLER);
  const kaynak = metinParam(url, 'source', 120);
  const connectorId = metinParam(url, 'connectorId', 64);
  const baslangictan = tarihParam(url, 'startedSince');

  const satirlar = await db.entegrasyonKosusu.findMany({
    where: nerede(
      durum ? { durum } : {},
      tetikleyen ? { tetikleyen } : {},
      kaynak ? { kaynak } : {},
      connectorId ? { connectorId } : {},
      baslangictan ? { baslangic: { gte: baslangictan } } : {},
      imlecKosulu(imlec, 'desc'),
    ),
    orderBy: { id: 'desc' },
    take: limit + 1,
  });

  return {
    govde: sayfaYaniti(satirlar, limit, (k) => ({
      id: k.id,
      source: k.kaynak,
      connectorId: k.connectorId,
      trigger: k.tetikleyen,
      status: k.durum,
      confidenceLabel: k.guvenEtiketi,
      startedAt: k.baslangic.toISOString(),
      finishedAt: k.bitis?.toISOString() ?? null,
      durationMs: k.sureMs,
      received: k.alinan,
      accepted: k.kabulEdilen,
      rejected: k.reddedilen,
      duplicate: k.yinelenen,
      recordCount: k.kayitSayisi,
      attempt: k.denemeNo,
      cursorBefore: k.imlecOnce,
      cursorAfter: k.imlecSonra,
      error: k.hata,
    })),
  };
});
