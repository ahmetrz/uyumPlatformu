import { db } from '@/lib/db';
import {
  BAYAT_ESIK_MS, bayatKosulariKapat, senkronizasyonKos,
  type SenkronSecenegi,
} from '@/lib/entegrasyon/cekirdek';
import { adaptorKaydet, adaptorSil } from '@/lib/entegrasyon/kayit';
import type { Adaptor } from '@/lib/entegrasyon/sozlesme';
import type {
  FiksturSeti, KuruKosucu, SandboxIstegi, SandboxKosucu, SandboxSonucu,
} from '@/lib/entegrasyon/sertifika';

/* ═══════════════════════════════════════════════════════════════════════
   SERTİFİKASYON SANDBOX'I

   Harness'ın çekirdek gerektiren kontrolleri (idempotency, kapsam,
   dead-letter, retry, kuru koşu) veritabanına yazar. Harness kendi
   veritabanını AÇMAZ; bu koşucu onu dışarıdan verir ve YALNIZ testte
   kurulur — çağıran, izole bir `prisma/dev.db` kopyası üzerinde çalışır
   (TEST_DB). Üretimde bu dosyaya hiçbir import yoktur.

   Dış sistem yoktur: koşulan tek adaptör `manual_import`'tır ve girdisi
   fikstürün metnidir. Ağa paket çıkmaz.

   ── Vekil adaptör ────────────────────────────────────────────────────
   Geçici hata/geri çekilme yolunu gerçek bir adaptörle üretmenin yolu
   yok (bir dosya "zaman aşımı" veremez). Bu yüzden yalnız `fetchChanges`
   üzerine hata enjekte eden bir VEKİL kaydedilir; diğer bütün metotlar
   GERÇEK adaptöre delege edilir. Bu, adaptörün değil ÇEKİRDEĞİN tekrar
   deneme davranışını ölçer ve rapor bunu böyle yazar. */

type OturumDurumu = {
  connectorId: string;
  kaynakSistem: string;
  /** vekil kayıtlıysa tipi — temizlikte silinir */
  vekilTip: string | null;
  kalanGeciciHata: number;
  kaliciHata: boolean;
};

export type SandboxKurulumu = {
  kosucu: SandboxKosucu;
  kuruKosucu: KuruKosucu;
  temizle: () => Promise<void>;
};

