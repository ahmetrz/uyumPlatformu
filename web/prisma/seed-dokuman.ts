/* Yönetişim belgesi kütüğü — C22 politika · C23 doküman kütüğü.

   NEDEN BU VERİ BÖYLE: kütüğün değeri "kaç belgemiz var" değil, "hangi
   kontrol gereğini karşılayan YÜRÜRLÜKTE bir belgemiz yok" sorusudur.
   Bu yüzden seed bilerek EKSİKSİZ DEĞİLDİR:
     · bir belge gözden geçirmesi geçmiş (gecikmiş kova dolsun),
     · bir belge askıda (bir zamanlar vardı, şimdi boşluk bırakıyor),
     · iki belge taslak/incelemede (kontrolü KARŞILAMAZ — "yarım karşılanan"
       hâli, kütüğün en sinsi vakası),
     · bir belge takvimsiz (periyot tanımsız ≠ gecikmemiş),
     · birkaç kontrol hiçbir belgeye bağlanmamış.
   Hepsi yeşil bir kütük, ekranın ne işe yaradığını gizlerdi.

   DOSYA YOK: `disKaynak` kurumun doküman sistemindeki yolu temsil eder;
   ürün o adrese istek atmaz, yalnız kaydeder. Uydurma bir URL yerine
   kurum içi bir yol biçimi yazılır. */

import type { PrismaClient } from '../lib/prisma-client/client';

const AY = 30 * 86_400_000;
const gunOnce = (n: number) => new Date(Date.now() - n * 86_400_000);

type Tanim = {
  kod: string;
  baslik: string;
  tur: 'politika' | 'prosedur' | 'talimat' | 'plan' | 'standart' | 'form';
  durum: 'taslak' | 'incelemede' | 'yururlukte' | 'askida' | 'yururlukten_kalkti';
  surum: string;
  sahip: string;
  onaylayan?: string;
  /** Yürürlük tarihi kaç gün önce; null = hiç yürürlüğe girmemiş. */
  yururlukGunOnce: number | null;
  gozdenGecirmeAy: number | null;
  /** Son gözden geçirme kaç gün önce; null = yürürlükten beri bakılmamış. */
  sonGozdenGunOnce: number | null;
  maddeler: string[];
  tesisler?: string[];
  aciklama: string;
  gizlilik?: string;
};

