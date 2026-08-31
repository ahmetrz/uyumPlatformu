import 'server-only';
import { db } from '../../db';
import { erisimGozlemine, erisimKaydiSemasi, hamKayitlar, zarf } from '../semalar';
import { apiUcu, dogrula } from '../ucnokta';
import { yazmaIzniZorunlu } from '../yetki';
import {
  HataDefteri, izleriYaz, kokeniIsle, kosuIcinde, tesisHaritasi,
  varlikAnahtarlariniCoz, type EslesenVarlik, type IzGirdisi,
} from '../yazma';
import { zinciriCalistir } from '../../entegrasyon/zincir';

/* POST /api/v1/access-observations - dizin/PAM gozlemleri -> KimlikHesabi
   (+ opsiyonel ErisimAtamasi).

   Iki sinir:
   - Hesap DURUMU ('aktif' | 'askida' | 'kapatildi') otomatik degistirilmez;
     hesap kapatmak insan kararidir.
   - `privileged` null gelirse `ayricalikli` alanina DOKUNULMAZ. Alan
     artik uc degerlidir (true | false | null=OLCULMEDI): yeni hesap
     olculmemis olarak acilir, mevcut hesabin daha once olculmus degeri
     ise kaynak bildirmeyi biraktı diye SILINMEZ. */

