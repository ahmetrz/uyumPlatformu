/* Uyum kataloğu genişletmesi — Faz 5, O1 (Uyum Kontrol Odası) ve O2
   (Çerçeve Detayı) ekranları için.

   Neden gerekli: EPDK-SYM kataloğunda üç kök aile vardı (Varlık, Kimlik,
   Olay). Onaylı tasarımın matrisi kontrol AİLELERİNİ sütun olarak kullanıyor
   ve beş sütunla çalışıyor. Eksik olan iki aile — ağ/sistem güvenliği ve
   süreklilik — zaten üründe risk, yedekleme ve topoloji tarafında veri
   olarak var; katalogda karşılığı yoktu.

   Uygulanabilirlik motoruna DOKUNULMAZ. Hangi santralin kapsamda olduğunu
   UygulanabilirlikKarari belirler; burada yalnızca kapsamdaki santraller
   için madde durumu üretilir. Kapsam dışı santrale satır açmak, motorun
   kararını ekranda geçersiz kılmak olurdu. */

import type { PrismaClient } from '../lib/prisma-client/client';

const G = 86_400_000;
const gun = (n: number) => new Date(Date.now() + n * G);

/* Yeni maddeler: [kod, başlık, üst kod | null, metin, kanıt tipi] */
const YENI_MADDELER: [string, string, string | null, string, string | null][] = [
  ['EPDK-SYM-6', 'Ağ ve Sistem Güvenliği', null,
    'Elektrik üretim tesislerinde kurumsal ağ ile endüstriyel kontrol ağı arasındaki geçişler tanımlı, onaylı ve denetlenebilir olmalıdır.', null],
  ['EPDK-SYM-6.1', 'Sınır Güvenliği', 'EPDK-SYM-6',
    'Bölgeler arası her geçit (conduit) için izin verilen protokoller ve yönler belgelenir.', null],
  ['EPDK-SYM-6.1.1', 'Geçit kuralları', 'EPDK-SYM-6.1',
    'Kurumsal ağdan süreç kontrol ağına doğrudan bağlantı bulunmaz; tüm trafik OT DMZ üzerinden ve tanımlı protokollerle geçer. Geçit kuralları en az yılda bir doğrulanır.', 'konfigurasyon'],
  ['EPDK-SYM-6.1.2', 'Uzak bakım oturumları', 'EPDK-SYM-6.1',
    'Tedarikçi uzaktan erişimi yalnızca talep üzerine açılır, oturum kaydı alınır ve kayıtlar en az bir yıl saklanır.', 'kayit'],
  ['EPDK-SYM-6.2', 'Sistem Sıkılaştırma', 'EPDK-SYM-6',
    'İşletim sistemi ve uygulama sıkılaştırma temelleri tanımlanır ve sapmalar izlenir.', null],
  ['EPDK-SYM-6.2.1', 'Yama yönetimi', 'EPDK-SYM-6.2',
    'Kritik güvenlik yamaları, üretim penceresi kısıtları gözetilerek tanımlı süre içinde uygulanır; uygulanamayanlar için telafi edici kontrol kaydedilir.', 'kayit'],

  ['EPDK-SYM-8', 'Süreklilik ve Yedekleme', null,
    'Üretim ve kontrol sistemlerinin kesinti sonrası geri dönüşü planlanmış, test edilmiş ve kanıtlanmış olmalıdır.', null],
  ['EPDK-SYM-8.1', 'Yedekleme', 'EPDK-SYM-8',
    'Kontrol sistemi konfigürasyonları ve süreç verisi düzenli olarak yedeklenir.', null],
  ['EPDK-SYM-8.1.1', 'Yedek kapsamı', 'EPDK-SYM-8.1',
    'SCADA/DCS konfigürasyonu, historian verisi ve mühendislik projeleri yedekleme kapsamındadır; kapsam dışı bırakılan sistemler gerekçesiyle kaydedilir.', 'konfigurasyon'],
  ['EPDK-SYM-8.1.2', 'Geri yükleme testi', 'EPDK-SYM-8.1',
    'Yedeklerin geri yüklenebildiği en az altı ayda bir izole ortamda test edilir ve sonucu kayıt altına alınır. Test yapılmamış yedek, yedek sayılmaz.', 'test_kaydi'],
  ['EPDK-SYM-8.2', 'İş Sürekliliği', 'EPDK-SYM-8',
    'Kurtarma hedefleri üretim etkisine göre belirlenir ve tatbik edilir.', null],
  ['EPDK-SYM-8.2.1', 'Kurtarma hedefleri', 'EPDK-SYM-8.2',
    'Her kritik sistem için RPO ve RTO tanımlıdır, sahiplendirilmiştir ve yıllık tatbikatla doğrulanır.', 'plan'],
];

