/* ═══════════════════════════════════════════════════════════════════════
   SU / ATIKSU SEKTÖR PAKETİ — ikinci sektör (demo · Faz 2)

   NİÇİN VAR: sektör bağımsızlığı bugüne kadar KODDA vardı ve EKRANDA
   görünmüyordu. Tek sektörlü bir kurulumda "çekirdek sektör bilmez"
   cümlesi kanıtlanamaz; kanıt, ikinci sektörün aynı ekranlarda kendi
   sözcüğü ve kendi ÖLÇÜ BİRİMİYLE açılmasıdır.

   ── VERİ KURGUSALDIR ──────────────────────────────────────────────────
   Depo halka açıktır. Buradaki hiçbir kurum, tesis ya da kişi adı gerçek
   değildir ve gerçek bir işletmeye karşılık gelmez. Adlandırma enerji
   tarafıyla aynı kalıbı izler ("Saha A-1"): kurgusallığı okur okumaz
   belli olan, coğrafi olarak tekil olmayan adlar.

   ── BİLİNMEYEN ≠ SIFIR ────────────────────────────────────────────────
   Debisi ölçülmemiş tesis öznitelik satırı ALMAZ; ekran "ölçülmedi" der.
   Sıfır yazmak ya da ortalama atamak, demoda ürünün en ayırt edici
   davranışını gizlerdi. Bir tesis bilerek ölçümsüz bırakıldı.

   ── BİRİM NEDEN ÖNEMLİ ────────────────────────────────────────────────
   Enerji `MW`, su `m³/gün` taşır. `birimliToplam` farklı birimleri
   TOPLAMAZ; iki sektörlü bir kapsamda portföy toplamı bilerek "karışık
   birim" der. Bu bir kusur değil, ölçünün dürüstlüğüdür ve demoda
   gösterilebilir.
   ═══════════════════════════════════════════════════════════════════════ */

import type { PrismaClient } from '../lib/prisma-client/client';
import { SU_SOZLUGU } from './sozlukler';

const G = 86_400_000;
const gun = (n: number) => new Date(Date.now() + n * G);

/** Su sektörünün birincil ölçüsü — şemadan gelir, koda gömülü değildir. */
export const GUNLUK_DEBI = 'gunlukDebi';

/* Tesis tipleri: su/atıksu işinin kendi tipleri. Enerji tiplerinin
   çevirisi DEĞİL — "arıtma" ile "santral" aynı şeyin iki adı değildir. */
const SU_TIPLERI = [
  ['ICME-ARITMA', 'İçme Suyu Arıtma', 1],
  ['ATIKSU-ARITMA', 'Atıksu Arıtma', 2],
  ['TERFI', 'Terfi Merkezi', 3],
  ['DEPO', 'Su Deposu', 4],
  ['SU-MERKEZ', 'Merkez BT', 9],
] as const;

/* kod, ad, tip, günlük debi (m³/gün · null = ÖLÇÜLMEDİ), konum, durum, devreye giriş */
const SU_TESISLERI = [
  ['SU-A1', 'Saha A-1 İçme Suyu Arıtma', 'ICME-ARITMA', 120_000, 'Kuzey Bölge', 'aktif', -4200],
  ['SU-A2', 'Saha A-2 İçme Suyu Arıtma', 'ICME-ARITMA', 64_000, 'Kuzey Bölge', 'aktif', -3100],
  ['SU-B1', 'Saha B-1 Atıksu Arıtma', 'ATIKSU-ARITMA', 85_000, 'Merkez Bölge', 'aktif', -5400],
  ['SU-B2', 'Saha B-2 Atıksu Arıtma', 'ATIKSU-ARITMA', 38_500, 'Merkez Bölge', 'aktif', -2600],
  ['SU-C1', 'Saha C-1 Terfi Merkezi', 'TERFI', 24_000, 'Güney Bölge', 'aktif', -3800],
  ['SU-C2', 'Saha C-2 Terfi Merkezi', 'TERFI', 11_200, 'Güney Bölge', 'aktif', -1900],
  /* Debisi ÖLÇÜLMEMİŞ: telemetri hattı yok. Sıfır yazılmaz, satır açılmaz. */
  ['SU-D1', 'Saha D-1 Su Deposu', 'DEPO', null, 'Güney Bölge', 'aktif', -6100],
  ['SU-MERKEZ-BT', 'Demo Su Genel Müdürlük', 'SU-MERKEZ', null, 'Merkez Bölge', 'aktif', -5000],
] as const;