const TANIMLAR: Tanim[] = [
  {
    kod: 'POL-2026-001',
    baslik: 'Bilgi Güvenliği Politikası',
    tur: 'politika', durum: 'yururlukte', surum: '3.0',
    sahip: 'ahmet.terzi@zorlu.com', onaylayan: 'ahmet.terzi@zorlu.com',
    yururlukGunOnce: 210, gozdenGecirmeAy: 12, sonGozdenGunOnce: 210,
    maddeler: ['ISO-27001-A.5.9', 'CBDDO-3.1', 'SPK-BS-11'],
    aciklama: 'Grup genelinde bilgi güvenliği yönetim sisteminin çatı politikası; '
      + 'alt prosedürler bu belgeye atıf yapar.',
  },
  {
    kod: 'POL-2026-002',
    baslik: 'OT ve Endüstriyel Kontrol Sistemleri Güvenlik Politikası',
    tur: 'politika', durum: 'yururlukte', surum: '2.1',
    sahip: 'burak.sahin@zorlu.com', onaylayan: 'ahmet.terzi@zorlu.com',
    // Gecikmiş: 14 ay önce yürürlüğe girmiş, periyodu 12 ay, hiç gözden geçirilmemiş.
    yururlukGunOnce: 425, gozdenGecirmeAy: 12, sonGozdenGunOnce: null,
    maddeler: ['EPDK-SYM-4.2', 'EPDK-SYM-4.2.1', 'EPDK-SYM-6.1'],
    aciklama: 'Üretim sahalarındaki DCS/SCADA ortamları için güvenlik ilkeleri; '
      + 'Purdue seviyeleri ve bölge/geçit kuralları bu belgeden türer.',
    gizlilik: 'ot_hassas',
  },
  {
    kod: 'PRS-2026-001',
    baslik: 'Varlık Envanteri ve Sınıflandırma Prosedürü',
    tur: 'prosedur', durum: 'yururlukte', surum: '2.0',
    sahip: 'mehmet.kaya@zorlu.com', onaylayan: 'ahmet.terzi@zorlu.com',
    yururlukGunOnce: 150, gozdenGecirmeAy: 12, sonGozdenGunOnce: 150,
    maddeler: ['EPDK-SYM-4.1', 'EPDK-SYM-4.1.1', 'EPDK-SYM-4.1.2', 'ISO-27001-A.5.9'],
    aciklama: 'Varlık kaydının açılması, kritiklik sınıfının verilmesi ve '
      + 'envanter tazeliğinin ölçülmesi.',
  },
  {
    kod: 'PRS-2026-002',
    baslik: 'Kimlik ve Erişim Yönetimi Prosedürü',
    tur: 'prosedur', durum: 'yururlukte', surum: '1.4',
    sahip: 'mehmet.kaya@zorlu.com', onaylayan: 'ahmet.terzi@zorlu.com',
    // Yaklaşan: 6 aylık periyot, son bakış 5,5 ay önce.
    yururlukGunOnce: 330, gozdenGecirmeAy: 6, sonGozdenGunOnce: 165,
    maddeler: ['EPDK-SYM-5', 'EPDK-SYM-5.1', 'EPDK-SYM-5.1.1',
      'EPDK-SYM-5.1.2', 'CBDDO-4.1', 'SPK-BS-11'],
    aciklama: 'Hesap açma, ayrıcalık verme, dönemsel erişim incelemesi ve '
      + 'servis hesabı parola rotasyonu.',
  },
  {
    kod: 'PRS-2026-003',
    baslik: 'Uzak Bakım ve Tedarikçi Erişim Prosedürü',
    tur: 'prosedur', durum: 'incelemede', surum: '0.9',
    sahip: 'burak.sahin@zorlu.com',
    // Hiç yürürlüğe girmemiş: bağlı kontroller "yarım karşılanan" olur.
    yururlukGunOnce: null, gozdenGecirmeAy: 12, sonGozdenGunOnce: null,
    maddeler: ['EPDK-SYM-4.2.2', 'EPDK-SYM-6.1.2'],
    aciklama: 'Tedarikçi oturumlarının kayıt altına alınması ve eşlik kuralı; '
      + 'hukuk ve satın alma görüşü bekleniyor.',
  },
  {
    kod: 'PLN-2026-001',
    baslik: 'Siber Olay Müdahale Planı',
    tur: 'plan', durum: 'yururlukte', surum: '2.2',
    sahip: 'selin.aydin@zorlu.com', onaylayan: 'ahmet.terzi@zorlu.com',
    yururlukGunOnce: 95, gozdenGecirmeAy: 12, sonGozdenGunOnce: 95,
    maddeler: ['EPDK-SYM-7', 'EPDK-SYM-7.2', 'ISO-27001-A.5.24'],
    aciklama: 'Olay sınıflandırma, tırmandırma zinciri ve regülatör bildirim '
      + 'süreleri; saha tatbikatı yılda bir.',
  },
  {
    kod: 'PLN-2026-002',
    baslik: 'İş Sürekliliği ve Felaket Kurtarma Planı',
    tur: 'plan', durum: 'yururlukte', surum: '1.1',
    sahip: 'selin.aydin@zorlu.com', onaylayan: 'ahmet.terzi@zorlu.com',
    // Takvimsiz: periyodu hiç tanımlanmamış — "gecikmedi" DEĞİL, bilinmiyor.
    yururlukGunOnce: 260, gozdenGecirmeAy: null, sonGozdenGunOnce: null,
    maddeler: ['EPDK-SYM-8.2', 'EPDK-SYM-8.2.1', 'SPK-BS-19'],
    aciklama: 'Kurtarma hedefleri (RTO/RPO) ve kriz masası; gözden geçirme '
      + 'periyodu henüz kararlaştırılmadı.',
  },
  {
    kod: 'PRS-2026-004',
    baslik: 'Yedekleme ve Geri Yükleme Prosedürü',
    tur: 'prosedur', durum: 'yururlukte', surum: '1.6',
    sahip: 'mehmet.kaya@zorlu.com', onaylayan: 'ahmet.terzi@zorlu.com',
    yururlukGunOnce: 120, gozdenGecirmeAy: 12, sonGozdenGunOnce: 120,
    maddeler: ['EPDK-SYM-8.1', 'EPDK-SYM-8.1.1', 'EPDK-SYM-8.1.2'],
    aciklama: 'Yedek kapsamı, saklama süreleri ve dönemsel geri yükleme testi.',
  },
  {
    kod: 'STD-2026-001',
    baslik: 'Sistem Sıkılaştırma Standardı',
    tur: 'standart', durum: 'askida', surum: '1.2',
    sahip: 'mehmet.kaya@zorlu.com', onaylayan: 'ahmet.terzi@zorlu.com',
    yururlukGunOnce: 400, gozdenGecirmeAy: 12, sonGozdenGunOnce: 400,
    maddeler: ['CBDDO-3.2', 'EPDK-SYM-6.2', 'EPDK-SYM-6.2.1', 'ISO-27001-A.8.9'],
    aciklama: 'Yeni OT donanım ailesi standardın kapsamına girmediği için '
      + 'askıya alındı; yerine geçecek sürüm hazırlanıyor.',
  },
  {
    kod: 'PRS-2026-005',
    baslik: 'Log Yönetimi ve İzleme Prosedürü',
    tur: 'prosedur', durum: 'taslak', surum: '0.4',
    sahip: 'burak.sahin@zorlu.com',
    yururlukGunOnce: null, gozdenGecirmeAy: 12, sonGozdenGunOnce: null,
    maddeler: ['EPDK-SYM-7.1', 'EPDK-SYM-7.1.4', 'ISO-27001-A.8.16',
      'CBDDO-4.2', 'SPK-BS-14'],
    aciklama: 'OT log kaynaklarının kapsamı ve saklama süresi taslak hâlinde; '
      + 'kayıt platformu kararı bekleniyor.',
  },
  {
    kod: 'TLM-2026-001',
    baslik: 'Kızıldere III JES OT Değişiklik Talimatı',
    tur: 'talimat', durum: 'yururlukte', surum: '1.0',
    sahip: 'burak.sahin@zorlu.com', onaylayan: 'ahmet.terzi@zorlu.com',
    yururlukGunOnce: 60, gozdenGecirmeAy: 24, sonGozdenGunOnce: 60,
    maddeler: ['EPDK-SYM-6.2.1'],
    tesisler: ['KIZILDERE-3'],
    aciklama: 'Santral özelinde yama penceresi, geri alma planı ve üretim '
      + 'etkisi onayı; grup standardının saha uygulaması.',
    gizlilik: 'ot_hassas',
  },
];

