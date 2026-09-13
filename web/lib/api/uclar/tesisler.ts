import 'server-only';
import { db } from '../../db';
import { imlecKosulu, sayfaSorgusu, sayfaYaniti } from '../sayfalama';
import { nerede, secenekParam } from '../sorgu';
import { apiUcu } from '../ucnokta';

/* GET /api/v1/facilities
   Anahtarin GOREBILDIGI tesisler. Kapsam disi tesis listede YER ALMAZ;
   kapsami sinirli anahtar kac tesis oldugunu bile ogrenemez.

   SEKTOR NITELIKLERI SABIT ALAN DEGIL (P1 · §0.5): "kurulu guc" bir
   enerji niteligidir, su tesisinde "gunluk debi" olur. Yanit bu yuzden
   `attributes` haritasi tasir; anahtarlar sektor paketinden gelir, koda
   gomulu degildir. Olculmemis nitelik haritada YER ALMAZ — `null` bir
   deger degil, olcumun yoklugu ve ikisi ayni sey degildir. */

export const GET = apiUcu(
  { uc: 'facilities', modul: 'envanter', islem: 'okuma' },
  async ({ url, kapsam }) => {
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
    include: {
      tip: { select: { kod: true, ad: true } },
      tuzelKisi: { select: { ad: true } },
      ozellikler: { select: { anahtar: true, sayisalDeger: true, metinDeger: true, birim: true } },
    },
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
      /* Olculmus nitelikler. Anahtari OLMAYAN nitelik olculmemistir;
         `null` yazip "degeri yok" demiyoruz. */
      attributes: Object.fromEntries(t.ozellikler.map((o) => [
        o.anahtar,
        { value: o.sayisalDeger ?? o.metinDeger, unit: o.birim },
      ])),
      location: t.konum,
      commissionedAt: t.devreyeGiris?.toISOString() ?? null,
      closedAt: t.kapanisTarihi?.toISOString() ?? null,
    })),
  };
});