export function sandboxKur(adaptor: Adaptor, fikstur: FiksturSeti): SandboxKurulumu {
  const oturumlar = new Map<string, OturumDurumu>();
  const tesisKodlari = new Map<string, string | null>();

  async function tesisKodu(tesisId: string | null): Promise<string | null> {
    if (!tesisId) return null;
    const onbellek = tesisKodlari.get(tesisId);
    if (onbellek !== undefined) return onbellek;
    const t = await db.tesis.findUnique({ where: { id: tesisId }, select: { kod: true } });
    tesisKodlari.set(tesisId, t?.kod ?? null);
    return t?.kod ?? null;
  }

  /** Oturumun connector'ı — aynı oturum aynı connector'ı yeniden kullanır
      (idempotency ölçümü bunu gerektirir). */
  async function connectorAl(istek: SandboxIstegi): Promise<OturumDurumu> {
    const hataEnjekte = (istek.geciciHata ?? 0) > 0 || istek.kaliciHata === true;
    let durum = oturumlar.get(istek.oturum);

    if (!durum) {
      const vekilTip = hataEnjekte ? `sertifika_vekil_${istek.oturum}` : null;
      if (vekilTip) adaptorKaydet(vekilYap(vekilTip, istek.oturum), true);
      const kaynakSistem = `${fikstur.kaynakSistem} · ${istek.oturum}`;
      const connector = await db.connector.create({
        data: {
          kod: `SERT-${fikstur.tip}-${istek.oturum}-${Date.now()}`,
          ad: `Sertifikasyon sandbox · ${fikstur.tip} · ${istek.oturum}`,
          tip: vekilTip ?? adaptor.tip,
          kaynakSistem,
          etkin: true,
          durum: 'etkin',
          ortam: 'gelistirme',
          kimlikTipi: istek.sirReferansi ? 'api_key' : 'none',
          sirReferansi: istek.sirReferansi ?? null,
        },
      });
      durum = {
        connectorId: connector.id, kaynakSistem, vekilTip,
        kalanGeciciHata: 0, kaliciHata: false,
      };
      oturumlar.set(istek.oturum, durum);
    }

    durum.kalanGeciciHata = istek.geciciHata ?? 0;
    durum.kaliciHata = istek.kaliciHata === true;
    await db.connector.update({
      where: { id: durum.connectorId },
      data: {
        yapilandirmaJson: JSON.stringify(istek.yapilandirma),
        kapsamTesisleriJson: istek.kapsamKodlari ? JSON.stringify(istek.kapsamKodlari) : null,
      },
    });
    return durum;
  }

  /** Yalnız `fetchChanges` üzerine hata enjekte eden vekil. */
  function vekilYap(tip: string, oturum: string): Adaptor {
    return {
      tip,
      baglanabilir: adaptor.baglanabilir,
      yetenekler: adaptor.yetenekler,
      // Vekil yalnız fetchChanges'i sarar; beyanlar sarılan adaptörün.
      yapilandirmaSemasi: adaptor.yapilandirmaSemasi,
      gerekenSirlar: adaptor.gerekenSirlar,
      testConnection: (b) => adaptor.testConnection(b),
      discover: (b) => adaptor.discover(b),
      normalize: (ham, b) => adaptor.normalize(ham, b),
      validate: (g) => adaptor.validate(g),
      health: (b) => adaptor.health(b),
      async fetchChanges(b) {
        const d = oturumlar.get(oturum);
        if (d?.kaliciHata) {
          // Yetki hatası KALICIDIR: çekirdek tekrar denememeli.
          throw new Error('401 Unauthorized: sertifikasyon vekili kalıcı hata üretti');
        }
        if (d && d.kalanGeciciHata > 0) {
          d.kalanGeciciHata -= 1;
          throw new Error('ETIMEDOUT: sertifikasyon vekili geçici hata üretti');
        }
        return adaptor.fetchChanges(b);
      },
    };
  }

  async function kos(istek: SandboxIstegi): Promise<SandboxSonucu> {
    const durum = await connectorAl(istek);
    const beklemeler: number[] = [];
    const secenek: SenkronSecenegi = {
      tetikleyen: 'manuel',
      // Testler gerçek saat beklemesin; geri çekilme süreleri kaydedilir.
      bekle: async (ms: number) => { beklemeler.push(ms); },
    };
    const ozet = await senkronizasyonKos(durum.connectorId, secenek);

    const kayitlar = await db.kesifKaydi.findMany({
      where: { kaynak: durum.kaynakSistem },
      select: { kaynakKayitId: true, durum: true, tesisId: true },
      orderBy: { ilkGorulme: 'asc' },
    });
    const kesifKayitlari: SandboxSonucu['kesifKayitlari'] = [];
    for (const k of kayitlar) {
      kesifKayitlari.push({
        kaynakKayitId: k.kaynakKayitId,
        tesisKodu: await tesisKodu(k.tesisId),
        durum: k.durum,
      });
    }

    const kokenSatirlari = await db.veriKokeni.findMany({
      where: { kaynakSistem: durum.kaynakSistem },
      select: { kaynakSistem: true, kaynakKayitId: true, kokenTipi: true, guven: true, toplanma: true },
    });

    /* Dead-letter tablosu bu kurulumda olmayabilir (göç gelmemiş olabilir).
       "Satır yok" ile "tablo yok" AYNI ŞEY DEĞİL: ikincisi null döner ve
       harness onu `bilinmiyor` sayar, `kaldi` değil. */
    let reddedilenKayitlar: SandboxSonucu['reddedilenKayitlar'] = null;
    try {
      const satirlar = await db.reddedilenKayit.findMany({
        where: ozet.kosuId ? { kosuId: ozet.kosuId } : { connectorId: durum.connectorId },
        select: { asama: true, sebep: true },
      });
      reddedilenKayitlar = satirlar;
    } catch {
      reddedilenKayitlar = null;
    }

    let kosuAcikKaldi = false;
    if (ozet.kosuId) {
      const kosu = await db.entegrasyonKosusu.findUnique({
        where: { id: ozet.kosuId }, select: { durum: true },
      });
      kosuAcikKaldi = kosu?.durum === 'calisiyor';
    }

    return {
      durum: ozet.durum,
      alinan: ozet.alinan,
      kabulEdilen: ozet.kabulEdilen,
      reddedilen: ozet.reddedilen,
      yinelenen: ozet.yinelenen,
      denemeNo: ozet.denemeNo,
      imlecSonra: ozet.imlecSonra,
      hata: ozet.hata,
      ayrinti: ozet.ayrinti,
      beklemeler,
      kosuAcikKaldi,
      kesifKayitlari,
      kokenler: kokenSatirlari,
      reddedilenKayitlar,
    };
  }

  async function bayatKosu() {
    const durum = await connectorAl({ yapilandirma: fikstur.yapilandirma, oturum: 'bayat' });
    // Süreç ölmüş gibi: eşiği aşmış, hâlâ 'calisiyor' bir koşu satırı.
    const bayat = await db.entegrasyonKosusu.create({
      data: {
        kaynak: fikstur.tip,
        connectorId: durum.connectorId,
        durum: 'calisiyor',
        baslangic: new Date(Date.now() - BAYAT_ESIK_MS - 60_000),
      },
      select: { id: true },
    });
    const kapanan = await bayatKosulariKapat(durum.connectorId);
    const satir = await db.entegrasyonKosusu.findUniqueOrThrow({
      where: { id: bayat.id }, select: { durum: true, hata: true },
    });
    return { kapanan, durum: satir.durum, hata: satir.hata };
  }

  const kuruKosucu: KuruKosucu = {
    async kos(istek) {
      const durum = await connectorAl({ ...istek, oturum: `kuru-${istek.oturum}` });
      const once = await db.kesifKaydi.count({ where: { kaynak: durum.kaynakSistem } });
      const secenek: SenkronSecenegi = {
        tetikleyen: 'manuel',
        bekle: async () => {},
      };
      /* `kuru` seçeneği çekirdekte henüz olmayabilir: alanı doğrudan
         yazmak yerine ekleyip SONUCA bakıyoruz. Desteklenmiyorsa koşu
         normal koşar ve `destekli: false` döneriz — kuru koşuyu
         "çalışıyor" gibi raporlamak sahte başarı olurdu. */
      Object.assign(secenek, { kuru: true });
      const ozet = await senkronizasyonKos(durum.connectorId, secenek);
      const sonra = await db.kesifKaydi.count({ where: { kaynak: durum.kaynakSistem } });
      const genisletilmis = ozet as unknown as {
        kuru?: boolean;
        kuruOzet?: { sayaclar?: { olusacak?: number; guncellenecek?: number } } | null;
      };
      const destekli = genisletilmis.kuru === true;
      const sayaclar = genisletilmis.kuruOzet?.sayaclar;
      return {
        destekli,
        yazilanKayit: sonra - once,
        olacakKayit: (sayaclar?.olusacak ?? 0) + (sayaclar?.guncellenecek ?? 0),
        durum: ozet.durum,
        not: destekli
          ? 'çekirdek kuru koşuyu uyguluyor'
          : 'çekirdek `kuru` seçeneğini uygulamıyor — koşu kuru bayrağı olmadan döndü',
      };
    },
  };

  return {
    kosucu: { kos, bayatKosu },
    kuruKosucu,
    async temizle() {
      for (const d of oturumlar.values()) {
        if (d.vekilTip) adaptorSil(d.vekilTip);
      }
      oturumlar.clear();
    },
  };
}