export async function suSektoru(db: PrismaClient) {
  const su = await db.sektor.create({
    data: { kod: 'SU-ARITMA', ad: 'Su ve Atıksu' },
  });

  const tip = Object.fromEntries(await Promise.all(
    SU_TIPLERI.map(async ([kod, ad, sira]) => [kod, await db.tesisTipi.create({
      data: { kod, ad, sira, sektorId: su.id },
    })]),
  )) as Record<string, { id: string }>;

  await db.sektorSozlugu.createMany({
    data: SU_SOZLUGU.map((r) => ({ ...r, sektorId: su.id })),
  });

  await Promise.all(SU_TESISLERI.map(([kod, ad, tipKod, debi, konum, durum, giris]) =>
    db.tesis.create({
      data: {
        kod, ad, tipId: tip[tipKod].id, konum, durum,
        devreyeGiris: gun(giris),
        /* Ölçülmemiş debi satır AÇMAZ (URN-ALN-001). */
        ozellikler: debi === null ? undefined : {
          create: [{ anahtar: GUNLUK_DEBI, sayisalDeger: debi, birim: 'm³/gün', kaynak: 'tohum' }],
        },
        /* Su tesislerinin fotoğrafı YOK: başka bir tesisin görseli
           ödünç alınmaz (public/tesisler/KUNYE.md §1.3). Ekran
           tipografik yedeğe düşer. */
        gorselAnahtari: null,
      },
    })));

  return { sektorId: su.id, tesisSayisi: SU_TESISLERI.length };
}

/* ═══════════════════════════════════════════════════════════════════════
   SU KİRACISININ UYUM KATMANI

   ── HANGİ ÇERÇEVE ─────────────────────────────────────────────────────
   Su/atıksu için AYRI bir mevzuat UYDURULMADI. Depoda zaten duran iki
   çerçeve kullanılıyor: CBDDÖ Bilgi ve İletişim Güvenliği Rehberi ve
   ISO/IEC 27001. İkisi de kamuya açık, ikisi de gerçekten sektör
   üstüdür — bir su işletmesine de bir enerji işletmesine de aynı
   maddelerle uygulanır. Enerjiye özgü EPDK-SYM su kapsamına GİRMEZ:
   gerçek bir düzenlemeye yanlış kapsam atfetmek, mevzuat uydurmakla
   aynı kusurdur.

   Bu aynı zamanda ürünün asıl iddiasını gösterir: aynı kontrol çatısı,
   aynı ekranlar, farklı sektör.

   ── SAYILAR KURGUSAL ──────────────────────────────────────────────────
   Durum dağılımı tohumdan gelir ve hiçbir gerçek kuruma ait değildir;
   ekran her yüzeyde "Örnek veri" rozeti taşır. Ölçülmemiş olan sıfıra
   çekilmez: bir tesisin bir maddesi bilerek `incelemede` bırakıldı.
   ═══════════════════════════════════════════════════════════════════════ */

/** Su kapsamındaki tesisler — merkez ve iki arıtma sahası. */
const SU_KAPSAMI = ['SU-MERKEZ-BT', 'SU-A1', 'SU-B1'] as const;

/* Durum matrisi: her saha farklı zayıflık taşır ki portföy karşılaştırması
   anlamlı olsun. Hepsi aynı olsaydı ekran bir tablo değil bir duvar
   olurdu. `kapsamdisi` bilerek var: uygulanabilirlik kararı ekranda
   görünsün. */
