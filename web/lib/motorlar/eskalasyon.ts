import 'server-only';
import { db } from '../db';
import { tarihTR } from '../sabitler';
import {
  eskalasyonBasligi, hedefiCoz, tetikKarari, type Kural,
} from '../uyum/eskalasyon';

/* ═══ UY-36 · Eskalasyon motoru ════════════════════════════════════════

   ÖLÇÜLMÜŞ KUSUR: `Bildirim.tip` sözlüğünde `eskalasyon` vardı ve onu
   YAZAN hiçbir kod yoktu. Tek bildirim yazıcısı `sonTarih.ts` idi ve
   daima `tip: 'uyari'` yazıyordu; bildirim ekranının eskalasyon merceği
   boş bir kovayı süzüyordu. Bu motor o değeri yazan ilk yerdir.

   ── SON TARİH MOTORUNDAN FARKI ────────────────────────────────────────
   `sonTarih.ts` "hedef yaklaşıyor/geçti" der ve SORUMLUYA bir kez haber
   verir. Bu motor kademelidir: gecikme büyüdükçe haber daha yukarı
   gider ve her kademe BİR KEZ tetiklenir (`EskalasyonKaydi` tekil
   kısıtı). İkisi aynı kaydı farklı sebeplerle işler ve birbirinin
   yerine geçmez.

   ── HEDEFSİZ ESKALASYON SESSİZCE DÜŞMEZ ───────────────────────────────
   Kural kime haber vereceğini bulamazsa (sorumlu atanmamış, rol boş,
   kullanıcı pasif) kayıt YİNE yazılır ve `sebep` alanı bunu söyler.
   Sessizce geçmek, kurumun eskalasyon matrisindeki bir boşluğu
   görünmez kılardı; ekran o boşluğu gösterir. */

export type EskalasyonKosusu = {
  islenen: number;
  /** Motor kayıt defterinin ortak sözleşmesi: tetiklenen kademe sayısı. */
  uretilen: number;
  tetiklenen: number;
  /** Kademe hak edildi ama haber verilecek kimse bulunamadı. */
  hedefsiz: number;
  bildirim: number;
};

type Aday = {
  kaynakTipi: 'bulgu' | 'aksiyon' | 'gorev';
  kaynakId: string;
  baslik: string;
  onemDerecesi: string | null;
  hedefTarih: Date | null;
  sorumluId: string | null;
  /** Bildirimin gövdesine giren bağlam. */
  baglam: string;
};