/* Kapsamdaki santral × yeni yaprak madde durum matrisi.
   Eldeki operasyonel veriyle tutarlı yazılmıştır: oturum kaydı alınmayan
   tedarikçi erişimi olan sahada 6.1.2 uyumsuz, doğrulanmamış geçidi olan
   sahada 6.1.1 kısmi, restore testi 180 günü aşan sahada 8.1.2 kısmi. */
const DURUM: Record<string, Record<string, string>> = {
  'KIZILDERE-3': {
    'EPDK-SYM-6.1.1': 'kismi', 'EPDK-SYM-6.1.2': 'uyumsuz', 'EPDK-SYM-6.2.1': 'uyumsuz',
    'EPDK-SYM-8.1.1': 'uyumlu', 'EPDK-SYM-8.1.2': 'kismi', 'EPDK-SYM-8.2.1': 'uyumlu',
  },
  'KIZILDERE-2': {
    'EPDK-SYM-6.1.1': 'uyumlu', 'EPDK-SYM-6.1.2': 'kismi', 'EPDK-SYM-6.2.1': 'kismi',
    'EPDK-SYM-8.1.1': 'uyumlu', 'EPDK-SYM-8.1.2': 'uyumlu', 'EPDK-SYM-8.2.1': 'kismi',
  },
  'GOKCEDAG-RES': {
    'EPDK-SYM-6.1.1': 'uyumsuz', 'EPDK-SYM-6.1.2': 'kismi', 'EPDK-SYM-6.2.1': 'uyumlu',
    'EPDK-SYM-8.1.1': 'kismi', 'EPDK-SYM-8.1.2': 'incelemede', 'EPDK-SYM-8.2.1': 'uyumlu',
  },
  'SARITEPE-RES': {
    'EPDK-SYM-6.1.1': 'kismi', 'EPDK-SYM-6.1.2': 'uyumlu', 'EPDK-SYM-6.2.1': 'kismi',
    'EPDK-SYM-8.1.1': 'uyumlu', 'EPDK-SYM-8.1.2': 'uyumsuz', 'EPDK-SYM-8.2.1': 'incelemede',
  },
  'MERKEZ-BT': {
    'EPDK-SYM-6.1.1': 'uyumlu', 'EPDK-SYM-6.1.2': 'uyumlu', 'EPDK-SYM-6.2.1': 'uyumlu',
    'EPDK-SYM-8.1.1': 'uyumlu', 'EPDK-SYM-8.1.2': 'uyumlu', 'EPDK-SYM-8.2.1': 'uyumlu',
  },
};

/* Güven seviyesi durumla birlikte anlam taşır: uyumlu ama kanıtı bayat olan
   bir kontrol, ekranda uyumlu görünüp güven sütununda düşer. */
const GUVEN: Record<string, string> = {
  uyumlu: 'denetci_dogrulamis',
  kismi: 'oz_degerlendirme',
  uyumsuz: 'otomatik_kanit',
  incelemede: 'kanit_yok',
};