const SU_CBDDO: Record<string, Record<string, string>> = {
  'SU-MERKEZ-BT': { '3.1': 'uyumlu', '3.2': 'uyumlu', '4.1': 'uyumlu', '4.2': 'kismi' },
  'SU-A1': { '3.1': 'kismi', '3.2': 'uyumsuz', '4.1': 'uyumlu', '4.2': 'incelemede' },
  'SU-B1': { '3.1': 'uyumsuz', '3.2': 'kismi', '4.1': 'kismi', '4.2': 'uyumlu' },
};
const SU_ISO: Record<string, Record<string, string>> = {
  'SU-MERKEZ-BT': { 'A.5.9': 'uyumlu', 'A.8.9': 'kismi', 'A.8.16': 'uyumlu', 'A.5.24': 'uyumlu' },
  'SU-A1': { 'A.5.9': 'uyumlu', 'A.8.9': 'uyumsuz', 'A.8.16': 'incelemede', 'A.5.24': 'kismi' },
  'SU-B1': { 'A.5.9': 'kismi', 'A.8.9': 'incelemede', 'A.8.16': 'uyumsuz', 'A.5.24': 'kapsamdisi' },
};

/* Bulgular su işine AİT: klor dozaj PLC'si, telemetri hattı, terfi
   merkezi uzak erişimi. Enerji bulgularının "santral"i "arıtma tesisi"
   yapılmış kopyaları DEĞİL — öyle olsaydı demo, sektör bağımsızlığını
   değil bul-değiştir'i gösterirdi. */
const SU_BULGULARI = [
  { tesis: 'SU-A1', cerceve: 'CBDDO', madde: '3.2',
    baslik: 'Klor dozaj PLC\'sinde varsayılan yönetim parolası değişmemiş',
    aciklama: 'Dozaj kontrol PLC\'si üretici varsayılan kimlik bilgileriyle çalışıyor; '
      + 'cihaz proses ağında ve mühendislik istasyonundan erişilebilir durumda.',
    onem: 'yuksek', durum: 'acik', kaynak: 'ic_denetim', tespitGun: -34, hedefGun: 21,
    kokNeden: 'Devreye alma sırasında sıkılaştırma listesi PLC\'leri kapsamıyordu.' },
  { tesis: 'SU-B1', cerceve: 'CBDDO', madde: '3.1',
    baslik: 'Atıksu SCADA ağı ile kurumsal ağ arasında tanımsız geçiş',
    aciklama: 'İki ağ arasında belgelenmemiş bir yönlendirici geçişi bulundu; '
      + 'geçişin kim tarafından, ne zaman açıldığı kayıtlardan okunamıyor.',
    onem: 'kritik', durum: 'islemde', kaynak: 'ic_denetim', tespitGun: -52, hedefGun: 14,
    kokNeden: 'Geçici bakım erişimi kalıcı hâle gelmiş; kapanış kaydı yok.' },
  { tesis: 'SU-A1', cerceve: 'ISO-27001', madde: 'A.8.9',
    baslik: 'Terfi merkezi RTU konfigürasyonlarının yedeği alınmıyor',
    aciklama: 'Uzak terminal birimlerinin yapılandırması yalnız cihaz üstünde duruyor; '
      + 'cihaz arızasında yapılandırma yeniden kurulamaz.',
    onem: 'orta', durum: 'acik', kaynak: 'oz_degerlendirme', tespitGun: -19, hedefGun: 45,
    kokNeden: null },
  { tesis: 'SU-B1', cerceve: 'ISO-27001', madde: 'A.8.16',
    baslik: 'Debi telemetrisinde anormallik izleme yok',
    aciklama: 'Telemetri verisi toplanıyor ama eşik dışı davranış için bir izleme kuralı '
      + 'tanımlı değil; sapma ancak operatör fark ederse görülüyor.',
    onem: 'orta', durum: 'acik', kaynak: 'oz_degerlendirme', tespitGun: -11, hedefGun: null,
    kokNeden: null },
];

