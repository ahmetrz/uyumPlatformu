import 'server-only';
import { db } from '../../db';
import { durusGozlemine, durusKaydiSemasi, hamKayitlar, zarf } from '../semalar';
import { apiUcu, dogrula } from '../ucnokta';
import { yazmaIzniZorunlu } from '../yetki';
import {
  HataDefteri, izleriYaz, kokeniIsle, kosuIcinde,
  varlikAnahtarlariniCoz, type EslesenVarlik, type IzGirdisi,
} from '../yazma';

/* POST /api/v1/asset-state - varligin CANLI DURUSU -> VarlikDurusGozlemi.

   ── BU UC ENVANTERI DEGISTIRMEZ ────────────────────────────────────────
   Kaynak sistemin bildirdigi isletim sistemi, yama seviyesi ve firmware
   `Varlik` satirina YAZILMAZ. Yazsaydi, bir EDR'in gordugu surum elle
   girilmis kaydi sessizce ezer ve "envanterde ne yaziyor" ile "sahada ne
   var" ayrimi kaybolurdu. Gozlem kendi tablosunda durur; ekran ikisini
   yan yana gosterir ve celiskiyi soyler.

   ── KAYNAK BASINA TEK SATIR ────────────────────────────────────────────
   Ayni kaynaktan gelen yeni gozlem oncekini TAZELER. Her kosuda yeni
   satir acmak bir gecmis degil, ayni gercegin binlerce kopyasini
   uretirdi; degisiklik gecmisi kosu defterinin ve denetim izinin isidir.

   ── ESKI VERI YENIYI EZMEZ ─────────────────────────────────────────────
   Kaynagin kendi olctugu an (`observedAt`) mevcut kayittakinden ESKIYSE
   yazma ATLANIR. Gec gelen bir paket, daha yeni bir olcumu geri
   almamalidir. Atlanan kayit sessizce dusmez: cevapta `stale` olarak
   sayilir. */

export const POST = apiUcu(
  { uc: 'asset-state', modul: 'envanter', islem: 'yazma' },
  async ({ govde, kullanici }) => {
  const { records } = dogrula(zarf(durusKaydiSemasi), govde);
  const hamlar = hamKayitlar(govde);

  const { sonuc, kosuId } = await kosuIcinde(
    records.map((r) => r.source),
    async (kosuId) => {
      const defter = new HataDefteri();

      const varliklar = await varlikAnahtarlariniCoz(records.map((r) => r.assetKey));
      const cozumler: {
        indeks: number; gozlem: ReturnType<typeof durusGozlemine>; varlik: EslesenVarlik;
      }[] = [];

      for (const [i, tel] of records.entries()) {
        const gozlem = durusGozlemine(tel, hamlar[i] ?? tel);
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
      let olusan = 0, tazelenen = 0, bayat = 0;

      await db.$transaction(async (tx) => {
        for (const c of cozumler) {
          const g = c.gozlem;
          const onceki = await tx.varlikDurusGozlemi.findUnique({
            where: {
              varlikId_kaynakSistem: {
                varlikId: c.varlik.id, kaynakSistem: g.koken.kaynakSistem,
              },
            },
            select: { id: true, kaynakZamani: true },
          });

          /* Gec gelen paket: kaynagin olctugu an mevcut kayittakinden
             eski. Yazma ATLANIR ve cevapta sayilir. */
          if (onceki?.kaynakZamani && g.kaynakZamani
            && g.kaynakZamani.getTime() < onceki.kaynakZamani.getTime()) {
            bayat += 1;
            continue;
          }

          const veri = {
            varlikId: c.varlik.id,
            kaynakSistem: g.koken.kaynakSistem,
            kaynakKayitId: g.koken.kaynakKayitId,
            hostname: g.hostname ?? null,
            ipAdresi: g.ipAdresi ?? null,
            macAdresi: g.macAdresi ?? null,
            uretici: g.uretici ?? null,
            model: g.model ?? null,
            isletimSistemi: g.isletimSistemi ?? null,
            osSurumu: g.osSurumu ?? null,
            osYapisi: g.osYapisi ?? null,
            yamaSeviyesi: g.yamaSeviyesi ?? null,
            sonYamaTarihi: g.sonYamaTarihi ?? null,
            firmware: g.firmware ?? null,
            kaynakZamani: g.kaynakZamani ?? null,
            alinma: new Date(),
            guven: g.koken.guven ?? null,
          };

          let kayitId: string;
          if (onceki) {
            await tx.varlikDurusGozlemi.update({ where: { id: onceki.id }, data: veri });
            kayitId = onceki.id;
            tazelenen += 1;
          } else {
            const yeni = await tx.varlikDurusGozlemi.create({ data: veri });
            kayitId = yeni.id;
            olusan += 1;
            izler.push({
              varlikTipi: 'VarlikDurusGozlemi', varlikId: kayitId, eylem: 'olusturma',
              sonra: `${g.isletimSistemi ?? ''} ${g.yamaSeviyesi ?? ''}`.trim() || 'durus',
              gerekce: `API durus gozlemi (${g.koken.kaynakSistem})`,
            });
          }
          await kokeniIsle(tx, 'VarlikDurusGozlemi', kayitId, g, kosuId);
        }
      });

      await izleriYaz(kullanici.id, izler);

      return {
        sonuc: { olusan, tazelenen, bayat },
        ozet: {
          alinan: records.length,
          kabulEdilen: olusan + tazelenen,
          reddedilen: 0,
          yinelenen: tazelenen,
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
        /* Gec gelen ve bu yuzden YAZILMAYAN kayitlar. Sessizce dusseydi
           gonderen taraf verinin islendigini sanirdi. */
        stale: sonuc.bayat,
        rejected: 0,
      },
    },
  };
});