export async function uyumKatalogu(db: PrismaClient) {
  const reg = await db.regulasyon.findUnique({ where: { kod: 'EPDK-SYM' } });
  if (!reg) throw new Error('EPDK-SYM regülasyonu yok — önce ana seed çalışmalı.');

  const surec = await db.uyumSureci.findUnique({ where: { kod: 'EPDK-SYM-2026' } });
  if (!surec) throw new Error('EPDK-SYM-2026 süreci yok.');

  const alanlar = Object.fromEntries(
    (await db.kapsamAlani.findMany()).map((a) => [a.kod, a]),
  );
  const kullanicilar = await db.kullanici.findMany();
  const K = Object.fromEntries(kullanicilar.map((x) => [x.eposta.split('@')[0], x]));

  // Kapsam: uygulanabilirlik motorunun kararı + sürecin kapsam listesi.
  const kapsam = await db.surecKapsami.findMany({
    where: { surecId: surec.id }, include: { tesis: true },
  });

  const idx: Record<string, { id: string }> = {};
  /* Sıra kodun kendisinden türetilir (4 → 4000, 6.1.2 → 6102) ki yeni aileler
     listeye eklenme sırasına göre değil numarasına göre otursun. */
  const siraHesapla = (kod: string) => {
    const n = kod.replace('EPDK-SYM-', '').split('.').map(Number);
    return n[0] * 1000 + (n[1] ?? 0) * 100 + (n[2] ?? 0);
  };
  for (const [kod, baslik, ustKod, metin, kanitTipi] of YENI_MADDELER) {
    const varOlan = await db.madde.findFirst({ where: { regulasyonId: reg.id, kod } });
    if (varOlan) { idx[kod] = varOlan; continue; }
    const m = await db.madde.create({
      data: {
        regulasyonId: reg.id, kod, baslik, metin, kanitTipi,
        ustMaddeId: ustKod ? idx[ustKod]?.id ?? null : null,
        sira: siraHesapla(kod),
        alanAdi: kod.startsWith('EPDK-SYM-6') ? 'Ağ ve Sistem Güvenliği' : 'Süreklilik',
        zorunlulukTipi: 'REGULATION',
        kanitBeklentisi: kanitTipi
          ? 'Yürürlükteki konfigürasyon veya test kaydı; en fazla 180 gün eski.'
          : null,
        varsayilanIncelemeGunu: 180,
      },
    });
    idx[kod] = m;
    // Kapsam alanı: ağ ailesi hem BT hem OT, süreklilik ailesi ikisi de.
    for (const a of ['BT', 'OT']) {
      if (alanlar[a]) {
        await db.maddeAlan.create({ data: { maddeId: m.id, alanId: alanlar[a].id } })
          .catch(() => undefined);
      }
    }
  }

  // Yaprak maddeler için durum kaydı — yalnız kapsamdaki santrallere.
  const yapraklar = YENI_MADDELER.filter(([kod]) => kod.split('.').length === 3).map(([kod]) => kod);
  let eklenen = 0;
  for (const k of kapsam) {
    const satir = DURUM[k.tesis.kod];
    if (!satir) continue; // kapsamda ama matriste yoksa uydurma durum yazma
    for (const maddeKod of yapraklar) {
      const durum = satir[maddeKod];
      if (!durum) continue;
      const madde = idx[maddeKod];
      if (!madde) continue;
      const zatenVar = await db.maddeDurumu.findFirst({
        where: { surecId: surec.id, maddeId: madde.id, tesisId: k.tesisId },
      });
      if (zatenVar) continue;
      await db.maddeDurumu.create({
        data: {
          surecId: surec.id, maddeId: madde.id, tesisId: k.tesisId,
          durum,
          /* Değişmez: kanıtı bayat olan kayıt 'bayat_kanit' güvenindedir.
             İkisini ayrı yazmak, kanıt tazelik motorunun kabul testini
             kırıyordu (tests/motorlar.test.ts) — bayat işaret güven
             seviyesinde de görünmek zorunda. */
          ...(durum === 'uyumlu' && maddeKod === 'EPDK-SYM-8.1.2'
            ? { kanitBayat: true, guven: 'bayat_kanit' }
            : { kanitBayat: false, guven: GUVEN[durum] ?? 'kanit_yok' }),
          sorumluId: maddeKod.startsWith('EPDK-SYM-6')
            ? K['burak.sahin']?.id ?? null
            : K['selin.aydin']?.id ?? null,
          sonDegerlendirme: durum === 'incelemede' ? null : gun(-Math.floor(20 + Math.abs(maddeKod.length * 7) % 160)),
          not: durum === 'uyumsuz'
            ? 'Tespit doğrulandı; düzeltici aksiyon bulgu üzerinden takip ediliyor.'
            : null,
        },
      });
      eklenen++;
    }
  }

  console.log(`Uyum kataloğu: ${YENI_MADDELER.length} madde, ${eklenen} madde durumu eklendi.`);
}
