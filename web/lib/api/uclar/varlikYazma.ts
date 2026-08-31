import 'server-only';
import { db } from '../../db';
import { varlikAnahtarlari } from '../../entegrasyon/sozlesme';
import { hamKayitlar, varlikGozlemine, varlikKaydiSemasi, zarf, type VarlikKaydiTel } from '../semalar';
import { apiUcu, dogrula } from '../ucnokta';
import { yazmaIzniZorunlu } from '../yetki';
import {
  HataDefteri, agBolgesiHaritasi, izleriYaz, kokeniIsle, kosuIcinde,
  tesisHaritasi, varlikTuruHaritasi, type IzGirdisi,
} from '../yazma';

/* POST /api/v1/assets/upsert - kaynak sistemden (ITAM/CMDB dis kaydi) gelen
   YETKILI toplu guncelleme. Kayit dogrudan Varlik tablosuna yazilir.

   Bu uc, pasif kesif akisi DEGILDIR: kesfedilen (dogrulanmamis) gozlemler
   /api/v1/assets/observations ucundan KesifKaydi inceleme kuyruguna girer ve
   CMDB'ye ancak insan onayiyla gecer. Ikisini karistirma.

   YA HEP YA HIC: kayitlarin tamami once cozumlenir; bir tanesi bile
   gecersizse hicbiri yazilmaz. Yarim import yok. */

type Cozum = {
  indeks: number;
  tel: VarlikKaydiTel;
  gozlem: ReturnType<typeof varlikGozlemine>;
  mevcutId: string | null;
  hedefTesisId: string | null;
  turId: string | null;
  bolgeId: string | null;
};

