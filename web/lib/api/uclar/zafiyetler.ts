import 'server-only';
import { db } from '../../db';
import { hamKayitlar, zafiyetGozlemine, zafiyetKaydiSemasi, zarf } from '../semalar';
import { apiUcu, dogrula } from '../ucnokta';
import { yazmaIzniZorunlu } from '../yetki';
import {
  HataDefteri, izleriYaz, kokeniIsle, kosuIcinde, varlikAnahtarlariniCoz,
  type EslesenVarlik, type IzGirdisi,
} from '../yazma';

/* POST /api/v1/vulnerabilities - tarayici bulgusu -> Zafiyet + VarlikZafiyeti.

   Sinir: bu uc bulgu ACAR, KAPATMAZ. Kaydin durumu ('acik' | 'yamalandi' |
   'kabul_edildi' ...) otomatik degistirilmez - bulguyu otomatik kapatmak
   yasak. Tarayici "artik gormuyorum" dedi diye kayit kapanmaz; kapatma
   insan kararidir. */

export const POST = apiUcu({ modul: 'envanter', islem: 'yazma' }, async ({ govde, kullanici }) => {
  const { records } = dogrula(zarf(zafiyetKaydiSemasi), govde);
  const hamlar = hamKayitlar(govde);
  const { sonuc, kosuId } = await kosuIcinde(
    records.map((r) => r.source),
    async (kosuId) => {
      const defter = new HataDefteri();

      const varliklar = await varlikAnahtarlariniCoz(records.map((r) => r.assetKey));
      const cozumler: {
        indeks: number; gozlem: ReturnType<typeof zafiyetGozlemine>; varlik: EslesenVarlik;
      }[] = [];

      for (const [i, tel] of records.entries()) {
        const gozlem = zafiyetGozlemine(tel, hamlar[i] ?? tel);
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

      const izler: IzGirdisi[] = [];
      let olusan = 0, tazelenen = 0;

      await db.$transaction(async (tx) => {
        for (const c of cozumler) {
          const g = c.gozlem;
          let zafiyet = await tx.zafiyet.findFirst({ where: { kaynakRef: g.kaynakRef } });
          if (!zafiyet) {
            zafiyet = await tx.zafiyet.create({
              data: { kaynakRef: g.kaynakRef, baslik: g.baslik, cvss: g.cvss },
            });
          } else if (zafiyet.baslik !== g.baslik || zafiyet.cvss !== g.cvss) {
            zafiyet = await tx.zafiyet.update({
              where: { id: zafiyet.id }, data: { baslik: g.baslik, cvss: g.cvss },
            });
          }

          const mevcut = await tx.varlikZafiyeti.findUnique({
            where: { zafiyetId_varlikId: { zafiyetId: zafiyet.id, varlikId: c.varlik.id } },
            select: { id: true, sonTarih: true },
          });
          let bagId: string;
          if (mevcut) {
            bagId = mevcut.id;
            // Yalnizca son tarih tazelenir; DURUM'a dokunulmaz.
            if (g.sonTarih && mevcut.sonTarih?.getTime() !== g.sonTarih.getTime()) {
              await tx.varlikZafiyeti.update({ where: { id: bagId }, data: { sonTarih: g.sonTarih } });
            }
            tazelenen += 1;
          } else {
            const yeni = await tx.varlikZafiyeti.create({
              data: {
                zafiyetId: zafiyet.id, varlikId: c.varlik.id,
                durum: 'acik', sonTarih: g.sonTarih,
              },
            });
            bagId = yeni.id;
            olusan += 1;
            izler.push({
              varlikTipi: 'VarlikZafiyeti', varlikId: bagId, eylem: 'olusturma',
              sonra: g.kaynakRef, gerekce: `API zafiyet gozlemi (${g.koken.kaynakSistem})`,
            });
          }
          await kokeniIsle(tx, 'VarlikZafiyeti', bagId, g, kosuId);
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
        closed: 0,
      },
    },
  };
});
