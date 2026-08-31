import 'server-only';
import { db } from '../../db';
import { kokenHaritasi } from '../../entegrasyon/koken';
import { imlecKosulu, sayfaSorgusu, sayfaYaniti } from '../sayfalama';
import { metinParam, nerede, secenekParam, tarihParam } from '../sorgu';
import { apiUcu } from '../ucnokta';
import { tesisKapsamZorunlu } from '../yetki';

/* GET /api/v1/assets - imlec sayfalamali, filtreli varlik listesi.

   Santral izolasyonu: sorgu HER ZAMAN izinliTesisIdleri kumesiyle daraltilir.
   Kapsami sinirli anahtarin gordugu kumede tesisId'si NULL olan varlik da
   YOKTUR (sahipsiz varlik kapsamsiz yazma iznine tabidir). */

const KRITIKLIK = ['dusuk', 'orta', 'yuksek', 'kritik', 'bilinmiyor'] as const;
const YASAM = ['planlandi', 'aktif', 'bakim', 'emekli', 'imha'] as const;

export const GET = apiUcu({ modul: 'envanter', islem: 'okuma' }, async ({ url, kapsam }) => {
  const { limit, imlec } = sayfaSorgusu(url);
  const tesisId = metinParam(url, 'plantId', 64);
  const tesisKodu = metinParam(url, 'plantCode', 64);
  const turKodu = metinParam(url, 'typeCode', 64);
  const kritiklik = secenekParam(url, 'criticality', KRITIKLIK);
  const yasam = secenekParam(url, 'lifecycle', YASAM);
  const degisenden = tarihParam(url, 'updatedSince');

  // Istenen santral kapsam disiysa 403; govdede kayit yok, varlik/yokluk sizmaz.
  if (tesisId) tesisKapsamZorunlu(kapsam, tesisId);

  const satirlar = await db.varlik.findMany({
    where: nerede(
      { silindi: null },
      kapsam ? { tesisId: { in: kapsam } } : {},
      tesisId ? { tesisId } : {},
      tesisKodu ? { tesis: { kod: tesisKodu } } : {},
      turKodu ? { tur: { kod: turKodu } } : {},
      kritiklik ? { kritiklik } : {},
      yasam ? { yasamDongusu: yasam } : {},
      degisenden ? { guncellendi: { gte: degisenden } } : {},
      imlecKosulu(imlec),
    ),
    orderBy: { id: 'asc' },
    take: limit + 1,
    include: {
      tesis: { select: { kod: true } },
      tur: { select: { kod: true, sinif: true } },
      bolge: { select: { kod: true } },
    },
  });

  // Sayfadaki kayitlarin kokeni tek sorguda (N+1 yok). Koken yoksa kayit
  // MANUELDIR; "bilinmeyen kaynak" diye bir koken uydurulmaz.
  const kokenler = await kokenHaritasi('Varlik', satirlar.map((v) => v.id));

  return {
    govde: sayfaYaniti(satirlar, limit, (v) => {
      const koken = kokenler.get(v.id);
      return {
        id: v.id,
        assetTag: v.etiket,
        name: v.ad,
        plantId: v.tesisId,
        plantCode: v.tesis?.kod ?? null,
        typeCode: v.tur.kod,
        typeClass: v.tur.sinif,
        hostname: v.hostname,
        ipAddress: v.ipAdresi,
        macAddress: v.macAdresi,
        serialNumber: v.seriNo,
        vendor: v.uretici,
        model: v.model,
        operatingSystem: v.isletimSistemi,
        firmware: v.firmware,
        zoneCode: v.bolge?.kod ?? null,
        criticality: v.kritiklik,
        lifecycle: v.yasamDongusu,
        patchStatus: v.yamaDurumu,
        backupStatus: v.yedekDurumu,
        internetExposure: v.internetMaruziyeti,
        eolAt: v.eolTarihi?.toISOString() ?? null,
        eosAt: v.eosTarihi?.toISOString() ?? null,
        updatedAt: v.guncellendi.toISOString(),
        provenance: koken
          ? {
              origin: koken.kokenTipi,
              source: koken.kaynakSistem,
              // null = OLCULMEDI, sifir guven DEGIL
              confidence: koken.guven,
              verification: koken.dogrulamaDurumu,
            }
          : { origin: 'manuel', source: null, confidence: null, verification: 'dogrulanmadi' },
      };
    }),
  };
});