export const POST = apiUcu({ modul: 'envanter', islem: 'yazma' }, async ({ govde, kullanici }) => {
  const { records } = dogrula(zarf(varlikKaydiSemasi), govde);
  const hamlar = hamKayitlar(govde);
  const defter = new HataDefteri();

  const etiketler = records.map((r) => r.assetTag ?? '');
  const mevcutlar = await db.varlik.findMany({
    where: { etiket: { in: etiketler.filter(Boolean) } },
    select: {
      id: true, etiket: true, tesisId: true, turId: true, ad: true, hostname: true,
      seriNo: true, macAdresi: true, ipAdresi: true, uretici: true, model: true,
      isletimSistemi: true, firmware: true, bolgeId: true, silindi: true,
    },
  });
  const mevcutHarita = new Map(mevcutlar.map((v) => [v.etiket, v]));
  const tesisler = await tesisHaritasi(records.map((r) => r.plantCode ?? ''));
  const turler = await varlikTuruHaritasi(records.map((r) => r.typeCode ?? ''));
  const bolgeler = await agBolgesiHaritasi(records.map((r) => r.zoneCode ?? ''));

  const gorulenEtiket = new Set<string>();
  const cozumler: Cozum[] = [];

  for (const [i, tel] of records.entries()) {
    const gozlem = varlikGozlemine(tel, hamlar[i] ?? tel);
    if (!tel.assetTag) {
      defter.ekle(i, 'assetTag', 'assetTag zorunlu (CMDB birincil anahtari)');
      continue;
    }
    if (gorulenEtiket.has(tel.assetTag)) {
      defter.ekle(i, 'assetTag', 'ayni istekte tekrarlanan assetTag');
      continue;
    }
    gorulenEtiket.add(tel.assetTag);
    if (varlikAnahtarlari(gozlem).length === 0) {
      defter.ekle(i, '(kayit)', 'en az bir esleme anahtari gerekli (seri/mac/etiket/hostname/ip)');
      continue;
    }

    const mevcut = mevcutHarita.get(tel.assetTag) ?? null;
    if (mevcut?.silindi) {
      defter.ekle(i, 'assetTag', 'bu assetTag silinmis bir varliga ait; once geri alinmali');
      continue;
    }

    let hedefTesisId: string | null = mevcut?.tesisId ?? null;
    if (tel.plantCode) {
      const tesis = tesisler.get(tel.plantCode);
      if (!tesis) { defter.ekle(i, 'plantCode', 'bilinmeyen santral kodu'); continue; }
      hedefTesisId = tesis.id;
    }
    if (!mevcut && !hedefTesisId) {
      defter.ekle(i, 'plantCode', 'yeni varlik icin plantCode zorunlu');
      continue;
    }

    let turId: string | null = mevcut?.turId ?? null;
    if (tel.typeCode) {
      const bulunan = turler.get(tel.typeCode);
      if (!bulunan) { defter.ekle(i, 'typeCode', 'bilinmeyen varlik turu kodu'); continue; }
      turId = bulunan;
    }
    if (!mevcut && !turId) {
      defter.ekle(i, 'typeCode', 'yeni varlik icin typeCode zorunlu');
      continue;
    }

    let bolgeId: string | null | undefined;
    if (tel.zoneCode !== undefined) {
      if (tel.zoneCode === null) bolgeId = null;
      else {
        const bulunan = bolgeler.get(tel.zoneCode);
        if (!bulunan) { defter.ekle(i, 'zoneCode', 'bilinmeyen ag bolgesi kodu'); continue; }
        bolgeId = bulunan;
      }
    }

    // Santral izolasyonu: hem HEDEF hem (varsa) MEVCUT santral icin yazma
    // izni sart - kapsam disi bir varlik baska santrale tasinamaz.
    // 403 doner (404 degil), govdede kayit yoktur.
    yazmaIzniZorunlu(kullanici, 'envanter', hedefTesisId);
    if (mevcut && mevcut.tesisId !== hedefTesisId) {
      yazmaIzniZorunlu(kullanici, 'envanter', mevcut.tesisId);
    }

    cozumler.push({
      indeks: i, tel, gozlem, mevcutId: mevcut?.id ?? null,
      hedefTesisId, turId, bolgeId: bolgeId === undefined ? null : bolgeId,
    });
  }
  defter.bitir();

  const { sonuc, kosuId } = await kosuIcinde(
    records.map((r) => r.source),
    async (kosuId) => {
      const izler: IzGirdisi[] = [];
      let olusan = 0, guncellenen = 0, degismeyen = 0;

      await db.$transaction(async (tx) => {
        for (const c of cozumler) {
          const t = c.tel;
          // undefined = alana dokunma, null = alani temizle
          const yama: Record<string, unknown> = {};
          const koy = (alan: string, deger: unknown) => { if (deger !== undefined) yama[alan] = deger; };
          koy('hostname', t.hostname);
          koy('seriNo', t.serialNumber);
          koy('macAdresi', t.macAddress);
          koy('ipAdresi', t.ipAddress);
          koy('uretici', t.vendor);
          koy('model', t.model);
          koy('isletimSistemi', t.operatingSystem);
          koy('firmware', t.firmware);
          if (t.zoneCode !== undefined) yama.bolgeId = c.bolgeId;
          if (t.plantCode !== undefined) yama.tesisId = c.hedefTesisId;
          if (t.typeCode !== undefined) yama.turId = c.turId;

          let varlikId: string;
          if (c.mevcutId) {
            const mevcut = mevcutHarita.get(t.assetTag!)!;
            const degisen = Object.entries(yama).filter(
              ([alan, deger]) => (mevcut as unknown as Record<string, unknown>)[alan] !== deger,
            );
            varlikId = c.mevcutId;
            if (degisen.length === 0) {
              degismeyen += 1;
            } else {
              await tx.varlik.update({ where: { id: varlikId }, data: yama });
              guncellenen += 1;
              izler.push({
                varlikTipi: 'Varlik', varlikId, eylem: 'guncelleme',
                alan: degisen.map(([a]) => a).join(','),
                gerekce: `API toplu guncelleme (${t.source})`,
              });
            }
          } else {
            const yeni = await tx.varlik.create({
              data: {
                etiket: t.assetTag!,
                ad: t.assetTag!,
                turId: c.turId!,
                tesisId: c.hedefTesisId,
                ...yama,
              },
            });
            varlikId = yeni.id;
            olusan += 1;
            izler.push({
              varlikTipi: 'Varlik', varlikId, eylem: 'olusturma',
              gerekce: `API toplu guncelleme (${t.source})`,
            });
          }
          await kokeniIsle(tx, 'Varlik', varlikId, c.gozlem, kosuId);
        }
      });

      // Denetim izi COMMIT sonrasi: SQLite tek yazarlidir, islem icinden
      // ikinci istemciyle yazmak kilitlenme riski dogurur.
      await izleriYaz(kullanici.id, izler);

      return {
        sonuc: { olusan, guncellenen, degismeyen },
        ozet: {
          alinan: records.length,
          kabulEdilen: olusan + guncellenen,
          reddedilen: 0,
          yinelenen: degismeyen,
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
        updated: sonuc.guncellenen,
        unchanged: sonuc.degismeyen,
        rejected: 0,
      },
    },
  };
});