export async function suUyumu(db: PrismaClient) {
  const T = Object.fromEntries((await db.tesis.findMany()).map((x) => [x.kod, x]));
  const K = Object.fromEntries(
    (await db.kullanici.findMany()).map((x) => [x.eposta.split('@')[0], x]),
  );
  const M = Object.fromEntries(
    (await db.madde.findMany({ select: { id: true, kod: true } })).map((x) => [x.kod, x]),
  );
  const regCbddo = await db.regulasyon.findUnique({ where: { kod: 'CBDDO' } });
  const regIso = await db.regulasyon.findUnique({ where: { kod: 'ISO-27001' } });
  if (!regCbddo || !regIso) throw new Error('CBDDÖ/ISO regülasyonu yok — ana seed önce koşmalı.');

  const surecler = {
    CBDDO: await db.uyumSureci.create({ data: {
      kod: 'CBDDO-SU-2026', ad: 'CBDDÖ 2026 · Su ve Atıksu', regulasyonId: regCbddo.id,
      durum: 'aktif', baslangic: gun(-70), bitis: gun(50),
      aciklama: 'İçme suyu ve atıksu arıtma sahalarında proses ağı ve erişim kontrolü '
        + 'değerlendirmesi.' } }),
    'ISO-27001': await db.uyumSureci.create({ data: {
      kod: 'ISO-27001-SU-2026', ad: 'ISO 27001 Gözetim · Su ve Atıksu', regulasyonId: regIso.id,
      durum: 'aktif', baslangic: gun(-25), bitis: gun(80),
      aciklama: 'Yıllık gözetim denetimi kapsamında su portföyü.' } }),
  };

  for (const [cerceve, matris] of [['CBDDO', SU_CBDDO], ['ISO-27001', SU_ISO]] as const) {
    const surec = surecler[cerceve];
    for (const tk of SU_KAPSAMI) {
      const tesis = T[tk];
      if (!tesis) continue;
      await db.surecKapsami.create({ data: { surecId: surec.id, tesisId: tesis.id } });
      for (const [mk, durum] of Object.entries(matris[tk] ?? {})) {
        const madde = M[`${cerceve}-${mk}`];
        if (!madde) continue;
        await db.maddeDurumu.create({ data: {
          surecId: surec.id, maddeId: madde.id, tesisId: tesis.id, durum,
          sorumluId: K['kullanici.c']?.id ?? null,
          sonDegerlendirme: gun(-((mk.length * 3) % 40) - 2),
        } });
      }
    }
  }

  let bulguSayisi = 0;
  for (const b of SU_BULGULARI) {
    const madde = M[`${b.cerceve}-${b.madde}`];
    const tesis = T[b.tesis];
    const surec = surecler[b.cerceve as keyof typeof surecler];
    if (!madde || !tesis || !surec) continue;
    const durumKaydi = await db.maddeDurumu.findFirst({
      where: { surecId: surec.id, maddeId: madde.id, tesisId: tesis.id },
    });
    /* Kapsam dışı bir madde için bulgu YAZILMAZ: kapsam kararını ekranda
       delmemek için (ana tohumla aynı kural). */
    if (!durumKaydi) continue;
    await db.bulgu.create({ data: {
      maddeDurumuId: durumKaydi.id, baslik: b.baslik, aciklama: b.aciklama,
      onemDerecesi: b.onem, durum: b.durum, kaynak: b.kaynak,
      kokNeden: b.kokNeden, tespitTarihi: gun(b.tespitGun),
      hedefTarih: b.hedefGun === null ? null : gun(b.hedefGun),
      sorumluId: K['kullanici.c']?.id ?? null,
    } });
    bulguSayisi++;
  }

  return { surec: 2, bulgu: bulguSayisi, kapsam: SU_KAPSAMI.length };
}