export async function eskalasyonlariIsle(o?: { simdi?: Date }): Promise<EskalasyonKosusu> {
  const simdi = o?.simdi ?? new Date();

  const kurallar: Kural[] = (await db.eskalasyonKurali.findMany({
    where: { aktif: true },
  })).map((k) => ({
    id: k.id, kaynakTipi: k.kaynakTipi, onemDerecesi: k.onemDerecesi,
    kademe: k.kademe, gecikmeGun: k.gecikmeGun, hedefTuru: k.hedefTuru,
    hedefDeger: k.hedefDeger, aktif: k.aktif,
  }));
  if (kurallar.length === 0) {
    return { islenen: 0, uretilen: 0, tetiklenen: 0, hedefsiz: 0, bildirim: 0 };
  }

  const adaylar: Aday[] = [];

  if (kurallar.some((k) => k.kaynakTipi === 'bulgu')) {
    const bulgular = await db.bulgu.findMany({
      where: {
        silindi: null, durum: { in: ['acik', 'aksiyonda'] },
        hedefTarih: { lt: simdi },
      },
      select: {
        id: true, baslik: true, onemDerecesi: true, hedefTarih: true, sorumluId: true,
        maddeDurumu: {
          select: { madde: { select: { kod: true } }, tesis: { select: { kod: true } } },
        },
      },
    });
    for (const b of bulgular) {
      adaylar.push({
        kaynakTipi: 'bulgu', kaynakId: b.id, baslik: b.baslik,
        onemDerecesi: b.onemDerecesi, hedefTarih: b.hedefTarih, sorumluId: b.sorumluId,
        baglam: `${b.maddeDurumu.madde.kod} · ${b.maddeDurumu.tesis.kod}`,
      });
    }
  }

  if (kurallar.some((k) => k.kaynakTipi === 'aksiyon')) {
    const aksiyonlar = await db.aksiyon.findMany({
      where: { durum: { in: ['planlandi', 'devam'] }, hedef: { lt: simdi } },
      select: {
        id: true, baslik: true, hedef: true, sorumluId: true,
        bulgu: { select: { baslik: true, onemDerecesi: true } },
      },
    });
    for (const a of aksiyonlar) {
      adaylar.push({
        kaynakTipi: 'aksiyon', kaynakId: a.id, baslik: a.baslik,
        /* Aksiyonun kendi önem derecesi yoktur; bağlı olduğu bulgunun
           önemi kullanılır — aksiyon o bulguyu kapatmak içindir. */
        onemDerecesi: a.bulgu.onemDerecesi,
        hedefTarih: a.hedef, sorumluId: a.sorumluId,
        baglam: `"${a.bulgu.baslik}" bulgusunun aksiyonu`,
      });
    }
  }

  if (kurallar.some((k) => k.kaynakTipi === 'gorev')) {
    const gorevler = await db.gorev.findMany({
      where: { durum: { in: ['acik', 'yapiliyor'] }, sonTarih: { lt: simdi } },
      select: { id: true, baslik: true, sonTarih: true, sorumluId: true, tip: true },
    });
    for (const g of gorevler) {
      adaylar.push({
        kaynakTipi: 'gorev', kaynakId: g.id, baslik: g.baslik,
        onemDerecesi: null, hedefTarih: g.sonTarih, sorumluId: g.sorumluId,
        baglam: `Görev tipi: ${g.tip}`,
      });
    }
  }

  if (adaylar.length === 0) {
    return { islenen: 0, uretilen: 0, tetiklenen: 0, hedefsiz: 0, bildirim: 0 };
  }

  /* Daha önce tetiklenmiş kademeler tek sorguda; aday başına ayrı sorgu
     aday sayısıyla orantılı bir sorgu patlaması olurdu. */
  const gecmis = await db.eskalasyonKaydi.findMany({
    where: { kaynakId: { in: adaylar.map((a) => a.kaynakId) } },
    select: { kaynakTipi: true, kaynakId: true, kademe: true },
  });
  const yapilmis = new Map<string, number[]>();
  for (const g of gecmis) {
    const anahtar = `${g.kaynakTipi}|${g.kaynakId}`;
    yapilmis.set(anahtar, [...(yapilmis.get(anahtar) ?? []), g.kademe]);
  }

  let tetiklenen = 0, hedefsiz = 0, bildirim = 0;

  for (const aday of adaylar) {
    const karar = tetikKarari({
      kurallar,
      kaynakTipi: aday.kaynakTipi,
      onemDerecesi: aday.onemDerecesi,
      hedefTarih: aday.hedefTarih?.getTime() ?? null,
      simdi: simdi.getTime(),
      tetiklenmisKademeler: yapilmis.get(`${aday.kaynakTipi}|${aday.kaynakId}`) ?? [],
    });
    if (!karar.tetikle) continue;

    /* Hedef çözümü: rol hedefinde o roldeki AKTİF kullanıcılar okunur. */
    const roldekiler = karar.kural.hedefTuru === 'rol' && karar.kural.hedefDeger
      ? (await db.yetki.findMany({
        where: { rol: karar.kural.hedefDeger, kullanici: { aktif: true } },
        select: { kullaniciId: true },
      })).map((y) => y.kullaniciId)
      : [];
    const kullaniciAktif = karar.kural.hedefTuru === 'kullanici' && karar.kural.hedefDeger
      ? (await db.kullanici.findUnique({
        where: { id: karar.kural.hedefDeger }, select: { aktif: true },
      }))?.aktif ?? null
      : null;

    const hedef = hedefiCoz({
      hedefTuru: karar.kural.hedefTuru,
      hedefDeger: karar.kural.hedefDeger,
      kaydinSorumlusu: aday.sorumluId,
      roldekiler: [...new Set(roldekiler)],
      kullaniciAktif,
    });

    const baslik = eskalasyonBasligi({
      kaynakTipi: aday.kaynakTipi, kademe: karar.kural.kademe,
      gecikmeGun: karar.gecikmeGun, baslik: aday.baslik,
    });
    const govde = `${aday.baglam} — hedef: ${
      aday.hedefTarih ? tarihTR(aday.hedefTarih) : 'yok'}`;

    if (!hedef.bulundu) {
      /* Hedefsiz eskalasyon SESSİZCE düşmez: kayıt yazılır ve sebebi
         söyler. Ekran bunu kurumun matrisindeki bir boşluk olarak
         gösterir. */
      await db.eskalasyonKaydi.create({
        data: {
          kuralId: karar.kural.id, kaynakTipi: aday.kaynakTipi,
          kaynakId: aday.kaynakId, kademe: karar.kural.kademe,
          bildirimId: null, hedefKullaniciId: null, sebep: hedef.sebep,
        },
      });
      hedefsiz++; tetiklenen++;
      continue;
    }

    let ilkBildirimId: string | null = null;
    for (const kullaniciId of hedef.kullaniciIdleri) {
      const b = await db.bildirim.create({
        data: {
          kullaniciId, baslik, govde,
          /* İŞTE BURASI: ürünün `eskalasyon` yazan ilk ve tek yeri. */
          tip: 'eskalasyon',
          kaynakTipi: aday.kaynakTipi, kaynakId: aday.kaynakId,
        },
      });
      ilkBildirimId ??= b.id;
      bildirim++;
    }
    await db.eskalasyonKaydi.create({
      data: {
        kuralId: karar.kural.id, kaynakTipi: aday.kaynakTipi,
        kaynakId: aday.kaynakId, kademe: karar.kural.kademe,
        bildirimId: ilkBildirimId,
        hedefKullaniciId: hedef.kullaniciIdleri[0] ?? null,
        sebep: null,
      },
    });
    tetiklenen++;
  }

  return { islenen: adaylar.length, uretilen: tetiklenen, tetiklenen, hedefsiz, bildirim };
}