export async function dokumanKutugu(db: PrismaClient) {
  const kullanicilar = await db.kullanici.findMany({ select: { id: true, eposta: true } });
  const kid = (eposta: string) => kullanicilar.find((k) => k.eposta === eposta)?.id ?? null;

  const maddeler = await db.madde.findMany({ select: { id: true, kod: true } });
  const mid = new Map(maddeler.map((m) => [m.kod, m.id]));

  const tesisler = await db.tesis.findMany({ select: { id: true, kod: true } });
  const tid = new Map(tesisler.map((t) => [t.kod, t.id]));

  let yazilan = 0;
  const idler = new Map<string, string>();

  for (const t of TANIMLAR) {
    const yururlukTarihi = t.yururlukGunOnce === null ? null : gunOnce(t.yururlukGunOnce);
    const sonGozdenGecirme = t.sonGozdenGunOnce === null ? null : gunOnce(t.sonGozdenGunOnce);
    /* Sonraki tarih burada da `mantik.ts` ile AYNI kuralla hesaplanır;
       seed'in kendi aritmetiği olsaydı ekran başka, kütük başka söylerdi. */
    const taban = sonGozdenGecirme ?? yururlukTarihi;
    const sonraki = t.gozdenGecirmeAy && taban
      ? new Date(taban.getTime() + t.gozdenGecirmeAy * AY)
      : null;

    const veri = {
      kod: t.kod, baslik: t.baslik, tur: t.tur, durum: t.durum, surum: t.surum,
      sahipId: kid(t.sahip), onaylayanId: t.onaylayan ? kid(t.onaylayan) : null,
      yururlukTarihi, gozdenGecirmeAy: t.gozdenGecirmeAy,
      sonGozdenGecirme, sonrakiGozdenGecirme: sonraki,
      disKaynak: `\\\\kurumsal-dosya\\yonetisim\\${t.kod}_v${t.surum}`,
      kaynakSistem: 'Kurumsal dosya paylaşımı',
      gizlilik: t.gizlilik ?? 'kurumsal',
      aciklama: t.aciklama,
    };

    const kayit = await db.dokuman.upsert({
      where: { kod: t.kod }, create: veri, update: veri,
    });
    idler.set(t.kod, kayit.id);
    yazilan++;

    for (const kod of t.maddeler) {
      const maddeId = mid.get(kod);
      if (!maddeId) continue;
      await db.dokumanMadde.upsert({
        where: { dokumanId_maddeId: { dokumanId: kayit.id, maddeId } },
        create: { dokumanId: kayit.id, maddeId }, update: {},
      });
    }
    for (const kod of t.tesisler ?? []) {
      const tesisId = tid.get(kod);
      if (!tesisId) continue;
      await db.dokumanTesis.upsert({
        where: { dokumanId_tesisId: { dokumanId: kayit.id, tesisId } },
        create: { dokumanId: kayit.id, tesisId }, update: {},
      });
    }
  }

  /* Mevcut politika kanıtlarını kütüğe bağla: "EPDK-SYM-7.2 · X politikası"
     kanıdı, o maddeyi karşılayan belgeye işaret etsin. Böylece kanıt
     kütüphanesi ile belge kütüğü aynı gerçeği iki yönden gösterir. */
  const politikaKanitlari = await db.kanit.findMany({
    where: { tip: 'politika', silindi: null },
    select: { id: true, ad: true, baglantilar: { select: { maddeDurumu: { select: { maddeId: true } } } } },
  });
  const maddeBelgesi = new Map<string, string>();
  for (const t of TANIMLAR) {
    for (const kod of t.maddeler) {
      const maddeId = mid.get(kod);
      if (maddeId && !maddeBelgesi.has(maddeId)) maddeBelgesi.set(maddeId, idler.get(t.kod)!);
    }
  }
  let baglanan = 0;
  for (const kanit of politikaKanitlari) {
    const maddeId = kanit.baglantilar[0]?.maddeDurumu.maddeId;
    const dokumanId = maddeId ? maddeBelgesi.get(maddeId) : undefined;
    if (!dokumanId) continue;
    await db.kanit.update({ where: { id: kanit.id }, data: { dokumanId } });
    baglanan++;
  }

  const bagli = new Set(TANIMLAR.flatMap((t) => t.maddeler));
  console.log(`Belge kütüğü: ${yazilan} belge · ${bagli.size} kontrol bağlandı · `
    + `${baglanan} politika kanıdı kütüğe iliştirildi.`);
}
