import 'server-only';
import { db } from '../../db';
import { imlecKosulu, sayfaSorgusu, sayfaYaniti } from '../sayfalama';
import { nerede, secenekParam } from '../sorgu';
import { apiUcu } from '../ucnokta';

/* GET /api/v1/plants
   Anahtarin GOREBILDIGI santraller. Kapsam disi santral listede YER ALMAZ;
   kapsami sinirli anahtar kac santral oldugunu bile ogrenemez. */

export const GET = apiUcu({ modul: 'envanter', islem: 'okuma' }, async ({ url, kapsam }) => {
  const { limit, imlec } = sayfaSorgusu(url);
  const durum = secenekParam(url, 'status', ['aktif', 'kapali'] as const);

  const satirlar = await db.tesis.findMany({
    where: nerede(
      kapsam ? { id: { in: kapsam } } : {},
      durum ? { durum } : {},
      imlecKosulu(imlec),
    ),
    orderBy: { id: 'asc' },
    take: limit + 1,
    include: { tip: { select: { kod: true, ad: true } }, tuzelKisi: { select: { ad: true } } },
  });

  return {
    govde: sayfaYaniti(satirlar, limit, (t) => ({
      id: t.id,
      code: t.kod,
      name: t.ad,
      typeCode: t.tip?.kod ?? null,
      typeName: t.tip?.ad ?? null,
      status: t.durum,
      legalEntity: t.tuzelKisi?.ad ?? null,
      // null = OLCULMEDI / bilinmiyor; sifir kurulu guc demek DEGIL
      capacityMw: t.kuruluGucMw,
      location: t.konum,
      commissionedAt: t.devreyeGiris?.toISOString() ?? null,
      closedAt: t.kapanisTarihi?.toISOString() ?? null,
    })),
  };
});
