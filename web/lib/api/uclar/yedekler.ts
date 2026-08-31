import 'server-only';
import { db } from '../../db';
import { hamKayitlar, yedekGozlemine, yedekKaydiSemasi, zarf } from '../semalar';
import { apiUcu, dogrula } from '../ucnokta';
import { yazmaIzniZorunlu } from '../yetki';
import {
  HataDefteri, izleriYaz, kokenAnahtari, kokeniIsle, kokenliKayitlar, kosuIcinde,
  varlikAnahtarlariniCoz, type EslesenVarlik, type IzGirdisi,
} from '../yazma';

/* POST /api/v1/backup-results - yedekleme sonuclari -> KonfigurasyonYedegi.

   KonfigurasyonYedegi'nde (kaynak, kaynakKayitId) tekillik kisiti YOK; bu
   yuzden idempotency KOKEN DEFTERINE dayanir: ayni (kaynakSistem,
   kaynakKayitId) daha once yazildiysa yeni satir acilmaz, mevcut tazelenir.

   `dogrulandi` alanina DOKUNULMAZ: yedegin okunabilirligini dogrulamak
   restore testinin (insan) isidir, kaynak sistemin "basarili" demesi degil. */

export const POST = apiUcu({ modul: 'envanter', islem: 'yazma' }, async ({ govde, kullanici }) => {
  const { records } = dogrula(zarf(yedekKaydiSemasi), govde);
  const hamlar = hamKayitlar(govde);
  const { sonuc, kosuId } = await kosuIcinde(
    records.map((r) => r.source),
    async (kosuId) => {
      const defter = new HataDefteri();

      const varliklar = await varlikAnahtarlariniCoz(records.map((r) => r.assetKey));
      const cozumler: {
        indeks: number; gozlem: ReturnType<typeof yedekGozlemine>; varlik: EslesenVarlik;
      }[] = [];

      for (const [i, tel] of records.entries()) {
        const gozlem = yedekGozlemine(tel, hamlar[i] ?? tel);
        const eslesme = varliklar.get(tel.assetKey);
        if (!eslesme) {
          defter.ekle(i, 'assetKey', 'bu anahtarla eslesen varlik yok (once /assets/upsert)');
          continue;
        }
        if (eslesme === 'belirsiz') {
          defter.ekle(i, 'assetKey', 'birden cok varliga uyuyor; tekil bir anahtar gonderin');
          continue;
        }
        yazmaIzniZorunlu(kullanici, 'envanter', eslesme.tesisId);
        cozumler.push({ indeks: i, gozlem, varlik: eslesme });
      }
      defter.bitir();

      const oncekiler = await kokenliKayitlar(
        'KonfigurasyonYedegi',
        cozumler.map((c) => ({
          kaynakSistem: c.gozlem.koken.kaynakSistem,
          kaynakKayitId: c.gozlem.koken.kaynakKayitId,
        })),
      );

      const izler: IzGirdisi[] = [];
      let olusan = 0, tazelenen = 0;

      await db.$transaction(async (tx) => {
        for (const c of cozumler) {
          const g = c.gozlem;
          const veri = {
            varlikId: c.varlik.id,
            kaynakSistem: g.koken.kaynakSistem,
            kaynakKayitId: g.koken.kaynakKayitId,
            yedekZamani: g.yedekZamani,
            surum: g.surum,
            icerikHash: g.icerikHash,
            basarili: g.basarili,
            depolamaKonumu: g.depolamaKonumu,
            hata: g.hata,
          };
          const oncekiId = oncekiler.get(kokenAnahtari(g.koken));
          let kayitId: string;
          if (oncekiId) {
            await tx.konfigurasyonYedegi.update({ where: { id: oncekiId }, data: veri });
            kayitId = oncekiId;
            tazelenen += 1;
          } else {
            const yeni = await tx.konfigurasyonYedegi.create({ data: veri });
            kayitId = yeni.id;
            olusan += 1;
            izler.push({
              varlikTipi: 'KonfigurasyonYedegi', varlikId: kayitId, eylem: 'olusturma',
              sonra: g.basarili ? 'basarili' : 'basarisiz',
              gerekce: `API yedek gozlemi (${g.koken.kaynakSistem})`,
            });
          }
          await kokeniIsle(tx, 'KonfigurasyonYedegi', kayitId, g, kosuId);
        }
      });

      await izleriYaz(kullanici.id, izler);

      return {
        sonuc: { olusan, tazelenen },
        ozet: {
          alinan: records.length, kabulEdilen: olusan + tazelenen,
          reddedilen: 0, yinelenen: tazelenen,
        },
      };
    },
  );

  return {
    govde: {
      data: {
        runId: kosuId,
        received: records.length,
        created: sonuc.olusan,
        refreshed: sonuc.tazelenen,
        rejected: 0,
        // Yedegin geri donebildigi ancak restore testiyle bilinir.
        restoreVerified: false,
      },
    },
  };
});
