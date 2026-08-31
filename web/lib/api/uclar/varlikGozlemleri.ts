import 'server-only';
import { db } from '../../db';
import { varlikAnahtarlari } from '../../entegrasyon/sozlesme';
import { hamKayitlar, varlikGozlemine, varlikKaydiSemasi, zarf } from '../semalar';
import { apiUcu, dogrula } from '../ucnokta';
import { yazmaIzniZorunlu } from '../yetki';
import { HataDefteri, izleriYaz, kokeniIsle, kosuIcinde, tesisHaritasi, type IzGirdisi } from '../yazma';

/* POST /api/v1/assets/observations - PASIF kesif gozlemleri.

   Bu uc CMDB'ye YAZMAZ. Gelen kayit KesifKaydi inceleme kuyruguna girer
   (durum = 'kesfedildi'), esleme ve onay INSANIN isidir. Otomasyon onerir,
   karar vermez: detect -> correlate -> propose -> human approve.

   Ham gozlem hamJson'da dokunulmadan saklanir: denetim izinin girdisi odur. */

export const POST = apiUcu({ modul: 'envanter', islem: 'yazma' }, async ({ govde, kullanici }) => {
  const { records } = dogrula(zarf(varlikKaydiSemasi), govde);
  const hamlar = hamKayitlar(govde);
  const { sonuc, kosuId } = await kosuIcinde(
    records.map((r) => r.source),
    async (kosuId) => {
      const defter = new HataDefteri();

      const tesisler = await tesisHaritasi(records.map((r) => r.plantCode ?? ''));
      const gorulen = new Set<string>();
      const cozumler: {
        indeks: number; gozlem: ReturnType<typeof varlikGozlemine>;
        anahtar: string; tesisId: string | null;
      }[] = [];

      for (const [i, tel] of records.entries()) {
        const gozlem = varlikGozlemine(tel, hamlar[i] ?? tel);
        const anahtarlar = varlikAnahtarlari(gozlem);
        if (anahtarlar.length === 0) {
          defter.ekle(i, '(kayit)', 'en az bir esleme anahtari gerekli (seri/mac/etiket/hostname/ip)');
          continue;
        }
        const tekil = `${tel.source} ${tel.sourceRecordId}`;
        if (gorulen.has(tekil)) {
          defter.ekle(i, 'sourceRecordId', 'ayni istekte tekrarlanan (source, sourceRecordId)');
          continue;
        }
        gorulen.add(tekil);

        let tesisId: string | null = null;
        if (tel.plantCode) {
          const tesis = tesisler.get(tel.plantCode);
          if (!tesis) { defter.ekle(i, 'plantCode', 'bilinmeyen santral kodu'); continue; }
          tesisId = tesis.id;
        }
        // plantCode yoksa KAPSAMSIZ yazma istenir; santrale kisitli anahtar gecemez.
        yazmaIzniZorunlu(kullanici, 'envanter', tesisId);

        /* Cozulen santral kayda YAZILIR, yalnizca izin kontrolunde
           kullanilip atilmaz: eslesmemis keşif kaydinin kapsami baska
           turlu bilinemez. */
        cozumler.push({ indeks: i, gozlem, anahtar: anahtarlar[0].alan, tesisId });
      }
      defter.bitir();

      const izler: IzGirdisi[] = [];
      let olusan = 0, tazelenen = 0;

      await db.$transaction(async (tx) => {
        for (const c of cozumler) {
          const g = c.gozlem;
          const mevcut = await tx.kesifKaydi.findUnique({
            where: {
              kaynak_kaynakKayitId: {
                kaynak: g.koken.kaynakSistem, kaynakKayitId: g.koken.kaynakKayitId,
              },
            },
            select: { id: true },
          });
          const ortak = {
            hamJson: JSON.stringify(g.ham),
            normalJson: JSON.stringify(g),
            eslesmeAnahtari: c.anahtar,
            // null = hesaplanamadi; sifir guven DEGIL
            guvenSkoru: g.koken.guven,
            kosuId,
            sonGorulme: g.koken.toplanma,
          };
          let kayitId: string;
          if (mevcut) {
            await tx.kesifKaydi.update({
              where: { id: mevcut.id },
              // santral yalniz cozulebildiginde yazilir, asla silinmez
              data: c.tesisId ? { ...ortak, tesisId: c.tesisId } : ortak,
            });
            kayitId = mevcut.id;
            tazelenen += 1;
          } else {
            const yeni = await tx.kesifKaydi.create({
              data: {
                kaynak: g.koken.kaynakSistem,
                kaynakKayitId: g.koken.kaynakKayitId,
                tesisId: c.tesisId,
                // CMDB'ye DOGRUDAN yazilmaz: inceleme bekler.
                durum: 'kesfedildi',
                ilkGorulme: g.koken.toplanma,
                ...ortak,
              },
            });
            kayitId = yeni.id;
            olusan += 1;
            izler.push({
              varlikTipi: 'KesifKaydi', varlikId: kayitId, eylem: 'olusturma',
              gerekce: `API kesif gozlemi (${g.koken.kaynakSistem})`,
            });
          }
          await kokeniIsle(tx, 'KesifKaydi', kayitId, g, kosuId);
        }
      });

      await izleriYaz(kullanici.id, izler);

      return {
        sonuc: { olusan, tazelenen },
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
        rejected: 0,
        // Kesif kaydi CMDB'ye otomatik gecmez: inceleme kuyrugundadir.
        status: 'inceleme_bekliyor',
      },
    },
  };
});