export const POST = apiUcu({ modul: 'envanter', islem: 'yazma' }, async ({ govde, kullanici }) => {
  const { records } = dogrula(zarf(erisimKaydiSemasi), govde);
  const hamlar = hamKayitlar(govde);
  const { sonuc, kosuId } = await kosuIcinde(
    records.map((r) => r.source),
    async (kosuId) => {
      const defter = new HataDefteri();

      const mevcutHesaplar = await db.kimlikHesabi.findMany({
        where: { hesapAdi: { in: records.map((r) => r.accountName) } },
        select: { id: true, hesapAdi: true, tesisId: true, tip: true, ayricalikli: true },
      });
      const hesapHarita = new Map(mevcutHesaplar.map((h) => [h.hesapAdi, h]));
      const tesisler = await tesisHaritasi(records.map((r) => r.plantCode ?? ''));
      const varliklar = await varlikAnahtarlariniCoz(
        records.map((r) => r.assetKey ?? '').filter((a): a is string => a.length > 0),
      );

      type Cozum = {
        indeks: number;
        tel: (typeof records)[number];
        gozlem: ReturnType<typeof erisimGozlemine>;
        mevcutId: string | null;
        tesisId: string | null;
        varlik: EslesenVarlik | null;
      };
      const cozumler: Cozum[] = [];
      const gorulen = new Set<string>();

      for (const [i, tel] of records.entries()) {
        const gozlem = erisimGozlemine(tel, hamlar[i] ?? tel);
        if (gorulen.has(tel.accountName)) {
          defter.ekle(i, 'accountName', 'ayni istekte tekrarlanan accountName');
          continue;
        }
        gorulen.add(tel.accountName);

        const mevcut = hesapHarita.get(tel.accountName) ?? null;
        let tesisId: string | null = mevcut?.tesisId ?? null;
        if (tel.plantCode) {
          const tesis = tesisler.get(tel.plantCode);
          if (!tesis) { defter.ekle(i, 'plantCode', 'bilinmeyen santral kodu'); continue; }
          tesisId = tesis.id;
        }
        if (!mevcut && !tel.accountType) {
          defter.ekle(i, 'accountType', 'yeni hesap icin zorunlu (kisi|servis|paylasimli|acil_durum)');
          continue;
        }

        let varlik: EslesenVarlik | null = null;
        if (tel.assetKey) {
          const eslesme = varliklar.get(tel.assetKey);
          if (!eslesme) { defter.ekle(i, 'assetKey', 'bu anahtarla eslesen varlik yok'); continue; }
          if (eslesme === 'belirsiz') {
            defter.ekle(i, 'assetKey', 'birden cok varliga uyuyor; tekil bir anahtar gonderin');
            continue;
          }
          varlik = eslesme;
          yazmaIzniZorunlu(kullanici, 'envanter', varlik.tesisId);
        }

        // Hem hedef hem mevcut santral icin yazma izni sart.
        yazmaIzniZorunlu(kullanici, 'envanter', tesisId);
        if (mevcut && mevcut.tesisId !== tesisId) {
          yazmaIzniZorunlu(kullanici, 'envanter', mevcut.tesisId);
        }

        cozumler.push({ indeks: i, tel, gozlem, mevcutId: mevcut?.id ?? null, tesisId, varlik });
      }
      defter.bitir();

      const izler: IzGirdisi[] = [];
      let olusan = 0, guncellenen = 0, atama = 0;

      await db.$transaction(async (tx) => {
        for (const c of cozumler) {
          const { tel, gozlem: g } = c;
          const veri: Record<string, unknown> = {
            kaynakSistem: g.koken.kaynakSistem,
            tesisId: c.tesisId,
            sonKullanim: g.sonKullanim,
            parolaRotasyon: g.parolaRotasyon,
          };
          /* null = olculmedi -> alana dokunma. Yeni hesapta alan hic
             yazilmaz ve kolon null kalir (varsayilan yok); mevcut hesapta
             daha once olculmus deger korunur. */
          if (typeof tel.privileged === 'boolean') veri.ayricalikli = tel.privileged;
          if (tel.accountType) veri.tip = tel.accountType;

          let hesapId: string;
          if (c.mevcutId) {
            await tx.kimlikHesabi.update({ where: { id: c.mevcutId }, data: veri });
            hesapId = c.mevcutId;
            guncellenen += 1;
          } else {
            const yeni = await tx.kimlikHesabi.create({
              data: { hesapAdi: g.hesapAdi, tip: tel.accountType!, ...veri },
            });
            hesapId = yeni.id;
            olusan += 1;
            izler.push({
              varlikTipi: 'KimlikHesabi', varlikId: hesapId, eylem: 'olusturma',
              gerekce: `API erisim gozlemi (${g.koken.kaynakSistem})`,
            });
          }
          await kokeniIsle(tx, 'KimlikHesabi', hesapId, g, kosuId);

          if (c.varlik) {
            const mevcutAtama = await tx.erisimAtamasi.findFirst({
              where: { hesapId, varlikId: c.varlik.id, kapsam: g.kapsam ?? null },
              select: { id: true },
            });
            if (!mevcutAtama) {
              const yeniAtama = await tx.erisimAtamasi.create({
                data: { hesapId, varlikId: c.varlik.id, kapsam: g.kapsam ?? null },
              });
              atama += 1;
              izler.push({
                varlikTipi: 'ErisimAtamasi', varlikId: yeniAtama.id, eylem: 'olusturma',
                gerekce: `API erisim gozlemi (${g.koken.kaynakSistem})`,
              });
              await kokeniIsle(tx, 'ErisimAtamasi', yeniAtama.id, g, kosuId);
            }
          }
        }
      });

      await izleriYaz(kullanici.id, izler);

      return {
        sonuc: { olusan, guncellenen, atama },
        ozet: {
          alinan: records.length, kabulEdilen: olusan + guncellenen,
          reddedilen: 0, yinelenen: guncellenen,
        },
      };
    },
  );

  /* Commit'ten sonra motor zinciri: kimlik/erisim kaydi yazildi, dolayisiyla ilgili
     motorlarin girdisi degisti. Zincir FIRLATMAZ — basarisiz motor kendi
     IsKosusu satirini birakir ve /saglik'te gorunur; bu yuzden basarili
     bir yazma bu adim yuzunden geri alinmaz. */
  if (sonuc.olusan + sonuc.guncellenen > 0) {
    await zinciriCalistir({ kosuId, degisenler: { erisim: true } });
  }

  return {
    govde: {
      data: {
        runId: kosuId,
        received: records.length,
        created: sonuc.olusan,
        updated: sonuc.guncellenen,
        assignmentsCreated: sonuc.atama,
        rejected: 0,
      },
    },
  };
});
