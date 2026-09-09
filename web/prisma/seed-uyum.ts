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

/* Yeni ailelerin (6 · 8) maddeleri 2.5'ten beri DEMO-TR-ENERJI PAKETİNDEN
   gelir (`paketler/DEMO-TR-ENERJI/cerceve/EPDK-SYM.csv`: başlık, metin,
   kanıt tipi, kanıt beklentisi, sıra). Burada yalnız kodlar ve kiracı
   katmanı (matris aile adı) kalır. */
const YENI_KODLAR = [
  'EPDK-SYM-6', 'EPDK-SYM-6.1', 'EPDK-SYM-6.1.1', 'EPDK-SYM-6.1.2', 'EPDK-SYM-6.2', 'EPDK-SYM-6.2.1',
  'EPDK-SYM-8', 'EPDK-SYM-8.1', 'EPDK-SYM-8.1.1', 'EPDK-SYM-8.1.2', 'EPDK-SYM-8.2', 'EPDK-SYM-8.2.1',
];

/* Kapsamdaki santral × yeni yaprak madde durum matrisi.
   Eldeki operasyonel veriyle tutarlı yazılmıştır: oturum kaydı alınmayan
   tedarikçi erişimi olan sahada 6.1.2 uyumsuz, doğrulanmamış geçidi olan
   sahada 6.1.1 kısmi, restore testi 180 günü aşan sahada 8.1.2 kısmi. */
const DURUM: Record<string, Record<string, string>> = {
  'SAHA-A3': {
    'EPDK-SYM-6.1.1': 'kismi', 'EPDK-SYM-6.1.2': 'uyumsuz', 'EPDK-SYM-6.2.1': 'uyumsuz',
    'EPDK-SYM-8.1.1': 'uyumlu', 'EPDK-SYM-8.1.2': 'kismi', 'EPDK-SYM-8.2.1': 'uyumlu',
  },
  'SAHA-A2': {
    'EPDK-SYM-6.1.1': 'uyumlu', 'EPDK-SYM-6.1.2': 'kismi', 'EPDK-SYM-6.2.1': 'kismi',
    'EPDK-SYM-8.1.1': 'uyumlu', 'EPDK-SYM-8.1.2': 'uyumlu', 'EPDK-SYM-8.2.1': 'kismi',
  },
  'SAHA-C-RES': {
    'EPDK-SYM-6.1.1': 'uyumsuz', 'EPDK-SYM-6.1.2': 'kismi', 'EPDK-SYM-6.2.1': 'uyumlu',
    'EPDK-SYM-8.1.1': 'kismi', 'EPDK-SYM-8.1.2': 'incelemede', 'EPDK-SYM-8.2.1': 'uyumlu',
  },
  'SAHA-D-RES': {
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

  const kullanicilar = await db.kullanici.findMany();
  const K = Object.fromEntries(kullanicilar.map((x) => [x.eposta.split('@')[0], x]));

  // Kapsam: uygulanabilirlik motorunun kararı + sürecin kapsam listesi.
  const kapsam = await db.surecKapsami.findMany({
    where: { surecId: surec.id }, include: { kapsamOgesi: true },
  });

  const idx: Record<string, { id: string }> = {};
  for (const kod of YENI_KODLAR) {
    const madde = await db.madde.findFirst({ where: { regulasyonId: reg.id, kod } });
    if (!madde) throw new Error(`${kod} paketten gelmedi — DEMO-TR-ENERJI kurulmalı.`);
    /* Aile adı kiracı katmanıdır (uyum matrisinin sütunu); paket kalemi değil. */
    await db.madde.update({ where: { id: madde.id }, data: { alanAdi: kod.startsWith('EPDK-SYM-6') ? 'Ağ ve Sistem Güvenliği' : 'Süreklilik' } });
    idx[kod] = madde;
  }

  // Yaprak maddeler için durum kaydı — yalnız kapsamdaki santrallere.
  const yapraklar = YENI_KODLAR.filter((kod) => kod.split('.').length === 3);
  let eklenen = 0;
  for (const k of kapsam) {
    const satir = DURUM[k.kapsamOgesi.kod];
    if (!satir) continue; // kapsamda ama matriste yoksa uydurma durum yazma
    for (const maddeKod of yapraklar) {
      const durum = satir[maddeKod];
      if (!durum) continue;
      const madde = idx[maddeKod];
      if (!madde) continue;
      const zatenVar = await db.maddeDurumu.findFirst({
        where: { surecId: surec.id, maddeId: madde.id, kapsamOgesiId: k.kapsamOgesiId },
      });
      if (zatenVar) continue;
      await db.maddeDurumu.create({
        data: {
          surecId: surec.id, maddeId: madde.id, kapsamOgesiId: k.kapsamOgesiId,
          durum,
          /* Değişmez: kanıtı bayat olan kayıt 'bayat_kanit' güvenindedir.
             İkisini ayrı yazmak, kanıt tazelik motorunun kabul testini
             kırıyordu (tests/motorlar.test.ts) — bayat işaret güven
             seviyesinde de görünmek zorunda. */
          ...(durum === 'uyumlu' && maddeKod === 'EPDK-SYM-8.1.2'
            ? { kanitBayat: true, guven: 'bayat_kanit' }
            : { kanitBayat: false, guven: GUVEN[durum] ?? 'kanit_yok' }),
          sorumluId: maddeKod.startsWith('EPDK-SYM-6')
            ? K['kullanici.c']?.id ?? null
            : K['kullanici.b']?.id ?? null,
          sonDegerlendirme: durum === 'incelemede' ? null : gun(-Math.floor(20 + Math.abs(maddeKod.length * 7) % 160)),
          not: durum === 'uyumsuz'
            ? 'Tespit doğrulandı; düzeltici aksiyon bulgu üzerinden takip ediliyor.'
            : null,
        },
      });
      eklenen++;
    }
  }

  console.log(`Uyum kataloğu: ${YENI_KODLAR.length} madde (paketten), ${eklenen} madde durumu eklendi.`);
}
